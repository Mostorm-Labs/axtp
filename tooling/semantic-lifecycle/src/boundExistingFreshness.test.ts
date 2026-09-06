// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryProtocolBasisProvider,
  ProtocolBasisDriftError,
  ProtocolBasisUnavailableError,
  type PublicationFenceHook,
} from "./protocolBasisProvider.js";

const basisA = {
  protocolAuthorityRef: {
    refType: "IMMUTABLE_REVISION" as const,
    namespace: "protocol-authority",
    subject: "adopted",
    revision: "r1",
    digest: "sha256:r1",
  },
  adoptionEvidenceRefs: [
    { refType: "EVIDENCE" as const, id: "adoption-1", digest: "sha256:e1" },
  ],
};
const basisB = {
  protocolAuthorityRef: { ...basisA.protocolAuthorityRef, revision: "r2", digest: "sha256:r2" },
  adoptionEvidenceRefs: basisA.adoptionEvidenceRefs,
};

test("readAdoptedBasis returns an immutable exact adopted basis", () => {
  const provider = new InMemoryProtocolBasisProvider(basisA);
  const observed = provider.readAdoptedBasis();
  assert.deepEqual(observed, basisA);
  assert.notStrictEqual(observed, basisA);
  assert.equal(Object.isFrozen(observed), true);
  assert.equal(Object.isFrozen(observed.protocolAuthorityRef), true);
  assert.equal(Object.isFrozen(observed.adoptionEvidenceRefs), true);
  assert.throws(() => {
    (observed as { protocolAuthorityRef: unknown }).protocolAuthorityRef = basisB.protocolAuthorityRef;
  }, TypeError);
});

test("withPublicationFence executes a synchronous action only while the exact basis remains adopted", () => {
  const provider = new InMemoryProtocolBasisProvider(basisA);
  const result = provider.withPublicationFence(basisA, () => "committed");
  assert.equal(result, "committed");
});

test("unavailable provider fails closed with a distinct error and does not run the action", () => {
  const provider = new InMemoryProtocolBasisProvider(null);
  let ran = false;
  assert.throws(() => provider.readAdoptedBasis(), ProtocolBasisUnavailableError);
  assert.throws(
    () => provider.withPublicationFence(basisA, () => { ran = true; }),
    ProtocolBasisUnavailableError,
  );
  assert.equal(ran, false);
});

test("basis drift fails closed before action linearization", () => {
  const provider = new InMemoryProtocolBasisProvider(basisA, {
    hooks: { atFenceValidation: () => provider.setAdoptedBasis(basisB) },
  });
  let ran = false;
  assert.throws(
    () => provider.withPublicationFence(basisA, () => { ran = true; }),
    ProtocolBasisDriftError,
  );
  assert.equal(ran, false);
});

test("controllable fixture exposes all six P20 hook points in order", () => {
  const provider = new InMemoryProtocolBasisProvider(basisA);
  const seen: PublicationFenceHook[] = [];
  const hooks: Partial<Record<PublicationFenceHook, () => void>> = {};
  const names: PublicationFenceHook[] = [
    "beforeInitialRead",
    "afterInitialReadBeforeValidation",
    "afterEvidenceValidationBeforePrepare",
    "afterPrepareBeforeLinearization",
    "atFenceValidation",
    "afterSuccessfulLinearization",
  ];
  for (const name of names) hooks[name] = () => { seen.push(name); };
  provider.setHooks(hooks);
  provider.withPublicationFence(basisA, () => "ok");
  assert.deepEqual(seen, names);
});

test("drift at every pre-linearization P20 hook prevents action", () => {
  const preLinearization: PublicationFenceHook[] = [
    "beforeInitialRead",
    "afterInitialReadBeforeValidation",
    "afterEvidenceValidationBeforePrepare",
    "afterPrepareBeforeLinearization",
    "atFenceValidation",
  ];
  for (const hook of preLinearization) {
    const provider = new InMemoryProtocolBasisProvider(basisA, {
      hooks: { [hook]: () => provider.setAdoptedBasis(basisB) },
    });
    let ran = false;
    assert.throws(() => provider.withPublicationFence(basisA, () => { ran = true; }), ProtocolBasisDriftError, hook);
    assert.equal(ran, false, hook);
  }
});

test("drift immediately after successful linearization does not revoke committed result", () => {
  const provider = new InMemoryProtocolBasisProvider(basisA, {
    hooks: { afterSuccessfulLinearization: () => provider.setAdoptedBasis(basisB) },
  });
  assert.equal(provider.withPublicationFence(basisA, () => "committed"), "committed");
  assert.deepEqual(provider.readAdoptedBasis(), basisB);
});

test("provider contract has no protocol mutation method", () => {
  const provider = new InMemoryProtocolBasisProvider(basisA);
  assert.equal("writeAdoptedBasis" in provider, false);
  assert.equal("mutateProtocol" in provider, false);
});

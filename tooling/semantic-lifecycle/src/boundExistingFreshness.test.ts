// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryProtocolBasisProvider,
  ProtocolBasisDriftError,
  ProtocolBasisUnavailableError,
  type PublicationFenceHook,
} from "./protocolBasisProvider.js";
import { readFileSync } from "node:fs";
import { InMemoryLifecycleControlStore } from "./controlStore.js";
import { InMemorySemanticCandidateStore } from "./candidateStore.js";
import { BoundExistingRoute } from "./boundExistingRoute.js";

const routeFixtures = JSON.parse(readFileSync("fixtures/bound-existing/route-cases.json", "utf8"));
const routeCopy = (value: unknown) => structuredClone(value);
const routeCaseId = routeFixtures.case.reconstructionCaseId;
const routeCandidateRef = (revision: string) => ({ refType: "IMMUTABLE_REVISION", namespace: "semantic-candidate", subject: "candidate-1", revision, digest: `sha256:${revision}` });

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

test("proof and review lineage becomes stale after basis reselection", () => {
  const control = new InMemoryLifecycleControlStore();
  const candidates = new InMemorySemanticCandidateStore();
  let adopted = routeCopy(routeFixtures.selection.protocolBasis);
  const route = new BoundExistingRoute(control, { readAdoptedProtocolBasis: () => routeCopy(adopted) }, candidates);
  route.registerMigrationBasis({ operationId: "freshness-migration", record: routeCopy(routeFixtures.migration) });
  route.openReconstruction({ operationId: "freshness-open", selection: routeCopy(routeFixtures.selection), reconstructionCase: routeCopy(routeFixtures.case) });
  const candidate = { schemaVersion: 2, candidateId: "candidate-1", candidateRef: routeCandidateRef("c1"), provenance: { route: "BOUND_EXISTING", reconstructionCaseId: routeCaseId, basisSelectionRef: routeFixtures.selection.basisSelectionRef }, payload: { meaning: "c1" }, evidenceRefs: [{ refType: "EVIDENCE", id: "freshness-candidate" }] };
  route.createCandidate({ operationId: "freshness-candidate", candidate });
  const proof = { schemaVersion: 1, receiptId: "freshness-proof", proofKind: "BOUND_EXISTING_RECONSTRUCTION", proofContractVersion: "1", engine: { name: "reference", version: "1" }, reconstructionCaseId: routeCaseId, candidateRef: candidate.candidateRef, basisSelectionRef: routeFixtures.selection.basisSelectionRef, verdict: "PASS", inputDigest: "sha256:freshness", ruleIds: ["BOUND-EXACT"], diagnostics: [], evidenceRefs: [{ refType: "EVIDENCE", id: "freshness-proof-evidence" }] };
  route.recordMachineProof({ operationId: "freshness-proof-op", proof });
  const changedSelection = { ...routeCopy(routeFixtures.selection), basisSelectionRef: { ...routeFixtures.selection.basisSelectionRef, revision: "freshness-b2", digest: "sha256:freshness-b2" }, supersedesBasisSelectionRef: routeFixtures.selection.basisSelectionRef, protocolBasis: { ...routeCopy(routeFixtures.selection.protocolBasis), protocolAuthorityRef: { ...routeFixtures.selection.protocolBasis.protocolAuthorityRef, revision: "freshness-b" } } };
  adopted = routeCopy(changedSelection.protocolBasis);
  route.reselectBasis({ operationId: "freshness-reselect", expectedBasisSelectionRef: routeFixtures.selection.basisSelectionRef, selection: changedSelection });
  assert.throws(() => route.recordHumanReview({ operationId: "freshness-stale-review", review: { schemaVersion: 2, reviewId: "freshness-review", reviewKind: "SEMANTIC_CANDIDATE", decisionSource: "HUMAN", verdict: "PASS", candidateRef: candidate.candidateRef, provenance: { route: "BOUND_EXISTING", reconstructionCaseId: routeCaseId, basisSelectionRef: routeFixtures.selection.basisSelectionRef }, evidenceRefs: [{ refType: "EVIDENCE", id: "freshness-review-evidence" }] } }), /BASIS_SELECTION_CONFLICT|CANDIDATE_HEAD_CONFLICT/);
});

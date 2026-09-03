// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function loadModules() {
  const [coordinator, store] = await Promise.all([
    import("./coordinator.js").catch(() => null),
    import("./controlStore.js").catch(() => null)
  ]);
  return { coordinator, store };
}

const scopeRef = {
  refType: "IMMUTABLE_REVISION",
  namespace: "semantic-scope",
  subject: "case-1",
  revision: "scope-a",
  digest: "sha256:scope-a"
};
const basisRef = {
  refType: "IMMUTABLE_REVISION",
  namespace: "classification-policy",
  subject: "semantic-delta-v1",
  revision: "policy-a",
  digest: "sha256:policy-a"
};

function loadNoDeltaObservations() {
  return JSON.parse(readFileSync("fixtures/classification/no-delta-cases.json", "utf8"))[0].observations;
}

function snapshot(overrides = {}) {
  return { caseId: "case-1", scopeRef, observations: loadNoDeltaObservations(), ...overrides };
}

test("coordinator performs classify -> proof -> immutable control-store flow", async () => {
  const { coordinator, store } = await loadModules();
  assert.ok(coordinator, "coordinator module must exist");
  const controlStore = new store.InMemoryLifecycleControlStore();
  const service = new coordinator.SemanticLifecycleCoordinator(controlStore);
  const result = service.assess(snapshot(), basisRef);

  assert.equal(result.assessment.disposition, "NO_SEMANTIC_DELTA");
  assert.equal(result.receipt.disposition, "NO_SEMANTIC_DELTA");
  assert.equal(result.receipt.proofContractVersion, "sem-lc-01/v1");
  assert.equal(controlStore.getScope("case-1").caseId, "case-1");
  assert.deepEqual(controlStore.getAssessment(result.assessment.assessmentId), result.assessment);
  assert.deepEqual(controlStore.getMachineProof(result.receipt.receiptId), result.receipt);
});

test("same exact subject and basis produces deterministic assessment and receipt identities", async () => {
  const { coordinator, store } = await loadModules();
  assert.ok(coordinator, "coordinator module must exist");
  const left = new coordinator.SemanticLifecycleCoordinator(new store.InMemoryLifecycleControlStore()).assess(snapshot(), basisRef);
  const right = new coordinator.SemanticLifecycleCoordinator(new store.InMemoryLifecycleControlStore()).assess(structuredClone(snapshot()), structuredClone(basisRef));
  assert.equal(left.assessment.assessmentId, right.assessment.assessmentId);
  assert.equal(left.receipt.receiptId, right.receipt.receiptId);
  assert.equal(left.receipt.inputDigest, right.receipt.inputDigest);
});

test("coordinator only authorizes an exact fresh NO_DELTA fast path", async () => {
  const { coordinator, store } = await loadModules();
  assert.ok(coordinator, "coordinator module must exist");
  const service = new coordinator.SemanticLifecycleCoordinator(new store.InMemoryLifecycleControlStore());
  const result = service.assess(snapshot(), basisRef);
  assert.deepEqual(service.evaluateFastPath(result.assessment, scopeRef, basisRef), { eligible: true, reason: "ELIGIBLE" });
  assert.deepEqual(
    service.evaluateFastPath(result.assessment, { ...scopeRef, revision: "scope-b" }, basisRef),
    { eligible: false, reason: "STALE_SCOPE" }
  );
  assert.deepEqual(
    service.evaluateFastPath(result.assessment, scopeRef, { ...basisRef, revision: "policy-b" }),
    { eligible: false, reason: "STALE_CLASSIFICATION_BASIS" }
  );
});

test("mutable classification basis is rejected before control records are persisted", async () => {
  const { coordinator, store } = await loadModules();
  assert.ok(coordinator, "coordinator module must exist");
  const unresolved = JSON.parse(readFileSync("fixtures/classification/unresolved-cases.json", "utf8"));
  const mutable = unresolved.find((entry) => entry.kind === "INVALID_BASIS").basisInput;
  const controlStore = new store.InMemoryLifecycleControlStore();
  const service = new coordinator.SemanticLifecycleCoordinator(controlStore);
  assert.throws(() => service.assess(snapshot(), mutable), /INVALID_IMMUTABLE_REF/);
  assert.equal(controlStore.getScope("case-1"), undefined);
});

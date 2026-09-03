// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

async function loadStore() {
  return import("./controlStore.js").catch(() => null);
}

const scopeRef = {
  refType: "IMMUTABLE_REVISION",
  namespace: "scope",
  subject: "case-1",
  revision: "scope-a"
};
const basisRef = {
  refType: "IMMUTABLE_REVISION",
  namespace: "policy",
  subject: "classification",
  revision: "policy-a"
};
const evidence = { refType: "EVIDENCE", id: "evidence-1" };

function snapshot(revision = "scope-a") {
  return {
    caseId: "case-1",
    scopeRef: { ...scopeRef, revision },
    observations: []
  };
}

function assessment(disposition = "NO_SEMANTIC_DELTA") {
  return {
    assessmentId: "assessment-1",
    caseId: "case-1",
    scopeRef,
    classificationBasisRef: basisRef,
    disposition,
    evaluatedDimensions: [],
    evidenceRefs: [evidence]
  };
}

function receipt(disposition = "NO_SEMANTIC_DELTA") {
  return {
    receiptId: "receipt-1",
    proofContractVersion: "sem-lc-01/v1",
    engine: { name: "reference-classifier", version: "1" },
    scopeRef,
    classificationBasisRef: basisRef,
    ruleIds: ["SEM-DELTA-COMPLETE-COVERAGE"],
    disposition,
    inputDigest: "fnv1a64:1234",
    diagnostics: [],
    evidenceRefs: [evidence]
  };
}

function reviewDecision(overrides = {}) {
  return {
    reviewId: "review-1",
    reviewKind: "SEMANTIC_CANDIDATE",
    decisionSource: "HUMAN",
    verdict: "PASS",
    candidateRef: {
      refType: "IMMUTABLE_REVISION",
      namespace: "semantic-candidate",
      subject: "candidate-1",
      revision: "candidate-v1"
    },
    scopeRef,
    classificationBasisRef: basisRef,
    evidenceRefs: [{ refType: "EVIDENCE", id: "human-review-1" }],
    ...overrides
  };
}

test("same ID and same canonical content is idempotent", async () => {
  const mod = await loadStore();
  assert.ok(mod, "controlStore module must exist");
  const store = new mod.InMemoryLifecycleControlStore();
  assert.equal(store.putScope(snapshot()), "CREATED");
  assert.equal(store.putScope(structuredClone(snapshot())), "IDEMPOTENT");
  assert.equal(store.putAssessment(assessment()), "CREATED");
  assert.equal(store.putAssessment(structuredClone(assessment())), "IDEMPOTENT");
  assert.equal(store.putMachineProof(receipt()), "CREATED");
  assert.equal(store.putMachineProof(structuredClone(receipt())), "IDEMPOTENT");
});

test("same ID with different content is rejected instead of overwritten", async () => {
  const mod = await loadStore();
  assert.ok(mod, "controlStore module must exist");
  const store = new mod.InMemoryLifecycleControlStore();
  store.putScope(snapshot());
  assert.throws(() => store.putScope(snapshot("scope-b")), /IMMUTABLE_RECORD_CONFLICT/);
  store.putAssessment(assessment());
  assert.throws(() => store.putAssessment(assessment("UNRESOLVED")), /IMMUTABLE_RECORD_CONFLICT/);
  store.putMachineProof(receipt());
  assert.throws(() => store.putMachineProof(receipt("SEMANTIC_DELTA")), /IMMUTABLE_RECORD_CONFLICT/);
});

test("control store exposes no Semantic Source payload or mutable authorization truth API", async () => {
  const mod = await loadStore();
  assert.ok(mod, "controlStore module must exist");
  const store = new mod.InMemoryLifecycleControlStore();
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(store)).filter((name) => name !== "constructor");
  for (const forbidden of ["semanticSource", "payload", "approved", "eligible", "current"]) {
    assert.equal(methods.some((name) => name.toLowerCase().includes(forbidden.toLowerCase())), false, forbidden);
  }
});

test("reads cannot mutate stored immutable control records", async () => {
  const mod = await loadStore();
  assert.ok(mod, "controlStore module must exist");
  const store = new mod.InMemoryLifecycleControlStore();
  store.putScope(snapshot());
  const read = store.getScope("case-1");
  assert.ok(Object.isFrozen(read));
  assert.ok(Object.isFrozen(read.scopeRef));
  assert.throws(() => { read.scopeRef.revision = "tampered"; });
  assert.equal(store.getScope("case-1").scopeRef.revision, "scope-a");
});

test("human ReviewDecision is an immutable control record, not Candidate payload", async () => {
  const mod = await loadStore();
  assert.ok(mod, "controlStore module must exist");
  const store = new mod.InMemoryLifecycleControlStore();
  assert.equal(store.putReviewDecision(reviewDecision()), "CREATED");
  assert.equal(store.putReviewDecision(structuredClone(reviewDecision())), "IDEMPOTENT");
  assert.deepEqual(store.getReviewDecision("review-1"), reviewDecision());
  assert.throws(() => store.putReviewDecision(reviewDecision({ verdict: "REJECT" })), /IMMUTABLE_RECORD_CONFLICT/);
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(store));
  assert.equal(methods.some((name) => name.toLowerCase().includes("candidatepayload")), false);
});

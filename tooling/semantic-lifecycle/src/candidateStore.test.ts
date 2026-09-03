// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

async function loadCandidateStore() {
  return import("./candidateStore.js").catch(() => null);
}

const scopeRef = Object.freeze({
  refType: "IMMUTABLE_REVISION",
  namespace: "semantic-scope",
  subject: "case-1",
  revision: "scope-a",
  digest: "sha256:scope-a"
});
const classificationBasisRef = Object.freeze({
  refType: "IMMUTABLE_REVISION",
  namespace: "classification-policy",
  subject: "semantic-delta-v1",
  revision: "policy-a",
  digest: "sha256:policy-a"
});
const evidenceRefs = Object.freeze([{ refType: "EVIDENCE", id: "candidate-evidence", digest: "sha256:candidate-evidence" }]);

function candidate(revision = "candidate-v1", overrides = {}) {
  return {
    candidateId: "candidate-1",
    caseId: "case-1",
    candidateRef: {
      refType: "IMMUTABLE_REVISION",
      namespace: "semantic-candidate",
      subject: "candidate-1",
      revision,
      digest: `sha256:${revision}`
    },
    assessmentId: "assessment-1",
    scopeRef,
    classificationBasisRef,
    payload: { resource: "device", meaning: revision, nested: { enabled: true } },
    evidenceRefs,
    ...overrides
  };
}

test("candidate store is immutable and idempotent by exact candidate ref", async () => {
  const mod = await loadCandidateStore();
  assert.ok(mod, "candidateStore module must exist");
  const store = new mod.InMemorySemanticCandidateStore();
  assert.equal(store.putCandidate(candidate()), "CREATED");
  assert.equal(store.putCandidate(structuredClone(candidate())), "IDEMPOTENT");
  assert.deepEqual(store.getCandidate(candidate().candidateRef), candidate());
  assert.throws(
    () => store.putCandidate(candidate("candidate-v1", { payload: { resource: "device", meaning: "changed" } })),
    /IMMUTABLE_CANDIDATE_CONFLICT/
  );
});

test("candidate repair creates a new immutable revision and preserves the predecessor", async () => {
  const mod = await loadCandidateStore();
  assert.ok(mod, "candidateStore module must exist");
  const store = new mod.InMemorySemanticCandidateStore();
  const first = candidate();
  const second = candidate("candidate-v2", { supersedesCandidateRef: first.candidateRef });
  store.putCandidate(first);
  store.putCandidate(second);
  assert.equal(store.getCandidate(first.candidateRef).payload.meaning, "candidate-v1");
  assert.equal(store.getCandidate(second.candidateRef).payload.meaning, "candidate-v2");
  assert.deepEqual(store.getCandidate(second.candidateRef).supersedesCandidateRef, first.candidateRef);
});

test("candidate refs and JSON payloads fail closed", async () => {
  const mod = await loadCandidateStore();
  assert.ok(mod, "candidateStore module must exist");
  const store = new mod.InMemorySemanticCandidateStore();
  assert.throws(() => store.putCandidate(candidate("HEAD")), /INVALID_IMMUTABLE_REF/);
  assert.throws(
    () => store.putCandidate(candidate("candidate-v1", { candidateRef: { ...candidate().candidateRef, namespace: "semantic-source" } })),
    /INVALID_CANDIDATE_REF/
  );
  assert.throws(() => store.putCandidate(candidate("candidate-v1", { payload: { value: undefined } })), /INVALID_CANDIDATE_PAYLOAD/);
  assert.throws(() => store.putCandidate(candidate("candidate-v1", { payload: { value: Number.NaN } })), /INVALID_CANDIDATE_PAYLOAD/);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => store.putCandidate(candidate("candidate-v1", { payload: cyclic })), /INVALID_CANDIDATE_PAYLOAD/);
});

test("candidate store exposes no mutation or authority/adoption API", async () => {
  const mod = await loadCandidateStore();
  assert.ok(mod, "candidateStore module must exist");
  const store = new mod.InMemorySemanticCandidateStore();
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(store)).filter((name) => name !== "constructor");
  for (const forbidden of ["update", "delete", "current", "approve", "adopt", "authority"]) {
    assert.equal(methods.some((name) => name.toLowerCase().includes(forbidden)), false, forbidden);
  }
});

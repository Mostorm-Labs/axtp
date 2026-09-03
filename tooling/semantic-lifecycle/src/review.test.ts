// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

async function loadReview() {
  return import("./review.js").catch(() => null);
}

const candidateRef = Object.freeze({
  refType: "IMMUTABLE_REVISION",
  namespace: "semantic-candidate",
  subject: "candidate-1",
  revision: "candidate-v1",
  digest: "sha256:candidate-v1"
});
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

function candidate(overrides = {}) {
  return {
    candidateId: "candidate-1",
    caseId: "case-1",
    candidateRef,
    assessmentId: "assessment-1",
    scopeRef,
    classificationBasisRef,
    payload: { meaning: "v1" },
    evidenceRefs: [{ refType: "EVIDENCE", id: "candidate-evidence" }],
    ...overrides
  };
}

function review(overrides = {}) {
  return {
    reviewId: "review-1",
    reviewKind: "SEMANTIC_CANDIDATE",
    decisionSource: "HUMAN",
    verdict: "PASS",
    candidateRef,
    scopeRef,
    classificationBasisRef,
    evidenceRefs: [{ refType: "EVIDENCE", id: "human-review-1", digest: "sha256:human-review-1" }],
    ...overrides
  };
}

test("exact human PASS review is eligible", async () => {
  const mod = await loadReview();
  assert.ok(mod, "review module must exist");
  assert.deepEqual(mod.evaluateReviewFreshness(review(), candidate()), { eligible: true, reason: "ELIGIBLE" });
});

test("non-human, rejected, and unproven reviews fail closed", async () => {
  const mod = await loadReview();
  assert.ok(mod, "review module must exist");
  assert.deepEqual(mod.evaluateReviewFreshness(review({ decisionSource: "MACHINE" }), candidate()), { eligible: false, reason: "NOT_HUMAN_REVIEW" });
  assert.deepEqual(mod.evaluateReviewFreshness(review({ verdict: "REJECT" }), candidate()), { eligible: false, reason: "REVIEW_NOT_PASS" });
  assert.deepEqual(mod.evaluateReviewFreshness(review({ evidenceRefs: [] }), candidate()), { eligible: false, reason: "MISSING_REVIEW_EVIDENCE" });
  assert.deepEqual(mod.evaluateReviewFreshness(review({ evidenceRefs: [{ refType: "EVIDENCE", id: "" }] }), candidate()), { eligible: false, reason: "MISSING_REVIEW_EVIDENCE" });
});

test("review freshness binds exact candidate, scope, and classification basis", async () => {
  const mod = await loadReview();
  assert.ok(mod, "review module must exist");
  assert.deepEqual(mod.evaluateReviewFreshness(review(), candidate({ candidateRef: { ...candidateRef, revision: "candidate-v2" } })), { eligible: false, reason: "STALE_CANDIDATE" });
  assert.deepEqual(mod.evaluateReviewFreshness(review(), candidate({ scopeRef: { ...scopeRef, revision: "scope-b" } })), { eligible: false, reason: "STALE_SCOPE" });
  assert.deepEqual(mod.evaluateReviewFreshness(review(), candidate({ classificationBasisRef: { ...classificationBasisRef, revision: "policy-b" } })), { eligible: false, reason: "STALE_CLASSIFICATION_BASIS" });
});

test("mutable review references return INVALID_IMMUTABLE_REF", async () => {
  const mod = await loadReview();
  assert.ok(mod, "review module must exist");
  assert.deepEqual(mod.evaluateReviewFreshness(review({ candidateRef: { ...candidateRef, revision: "HEAD" } }), candidate()), { eligible: false, reason: "INVALID_IMMUTABLE_REF" });
});

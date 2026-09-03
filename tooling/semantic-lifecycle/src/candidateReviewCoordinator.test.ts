// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

async function loadModules() {
  const [coordinator, candidateStore, controlStore] = await Promise.all([
    import("./candidateReviewCoordinator.js").catch(() => null),
    import("./candidateStore.js").catch(() => null),
    import("./controlStore.js").catch(() => null)
  ]);
  return { coordinator, candidateStore, controlStore };
}

const scopeRef = Object.freeze({ refType: "IMMUTABLE_REVISION", namespace: "semantic-scope", subject: "case-1", revision: "scope-a", digest: "sha256:scope-a" });
const classificationBasisRef = Object.freeze({ refType: "IMMUTABLE_REVISION", namespace: "classification-policy", subject: "semantic-delta-v1", revision: "policy-a", digest: "sha256:policy-a" });
const candidateRefV1 = Object.freeze({ refType: "IMMUTABLE_REVISION", namespace: "semantic-candidate", subject: "candidate-1", revision: "candidate-v1", digest: "sha256:candidate-v1" });
const candidateRefV2 = Object.freeze({ ...candidateRefV1, revision: "candidate-v2", digest: "sha256:candidate-v2" });

function assessment(disposition = "SEMANTIC_DELTA") {
  return {
    assessmentId: "assessment-1",
    caseId: "case-1",
    scopeRef,
    classificationBasisRef,
    disposition,
    evaluatedDimensions: ["FIELD_MEANING"],
    evidenceRefs: [{ refType: "EVIDENCE", id: "classification-evidence" }]
  };
}

function review(candidateRef = candidateRefV1, overrides = {}) {
  return {
    reviewId: `review:${candidateRef.revision}`,
    reviewKind: "SEMANTIC_CANDIDATE",
    decisionSource: "HUMAN",
    verdict: "PASS",
    candidateRef,
    scopeRef,
    classificationBasisRef,
    evidenceRefs: [{ refType: "EVIDENCE", id: `human:${candidateRef.revision}` }],
    ...overrides
  };
}

function build() {
  return loadModules().then(({ coordinator, candidateStore, controlStore }) => {
    assert.ok(coordinator, "candidateReviewCoordinator module must exist");
    assert.ok(candidateStore, "candidateStore module must exist");
    const controls = new controlStore.InMemoryLifecycleControlStore();
    const candidates = new candidateStore.InMemorySemanticCandidateStore();
    return { service: new coordinator.CandidateReviewCoordinator(controls, candidates), controls, candidates };
  });
}

test("only a stored SEMANTIC_DELTA assessment can create a candidate", async () => {
  const { service, controls } = await build();
  controls.putAssessment(assessment());
  const created = service.createCandidate({
    candidateId: "candidate-1",
    candidateRef: candidateRefV1,
    assessmentId: "assessment-1",
    payload: { fieldMeaning: "v1" },
    evidenceRefs: [{ refType: "EVIDENCE", id: "candidate-evidence" }]
  });
  assert.equal(created.caseId, "case-1");
  assert.deepEqual(created.scopeRef, scopeRef);
  assert.deepEqual(created.classificationBasisRef, classificationBasisRef);

  const { service: noDeltaService, controls: noDeltaControls } = await build();
  noDeltaControls.putAssessment(assessment("NO_SEMANTIC_DELTA"));
  assert.throws(() => noDeltaService.createCandidate({ candidateId: "candidate-1", candidateRef: candidateRefV1, assessmentId: "assessment-1", payload: {}, evidenceRefs: [] }), /CANDIDATE_REQUIRES_SEMANTIC_DELTA/);
});

test("human review is external evidence and a machine source cannot be recorded as human PASS", async () => {
  const { service, controls } = await build();
  controls.putAssessment(assessment());
  const created = service.createCandidate({ candidateId: "candidate-1", candidateRef: candidateRefV1, assessmentId: "assessment-1", payload: { fieldMeaning: "v1" }, evidenceRefs: [{ refType: "EVIDENCE", id: "candidate-evidence" }] });
  assert.equal(service.recordHumanReviewDecision(review()), "CREATED");
  assert.deepEqual(service.evaluateHumanReview(review(), created), { eligible: true, reason: "ELIGIBLE" });
  assert.throws(() => service.recordHumanReviewDecision(review(candidateRefV1, { decisionSource: "MACHINE", reviewId: "machine-review" })), /NOT_HUMAN_REVIEW/);
  assert.equal(controls.getReviewDecision("machine-review"), undefined);
});

test("repairing a candidate makes the prior review stale and requires a new review", async () => {
  const { service, controls } = await build();
  controls.putAssessment(assessment());
  const first = service.createCandidate({ candidateId: "candidate-1", candidateRef: candidateRefV1, assessmentId: "assessment-1", payload: { fieldMeaning: "v1" }, evidenceRefs: [{ refType: "EVIDENCE", id: "candidate-evidence-v1" }] });
  service.recordHumanReviewDecision(review(candidateRefV1));
  const repaired = service.createCandidate({ candidateId: "candidate-1", candidateRef: candidateRefV2, supersedesCandidateRef: first.candidateRef, assessmentId: "assessment-1", payload: { fieldMeaning: "v2" }, evidenceRefs: [{ refType: "EVIDENCE", id: "candidate-evidence-v2" }] });
  assert.deepEqual(service.evaluateHumanReview(review(candidateRefV1), repaired), { eligible: false, reason: "STALE_CANDIDATE" });
  assert.equal(service.recordHumanReviewDecision(review(candidateRefV2)), "CREATED");
  assert.deepEqual(service.evaluateHumanReview(review(candidateRefV2), repaired), { eligible: true, reason: "ELIGIBLE" });
});

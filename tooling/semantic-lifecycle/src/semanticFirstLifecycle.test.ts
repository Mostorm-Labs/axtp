// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryLifecycleControlStore } from "./controlStore.js";
import { SemanticLifecycleCoordinator } from "./coordinator.js";
import { InMemorySemanticCandidateStore } from "./candidateStore.js";
import { CandidateReviewCoordinator } from "./candidateReviewCoordinator.js";
import { InMemorySemanticAuthorityRepository } from "./authorityRepository.js";
import { SemanticAuthorityCommitter } from "./authorityCommitter.js";

async function loadRouteModule() {
  return import("./semanticFirstRoute.js").catch(() => null);
}

function ref(namespace, subject, revision) {
  return Object.freeze({ refType: "IMMUTABLE_REVISION", namespace, subject, revision, digest: `sha256:${revision}` });
}

function changeCase(caseId) {
  return {
    caseId,
    scopeSnapshot: {
      caseId,
      scopeRef: ref("semantic-scope", caseId, `${caseId}-scope`),
      observations: [{ dimension: "FIELD_MEANING", state: "CHANGED", evidenceRefs: [{ refType: "EVIDENCE", id: `${caseId}:changed` }] }]
    },
    classificationBasisRef: ref("classification-policy", "semantic-delta-v1", "policy-v1")
  };
}

async function setup() {
  const module = await loadRouteModule();
  assert.ok(module, "semanticFirstRoute module must exist for C4-T4");
  const controls = new InMemoryLifecycleControlStore();
  const candidates = new InMemorySemanticCandidateStore();
  const lifecycleCoordinator = new SemanticLifecycleCoordinator(controls);
  const candidateReviewCoordinator = new CandidateReviewCoordinator(controls, candidates);
  const authorityRepository = new InMemorySemanticAuthorityRepository();
  const authorityCommitter = new SemanticAuthorityCommitter(controls, candidates, authorityRepository);
  const route = new module.SemanticFirstRoute({ lifecycleCoordinator, candidateReviewCoordinator, authorityCommitter, authorityRepository });
  return { route, authorityRepository };
}

function openCandidate(route, change, revision = "v1", supersedesCandidateRef) {
  const state = route.getCaseStatus(change.caseId) === undefined ? route.openCase(change) : route.getCaseState(change.caseId);
  return route.createCandidate(change.caseId, {
    candidateId: `candidate:${change.caseId}`,
    candidateRef: ref("semantic-candidate", `candidate:${change.caseId}`, `candidate-${revision}`),
    ...(supersedesCandidateRef === undefined ? {} : { supersedesCandidateRef }),
    assessmentId: state.assessmentId ?? state.assessment.assessmentId,
    payload: { meaning: revision },
    evidenceRefs: [{ refType: "EVIDENCE", id: `${change.caseId}:candidate:${revision}` }]
  });
}

function review(route, change, candidate, revision = candidate.candidateRef.revision) {
  const decision = {
    reviewId: `review:${change.caseId}:${revision}`,
    reviewKind: "SEMANTIC_CANDIDATE",
    decisionSource: "HUMAN",
    verdict: "PASS",
    candidateRef: candidate.candidateRef,
    scopeRef: change.scopeSnapshot.scopeRef,
    classificationBasisRef: change.classificationBasisRef,
    evidenceRefs: [{ refType: "EVIDENCE", id: `${change.caseId}:human:${revision}` }]
  };
  route.recordHumanReview(change.caseId, decision);
  return decision;
}

function commitInput(change, candidate, decision, authorityRevision, expectedAuthorityHead = null, overrides = {}) {
  return {
    operationId: `operation:${authorityRevision}`,
    authorityKey: "display.settings",
    authorityRef: ref("semantic-authority", "display.settings", authorityRevision),
    candidateRef: candidate.candidateRef,
    reviewId: decision.reviewId,
    expectedScopeRef: change.scopeSnapshot.scopeRef,
    expectedClassificationBasisRef: change.classificationBasisRef,
    expectedAuthorityHead,
    canonicalPath: "contract/semantic/display/settings.yaml",
    evidenceRefs: [{ refType: "EVIDENCE", id: `${authorityRevision}:authority` }],
    ...overrides
  };
}

test("C4-T4 keeps repair, retry, cancel, and supersede observably distinct", async () => {
  const env = await setup();

  const repairCase = changeCase("case-sf09");
  const firstCandidate = openCandidate(env.route, repairCase, "v1");
  const firstReview = review(env.route, repairCase, firstCandidate);
  const repaired = env.route.repairCandidate(repairCase.caseId, {
    candidateId: firstCandidate.candidateId,
    candidateRef: ref("semantic-candidate", firstCandidate.candidateId, "candidate-v2"),
    supersedesCandidateRef: firstCandidate.candidateRef,
    assessmentId: firstCandidate.assessmentId,
    payload: { meaning: "repaired" },
    evidenceRefs: [{ refType: "EVIDENCE", id: "candidate:repair" }]
  });
  assert.deepEqual(repaired.supersedesCandidateRef, firstCandidate.candidateRef);
  assert.throws(
    () => env.route.commitInitialAuthority(repairCase.caseId, commitInput(repairCase, repaired, firstReview, "authority-v1")),
    /SEMANTIC_FIRST_REVIEW_NOT_CURRENT/
  );
  assert.equal(env.authorityRepository.getCurrentAuthority("display.settings"), undefined);
  const repairedReview = review(env.route, repairCase, repaired);
  const initialInput = commitInput(repairCase, repaired, repairedReview, "authority-v1");
  const initial = env.route.commitInitialAuthority(repairCase.caseId, initialInput);

  const headBeforeRetry = env.authorityRepository.getCurrentAuthority("display.settings");
  const sourceBeforeRetry = env.authorityRepository.getCanonicalSource(initial.authority.sourceBinding.path);
  const retry = env.route.commitInitialAuthority(repairCase.caseId, initialInput);
  assert.equal(retry.status, "IDEMPOTENT");
  assert.strictEqual(env.authorityRepository.getCurrentAuthority("display.settings"), headBeforeRetry);
  assert.strictEqual(env.authorityRepository.getCanonicalSource(initial.authority.sourceBinding.path), sourceBeforeRetry);
  assert.throws(
    () => env.route.commitInitialAuthority(repairCase.caseId, { ...initialInput, canonicalPath: "contract/semantic/display/other.yaml" }),
    /AUTHORITY_OPERATION_CONFLICT/
  );
  assert.throws(
    () => env.route.commitInitialAuthority(repairCase.caseId, {
      ...initialInput,
      operationId: "operation:audio-v1",
      authorityKey: "audio.settings",
      authorityRef: ref("semantic-authority", "audio.settings", "authority-v1"),
      canonicalPath: "contract/semantic/audio/settings.yaml"
    }),
    /SEMANTIC_FIRST_CASE_ALREADY_ACCEPTED/
  );
  assert.equal(env.authorityRepository.getCurrentAuthority("audio.settings"), undefined);

  const cancelledCase = changeCase("case-sf12");
  env.route.openCase(cancelledCase);
  assert.equal(env.route.cancelCase(cancelledCase.caseId), "CANCELLED");
  assert.equal(env.route.cancelCase(cancelledCase.caseId), "CANCELLED");
  assert.throws(() => openCandidate(env.route, cancelledCase), /SEMANTIC_FIRST_CASE_CANCELLED/);
  assert.throws(() => env.route.cancelCase(repairCase.caseId), /SEMANTIC_FIRST_CASE_ALREADY_ACCEPTED/);
  assert.deepEqual(env.authorityRepository.getCurrentAuthority("display.settings"), initial.authority);

  assert.throws(
    () => env.route.commitSupersedingAuthority(repairCase.caseId, { ...initialInput, expectedAuthorityHead: initial.authority.authorityRef }),
    /SEMANTIC_FIRST_SUPERSESSION_REQUIRES_NEW_CASE/
  );
  const supersedingCase = changeCase("case-sf14");
  const supersedingCandidate = openCandidate(env.route, supersedingCase, "v2");
  const supersedingReview = review(env.route, supersedingCase, supersedingCandidate);
  const supersedingInput = commitInput(
    supersedingCase,
    supersedingCandidate,
    supersedingReview,
    "authority-v2",
    initial.authority.authorityRef
  );
  const superseded = env.route.commitSupersedingAuthority(supersedingCase.caseId, supersedingInput);
  assert.deepEqual(superseded.authority.supersedesAuthorityRef, initial.authority.authorityRef);
  assert.deepEqual(env.authorityRepository.getAuthority(initial.authority.authorityRef), initial.authority);
  assert.equal(env.route.getCaseStatus(supersedingCase.caseId), "AUTHORITY_ACCEPTED");
  const supersedingRetry = env.route.commitSupersedingAuthority(supersedingCase.caseId, supersedingInput);
  assert.equal(supersedingRetry.status, "IDEMPOTENT");
  assert.deepEqual(supersedingRetry.authority, superseded.authority);
  assert.throws(
    () => env.route.commitSupersedingAuthority(supersedingCase.caseId, {
      ...supersedingInput,
      operationId: "operation:authority-v3",
      authorityRef: ref("semantic-authority", "display.settings", "authority-v3"),
      expectedAuthorityHead: superseded.authority.authorityRef
    }),
    /SEMANTIC_FIRST_SUPERSESSION_REQUIRES_NEW_CASE/
  );
});

test("lifecycle errors distinguish missing, conflict, cancelled, accepted, and non-current inputs", async () => {
  const env = await setup();
  assert.throws(() => env.route.cancelCase("missing"), /SEMANTIC_FIRST_CASE_NOT_FOUND/);
  const change = changeCase("case-errors");
  env.route.openCase(change);
  assert.throws(() => env.route.openCase(change), /SEMANTIC_FIRST_CASE_CONFLICT/);
  const candidate = openCandidate(env.route, change);
  assert.throws(() => env.route.recordHumanReview(change.caseId, {
    reviewId: "review:wrong",
    reviewKind: "SEMANTIC_CANDIDATE",
    decisionSource: "HUMAN",
    verdict: "PASS",
    candidateRef: ref("semantic-candidate", candidate.candidateId, "wrong"),
    scopeRef: change.scopeSnapshot.scopeRef,
    classificationBasisRef: change.classificationBasisRef,
    evidenceRefs: [{ refType: "EVIDENCE", id: "wrong" }]
  }), /SEMANTIC_FIRST_CANDIDATE_NOT_CURRENT/);
  assert.throws(() => env.route.repairCandidate(change.caseId, {
    candidateId: candidate.candidateId,
    candidateRef: ref("semantic-candidate", candidate.candidateId, "candidate-v2"),
    supersedesCandidateRef: ref("semantic-candidate", candidate.candidateId, "wrong"),
    assessmentId: candidate.assessmentId,
    payload: { meaning: "v2" },
    evidenceRefs: [{ refType: "EVIDENCE", id: "repair" }]
  }), /SEMANTIC_FIRST_CANDIDATE_NOT_CURRENT/);
});

// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { SEMANTIC_DELTA_DIMENSIONS } from "./classification.js";
import { InMemoryLifecycleControlStore } from "./controlStore.js";
import { SemanticLifecycleCoordinator } from "./coordinator.js";
import { InMemorySemanticCandidateStore } from "./candidateStore.js";
import { CandidateReviewCoordinator } from "./candidateReviewCoordinator.js";
import { InMemorySemanticAuthorityRepository } from "./authorityRepository.js";
import { SemanticAuthorityCommitter } from "./authorityCommitter.js";

async function loadRouteModule() {
  return import("./semanticFirstRoute.js").catch(() => null);
}

function immutableRef(namespace, subject, revision) {
  return Object.freeze({
    refType: "IMMUTABLE_REVISION",
    namespace,
    subject,
    revision,
    digest: `sha256:${revision}`
  });
}

function changeCase(caseId, disposition = "SEMANTIC_DELTA") {
  const scopeRef = immutableRef("semantic-scope", caseId, `${caseId}-scope-v1`);
  const classificationBasisRef = immutableRef("classification-policy", "semantic-delta-v1", "policy-v1");
  const observations = disposition === "NO_SEMANTIC_DELTA"
    ? SEMANTIC_DELTA_DIMENSIONS.map((dimension) => ({
        dimension,
        state: "UNCHANGED",
        evidenceRefs: [{ refType: "EVIDENCE", id: `${caseId}:${dimension}:unchanged` }]
      }))
    : [{
        dimension: "FIELD_MEANING",
        state: "CHANGED",
        evidenceRefs: [{ refType: "EVIDENCE", id: `${caseId}:field-meaning:changed` }]
      }];
  return Object.freeze({
    caseId,
    scopeSnapshot: Object.freeze({ caseId, scopeRef, observations: Object.freeze(observations) }),
    classificationBasisRef
  });
}

async function setup() {
  const module = await loadRouteModule();
  assert.ok(module, "semanticFirstRoute module must exist for C4-T1/C4-T2");
  const controls = new InMemoryLifecycleControlStore();
  const candidates = new InMemorySemanticCandidateStore();
  const lifecycleCoordinator = new SemanticLifecycleCoordinator(controls);
  const candidateReviewCoordinator = new CandidateReviewCoordinator(controls, candidates);
  const authorityRepository = new InMemorySemanticAuthorityRepository();
  const authorityCommitter = new SemanticAuthorityCommitter(controls, candidates, authorityRepository);
  const route = new module.SemanticFirstRoute({
    lifecycleCoordinator,
    candidateReviewCoordinator,
    authorityCommitter,
    authorityRepository
  });
  return { route, controls, candidates, authorityRepository };
}

function candidateInput(caseId, revision = "candidate-v1", payload = { meaning: "v1" }) {
  return {
    candidateId: `candidate:${caseId}`,
    candidateRef: immutableRef("semantic-candidate", `candidate:${caseId}`, revision),
    assessmentId: undefined,
    payload,
    evidenceRefs: [{ refType: "EVIDENCE", id: `${caseId}:${revision}:candidate` }]
  };
}

function reviewFor(change, candidate, verdict = "PASS", reviewId = `review:${candidate.candidateRef.revision}`) {
  return {
    reviewId,
    reviewKind: "SEMANTIC_CANDIDATE",
    decisionSource: "HUMAN",
    verdict,
    candidateRef: candidate.candidateRef,
    scopeRef: change.scopeSnapshot.scopeRef,
    classificationBasisRef: change.classificationBasisRef,
    evidenceRefs: [{ refType: "EVIDENCE", id: `${reviewId}:human` }]
  };
}

function authorityInput(change, candidate, reviewId, revision = "authority-v1", overrides = {}) {
  return {
    operationId: `operation:${revision}`,
    authorityKey: "display.settings",
    authorityRef: immutableRef("semantic-authority", "display.settings", revision),
    candidateRef: candidate.candidateRef,
    reviewId,
    expectedScopeRef: change.scopeSnapshot.scopeRef,
    expectedClassificationBasisRef: change.classificationBasisRef,
    expectedAuthorityHead: null,
    canonicalPath: "contract/semantic/display/settings.yaml",
    evidenceRefs: [{ refType: "EVIDENCE", id: `${revision}:authority` }],
    ...overrides
  };
}

test("C4-T1 composes Case, Assessment/proof, Candidate, human Review, and initial Authority", async () => {
  const env = await setup();
  const inputCase = changeCase("case-sf01");
  const opened = env.route.openCase(inputCase);
  assert.equal(opened.status, "OPEN");
  assert.equal(opened.assessment.disposition, "SEMANTIC_DELTA");
  assert.deepEqual(env.controls.getAssessment(opened.assessment.assessmentId), opened.assessment);
  assert.deepEqual(env.controls.getMachineProof(opened.receipt.receiptId), opened.receipt);

  const input = candidateInput(inputCase.caseId);
  input.assessmentId = opened.assessment.assessmentId;
  const candidate = env.route.createCandidate(inputCase.caseId, input);
  const review = reviewFor(inputCase, candidate);
  assert.equal(env.route.recordHumanReview(inputCase.caseId, review), "CREATED");
  const accepted = env.route.commitInitialAuthority(
    inputCase.caseId,
    authorityInput(inputCase, candidate, review.reviewId)
  );

  assert.equal(accepted.status, "CREATED");
  assert.equal(env.route.getCaseStatus(inputCase.caseId), "AUTHORITY_ACCEPTED");
  assert.deepEqual(env.authorityRepository.getCurrentAuthority("display.settings"), accepted.authority);
  assert.equal("payload" in accepted.authority, false);
});

test("C4-T2 accepts Semantic Authority without Protocol Authority or protocolBindings", async () => {
  const env = await setup();
  const inputCase = changeCase("case-sf02");
  const opened = env.route.openCase(inputCase);
  const input = candidateInput(inputCase.caseId, "candidate-v1", {
    resource: "display.settings",
    fields: { brightness: { type: "integer", default: 50 } }
  });
  input.assessmentId = opened.assessment.assessmentId;
  const candidate = env.route.createCandidate(inputCase.caseId, input);
  assert.equal(Object.hasOwn(candidate.payload, "protocolBindings"), false);
  const review = reviewFor(inputCase, candidate);
  env.route.recordHumanReview(inputCase.caseId, review);

  const accepted = env.route.commitInitialAuthority(
    inputCase.caseId,
    authorityInput(inputCase, candidate, review.reviewId)
  );
  assert.equal(accepted.status, "CREATED");
  assert.deepEqual(env.authorityRepository.getCanonicalSource("contract/semantic/display/settings.yaml"), input.payload);
});

test("SF03 NO_SEMANTIC_DELTA cannot enter the Candidate path", async () => {
  const env = await setup();
  const inputCase = changeCase("case-sf03", "NO_SEMANTIC_DELTA");
  const opened = env.route.openCase(inputCase);
  assert.equal(opened.assessment.disposition, "NO_SEMANTIC_DELTA");
  const input = candidateInput(inputCase.caseId);
  input.assessmentId = opened.assessment.assessmentId;
  assert.throws(() => env.route.createCandidate(inputCase.caseId, input), /CANDIDATE_REQUIRES_SEMANTIC_DELTA/);
  assert.equal(env.route.getCaseStatus(inputCase.caseId), "OPEN");
  assert.equal(env.authorityRepository.getCurrentAuthority("display.settings"), undefined);
});

test("SF04 human REJECT cannot commit Authority and leaves the case OPEN", async () => {
  const env = await setup();
  const inputCase = changeCase("case-sf04");
  const opened = env.route.openCase(inputCase);
  const input = candidateInput(inputCase.caseId);
  input.assessmentId = opened.assessment.assessmentId;
  const candidate = env.route.createCandidate(inputCase.caseId, input);
  const review = reviewFor(inputCase, candidate, "REJECT");
  env.route.recordHumanReview(inputCase.caseId, review);
  assert.throws(
    () => env.route.commitInitialAuthority(inputCase.caseId, authorityInput(inputCase, candidate, review.reviewId)),
    /AUTHORITY_REVIEW_NOT_FRESH:REVIEW_NOT_PASS/
  );
  assert.equal(env.route.getCaseStatus(inputCase.caseId), "OPEN");
  assert.equal(env.authorityRepository.getCurrentAuthority("display.settings"), undefined);
});

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

function caseInput(caseId) {
  return {
    caseId,
    scopeSnapshot: {
      caseId,
      scopeRef: ref("semantic-scope", caseId, `${caseId}-scope`),
      observations: [{
        dimension: "FIELD_MEANING",
        state: "CHANGED",
        evidenceRefs: [{ refType: "EVIDENCE", id: `${caseId}:changed` }]
      }]
    },
    classificationBasisRef: ref("classification-policy", "semantic-delta-v1", "policy-v1")
  };
}

async function setup(repositoryOverride) {
  const module = await loadRouteModule();
  assert.ok(module, "semanticFirstRoute module must exist for C4-T3");
  const controls = new InMemoryLifecycleControlStore();
  const candidates = new InMemorySemanticCandidateStore();
  const lifecycleCoordinator = new SemanticLifecycleCoordinator(controls);
  const candidateReviewCoordinator = new CandidateReviewCoordinator(controls, candidates);
  const realRepository = new InMemorySemanticAuthorityRepository();
  const authorityRepository = repositoryOverride?.(realRepository) ?? realRepository;
  const authorityCommitter = new SemanticAuthorityCommitter(controls, candidates, authorityRepository);
  const route = new module.SemanticFirstRoute({ lifecycleCoordinator, candidateReviewCoordinator, authorityCommitter, authorityRepository });
  return { route, realRepository, authorityRepository };
}

function prepareAccepted(route, change, sequence, expectedAuthorityHead = null) {
  const opened = route.openCase(change);
  const candidate = route.createCandidate(change.caseId, {
    candidateId: `candidate:${change.caseId}`,
    candidateRef: ref("semantic-candidate", `candidate:${change.caseId}`, `candidate-${sequence}`),
    assessmentId: opened.assessment.assessmentId,
    payload: { meaning: sequence },
    evidenceRefs: [{ refType: "EVIDENCE", id: `candidate:${sequence}` }]
  });
  const review = {
    reviewId: `review:${sequence}`,
    reviewKind: "SEMANTIC_CANDIDATE",
    decisionSource: "HUMAN",
    verdict: "PASS",
    candidateRef: candidate.candidateRef,
    scopeRef: change.scopeSnapshot.scopeRef,
    classificationBasisRef: change.classificationBasisRef,
    evidenceRefs: [{ refType: "EVIDENCE", id: `human:${sequence}` }]
  };
  route.recordHumanReview(change.caseId, review);
  const authorityInput = {
    operationId: `operation:${sequence}`,
    authorityKey: "display.settings",
    authorityRef: ref("semantic-authority", "display.settings", `authority-${sequence}`),
    candidateRef: candidate.candidateRef,
    reviewId: review.reviewId,
    expectedScopeRef: change.scopeSnapshot.scopeRef,
    expectedClassificationBasisRef: change.classificationBasisRef,
    expectedAuthorityHead,
    canonicalPath: "contract/semantic/display/settings.yaml",
    evidenceRefs: [{ refType: "EVIDENCE", id: `authority:${sequence}` }]
  };
  return expectedAuthorityHead === null
    ? route.commitInitialAuthority(change.caseId, authorityInput)
    : route.commitSupersedingAuthority(change.caseId, authorityInput);
}

test("C4-T3 resolves only an exact current Authority with matching canonical source", async () => {
  const env = await setup();
  const first = prepareAccepted(env.route, caseInput("case-sf05"), "v1");
  assert.deepEqual(env.route.resolveProjectionBasis(first.authority.authorityRef), {
    authorityKey: "display.settings",
    authorityRef: first.authority.authorityRef,
    sourceBinding: first.authority.sourceBinding
  });

  const before = JSON.stringify({
    head: env.realRepository.getCurrentAuthority("display.settings"),
    record: env.realRepository.getAuthority(first.authority.authorityRef),
    source: env.realRepository.getCanonicalSource(first.authority.sourceBinding.path)
  });
  assert.throws(() => {
    env.route.resolveProjectionBasis(first.authority.authorityRef);
    throw new Error("SIMULATED_DOWNSTREAM_PROJECTION_FAILURE");
  }, /SIMULATED_DOWNSTREAM_PROJECTION_FAILURE/);
  const after = JSON.stringify({
    head: env.realRepository.getCurrentAuthority("display.settings"),
    record: env.realRepository.getAuthority(first.authority.authorityRef),
    source: env.realRepository.getCanonicalSource(first.authority.sourceBinding.path)
  });
  assert.equal(after, before);

  const second = prepareAccepted(env.route, caseInput("case-sf07"), "v2", first.authority.authorityRef);
  assert.throws(() => env.route.resolveProjectionBasis(first.authority.authorityRef), /SEMANTIC_PROJECTION_BASIS_STALE/);
  assert.deepEqual(env.route.resolveProjectionBasis(second.authority.authorityRef).authorityRef, second.authority.authorityRef);
});

test("SF08 canonical source digest mismatch fails closed", async () => {
  let corruptReads = false;
  const env = await setup((repository) => ({
    getCurrentAuthority: (key) => repository.getCurrentAuthority(key),
    getAuthority: (authorityRef) => repository.getAuthority(authorityRef),
    getCanonicalSource: (path) => corruptReads ? { corrupted: true } : repository.getCanonicalSource(path),
    publishAuthority: (request) => repository.publishAuthority(request)
  }));
  const first = prepareAccepted(env.route, caseInput("case-sf08"), "v1");
  corruptReads = true;
  assert.throws(() => env.route.resolveProjectionBasis(first.authority.authorityRef), /SEMANTIC_PROJECTION_SOURCE_MISMATCH/);
  assert.deepEqual(env.realRepository.getCurrentAuthority("display.settings"), first.authority);
});

test("projection basis errors distinguish missing and malformed Authority refs", async () => {
  const env = await setup();
  assert.throws(
    () => env.route.resolveProjectionBasis(ref("semantic-authority", "display.settings", "missing")),
    /SEMANTIC_PROJECTION_BASIS_NOT_FOUND/
  );
  assert.throws(
    () => env.route.resolveProjectionBasis(ref("semantic-candidate", "display.settings", "wrong-namespace")),
    /SEMANTIC_PROJECTION_BASIS_NOT_FOUND/
  );
});

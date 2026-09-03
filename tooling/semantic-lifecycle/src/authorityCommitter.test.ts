// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { InMemoryLifecycleControlStore } from "./controlStore.js";
import { InMemorySemanticCandidateStore } from "./candidateStore.js";
import { CandidateReviewCoordinator } from "./candidateReviewCoordinator.js";

async function loadAuthorityModules() {
  const [committer, repository] = await Promise.all([
    import("./authorityCommitter.js").catch(() => null),
    import("./authorityRepository.js").catch(() => null)
  ]);
  return { committer, repository };
}

const scopeRef = Object.freeze({ refType: "IMMUTABLE_REVISION", namespace: "semantic-scope", subject: "case-1", revision: "scope-v1", digest: "sha256:scope-v1" });
const basisRef = Object.freeze({ refType: "IMMUTABLE_REVISION", namespace: "classification-policy", subject: "semantic-delta-v1", revision: "policy-v1", digest: "sha256:policy-v1" });

function candidateRef(revision) {
  return Object.freeze({ refType: "IMMUTABLE_REVISION", namespace: "semantic-candidate", subject: "candidate-1", revision, digest: `sha256:${revision}` });
}

function authorityRef(revision, key = "display.settings") {
  return Object.freeze({ refType: "IMMUTABLE_REVISION", namespace: "semantic-authority", subject: key, revision, digest: `sha256:${revision}` });
}

async function setup() {
  const { committer, repository } = await loadAuthorityModules();
  assert.ok(committer, "authorityCommitter module must exist");
  assert.ok(repository, "authorityRepository module must exist");
  const controls = new InMemoryLifecycleControlStore();
  const candidates = new InMemorySemanticCandidateStore();
  const candidateCoordinator = new CandidateReviewCoordinator(controls, candidates);
  const authorities = new repository.InMemorySemanticAuthorityRepository();
  const service = new committer.SemanticAuthorityCommitter(controls, candidates, authorities);
  controls.putAssessment({
    assessmentId: "assessment-1",
    caseId: "case-1",
    scopeRef,
    classificationBasisRef: basisRef,
    disposition: "SEMANTIC_DELTA",
    evaluatedDimensions: ["FIELD_MEANING"],
    evidenceRefs: [{ refType: "EVIDENCE", id: "classification" }]
  });
  return { service, authorities, controls, candidates, candidateCoordinator };
}

function createReviewedCandidate(env, revision, payload, supersedesCandidateRef, reviewOverrides = {}) {
  const ref = candidateRef(revision);
  const candidate = env.candidateCoordinator.createCandidate({
    candidateId: "candidate-1",
    candidateRef: ref,
    ...(supersedesCandidateRef === undefined ? {} : { supersedesCandidateRef }),
    assessmentId: "assessment-1",
    payload,
    evidenceRefs: [{ refType: "EVIDENCE", id: `candidate:${revision}` }]
  });
  const review = {
    reviewId: `review:${revision}`,
    reviewKind: "SEMANTIC_CANDIDATE",
    decisionSource: "HUMAN",
    verdict: "PASS",
    candidateRef: ref,
    scopeRef,
    classificationBasisRef: basisRef,
    evidenceRefs: [{ refType: "EVIDENCE", id: `human:${revision}` }],
    ...reviewOverrides
  };
  env.candidateCoordinator.recordHumanReviewDecision(review);
  return { candidate, review };
}

function commitInput(revision, candidateRevision, overrides = {}) {
  return {
    operationId: `op:${revision}`,
    authorityKey: "display.settings",
    authorityRef: authorityRef(revision),
    candidateRef: candidateRef(candidateRevision),
    reviewId: `review:${candidateRevision}`,
    expectedScopeRef: scopeRef,
    expectedClassificationBasisRef: basisRef,
    expectedAuthorityHead: null,
    canonicalPath: "contract/semantic/display/settings.yaml",
    evidenceRefs: [{ refType: "EVIDENCE", id: `authority:${revision}` }],
    ...overrides
  };
}

test("first Authority commit requires exact Candidate, human PASS Review, Scope, Basis, and assessment", async () => {
  const env = await setup();
  createReviewedCandidate(env, "candidate-v1", { meaning: "v1", nested: { z: 2, a: 1 } });
  const result = env.service.commitAuthority(commitInput("authority-v1", "candidate-v1"));
  assert.equal(result.status, "CREATED");
  assert.equal(result.authority.authorityKey, "display.settings");
  assert.equal(result.authority.reviewId, "review:candidate-v1");
  assert.equal(result.authority.supersedesAuthorityRef, undefined);
  assert.equal("payload" in result.authority, false);
  const expectedDigest = `sha256:${createHash("sha256").update('{"meaning":"v1","nested":{"a":1,"z":2}}').digest("hex")}`;
  assert.equal(result.authority.sourceBinding.payloadDigest, expectedDigest);
  assert.deepEqual(env.authorities.getCanonicalSource("contract/semantic/display/settings.yaml"), { meaning: "v1", nested: { a: 1, z: 2 } });
});

test("Authority payload digest uses locale-independent ordinal ordering for non-ASCII keys", async () => {
  const env = await setup();
  createReviewedCandidate(env, "candidate-v1", { z: 1, "ä": 2, a: 3 });
  const result = env.service.commitAuthority(commitInput("authority-v1", "candidate-v1"));
  const expectedCanonical = '{"a":3,"z":1,"ä":2}';
  const expectedDigest = `sha256:${createHash("sha256").update(expectedCanonical).digest("hex")}`;
  assert.equal(result.authority.sourceBinding.payloadDigest, expectedDigest);
  assert.deepEqual(env.authorities.getCanonicalSource("contract/semantic/display/settings.yaml"), { a: 3, z: 1, "ä": 2 });
});

test("supersede binds a fresh reviewed Candidate and exact expected Authority head", async () => {
  const env = await setup();
  const firstCandidate = createReviewedCandidate(env, "candidate-v1", { meaning: "v1" }).candidate;
  const first = env.service.commitAuthority(commitInput("authority-v1", "candidate-v1"));
  createReviewedCandidate(env, "candidate-v2", { meaning: "v2" }, firstCandidate.candidateRef);
  const secondInput = commitInput("authority-v2", "candidate-v2", {
    operationId: "op:authority-v2",
    expectedAuthorityHead: first.authority.authorityRef,
    canonicalPath: "contract/semantic/relocated/display.yml"
  });
  const second = env.service.supersedeAuthority(secondInput);
  assert.equal(second.status, "CREATED");
  assert.deepEqual(second.authority.supersedesAuthorityRef, first.authority.authorityRef);
  assert.deepEqual(env.authorities.getCurrentAuthority("display.settings"), second.authority);
  assert.deepEqual(env.authorities.getAuthority(first.authority.authorityRef), first.authority);
});

test("stale Scope/Basis, Candidate/Review mismatch, and non-PASS Review fail before Authority mutation", async () => {
  const env = await setup();
  createReviewedCandidate(env, "candidate-v1", { meaning: "v1" });
  const staleBasis = { ...basisRef, revision: "policy-v2", digest: "sha256:policy-v2" };
  assert.throws(() => env.service.commitAuthority(commitInput("authority-v1", "candidate-v1", { expectedClassificationBasisRef: staleBasis })), /AUTHORITY_CLASSIFICATION_BASIS_MISMATCH/);
  assert.equal(env.authorities.getCurrentAuthority("display.settings"), undefined);

  const candidateV1 = env.candidates.getCandidate(candidateRef("candidate-v1"));
  createReviewedCandidate(env, "candidate-v2", { meaning: "v2" }, candidateV1.candidateRef);
  assert.throws(() => env.service.commitAuthority(commitInput("authority-v1", "candidate-v2", { reviewId: "review:candidate-v1" })), /AUTHORITY_REVIEW_NOT_FRESH:STALE_CANDIDATE/);
  assert.equal(env.authorities.getCurrentAuthority("display.settings"), undefined);

  const rejectEnv = await setup();
  createReviewedCandidate(rejectEnv, "candidate-v1", { meaning: "v1" }, undefined, { verdict: "REJECT" });
  assert.throws(() => rejectEnv.service.commitAuthority(commitInput("authority-v1", "candidate-v1")), /AUTHORITY_REVIEW_NOT_FRESH:REVIEW_NOT_PASS/);
  assert.equal(rejectEnv.authorities.getCurrentAuthority("display.settings"), undefined);
});

test("initial and superseding operation shapes fail closed when used interchangeably", async () => {
  const env = await setup();
  createReviewedCandidate(env, "candidate-v1", { meaning: "v1" });
  assert.throws(() => env.service.commitAuthority(commitInput("authority-v1", "candidate-v1", { expectedAuthorityHead: authorityRef("old") })), /INITIAL_AUTHORITY_EXPECTED_HEAD/);
  assert.throws(() => env.service.supersedeAuthority(commitInput("authority-v1", "candidate-v1")), /SUPERSEDE_AUTHORITY_EXPECTED_HEAD/);
  assert.equal(env.authorities.getCurrentAuthority("display.settings"), undefined);
});

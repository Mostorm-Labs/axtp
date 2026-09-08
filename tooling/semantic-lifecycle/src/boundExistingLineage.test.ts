// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { InMemoryLifecycleControlStore } from "./controlStore.js";
import { InMemorySemanticCandidateStore } from "./candidateStore.js";
import { BoundExistingRoute } from "./boundExistingRoute.js";

const fixtures = JSON.parse(readFileSync("fixtures/bound-existing/route-cases.json", "utf8"));
const copy = (v) => structuredClone(v);
const caseId = fixtures.case.reconstructionCaseId;
const candidateRef = (revision) => ({ refType: "IMMUTABLE_REVISION", namespace: "semantic-candidate", subject: "candidate-1", revision, digest: `sha256:${revision}` });
const selectionRef = fixtures.selection.basisSelectionRef;
function candidate(revision = "c1", overrides = {}) {
  return { schemaVersion: 2, candidateId: "candidate-1", candidateRef: candidateRef(revision),
    provenance: { route: "BOUND_EXISTING", reconstructionCaseId: caseId, basisSelectionRef: selectionRef },
    payload: { meaning: revision }, evidenceRefs: [{ refType: "EVIDENCE", id: `candidate-${revision}` }], ...overrides };
}
function selection(revision, protocolRevision = revision) {
  const protocolBasis = { ...copy(fixtures.selection.protocolBasis), protocolAuthorityRef: { ...fixtures.selection.protocolBasis.protocolAuthorityRef, revision: protocolRevision } };
  const basisSelectionRef = { ...selectionRef, revision, digest: `sha256:${revision}` };
  if (revision === "a1") return { ...copy(fixtures.selection), basisSelectionRef, protocolBasis };
  const supersedesBasisSelectionRef = revision === "b2" ? selectionRef : { ...selectionRef, revision: "b2", digest: "sha256:b2" };
  return { ...copy(fixtures.selection), basisSelectionRef, protocolBasis, supersedesBasisSelectionRef };
}
function proof(candidateRefValue = candidateRef("c1"), selectionRefValue = selectionRef, overrides = {}) {
  if (candidateRefValue && candidateRefValue.refType !== "IMMUTABLE_REVISION") {
    overrides = candidateRefValue;
    candidateRefValue = candidateRef("c1");
    selectionRefValue = selectionRef;
  }
  return {
    schemaVersion: 1,
    receiptId: "proof-1",
    proofKind: "BOUND_EXISTING_RECONSTRUCTION",
    proofContractVersion: "v1",
    engine: { name: "proof", version: "1" },
    reconstructionCaseId: caseId,
    candidateRef: candidateRefValue,
    basisSelectionRef: selectionRefValue,
    verdict: "PASS",
    inputDigest: "sha256:proof",
    ruleIds: ["RULE"],
    diagnostics: [],
    evidenceRefs: [{ refType: "EVIDENCE", id: "proof-evidence" }],
    ...overrides
  };
}
function review(reviewKind, candidateRefValue = candidateRef("c1"), selectionRefValue = selectionRef, verdict = "PASS", overrides = {}) {
  if (candidateRefValue && candidateRefValue.refType !== "IMMUTABLE_REVISION") {
    overrides = candidateRefValue;
    candidateRefValue = candidateRef("c1");
    selectionRefValue = selectionRef;
    verdict = "PASS";
  }
  return {
    schemaVersion: 2,
    reviewId: reviewKind === "NO_REINTERPRETATION" ? "no-reinterpretation-review" : "semantic-review",
    reviewKind,
    decisionSource: "HUMAN",
    verdict,
    candidateRef: candidateRefValue,
    provenance: {
      route: "BOUND_EXISTING",
      reconstructionCaseId: caseId,
      basisSelectionRef: selectionRefValue
    },
    evidenceRefs: [{ refType: "EVIDENCE", id: `review-${reviewKind}` }],
    ...overrides
  };
}
function nextSelection(revision, _previous) {
  return selection(revision, revision === "b2" ? "b" : revision);
}
async function setup() {
  const control = new InMemoryLifecycleControlStore();
  const candidates = new InMemorySemanticCandidateStore();
  let adopted = copy(fixtures.selection.protocolBasis);
  const route = new BoundExistingRoute(control, { readAdoptedProtocolBasis: () => copy(adopted) }, candidates);
  route.registerMigrationBasis({ operationId: "migration", record: copy(fixtures.migration) });
  route.openReconstruction({ operationId: "open", selection: copy(fixtures.selection), reconstructionCase: copy(fixtures.case) });
  return { control, candidates, route, adopt: (basis) => { adopted = basis; } };
}

test("BOUND_EXISTING Candidate create binds the exact open selection and publishes one receipt", async () => {
  const { route, control, candidates } = await setup();
  const value = candidate();
  const receipt = route.createCandidate({ operationId: "candidate-create", candidate: value });
  assert.equal(receipt.status, "CREATED");
  assert.deepEqual(candidates.getCandidateV2(value.candidateRef), value);
  assert.deepEqual(candidates.getCandidateHead("candidate-1"), value.candidateRef);
  assert.deepEqual(control.getOperationReceipt("candidate-create"), receipt);
  assert.deepEqual(route.createCandidate({ operationId: "candidate-create", candidate: copy(value) }), receipt);
});

test("Candidate revision uses exact head CAS and reason-specific selection binding", async () => {
  const { route, candidates, adopt } = await setup();
  const first = candidate();
  route.createCandidate({ operationId: "candidate-create", candidate: first });
  const repaired = candidate("c2", { supersedesCandidateRef: first.candidateRef });
  assert.equal(route.reviseCandidate({ operationId: "candidate-repair", candidate: repaired, expectedCandidateRef: first.candidateRef, revisionReason: "REPAIR" }).status, "CREATED");
  assert.throws(() => route.reviseCandidate({ operationId: "stale", candidate: candidate("c3", { supersedesCandidateRef: first.candidateRef }), expectedCandidateRef: first.candidateRef, revisionReason: "REPAIR" }), /CANDIDATE_HEAD_CONFLICT/);
  assert.equal(candidates.getCandidateHead("candidate-1").revision, "c2");
});

test("basis reselection invalidates old Candidate and A1-B2-A3 never resurrects A1", async () => {
  const { route, candidates, adopt } = await setup();
  const first = candidate();
  route.createCandidate({ operationId: "candidate-create", candidate: first });
  const nextSelection = selection("b2", "b");
  adopt(nextSelection.protocolBasis);
  route.reselectBasis({ operationId: "reselect-b", expectedBasisSelectionRef: selectionRef, selection: nextSelection });
  assert.throws(() => route.reviseCandidate({ operationId: "wrong-repair", candidate: candidate("c2", { supersedesCandidateRef: first.candidateRef }), expectedCandidateRef: first.candidateRef, revisionReason: "REPAIR" }), /BASIS_SELECTION_CONFLICT/);
  const revised = candidate("c2", { supersedesCandidateRef: first.candidateRef, provenance: { route: "BOUND_EXISTING", reconstructionCaseId: caseId, basisSelectionRef: nextSelection.basisSelectionRef } });
  route.reviseCandidate({ operationId: "reselect-candidate", candidate: revised, expectedCandidateRef: first.candidateRef, revisionReason: "BASIS_RESELECTION" });
  assert.equal(candidates.getCandidateHead("candidate-1").revision, "c2");
  const a3 = selection("a3", "a3");
  adopt(a3.protocolBasis);
  route.reselectBasis({ operationId: "reselect-a3", expectedBasisSelectionRef: nextSelection.basisSelectionRef, selection: a3 });
  const third = candidate("c3", { supersedesCandidateRef: revised.candidateRef,
    provenance: { route: "BOUND_EXISTING", reconstructionCaseId: caseId, basisSelectionRef: a3.basisSelectionRef } });
  route.reviseCandidate({ operationId: "reselect-candidate-a3", candidate: third, expectedCandidateRef: revised.candidateRef, revisionReason: "BASIS_RESELECTION" });
  assert.equal(candidates.getCandidateHead("candidate-1").revision, "c3");
  assert.equal(candidates.getCandidateV2(first.candidateRef).payload.meaning, "c1");
  assert.throws(() => route.reviseCandidate({ operationId: "resurrect-a1", candidate: candidate("c4", { supersedesCandidateRef: first.candidateRef, provenance: { route: "BOUND_EXISTING", reconstructionCaseId: caseId, basisSelectionRef: a3.basisSelectionRef } }), expectedCandidateRef: first.candidateRef, revisionReason: "BASIS_RESELECTION" }), /CANDIDATE_HEAD_CONFLICT/);
});

test("prepared Candidate CAS allows one winner and aborts cannot publish later", async () => {
  const store = new InMemorySemanticCandidateStore();
  const first = candidate();
  store.putCandidateV2(first, null);
  const second = candidate("c2", { supersedesCandidateRef: first.candidateRef });
  const prepared = store.prepareCandidatePublication(second, first.candidateRef);
  assert.throws(() => store.prepareCandidatePublication(candidate("c3", { supersedesCandidateRef: first.candidateRef }), first.candidateRef), /CANDIDATE_PUBLICATION_RESERVED/);
  prepared.abort();
  assert.doesNotThrow(() => prepared.abort());
  const third = candidate("c3", { supersedesCandidateRef: first.candidateRef });
  const winner = store.prepareCandidatePublication(third, first.candidateRef);
  prepared.commit();
  winner.commit();
  assert.equal(store.getCandidateHead("candidate-1").revision, "c3");
});

test("lineage and self-supersession boundaries fail closed", async () => {
  const { route, candidates } = await setup();
  const first = candidate();
  route.createCandidate({ operationId: "candidate-create", candidate: first });
  assert.throws(() => route.reviseCandidate({ operationId: "self", candidate: candidate("c2", { supersedesCandidateRef: candidateRef("c2") }), expectedCandidateRef: first.candidateRef, revisionReason: "REPAIR" }), /CANDIDATE_SUPERSESSION_CONFLICT|INVALID_CANDIDATE_SUPERSESSION|INVALID_RECORD:self-supersession/);
  assert.throws(() => route.reviseCandidate({ operationId: "cross-case", candidate: candidate("c2", { supersedesCandidateRef: first.candidateRef, provenance: { route: "BOUND_EXISTING", reconstructionCaseId: "other-case", basisSelectionRef: selectionRef } }), expectedCandidateRef: first.candidateRef, revisionReason: "REPAIR" }), /INVALID_CANDIDATE_LINEAGE|CASE_NOT_OPEN|BASIS_SELECTION_CONFLICT|INVALID_RECORD:ref-identity/);
  const semanticFirst = candidate("c2", { supersedesCandidateRef: first.candidateRef, provenance: { route: "SEMANTIC_FIRST", caseId: caseId, assessmentId: "assessment", scopeRef: selectionRef, classificationBasisRef: selectionRef } });
  assert.throws(() => route.reviseCandidate({ operationId: "cross-route", candidate: semanticFirst, expectedCandidateRef: first.candidateRef, revisionReason: "REPAIR" }), /INVALID_CANDIDATE_ROUTE/);
  assert.equal(candidates.getCandidateHead("candidate-1").revision, "c1");
});

test("v1 and v2 immutable candidate references cannot collide", async () => {
  const store = new InMemorySemanticCandidateStore();
  const v2 = candidate();
  store.putCandidateV2(v2, null);
  const v1 = { candidateId: "candidate-1", caseId: "case-v1", candidateRef: v2.candidateRef, assessmentId: "assessment", scopeRef: selectionRef, classificationBasisRef: selectionRef, payload: {}, evidenceRefs: [] };
  assert.throws(() => store.putCandidate(v1), /IMMUTABLE_CANDIDATE_CONFLICT/);
  const reverse = new InMemorySemanticCandidateStore();
  reverse.putCandidate(v1);
  assert.throws(() => reverse.putCandidateV2(v2, null), /IMMUTABLE_CANDIDATE_CONFLICT/);
});

test("operation-id conflict is checked before Candidate mutation", async () => {
  const { route, candidates, control } = await setup();
  const first = candidate();
  route.createCandidate({ operationId: "same-operation", candidate: first });
  assert.throws(() => route.createCandidate({ operationId: "same-operation", candidate: candidate("other") }), /OPERATION_ID_CONFLICT/);
  assert.equal(candidates.getCandidateHead("candidate-1").revision, "c1");
  assert.equal(control.getOperationReceipt("same-operation").resultRef.revision, "c1");
});

test("proof then both human review route operations bind the current case, candidate, and selection exactly", async () => {
  const { route, control, adopt } = await setup();
  const currentCandidate = candidate();
  route.createCandidate({ operationId: "candidate-create", candidate: currentCandidate });

  const proofReceipt = route.recordBoundExistingMachineProof({
    operationId: "proof-operation",
    proof: proof()
  });
  assert.equal(proofReceipt.status, "CREATED");
  assert.deepEqual(control.getBoundExistingMachineProof("proof-1"), proof());
  assert.deepEqual(route.recordBoundExistingMachineProof({ operationId: "proof-operation", proof: copy(proof()) }), proofReceipt);

  for (const reviewKind of ["SEMANTIC_CANDIDATE", "NO_REINTERPRETATION"]) {
    const record = review(reviewKind);
    const receipt = route[reviewKind === "SEMANTIC_CANDIDATE" ? "recordSemanticCandidateReview" : "recordNoReinterpretationReview"]({
      operationId: `${reviewKind.toLowerCase()}-review`,
      review: record
    });
    assert.equal(receipt.status, "CREATED");
    assert.deepEqual(control.getHumanReviewDecisionV2(record.reviewId), record);
  }

  assert.throws(() => route.recordBoundExistingMachineProof({
    operationId: "machine-overwrite",
    proof: proof({ receiptId: "proof-2" })
  }), /PROOF_ALREADY_DECIDED|IMMUTABLE_RECORD_CONFLICT/);
  assert.throws(() => route.recordSemanticCandidateReview({
    operationId: "review-overwrite",
    review: review("SEMANTIC_CANDIDATE", { reviewId: "semantic-review-2" })
  }), /REVIEW_ALREADY_DECIDED|IMMUTABLE_RECORD_CONFLICT/);

  adopt(nextSelection("b2", selectionRef).protocolBasis);
  route.reselectBasis({
    operationId: "reselect-b",
    expectedBasisSelectionRef: selectionRef,
    selection: nextSelection("b2", selectionRef)
  });
  assert.throws(() => route.recordBoundExistingMachineProof({
    operationId: "stale-proof",
    proof: proof({ basisSelectionRef: selectionRef, receiptId: "proof-3" })
  }), /BASIS_SELECTION_CONFLICT|CASE_NOT_OPEN/);
  assert.throws(() => route.recordNoReinterpretationReview({
    operationId: "stale-review",
    review: review("NO_REINTERPRETATION", { reviewId: "stale-review", provenance: { route: "BOUND_EXISTING", reconstructionCaseId: caseId, basisSelectionRef: selectionRef } })
  }), /BASIS_SELECTION_CONFLICT|CASE_NOT_OPEN/);
  assert.equal(control.getReconstructionCase(caseId).status, "OPEN");
  assert.equal(control.getIncompatibilityDetermination("determination-1"), undefined);
});

test("proof PASS gates both independent HUMAN reviews on the exact current lineage", async () => {
  const { route, control, candidates } = await setup();
  const current = candidate();
  route.createCandidate({ operationId: "candidate-for-proof", candidate: current });
  const machine = proof(current.candidateRef);
  assert.equal(route.recordMachineProof({ operationId: "proof-pass", proof: machine }).status, "CREATED");
  assert.equal(route.recordHumanReview({ operationId: "semantic-review", review: review("SEMANTIC_CANDIDATE", current.candidateRef) }).status, "CREATED");
  assert.equal(route.recordHumanReview({ operationId: "no-reinterpretation-review", review: review("NO_REINTERPRETATION", current.candidateRef) }).status, "CREATED");
  assert.equal(control.getBoundExistingMachineProof(machine.receiptId).verdict, "PASS");
  assert.equal(control.getHumanReviewDecisionV2("semantic-review").verdict, "PASS");
  assert.equal(control.getHumanReviewDecisionV2("no-reinterpretation-review").verdict, "PASS");
  assert.equal(candidates.getCandidateHead("candidate-1").revision, "c1");
});

test("proof/review failures remain OPEN and cannot be replaced or machine-authored", async () => {
  const { route, control } = await setup();
  const current = candidate();
  route.createCandidate({ operationId: "candidate-for-failure", candidate: current });
  assert.throws(() => route.recordHumanReview({ operationId: "review-before-proof", review: review("SEMANTIC_CANDIDATE", current.candidateRef) }), /PROOF_REQUIRED/);
  const failed = proof(current.candidateRef, selectionRef, { verdict: "FAIL" });
  assert.equal(route.recordMachineProof({ operationId: "proof-fail", proof: failed }).status, "CREATED");
  assert.throws(() => route.recordHumanReview({ operationId: "review-after-fail", review: review("SEMANTIC_CANDIDATE", current.candidateRef) }), /PROOF_REQUIRED/);
  assert.throws(() => route.recordMachineProof({ operationId: "proof-pass-conflict", proof: proof(current.candidateRef) }), /PROOF_ALREADY_DECIDED|IMMUTABLE_RECORD_CONFLICT/);
  assert.throws(() => route.recordHumanReview({ operationId: "machine-review", review: review("SEMANTIC_CANDIDATE", current.candidateRef, selectionRef, "PASS", { decisionSource: "MACHINE" }) }), /INVALID_REVIEW_SOURCE/);
  assert.equal(control.getReconstructionCase(caseId).status, "OPEN");
  assert.equal(control.getHumanReviewDecisionV2("SEMANTIC_CANDIDATE-review-c1"), undefined);
});

test("a HUMAN REJECT is immutable for its review kind and lineage", async () => {
  const { route, control } = await setup();
  const current = candidate();
  route.createCandidate({ operationId: "candidate-for-reject", candidate: current });
  route.recordMachineProof({ operationId: "proof-for-reject", proof: proof(current.candidateRef) });
  route.recordHumanReview({ operationId: "reject-review", review: review("SEMANTIC_CANDIDATE", current.candidateRef, selectionRef, "REJECT") });
  assert.throws(() => route.recordHumanReview({ operationId: "overwrite-reject", review: review("SEMANTIC_CANDIDATE", current.candidateRef) }), /REVIEW_ALREADY_DECIDED|IMMUTABLE_RECORD_CONFLICT/);
  assert.equal(control.getReconstructionCase(caseId).status, "OPEN");
});

test("repair and basis reselection make old proof and reviews stale", async () => {
  const { route, adopt } = await setup();
  const first = candidate();
  route.createCandidate({ operationId: "candidate-before-proof", candidate: first });
  route.recordMachineProof({ operationId: "proof-before-repair", proof: proof(first.candidateRef) });
  route.recordHumanReview({ operationId: "review-before-repair", review: review("SEMANTIC_CANDIDATE", first.candidateRef) });
  const repaired = candidate("c2", { supersedesCandidateRef: first.candidateRef });
  route.reviseCandidate({ operationId: "repair", candidate: repaired, expectedCandidateRef: first.candidateRef, revisionReason: "REPAIR" });
  assert.throws(() => route.recordHumanReview({ operationId: "stale-review", review: review("NO_REINTERPRETATION", first.candidateRef) }), /CANDIDATE_HEAD_CONFLICT|STALE/);
  const b2 = selection("b2", "b");
  adopt(b2.protocolBasis);
  route.reselectBasis({ operationId: "basis-b2", expectedBasisSelectionRef: selectionRef, selection: b2 });
  assert.throws(() => route.recordMachineProof({ operationId: "stale-proof", proof: proof(repaired.candidateRef, b2.basisSelectionRef) }), /PROOF_REQUIRED|CANDIDATE_HEAD_CONFLICT|BASIS_SELECTION_CONFLICT/);
});

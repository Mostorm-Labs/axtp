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

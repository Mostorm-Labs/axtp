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
  const nextSelection = { ...copy(fixtures.selection), basisSelectionRef: { ...selectionRef, revision: "b2", digest: "sha256:b2" }, supersedesBasisSelectionRef: selectionRef,
    protocolBasis: { ...copy(fixtures.selection.protocolBasis), protocolAuthorityRef: { ...fixtures.selection.protocolBasis.protocolAuthorityRef, revision: "b" } } };
  adopt(nextSelection.protocolBasis);
  route.reselectBasis({ operationId: "reselect-b", expectedBasisSelectionRef: selectionRef, selection: nextSelection });
  assert.throws(() => route.reviseCandidate({ operationId: "wrong-repair", candidate: candidate("c2", { supersedesCandidateRef: first.candidateRef }), expectedCandidateRef: first.candidateRef, revisionReason: "REPAIR" }), /BASIS_SELECTION_CONFLICT/);
  const revised = candidate("c2", { supersedesCandidateRef: first.candidateRef, provenance: { route: "BOUND_EXISTING", reconstructionCaseId: caseId, basisSelectionRef: nextSelection.basisSelectionRef } });
  route.reviseCandidate({ operationId: "reselect-candidate", candidate: revised, expectedCandidateRef: first.candidateRef, revisionReason: "BASIS_RESELECTION" });
  assert.equal(candidates.getCandidateHead("candidate-1").revision, "c2");
  assert.equal(candidates.getCandidateV2(first.candidateRef).payload.meaning, "c1");
});

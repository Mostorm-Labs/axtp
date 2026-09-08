// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { InMemoryLifecycleControlStore } from "./controlStore.js";

const fixtures = JSON.parse(readFileSync("fixtures/bound-existing/route-cases.json", "utf8"));
const copy = (value) => structuredClone(value);
const caseId = fixtures.case.reconstructionCaseId;
const ref = (namespace, subject, revision) => ({ refType: "IMMUTABLE_REVISION", namespace, subject, revision });
const candidateRef = ref("semantic-candidate", "candidate-1", "a");
const evidenceRefs = [{ refType: "EVIDENCE", id: "governed-evidence" }];

async function setup(open = true) {
  const module = await import("./boundExistingRoute.js").catch(() => null);
  assert.ok(module?.BoundExistingRoute, "BoundExistingRoute must provide explicit lifecycle operations");
  const store = new InMemoryLifecycleControlStore();
  let adopted = copy(fixtures.selection.protocolBasis);
  const route = new module.BoundExistingRoute(store, { readAdoptedProtocolBasis: () => copy(adopted) });
  route.registerMigrationBasis({ operationId: "register", record: copy(fixtures.migration) });
  if (open) route.openReconstruction({ operationId: "open", selection: copy(fixtures.selection), reconstructionCase: copy(fixtures.case) });
  return { store, route, adopt: (basis) => { adopted = basis; } };
}

function nextSelection(revision = "b2", predecessor = fixtures.selection.basisSelectionRef) {
  return { ...copy(fixtures.selection), basisSelectionRef: { ...predecessor, revision },
    supersedesBasisSelectionRef: predecessor,
    protocolBasis: { ...copy(fixtures.selection.protocolBasis), protocolAuthorityRef: { ...fixtures.selection.protocolBasis.protocolAuthorityRef, revision: "b" } } };
}

function operation(id = "future", kind = "CREATE_BOUND_EXISTING_CANDIDATE") {
  return { operationVersion: 1, operationId: id, operationKind: kind, payload: { candidateRef } };
}
function receipt(command, overrides = {}) {
  return { schemaVersion: 2, route: "BOUND_EXISTING", operationId: command.operationId,
    operationKind: command.operationKind, status: "CREATED", ...overrides };
}
function proof(overrides = {}) {
  return { schemaVersion: 1, receiptId: "proof-1", proofKind: "BOUND_EXISTING_RECONSTRUCTION", proofContractVersion: "v1",
    engine: { name: "proof", version: "1" }, reconstructionCaseId: caseId, candidateRef,
    basisSelectionRef: fixtures.selection.basisSelectionRef, verdict: "PASS", inputDigest: "sha256:a",
    ruleIds: ["RULE"], diagnostics: [], evidenceRefs, ...overrides };
}
function review(overrides = {}) {
  return { schemaVersion: 2, reviewId: "semantic-review", reviewKind: "SEMANTIC_CANDIDATE", decisionSource: "HUMAN", verdict: "PASS", candidateRef,
    provenance: { route: "BOUND_EXISTING", reconstructionCaseId: caseId, basisSelectionRef: fixtures.selection.basisSelectionRef }, evidenceRefs, ...overrides };
}
function determination(overrides = {}) {
  return { schemaVersion: 1, determinationId: "determination-1", reconstructionCaseId: caseId,
    basisSelectionRef: fixtures.selection.basisSelectionRef, outcome: "SEMANTIC_CHANGE_REQUIRED", evidenceRefs, ...overrides };
}

test("registration canonical replay binds the entire command and immutable exact revision", async () => {
  const { store, route } = await setup(false);
  const prior = store.getOperationReceipt("register");
  assert.equal(prior.status, "CREATED");
  assert.deepEqual(route.registerMigrationBasis({ record: copy(fixtures.migration), operationId: "register" }), prior);
  assert.equal(route.registerMigrationBasis({ operationId: "register-again", record: copy(fixtures.migration) }).status, "IDEMPOTENT");
  const changed = { ...copy(fixtures.migration), payload: { meaning: "changed" } };
  assert.throws(() => route.registerMigrationBasis({ operationId: "register", record: changed }), /OPERATION_ID_CONFLICT/);
  assert.throws(() => route.registerMigrationBasis({ operationId: "conflict", record: changed }), /IMMUTABLE_RECORD_CONFLICT/);
  assert.equal(store.getOperationReceipt("conflict"), undefined);
  assert.deepEqual(store.getMigrationBasis(fixtures.migration.migrationBasisRef), fixtures.migration);
  changed.migrationBasisRef.revision = "b";
  route.registerMigrationBasis({ operationId: "revision-b", record: changed });
  assert.equal(store.getMigrationBasis(changed.migrationBasisRef).payload.meaning, "changed");
  assert.equal(store.getMigrationBasis({ ...changed.migrationBasisRef, digest: "other" }), undefined);
});

test("open publishes case, selection and operation receipt atomically as frozen exact records", async () => {
  const { route, store } = await setup(false);
  const selection = copy(fixtures.selection);
  route.openReconstruction({ operationId: "open", selection, reconstructionCase: copy(fixtures.case) });
  selection.protocolBasis.protocolAuthorityRef.revision = "tampered";
  assert.deepEqual(store.getBasisSelection(fixtures.selection.basisSelectionRef), fixtures.selection);
  assert.deepEqual(store.getReconstructionCase(caseId), fixtures.case);
  assert.ok(Object.isFrozen(store.getBasisSelection(fixtures.selection.basisSelectionRef).protocolBasis));
  assert.throws(() => { store.getReconstructionCase(caseId).status = "CANCELLED"; });
  assert.equal(store.getOperationReceipt("open").status, "CREATED");
  assert.throws(() => route.openReconstruction({ operationId: "open-again", selection: copy(fixtures.selection), reconstructionCase: copy(fixtures.case) }), /CASE_ALREADY_EXISTS/);
  assert.equal(store.getOperationReceipt("open-again"), undefined);
});

test("invalid open, missing migration, stale adoption and unknown operation discriminators leave no partial writes", async () => {
  for (const defect of ["case-ref", "predecessor", "missing-migration", "stale-adoption", "version", "kind", "unknown-field"]) {
    const { store, route, adopt } = await setup(false);
    const command = { operationId: "bad-open", selection: copy(fixtures.selection), reconstructionCase: copy(fixtures.case) };
    if (defect === "case-ref") command.reconstructionCase.basisSelectionRef.revision = "different";
    if (defect === "predecessor") command.selection.supersedesBasisSelectionRef = { ...command.selection.basisSelectionRef, revision: "previous" };
    if (defect === "missing-migration") command.selection.migrationBasisRef.revision = "missing";
    if (defect === "stale-adoption") adopt(nextSelection().protocolBasis);
    if (defect === "version") command.operationVersion = 2;
    if (defect === "kind") command.operationKind = "UNKNOWN";
    if (defect === "unknown-field") command.ready = true;
    assert.throws(() => route.openReconstruction(command), undefined, defect);
    assert.equal(store.getReconstructionCase(caseId), undefined, defect);
    assert.equal(store.getBasisSelection(fixtures.selection.basisSelectionRef), undefined, defect);
    assert.equal(store.getOperationReceipt("bad-open"), undefined, defect);
  }
});

test("registration rejects wrong migration namespace and subject with zero receipt", async () => {
  const { store, route } = await setup(false);
  for (const field of ["namespace", "subject"]) {
    const record = copy(fixtures.migration);
    record.migrationBasisRef[field] = "wrong";
    assert.throws(() => route.registerMigrationBasis({ operationId: field, record }));
    assert.equal(store.getOperationReceipt(field), undefined);
  }
});

test("equal bases are NOOP without an occurrence, even when a new ref was proposed", async () => {
  const { store, route } = await setup();
  const selection = { ...copy(fixtures.selection), basisSelectionRef: { ...fixtures.selection.basisSelectionRef, revision: "unused" }, supersedesBasisSelectionRef: fixtures.selection.basisSelectionRef };
  const command = { operationId: "noop", expectedBasisSelectionRef: fixtures.selection.basisSelectionRef, selection };
  assert.equal(route.reselectBasis(command).status, "NOOP");
  assert.equal(store.getBasisSelection(selection.basisSelectionRef), undefined);
  assert.deepEqual(store.getReconstructionCase(caseId).basisSelectionRef, fixtures.selection.basisSelectionRef);
  assert.deepEqual(route.reselectBasis(command), store.getOperationReceipt("noop"));
});

test("A1 to B2 to A3 preserves historical selections and never revives A1", async () => {
  const { store, route, adopt } = await setup();
  const b = nextSelection();
  adopt(b.protocolBasis);
  route.reselectBasis({ operationId: "to-b", expectedBasisSelectionRef: fixtures.selection.basisSelectionRef, selection: b });
  const a = { ...copy(fixtures.selection), basisSelectionRef: { ...fixtures.selection.basisSelectionRef, revision: "a3" }, supersedesBasisSelectionRef: b.basisSelectionRef };
  adopt(a.protocolBasis);
  assert.throws(() => route.reselectBasis({ operationId: "resurrect", expectedBasisSelectionRef: b.basisSelectionRef,
    selection: { ...a, basisSelectionRef: fixtures.selection.basisSelectionRef } }), /IMMUTABLE_RECORD_CONFLICT/);
  assert.equal(store.getOperationReceipt("resurrect"), undefined);
  route.reselectBasis({ operationId: "to-a", expectedBasisSelectionRef: b.basisSelectionRef, selection: a });
  assert.equal(store.getReconstructionCase(caseId).basisSelectionRef.revision, "a3");
  assert.equal(store.getBasisSelection(fixtures.selection.basisSelectionRef).basisSelectionRef.revision, "a1");
  assert.equal(store.getBasisSelection(b.basisSelectionRef).basisSelectionRef.revision, "b2");
});

test("changed reselection CAS has one winner and rejects digest mismatch, wrong predecessor and stale adoption", async () => {
  const { store, route, adopt } = await setup();
  const b = nextSelection();
  adopt(b.protocolBasis);
  for (const defect of ["digest", "predecessor", "adoption"]) {
    const command = { operationId: defect, expectedBasisSelectionRef: copy(fixtures.selection.basisSelectionRef), selection: copy(b) };
    if (defect === "digest") command.expectedBasisSelectionRef.digest = "wrong";
    if (defect === "predecessor") command.selection.supersedesBasisSelectionRef.revision = "wrong";
    if (defect === "adoption") command.selection.protocolBasis.adoptionEvidenceRefs = [];
    assert.throws(() => route.reselectBasis(command));
    assert.equal(store.getBasisSelection(b.basisSelectionRef), undefined);
    assert.equal(store.getOperationReceipt(defect), undefined);
  }
  route.reselectBasis({ operationId: "winner", expectedBasisSelectionRef: fixtures.selection.basisSelectionRef, selection: b });
  assert.throws(() => route.reselectBasis({ operationId: "loser", expectedBasisSelectionRef: fixtures.selection.basisSelectionRef, selection: nextSelection("b-other") }), /BASIS_SELECTION_CONFLICT/);
  assert.equal(store.getOperationReceipt("loser"), undefined);
  assert.equal(store.getReconstructionCase(caseId).basisSelectionRef.revision, "b2");
});

test("cancel is terminal, replay remains historical and different operation kinds conflict", async () => {
  const { store, route, adopt } = await setup();
  const command = { operationId: "cancel", reconstructionCaseId: caseId };
  const result = route.cancelReconstruction(command);
  assert.equal(store.getReconstructionCase(caseId).status, "CANCELLED");
  adopt(nextSelection().protocolBasis);
  assert.deepEqual(route.cancelReconstruction(command), result);
  assert.equal(route.openReconstruction({ operationId: "open", selection: copy(fixtures.selection), reconstructionCase: copy(fixtures.case) }).status, "CREATED");
  assert.throws(() => route.cancelReconstruction({ ...command, operationId: "cancel-again" }), /CASE_NOT_OPEN/);
  assert.throws(() => route.reselectBasis({ operationId: "reselect-after-cancel", expectedBasisSelectionRef: fixtures.selection.basisSelectionRef, selection: nextSelection() }), /CASE_NOT_OPEN/);
  assert.throws(() => route.registerMigrationBasis({ operationId: "cancel", record: copy(fixtures.migration) }), /OPERATION_ID_CONFLICT/);
  assert.equal(store.getOperationReceipt("cancel-again"), undefined);
});

test("prepared receipt and terminal state reserve control publication, abort cleanly, then commit without throwing", async () => {
  const { store, route } = await setup();
  assert.equal(typeof store.prepareTerminalTransition, "function");
  const command = operation("accept", "COMMIT_BOUND_EXISTING_AUTHORITY");
  const terminal = { ...copy(fixtures.case), status: "AUTHORITY_ACCEPTED", authorityRef: ref("semantic-authority", "authority-1", "a") };
  const prepared = store.prepareTerminalTransition(terminal, fixtures.selection.basisSelectionRef, { command, receipt: receipt(command) });
  assert.equal(store.getReconstructionCase(caseId).status, "OPEN");
  assert.equal(store.getOperationReceipt("accept"), undefined);
  assert.throws(() => route.cancelReconstruction({ operationId: "race", reconstructionCaseId: caseId }), /CONTROL_PUBLICATION_RESERVED/);
  prepared.abort();
  prepared.commit();
  assert.equal(store.getReconstructionCase(caseId).status, "OPEN");
  const second = store.prepareTerminalTransition(terminal, fixtures.selection.basisSelectionRef, { command, receipt: receipt(command) });
  assert.doesNotThrow(() => second.commit());
  assert.doesNotThrow(() => second.commit());
  assert.equal(store.getReconstructionCase(caseId).status, "AUTHORITY_ACCEPTED");
  assert.deepEqual(store.getOperationReceipt("accept"), receipt(command));
  assert.throws(() => route.cancelReconstruction({ operationId: "too-late", reconstructionCaseId: caseId }), /CASE_NOT_OPEN/);
});

test("receipt preparation validates before owner mutation and pins exact OPEN selection", async () => {
  const { store } = await setup();
  assert.equal(typeof store.prepareOperation, "function");
  const command = operation();
  const lineage = { reconstructionCaseId: caseId, basisSelectionRef: fixtures.selection.basisSelectionRef };
  assert.throws(() => store.prepareOperation({ command, receipt: receipt(command, { operationId: "mismatch" }) }, lineage));
  assert.throws(() => store.prepareOperation({ command, receipt: receipt(command) }, { ...lineage, basisSelectionRef: { ...lineage.basisSelectionRef, digest: "wrong" } }), /BASIS_SELECTION_CONFLICT/);
  assert.equal(store.getOperationReceipt(command.operationId), undefined);
  const prepared = store.prepareOperation({ command, receipt: receipt(command) }, lineage);
  prepared.commit();
  assert.deepEqual(store.replayOperation(command), receipt(command));
  assert.throws(() => store.prepareOperation({ command: { ...command, payload: { different: true } }, receipt: receipt(command) }, lineage), /OPERATION_ID_CONFLICT/);
});

test("store-level accepted command replay stays idempotent without rewriting receipts", async () => {
  const { store } = await setup();
  const record = proof();
  const command = { ...operation("proof-operation", "RECORD_BOUND_EXISTING_MACHINE_PROOF"), payload: { record } };
  assert.equal(store.putBoundExistingMachineProof(record, command), "CREATED");
  assert.equal(store.putBoundExistingMachineProof(copy(record), copy(command)), "IDEMPOTENT");
  assert.equal(store.getOperationReceipt("proof-operation").status, "CREATED");
  assert.throws(() => store.putBoundExistingMachineProof(proof({ receiptId: "another" }), { ...command, payload: { record: proof({ receiptId: "another" }) } }), /OPERATION_ID_CONFLICT/);
  assert.equal(store.getBoundExistingMachineProof("another"), undefined);
});

test("canonical operation replay distinguishes Unicode keys while ignoring their insertion order", async () => {
  const { store } = await setup();
  const command = { ...operation("unicode"), payload: { "é": "composed", "e\u0301": "decomposed" } };
  store.prepareOperation({ command, receipt: receipt(command) }, { reconstructionCaseId: caseId, basisSelectionRef: fixtures.selection.basisSelectionRef }).commit();
  assert.deepEqual(store.replayOperation({ ...command, payload: { "e\u0301": "decomposed", "é": "composed" } }), receipt(command));
  assert.throws(() => store.replayOperation({ ...command, payload: { "é": "different", "e\u0301": "decomposed" } }), /OPERATION_ID_CONFLICT/);
});

test("aborted preparation cannot overwrite a later selection and receipt failure never publishes terminal state", async () => {
  const { store, route, adopt } = await setup();
  const command = operation("terminal", "CANCEL_BOUND_EXISTING_RECONSTRUCTION");
  const terminal = { ...copy(fixtures.case), status: "CANCELLED" };
  assert.throws(() => store.prepareTerminalTransition(terminal, fixtures.selection.basisSelectionRef,
    { command, receipt: receipt(command, { status: "INVALID" }) }));
  assert.equal(store.getReconstructionCase(caseId).status, "OPEN");
  assert.equal(store.getOperationReceipt("terminal"), undefined);
  const aborted = store.prepareTerminalTransition(terminal, fixtures.selection.basisSelectionRef, { command, receipt: receipt(command) });
  aborted.abort();
  const selection = nextSelection();
  adopt(selection.protocolBasis);
  route.reselectBasis({ operationId: "advanced", expectedBasisSelectionRef: fixtures.selection.basisSelectionRef, selection });
  aborted.commit();
  aborted.abort();
  assert.equal(store.getReconstructionCase(caseId).status, "OPEN");
  assert.equal(store.getReconstructionCase(caseId).basisSelectionRef.revision, "b2");
  assert.equal(store.getOperationReceipt("terminal"), undefined);
  assert.ok(store.getOperationReceipt("advanced"));
});

test("prepared-control inputs reject accessor callbacks before reserving or publishing", async () => {
  for (const field of ["operation", "expected-ref"]) {
    const { store, route } = await setup();
    const command = operation("accessor", "CANCEL_BOUND_EXISTING_RECONSTRUCTION");
    let invoked = false;
    const context = { command, receipt: receipt(command) };
    const expected = copy(fixtures.selection.basisSelectionRef);
    if (field === "operation") Object.defineProperty(context, "command", { enumerable: true, get() { invoked = true; return command; } });
    if (field === "expected-ref") Object.defineProperty(expected, "revision", { enumerable: true, get() { invoked = true; return "a1"; } });
    assert.throws(() => store.prepareTerminalTransition({ ...copy(fixtures.case), status: "CANCELLED" }, expected, context));
    assert.equal(invoked, false, field);
    assert.equal(store.getOperationReceipt("accessor"), undefined);
    assert.equal(store.getReconstructionCase(caseId).status, "OPEN");
    route.cancelReconstruction({ operationId: "valid-cancel", reconstructionCaseId: caseId });
    assert.equal(store.getReconstructionCase(caseId).status, "CANCELLED");
  }
});

test("canonical evidence ordering replays and changed MigrationBasis alone creates a selection occurrence", async () => {
  const { store, route } = await setup();
  const record = { ...copy(fixtures.migration), evidenceRefs: [{ refType: "EVIDENCE", id: "z" }, { refType: "EVIDENCE", id: "a" }],
    migrationBasisRef: { ...fixtures.migration.migrationBasisRef, revision: "b" } };
  const first = route.registerMigrationBasis({ operationId: "migration-b", record });
  assert.deepEqual(route.registerMigrationBasis({ operationId: "migration-b", record: { ...record, evidenceRefs: [...record.evidenceRefs].reverse() } }), first);
  const selection = { ...copy(fixtures.selection), migrationBasisRef: record.migrationBasisRef,
    basisSelectionRef: { ...fixtures.selection.basisSelectionRef, revision: "migration-b2" }, supersedesBasisSelectionRef: fixtures.selection.basisSelectionRef };
  assert.equal(route.reselectBasis({ operationId: "migration-reselect", expectedBasisSelectionRef: fixtures.selection.basisSelectionRef, selection }).status, "CREATED");
  assert.equal(store.getReconstructionCase(caseId).basisSelectionRef.revision, "migration-b2");
});

test("proof and both v2 review kinds are immutable with one decision per exact lineage", async () => {
  const { store } = await setup();
  assert.equal(typeof store.putBoundExistingMachineProof, "function");
  assert.equal(store.putBoundExistingMachineProof(proof()), "CREATED");
  assert.equal(store.putBoundExistingMachineProof(proof()), "IDEMPOTENT");
  assert.throws(() => store.putBoundExistingMachineProof(proof({ verdict: "FAIL" })), /IMMUTABLE_RECORD_CONFLICT/);
  assert.throws(() => store.putBoundExistingMachineProof(proof({ receiptId: "proof-2" })), /PROOF_ALREADY_DECIDED/);
  assert.equal(store.getBoundExistingMachineProof("proof-2"), undefined);
  for (const decision of [review(), review({ reviewId: "no-reinterpretation", reviewKind: "NO_REINTERPRETATION", verdict: "REJECT" })]) {
    assert.equal(store.putHumanReviewDecisionV2(decision), "CREATED");
    assert.equal(store.putHumanReviewDecisionV2(decision), "IDEMPOTENT");
    assert.throws(() => store.putHumanReviewDecisionV2({ ...decision, reviewId: `${decision.reviewId}-other` }), /REVIEW_ALREADY_DECIDED/);
    assert.throws(() => { store.getHumanReviewDecisionV2(decision.reviewId).provenance.basisSelectionRef.revision = "tamper"; });
  }
  assert.equal(store.getHumanReviewDecisionV2("no-reinterpretation").verdict, "REJECT");
});

test("incompatibility preparation is atomic and fallback publishes a distinct immutable change case plus link", async () => {
  const { store, route } = await setup();
  assert.equal(typeof store.prepareIncompatibility, "function");
  const command = operation("incompatible", "DECLARE_BOUND_EXISTING_INCOMPATIBLE");
  assert.throws(() => store.prepareIncompatibility(determination({ evidenceRefs: [] }), { command, receipt: receipt(command) }), /INCOMPATIBILITY_EVIDENCE_REQUIRED/);
  assert.equal(store.getIncompatibilityDetermination("determination-1"), undefined);
  const prepared = store.prepareIncompatibility(determination(), { command, receipt: receipt(command) });
  assert.equal(store.getIncompatibilityDetermination("determination-1"), undefined);
  prepared.commit();
  assert.equal(store.getReconstructionCase(caseId).status, "INCOMPATIBLE");
  assert.deepEqual(store.getIncompatibilityDetermination("determination-1"), determination());
  assert.throws(() => route.cancelReconstruction({ operationId: "cancel", reconstructionCaseId: caseId }), /CASE_NOT_OPEN/);
  const changeCase = { caseId: "change-1", scopeSnapshot: { caseId: "change-1", scopeRef: ref("scope", "change-1", "a"), observations: [] }, classificationBasisRef: ref("policy", "classification", "a") };
  const link = { schemaVersion: 1, linkId: "fallback-1", reconstructionCaseId: caseId, incompatibilityDeterminationId: "determination-1", semanticChangeCaseId: "change-1", evidenceRefs };
  assert.throws(() => store.createFallback({ ...changeCase, caseId: "wrong" }, link));
  assert.equal(store.getFallbackLink("fallback-1"), undefined);
  assert.equal(store.getSemanticChangeCase("change-1"), undefined);
  assert.equal(store.createFallback(changeCase, link), "CREATED");
  assert.equal(store.createFallback(copy(changeCase), copy(link)), "IDEMPOTENT");
  assert.deepEqual(store.getSemanticChangeCase("change-1"), changeCase);
  assert.ok(Object.isFrozen(store.getSemanticChangeCase("change-1").scopeSnapshot));
  assert.throws(() => store.createFallback({ ...changeCase, caseId: "change-2", scopeSnapshot: { ...changeCase.scopeSnapshot, caseId: "change-2" } }, { ...link, linkId: "fallback-2", semanticChangeCaseId: "change-2" }), /FALLBACK_ALREADY_EXISTS/);
  assert.equal(store.getSemanticChangeCase("change-2"), undefined);
});

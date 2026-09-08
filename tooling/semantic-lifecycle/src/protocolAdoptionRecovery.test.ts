// @ts-nocheck
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FileProtocolAdoptionControlRepository } from "./fileProtocolAdoptionControlRepository.js";
import { InMemoryAssessmentFreshnessBoundary } from "./assessmentFreshnessBoundary.js";
import { InMemoryProspectiveProtocolBasisProvider } from "./prospectiveProtocolBasisProvider.js";
import { InMemorySemanticAuthorityReadBoundary } from "./semanticAuthorityReadBoundary.js";
import { FileProtocolAuthorityStore } from "./fileProtocolAuthorityStore.js";
import { ProtocolMutationOutcomeUnknownError, type ProtocolAuthorityMutationPort } from "./protocolAuthorityMutationPort.js";
import { ProtocolAdoptionGuard, ProtocolAdoptionRoute } from "./protocolAdoptionGuard.js";

const fixture = JSON.parse(readFileSync("fixtures/protocol-adoption/cases.json", "utf8"));
const copy = <T>(v: T): T => structuredClone(v);
const ev = [{ refType: "EVIDENCE" as const, id: "recovery" }];

function setup() {
  const directory = mkdtempSync(join(tmpdir(), "axtp-recovery-")); const caseId = "recovery-case";
  const assessment = copy(fixture.assessments.noDelta);
  const assessments = new InMemoryAssessmentFreshnessBoundary([assessment], { scopeRef: copy(fixture.refs.scope), classificationBasisRef: copy(fixture.refs.classification) });
  const prospective = new InMemoryProspectiveProtocolBasisProvider([{ ref: copy(fixture.refs.proposalA), payload: copy(fixture.proposalPayloads.proposalA) }], copy(fixture.refs.proposalA));
  const semantic = new InMemorySemanticAuthorityReadBoundary();
  const controlPath = join(directory, "control.json"); const protocolPath = join(directory, "protocol.json");
  const control = new FileProtocolAdoptionControlRepository(controlPath); const protocol = new FileProtocolAuthorityStore(protocolPath, [{ key: "axtp", ref: copy(fixture.refs.protocolHead), payload: { version: "0.9.0" } }]);
  const selectionRef = { refType: "IMMUTABLE_REVISION" as const, namespace: "protocol-adoption-selection", subject: caseId, revision: "s1", digest: "sha256:s1" };
  const selection = { schemaVersion: 1 as const, protocolAdoptionCaseId: caseId, selectionRef, route: "NO_DELTA" as const, assessmentId: assessment.assessmentId, scopeRef: copy(fixture.refs.scope), classificationBasisRef: copy(fixture.refs.classification), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), evidenceRefs: ev };
  const base = { control, assessments, prospective, semanticAuthorities: semantic };
  const route = new ProtocolAdoptionRoute({ ...base, guard: new ProtocolAdoptionGuard({ ...base, protocolAuthority: protocol }) });
  route.openCase({ operationVersion: 1, operationId: "open", operationKind: "OPEN_PROTOCOL_ADOPTION_CASE", payload: { selection, caseRecord: { schemaVersion: 1, protocolAdoptionCaseId: caseId, status: "OPEN", workingSelectionRef: selectionRef, evidenceRefs: ev } } });
  const command = { operationVersion: 1 as const, operationId: "finalize", operationKind: "FINALIZE_PROTOCOL_ADOPTION" as const, payload: { protocolAdoptionCaseId: caseId, expectedWorkingSelectionRef: selectionRef, protocolAuthorityKey: "axtp", expectedProtocolAuthorityHead: copy(fixture.refs.protocolHead), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), evidenceRefs: ev } };
  return { directory, caseId, controlPath, protocolPath, control, protocol, assessments, prospective, semantic, base, route, command };
}

test("response loss keeps a durable reservation and APPLIED_EXACT reconciliation never writes twice", () => {
  const ctx = setup();
  try {
    const lossy: ProtocolAuthorityMutationPort = { getCurrentHead: (key) => ctx.protocol.getCurrentHead(key), queryOutcome: (q) => ctx.protocol.queryOutcome(q), commit: (request) => { const result = ctx.protocol.commit(request); throw new ProtocolMutationOutcomeUnknownError(result); } };
    const first = new ProtocolAdoptionGuard({ ...ctx.base, protocolAuthority: lossy });
    assert.throws(() => first.finalize(ctx.command), /AMBIGUOUS_PROTOCOL_COMMIT/);
    assert.equal(ctx.protocol.getMutationCount(), 1);
    const reopenedControl = new FileProtocolAdoptionControlRepository(ctx.controlPath);
    assert.equal(reopenedControl.getFinalizationReservation(ctx.caseId)?.state, "UNRESOLVED");
    assert.throws(() => ctx.route.cancelCase({ operationVersion: 1, operationId: "cancel", operationKind: "CANCEL_PROTOCOL_ADOPTION_CASE", payload: { protocolAdoptionCaseId: ctx.caseId, expectedWorkingSelectionRef: ctx.command.payload.expectedWorkingSelectionRef } }), /FINALIZATION_IN_PROGRESS/);
    const reopenedProtocol = new FileProtocolAuthorityStore(ctx.protocolPath);
    const reconciler = new ProtocolAdoptionGuard({ control: reopenedControl, assessments: ctx.assessments, prospective: ctx.prospective, semanticAuthorities: ctx.semantic, protocolAuthority: reopenedProtocol });
    assert.equal(reconciler.reconcile({ operationVersion: 1, operationId: "reconcile", operationKind: "RECONCILE_PROTOCOL_ADOPTION", payload: { protocolAdoptionCaseId: ctx.caseId, originalOperationId: "finalize" } }).status, "RECONCILED");
    assert.equal(reopenedProtocol.getMutationCount(), 1);
    assert.equal(reopenedControl.getCase(ctx.caseId)?.status, "PROTOCOL_ADOPTED");
    assert.equal(reconciler.finalize(ctx.command).status, "APPLIED");
    assert.equal(reopenedProtocol.getMutationCount(), 1);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

test("UNKNOWN reconciliation remains blocked and cannot blind retry", () => {
  const ctx = setup();
  try {
    const unknownPort: ProtocolAuthorityMutationPort = { getCurrentHead: (key) => ctx.protocol.getCurrentHead(key), commit: () => { throw new ProtocolMutationOutcomeUnknownError(); }, queryOutcome: () => ({ status: "UNKNOWN_OR_UNAVAILABLE" }) };
    const guard = new ProtocolAdoptionGuard({ ...ctx.base, protocolAuthority: unknownPort });
    assert.throws(() => guard.finalize(ctx.command), /AMBIGUOUS_PROTOCOL_COMMIT/);
    assert.throws(() => guard.reconcile({ operationVersion: 1, operationId: "reconcile-unknown", operationKind: "RECONCILE_PROTOCOL_ADOPTION", payload: { protocolAdoptionCaseId: ctx.caseId, originalOperationId: "finalize" } }), /AMBIGUOUS_PROTOCOL_COMMIT/);
    assert.throws(() => guard.finalize({ ...ctx.command, operationId: "blind-retry" }), /FINALIZATION_IN_PROGRESS/);
    assert.throws(() => guard.finalize({ ...ctx.command, payload: { ...ctx.command.payload, evidenceRefs: [{ refType: "EVIDENCE", id: "changed-command" }] } }), /OPERATION_ID_CONFLICT/);
    assert.equal(ctx.control.getFinalizationReservation(ctx.caseId)?.state, "UNRESOLVED");
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

test("two repository instances allow at most one finalization owner", () => {
  const ctx = setup();
  try {
    const second = new FileProtocolAdoptionControlRepository(ctx.controlPath);
    const reservation = { schemaVersion: 1 as const, protocolAdoptionCaseId: ctx.caseId, operationId: "owner-1", commandDigest: "sha256:one", selectionRef: ctx.command.payload.expectedWorkingSelectionRef, correlationId: "owner-1", state: "UNRESOLVED" as const };
    assert.equal(ctx.control.acquireFinalizationReservation(reservation).status, "APPLIED");
    assert.throws(() => second.acquireFinalizationReservation({ ...reservation, operationId: "owner-2", commandDigest: "sha256:two", correlationId: "owner-2" }), /FINALIZATION_IN_PROGRESS/);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

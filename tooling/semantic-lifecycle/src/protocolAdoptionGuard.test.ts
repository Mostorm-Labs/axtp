// @ts-nocheck
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FileProtocolAdoptionControlRepository } from "./fileProtocolAdoptionControlRepository.js";
import { InMemoryAssessmentFreshnessBoundary } from "./assessmentFreshnessBoundary.js";
import { InMemoryProspectiveProtocolBasisProvider } from "./prospectiveProtocolBasisProvider.js";
import { InMemorySemanticAuthorityReadBoundary } from "./semanticAuthorityReadBoundary.js";
import { FileProtocolAuthorityStore } from "./fileProtocolAuthorityStore.js";
import { ProtocolAdoptionGuard, ProtocolAdoptionRoute } from "./protocolAdoptionGuard.js";

const fixture = JSON.parse(readFileSync("fixtures/protocol-adoption/cases.json", "utf8"));
const copy = <T>(value: T): T => structuredClone(value);
const evidence = (id: string) => [{ refType: "EVIDENCE" as const, id }];
const selectionRef = (caseId: string, revision: string) => ({ refType: "IMMUTABLE_REVISION" as const, namespace: "protocol-adoption-selection", subject: caseId, revision, digest: `sha256:${revision}` });

function setup(disposition: "NO_SEMANTIC_DELTA" | "SEMANTIC_DELTA" = "NO_SEMANTIC_DELTA") {
  const directory = mkdtempSync(join(tmpdir(), "axtp-adoption-"));
  const assessment = copy(disposition === "NO_SEMANTIC_DELTA" ? fixture.assessments.noDelta : fixture.assessments.semanticDelta);
  const assessments = new InMemoryAssessmentFreshnessBoundary([assessment], { scopeRef: copy(fixture.refs.scope), classificationBasisRef: copy(fixture.refs.classification) });
  const prospective = new InMemoryProspectiveProtocolBasisProvider([
    { ref: copy(fixture.refs.proposalA), payload: copy(fixture.proposalPayloads.proposalA) },
    { ref: copy(fixture.refs.proposalB), payload: copy(fixture.proposalPayloads.proposalB) }
  ], copy(fixture.refs.proposalA));
  const semantic = new InMemorySemanticAuthorityReadBoundary();
  semantic.publish("semantic-main", copy(fixture.refs.semanticAuthority));
  const control = new FileProtocolAdoptionControlRepository(join(directory, "control.json"));
  const protocol = new FileProtocolAuthorityStore(join(directory, "protocol.json"), [{ key: "axtp", ref: copy(fixture.refs.protocolHead), payload: { version: "0.9.0" } }]);
  const guard = new ProtocolAdoptionGuard({ control, assessments, prospective, semanticAuthorities: semantic, protocolAuthority: protocol });
  const route = new ProtocolAdoptionRoute({ control, assessments, prospective, semanticAuthorities: semantic, guard });
  return { directory, assessment, assessments, prospective, semantic, control, protocol, guard, route };
}

function openNoDelta(ctx: ReturnType<typeof setup>, caseId = "adoption-no-delta", revision = "selection-a", operationId = `open-${caseId}`) {
  const selection = { schemaVersion: 1 as const, protocolAdoptionCaseId: caseId, selectionRef: selectionRef(caseId, revision), route: "NO_DELTA" as const, assessmentId: ctx.assessment.assessmentId, scopeRef: copy(fixture.refs.scope), classificationBasisRef: copy(fixture.refs.classification), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), evidenceRefs: evidence("selection") };
  const caseRecord = { schemaVersion: 1 as const, protocolAdoptionCaseId: caseId, status: "OPEN" as const, workingSelectionRef: selection.selectionRef, evidenceRefs: evidence("case") };
  ctx.route.openCase({ operationVersion: 1, operationId, operationKind: "OPEN_PROTOCOL_ADOPTION_CASE", payload: { selection, caseRecord } });
  return selection;
}

test("NO_DELTA finalization commits the exact prospective payload and terminal occurrence", () => {
  const ctx = setup();
  try {
    const selection = openNoDelta(ctx);
    const result = ctx.guard.finalize({ operationVersion: 1, operationId: "finalize-no-delta", operationKind: "FINALIZE_PROTOCOL_ADOPTION", payload: { protocolAdoptionCaseId: selection.protocolAdoptionCaseId, expectedWorkingSelectionRef: selection.selectionRef, protocolAuthorityKey: "axtp", expectedProtocolAuthorityHead: copy(fixture.refs.protocolHead), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), evidenceRefs: evidence("finalize") } });
    assert.equal(result.status, "APPLIED");
    assert.deepEqual(ctx.protocol.getCurrent("axtp")?.payload, fixture.proposalPayloads.proposalA);
    const terminal = ctx.control.getCase(selection.protocolAdoptionCaseId);
    assert.equal(terminal?.status, "PROTOCOL_ADOPTED");
    assert.equal(ctx.protocol.getMutationCount(), 1);
    assert.deepEqual(ctx.guard.finalize({ operationVersion: 1, operationId: "finalize-no-delta", operationKind: "FINALIZE_PROTOCOL_ADOPTION", payload: { protocolAdoptionCaseId: selection.protocolAdoptionCaseId, expectedWorkingSelectionRef: selection.selectionRef, protocolAuthorityKey: "axtp", expectedProtocolAuthorityHead: copy(fixture.refs.protocolHead), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), evidenceRefs: evidence("finalize") } }), result);
    assert.equal(ctx.protocol.getMutationCount(), 1);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

test("selection CAS and A to B to A create distinct occurrences without reviving evidence", () => {
  const ctx = setup();
  try {
    const a1 = openNoDelta(ctx, "adoption-aba", "a1");
    ctx.prospective.setCurrent(copy(fixture.refs.proposalB));
    const b = { ...a1, selectionRef: selectionRef(a1.protocolAdoptionCaseId, "b"), prospectiveProtocolBasisRef: copy(fixture.refs.proposalB), supersedesSelectionRef: a1.selectionRef, evidenceRefs: evidence("selection-b") };
    ctx.route.reselectInputs({ operationVersion: 1, operationId: "reselect-b", operationKind: "RESELECT_PROTOCOL_ADOPTION_INPUTS", payload: { expectedWorkingSelectionRef: a1.selectionRef, selection: b } });
    ctx.prospective.setCurrent(copy(fixture.refs.proposalA));
    const a3 = { ...a1, selectionRef: selectionRef(a1.protocolAdoptionCaseId, "a3"), supersedesSelectionRef: b.selectionRef, evidenceRefs: evidence("selection-a3") };
    ctx.route.reselectInputs({ operationVersion: 1, operationId: "reselect-a3", operationKind: "RESELECT_PROTOCOL_ADOPTION_INPUTS", payload: { expectedWorkingSelectionRef: b.selectionRef, selection: a3 } });
    assert.deepEqual(ctx.control.getCase(a1.protocolAdoptionCaseId)?.workingSelectionRef, a3.selectionRef);
    assert.notDeepEqual(a1.selectionRef, a3.selectionRef);
    assert.throws(() => ctx.guard.finalize({ operationVersion: 1, operationId: "stale-a1", operationKind: "FINALIZE_PROTOCOL_ADOPTION", payload: { protocolAdoptionCaseId: a1.protocolAdoptionCaseId, expectedWorkingSelectionRef: a1.selectionRef, protocolAuthorityKey: "axtp", expectedProtocolAuthorityHead: copy(fixture.refs.protocolHead), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), evidenceRefs: evidence("stale") } }), /STALE_SELECTION/);
    assert.equal(ctx.protocol.getMutationCount(), 0);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

test("operation id conflict is rejected before any mutation", () => {
  const ctx = setup();
  try {
    openNoDelta(ctx, "adoption-op", "s1");
    assert.throws(() => openNoDelta(ctx, "adoption-other", "s2", "open-adoption-op"), /OPERATION_ID_CONFLICT/);
    const before = readFileSync(join(ctx.directory, "control.json"), "utf8");
    const current = ctx.control.getCase("adoption-op")!;
    const changed = { ...current, evidenceRefs: evidence("changed") };
    assert.throws(() => ctx.route.cancelCase({ operationVersion: 1, operationId: "open-adoption-op", operationKind: "CANCEL_PROTOCOL_ADOPTION_CASE", payload: { protocolAdoptionCaseId: "adoption-op", expectedWorkingSelectionRef: current.workingSelectionRef, caseRecord: changed } }), /OPERATION_ID_CONFLICT/);
    assert.equal(readFileSync(join(ctx.directory, "control.json"), "utf8"), before);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

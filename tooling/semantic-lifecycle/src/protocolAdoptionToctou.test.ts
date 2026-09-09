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
import type { ProtocolAuthorityMutationPort } from "./protocolAuthorityMutationPort.js";
import { ProtocolAdoptionGuard, ProtocolAdoptionRoute } from "./protocolAdoptionGuard.js";

const fixture = JSON.parse(readFileSync("fixtures/protocol-adoption/cases.json", "utf8"));
const copy = <T>(v: T): T => structuredClone(v);
const ev = [{ refType: "EVIDENCE" as const, id: "toctou" }];
const sel = (id: string) => ({ refType: "IMMUTABLE_REVISION" as const, namespace: "protocol-adoption-selection", subject: id, revision: "s1", digest: "sha256:s1" });

function setup(beforeCommit?: () => void) {
  const directory = mkdtempSync(join(tmpdir(), "axtp-toctou-"));
  const assessment = copy(fixture.assessments.noDelta);
  const assessments = new InMemoryAssessmentFreshnessBoundary([assessment], { scopeRef: copy(fixture.refs.scope), classificationBasisRef: copy(fixture.refs.classification) });
  const prospective = new InMemoryProspectiveProtocolBasisProvider([{ ref: copy(fixture.refs.proposalA), payload: copy(fixture.proposalPayloads.proposalA) }, { ref: copy(fixture.refs.proposalB), payload: copy(fixture.proposalPayloads.proposalB) }], copy(fixture.refs.proposalA));
  const semantic = new InMemorySemanticAuthorityReadBoundary();
  const control = new FileProtocolAdoptionControlRepository(join(directory, "control.json"));
  const store = new FileProtocolAuthorityStore(join(directory, "protocol.json"), [{ key: "axtp", ref: copy(fixture.refs.protocolHead), payload: { version: "0.9.0" } }]);
  const port: ProtocolAuthorityMutationPort = beforeCommit ? { getCurrentHead: (key) => store.getCurrentHead(key), queryOutcome: (query) => store.queryOutcome(query), commit: (request) => { beforeCommit(); return store.commit(request); } } : store;
  const guard = new ProtocolAdoptionGuard({ control, assessments, prospective, semanticAuthorities: semantic, protocolAuthority: port });
  const route = new ProtocolAdoptionRoute({ control, assessments, prospective, semanticAuthorities: semantic, guard });
  const caseId = "toctou-case"; const selectionRef = sel(caseId);
  const selection = { schemaVersion: 1 as const, protocolAdoptionCaseId: caseId, selectionRef, route: "NO_DELTA" as const, assessmentId: assessment.assessmentId, scopeRef: copy(fixture.refs.scope), classificationBasisRef: copy(fixture.refs.classification), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), evidenceRefs: ev };
  route.openCase({ operationVersion: 1, operationId: "open", operationKind: "OPEN_PROTOCOL_ADOPTION_CASE", payload: { selection, caseRecord: { schemaVersion: 1, protocolAdoptionCaseId: caseId, status: "OPEN", workingSelectionRef: selectionRef, evidenceRefs: ev } } });
  const command = { operationVersion: 1 as const, operationId: "finalize", operationKind: "FINALIZE_PROTOCOL_ADOPTION" as const, payload: { protocolAdoptionCaseId: caseId, expectedWorkingSelectionRef: selectionRef, protocolAuthorityKey: "axtp", expectedProtocolAuthorityHead: copy(fixture.refs.protocolHead), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), evidenceRefs: ev } };
  return { directory, assessments, prospective, control, store, guard, command };
}

test("proposal drift at the commit boundary is fenced with zero Protocol mutation", () => {
  let ctx!: ReturnType<typeof setup>;
  ctx = setup(() => ctx.prospective.setCurrent(copy(fixture.refs.proposalB)));
  try {
    assert.throws(() => ctx.guard.finalize(ctx.command), /TOCTOU_FENCE_UNAVAILABLE/);
    assert.equal(ctx.store.getMutationCount(), 0);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

test("assessment scope drift at the commit boundary is fenced with zero Protocol mutation", () => {
  let ctx!: ReturnType<typeof setup>;
  const changedScope = { ...copy(fixture.refs.scope), revision: "scope-2", digest: "sha256:scope-2" };
  ctx = setup(() => ctx.assessments.setCurrent({ scopeRef: changedScope, classificationBasisRef: copy(fixture.refs.classification) }));
  try {
    assert.throws(() => ctx.guard.finalize(ctx.command), /TOCTOU_FENCE_UNAVAILABLE/);
    assert.equal(ctx.store.getMutationCount(), 0);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

test("Protocol expected-head CAS rejects a concurrent authority update", () => {
  const ctx = setup();
  try {
    ctx.store.commit({ protocolAuthorityKey: "axtp", protocolAdoptionCaseId: "concurrent-case", operationId: "concurrent-operation", commandDigest: "sha256:concurrent", expectedProtocolAuthorityHead: copy(fixture.refs.protocolHead), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), payload: { version: "1.0.0" } });
    const mutationsBeforeAttempt = ctx.store.getMutationCount();
    assert.throws(() => ctx.guard.finalize(ctx.command), /PROTOCOL_AUTHORITY_HEAD_CONFLICT/);
    assert.equal(ctx.store.getMutationCount(), mutationsBeforeAttempt);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

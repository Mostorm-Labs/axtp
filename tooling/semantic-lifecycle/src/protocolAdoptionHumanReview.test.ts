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
const ev = (id: string) => [{ refType: "EVIDENCE" as const, id }];
const ref = (namespace: string, subject: string, revision: string) => ({ refType: "IMMUTABLE_REVISION" as const, namespace, subject, revision, digest: `sha256:${revision}` });

function semanticContext(beforeCommit?: () => void) {
  const directory = mkdtempSync(join(tmpdir(), "axtp-human-"));
  const assessment = copy(fixture.assessments.semanticDelta);
  const assessments = new InMemoryAssessmentFreshnessBoundary([assessment], { scopeRef: copy(fixture.refs.scope), classificationBasisRef: copy(fixture.refs.classification) });
  const prospective = new InMemoryProspectiveProtocolBasisProvider([{ ref: copy(fixture.refs.proposalA), payload: copy(fixture.proposalPayloads.proposalA) }], copy(fixture.refs.proposalA));
  const semantic = new InMemorySemanticAuthorityReadBoundary(); semantic.publish("semantic-main", copy(fixture.refs.semanticAuthority));
  const control = new FileProtocolAdoptionControlRepository(join(directory, "control.json"));
  const protocol = new FileProtocolAuthorityStore(join(directory, "protocol.json"), [{ key: "axtp", ref: copy(fixture.refs.protocolHead), payload: { version: "0.9.0" } }]);
  const protocolAuthority: ProtocolAuthorityMutationPort = beforeCommit ? { getCurrentHead: (key) => protocol.getCurrentHead(key), queryOutcome: (query) => protocol.queryOutcome(query), commit: (request) => { beforeCommit(); return protocol.commit(request); } } : protocol;
  const guard = new ProtocolAdoptionGuard({ control, assessments, prospective, semanticAuthorities: semantic, protocolAuthority });
  const route = new ProtocolAdoptionRoute({ control, assessments, prospective, semanticAuthorities: semantic, guard });
  const caseId = "adoption-semantic";
  const s1 = ref("protocol-adoption-selection", caseId, "s1");
  const selection0 = { schemaVersion: 1 as const, protocolAdoptionCaseId: caseId, selectionRef: s1, route: "SEMANTIC_DELTA" as const, assessmentId: assessment.assessmentId, scopeRef: copy(fixture.refs.scope), classificationBasisRef: copy(fixture.refs.classification), semanticAuthorityRef: copy(fixture.refs.semanticAuthority), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), evidenceRefs: ev("selection") };
  route.openCase({ operationVersion: 1, operationId: "open-semantic", operationKind: "OPEN_PROTOCOL_ADOPTION_CASE", payload: { selection: selection0, caseRecord: { schemaVersion: 1, protocolAdoptionCaseId: caseId, status: "OPEN", workingSelectionRef: s1, evidenceRefs: ev("case") } } });
  const projectionRef = ref("protocol-projection", "projection-1", "p1");
  const s2 = ref("protocol-adoption-selection", caseId, "s2");
  const projection = { schemaVersion: 1 as const, projectionId: "projection-1", projectionRef, protocolAdoptionCaseId: caseId, assessmentId: assessment.assessmentId, scopeRef: copy(fixture.refs.scope), classificationBasisRef: copy(fixture.refs.classification), semanticAuthorityRef: copy(fixture.refs.semanticAuthority), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), evidenceRefs: ev("projection") };
  const selection = { ...selection0, selectionRef: s2, protocolProjectionRef: projectionRef, supersedesSelectionRef: s1, evidenceRefs: ev("selection-projected") };
  route.createProjection({ operationVersion: 1, operationId: "projection-create", operationKind: "CREATE_PROTOCOL_PROJECTION", payload: { expectedWorkingSelectionRef: s1, projection, selection } });
  const proof = { schemaVersion: 1 as const, receiptId: "proof-pass", proofKind: "PROTOCOL_PROJECTION" as const, proofContractVersion: "v1", engine: { name: "reference", version: "1" }, protocolAdoptionCaseId: caseId, selectionRef: s2, projectionRef, semanticAuthorityRef: copy(fixture.refs.semanticAuthority), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), verdict: "PASS" as const, inputDigest: "sha256:proof", ruleIds: ["EXACT"], diagnostics: [], evidenceRefs: ev("proof") };
  const review = { schemaVersion: 1 as const, reviewId: "review-pass", reviewKind: "PROTOCOL_PROJECTION" as const, decisionSource: "HUMAN" as const, verdict: "PASS" as const, protocolAdoptionCaseId: caseId, selectionRef: s2, projectionRef, semanticAuthorityRef: copy(fixture.refs.semanticAuthority), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), evidenceRefs: ev("review") };
  return { directory, assessment, assessments, prospective, semantic, control, protocol, guard, route, caseId, selection, proof, review };
}

const finalize = (ctx: ReturnType<typeof semanticContext>) => ctx.guard.finalize({ operationVersion: 1, operationId: "finalize-semantic", operationKind: "FINALIZE_PROTOCOL_ADOPTION", payload: { protocolAdoptionCaseId: ctx.caseId, expectedWorkingSelectionRef: ctx.selection.selectionRef, protocolAuthorityKey: "axtp", expectedProtocolAuthorityHead: copy(fixture.refs.protocolHead), prospectiveProtocolBasisRef: copy(fixture.refs.proposalA), semanticAuthorityRef: copy(fixture.refs.semanticAuthority), projectionRef: ctx.selection.protocolProjectionRef, machineProofReceiptId: ctx.proof.receiptId, projectionReviewId: ctx.review.reviewId, evidenceRefs: ev("finalize") } });

test("machine PASS cannot authorize finalization without explicit HUMAN PASS", () => {
  const ctx = semanticContext();
  try {
    ctx.route.recordMachineProof({ operationVersion: 1, operationId: "proof", operationKind: "RECORD_PROTOCOL_PROJECTION_MACHINE_PROOF", payload: { proof: ctx.proof } });
    assert.throws(() => finalize(ctx), /HUMAN_PROJECTION_REVIEW_REQUIRED/);
    assert.equal(ctx.protocol.getMutationCount(), 0);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

test("HUMAN REJECT is immutable and blocks the projection revision", () => {
  const ctx = semanticContext();
  try {
    ctx.route.recordMachineProof({ operationVersion: 1, operationId: "proof", operationKind: "RECORD_PROTOCOL_PROJECTION_MACHINE_PROOF", payload: { proof: ctx.proof } });
    const reject = { ...ctx.review, reviewId: "review-reject", verdict: "REJECT" as const };
    ctx.route.recordProjectionReview({ operationVersion: 1, operationId: "review-reject-op", operationKind: "RECORD_PROTOCOL_PROJECTION_REVIEW", payload: { review: reject } });
    assert.throws(() => ctx.route.recordProjectionReview({ operationVersion: 1, operationId: "review-shop", operationKind: "RECORD_PROTOCOL_PROJECTION_REVIEW", payload: { review: ctx.review } }), /CONFLICTING_HUMAN_REVIEW/);
    assert.throws(() => finalize({ ...ctx, review: reject }), /HUMAN_PROJECTION_REVIEW_REJECTED/);
    assert.equal(ctx.protocol.getMutationCount(), 0);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

test("exact machine PASS followed by HUMAN PASS permits one semantic adoption", () => {
  const ctx = semanticContext();
  try {
    ctx.route.recordMachineProof({ operationVersion: 1, operationId: "proof", operationKind: "RECORD_PROTOCOL_PROJECTION_MACHINE_PROOF", payload: { proof: ctx.proof } });
    ctx.route.recordProjectionReview({ operationVersion: 1, operationId: "review", operationKind: "RECORD_PROTOCOL_PROJECTION_REVIEW", payload: { review: ctx.review } });
    assert.equal(finalize(ctx).status, "APPLIED");
    assert.equal(ctx.protocol.getMutationCount(), 1);
    assert.deepEqual(ctx.protocol.getCurrent("axtp")?.payload, fixture.proposalPayloads.proposalA);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

test("Semantic Authority drift at the commit boundary is fenced with zero Protocol mutation", () => {
  let ctx!: ReturnType<typeof semanticContext>;
  ctx = semanticContext(() => ctx.semantic.publish("semantic-main", { ...copy(fixture.refs.semanticAuthority), revision: "semantic-2", digest: "sha256:semantic-2" }));
  try {
    ctx.route.recordMachineProof({ operationVersion: 1, operationId: "proof", operationKind: "RECORD_PROTOCOL_PROJECTION_MACHINE_PROOF", payload: { proof: ctx.proof } });
    ctx.route.recordProjectionReview({ operationVersion: 1, operationId: "review", operationKind: "RECORD_PROTOCOL_PROJECTION_REVIEW", payload: { review: ctx.review } });
    assert.throws(() => finalize(ctx), /TOCTOU_FENCE_UNAVAILABLE/);
    assert.equal(ctx.protocol.getMutationCount(), 0);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

test("proof and review recording reject a superseded selection lineage", () => {
  const ctx = semanticContext();
  try {
    const nextRef = ref("protocol-adoption-selection", ctx.caseId, "s3");
    const next = { ...ctx.selection, selectionRef: nextRef, supersedesSelectionRef: ctx.selection.selectionRef, evidenceRefs: ev("selection-s3") };
    ctx.route.reselectInputs({ operationVersion: 1, operationId: "reselect-s3", operationKind: "RESELECT_PROTOCOL_ADOPTION_INPUTS", payload: { expectedWorkingSelectionRef: ctx.selection.selectionRef, selection: next } });
    assert.throws(() => ctx.route.recordMachineProof({ operationVersion: 1, operationId: "stale-proof", operationKind: "RECORD_PROTOCOL_PROJECTION_MACHINE_PROOF", payload: { proof: ctx.proof } }), /STALE_SELECTION/);
    assert.throws(() => ctx.route.recordProjectionReview({ operationVersion: 1, operationId: "stale-review", operationKind: "RECORD_PROTOCOL_PROJECTION_REVIEW", payload: { review: ctx.review } }), /STALE_SELECTION/);
  } finally { rmSync(ctx.directory, { recursive: true, force: true }); }
});

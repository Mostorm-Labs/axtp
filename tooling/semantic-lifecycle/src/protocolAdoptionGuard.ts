import { createHash } from "node:crypto";
import { equalBasisRef } from "./basis.js";
import type { AssessmentFreshnessBoundary } from "./assessmentFreshnessBoundary.js";
import type {
  EvidenceRef,
  ImmutableRevisionRef,
  ProjectionMachineProofReceiptV1,
  ProjectionReviewDecisionV1,
  ProtocolAdoptionCaseRecordV1,
  ProtocolAdoptionOccurrenceRecordV1,
  ProtocolAdoptionOperationEnvelopeV1,
  ProtocolAdoptionOperationReceiptV1,
  ProtocolAdoptionSelectionV1,
  ProtocolProjectionRecordV1
} from "./model.js";
import type { ProspectiveProtocolBasisProvider } from "./prospectiveProtocolBasisProvider.js";
import type { FinalizationReservationV1, ProtocolAdoptionControlRepository } from "./protocolAdoptionControlRepository.js";
import { ProtocolMutationOutcomeUnknownError, type ProtocolAuthorityCommitResult, type ProtocolAuthorityMutationPort } from "./protocolAuthorityMutationPort.js";
import type { SemanticAuthorityReadBoundary } from "./semanticAuthorityReadBoundary.js";

interface RouteDependencies {
  readonly control: ProtocolAdoptionControlRepository;
  readonly assessments: AssessmentFreshnessBoundary;
  readonly prospective: ProspectiveProtocolBasisProvider;
  readonly semanticAuthorities: SemanticAuthorityReadBoundary;
  readonly guard: ProtocolAdoptionGuard;
}

interface GuardDependencies extends Omit<RouteDependencies, "guard"> { readonly protocolAuthority: ProtocolAuthorityMutationPort; }

export class ProtocolAdoptionRoute {
  constructor(private readonly dependencies: RouteDependencies) {}

  openCase(command: ProtocolAdoptionOperationEnvelopeV1<"OPEN_PROTOCOL_ADOPTION_CASE", { selection: ProtocolAdoptionSelectionV1; caseRecord: ProtocolAdoptionCaseRecordV1 }>): ProtocolAdoptionOperationReceiptV1 {
    const replay = this.dependencies.control.replayOperation(command); if (replay) return replay;
    assertCommand(command, "OPEN_PROTOCOL_ADOPTION_CASE");
    this.validateSelection(command.payload.selection);
    return this.dependencies.control.openCase(command.payload.selection, command.payload.caseRecord, command);
  }

  reselectInputs(command: ProtocolAdoptionOperationEnvelopeV1<"RESELECT_PROTOCOL_ADOPTION_INPUTS", { expectedWorkingSelectionRef: ImmutableRevisionRef; selection: ProtocolAdoptionSelectionV1 }>): ProtocolAdoptionOperationReceiptV1 {
    const replay = this.dependencies.control.replayOperation(command); if (replay) return replay;
    assertCommand(command, "RESELECT_PROTOCOL_ADOPTION_INPUTS");
    this.validateSelection(command.payload.selection);
    return this.dependencies.control.reselect(command.payload.selection, command.payload.expectedWorkingSelectionRef, command);
  }

  createProjection(command: ProtocolAdoptionOperationEnvelopeV1<"CREATE_PROTOCOL_PROJECTION", { expectedWorkingSelectionRef: ImmutableRevisionRef; projection: ProtocolProjectionRecordV1; selection: ProtocolAdoptionSelectionV1 }>): ProtocolAdoptionOperationReceiptV1 {
    return this.publishProjection(command);
  }

  reviseProjection(command: ProtocolAdoptionOperationEnvelopeV1<"REVISE_PROTOCOL_PROJECTION", { expectedWorkingSelectionRef: ImmutableRevisionRef; projection: ProtocolProjectionRecordV1; selection: ProtocolAdoptionSelectionV1 }>): ProtocolAdoptionOperationReceiptV1 {
    return this.publishProjection(command);
  }

  recordMachineProof(command: ProtocolAdoptionOperationEnvelopeV1<"RECORD_PROTOCOL_PROJECTION_MACHINE_PROOF", { proof: ProjectionMachineProofReceiptV1 }>): ProtocolAdoptionOperationReceiptV1 {
    const replay = this.dependencies.control.replayOperation(command); if (replay) return replay;
    assertCommand(command, "RECORD_PROTOCOL_PROJECTION_MACHINE_PROOF");
    return this.dependencies.control.recordMachineProof(command.payload.proof, command);
  }

  recordProjectionReview(command: ProtocolAdoptionOperationEnvelopeV1<"RECORD_PROTOCOL_PROJECTION_REVIEW", { review: ProjectionReviewDecisionV1 }>): ProtocolAdoptionOperationReceiptV1 {
    const replay = this.dependencies.control.replayOperation(command); if (replay) return replay;
    assertCommand(command, "RECORD_PROTOCOL_PROJECTION_REVIEW");
    return this.dependencies.control.recordProjectionReview(command.payload.review, command);
  }

  cancelCase(command: ProtocolAdoptionOperationEnvelopeV1<"CANCEL_PROTOCOL_ADOPTION_CASE", { protocolAdoptionCaseId: string; expectedWorkingSelectionRef: ImmutableRevisionRef; evidenceRefs?: readonly EvidenceRef[]; caseRecord?: ProtocolAdoptionCaseRecordV1 }>): ProtocolAdoptionOperationReceiptV1 {
    const replay = this.dependencies.control.replayOperation(command); if (replay) return replay;
    assertCommand(command, "CANCEL_PROTOCOL_ADOPTION_CASE");
    const evidenceRefs = command.payload.evidenceRefs ?? command.payload.caseRecord?.evidenceRefs ?? [{ refType: "EVIDENCE" as const, id: `cancel:${command.operationId}` }];
    return this.dependencies.control.cancelCase(command.payload.protocolAdoptionCaseId, command.payload.expectedWorkingSelectionRef, evidenceRefs, command);
  }

  finalizeProtocolAdoption(command: FinalizeCommand): ProtocolAdoptionOperationReceiptV1 { return this.dependencies.guard.finalize(command); }
  reconcileProtocolAdoption(command: ReconcileCommand): ProtocolAdoptionOperationReceiptV1 { return this.dependencies.guard.reconcile(command); }

  private publishProjection<TKind extends "CREATE_PROTOCOL_PROJECTION" | "REVISE_PROTOCOL_PROJECTION">(command: ProtocolAdoptionOperationEnvelopeV1<TKind, { expectedWorkingSelectionRef: ImmutableRevisionRef; projection: ProtocolProjectionRecordV1; selection: ProtocolAdoptionSelectionV1 }>): ProtocolAdoptionOperationReceiptV1 {
    const replay = this.dependencies.control.replayOperation(command); if (replay) return replay;
    assertCommand(command, command.operationKind);
    this.validateSelection(command.payload.selection);
    if (command.payload.selection.route !== "SEMANTIC_DELTA") throw new Error("PROJECTION_FORBIDDEN_FOR_NO_DELTA");
    return this.dependencies.control.publishProjection(command.payload.projection, command.payload.selection, command.payload.expectedWorkingSelectionRef, command);
  }

  private validateSelection(selection: ProtocolAdoptionSelectionV1): void {
    const disposition = selection.route === "NO_DELTA" ? "NO_SEMANTIC_DELTA" : "SEMANTIC_DELTA";
    this.dependencies.assessments.assertFresh({ assessmentId: selection.assessmentId, disposition, scopeRef: selection.scopeRef, classificationBasisRef: selection.classificationBasisRef });
    if (!equalBasisRef(this.dependencies.prospective.getCurrentRef(), selection.prospectiveProtocolBasisRef)) throw new Error("STALE_PROSPECTIVE_PROTOCOL_BASIS");
    this.dependencies.prospective.resolve(selection.prospectiveProtocolBasisRef);
    if (selection.route === "SEMANTIC_DELTA") this.dependencies.semanticAuthorities.assertCurrent(selection.semanticAuthorityRef);
  }
}

export interface FinalizeProtocolAdoptionPayload {
  readonly protocolAdoptionCaseId: string;
  readonly expectedWorkingSelectionRef: ImmutableRevisionRef;
  readonly protocolAuthorityKey: string;
  readonly expectedProtocolAuthorityHead: ImmutableRevisionRef | null;
  readonly prospectiveProtocolBasisRef: ImmutableRevisionRef;
  readonly semanticAuthorityRef?: ImmutableRevisionRef;
  readonly projectionRef?: ImmutableRevisionRef;
  readonly machineProofReceiptId?: string;
  readonly projectionReviewId?: string;
  readonly evidenceRefs: readonly EvidenceRef[];
}
export type FinalizeCommand = ProtocolAdoptionOperationEnvelopeV1<"FINALIZE_PROTOCOL_ADOPTION", FinalizeProtocolAdoptionPayload>;
export type ReconcileCommand = ProtocolAdoptionOperationEnvelopeV1<"RECONCILE_PROTOCOL_ADOPTION", { protocolAdoptionCaseId: string; originalOperationId: string }>;

export class ProtocolAdoptionGuard {
  constructor(private readonly dependencies: GuardDependencies) {}

  finalize(command: FinalizeCommand): ProtocolAdoptionOperationReceiptV1 {
    const replay = this.dependencies.control.replayOperation(command); if (replay) return replay;
    assertCommand(command, "FINALIZE_PROTOCOL_ADOPTION");
    const digest = digestOf(command);
    const reservation: FinalizationReservationV1 = {
      schemaVersion: 1,
      protocolAdoptionCaseId: command.payload.protocolAdoptionCaseId,
      operationId: command.operationId,
      commandDigest: digest,
      selectionRef: command.payload.expectedWorkingSelectionRef,
      correlationId: `${command.payload.protocolAdoptionCaseId}:${command.operationId}:${digest}`,
      state: "UNRESOLVED",
      finalizationCommand: command
    };
    this.dependencies.control.acquireFinalizationReservation(reservation);
    try {
      const { selection, proof, review } = this.validateCurrent(command);
      const expectation = { assessmentId: selection.assessmentId, disposition: selection.route === "NO_DELTA" ? "NO_SEMANTIC_DELTA" as const : "SEMANTIC_DELTA" as const, scopeRef: selection.scopeRef, classificationBasisRef: selection.classificationBasisRef };
      const result = this.dependencies.assessments.withFreshnessFence(expectation, () =>
        this.dependencies.prospective.withCurrentFence(selection.prospectiveProtocolBasisRef, (snapshot) => {
          const commit = () => {
            this.assertControlFence(command, selection);
            return this.dependencies.protocolAuthority.commit({
              protocolAuthorityKey: command.payload.protocolAuthorityKey,
              protocolAdoptionCaseId: command.payload.protocolAdoptionCaseId,
              operationId: command.operationId,
              commandDigest: digest,
              expectedProtocolAuthorityHead: command.payload.expectedProtocolAuthorityHead,
              prospectiveProtocolBasisRef: selection.prospectiveProtocolBasisRef,
              payload: snapshot.payload
            });
          };
          return selection.route === "SEMANTIC_DELTA" ? this.dependencies.semanticAuthorities.withPublicationFence(selection.semanticAuthorityRef, commit) : commit();
        })
      );
      return this.complete(command, reservation, selection, result, proof, review, "APPLIED");
    } catch (error) {
      if (error instanceof ProtocolMutationOutcomeUnknownError || isAmbiguous(error)) throw new Error("AMBIGUOUS_PROTOCOL_COMMIT");
      this.dependencies.control.releaseFinalizationReservation(reservation.protocolAdoptionCaseId, reservation.operationId);
      throw error;
    }
  }

  reconcile(command: ReconcileCommand): ProtocolAdoptionOperationReceiptV1 {
    const replay = this.dependencies.control.replayOperation(command); if (replay) return replay;
    assertCommand(command, "RECONCILE_PROTOCOL_ADOPTION");
    const reservation = this.dependencies.control.getFinalizationReservation(command.payload.protocolAdoptionCaseId);
    if (!reservation || reservation.operationId !== command.payload.originalOperationId || !reservation.finalizationCommand) throw new Error("FINALIZATION_RESERVATION_NOT_FOUND");
    const outcome = this.dependencies.protocolAuthority.queryOutcome({ protocolAdoptionCaseId: reservation.protocolAdoptionCaseId, operationId: reservation.operationId, commandDigest: reservation.commandDigest });
    if (outcome.status === "NOT_APPLIED") {
      return this.dependencies.control.resolveFinalizationNotApplied(reservation, command);
    }
    if (outcome.status === "APPLIED_CONFLICT") throw new Error("PROTOCOL_ADOPTION_OUTCOME_CONFLICT");
    if (outcome.status === "UNKNOWN_OR_UNAVAILABLE") throw new Error("AMBIGUOUS_PROTOCOL_COMMIT");
    const original = reservation.finalizationCommand as FinalizeCommand;
    const { selection, proof, review } = this.validateCurrent(original, true);
    return this.complete(command, reservation, selection, { ...outcome, status: "IDEMPOTENT" }, proof, review, "RECONCILED");
  }

  private validateCurrent(command: FinalizeCommand, reconciliation = false): { selection: ProtocolAdoptionSelectionV1; proof?: ProjectionMachineProofReceiptV1; review?: ProjectionReviewDecisionV1 } {
    const caseRecord = this.dependencies.control.getCase(command.payload.protocolAdoptionCaseId);
    if (!caseRecord || caseRecord.status !== "OPEN") throw new Error("CASE_NOT_OPEN");
    if (!equalBasisRef(caseRecord.workingSelectionRef, command.payload.expectedWorkingSelectionRef)) throw new Error("STALE_SELECTION");
    const selection = this.dependencies.control.getSelection(caseRecord.workingSelectionRef);
    if (!selection) throw new Error("SELECTION_NOT_FOUND");
    if (!equalBasisRef(selection.prospectiveProtocolBasisRef, command.payload.prospectiveProtocolBasisRef)) throw new Error("STALE_PROSPECTIVE_PROTOCOL_BASIS");
    if (!reconciliation) {
      const disposition = selection.route === "NO_DELTA" ? "NO_SEMANTIC_DELTA" : "SEMANTIC_DELTA";
      this.dependencies.assessments.assertFresh({ assessmentId: selection.assessmentId, disposition, scopeRef: selection.scopeRef, classificationBasisRef: selection.classificationBasisRef });
      if (!equalBasisRef(this.dependencies.prospective.getCurrentRef(), selection.prospectiveProtocolBasisRef)) throw new Error("STALE_PROSPECTIVE_PROTOCOL_BASIS");
    }
    if (selection.route === "NO_DELTA") {
      if (command.payload.semanticAuthorityRef || command.payload.projectionRef || command.payload.machineProofReceiptId || command.payload.projectionReviewId) throw new Error("SEMANTIC_EVIDENCE_FORBIDDEN_FOR_NO_DELTA");
      return { selection };
    }
    if (!command.payload.semanticAuthorityRef || !equalBasisRef(command.payload.semanticAuthorityRef, selection.semanticAuthorityRef)) throw new Error("STALE_SEMANTIC_AUTHORITY");
    if (!selection.protocolProjectionRef || !command.payload.projectionRef || !equalBasisRef(command.payload.projectionRef, selection.protocolProjectionRef)) throw new Error("PROJECTION_REQUIRED");
    const projection = this.dependencies.control.getProjection(selection.protocolProjectionRef);
    if (!projection || !exactProjection(selection, projection)) throw new Error("PROJECTION_LINEAGE_MISMATCH");
    const proof = command.payload.machineProofReceiptId ? this.dependencies.control.getMachineProof(command.payload.machineProofReceiptId) : undefined;
    if (!proof || !exactProof(selection, proof) || proof.verdict !== "PASS") throw new Error("MACHINE_PROJECTION_PROOF_REQUIRED");
    const reviews = this.dependencies.control.getProjectionReviewsForLineage(selection.selectionRef, projection.projectionRef);
    if (reviews.some((entry) => entry.verdict === "REJECT")) throw new Error("HUMAN_PROJECTION_REVIEW_REJECTED");
    const review = command.payload.projectionReviewId ? this.dependencies.control.getProjectionReview(command.payload.projectionReviewId) : undefined;
    if (!review || !exactReview(selection, review) || review.verdict !== "PASS") throw new Error("HUMAN_PROJECTION_REVIEW_REQUIRED");
    if (!reconciliation) this.dependencies.semanticAuthorities.assertCurrent(selection.semanticAuthorityRef);
    return { selection, proof, review };
  }

  private assertControlFence(command: FinalizeCommand, selection: ProtocolAdoptionSelectionV1): void {
    const current = this.dependencies.control.getCase(command.payload.protocolAdoptionCaseId);
    const reservation = this.dependencies.control.getFinalizationReservation(command.payload.protocolAdoptionCaseId);
    if (!current || current.status !== "OPEN" || !equalBasisRef(current.workingSelectionRef, selection.selectionRef) || reservation?.operationId !== command.operationId) throw new Error("TOCTOU_FENCE_UNAVAILABLE");
    if (!sameNullableRef(this.dependencies.protocolAuthority.getCurrentHead(command.payload.protocolAuthorityKey), command.payload.expectedProtocolAuthorityHead)) throw new Error("PROTOCOL_AUTHORITY_HEAD_CONFLICT");
  }

  private complete(operation: ProtocolAdoptionOperationEnvelopeV1, reservation: FinalizationReservationV1, selection: ProtocolAdoptionSelectionV1, result: ProtocolAuthorityCommitResult, proof: ProjectionMachineProofReceiptV1 | undefined, review: ProjectionReviewDecisionV1 | undefined, status: "APPLIED" | "RECONCILED"): ProtocolAdoptionOperationReceiptV1 {
    const occurrenceId = `${selection.protocolAdoptionCaseId}:${reservation.operationId}`;
    const occurrenceRef: ImmutableRevisionRef = { refType: "IMMUTABLE_REVISION", namespace: "protocol-adoption-occurrence", subject: occurrenceId, revision: digestOf({ selectionRef: selection.selectionRef, resultingProtocolAuthorityRef: result.resultingProtocolAuthorityRef }), digest: digestOf(result) };
    const common = { schemaVersion: 1 as const, occurrenceId, occurrenceRef, protocolAdoptionCaseId: selection.protocolAdoptionCaseId, selectionRef: selection.selectionRef, assessmentId: selection.assessmentId, scopeRef: selection.scopeRef, classificationBasisRef: selection.classificationBasisRef, prospectiveProtocolBasisRef: selection.prospectiveProtocolBasisRef, resultingProtocolAuthorityRef: result.resultingProtocolAuthorityRef, evidenceRefs: (reservation.finalizationCommand as FinalizeCommand | undefined)?.payload.evidenceRefs ?? [{ refType: "EVIDENCE" as const, id: `adoption:${occurrenceId}` }] };
    const occurrence: ProtocolAdoptionOccurrenceRecordV1 = selection.route === "NO_DELTA" ? { ...common, route: "NO_DELTA" } : { ...common, route: "SEMANTIC_DELTA", semanticAuthorityRef: selection.semanticAuthorityRef, projectionRef: selection.protocolProjectionRef!, machineProofReceiptId: proof!.receiptId, projectionReviewId: review!.reviewId };
    const terminal: ProtocolAdoptionCaseRecordV1 = { schemaVersion: 1, protocolAdoptionCaseId: selection.protocolAdoptionCaseId, status: "PROTOCOL_ADOPTED", finalSelectionRef: selection.selectionRef, adoptionOccurrenceRef: occurrenceRef, evidenceRefs: occurrence.evidenceRefs };
    try { return this.dependencies.control.completeAdoption(occurrence, terminal, reservation, operation, status); }
    catch { throw new Error("AMBIGUOUS_PROTOCOL_COMMIT"); }
  }
}

function assertCommand(command: ProtocolAdoptionOperationEnvelopeV1, kind: string): void { if (!command || command.operationVersion !== 1 || command.operationKind !== kind || !command.operationId?.trim() || !command.payload || typeof command.payload !== "object") throw new Error("INVALID_OPERATION"); }
function exactProjection(selection: Extract<ProtocolAdoptionSelectionV1, { route: "SEMANTIC_DELTA" }>, value: ProtocolProjectionRecordV1): boolean { return value.protocolAdoptionCaseId === selection.protocolAdoptionCaseId && value.assessmentId === selection.assessmentId && equalBasisRef(value.scopeRef, selection.scopeRef) && equalBasisRef(value.classificationBasisRef, selection.classificationBasisRef) && equalBasisRef(value.semanticAuthorityRef, selection.semanticAuthorityRef) && equalBasisRef(value.prospectiveProtocolBasisRef, selection.prospectiveProtocolBasisRef) && equalBasisRef(value.projectionRef, selection.protocolProjectionRef!); }
function exactProof(selection: Extract<ProtocolAdoptionSelectionV1, { route: "SEMANTIC_DELTA" }>, value: ProjectionMachineProofReceiptV1): boolean { return value.protocolAdoptionCaseId === selection.protocolAdoptionCaseId && equalBasisRef(value.selectionRef, selection.selectionRef) && equalBasisRef(value.projectionRef, selection.protocolProjectionRef!) && equalBasisRef(value.semanticAuthorityRef, selection.semanticAuthorityRef) && equalBasisRef(value.prospectiveProtocolBasisRef, selection.prospectiveProtocolBasisRef); }
function exactReview(selection: Extract<ProtocolAdoptionSelectionV1, { route: "SEMANTIC_DELTA" }>, value: ProjectionReviewDecisionV1): boolean { return value.protocolAdoptionCaseId === selection.protocolAdoptionCaseId && equalBasisRef(value.selectionRef, selection.selectionRef) && equalBasisRef(value.projectionRef, selection.protocolProjectionRef!) && equalBasisRef(value.semanticAuthorityRef, selection.semanticAuthorityRef) && equalBasisRef(value.prospectiveProtocolBasisRef, selection.prospectiveProtocolBasisRef); }
function sameNullableRef(left: ImmutableRevisionRef | null, right: ImmutableRevisionRef | null): boolean { return left === null || right === null ? left === right : equalBasisRef(left, right); }
function isAmbiguous(error: unknown): boolean { return error instanceof Error && error.message === "AMBIGUOUS_PROTOCOL_COMMIT"; }
function digestOf(value: unknown): string { return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`; }
function canonicalJson(value: unknown): string { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`; return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`; }

import type {
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

export interface FinalizationReservationV1 {
  readonly schemaVersion: 1;
  readonly protocolAdoptionCaseId: string;
  readonly operationId: string;
  readonly commandDigest: string;
  readonly selectionRef: ImmutableRevisionRef;
  readonly correlationId: string;
  readonly state: "UNRESOLVED";
  readonly finalizationCommand?: ProtocolAdoptionOperationEnvelopeV1<"FINALIZE_PROTOCOL_ADOPTION", unknown>;
}

export interface ProtocolAdoptionControlRepository {
  initialize(): void;
  getCase(caseId: string): ProtocolAdoptionCaseRecordV1 | undefined;
  getSelection(ref: ImmutableRevisionRef): ProtocolAdoptionSelectionV1 | undefined;
  getProjection(ref: ImmutableRevisionRef): ProtocolProjectionRecordV1 | undefined;
  getMachineProof(receiptId: string): ProjectionMachineProofReceiptV1 | undefined;
  getMachineProofsForLineage(selectionRef: ImmutableRevisionRef, projectionRef: ImmutableRevisionRef): readonly ProjectionMachineProofReceiptV1[];
  getProjectionReview(reviewId: string): ProjectionReviewDecisionV1 | undefined;
  getProjectionReviewsForLineage(selectionRef: ImmutableRevisionRef, projectionRef: ImmutableRevisionRef): readonly ProjectionReviewDecisionV1[];
  getOccurrence(ref: ImmutableRevisionRef): ProtocolAdoptionOccurrenceRecordV1 | undefined;
  getFinalizationReservation(caseId: string): FinalizationReservationV1 | undefined;
  replayOperation(command: ProtocolAdoptionOperationEnvelopeV1): ProtocolAdoptionOperationReceiptV1 | undefined;
  openCase(selection: ProtocolAdoptionSelectionV1, record: ProtocolAdoptionCaseRecordV1, command: ProtocolAdoptionOperationEnvelopeV1<"OPEN_PROTOCOL_ADOPTION_CASE">): ProtocolAdoptionOperationReceiptV1;
  reselect(selection: ProtocolAdoptionSelectionV1, expected: ImmutableRevisionRef, command: ProtocolAdoptionOperationEnvelopeV1<"RESELECT_PROTOCOL_ADOPTION_INPUTS">): ProtocolAdoptionOperationReceiptV1;
  publishProjection(projection: ProtocolProjectionRecordV1, selection: ProtocolAdoptionSelectionV1, expected: ImmutableRevisionRef, command: ProtocolAdoptionOperationEnvelopeV1<"CREATE_PROTOCOL_PROJECTION" | "REVISE_PROTOCOL_PROJECTION">): ProtocolAdoptionOperationReceiptV1;
  recordMachineProof(proof: ProjectionMachineProofReceiptV1, command: ProtocolAdoptionOperationEnvelopeV1<"RECORD_PROTOCOL_PROJECTION_MACHINE_PROOF">): ProtocolAdoptionOperationReceiptV1;
  recordProjectionReview(review: ProjectionReviewDecisionV1, command: ProtocolAdoptionOperationEnvelopeV1<"RECORD_PROTOCOL_PROJECTION_REVIEW">): ProtocolAdoptionOperationReceiptV1;
  cancelCase(caseId: string, expected: ImmutableRevisionRef, evidenceRefs: ProtocolAdoptionCaseRecordV1["evidenceRefs"], command: ProtocolAdoptionOperationEnvelopeV1<"CANCEL_PROTOCOL_ADOPTION_CASE">): ProtocolAdoptionOperationReceiptV1;
  acquireFinalizationReservation(reservation: FinalizationReservationV1): ProtocolAdoptionOperationReceiptV1;
  releaseFinalizationReservation(caseId: string, operationId: string): void;
  resolveFinalizationNotApplied(reservation: FinalizationReservationV1, operation: ProtocolAdoptionOperationEnvelopeV1<"RECONCILE_PROTOCOL_ADOPTION">): ProtocolAdoptionOperationReceiptV1;
  completeAdoption(occurrence: ProtocolAdoptionOccurrenceRecordV1, terminal: ProtocolAdoptionCaseRecordV1, reservation: FinalizationReservationV1, operation: ProtocolAdoptionOperationEnvelopeV1, status: "APPLIED" | "RECONCILED"): ProtocolAdoptionOperationReceiptV1;
}

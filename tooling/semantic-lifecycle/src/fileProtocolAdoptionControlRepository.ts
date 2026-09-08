import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { basisRefKey, equalBasisRef } from "./basis.js";
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
import {
  normalizeProjectionMachineProofReceiptV1,
  normalizeProjectionReviewDecisionV1,
  normalizeProtocolAdoptionCaseRecordV1,
  normalizeProtocolAdoptionOccurrenceRecordV1,
  normalizeProtocolAdoptionSelectionV1,
  normalizeProtocolProjectionRecordV1
} from "./model.js";
import type { FinalizationReservationV1, ProtocolAdoptionControlRepository } from "./protocolAdoptionControlRepository.js";

interface StoredOperation { readonly command: string; readonly receipt: ProtocolAdoptionOperationReceiptV1; }
interface DurableState {
  readonly schemaVersion: 1;
  readonly cases: Record<string, ProtocolAdoptionCaseRecordV1>;
  readonly selections: Record<string, ProtocolAdoptionSelectionV1>;
  readonly projections: Record<string, ProtocolProjectionRecordV1>;
  readonly machineProofs: Record<string, ProjectionMachineProofReceiptV1>;
  readonly reviews: Record<string, ProjectionReviewDecisionV1>;
  readonly occurrences: Record<string, ProtocolAdoptionOccurrenceRecordV1>;
  readonly operations: Record<string, StoredOperation>;
  readonly reservations: Record<string, FinalizationReservationV1>;
}

export class FileProtocolAdoptionControlRepository implements ProtocolAdoptionControlRepository {
  constructor(private readonly path: string) { this.initialize(); }

  initialize(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    if (!existsSync(this.path)) this.mutate(() => undefined);
  }

  getCase(caseId: string): ProtocolAdoptionCaseRecordV1 | undefined { return clone(this.read().cases[caseId]); }
  getSelection(ref: ImmutableRevisionRef): ProtocolAdoptionSelectionV1 | undefined { return clone(this.read().selections[basisRefKey(ref)]); }
  getProjection(ref: ImmutableRevisionRef): ProtocolProjectionRecordV1 | undefined { return clone(this.read().projections[basisRefKey(ref)]); }
  getMachineProof(receiptId: string): ProjectionMachineProofReceiptV1 | undefined { return clone(this.read().machineProofs[receiptId]); }
  getMachineProofsForLineage(selectionRef: ImmutableRevisionRef, projectionRef: ImmutableRevisionRef): readonly ProjectionMachineProofReceiptV1[] {
    return Object.values(this.read().machineProofs).filter((entry) => equalBasisRef(entry.selectionRef, selectionRef) && equalBasisRef(entry.projectionRef, projectionRef)).map(clone);
  }
  getProjectionReview(reviewId: string): ProjectionReviewDecisionV1 | undefined { return clone(this.read().reviews[reviewId]); }
  getProjectionReviewsForLineage(selectionRef: ImmutableRevisionRef, projectionRef: ImmutableRevisionRef): readonly ProjectionReviewDecisionV1[] {
    return Object.values(this.read().reviews).filter((entry) => equalBasisRef(entry.selectionRef, selectionRef) && equalBasisRef(entry.projectionRef, projectionRef)).map(clone);
  }
  getOccurrence(ref: ImmutableRevisionRef): ProtocolAdoptionOccurrenceRecordV1 | undefined { return clone(this.read().occurrences[basisRefKey(ref)]); }
  getFinalizationReservation(caseId: string): FinalizationReservationV1 | undefined { return clone(this.read().reservations[caseId]); }

  replayOperation(command: ProtocolAdoptionOperationEnvelopeV1): ProtocolAdoptionOperationReceiptV1 | undefined {
    const prior = this.read().operations[command.operationId];
    if (prior === undefined) return undefined;
    if (prior.command !== canonicalJson(command)) throw new Error("OPERATION_ID_CONFLICT");
    return clone(prior.receipt);
  }

  openCase(selectionValue: ProtocolAdoptionSelectionV1, recordValue: ProtocolAdoptionCaseRecordV1, command: ProtocolAdoptionOperationEnvelopeV1<"OPEN_PROTOCOL_ADOPTION_CASE">): ProtocolAdoptionOperationReceiptV1 {
    return this.mutate((state) => {
      const prior = replay(state, command); if (prior) return prior;
      const selection = normalizeProtocolAdoptionSelectionV1(selectionValue);
      const record = normalizeProtocolAdoptionCaseRecordV1(recordValue);
      if (record.status !== "OPEN" || record.protocolAdoptionCaseId !== selection.protocolAdoptionCaseId || !equalBasisRef(record.workingSelectionRef, selection.selectionRef)) throw new Error("INVALID_CASE_SELECTION");
      if (state.cases[record.protocolAdoptionCaseId] !== undefined) throw new Error("CASE_ALREADY_EXISTS");
      insertImmutable(state.selections, basisRefKey(selection.selectionRef), selection);
      state.cases[record.protocolAdoptionCaseId] = record;
      return recordOperation(state, command, receipt(command, "APPLIED", selection.selectionRef));
    });
  }

  reselect(selectionValue: ProtocolAdoptionSelectionV1, expected: ImmutableRevisionRef, command: ProtocolAdoptionOperationEnvelopeV1<"RESELECT_PROTOCOL_ADOPTION_INPUTS">): ProtocolAdoptionOperationReceiptV1 {
    return this.mutate((state) => {
      const prior = replay(state, command); if (prior) return prior;
      const selection = normalizeProtocolAdoptionSelectionV1(selectionValue);
      const current = requireMutableCase(state, selection.protocolAdoptionCaseId);
      if (!equalBasisRef(current.workingSelectionRef, expected)) throw new Error("STALE_SELECTION");
      if (selection.supersedesSelectionRef === undefined || !equalBasisRef(selection.supersedesSelectionRef, expected)) throw new Error("INVALID_SELECTION_SUPERSESSION");
      insertImmutable(state.selections, basisRefKey(selection.selectionRef), selection);
      state.cases[selection.protocolAdoptionCaseId] = { ...current, workingSelectionRef: selection.selectionRef };
      return recordOperation(state, command, receipt(command, "APPLIED", selection.selectionRef));
    });
  }

  publishProjection(projectionValue: ProtocolProjectionRecordV1, selectionValue: ProtocolAdoptionSelectionV1, expected: ImmutableRevisionRef, command: ProtocolAdoptionOperationEnvelopeV1<"CREATE_PROTOCOL_PROJECTION" | "REVISE_PROTOCOL_PROJECTION">): ProtocolAdoptionOperationReceiptV1 {
    return this.mutate((state) => {
      const prior = replay(state, command); if (prior) return prior;
      const projection = normalizeProtocolProjectionRecordV1(projectionValue);
      const selection = normalizeProtocolAdoptionSelectionV1(selectionValue);
      const current = requireMutableCase(state, selection.protocolAdoptionCaseId);
      if (selection.route !== "SEMANTIC_DELTA" || projection.protocolAdoptionCaseId !== selection.protocolAdoptionCaseId || selection.protocolProjectionRef === undefined || !equalBasisRef(selection.protocolProjectionRef, projection.projectionRef)) throw new Error("PROJECTION_LINEAGE_MISMATCH");
      if (!equalBasisRef(current.workingSelectionRef, expected)) throw new Error("STALE_SELECTION");
      if (selection.supersedesSelectionRef === undefined || !equalBasisRef(selection.supersedesSelectionRef, expected)) throw new Error("INVALID_SELECTION_SUPERSESSION");
      const priorSelection = state.selections[basisRefKey(expected)];
      assertProjectionLineage(selection, projection, priorSelection);
      if (command.operationKind === "REVISE_PROTOCOL_PROJECTION" && projection.supersedesProjectionRef === undefined) throw new Error("INVALID_PROJECTION_SUPERSESSION");
      insertImmutable(state.projections, basisRefKey(projection.projectionRef), projection);
      insertImmutable(state.selections, basisRefKey(selection.selectionRef), selection);
      state.cases[selection.protocolAdoptionCaseId] = { ...current, workingSelectionRef: selection.selectionRef };
      return recordOperation(state, command, receipt(command, "APPLIED", selection.selectionRef));
    });
  }

  recordMachineProof(value: ProjectionMachineProofReceiptV1, command: ProtocolAdoptionOperationEnvelopeV1<"RECORD_PROTOCOL_PROJECTION_MACHINE_PROOF">): ProtocolAdoptionOperationReceiptV1 {
    return this.mutate((state) => {
      const prior = replay(state, command); if (prior) return prior;
      const proof = normalizeProjectionMachineProofReceiptV1(value);
      requireMutableCase(state, proof.protocolAdoptionCaseId);
      assertStoredLineage(state, proof.protocolAdoptionCaseId, proof.selectionRef, proof.projectionRef, proof.semanticAuthorityRef, proof.prospectiveProtocolBasisRef);
      insertImmutable(state.machineProofs, proof.receiptId, proof);
      return recordOperation(state, command, receipt(command, "APPLIED"));
    });
  }

  recordProjectionReview(value: ProjectionReviewDecisionV1, command: ProtocolAdoptionOperationEnvelopeV1<"RECORD_PROTOCOL_PROJECTION_REVIEW">): ProtocolAdoptionOperationReceiptV1 {
    return this.mutate((state) => {
      const prior = replay(state, command); if (prior) return prior;
      const review = normalizeProjectionReviewDecisionV1(value);
      requireMutableCase(state, review.protocolAdoptionCaseId);
      assertStoredLineage(state, review.protocolAdoptionCaseId, review.selectionRef, review.projectionRef, review.semanticAuthorityRef, review.prospectiveProtocolBasisRef);
      const decisions = Object.values(state.reviews).filter((entry) => equalBasisRef(entry.selectionRef, review.selectionRef) && equalBasisRef(entry.projectionRef, review.projectionRef));
      if (decisions.some((entry) => entry.verdict !== review.verdict)) throw new Error("CONFLICTING_HUMAN_REVIEW");
      insertImmutable(state.reviews, review.reviewId, review);
      return recordOperation(state, command, receipt(command, "APPLIED"));
    });
  }

  cancelCase(caseId: string, expected: ImmutableRevisionRef, evidenceRefs: ProtocolAdoptionCaseRecordV1["evidenceRefs"], command: ProtocolAdoptionOperationEnvelopeV1<"CANCEL_PROTOCOL_ADOPTION_CASE">): ProtocolAdoptionOperationReceiptV1 {
    return this.mutate((state) => {
      const prior = replay(state, command); if (prior) return prior;
      const current = requireMutableCase(state, caseId);
      if (!equalBasisRef(current.workingSelectionRef, expected)) throw new Error("STALE_SELECTION");
      const terminal = normalizeProtocolAdoptionCaseRecordV1({ schemaVersion: 1, protocolAdoptionCaseId: caseId, status: "CANCELLED", finalSelectionRef: expected, evidenceRefs });
      state.cases[caseId] = terminal;
      return recordOperation(state, command, receipt(command, "APPLIED", expected));
    });
  }

  acquireFinalizationReservation(reservation: FinalizationReservationV1): ProtocolAdoptionOperationReceiptV1 {
    return this.mutate((state) => {
      const current = requireMutableCase(state, reservation.protocolAdoptionCaseId, true);
      if (!equalBasisRef(current.workingSelectionRef, reservation.selectionRef)) throw new Error("STALE_SELECTION");
      const prior = state.reservations[reservation.protocolAdoptionCaseId];
      if (prior !== undefined) {
        if (canonicalJson(prior) === canonicalJson(reservation)) return receipt(reservation.finalizationCommand ?? fallbackFinalize(reservation), "IDEMPOTENT", reservation.selectionRef);
        if (prior.operationId === reservation.operationId) throw new Error("OPERATION_ID_CONFLICT");
        throw new Error("FINALIZATION_IN_PROGRESS");
      }
      state.reservations[reservation.protocolAdoptionCaseId] = clone(reservation);
      return receipt(reservation.finalizationCommand ?? fallbackFinalize(reservation), "APPLIED", reservation.selectionRef);
    });
  }

  releaseFinalizationReservation(caseId: string, operationId: string): void {
    this.mutate((state) => {
      const reservation = state.reservations[caseId];
      if (reservation !== undefined && reservation.operationId !== operationId) throw new Error("FINALIZATION_RESERVATION_MISMATCH");
      delete state.reservations[caseId];
    });
  }

  resolveFinalizationNotApplied(reservation: FinalizationReservationV1, operation: ProtocolAdoptionOperationEnvelopeV1<"RECONCILE_PROTOCOL_ADOPTION">): ProtocolAdoptionOperationReceiptV1 {
    return this.mutate((state) => {
      const prior = replay(state, operation); if (prior) return prior;
      const stored = state.reservations[reservation.protocolAdoptionCaseId];
      if (stored === undefined || canonicalJson(stored) !== canonicalJson(reservation)) throw new Error("FINALIZATION_RESERVATION_MISMATCH");
      delete state.reservations[reservation.protocolAdoptionCaseId];
      return recordOperation(state, operation, receipt(operation, "NOOP"));
    });
  }

  completeAdoption(occurrenceValue: ProtocolAdoptionOccurrenceRecordV1, terminalValue: ProtocolAdoptionCaseRecordV1, reservation: FinalizationReservationV1, operation: ProtocolAdoptionOperationEnvelopeV1, status: "APPLIED" | "RECONCILED"): ProtocolAdoptionOperationReceiptV1 {
    return this.mutate((state) => {
      const replayed = replay(state, operation); if (replayed) return replayed;
      const occurrence = normalizeProtocolAdoptionOccurrenceRecordV1(occurrenceValue);
      const terminal = normalizeProtocolAdoptionCaseRecordV1(terminalValue);
      const stored = state.reservations[reservation.protocolAdoptionCaseId];
      if (stored === undefined || canonicalJson(stored) !== canonicalJson(reservation)) throw new Error("FINALIZATION_RESERVATION_MISMATCH");
      const current = requireMutableCase(state, occurrence.protocolAdoptionCaseId, true);
      if (terminal.status !== "PROTOCOL_ADOPTED" || !equalBasisRef(current.workingSelectionRef, occurrence.selectionRef) || !equalBasisRef(terminal.finalSelectionRef, occurrence.selectionRef) || !equalBasisRef(terminal.adoptionOccurrenceRef, occurrence.occurrenceRef)) throw new Error("ADOPTION_COMPLETION_MISMATCH");
      insertImmutable(state.occurrences, basisRefKey(occurrence.occurrenceRef), occurrence);
      state.cases[occurrence.protocolAdoptionCaseId] = terminal;
      delete state.reservations[occurrence.protocolAdoptionCaseId];
      const result = recordOperation(state, operation, receipt(operation, status, occurrence.occurrenceRef));
      const original = reservation.finalizationCommand;
      if (original && original.operationId !== operation.operationId) recordOperation(state, original, receipt(original, "APPLIED", occurrence.occurrenceRef));
      return result;
    });
  }

  private read(): DurableState {
    if (!existsSync(this.path)) return emptyState();
    return parseState(readFileSync(this.path, "utf8"));
  }

  private mutate<T>(action: (state: Mutable<DurableState>) => T): T {
    mkdirSync(dirname(this.path), { recursive: true });
    const lockPath = `${this.path}.lock`;
    let lock: number;
    try { lock = openSync(lockPath, "wx", 0o600); }
    catch { throw new Error("CONTROL_STORE_LOCK_UNAVAILABLE"); }
    try {
      const state = this.read() as Mutable<DurableState>;
      const result = action(state);
      writeDurable(this.path, state);
      return clone(result);
    } finally {
      closeSync(lock);
      unlinkSync(lockPath);
    }
  }
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
function emptyState(): DurableState { return { schemaVersion: 1, cases: {}, selections: {}, projections: {}, machineProofs: {}, reviews: {}, occurrences: {}, operations: {}, reservations: {} }; }
function parseState(text: string): DurableState { const value = JSON.parse(text) as DurableState; if (value.schemaVersion !== 1) throw new Error("UNSUPPORTED_CONTROL_STORE_VERSION"); return value; }
function clone<T>(value: T): T { return value === undefined ? value : structuredClone(value); }
function canonicalJson(value: unknown): string { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`; return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`; }
function writeDurable(path: string, state: DurableState): void { const temp = `${path}.tmp-${process.pid}`; writeFileSync(temp, `${canonicalJson(state)}\n`, { mode: 0o600 }); const fd = openSync(temp, "r"); try { fsyncSync(fd); } finally { closeSync(fd); } renameSync(temp, path); const dir = openSync(dirname(path), "r"); try { fsyncSync(dir); } finally { closeSync(dir); } }
function insertImmutable<T>(target: Record<string, T>, key: string, value: T): void { const prior = target[key]; if (prior !== undefined) { if (canonicalJson(prior) !== canonicalJson(value)) throw new Error("IMMUTABLE_RECORD_CONFLICT"); throw new Error("IMMUTABLE_RECORD_ALREADY_EXISTS"); } target[key] = clone(value); }
function receipt(command: Pick<ProtocolAdoptionOperationEnvelopeV1, "operationId" | "operationKind">, status: ProtocolAdoptionOperationReceiptV1["status"], resultRef?: ImmutableRevisionRef): ProtocolAdoptionOperationReceiptV1 { return { schemaVersion: 1, operationId: command.operationId, operationKind: command.operationKind, status, ...(resultRef ? { resultRef } : {}) }; }
function replay(state: DurableState, command: ProtocolAdoptionOperationEnvelopeV1): ProtocolAdoptionOperationReceiptV1 | undefined { const prior = state.operations[command.operationId]; if (!prior) return undefined; if (prior.command !== canonicalJson(command)) throw new Error("OPERATION_ID_CONFLICT"); return prior.receipt; }
function recordOperation(state: Mutable<DurableState>, command: ProtocolAdoptionOperationEnvelopeV1, value: ProtocolAdoptionOperationReceiptV1): ProtocolAdoptionOperationReceiptV1 { state.operations[command.operationId] = { command: canonicalJson(command), receipt: value }; return value; }
function requireMutableCase(state: DurableState, caseId: string, allowReserved = false): Extract<ProtocolAdoptionCaseRecordV1, { status: "OPEN" }> { const value = state.cases[caseId]; if (!value) throw new Error("CASE_NOT_FOUND"); if (value.status !== "OPEN") throw new Error("CASE_NOT_OPEN"); if (!allowReserved && state.reservations[caseId]) throw new Error("FINALIZATION_IN_PROGRESS"); return value; }
function assertProjectionLineage(selection: Extract<ProtocolAdoptionSelectionV1, { route: "SEMANTIC_DELTA" }>, projection: ProtocolProjectionRecordV1, prior: ProtocolAdoptionSelectionV1 | undefined): void { if (!prior || prior.route !== "SEMANTIC_DELTA" || projection.assessmentId !== selection.assessmentId || projection.assessmentId !== prior.assessmentId || !equalBasisRef(projection.scopeRef, selection.scopeRef) || !equalBasisRef(projection.classificationBasisRef, selection.classificationBasisRef) || !equalBasisRef(projection.semanticAuthorityRef, selection.semanticAuthorityRef) || !equalBasisRef(projection.prospectiveProtocolBasisRef, selection.prospectiveProtocolBasisRef)) throw new Error("PROJECTION_LINEAGE_MISMATCH"); }
function assertStoredLineage(state: DurableState, caseId: string, selectionRef: ImmutableRevisionRef, projectionRef: ImmutableRevisionRef, semanticRef: ImmutableRevisionRef, prospectiveRef: ImmutableRevisionRef): void { const current = state.cases[caseId]; if (!current || current.status !== "OPEN" || !equalBasisRef(current.workingSelectionRef, selectionRef)) throw new Error("STALE_SELECTION"); const selection = state.selections[basisRefKey(selectionRef)]; const projection = state.projections[basisRefKey(projectionRef)]; if (!selection || selection.route !== "SEMANTIC_DELTA" || !projection || selection.protocolAdoptionCaseId !== caseId || !equalBasisRef(selection.protocolProjectionRef!, projectionRef) || !equalBasisRef(selection.semanticAuthorityRef, semanticRef) || !equalBasisRef(selection.prospectiveProtocolBasisRef, prospectiveRef)) throw new Error("PROJECTION_LINEAGE_MISMATCH"); }
function fallbackFinalize(reservation: FinalizationReservationV1): ProtocolAdoptionOperationEnvelopeV1<"FINALIZE_PROTOCOL_ADOPTION"> { return { operationVersion: 1, operationId: reservation.operationId, operationKind: "FINALIZE_PROTOCOL_ADOPTION", payload: {} }; }

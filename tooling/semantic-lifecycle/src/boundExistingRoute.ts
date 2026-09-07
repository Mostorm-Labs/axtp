import type {
  AdoptedProtocolBasis, BoundExistingBasisSelection, BoundExistingOperationReceipt,
  BoundExistingReconstructionCase, ImmutableRevisionRef, MigrationBasisRecord, SemanticCandidateRecordV2,
  BoundExistingMachineProofReceipt, HumanReviewDecisionV2
} from "./model.js";
import {
  normalizeAdoptedProtocolBasis, normalizeBoundExistingBasisSelection,
  normalizeBoundExistingReconstructionCase, normalizeMigrationBasisRecord,
  normalizeSemanticCandidateRecordV2, normalizeBoundExistingMachineProofReceipt, normalizeHumanReviewDecisionV2
} from "./model.js";
import type { BoundExistingCommand, BoundExistingControlStore } from "./controlStore.js";
import { normalizeControlCommand } from "./controlStore.js";
import { basisRefFrom, equalBasisRef } from "./basis.js";
import { InMemorySemanticCandidateStore, type SemanticCandidateStore } from "./candidateStore.js";

/** Read-only adoption port. The acceptance fence is supplied by the later provider. */
export interface AdoptedProtocolBasisReader {
  readAdoptedProtocolBasis(): AdoptedProtocolBasis;
}

interface OperationMetadata {
  readonly operationId: string;
  readonly operationVersion?: 1;
  readonly operationKind?: string;
}

export interface RegisterMigrationBasisCommand extends OperationMetadata {
  readonly record: MigrationBasisRecord;
}

export interface OpenReconstructionCommand extends OperationMetadata {
  readonly selection: BoundExistingBasisSelection;
  readonly reconstructionCase: BoundExistingReconstructionCase;
}

export interface ReselectBasisCommand extends OperationMetadata {
  readonly selection: BoundExistingBasisSelection;
  readonly expectedBasisSelectionRef: ImmutableRevisionRef;
}

export interface CancelReconstructionCommand extends OperationMetadata {
  readonly reconstructionCaseId: string;
}

export interface CreateBoundExistingCandidateCommand extends OperationMetadata {
  readonly candidate: SemanticCandidateRecordV2;
}

export interface ReviseBoundExistingCandidateCommand extends OperationMetadata {
  readonly candidate: SemanticCandidateRecordV2;
  readonly expectedCandidateRef: ImmutableRevisionRef;
  readonly revisionReason: "REPAIR" | "BASIS_RESELECTION";
}

export interface RecordBoundExistingMachineProofCommand extends OperationMetadata {
  readonly proof: BoundExistingMachineProofReceipt;
}

export interface RecordBoundExistingHumanReviewCommand extends OperationMetadata {
  readonly review: HumanReviewDecisionV2;
}

/** Orchestration only: canonical control records remain in the injected owner. */
export class BoundExistingRoute {
  constructor(
    private readonly control: BoundExistingControlStore,
    private readonly adoption: AdoptedProtocolBasisReader,
    private readonly candidates: SemanticCandidateStore = new InMemorySemanticCandidateStore()
  ) {}

  registerMigrationBasis(input: RegisterMigrationBasisCommand): BoundExistingOperationReceipt {
    const raw = commandInput(input, "REGISTER_MIGRATION_BASIS", ["record"]);
    const record = normalizeMigrationBasisRecord(raw.payload.record);
    const command = normalizeControlCommand({ ...raw.command, payload: { record } });
    const replay = this.control.replayOperation(command);
    if (replay !== undefined) return replay;
    this.control.registerMigrationBasis(record, command);
    return this.control.getOperationReceipt(command.operationId)!;
  }

  openReconstruction(input: OpenReconstructionCommand): BoundExistingOperationReceipt {
    const raw = commandInput(input, "OPEN_BOUND_EXISTING_RECONSTRUCTION", ["selection", "reconstructionCase"]);
    const selection = normalizeBoundExistingBasisSelection(raw.payload.selection);
    const reconstructionCase = normalizeBoundExistingReconstructionCase(raw.payload.reconstructionCase);
    const command = normalizeControlCommand({ ...raw.command, payload: { selection, reconstructionCase } });
    const replay = this.control.replayOperation(command);
    if (replay !== undefined) return replay;
    this.requireAdopted(selection.protocolBasis);
    this.control.openReconstruction(reconstructionCase, selection, command);
    return this.control.getOperationReceipt(command.operationId)!;
  }

  reselectBasis(input: ReselectBasisCommand): BoundExistingOperationReceipt {
    const raw = commandInput(input, "RESELECT_BOUND_EXISTING_BASIS", ["selection", "expectedBasisSelectionRef"]);
    const selection = normalizeBoundExistingBasisSelection(raw.payload.selection);
    const expectedBasisSelectionRef = exactRef(raw.payload.expectedBasisSelectionRef);
    const command = normalizeControlCommand({ ...raw.command, payload: { selection, expectedBasisSelectionRef } });
    const replay = this.control.replayOperation(command);
    if (replay !== undefined) return replay;
    this.requireAdopted(selection.protocolBasis);
    this.control.reselectBasis(selection, expectedBasisSelectionRef, command);
    return this.control.getOperationReceipt(command.operationId)!;
  }

  cancelReconstruction(input: CancelReconstructionCommand): BoundExistingOperationReceipt {
    const raw = commandInput(input, "CANCEL_BOUND_EXISTING_RECONSTRUCTION", ["reconstructionCaseId"]);
    const reconstructionCaseId = raw.payload.reconstructionCaseId;
    if (typeof reconstructionCaseId !== "string" || reconstructionCaseId.trim().length === 0) throw new Error("INVALID_OPERATION");
    const command = normalizeControlCommand({ ...raw.command, payload: { reconstructionCaseId } });
    const replay = this.control.replayOperation(command);
    if (replay !== undefined) return replay;
    const record = this.control.getReconstructionCase(reconstructionCaseId);
    if (record?.status !== "OPEN") throw new Error("CASE_NOT_OPEN");
    const receipt: BoundExistingOperationReceipt = {
      schemaVersion: 2, route: "BOUND_EXISTING", operationId: command.operationId,
      operationKind: command.operationKind, status: "CREATED"
    };
    const prepared = this.control.prepareTerminalTransition(
      { ...record, status: "CANCELLED" }, record.basisSelectionRef, { command, receipt }
    );
    prepared.commit();
    return this.control.getOperationReceipt(command.operationId)!;
  }

  createCandidate(input: CreateBoundExistingCandidateCommand): BoundExistingOperationReceipt {
    const raw = commandInput(input, "CREATE_BOUND_EXISTING_CANDIDATE", ["candidate"]);
    const candidate = normalizeSemanticCandidateRecordV2(raw.payload.candidate);
    if (candidate.provenance.route !== "BOUND_EXISTING") throw new Error("INVALID_CANDIDATE_ROUTE");
    const command = normalizeControlCommand({ ...raw.command, payload: { candidate } });
    const replay = this.control.replayOperation(command);
    if (replay !== undefined) return replay;
    const currentCase = this.control.getReconstructionCase(candidate.provenance.reconstructionCaseId);
    if (currentCase?.status !== "OPEN") throw new Error("CASE_NOT_OPEN");
    if (!equalBasisRef(currentCase.basisSelectionRef, candidate.provenance.basisSelectionRef)) {
      throw new Error("BASIS_SELECTION_CONFLICT");
    }
    const alreadyStored = this.candidates.getCandidateV2(candidate.candidateRef) !== undefined;
    const receipt: BoundExistingOperationReceipt = {
      schemaVersion: 2, route: "BOUND_EXISTING", operationId: command.operationId,
      operationKind: command.operationKind, status: alreadyStored ? "IDEMPOTENT" : "CREATED", resultRef: candidate.candidateRef
    };
    const lineage = { reconstructionCaseId: candidate.provenance.reconstructionCaseId, basisSelectionRef: candidate.provenance.basisSelectionRef };
    let controlPrepared;
    let candidatePrepared;
    try {
      controlPrepared = this.control.prepareOperation({ command, receipt }, lineage);
      candidatePrepared = this.candidates.prepareCandidatePublication(candidate, null);
    } catch (error) {
      if (controlPrepared) controlPrepared.abort();
      throw error;
    }
    // Publish the control receipt first; both capabilities are already fully
    // prevalidated, and commits are synchronous no-throw swaps. This avoids
    // mutating Candidate state before attempting its receipt publication.
    controlPrepared.commit();
    candidatePrepared.commit();
    return this.control.getOperationReceipt(command.operationId)!;
  }

  reviseCandidate(input: ReviseBoundExistingCandidateCommand): BoundExistingOperationReceipt {
    const raw = commandInput(input, "REVISE_BOUND_EXISTING_CANDIDATE", ["candidate", "expectedCandidateRef", "revisionReason"]);
    const candidate = normalizeSemanticCandidateRecordV2(raw.payload.candidate);
    const expectedCandidateRef = exactRef(raw.payload.expectedCandidateRef);
    const revisionReason = raw.payload.revisionReason;
    if (revisionReason !== "REPAIR" && revisionReason !== "BASIS_RESELECTION") throw new Error("INVALID_OPERATION");
    if (candidate.provenance.route !== "BOUND_EXISTING") throw new Error("INVALID_CANDIDATE_ROUTE");
    const command = normalizeControlCommand({ ...raw.command, payload: { candidate, expectedCandidateRef, revisionReason } });
    const replay = this.control.replayOperation(command);
    if (replay !== undefined) return replay;
    if (candidate.supersedesCandidateRef === undefined || !equalBasisRef(candidate.supersedesCandidateRef, expectedCandidateRef)) {
      throw new Error("CANDIDATE_SUPERSESSION_CONFLICT");
    }
    const currentCase = this.control.getReconstructionCase(candidate.provenance.reconstructionCaseId);
    if (currentCase?.status !== "OPEN") throw new Error("CASE_NOT_OPEN");
    if (!equalBasisRef(currentCase.basisSelectionRef, candidate.provenance.basisSelectionRef)) throw new Error("BASIS_SELECTION_CONFLICT");
    const prior = this.candidates.getCandidateV2(expectedCandidateRef);
    if (prior === undefined || prior.provenance.route !== "BOUND_EXISTING" || prior.provenance.reconstructionCaseId !== candidate.provenance.reconstructionCaseId) throw new Error("CANDIDATE_HEAD_CONFLICT");
    if (revisionReason === "REPAIR" && !equalBasisRef(prior.provenance.basisSelectionRef, candidate.provenance.basisSelectionRef)) throw new Error("BASIS_SELECTION_CONFLICT");
    if (revisionReason === "BASIS_RESELECTION" && equalBasisRef(prior.provenance.basisSelectionRef, candidate.provenance.basisSelectionRef)) throw new Error("BASIS_SELECTION_CONFLICT");
    const alreadyStored = this.candidates.getCandidateV2(candidate.candidateRef) !== undefined;
    const receipt: BoundExistingOperationReceipt = {
      schemaVersion: 2, route: "BOUND_EXISTING", operationId: command.operationId,
      operationKind: command.operationKind, status: alreadyStored ? "IDEMPOTENT" : "CREATED", resultRef: candidate.candidateRef
    };
    const lineage = { reconstructionCaseId: candidate.provenance.reconstructionCaseId, basisSelectionRef: candidate.provenance.basisSelectionRef };
    let controlPrepared;
    let candidatePrepared;
    try {
      controlPrepared = this.control.prepareOperation({ command, receipt }, lineage);
      candidatePrepared = this.candidates.prepareCandidatePublication(candidate, expectedCandidateRef);
    } catch (error) {
      if (controlPrepared) controlPrepared.abort();
      throw error;
    }
    controlPrepared.commit();
    candidatePrepared.commit();
    return this.control.getOperationReceipt(command.operationId)!;
  }

  createBoundExistingCandidate(input: CreateBoundExistingCandidateCommand): BoundExistingOperationReceipt {
    return this.createCandidate(input);
  }

  reviseBoundExistingCandidate(input: ReviseBoundExistingCandidateCommand): BoundExistingOperationReceipt {
    return this.reviseCandidate(input);
  }

  recordMachineProof(input: RecordBoundExistingMachineProofCommand): BoundExistingOperationReceipt {
    const raw = commandInput(input, "RECORD_BOUND_EXISTING_MACHINE_PROOF", ["proof"]);
    const proof = normalizeBoundExistingMachineProofReceipt(raw.payload.proof);
    const command = normalizeControlCommand({ ...raw.command, payload: { proof } });
    const replay = this.control.replayOperation(command);
    if (replay !== undefined) return replay;
    this.requireCurrentCandidate(proof.reconstructionCaseId, proof.basisSelectionRef, proof.candidateRef);
    const receipt: BoundExistingOperationReceipt = {
      schemaVersion: 2, route: "BOUND_EXISTING", operationId: command.operationId,
      operationKind: command.operationKind, status: "CREATED"
    };
    const result = this.control.putBoundExistingMachineProof(proof, command);
    return { ...receipt, status: result };
  }

  recordBoundExistingMachineProof(input: RecordBoundExistingMachineProofCommand): BoundExistingOperationReceipt {
    return this.recordMachineProof(input);
  }

  recordHumanReview(input: RecordBoundExistingHumanReviewCommand): BoundExistingOperationReceipt {
    const raw = commandInput(input, "RECORD_BOUND_EXISTING_HUMAN_REVIEW", ["review"]);
    const review = normalizeHumanReviewDecisionV2(raw.payload.review);
    const command = normalizeControlCommand({ ...raw.command, payload: { review } });
    const replay = this.control.replayOperation(command);
    if (replay !== undefined) return replay;
    if (review.provenance.route !== "BOUND_EXISTING") throw new Error("INVALID_REVIEW_ROUTE");
    this.requireCurrentCandidate(review.provenance.reconstructionCaseId, review.provenance.basisSelectionRef, review.candidateRef);
    const proof = this.control.getBoundExistingMachineProofForLineage(review.provenance.reconstructionCaseId, review.candidateRef, review.provenance.basisSelectionRef);
    if (proof?.verdict !== "PASS") throw new Error("PROOF_REQUIRED");
    const receipt: BoundExistingOperationReceipt = {
      schemaVersion: 2, route: "BOUND_EXISTING", operationId: command.operationId,
      operationKind: command.operationKind, status: "CREATED"
    };
    const result = this.control.putHumanReviewDecisionV2(review, command);
    return { ...receipt, status: result };
  }

  recordBoundExistingHumanReview(input: RecordBoundExistingHumanReviewCommand): BoundExistingOperationReceipt {
    return this.recordHumanReview(input);
  }

  private requireCurrentCandidate(reconstructionCaseId: string, basisSelectionRef: ImmutableRevisionRef, candidateRef: ImmutableRevisionRef): SemanticCandidateRecordV2 {
    const record = this.control.getReconstructionCase(reconstructionCaseId);
    if (record?.status !== "OPEN") throw new Error("CASE_NOT_OPEN");
    if (!equalBasisRef(record.basisSelectionRef, basisSelectionRef)) throw new Error("BASIS_SELECTION_CONFLICT");
    const candidate = this.candidates.getCandidateV2(candidateRef);
    if (candidate === undefined || candidate.provenance.route !== "BOUND_EXISTING" || candidate.provenance.reconstructionCaseId !== reconstructionCaseId || !equalBasisRef(candidate.provenance.basisSelectionRef, basisSelectionRef)) {
      throw new Error("CANDIDATE_HEAD_CONFLICT");
    }
    const head = this.candidates.getCandidateHead(candidate.candidateId);
    if (head === undefined || !equalBasisRef(head, candidateRef)) throw new Error("CANDIDATE_HEAD_CONFLICT");
    return candidate;
  }

  private requireAdopted(proposed: AdoptedProtocolBasis): void {
    const adopted = normalizeAdoptedProtocolBasis(this.adoption.readAdoptedProtocolBasis());
    // Normalizers fix field and evidence ordering, preserving exact ref/digest identity.
    if (JSON.stringify(adopted) !== JSON.stringify(proposed)) throw new Error("PROTOCOL_BASIS_NOT_ADOPTED");
  }
}

function commandInput(input: OperationMetadata, kind: string, fields: readonly string[]): {
  command: BoundExistingCommand;
  payload: Record<string, unknown>;
} {
  // Validate descriptors before reading transport values. Explicit unknown fields,
  // versions and kinds fail closed instead of disappearing during normalization.
  if (typeof input !== "object" || input === null || Array.isArray(input) ||
      (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null)) throw new Error("INVALID_OPERATION");
  const allowed = ["operationId", "operationVersion", "operationKind", ...fields];
  for (const key of Reflect.ownKeys(input)) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
    if (typeof key !== "string" || !allowed.includes(key) || !descriptor.enumerable || !("value" in descriptor)) throw new Error("INVALID_OPERATION");
  }
  if ((Object.hasOwn(input, "operationVersion") && input.operationVersion !== 1) ||
      (Object.hasOwn(input, "operationKind") && input.operationKind !== kind)) throw new Error("INVALID_OPERATION");
  const source = input as unknown as Record<string, unknown>;
  const command = normalizeControlCommand({
    operationVersion: 1, operationId: input.operationId, operationKind: kind,
    payload: Object.fromEntries(fields.map((key) => [key, source[key]]))
  });
  return { command, payload: command.payload as Record<string, unknown> };
}

function exactRef(value: unknown): ImmutableRevisionRef {
  if (typeof value !== "object" || value === null || Array.isArray(value) ||
      Object.keys(value).some((key) => !["refType", "namespace", "subject", "revision", "digest"].includes(key))) throw new Error("INVALID_OPERATION");
  return basisRefFrom(value);
}

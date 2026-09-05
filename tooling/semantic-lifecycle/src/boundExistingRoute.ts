import type {
  AdoptedProtocolBasis, BoundExistingBasisSelection, BoundExistingOperationReceipt,
  BoundExistingReconstructionCase, ImmutableRevisionRef, MigrationBasisRecord
} from "./model.js";
import {
  normalizeAdoptedProtocolBasis, normalizeBoundExistingBasisSelection,
  normalizeBoundExistingReconstructionCase, normalizeMigrationBasisRecord
} from "./model.js";
import type { BoundExistingCommand, BoundExistingControlStore } from "./controlStore.js";
import { normalizeControlCommand } from "./controlStore.js";
import { basisRefFrom } from "./basis.js";

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

/** Orchestration only: canonical control records remain in the injected owner. */
export class BoundExistingRoute {
  constructor(
    private readonly control: BoundExistingControlStore,
    private readonly adoption: AdoptedProtocolBasisReader
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

import type { ChangeScopeSnapshot, MachineProofReceipt, ReviewDecision, SemanticDeltaAssessment } from "./model.js";
import type {
  BoundExistingBasisSelection, BoundExistingReconstructionCase, MigrationBasisRecord,
  BoundExistingMachineProofReceipt, HumanReviewDecisionV2, BoundExistingIncompatibilityDetermination,
  BoundExistingFallbackLink, SemanticChangeCase, BoundExistingOperationReceipt, ImmutableRevisionRef
} from "./model.js";
import {
  normalizeMigrationBasisRecord, normalizeBoundExistingBasisSelection, normalizeBoundExistingReconstructionCase,
  normalizeBoundExistingMachineProofReceipt, normalizeHumanReviewDecisionV2,
  normalizeBoundExistingIncompatibilityDetermination, normalizeBoundExistingFallbackLink
} from "./model.js";
import { basisRefFrom, basisRefKey, equalBasisRef } from "./basis.js";

export type ImmutablePutResult = "CREATED" | "IDEMPOTENT";

export interface LifecycleControlStore {
  putScope(snapshot: ChangeScopeSnapshot): ImmutablePutResult;
  getScope(caseId: string): ChangeScopeSnapshot | undefined;
  putAssessment(assessment: SemanticDeltaAssessment): ImmutablePutResult;
  getAssessment(assessmentId: string): SemanticDeltaAssessment | undefined;
  putMachineProof(receipt: MachineProofReceipt): ImmutablePutResult;
  getMachineProof(receiptId: string): MachineProofReceipt | undefined;
  putReviewDecision(decision: ReviewDecision): ImmutablePutResult;
  getReviewDecision(reviewId: string): ReviewDecision | undefined;
}

type Stored<T> = Readonly<{ canonical: string; value: T }>;

export interface BoundExistingCommand {
  readonly operationVersion: 1;
  readonly operationId: string;
  readonly operationKind: string;
  readonly payload: unknown;
}

export interface ControlOperation {
  readonly command: BoundExistingCommand;
  readonly receipt: BoundExistingOperationReceipt;
}

export interface SelectionLineage {
  readonly reconstructionCaseId: string;
  readonly basisSelectionRef: ImmutableRevisionRef;
}

/** A transient exclusive reservation. Always abort in finally if not committed.
 * After preparation, commit/abort are idempotent and cannot throw. Cross-owner
 * publication must perform its prepared swaps synchronously without callbacks.
 */
export interface PreparedControlPublication {
  commit(): void;
  abort(): void;
}

export interface BoundExistingControlStore extends LifecycleControlStore {
  registerMigrationBasis(record: MigrationBasisRecord, command?: BoundExistingCommand): ImmutablePutResult;
  getMigrationBasis(ref: ImmutableRevisionRef): MigrationBasisRecord | undefined;
  openReconstruction(record: BoundExistingReconstructionCase, selection: BoundExistingBasisSelection, command?: BoundExistingCommand): ImmutablePutResult;
  getReconstructionCase(caseId: string): BoundExistingReconstructionCase | undefined;
  getBasisSelection(ref: ImmutableRevisionRef): BoundExistingBasisSelection | undefined;
  reselectBasis(selection: BoundExistingBasisSelection, expected: ImmutableRevisionRef, command?: BoundExistingCommand): "CREATED" | "NOOP";
  getOperationReceipt(operationId: string): BoundExistingOperationReceipt | undefined;
  replayOperation(command: BoundExistingCommand): BoundExistingOperationReceipt | undefined;
  prepareOperation(operation: ControlOperation, lineage: SelectionLineage): PreparedControlPublication;
  prepareTerminalTransition(record: BoundExistingReconstructionCase, expected: ImmutableRevisionRef, operation?: ControlOperation): PreparedControlPublication;
  putBoundExistingMachineProof(record: BoundExistingMachineProofReceipt, command?: BoundExistingCommand): ImmutablePutResult;
  getBoundExistingMachineProof(id: string): BoundExistingMachineProofReceipt | undefined;
  putHumanReviewDecisionV2(record: HumanReviewDecisionV2, command?: BoundExistingCommand): ImmutablePutResult;
  getHumanReviewDecisionV2(id: string): HumanReviewDecisionV2 | undefined;
  prepareIncompatibility(record: BoundExistingIncompatibilityDetermination, operation?: ControlOperation): PreparedControlPublication;
  getIncompatibilityDetermination(id: string): BoundExistingIncompatibilityDetermination | undefined;
  createFallback(record: SemanticChangeCase, link: BoundExistingFallbackLink, command?: BoundExistingCommand): ImmutablePutResult;
  getSemanticChangeCase(id: string): SemanticChangeCase | undefined;
  getFallbackLink(id: string): BoundExistingFallbackLink | undefined;
}

type OperationEntry = Readonly<{ canonical: string; receipt: BoundExistingOperationReceipt }>;
type BoundControlState = {
  migrations: Map<string, Stored<MigrationBasisRecord>>;
  selections: Map<string, Stored<BoundExistingBasisSelection>>;
  cases: Map<string, BoundExistingReconstructionCase>;
  proofs: Map<string, Stored<BoundExistingMachineProofReceipt>>;
  reviews: Map<string, Stored<HumanReviewDecisionV2>>;
  determinations: Map<string, Stored<BoundExistingIncompatibilityDetermination>>;
  links: Map<string, Stored<BoundExistingFallbackLink>>;
  changeCases: Map<string, Stored<SemanticChangeCase>>;
  operations: Map<string, OperationEntry>;
};

export class InMemoryLifecycleControlStore implements BoundExistingControlStore {
  readonly #scopes = new Map<string, Stored<ChangeScopeSnapshot>>();
  readonly #assessments = new Map<string, Stored<SemanticDeltaAssessment>>();
  readonly #proofs = new Map<string, Stored<MachineProofReceipt>>();
  readonly #reviews = new Map<string, Stored<ReviewDecision>>();
  #bound: BoundControlState = {
    migrations: new Map(), selections: new Map(), cases: new Map(), proofs: new Map(),
    reviews: new Map(), determinations: new Map(), links: new Map(), changeCases: new Map(), operations: new Map()
  };
  #reservation: object | undefined;

  putScope(snapshot: ChangeScopeSnapshot): ImmutablePutResult {
    return putImmutable(this.#scopes, requireId(snapshot.caseId, "caseId"), snapshot, "ChangeScopeSnapshot");
  }

  getScope(caseId: string): ChangeScopeSnapshot | undefined {
    return this.#scopes.get(caseId)?.value;
  }

  putAssessment(assessment: SemanticDeltaAssessment): ImmutablePutResult {
    return putImmutable(
      this.#assessments,
      requireId(assessment.assessmentId, "assessmentId"),
      assessment,
      "SemanticDeltaAssessment"
    );
  }

  getAssessment(assessmentId: string): SemanticDeltaAssessment | undefined {
    return this.#assessments.get(assessmentId)?.value;
  }

  putMachineProof(receipt: MachineProofReceipt): ImmutablePutResult {
    return putImmutable(
      this.#proofs,
      requireId(receipt.receiptId, "receiptId"),
      receipt,
      "MachineProofReceipt"
    );
  }

  getMachineProof(receiptId: string): MachineProofReceipt | undefined {
    return this.#proofs.get(receiptId)?.value;
  }

  putReviewDecision(decision: ReviewDecision): ImmutablePutResult {
    return putImmutable(
      this.#reviews,
      requireId(decision.reviewId, "reviewId"),
      decision,
      "ReviewDecision"
    );
  }

  getReviewDecision(reviewId: string): ReviewDecision | undefined {
    return this.#reviews.get(reviewId)?.value;
  }

  registerMigrationBasis(input: MigrationBasisRecord, command?: BoundExistingCommand): ImmutablePutResult {
    const record = normalizeMigrationBasisRecord(input);
    if (command !== undefined && this.replayOperation(command) !== undefined) return "IDEMPOTENT";
    const draft = this.#draft();
    const result = putImmutable(draft.migrations, refKey(record.migrationBasisRef), record, "MigrationBasisRecord", canonicalBoundJson);
    this.#publish(draft, command, result, record.migrationBasisRef);
    return result;
  }

  getMigrationBasis(ref: ImmutableRevisionRef): MigrationBasisRecord | undefined {
    return this.#bound.migrations.get(refKey(ref))?.value;
  }

  getReconstructionCase(caseId: string): BoundExistingReconstructionCase | undefined {
    return this.#bound.cases.get(caseId);
  }

  getBasisSelection(ref: ImmutableRevisionRef): BoundExistingBasisSelection | undefined {
    return this.#bound.selections.get(refKey(ref))?.value;
  }

  openReconstruction(input: BoundExistingReconstructionCase, proposed: BoundExistingBasisSelection, command?: BoundExistingCommand): ImmutablePutResult {
    const record = normalizeBoundExistingReconstructionCase(input);
    const selection = normalizeBoundExistingBasisSelection(proposed);
    if (command !== undefined && this.replayOperation(command) !== undefined) return "IDEMPOTENT";
    const draft = this.#draft();
    if (draft.cases.has(record.reconstructionCaseId)) throw new Error("CASE_ALREADY_EXISTS");
    if (record.status !== "OPEN" || selection.supersedesBasisSelectionRef !== undefined ||
        record.reconstructionCaseId !== selection.reconstructionCaseId ||
        !equalBasisRef(record.basisSelectionRef, selection.basisSelectionRef)) throw new Error("BASIS_SELECTION_CONFLICT");
    this.#requireMigration(selection);
    putImmutable(draft.selections, refKey(selection.basisSelectionRef), selection, "BoundExistingBasisSelection", canonicalBoundJson);
    draft.cases.set(record.reconstructionCaseId, record);
    this.#publish(draft, command, "CREATED", selection.basisSelectionRef);
    return "CREATED";
  }

  reselectBasis(proposed: BoundExistingBasisSelection, expected: ImmutableRevisionRef, command?: BoundExistingCommand): "CREATED" | "NOOP" {
    const selection = normalizeBoundExistingBasisSelection(proposed);
    const replay = command === undefined ? undefined : this.replayOperation(command);
    if (replay !== undefined) return replay.status === "NOOP" ? "NOOP" : "CREATED";
    const draft = this.#draft();
    const record = this.#requireOpen({ reconstructionCaseId: selection.reconstructionCaseId, basisSelectionRef: expected });
    this.#requireMigration(selection);
    const prior = this.getBasisSelection(record.basisSelectionRef)!;
    if (canonicalBoundJson(prior.protocolBasis) === canonicalBoundJson(selection.protocolBasis) &&
        equalBasisRef(prior.migrationBasisRef, selection.migrationBasisRef)) {
      this.#publish(draft, command, "NOOP", record.basisSelectionRef);
      return "NOOP";
    }
    if (selection.supersedesBasisSelectionRef === undefined || !equalBasisRef(selection.supersedesBasisSelectionRef, record.basisSelectionRef)) {
      throw new Error("BASIS_SELECTION_CONFLICT");
    }
    // Never reuse an occurrence, even if its historical basis values match.
    if (draft.selections.has(refKey(selection.basisSelectionRef))) throw new Error("IMMUTABLE_RECORD_CONFLICT:BoundExistingBasisSelection");
    putImmutable(draft.selections, refKey(selection.basisSelectionRef), selection, "BoundExistingBasisSelection", canonicalBoundJson);
    draft.cases.set(record.reconstructionCaseId, normalizeBoundExistingReconstructionCase({ ...record, basisSelectionRef: selection.basisSelectionRef }));
    this.#publish(draft, command, "CREATED", selection.basisSelectionRef);
    return "CREATED";
  }

  getOperationReceipt(operationId: string): BoundExistingOperationReceipt | undefined {
    return this.#bound.operations.get(operationId)?.receipt;
  }

  replayOperation(input: BoundExistingCommand): BoundExistingOperationReceipt | undefined {
    const command = normalizeControlCommand(input);
    const entry = this.#bound.operations.get(command.operationId);
    if (entry === undefined) return undefined;
    if (entry.canonical !== canonicalBoundJson(command)) throw new Error("OPERATION_ID_CONFLICT");
    return entry.receipt;
  }

  prepareOperation(operation: ControlOperation, lineage: SelectionLineage): PreparedControlPublication {
    const draft = this.#draft();
    this.#putOperation(draft, operation);
    this.#requireOpen(lineage);
    return this.#reserve(draft);
  }

  prepareTerminalTransition(input: BoundExistingReconstructionCase, expected: ImmutableRevisionRef, operation?: ControlOperation): PreparedControlPublication {
    const record = normalizeBoundExistingReconstructionCase(input);
    const draft = this.#draft();
    if (operation !== undefined) this.#putOperation(draft, operation);
    const prior = this.#requireOpen({ reconstructionCaseId: record.reconstructionCaseId, basisSelectionRef: expected });
    if (record.status === "OPEN" || record.status === "INCOMPATIBLE" || !equalBasisRef(record.basisSelectionRef, prior.basisSelectionRef)) {
      throw new Error("INVALID_TERMINAL_TRANSITION");
    }
    draft.cases.set(record.reconstructionCaseId, record);
    return this.#reserve(draft);
  }

  putBoundExistingMachineProof(input: BoundExistingMachineProofReceipt, command?: BoundExistingCommand): ImmutablePutResult {
    const record = normalizeBoundExistingMachineProofReceipt(input);
    if (command !== undefined && this.replayOperation(command) !== undefined) return "IDEMPOTENT";
    const draft = this.#draft();
    const result = putImmutable(draft.proofs, record.receiptId, record, "BoundExistingMachineProofReceipt", canonicalBoundJson);
    if (result === "CREATED") {
      this.#requireOpen(record);
      for (const entry of this.#bound.proofs.values()) {
        if (sameDecisionLineage(entry.value, record)) throw new Error("PROOF_ALREADY_DECIDED");
      }
    }
    this.#publish(draft, command, result);
    return result;
  }

  getBoundExistingMachineProof(id: string): BoundExistingMachineProofReceipt | undefined {
    return this.#bound.proofs.get(id)?.value;
  }

  putHumanReviewDecisionV2(input: HumanReviewDecisionV2, command?: BoundExistingCommand): ImmutablePutResult {
    const record = normalizeHumanReviewDecisionV2(input);
    if (command !== undefined && this.replayOperation(command) !== undefined) return "IDEMPOTENT";
    const draft = this.#draft();
    const result = putImmutable(draft.reviews, record.reviewId, record, "HumanReviewDecisionV2", canonicalBoundJson);
    if (result === "CREATED" && record.provenance.route === "BOUND_EXISTING") {
      this.#requireOpen(record.provenance);
      for (const entry of this.#bound.reviews.values()) {
        const prior = entry.value;
        if (prior.provenance.route === "BOUND_EXISTING" && prior.reviewKind === record.reviewKind &&
            sameDecisionLineage({ ...prior.provenance, candidateRef: prior.candidateRef }, { ...record.provenance, candidateRef: record.candidateRef })) {
          throw new Error("REVIEW_ALREADY_DECIDED");
        }
      }
    }
    this.#publish(draft, command, result);
    return result;
  }

  getHumanReviewDecisionV2(id: string): HumanReviewDecisionV2 | undefined {
    return this.#bound.reviews.get(id)?.value;
  }

  prepareIncompatibility(input: BoundExistingIncompatibilityDetermination, operation?: ControlOperation): PreparedControlPublication {
    const record = normalizeBoundExistingIncompatibilityDetermination(input);
    const draft = this.#draft();
    if (operation !== undefined) this.#putOperation(draft, operation);
    const prior = this.#requireOpen(record);
    if (record.evidenceRefs.length === 0) throw new Error("INCOMPATIBILITY_EVIDENCE_REQUIRED");
    putImmutable(draft.determinations, record.determinationId, record, "BoundExistingIncompatibilityDetermination", canonicalBoundJson);
    draft.cases.set(record.reconstructionCaseId, normalizeBoundExistingReconstructionCase({
      ...prior, status: "INCOMPATIBLE", incompatibilityDeterminationId: record.determinationId
    }));
    return this.#reserve(draft);
  }

  getIncompatibilityDetermination(id: string): BoundExistingIncompatibilityDetermination | undefined {
    return this.#bound.determinations.get(id)?.value;
  }

  createFallback(input: SemanticChangeCase, proposed: BoundExistingFallbackLink, command?: BoundExistingCommand): ImmutablePutResult {
    const record = normalizeChangeCase(input);
    const link = normalizeBoundExistingFallbackLink(proposed);
    if (command !== undefined && this.replayOperation(command) !== undefined) return "IDEMPOTENT";
    const draft = this.#draft();
    const source = draft.cases.get(link.reconstructionCaseId);
    if (source?.status !== "INCOMPATIBLE" || source.incompatibilityDeterminationId !== link.incompatibilityDeterminationId ||
        record.caseId !== link.semanticChangeCaseId) throw new Error("INVALID_FALLBACK_LINEAGE");
    const result = putImmutable(draft.links, link.linkId, link, "BoundExistingFallbackLink", canonicalBoundJson);
    for (const entry of this.#bound.links.values()) {
      if (entry.value.incompatibilityDeterminationId === link.incompatibilityDeterminationId && entry.value.linkId !== link.linkId) {
        throw new Error("FALLBACK_ALREADY_EXISTS");
      }
    }
    if (result === "CREATED" && (draft.changeCases.has(record.caseId) || this.#scopes.has(record.caseId) || draft.cases.has(record.caseId))) {
      throw new Error("CASE_ALREADY_EXISTS");
    }
    putImmutable(draft.changeCases, record.caseId, record, "SemanticChangeCase", canonicalBoundJson);
    this.#publish(draft, command, result);
    return result;
  }

  getSemanticChangeCase(id: string): SemanticChangeCase | undefined {
    return this.#bound.changeCases.get(id)?.value;
  }

  getFallbackLink(id: string): BoundExistingFallbackLink | undefined {
    return this.#bound.links.get(id)?.value;
  }

  #requireMigration(selection: BoundExistingBasisSelection): void {
    if (this.getMigrationBasis(selection.migrationBasisRef) === undefined) throw new Error("MIGRATION_BASIS_NOT_FOUND");
  }

  #requireOpen(input: SelectionLineage): BoundExistingReconstructionCase {
    const lineage = strictJson(input) as SelectionLineage;
    const record = this.#bound.cases.get(requireId(lineage.reconstructionCaseId, "reconstructionCaseId"));
    if (record?.status !== "OPEN") throw new Error("CASE_NOT_OPEN");
    if (refKey(record.basisSelectionRef) !== refKey(lineage.basisSelectionRef)) throw new Error("BASIS_SELECTION_CONFLICT");
    return record;
  }

  #draft(): BoundControlState {
    if (this.#reservation !== undefined) throw new Error("CONTROL_PUBLICATION_RESERVED");
    const state = this.#bound;
    return {
      migrations: new Map(state.migrations), selections: new Map(state.selections), cases: new Map(state.cases),
      proofs: new Map(state.proofs), reviews: new Map(state.reviews), determinations: new Map(state.determinations),
      links: new Map(state.links), changeCases: new Map(state.changeCases), operations: new Map(state.operations)
    };
  }

  #putOperation(draft: BoundControlState, input: ControlOperation): void {
    const operation = strictJson(input) as ControlOperation;
    exactKeys(operation, ["command", "receipt"]);
    const command = normalizeControlCommand(operation.command);
    const receipt = normalizeOperationReceipt(operation.receipt, command);
    const canonical = canonicalBoundJson(command);
    const prior = draft.operations.get(command.operationId);
    if (prior !== undefined && (prior.canonical !== canonical || canonicalBoundJson(prior.receipt) !== canonicalBoundJson(receipt))) {
      throw new Error("OPERATION_ID_CONFLICT");
    }
    draft.operations.set(command.operationId, Object.freeze({ canonical, receipt }));
  }

  #publish(draft: BoundControlState, command: BoundExistingCommand | undefined, status: BoundExistingOperationReceipt["status"], resultRef?: ImmutableRevisionRef): void {
    if (command !== undefined) this.#putOperation(draft, { command, receipt: {
      schemaVersion: 2, route: "BOUND_EXISTING", operationId: command.operationId, operationKind: command.operationKind,
      status, ...(resultRef === undefined ? {} : { resultRef })
    } });
    this.#bound = draft;
  }

  #reserve(draft: BoundControlState): PreparedControlPublication {
    const token = {};
    this.#reservation = token;
    let active = true;
    return Object.freeze({
      commit: (): void => {
        if (!active) return;
        this.#bound = draft;
        this.#reservation = undefined;
        active = false;
      },
      abort: (): void => {
        if (!active) return;
        this.#reservation = undefined;
        active = false;
      }
    });
  }
}

const operationKinds = new Set([
  "REGISTER_MIGRATION_BASIS", "OPEN_BOUND_EXISTING_RECONSTRUCTION", "RESELECT_BOUND_EXISTING_BASIS",
  "CREATE_BOUND_EXISTING_CANDIDATE", "REVISE_BOUND_EXISTING_CANDIDATE", "RECORD_BOUND_EXISTING_MACHINE_PROOF",
  "RECORD_BOUND_EXISTING_HUMAN_REVIEW", "CANCEL_BOUND_EXISTING_RECONSTRUCTION", "DECLARE_BOUND_EXISTING_INCOMPATIBLE",
  "CREATE_SEMANTIC_CHANGE_FALLBACK", "COMMIT_BOUND_EXISTING_AUTHORITY", "SUPERSEDE_BOUND_EXISTING_AUTHORITY"
]);

export function normalizeControlCommand(input: BoundExistingCommand): BoundExistingCommand {
  const value = strictJson(input) as BoundExistingCommand;
  exactKeys(value, ["operationVersion", "operationId", "operationKind", "payload"]);
  if (value.operationVersion !== 1 || !operationKinds.has(value.operationKind)) throw new Error("INVALID_OPERATION");
  requireId(value.operationId, "operationId");
  return value;
}

function normalizeOperationReceipt(input: BoundExistingOperationReceipt, command: BoundExistingCommand): BoundExistingOperationReceipt {
  const record = strictJson(input) as BoundExistingOperationReceipt;
  exactKeys(record, ["schemaVersion", "route", "operationId", "operationKind", "status"], ["resultRef"]);
  if (record.schemaVersion !== 2 || record.route !== "BOUND_EXISTING" || record.operationId !== command.operationId ||
      record.operationKind !== command.operationKind || !["CREATED", "NOOP", "IDEMPOTENT"].includes(record.status)) {
    throw new Error("INVALID_OPERATION_RECEIPT");
  }
  if (record.resultRef !== undefined) basisRefFrom(record.resultRef);
  return record;
}

function sameDecisionLineage(left: SelectionLineage & { candidateRef: ImmutableRevisionRef }, right: SelectionLineage & { candidateRef: ImmutableRevisionRef }): boolean {
  return left.reconstructionCaseId === right.reconstructionCaseId && equalBasisRef(left.basisSelectionRef, right.basisSelectionRef) &&
    equalBasisRef(left.candidateRef, right.candidateRef);
}

function refKey(ref: ImmutableRevisionRef): string {
  const value = strictJson(ref);
  exactKeys(value, ["refType", "namespace", "subject", "revision"], ["digest"]);
  return basisRefKey(basisRefFrom(value));
}

function normalizeChangeCase(input: SemanticChangeCase): SemanticChangeCase {
  const record = strictJson(input) as SemanticChangeCase;
  exactKeys(record, ["caseId", "scopeSnapshot", "classificationBasisRef"]);
  requireId(record.caseId, "caseId");
  exactKeys(record.scopeSnapshot, ["caseId", "scopeRef", "observations"]);
  if (record.scopeSnapshot.caseId !== record.caseId || !Array.isArray(record.scopeSnapshot.observations)) throw new Error("INVALID_CHANGE_CASE");
  basisRefFrom(record.scopeSnapshot.scopeRef);
  basisRefFrom(record.classificationBasisRef);
  for (const observation of record.scopeSnapshot.observations) {
    exactKeys(observation, ["dimension", "state", "evidenceRefs"]);
    requireId(observation.dimension, "dimension");
    if (!["CHANGED", "UNCHANGED", "UNKNOWN"].includes(observation.state)) throw new Error("INVALID_CHANGE_CASE");
    if (!Array.isArray(observation.evidenceRefs)) throw new Error("INVALID_CHANGE_CASE");
    for (const evidence of observation.evidenceRefs) {
      exactKeys(evidence, ["refType", "id"], ["digest"]);
      if (evidence.refType !== "EVIDENCE") throw new Error("INVALID_CHANGE_CASE");
      requireId(evidence.id, "evidenceId");
      if (evidence.digest !== undefined) requireId(evidence.digest, "digest");
    }
  }
  return record;
}

function exactKeys(value: unknown, required: readonly string[], optional: readonly string[] = []): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("INVALID_OPERATION");
  const keys = Object.keys(value);
  if (required.some((key) => !keys.includes(key)) || keys.some((key) => !required.includes(key) && !optional.includes(key))) {
    throw new Error("INVALID_OPERATION");
  }
}

/** Canonical command values must be lossless JSON; no getters, cycles or silent omission. */
function strictJson(value: unknown, active = new Set<object>()): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value;
  if (typeof value !== "object" || active.has(value)) throw new Error("INVALID_OPERATION");
  active.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) throw new Error("INVALID_OPERATION");
      const entries: unknown[] = [];
      for (let index = 0; index < value.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor?.enumerable || !("value" in descriptor)) throw new Error("INVALID_OPERATION");
        entries.push(strictJson(descriptor.value, active));
      }
      return Object.freeze(entries);
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error("INVALID_OPERATION");
    const entries: [string, unknown][] = [];
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (typeof key !== "string" || !descriptor.enumerable || !("value" in descriptor)) throw new Error("INVALID_OPERATION");
      entries.push([key, strictJson(descriptor.value, active)]);
    }
    return Object.freeze(Object.fromEntries(entries));
  } finally {
    active.delete(value);
  }
}

function putImmutable<T>(
  target: Map<string, Stored<T>>,
  id: string,
  value: T,
  recordType: string,
  canonicalize: (value: unknown) => string = canonicalJson
): ImmutablePutResult {
  const frozen = deepFreeze(cloneJson(value));
  const canonical = canonicalize(frozen);
  const existing = target.get(id);
  if (existing === undefined) {
    target.set(id, Object.freeze({ canonical, value: frozen }));
    return "CREATED";
  }
  if (existing.canonical === canonical) return "IDEMPOTENT";
  throw new Error(`IMMUTABLE_RECORD_CONFLICT:${recordType}:${id}`);
}

function requireId(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`INVALID_CONTROL_ID:${field}`);
  }
  return value;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(",")}}`;
}

// New command/record identities use ordinal keys; keep historical v1 encoding untouched.
function canonicalBoundJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalBoundJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalBoundJson(record[key])}`).join(",")}}`;
}

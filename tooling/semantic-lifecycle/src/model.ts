export type SemanticDeltaDisposition =
  | "SEMANTIC_DELTA"
  | "NO_SEMANTIC_DELTA"
  | "UNRESOLVED";

export type SemanticDeltaDimension =
  | "RESOURCE_EXISTENCE"
  | "RESOURCE_IDENTITY"
  | "LIFETIME"
  | "STATE_OWNERSHIP"
  | "FIELD_MEANING"
  | "DEFAULT_EMPTY_SEMANTICS"
  | "READ_WRITE_SEMANTICS"
  | "DERIVED_STATE"
  | "OPERATION_SEMANTICS"
  | "OPERATION_KIND_MODE"
  | "LIFECYCLE_SEMANTICS"
  | "OPERATION_LEGALITY"
  | "INVARIANTS"
  | "COMPATIBILITY_MEANING"
  | "SEMANTIC_PROTOCOL_BINDING";

export interface EvidenceRef {
  readonly refType: "EVIDENCE";
  readonly id: string;
  readonly digest?: string;
}

export interface SemanticDeltaObservation {
  readonly dimension: SemanticDeltaDimension;
  readonly state: "CHANGED" | "UNCHANGED" | "UNKNOWN";
  readonly evidenceRefs: readonly EvidenceRef[];
}

export interface ImmutableRevisionRef {
  readonly refType: "IMMUTABLE_REVISION";
  readonly namespace: string;
  readonly subject: string;
  readonly revision: string;
  readonly digest?: string;
}

export type BasisRef = ImmutableRevisionRef;

export interface ChangeScopeSnapshot {
  readonly caseId: string;
  readonly scopeRef: ImmutableRevisionRef;
  readonly observations: readonly SemanticDeltaObservation[];
}

export interface SemanticDeltaAssessment {
  readonly assessmentId: string;
  readonly caseId: string;
  readonly scopeRef: ImmutableRevisionRef;
  readonly classificationBasisRef: BasisRef;
  readonly disposition: SemanticDeltaDisposition;
  readonly evaluatedDimensions: readonly SemanticDeltaDimension[];
  readonly evidenceRefs: readonly EvidenceRef[];
}

export interface MachineProofReceipt {
  readonly receiptId: string;
  readonly proofContractVersion: string;
  readonly engine: Readonly<{ name: string; version: string }>;
  readonly scopeRef: ImmutableRevisionRef;
  readonly classificationBasisRef: BasisRef;
  readonly ruleIds: readonly string[];
  readonly disposition: SemanticDeltaDisposition;
  readonly inputDigest: string;
  readonly diagnostics: readonly string[];
  readonly evidenceRefs: readonly EvidenceRef[];
}

export type CanonicalJsonPrimitive = string | number | boolean | null;

export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | readonly CanonicalJsonValue[]
  | Readonly<{ [key: string]: CanonicalJsonValue }>;

export type SemanticCandidatePayload = Readonly<{
  [key: string]: CanonicalJsonValue;
}>;

export interface SemanticCandidate {
  readonly candidateId: string;
  readonly caseId: string;
  readonly candidateRef: ImmutableRevisionRef;
  readonly supersedesCandidateRef?: ImmutableRevisionRef;
  readonly assessmentId: string;
  readonly scopeRef: ImmutableRevisionRef;
  readonly classificationBasisRef: BasisRef;
  readonly payload: SemanticCandidatePayload;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export type HumanReviewVerdict = "PASS" | "REJECT";

export interface ReviewDecision {
  readonly reviewId: string;
  readonly reviewKind: "SEMANTIC_CANDIDATE";
  readonly decisionSource: "HUMAN";
  readonly verdict: HumanReviewVerdict;
  readonly candidateRef: ImmutableRevisionRef;
  readonly scopeRef: ImmutableRevisionRef;
  readonly classificationBasisRef: BasisRef;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export type SemanticAuthorityKey = string;

export interface CanonicalSemanticSourceBinding {
  readonly path: string;
  readonly payloadDigest: string;
}

export interface SemanticAuthorityRecord {
  readonly authorityKey: SemanticAuthorityKey;
  readonly authorityRef: ImmutableRevisionRef;
  readonly operationId: string;
  readonly caseId: string;
  readonly assessmentId: string;
  readonly candidateRef: ImmutableRevisionRef;
  readonly reviewId: string;
  readonly scopeRef: ImmutableRevisionRef;
  readonly classificationBasisRef: BasisRef;
  readonly sourceBinding: CanonicalSemanticSourceBinding;
  readonly supersedesAuthorityRef?: ImmutableRevisionRef;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export interface SemanticChangeCase {
  readonly caseId: string;
  readonly scopeSnapshot: ChangeScopeSnapshot;
  readonly classificationBasisRef: BasisRef;
}

export type SemanticFirstCaseStatus =
  | "OPEN"
  | "CANCELLED"
  | "AUTHORITY_ACCEPTED";

export interface SemanticAuthorityProjectionBasis {
  readonly authorityKey: SemanticAuthorityKey;
  readonly authorityRef: ImmutableRevisionRef;
  readonly sourceBinding: CanonicalSemanticSourceBinding;
}

/** Route discriminator for additive v2 records. Historical v1 records have no route field. */
export type SemanticLifecycleRoute = "SEMANTIC_FIRST" | "BOUND_EXISTING";

/** Immutable record identifying the migration evidence used by BOUND_EXISTING. */
export interface MigrationBasisRecord {
  readonly migrationBasisRef: ImmutableRevisionRef;
  readonly migrationBasisId: string;
  readonly payloadDigest: string;
}

/** Immutable snapshot of the adopted Protocol basis observed by a route operation. */
export interface AdoptedProtocolBasis {
  readonly protocolBasisRef: ImmutableRevisionRef;
  readonly protocolBasisId: string;
  readonly payloadDigest: string;
}

/** Immutable selection occurrence binding one MigrationBasis to one adopted Protocol basis. */
export interface BoundExistingBasisSelection {
  readonly basisSelectionRef: ImmutableRevisionRef;
  readonly reconstructionCaseId: string;
  readonly occurrence: number;
  readonly migrationBasisRef: ImmutableRevisionRef;
  readonly protocolBasis: AdoptedProtocolBasis;
}

export type BoundExistingCaseStatus =
  | "OPEN"
  | "CANCELLED"
  | "INCOMPATIBLE"
  | "AUTHORITY_ACCEPTED";

export interface BoundExistingReconstructionCase {
  readonly schemaVersion: 2;
  readonly route: "BOUND_EXISTING";
  readonly reconstructionCaseId: string;
  readonly caseId: string;
  readonly status: BoundExistingCaseStatus;
  readonly migrationBasisRef: ImmutableRevisionRef;
  readonly selectedProtocolBasis: AdoptedProtocolBasis;
  readonly currentBasisSelectionRef: ImmutableRevisionRef;
  readonly acceptedAuthorityRef?: ImmutableRevisionRef;
}

export interface SemanticFirstCandidateProvenanceV2 {
  readonly route: "SEMANTIC_FIRST";
  readonly assessmentId: string;
  readonly scopeRef: ImmutableRevisionRef;
  readonly classificationBasisRef: BasisRef;
}

export interface BoundExistingCandidateProvenanceV2 {
  readonly route: "BOUND_EXISTING";
  readonly reconstructionCaseId: string;
  readonly basisSelectionRef: ImmutableRevisionRef;
}

export type SemanticCandidateRecordV2 = Readonly<{
  readonly schemaVersion: 2;
  readonly candidateId: string;
  readonly caseId: string;
  readonly candidateRef: ImmutableRevisionRef;
  readonly supersedesCandidateRef?: ImmutableRevisionRef;
  readonly payload: SemanticCandidatePayload;
  readonly evidenceRefs: readonly EvidenceRef[];
}> & (SemanticFirstCandidateProvenanceV2 | BoundExistingCandidateProvenanceV2);

export type BoundExistingProofVerdict = "PASS" | "FAIL";

export interface BoundExistingMachineProofReceipt {
  readonly schemaVersion: 2;
  readonly route: "BOUND_EXISTING";
  readonly receiptId: string;
  readonly proofContractVersion: string;
  readonly engine: Readonly<{ name: string; version: string }>;
  readonly reconstructionCaseId: string;
  readonly candidateRef: ImmutableRevisionRef;
  readonly basisSelectionRef: ImmutableRevisionRef;
  readonly migrationBasisRef: ImmutableRevisionRef;
  readonly protocolBasisRef: ImmutableRevisionRef;
  readonly verdict: BoundExistingProofVerdict;
  readonly inputDigest: string;
  readonly diagnostics: readonly string[];
  readonly evidenceRefs: readonly EvidenceRef[];
}

export type HumanReviewKindV2 = "SEMANTIC_CANDIDATE" | "NO_REINTERPRETATION";

export interface SemanticFirstHumanReviewDecisionV2 {
  readonly schemaVersion: 2;
  readonly route: "SEMANTIC_FIRST";
  readonly reviewId: string;
  readonly reviewKind: "SEMANTIC_CANDIDATE";
  readonly decisionSource: "HUMAN";
  readonly verdict: HumanReviewVerdict;
  readonly candidateRef: ImmutableRevisionRef;
  readonly assessmentId: string;
  readonly scopeRef: ImmutableRevisionRef;
  readonly classificationBasisRef: BasisRef;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export interface BoundExistingHumanReviewDecisionV2 {
  readonly schemaVersion: 2;
  readonly route: "BOUND_EXISTING";
  readonly reviewId: string;
  readonly reviewKind: HumanReviewKindV2;
  readonly decisionSource: "HUMAN";
  readonly verdict: HumanReviewVerdict;
  readonly reconstructionCaseId: string;
  readonly candidateRef: ImmutableRevisionRef;
  readonly basisSelectionRef: ImmutableRevisionRef;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export type HumanReviewDecisionV2 =
  | SemanticFirstHumanReviewDecisionV2
  | BoundExistingHumanReviewDecisionV2;

export interface SemanticFirstAuthorityProvenanceV2 {
  readonly route: "SEMANTIC_FIRST";
  readonly caseId: string;
  readonly assessmentId: string;
  readonly candidateRef: ImmutableRevisionRef;
  readonly reviewId: string;
  readonly scopeRef: ImmutableRevisionRef;
  readonly classificationBasisRef: BasisRef;
}

export interface BoundExistingAuthorityProvenanceV2 {
  readonly route: "BOUND_EXISTING";
  readonly reconstructionCaseId: string;
  readonly candidateRef: ImmutableRevisionRef;
  readonly basisSelectionRef: ImmutableRevisionRef;
  readonly machineProofReceiptId: string;
  readonly semanticReviewId: string;
  readonly noReinterpretationReviewId: string;
}

export type SemanticAuthorityRecordV2 = Readonly<{
  readonly schemaVersion: 2;
  readonly authorityKey: SemanticAuthorityKey;
  readonly authorityRef: ImmutableRevisionRef;
  readonly operationId: string;
  readonly sourceBinding: CanonicalSemanticSourceBinding;
  readonly supersedesAuthorityRef?: ImmutableRevisionRef;
  readonly evidenceRefs: readonly EvidenceRef[];
}> & (SemanticFirstAuthorityProvenanceV2 | BoundExistingAuthorityProvenanceV2);

export interface BoundExistingIncompatibilityDetermination {
  readonly schemaVersion: 2;
  readonly route: "BOUND_EXISTING";
  readonly determinationId: string;
  readonly reconstructionCaseId: string;
  readonly basisSelectionRef: ImmutableRevisionRef;
  readonly reasonCode: string;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export interface BoundExistingFallbackLink {
  readonly schemaVersion: 2;
  readonly route: "BOUND_EXISTING";
  readonly linkId: string;
  readonly fromReconstructionCaseId: string;
  readonly toSemanticFirstCaseId: string;
  readonly incompatibilityDeterminationRef: ImmutableRevisionRef;
}

export type OperationReceiptStatus = "CREATED" | "NOOP" | "IDEMPOTENT";

export interface BoundExistingOperationReceipt {
  readonly schemaVersion: 2;
  readonly route: "BOUND_EXISTING";
  readonly operationId: string;
  readonly operationKind: string;
  readonly status: OperationReceiptStatus;
  readonly resultRef?: ImmutableRevisionRef;
}

export function normalizeSemanticCandidateRecordV2(value: unknown): SemanticCandidateRecordV2 {
  const record = asRecord(value);
  requireSchemaAndRoute(record, "candidate");
  requireString(record.candidateId, "candidateId");
  requireString(record.caseId, "caseId");
  if (record.route === "BOUND_EXISTING") {
    requireString(record.reconstructionCaseId, "reconstructionCaseId");
    requireRef(record.basisSelectionRef, "basisSelectionRef");
    if (Object.prototype.hasOwnProperty.call(record, "assessmentId")) throw new Error("BOUND_EXISTING_SYNTHETIC_SEMANTIC_FIRST");
  } else {
    requireString(record.assessmentId, "assessmentId");
    requireRef(record.scopeRef, "scopeRef");
    requireRef(record.classificationBasisRef, "classificationBasisRef");
  }
  requireRef(record.candidateRef, "candidateRef");
  return freezeClone(record) as SemanticCandidateRecordV2;
}

export function normalizeHumanReviewDecisionV2(value: unknown): HumanReviewDecisionV2 {
  const record = asRecord(value);
  requireSchemaAndRoute(record, "review");
  if (record.reviewKind !== "SEMANTIC_CANDIDATE" && record.reviewKind !== "NO_REINTERPRETATION") throw new Error("UNKNOWN_REVIEW_KIND");
  if (record.decisionSource !== "HUMAN") throw new Error("INVALID_REVIEW_SOURCE");
  if (record.route === "BOUND_EXISTING") {
    requireString(record.reconstructionCaseId, "reconstructionCaseId");
    requireRef(record.basisSelectionRef, "basisSelectionRef");
    if (Object.prototype.hasOwnProperty.call(record, "assessmentId")) throw new Error("BOUND_EXISTING_SYNTHETIC_SEMANTIC_FIRST");
  } else {
    requireString(record.assessmentId, "assessmentId");
    requireRef(record.scopeRef, "scopeRef");
    requireRef(record.classificationBasisRef, "classificationBasisRef");
  }
  if (record.verdict !== "PASS" && record.verdict !== "REJECT") throw new Error("INVALID_REVIEW_VERDICT");
  requireRef(record.candidateRef, "candidateRef");
  return freezeClone(record) as HumanReviewDecisionV2;
}

export function normalizeBoundExistingMachineProofReceipt(value: unknown): BoundExistingMachineProofReceipt {
  const record = asRecord(value);
  requireSchemaAndRoute(record, "proof");
  if (record.verdict !== "PASS" && record.verdict !== "FAIL") throw new Error("UNKNOWN_PROOF_VERDICT");
  for (const field of ["receiptId", "proofContractVersion", "reconstructionCaseId", "inputDigest"]) requireString(record[field], field);
  for (const field of ["candidateRef", "basisSelectionRef", "migrationBasisRef", "protocolBasisRef"]) requireRef(record[field], field);
  return freezeClone(record) as BoundExistingMachineProofReceipt;
}

export function normalizeBoundExistingReconstructionCase(value: unknown): BoundExistingReconstructionCase {
  const record = asRecord(value);
  requireSchemaAndRoute(record, "case");
  if (!["OPEN", "CANCELLED", "INCOMPATIBLE", "AUTHORITY_ACCEPTED"].includes(String(record.status))) throw new Error("UNKNOWN_CASE_STATUS");
  requireString(record.reconstructionCaseId, "reconstructionCaseId");
  return freezeClone(record) as BoundExistingReconstructionCase;
}

export function normalizeSemanticAuthorityRecordV2(value: unknown): SemanticAuthorityRecordV2 {
  const record = asRecord(value);
  requireSchemaAndRoute(record, "authority");
  requireString(record.authorityKey, "authorityKey");
  requireString(record.operationId, "operationId");
  requireRef(record.authorityRef, "authorityRef");
  if (record.route === "BOUND_EXISTING") {
    for (const field of ["reconstructionCaseId", "machineProofReceiptId", "semanticReviewId", "noReinterpretationReviewId"]) requireString(record[field], field);
    requireRef(record.basisSelectionRef, "basisSelectionRef");
    if (Object.prototype.hasOwnProperty.call(record, "assessmentId")) throw new Error("BOUND_EXISTING_SYNTHETIC_SEMANTIC_FIRST");
  } else {
    for (const field of ["caseId", "assessmentId", "reviewId"]) requireString(record[field], field);
    requireRef(record.candidateRef, "candidateRef");
  }
  return freezeClone(record) as SemanticAuthorityRecordV2;
}

function asRecord(value: unknown): Record<string, any> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("INVALID_RECORD");
  return value as Record<string, any>;
}

function requireSchemaAndRoute(record: Record<string, any>, kind: string): void {
  if (record.schemaVersion !== 2) throw new Error("UNKNOWN_SCHEMA_VERSION");
  if (record.route !== "SEMANTIC_FIRST" && record.route !== "BOUND_EXISTING") throw new Error("UNKNOWN_ROUTE");
  if (kind === "proof" && record.route !== "BOUND_EXISTING") throw new Error("INVALID_PROOF_ROUTE");
  if (kind === "case" && record.route !== "BOUND_EXISTING") throw new Error("INVALID_CASE_ROUTE");
}

function requireString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`INVALID_RECORD:${field}`);
}

function requireRef(value: unknown, field: string): asserts value is ImmutableRevisionRef {
  const ref = asRecord(value);
  if (ref.refType !== "IMMUTABLE_REVISION") throw new Error(`INVALID_RECORD:${field}`);
  for (const key of ["namespace", "subject", "revision"]) requireString(ref[key], `${field}.${key}`);
}

function freezeClone<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;
  const copy: any = Array.isArray(value) ? [] : {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) copy[key] = freezeClone(child);
  return Object.freeze(copy) as T;
}

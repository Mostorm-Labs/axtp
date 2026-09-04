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

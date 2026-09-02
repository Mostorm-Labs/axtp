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

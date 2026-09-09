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

/** P12 additive canonical records; historical v1 declarations above stay unchanged. */
export type SemanticLifecycleRoute = "SEMANTIC_FIRST" | "BOUND_EXISTING";
export type BoundExistingCaseStatus = "OPEN" | "CANCELLED" | "INCOMPATIBLE" | "AUTHORITY_ACCEPTED";

export type BoundExistingProofVerdict = "PASS" | "FAIL";

export interface AdoptedProtocolBasis {
  readonly protocolAuthorityRef: ImmutableRevisionRef;
  readonly adoptionEvidenceRefs: readonly EvidenceRef[];
}

export type MigrationBasisPayload = Readonly<{
  [key: string]: CanonicalJsonValue;
}>;

export interface MigrationBasisRecord {
  readonly schemaVersion: 1;
  readonly migrationBasisId: string;
  readonly migrationBasisRef: ImmutableRevisionRef;
  readonly payload: MigrationBasisPayload;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export interface BoundExistingBasisSelection {
  readonly schemaVersion: 1;
  readonly reconstructionCaseId: string;
  readonly basisSelectionRef: ImmutableRevisionRef;
  readonly protocolBasis: AdoptedProtocolBasis;
  readonly migrationBasisRef: ImmutableRevisionRef;
  readonly supersedesBasisSelectionRef?: ImmutableRevisionRef;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export type BoundExistingReconstructionCase =
  | {
      readonly schemaVersion: 1;
      readonly reconstructionCaseId: string;
      readonly status: "OPEN";
      readonly basisSelectionRef: ImmutableRevisionRef;
      readonly evidenceRefs: readonly EvidenceRef[];
    }
  | {
      readonly schemaVersion: 1;
      readonly reconstructionCaseId: string;
      readonly status: "CANCELLED";
      readonly basisSelectionRef: ImmutableRevisionRef;
      readonly evidenceRefs: readonly EvidenceRef[];
    }
  | {
      readonly schemaVersion: 1;
      readonly reconstructionCaseId: string;
      readonly status: "INCOMPATIBLE";
      readonly basisSelectionRef: ImmutableRevisionRef;
      readonly incompatibilityDeterminationId: string;
      readonly evidenceRefs: readonly EvidenceRef[];
    }
  | {
      readonly schemaVersion: 1;
      readonly reconstructionCaseId: string;
      readonly status: "AUTHORITY_ACCEPTED";
      readonly basisSelectionRef: ImmutableRevisionRef;
      readonly authorityRef: ImmutableRevisionRef;
      readonly evidenceRefs: readonly EvidenceRef[];
    };

export type SemanticCandidateProvenanceV2 =
  | {
      readonly route: "SEMANTIC_FIRST";
      readonly caseId: string;
      readonly assessmentId: string;
      readonly scopeRef: ImmutableRevisionRef;
      readonly classificationBasisRef: BasisRef;
    }
  | {
      readonly route: "BOUND_EXISTING";
      readonly reconstructionCaseId: string;
      readonly basisSelectionRef: ImmutableRevisionRef;
    };

export interface SemanticCandidateRecordV2 {
  readonly schemaVersion: 2;
  readonly candidateId: string;
  readonly candidateRef: ImmutableRevisionRef;
  readonly supersedesCandidateRef?: ImmutableRevisionRef;
  readonly provenance: SemanticCandidateProvenanceV2;
  readonly payload: SemanticCandidatePayload;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export interface BoundExistingMachineProofReceipt {
  readonly schemaVersion: 1;
  readonly receiptId: string;
  readonly proofKind: "BOUND_EXISTING_RECONSTRUCTION";
  readonly proofContractVersion: string;
  readonly engine: Readonly<{ name: string; version: string }>;
  readonly reconstructionCaseId: string;
  readonly candidateRef: ImmutableRevisionRef;
  readonly basisSelectionRef: ImmutableRevisionRef;
  readonly verdict: BoundExistingProofVerdict;
  readonly inputDigest: string;
  readonly ruleIds: readonly string[];
  readonly diagnostics: readonly string[];
  readonly evidenceRefs: readonly EvidenceRef[];
}

export type HumanReviewProvenanceV2 =
  | {
      readonly route: "SEMANTIC_FIRST";
      readonly scopeRef: ImmutableRevisionRef;
      readonly classificationBasisRef: BasisRef;
    }
  | {
      readonly route: "BOUND_EXISTING";
      readonly reconstructionCaseId: string;
      readonly basisSelectionRef: ImmutableRevisionRef;
    };

export type HumanReviewDecisionV2 =
  | {
      readonly schemaVersion: 2;
      readonly reviewId: string;
      readonly reviewKind: "SEMANTIC_CANDIDATE";
      readonly decisionSource: "HUMAN";
      readonly verdict: HumanReviewVerdict;
      readonly candidateRef: ImmutableRevisionRef;
      readonly provenance: HumanReviewProvenanceV2;
      readonly evidenceRefs: readonly EvidenceRef[];
    }
  | {
      readonly schemaVersion: 2;
      readonly reviewId: string;
      readonly reviewKind: "NO_REINTERPRETATION";
      readonly decisionSource: "HUMAN";
      readonly verdict: HumanReviewVerdict;
      readonly candidateRef: ImmutableRevisionRef;
      readonly provenance: {
        readonly route: "BOUND_EXISTING";
        readonly reconstructionCaseId: string;
        readonly basisSelectionRef: ImmutableRevisionRef;
      };
      readonly evidenceRefs: readonly EvidenceRef[];
    };

export interface BoundExistingIncompatibilityDetermination {
  readonly schemaVersion: 1;
  readonly determinationId: string;
  readonly reconstructionCaseId: string;
  readonly basisSelectionRef: ImmutableRevisionRef;
  readonly candidateRef?: ImmutableRevisionRef;
  readonly outcome: "SEMANTIC_CHANGE_REQUIRED";
  readonly evidenceRefs: readonly EvidenceRef[];
}

export interface BoundExistingFallbackLink {
  readonly schemaVersion: 1;
  readonly linkId: string;
  readonly reconstructionCaseId: string;
  readonly incompatibilityDeterminationId: string;
  readonly semanticChangeCaseId: string;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export type SemanticAuthorityProvenanceV2 =
  | {
      readonly route: "SEMANTIC_FIRST";
      readonly caseId: string;
      readonly assessmentId: string;
      readonly candidateRef: ImmutableRevisionRef;
      readonly reviewId: string;
      readonly scopeRef: ImmutableRevisionRef;
      readonly classificationBasisRef: BasisRef;
    }
  | {
      readonly route: "BOUND_EXISTING";
      readonly reconstructionCaseId: string;
      readonly basisSelectionRef: ImmutableRevisionRef;
      readonly candidateRef: ImmutableRevisionRef;
      readonly machineProofReceiptId: string;
      readonly semanticReviewId: string;
      readonly noReinterpretationReviewId: string;
    };

export interface SemanticAuthorityRecordV2 {
  readonly schemaVersion: 2;
  readonly authorityKey: SemanticAuthorityKey;
  readonly authorityRef: ImmutableRevisionRef;
  readonly operationId: string;
  readonly provenance: SemanticAuthorityProvenanceV2;
  readonly sourceBinding: CanonicalSemanticSourceBinding;
  readonly supersedesAuthorityRef?: ImmutableRevisionRef;
  readonly evidenceRefs: readonly EvidenceRef[];
}

/** Compatibility aliases for the additive route-specific type names. */
export type SemanticFirstCandidateProvenanceV2 = Extract<SemanticCandidateProvenanceV2, { route: "SEMANTIC_FIRST" }>;
export type BoundExistingCandidateProvenanceV2 = Extract<SemanticCandidateProvenanceV2, { route: "BOUND_EXISTING" }>;
export type SemanticFirstAuthorityProvenanceV2 = Extract<SemanticAuthorityProvenanceV2, { route: "SEMANTIC_FIRST" }>;
export type BoundExistingAuthorityProvenanceV2 = Extract<SemanticAuthorityProvenanceV2, { route: "BOUND_EXISTING" }>;
export type HumanReviewKindV2 = HumanReviewDecisionV2["reviewKind"];
export type SemanticFirstHumanReviewDecisionV2 = Extract<HumanReviewDecisionV2, { reviewKind: "SEMANTIC_CANDIDATE" }> &
  { readonly provenance: Extract<HumanReviewProvenanceV2, { route: "SEMANTIC_FIRST" }> };
export type BoundExistingHumanReviewDecisionV2 = HumanReviewDecisionV2 &
  { readonly provenance: Extract<HumanReviewProvenanceV2, { route: "BOUND_EXISTING" }> };

export type OperationReceiptStatus = "CREATED" | "NOOP" | "IDEMPOTENT";

export interface BoundExistingOperationReceipt {
  readonly schemaVersion: 2;
  readonly route: "BOUND_EXISTING";
  readonly operationId: string;
  readonly operationKind: string;
  readonly status: OperationReceiptStatus;
  readonly resultRef?: ImmutableRevisionRef;
}

/** P12 SEM-LC-06 additive Protocol-adoption records. */
export type ProtocolAdoptionCaseStatus = "OPEN" | "CANCELLED" | "PROTOCOL_ADOPTED";
export type ProtocolAdoptionRoute = "NO_DELTA" | "SEMANTIC_DELTA";
export type ProspectiveProtocolBasisRef = ImmutableRevisionRef;
export type ProjectionMachineProofVerdict = "PASS" | "FAIL";
export type ProjectionReviewVerdict = "PASS" | "REJECT";

export type ProtocolAdoptionSelectionV1 =
  | {
      readonly schemaVersion: 1;
      readonly protocolAdoptionCaseId: string;
      readonly selectionRef: ImmutableRevisionRef;
      readonly route: "NO_DELTA";
      readonly assessmentId: string;
      readonly scopeRef: ImmutableRevisionRef;
      readonly classificationBasisRef: BasisRef;
      readonly prospectiveProtocolBasisRef: ProspectiveProtocolBasisRef;
      readonly supersedesSelectionRef?: ImmutableRevisionRef;
      readonly evidenceRefs: readonly EvidenceRef[];
    }
  | {
      readonly schemaVersion: 1;
      readonly protocolAdoptionCaseId: string;
      readonly selectionRef: ImmutableRevisionRef;
      readonly route: "SEMANTIC_DELTA";
      readonly assessmentId: string;
      readonly scopeRef: ImmutableRevisionRef;
      readonly classificationBasisRef: BasisRef;
      readonly semanticAuthorityRef: ImmutableRevisionRef;
      readonly prospectiveProtocolBasisRef: ProspectiveProtocolBasisRef;
      readonly protocolProjectionRef?: ImmutableRevisionRef;
      readonly supersedesSelectionRef?: ImmutableRevisionRef;
      readonly evidenceRefs: readonly EvidenceRef[];
    };

export type ProtocolAdoptionCaseRecordV1 =
  | { readonly schemaVersion: 1; readonly protocolAdoptionCaseId: string; readonly status: "OPEN"; readonly workingSelectionRef: ImmutableRevisionRef; readonly evidenceRefs: readonly EvidenceRef[] }
  | { readonly schemaVersion: 1; readonly protocolAdoptionCaseId: string; readonly status: "CANCELLED"; readonly finalSelectionRef: ImmutableRevisionRef; readonly evidenceRefs: readonly EvidenceRef[] }
  | { readonly schemaVersion: 1; readonly protocolAdoptionCaseId: string; readonly status: "PROTOCOL_ADOPTED"; readonly finalSelectionRef: ImmutableRevisionRef; readonly adoptionOccurrenceRef: ImmutableRevisionRef; readonly evidenceRefs: readonly EvidenceRef[] };

export interface ProtocolProjectionRecordV1 {
  readonly schemaVersion: 1;
  readonly projectionId: string;
  readonly projectionRef: ImmutableRevisionRef;
  readonly protocolAdoptionCaseId: string;
  readonly assessmentId: string;
  readonly scopeRef: ImmutableRevisionRef;
  readonly classificationBasisRef: BasisRef;
  readonly semanticAuthorityRef: ImmutableRevisionRef;
  readonly prospectiveProtocolBasisRef: ProspectiveProtocolBasisRef;
  readonly supersedesProjectionRef?: ImmutableRevisionRef;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export interface ProjectionMachineProofReceiptV1 {
  readonly schemaVersion: 1;
  readonly receiptId: string;
  readonly proofKind: "PROTOCOL_PROJECTION";
  readonly proofContractVersion: string;
  readonly engine: Readonly<{ name: string; version: string }>;
  readonly protocolAdoptionCaseId: string;
  readonly selectionRef: ImmutableRevisionRef;
  readonly projectionRef: ImmutableRevisionRef;
  readonly semanticAuthorityRef: ImmutableRevisionRef;
  readonly prospectiveProtocolBasisRef: ProspectiveProtocolBasisRef;
  readonly verdict: ProjectionMachineProofVerdict;
  readonly inputDigest: string;
  readonly ruleIds: readonly string[];
  readonly diagnostics: readonly string[];
  readonly evidenceRefs: readonly EvidenceRef[];
}

export interface ProjectionReviewDecisionV1 {
  readonly schemaVersion: 1;
  readonly reviewId: string;
  readonly reviewKind: "PROTOCOL_PROJECTION";
  readonly decisionSource: "HUMAN";
  readonly verdict: ProjectionReviewVerdict;
  readonly protocolAdoptionCaseId: string;
  readonly selectionRef: ImmutableRevisionRef;
  readonly projectionRef: ImmutableRevisionRef;
  readonly semanticAuthorityRef: ImmutableRevisionRef;
  readonly prospectiveProtocolBasisRef: ProspectiveProtocolBasisRef;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export type ProtocolAdoptionOccurrenceRecordV1 =
  | {
      readonly schemaVersion: 1;
      readonly occurrenceId: string;
      readonly occurrenceRef: ImmutableRevisionRef;
      readonly protocolAdoptionCaseId: string;
      readonly route: "NO_DELTA";
      readonly selectionRef: ImmutableRevisionRef;
      readonly assessmentId: string;
      readonly scopeRef: ImmutableRevisionRef;
      readonly classificationBasisRef: BasisRef;
      readonly prospectiveProtocolBasisRef: ProspectiveProtocolBasisRef;
      readonly resultingProtocolAuthorityRef: ImmutableRevisionRef;
      readonly evidenceRefs: readonly EvidenceRef[];
    }
  | {
      readonly schemaVersion: 1;
      readonly occurrenceId: string;
      readonly occurrenceRef: ImmutableRevisionRef;
      readonly protocolAdoptionCaseId: string;
      readonly route: "SEMANTIC_DELTA";
      readonly selectionRef: ImmutableRevisionRef;
      readonly assessmentId: string;
      readonly scopeRef: ImmutableRevisionRef;
      readonly classificationBasisRef: BasisRef;
      readonly semanticAuthorityRef: ImmutableRevisionRef;
      readonly prospectiveProtocolBasisRef: ProspectiveProtocolBasisRef;
      readonly projectionRef: ImmutableRevisionRef;
      readonly machineProofReceiptId: string;
      readonly projectionReviewId: string;
      readonly resultingProtocolAuthorityRef: ImmutableRevisionRef;
      readonly evidenceRefs: readonly EvidenceRef[];
    };

export type ProtocolAdoptionOperationKind =
  | "OPEN_PROTOCOL_ADOPTION_CASE"
  | "RESELECT_PROTOCOL_ADOPTION_INPUTS"
  | "CREATE_PROTOCOL_PROJECTION"
  | "REVISE_PROTOCOL_PROJECTION"
  | "RECORD_PROTOCOL_PROJECTION_MACHINE_PROOF"
  | "RECORD_PROTOCOL_PROJECTION_REVIEW"
  | "CANCEL_PROTOCOL_ADOPTION_CASE"
  | "FINALIZE_PROTOCOL_ADOPTION"
  | "RECONCILE_PROTOCOL_ADOPTION";

export interface ProtocolAdoptionOperationEnvelopeV1<TKind extends ProtocolAdoptionOperationKind = ProtocolAdoptionOperationKind, TPayload = unknown> {
  readonly operationVersion: 1;
  readonly operationId: string;
  readonly operationKind: TKind;
  readonly payload: TPayload;
}

export type ProtocolAdoptionOperationStatus = "APPLIED" | "IDEMPOTENT" | "NOOP" | "RECONCILED";
export interface ProtocolAdoptionOperationReceiptV1 {
  readonly schemaVersion: 1;
  readonly operationId: string;
  readonly operationKind: ProtocolAdoptionOperationKind;
  readonly status: ProtocolAdoptionOperationStatus;
  readonly resultRef?: ImmutableRevisionRef;
}


import { basisRefFrom, equalBasisRef } from "./basis.js";
import { canonicalSemanticPathFrom, semanticAuthorityKeyFrom } from "./authorityIdentity.js";

// These normalizers validate record-local P12 constraints. Resolving referenced
// records, detecting multi-record cycles and acceptance/CAS belong to repositories.
type RecordFields = Record<string, (value: unknown) => unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("INVALID_RECORD");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error("INVALID_RECORD");
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (typeof key !== "string" || !descriptor.enumerable || !("value" in descriptor)) throw new Error("INVALID_RECORD");
  }
  return value as Record<string, unknown>;
}

function shape(value: unknown, fields: RecordFields, optional: readonly string[] = []): Record<string, unknown> {
  const record = asRecord(value);
  if (Object.keys(record).some((key) => !Object.hasOwn(fields, key))) throw new Error("INVALID_RECORD:unknown-field");
  const entries = Object.keys(fields).sort().flatMap((key) => {
    if (!Object.hasOwn(record, key)) {
      if (optional.includes(key)) return [];
      throw new Error(`INVALID_RECORD:missing-${key}`);
    }
    return [[key, fields[key]!(record[key])]];
  });
  return Object.freeze(Object.fromEntries(entries));
}

function textValue(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error("INVALID_RECORD:string");
  return value;
}

function literal<T extends string | number>(expected: T, code = "INVALID_RECORD:discriminator") {
  return (value: unknown): T => {
    if (value !== expected) throw new Error(code);
    return expected;
  };
}

function schemaRecord(value: unknown, version: 1 | 2): Record<string, unknown> {
  const record = asRecord(value);
  literal(version, "UNKNOWN_SCHEMA_VERSION")(record.schemaVersion);
  return record;
}

function immutableRef(namespace?: string, subject?: unknown): (value: unknown) => ImmutableRevisionRef {
  return (value) => {
    const record = shape(value, {
      refType: literal("IMMUTABLE_REVISION"), namespace: textValue, subject: textValue,
      revision: textValue, digest: textValue
    }, ["digest"]);
    const ref = basisRefFrom(record);
    if ((namespace !== undefined && ref.namespace !== namespace) ||
        (subject !== undefined && ref.subject !== subject)) throw new Error("INVALID_RECORD:ref-identity");
    return record as unknown as ImmutableRevisionRef;
  };
}

function predecessor(current: unknown, namespace: string, subject: unknown) {
  return (value: unknown): ImmutableRevisionRef => {
    const ref = immutableRef(namespace, subject)(value);
    if (equalBasisRef(ref, immutableRef(namespace, subject)(current))) throw new Error("INVALID_RECORD:self-supersession");
    return ref;
  };
}

function canonicalValue(value: unknown, active = new Set<object>()): CanonicalJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value as CanonicalJsonPrimitive;
  if (typeof value === "number" && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value;
  if (typeof value !== "object" || value === null || active.has(value)) throw new Error("INVALID_CANONICAL_VALUE");
  active.add(value);
  try {
    if (Array.isArray(value)) {
      // JSON arrays have only enumerable, own data elements plus length.
      if (Object.getPrototypeOf(value) !== Array.prototype ||
          Reflect.ownKeys(value).length !== value.length + 1) throw new Error("INVALID_CANONICAL_VALUE");
      const result: CanonicalJsonValue[] = [];
      for (let index = 0; index < value.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw new Error("INVALID_CANONICAL_VALUE");
        result.push(canonicalValue(descriptor.value, active));
      }
      return Object.freeze(result);
    }
    const record = asRecord(value);
    return Object.freeze(Object.fromEntries(Object.keys(record).sort().map((key) =>
      [key, canonicalValue(record[key], active)])));
  } finally {
    active.delete(value);
  }
}

function payload(value: unknown): SemanticCandidatePayload {
  asRecord(value);
  return canonicalValue(value) as SemanticCandidatePayload;
}

function compareOrdinal(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function arrayValues(value: unknown): readonly CanonicalJsonValue[] {
  if (!Array.isArray(value)) throw new Error("INVALID_RECORD:array");
  return canonicalValue(value) as readonly CanonicalJsonValue[];
}

function evidenceRefs(value: unknown): readonly EvidenceRef[] {
  const refs = arrayValues(value).map((entry) => shape(entry, {
    refType: literal("EVIDENCE"), id: textValue, digest: textValue
  }, ["digest"]) as unknown as EvidenceRef);
  refs.sort((a, b) => compareOrdinal(a.id, b.id) || compareOrdinal(a.digest ?? "", b.digest ?? ""));
  for (let index = 1; index < refs.length; index++) {
    if (refs[index]!.id === refs[index - 1]!.id && refs[index]!.digest === refs[index - 1]!.digest) {
      throw new Error("INVALID_RECORD:duplicate-evidence");
    }
  }
  return Object.freeze(refs);
}

function ruleIds(value: unknown): readonly string[] {
  const values = arrayValues(value).map(textValue).sort(compareOrdinal);
  if (new Set(values).size !== values.length) throw new Error("INVALID_RECORD:duplicate-rule");
  return Object.freeze(values);
}

function diagnostics(value: unknown): readonly string[] {
  return Object.freeze(arrayValues(value).map((entry) => {
    if (typeof entry !== "string") throw new Error("INVALID_RECORD:diagnostic");
    return entry;
  }));
}

function boundLineage(record: Record<string, unknown>): RecordFields {
  return {
    reconstructionCaseId: textValue,
    basisSelectionRef: immutableRef("bound-existing-basis-selection", record.reconstructionCaseId)
  };
}

function provenance(value: unknown, kind: "candidate" | "review" | "authority"): Record<string, unknown> {
  const record = asRecord(value);
  if (record.route !== "SEMANTIC_FIRST" && record.route !== "BOUND_EXISTING") throw new Error("UNKNOWN_ROUTE");
  if (record.route === "BOUND_EXISTING") {
    return shape(record, {
      route: literal("BOUND_EXISTING"), ...boundLineage(record),
      ...(kind === "authority" ? {
        candidateRef: immutableRef("semantic-candidate"), machineProofReceiptId: textValue,
        semanticReviewId: textValue, noReinterpretationReviewId: textValue
      } : {})
    });
  }
  return shape(record, {
    route: literal("SEMANTIC_FIRST"), scopeRef: immutableRef(), classificationBasisRef: immutableRef(),
    ...(kind !== "review" ? { caseId: textValue, assessmentId: textValue } : {}),
    ...(kind === "authority" ? { candidateRef: immutableRef("semantic-candidate"), reviewId: textValue } : {})
  });
}

export function normalizeAdoptedProtocolBasis(value: unknown): AdoptedProtocolBasis {
  return shape(value, { protocolAuthorityRef: immutableRef(), adoptionEvidenceRefs: evidenceRefs }) as unknown as AdoptedProtocolBasis;
}

export function normalizeMigrationBasisRecord(value: unknown): MigrationBasisRecord {
  const record = schemaRecord(value, 1);
  return shape(record, {
    schemaVersion: literal(1), migrationBasisId: textValue,
    migrationBasisRef: immutableRef("semantic-migration-basis", record.migrationBasisId),
    payload, evidenceRefs
  }) as unknown as MigrationBasisRecord;
}

export function normalizeBoundExistingBasisSelection(value: unknown): BoundExistingBasisSelection {
  const record = schemaRecord(value, 1);
  return shape(record, {
    schemaVersion: literal(1), ...boundLineage(record), protocolBasis: normalizeAdoptedProtocolBasis,
    migrationBasisRef: immutableRef("semantic-migration-basis"),
    supersedesBasisSelectionRef: predecessor(record.basisSelectionRef, "bound-existing-basis-selection", record.reconstructionCaseId),
    evidenceRefs
  }, ["supersedesBasisSelectionRef"]) as unknown as BoundExistingBasisSelection;
}

export function normalizeBoundExistingReconstructionCase(value: unknown): BoundExistingReconstructionCase {
  const record = schemaRecord(value, 1);
  if (record.status !== "OPEN" && record.status !== "CANCELLED" &&
      record.status !== "INCOMPATIBLE" && record.status !== "AUTHORITY_ACCEPTED") throw new Error("UNKNOWN_CASE_STATUS");
  return shape(record, {
    schemaVersion: literal(1), ...boundLineage(record), status: literal(record.status), evidenceRefs,
    ...(record.status === "INCOMPATIBLE" ? { incompatibilityDeterminationId: textValue } : {}),
    ...(record.status === "AUTHORITY_ACCEPTED" ? { authorityRef: immutableRef("semantic-authority") } : {})
  }) as unknown as BoundExistingReconstructionCase;
}

export function normalizeSemanticCandidateRecordV2(value: unknown): SemanticCandidateRecordV2 {
  const record = schemaRecord(value, 2);
  return shape(record, {
    schemaVersion: literal(2), candidateId: textValue,
    candidateRef: immutableRef("semantic-candidate", record.candidateId),
    supersedesCandidateRef: predecessor(record.candidateRef, "semantic-candidate", record.candidateId),
    provenance: (entry) => provenance(entry, "candidate"), payload, evidenceRefs
  }, ["supersedesCandidateRef"]) as unknown as SemanticCandidateRecordV2;
}

export function normalizeBoundExistingMachineProofReceipt(value: unknown): BoundExistingMachineProofReceipt {
  const record = schemaRecord(value, 1);
  if (record.verdict !== "PASS" && record.verdict !== "FAIL") throw new Error("UNKNOWN_PROOF_VERDICT");
  return shape(record, {
    schemaVersion: literal(1), receiptId: textValue,
    proofKind: literal("BOUND_EXISTING_RECONSTRUCTION", "UNKNOWN_PROOF_KIND"),
    proofContractVersion: textValue, engine: (entry) => shape(entry, { name: textValue, version: textValue }),
    ...boundLineage(record), candidateRef: immutableRef("semantic-candidate"),
    verdict: literal(record.verdict), inputDigest: textValue, ruleIds, diagnostics, evidenceRefs
  }) as unknown as BoundExistingMachineProofReceipt;
}

export function normalizeHumanReviewDecisionV2(value: unknown): HumanReviewDecisionV2 {
  const record = schemaRecord(value, 2);
  if (record.reviewKind !== "SEMANTIC_CANDIDATE" && record.reviewKind !== "NO_REINTERPRETATION") throw new Error("UNKNOWN_REVIEW_KIND");
  if (record.verdict !== "PASS" && record.verdict !== "REJECT") throw new Error("INVALID_REVIEW_VERDICT");
  const lineage = provenance(record.provenance, "review");
  if (record.reviewKind === "NO_REINTERPRETATION" && lineage.route !== "BOUND_EXISTING") throw new Error("INVALID_REVIEW_KIND");
  return shape(record, {
    schemaVersion: literal(2), reviewId: textValue, reviewKind: literal(record.reviewKind),
    decisionSource: literal("HUMAN", "INVALID_REVIEW_SOURCE"), verdict: literal(record.verdict),
    candidateRef: immutableRef("semantic-candidate"), provenance: () => lineage, evidenceRefs
  }) as unknown as HumanReviewDecisionV2;
}

export function normalizeSemanticAuthorityRecordV2(value: unknown): SemanticAuthorityRecordV2 {
  const record = schemaRecord(value, 2);
  return shape(record, {
    schemaVersion: literal(2), authorityKey: semanticAuthorityKeyFrom,
    authorityRef: immutableRef("semantic-authority", record.authorityKey), operationId: textValue,
    provenance: (entry) => provenance(entry, "authority"),
    sourceBinding: (entry) => shape(entry, { path: canonicalSemanticPathFrom, payloadDigest: textValue }),
    supersedesAuthorityRef: predecessor(record.authorityRef, "semantic-authority", record.authorityKey), evidenceRefs
  }, ["supersedesAuthorityRef"]) as unknown as SemanticAuthorityRecordV2;
}

export function normalizeBoundExistingIncompatibilityDetermination(value: unknown): BoundExistingIncompatibilityDetermination {
  const record = schemaRecord(value, 1);
  return shape(record, {
    schemaVersion: literal(1), determinationId: textValue, ...boundLineage(record),
    candidateRef: immutableRef("semantic-candidate"), outcome: literal("SEMANTIC_CHANGE_REQUIRED"), evidenceRefs
  }, ["candidateRef"]) as unknown as BoundExistingIncompatibilityDetermination;
}

export function normalizeProtocolAdoptionSelectionV1(value: unknown): ProtocolAdoptionSelectionV1 {
  const record = schemaRecord(value, 1);
  if (record.route !== "NO_DELTA" && record.route !== "SEMANTIC_DELTA") throw new Error("UNKNOWN_ADOPTION_ROUTE");
  const common: RecordFields = {
    schemaVersion: literal(1), protocolAdoptionCaseId: textValue,
    selectionRef: immutableRef("protocol-adoption-selection", record.protocolAdoptionCaseId),
    route: literal(record.route), assessmentId: textValue, scopeRef: immutableRef(),
    classificationBasisRef: immutableRef(),
    prospectiveProtocolBasisRef: immutableRef("prospective-protocol-basis"),
    supersedesSelectionRef: predecessor(record.selectionRef, "protocol-adoption-selection", record.protocolAdoptionCaseId),
    evidenceRefs
  };
  if (record.route === "NO_DELTA") {
    return shape(record, common, ["supersedesSelectionRef"]) as unknown as ProtocolAdoptionSelectionV1;
  }
  return shape(record, {
    ...common,
    semanticAuthorityRef: immutableRef("semantic-authority"),
    protocolProjectionRef: immutableRef("protocol-projection")
  }, ["protocolProjectionRef", "supersedesSelectionRef"]) as unknown as ProtocolAdoptionSelectionV1;
}

export function normalizeProtocolAdoptionCaseRecordV1(value: unknown): ProtocolAdoptionCaseRecordV1 {
  const record = schemaRecord(value, 1);
  if (record.status !== "OPEN" && record.status !== "CANCELLED" && record.status !== "PROTOCOL_ADOPTED") throw new Error("UNKNOWN_CASE_STATUS");
  const fields: RecordFields = {
    schemaVersion: literal(1), protocolAdoptionCaseId: textValue, status: literal(record.status), evidenceRefs
  };
  if (record.status === "OPEN") fields.workingSelectionRef = immutableRef("protocol-adoption-selection", record.protocolAdoptionCaseId);
  else fields.finalSelectionRef = immutableRef("protocol-adoption-selection", record.protocolAdoptionCaseId);
  if (record.status === "PROTOCOL_ADOPTED") fields.adoptionOccurrenceRef = immutableRef("protocol-adoption-occurrence");
  return shape(record, fields) as unknown as ProtocolAdoptionCaseRecordV1;
}

export function normalizeProtocolProjectionRecordV1(value: unknown): ProtocolProjectionRecordV1 {
  const record = schemaRecord(value, 1);
  return shape(record, {
    schemaVersion: literal(1), projectionId: textValue,
    projectionRef: immutableRef("protocol-projection", record.projectionId),
    protocolAdoptionCaseId: textValue, assessmentId: textValue,
    scopeRef: immutableRef(), classificationBasisRef: immutableRef(),
    semanticAuthorityRef: immutableRef("semantic-authority"),
    prospectiveProtocolBasisRef: immutableRef("prospective-protocol-basis"),
    supersedesProjectionRef: predecessor(record.projectionRef, "protocol-projection", record.projectionId),
    evidenceRefs
  }, ["supersedesProjectionRef"]) as unknown as ProtocolProjectionRecordV1;
}

export function normalizeProjectionMachineProofReceiptV1(value: unknown): ProjectionMachineProofReceiptV1 {
  const record = schemaRecord(value, 1);
  if (record.verdict !== "PASS" && record.verdict !== "FAIL") throw new Error("UNKNOWN_PROOF_VERDICT");
  return shape(record, {
    schemaVersion: literal(1), receiptId: textValue,
    proofKind: literal("PROTOCOL_PROJECTION", "UNKNOWN_PROOF_KIND"),
    proofContractVersion: textValue, engine: (entry) => shape(entry, { name: textValue, version: textValue }),
    protocolAdoptionCaseId: textValue,
    selectionRef: immutableRef("protocol-adoption-selection", record.protocolAdoptionCaseId),
    projectionRef: immutableRef("protocol-projection"), semanticAuthorityRef: immutableRef("semantic-authority"),
    prospectiveProtocolBasisRef: immutableRef("prospective-protocol-basis"),
    verdict: literal(record.verdict), inputDigest: textValue, ruleIds, diagnostics, evidenceRefs
  }) as unknown as ProjectionMachineProofReceiptV1;
}

export function normalizeProjectionReviewDecisionV1(value: unknown): ProjectionReviewDecisionV1 {
  const record = schemaRecord(value, 1);
  if (record.verdict !== "PASS" && record.verdict !== "REJECT") throw new Error("UNKNOWN_REVIEW_VERDICT");
  return shape(record, {
    schemaVersion: literal(1), reviewId: textValue,
    reviewKind: literal("PROTOCOL_PROJECTION", "UNKNOWN_REVIEW_KIND"),
    decisionSource: literal("HUMAN", "INVALID_REVIEW_SOURCE"), verdict: literal(record.verdict),
    protocolAdoptionCaseId: textValue,
    selectionRef: immutableRef("protocol-adoption-selection", record.protocolAdoptionCaseId),
    projectionRef: immutableRef("protocol-projection"), semanticAuthorityRef: immutableRef("semantic-authority"),
    prospectiveProtocolBasisRef: immutableRef("prospective-protocol-basis"), evidenceRefs
  }) as unknown as ProjectionReviewDecisionV1;
}

export function normalizeProtocolAdoptionOccurrenceRecordV1(value: unknown): ProtocolAdoptionOccurrenceRecordV1 {
  const record = schemaRecord(value, 1);
  if (record.route !== "NO_DELTA" && record.route !== "SEMANTIC_DELTA") throw new Error("UNKNOWN_ADOPTION_ROUTE");
  const fields: RecordFields = {
    schemaVersion: literal(1), occurrenceId: textValue,
    occurrenceRef: immutableRef("protocol-adoption-occurrence", record.occurrenceId),
    protocolAdoptionCaseId: textValue, route: literal(record.route),
    selectionRef: immutableRef("protocol-adoption-selection", record.protocolAdoptionCaseId),
    assessmentId: textValue, scopeRef: immutableRef(), classificationBasisRef: immutableRef(),
    prospectiveProtocolBasisRef: immutableRef("prospective-protocol-basis"),
    resultingProtocolAuthorityRef: immutableRef("protocol-authority"), evidenceRefs
  };
  if (record.route === "SEMANTIC_DELTA") Object.assign(fields, {
    semanticAuthorityRef: immutableRef("semantic-authority"), projectionRef: immutableRef("protocol-projection"),
    machineProofReceiptId: textValue, projectionReviewId: textValue
  });
  return shape(record, fields) as unknown as ProtocolAdoptionOccurrenceRecordV1;
}

export function normalizeBoundExistingFallbackLink(value: unknown): BoundExistingFallbackLink {
  const record = schemaRecord(value, 1);
  if (record.reconstructionCaseId === record.semanticChangeCaseId) throw new Error("INVALID_RECORD:fallback-self-link");
  return shape(record, {
    schemaVersion: literal(1), linkId: textValue, reconstructionCaseId: textValue,
    incompatibilityDeterminationId: textValue, semanticChangeCaseId: textValue, evidenceRefs
  }) as unknown as BoundExistingFallbackLink;
}

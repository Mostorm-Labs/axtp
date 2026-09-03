import { basisRefFrom, basisRefKey } from "./basis.js";
import { classifySemanticDelta, SEMANTIC_DELTA_DIMENSIONS } from "./classification.js";
import type {
  BasisRef,
  ChangeScopeSnapshot,
  EvidenceRef,
  MachineProofReceipt,
  SemanticDeltaAssessment,
  SemanticDeltaObservation
} from "./model.js";

export const CLASSIFICATION_PROOF_CONTRACT_VERSION = "sem-lc-01/v1";

export const CLASSIFICATION_RULE_IDS = Object.freeze([
  "SEM-LC-V1-CONFLICT-FAIL-CLOSED",
  "SEM-LC-V1-PROVEN-CHANGE",
  "SEM-LC-V1-EVIDENCE-REQUIRED",
  "SEM-LC-V1-UNKNOWN-FAIL-CLOSED",
  "SEM-LC-V1-COMPLETE-COVERAGE",
  "SEM-LC-V2-EXACT-BASIS"
]);

export interface ClassificationProofResult {
  readonly assessment: SemanticDeltaAssessment;
  readonly receipt: MachineProofReceipt;
}

export function runClassificationProof(
  snapshot: ChangeScopeSnapshot,
  classificationBasisRef: BasisRef
): ClassificationProofResult {
  if (typeof snapshot.caseId !== "string" || snapshot.caseId.trim().length === 0) {
    throw new Error("INVALID_CONTROL_ID:caseId");
  }

  const exactScopeRef = basisRefFrom(snapshot.scopeRef);
  const exactBasisRef = basisRefFrom(classificationBasisRef);
  const classification = classifySemanticDelta(snapshot.observations);
  const inputDigest = deterministicDigest({
    caseId: snapshot.caseId,
    scopeRef: basisRefKey(exactScopeRef),
    classificationBasisRef: basisRefKey(exactBasisRef),
    observations: canonicalObservations(snapshot.observations)
  });

  const identityDigest = deterministicDigest({
    caseId: snapshot.caseId,
    inputDigest,
    disposition: classification.disposition
  });

  const assessment: SemanticDeltaAssessment = Object.freeze({
    assessmentId: `assessment:${identityDigest}`,
    caseId: snapshot.caseId,
    scopeRef: exactScopeRef,
    classificationBasisRef: exactBasisRef,
    disposition: classification.disposition,
    evaluatedDimensions: Object.freeze([...classification.evaluatedDimensions]),
    evidenceRefs: Object.freeze([...classification.evidenceRefs])
  });

  const receipt: MachineProofReceipt = Object.freeze({
    receiptId: `receipt:${identityDigest}`,
    proofContractVersion: CLASSIFICATION_PROOF_CONTRACT_VERSION,
    engine: Object.freeze({ name: "semantic-delta-reference-classifier", version: "1.0.0" }),
    scopeRef: exactScopeRef,
    classificationBasisRef: exactBasisRef,
    ruleIds: Object.freeze([...CLASSIFICATION_RULE_IDS]),
    disposition: classification.disposition,
    inputDigest,
    diagnostics: Object.freeze([...classification.diagnostics]),
    evidenceRefs: Object.freeze([...classification.evidenceRefs])
  });

  return Object.freeze({ assessment, receipt });
}

function evidenceKey(ref: EvidenceRef): string {
  return JSON.stringify([ref.refType, ref.id, ref.digest ?? null]);
}

function canonicalObservations(observations: readonly SemanticDeltaObservation[]): readonly unknown[] {
  const order = new Map<string, number>(SEMANTIC_DELTA_DIMENSIONS.map((dimension, index) => [dimension, index]));
  return Object.freeze(
    observations
      .map((observation) => ({
        dimension: String(observation.dimension),
        state: observation.state,
        evidenceRefs: [...(observation.evidenceRefs ?? [])]
          .map((ref) => ({ ...ref }))
          .sort((left, right) => evidenceKey(left).localeCompare(evidenceKey(right)))
      }))
      .sort((left, right) => {
        const leftOrder = order.get(left.dimension) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = order.get(right.dimension) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        const dimensionCompare = left.dimension.localeCompare(right.dimension);
        if (dimensionCompare !== 0) return dimensionCompare;
        const stateCompare = left.state.localeCompare(right.state);
        if (stateCompare !== 0) return stateCompare;
        return JSON.stringify(left.evidenceRefs).localeCompare(JSON.stringify(right.evidenceRefs));
      })
  );
}

function deterministicDigest(value: unknown): string {
  const text = canonicalJson(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * prime) & mask;
  }
  return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(",")}}`;
}

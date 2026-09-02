import { basisRefFrom, equalBasisRef } from "./basis.js";
import type { BasisRef, ImmutableRevisionRef, SemanticDeltaAssessment } from "./model.js";

export type NoDeltaFastPathReason =
  | "ELIGIBLE"
  | "NOT_NO_DELTA"
  | "STALE_SCOPE"
  | "STALE_CLASSIFICATION_BASIS"
  | "INVALID_IMMUTABLE_REF";

export interface NoDeltaFastPathDecision {
  readonly eligible: boolean;
  readonly reason: NoDeltaFastPathReason;
}

export function evaluateNoDeltaFastPath(
  assessment: SemanticDeltaAssessment,
  currentScopeRef: ImmutableRevisionRef,
  currentClassificationBasisRef: BasisRef
): NoDeltaFastPathDecision {
  let assessmentScope: BasisRef;
  let assessmentBasis: BasisRef;
  let currentScope: BasisRef;
  let currentBasis: BasisRef;

  try {
    assessmentScope = basisRefFrom(assessment.scopeRef);
    assessmentBasis = basisRefFrom(assessment.classificationBasisRef);
    currentScope = basisRefFrom(currentScopeRef);
    currentBasis = basisRefFrom(currentClassificationBasisRef);
  } catch {
    return Object.freeze({ eligible: false, reason: "INVALID_IMMUTABLE_REF" });
  }

  if (assessment.disposition !== "NO_SEMANTIC_DELTA") {
    return Object.freeze({ eligible: false, reason: "NOT_NO_DELTA" });
  }
  if (!equalBasisRef(assessmentScope, currentScope)) {
    return Object.freeze({ eligible: false, reason: "STALE_SCOPE" });
  }
  if (!equalBasisRef(assessmentBasis, currentBasis)) {
    return Object.freeze({ eligible: false, reason: "STALE_CLASSIFICATION_BASIS" });
  }
  return Object.freeze({ eligible: true, reason: "ELIGIBLE" });
}

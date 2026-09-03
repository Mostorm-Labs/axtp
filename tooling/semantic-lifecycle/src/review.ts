import { basisRefFrom, equalBasisRef } from "./basis.js";
import type { EvidenceRef, ReviewDecision, SemanticCandidate } from "./model.js";

export type ReviewFreshnessReason =
  | "ELIGIBLE"
  | "NOT_HUMAN_REVIEW"
  | "REVIEW_NOT_PASS"
  | "MISSING_REVIEW_EVIDENCE"
  | "STALE_CANDIDATE"
  | "STALE_SCOPE"
  | "STALE_CLASSIFICATION_BASIS"
  | "INVALID_IMMUTABLE_REF";

export interface ReviewFreshnessDecision {
  readonly eligible: boolean;
  readonly reason: ReviewFreshnessReason;
}

export function evaluateReviewFreshness(
  decision: ReviewDecision,
  currentCandidate: SemanticCandidate
): ReviewFreshnessDecision {
  let reviewCandidateRef;
  let reviewScopeRef;
  let reviewBasisRef;
  let currentCandidateRef;
  let currentScopeRef;
  let currentBasisRef;
  try {
    reviewCandidateRef = basisRefFrom(decision.candidateRef);
    reviewScopeRef = basisRefFrom(decision.scopeRef);
    reviewBasisRef = basisRefFrom(decision.classificationBasisRef);
    currentCandidateRef = basisRefFrom(currentCandidate.candidateRef);
    currentScopeRef = basisRefFrom(currentCandidate.scopeRef);
    currentBasisRef = basisRefFrom(currentCandidate.classificationBasisRef);
  } catch {
    return ineligible("INVALID_IMMUTABLE_REF");
  }
  if (decision.reviewKind !== "SEMANTIC_CANDIDATE" || decision.decisionSource !== "HUMAN") {
    return ineligible("NOT_HUMAN_REVIEW");
  }
  if (decision.verdict !== "PASS") return ineligible("REVIEW_NOT_PASS");
  if (!hasValidReviewEvidence(decision.evidenceRefs)) return ineligible("MISSING_REVIEW_EVIDENCE");
  if (!equalBasisRef(reviewCandidateRef, currentCandidateRef)) return ineligible("STALE_CANDIDATE");
  if (!equalBasisRef(reviewScopeRef, currentScopeRef)) return ineligible("STALE_SCOPE");
  if (!equalBasisRef(reviewBasisRef, currentBasisRef)) return ineligible("STALE_CLASSIFICATION_BASIS");
  return Object.freeze({ eligible: true, reason: "ELIGIBLE" as const });
}

export function assertRecordableHumanReview(decision: ReviewDecision): void {
  if (typeof decision !== "object" || decision === null) throw new Error("INVALID_REVIEW:value");
  if (typeof decision.reviewId !== "string" || decision.reviewId.trim().length === 0) {
    throw new Error("INVALID_REVIEW:reviewId");
  }
  if (decision.reviewKind !== "SEMANTIC_CANDIDATE" || decision.decisionSource !== "HUMAN") {
    throw new Error("NOT_HUMAN_REVIEW");
  }
  if (decision.verdict !== "PASS" && decision.verdict !== "REJECT") {
    throw new Error("INVALID_REVIEW:verdict");
  }
  const candidateRef = basisRefFrom(decision.candidateRef);
  if (candidateRef.namespace !== "semantic-candidate") throw new Error("INVALID_REVIEW:candidateRef");
  basisRefFrom(decision.scopeRef);
  basisRefFrom(decision.classificationBasisRef);
  if (!hasValidReviewEvidence(decision.evidenceRefs)) throw new Error("MISSING_REVIEW_EVIDENCE");
}

export function hasValidReviewEvidence(value: readonly EvidenceRef[]): boolean {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => isValidEvidenceRef(entry));
}

function isValidEvidenceRef(value: unknown): value is EvidenceRef {
  if (typeof value !== "object" || value === null) return false;
  const ref = value as Record<string, unknown>;
  if (ref.refType !== "EVIDENCE" || typeof ref.id !== "string" || ref.id.trim().length === 0) return false;
  return ref.digest === undefined || (typeof ref.digest === "string" && ref.digest.trim().length > 0);
}

function ineligible(reason: Exclude<ReviewFreshnessReason, "ELIGIBLE">): ReviewFreshnessDecision {
  return Object.freeze({ eligible: false, reason });
}

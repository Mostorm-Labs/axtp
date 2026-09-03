import { equalBasisRef } from "./basis.js";
import type { ImmutablePutResult, LifecycleControlStore } from "./controlStore.js";
import type { SemanticCandidateStore } from "./candidateStore.js";
import type {
  EvidenceRef,
  ImmutableRevisionRef,
  ReviewDecision,
  SemanticCandidate,
  SemanticCandidatePayload
} from "./model.js";
import {
  assertRecordableHumanReview,
  evaluateReviewFreshness,
  type ReviewFreshnessDecision
} from "./review.js";

export interface CreateCandidateInput {
  readonly candidateId: string;
  readonly candidateRef: ImmutableRevisionRef;
  readonly supersedesCandidateRef?: ImmutableRevisionRef;
  readonly assessmentId: string;
  readonly payload: SemanticCandidatePayload;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export class CandidateReviewCoordinator {
  readonly #controlStore: LifecycleControlStore;
  readonly #candidateStore: SemanticCandidateStore;

  constructor(controlStore: LifecycleControlStore, candidateStore: SemanticCandidateStore) {
    this.#controlStore = controlStore;
    this.#candidateStore = candidateStore;
  }

  createCandidate(input: CreateCandidateInput): SemanticCandidate {
    const assessment = this.#controlStore.getAssessment(input.assessmentId);
    if (assessment === undefined) throw new Error(`ASSESSMENT_NOT_FOUND:${input.assessmentId}`);
    if (assessment.disposition !== "SEMANTIC_DELTA") throw new Error("CANDIDATE_REQUIRES_SEMANTIC_DELTA");

    if (input.supersedesCandidateRef !== undefined) {
      const predecessor = this.#candidateStore.getCandidate(input.supersedesCandidateRef);
      if (predecessor === undefined) throw new Error("SUPERSEDED_CANDIDATE_NOT_FOUND");
      if (predecessor.candidateId !== input.candidateId || predecessor.caseId !== assessment.caseId) {
        throw new Error("INVALID_CANDIDATE_SUPERSESSION");
      }
    }

    const candidate: SemanticCandidate = {
      candidateId: input.candidateId,
      caseId: assessment.caseId,
      candidateRef: input.candidateRef,
      ...(input.supersedesCandidateRef === undefined ? {} : { supersedesCandidateRef: input.supersedesCandidateRef }),
      assessmentId: assessment.assessmentId,
      scopeRef: assessment.scopeRef,
      classificationBasisRef: assessment.classificationBasisRef,
      payload: input.payload,
      evidenceRefs: input.evidenceRefs
    };
    this.#candidateStore.putCandidate(candidate);
    const stored = this.#candidateStore.getCandidate(input.candidateRef);
    if (stored === undefined) throw new Error("CANDIDATE_STORE_WRITE_LOST");
    return stored;
  }

  recordHumanReviewDecision(decision: ReviewDecision): ImmutablePutResult {
    assertRecordableHumanReview(decision);
    const candidate = this.#candidateStore.getCandidate(decision.candidateRef);
    if (candidate === undefined) throw new Error("REVIEW_CANDIDATE_NOT_FOUND");
    if (!equalBasisRef(decision.scopeRef, candidate.scopeRef)) throw new Error("REVIEW_SCOPE_MISMATCH");
    if (!equalBasisRef(decision.classificationBasisRef, candidate.classificationBasisRef)) {
      throw new Error("REVIEW_CLASSIFICATION_BASIS_MISMATCH");
    }
    return this.#controlStore.putReviewDecision(decision);
  }

  evaluateHumanReview(
    decision: ReviewDecision,
    currentCandidate: SemanticCandidate
  ): ReviewFreshnessDecision {
    return evaluateReviewFreshness(decision, currentCandidate);
  }
}

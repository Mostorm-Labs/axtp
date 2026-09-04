import type { AuthorityCommitInput, SemanticAuthorityCommitter } from "./authorityCommitter.js";
import {
  canonicalPayloadDigest,
  type AuthorityMutationResult,
  type SemanticAuthorityRepository
} from "./authorityRepository.js";
import { basisRefFrom, equalBasisRef } from "./basis.js";
import type { CandidateReviewCoordinator, CreateCandidateInput } from "./candidateReviewCoordinator.js";
import type { SemanticLifecycleCoordinator } from "./coordinator.js";
import type {
  BasisRef,
  ImmutableRevisionRef,
  MachineProofReceipt,
  ReviewDecision,
  SemanticAuthorityProjectionBasis,
  SemanticCandidate,
  SemanticChangeCase,
  SemanticDeltaAssessment,
  SemanticFirstCaseStatus
} from "./model.js";

export const semanticFirstControlStateFields = Object.freeze([
  "acceptedAuthorityRef",
  "assessmentId",
  "caseId",
  "classificationBasisRef",
  "currentCandidateRef",
  "currentReviewId",
  "scopeRef",
  "status"
] as const);

export interface SemanticFirstRouteDependencies {
  readonly lifecycleCoordinator: SemanticLifecycleCoordinator;
  readonly candidateReviewCoordinator: CandidateReviewCoordinator;
  readonly authorityCommitter: SemanticAuthorityCommitter;
  readonly authorityRepository: SemanticAuthorityRepository;
}

export interface SemanticFirstCaseState {
  readonly caseId: string;
  readonly status: SemanticFirstCaseStatus;
  readonly assessmentId: string;
  readonly scopeRef: ImmutableRevisionRef;
  readonly classificationBasisRef: BasisRef;
  readonly currentCandidateRef?: ImmutableRevisionRef;
  readonly currentReviewId?: string;
  readonly acceptedAuthorityRef?: ImmutableRevisionRef;
}

export interface OpenSemanticFirstCaseResult {
  readonly status: "OPEN";
  readonly assessment: SemanticDeltaAssessment;
  readonly receipt: MachineProofReceipt;
}

export class SemanticFirstRoute {
  readonly #lifecycleCoordinator: SemanticLifecycleCoordinator;
  readonly #candidateReviewCoordinator: CandidateReviewCoordinator;
  readonly #authorityCommitter: SemanticAuthorityCommitter;
  readonly #authorityRepository: SemanticAuthorityRepository;
  readonly #cases = new Map<string, SemanticFirstCaseState>();

  constructor(dependencies: SemanticFirstRouteDependencies) {
    this.#lifecycleCoordinator = dependencies.lifecycleCoordinator;
    this.#candidateReviewCoordinator = dependencies.candidateReviewCoordinator;
    this.#authorityCommitter = dependencies.authorityCommitter;
    this.#authorityRepository = dependencies.authorityRepository;
  }

  openCase(changeCase: SemanticChangeCase): OpenSemanticFirstCaseResult {
    if (typeof changeCase !== "object" || changeCase === null) {
      throw new Error("SEMANTIC_FIRST_CASE_CONFLICT:invalid-case");
    }
    const caseId = requireNonEmpty(changeCase.caseId, "caseId");
    if (typeof changeCase.scopeSnapshot !== "object" || changeCase.scopeSnapshot === null) {
      throw new Error("SEMANTIC_FIRST_CASE_CONFLICT:scopeSnapshot");
    }
    if (changeCase.scopeSnapshot.caseId !== caseId) {
      throw new Error("SEMANTIC_FIRST_CASE_CONFLICT:caseId-scopeSnapshot");
    }
    if (this.#cases.has(caseId)) throw new Error(`SEMANTIC_FIRST_CASE_CONFLICT:${caseId}`);

    const scopeRef = basisRefFrom(changeCase.scopeSnapshot.scopeRef);
    const classificationBasisRef = basisRefFrom(changeCase.classificationBasisRef);
    const proof = this.#lifecycleCoordinator.assess(
      Object.freeze({
        caseId,
        scopeRef,
        observations: Object.freeze([...changeCase.scopeSnapshot.observations])
      }),
      classificationBasisRef
    );
    this.#cases.set(caseId, freezeState({
      caseId,
      status: "OPEN",
      assessmentId: proof.assessment.assessmentId,
      scopeRef,
      classificationBasisRef
    }));
    return Object.freeze({ status: "OPEN" as const, assessment: proof.assessment, receipt: proof.receipt });
  }

  createCandidate(caseId: string, input: CreateCandidateInput): SemanticCandidate {
    const state = this.#requireOpenCase(caseId);
    if (state.currentCandidateRef !== undefined || input.supersedesCandidateRef !== undefined) {
      throw new Error("SEMANTIC_FIRST_CANDIDATE_NOT_CURRENT");
    }
    this.#assertAssessment(state, input.assessmentId);
    const candidate = this.#candidateReviewCoordinator.createCandidate(input);
    this.#cases.set(state.caseId, freezeState({ ...state, currentCandidateRef: candidate.candidateRef }));
    return candidate;
  }

  recordHumanReview(caseId: string, decision: ReviewDecision): "CREATED" | "IDEMPOTENT" {
    const state = this.#requireOpenCase(caseId);
    if (state.currentCandidateRef === undefined || !sameRef(decision.candidateRef, state.currentCandidateRef)) {
      throw new Error("SEMANTIC_FIRST_CANDIDATE_NOT_CURRENT");
    }
    const result = this.#candidateReviewCoordinator.recordHumanReviewDecision(decision);
    this.#cases.set(state.caseId, freezeState({ ...state, currentReviewId: decision.reviewId }));
    return result;
  }

  commitInitialAuthority(caseId: string, input: AuthorityCommitInput): AuthorityMutationResult {
    const state = this.#requireCase(caseId);
    this.#assertCommitReady(state, input, true);
    const result = this.#authorityCommitter.commitAuthority(input);
    this.#acceptAuthority(state, result.authority.authorityRef);
    return result;
  }

  repairCandidate(caseId: string, input: CreateCandidateInput): SemanticCandidate {
    const state = this.#requireOpenCase(caseId);
    if (
      state.currentCandidateRef === undefined ||
      input.supersedesCandidateRef === undefined ||
      !sameRef(input.supersedesCandidateRef, state.currentCandidateRef)
    ) {
      throw new Error("SEMANTIC_FIRST_CANDIDATE_NOT_CURRENT");
    }
    this.#assertAssessment(state, input.assessmentId);
    const repaired = this.#candidateReviewCoordinator.createCandidate(input);
    this.#cases.set(state.caseId, freezeState({
      caseId: state.caseId,
      status: state.status,
      assessmentId: state.assessmentId,
      scopeRef: state.scopeRef,
      classificationBasisRef: state.classificationBasisRef,
      currentCandidateRef: repaired.candidateRef
    }));
    return repaired;
  }

  cancelCase(caseId: string): "CANCELLED" {
    const state = this.#requireCase(caseId);
    if (state.status === "AUTHORITY_ACCEPTED") throw new Error("SEMANTIC_FIRST_CASE_ALREADY_ACCEPTED");
    if (state.status === "CANCELLED") return "CANCELLED";
    this.#cases.set(state.caseId, freezeState({ ...state, status: "CANCELLED" }));
    return "CANCELLED";
  }

  commitSupersedingAuthority(caseId: string, input: AuthorityCommitInput): AuthorityMutationResult {
    const state = this.#requireCase(caseId);
    const current = this.#authorityRepository.getCurrentAuthority(input.authorityKey);
    if (current !== undefined && current.caseId === state.caseId) {
      throw new Error("SEMANTIC_FIRST_SUPERSESSION_REQUIRES_NEW_CASE");
    }
    this.#assertCommitReady(state, input, false);
    const result = this.#authorityCommitter.supersedeAuthority(input);
    this.#acceptAuthority(state, result.authority.authorityRef);
    return result;
  }

  resolveProjectionBasis(authorityRef: ImmutableRevisionRef): SemanticAuthorityProjectionBasis {
    let authority;
    try {
      authority = this.#authorityRepository.getAuthority(authorityRef);
    } catch {
      throw new Error("SEMANTIC_PROJECTION_BASIS_NOT_FOUND");
    }
    if (authority === undefined) throw new Error("SEMANTIC_PROJECTION_BASIS_NOT_FOUND");
    const current = this.#authorityRepository.getCurrentAuthority(authority.authorityKey);
    if (current === undefined || !equalBasisRef(current.authorityRef, authority.authorityRef)) {
      throw new Error("SEMANTIC_PROJECTION_BASIS_STALE");
    }
    const source = this.#authorityRepository.getCanonicalSource(authority.sourceBinding.path);
    if (source === undefined || canonicalPayloadDigest(source) !== authority.sourceBinding.payloadDigest) {
      throw new Error("SEMANTIC_PROJECTION_SOURCE_MISMATCH");
    }
    return Object.freeze({
      authorityKey: authority.authorityKey,
      authorityRef: authority.authorityRef,
      sourceBinding: authority.sourceBinding
    });
  }

  getCaseStatus(caseId: string): SemanticFirstCaseStatus | undefined {
    return this.#cases.get(caseId)?.status;
  }

  getCaseState(caseId: string): SemanticFirstCaseState {
    return this.#requireCase(caseId);
  }

  #requireCase(caseId: string): SemanticFirstCaseState {
    const normalizedCaseId = requireNonEmpty(caseId, "caseId");
    const state = this.#cases.get(normalizedCaseId);
    if (state === undefined) throw new Error(`SEMANTIC_FIRST_CASE_NOT_FOUND:${normalizedCaseId}`);
    return state;
  }

  #requireOpenCase(caseId: string): SemanticFirstCaseState {
    const state = this.#requireCase(caseId);
    if (state.status === "CANCELLED") throw new Error("SEMANTIC_FIRST_CASE_CANCELLED");
    if (state.status === "AUTHORITY_ACCEPTED") throw new Error("SEMANTIC_FIRST_CASE_ALREADY_ACCEPTED");
    return state;
  }

  #assertAssessment(state: SemanticFirstCaseState, assessmentId: string): void {
    if (assessmentId !== state.assessmentId) throw new Error("SEMANTIC_FIRST_CASE_CONFLICT:assessment");
  }

  #assertCommitReady(state: SemanticFirstCaseState, input: AuthorityCommitInput, allowAcceptedRetry: boolean): void {
    if (state.status === "CANCELLED") throw new Error("SEMANTIC_FIRST_CASE_CANCELLED");
    if (state.status === "AUTHORITY_ACCEPTED" && !allowAcceptedRetry) {
      throw new Error("SEMANTIC_FIRST_CASE_ALREADY_ACCEPTED");
    }
    if (state.currentCandidateRef === undefined || !sameRef(input.candidateRef, state.currentCandidateRef)) {
      throw new Error("SEMANTIC_FIRST_CANDIDATE_NOT_CURRENT");
    }
    if (state.currentReviewId === undefined || input.reviewId !== state.currentReviewId) {
      throw new Error("SEMANTIC_FIRST_REVIEW_NOT_CURRENT");
    }
    if (!sameRef(input.expectedScopeRef, state.scopeRef) || !sameRef(input.expectedClassificationBasisRef, state.classificationBasisRef)) {
      throw new Error("SEMANTIC_FIRST_CASE_CONFLICT:commit-basis");
    }
  }

  #acceptAuthority(state: SemanticFirstCaseState, authorityRef: ImmutableRevisionRef): void {
    this.#cases.set(state.caseId, freezeState({
      ...state,
      status: "AUTHORITY_ACCEPTED",
      acceptedAuthorityRef: authorityRef
    }));
  }
}

function requireNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`SEMANTIC_FIRST_CASE_CONFLICT:${field}`);
  }
  return value;
}

function sameRef(left: ImmutableRevisionRef, right: ImmutableRevisionRef): boolean {
  try {
    return equalBasisRef(basisRefFrom(left), basisRefFrom(right));
  } catch {
    return false;
  }
}

function freezeState(state: SemanticFirstCaseState): SemanticFirstCaseState {
  return Object.freeze({ ...state });
}

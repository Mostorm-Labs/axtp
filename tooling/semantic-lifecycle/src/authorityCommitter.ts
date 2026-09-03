import { basisRefFrom, equalBasisRef } from "./basis.js";
import type { SemanticCandidateStore } from "./candidateStore.js";
import type { LifecycleControlStore } from "./controlStore.js";
import {
  authorityRefFrom,
  canonicalSemanticPathFrom,
  semanticAuthorityKeyFrom
} from "./authorityIdentity.js";
import type {
  AuthorityMutationResult,
  SemanticAuthorityRepository
} from "./authorityRepository.js";
import { canonicalPayloadDigest } from "./authorityRepository.js";
import type {
  BasisRef,
  CanonicalJsonValue,
  EvidenceRef,
  ImmutableRevisionRef,
  SemanticAuthorityKey,
  SemanticAuthorityRecord,
  SemanticCandidatePayload
} from "./model.js";
import { evaluateReviewFreshness } from "./review.js";

export interface AuthorityCommitInput {
  readonly operationId: string;
  readonly authorityKey: SemanticAuthorityKey;
  readonly authorityRef: ImmutableRevisionRef;
  readonly candidateRef: ImmutableRevisionRef;
  readonly reviewId: string;
  readonly expectedScopeRef: ImmutableRevisionRef;
  readonly expectedClassificationBasisRef: BasisRef;
  readonly expectedAuthorityHead: ImmutableRevisionRef | null;
  readonly canonicalPath: string;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export class SemanticAuthorityCommitter {
  readonly #controlStore: LifecycleControlStore;
  readonly #candidateStore: SemanticCandidateStore;
  readonly #authorityRepository: SemanticAuthorityRepository;

  constructor(
    controlStore: LifecycleControlStore,
    candidateStore: SemanticCandidateStore,
    authorityRepository: SemanticAuthorityRepository
  ) {
    this.#controlStore = controlStore;
    this.#candidateStore = candidateStore;
    this.#authorityRepository = authorityRepository;
  }

  commitAuthority(input: AuthorityCommitInput): AuthorityMutationResult {
    if (input.expectedAuthorityHead !== null) throw new Error("INITIAL_AUTHORITY_EXPECTED_HEAD_MUST_BE_NULL");
    return this.#commit(input, undefined);
  }

  supersedeAuthority(input: AuthorityCommitInput): AuthorityMutationResult {
    if (input.expectedAuthorityHead === null) throw new Error("SUPERSEDE_AUTHORITY_EXPECTED_HEAD_REQUIRED");
    const authorityKey = semanticAuthorityKeyFrom(input.authorityKey);
    const expectedHead = authorityRefFrom(authorityKey, input.expectedAuthorityHead);
    return this.#commit(input, expectedHead);
  }

  #commit(
    input: AuthorityCommitInput,
    supersedesAuthorityRef: ImmutableRevisionRef | undefined
  ): AuthorityMutationResult {
    if (typeof input !== "object" || input === null) throw new Error("INVALID_AUTHORITY_COMMIT_INPUT");
    const operationId = requireNonEmpty(input.operationId, "operationId");
    const authorityKey = semanticAuthorityKeyFrom(input.authorityKey);
    const authorityRef = authorityRefFrom(authorityKey, input.authorityRef);
    if (supersedesAuthorityRef !== undefined && equalBasisRef(authorityRef, supersedesAuthorityRef)) {
      throw new Error("AUTHORITY_SUPERSESSION_SELF");
    }
    const canonicalPath = canonicalSemanticPathFrom(input.canonicalPath);
    const candidateRef = basisRefFrom(input.candidateRef);
    if (candidateRef.namespace !== "semantic-candidate") throw new Error("INVALID_AUTHORITY_CANDIDATE_REF");
    const candidate = this.#candidateStore.getCandidate(candidateRef);
    if (candidate === undefined) throw new Error("AUTHORITY_CANDIDATE_NOT_FOUND");

    const reviewId = requireNonEmpty(input.reviewId, "reviewId");
    const review = this.#controlStore.getReviewDecision(reviewId);
    if (review === undefined) throw new Error("AUTHORITY_REVIEW_NOT_FOUND");
    const freshness = evaluateReviewFreshness(review, candidate);
    if (!freshness.eligible) throw new Error(`AUTHORITY_REVIEW_NOT_FRESH:${freshness.reason}`);

    const scopeRef = basisRefFrom(input.expectedScopeRef);
    const classificationBasisRef = basisRefFrom(input.expectedClassificationBasisRef);
    if (!equalBasisRef(candidate.scopeRef, scopeRef)) throw new Error("AUTHORITY_SCOPE_MISMATCH");
    if (!equalBasisRef(candidate.classificationBasisRef, classificationBasisRef)) {
      throw new Error("AUTHORITY_CLASSIFICATION_BASIS_MISMATCH");
    }
    if (!equalBasisRef(review.candidateRef, candidateRef)) throw new Error("AUTHORITY_REVIEW_CANDIDATE_MISMATCH");
    if (!equalBasisRef(review.scopeRef, scopeRef)) throw new Error("AUTHORITY_REVIEW_SCOPE_MISMATCH");
    if (!equalBasisRef(review.classificationBasisRef, classificationBasisRef)) {
      throw new Error("AUTHORITY_REVIEW_CLASSIFICATION_BASIS_MISMATCH");
    }

    const assessment = this.#controlStore.getAssessment(candidate.assessmentId);
    if (assessment === undefined) throw new Error("AUTHORITY_ASSESSMENT_NOT_FOUND");
    if (assessment.disposition !== "SEMANTIC_DELTA") throw new Error("AUTHORITY_REQUIRES_SEMANTIC_DELTA");
    if (assessment.caseId !== candidate.caseId) throw new Error("AUTHORITY_CASE_MISMATCH");
    if (!equalBasisRef(assessment.scopeRef, scopeRef)) throw new Error("AUTHORITY_ASSESSMENT_SCOPE_MISMATCH");
    if (!equalBasisRef(assessment.classificationBasisRef, classificationBasisRef)) {
      throw new Error("AUTHORITY_ASSESSMENT_BASIS_MISMATCH");
    }

    const evidenceRefs = normalizeEvidenceRefs(input.evidenceRefs);
    const canonicalPayload = canonicalizePayload(candidate.payload);
    const payloadDigest = canonicalPayloadDigest(canonicalPayload);
    const record: SemanticAuthorityRecord = deepFreeze({
      authorityKey,
      authorityRef,
      operationId,
      caseId: candidate.caseId,
      assessmentId: candidate.assessmentId,
      candidateRef,
      reviewId,
      scopeRef,
      classificationBasisRef,
      sourceBinding: Object.freeze({ path: canonicalPath, payloadDigest }),
      ...(supersedesAuthorityRef === undefined ? {} : { supersedesAuthorityRef }),
      evidenceRefs
    });

    return this.#authorityRepository.publishAuthority({
      operationId,
      record,
      expectedAuthorityHead: supersedesAuthorityRef ?? null,
      canonicalPayload
    });
  }
}

function requireNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`INVALID_AUTHORITY_COMMIT_INPUT:${field}`);
  }
  return value;
}

function normalizeEvidenceRefs(value: readonly EvidenceRef[]): readonly EvidenceRef[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("INVALID_AUTHORITY_EVIDENCE");
  return Object.freeze(value.map((entry) => {
    if (typeof entry !== "object" || entry === null || entry.refType !== "EVIDENCE") {
      throw new Error("INVALID_AUTHORITY_EVIDENCE");
    }
    const id = requireNonEmpty(entry.id, "evidence.id");
    const digest = entry.digest === undefined ? undefined : requireNonEmpty(entry.digest, "evidence.digest");
    return Object.freeze({ refType: "EVIDENCE" as const, id, ...(digest === undefined ? {} : { digest }) });
  }));
}

function canonicalizePayload(payload: SemanticCandidatePayload): SemanticCandidatePayload {
  return deepFreeze(canonicalize(payload)) as SemanticCandidatePayload;
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalize(value: unknown): CanonicalJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return value as CanonicalJsonValue;
  }
  if (Array.isArray(value)) return Object.freeze(value.map((entry) => canonicalize(entry)));
  const output: Record<string, CanonicalJsonValue> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>).sort(([a], [b]) => compareOrdinal(a, b))) {
    output[key] = canonicalize(child);
  }
  return Object.freeze(output);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}

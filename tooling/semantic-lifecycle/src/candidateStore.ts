import { basisRefFrom, basisRefKey, equalBasisRef } from "./basis.js";
import type { ImmutablePutResult } from "./controlStore.js";
import type {
  EvidenceRef,
  ImmutableRevisionRef,
  SemanticCandidate,
  SemanticCandidatePayload
} from "./model.js";

export interface SemanticCandidateStore {
  putCandidate(candidate: SemanticCandidate): ImmutablePutResult;
  getCandidate(candidateRef: ImmutableRevisionRef): SemanticCandidate | undefined;
}

type StoredCandidate = Readonly<{ canonical: string; value: SemanticCandidate }>;

export class InMemorySemanticCandidateStore implements SemanticCandidateStore {
  readonly #candidates = new Map<string, StoredCandidate>();

  putCandidate(candidate: SemanticCandidate): ImmutablePutResult {
    const normalized = normalizeCandidate(candidate);
    const key = basisRefKey(normalized.candidateRef);
    const canonical = canonicalJson(normalized);
    const existing = this.#candidates.get(key);
    if (existing === undefined) {
      this.#candidates.set(key, Object.freeze({ canonical, value: normalized }));
      return "CREATED";
    }
    if (existing.canonical === canonical) return "IDEMPOTENT";
    throw new Error(`IMMUTABLE_CANDIDATE_CONFLICT:${key}`);
  }

  getCandidate(candidateRef: ImmutableRevisionRef): SemanticCandidate | undefined {
    const exactRef = normalizeCandidateRef(candidateRef);
    return this.#candidates.get(basisRefKey(exactRef))?.value;
  }
}

export function candidateRefFrom(candidateId: string, value: unknown): ImmutableRevisionRef {
  const id = requireNonEmptyString(candidateId, "candidateId");
  const ref = basisRefFrom(value);
  if (ref.namespace !== "semantic-candidate" || ref.subject !== id) {
    throw new Error("INVALID_CANDIDATE_REF");
  }
  return ref;
}

function normalizeCandidateRef(value: unknown): ImmutableRevisionRef {
  const ref = basisRefFrom(value);
  if (ref.namespace !== "semantic-candidate") throw new Error("INVALID_CANDIDATE_REF");
  return ref;
}

function normalizeCandidate(candidate: SemanticCandidate): SemanticCandidate {
  if (typeof candidate !== "object" || candidate === null) {
    throw new Error("INVALID_CANDIDATE:value");
  }
  const candidateId = requireNonEmptyString(candidate.candidateId, "candidateId");
  const caseId = requireNonEmptyString(candidate.caseId, "caseId");
  const assessmentId = requireNonEmptyString(candidate.assessmentId, "assessmentId");
  const candidateRef = candidateRefFrom(candidateId, candidate.candidateRef);
  const scopeRef = basisRefFrom(candidate.scopeRef);
  const classificationBasisRef = basisRefFrom(candidate.classificationBasisRef);
  const supersedesCandidateRef =
    candidate.supersedesCandidateRef === undefined
      ? undefined
      : candidateRefFrom(candidateId, candidate.supersedesCandidateRef);
  if (supersedesCandidateRef !== undefined && equalBasisRef(supersedesCandidateRef, candidateRef)) {
    throw new Error("INVALID_CANDIDATE_SUPERSESSION:self");
  }
  const payload = normalizePayload(candidate.payload);
  const evidenceRefs = normalizeEvidenceRefs(candidate.evidenceRefs);

  return deepFreeze({
    candidateId,
    caseId,
    candidateRef,
    ...(supersedesCandidateRef === undefined ? {} : { supersedesCandidateRef }),
    assessmentId,
    scopeRef,
    classificationBasisRef,
    payload,
    evidenceRefs
  });
}

function normalizePayload(value: unknown): SemanticCandidatePayload {
  if (!isPlainObject(value)) throw new Error("INVALID_CANDIDATE_PAYLOAD");
  try {
    assertCanonicalJson(value, new Set<object>());
    return deepFreeze(cloneJson(value)) as SemanticCandidatePayload;
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CANDIDATE_PAYLOAD") throw error;
    throw new Error("INVALID_CANDIDATE_PAYLOAD");
  }
}

function assertCanonicalJson(value: unknown, active: Set<object>): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("INVALID_CANDIDATE_PAYLOAD");
    return;
  }
  if (typeof value !== "object") throw new Error("INVALID_CANDIDATE_PAYLOAD");
  const object = value as object;
  if (active.has(object)) throw new Error("INVALID_CANDIDATE_PAYLOAD");
  active.add(object);
  try {
    if (Array.isArray(value)) {
      for (const child of value) assertCanonicalJson(child, active);
      return;
    }
    if (!isPlainObject(value)) throw new Error("INVALID_CANDIDATE_PAYLOAD");
    for (const child of Object.values(value)) assertCanonicalJson(child, active);
  } finally {
    active.delete(object);
  }
}

function normalizeEvidenceRefs(value: readonly EvidenceRef[]): readonly EvidenceRef[] {
  if (!Array.isArray(value)) throw new Error("INVALID_CANDIDATE_EVIDENCE");
  return Object.freeze(value.map((entry) => normalizeEvidenceRef(entry)));
}

function normalizeEvidenceRef(value: unknown): EvidenceRef {
  if (typeof value !== "object" || value === null) throw new Error("INVALID_CANDIDATE_EVIDENCE");
  const ref = value as Record<string, unknown>;
  if (ref.refType !== "EVIDENCE") throw new Error("INVALID_CANDIDATE_EVIDENCE");
  const id = requireNonEmptyString(ref.id, "evidence.id", "INVALID_CANDIDATE_EVIDENCE");
  const digest =
    ref.digest === undefined
      ? undefined
      : requireNonEmptyString(ref.digest, "evidence.digest", "INVALID_CANDIDATE_EVIDENCE");
  return Object.freeze({ refType: "EVIDENCE" as const, id, ...(digest === undefined ? {} : { digest }) });
}

function requireNonEmptyString(value: unknown, field: string, code = "INVALID_CANDIDATE"): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${code}:${field}`);
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(",")}}`;
}

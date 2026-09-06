import { basisRefFrom, basisRefKey, equalBasisRef } from "./basis.js";
import type { ImmutablePutResult } from "./controlStore.js";
import type {
  EvidenceRef,
  ImmutableRevisionRef,
  SemanticCandidate,
  SemanticCandidatePayload,
  SemanticCandidateRecordV2
} from "./model.js";
import { normalizeSemanticCandidateRecordV2 } from "./model.js";

export interface SemanticCandidateStore {
  putCandidate(candidate: SemanticCandidate): ImmutablePutResult;
  getCandidate(candidateRef: ImmutableRevisionRef): SemanticCandidate | undefined;
  putCandidateV2(candidate: SemanticCandidateRecordV2, expectedCandidateRef?: ImmutableRevisionRef | null): ImmutablePutResult;
  getCandidateV2(candidateRef: ImmutableRevisionRef): SemanticCandidateRecordV2 | undefined;
  getCandidateHead(candidateId: string): ImmutableRevisionRef | undefined;
  getCurrentCandidateHead(candidateId: string): ImmutableRevisionRef | undefined;
  prepareCandidatePublication(candidate: SemanticCandidateRecordV2, expectedCandidateRef?: ImmutableRevisionRef | null): PreparedCandidatePublication;
}

export interface PreparedCandidatePublication {
  commit(): void;
  abort(): void;
}

type StoredCandidate = Readonly<{ canonical: string; value: SemanticCandidate }>;

export class InMemorySemanticCandidateStore implements SemanticCandidateStore {
  readonly #candidates = new Map<string, StoredCandidate>();
  readonly #candidatesV2 = new Map<string, Readonly<{ canonical: string; value: SemanticCandidateRecordV2 }>>();
  readonly #heads = new Map<string, ImmutableRevisionRef>();
  #reservation: object | undefined;
  readonly getCurrentCandidateHead = (candidateId: string): ImmutableRevisionRef | undefined => this.getCandidateHead(candidateId);

  putCandidate(candidate: SemanticCandidate): ImmutablePutResult {
    const normalized = normalizeCandidate(candidate);
    const key = basisRefKey(normalized.candidateRef);
    const canonical = canonicalJson(normalized);
    const existing = this.#candidates.get(key);
    const existingV2 = this.#candidatesV2.get(key);
    if (existingV2 !== undefined) throw new Error(`IMMUTABLE_CANDIDATE_CONFLICT:${key}`);
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

  putCandidateV2(candidate: SemanticCandidateRecordV2, expectedCandidateRef: ImmutableRevisionRef | null = null): ImmutablePutResult {
    const normalizedBefore = normalizeCandidateV2(candidate);
    const hadExisting = this.#candidatesV2.has(basisRefKey(normalizedBefore.candidateRef));
    const prepared = this.prepareCandidatePublication(candidate, expectedCandidateRef);
    prepared.commit();
    return hadExisting ? "IDEMPOTENT" : "CREATED";
  }

  getCandidateV2(candidateRef: ImmutableRevisionRef): SemanticCandidateRecordV2 | undefined {
    const ref = normalizeCandidateRef(candidateRef);
    return this.#candidatesV2.get(basisRefKey(ref))?.value;
  }

  getCandidateHead(candidateId: string): ImmutableRevisionRef | undefined {
    const id = requireNonEmptyString(candidateId, "candidateId");
    const ref = this.#heads.get(id);
    return ref === undefined ? undefined : deepFreeze(cloneJson(ref));
  }

  prepareCandidatePublication(candidate: SemanticCandidateRecordV2, expectedCandidateRef: ImmutableRevisionRef | null = null): PreparedCandidatePublication {
    if (this.#reservation !== undefined) throw new Error("CANDIDATE_PUBLICATION_RESERVED");
    const normalized = normalizeCandidateV2(candidate);
    const expected = expectedCandidateRef === undefined ? null : (expectedCandidateRef === null ? null : normalizeCandidateRef(expectedCandidateRef));
    const current = this.#heads.get(normalized.candidateId);
    const key = basisRefKey(normalized.candidateRef);
    const canonical = canonicalJson(normalized);
    const existingV2 = this.#candidatesV2.get(key);
    const existingV1 = this.#candidates.get(key);
    if (existingV1 !== undefined && existingV1.canonical !== canonical) throw new Error(`IMMUTABLE_CANDIDATE_CONFLICT:${key}`);
    if (existingV2 !== undefined) {
      if (existingV2.canonical !== canonical) throw new Error(`IMMUTABLE_CANDIDATE_CONFLICT:${key}`);
      if (current === undefined || !equalBasisRef(current, normalized.candidateRef)) throw new Error("CANDIDATE_HEAD_CONFLICT");
      if (expected !== null && !equalBasisRef(current, expected)) throw new Error("CANDIDATE_HEAD_CONFLICT");
      return { commit: () => {}, abort: () => {} };
    }
    if (expected === null) {
      if (current !== undefined) throw new Error("CANDIDATE_HEAD_CONFLICT");
      if (normalized.supersedesCandidateRef !== undefined) throw new Error("CANDIDATE_HEAD_CONFLICT");
    } else {
      if (current === undefined || !equalBasisRef(current, expected)) throw new Error("CANDIDATE_HEAD_CONFLICT");
      if (normalized.supersedesCandidateRef === undefined || !equalBasisRef(normalized.supersedesCandidateRef, expected)) {
        throw new Error("CANDIDATE_SUPERSESSION_CONFLICT");
      }
      const predecessor = this.#candidatesV2.get(basisRefKey(expected))?.value;
      if (predecessor === undefined || predecessor.provenance.route !== normalized.provenance.route) {
        throw new Error("CANDIDATE_LINEAGE_CONFLICT");
      }
      if (predecessor.provenance.route === "BOUND_EXISTING" && normalized.provenance.route === "BOUND_EXISTING" &&
          predecessor.provenance.reconstructionCaseId !== normalized.provenance.reconstructionCaseId) {
        throw new Error("CANDIDATE_LINEAGE_CONFLICT");
      }
    }
    const token = {};
    this.#reservation = token;
    let active = true;
    return {
      commit: () => {
        if (!active || this.#reservation !== token) return;
        active = false;
        this.#candidatesV2.set(key, Object.freeze({ canonical, value: normalized }));
        this.#heads.set(normalized.candidateId, normalized.candidateRef);
        this.#reservation = undefined;
      },
      abort: () => {
        if (!active || this.#reservation !== token) return;
        active = false;
        this.#reservation = undefined;
      }
    };
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

function normalizeCandidateV2(candidate: SemanticCandidateRecordV2): SemanticCandidateRecordV2 {
  const normalized = normalizeSemanticCandidateRecordV2(candidate);
  if (normalized.provenance.route !== "BOUND_EXISTING") return normalized;
  if (normalized.provenance.basisSelectionRef.subject !== normalized.provenance.reconstructionCaseId) {
    throw new Error("INVALID_CANDIDATE_LINEAGE");
  }
  if (normalized.supersedesCandidateRef !== undefined && equalBasisRef(normalized.supersedesCandidateRef, normalized.candidateRef)) {
    throw new Error("INVALID_CANDIDATE_SUPERSESSION:self");
  }
  return normalized;
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

import { basisRefFrom, basisRefKey, equalBasisRef } from "./basis.js";
import {
  authorityRefFrom,
  canonicalSemanticPathFrom,
  semanticAuthorityKeyFrom
} from "./authorityIdentity.js";
import type {
  CanonicalJsonValue,
  EvidenceRef,
  ImmutableRevisionRef,
  SemanticAuthorityKey,
  SemanticAuthorityRecord,
  SemanticCandidatePayload
} from "./model.js";

export interface AuthorityMutationRequest {
  readonly operationId: string;
  readonly record: SemanticAuthorityRecord;
  readonly expectedAuthorityHead: ImmutableRevisionRef | null;
  readonly canonicalPayload: SemanticCandidatePayload;
}

export interface AuthorityMutationResult {
  readonly status: "CREATED" | "IDEMPOTENT";
  readonly authority: SemanticAuthorityRecord;
}

export interface SemanticAuthorityRepository {
  getCurrentAuthority(authorityKey: SemanticAuthorityKey): SemanticAuthorityRecord | undefined;
  getAuthority(authorityRef: ImmutableRevisionRef): SemanticAuthorityRecord | undefined;
  getCanonicalSource(path: string): SemanticCandidatePayload | undefined;
  publishAuthority(request: AuthorityMutationRequest): AuthorityMutationResult;
}

export interface InMemorySemanticAuthorityRepositoryOptions {
  readonly beforePublish?: () => void;
}

type StoredAuthority = Readonly<{ canonical: string; value: SemanticAuthorityRecord }>;
type StoredOperation = Readonly<{
  canonical: string;
  result: AuthorityMutationResult;
}>;

interface RepositoryState {
  readonly records: Map<string, StoredAuthority>;
  readonly heads: Map<SemanticAuthorityKey, SemanticAuthorityRecord>;
  readonly sources: Map<string, SemanticCandidatePayload>;
  readonly pathOwners: Map<string, SemanticAuthorityKey>;
  readonly operations: Map<string, StoredOperation>;
}

export class InMemorySemanticAuthorityRepository implements SemanticAuthorityRepository {
  readonly #beforePublish: (() => void) | undefined;
  #state: RepositoryState = emptyState();

  constructor(options: InMemorySemanticAuthorityRepositoryOptions = {}) {
    this.#beforePublish = options.beforePublish;
  }

  getCurrentAuthority(authorityKey: SemanticAuthorityKey): SemanticAuthorityRecord | undefined {
    return this.#state.heads.get(semanticAuthorityKeyFrom(authorityKey));
  }

  getAuthority(authorityRef: ImmutableRevisionRef): SemanticAuthorityRecord | undefined {
    const ref = basisRefFrom(authorityRef);
    if (ref.namespace !== "semantic-authority") throw new Error("INVALID_AUTHORITY_REF");
    return this.#state.records.get(basisRefKey(ref))?.value;
  }

  getCanonicalSource(path: string): SemanticCandidatePayload | undefined {
    return this.#state.sources.get(canonicalSemanticPathFrom(path));
  }

  publishAuthority(request: AuthorityMutationRequest): AuthorityMutationResult {
    const normalized = normalizeMutation(request);
    const operationCanonical = canonicalJson(normalized);
    const priorOperation = this.#state.operations.get(normalized.operationId);
    if (priorOperation !== undefined) {
      if (priorOperation.canonical !== operationCanonical) {
        throw new Error(`AUTHORITY_OPERATION_CONFLICT:${normalized.operationId}`);
      }
      return Object.freeze({ status: "IDEMPOTENT" as const, authority: priorOperation.result.authority });
    }

    const authorityRefKey = basisRefKey(normalized.record.authorityRef);
    const recordCanonical = canonicalJson(normalized.record);
    const existingRecord = this.#state.records.get(authorityRefKey);
    if (existingRecord !== undefined) {
      if (existingRecord.canonical !== recordCanonical) {
        throw new Error(`IMMUTABLE_AUTHORITY_CONFLICT:${authorityRefKey}`);
      }
      throw new Error(`AUTHORITY_REF_ALREADY_EXISTS:${authorityRefKey}`);
    }

    const current = this.#state.heads.get(normalized.record.authorityKey);
    if (normalized.expectedAuthorityHead === null) {
      if (current !== undefined) throw new Error("AUTHORITY_HEAD_CONFLICT");
    } else if (current === undefined || !equalBasisRef(current.authorityRef, normalized.expectedAuthorityHead)) {
      throw new Error("AUTHORITY_HEAD_CONFLICT");
    }

    const path = normalized.record.sourceBinding.path;
    const owner = this.#state.pathOwners.get(path);
    if (owner !== undefined && owner !== normalized.record.authorityKey) {
      throw new Error(`AUTHORITY_PATH_CONFLICT:${path}`);
    }

    const records = new Map(this.#state.records);
    const heads = new Map(this.#state.heads);
    const sources = new Map(this.#state.sources);
    const pathOwners = new Map(this.#state.pathOwners);
    const operations = new Map(this.#state.operations);

    if (current !== undefined && current.sourceBinding.path !== path) {
      if (pathOwners.get(current.sourceBinding.path) === normalized.record.authorityKey) {
        pathOwners.delete(current.sourceBinding.path);
        sources.delete(current.sourceBinding.path);
      }
    }

    records.set(authorityRefKey, Object.freeze({ canonical: recordCanonical, value: normalized.record }));
    heads.set(normalized.record.authorityKey, normalized.record);
    sources.set(path, normalized.canonicalPayload);
    pathOwners.set(path, normalized.record.authorityKey);
    const result = Object.freeze({ status: "CREATED" as const, authority: normalized.record });
    operations.set(normalized.operationId, Object.freeze({ canonical: operationCanonical, result }));

    this.#beforePublish?.();
    this.#state = Object.freeze({ records, heads, sources, pathOwners, operations });
    return result;
  }
}

function emptyState(): RepositoryState {
  return Object.freeze({
    records: new Map(),
    heads: new Map(),
    sources: new Map(),
    pathOwners: new Map(),
    operations: new Map()
  });
}

function normalizeMutation(request: AuthorityMutationRequest): AuthorityMutationRequest {
  if (typeof request !== "object" || request === null) throw new Error("INVALID_AUTHORITY_MUTATION");
  const operationId = requireNonEmptyString(request.operationId, "operationId");
  if (typeof request.record !== "object" || request.record === null) {
    throw new Error("INVALID_AUTHORITY_RECORD");
  }
  const authorityKey = semanticAuthorityKeyFrom(request.record.authorityKey);
  const authorityRef = authorityRefFrom(authorityKey, request.record.authorityRef);
  const recordOperationId = requireNonEmptyString(request.record.operationId, "record.operationId");
  if (recordOperationId !== operationId) throw new Error("AUTHORITY_OPERATION_ID_MISMATCH");
  const path = canonicalSemanticPathFrom(request.record.sourceBinding?.path);
  const payload = normalizePayload(request.canonicalPayload);
  const expectedDigest = canonicalPayloadDigest(payload);
  if (request.record.sourceBinding?.payloadDigest !== expectedDigest) {
    throw new Error("AUTHORITY_PAYLOAD_DIGEST_MISMATCH");
  }
  const expectedAuthorityHead =
    request.expectedAuthorityHead === null
      ? null
      : authorityRefFrom(authorityKey, request.expectedAuthorityHead);
  const supersedesAuthorityRef =
    request.record.supersedesAuthorityRef === undefined
      ? undefined
      : authorityRefFrom(authorityKey, request.record.supersedesAuthorityRef);
  if (expectedAuthorityHead === null && supersedesAuthorityRef !== undefined) {
    throw new Error("INVALID_AUTHORITY_SUPERSESSION");
  }
  if (
    expectedAuthorityHead !== null &&
    (supersedesAuthorityRef === undefined || !equalBasisRef(expectedAuthorityHead, supersedesAuthorityRef))
  ) {
    throw new Error("INVALID_AUTHORITY_SUPERSESSION");
  }

  const candidateRef = basisRefFrom(request.record.candidateRef);
  if (candidateRef.namespace !== "semantic-candidate") throw new Error("INVALID_AUTHORITY_CANDIDATE_REF");
  const scopeRef = basisRefFrom(request.record.scopeRef);
  const classificationBasisRef = basisRefFrom(request.record.classificationBasisRef);
  const evidenceRefs = normalizeEvidenceRefs(request.record.evidenceRefs);
  const record = deepFreeze({
    authorityKey,
    authorityRef,
    operationId,
    caseId: requireNonEmptyString(request.record.caseId, "caseId"),
    assessmentId: requireNonEmptyString(request.record.assessmentId, "assessmentId"),
    candidateRef,
    reviewId: requireNonEmptyString(request.record.reviewId, "reviewId"),
    scopeRef,
    classificationBasisRef,
    sourceBinding: Object.freeze({ path, payloadDigest: expectedDigest }),
    ...(supersedesAuthorityRef === undefined ? {} : { supersedesAuthorityRef }),
    evidenceRefs
  });
  return deepFreeze({ operationId, record, expectedAuthorityHead, canonicalPayload: payload });
}

function normalizePayload(value: unknown): SemanticCandidatePayload {
  if (!isPlainObject(value)) throw new Error("INVALID_AUTHORITY_PAYLOAD");
  assertCanonicalJson(value, new Set());
  return deepFreeze(canonicalize(value)) as SemanticCandidatePayload;
}

export function canonicalPayloadDigest(payload: SemanticCandidatePayload): string {
  return `sha256:${sha256(canonicalJson(payload))}`;
}

function normalizeEvidenceRefs(value: readonly EvidenceRef[]): readonly EvidenceRef[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("INVALID_AUTHORITY_EVIDENCE");
  return Object.freeze(value.map((entry) => {
    if (typeof entry !== "object" || entry === null || entry.refType !== "EVIDENCE") {
      throw new Error("INVALID_AUTHORITY_EVIDENCE");
    }
    const id = requireNonEmptyString(entry.id, "evidence.id", "INVALID_AUTHORITY_EVIDENCE");
    const digest = entry.digest === undefined
      ? undefined
      : requireNonEmptyString(entry.digest, "evidence.digest", "INVALID_AUTHORITY_EVIDENCE");
    return Object.freeze({ refType: "EVIDENCE" as const, id, ...(digest === undefined ? {} : { digest }) });
  }));
}

function requireNonEmptyString(value: unknown, field: string, code = "INVALID_AUTHORITY_RECORD"): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${code}:${field}`);
  return value;
}

function assertCanonicalJson(value: unknown, active: Set<object>): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("INVALID_AUTHORITY_PAYLOAD");
    return;
  }
  if (typeof value !== "object") throw new Error("INVALID_AUTHORITY_PAYLOAD");
  if (active.has(value)) throw new Error("INVALID_AUTHORITY_PAYLOAD");
  active.add(value);
  try {
    if (Array.isArray(value)) {
      for (const child of value) assertCanonicalJson(child, active);
      return;
    }
    if (!isPlainObject(value)) throw new Error("INVALID_AUTHORITY_PAYLOAD");
    for (const child of Object.values(value)) assertCanonicalJson(child, active);
  } finally {
    active.delete(value);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalize(value: unknown): CanonicalJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return value as CanonicalJsonValue;
  }
  if (Array.isArray(value)) return Object.freeze(value.map((entry) => canonicalize(entry)));
  const output: Record<string, CanonicalJsonValue> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) {
    output[key] = canonicalize(child);
  }
  return Object.freeze(output);
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

function sha256(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const words: number[] = [];
  for (let index = 0; index < bytes.length; index += 1) {
    words[index >> 2] = (words[index >> 2] ?? 0) | bytes[index]! << (24 - (index % 4) * 8);
  }
  const bitLength = bytes.length * 8;
  words[bitLength >> 5] = (words[bitLength >> 5] ?? 0) | 0x80 << (24 - bitLength % 32);
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,];
  const schedule = new Array<number>(64);
  const rotateRight = (word: number, bits: number): number => word >>> bits | word << (32 - bits);

  for (let offset = 0; offset < words.length; offset += 16) {
    for (let index = 0; index < 64; index += 1) {
      if (index < 16) {
        schedule[index] = words[offset + index] ?? 0;
      } else {
        const left = schedule[index - 15]!;
        const right = schedule[index - 2]!;
        const sigma0 = rotateRight(left, 7) ^ rotateRight(left, 18) ^ left >>> 3;
        const sigma1 = rotateRight(right, 17) ^ rotateRight(right, 19) ^ right >>> 10;
        schedule[index] = (schedule[index - 16]! + sigma0 + schedule[index - 7]! + sigma1) | 0;
      }
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e!, 6) ^ rotateRight(e!, 11) ^ rotateRight(e!, 25);
      const choice = e! & f! ^ ~e! & g!;
      const temp1 = (h! + sum1 + choice + constants[index]! + schedule[index]!) | 0;
      const sum0 = rotateRight(a!, 2) ^ rotateRight(a!, 13) ^ rotateRight(a!, 22);
      const majority = a! & b! ^ a! & c! ^ b! & c!;
      const temp2 = (sum0 + majority) | 0;
      h = g;
      g = f;
      f = e;
      e = (d! + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    hash[0] = (hash[0]! + a!) | 0;
    hash[1] = (hash[1]! + b!) | 0;
    hash[2] = (hash[2]! + c!) | 0;
    hash[3] = (hash[3]! + d!) | 0;
    hash[4] = (hash[4]! + e!) | 0;
    hash[5] = (hash[5]! + f!) | 0;
    hash[6] = (hash[6]! + g!) | 0;
    hash[7] = (hash[7]! + h!) | 0;
  }
  return hash.map((word) => (word >>> 0).toString(16).padStart(8, "0")).join("");
}

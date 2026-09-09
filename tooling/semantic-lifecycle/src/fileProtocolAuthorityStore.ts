import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { equalBasisRef } from "./basis.js";
import type { CanonicalJsonValue, ImmutableRevisionRef } from "./model.js";
import type { ProtocolAuthorityCommitRequest, ProtocolAuthorityCommitResult, ProtocolAuthorityMutationOutcome, ProtocolAuthorityMutationPort, ProtocolAuthorityOutcomeQuery } from "./protocolAuthorityMutationPort.js";

interface AuthorityEntry { readonly ref: ImmutableRevisionRef; readonly payload: CanonicalJsonValue; }
interface AppliedOperation { readonly request: ProtocolAuthorityCommitRequest; readonly result: ProtocolAuthorityCommitResult; }
interface ProtocolStoreState {
  readonly schemaVersion: 1;
  readonly heads: Record<string, AuthorityEntry>;
  readonly operations: Record<string, AppliedOperation>;
  readonly adoptedCases: Record<string, string>;
  mutationCount: number;
}

export interface InitialProtocolAuthority {
  readonly key: string;
  readonly ref: ImmutableRevisionRef;
  readonly payload: CanonicalJsonValue;
}

export class FileProtocolAuthorityStore implements ProtocolAuthorityMutationPort {
  constructor(private readonly path: string, initialAuthorities: readonly InitialProtocolAuthority[] = []) { this.initialize(initialAuthorities); }

  initialize(initialAuthorities: readonly InitialProtocolAuthority[] = []): void {
    mkdirSync(dirname(this.path), { recursive: true });
    if (!existsSync(this.path)) this.mutate((state) => {
      for (const entry of initialAuthorities) {
        validateAuthorityRef(entry.key, entry.ref);
        if (state.heads[entry.key] !== undefined) throw new Error("DUPLICATE_INITIAL_PROTOCOL_AUTHORITY");
        state.heads[entry.key] = { ref: clone(entry.ref), payload: canonicalValue(entry.payload) };
      }
    });
  }

  getCurrent(key: string): AuthorityEntry | undefined { return clone(this.read().heads[key]); }
  getCurrentHead(key: string): ImmutableRevisionRef | null { return clone(this.read().heads[key]?.ref ?? null); }
  getMutationCount(): number { return this.read().mutationCount; }

  commit(input: ProtocolAuthorityCommitRequest): ProtocolAuthorityCommitResult {
    const request = normalizeRequest(input);
    return this.mutate((state) => {
      const prior = state.operations[request.operationId];
      if (prior !== undefined) {
        if (canonicalJson(prior.request) !== canonicalJson(request)) throw new Error("OPERATION_ID_CONFLICT");
        return { ...clone(prior.result), status: "IDEMPOTENT" as const };
      }
      const priorCaseOperation = state.adoptedCases[request.protocolAdoptionCaseId];
      if (priorCaseOperation !== undefined) throw new Error("PROTOCOL_ADOPTION_ALREADY_APPLIED");
      const current = state.heads[request.protocolAuthorityKey]?.ref ?? null;
      if (!sameNullableRef(current, request.expectedProtocolAuthorityHead)) throw new Error("PROTOCOL_AUTHORITY_HEAD_CONFLICT");
      const digest = createHash("sha256").update(canonicalJson(request)).digest("hex");
      const resultingProtocolAuthorityRef: ImmutableRevisionRef = {
        refType: "IMMUTABLE_REVISION",
        namespace: "protocol-authority",
        subject: request.protocolAuthorityKey,
        revision: digest,
        digest: `sha256:${digest}`
      };
      const result: ProtocolAuthorityCommitResult = {
        status: "APPLIED",
        resultingProtocolAuthorityRef,
        prospectiveProtocolBasisRef: request.prospectiveProtocolBasisRef,
        payload: request.payload
      };
      state.heads[request.protocolAuthorityKey] = { ref: resultingProtocolAuthorityRef, payload: request.payload };
      state.operations[request.operationId] = { request, result };
      state.adoptedCases[request.protocolAdoptionCaseId] = request.operationId;
      state.mutationCount += 1;
      return result;
    });
  }

  queryOutcome(query: ProtocolAuthorityOutcomeQuery): ProtocolAuthorityMutationOutcome {
    const state = this.read();
    const prior = state.operations[query.operationId];
    if (prior === undefined) {
      return state.adoptedCases[query.protocolAdoptionCaseId] === undefined ? { status: "NOT_APPLIED" } : { status: "APPLIED_CONFLICT" };
    }
    if (prior.request.protocolAdoptionCaseId !== query.protocolAdoptionCaseId || prior.request.commandDigest !== query.commandDigest) return { status: "APPLIED_CONFLICT" };
    return {
      status: "APPLIED_EXACT",
      resultingProtocolAuthorityRef: clone(prior.result.resultingProtocolAuthorityRef),
      prospectiveProtocolBasisRef: clone(prior.result.prospectiveProtocolBasisRef),
      payload: clone(prior.result.payload)
    };
  }

  private read(): ProtocolStoreState {
    if (!existsSync(this.path)) return emptyState();
    const value = JSON.parse(readFileSync(this.path, "utf8")) as ProtocolStoreState;
    if (value.schemaVersion !== 1) throw new Error("UNSUPPORTED_PROTOCOL_STORE_VERSION");
    return value;
  }

  private mutate<T>(action: (state: ProtocolStoreState) => T): T {
    mkdirSync(dirname(this.path), { recursive: true });
    const lockPath = `${this.path}.lock`;
    let lock: number;
    try { lock = openSync(lockPath, "wx", 0o600); } catch { throw new Error("PROTOCOL_STORE_LOCK_UNAVAILABLE"); }
    try {
      const state = this.read();
      const result = action(state);
      writeDurable(this.path, state);
      return clone(result);
    } finally { closeSync(lock); unlinkSync(lockPath); }
  }
}

function emptyState(): ProtocolStoreState { return { schemaVersion: 1, heads: {}, operations: {}, adoptedCases: {}, mutationCount: 0 }; }
function normalizeRequest(value: ProtocolAuthorityCommitRequest): ProtocolAuthorityCommitRequest {
  if (!value || typeof value !== "object" || !value.protocolAuthorityKey?.trim() || !value.protocolAdoptionCaseId?.trim() || !value.operationId?.trim() || !value.commandDigest?.trim()) throw new Error("INVALID_PROTOCOL_MUTATION");
  if (value.expectedProtocolAuthorityHead !== null) validateAuthorityRef(value.protocolAuthorityKey, value.expectedProtocolAuthorityHead);
  if (value.prospectiveProtocolBasisRef.namespace !== "prospective-protocol-basis") throw new Error("INVALID_PROSPECTIVE_PROTOCOL_BASIS");
  return clone({ ...value, payload: canonicalValue(value.payload) });
}
function validateAuthorityRef(key: string, ref: ImmutableRevisionRef): void { if (ref.refType !== "IMMUTABLE_REVISION" || ref.namespace !== "protocol-authority" || ref.subject !== key || !ref.revision?.trim()) throw new Error("INVALID_PROTOCOL_AUTHORITY_REF"); }
function sameNullableRef(left: ImmutableRevisionRef | null, right: ImmutableRevisionRef | null): boolean { return left === null || right === null ? left === right : equalBasisRef(left, right); }
function canonicalValue(value: unknown): CanonicalJsonValue { if (value === null || typeof value === "string" || typeof value === "boolean") return value as CanonicalJsonValue; if (typeof value === "number" && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value; if (Array.isArray(value)) return value.map(canonicalValue); if (!value || typeof value !== "object") throw new Error("INVALID_CANONICAL_VALUE"); return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue((value as Record<string, unknown>)[key])])) as CanonicalJsonValue; }
function canonicalJson(value: unknown): string { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`; return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`; }
function clone<T>(value: T): T { return value === undefined ? value : structuredClone(value); }
function writeDurable(path: string, state: ProtocolStoreState): void { const temp = `${path}.tmp-${process.pid}`; writeFileSync(temp, `${canonicalJson(state)}\n`, { mode: 0o600 }); const fd = openSync(temp, "r"); try { fsyncSync(fd); } finally { closeSync(fd); } renameSync(temp, path); const dir = openSync(dirname(path), "r"); try { fsyncSync(dir); } finally { closeSync(dir); } }

import { basisRefKey, equalBasisRef } from "./basis.js";
import type { CanonicalJsonValue, ProspectiveProtocolBasisRef } from "./model.js";

export interface ProspectiveProtocolBasisSnapshot {
  readonly ref: ProspectiveProtocolBasisRef;
  readonly payload: CanonicalJsonValue;
}

export interface ProspectiveProtocolBasisProvider {
  resolve(ref: ProspectiveProtocolBasisRef): ProspectiveProtocolBasisSnapshot;
  getCurrentRef(): ProspectiveProtocolBasisRef;
  withCurrentFence<T>(expected: ProspectiveProtocolBasisRef, action: (snapshot: ProspectiveProtocolBasisSnapshot) => T): T;
}

export class InMemoryProspectiveProtocolBasisProvider implements ProspectiveProtocolBasisProvider {
  readonly #values = new Map<string, ProspectiveProtocolBasisSnapshot>();
  #current: ProspectiveProtocolBasisRef;
  #fenced = false;

  constructor(values: readonly ProspectiveProtocolBasisSnapshot[], current: ProspectiveProtocolBasisRef) {
    for (const value of values) this.register(value);
    this.#current = exactRef(current);
    this.resolve(this.#current);
  }

  register(input: ProspectiveProtocolBasisSnapshot): void {
    if (this.#fenced) throw new Error("TOCTOU_FENCE_UNAVAILABLE");
    const value = Object.freeze({ ref: exactRef(input.ref), payload: canonicalValue(input.payload) });
    const key = basisRefKey(value.ref);
    const prior = this.#values.get(key);
    if (prior !== undefined && canonicalJson(prior) !== canonicalJson(value)) throw new Error("IMMUTABLE_RECORD_CONFLICT");
    this.#values.set(key, value);
  }

  setCurrent(ref: ProspectiveProtocolBasisRef): void {
    if (this.#fenced) throw new Error("TOCTOU_FENCE_UNAVAILABLE");
    this.resolve(ref);
    this.#current = exactRef(ref);
  }

  getCurrentRef(): ProspectiveProtocolBasisRef { return exactRef(this.#current); }

  resolve(ref: ProspectiveProtocolBasisRef): ProspectiveProtocolBasisSnapshot {
    const exact = exactRef(ref);
    const value = this.#values.get(basisRefKey(exact));
    if (value === undefined) throw new Error("STALE_PROSPECTIVE_PROTOCOL_BASIS");
    return structuredClone(value);
  }

  withCurrentFence<T>(expected: ProspectiveProtocolBasisRef, action: (snapshot: ProspectiveProtocolBasisSnapshot) => T): T {
    if (this.#fenced || !equalBasisRef(this.#current, expected)) throw new Error("TOCTOU_FENCE_UNAVAILABLE");
    this.#fenced = true;
    try { return action(this.resolve(expected)); }
    finally { this.#fenced = false; }
  }
}

function exactRef(ref: ProspectiveProtocolBasisRef): ProspectiveProtocolBasisRef {
  if (ref?.refType !== "IMMUTABLE_REVISION" || ref.namespace !== "prospective-protocol-basis" || !ref.subject?.trim() || !ref.revision?.trim()) throw new Error("INVALID_RECORD:ref-identity");
  return Object.freeze({ ...ref });
}

function canonicalValue(value: unknown): CanonicalJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value as CanonicalJsonValue;
  if (typeof value === "number" && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value;
  if (Array.isArray(value)) return Object.freeze(value.map(canonicalValue));
  if (typeof value !== "object" || value === null) throw new Error("INVALID_CANONICAL_VALUE");
  return Object.freeze(Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue((value as Record<string, unknown>)[key])]))) as CanonicalJsonValue;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

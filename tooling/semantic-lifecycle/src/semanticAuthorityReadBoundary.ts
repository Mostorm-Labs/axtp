import { basisRefKey, equalBasisRef } from "./basis.js";
import type { ImmutableRevisionRef, SemanticAuthorityRecordV2 } from "./model.js";
import type { SemanticAuthorityRepository } from "./authorityRepository.js";

export interface SemanticAuthorityReadBoundary {
  assertCurrent(expected: ImmutableRevisionRef): void;
  withPublicationFence<T>(expected: ImmutableRevisionRef, action: () => T): T;
}

export class InMemorySemanticAuthorityReadBoundary implements SemanticAuthorityReadBoundary {
  readonly #records = new Map<string, { key: string; ref: ImmutableRevisionRef }>();
  readonly #heads = new Map<string, ImmutableRevisionRef>();
  readonly #fenced = new Set<string>();

  publish(key: string, ref: ImmutableRevisionRef): void {
    if (this.#fenced.has(key)) throw new Error("TOCTOU_FENCE_UNAVAILABLE");
    const exact = clone(ref);
    this.#records.set(basisRefKey(exact), { key, ref: exact });
    this.#heads.set(key, exact);
  }

  assertCurrent(expected: ImmutableRevisionRef): void {
    const record = this.#records.get(basisRefKey(expected));
    const current = record === undefined ? undefined : this.#heads.get(record.key);
    if (record === undefined || current === undefined || !equalBasisRef(current, expected)) throw new Error("STALE_SEMANTIC_AUTHORITY");
  }

  withPublicationFence<T>(expected: ImmutableRevisionRef, action: () => T): T {
    const record = this.#records.get(basisRefKey(expected));
    this.assertCurrent(expected);
    if (record === undefined || this.#fenced.has(record.key)) throw new Error("TOCTOU_FENCE_UNAVAILABLE");
    this.#fenced.add(record.key);
    try { return action(); }
    finally { this.#fenced.delete(record.key); }
  }
}

export class RepositorySemanticAuthorityReadBoundary implements SemanticAuthorityReadBoundary {
  constructor(private readonly repository: SemanticAuthorityRepository) {}
  assertCurrent(expected: ImmutableRevisionRef): void {
    const record = this.repository.getAuthorityV2(expected);
    const current = record === undefined ? undefined : this.repository.getCurrentAuthorityV2(record.authorityKey)?.authorityRef;
    if (record === undefined || current === undefined || !equalBasisRef(current, expected)) throw new Error("STALE_SEMANTIC_AUTHORITY");
  }
  withPublicationFence<T>(expected: ImmutableRevisionRef, action: () => T): T {
    const record = this.repository.getAuthorityV2(expected);
    if (record === undefined) throw new Error("STALE_SEMANTIC_AUTHORITY");
    return this.repository.withCurrentAuthorityFenceV2(record.authorityKey, expected, action);
  }
}

function clone<T>(value: T): T { return structuredClone(value); }

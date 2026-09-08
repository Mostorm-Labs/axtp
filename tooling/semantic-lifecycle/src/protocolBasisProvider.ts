import {
  normalizeAdoptedProtocolBasis,
  type AdoptedProtocolBasis,
  type EvidenceRef,
  type ImmutableRevisionRef,
} from "./model.js";
import { basisRefKey } from "./basis.js";

/** Deterministic observation points required by P20's publication-fence oracle. */
export type PublicationFenceHook =
  | "beforeInitialRead"
  | "afterInitialReadBeforeValidation"
  | "afterEvidenceValidationBeforePrepare"
  | "afterPrepareBeforeLinearization"
  | "atFenceValidation"
  | "afterSuccessfulLinearization";

export const PublicationFenceHooks: Readonly<Record<PublicationFenceHook, PublicationFenceHook>> = Object.freeze({
  beforeInitialRead: "beforeInitialRead",
  afterInitialReadBeforeValidation: "afterInitialReadBeforeValidation",
  afterEvidenceValidationBeforePrepare: "afterEvidenceValidationBeforePrepare",
  afterPrepareBeforeLinearization: "afterPrepareBeforeLinearization",
  atFenceValidation: "atFenceValidation",
  afterSuccessfulLinearization: "afterSuccessfulLinearization",
});

export type PublicationFenceHookHandler = () => void;

export interface ProtocolBasisProvider {
  /** Read the exact currently adopted Protocol basis. This is a detached immutable value. */
  readAdoptedBasis(): AdoptedProtocolBasis;

  /**
   * Run one synchronous publication unit while the exact expected basis is fenced.
   * The action is not allowed to return a Promise: the fence cannot span async work.
   */
  withPublicationFence<T>(expectedBasis: AdoptedProtocolBasis, action: () => T): T;
}

export class ProtocolBasisUnavailableError extends Error {
  readonly code = "PROTOCOL_BASIS_UNAVAILABLE" as const;

  constructor(message = "PROTOCOL_BASIS_UNAVAILABLE") {
    super(message);
    this.name = "ProtocolBasisUnavailableError";
  }
}

export class ProtocolBasisDriftError extends Error {
  readonly code = "PROTOCOL_BASIS_DRIFT" as const;

  constructor(message = "PROTOCOL_BASIS_DRIFT") {
    super(message);
    this.name = "ProtocolBasisDriftError";
  }
}

export interface InMemoryProtocolBasisProviderOptions {
  readonly hooks?: Partial<Record<PublicationFenceHook, PublicationFenceHookHandler>>;
  /** Optional convenience aliases for fixture construction. */
  readonly basis?: AdoptedProtocolBasis | null;
  readonly adoptedBasis?: AdoptedProtocolBasis | null;
  readonly available?: boolean;
}

type BasisInput = AdoptedProtocolBasis | null | undefined;

function cloneBasis(value: AdoptedProtocolBasis): AdoptedProtocolBasis {
  // normalizeAdoptedProtocolBasis performs strict validation and deep canonical freezing.
  return normalizeAdoptedProtocolBasis(value);
}

function equalEvidence(left: readonly EvidenceRef[], right: readonly EvidenceRef[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) {
    const a = left[index]!;
    const b = right[index]!;
    if (a.refType !== b.refType || a.id !== b.id || a.digest !== b.digest) return false;
  }
  return true;
}

function equalBasis(left: AdoptedProtocolBasis, right: AdoptedProtocolBasis): boolean {
  return basisRefKey(left.protocolAuthorityRef as ImmutableRevisionRef) ===
      basisRefKey(right.protocolAuthorityRef as ImmutableRevisionRef) &&
    equalEvidence(left.adoptionEvidenceRefs, right.adoptionEvidenceRefs);
}

/**
 * Deterministic in-memory ProtocolBasisProvider used by integration/race fixtures.
 * `setAdoptedBasis` and hooks are fixture controls only; neither is part of the
 * read-only ProtocolBasisProvider contract consumed by production routes.
 */
export class InMemoryProtocolBasisProvider implements ProtocolBasisProvider {
  private adoptedBasis: AdoptedProtocolBasis | null;
  private hooks: Partial<Record<PublicationFenceHook, PublicationFenceHookHandler>>;

  constructor(
    initialBasisOrOptions?: BasisInput | InMemoryProtocolBasisProviderOptions,
    options: InMemoryProtocolBasisProviderOptions = {},
  ) {
    const looksLikeOptions = initialBasisOrOptions !== null &&
      typeof initialBasisOrOptions === "object" &&
      !("protocolAuthorityRef" in initialBasisOrOptions);
    const fixtureOptions = looksLikeOptions
      ? initialBasisOrOptions as InMemoryProtocolBasisProviderOptions
      : options;
    const configuredBasis = looksLikeOptions
      ? (fixtureOptions.adoptedBasis ?? fixtureOptions.basis)
      : initialBasisOrOptions as BasisInput;
    this.adoptedBasis = fixtureOptions.available === false || configuredBasis == null
      ? null
      : cloneBasis(configuredBasis);
    this.hooks = { ...(fixtureOptions.hooks ?? {}) };
  }

  readAdoptedBasis(): AdoptedProtocolBasis {
    this.invoke("beforeInitialRead");
    const basis = this.snapshot();
    this.invoke("afterInitialReadBeforeValidation");
    return basis;
  }

  withPublicationFence<T>(expectedBasis: AdoptedProtocolBasis, action: () => T): T {
    const expected = cloneBasis(expectedBasis);
    const initiallyObserved = this.readAdoptedBasis();
    if (!equalBasis(expected, initiallyObserved)) throw new ProtocolBasisDriftError();

    this.invoke("afterEvidenceValidationBeforePrepare");
    this.invoke("afterPrepareBeforeLinearization");
    this.invoke("atFenceValidation");

    const fenced = this.snapshotOrThrow();
    if (!equalBasis(expected, fenced)) throw new ProtocolBasisDriftError();

    const result = action();
    if (result !== null && typeof result === "object" && typeof (result as { then?: unknown }).then === "function") {
      throw new Error("PROTOCOL_FENCE_REQUIRES_SYNCHRONOUS_ACTION");
    }

    // The action's return is the publication linearization point. A change before
    // that point invalidates the attempt; a fixture hook after this check models a
    // change immediately after successful linearization and is therefore allowed.
    const afterAction = this.snapshotOrThrow();
    if (!equalBasis(expected, afterAction)) throw new ProtocolBasisDriftError();
    this.invoke("afterSuccessfulLinearization");
    return result;
  }

  /** Fixture-only control: replace the currently adopted basis or make it unavailable. */
  setAdoptedBasis(next: BasisInput): void {
    this.adoptedBasis = next == null ? null : cloneBasis(next);
  }

  /** Fixture-only control for deterministic P20 race points. */
  setHooks(hooks: Partial<Record<PublicationFenceHook, PublicationFenceHookHandler>>): void {
    this.hooks = { ...hooks };
  }

  setHook(hook: PublicationFenceHook, handler: PublicationFenceHookHandler | undefined): void {
    if (handler === undefined) delete this.hooks[hook];
    else this.hooks[hook] = handler;
  }

  clearHooks(): void {
    this.hooks = {};
  }

  private snapshot(): AdoptedProtocolBasis {
    return this.snapshotOrThrow();
  }

  private snapshotOrThrow(): AdoptedProtocolBasis {
    if (this.adoptedBasis === null) throw new ProtocolBasisUnavailableError();
    return cloneBasis(this.adoptedBasis);
  }

  private invoke(hook: PublicationFenceHook): void {
    this.hooks[hook]?.();
  }
}

export function createInMemoryProtocolBasisProvider(
  initialBasis?: BasisInput,
  options?: InMemoryProtocolBasisProviderOptions,
): InMemoryProtocolBasisProvider {
  return new InMemoryProtocolBasisProvider(initialBasis, options);
}

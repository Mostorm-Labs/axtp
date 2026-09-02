import type { BasisRef, ImmutableRevisionRef } from "./model.js";

const mutableRevisionTokens = new Set(["HEAD", "main", "master", "latest"]);

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`INVALID_IMMUTABLE_REF:${field}`);
  }
  return value;
}

function looksMutableRevision(value: string): boolean {
  return (
    mutableRevisionTokens.has(value) ||
    value.startsWith("refs/heads/") ||
    value.startsWith("pull/") ||
    /^PR[#/:]?\d+$/i.test(value)
  );
}

export function basisRefFrom(value: unknown): BasisRef {
  if (typeof value !== "object" || value === null) {
    throw new Error("INVALID_IMMUTABLE_REF:value");
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.refType !== "IMMUTABLE_REVISION") {
    throw new Error("INVALID_IMMUTABLE_REF:refType");
  }

  const namespace = requireNonEmptyString(candidate.namespace, "namespace");
  const subject = requireNonEmptyString(candidate.subject, "subject");
  const revision = requireNonEmptyString(candidate.revision, "revision");
  if (looksMutableRevision(revision)) {
    throw new Error("INVALID_IMMUTABLE_REF:mutable-revision");
  }

  let digest: string | undefined;
  if (candidate.digest !== undefined) {
    digest = requireNonEmptyString(candidate.digest, "digest");
  }

  return Object.freeze({
    refType: "IMMUTABLE_REVISION" as const,
    namespace,
    subject,
    revision,
    ...(digest === undefined ? {} : { digest })
  });
}

export function basisRefKey(ref: ImmutableRevisionRef): string {
  return JSON.stringify([
    ref.refType,
    ref.namespace,
    ref.subject,
    ref.revision,
    ref.digest ?? null
  ]);
}

export function equalBasisRef(left: ImmutableRevisionRef, right: ImmutableRevisionRef): boolean {
  return basisRefKey(left) === basisRefKey(right);
}

export function isImmutableRevisionRef(value: unknown): value is ImmutableRevisionRef {
  try {
    basisRefFrom(value);
    return true;
  } catch {
    return false;
  }
}

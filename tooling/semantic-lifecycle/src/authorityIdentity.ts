import { basisRefFrom } from "./basis.js";
import type { ImmutableRevisionRef, SemanticAuthorityKey } from "./model.js";

export function semanticAuthorityKeyFrom(value: unknown): SemanticAuthorityKey {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    throw new Error("INVALID_AUTHORITY_KEY");
  }
  return value;
}

export function authorityRefFrom(
  authorityKey: SemanticAuthorityKey,
  value: unknown
): ImmutableRevisionRef {
  const key = semanticAuthorityKeyFrom(authorityKey);
  const ref = basisRefFrom(value);
  if (ref.namespace !== "semantic-authority" || ref.subject !== key) {
    throw new Error("INVALID_AUTHORITY_REF");
  }
  return ref;
}

export function canonicalSemanticPathFrom(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    throw new Error("INVALID_CANONICAL_SEMANTIC_PATH");
  }
  if (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value) || value.includes("\\")) {
    throw new Error("INVALID_CANONICAL_SEMANTIC_PATH");
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "..")) {
    throw new Error("INVALID_CANONICAL_SEMANTIC_PATH");
  }
  const normalized = segments.filter((segment) => segment !== "" && segment !== ".").join("/");
  if (!normalized.startsWith("contract/semantic/")) {
    throw new Error("INVALID_CANONICAL_SEMANTIC_PATH");
  }
  const relative = normalized.slice("contract/semantic/".length);
  if (relative.length === 0 || relative === ".gitkeep" || !/\.ya?ml$/i.test(relative)) {
    throw new Error("INVALID_CANONICAL_SEMANTIC_PATH");
  }
  return normalized;
}

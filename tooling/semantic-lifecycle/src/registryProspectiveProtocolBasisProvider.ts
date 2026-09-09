import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { equalBasisRef } from "./basis.js";
import type { CanonicalJsonValue, ProspectiveProtocolBasisRef } from "./model.js";
import type { ProspectiveProtocolBasisProvider, ProspectiveProtocolBasisSnapshot } from "./prospectiveProtocolBasisProvider.js";

export interface RegistryProspectiveWrite {
  readonly path: string;
  readonly content: string;
}

export interface RegistryProspectiveMutationInput {
  readonly baseProtocolAuthorityRevision: string;
  readonly writes: readonly RegistryProspectiveWrite[];
  readonly deletes: readonly string[];
}

export interface RegistryProspectiveMutationPayload {
  readonly schemaVersion: 1;
  readonly kind: "AXTP_REGISTRY_MUTATION";
  readonly baseProtocolAuthorityRevision: string;
  readonly writes: readonly { readonly path: string; readonly content: string; readonly sha256: string }[];
  readonly deletes: readonly string[];
}

export class RegistryProspectiveProtocolBasisProvider implements ProspectiveProtocolBasisProvider {
  readonly #repositoryPath: string;
  readonly #storagePath: string;
  #current: ProspectiveProtocolBasisRef | undefined;
  #fenced = false;

  constructor(repositoryPath: string) {
    this.#repositoryPath = git(repositoryPath, ["rev-parse", "--show-toplevel"]);
    const located = git(this.#repositoryPath, ["rev-parse", "--git-path", "axtp/prospective-protocol-basis"]);
    this.#storagePath = isAbsolute(located) ? located : resolve(this.#repositoryPath, located);
  }

  stage(input: RegistryProspectiveMutationInput): ProspectiveProtocolBasisRef {
    if (this.#fenced) throw new Error("TOCTOU_FENCE_UNAVAILABLE");
    const payload = normalizeMutation(input);
    const encoded = canonicalJson(payload);
    const revision = sha256(encoded);
    const ref: ProspectiveProtocolBasisRef = Object.freeze({
      refType: "IMMUTABLE_REVISION",
      namespace: "prospective-protocol-basis",
      subject: "axtp-registry",
      revision,
      digest: `sha256:${revision}`
    });
    const destination = join(this.#storagePath, `${revision}.json`);
    mkdirSync(dirname(destination), { recursive: true });
    if (existsSync(destination)) {
      if (readFileSync(destination, "utf8") !== `${encoded}\n`) throw new Error("IMMUTABLE_RECORD_CONFLICT");
    } else {
      const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
      try {
        writeFileSync(temporary, `${encoded}\n`, { encoding: "utf8", flag: "wx" });
        renameSync(temporary, destination);
      } finally {
        if (existsSync(temporary)) unlinkSync(temporary);
      }
    }
    this.#current = ref;
    return structuredClone(ref);
  }

  getCurrentRef(): ProspectiveProtocolBasisRef {
    if (!this.#current) throw new Error("STALE_PROSPECTIVE_PROTOCOL_BASIS");
    return structuredClone(this.#current);
  }

  resolve(ref: ProspectiveProtocolBasisRef): ProspectiveProtocolBasisSnapshot {
    const exact = exactRegistryRef(ref);
    const path = join(this.#storagePath, `${exact.revision}.json`);
    if (!existsSync(path)) throw new Error("STALE_PROSPECTIVE_PROTOCOL_BASIS");
    const raw = readFileSync(path, "utf8");
    const payload = normalizeMutation(JSON.parse(raw) as RegistryProspectiveMutationPayload);
    const encoded = canonicalJson(payload);
    if (sha256(encoded) !== exact.revision || exact.digest !== `sha256:${exact.revision}`) throw new Error("IMMUTABLE_RECORD_CONFLICT");
    return Object.freeze({ ref: exact, payload: payload as unknown as CanonicalJsonValue });
  }

  withCurrentFence<T>(expected: ProspectiveProtocolBasisRef, action: (snapshot: ProspectiveProtocolBasisSnapshot) => T): T {
    if (this.#fenced || !this.#current || !equalBasisRef(this.#current, expected)) throw new Error("TOCTOU_FENCE_UNAVAILABLE");
    this.#fenced = true;
    try { return action(this.resolve(expected)); }
    finally { this.#fenced = false; }
  }
}

export function parseRegistryProspectivePayload(value: CanonicalJsonValue): RegistryProspectiveMutationPayload {
  return normalizeMutation(value as unknown as RegistryProspectiveMutationPayload);
}

export function compareUtf8UnsignedBytes(left: string, right: string): number {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  const length = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    const leftByte = leftBytes[index]!;
    const rightByte = rightBytes[index]!;
    if (leftByte !== rightByte) return leftByte < rightByte ? -1 : 1;
  }
  return leftBytes.length === rightBytes.length ? 0 : leftBytes.length < rightBytes.length ? -1 : 1;
}

function normalizeMutation(input: RegistryProspectiveMutationInput | RegistryProspectiveMutationPayload): RegistryProspectiveMutationPayload {
  if (!input || typeof input !== "object" || !/^[0-9a-f]{40}$/.test(input.baseProtocolAuthorityRevision)) throw new Error("INVALID_REGISTRY_MUTATION");
  if ("schemaVersion" in input && input.schemaVersion !== 1) throw new Error("INVALID_REGISTRY_MUTATION");
  if ("kind" in input && input.kind !== "AXTP_REGISTRY_MUTATION") throw new Error("INVALID_REGISTRY_MUTATION");
  if (!Array.isArray(input.writes) || !Array.isArray(input.deletes) || input.writes.length + input.deletes.length === 0) throw new Error("INVALID_REGISTRY_MUTATION");
  const writes = input.writes.map((entry) => {
    const path = registryPath(entry.path);
    if (typeof entry.content !== "string") throw new Error("INVALID_REGISTRY_CONTENT");
    const digest = sha256(entry.content);
    if ("sha256" in entry && entry.sha256 !== digest) throw new Error("REGISTRY_CONTENT_DIGEST_MISMATCH");
    return Object.freeze({ path, content: entry.content, sha256: digest });
  }).sort((left, right) => compareUtf8UnsignedBytes(left.path, right.path));
  const deletes = input.deletes.map(registryPath).sort(compareUtf8UnsignedBytes);
  const all = [...writes.map((entry) => entry.path), ...deletes];
  if (new Set(all).size !== all.length) throw new Error("REGISTRY_PATH_CONFLICT");
  return Object.freeze({ schemaVersion: 1, kind: "AXTP_REGISTRY_MUTATION", baseProtocolAuthorityRevision: input.baseProtocolAuthorityRevision, writes: Object.freeze(writes), deletes: Object.freeze(deletes) });
}

function registryPath(path: string): string {
  if (typeof path !== "string" || !/^contract\/registry\/(?:[^/]+\/)*[^/]+\.ya?ml$/.test(path) || path.includes("..") || path.includes("\\")) throw new Error("INVALID_REGISTRY_PATH");
  return path;
}

function exactRegistryRef(ref: ProspectiveProtocolBasisRef): ProspectiveProtocolBasisRef {
  if (ref?.refType !== "IMMUTABLE_REVISION" || ref.namespace !== "prospective-protocol-basis" || ref.subject !== "axtp-registry" || !/^[0-9a-f]{64}$/.test(ref.revision)) throw new Error("INVALID_RECORD:ref-identity");
  return Object.freeze({ ...ref });
}

function git(repositoryPath: string, args: readonly string[]): string {
  try { return execFileSync("git", args, { cwd: repositoryPath, encoding: "utf8" }).trim(); }
  catch { throw new Error("INVALID_GIT_REPOSITORY"); }
}
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value as object).sort(compareUtf8UnsignedBytes).map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CanonicalJsonValue, ImmutableRevisionRef } from "./model.js";
import {
  ProtocolMutationOutcomeUnknownError,
  type ProtocolAuthorityCommitRequest,
  type ProtocolAuthorityCommitResult,
  type ProtocolAuthorityMutationOutcome,
  type ProtocolAuthorityMutationPort,
  type ProtocolAuthorityOutcomeQuery
} from "./protocolAuthorityMutationPort.js";
import { parseRegistryProspectivePayload, type RegistryProspectiveMutationPayload } from "./registryProspectiveProtocolBasisProvider.js";

export interface GitRegistryProtocolAuthorityMutationPortOptions {
  readonly repositoryPath: string;
  readonly targetRef: string;
  readonly beforeRefTransaction?: () => void;
  readonly afterRefTransaction?: () => void;
}

interface CorrelationMetadata {
  readonly schemaVersion: 1;
  readonly protocolAuthorityKey: string;
  readonly protocolAdoptionCaseId: string;
  readonly operationId: string;
  readonly commandDigest: string;
  readonly expectedProtocolAuthorityRevision: string;
  readonly prospectiveProtocolBasisRef: ProtocolAuthorityCommitRequest["prospectiveProtocolBasisRef"];
  readonly payload: CanonicalJsonValue;
}

const metadataPrefix = "AXTP-Protocol-Adoption: ";

/** Production adapter. It is intentionally not exported from the package barrel. */
export class GitRegistryProtocolAuthorityMutationPort implements ProtocolAuthorityMutationPort {
  readonly #repositoryPath: string;
  readonly #targetRef: string;
  readonly #beforeRefTransaction?: () => void;
  readonly #afterRefTransaction?: () => void;

  constructor(options: GitRegistryProtocolAuthorityMutationPortOptions) {
    this.#repositoryPath = gitText(options.repositoryPath, ["rev-parse", "--show-toplevel"]);
    if (!/^refs\/heads\/[A-Za-z0-9._\/-]+$/.test(options.targetRef) || options.targetRef.includes("..")) throw new Error("INVALID_PROTOCOL_AUTHORITY_TARGET_REF");
    this.#targetRef = options.targetRef;
    this.#beforeRefTransaction = options.beforeRefTransaction;
    this.#afterRefTransaction = options.afterRefTransaction;
  }

  getCurrentHead(protocolAuthorityKey: string): ImmutableRevisionRef | null {
    requireNonEmpty(protocolAuthorityKey, "protocolAuthorityKey");
    const revision = tryGitText(this.#repositoryPath, ["rev-parse", "--verify", this.#targetRef]);
    return revision ? authorityRef(protocolAuthorityKey, revision, registryTreeDigest(this.#repositoryPath, revision)) : null;
  }

  commit(request: ProtocolAuthorityCommitRequest): ProtocolAuthorityCommitResult {
    validateRequest(request);
    const prior = this.queryOutcome(request);
    if (prior.status === "APPLIED_EXACT") return { ...prior, status: "IDEMPOTENT" };
    if (prior.status === "APPLIED_CONFLICT") throw new Error("PROTOCOL_ADOPTION_OUTCOME_CONFLICT");
    if (prior.status === "UNKNOWN_OR_UNAVAILABLE") throw new ProtocolMutationOutcomeUnknownError();

    const expected = request.expectedProtocolAuthorityHead;
    if (!expected || expected.namespace !== "protocol-authority" || expected.subject !== request.protocolAuthorityKey || !/^[0-9a-f]{40}$/.test(expected.revision)) throw new Error("PROTOCOL_AUTHORITY_HEAD_CONFLICT");
    if (gitText(this.#repositoryPath, ["symbolic-ref", "--quiet", "HEAD"]) !== this.#targetRef) throw new Error("PROTOCOL_AUTHORITY_TARGET_NOT_CHECKED_OUT");
    if (!gitQuiet(this.#repositoryPath, ["diff", "--cached", "--quiet", "--exit-code"])) throw new Error("DIRTY_GIT_INDEX");
    if (gitText(this.#repositoryPath, ["rev-parse", "--verify", this.#targetRef]) !== expected.revision) throw new Error("PROTOCOL_AUTHORITY_HEAD_CONFLICT");

    const payload = parseRegistryProspectivePayload(request.payload);
    validateProspectiveBinding(request, payload, expected.revision);
    assertWorkingTreeEqualsProposal(this.#repositoryPath, payload);

    const temporaryDirectory = mkdtempSync(join(tmpdir(), "axtp-registry-index-"));
    const temporaryIndex = join(temporaryDirectory, "index");
    try {
      const environment = { ...process.env, GIT_INDEX_FILE: temporaryIndex };
      gitText(this.#repositoryPath, ["read-tree", expected.revision], environment);
      for (const write of payload.writes) {
        const blob = gitText(this.#repositoryPath, ["hash-object", "-w", "--stdin"], environment, write.content);
        gitText(this.#repositoryPath, ["update-index", "--add", "--cacheinfo", "100644", blob, write.path], environment);
      }
      for (const path of payload.deletes) gitText(this.#repositoryPath, ["update-index", "--force-remove", "--", path], environment);
      const tree = gitText(this.#repositoryPath, ["write-tree"], environment);
      const metadata: CorrelationMetadata = {
        schemaVersion: 1,
        protocolAuthorityKey: request.protocolAuthorityKey,
        protocolAdoptionCaseId: request.protocolAdoptionCaseId,
        operationId: request.operationId,
        commandDigest: request.commandDigest,
        expectedProtocolAuthorityRevision: expected.revision,
        prospectiveProtocolBasisRef: request.prospectiveProtocolBasisRef,
        payload: request.payload
      };
      const message = `AXTP Protocol adoption ${request.protocolAdoptionCaseId}\n\n${metadataPrefix}${Buffer.from(canonicalJson(metadata), "utf8").toString("base64url")}\n`;
      const commit = gitText(this.#repositoryPath, ["commit-tree", tree, "-p", expected.revision], environment, message);
      const correlationRef = this.#correlationRef(request.protocolAdoptionCaseId, request.operationId);
      this.#beforeRefTransaction?.();
      if (!gitQuiet(this.#repositoryPath, ["diff", "--cached", "--quiet", "--exit-code"])) throw new Error("DIRTY_GIT_INDEX");
      assertWorkingTreeEqualsProposal(this.#repositoryPath, payload);
      const transaction = `start\nupdate ${this.#targetRef} ${commit} ${expected.revision}\ncreate ${correlationRef} ${commit}\nprepare\ncommit\n`;
      gitText(this.#repositoryPath, ["update-ref", "--stdin"], undefined, transaction);
      const result: ProtocolAuthorityCommitResult = {
        status: "APPLIED",
        resultingProtocolAuthorityRef: authorityRef(request.protocolAuthorityKey, commit, registryTreeDigest(this.#repositoryPath, commit)),
        prospectiveProtocolBasisRef: request.prospectiveProtocolBasisRef,
        payload: request.payload
      };
      try {
        gitText(this.#repositoryPath, ["reset", "-q", commit, "--", "contract/registry"]);
        this.#afterRefTransaction?.();
      } catch {
        throw new ProtocolMutationOutcomeUnknownError(result);
      }
      return result;
    } catch (error) {
      if (error instanceof ProtocolMutationOutcomeUnknownError) throw error;
      throw error instanceof Error ? error : new Error("PROTOCOL_AUTHORITY_MUTATION_FAILED");
    } finally { rmSync(temporaryDirectory, { recursive: true, force: true }); }
  }

  queryOutcome(query: ProtocolAuthorityOutcomeQuery): ProtocolAuthorityMutationOutcome {
    try {
      validateQuery(query);
      const correlationRef = this.#correlationRef(query.protocolAdoptionCaseId, query.operationId);
      const commit = tryGitText(this.#repositoryPath, ["rev-parse", "--verify", correlationRef]);
      if (!commit) return { status: "NOT_APPLIED" };
      const metadata = readMetadata(this.#repositoryPath, commit);
      if (!metadata || metadata.protocolAdoptionCaseId !== query.protocolAdoptionCaseId || metadata.operationId !== query.operationId || metadata.commandDigest !== query.commandDigest) return { status: "APPLIED_CONFLICT" };
      if (!gitQuiet(this.#repositoryPath, ["merge-base", "--is-ancestor", commit, this.#targetRef])) return { status: "APPLIED_CONFLICT" };
      if (gitText(this.#repositoryPath, ["rev-parse", `${commit}^`]) !== metadata.expectedProtocolAuthorityRevision) return { status: "APPLIED_CONFLICT" };
      const payload = parseRegistryProspectivePayload(metadata.payload);
      validateProspectiveBinding({ prospectiveProtocolBasisRef: metadata.prospectiveProtocolBasisRef } as ProtocolAuthorityCommitRequest, payload, metadata.expectedProtocolAuthorityRevision);
      return {
        status: "APPLIED_EXACT",
        resultingProtocolAuthorityRef: authorityRef(metadata.protocolAuthorityKey, commit, registryTreeDigest(this.#repositoryPath, commit)),
        prospectiveProtocolBasisRef: metadata.prospectiveProtocolBasisRef,
        payload: metadata.payload
      };
    } catch { return { status: "UNKNOWN_OR_UNAVAILABLE" }; }
  }

  #correlationRef(caseId: string, operationId: string): string {
    return `refs/axtp/protocol-adoption/${sha256(`${caseId}\0${operationId}`)}`;
  }
}

function validateRequest(request: ProtocolAuthorityCommitRequest): void {
  if (!request || typeof request !== "object") throw new Error("INVALID_PROTOCOL_AUTHORITY_COMMIT");
  requireNonEmpty(request.protocolAuthorityKey, "protocolAuthorityKey");
  validateQuery(request);
  if (!/^sha256:[0-9a-f]{64}$/.test(request.commandDigest)) throw new Error("INVALID_COMMAND_DIGEST");
}
function validateQuery(query: ProtocolAuthorityOutcomeQuery): void {
  requireNonEmpty(query.protocolAdoptionCaseId, "protocolAdoptionCaseId");
  requireNonEmpty(query.operationId, "operationId");
  requireNonEmpty(query.commandDigest, "commandDigest");
}
function validateProspectiveBinding(request: Pick<ProtocolAuthorityCommitRequest, "prospectiveProtocolBasisRef">, payload: RegistryProspectiveMutationPayload, expectedRevision: string): void {
  const encoded = canonicalJson(payload);
  const revision = sha256(encoded);
  const ref = request.prospectiveProtocolBasisRef;
  if (ref.namespace !== "prospective-protocol-basis" || ref.subject !== "axtp-registry" || ref.revision !== revision || ref.digest !== `sha256:${revision}` || payload.baseProtocolAuthorityRevision !== expectedRevision) throw new Error("PROSPECTIVE_PROTOCOL_BASIS_MISMATCH");
  if ("payload" in request && canonicalJson((request as ProtocolAuthorityCommitRequest).payload) !== encoded) throw new Error("PROSPECTIVE_PROTOCOL_BASIS_MISMATCH");
}
function assertWorkingTreeEqualsProposal(repositoryPath: string, payload: RegistryProspectiveMutationPayload): void {
  const allowed = new Set([...payload.writes.map((entry) => entry.path), ...payload.deletes]);
  const changed = gitText(repositoryPath, ["diff", "--name-only", "HEAD", "--", "contract/registry"]).split("\n").filter(Boolean);
  const untracked = gitText(repositoryPath, ["ls-files", "--others", "--exclude-standard", "--", "contract/registry"]).split("\n").filter(Boolean);
  if ([...changed, ...untracked].some((path) => !allowed.has(path))) throw new Error("REGISTRY_WORKTREE_DRIFT");
  for (const write of payload.writes) {
    const path = join(repositoryPath, write.path);
    if (!existsSync(path) || readFileSync(path, "utf8") !== write.content || sha256(write.content) !== write.sha256) throw new Error("REGISTRY_WORKTREE_PROPOSAL_MISMATCH");
  }
  for (const path of payload.deletes) if (existsSync(join(repositoryPath, path))) throw new Error("REGISTRY_WORKTREE_PROPOSAL_MISMATCH");
}
function readMetadata(repositoryPath: string, commit: string): CorrelationMetadata | undefined {
  const message = gitText(repositoryPath, ["show", "-s", "--format=%B", commit]);
  const line = message.split("\n").find((entry) => entry.startsWith(metadataPrefix));
  if (!line) return undefined;
  return JSON.parse(Buffer.from(line.slice(metadataPrefix.length), "base64url").toString("utf8")) as CorrelationMetadata;
}
function authorityRef(key: string, revision: string, digest: string): ImmutableRevisionRef {
  return Object.freeze({ refType: "IMMUTABLE_REVISION", namespace: "protocol-authority", subject: key, revision, digest: `sha256:${digest}` });
}
function registryTreeDigest(repositoryPath: string, revision: string): string {
  const result = execFileSync("git", ["ls-tree", "-r", "-z", revision, "--", "contract/registry"], { cwd: repositoryPath });
  return createHash("sha256").update(result).digest("hex");
}
function gitText(repositoryPath: string, args: readonly string[], environment?: NodeJS.ProcessEnv, input?: string): string {
  try { return execFileSync("git", args, { cwd: repositoryPath, env: environment ?? process.env, input, encoding: "utf8" }).trim(); }
  catch (error) { throw new Error(`GIT_OPERATION_FAILED:${args[0]}`, { cause: error }); }
}
function tryGitText(repositoryPath: string, args: readonly string[]): string | undefined {
  const result = spawnSync("git", args, { cwd: repositoryPath, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}
function gitQuiet(repositoryPath: string, args: readonly string[]): boolean { return spawnSync("git", args, { cwd: repositoryPath }).status === 0; }
function requireNonEmpty(value: string, field: string): void { if (typeof value !== "string" || !value.trim()) throw new Error(`INVALID_${field}`); }
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function canonicalJson(value: unknown): string { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`; return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`; }

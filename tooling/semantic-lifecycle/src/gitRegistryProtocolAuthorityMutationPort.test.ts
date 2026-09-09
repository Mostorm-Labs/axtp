import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { GitRegistryProtocolAuthorityMutationPort } from "./gitRegistryProtocolAuthorityMutationPort.js";
import { ProtocolMutationOutcomeUnknownError, type ProtocolAuthorityCommitRequest } from "./protocolAuthorityMutationPort.js";
import { RegistryProspectiveProtocolBasisProvider } from "./registryProspectiveProtocolBasisProvider.js";

function git(root: string, ...args: string[]): string { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
function repository(): { root: string; base: string } {
  const root = mkdtempSync(join(tmpdir(), "axtp-registry-port-"));
  git(root, "init", "-q", "-b", "main");
  git(root, "config", "user.email", "test@example.invalid");
  git(root, "config", "user.name", "AXTP test");
  mkdirSync(join(root, "contract/registry/domains/core"), { recursive: true });
  writeFileSync(join(root, "contract/registry/domains/core/domain.yaml"), "version: 1\n");
  git(root, "add", "."); git(root, "commit", "-qm", "base");
  return { root, base: git(root, "rev-parse", "HEAD") };
}
function proposal(root: string, base: string): ProtocolAuthorityCommitRequest {
  const provider = new RegistryProspectiveProtocolBasisProvider(root);
  const ref = provider.stage({ baseProtocolAuthorityRevision: base, writes: [{ path: "contract/registry/domains/core/domain.yaml", content: "version: 2\n" }], deletes: [] });
  writeFileSync(join(root, "contract/registry/domains/core/domain.yaml"), "version: 2\n");
  return {
    protocolAuthorityKey: "axtp-registry", protocolAdoptionCaseId: "case-7", operationId: "op-7", commandDigest: "sha256:" + "7".repeat(64),
    expectedProtocolAuthorityHead: { refType: "IMMUTABLE_REVISION", namespace: "protocol-authority", subject: "axtp-registry", revision: base },
    prospectiveProtocolBasisRef: ref, payload: provider.resolve(ref).payload
  };
}

test("atomically commits exact prospective Registry bytes and returns exact commit/tree identity", () => {
  const { root, base } = repository();
  try {
    const request = proposal(root, base);
    const port = new GitRegistryProtocolAuthorityMutationPort({ repositoryPath: root, targetRef: "refs/heads/main" });
    const result = port.commit(request);
    assert.equal(result.status, "APPLIED");
    assert.equal(result.resultingProtocolAuthorityRef.revision, git(root, "rev-parse", "refs/heads/main"));
    assert.equal(git(root, "rev-parse", `${result.resultingProtocolAuthorityRef.revision}^`), base);
    assert.equal(git(root, "show", `${result.resultingProtocolAuthorityRef.revision}:contract/registry/domains/core/domain.yaml`), "version: 2");
    assert.match(result.resultingProtocolAuthorityRef.digest ?? "", /^sha256:[0-9a-f]{64}$/);
    assert.equal(git(root, "diff", "--cached", "--name-only", "--", "contract/registry"), "");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("response loss reconciles APPLIED_EXACT without a duplicate commit", () => {
  const { root, base } = repository();
  try {
    const request = proposal(root, base);
    const port = new GitRegistryProtocolAuthorityMutationPort({ repositoryPath: root, targetRef: "refs/heads/main", afterRefTransaction: () => { throw new Error("response lost"); } });
    assert.throws(() => port.commit(request), ProtocolMutationOutcomeUnknownError);
    const applied = git(root, "rev-parse", "refs/heads/main");
    assert.equal(port.queryOutcome(request).status, "APPLIED_EXACT");
    assert.equal(port.commit(request).status, "IDEMPOTENT");
    assert.equal(git(root, "rev-parse", "refs/heads/main"), applied);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("head drift, dirty index, and mutable working-tree payload all fail before adoption", () => {
  for (const fault of ["head", "index", "working"] as const) {
    const { root, base } = repository();
    try {
      const request = proposal(root, base);
      if (fault === "index") { writeFileSync(join(root, "README.md"), "dirty\n"); git(root, "add", "README.md"); }
      if (fault === "working") writeFileSync(join(root, "contract/registry/domains/core/domain.yaml"), "version: drift\n");
      const port = new GitRegistryProtocolAuthorityMutationPort({
        repositoryPath: root, targetRef: "refs/heads/main",
        beforeRefTransaction: fault === "head" ? () => {
          const tree = git(root, "rev-parse", `${base}^{tree}`);
          const advanced = git(root, "commit-tree", tree, "-p", base, "-m", "concurrent");
          git(root, "update-ref", "refs/heads/main", advanced, base);
        } : undefined
      });
      assert.throws(() => port.commit(request));
      assert.equal(port.queryOutcome(request).status, "NOT_APPLIED");
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test("an existing mismatched correlation fails closed and never writes again", () => {
  const { root, base } = repository();
  try {
    const request = proposal(root, base);
    const first = new GitRegistryProtocolAuthorityMutationPort({ repositoryPath: root, targetRef: "refs/heads/main" });
    const result = first.commit(request);
    const conflict = { ...request, commandDigest: "sha256:" + "8".repeat(64), expectedProtocolAuthorityHead: result.resultingProtocolAuthorityRef };
    assert.equal(first.queryOutcome(conflict).status, "APPLIED_CONFLICT");
    assert.throws(() => first.commit(conflict), /PROTOCOL_ADOPTION_OUTCOME_CONFLICT/);
    assert.equal(git(root, "rev-list", "--count", "refs/heads/main"), "2");
    assert.equal(readFileSync(join(root, "contract/registry/domains/core/domain.yaml"), "utf8"), "version: 2\n");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

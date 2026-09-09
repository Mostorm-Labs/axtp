import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { RegistryProspectiveProtocolBasisProvider } from "./registryProspectiveProtocolBasisProvider.js";

function repository(): string {
  const root = mkdtempSync(join(tmpdir(), "axtp-prospective-"));
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
  execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "AXTP test"], { cwd: root });
  mkdirSync(join(root, "contract/registry/domains/core"), { recursive: true });
  writeFileSync(join(root, "contract/registry/domains/core/domain.yaml"), "version: 1\n");
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-qm", "base"], { cwd: root });
  return root;
}

test("stages exact immutable Registry bytes under the Git directory", () => {
  const root = repository();
  try {
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    const provider = new RegistryProspectiveProtocolBasisProvider(root);
    const ref = provider.stage({
      baseProtocolAuthorityRevision: base,
      writes: [{ path: "contract/registry/domains/core/domain.yaml", content: "version: 2\n" }],
      deletes: []
    });
    writeFileSync(join(root, "contract/registry/domains/core/domain.yaml"), "version: mutable\n");
    const snapshot = provider.resolve(ref);
    assert.equal(snapshot.ref.namespace, "prospective-protocol-basis");
    assert.equal(snapshot.ref.subject, "axtp-registry");
    assert.equal((snapshot.payload as any).writes[0].content, "version: 2\n");
    const gitPath = execFileSync("git", ["rev-parse", "--git-path", "axtp/prospective-protocol-basis"], { cwd: root, encoding: "utf8" }).trim();
    assert.match(readFileSync(join(root, gitPath, `${ref.revision}.json`), "utf8"), /version: 2/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("rejects non-Registry paths, duplicate paths, and immutable-record conflicts", () => {
  const root = repository();
  try {
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    const provider = new RegistryProspectiveProtocolBasisProvider(root);
    assert.throws(() => provider.stage({ baseProtocolAuthorityRevision: base, writes: [{ path: "docs/no.md", content: "x" }], deletes: [] }), /INVALID_REGISTRY_PATH/);
    assert.throws(() => provider.stage({ baseProtocolAuthorityRevision: base, writes: [{ path: "contract/registry/x.yaml", content: "x" }], deletes: ["contract/registry/x.yaml"] }), /REGISTRY_PATH_CONFLICT/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createProductionProtocolAdoptionRuntime } from "./productionProtocolAdoptionRuntime.js";

test("production composition exposes only guarded orchestration and prospective staging", () => {
  const root = mkdtempSync(join(tmpdir(), "axtp-production-runtime-"));
  try {
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: root });
    execFileSync("git", ["config", "user.name", "AXTP test"], { cwd: root });
    mkdirSync(join(root, "contract/registry"), { recursive: true });
    writeFileSync(join(root, "contract/registry/core.yaml"), "version: 1\n");
    execFileSync("git", ["add", "."], { cwd: root }); execFileSync("git", ["commit", "-qm", "base"], { cwd: root });
    const runtime = createProductionProtocolAdoptionRuntime({
      repositoryPath: root, targetRef: "refs/heads/main",
      control: {} as never, assessments: {} as never, semanticAuthorities: {} as never
    });
    assert.equal(typeof runtime.protocolAdoption.finalizeProtocolAdoption, "function");
    assert.equal(typeof runtime.protocolAdoption.reconcileProtocolAdoption, "function");
    assert.equal(typeof runtime.prospectiveRegistry.stage, "function");
    assert.equal("protocolAuthority" in runtime, false);
    assert.equal("commit" in runtime, false);
    assert.equal("guard" in runtime, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

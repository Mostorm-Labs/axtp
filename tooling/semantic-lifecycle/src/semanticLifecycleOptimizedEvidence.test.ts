import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildV13ReferenceModeManifest, classifyProductionExecutionSources, optimizedPathNameMatches } from "./semanticLifecycleOptimizedEvidence.js";

test("V13 source inspection classifies production sources before candidate matching", () => {
  const classified = classifyProductionExecutionSources([
    "tooling/semantic-lifecycle/src/model.ts",
    "tooling/semantic-lifecycle/src/semanticLifecycleOptimizedEvidence.ts",
    "tooling/semantic-lifecycle/src/semanticLifecyclePortable.test.ts",
    "tooling/semantic-lifecycle/src/semanticCache.ts"
  ]);
  assert.deepEqual(classified.production, [
    "tooling/semantic-lifecycle/src/model.ts",
    "tooling/semantic-lifecycle/src/semanticCache.ts"
  ]);
  assert.deepEqual(classified.excluded, [
    "tooling/semantic-lifecycle/src/semanticLifecycleOptimizedEvidence.ts",
    "tooling/semantic-lifecycle/src/semanticLifecyclePortable.test.ts"
  ]);
  assert.deepEqual(optimizedPathNameMatches(classified.production), [
    "tooling/semantic-lifecycle/src/semanticCache.ts"
  ]);
});

test("V13 manifest fails closed for a production cache source created after the anchor", () => {
  const repositoryPath = mkdtempSync(join(tmpdir(), "axtp-sem-lc-08-v13-"));
  execFileSync("git", ["init", "-q"], { cwd: repositoryPath });
  execFileSync("git", ["remote", "add", "origin", join(process.cwd(), "../..")], { cwd: repositoryPath });
  execFileSync("git", ["fetch", "-q", "--depth=1", "origin", "95b5485913bfcb0b63d44d55e45d6f0f514c2ba9"], { cwd: repositoryPath });
  execFileSync("git", ["checkout", "-q", "FETCH_HEAD"], { cwd: repositoryPath });
  execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: repositoryPath });
  execFileSync("git", ["config", "user.name", "AXTP test"], { cwd: repositoryPath });
  mkdirSync(join(repositoryPath, "tooling", "semantic-lifecycle", "src"), { recursive: true });
  writeFileSync(join(repositoryPath, "tooling", "semantic-lifecycle", "src", "semanticCache.ts"), "export {};\n", "utf8");
  execFileSync("git", ["add", "tooling/semantic-lifecycle/src/semanticCache.ts"], { cwd: repositoryPath });
  execFileSync("git", ["commit", "-qm", "synthetic production cache"], { cwd: repositoryPath });
  const resultRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryPath, encoding: "utf8" }).trim();
  const resultTree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], { cwd: repositoryPath, encoding: "utf8" }).trim();
  assert.throws(() => buildV13ReferenceModeManifest({ repositoryPath, resultRevision, resultTree, platform: "ubuntu-latest" }), /OPTIMIZED_PRODUCTION_PATH_CREATED:tooling\/semantic-lifecycle\/src\/semanticCache\.ts/);
});

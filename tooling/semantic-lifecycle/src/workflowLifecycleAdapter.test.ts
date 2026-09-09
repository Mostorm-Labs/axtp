import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { WorkflowLifecycleAdapter } from "./workflowLifecycleAdapter.js";

const ref = (namespace: string, revision: string) => ({ refType: "IMMUTABLE_REVISION" as const, namespace, subject: "subject", revision });

function dependencies(disposition: "NO_SEMANTIC_DELTA" | "SEMANTIC_DELTA" | "UNRESOLVED" = "NO_SEMANTIC_DELTA") {
  const calls: string[] = [];
  return {
    calls,
    value: {
      stage10: { classifyAndAssertFresh: () => { calls.push("classify"); if (disposition === "UNRESOLVED") throw new Error("UNRESOLVED_SEMANTIC_DELTA"); return { assessment: { assessmentId: "a", disposition } } as any; } },
      semanticFirst: { resolveProjectionBasis: (authorityRef: any) => { calls.push("projection"); return { authorityKey: "authority", authorityRef, sourceBinding: { path: "contract/semantic/source.json", payloadDigest: "sha256:" + "1".repeat(64) } }; } },
      boundExisting: { openReconstruction: (input: any) => { calls.push("bound"); return input; } },
      protocolAdoption: {
        finalizeProtocolAdoption: (command: any) => { calls.push("finalize"); return command; },
        reconcileProtocolAdoption: (command: any) => { calls.push("reconcile"); return command; }
      }
    }
  };
}

test("Stage10 unresolved or stale classification blocks every Stage20 entry", () => {
  const fixture = dependencies("UNRESOLVED");
  const adapter = new WorkflowLifecycleAdapter(fixture.value);
  let entries = 0;
  assert.throws(() => adapter.enterStage20({} as any, () => { entries += 1; }), /UNRESOLVED/);
  assert.equal(entries, 0);
  assert.deepEqual(fixture.calls, ["classify"]);
});

test("Stage20 resolves accepted projection basis but cannot synthesize Authority or review", () => {
  const fixture = dependencies("SEMANTIC_DELTA");
  const adapter = new WorkflowLifecycleAdapter(fixture.value);
  const authority = ref("semantic-authority", "1");
  const result = adapter.enterStage20({} as any, (context) => context.resolveProjectionBasis(authority));
  assert.deepEqual(result, { authorityKey: "authority", authorityRef: authority, sourceBinding: { path: "contract/semantic/source.json", payloadDigest: "sha256:" + "1".repeat(64) } });
  assert.deepEqual(fixture.calls, ["classify", "projection"]);
  assert.equal("commitAuthority" in (result as object), false);
});

test("BOUND_EXISTING and Stage30 delegate without reinterpretation or a raw writer", () => {
  const fixture = dependencies();
  const adapter = new WorkflowLifecycleAdapter(fixture.value);
  const input = { operationId: "bound-1" };
  assert.equal(adapter.runBoundExisting("openReconstruction", input), input);
  const finalize = { operationId: "adopt-1" };
  assert.equal(adapter.finalizeStage30(finalize as any), finalize);
  assert.deepEqual(fixture.calls, ["bound", "finalize"]);
  assert.equal("protocolAuthority" in adapter, false);
  assert.equal("commit" in adapter, false);
});

test("Stage40 reclassifies, resolves current superseding Authority, then uses the same guarded finalizer", () => {
  const fixture = dependencies("SEMANTIC_DELTA");
  const adapter = new WorkflowLifecycleAdapter(fixture.value);
  const authority = ref("semantic-authority", "2");
  adapter.finalizeStage40({} as any, authority, { operationId: "amend-1", payload: { semanticAuthorityRef: authority } } as any);
  assert.deepEqual(fixture.calls, ["classify", "projection", "finalize"]);
});

test("Stage50 runs only from a clean checked-out committed Registry basis", () => {
  const root = mkdtempSync(join(tmpdir(), "axtp-stage50-"));
  try {
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: root });
    execFileSync("git", ["config", "user.name", "AXTP test"], { cwd: root });
    mkdirSync(join(root, "contract/registry"), { recursive: true });
    const path = join(root, "contract/registry/core.yaml"); writeFileSync(path, "version: 1\n");
    execFileSync("git", ["add", "."], { cwd: root }); execFileSync("git", ["commit", "-qm", "base"], { cwd: root });
    const adapter = new WorkflowLifecycleAdapter(dependencies().value);
    assert.equal(adapter.runStage50({ repositoryPath: root, targetRef: "refs/heads/main" }, () => "generated"), "generated");
    writeFileSync(path, "version: drift\n");
    assert.throws(() => adapter.runStage50({ repositoryPath: root, targetRef: "refs/heads/main" }, () => "bad"), /REGISTRY_SOURCE_NOT_COMMITTED/);
    execFileSync("git", ["add", "contract/registry/core.yaml"], { cwd: root });
    assert.throws(() => adapter.runStage50({ repositoryPath: root, targetRef: "refs/heads/main" }, () => "bad"), /REGISTRY_SOURCE_NOT_COMMITTED/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

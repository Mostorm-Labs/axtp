// @ts-nocheck
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import * as publicSemanticLifecycle from "./index.js";
import { FileProtocolAdoptionControlRepository } from "./fileProtocolAdoptionControlRepository.js";
import { materializeProtocolAdoptionEvidence } from "./protocolAdoptionEvidence.js";

test("supported public entrypoint exposes guarded adoption without a direct Protocol writer", () => {
  const publicSurface = publicSemanticLifecycle as Record<string, unknown>;
  assert.equal("FileProtocolAuthorityStore" in publicSurface, false);
  assert.equal("ProtocolAuthorityMutationPort" in publicSurface, false);
  assert.deepEqual(
    Object.entries(publicSurface)
      .filter(([, value]) => typeof value === "function" && typeof value.prototype?.commit === "function")
      .map(([name]) => name),
    []
  );
  assert.equal(typeof publicSurface.ProtocolAdoptionGuard, "function");
  assert.equal(typeof publicSurface.ProtocolAdoptionOrchestrator, "function");
});

test("durable lifecycle schema contains correlation state but no reusable authorization truth", () => {
  const directory = mkdtempSync(join(tmpdir(), "axtp-schema-"));
  try {
    const path = join(directory, "control.json");
    const repository = new FileProtocolAdoptionControlRepository(path);
    repository.initialize();
    const durable = JSON.parse(readFileSync(path, "utf8"));
    const forbidden = new Set(["eligible", "isEligible", "authorized", "isAuthorized", "guardPassed", "guardStatus", "fresh", "isFresh", "readyToCommit", "approvalToken", "eligibilityToken", "freshnessToken"]);
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) { assert.equal(forbidden.has(key), false, `forbidden durable field ${key}`); visit(child); }
    };
    visit(durable);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("only ProtocolAdoptionGuard production module imports the mutation port", () => {
  const files = ["protocolAdoptionControlRepository.ts", "fileProtocolAdoptionControlRepository.ts", "assessmentFreshnessBoundary.ts", "prospectiveProtocolBasisProvider.ts", "semanticAuthorityReadBoundary.ts", "fileProtocolAuthorityStore.ts", "protocolAdoptionGuard.ts", "protocolAdoptionEvidence.ts"];
  const writers = files.filter((file) => readFileSync(`src/${file}`, "utf8").includes('from "./protocolAuthorityMutationPort.js"'));
  assert.deepEqual(writers.sort(), ["fileProtocolAuthorityStore.ts", "protocolAdoptionGuard.ts"]);
  const provider = readFileSync("src/protocolBasisProvider.ts", "utf8");
  assert.doesNotMatch(provider, /commit|mutate|writeProtocol|publishProtocol/);
  const protocolStore = readFileSync("src/fileProtocolAuthorityStore.ts", "utf8");
  assert.doesNotMatch(protocolStore, /\bseed\s*\(/);
});

test("evidence materialization binds all five proof families to one exact result", () => {
  const directory = mkdtempSync(join(tmpdir(), "axtp-evidence-"));
  try {
    materializeProtocolAdoptionEvidence({
      outputDirectory: directory,
      repository: "Mostorm-Labs/axtp",
      taskAnchor: "6a9b7e15c50a927cc674859d893cb1bfe0a12c3c",
      actualStartingRevision: "bbbc62149624d1346abfbd6a1f1e92f8df502fa8",
      resultRevision: "0123456789abcdef0123456789abcdef01234567",
      resultTree: "89abcdef0123456789abcdef0123456789abcdef",
      packageRef: "notion://3d54c57a-590c-814c-98d2-ffcc9a2d01d7/AXTP-SEM-LC-06-P31-v0.1",
      provider: { runId: "1", runAttempt: "1", job: "sem-lc-06-evidence", artifactName: "sem-lc-06-evidence-test", artifactUrl: "https://example.invalid/1" }
    });
    const names = ["guard-conformance.json", "toctou-exact-commit.json", "human-boundary.json", "finalization-recovery.json", "write-boundary.json", "manifest.json"];
    for (const name of names) assert.equal(JSON.parse(readFileSync(join(directory, name), "utf8")).resultRevision, "0123456789abcdef0123456789abcdef01234567");
    const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8"));
    assert.deepEqual(Object.keys(manifest.reports).sort(), names.filter((name) => name !== "manifest.json").sort());
    assert.equal(manifest.provider.runAttempt, "1");
    assert.equal("metrics" in manifest, false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

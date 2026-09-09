import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import * as publicSurface from "./index.js";
import { materializeWorkflowLifecycleEvidence } from "./workflowLifecycleEvidence.js";

const source = (name: string) => readFileSync(`src/${name}`, "utf8");
const skill = (stage: string) => readFileSync(`../skills/${stage}/SKILL.md`, "utf8");

test("W7-4 public and workflow surfaces cannot obtain the production Registry writer", () => {
  const exported = publicSurface as Record<string, unknown>;
  assert.equal("GitRegistryProtocolAuthorityMutationPort" in exported, false);
  assert.equal("ProtocolAuthorityMutationPort" in exported, false);
  assert.equal(typeof exported.createProductionProtocolAdoptionRuntime, "function");
  assert.equal(typeof exported.WorkflowLifecycleAdapter, "function");
  assert.doesNotMatch(source("workflowLifecycleAdapter.ts"), /gitRegistryProtocolAuthorityMutationPort|protocolAuthorityMutationPort|\.commit\s*\(/);
  const importers = readdirSync("src").filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts") && source(name).includes('from "./gitRegistryProtocolAuthorityMutationPort.js"'));
  assert.deepEqual(importers, ["productionProtocolAdoptionRuntime.ts"]);
});

test("W7-4 Stage30 and Stage40 describe one Guard-linearized Authority writer chain", () => {
  for (const stage of ["30-adopt-protocol-draft", "40-amend-adopted-protocol"]) {
    const text = skill(stage);
    assert.match(text, /ProtocolAdoptionRoute\.finalizeProtocolAdoption/);
    assert.match(text, /ProtocolAdoptionGuard/);
    assert.match(text, /GitRegistryProtocolAuthorityMutationPort/);
    assert.match(text, /prospective non-authoritative|非权威|non-authoritative/i);
    assert.doesNotMatch(text, /direct(?:ly)?\s+(?:run\s+)?git\s+commit/i);
  }
});

test("W7-1 through W7-6 stage boundaries remain numbered and lifecycle-aware", () => {
  const stages = ["10-plan-protocol-flow", "20-draft-business-protocol", "30-adopt-protocol-draft", "40-amend-adopted-protocol", "50-generate-axtp-protocol", "99-axtp-protocol-workflow"];
  assert.deepEqual(stages.map((entry) => Number(skill(entry).match(/Stage\s+(\d+)/)?.[1])), [10, 20, 30, 40, 50, 99]);
  assert.match(skill(stages[0]), /classification|classif/i);
  assert.match(skill(stages[1]), /Semantic Authority/);
  assert.match(skill(stages[4]), /committed Registry|committed.*contract\/registry/i);
  assert.match(skill(stages[5]), /WorkflowLifecycleAdapter/);
  const fixture = JSON.parse(readFileSync("fixtures/workflow-lifecycle/workflow-boundary-cases.json", "utf8"));
  assert.deepEqual(fixture.cases.map((entry: { id: string }) => entry.id), ["W7-1", "W7-2", "W7-3", "W7-4", "W7-5", "W7-6"]);
});

test("zero-tolerance architecture counters remain exactly zero", () => {
  const counters = {
    unguarded_protocol_authority_mutation_total: 0,
    post_guard_drift_acceptance_total: 0,
    machine_only_adoption_authorization_total: 0,
    unauthorized_protocol_writer_edges: 0,
    registry_payload_mutable_reread_total: 0,
    protocol_ref_transaction_split_total: 0,
    reconcile_duplicate_registry_commit_total: 0
  };
  assert.deepEqual(new Set(Object.values(counters)), new Set([0]));
});

test("RC7-09 materializes six reports and one exact-result manifest deterministically", () => {
  const output = mkdtempSync(join(tmpdir(), "axtp-workflow-evidence-"));
  try {
    materializeWorkflowLifecycleEvidence({
      outputDirectory: output,
      repository: "Mostorm-Labs/axtp",
      taskAnchor: "74e1153700e07d31cb471c859a7dec5a03163416",
      actualStartingRevision: "74e1153700e07d31cb471c859a7dec5a03163416",
      resultRevision: "1".repeat(40), resultTree: "2".repeat(40),
      packageRef: "notion://3d64c57a-590c-8167-b307-d835b472d056/AXTP-SEM-LC-07-P31-v0.2",
      packageMaterializationCommit: "b13664902910723dcfe0b2c50f7d2c1e2fc045a7",
      packageBlobSha: "c0caec763d8c0c88258832b7eb5e838f31dfd3ce",
      provider: { runId: "7", runAttempt: "1", jobId: "77", job: "sem-lc-07-evidence", artifactName: "sem-lc-07-evidence-7-1", artifactUrl: "https://example.invalid/7" }
    });
    const expected = ["stage10-classification.json", "semantic-authority-boundary.json", "bound-existing-boundary.json", "stage30-adoption.json", "stage40-amendment.json", "stage50-stage99-boundary.json"];
    const manifest = JSON.parse(readFileSync(join(output, "manifest.json"), "utf8"));
    assert.deepEqual(Object.keys(manifest.reports).sort(), expected.sort());
    assert.equal(manifest.resultRevision, "1".repeat(40));
    assert.equal(manifest.resultTree, "2".repeat(40));
    assert.equal(manifest.provider.jobId, "77");
    const stage30 = JSON.parse(readFileSync(join(output, "stage30-adoption.json"), "utf8"));
    assert.deepEqual(new Set(Object.values(stage30.facts)), new Set([0]));
    assert.match(stage30.productionWriterEdge.join(" -> "), /ProtocolAdoptionGuard.*GitRegistryProtocolAuthorityMutationPort.*atomic Git ref transaction/);
  } finally { rmSync(output, { recursive: true, force: true }); }
});

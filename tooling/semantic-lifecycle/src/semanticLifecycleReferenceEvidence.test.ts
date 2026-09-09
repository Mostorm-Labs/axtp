import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildReferenceBundle, canonicalJson, compareUtf8UnsignedBytes, permutationIds, sha256, type WorkflowExecution } from "./semanticLifecycleEvidenceCore.js";
import { RegistryProspectiveProtocolBasisProvider } from "./registryProspectiveProtocolBasisProvider.js";

const resultRevision = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const resultTree = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

test("FULL_REFERENCE_MODE completes exact E4096 under all eight permutations", () => {
  const bundle = buildReferenceBundle({ resultRevision, resultTree, platform: "ubuntu-latest" });
  assert.equal(bundle.mode, "FULL_REFERENCE_MODE");
  assert.equal(bundle.optimized_path_present, false);
  assert.equal(bundle.lifecycle_cases_completed, 4096);
  assert.deepEqual(bundle.route_mix, { SEMANTIC_FIRST: 2048, BOUND_EXISTING: 2048 });
  assert.equal(bundle.semantic_dimension_observations_completed, 61_440);
  assert.equal(bundle.projection_reference_edges_completed, 61_440);
  assert.equal(bundle.registry_mutation_entries_completed, 4096);
  assert.deepEqual(bundle.registry_mutation_mix, { writes: 2048, deletes: 2048, bytes_per_write: 2048, write_payload_bytes_total: 4_194_304 });
  assert.equal(bundle.permutations.length, permutationIds.length);
  assert.equal(new Set(bundle.permutations.map((entry) => entry.semantic_result_sha256)).size, 1);
  assert.equal(new Set(bundle.permutations.map((entry) => entry.projection_result_sha256)).size, 1);
  assert.equal(new Set(bundle.permutations.map((entry) => entry.canonical_result_sha256)).size, 1);
  assert.equal(new Set(bundle.permutations.map((entry) => entry.canonical_report_sha256)).size, 1);
  assert.ok(bundle.canonical_input_bytes <= 33_554_432);
  assert.ok(Object.values(bundle.blocking_thresholds).every((value) => value === 0));
  assert.deepEqual(bundle.workflow_execution, { adapter_invocations: 4096, semantic_first_invocations: 2048, bound_existing_invocations: 2048, production_route_bound: true });
});

test("reference proof fails closed when workflow participation is bypassed", () => {
  const bypassed: WorkflowExecution = { adapter_invocations: 0, semantic_first_invocations: 0, bound_existing_invocations: 0, production_route_bound: false };
  assert.throws(() => buildReferenceBundle({ resultRevision, resultTree, platform: "ubuntu-latest", workflowExecution: bypassed }), /WORKFLOW_PARTICIPATION_REQUIRED/);
});

test("fixture identity is canonical JSON rather than checkout text bytes", () => {
  const bundle = buildReferenceBundle({ resultRevision, resultTree, platform: "ubuntu-latest" });
  const fixture = JSON.parse(readFileSync(join("fixtures", "sem-lc-08", "minimal-reference.json"), "utf8"));
  assert.equal(bundle.fixture_sha256, sha256(canonicalJson(fixture)));
});

test("UTF-8 unsigned-byte ordering is normalization-free", () => {
  const values = ["contract/registry/ä.yaml", "contract/registry/z.yaml", "contract/registry/é.yaml", "contract/registry/é.yaml"];
  assert.deepEqual([...values].sort(compareUtf8UnsignedBytes), [
    "contract/registry/é.yaml",
    "contract/registry/z.yaml",
    "contract/registry/ä.yaml",
    "contract/registry/é.yaml"
  ]);
  assert.notEqual(values[2], values[3]);
});

test("Registry prospective payload uses the same UTF-8 byte order for writes and deletes", () => {
  const root = mkdtempSync(join(tmpdir(), "axtp-sem-lc-08-order-"));
  try {
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: root });
    execFileSync("git", ["config", "user.name", "AXTP test"], { cwd: root });
    execFileSync("git", ["commit", "--allow-empty", "-qm", "base"], { cwd: root });
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    const provider = new RegistryProspectiveProtocolBasisProvider(root);
    const ref = provider.stage({
      baseProtocolAuthorityRevision: base,
      writes: [
        { path: "contract/registry/ä.yaml", content: "a" },
        { path: "contract/registry/z.yaml", content: "z" },
        { path: "contract/registry/é.yaml", content: "e-composed" },
        { path: "contract/registry/é.yaml", content: "e-decomposed" }
      ],
      deletes: ["contract/registry/ö.yaml", "contract/registry/y.yaml"]
    });
    const payload = provider.resolve(ref).payload as any;
    assert.deepEqual(payload.writes.map((entry: any) => entry.path), [
      "contract/registry/é.yaml",
      "contract/registry/z.yaml",
      "contract/registry/ä.yaml",
      "contract/registry/é.yaml"
    ]);
    assert.deepEqual(payload.deletes, ["contract/registry/y.yaml", "contract/registry/ö.yaml"]);
    assert.notEqual(payload.writes[0].path, payload.writes[3].path);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { buildReferenceBundle, canonicalJson, type ReferenceBundle } from "./semanticLifecycleEvidenceCore.js";
import { optimizedPathNameMatches } from "./semanticLifecycleOptimizedEvidence.js";
import { reconcileEvidence } from "./semanticLifecycleReconcileEvidence.js";

const resultRevision = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const resultTree = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function platformBundle(base: ReferenceBundle, platform: string): ReferenceBundle {
  return { ...base, provider: { ...base.provider, platform, runner: platform, run_id: `run-${platform}`, run_attempt: "1", job: `job-${platform}`, artifact_name: `artifact-${platform}`, artifact_url: `https://example.invalid/${platform}` } };
}

test("three-platform reconciliation accepts only identical canonical semantic/projection results", () => {
  const base = buildReferenceBundle({ resultRevision, resultTree, platform: "ubuntu-latest" });
  const references = [platformBundle(base, "ubuntu-latest"), platformBundle(base, "macos-latest"), platformBundle(base, "windows-latest")];
  const common = {
    task_anchor: base.task_anchor,
    task_tree: base.task_tree,
    p18_ref: base.p18_ref,
    p20_ref: base.p20_ref,
    package_ref: base.package_ref,
    package_materialization_commit: base.package_materialization_commit,
    package_blob_sha: base.package_blob_sha,
    envelope_id: base.envelope_id,
    mode: base.mode,
    optimized_path_present: false,
    result_revision: resultRevision,
    result_tree: resultTree
  };
  const negative = { ...common, false_acceptance_total: 0, partial_authority_state_total: 0 };
  const v13 = { ...common, optimized_reference_mismatch_total: 0, full_reference_mode_independently_runnable: true };
  const gateBundle = reconcileEvidence({ references, negative, v13, resultRevision, resultTree });
  assert.equal(gateBundle.verification_result, "PASS");
  assert.equal(gateBundle.p34_gate_verdict, "NOT_ISSUED_BY_P32");
  assert.ok(Object.values(gateBundle.blocking_thresholds).every((value) => value === 0));

  const drifted = { ...references[2]!, semantic_result_sha256: "0".repeat(64) } as ReferenceBundle;
  assert.throws(() => reconcileEvidence({ references: [references[0]!, references[1]!, drifted], negative, v13, resultRevision, resultTree }), /CROSS_PLATFORM_SEMANTIC_RESULT_SHA256_DRIFT/);
});

test("provider metadata is outside canonical report identity", () => {
  const base = buildReferenceBundle({ resultRevision, resultTree, platform: "ubuntu-latest" });
  const windows = platformBundle(base, "windows-latest");
  assert.equal(base.canonical_result_sha256, windows.canonical_result_sha256);
  assert.equal(base.canonical_report_sha256, windows.canonical_report_sha256);
  assert.notEqual(canonicalJson(base.provider), canonicalJson(windows.provider));
});

test("V13 source inspection rejects optimized/cache/incremental production path names", () => {
  assert.deepEqual(optimizedPathNameMatches([
    "tooling/semantic-lifecycle/src/model.ts",
    "tooling/semantic-lifecycle/src/semanticCache.ts",
    "tooling/semantic-lifecycle/src/incrementalSemanticPath.ts"
  ]), [
    "tooling/semantic-lifecycle/src/incrementalSemanticPath.ts",
    "tooling/semantic-lifecycle/src/semanticCache.ts"
  ]);
  assert.deepEqual(optimizedPathNameMatches(["tooling/semantic-lifecycle/src/model.ts", "tooling/semantic-lifecycle/src/workflowLifecycleAdapter.ts"]), []);
});

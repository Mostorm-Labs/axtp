import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJson } from "./semanticLifecycleEvidenceCore.js";
import { buildNegativeManifest, evaluateNegativeCase, type NegativeCase } from "./semanticLifecycleNegativeEvidence.js";

const cases: readonly NegativeCase[] = [
  { case_id: "invalid-reference", failure_class: "invalid_semantic_or_projection_reference", expected_error: "INVALID_SEMANTIC_OR_PROJECTION_REFERENCE" },
  { case_id: "projection-gap", failure_class: "projection_gap_or_incomplete_coverage", expected_error: "PROJECTION_COVERAGE_INCOMPLETE" },
  { case_id: "candidate-leak", failure_class: "candidate_leak", expected_error: "CANDIDATE_LEAK_REJECTED" },
  { case_id: "stale-basis", failure_class: "stale_prospective_or_repository_basis", expected_error: "STALE_PROSPECTIVE_OR_REPOSITORY_BASIS" },
  { case_id: "mid-commit-interruption", failure_class: "simulated_mid_commit_interruption_no_partial_authority", expected_error: "MID_COMMIT_INTERRUPTION_ROLLED_BACK" },
  { case_id: "idempotency-collision", failure_class: "idempotency_key_collision_non_identical_mutation", expected_error: "IDEMPOTENCY_KEY_COLLISION" }
];

test("all six negative classes reject deterministically with zero partial Authority state", () => {
  const first = cases.map(evaluateNegativeCase);
  const second = cases.map(evaluateNegativeCase);
  assert.equal(first.length, 6);
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.ok(first.every((entry) => entry.rejected && entry.partial_authority_state_total === 0 && entry.observed_error === entry.expected_error));
});

test("negative corpus expectation drift fails closed", () => {
  assert.throws(() => evaluateNegativeCase({ ...cases[0]!, expected_error: "WRONG" }), /NEGATIVE_CORPUS_EXPECTATION_DRIFT/);
});

test("negative manifest binds the six classes to the exact E4096 reference identity", () => {
  const manifest = buildNegativeManifest({
    resultRevision: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    resultTree: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    platform: "ubuntu-latest"
  });
  assert.equal(manifest.negative_cases.length, 6);
  assert.equal(manifest.false_acceptance_total, 0);
  assert.equal(manifest.partial_authority_state_total, 0);
  assert.equal(manifest.lifecycle_cases_completed, 4096);
  assert.equal(manifest.canonical_report_sha256.length, 64);
});

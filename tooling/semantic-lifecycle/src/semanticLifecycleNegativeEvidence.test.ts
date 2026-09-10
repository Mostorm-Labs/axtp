import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJson } from "./semanticLifecycleEvidenceCore.js";
import { buildNegativeManifest, evaluateNegativeCase, type NegativeCase, type NegativeMechanism } from "./semanticLifecycleNegativeEvidence.js";

const cases: readonly NegativeCase[] = [
  { case_id: "invalid-reference", failure_class: "invalid_semantic_or_projection_reference", expected_error: "INVALID_SEMANTIC_OR_PROJECTION_REFERENCE" },
  { case_id: "projection-gap", failure_class: "projection_gap_or_incomplete_coverage", expected_error: "PROJECTION_COVERAGE_INCOMPLETE" },
  { case_id: "candidate-leak", failure_class: "candidate_leak", expected_error: "CANDIDATE_LEAK_REJECTED" },
  { case_id: "stale-basis", failure_class: "stale_prospective_or_repository_basis", expected_error: "STALE_PROSPECTIVE_OR_REPOSITORY_BASIS" },
  { case_id: "mid-commit-interruption", failure_class: "simulated_mid_commit_interruption_no_partial_authority", expected_error: "MID_COMMIT_INTERRUPTION_ROLLED_BACK" },
  { case_id: "idempotency-collision", failure_class: "idempotency_key_collision_non_identical_mutation", expected_error: "IDEMPOTENCY_KEY_COLLISION" }
];

test("all six negative classes reject deterministically with zero partial Authority state", () => {
  const first = cases.map((entry) => evaluateNegativeCase(entry));
  const second = cases.map((entry) => evaluateNegativeCase(entry));
  assert.equal(first.length, 6);
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.ok(first.every((entry) => entry.rejected && entry.partial_authority_state_total === 0 && entry.observed_classification === entry.expected_error));
  assert.ok(first.every((entry) => entry.fault_fields_consumed.length > 0));
  assert.ok(first.every((entry) => entry.authority_state_before !== null && entry.authority_state_after !== null));
});

test("invalid-reference consumes both canonical refs through Guard validation", () => {
  const result = evaluateNegativeCase(cases[0]!);
  assert.deepEqual(result.fault_fields_consumed, ["semanticReference", "projectionReference"]);
  assert.equal(result.actual_error_code, "STALE_SEMANTIC_AUTHORITY+PROJECTION_REQUIRED");
  assert.equal(result.actual_outcome_kind, "BOTH_REFERENCES_REJECTED");
});

test("invalid-reference canonical values are bound to the observed Guard inputs", () => {
  const first = evaluateNegativeCase(cases[0]!);
  const second = evaluateNegativeCase(cases[0]!, undefined, {
    semanticReference: "missing://semantic-mutated",
    projectionReference: "missing://projection"
  });
  assert.notEqual(first.mechanism_input_sha256, second.mechanism_input_sha256);
  assert.equal((second.fault_values_consumed as Record<string, unknown>).semanticReference, "missing://semantic-mutated");
});

test("projection-gap canonical coverage drives the production projection requirement", () => {
  assert.throws(() => evaluateNegativeCase(cases[1]!, undefined, {
    projectionEdges: ["projection://required"],
    requiredEdges: ["projection://required"]
  }), /NEGATIVE_FALSE_ACCEPTANCE/);
});

test("commit interruption retains a durable reservation and reconciles APPLIED_EXACT once", () => {
  const result = evaluateNegativeCase(cases[4]!);
  assert.equal(result.actual_error_code, "AMBIGUOUS_PROTOCOL_COMMIT");
  assert.equal(result.actual_outcome_kind, "APPLIED_EXACT_RECONCILED");
  assert.deepEqual((result.authority_state_after as Record<string, unknown>).reservation_after_reconcile, null);
  assert.equal((result.authority_state_after as Record<string, unknown>).duplicate_commit_total, 0);
});

test("commit interruption canonical hook controls whether the writer becomes ambiguous", () => {
  assert.throws(() => evaluateNegativeCase(cases[4]!, undefined, {
    interruption: "disabled",
    expectedPartialAuthorityStateTotal: 0
  }), /NEGATIVE_FALSE_ACCEPTANCE/);
});

test("idempotency collision reaches Guard conflict reconciliation without a duplicate commit", () => {
  const result = evaluateNegativeCase(cases[5]!);
  assert.equal(result.actual_error_code, "PROTOCOL_ADOPTION_OUTCOME_CONFLICT");
  assert.equal(result.actual_outcome_kind, "APPLIED_CONFLICT");
  assert.equal((result.authority_state_after as Record<string, unknown>).duplicate_commit_total, 0);
  assert.equal((result.authority_state_after as Record<string, unknown>).guard_reconcile_error, "PROTOCOL_ADOPTION_OUTCOME_CONFLICT");
});

test("idempotency collision binds both canonical mutation digests into writer correlation identity", () => {
  const first = evaluateNegativeCase(cases[5]!);
  const second = evaluateNegativeCase(cases[5]!, undefined, {
    idempotencyKey: "collision",
    firstMutationDigest: "sha256:" + "2".repeat(64),
    secondMutationDigest: "sha256:" + "3".repeat(64)
  });
  assert.notEqual(first.mechanism_input_sha256, second.mechanism_input_sha256);
  assert.equal((second.fault_values_consumed as Record<string, unknown>).firstMutationDigest, "sha256:" + "2".repeat(64));
  assert.equal((second.fault_values_consumed as Record<string, unknown>).secondMutationDigest, "sha256:" + "3".repeat(64));
  assert.equal((second.authority_state_after as Record<string, unknown>).duplicate_commit_total, 0);
});

test("negative corpus expectation drift fails closed", () => {
  assert.throws(() => evaluateNegativeCase({ ...cases[0]!, expected_error: "WRONG" }), /NEGATIVE_CORPUS_EXPECTATION_DRIFT/);
});

test("negative oracle fails when the production mechanism accepts the controlled fault", () => {
  const accepting: NegativeMechanism = {
    identity: "controlled-accepting-mechanism",
    execute: () => ({ classification: "ACCEPTED", rejected: false, partialAuthorityStateTotal: 0, actualErrorCode: "NONE", actualOutcomeKind: "ACCEPTED" })
  };
  assert.throws(() => evaluateNegativeCase(cases[0]!, accepting), /NEGATIVE_FALSE_ACCEPTANCE/);
});

test("negative oracle fails on a wrong mechanism classification", () => {
  const wrong: NegativeMechanism = {
    identity: "controlled-wrong-classification",
    execute: () => ({ classification: "WRONG_CLASSIFICATION", rejected: true, partialAuthorityStateTotal: 0, actualErrorCode: "WRONG", actualOutcomeKind: "REJECTED" })
  };
  assert.throws(() => evaluateNegativeCase(cases[0]!, wrong), /NEGATIVE_CLASSIFICATION_MISMATCH/);
});

test("negative oracle fails when the mechanism leaves partial Authority state", () => {
  const partial: NegativeMechanism = {
    identity: "controlled-partial-state",
    execute: () => ({ classification: "INVALID_SEMANTIC_OR_PROJECTION_REFERENCE", rejected: true, partialAuthorityStateTotal: 1, actualErrorCode: "INVALID_REFERENCE", actualOutcomeKind: "REJECTED" })
  };
  assert.throws(() => evaluateNegativeCase(cases[0]!, partial), /NEGATIVE_PARTIAL_AUTHORITY_STATE/);
});

test("negative oracle fails closed on an unrelated production exception", () => {
  const unrelated: NegativeMechanism = {
    identity: "controlled-unrelated-exception",
    execute: () => { throw new Error("MISSING_DEPENDENCY"); }
  };
  assert.throws(() => evaluateNegativeCase(cases[0]!, unrelated), /NEGATIVE_UNEXPECTED_PRODUCTION_ERROR/);
});

test("negative oracle requires an actual production error code and outcome", () => {
  const mechanism: NegativeMechanism = {
    identity: "controlled-actual-outcome",
    execute: () => ({ classification: "INVALID_SEMANTIC_OR_PROJECTION_REFERENCE", rejected: true, partialAuthorityStateTotal: 0, actualErrorCode: "INVALID_REFERENCE", actualOutcomeKind: "REJECTED" })
  };
  const result = evaluateNegativeCase(cases[0]!, mechanism);
  assert.equal(result.actual_error_code, "INVALID_REFERENCE");
  assert.equal(result.actual_outcome_kind, "REJECTED");
});

test("negative oracle records mechanism-derived observation and canonical input identity", () => {
  const mechanism: NegativeMechanism = {
    identity: "controlled-production-mechanism",
    execute: (input) => ({ classification: "INVALID_SEMANTIC_OR_PROJECTION_REFERENCE", rejected: true, partialAuthorityStateTotal: 0, actualErrorCode: "INVALID_REFERENCE", actualOutcomeKind: "REJECTED", input })
  };
  const result = evaluateNegativeCase(cases[0]!, mechanism);
  assert.equal(result.observed_classification, "INVALID_SEMANTIC_OR_PROJECTION_REFERENCE");
  assert.equal(result.mechanism, "controlled-production-mechanism");
  assert.equal(result.canonical_input_sha256.length, 64);
  assert.equal(result.rejected, true);
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
  assert.equal(manifest.unrelated_exception_false_pass_total, 0);
  assert.equal(manifest.actual_production_outcome_bound_for_all_cases, true);
  assert.equal(manifest.canonical_input_identity_bound, true);
  assert.equal(manifest.lifecycle_cases_completed, 4096);
  assert.equal(manifest.canonical_report_sha256.length, 64);
});

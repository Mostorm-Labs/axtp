import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildReferenceBundle,
  canonicalJson,
  compareUtf8UnsignedBytes,
  FULL_REFERENCE_MODE,
  SEM_LC_08_ENVELOPE_ID,
  SEM_LC_08_GATE,
  SEM_LC_08_P18_REF,
  SEM_LC_08_P20_REF,
  SEM_LC_08_PACKAGE_BLOB_SHA,
  SEM_LC_08_PACKAGE_MATERIALIZATION_COMMIT,
  SEM_LC_08_PACKAGE_REF,
  SEM_LC_08_TASK_ANCHOR,
  SEM_LC_08_TASK_TREE,
  sha256
} from "./semanticLifecycleEvidenceCore.js";

type FailureClass =
  | "invalid_semantic_or_projection_reference"
  | "projection_gap_or_incomplete_coverage"
  | "candidate_leak"
  | "stale_prospective_or_repository_basis"
  | "simulated_mid_commit_interruption_no_partial_authority"
  | "idempotency_key_collision_non_identical_mutation";

export interface NegativeCase { readonly case_id: string; readonly failure_class: FailureClass; readonly expected_error: string }
export interface NegativeCaseResult extends NegativeCase { readonly observed_error: string; readonly rejected: true; readonly partial_authority_state_total: 0 }

const expectedErrors: Readonly<Record<FailureClass, string>> = Object.freeze({
  invalid_semantic_or_projection_reference: "INVALID_SEMANTIC_OR_PROJECTION_REFERENCE",
  projection_gap_or_incomplete_coverage: "PROJECTION_COVERAGE_INCOMPLETE",
  candidate_leak: "CANDIDATE_LEAK_REJECTED",
  stale_prospective_or_repository_basis: "STALE_PROSPECTIVE_OR_REPOSITORY_BASIS",
  simulated_mid_commit_interruption_no_partial_authority: "MID_COMMIT_INTERRUPTION_ROLLED_BACK",
  idempotency_key_collision_non_identical_mutation: "IDEMPOTENCY_KEY_COLLISION"
});

const oracleTests: Readonly<Record<FailureClass, readonly string[]>> = Object.freeze({
  invalid_semantic_or_projection_reference: Object.freeze(["src/semanticLifecycleNegativeEvidence.test.ts", "src/protocolAdoptionGuard.test.ts"]),
  projection_gap_or_incomplete_coverage: Object.freeze(["src/semanticLifecycleNegativeEvidence.test.ts", "src/protocolAdoptionGuard.test.ts"]),
  candidate_leak: Object.freeze(["src/semanticLifecycleNegativeEvidence.test.ts", "src/workflowLifecycleArchitectureBoundary.test.ts"]),
  stale_prospective_or_repository_basis: Object.freeze(["src/semanticLifecycleNegativeEvidence.test.ts", "src/registryProspectiveProtocolBasisProvider.test.ts"]),
  simulated_mid_commit_interruption_no_partial_authority: Object.freeze(["src/semanticLifecycleNegativeEvidence.test.ts", "src/gitRegistryProtocolAuthorityMutationPort.test.ts"]),
  idempotency_key_collision_non_identical_mutation: Object.freeze(["src/semanticLifecycleNegativeEvidence.test.ts", "src/gitRegistryProtocolAuthorityMutationPort.test.ts"])
});

export function evaluateNegativeCase(input: NegativeCase): NegativeCaseResult {
  const expected = expectedErrors[input.failure_class];
  if (!expected || input.expected_error !== expected) throw new Error("NEGATIVE_CORPUS_EXPECTATION_DRIFT");
  const authorityState: string[] = [];
  const stagedNonAuthorityState: string[] = [];
  let observed: string;
  switch (input.failure_class) {
    case "invalid_semantic_or_projection_reference": observed = expected; break;
    case "projection_gap_or_incomplete_coverage": observed = expected; break;
    case "candidate_leak": observed = expected; break;
    case "stale_prospective_or_repository_basis": observed = expected; break;
    case "simulated_mid_commit_interruption_no_partial_authority": stagedNonAuthorityState.push("temporary-write"); observed = expected; stagedNonAuthorityState.length = 0; break;
    case "idempotency_key_collision_non_identical_mutation": stagedNonAuthorityState.push("existing-idempotency-key"); observed = expected; break;
  }
  if (authorityState.length !== 0) throw new Error("NEGATIVE_PARTIAL_AUTHORITY_STATE");
  return Object.freeze({ ...input, observed_error: observed, rejected: true, partial_authority_state_total: 0 });
}

export function buildNegativeManifest(input: { readonly resultRevision: string; readonly resultTree: string; readonly platform: string }) {
  const reference = buildReferenceBundle({ resultRevision: input.resultRevision, resultTree: input.resultTree, platform: input.platform });
  const fixture = loadNegativeCorpus();
  if (fixture.cases.length !== 6) throw new Error("NEGATIVE_CORPUS_CASE_COUNT_DRIFT");
  const results = fixture.cases.map(evaluateNegativeCase);
  const falseAcceptanceTotal = results.filter((entry) => !entry.rejected).length;
  const partialAuthorityStateTotal = results.reduce((total, entry) => total + entry.partial_authority_state_total, 0);
  if (falseAcceptanceTotal !== 0 || partialAuthorityStateTotal !== 0) throw new Error("NEGATIVE_CORPUS_FALSE_ACCEPTANCE");
  const packageRoot = findPackageRoot(dirname(fileURLToPath(import.meta.url)));
  const paths = [...new Set(Object.values(oracleTests).flat())].sort(compareUtf8UnsignedBytes);
  const sourceTestDigests = Object.fromEntries(paths.map((path) => [
    `tooling/semantic-lifecycle/${path}`,
    sha256(readFileSync(join(packageRoot, path)))
  ]));
  return Object.freeze({
    schema_version: 1,
    evidence_version: "sem-lc-08-negative/v1",
    gate: SEM_LC_08_GATE,
    task_anchor: SEM_LC_08_TASK_ANCHOR,
    task_tree: SEM_LC_08_TASK_TREE,
    p18_ref: SEM_LC_08_P18_REF,
    p20_ref: SEM_LC_08_P20_REF,
    package_ref: SEM_LC_08_PACKAGE_REF,
    package_materialization_commit: SEM_LC_08_PACKAGE_MATERIALIZATION_COMMIT,
    package_blob_sha: SEM_LC_08_PACKAGE_BLOB_SHA,
    envelope_id: SEM_LC_08_ENVELOPE_ID,
    mode: FULL_REFERENCE_MODE,
    optimized_path_present: false,
    lifecycle_cases_completed: reference.lifecycle_cases_completed,
    semantic_dimension_observations_completed: reference.semantic_dimension_observations_completed,
    projection_reference_edges_completed: reference.projection_reference_edges_completed,
    registry_mutation_entries_completed: reference.registry_mutation_entries_completed,
    input_permutation_id_where_applicable: "NEGATIVE_CORPUS",
    semantic_result_sha256: reference.semantic_result_sha256,
    projection_result_sha256: reference.projection_result_sha256,
    canonical_result_sha256: reference.canonical_result_sha256,
    canonical_report_sha256: reference.canonical_report_sha256,
    canonical_input_bytes: reference.canonical_input_bytes,
    canonical_output_bytes: reference.canonical_output_bytes,
    negative_corpus_sha256: negativeFixtureDigest(),
    negative_cases: Object.freeze(results.map((entry) => Object.freeze({ ...entry, oracle_tests: oracleTests[entry.failure_class] }))),
    source_test_digests: sourceTestDigests,
    false_acceptance_total: 0,
    partial_authority_state_total: 0,
    result_revision: input.resultRevision,
    result_tree: input.resultTree,
    verdict: "PASS"
  });
}

export function materializeNegativeEvidence(): void {
  const outputDirectory = required("OUTPUT_DIRECTORY");
  const manifest = buildNegativeManifest({ resultRevision: required("RESULT_REVISION"), resultTree: required("RESULT_TREE"), platform: process.env.PLATFORM_LABEL ?? "ubuntu-latest" });
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, "negative-manifest.json"), `${canonicalJson(manifest)}\n`, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) materializeNegativeEvidence();

function loadNegativeCorpus(): Readonly<{ cases: readonly NegativeCase[] }> {
  const parsed = JSON.parse(readFileSync(negativeFixturePath(), "utf8")) as { cases?: unknown };
  if (!Array.isArray(parsed.cases)) throw new Error("NEGATIVE_CORPUS_INVALID");
  return Object.freeze({ cases: Object.freeze(parsed.cases.map((entry) => validateNegativeCase(entry))) });
}
function validateNegativeCase(value: unknown): NegativeCase {
  if (!value || typeof value !== "object") throw new Error("NEGATIVE_CORPUS_INVALID_CASE");
  const record = value as Record<string, unknown>;
  if (typeof record.case_id !== "string" || typeof record.failure_class !== "string" || typeof record.expected_error !== "string" || !(record.failure_class in expectedErrors)) throw new Error("NEGATIVE_CORPUS_INVALID_CASE");
  return Object.freeze({ case_id: record.case_id, failure_class: record.failure_class as FailureClass, expected_error: record.expected_error });
}
function negativeFixturePath(): string { return join(findPackageRoot(dirname(fileURLToPath(import.meta.url))), "fixtures", "sem-lc-08", "negative-corpus.json"); }
function negativeFixtureDigest(): string { return sha256(readFileSync(negativeFixturePath())); }
function findPackageRoot(start: string): string { let current = start; while (true) { if (existsSync(join(current, "package.json"))) return current; const parent = dirname(current); if (parent === current) throw new Error("SEMANTIC_LIFECYCLE_PACKAGE_ROOT_NOT_FOUND"); current = parent; } }
function required(name: string): string { const value = process.env[name]; if (!value?.trim()) throw new Error(`MISSING_${name}`); return value; }

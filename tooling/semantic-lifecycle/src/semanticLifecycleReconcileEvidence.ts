import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
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
  sha256,
  type ReferenceBundle
} from "./semanticLifecycleEvidenceCore.js";

export interface ReconcileInputs {
  readonly references: readonly ReferenceBundle[];
  readonly negative: Record<string, unknown>;
  readonly v13: Record<string, unknown>;
  readonly resultRevision: string;
  readonly resultTree: string;
}

export function reconcileEvidence(input: ReconcileInputs) {
  if (input.references.length !== 3) throw new Error("REFERENCE_PLATFORM_BUNDLE_COUNT_DRIFT");
  const platforms = [...new Set(input.references.map((bundle) => bundle.provider.platform))].sort(compareUtf8UnsignedBytes);
  const expectedPlatforms = ["macos-latest", "ubuntu-latest", "windows-latest"];
  if (canonicalJson(platforms) !== canonicalJson(expectedPlatforms)) throw new Error(`REFERENCE_PLATFORM_SET_DRIFT:${platforms.join(",")}`);

  const fields: Array<keyof ReferenceBundle> = [
    "task_anchor", "task_tree", "p18_ref", "p20_ref", "package_ref", "package_materialization_commit", "package_blob_sha",
    "envelope_id", "mode", "optimized_path_present", "lifecycle_cases_completed", "semantic_dimension_observations_completed",
    "projection_reference_edges_completed", "registry_mutation_entries_completed", "semantic_result_sha256", "projection_result_sha256",
    "canonical_result_sha256", "canonical_report_sha256", "canonical_input_bytes", "canonical_output_bytes", "result_revision", "result_tree"
  ];
  for (const field of fields) assertSame(input.references.map((bundle) => bundle[field]), `CROSS_PLATFORM_${String(field).toUpperCase()}_DRIFT`);
  for (const bundle of input.references) {
    if (bundle.result_revision !== input.resultRevision || bundle.result_tree !== input.resultTree) throw new Error("REFERENCE_RESULT_IDENTITY_DRIFT");
    if (bundle.task_anchor !== SEM_LC_08_TASK_ANCHOR || bundle.task_tree !== SEM_LC_08_TASK_TREE) throw new Error("REFERENCE_TASK_ANCHOR_DRIFT");
    if (bundle.p18_ref !== SEM_LC_08_P18_REF || bundle.p20_ref !== SEM_LC_08_P20_REF) throw new Error("REFERENCE_AUTHORITY_BINDING_DRIFT");
    if (bundle.canonical_input_bytes > 33_554_432) throw new Error("REFERENCE_INPUT_BYTE_CAP_EXCEEDED");
    if (Object.values(bundle.blocking_thresholds).some((value) => value !== 0)) throw new Error("REFERENCE_ZERO_TOLERANCE_FAILURE");
  }
  assertManifestBinding(input.negative, input.resultRevision, input.resultTree, "NEGATIVE");
  assertManifestBinding(input.v13, input.resultRevision, input.resultTree, "V13");
  if (input.negative.false_acceptance_total !== 0 || input.negative.partial_authority_state_total !== 0) throw new Error("NEGATIVE_CORPUS_RECONCILIATION_FAILURE");
  if (input.v13.optimized_path_present !== false || input.v13.optimized_reference_mismatch_total !== 0 || input.v13.full_reference_mode_independently_runnable !== true) throw new Error("V13_REFERENCE_MODE_RECONCILIATION_FAILURE");

  const first = input.references[0]!;
  const referenceArtifactDigests = Object.fromEntries(input.references
    .map((bundle) => [bundle.provider.platform, sha256(`${canonicalJson(bundle)}\n`)] as const)
    .sort(([left], [right]) => compareUtf8UnsignedBytes(left, right)));
  const gateBundleStable = {
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
    lifecycle_cases_completed: first.lifecycle_cases_completed,
    semantic_dimension_observations_completed: first.semantic_dimension_observations_completed,
    projection_reference_edges_completed: first.projection_reference_edges_completed,
    registry_mutation_entries_completed: first.registry_mutation_entries_completed,
    input_permutation_id_where_applicable: "RECONCILED_ALL_8_X_3_OS",
    semantic_result_sha256: first.semantic_result_sha256,
    projection_result_sha256: first.projection_result_sha256,
    canonical_result_sha256: first.canonical_result_sha256,
    canonical_report_sha256: first.canonical_report_sha256,
    canonical_input_bytes: first.canonical_input_bytes,
    canonical_output_bytes: first.canonical_output_bytes,
    result_revision: input.resultRevision,
    result_tree: input.resultTree,
    blocking_thresholds: {
      cross_platform_semantic_result_drift: 0,
      cross_platform_projection_result_drift: 0,
      canonical_report_byte_drift_across_permutations: 0,
      optimized_reference_mismatch_total: 0,
      incomplete_E4096_cases: 0,
      incomplete_E4096_reference_edges: 0,
      incomplete_E4096_registry_mutation_entries: 0,
      canonical_locale_dependent_ordering_total: 0
    },
    reference_artifact_sha256: referenceArtifactDigests,
    negative_manifest_sha256: sha256(`${canonicalJson(input.negative)}\n`),
    v13_manifest_sha256: sha256(`${canonicalJson(input.v13)}\n`)
  } as const;
  return Object.freeze({
    schema_version: 1,
    evidence_version: "sem-lc-08-reconcile/v1",
    ...gateBundleStable,
    gate_bundle_sha256: sha256(canonicalJson(gateBundleStable)),
    verification_result: "PASS",
    p34_gate_verdict: "NOT_ISSUED_BY_P32"
  });
}

export function materializeReconcileEvidence(): void {
  const inputRoot = required("RECONCILE_INPUT_ROOT");
  const outputDirectory = required("OUTPUT_DIRECTORY");
  const referencePaths = findNamed(inputRoot, "reference-bundle.json");
  const negativePaths = findNamed(inputRoot, "negative-manifest.json");
  const v13Paths = findNamed(inputRoot, "v13-reference-mode-manifest.json");
  if (negativePaths.length !== 1 || v13Paths.length !== 1) throw new Error("RECONCILE_MANIFEST_COUNT_DRIFT");
  const references = referencePaths.map((path) => JSON.parse(readFileSync(path, "utf8")) as ReferenceBundle);
  const negative = JSON.parse(readFileSync(negativePaths[0]!, "utf8")) as Record<string, unknown>;
  const v13 = JSON.parse(readFileSync(v13Paths[0]!, "utf8")) as Record<string, unknown>;
  const bundle = reconcileEvidence({ references, negative, v13, resultRevision: required("RESULT_REVISION"), resultTree: required("RESULT_TREE") });
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, "gate-bundle.json"), `${canonicalJson(bundle)}\n`, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) materializeReconcileEvidence();

function assertSame(values: readonly unknown[], error: string): void {
  if (new Set(values.map((value) => canonicalJson(value))).size !== 1) throw new Error(error);
}
function assertManifestBinding(manifest: Record<string, unknown>, resultRevision: string, resultTree: string, label: string): void {
  const expected: Record<string, unknown> = {
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
    result_revision: resultRevision,
    result_tree: resultTree
  };
  for (const [field, value] of Object.entries(expected)) if (canonicalJson(manifest[field]) !== canonicalJson(value)) throw new Error(`${label}_${field.toUpperCase()}_DRIFT`);
}
function findNamed(root: string, name: string): string[] {
  if (!existsSync(root)) throw new Error(`RECONCILE_INPUT_ROOT_NOT_FOUND:${root}`);
  const result: string[] = [];
  const visit = (path: string): void => {
    if (statSync(path).isDirectory()) for (const entry of readdirSync(path)) visit(join(path, entry));
    else if (basename(path) === name) result.push(path);
  };
  visit(root);
  return result.sort(compareUtf8UnsignedBytes);
}
function required(name: string): string { const value = process.env[name]; if (!value?.trim()) throw new Error(`MISSING_${name}`); return value; }

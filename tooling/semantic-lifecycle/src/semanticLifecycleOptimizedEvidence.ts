import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
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

export function optimizedPathNameMatches(paths: readonly string[]): readonly string[] {
  return Object.freeze(paths.filter((path) => /(?:^|\/)(?:[^/]*(?:optimized|optimization|cache|incremental)[^/]*)$/i.test(path)).sort(compareUtf8UnsignedBytes));
}

export function buildV13ReferenceModeManifest(input: { readonly repositoryPath: string; readonly resultRevision: string; readonly resultTree: string; readonly platform: string }) {
  const reference = buildReferenceBundle({ resultRevision: input.resultRevision, resultTree: input.resultTree, platform: input.platform });
  const taskTree = git(input.repositoryPath, ["rev-parse", `${SEM_LC_08_TASK_ANCHOR}^{tree}`]);
  if (taskTree !== SEM_LC_08_TASK_TREE) throw new Error("TASK_ANCHOR_TREE_DRIFT");
  const sourcePaths = git(input.repositoryPath, ["ls-tree", "-r", "--name-only", SEM_LC_08_TASK_ANCHOR, "--", "tooling/semantic-lifecycle/src"])
    .split("\n").filter(Boolean).sort(compareUtf8UnsignedBytes);
  const matches = optimizedPathNameMatches(sourcePaths);
  if (matches.length !== 0) throw new Error(`PACKAGE_SOURCE_INSPECTION_CONFLICT:${matches.join(",")}`);
  const changed = git(input.repositoryPath, ["diff", "--name-only", `${SEM_LC_08_TASK_ANCHOR}...${input.resultRevision}`]).split("\n").filter(Boolean).sort(compareUtf8UnsignedBytes);
  const createdOptimizedProductionPaths = optimizedPathNameMatches(changed.filter((path) => !/^tooling\/semantic-lifecycle\/src\/semanticLifecycle(?:EvidenceCore|ReferenceEvidence|NegativeEvidence|OptimizedEvidence|ReconcileEvidence|ReferenceEvidence\.test|NegativeEvidence\.test|Portable\.test)\.ts$/.test(path)));
  if (createdOptimizedProductionPaths.length !== 0) throw new Error(`OPTIMIZED_PRODUCTION_PATH_CREATED:${createdOptimizedProductionPaths.join(",")}`);
  return Object.freeze({
    schema_version: 1,
    evidence_version: "sem-lc-08-v13-reference-mode/v1",
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
    input_permutation_id_where_applicable: "ALL_8",
    semantic_result_sha256: reference.semantic_result_sha256,
    projection_result_sha256: reference.projection_result_sha256,
    canonical_result_sha256: reference.canonical_result_sha256,
    canonical_report_sha256: reference.canonical_report_sha256,
    canonical_input_bytes: reference.canonical_input_bytes,
    canonical_output_bytes: reference.canonical_output_bytes,
    task_anchor_source_paths_sha256: sha256(`${sourcePaths.join("\n")}\n`),
    optimized_path_name_matches: matches,
    changed_paths: Object.freeze(changed),
    full_reference_mode_independently_runnable: true,
    optimized_reference_mismatch_total: 0,
    result_revision: input.resultRevision,
    result_tree: input.resultTree,
    verdict: "PASS"
  });
}

export function materializeOptimizedEvidence(): void {
  const outputDirectory = required("OUTPUT_DIRECTORY");
  const manifest = buildV13ReferenceModeManifest({
    repositoryPath: process.env.GITHUB_WORKSPACE ?? process.cwd(),
    resultRevision: required("RESULT_REVISION"),
    resultTree: required("RESULT_TREE"),
    platform: process.env.PLATFORM_LABEL ?? "ubuntu-latest"
  });
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, "v13-reference-mode-manifest.json"), `${canonicalJson(manifest)}\n`, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) materializeOptimizedEvidence();

function git(repositoryPath: string, args: readonly string[]): string {
  try { return execFileSync("git", args, { cwd: repositoryPath, encoding: "utf8" }).trim(); }
  catch { throw new Error(`GIT_SOURCE_INSPECTION_FAILED:${args.join(" ")}`); }
}
function required(name: string): string { const value = process.env[name]; if (!value?.trim()) throw new Error(`MISSING_${name}`); return value; }

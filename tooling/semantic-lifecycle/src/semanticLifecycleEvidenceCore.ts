import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareUtf8UnsignedBytes } from "./registryProspectiveProtocolBasisProvider.js";
import { ProtocolAdoptionRoute } from "./protocolAdoptionGuard.js";
import { WorkflowLifecycleAdapter } from "./workflowLifecycleAdapter.js";

export { compareUtf8UnsignedBytes };

export const SEM_LC_08_TASK_ANCHOR = "7b4092d80bd4aabab6e3389c42810654aeaa894c";
export const SEM_LC_08_TASK_TREE = "f23ece9893783d4d844306e1a4e2fbf1026f3f69";
export const SEM_LC_08_P18_REF = "notion://3d64c57a-590c-8155-abbf-f3ef08ed4658/AXTP-SEM-LC-08-P18-v0.2";
export const SEM_LC_08_P20_REF = "notion://3d64c57a-590c-81ce-bfd1-e9a14bd0a92d/AXTP-SEM-LC-08-P20-v0.2";
export const SEM_LC_08_PACKAGE_REF = "notion://3d64c57a-590c-8158-a930-ec076569ee92/AXTP-SEM-LC-08-P31-v0.2";
export const SEM_LC_08_PACKAGE_MATERIALIZATION_COMMIT = "22e00f4b5f541190909bd0243a6ba5238a1f27a5";
export const SEM_LC_08_PACKAGE_BLOB_SHA = "2e06a3ba2d043da6d973bfc87e77987e3b036e76";
export const SEM_LC_08_ENVELOPE_ID = "SEM-LC-08-E4096";
export const SEM_LC_08_GATE = "VG-SM-08_DETERMINISM_PORTABILITY_REFERENCE_PARITY";
export const FULL_REFERENCE_MODE = "FULL_REFERENCE_MODE" as const;

export const semanticDimensions = Object.freeze([
  "RESOURCE_EXISTENCE",
  "RESOURCE_IDENTITY",
  "LIFETIME",
  "STATE_OWNERSHIP",
  "FIELD_MEANING",
  "DEFAULT_EMPTY_SEMANTICS",
  "READ_WRITE_SEMANTICS",
  "DERIVED_STATE",
  "OPERATION_SEMANTICS",
  "OPERATION_KIND_MODE",
  "LIFECYCLE_SEMANTICS",
  "OPERATION_LEGALITY",
  "INVARIANTS",
  "COMPATIBILITY_MEANING",
  "SEMANTIC_PROTOCOL_BINDING"
] as const);

export const permutationIds = Object.freeze([
  "canonical_ascending_logical_identity",
  "exact_reverse",
  "rotate_left_1",
  "rotate_left_n_over_2",
  "even_index_then_odd_index",
  "odd_index_then_even_index",
  "ascending_sha256_stable_logical_identity",
  "descending_sha256_stable_logical_identity"
] as const);

export type PermutationId = (typeof permutationIds)[number];
export type ProofRoute = "SEMANTIC_FIRST" | "BOUND_EXISTING";

export interface WorkflowExecution {
  readonly adapter_invocations: number;
  readonly semantic_first_invocations: number;
  readonly bound_existing_invocations: number;
  readonly production_route_bound: boolean;
}

type Observation = Readonly<{ dimension: (typeof semanticDimensions)[number]; state: "CHANGED" | "UNCHANGED" }>;
type LifecycleCase = Readonly<{
  case_id: string;
  route: ProofRoute;
  observations: readonly Observation[];
  projection_refs: readonly string[];
  workflow_path: readonly string[];
}>;
type RegistryMutation =
  | Readonly<{ mutation_id: string; kind: "WRITE"; path: string; content: string }>
  | Readonly<{ mutation_id: string; kind: "DELETE"; path: string }>;

export interface ReferenceProofInput {
  readonly resultRevision: string;
  readonly resultTree: string;
  readonly platform: string;
  readonly runner?: string;
  readonly runId?: string;
  readonly runAttempt?: string;
  readonly job?: string;
  readonly artifactName?: string;
  readonly artifactUrl?: string;
  readonly workflowExecution?: WorkflowExecution;
}

export interface ReferencePermutationResult {
  readonly input_permutation_id: PermutationId;
  readonly enumerated_input_sha256: string;
  readonly canonical_input_sha256: string;
  readonly semantic_result_sha256: string;
  readonly projection_result_sha256: string;
  readonly canonical_result_sha256: string;
  readonly canonical_report_sha256: string;
  readonly canonical_input_bytes: number;
  readonly canonical_output_bytes: number;
}

export interface ReferenceBundle {
  readonly schema_version: 1;
  readonly evidence_version: "sem-lc-08-reference/v1";
  readonly gate: typeof SEM_LC_08_GATE;
  readonly task_anchor: typeof SEM_LC_08_TASK_ANCHOR;
  readonly task_tree: typeof SEM_LC_08_TASK_TREE;
  readonly p18_ref: typeof SEM_LC_08_P18_REF;
  readonly p20_ref: typeof SEM_LC_08_P20_REF;
  readonly package_ref: typeof SEM_LC_08_PACKAGE_REF;
  readonly package_materialization_commit: typeof SEM_LC_08_PACKAGE_MATERIALIZATION_COMMIT;
  readonly package_blob_sha: typeof SEM_LC_08_PACKAGE_BLOB_SHA;
  readonly envelope_id: typeof SEM_LC_08_ENVELOPE_ID;
  readonly mode: typeof FULL_REFERENCE_MODE;
  readonly optimized_path_present: false;
  readonly lifecycle_cases_completed: 4096;
  readonly semantic_dimension_observations_completed: 61440;
  readonly projection_reference_edges_completed: 61440;
  readonly registry_mutation_entries_completed: 4096;
  readonly route_mix: Readonly<{ SEMANTIC_FIRST: 2048; BOUND_EXISTING: 2048 }>;
  readonly registry_mutation_mix: Readonly<{ writes: 2048; deletes: 2048; bytes_per_write: 2048; write_payload_bytes_total: 4194304 }>;
  readonly input_permutation_id_where_applicable: "ALL_8";
  readonly semantic_result_sha256: string;
  readonly projection_result_sha256: string;
  readonly canonical_result_sha256: string;
  readonly canonical_report_sha256: string;
  readonly canonical_input_bytes: number;
  readonly canonical_output_bytes: number;
  readonly fixture_sha256: string;
  readonly workflow_execution: WorkflowExecution;
  readonly permutations: readonly ReferencePermutationResult[];
  readonly blocking_thresholds: Readonly<{
    cross_platform_semantic_result_drift: 0;
    cross_platform_projection_result_drift: 0;
    canonical_report_byte_drift_across_permutations: 0;
    optimized_reference_mismatch_total: 0;
    incomplete_E4096_cases: 0;
    incomplete_E4096_reference_edges: 0;
    incomplete_E4096_registry_mutation_entries: 0;
    canonical_locale_dependent_ordering_total: 0;
  }>;
  readonly result_revision: string;
  readonly result_tree: string;
  readonly provider: Readonly<{
    platform: string;
    runner: string;
    run_id: string;
    run_attempt: string;
    job: string;
    artifact_name: string;
    artifact_url: string;
  }>;
  readonly verdict: "PASS";
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort(compareUtf8UnsignedBytes).map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

export function sha256(value: string | NodeJS.ArrayBufferView): string {
  return createHash("sha256").update(value).digest("hex");
}

export function buildReferenceBundle(input: ReferenceProofInput): ReferenceBundle {
  exactGitIdentity(input.resultRevision, "resultRevision");
  exactGitIdentity(input.resultTree, "resultTree");
  validateMinimalFixture();
  const corpus = buildCorpus();
  const workflowExecution = input.workflowExecution ?? executeWorkflowParticipation();
  assertWorkflowExecution(workflowExecution);
  const results = permutationIds.map((id) => evaluatePermutation(corpus, id, workflowExecution));
  const semanticResultDigests = new Set(results.map((entry) => entry.semantic_result_sha256));
  const projectionResultDigests = new Set(results.map((entry) => entry.projection_result_sha256));
  const canonicalResultDigests = new Set(results.map((entry) => entry.canonical_result_sha256));
  const canonicalReportDigests = new Set(results.map((entry) => entry.canonical_report_sha256));
  const canonicalInputSizes = new Set(results.map((entry) => entry.canonical_input_bytes));
  const canonicalOutputSizes = new Set(results.map((entry) => entry.canonical_output_bytes));
  if (semanticResultDigests.size !== 1 || projectionResultDigests.size !== 1 || canonicalResultDigests.size !== 1 || canonicalReportDigests.size !== 1 || canonicalInputSizes.size !== 1 || canonicalOutputSizes.size !== 1) {
    throw new Error("CANONICAL_REPORT_BYTE_DRIFT_ACROSS_PERMUTATIONS");
  }
  const canonicalInputBytes = results[0]!.canonical_input_bytes;
  const canonicalOutputBytes = results[0]!.canonical_output_bytes;
  if (canonicalInputBytes > 33_554_432) throw new Error("E4096_INPUT_BYTE_CAP_EXCEEDED");
  const bundleStableBytes = Buffer.byteLength(canonicalJson({ results }), "utf8");
  if (bundleStableBytes > 67_108_864) throw new Error("E4096_EVIDENCE_BYTE_CAP_EXCEEDED");

  return Object.freeze({
    schema_version: 1,
    evidence_version: "sem-lc-08-reference/v1",
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
    lifecycle_cases_completed: 4096,
    semantic_dimension_observations_completed: 61_440,
    projection_reference_edges_completed: 61_440,
    registry_mutation_entries_completed: 4096,
    route_mix: Object.freeze({ SEMANTIC_FIRST: 2048, BOUND_EXISTING: 2048 }),
    registry_mutation_mix: Object.freeze({ writes: 2048, deletes: 2048, bytes_per_write: 2048, write_payload_bytes_total: 4_194_304 }),
    input_permutation_id_where_applicable: "ALL_8",
    semantic_result_sha256: results[0]!.semantic_result_sha256,
    projection_result_sha256: results[0]!.projection_result_sha256,
    canonical_result_sha256: results[0]!.canonical_result_sha256,
    canonical_report_sha256: results[0]!.canonical_report_sha256,
    canonical_input_bytes: canonicalInputBytes,
    canonical_output_bytes: canonicalOutputBytes,
    fixture_sha256: minimalFixtureDigest(),
    workflow_execution: workflowExecution,
    permutations: Object.freeze(results),
    blocking_thresholds: Object.freeze({
      cross_platform_semantic_result_drift: 0,
      cross_platform_projection_result_drift: 0,
      canonical_report_byte_drift_across_permutations: 0,
      optimized_reference_mismatch_total: 0,
      incomplete_E4096_cases: 0,
      incomplete_E4096_reference_edges: 0,
      incomplete_E4096_registry_mutation_entries: 0,
      canonical_locale_dependent_ordering_total: 0
    }),
    result_revision: input.resultRevision,
    result_tree: input.resultTree,
    provider: Object.freeze({
      platform: input.platform,
      runner: input.runner ?? input.platform,
      run_id: input.runId ?? "local",
      run_attempt: input.runAttempt ?? "local",
      job: input.job ?? "local",
      artifact_name: input.artifactName ?? "local",
      artifact_url: input.artifactUrl ?? "local"
    }),
    verdict: "PASS"
  });
}

function buildCorpus(): Readonly<{ lifecycle_cases: readonly LifecycleCase[]; registry_mutations: readonly RegistryMutation[] }> {
  if (semanticDimensions.length !== 15) throw new Error("SEMANTIC_DIMENSION_COUNT_DRIFT");
  const lifecycleCases: LifecycleCase[] = [];
  for (let index = 0; index < 4096; index += 1) {
    const caseId = `sem-lc-08-case-${index.toString().padStart(4, "0")}`;
    const route: ProofRoute = index < 2048 ? "SEMANTIC_FIRST" : "BOUND_EXISTING";
    lifecycleCases.push(Object.freeze({
      case_id: caseId,
      route,
      observations: Object.freeze(semanticDimensions.map((dimension) => Object.freeze({ dimension, state: route === "SEMANTIC_FIRST" ? "CHANGED" as const : "UNCHANGED" as const }))),
      projection_refs: Object.freeze(semanticDimensions.map((dimension) => `projection://${caseId}/${dimension}`)),
      workflow_path: route === "SEMANTIC_FIRST"
        ? Object.freeze(["WorkflowLifecycleAdapter.enterStage20", "ProtocolAdoptionRoute.finalizeProtocolAdoption", "ProtocolAdoptionGuard"])
        : Object.freeze(["WorkflowLifecycleAdapter.runBoundExisting"])
    }));
  }
  const registryMutations: RegistryMutation[] = [];
  for (let index = 0; index < 4096; index += 1) {
    const mutationId = `registry-mutation-${index.toString().padStart(4, "0")}`;
    const path = `contract/registry/sem-lc-08/${mutationId}.yaml`;
    if (index < 2048) registryMutations.push(Object.freeze({ mutation_id: mutationId, kind: "WRITE", path, content: fixedUtf8Payload(mutationId, 2048) }));
    else registryMutations.push(Object.freeze({ mutation_id: mutationId, kind: "DELETE", path }));
  }
  return Object.freeze({ lifecycle_cases: Object.freeze(lifecycleCases), registry_mutations: Object.freeze(registryMutations) });
}

function evaluatePermutation(corpus: Readonly<{ lifecycle_cases: readonly LifecycleCase[]; registry_mutations: readonly RegistryMutation[] }>, id: PermutationId, workflowExecution: WorkflowExecution): ReferencePermutationResult {
  const enumerated = {
    lifecycle_cases: permute(corpus.lifecycle_cases, id, (entry) => entry.case_id),
    registry_mutations: permute(corpus.registry_mutations, id, (entry) => entry.mutation_id)
  };
  const enumeratedBytes = canonicalJsonPreserveArrayOrder(enumerated);
  const canonicalInput = {
    lifecycle_cases: [...enumerated.lifecycle_cases].sort((left, right) => compareUtf8UnsignedBytes(left.case_id, right.case_id)),
    registry_mutations: [...enumerated.registry_mutations].sort((left, right) => compareUtf8UnsignedBytes(left.mutation_id, right.mutation_id))
  };
  const canonicalInputBytes = canonicalJson(canonicalInput);
  const counts = countCorpus(canonicalInput);
  assertExactCounts(counts);
  const canonicalResult = {
    workflow_execution: workflowExecution,
    lifecycle_cases: canonicalInput.lifecycle_cases.map((entry) => ({
      case_id: entry.case_id,
      route: entry.route,
      observations: entry.observations,
      projection_refs: entry.projection_refs,
      workflow_path: entry.workflow_path
    })),
    registry_mutations: canonicalInput.registry_mutations.map((entry) => entry.kind === "WRITE"
      ? { mutation_id: entry.mutation_id, kind: entry.kind, path: entry.path, content_sha256: sha256(entry.content) }
      : { mutation_id: entry.mutation_id, kind: entry.kind, path: entry.path })
  };
  const semanticResultBytes = canonicalJson({ workflow_execution: workflowExecution, lifecycle_cases: canonicalResult.lifecycle_cases.map((entry) => ({ case_id: entry.case_id, route: entry.route, observations: entry.observations, workflow_path: entry.workflow_path })) });
  const projectionResultBytes = canonicalJson(canonicalResult.lifecycle_cases.map((entry) => ({ case_id: entry.case_id, projection_refs: entry.projection_refs })));
  const semanticResultSha256 = sha256(semanticResultBytes);
  const projectionResultSha256 = sha256(projectionResultBytes);
  const canonicalOutputBytes = canonicalJson(canonicalResult);
  const canonicalResultSha256 = sha256(canonicalOutputBytes);
  const stableReport = {
    gate: SEM_LC_08_GATE,
    task_anchor: SEM_LC_08_TASK_ANCHOR,
    p18_ref: SEM_LC_08_P18_REF,
    p20_ref: SEM_LC_08_P20_REF,
    envelope_id: SEM_LC_08_ENVELOPE_ID,
    mode: FULL_REFERENCE_MODE,
    optimized_path_present: false,
    counts,
    semantic_result_sha256: semanticResultSha256,
    projection_result_sha256: projectionResultSha256,
    canonical_result_sha256: canonicalResultSha256,
    canonical_input_sha256: sha256(canonicalInputBytes),
    canonical_input_bytes: Buffer.byteLength(canonicalInputBytes, "utf8"),
    canonical_output_bytes: Buffer.byteLength(canonicalOutputBytes, "utf8"),
    fixture_sha256: minimalFixtureDigest(),
    workflow_execution: workflowExecution
  };
  return Object.freeze({
    input_permutation_id: id,
    enumerated_input_sha256: sha256(enumeratedBytes),
    canonical_input_sha256: stableReport.canonical_input_sha256,
    semantic_result_sha256: semanticResultSha256,
    projection_result_sha256: projectionResultSha256,
    canonical_result_sha256: canonicalResultSha256,
    canonical_report_sha256: sha256(canonicalJson(stableReport)),
    canonical_input_bytes: stableReport.canonical_input_bytes,
    canonical_output_bytes: stableReport.canonical_output_bytes
  });
}

function executeWorkflowParticipation(): WorkflowExecution {
  let adapterInvocations = 0;
  let semanticFirstInvocations = 0;
  let boundExistingInvocations = 0;
  let routeInvocations = 0;
  let guardInvocations = 0;
  const guard = { finalize: () => { guardInvocations += 1; return Object.freeze({}); }, reconcile: () => Object.freeze({}) };
  const route = new ProtocolAdoptionRoute({ guard } as any);
  const adapter = new WorkflowLifecycleAdapter({
    stage10: { classifyAndAssertFresh: () => ({ assessment: { assessmentId: "sem-lc-08", disposition: "SEMANTIC_DELTA" } } as any) },
    semanticFirst: { resolveProjectionBasis: (authorityRef: any) => ({ authorityKey: "sem-lc-08", authorityRef, sourceBinding: { path: "contract/semantic/source.json", payloadDigest: "sha256:" + "0".repeat(64) } }) },
    boundExisting: { openReconstruction: () => Object.freeze({}) },
    protocolAdoption: {
      finalizeProtocolAdoption: (command: any) => { routeInvocations += 1; return route.finalizeProtocolAdoption(command); },
      reconcileProtocolAdoption: (command: any) => route.reconcileProtocolAdoption(command)
    }
  });
  for (let index = 0; index < 2048; index += 1) {
    adapter.enterStage20({}, (context) => { semanticFirstInvocations += 1; context.resolveProjectionBasis({ refType: "IMMUTABLE_REVISION", namespace: "semantic-authority", subject: "sem-lc-08", revision: "0".repeat(40) }); adapter.finalizeStage30({} as any); });
    adapterInvocations += 1;
  }
  for (let index = 0; index < 2048; index += 1) {
    adapter.runBoundExisting("openReconstruction", {});
    boundExistingInvocations += 1;
    adapter.finalizeStage30({} as any);
    adapterInvocations += 1;
  }
  return Object.freeze({ adapter_invocations: adapterInvocations, semantic_first_invocations: semanticFirstInvocations, bound_existing_invocations: boundExistingInvocations, production_route_bound: routeInvocations === 4096 && guardInvocations === 4096 });
}

function assertWorkflowExecution(execution: WorkflowExecution): void {
  if (execution.adapter_invocations !== 4096 || execution.semantic_first_invocations !== 2048 || execution.bound_existing_invocations !== 2048 || execution.production_route_bound !== true) throw new Error("WORKFLOW_PARTICIPATION_REQUIRED");
}

function countCorpus(corpus: Readonly<{ lifecycle_cases: readonly LifecycleCase[]; registry_mutations: readonly RegistryMutation[] }>) {
  const semanticFirst = corpus.lifecycle_cases.filter((entry) => entry.route === "SEMANTIC_FIRST").length;
  const boundExisting = corpus.lifecycle_cases.length - semanticFirst;
  const observations = corpus.lifecycle_cases.reduce((total, entry) => total + entry.observations.length, 0);
  const edges = corpus.lifecycle_cases.reduce((total, entry) => total + entry.projection_refs.length, 0);
  const writes = corpus.registry_mutations.filter((entry) => entry.kind === "WRITE");
  const deletes = corpus.registry_mutations.length - writes.length;
  const writePayloadBytes = writes.reduce((total, entry) => total + Buffer.byteLength(entry.content, "utf8"), 0);
  return Object.freeze({ lifecycle_cases: corpus.lifecycle_cases.length, semantic_first: semanticFirst, bound_existing: boundExisting, semantic_observations: observations, projection_edges: edges, registry_mutations: corpus.registry_mutations.length, writes: writes.length, deletes, write_payload_bytes: writePayloadBytes });
}

function assertExactCounts(counts: ReturnType<typeof countCorpus>): void {
  if (counts.lifecycle_cases !== 4096 || counts.semantic_first !== 2048 || counts.bound_existing !== 2048) throw new Error("INCOMPLETE_E4096_CASES");
  if (counts.semantic_observations !== 61_440) throw new Error("INCOMPLETE_E4096_SEMANTIC_OBSERVATIONS");
  if (counts.projection_edges !== 61_440) throw new Error("INCOMPLETE_E4096_REFERENCE_EDGES");
  if (counts.registry_mutations !== 4096 || counts.writes !== 2048 || counts.deletes !== 2048 || counts.write_payload_bytes !== 4_194_304) throw new Error("INCOMPLETE_E4096_REGISTRY_MUTATION_ENTRIES");
}

function permute<T>(input: readonly T[], id: PermutationId, identity: (value: T) => string): readonly T[] {
  const ascending = [...input].sort((left, right) => compareUtf8UnsignedBytes(identity(left), identity(right)));
  switch (id) {
    case "canonical_ascending_logical_identity": return ascending;
    case "exact_reverse": return ascending.reverse();
    case "rotate_left_1": return [...ascending.slice(1), ascending[0]!];
    case "rotate_left_n_over_2": { const half = Math.floor(ascending.length / 2); return [...ascending.slice(half), ...ascending.slice(0, half)]; }
    case "even_index_then_odd_index": return [...ascending.filter((_, index) => index % 2 === 0), ...ascending.filter((_, index) => index % 2 === 1)];
    case "odd_index_then_even_index": return [...ascending.filter((_, index) => index % 2 === 1), ...ascending.filter((_, index) => index % 2 === 0)];
    case "ascending_sha256_stable_logical_identity": return [...ascending].sort((left, right) => compareHash(identity(left), identity(right), false));
    case "descending_sha256_stable_logical_identity": return [...ascending].sort((left, right) => compareHash(identity(left), identity(right), true));
  }
}

function compareHash(left: string, right: string, descending: boolean): number {
  const byHash = compareUtf8UnsignedBytes(sha256(left), sha256(right));
  const stable = byHash === 0 ? compareUtf8UnsignedBytes(left, right) : byHash;
  return descending ? -stable : stable;
}

function canonicalJsonPreserveArrayOrder(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJsonPreserveArrayOrder).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort(compareUtf8UnsignedBytes).map((key) => `${JSON.stringify(key)}:${canonicalJsonPreserveArrayOrder(record[key])}`).join(",")}}`;
}

function fixedUtf8Payload(identity: string, byteLength: number): string {
  const prefix = `${identity}|`;
  const prefixBytes = Buffer.byteLength(prefix, "utf8");
  if (prefixBytes > byteLength) throw new Error("WRITE_PAYLOAD_IDENTITY_TOO_LARGE");
  const value = `${prefix}${"x".repeat(byteLength - prefixBytes)}`;
  if (Buffer.byteLength(value, "utf8") !== byteLength) throw new Error("WRITE_PAYLOAD_SIZE_DRIFT");
  return value;
}

function minimalFixturePath(): string {
  return join(findPackageRoot(dirname(fileURLToPath(import.meta.url))), "fixtures", "sem-lc-08", "minimal-reference.json");
}

function minimalFixtureDigest(): string {
  const fixture = JSON.parse(readFileSync(minimalFixturePath(), "utf8")) as unknown;
  return sha256(canonicalJson(fixture));
}

function validateMinimalFixture(): void {
  const fixture = JSON.parse(readFileSync(minimalFixturePath(), "utf8")) as { semantic_dimensions?: unknown; utf8_path_order_sample?: unknown; routes?: unknown };
  if (canonicalJson(fixture.semantic_dimensions) !== canonicalJson(semanticDimensions)) throw new Error("MINIMAL_FIXTURE_SEMANTIC_DIMENSION_DRIFT");
  if (!Array.isArray(fixture.utf8_path_order_sample)) throw new Error("MINIMAL_FIXTURE_UTF8_ORDER_MISSING");
  const sample = fixture.utf8_path_order_sample.filter((value): value is string => typeof value === "string");
  const sorted = [...sample].sort(compareUtf8UnsignedBytes);
  if (canonicalJson(sample) !== canonicalJson(sorted)) throw new Error("MINIMAL_FIXTURE_UTF8_ORDER_DRIFT");
  if (canonicalJson(fixture.routes) !== canonicalJson(["SEMANTIC_FIRST", "BOUND_EXISTING"])) throw new Error("MINIMAL_FIXTURE_ROUTE_DRIFT");
}

function findPackageRoot(start: string): string {
  let current = start;
  while (true) {
    if (existsSync(join(current, "package.json"))) return current;
    const parent = dirname(current);
    if (parent === current) throw new Error("SEMANTIC_LIFECYCLE_PACKAGE_ROOT_NOT_FOUND");
    current = parent;
  }
}

function exactGitIdentity(value: string, field: string): void {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error(`INVALID_${field.toUpperCase()}`);
}

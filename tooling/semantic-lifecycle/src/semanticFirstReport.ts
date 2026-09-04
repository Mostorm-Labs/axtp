export const SEM_LC_04_SEMANTIC_FIRST_CONTRACT =
  "AXTP-SEM-LC-04-P31-v0.1@6848ab7ec62a6b2b67ddc3f4d63474c959bb2177";

const TASK_ANCHOR = "6848ab7ec62a6b2b67ddc3f4d63474c959bb2177";
const IMPLEMENTATION_RELEASE = "AXTP-SEM-LC-04-P30-v0.3";
const GATE = "VG-SM-04 SEMANTIC_FIRST_AUTHORITY_ROUTE";
const REQUIRED_C4_GROUPS = Object.freeze(["C4-T1", "C4-T2", "C4-T3", "C4-T4", "C4-T5", "C4-T6"]);
const REQUIRED_FIXTURES = Object.freeze({
  route: Object.freeze(["SF01", "SF02", "SF03", "SF04"]),
  projection: Object.freeze(["SF05", "SF06", "SF07", "SF08"]),
  lifecycle: Object.freeze(["SF09", "SF10", "SF11", "SF12", "SF13", "SF14"])
});

export interface SemanticFirstProbe {
  readonly probeId: string;
  readonly missingProtocolAuthorityBlocked: boolean;
  readonly missingProtocolBindingsBlocked: boolean;
  readonly machineCreatedHumanPass: boolean;
  readonly projectionBasisMismatchAccepted: boolean;
  readonly projectionFailureRolledBackAuthority: boolean;
  readonly repairReusedReviewAccepted: boolean;
  readonly retryDuplicatedAuthority: boolean;
  readonly cancelMutatedAuthority: boolean;
  readonly cancelRolledBackAcceptedAuthority: boolean;
  readonly supersedeSameCaseAccepted: boolean;
  readonly protocolMutationObserved: boolean;
  readonly forbiddenSurfaceChangeObserved: boolean;
}

export interface SemanticFirstReportMetrics {
  readonly semantic_first_missing_protocol_authority_block_total: number;
  readonly semantic_first_missing_protocol_bindings_block_total: number;
  readonly semantic_first_machine_created_human_pass_total: number;
  readonly semantic_first_projection_basis_mismatch_accept_total: number;
  readonly semantic_first_projection_failure_rollback_total: number;
  readonly semantic_first_repair_reused_review_accept_total: number;
  readonly semantic_first_retry_duplicate_authority_total: number;
  readonly semantic_first_cancel_authority_mutation_total: number;
  readonly semantic_first_cancel_accepted_authority_rollback_total: number;
  readonly semantic_first_supersede_same_case_accept_total: number;
  readonly semantic_first_protocol_mutation_total: number;
  readonly semantic_first_forbidden_surface_change_total: number;
}

export interface SemanticFirstReportContext {
  readonly exactSource: Readonly<{ sourceRef: string; sourceTree: string; taskAnchor: string }>;
  readonly implementationRelease: typeof IMPLEMENTATION_RELEASE;
  readonly predecessor: Readonly<{
    taskId: "AXTP-SEM-LC-03";
    state: "REPOSITORY_INTEGRATION_CLOSED";
    mergeCommit: string;
  }>;
  readonly semanticFirstContract: Readonly<{ packageRef: typeof SEM_LC_04_SEMANTIC_FIRST_CONTRACT }>;
  readonly fixtureCaseIds: Readonly<{
    route: readonly string[];
    projection: readonly string[];
    lifecycle: readonly string[];
  }>;
  readonly authorityRefs: readonly Readonly<Record<string, unknown>>[];
  readonly projectionBasisRefs: readonly Readonly<Record<string, unknown>>[];
  readonly c4EvidenceManifest: readonly string[];
  readonly deterministicRepeat: Readonly<{ enumerations: 2; byteEqual: true }>;
}

export interface SemanticFirstReport extends SemanticFirstReportContext {
  readonly reportVersion: "sem-lc-04-semantic-first-report/v1";
  readonly gate: typeof GATE;
  readonly metrics: SemanticFirstReportMetrics;
  readonly probes: readonly Readonly<Record<string, unknown>>[];
  readonly verdict: "PASS" | "FAIL";
}

export function buildSemanticFirstReport(
  context: SemanticFirstReportContext,
  inputs: readonly SemanticFirstProbe[]
): SemanticFirstReport {
  const exactContext = normalizeContext(context);
  const probes = [...inputs]
    .sort((left, right) => compareOrdinal(left.probeId, right.probeId))
    .map((probe) => Object.freeze({ ...probe, verdict: hasViolation(probe) ? "FAIL" : "PASS" }));
  const metrics: SemanticFirstReportMetrics = Object.freeze({
    semantic_first_missing_protocol_authority_block_total: count(inputs, (probe) => probe.missingProtocolAuthorityBlocked),
    semantic_first_missing_protocol_bindings_block_total: count(inputs, (probe) => probe.missingProtocolBindingsBlocked),
    semantic_first_machine_created_human_pass_total: count(inputs, (probe) => probe.machineCreatedHumanPass),
    semantic_first_projection_basis_mismatch_accept_total: count(inputs, (probe) => probe.projectionBasisMismatchAccepted),
    semantic_first_projection_failure_rollback_total: count(inputs, (probe) => probe.projectionFailureRolledBackAuthority),
    semantic_first_repair_reused_review_accept_total: count(inputs, (probe) => probe.repairReusedReviewAccepted),
    semantic_first_retry_duplicate_authority_total: count(inputs, (probe) => probe.retryDuplicatedAuthority),
    semantic_first_cancel_authority_mutation_total: count(inputs, (probe) => probe.cancelMutatedAuthority),
    semantic_first_cancel_accepted_authority_rollback_total: count(inputs, (probe) => probe.cancelRolledBackAcceptedAuthority),
    semantic_first_supersede_same_case_accept_total: count(inputs, (probe) => probe.supersedeSameCaseAccepted),
    semantic_first_protocol_mutation_total: count(inputs, (probe) => probe.protocolMutationObserved),
    semantic_first_forbidden_surface_change_total: count(inputs, (probe) => probe.forbiddenSurfaceChangeObserved)
  });
  const failed = Object.values(metrics).some((value) => value !== 0) || probes.some((probe) => probe.verdict === "FAIL");
  return Object.freeze({
    reportVersion: "sem-lc-04-semantic-first-report/v1" as const,
    gate: GATE,
    ...exactContext,
    metrics,
    probes: Object.freeze(probes),
    verdict: failed ? "FAIL" : "PASS"
  });
}

export function serializeSemanticFirstReport(report: SemanticFirstReport): string {
  return `${JSON.stringify(canonicalize(report), null, 2)}\n`;
}

function normalizeContext(context: SemanticFirstReportContext): SemanticFirstReportContext {
  if (context.exactSource.taskAnchor !== TASK_ANCHOR) throw new Error("INVALID_SEMANTIC_FIRST_REPORT_CONTEXT:taskAnchor");
  const sourceRef = requireNonEmpty(context.exactSource.sourceRef, "sourceRef");
  const sourceTree = requireNonEmpty(context.exactSource.sourceTree, "sourceTree");
  if (context.implementationRelease !== IMPLEMENTATION_RELEASE) {
    throw new Error("INVALID_SEMANTIC_FIRST_REPORT_CONTEXT:implementationRelease");
  }
  if (
    context.predecessor.taskId !== "AXTP-SEM-LC-03" ||
    context.predecessor.state !== "REPOSITORY_INTEGRATION_CLOSED" ||
    context.predecessor.mergeCommit !== TASK_ANCHOR
  ) {
    throw new Error("INVALID_SEMANTIC_FIRST_REPORT_CONTEXT:predecessor");
  }
  if (context.semanticFirstContract.packageRef !== SEM_LC_04_SEMANTIC_FIRST_CONTRACT) {
    throw new Error("INVALID_SEMANTIC_FIRST_REPORT_CONTEXT:semanticFirstContract");
  }
  const fixtureCaseIds = Object.freeze({
    route: Object.freeze(sortStrings(context.fixtureCaseIds.route, "routeFixtureCaseIds")),
    projection: Object.freeze(sortStrings(context.fixtureCaseIds.projection, "projectionFixtureCaseIds")),
    lifecycle: Object.freeze(sortStrings(context.fixtureCaseIds.lifecycle, "lifecycleFixtureCaseIds"))
  });
  for (const [group, required] of Object.entries(REQUIRED_FIXTURES)) {
    const actual = fixtureCaseIds[group as keyof typeof fixtureCaseIds];
    if (required.some((id) => !actual.includes(id))) {
      throw new Error(`INVALID_SEMANTIC_FIRST_REPORT_CONTEXT:${group}FixtureCorpus`);
    }
  }
  const c4EvidenceManifest = sortStrings(context.c4EvidenceManifest, "c4EvidenceManifest");
  if (JSON.stringify(c4EvidenceManifest) !== JSON.stringify(REQUIRED_C4_GROUPS)) {
    throw new Error("INVALID_SEMANTIC_FIRST_REPORT_CONTEXT:c4EvidenceManifest");
  }
  if (context.deterministicRepeat.enumerations !== 2 || context.deterministicRepeat.byteEqual !== true) {
    throw new Error("INVALID_SEMANTIC_FIRST_REPORT_CONTEXT:deterministicRepeat");
  }
  return Object.freeze({
    exactSource: Object.freeze({ sourceRef, sourceTree, taskAnchor: TASK_ANCHOR }),
    implementationRelease: IMPLEMENTATION_RELEASE,
    predecessor: Object.freeze({
      taskId: "AXTP-SEM-LC-03" as const,
      state: "REPOSITORY_INTEGRATION_CLOSED" as const,
      mergeCommit: TASK_ANCHOR
    }),
    semanticFirstContract: Object.freeze({ packageRef: SEM_LC_04_SEMANTIC_FIRST_CONTRACT }),
    fixtureCaseIds,
    authorityRefs: Object.freeze(sortRecords(context.authorityRefs, "authorityRefs")),
    projectionBasisRefs: Object.freeze(sortRecords(context.projectionBasisRefs, "projectionBasisRefs")),
    c4EvidenceManifest: Object.freeze(c4EvidenceManifest),
    deterministicRepeat: Object.freeze({ enumerations: 2 as const, byteEqual: true as const })
  });
}

function requireNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`INVALID_SEMANTIC_FIRST_REPORT_CONTEXT:${field}`);
  }
  return value;
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortStrings(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    throw new Error(`INVALID_SEMANTIC_FIRST_REPORT_CONTEXT:${field}`);
  }
  return [...value].sort(compareOrdinal);
}

function sortRecords(value: unknown, field: string): Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "object" || entry === null || Array.isArray(entry))) {
    throw new Error(`INVALID_SEMANTIC_FIRST_REPORT_CONTEXT:${field}`);
  }
  return value
    .map((entry) => canonicalize(entry) as Readonly<Record<string, unknown>>)
    .sort((left, right) => compareOrdinal(JSON.stringify(left), JSON.stringify(right)));
}

function count(inputs: readonly SemanticFirstProbe[], predicate: (input: SemanticFirstProbe) => boolean): number {
  return inputs.filter(predicate).length;
}

function hasViolation(probe: SemanticFirstProbe): boolean {
  return probe.missingProtocolAuthorityBlocked ||
    probe.missingProtocolBindingsBlocked ||
    probe.machineCreatedHumanPass ||
    probe.projectionBasisMismatchAccepted ||
    probe.projectionFailureRolledBackAuthority ||
    probe.repairReusedReviewAccepted ||
    probe.retryDuplicatedAuthority ||
    probe.cancelMutatedAuthority ||
    probe.cancelRolledBackAcceptedAuthority ||
    probe.supersedeSameCaseAccepted ||
    probe.protocolMutationObserved ||
    probe.forbiddenSurfaceChangeObserved;
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>).sort(([a], [b]) => compareOrdinal(a, b))) {
    if (child !== undefined) output[key] = canonicalize(child);
  }
  return output;
}

export const SEM_LC_03_AUTHORITY_CONTRACT =
  "AXTP-SEM-LC-03-P31-v0.1@40fa88a1d52df7e9f8251f0f7247b87f04409be0";

const TASK_ANCHOR = "40fa88a1d52df7e9f8251f0f7247b87f04409be0";
const IMPLEMENTATION_RELEASE_PAGE = "3d04c57a-590c-814d-9f9a-df6bfe38bd02";
const IMPLEMENTATION_RELEASE_COMMENT = 5527601747;
const REQUIRED_C3_GROUPS = Object.freeze(["C3-T1", "C3-T2", "C3-T3", "C3-T4", "C3-T5", "C3-T6"]);

export interface AuthorityProbe {
  readonly probeId: string;
  readonly partialAuthorityCommitObserved: boolean;
  readonly staleBasisAuthorityAccepted: boolean;
  readonly lostUpdateObserved: boolean;
  readonly pathDerivedIdentityChangeObserved: boolean;
  readonly operationIdCollisionAccepted: boolean;
  readonly candidateReviewMismatchAccepted: boolean;
  readonly unrelatedAuthorityKeyInterferenceObserved: boolean;
}

export interface AuthorityReportMetrics {
  readonly partial_authority_commit_total: number;
  readonly stale_basis_authority_acceptance_total: number;
  readonly lost_update_total: number;
  readonly path_derived_identity_change_total: number;
  readonly operation_id_collision_acceptance_total: number;
  readonly candidate_review_mismatch_acceptance_total: number;
  readonly unrelated_authority_key_interference_total: number;
}

export interface AuthorityReportContext {
  readonly exactSource: Readonly<{ sourceRef: string; sourceTree: string; taskAnchor: string }>;
  readonly implementationRelease: Readonly<{ notionPageId: string; githubComment: number }>;
  readonly predecessor: Readonly<{
    taskId: "AXTP-SEM-LC-02";
    state: "REPOSITORY_INTEGRATION_CLOSED";
    mergeCommit: string;
  }>;
  readonly authorityContract: Readonly<{ packageRef: typeof SEM_LC_03_AUTHORITY_CONTRACT }>;
  readonly authorityRefs: readonly Readonly<Record<string, unknown>>[];
  readonly candidateRefs: readonly Readonly<Record<string, unknown>>[];
  readonly reviewIds: readonly string[];
  readonly fixtureCaseIds: Readonly<{ authority: readonly string[]; concurrency: readonly string[] }>;
  readonly c3EvidenceManifest: readonly string[];
  readonly deterministicRepeat: Readonly<{ enumerations: 2; byteEqual: true }>;
}

export interface SemanticAuthorityReport extends AuthorityReportContext {
  readonly reportVersion: "sem-lc-03-authority-report/v1";
  readonly metrics: AuthorityReportMetrics;
  readonly probes: readonly Readonly<Record<string, unknown>>[];
  readonly verdict: "PASS" | "FAIL";
}

export function buildAuthorityReport(
  context: AuthorityReportContext,
  inputs: readonly AuthorityProbe[]
): SemanticAuthorityReport {
  const exactContext = normalizeContext(context);
  const probes = [...inputs]
    .sort((left, right) => compareOrdinal(left.probeId, right.probeId))
    .map((probe) => Object.freeze({ ...probe, verdict: hasViolation(probe) ? "FAIL" : "PASS" }));
  const metrics: AuthorityReportMetrics = Object.freeze({
    partial_authority_commit_total: count(inputs, (probe) => probe.partialAuthorityCommitObserved),
    stale_basis_authority_acceptance_total: count(inputs, (probe) => probe.staleBasisAuthorityAccepted),
    lost_update_total: count(inputs, (probe) => probe.lostUpdateObserved),
    path_derived_identity_change_total: count(inputs, (probe) => probe.pathDerivedIdentityChangeObserved),
    operation_id_collision_acceptance_total: count(inputs, (probe) => probe.operationIdCollisionAccepted),
    candidate_review_mismatch_acceptance_total: count(inputs, (probe) => probe.candidateReviewMismatchAccepted),
    unrelated_authority_key_interference_total: count(inputs, (probe) => probe.unrelatedAuthorityKeyInterferenceObserved)
  });
  const failed = Object.values(metrics).some((value) => value !== 0) || probes.some((probe) => probe.verdict === "FAIL");
  return Object.freeze({
    reportVersion: "sem-lc-03-authority-report/v1" as const,
    ...exactContext,
    metrics,
    probes: Object.freeze(probes),
    verdict: failed ? "FAIL" : "PASS"
  });
}

export function serializeAuthorityReport(report: SemanticAuthorityReport): string {
  return `${JSON.stringify(canonicalize(report), null, 2)}\n`;
}

function normalizeContext(context: AuthorityReportContext): AuthorityReportContext {
  if (context.exactSource.taskAnchor !== TASK_ANCHOR) throw new Error("INVALID_AUTHORITY_REPORT_CONTEXT:taskAnchor");
  const sourceRef = requireNonEmpty(context.exactSource.sourceRef, "sourceRef");
  const sourceTree = requireNonEmpty(context.exactSource.sourceTree, "sourceTree");
  if (
    context.implementationRelease.notionPageId !== IMPLEMENTATION_RELEASE_PAGE ||
    context.implementationRelease.githubComment !== IMPLEMENTATION_RELEASE_COMMENT
  ) {
    throw new Error("INVALID_AUTHORITY_REPORT_CONTEXT:implementationRelease");
  }
  if (
    context.predecessor.taskId !== "AXTP-SEM-LC-02" ||
    context.predecessor.state !== "REPOSITORY_INTEGRATION_CLOSED" ||
    context.predecessor.mergeCommit !== TASK_ANCHOR
  ) {
    throw new Error("INVALID_AUTHORITY_REPORT_CONTEXT:predecessor");
  }
  if (context.authorityContract.packageRef !== SEM_LC_03_AUTHORITY_CONTRACT) {
    throw new Error("INVALID_AUTHORITY_REPORT_CONTEXT:authorityContract");
  }
  const authorityRefs = sortRecords(context.authorityRefs, "authorityRefs");
  const candidateRefs = sortRecords(context.candidateRefs, "candidateRefs");
  const reviewIds = sortStrings(context.reviewIds, "reviewIds");
  const authorityCases = sortStrings(context.fixtureCaseIds.authority, "authorityFixtureCaseIds");
  const concurrencyCases = sortStrings(context.fixtureCaseIds.concurrency, "concurrencyFixtureCaseIds");
  if (authorityCases.length < 12 || concurrencyCases.length < 6) {
    throw new Error("INVALID_AUTHORITY_REPORT_CONTEXT:fixtureCorpus");
  }
  const c3EvidenceManifest = sortStrings(context.c3EvidenceManifest, "c3EvidenceManifest");
  if (JSON.stringify(c3EvidenceManifest) !== JSON.stringify(REQUIRED_C3_GROUPS)) {
    throw new Error("INVALID_AUTHORITY_REPORT_CONTEXT:c3EvidenceManifest");
  }
  if (context.deterministicRepeat.enumerations !== 2 || context.deterministicRepeat.byteEqual !== true) {
    throw new Error("INVALID_AUTHORITY_REPORT_CONTEXT:deterministicRepeat");
  }
  return Object.freeze({
    exactSource: Object.freeze({ sourceRef, sourceTree, taskAnchor: TASK_ANCHOR }),
    implementationRelease: Object.freeze({
      notionPageId: IMPLEMENTATION_RELEASE_PAGE,
      githubComment: IMPLEMENTATION_RELEASE_COMMENT
    }),
    predecessor: Object.freeze({
      taskId: "AXTP-SEM-LC-02" as const,
      state: "REPOSITORY_INTEGRATION_CLOSED" as const,
      mergeCommit: TASK_ANCHOR
    }),
    authorityContract: Object.freeze({ packageRef: SEM_LC_03_AUTHORITY_CONTRACT }),
    authorityRefs: Object.freeze(authorityRefs),
    candidateRefs: Object.freeze(candidateRefs),
    reviewIds: Object.freeze(reviewIds),
    fixtureCaseIds: Object.freeze({
      authority: Object.freeze(authorityCases),
      concurrency: Object.freeze(concurrencyCases)
    }),
    c3EvidenceManifest: Object.freeze(c3EvidenceManifest),
    deterministicRepeat: Object.freeze({ enumerations: 2 as const, byteEqual: true as const })
  });
}

function requireNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`INVALID_AUTHORITY_REPORT_CONTEXT:${field}`);
  }
  return value;
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortStrings(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    throw new Error(`INVALID_AUTHORITY_REPORT_CONTEXT:${field}`);
  }
  return [...value].sort(compareOrdinal);
}

function sortRecords(value: unknown, field: string): Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "object" || entry === null || Array.isArray(entry))) {
    throw new Error(`INVALID_AUTHORITY_REPORT_CONTEXT:${field}`);
  }
  return value
    .map((entry) => canonicalize(entry) as Readonly<Record<string, unknown>>)
    .sort((left, right) => compareOrdinal(JSON.stringify(left), JSON.stringify(right)));
}

function count(inputs: readonly AuthorityProbe[], predicate: (input: AuthorityProbe) => boolean): number {
  return inputs.filter(predicate).length;
}

function hasViolation(probe: AuthorityProbe): boolean {
  return probe.partialAuthorityCommitObserved ||
    probe.staleBasisAuthorityAccepted ||
    probe.lostUpdateObserved ||
    probe.pathDerivedIdentityChangeObserved ||
    probe.operationIdCollisionAccepted ||
    probe.candidateReviewMismatchAccepted ||
    probe.unrelatedAuthorityKeyInterferenceObserved;
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

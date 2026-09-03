export const SEM_LC_02_CANDIDATE_REVIEW_CONTRACT =
  "AXTP-SEM-LC-02-P31-v0.1@48aa536f3a0875350cf3c4270aa4f9f7e6ce993e";

const SEM_LC_01_SEMANTIC_MERGE = "8c4f930a12a964dc0be826e9e308f024efd91d8a";
const REQUIRED_C2_GROUPS = Object.freeze(["C2-T1", "C2-T2", "C2-T3", "C2-T4", "C2-T5", "C2-T6"]);

export interface CandidateIsolationProbe {
  readonly probeId: string;
  readonly candidateLeakObserved: boolean;
  readonly nonSemanticDeltaCandidateAccepted: boolean;
  readonly candidateOverwriteAccepted: boolean;
  readonly staleReviewAccepted: boolean;
  readonly repairedCandidateReviewReused: boolean;
  readonly machineCreatedHumanPass: boolean;
  readonly unprovenHumanReviewAccepted: boolean;
}

export interface CandidateIsolationMetrics {
  readonly candidate_leak_total: number;
  readonly non_semantic_delta_candidate_acceptance_total: number;
  readonly candidate_overwrite_acceptance_total: number;
  readonly stale_review_acceptance_total: number;
  readonly repaired_candidate_review_reuse_total: number;
  readonly machine_created_human_pass_total: number;
  readonly unproven_human_review_acceptance_total: number;
}

export interface CandidateReviewReportContext {
  readonly exactSource: Readonly<{ sourceRef: string; sourceTree: string; taskAnchor: string }>;
  readonly predecessor: Readonly<{ taskId: "AXTP-SEM-LC-01"; state: "MERGED_CLOSED"; semanticMerge: string }>;
  readonly candidateReviewContract: Readonly<{ packageRef: typeof SEM_LC_02_CANDIDATE_REVIEW_CONTRACT }>;
  readonly candidateRefs: readonly Readonly<Record<string, unknown>>[];
  readonly reviewRefs: readonly Readonly<Record<string, unknown>>[];
  readonly fixtureCaseIds: Readonly<{ candidate: readonly string[]; review: readonly string[] }>;
  readonly c2EvidenceManifest: readonly string[];
  readonly deterministicRepeat: Readonly<{ enumerations: 2; byteEqual: true }>;
}

export interface CandidateIsolationReport {
  readonly reportVersion: "sem-lc-02-candidate-review-report/v1";
  readonly exactSource: CandidateReviewReportContext["exactSource"];
  readonly predecessor: CandidateReviewReportContext["predecessor"];
  readonly candidateReviewContract: CandidateReviewReportContext["candidateReviewContract"];
  readonly candidateRefs: readonly Readonly<Record<string, unknown>>[];
  readonly reviewRefs: readonly Readonly<Record<string, unknown>>[];
  readonly fixtureCaseIds: CandidateReviewReportContext["fixtureCaseIds"];
  readonly c2EvidenceManifest: readonly string[];
  readonly deterministicRepeat: CandidateReviewReportContext["deterministicRepeat"];
  readonly metrics: CandidateIsolationMetrics;
  readonly probes: readonly Readonly<Record<string, unknown>>[];
  readonly verdict: "PASS" | "FAIL";
}

export function buildCandidateIsolationReport(
  context: CandidateReviewReportContext,
  inputs: readonly CandidateIsolationProbe[]
): CandidateIsolationReport {
  const exactContext = normalizeContext(context);
  const probes = [...inputs]
    .sort((left, right) => left.probeId.localeCompare(right.probeId))
    .map((probe) => Object.freeze({ ...probe, verdict: hasViolation(probe) ? "FAIL" : "PASS" }));
  const metrics: CandidateIsolationMetrics = Object.freeze({
    candidate_leak_total: count(inputs, (probe) => probe.candidateLeakObserved),
    non_semantic_delta_candidate_acceptance_total: count(inputs, (probe) => probe.nonSemanticDeltaCandidateAccepted),
    candidate_overwrite_acceptance_total: count(inputs, (probe) => probe.candidateOverwriteAccepted),
    stale_review_acceptance_total: count(inputs, (probe) => probe.staleReviewAccepted),
    repaired_candidate_review_reuse_total: count(inputs, (probe) => probe.repairedCandidateReviewReused),
    machine_created_human_pass_total: count(inputs, (probe) => probe.machineCreatedHumanPass),
    unproven_human_review_acceptance_total: count(inputs, (probe) => probe.unprovenHumanReviewAccepted)
  });
  return Object.freeze({
    reportVersion: "sem-lc-02-candidate-review-report/v1" as const,
    ...exactContext,
    metrics,
    probes: Object.freeze(probes),
    verdict: Object.values(metrics).every((value) => value === 0) ? "PASS" : "FAIL"
  });
}

export function serializeCandidateIsolationReport(report: CandidateIsolationReport): string {
  return `${JSON.stringify(canonicalize(report), null, 2)}\n`;
}

function normalizeContext(context: CandidateReviewReportContext): Omit<CandidateIsolationReport, "reportVersion" | "metrics" | "probes" | "verdict"> {
  if (typeof context !== "object" || context === null) throw new Error("INVALID_CANDIDATE_REVIEW_REPORT_CONTEXT");
  const exactSource = Object.freeze({
    sourceRef: requireNonEmpty(context.exactSource?.sourceRef, "sourceRef"),
    sourceTree: requireNonEmpty(context.exactSource?.sourceTree, "sourceTree"),
    taskAnchor: requireNonEmpty(context.exactSource?.taskAnchor, "taskAnchor")
  });
  if (context.predecessor?.taskId !== "AXTP-SEM-LC-01" || context.predecessor.state !== "MERGED_CLOSED" || context.predecessor.semanticMerge !== SEM_LC_01_SEMANTIC_MERGE) {
    throw new Error("INVALID_SEM_LC_01_PREDECESSOR");
  }
  if (context.candidateReviewContract?.packageRef !== SEM_LC_02_CANDIDATE_REVIEW_CONTRACT) {
    throw new Error("INVALID_CANDIDATE_REVIEW_CONTRACT");
  }
  const candidate = sortStrings(context.fixtureCaseIds?.candidate, "candidate fixtures");
  const review = sortStrings(context.fixtureCaseIds?.review, "review fixtures");
  if (candidate.length < 9 || review.length < 9) throw new Error("INCOMPLETE_CANDIDATE_REVIEW_FIXTURES");
  const c2EvidenceManifest = sortStrings(context.c2EvidenceManifest, "C2 evidence manifest");
  if (JSON.stringify(c2EvidenceManifest) !== JSON.stringify(REQUIRED_C2_GROUPS)) throw new Error("INVALID_C2_EVIDENCE_MANIFEST");
  if (context.deterministicRepeat?.enumerations !== 2 || context.deterministicRepeat.byteEqual !== true) {
    throw new Error("DETERMINISTIC_REPEAT_NOT_PROVEN");
  }
  return Object.freeze({
    exactSource,
    predecessor: Object.freeze({ taskId: "AXTP-SEM-LC-01" as const, state: "MERGED_CLOSED" as const, semanticMerge: SEM_LC_01_SEMANTIC_MERGE }),
    candidateReviewContract: Object.freeze({ packageRef: SEM_LC_02_CANDIDATE_REVIEW_CONTRACT }),
    candidateRefs: Object.freeze(sortRecords(context.candidateRefs, "candidate refs")),
    reviewRefs: Object.freeze(sortRecords(context.reviewRefs, "review refs")),
    fixtureCaseIds: Object.freeze({ candidate: Object.freeze(candidate), review: Object.freeze(review) }),
    c2EvidenceManifest: Object.freeze(c2EvidenceManifest),
    deterministicRepeat: Object.freeze({ enumerations: 2 as const, byteEqual: true as const })
  });
}

function requireNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`INVALID_CANDIDATE_REVIEW_REPORT_CONTEXT:${field}`);
  return value;
}

function sortStrings(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    throw new Error(`INVALID_CANDIDATE_REVIEW_REPORT_CONTEXT:${field}`);
  }
  return [...value].sort((left, right) => left.localeCompare(right));
}

function sortRecords(value: unknown, field: string): Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "object" || entry === null || Array.isArray(entry))) {
    throw new Error(`INVALID_CANDIDATE_REVIEW_REPORT_CONTEXT:${field}`);
  }
  return value
    .map((entry) => canonicalize(entry) as Readonly<Record<string, unknown>>)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function count(inputs: readonly CandidateIsolationProbe[], predicate: (input: CandidateIsolationProbe) => boolean): number {
  return inputs.filter(predicate).length;
}

function hasViolation(probe: CandidateIsolationProbe): boolean {
  return probe.candidateLeakObserved || probe.nonSemanticDeltaCandidateAccepted || probe.candidateOverwriteAccepted || probe.staleReviewAccepted || probe.repairedCandidateReviewReused || probe.machineCreatedHumanPass || probe.unprovenHumanReviewAccepted;
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) {
    if (child !== undefined) output[key] = canonicalize(child);
  }
  return output;
}

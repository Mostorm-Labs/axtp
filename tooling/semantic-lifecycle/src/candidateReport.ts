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

export interface CandidateIsolationReport {
  readonly reportVersion: "sem-lc-02-candidate-review-isolation-report/v1";
  readonly metrics: CandidateIsolationMetrics;
  readonly probes: readonly Readonly<Record<string, unknown>>[];
  readonly verdict: "PASS" | "FAIL";
}

export function buildCandidateIsolationReport(
  inputs: readonly CandidateIsolationProbe[]
): CandidateIsolationReport {
  const probes = [...inputs]
    .sort((left, right) => left.probeId.localeCompare(right.probeId))
    .map((probe) => Object.freeze({
      ...probe,
      verdict: hasViolation(probe) ? "FAIL" : "PASS"
    }));

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
    reportVersion: "sem-lc-02-candidate-review-isolation-report/v1" as const,
    metrics,
    probes: Object.freeze(probes),
    verdict: Object.values(metrics).every((value) => value === 0) ? "PASS" : "FAIL"
  });
}

export function serializeCandidateIsolationReport(report: CandidateIsolationReport): string {
  return `${JSON.stringify(canonicalize(report), null, 2)}\n`;
}

function count(inputs: readonly CandidateIsolationProbe[], predicate: (input: CandidateIsolationProbe) => boolean): number {
  return inputs.filter(predicate).length;
}

function hasViolation(probe: CandidateIsolationProbe): boolean {
  return (
    probe.candidateLeakObserved ||
    probe.nonSemanticDeltaCandidateAccepted ||
    probe.candidateOverwriteAccepted ||
    probe.staleReviewAccepted ||
    probe.repairedCandidateReviewReused ||
    probe.machineCreatedHumanPass ||
    probe.unprovenHumanReviewAccepted
  );
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

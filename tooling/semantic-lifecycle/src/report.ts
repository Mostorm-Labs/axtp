import { SEMANTIC_DELTA_DIMENSIONS } from "./classification.js";
import type { NoDeltaFastPathDecision } from "./freshness.js";
import type { ClassificationProofResult } from "./machineProof.js";
import type { SemanticDeltaDimension, SemanticDeltaDisposition, SemanticDeltaObservation } from "./model.js";

export interface ClassificationReportCaseInput {
  readonly caseId: string;
  readonly semanticDimension: SemanticDeltaDimension | null;
  readonly expectedDisposition: SemanticDeltaDisposition;
  readonly observations: readonly SemanticDeltaObservation[];
  readonly proof: ClassificationProofResult;
  readonly fastPath: NoDeltaFastPathDecision;
}

export interface FreshnessProbeInput {
  readonly probeId: string;
  readonly expectedEligible: boolean;
  readonly decision: NoDeltaFastPathDecision;
}

export interface ClassificationReportMetrics {
  readonly semantic_delta_false_negative_total: number;
  readonly semantic_delta_false_positive_fastpath_total: number;
  readonly unresolved_fastpath_acceptance_total: number;
  readonly stale_no_delta_acceptance_total: number;
  readonly unproven_no_delta_acceptance_total: number;
  readonly unproven_semantic_delta_acceptance_total: number;
}

export interface SemanticDeltaClassificationReport {
  readonly reportVersion: "semantic-delta-classification-report/v1";
  readonly proofContractVersion: string;
  readonly coverage: Readonly<{
    frozenSemanticDeltaCategories: readonly SemanticDeltaDimension[];
    coveredSemanticDeltaCategories: readonly SemanticDeltaDimension[];
    complete: boolean;
  }>;
  readonly metrics: ClassificationReportMetrics;
  readonly cases: readonly Readonly<Record<string, unknown>>[];
  readonly freshnessProbes: readonly Readonly<Record<string, unknown>>[];
  readonly verdict: "PASS" | "FAIL";
}

export function buildClassificationReport(
  caseInputs: readonly ClassificationReportCaseInput[],
  freshnessInputs: readonly FreshnessProbeInput[]
): SemanticDeltaClassificationReport {
  const cases = [...caseInputs]
    .sort((left, right) => left.caseId.localeCompare(right.caseId))
    .map((entry) => Object.freeze({
      caseId: entry.caseId,
      semanticDimension: entry.semanticDimension,
      expectedDisposition: entry.expectedDisposition,
      actualDisposition: entry.proof.assessment.disposition,
      scopeRef: entry.proof.assessment.scopeRef,
      classificationBasisRef: entry.proof.assessment.classificationBasisRef,
      evaluatedDimensions: entry.proof.assessment.evaluatedDimensions,
      evidenceRefs: entry.proof.receipt.evidenceRefs,
      ruleIds: entry.proof.receipt.ruleIds,
      inputDigest: entry.proof.receipt.inputDigest,
      diagnostics: entry.proof.receipt.diagnostics,
      fastPath: entry.fastPath,
      verdict:
        entry.proof.assessment.disposition === entry.expectedDisposition &&
        entry.fastPath.eligible === (entry.expectedDisposition === "NO_SEMANTIC_DELTA")
          ? "PASS"
          : "FAIL"
    }));

  const freshnessProbes = [...freshnessInputs]
    .sort((left, right) => left.probeId.localeCompare(right.probeId))
    .map((entry) => Object.freeze({
      probeId: entry.probeId,
      expectedEligible: entry.expectedEligible,
      actualEligible: entry.decision.eligible,
      reason: entry.decision.reason,
      verdict: entry.expectedEligible === entry.decision.eligible ? "PASS" : "FAIL"
    }));

  const coveredSet = new Set<SemanticDeltaDimension>();
  for (const entry of caseInputs) {
    if (entry.expectedDisposition === "SEMANTIC_DELTA" && entry.semanticDimension !== null) {
      coveredSet.add(entry.semanticDimension);
    }
  }
  const coveredSemanticDeltaCategories = Object.freeze(
    SEMANTIC_DELTA_DIMENSIONS.filter((dimension) => coveredSet.has(dimension))
  );
  const complete = coveredSemanticDeltaCategories.length === SEMANTIC_DELTA_DIMENSIONS.length;

  const metrics: ClassificationReportMetrics = Object.freeze({
    semantic_delta_false_negative_total: caseInputs.filter(
      (entry) => entry.expectedDisposition === "SEMANTIC_DELTA" && entry.proof.assessment.disposition !== "SEMANTIC_DELTA"
    ).length,
    semantic_delta_false_positive_fastpath_total: caseInputs.filter(
      (entry) => entry.expectedDisposition !== "NO_SEMANTIC_DELTA" && entry.fastPath.eligible
    ).length,
    unresolved_fastpath_acceptance_total: caseInputs.filter(
      (entry) => entry.expectedDisposition === "UNRESOLVED" && entry.fastPath.eligible
    ).length,
    stale_no_delta_acceptance_total: freshnessInputs.filter(
      (entry) => !entry.expectedEligible && entry.decision.eligible
    ).length,
    unproven_no_delta_acceptance_total: caseInputs.filter(
      (entry) => hasMissingEvidence(entry.observations) && entry.proof.assessment.disposition === "NO_SEMANTIC_DELTA"
    ).length,
    unproven_semantic_delta_acceptance_total: caseInputs.filter(
      (entry) => hasOnlyUnprovenChanges(entry.observations) && entry.proof.assessment.disposition === "SEMANTIC_DELTA"
    ).length
  });

  const metricFailure = Object.values(metrics).some((value) => value !== 0);
  const caseFailure = cases.some((entry) => entry.verdict !== "PASS");
  const freshnessFailure = freshnessProbes.some((entry) => entry.verdict !== "PASS");
  const proofContractVersion =
    caseInputs[0]?.proof.receipt.proofContractVersion ?? "sem-lc-01/v1";

  return Object.freeze({
    reportVersion: "semantic-delta-classification-report/v1" as const,
    proofContractVersion,
    coverage: Object.freeze({
      frozenSemanticDeltaCategories: Object.freeze([...SEMANTIC_DELTA_DIMENSIONS]),
      coveredSemanticDeltaCategories,
      complete
    }),
    metrics,
    cases: Object.freeze(cases),
    freshnessProbes: Object.freeze(freshnessProbes),
    verdict: !metricFailure && !caseFailure && !freshnessFailure && complete ? "PASS" : "FAIL"
  });
}

export function serializeClassificationReport(report: SemanticDeltaClassificationReport): string {
  return `${JSON.stringify(canonicalize(report), null, 2)}\n`;
}

function hasMissingEvidence(observations: readonly SemanticDeltaObservation[]): boolean {
  return observations.some((observation) => !Array.isArray(observation.evidenceRefs) || observation.evidenceRefs.length === 0);
}

function hasOnlyUnprovenChanges(observations: readonly SemanticDeltaObservation[]): boolean {
  const changed = observations.filter((observation) => observation.state === "CHANGED");
  return changed.length > 0 && changed.every((observation) => observation.evidenceRefs.length === 0);
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

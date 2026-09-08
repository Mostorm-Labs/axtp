import { equalBasisRef } from "./basis.js";
import type { BasisRef, ImmutableRevisionRef, SemanticDeltaAssessment } from "./model.js";

export interface AssessmentCurrentBasis {
  readonly scopeRef: ImmutableRevisionRef;
  readonly classificationBasisRef: BasisRef;
}

export interface AssessmentFreshnessExpectation extends AssessmentCurrentBasis {
  readonly assessmentId: string;
  readonly disposition: "NO_SEMANTIC_DELTA" | "SEMANTIC_DELTA";
}

export interface AssessmentFreshnessBoundary {
  getAssessment(assessmentId: string): SemanticDeltaAssessment | undefined;
  assertFresh(expected: AssessmentFreshnessExpectation): SemanticDeltaAssessment;
  withFreshnessFence<T>(expected: AssessmentFreshnessExpectation, action: (assessment: SemanticDeltaAssessment) => T): T;
}

export class InMemoryAssessmentFreshnessBoundary implements AssessmentFreshnessBoundary {
  readonly #assessments = new Map<string, SemanticDeltaAssessment>();
  #current: AssessmentCurrentBasis;
  #fenced = false;

  constructor(assessments: readonly SemanticDeltaAssessment[], current: AssessmentCurrentBasis) {
    this.#current = clone(current);
    for (const assessment of assessments) this.register(assessment);
  }

  register(assessment: SemanticDeltaAssessment): void {
    if (this.#fenced) throw new Error("TOCTOU_FENCE_UNAVAILABLE");
    const normalized = normalizeAssessment(assessment);
    const prior = this.#assessments.get(normalized.assessmentId);
    if (prior !== undefined && canonicalJson(prior) !== canonicalJson(normalized)) throw new Error("IMMUTABLE_RECORD_CONFLICT");
    this.#assessments.set(normalized.assessmentId, normalized);
  }

  setCurrent(current: AssessmentCurrentBasis): void {
    if (this.#fenced) throw new Error("TOCTOU_FENCE_UNAVAILABLE");
    this.#current = clone(current);
  }

  getAssessment(assessmentId: string): SemanticDeltaAssessment | undefined {
    const value = this.#assessments.get(assessmentId);
    return value === undefined ? undefined : clone(value);
  }

  assertFresh(expected: AssessmentFreshnessExpectation): SemanticDeltaAssessment {
    const assessment = this.#assessments.get(expected.assessmentId);
    if (assessment === undefined) throw new Error("STALE_ASSESSMENT");
    if (!equalBasisRef(assessment.scopeRef, expected.scopeRef) || !equalBasisRef(this.#current.scopeRef, expected.scopeRef)) throw new Error("STALE_SCOPE");
    if (!equalBasisRef(assessment.classificationBasisRef, expected.classificationBasisRef) || !equalBasisRef(this.#current.classificationBasisRef, expected.classificationBasisRef)) throw new Error("STALE_CLASSIFICATION_BASIS");
    if (assessment.disposition !== expected.disposition) throw new Error("STALE_ASSESSMENT");
    return clone(assessment);
  }

  withFreshnessFence<T>(expected: AssessmentFreshnessExpectation, action: (assessment: SemanticDeltaAssessment) => T): T {
    if (this.#fenced) throw new Error("TOCTOU_FENCE_UNAVAILABLE");
    const assessment = this.assertFresh(expected);
    this.#fenced = true;
    try { return action(assessment); }
    finally { this.#fenced = false; }
  }
}

function normalizeAssessment(value: SemanticDeltaAssessment): SemanticDeltaAssessment {
  if (!value || typeof value !== "object" || !value.assessmentId?.trim() || (value.disposition !== "NO_SEMANTIC_DELTA" && value.disposition !== "SEMANTIC_DELTA" && value.disposition !== "UNRESOLVED")) throw new Error("INVALID_RECORD");
  return clone(value);
}
function clone<T>(value: T): T { return structuredClone(value); }
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

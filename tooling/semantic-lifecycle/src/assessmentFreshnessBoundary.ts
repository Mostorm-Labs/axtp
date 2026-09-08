import type { ImmutableRevisionRef, SemanticDeltaAssessment } from "./model.js";

export interface AssessmentFreshnessBoundary {
  assertCurrent(assessment: SemanticDeltaAssessment, expected: ImmutableRevisionRef): void;
}

export class ExactAssessmentFreshnessBoundary implements AssessmentFreshnessBoundary {
  constructor(private readonly current: () => ImmutableRevisionRef) {}
  assertCurrent(_assessment: SemanticDeltaAssessment, expected: ImmutableRevisionRef): void {
    const actual = this.current();
    if (actual.namespace !== expected.namespace || actual.subject !== expected.subject || actual.revision !== expected.revision || actual.digest !== expected.digest) throw new Error("ASSESSMENT_STALE");
  }
}

import type { ImmutableRevisionRef } from "./model.js";

export type BoundExistingEvaluation = { readonly decision: "ELIGIBLE" | "REJECT"; readonly reason?: string; readonly stateDelta: Readonly<Record<string, unknown>> };
export interface BoundExistingSnapshot { readonly status: string; readonly basisSelectionRef?: ImmutableRevisionRef; readonly candidateRef?: ImmutableRevisionRef; readonly machineProofVerdict?: string; readonly semanticReviewVerdict?: string; readonly noReinterpretationVerdict?: string; }
export function evaluateBoundExistingSnapshot(snapshot: BoundExistingSnapshot): BoundExistingEvaluation {
  if (snapshot.status !== "OPEN") return { decision: "REJECT", reason: "CASE_NOT_OPEN", stateDelta: {} };
  if (snapshot.machineProofVerdict !== "PASS" || snapshot.semanticReviewVerdict !== "PASS" || snapshot.noReinterpretationVerdict !== "PASS") return { decision: "REJECT", reason: "EVIDENCE_NOT_ELIGIBLE", stateDelta: {} };
  return { decision: "ELIGIBLE", stateDelta: { status: "AUTHORITY_ACCEPTED" } };
}

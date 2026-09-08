// @ts-nocheck
import { createHash } from "node:crypto";
import type { ImmutableRevisionRef } from "./model.js";

export type BoundExistingEvaluation = { readonly decision: "ELIGIBLE" | "REJECT"; readonly reason?: string; readonly stateDelta: Readonly<Record<string, unknown>> };
export interface BoundExistingSnapshot { readonly status: string; readonly basisSelectionRef?: ImmutableRevisionRef; readonly candidateRef?: ImmutableRevisionRef; readonly machineProofVerdict?: string; readonly semanticReviewVerdict?: string; readonly noReinterpretationVerdict?: string; }
export interface BoundExistingProductionResult { readonly decision: "ELIGIBLE" | "REJECT"; readonly stateDelta?: Readonly<Record<string, unknown>>; readonly error?: string | null; }
export interface BoundExistingScenario { readonly caseId: string; readonly before: BoundExistingSnapshot; readonly after: BoundExistingSnapshot; readonly production: BoundExistingProductionResult; }
export interface BoundExistingScenarioResult { readonly caseId: string; readonly oracleKind: "reference-vs-production"; readonly beforeDigest: string; readonly afterDigest: string; readonly production: BoundExistingProductionResult; readonly reference: BoundExistingEvaluation; readonly stateDeltaEqual: boolean; readonly divergence: boolean; }

export function canonicalBoundExistingSnapshot(value: BoundExistingSnapshot): string { return canonicalize(value); }
export function digestBoundExistingSnapshot(value: BoundExistingSnapshot): string {
  return createHash("sha256").update(canonicalBoundExistingSnapshot(value)).digest("hex");
}

export function evaluateBoundExistingSnapshot(snapshot: BoundExistingSnapshot): BoundExistingEvaluation {
  if (snapshot.status !== "OPEN") return { decision: "REJECT", reason: "CASE_NOT_OPEN", stateDelta: {} };
  if (snapshot.machineProofVerdict !== "PASS" || snapshot.semanticReviewVerdict !== "PASS" || snapshot.noReinterpretationVerdict !== "PASS") return { decision: "REJECT", reason: "EVIDENCE_NOT_ELIGIBLE", stateDelta: {} };
  return { decision: "ELIGIBLE", stateDelta: { status: "AUTHORITY_ACCEPTED" } };
}

export function evaluateBoundExistingScenario(scenario: BoundExistingScenario): BoundExistingScenarioResult {
  const reference = evaluateBoundExistingSnapshot(scenario.after);
  const stateDeltaEqual = canonicalize(scenario.production.stateDelta ?? {}) === canonicalize(reference.stateDelta);
  return { caseId: scenario.caseId, oracleKind: "reference-vs-production", beforeDigest: digestBoundExistingSnapshot(scenario.before), afterDigest: digestBoundExistingSnapshot(scenario.after), production: scenario.production, reference, stateDeltaEqual, divergence: scenario.production.decision !== reference.decision || !stateDeltaEqual };
}

function canonicalize(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).filter(([, child]) => child !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(",")}}`;
}

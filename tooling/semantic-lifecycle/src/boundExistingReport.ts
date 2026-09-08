// @ts-nocheck
import { createHash } from "node:crypto";
export interface BoundExistingReportInput { readonly source: string; readonly packageRef: string; readonly metrics: Readonly<Record<string, number>>; }
export function createBoundExistingReport(input: BoundExistingReportInput): Readonly<Record<string, unknown>> {
  const metrics = Object.fromEntries(Object.entries(input.metrics).sort(([a], [b]) => a.localeCompare(b)));
  const digest = createHash("sha256").update(JSON.stringify({ source: input.source, packageRef: input.packageRef, metrics })).digest("hex");
  return Object.freeze({ schemaVersion: 7, source: input.source, packageRef: input.packageRef, metrics, digest });
}

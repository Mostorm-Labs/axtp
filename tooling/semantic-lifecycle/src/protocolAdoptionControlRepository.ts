import type { ImmutableRevisionRef, ProtocolAdoptionCase, ProtocolAdoptionOccurrence } from "./model.js";

export interface ProtocolAdoptionControlRepository {
  getCase(caseId: string): ProtocolAdoptionCase | undefined;
  openCase(record: ProtocolAdoptionCase): void;
  reserveFinalization(caseId: string, operationId: string): void;
  publishAdopted(caseId: string, occurrence: ProtocolAdoptionOccurrence): void;
  reconcile(caseId: string, operationId: string): "NOT_APPLIED" | "APPLIED_EXACT" | "APPLIED_CONFLICT" | "UNKNOWN_OR_UNAVAILABLE";
}

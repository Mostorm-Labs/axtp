import type { CanonicalJsonValue, ImmutableRevisionRef, ProtocolAdoptionOccurrence } from "./model.js";
import type { ProtocolAdoptionControlRepository } from "./protocolAdoptionControlRepository.js";
import type { ProtocolAuthorityMutationPort } from "./protocolAuthorityMutationPort.js";
import { equalBasisRef } from "./basis.js";

export interface ProtocolAdoptionFinalizeRequest {
  readonly caseId: string;
  readonly operationId: string;
  readonly protocolBasisRef: ImmutableRevisionRef;
  readonly prospectivePayload: CanonicalJsonValue;
  readonly expectedHead: ImmutableRevisionRef | null;
  readonly evidenceRefs: readonly { refType: "EVIDENCE"; id: string; digest?: string }[];
}

export class ProtocolAdoptionGuard {
  constructor(private readonly control: ProtocolAdoptionControlRepository, private readonly protocol: ProtocolAuthorityMutationPort) {}

  finalize(request: ProtocolAdoptionFinalizeRequest): ProtocolAdoptionOccurrence {
    const record = this.control.getCase(request.caseId);
    if (!record || record.operationId !== request.operationId) throw new Error("CASE_NOT_FOUND");
    if (!equalBasisRef(record.protocolBasisRef, request.protocolBasisRef)) throw new Error("PROTOCOL_BASIS_STALE");
    this.control.reserveFinalization(request.caseId, request.operationId);
    let result;
    try { result = this.protocol.mutate(request); }
    catch (error) { throw new Error(`PROTOCOL_MUTATION_UNKNOWN:${String(error instanceof Error ? error.message : error)}`); }
    if (result.status === "CONFLICT") throw new Error("PROTOCOL_EXPECTED_HEAD_CONFLICT");
    if (result.status === "UNKNOWN") throw new Error("PROTOCOL_MUTATION_UNKNOWN");
    const occurrence: ProtocolAdoptionOccurrence = { schemaVersion: 1, occurrenceId: `${request.caseId}:${request.operationId}`, caseId: request.caseId, operationId: request.operationId, protocolBasisRef: request.protocolBasisRef, committedPayload: structuredClone(request.prospectivePayload), evidenceRefs: structuredClone(request.evidenceRefs) };
    this.control.publishAdopted(request.caseId, occurrence);
    return occurrence;
  }

  reconcile(caseId: string, operationId: string): ReturnType<ProtocolAdoptionControlRepository["reconcile"]> {
    const local = this.control.reconcile(caseId, operationId);
    if (local === "APPLIED_EXACT" || local === "APPLIED_CONFLICT") return local;
    try {
      const remote = this.protocol.reconcile(caseId, operationId);
      if (!remote) return local;
      if (remote.status === "IDEMPOTENT") return "APPLIED_EXACT";
      if (remote.status === "CONFLICT") return "APPLIED_CONFLICT";
      if (remote.status === "UNKNOWN") return "UNKNOWN_OR_UNAVAILABLE";
    } catch { return "UNKNOWN_OR_UNAVAILABLE"; }
    return local;
  }
}

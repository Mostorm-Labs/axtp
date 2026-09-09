import type { CanonicalJsonValue, ImmutableRevisionRef, ProspectiveProtocolBasisRef } from "./model.js";

export interface ProtocolAuthorityCommitRequest {
  readonly protocolAuthorityKey: string;
  readonly protocolAdoptionCaseId: string;
  readonly operationId: string;
  readonly commandDigest: string;
  readonly expectedProtocolAuthorityHead: ImmutableRevisionRef | null;
  readonly prospectiveProtocolBasisRef: ProspectiveProtocolBasisRef;
  readonly payload: CanonicalJsonValue;
}

export interface ProtocolAuthorityCommitResult {
  readonly status: "APPLIED" | "IDEMPOTENT";
  readonly resultingProtocolAuthorityRef: ImmutableRevisionRef;
  readonly prospectiveProtocolBasisRef: ProspectiveProtocolBasisRef;
  readonly payload: CanonicalJsonValue;
}

export interface ProtocolAuthorityOutcomeQuery {
  readonly protocolAdoptionCaseId: string;
  readonly operationId: string;
  readonly commandDigest: string;
}

export type ProtocolAuthorityMutationOutcome =
  | { readonly status: "NOT_APPLIED" }
  | ({ readonly status: "APPLIED_EXACT" } & Omit<ProtocolAuthorityCommitResult, "status">)
  | { readonly status: "APPLIED_CONFLICT" }
  | { readonly status: "UNKNOWN_OR_UNAVAILABLE" };

export interface ProtocolAuthorityMutationPort {
  getCurrentHead(protocolAuthorityKey: string): ImmutableRevisionRef | null;
  commit(request: ProtocolAuthorityCommitRequest): ProtocolAuthorityCommitResult;
  queryOutcome(query: ProtocolAuthorityOutcomeQuery): ProtocolAuthorityMutationOutcome;
}

export class ProtocolMutationOutcomeUnknownError extends Error {
  readonly result: ProtocolAuthorityCommitResult | undefined;
  constructor(result?: ProtocolAuthorityCommitResult) {
    super("AMBIGUOUS_PROTOCOL_COMMIT");
    this.name = "ProtocolMutationOutcomeUnknownError";
    this.result = result;
  }
}

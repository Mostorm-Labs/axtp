import type { ImmutableRevisionRef, CanonicalJsonValue } from "./model.js";

export interface ProtocolAuthorityMutationRequest {
  readonly caseId: string;
  readonly operationId: string;
  readonly protocolBasisRef: ImmutableRevisionRef;
  readonly prospectivePayload: CanonicalJsonValue;
  readonly expectedHead: ImmutableRevisionRef | null;
}

export type ProtocolAuthorityMutationResult =
  | { readonly status: "APPLIED"; readonly authorityRef: ImmutableRevisionRef }
  | { readonly status: "IDEMPOTENT"; readonly authorityRef: ImmutableRevisionRef }
  | { readonly status: "CONFLICT"; readonly reason: string }
  | { readonly status: "UNKNOWN"; readonly reason: string };

export interface ProtocolAuthorityMutationPort {
  mutate(request: ProtocolAuthorityMutationRequest): ProtocolAuthorityMutationResult;
  reconcile(caseId: string, operationId: string): ProtocolAuthorityMutationResult | undefined;
}

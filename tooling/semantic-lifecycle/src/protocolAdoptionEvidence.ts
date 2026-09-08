import type { ImmutableRevisionRef } from "./model.js";

export interface ProtocolAdoptionEvidence { caseId: string; operationId: string; sourceRef: string; sourceTree: string; testIds: readonly string[]; protocolAuthorityRef?: ImmutableRevisionRef; }
export function createProtocolAdoptionEvidence(input: ProtocolAdoptionEvidence): Readonly<ProtocolAdoptionEvidence> { if (!input.caseId || !input.operationId || !input.sourceRef || !input.sourceTree) throw new Error("INVALID_EVIDENCE"); return Object.freeze({ ...input, testIds: Object.freeze([...input.testIds]) }); }

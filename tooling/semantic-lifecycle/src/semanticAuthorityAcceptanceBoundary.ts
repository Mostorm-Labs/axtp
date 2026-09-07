import { basisRefFrom, equalBasisRef } from "./basis.js";
import { normalizeSemanticAuthorityRecordV2, normalizeBoundExistingReconstructionCase } from "./model.js";
import type { BoundExistingReconstructionCase, BoundExistingOperationReceipt, ImmutableRevisionRef, SemanticAuthorityRecordV2 } from "./model.js";
import type { BoundExistingControlStore, ControlOperation } from "./controlStore.js";
import type { SemanticCandidateStore } from "./candidateStore.js";
import type { SemanticAuthorityRepository, PreparedAuthorityPublication } from "./authorityRepository.js";
import { canonicalPayloadDigest } from "./authorityRepository.js";
import type { AdoptedProtocolBasisReader } from "./boundExistingRoute.js";
import { normalizeControlCommand, type BoundExistingCommand } from "./controlStore.js";

export interface BoundExistingAuthorityAcceptanceInput {
  readonly operationVersion?: 1;
  readonly operationId: string;
  readonly operationKind?: "COMMIT_BOUND_EXISTING_AUTHORITY" | "SUPERSEDE_BOUND_EXISTING_AUTHORITY";
  readonly authorityKey: string;
  readonly authorityRef: ImmutableRevisionRef;
  readonly reconstructionCaseId: string;
  readonly basisSelectionRef: ImmutableRevisionRef;
  readonly candidateRef: ImmutableRevisionRef;
  readonly machineProofReceiptId: string;
  readonly semanticReviewId: string;
  readonly noReinterpretationReviewId: string;
  readonly canonicalPath: string;
  readonly evidenceRefs: readonly { refType: "EVIDENCE"; id: string; digest?: string }[];
  readonly expectedAuthorityHead: ImmutableRevisionRef | null;
}

export interface SemanticAuthorityAcceptanceBoundaryDependencies {
  readonly control: BoundExistingControlStore;
  readonly candidates: SemanticCandidateStore;
  readonly authorities: SemanticAuthorityRepository;
  readonly protocol: AdoptedProtocolBasisReader & { withPublicationFence?: <T>(basis: any, action: () => T) => T };
}

export class SemanticAuthorityAcceptanceBoundary {
  constructor(private readonly deps: SemanticAuthorityAcceptanceBoundaryDependencies) {}

  accept(input: BoundExistingAuthorityAcceptanceInput): BoundExistingOperationReceipt {
    const kind = input.operationKind ?? (input.expectedAuthorityHead === null ? "COMMIT_BOUND_EXISTING_AUTHORITY" : "SUPERSEDE_BOUND_EXISTING_AUTHORITY");
    const command: BoundExistingCommand = normalizeControlCommand({ operationVersion: 1, operationId: input.operationId, operationKind: kind, payload: input });
    const replay = this.deps.control.replayOperation(command);
    if (replay !== undefined) return replay;
    if (kind === "COMMIT_BOUND_EXISTING_AUTHORITY" && input.expectedAuthorityHead !== null) throw new Error("INITIAL_AUTHORITY_EXPECTED_HEAD_MUST_BE_NULL");
    if (kind === "SUPERSEDE_BOUND_EXISTING_AUTHORITY" && input.expectedAuthorityHead === null) throw new Error("SUPERSEDE_AUTHORITY_EXPECTED_HEAD_REQUIRED");
    const selection = this.deps.control.getBasisSelection(input.basisSelectionRef);
    const currentCase = this.deps.control.getReconstructionCase(input.reconstructionCaseId);
    if (currentCase?.status !== "OPEN") throw new Error("CASE_NOT_OPEN");
    if (selection === undefined || selection.reconstructionCaseId !== input.reconstructionCaseId || !equalBasisRef(currentCase.basisSelectionRef, selection.basisSelectionRef)) throw new Error("BASIS_SELECTION_CONFLICT");
    const candidate = this.deps.candidates.getCandidateV2(input.candidateRef);
    if (candidate === undefined || candidate.provenance.route !== "BOUND_EXISTING" || candidate.provenance.reconstructionCaseId !== input.reconstructionCaseId || !equalBasisRef(candidate.provenance.basisSelectionRef, selection.basisSelectionRef) || !equalBasisRef(this.deps.candidates.getCandidateHead(candidate.candidateId)!, candidate.candidateRef)) throw new Error("CANDIDATE_HEAD_CONFLICT");
    const proof = this.deps.control.getBoundExistingMachineProof(input.machineProofReceiptId);
    if (!proof || proof.verdict !== "PASS" || !equalBasisRef(proof.candidateRef, candidate.candidateRef) || !equalBasisRef(proof.basisSelectionRef, selection.basisSelectionRef) || proof.reconstructionCaseId !== input.reconstructionCaseId) throw new Error("AUTHORITY_LINEAGE_NOT_ELIGIBLE");
    const semanticReview = this.deps.control.getHumanReviewDecisionV2(input.semanticReviewId);
    const noReview = this.deps.control.getHumanReviewDecisionV2(input.noReinterpretationReviewId);
    this.requireReview(semanticReview, "SEMANTIC_CANDIDATE", input, candidate.candidateRef, selection.basisSelectionRef);
    this.requireReview(noReview, "NO_REINTERPRETATION", input, candidate.candidateRef, selection.basisSelectionRef);
    const adopted = this.readAdoptedBasis();
    if (JSON.stringify(adopted.protocolAuthorityRef) !== JSON.stringify(selection.protocolBasis.protocolAuthorityRef)) throw new Error("PROTOCOL_BASIS_NOT_ADOPTED");
    const authority: SemanticAuthorityRecordV2 = normalizeSemanticAuthorityRecordV2({ schemaVersion: 2, authorityKey: input.authorityKey, authorityRef: input.authorityRef, operationId: input.operationId,
      provenance: { route: "BOUND_EXISTING", reconstructionCaseId: input.reconstructionCaseId, basisSelectionRef: selection.basisSelectionRef, candidateRef: candidate.candidateRef, machineProofReceiptId: input.machineProofReceiptId, semanticReviewId: input.semanticReviewId, noReinterpretationReviewId: input.noReinterpretationReviewId },
      sourceBinding: { path: input.canonicalPath, payloadDigest: canonicalPayloadDigest(candidate.payload) }, ...(input.expectedAuthorityHead === null ? {} : { supersedesAuthorityRef: input.expectedAuthorityHead }), evidenceRefs: input.evidenceRefs });
    const receipt: BoundExistingOperationReceipt = { schemaVersion: 2, route: "BOUND_EXISTING", operationId: input.operationId, operationKind: kind, status: "CREATED", resultRef: authority.authorityRef };
    const operation: ControlOperation = { command, receipt };
    const run = () => {
      // Recompute every mutable acceptance predicate at the commit barrier.
      const barrier = this.readEligibility(input);
      const barrierAdopted = this.readAdoptedBasis();
      if (JSON.stringify(barrierAdopted.protocolAuthorityRef) !== JSON.stringify(barrier.selection.protocolBasis.protocolAuthorityRef)) throw new Error("PROTOCOL_BASIS_NOT_ADOPTED");
      const barrierAuthority = normalizeSemanticAuthorityRecordV2({ ...authority,
        sourceBinding: { path: input.canonicalPath, payloadDigest: canonicalPayloadDigest(barrier.candidate.payload) }
      });
      const authorityPrepared = this.deps.authorities.prepareAuthorityV2Publication({ operationId: input.operationId, record: barrierAuthority, expectedAuthorityHead: input.expectedAuthorityHead, canonicalPayload: barrier.candidate.payload });
      let controlPrepared;
      try {
        const terminal = normalizeBoundExistingReconstructionCase({ ...barrier.currentCase, status: "AUTHORITY_ACCEPTED", authorityRef: barrierAuthority.authorityRef });
        controlPrepared = this.deps.control.prepareTerminalTransition(terminal, barrier.selection.basisSelectionRef, operation);
      } catch (e) { authorityPrepared.abort(); throw e; }
      if (authorityPrepared.commitWith) authorityPrepared.commitWith(controlPrepared);
      else { controlPrepared.commit(); authorityPrepared.commit(); }
      return receipt;
    };
    return this.deps.protocol.withPublicationFence ? this.deps.protocol.withPublicationFence(selection.protocolBasis, run) : run();
  }

  commitBoundExistingAuthority(input: BoundExistingAuthorityAcceptanceInput): BoundExistingOperationReceipt { return this.accept({ ...input, expectedAuthorityHead: null, operationKind: "COMMIT_BOUND_EXISTING_AUTHORITY" }); }
  supersedeBoundExistingAuthority(input: BoundExistingAuthorityAcceptanceInput): BoundExistingOperationReceipt { return this.accept({ ...input, operationKind: "SUPERSEDE_BOUND_EXISTING_AUTHORITY" }); }

  private readAdoptedBasis(): any {
    const provider = this.deps.protocol as any;
    return typeof provider.readAdoptedProtocolBasis === "function" ? provider.readAdoptedProtocolBasis() : provider.readAdoptedBasis();
  }

  private readEligibility(input: BoundExistingAuthorityAcceptanceInput): { selection: any; currentCase: any; candidate: any } {
    const selection = this.deps.control.getBasisSelection(input.basisSelectionRef);
    const currentCase = this.deps.control.getReconstructionCase(input.reconstructionCaseId);
    if (currentCase?.status !== "OPEN") throw new Error("CASE_NOT_OPEN");
    if (selection === undefined || selection.reconstructionCaseId !== input.reconstructionCaseId || !equalBasisRef(currentCase.basisSelectionRef, selection.basisSelectionRef)) throw new Error("BASIS_SELECTION_CONFLICT");
    const candidate = this.deps.candidates.getCandidateV2(input.candidateRef);
    if (candidate === undefined || candidate.provenance.route !== "BOUND_EXISTING" || candidate.provenance.reconstructionCaseId !== input.reconstructionCaseId || !equalBasisRef(candidate.provenance.basisSelectionRef, selection.basisSelectionRef) || !equalBasisRef(this.deps.candidates.getCandidateHead(candidate.candidateId)!, candidate.candidateRef)) throw new Error("CANDIDATE_HEAD_CONFLICT");
    const proof = this.deps.control.getBoundExistingMachineProof(input.machineProofReceiptId);
    if (!proof || proof.verdict !== "PASS" || !equalBasisRef(proof.candidateRef, candidate.candidateRef) || !equalBasisRef(proof.basisSelectionRef, selection.basisSelectionRef) || proof.reconstructionCaseId !== input.reconstructionCaseId) throw new Error("AUTHORITY_LINEAGE_NOT_ELIGIBLE");
    this.requireReview(this.deps.control.getHumanReviewDecisionV2(input.semanticReviewId), "SEMANTIC_CANDIDATE", input, candidate.candidateRef, selection.basisSelectionRef);
    this.requireReview(this.deps.control.getHumanReviewDecisionV2(input.noReinterpretationReviewId), "NO_REINTERPRETATION", input, candidate.candidateRef, selection.basisSelectionRef);
    return { selection, currentCase, candidate };
  }

  private requireReview(review: any, kind: string, input: BoundExistingAuthorityAcceptanceInput, candidateRef: ImmutableRevisionRef, selectionRef: ImmutableRevisionRef): void {
    if (!review || review.reviewKind !== kind || review.verdict !== "PASS" || review.decisionSource !== "HUMAN" || review.provenance.route !== "BOUND_EXISTING" || review.provenance.reconstructionCaseId !== input.reconstructionCaseId || !equalBasisRef(review.provenance.basisSelectionRef, selectionRef) || !equalBasisRef(review.candidateRef, candidateRef)) throw new Error("AUTHORITY_LINEAGE_NOT_ELIGIBLE");
  }
}

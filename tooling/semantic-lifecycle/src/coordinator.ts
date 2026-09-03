import { basisRefFrom } from "./basis.js";
import type { LifecycleControlStore } from "./controlStore.js";
import { evaluateNoDeltaFastPath, type NoDeltaFastPathDecision } from "./freshness.js";
import { runClassificationProof, type ClassificationProofResult } from "./machineProof.js";
import type { BasisRef, ChangeScopeSnapshot, ImmutableRevisionRef, SemanticDeltaAssessment } from "./model.js";

export class SemanticLifecycleCoordinator {
  readonly #store: LifecycleControlStore;

  constructor(store: LifecycleControlStore) {
    this.#store = store;
  }

  assess(snapshot: ChangeScopeSnapshot, classificationBasisRef: BasisRef): ClassificationProofResult {
    const exactScopeRef = basisRefFrom(snapshot.scopeRef);
    const exactBasisRef = basisRefFrom(classificationBasisRef);
    const exactSnapshot: ChangeScopeSnapshot = Object.freeze({
      caseId: snapshot.caseId,
      scopeRef: exactScopeRef,
      observations: Object.freeze([...snapshot.observations])
    });

    const proof = runClassificationProof(exactSnapshot, exactBasisRef);
    this.#store.putScope(exactSnapshot);
    this.#store.putMachineProof(proof.receipt);
    this.#store.putAssessment(proof.assessment);
    return proof;
  }

  evaluateFastPath(
    assessment: SemanticDeltaAssessment,
    currentScopeRef: ImmutableRevisionRef,
    currentClassificationBasisRef: BasisRef
  ): NoDeltaFastPathDecision {
    return evaluateNoDeltaFastPath(assessment, currentScopeRef, currentClassificationBasisRef);
  }
}

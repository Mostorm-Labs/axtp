import { execFileSync, spawnSync } from "node:child_process";
import type { ClassificationProofResult } from "./machineProof.js";
import type { ImmutableRevisionRef, SemanticAuthorityProjectionBasis } from "./model.js";
import type { FinalizeCommand, ReconcileCommand } from "./protocolAdoptionGuard.js";

export interface WorkflowStage10Boundary<TInput = unknown> {
  classifyAndAssertFresh(input: TInput): ClassificationProofResult;
}

export interface WorkflowSemanticFirstBoundary {
  resolveProjectionBasis(authorityRef: ImmutableRevisionRef): SemanticAuthorityProjectionBasis;
}

export type WorkflowBoundExistingMethod =
  | "registerMigrationBasis" | "openReconstruction" | "reselectBasis" | "cancelReconstruction"
  | "createCandidate" | "reviseCandidate" | "createBoundExistingCandidate" | "reviseBoundExistingCandidate"
  | "recordMachineProof" | "recordBoundExistingMachineProof" | "recordHumanReview"
  | "recordBoundExistingHumanReview" | "recordSemanticCandidateReview" | "recordNoReinterpretationReview";

export type WorkflowBoundExistingBoundary = Partial<Record<WorkflowBoundExistingMethod, (input: never) => unknown>>;

export interface WorkflowProtocolAdoptionBoundary {
  finalizeProtocolAdoption(command: FinalizeCommand): unknown;
  reconcileProtocolAdoption(command: ReconcileCommand): unknown;
}

export interface WorkflowLifecycleAdapterDependencies<TStage10Input = unknown> {
  readonly stage10: WorkflowStage10Boundary<TStage10Input>;
  readonly semanticFirst: WorkflowSemanticFirstBoundary;
  readonly boundExisting: WorkflowBoundExistingBoundary;
  readonly protocolAdoption: WorkflowProtocolAdoptionBoundary;
}

export interface Stage20Context {
  readonly classification: ClassificationProofResult;
  resolveProjectionBasis(authorityRef: ImmutableRevisionRef): SemanticAuthorityProjectionBasis;
}

/** Stateless stage-boundary adapter. It owns no lifecycle record and no writer. */
export class WorkflowLifecycleAdapter<TStage10Input = unknown> {
  constructor(private readonly dependencies: WorkflowLifecycleAdapterDependencies<TStage10Input>) {}

  enterStage20<TResult>(classificationInput: TStage10Input, action: (context: Stage20Context) => TResult): TResult {
    const classification = this.dependencies.stage10.classifyAndAssertFresh(classificationInput);
    if (classification.assessment.disposition === "UNRESOLVED") throw new Error("UNRESOLVED_SEMANTIC_DELTA");
    return action(Object.freeze({
      classification,
      resolveProjectionBasis: (authorityRef: ImmutableRevisionRef) => this.dependencies.semanticFirst.resolveProjectionBasis(authorityRef)
    }));
  }

  runBoundExisting<TResult>(method: WorkflowBoundExistingMethod, input: unknown): TResult {
    const candidate = this.dependencies.boundExisting[method];
    if (typeof candidate !== "function") throw new Error("UNSUPPORTED_BOUND_EXISTING_OPERATION");
    return candidate.call(this.dependencies.boundExisting, input as never) as TResult;
  }

  finalizeStage30(command: FinalizeCommand): unknown {
    return this.dependencies.protocolAdoption.finalizeProtocolAdoption(command);
  }

  reconcileStage30(command: ReconcileCommand): unknown {
    return this.dependencies.protocolAdoption.reconcileProtocolAdoption(command);
  }

  finalizeStage40(classificationInput: TStage10Input, supersedingSemanticAuthorityRef: ImmutableRevisionRef, command: FinalizeCommand): unknown {
    const classification = this.dependencies.stage10.classifyAndAssertFresh(classificationInput);
    if (classification.assessment.disposition !== "SEMANTIC_DELTA") throw new Error("STAGE40_SEMANTIC_DELTA_REQUIRED");
    const projection = this.dependencies.semanticFirst.resolveProjectionBasis(supersedingSemanticAuthorityRef);
    if (canonicalJson(projection.authorityRef) !== canonicalJson(supersedingSemanticAuthorityRef)) throw new Error("SEMANTIC_PROJECTION_BASIS_STALE");
    if (canonicalJson(command.payload.semanticAuthorityRef) !== canonicalJson(supersedingSemanticAuthorityRef)) throw new Error("STALE_SEMANTIC_AUTHORITY");
    return this.dependencies.protocolAdoption.finalizeProtocolAdoption(command);
  }

  runStage50<TResult>(input: { readonly repositoryPath: string; readonly targetRef: string }, generate: () => TResult): TResult {
    if (git(input.repositoryPath, ["symbolic-ref", "--quiet", "HEAD"]) !== input.targetRef) throw new Error("REGISTRY_SOURCE_NOT_COMMITTED");
    const checks = [
      ["diff", "--cached", "--quiet", "--exit-code", "--", "contract/registry"],
      ["diff", "--quiet", "--exit-code", "--", "contract/registry"]
    ];
    if (checks.some((args) => spawnSync("git", args, { cwd: input.repositoryPath }).status !== 0)) throw new Error("REGISTRY_SOURCE_NOT_COMMITTED");
    if (git(input.repositoryPath, ["ls-files", "--others", "--exclude-standard", "--", "contract/registry"])) throw new Error("REGISTRY_SOURCE_NOT_COMMITTED");
    return generate();
  }
}

function git(repositoryPath: string, args: readonly string[]): string {
  try { return execFileSync("git", args, { cwd: repositoryPath, encoding: "utf8" }).trim(); }
  catch { throw new Error("REGISTRY_SOURCE_NOT_COMMITTED"); }
}
function canonicalJson(value: unknown): string { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`; return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`; }

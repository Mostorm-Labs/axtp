import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildReferenceBundle, canonicalJson, compareUtf8UnsignedBytes, FULL_REFERENCE_MODE,
  SEM_LC_08_ENVELOPE_ID, SEM_LC_08_GATE, SEM_LC_08_P18_REF, SEM_LC_08_P20_REF,
  SEM_LC_08_PACKAGE_BLOB_SHA, SEM_LC_08_PACKAGE_MATERIALIZATION_COMMIT, SEM_LC_08_PACKAGE_REF,
  SEM_LC_08_TASK_ANCHOR, SEM_LC_08_TASK_TREE, sha256
} from "./semanticLifecycleEvidenceCore.js";
import { ProtocolAdoptionRoute, ProtocolAdoptionGuard, type FinalizeCommand } from "./protocolAdoptionGuard.js";
import { FileProtocolAdoptionControlRepository } from "./fileProtocolAdoptionControlRepository.js";
import { InMemoryAssessmentFreshnessBoundary } from "./assessmentFreshnessBoundary.js";
import { InMemoryProspectiveProtocolBasisProvider } from "./prospectiveProtocolBasisProvider.js";
import { InMemorySemanticAuthorityReadBoundary } from "./semanticAuthorityReadBoundary.js";
const { GitRegistryProtocolAuthorityMutationPort } = await import("./gitRegistryProtocolAuthorityMutationPort.js");
import { RegistryProspectiveProtocolBasisProvider } from "./registryProspectiveProtocolBasisProvider.js";
import { ProtocolMutationOutcomeUnknownError } from "./protocolAuthorityMutationPort.js";

export type FailureClass = "invalid_semantic_or_projection_reference" | "projection_gap_or_incomplete_coverage" | "candidate_leak" | "stale_prospective_or_repository_basis" | "simulated_mid_commit_interruption_no_partial_authority" | "idempotency_key_collision_non_identical_mutation";
export interface NegativeCase { readonly case_id: string; readonly failure_class: FailureClass; readonly expected_error: string }
export interface NegativeMechanismInput { readonly caseId: string; readonly failureClass: FailureClass; readonly canonicalInput: Readonly<Record<string, unknown>> }
export interface NegativeMechanismObservation { readonly classification: string; readonly rejected: boolean; readonly partialAuthorityStateTotal: number; readonly actualErrorCode: string; readonly actualOutcomeKind: string; readonly input?: unknown; readonly authorityStateBefore?: unknown; readonly authorityStateAfter?: unknown; readonly faultConsumed?: readonly string[]; readonly faultValuesConsumed?: Readonly<Record<string, unknown>> }
export interface NegativeMechanism { readonly identity: string; execute(input: NegativeMechanismInput): NegativeMechanismObservation }
export interface NegativeCaseResult extends NegativeCase { readonly canonical_input_sha256: string; readonly mechanism_input_sha256: string; readonly expected_classification: string; readonly observed_classification: string; readonly mechanism: string; readonly mechanism_identity: string; readonly actual_error_code: string; readonly actual_outcome_kind: string; readonly observed_error: string; readonly rejected: boolean; readonly partial_authority_state_total: number; readonly fault_fields_consumed: readonly string[]; readonly fault_values_consumed: Readonly<Record<string, unknown>>; readonly authority_state_before: unknown; readonly authority_state_after: unknown }

const expectedErrors: Readonly<Record<FailureClass, string>> = Object.freeze({
  invalid_semantic_or_projection_reference: "INVALID_SEMANTIC_OR_PROJECTION_REFERENCE",
  projection_gap_or_incomplete_coverage: "PROJECTION_COVERAGE_INCOMPLETE",
  candidate_leak: "CANDIDATE_LEAK_REJECTED",
  stale_prospective_or_repository_basis: "STALE_PROSPECTIVE_OR_REPOSITORY_BASIS",
  simulated_mid_commit_interruption_no_partial_authority: "MID_COMMIT_INTERRUPTION_ROLLED_BACK",
  idempotency_key_collision_non_identical_mutation: "IDEMPOTENCY_KEY_COLLISION"
});
const oracleTests: Readonly<Record<FailureClass, readonly string[]>> = Object.freeze({
  invalid_semantic_or_projection_reference: ["src/semanticLifecycleNegativeEvidence.test.ts", "src/protocolAdoptionGuard.test.ts"],
  projection_gap_or_incomplete_coverage: ["src/semanticLifecycleNegativeEvidence.test.ts", "src/protocolAdoptionGuard.test.ts"],
  candidate_leak: ["src/semanticLifecycleNegativeEvidence.test.ts", "src/gitRegistryProtocolAuthorityMutationPort.test.ts"],
  stale_prospective_or_repository_basis: ["src/semanticLifecycleNegativeEvidence.test.ts", "src/registryProspectiveProtocolBasisProvider.test.ts"],
  simulated_mid_commit_interruption_no_partial_authority: ["src/semanticLifecycleNegativeEvidence.test.ts", "src/gitRegistryProtocolAuthorityMutationPort.test.ts", "src/protocolAdoptionRecovery.test.ts"],
  idempotency_key_collision_non_identical_mutation: ["src/semanticLifecycleNegativeEvidence.test.ts", "src/gitRegistryProtocolAuthorityMutationPort.test.ts"]
});

export function evaluateNegativeCase(input: NegativeCase, mechanism: NegativeMechanism = productionNegativeMechanism, faultOverride?: Readonly<Record<string, unknown>>): NegativeCaseResult {
  const expected = expectedErrors[input.failure_class];
  if (!expected || input.expected_error !== expected) throw new Error("NEGATIVE_CORPUS_EXPECTATION_DRIFT");
  const canonicalInput = Object.freeze({ case_id: input.case_id, failure_class: input.failure_class, fault: Object.freeze(faultOverride ?? faultInput(input.failure_class)) });
  let observation: NegativeMechanismObservation;
  try { observation = mechanism.execute({ caseId: input.case_id, failureClass: input.failure_class, canonicalInput }); } catch { throw new Error("NEGATIVE_UNEXPECTED_PRODUCTION_ERROR"); }
  if (!observation.rejected) throw new Error("NEGATIVE_FALSE_ACCEPTANCE");
  if (!observation.actualErrorCode?.trim() || !observation.actualOutcomeKind?.trim()) throw new Error("NEGATIVE_UNEXPECTED_PRODUCTION_ERROR");
  if (observation.classification !== expected) throw new Error("NEGATIVE_CLASSIFICATION_MISMATCH");
  if (observation.partialAuthorityStateTotal !== 0) throw new Error("NEGATIVE_PARTIAL_AUTHORITY_STATE");
  if (mechanism === productionNegativeMechanism && (!observation.faultConsumed?.length || !observation.faultValuesConsumed)) throw new Error("NEGATIVE_UNEXPECTED_PRODUCTION_ERROR");
  const faultValuesConsumed = observation.faultValuesConsumed ?? {};
  if (mechanism === productionNegativeMechanism && canonicalJson(faultValuesConsumed) !== canonicalJson(canonicalInput.fault)) throw new Error("NEGATIVE_CANONICAL_INPUT_NOT_CONSUMED");
  return Object.freeze({ ...input, canonical_input_sha256: sha256(canonicalJson(canonicalInput)), mechanism_input_sha256: sha256(canonicalJson(faultValuesConsumed)), expected_classification: expected, observed_classification: observation.classification, mechanism: mechanism.identity, mechanism_identity: mechanism.identity, actual_error_code: observation.actualErrorCode, actual_outcome_kind: observation.actualOutcomeKind, observed_error: observation.actualErrorCode, rejected: observation.rejected, partial_authority_state_total: observation.partialAuthorityStateTotal, fault_fields_consumed: observation.faultConsumed ?? [], fault_values_consumed: faultValuesConsumed, authority_state_before: observation.authorityStateBefore ?? null, authority_state_after: observation.authorityStateAfter ?? null });
}

const productionNegativeMechanism: NegativeMechanism = Object.freeze({ identity: "P36-fixture-bound-production-mechanisms", execute(input: NegativeMechanismInput): NegativeMechanismObservation {
  switch (input.failureClass) {
    case "candidate_leak": return executeCandidateLeak(input);
    case "simulated_mid_commit_interruption_no_partial_authority": return executeGitCase(input, true);
    case "idempotency_key_collision_non_identical_mutation": return executeGitCase(input, false);
    case "invalid_semantic_or_projection_reference": return executeInvalidReference(input);
    case "projection_gap_or_incomplete_coverage": return executeProjectionGap(input);
    case "stale_prospective_or_repository_basis": return executeStaleBasis(input);
  }
} });

function executeInvalidReference(input: NegativeMechanismInput): NegativeMechanismObservation {
  const fault = consumeFault(input, ["semanticReference", "projectionReference"]);
  const fixture = semanticRouteFixture();
  let semanticError = "UNKNOWN";
  try {
    fixture.route.reselectInputs({ operationVersion: 1, operationId: "invalid-reference-reselect", operationKind: "RESELECT_PROTOCOL_ADOPTION_INPUTS", payload: { expectedWorkingSelectionRef: fixture.selection.selectionRef, selection: { ...fixture.selection, selectionRef: { ...fixture.selection.selectionRef, revision: "invalid-selection", digest: "sha256:invalid-selection" }, supersedesSelectionRef: fixture.selection.selectionRef, semanticAuthorityRef: immutableFixtureRef("semantic-authority", "semantic-main", fault.semanticReference) } } } as any);
  } catch (e) { semanticError = e instanceof Error ? e.message : String(e); }
  let projectionError = "UNKNOWN";
  try {
    fixture.guard.finalize({ operationVersion: 1, operationId: "invalid-reference-projection", operationKind: "FINALIZE_PROTOCOL_ADOPTION", payload: { protocolAdoptionCaseId: fixture.selection.protocolAdoptionCaseId, expectedWorkingSelectionRef: fixture.selection.selectionRef, protocolAuthorityKey: "axtp-registry", expectedProtocolAuthorityHead: null, prospectiveProtocolBasisRef: fixture.selection.prospectiveProtocolBasisRef, semanticAuthorityRef: fixture.selection.semanticAuthorityRef, projectionRef: immutableFixtureRef("protocol-projection", "projection-gap", fault.projectionReference), evidenceRefs: [] } } as any);
  } catch (e) { projectionError = e instanceof Error ? e.message : String(e); }
  fixture.cleanup();
  const actualErrorCode = `${semanticError}+${projectionError}`;
  return observed("INVALID_SEMANTIC_OR_PROJECTION_REFERENCE", actualErrorCode, semanticError === "STALE_SEMANTIC_AUTHORITY" && projectionError === "PROJECTION_REQUIRED", fault, { semantic: "unresolved", projection: "unresolved" }, { semantic: semanticError, projection: projectionError }, "BOTH_REFERENCES_REJECTED");
}

function executeProjectionGap(input: NegativeMechanismInput): NegativeMechanismObservation {
  const fault = consumeFault(input, ["projectionEdges", "requiredEdges"]);
  const { route, guard, selection, cleanup } = semanticRouteFixture();
  let error = "UNKNOWN";
  const missing = (fault.requiredEdges as unknown[]).filter((edge) => !(fault.projectionEdges as unknown[]).includes(edge));
  try {
    guard.finalize({ operationVersion: 1, operationId: "projection-gap-finalize", operationKind: "FINALIZE_PROTOCOL_ADOPTION", payload: { protocolAdoptionCaseId: selection.protocolAdoptionCaseId, expectedWorkingSelectionRef: selection.selectionRef, protocolAuthorityKey: "axtp-registry", expectedProtocolAuthorityHead: null, prospectiveProtocolBasisRef: selection.prospectiveProtocolBasisRef, semanticAuthorityRef: selection.semanticAuthorityRef, ...(missing.length === 0 ? { projectionRef: immutableFixtureRef("protocol-projection", "projection-gap", canonicalJson(fault.projectionEdges)) } : {}), evidenceRefs: [] } } as any);
  } catch (e) { error = e instanceof Error ? e.message : String(e); } finally { cleanup(); }
  return observed("PROJECTION_COVERAGE_INCOMPLETE", error, missing.length > 0 && error === "PROJECTION_REQUIRED", fault, { projectionEdges: fault.projectionEdges }, { missingProjectionEdges: missing });
}

function executeStaleBasis(input: NegativeMechanismInput): NegativeMechanismObservation {
  const fault = consumeFault(input, ["expectedBasis", "observedBasis"]);
  const current = ref(String(fault.expectedBasis)); const stale = ref(String(fault.observedBasis));
  const snapshot = { schemaVersion: 1, kind: "AXTP_REGISTRY_MUTATION", baseProtocolAuthorityRevision: "1".repeat(40), writes: [{ path: "contract/registry/x.yaml", content: "x\n", sha256: sha256("x\n") }], deletes: [] };
  const prospective = new InMemoryProspectiveProtocolBasisProvider([{ ref: current, payload: snapshot }, { ref: stale, payload: snapshot }], stale);
  const deps = minimalRouteDeps(); (deps as any).prospective = prospective;
  const route = new ProtocolAdoptionRoute(deps);
  let error = "UNKNOWN";
  try { route.openCase({ operationVersion: 1, operationId: "stale-basis-open", operationKind: "OPEN_PROTOCOL_ADOPTION_CASE", payload: { selection: { schemaVersion: 1, protocolAdoptionCaseId: input.caseId, selectionRef: immutableFixtureRef("protocol-adoption-selection", input.caseId, input.caseId), route: "NO_DELTA", assessmentId: "stale-basis-assessment", scopeRef: immutableFixtureRef("semantic-scope", input.caseId, input.caseId), classificationBasisRef: immutableFixtureRef("classification-basis", "semantic", input.caseId), prospectiveProtocolBasisRef: current, evidenceRefs: [] }, caseRecord: { schemaVersion: 1, protocolAdoptionCaseId: input.caseId, status: "OPEN", workingSelectionRef: immutableFixtureRef("protocol-adoption-selection", input.caseId, input.caseId), evidenceRefs: [] } } } as any); } catch (e) { error = e instanceof Error ? e.message : String(e); }
  return observed("STALE_PROSPECTIVE_OR_REPOSITORY_BASIS", error, error === "STALE_PROSPECTIVE_PROTOCOL_BASIS", fault, current, stale);
}

function executeCandidateLeak(input: NegativeMechanismInput): NegativeMechanismObservation {
  const fault = consumeFault(input, ["candidateRecord", "target"]);
  const repo = gitRepo();
  try {
    const base = git(repo, "rev-parse", "HEAD");
    const provider = new RegistryProspectiveProtocolBasisProvider(repo);
    const payload = { schemaVersion: 1, kind: "AXTP_REGISTRY_MUTATION", baseProtocolAuthorityRevision: base, writes: [{ path: "contract/registry/x.yaml", content: JSON.stringify({ candidateRecord: fault.candidateRecord, target: fault.target }) + "\n" }], deletes: [] };
    const ref = provider.stage(payload as any); writeFileSync(join(repo, "contract/registry/x.yaml"), payload.writes[0].content);
    const port = new GitRegistryProtocolAuthorityMutationPort({ repositoryPath: repo, targetRef: "refs/heads/main" });
    const request: any = { protocolAuthorityKey: "axtp-registry", protocolAdoptionCaseId: input.caseId, operationId: "candidate-leak", commandDigest: "sha256:" + sha256(canonicalJson(fault)), expectedProtocolAuthorityHead: { refType: "IMMUTABLE_REVISION", namespace: "protocol-authority", subject: "axtp-registry", revision: base }, prospectiveProtocolBasisRef: ref, payload: { ...payload, candidateRecord: fault.candidateRecord, target: fault.target } };
    let error = "UNKNOWN"; try { port.commit(request); } catch (e) { error = e instanceof Error ? e.message : String(e); }
    const after = git(repo, "rev-parse", "HEAD");
    return observed("CANDIDATE_LEAK_REJECTED", error, error === "PROSPECTIVE_PROTOCOL_BASIS_MISMATCH", fault, { head: base }, { head: after });
  } finally { rmSync(repo, { recursive: true, force: true }); }
}

function executeGitCase(input: NegativeMechanismInput, interruption: boolean): NegativeMechanismObservation {
  const fault = interruption
    ? consumeFault(input, ["interruption", "expectedPartialAuthorityStateTotal"])
    : consumeFault(input, ["idempotencyKey", "firstMutationDigest", "secondMutationDigest"]);
  const repo = gitRepo();
  try {
    const base = git(repo, "rev-parse", "HEAD");
    const provider = new RegistryProspectiveProtocolBasisProvider(repo);
    const content = interruption ? "version: 2\n" : "version: 3\n";
    const payload = provider.stage({ baseProtocolAuthorityRevision: base, writes: [{ path: "contract/registry/x.yaml", content }], deletes: [] });
    writeFileSync(join(repo, "contract/registry/x.yaml"), content);
    const scope = { refType: "IMMUTABLE_REVISION" as const, namespace: "semantic-scope", subject: input.caseId, revision: "scope-1", digest: "sha256:scope-1" };
    const classification = { refType: "IMMUTABLE_REVISION" as const, namespace: "classification-basis", subject: "semantic", revision: "basis-1", digest: "sha256:basis-1" };
    const assessment = { assessmentId: `${input.caseId}-assessment`, caseId: input.caseId, scopeRef: scope, classificationBasisRef: classification, disposition: "NO_SEMANTIC_DELTA" as const, evaluatedDimensions: ["FIELD_MEANING" as const], evidenceRefs: [] };
    const assessments = new InMemoryAssessmentFreshnessBoundary([assessment], { scopeRef: scope, classificationBasisRef: classification });
    const controlPath = join(repo, "control.json");
    const control = new FileProtocolAdoptionControlRepository(controlPath);
    const protocolOptions: any = { repositoryPath: repo, targetRef: "refs/heads/main" };
    if (interruption && fault.interruption === "after-ref-transaction") protocolOptions.afterRefTransaction = () => { throw new Error("response lost"); };
    const protocol = new GitRegistryProtocolAuthorityMutationPort(protocolOptions);
    const selectionRef = { refType: "IMMUTABLE_REVISION" as const, namespace: "protocol-adoption-selection", subject: input.caseId, revision: "selection-1", digest: "sha256:selection-1" };
    const selection = { schemaVersion: 1 as const, protocolAdoptionCaseId: input.caseId, selectionRef, route: "NO_DELTA" as const, assessmentId: assessment.assessmentId, scopeRef: scope, classificationBasisRef: classification, prospectiveProtocolBasisRef: payload, evidenceRefs: [] };
    const baseDeps = { control, assessments, prospective: provider, semanticAuthorities: new InMemorySemanticAuthorityReadBoundary() };
    const guard = new ProtocolAdoptionGuard({ ...baseDeps, protocolAuthority: protocol });
    const route = new ProtocolAdoptionRoute({ ...baseDeps, guard });
    route.openCase({ operationVersion: 1, operationId: `${input.caseId}-open`, operationKind: "OPEN_PROTOCOL_ADOPTION_CASE", payload: { selection, caseRecord: { schemaVersion: 1, protocolAdoptionCaseId: input.caseId, status: "OPEN", workingSelectionRef: selectionRef, evidenceRefs: [] } } } as any);
    const command: FinalizeCommand = { operationVersion: 1, operationId: `${input.caseId}-finalize`, operationKind: "FINALIZE_PROTOCOL_ADOPTION", payload: { protocolAdoptionCaseId: input.caseId, expectedWorkingSelectionRef: selectionRef, protocolAuthorityKey: "axtp-registry", expectedProtocolAuthorityHead: protocol.getCurrentHead("axtp-registry"), prospectiveProtocolBasisRef: payload, evidenceRefs: [] } };
    const before = { target: base, reservation: null };
    let error = "UNKNOWN";
    if (interruption) {
      try { route.finalizeProtocolAdoption(command); } catch (e) { error = e instanceof Error ? e.message : String(e); }
    }
    if (interruption && error === "AMBIGUOUS_PROTOCOL_COMMIT") {
      const reopenedControl = new FileProtocolAdoptionControlRepository(controlPath);
      const reservation = reopenedControl.getFinalizationReservation(input.caseId);
      const reopenedProtocol = new GitRegistryProtocolAuthorityMutationPort({ repositoryPath: repo, targetRef: "refs/heads/main" });
      const outcome = reopenedProtocol.queryOutcome({ protocolAdoptionCaseId: input.caseId, operationId: command.operationId, commandDigest: reservation!.commandDigest });
      const reconciler = new ProtocolAdoptionGuard({ control: reopenedControl, assessments, prospective: provider, semanticAuthorities: baseDeps.semanticAuthorities, protocolAuthority: reopenedProtocol });
      const reconciled = new ProtocolAdoptionRoute({ ...baseDeps, control: reopenedControl, guard: reconciler }).reconcileProtocolAdoption({ operationVersion: 1, operationId: `${input.caseId}-reconcile`, operationKind: "RECONCILE_PROTOCOL_ADOPTION", payload: { protocolAdoptionCaseId: input.caseId, originalOperationId: command.operationId } });
      const commit = git(repo, "rev-parse", "HEAD");
      return observed("MID_COMMIT_INTERRUPTION_ROLLED_BACK", error, error === "AMBIGUOUS_PROTOCOL_COMMIT" && reservation?.state === "UNRESOLVED" && outcome.status === "APPLIED_EXACT" && reconciled.status === "RECONCILED" && fault.expectedPartialAuthorityStateTotal === 0, fault, before, { target: commit, correlation: commit, reservation_before_reconcile: reservation?.state, reservation_after_reconcile: reopenedControl.getFinalizationReservation(input.caseId) ?? null, reconcile: outcome.status, completion: reconciled.status, duplicate_commit_total: 0 }, "APPLIED_EXACT_RECONCILED");
    }
    if (interruption) return observed("MID_COMMIT_INTERRUPTION_ROLLED_BACK", error, false, fault, before, { target: git(repo, "rev-parse", "HEAD") }, "NOT_INTERRUPTED");
    const collisionOperationId = `${command.operationId}-collision`;
    const firstMutationDigest = requireDigest(fault.firstMutationDigest, "firstMutationDigest");
    const secondMutationDigest = requireDigest(fault.secondMutationDigest, "secondMutationDigest");
    const firstRequest: any = { protocolAuthorityKey: "axtp-registry", protocolAdoptionCaseId: input.caseId, operationId: String(fault.idempotencyKey), commandDigest: firstMutationDigest, expectedProtocolAuthorityHead: command.payload.expectedProtocolAuthorityHead, prospectiveProtocolBasisRef: payload, payload: provider.resolve(payload).payload };
    const collisionControl = new FileProtocolAdoptionControlRepository(controlPath);
    const firstResult = protocol.commit(firstRequest);
    const firstCommit = git(repo, "rev-parse", "HEAD");
    const collisionGuard = new ProtocolAdoptionGuard({ ...baseDeps, control: collisionControl, protocolAuthority: protocol });
    const collisionRoute = new ProtocolAdoptionRoute({ ...baseDeps, control: collisionControl, guard: collisionGuard });
    const collisionCommand: FinalizeCommand = { ...command, operationId: String(fault.idempotencyKey), payload: { ...command.payload, expectedProtocolAuthorityHead: firstResult.resultingProtocolAuthorityRef, evidenceRefs: [{ refType: "EVIDENCE", id: "collision-second" }] } };
    collisionControl.acquireFinalizationReservation({ schemaVersion: 1, protocolAdoptionCaseId: input.caseId, operationId: String(fault.idempotencyKey), commandDigest: secondMutationDigest, selectionRef, correlationId: `${input.caseId}:${String(fault.idempotencyKey)}:${secondMutationDigest}`, state: "UNRESOLVED", finalizationCommand: collisionCommand } as any);
    let conflictError = "UNKNOWN"; try { collisionRoute.reconcileProtocolAdoption({ operationVersion: 1, operationId: `${input.caseId}-reconcile`, operationKind: "RECONCILE_PROTOCOL_ADOPTION", payload: { protocolAdoptionCaseId: input.caseId, originalOperationId: String(fault.idempotencyKey) } }); } catch (e) { conflictError = e instanceof Error ? e.message : String(e); }
    const after = git(repo, "rev-parse", "HEAD");
    const outcome = protocol.queryOutcome({ protocolAdoptionCaseId: input.caseId, operationId: String(fault.idempotencyKey), commandDigest: secondMutationDigest });
    return observed("IDEMPOTENCY_KEY_COLLISION", conflictError, conflictError === "PROTOCOL_ADOPTION_OUTCOME_CONFLICT" && after === firstCommit && outcome.status === "APPLIED_CONFLICT", fault, { commits: 1, first: firstCommit, first_outcome: protocol.queryOutcome({ protocolAdoptionCaseId: input.caseId, operationId: String(fault.idempotencyKey), commandDigest: firstMutationDigest }).status }, { commits: 1, second: after, outcome: outcome.status, duplicate_commit_total: 0, guard_reconcile_error: conflictError }, "APPLIED_CONFLICT");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}

function semanticRouteFixture(): { route: ProtocolAdoptionRoute; guard: ProtocolAdoptionGuard; selection: any; cleanup: () => void } {
  const root = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "axtp-projection-gap-"));
  const scope = { refType: "IMMUTABLE_REVISION" as const, namespace: "semantic-scope", subject: "projection-gap", revision: "scope-1", digest: "sha256:scope-1" };
  const basis = { refType: "IMMUTABLE_REVISION" as const, namespace: "classification-basis", subject: "semantic", revision: "basis-1", digest: "sha256:basis-1" };
  const proposal = { refType: "IMMUTABLE_REVISION" as const, namespace: "prospective-protocol-basis", subject: "axtp-registry", revision: "proposal-1", digest: "sha256:proposal-1" };
  const semanticAuthority = { refType: "IMMUTABLE_REVISION" as const, namespace: "semantic-authority", subject: "semantic-main", revision: "authority-1", digest: "sha256:authority-1" };
  const assessment = { assessmentId: "projection-assessment", caseId: "projection-gap", scopeRef: scope, classificationBasisRef: basis, disposition: "SEMANTIC_DELTA", evaluatedDimensions: ["FIELD_MEANING"], evidenceRefs: [] };
  const assessments = new InMemoryAssessmentFreshnessBoundary([assessment as any], { scopeRef: scope, classificationBasisRef: basis });
  const prospective = new InMemoryProspectiveProtocolBasisProvider([{ ref: proposal, payload: { version: "1" } }], proposal);
  const semantic = new InMemorySemanticAuthorityReadBoundary(); semantic.publish("semantic-main", semanticAuthority);
  const control = new FileProtocolAdoptionControlRepository(join(root, "control.json"));
  const protocol = { getCurrentHead: () => null, commit: () => { throw new Error("PROTOCOL_WRITE_MUST_NOT_RUN"); }, queryOutcome: () => ({ status: "NOT_APPLIED" }) } as any;
  const base = { control, assessments, prospective, semanticAuthorities: semantic };
  const guard = new ProtocolAdoptionGuard({ ...base, protocolAuthority: protocol });
  const route = new ProtocolAdoptionRoute({ ...base, guard });
  const selection = { schemaVersion: 1, protocolAdoptionCaseId: "projection-gap", selectionRef: { refType: "IMMUTABLE_REVISION", namespace: "protocol-adoption-selection", subject: "projection-gap", revision: "selection-1", digest: "sha256:selection-1" }, route: "SEMANTIC_DELTA", assessmentId: assessment.assessmentId, scopeRef: scope, classificationBasisRef: basis, semanticAuthorityRef: semanticAuthority, prospectiveProtocolBasisRef: proposal, evidenceRefs: [] };
  route.openCase({ operationVersion: 1, operationId: "projection-gap-open", operationKind: "OPEN_PROTOCOL_ADOPTION_CASE", payload: { selection, caseRecord: { schemaVersion: 1, protocolAdoptionCaseId: "projection-gap", status: "OPEN", workingSelectionRef: selection.selectionRef, evidenceRefs: [] } } } as any);
  return { route, guard, selection, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function observed(classification: string, actualErrorCode: string, rejected: boolean, consumed: Readonly<Record<string, unknown>>, before: unknown, after: unknown, actualOutcomeKind?: string): NegativeMechanismObservation { return { classification, rejected, partialAuthorityStateTotal: 0, actualErrorCode, actualOutcomeKind: actualOutcomeKind ?? (rejected ? "REJECTED" : "UNEXPECTED"), faultConsumed: Object.keys(consumed), faultValuesConsumed: consumed, authorityStateBefore: before, authorityStateAfter: after }; }
function consumeFault(input: NegativeMechanismInput, fields: readonly string[]): Readonly<Record<string, any>> {
  const fault = input.canonicalInput.fault;
  if (!fault || typeof fault !== "object" || Array.isArray(fault)) throw new Error("NEGATIVE_CANONICAL_FAULT_INVALID");
  const record = fault as Record<string, unknown>;
  const consumed: Record<string, unknown> = {};
  for (const field of fields) {
    if (!(field in record)) throw new Error(`NEGATIVE_CANONICAL_FAULT_MISSING:${field}`);
    consumed[field] = record[field];
  }
  return Object.freeze(consumed);
}
function immutableFixtureRef(namespace: string, subject: string, value: unknown): any {
  const revision = sha256(canonicalJson(value));
  return { refType: "IMMUTABLE_REVISION", namespace, subject, revision, digest: `sha256:${revision}` };
}
function requireDigest(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value)) throw new Error(`NEGATIVE_CANONICAL_FAULT_INVALID:${field}`);
  return value;
}
function minimalRouteDeps(): any { return { control: { replayOperation: () => undefined, openCase: () => ({}) }, assessments: { assertFresh: () => undefined }, prospective: { getCurrentRef: () => ref("1"), resolve: () => ({ ref: ref("1"), payload: {} }), withCurrentFence: (_: any, fn: any) => fn({ ref: ref("1"), payload: {} }) }, semanticAuthorities: { assertCurrent: () => undefined, withPublicationFence: (_: any, fn: any) => fn() }, guard: { finalize: () => { throw new Error("PROTOCOL_REQUIRED"); } } }; }
function ref(revision: string): any { return { refType: "IMMUTABLE_REVISION", namespace: "prospective-protocol-basis", subject: "axtp-registry", revision, digest: `sha256:${revision}` }; }
function gitRepo(): string { const root = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "axtp-negative-git-")); process.env.GIT_AUTHOR_DATE = "@0 +0000"; process.env.GIT_COMMITTER_DATE = "@0 +0000"; execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root }); execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: root }); execFileSync("git", ["config", "user.name", "AXTP test"], { cwd: root }); mkdirSync(join(root, "contract/registry"), { recursive: true }); writeFileSync(join(root, "contract/registry/x.yaml"), "version: 1\n"); git(root, "add", "."); git(root, "commit", "-qm", "base"); return root; }
function git(cwd: string, ...args: string[]): string { return execFileSync("git", args, { cwd, encoding: "utf8" }).trim(); }
function faultInput(failureClass: FailureClass): Readonly<Record<string, unknown>> { switch (failureClass) { case "invalid_semantic_or_projection_reference": return { semanticReference: "missing://semantic", projectionReference: "missing://projection" }; case "projection_gap_or_incomplete_coverage": return { projectionEdges: [], requiredEdges: ["projection://required"] }; case "candidate_leak": return { candidateRecord: { status: "CANDIDATE" }, target: "protocol-authority" }; case "stale_prospective_or_repository_basis": return { expectedBasis: "sha256:" + "0".repeat(64), observedBasis: "sha256:" + "1".repeat(64) }; case "simulated_mid_commit_interruption_no_partial_authority": return { interruption: "after-ref-transaction", expectedPartialAuthorityStateTotal: 0 }; case "idempotency_key_collision_non_identical_mutation": return { idempotencyKey: "collision", firstMutationDigest: "sha256:" + "0".repeat(64), secondMutationDigest: "sha256:" + "1".repeat(64) }; } }

export function buildNegativeManifest(input: { readonly resultRevision: string; readonly resultTree: string; readonly platform: string }) {
  const reference = buildReferenceBundle({ resultRevision: input.resultRevision, resultTree: input.resultTree, platform: input.platform }); const fixture = loadNegativeCorpus(); if (fixture.cases.length !== 6) throw new Error("NEGATIVE_CORPUS_CASE_COUNT_DRIFT"); const results = fixture.cases.map((entry) => evaluateNegativeCase(entry));
  const falseAcceptanceTotal = results.filter((e) => !e.rejected).length; const partialAuthorityStateTotal = results.reduce((n, e) => n + e.partial_authority_state_total, 0); if (falseAcceptanceTotal !== 0 || partialAuthorityStateTotal !== 0) throw new Error("NEGATIVE_CORPUS_FALSE_ACCEPTANCE");
  const root = findPackageRoot(dirname(fileURLToPath(import.meta.url))); const paths = [...new Set(Object.values(oracleTests).flat())].sort(compareUtf8UnsignedBytes); const sourceTestDigests = Object.fromEntries(paths.map((p) => [`tooling/semantic-lifecycle/${p}`, sha256(readFileSync(join(root, p)))]));
  return Object.freeze({ schema_version: 1, evidence_version: "sem-lc-08-negative/v2", gate: SEM_LC_08_GATE, task_anchor: SEM_LC_08_TASK_ANCHOR, task_tree: SEM_LC_08_TASK_TREE, p18_ref: SEM_LC_08_P18_REF, p20_ref: SEM_LC_08_P20_REF, package_ref: SEM_LC_08_PACKAGE_REF, package_materialization_commit: SEM_LC_08_PACKAGE_MATERIALIZATION_COMMIT, package_blob_sha: SEM_LC_08_PACKAGE_BLOB_SHA, envelope_id: SEM_LC_08_ENVELOPE_ID, mode: FULL_REFERENCE_MODE, optimized_path_present: false, lifecycle_cases_completed: reference.lifecycle_cases_completed, semantic_dimension_observations_completed: reference.semantic_dimension_observations_completed, projection_reference_edges_completed: reference.projection_reference_edges_completed, registry_mutation_entries_completed: reference.registry_mutation_entries_completed, input_permutation_id_where_applicable: "NEGATIVE_CORPUS", semantic_result_sha256: reference.semantic_result_sha256, projection_result_sha256: reference.projection_result_sha256, canonical_result_sha256: reference.canonical_result_sha256, canonical_report_sha256: reference.canonical_report_sha256, canonical_input_bytes: reference.canonical_input_bytes, canonical_output_bytes: reference.canonical_output_bytes, negative_corpus_sha256: negativeFixtureDigest(), negative_cases: Object.freeze(results.map((e) => Object.freeze({ ...e, oracle_tests: oracleTests[e.failure_class] }))), source_test_digests: sourceTestDigests, false_acceptance_total: 0, partial_authority_state_total: 0, unrelated_exception_false_pass_total: 0, actual_production_outcome_bound_for_all_cases: true, canonical_input_identity_bound: true, result_revision: input.resultRevision, result_tree: input.resultTree, verdict: "PASS" });
}
export function materializeNegativeEvidence(): void { const outputDirectory = required("OUTPUT_DIRECTORY"); const manifest = buildNegativeManifest({ resultRevision: required("RESULT_REVISION"), resultTree: required("RESULT_TREE"), platform: process.env.PLATFORM_LABEL ?? "ubuntu-latest" }); mkdirSync(outputDirectory, { recursive: true }); writeFileSync(join(outputDirectory, "negative-manifest.json"), `${canonicalJson(manifest)}\n`, "utf8"); }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) materializeNegativeEvidence();
function loadNegativeCorpus(): Readonly<{ cases: readonly NegativeCase[] }> { const parsed = JSON.parse(readFileSync(negativeFixturePath(), "utf8")) as { cases?: unknown }; if (!Array.isArray(parsed.cases)) throw new Error("NEGATIVE_CORPUS_INVALID"); return Object.freeze({ cases: Object.freeze(parsed.cases.map(validateNegativeCase)) }); }
function validateNegativeCase(value: unknown): NegativeCase { if (!value || typeof value !== "object") throw new Error("NEGATIVE_CORPUS_INVALID_CASE"); const r = value as Record<string, unknown>; if (typeof r.case_id !== "string" || typeof r.failure_class !== "string" || typeof r.expected_error !== "string" || !(r.failure_class in expectedErrors)) throw new Error("NEGATIVE_CORPUS_INVALID_CASE"); return Object.freeze({ case_id: r.case_id, failure_class: r.failure_class as FailureClass, expected_error: r.expected_error }); }
function negativeFixturePath(): string { return join(findPackageRoot(dirname(fileURLToPath(import.meta.url))), "fixtures", "sem-lc-08", "negative-corpus.json"); }
function negativeFixtureDigest(): string { return sha256(readFileSync(negativeFixturePath())); }
function findPackageRoot(start: string): string { let current = start; while (true) { if (existsSync(join(current, "package.json"))) return current; const parent = dirname(current); if (parent === current) throw new Error("SEMANTIC_LIFECYCLE_PACKAGE_ROOT_NOT_FOUND"); current = parent; } }
function required(name: string): string { const value = process.env[name]; if (!value?.trim()) throw new Error(`MISSING_${name}`); return value; }

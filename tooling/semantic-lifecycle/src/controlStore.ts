import type { ChangeScopeSnapshot, MachineProofReceipt, ReviewDecision, SemanticDeltaAssessment } from "./model.js";

export type ImmutablePutResult = "CREATED" | "IDEMPOTENT";

export interface LifecycleControlStore {
  putScope(snapshot: ChangeScopeSnapshot): ImmutablePutResult;
  getScope(caseId: string): ChangeScopeSnapshot | undefined;
  putAssessment(assessment: SemanticDeltaAssessment): ImmutablePutResult;
  getAssessment(assessmentId: string): SemanticDeltaAssessment | undefined;
  putMachineProof(receipt: MachineProofReceipt): ImmutablePutResult;
  getMachineProof(receiptId: string): MachineProofReceipt | undefined;
  putReviewDecision(decision: ReviewDecision): ImmutablePutResult;
  getReviewDecision(reviewId: string): ReviewDecision | undefined;
}

type Stored<T> = Readonly<{ canonical: string; value: T }>;

export class InMemoryLifecycleControlStore implements LifecycleControlStore {
  readonly #scopes = new Map<string, Stored<ChangeScopeSnapshot>>();
  readonly #assessments = new Map<string, Stored<SemanticDeltaAssessment>>();
  readonly #proofs = new Map<string, Stored<MachineProofReceipt>>();
  readonly #reviews = new Map<string, Stored<ReviewDecision>>();

  putScope(snapshot: ChangeScopeSnapshot): ImmutablePutResult {
    return putImmutable(this.#scopes, requireId(snapshot.caseId, "caseId"), snapshot, "ChangeScopeSnapshot");
  }

  getScope(caseId: string): ChangeScopeSnapshot | undefined {
    return this.#scopes.get(caseId)?.value;
  }

  putAssessment(assessment: SemanticDeltaAssessment): ImmutablePutResult {
    return putImmutable(
      this.#assessments,
      requireId(assessment.assessmentId, "assessmentId"),
      assessment,
      "SemanticDeltaAssessment"
    );
  }

  getAssessment(assessmentId: string): SemanticDeltaAssessment | undefined {
    return this.#assessments.get(assessmentId)?.value;
  }

  putMachineProof(receipt: MachineProofReceipt): ImmutablePutResult {
    return putImmutable(
      this.#proofs,
      requireId(receipt.receiptId, "receiptId"),
      receipt,
      "MachineProofReceipt"
    );
  }

  getMachineProof(receiptId: string): MachineProofReceipt | undefined {
    return this.#proofs.get(receiptId)?.value;
  }

  putReviewDecision(decision: ReviewDecision): ImmutablePutResult {
    return putImmutable(
      this.#reviews,
      requireId(decision.reviewId, "reviewId"),
      decision,
      "ReviewDecision"
    );
  }

  getReviewDecision(reviewId: string): ReviewDecision | undefined {
    return this.#reviews.get(reviewId)?.value;
  }
}

function putImmutable<T>(
  target: Map<string, Stored<T>>,
  id: string,
  value: T,
  recordType: string
): ImmutablePutResult {
  const frozen = deepFreeze(cloneJson(value));
  const canonical = canonicalJson(frozen);
  const existing = target.get(id);
  if (existing === undefined) {
    target.set(id, Object.freeze({ canonical, value: frozen }));
    return "CREATED";
  }
  if (existing.canonical === canonical) return "IDEMPOTENT";
  throw new Error(`IMMUTABLE_RECORD_CONFLICT:${recordType}:${id}`);
}

function requireId(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`INVALID_CONTROL_ID:${field}`);
  }
  return value;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(",")}}`;
}

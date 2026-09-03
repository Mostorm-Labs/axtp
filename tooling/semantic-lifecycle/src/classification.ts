import type {
  EvidenceRef,
  SemanticDeltaDimension,
  SemanticDeltaDisposition,
  SemanticDeltaObservation
} from "./model.js";

export const SEMANTIC_DELTA_DIMENSIONS = Object.freeze([
  "RESOURCE_EXISTENCE",
  "RESOURCE_IDENTITY",
  "LIFETIME",
  "STATE_OWNERSHIP",
  "FIELD_MEANING",
  "DEFAULT_EMPTY_SEMANTICS",
  "READ_WRITE_SEMANTICS",
  "DERIVED_STATE",
  "OPERATION_SEMANTICS",
  "OPERATION_KIND_MODE",
  "LIFECYCLE_SEMANTICS",
  "OPERATION_LEGALITY",
  "INVARIANTS",
  "COMPATIBILITY_MEANING",
  "SEMANTIC_PROTOCOL_BINDING"
] as const satisfies readonly SemanticDeltaDimension[]);

const dimensionSet = new Set<string>(SEMANTIC_DELTA_DIMENSIONS);

type CanonicalObservation = Readonly<{
  dimension: SemanticDeltaDimension;
  state: SemanticDeltaObservation["state"];
  evidenceRefs: readonly EvidenceRef[];
}>;

export interface SemanticDeltaClassificationResult {
  readonly disposition: SemanticDeltaDisposition;
  readonly evaluatedDimensions: readonly SemanticDeltaDimension[];
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly diagnostics: readonly string[];
}

function evidenceKey(ref: EvidenceRef): string {
  return JSON.stringify([ref.refType, ref.id, ref.digest ?? null]);
}

function isValidEvidenceRef(value: unknown): value is EvidenceRef {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.refType === "EVIDENCE" &&
    typeof candidate.id === "string" &&
    candidate.id.trim().length > 0 &&
    (candidate.digest === undefined ||
      (typeof candidate.digest === "string" && candidate.digest.trim().length > 0))
  );
}

function uniqueSortedEvidence(refs: readonly EvidenceRef[]): readonly EvidenceRef[] {
  const byKey = new Map<string, EvidenceRef>();
  for (const ref of refs) {
    if (isValidEvidenceRef(ref)) byKey.set(evidenceKey(ref), Object.freeze({ ...ref }));
  }
  return Object.freeze([...byKey.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, ref]) => ref));
}

export function classifySemanticDelta(
  observations: readonly SemanticDeltaObservation[]
): SemanticDeltaClassificationResult {
  const diagnostics: string[] = [];
  const grouped = new Map<SemanticDeltaDimension, CanonicalObservation[]>();
  let invalidDimension = false;
  let invalidEvidence = false;

  for (const raw of observations as readonly unknown[]) {
    if (typeof raw !== "object" || raw === null) {
      diagnostics.push("INVALID_OBSERVATION");
      invalidDimension = true;
      continue;
    }
    const observation = raw as Record<string, unknown>;
    if (typeof observation.dimension !== "string" || !dimensionSet.has(observation.dimension)) {
      diagnostics.push(`INVALID_DIMENSION:${String(observation.dimension)}`);
      invalidDimension = true;
      continue;
    }
    if (observation.state !== "CHANGED" && observation.state !== "UNCHANGED" && observation.state !== "UNKNOWN") {
      diagnostics.push(`INVALID_STATE:${observation.dimension}:${String(observation.state)}`);
      invalidDimension = true;
      continue;
    }
    const rawEvidenceRefs = Array.isArray(observation.evidenceRefs)
      ? observation.evidenceRefs
      : [];
    if (!Array.isArray(observation.evidenceRefs) || rawEvidenceRefs.some((ref) => !isValidEvidenceRef(ref))) {
      diagnostics.push(`INVALID_EVIDENCE_REF:${observation.dimension}`);
      invalidEvidence = true;
    }
    const evidenceRefs = uniqueSortedEvidence(rawEvidenceRefs as EvidenceRef[]);
    const canonical: CanonicalObservation = Object.freeze({
      dimension: observation.dimension as SemanticDeltaDimension,
      state: observation.state,
      evidenceRefs
    });
    const current = grouped.get(canonical.dimension) ?? [];
    current.push(canonical);
    grouped.set(canonical.dimension, current);
  }

  let hasConflict = false;
  const canonicalByDimension = new Map<SemanticDeltaDimension, CanonicalObservation>();
  for (const dimension of SEMANTIC_DELTA_DIMENSIONS) {
    const group = grouped.get(dimension) ?? [];
    if (group.length === 0) continue;
    const states = new Set(group.map((item) => item.state));
    if (states.size > 1) {
      diagnostics.push(`CONFLICTING_OBSERVATIONS:${dimension}`);
      hasConflict = true;
      continue;
    }
    canonicalByDimension.set(
      dimension,
      Object.freeze({
        dimension,
        state: group[0].state,
        evidenceRefs: uniqueSortedEvidence(group.flatMap((item) => item.evidenceRefs))
      })
    );
  }

  const evaluatedDimensions = Object.freeze(
    SEMANTIC_DELTA_DIMENSIONS.filter((dimension) => canonicalByDimension.has(dimension))
  );

  const allEvidence = uniqueSortedEvidence(
    [...canonicalByDimension.values()].flatMap((item) => item.evidenceRefs)
  );

  if (invalidDimension || invalidEvidence || hasConflict) {
    return freezeResult("UNRESOLVED", evaluatedDimensions, allEvidence, diagnostics);
  }

  const provenChanged = [...canonicalByDimension.values()].filter(
    (item) => item.state === "CHANGED" && item.evidenceRefs.length > 0
  );

  for (const dimension of SEMANTIC_DELTA_DIMENSIONS) {
    const item = canonicalByDimension.get(dimension);
    if (item?.state === "UNKNOWN") diagnostics.push(`UNKNOWN:${dimension}`);
    if (item && item.evidenceRefs.length === 0) diagnostics.push(`MISSING_EVIDENCE:${dimension}:${item.state}`);
    if (!item) diagnostics.push(`MISSING_COVERAGE:${dimension}`);
  }

  if (provenChanged.length > 0) {
    return freezeResult("SEMANTIC_DELTA", evaluatedDimensions, allEvidence, diagnostics);
  }

  if (diagnostics.length > 0) {
    return freezeResult("UNRESOLVED", evaluatedDimensions, allEvidence, diagnostics);
  }

  return freezeResult("NO_SEMANTIC_DELTA", evaluatedDimensions, allEvidence, diagnostics);
}

function freezeResult(
  disposition: SemanticDeltaDisposition,
  evaluatedDimensions: readonly SemanticDeltaDimension[],
  evidenceRefs: readonly EvidenceRef[],
  diagnostics: readonly string[]
): SemanticDeltaClassificationResult {
  return Object.freeze({
    disposition,
    evaluatedDimensions: Object.freeze([...evaluatedDimensions]),
    evidenceRefs: Object.freeze([...evidenceRefs]),
    diagnostics: Object.freeze([...diagnostics].sort())
  });
}

// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeBoundExistingMachineProofReceipt, normalizeBoundExistingReconstructionCase, normalizeHumanReviewDecisionV2, normalizeSemanticCandidateRecordV2, normalizeSemanticAuthorityRecordV2 } from "./model.js";

const fixture = JSON.parse(readFileSync("fixtures/bound-existing/compatibility-cases.json", "utf8"));

test("legacy v1 records stay SEMANTIC_FIRST and cannot become BOUND_EXISTING", () => {
  for (const entry of fixture.filter((value) => value.expectedRoute === "SEMANTIC_FIRST")) {
    assert.equal(entry.value.schemaVersion, undefined, entry.id);
    assert.equal(entry.value.route, undefined, entry.id);
  }
});

test("BOUND_EXISTING candidate provenance is route-bound and excludes synthetic assessment", () => {
  const valid = fixture.find((value) => value.id === "bound-candidate");
  const normalized = normalizeSemanticCandidateRecordV2(valid.value);
  assert.equal(normalized.route, "BOUND_EXISTING");
  assert.equal(normalized.reconstructionCaseId, "case:bound");
  assert.ok(normalized.basisSelectionRef);
  assert.equal("assessmentId" in normalized, false);

  const synthetic = fixture.find((value) => value.id === "bound-candidate-synthetic-assessment");
  assert.throws(() => normalizeSemanticCandidateRecordV2(synthetic.value), /BOUND_EXISTING_SYNTHETIC_SEMANTIC_FIRST/);
});

test("unknown v2 discriminators fail closed through normalization surfaces", () => {
  for (const entry of fixture.filter((value) => value.expectedError)) {
    const normalize = entry.kind === "candidateV2"
      ? normalizeSemanticCandidateRecordV2
      : entry.kind === "reviewV2"
        ? normalizeHumanReviewDecisionV2
        : entry.kind === "proof"
          ? normalizeBoundExistingMachineProofReceipt
          : entry.kind === "case"
            ? normalizeBoundExistingReconstructionCase
            : normalizeSemanticAuthorityRecordV2;
    assert.throws(() => normalize(entry.value), new RegExp(entry.expectedError), entry.id);
  }
});

test("route provenance is mutually exclusive and required lineage cannot be omitted", () => {
  for (const entry of fixture.filter((value) => value.id.includes("synthetic") || value.id.includes("no-reinterpretation") || value.id.includes("missing-candidate") || value.id.includes("incomplete"))) {
    const normalize = entry.kind === "candidateV2"
      ? normalizeSemanticCandidateRecordV2
      : entry.kind === "reviewV2"
        ? normalizeHumanReviewDecisionV2
        : entry.kind === "proof"
          ? normalizeBoundExistingMachineProofReceipt
          : entry.kind === "case"
            ? normalizeBoundExistingReconstructionCase
            : normalizeSemanticAuthorityRecordV2;
    assert.throws(() => normalize(entry.value), new RegExp(entry.expectedError), entry.id);
  }
});

test("legacy v1 records remain accepted as their historical shapes and are never v2-bound", () => {
  const legacy = fixture.filter((value) => value.expectedRoute === "SEMANTIC_FIRST");
  assert.equal(legacy.length, 3);
  for (const entry of legacy) {
    assert.doesNotThrow(() => {
      if (entry.kind === "candidate") {
        assert.equal(entry.value.assessmentId.startsWith("assessment:"), true);
      } else if (entry.kind === "review") {
        assert.equal(entry.value.reviewKind, "SEMANTIC_CANDIDATE");
      } else {
        assert.equal(entry.value.assessmentId.startsWith("assessment:"), true);
      }
    }, entry.id);
  }
});

test("normalizers reject prototype-backed records instead of validating non-own fields", () => {
  const prototype = { schemaVersion: 2, route: "BOUND_EXISTING", candidateId: "candidate:proto", caseId: "case:proto" };
  assert.throws(() => normalizeSemanticCandidateRecordV2(Object.create(prototype)), /INVALID_RECORD/);
});

// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function loadFreshness() {
  return import("./freshness.js").catch(() => null);
}

const scopeA = {
  refType: "IMMUTABLE_REVISION",
  namespace: "semantic-scope",
  subject: "case-1",
  revision: "scope-a",
  digest: "sha256:scope-a"
};
const scopeB = { ...scopeA, revision: "scope-b", digest: "sha256:scope-b" };
const basisA = {
  refType: "IMMUTABLE_REVISION",
  namespace: "classification-policy",
  subject: "semantic-delta-v1",
  revision: "policy-a",
  digest: "sha256:policy-a"
};
const basisB = { ...basisA, revision: "policy-b", digest: "sha256:policy-b" };

function assessment(overrides = {}) {
  return {
    assessmentId: "assessment-1",
    caseId: "case-1",
    scopeRef: scopeA,
    classificationBasisRef: basisA,
    disposition: "NO_SEMANTIC_DELTA",
    evaluatedDimensions: [],
    evidenceRefs: [],
    ...overrides
  };
}

test("exact fresh NO_SEMANTIC_DELTA is fast-path eligible", async () => {
  const freshness = await loadFreshness();
  assert.ok(freshness, "freshness module must exist");
  assert.deepEqual(freshness.evaluateNoDeltaFastPath(assessment(), scopeA, basisA), {
    eligible: true,
    reason: "ELIGIBLE"
  });
});

test("scope expansion invalidates a prior NO_DELTA assessment", async () => {
  const freshness = await loadFreshness();
  assert.ok(freshness, "freshness module must exist");
  assert.deepEqual(freshness.evaluateNoDeltaFastPath(assessment(), scopeB, basisA), {
    eligible: false,
    reason: "STALE_SCOPE"
  });
});

test("classification-basis change invalidates a prior NO_DELTA assessment", async () => {
  const freshness = await loadFreshness();
  assert.ok(freshness, "freshness module must exist");
  assert.deepEqual(freshness.evaluateNoDeltaFastPath(assessment(), scopeA, basisB), {
    eligible: false,
    reason: "STALE_CLASSIFICATION_BASIS"
  });
});

test("non-NO_DELTA assessments can never enter the fast path", async () => {
  const freshness = await loadFreshness();
  assert.ok(freshness, "freshness module must exist");
  for (const disposition of ["SEMANTIC_DELTA", "UNRESOLVED"]) {
    assert.deepEqual(
      freshness.evaluateNoDeltaFastPath(assessment({ disposition }), scopeA, basisA),
      { eligible: false, reason: "NOT_NO_DELTA" }
    );
  }
});

test("invalid or mutable immutable-reference inputs fail closed", async () => {
  const freshness = await loadFreshness();
  assert.ok(freshness, "freshness module must exist");
  const unresolved = JSON.parse(readFileSync("fixtures/classification/unresolved-cases.json", "utf8"));
  const mutable = unresolved.find((entry) => entry.kind === "INVALID_BASIS").basisInput;
  assert.deepEqual(
    freshness.evaluateNoDeltaFastPath(assessment(), scopeA, mutable),
    { eligible: false, reason: "INVALID_IMMUTABLE_REF" }
  );
});

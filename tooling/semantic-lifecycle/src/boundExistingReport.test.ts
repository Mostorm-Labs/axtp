// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { createBoundExistingReport } from "./boundExistingReport.js";
import {
  canonicalBoundExistingSnapshot,
  digestBoundExistingSnapshot,
  evaluateBoundExistingScenario,
  type BoundExistingSnapshot
} from "./boundExistingReferenceEvaluator.js";
test("V7 report is deterministic and retains zero metrics", () => {
  const a = createBoundExistingReport({ source: "HEAD", packageRef: "pkg", metrics: { z: 0, a: 0 } });
  const b = createBoundExistingReport({ source: "HEAD", packageRef: "pkg", metrics: { a: 0, z: 0 } });
  assert.deepEqual(a, b);
});

test("reference evaluator emits canonical before/after digests and compares the executed production decision", () => {
  const before: BoundExistingSnapshot = {
    status: "OPEN",
    basisSelectionRef: { refType: "IMMUTABLE_REVISION", namespace: "bound-existing-basis-selection", subject: "case-1", revision: "a1" }
  };
  const after: BoundExistingSnapshot = {
    ...before,
    candidateRef: { refType: "IMMUTABLE_REVISION", namespace: "semantic-candidate", subject: "candidate-1", revision: "v1" },
    machineProofVerdict: "PASS",
    semanticReviewVerdict: "PASS",
    noReinterpretationVerdict: "PASS"
  };
  const result = evaluateBoundExistingScenario({
    caseId: "complete-evidence",
    before,
    after,
    production: { decision: "ELIGIBLE", stateDelta: { status: "AUTHORITY_ACCEPTED" } }
  });
  assert.equal(result.beforeDigest, digestBoundExistingSnapshot(before));
  assert.equal(result.afterDigest, digestBoundExistingSnapshot(after));
  assert.equal(result.reference.decision, "ELIGIBLE");
  assert.equal(result.divergence, false);
  assert.equal(canonicalBoundExistingSnapshot({ status: "OPEN", machineProofVerdict: undefined }), '{"status":"OPEN"}');
});

test("reference evaluator rejects production acceptance when required evidence is absent", () => {
  const snapshot: BoundExistingSnapshot = { status: "OPEN" };
  const result = evaluateBoundExistingScenario({
    caseId: "missing-evidence",
    before: snapshot,
    after: snapshot,
    production: { decision: "ELIGIBLE", stateDelta: { status: "AUTHORITY_ACCEPTED" } }
  });
  assert.equal(result.reference.decision, "REJECT");
  assert.equal(result.divergence, true);
});

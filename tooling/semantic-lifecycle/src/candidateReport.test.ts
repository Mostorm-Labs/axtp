// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function loadReport() {
  return import("./candidateReport.js").catch(() => null);
}

function probe(probeId, overrides = {}) {
  return {
    probeId,
    candidateLeakObserved: false,
    nonSemanticDeltaCandidateAccepted: false,
    candidateOverwriteAccepted: false,
    staleReviewAccepted: false,
    repairedCandidateReviewReused: false,
    machineCreatedHumanPass: false,
    unprovenHumanReviewAccepted: false,
    ...overrides
  };
}

const taskAnchor = "48aa536f3a0875350cf3c4270aa4f9f7e6ce993e";
const predecessorSemanticMerge = "8c4f930a12a964dc0be826e9e308f024efd91d8a";
const contractRef = "AXTP-SEM-LC-02-P31-v0.1@48aa536f3a0875350cf3c4270aa4f9f7e6ce993e";

function fixtureIds(name) {
  return JSON.parse(readFileSync(`fixtures/candidate/${name}`, "utf8")).map((entry) => entry.id);
}

function context(overrides = {}) {
  return {
    exactSource: {
      sourceRef: "source-sha",
      sourceTree: "source-tree",
      taskAnchor
    },
    predecessor: {
      taskId: "AXTP-SEM-LC-01",
      state: "MERGED_CLOSED",
      semanticMerge: predecessorSemanticMerge
    },
    candidateReviewContract: { packageRef: contractRef },
    candidateRefs: [
      { refType: "IMMUTABLE_REVISION", namespace: "semantic-candidate", subject: "candidate-1", revision: "candidate-v1" },
      { refType: "IMMUTABLE_REVISION", namespace: "semantic-candidate", subject: "candidate-1", revision: "candidate-v2" }
    ],
    reviewRefs: [
      { reviewId: "review:v1", candidateRevision: "candidate-v1" },
      { reviewId: "review:v2", candidateRevision: "candidate-v2" }
    ],
    fixtureCaseIds: {
      candidate: fixtureIds("candidate-cases.json"),
      review: fixtureIds("review-cases.json")
    },
    c2EvidenceManifest: ["C2-T1", "C2-T2", "C2-T3", "C2-T4", "C2-T5", "C2-T6"],
    deterministicRepeat: { enumerations: 2, byteEqual: true },
    ...overrides
  };
}

function sortedFixtureIds() {
  return {
    candidate: [...context().fixtureCaseIds.candidate].sort(),
    review: [...context().fixtureCaseIds.review].sort()
  };
}

test("candidate review report binds the frozen P31 exact-source evidence contract deterministically", async () => {
  const mod = await loadReport();
  assert.ok(mod, "candidateReport module must exist");
  const forward = mod.serializeCandidateIsolationReport(mod.buildCandidateIsolationReport(context(), [probe("b"), probe("a")]));
  const reverse = mod.serializeCandidateIsolationReport(mod.buildCandidateIsolationReport(context({
    candidateRefs: [...context().candidateRefs].reverse(),
    reviewRefs: [...context().reviewRefs].reverse(),
    fixtureCaseIds: {
      candidate: [...context().fixtureCaseIds.candidate].reverse(),
      review: [...context().fixtureCaseIds.review].reverse()
    },
    c2EvidenceManifest: [...context().c2EvidenceManifest].reverse()
  }), [probe("a"), probe("b")]));
  assert.equal(forward, reverse);
  const report = JSON.parse(forward);
  assert.equal(report.reportVersion, "sem-lc-02-candidate-review-report/v1");
  assert.deepEqual(report.exactSource, context().exactSource);
  assert.deepEqual(report.predecessor, context().predecessor);
  assert.deepEqual(report.candidateReviewContract, context().candidateReviewContract);
  assert.equal(report.fixtureCaseIds.candidate.length, 9);
  assert.equal(report.fixtureCaseIds.review.length, 9);
  assert.deepEqual(report.fixtureCaseIds, sortedFixtureIds());
  assert.deepEqual(report.c2EvidenceManifest, context().c2EvidenceManifest);
  assert.deepEqual(report.deterministicRepeat, context().deterministicRepeat);
  assert.equal(report.verdict, "PASS");
  assert.deepEqual(report.metrics, {
    candidate_leak_total: 0,
    candidate_overwrite_acceptance_total: 0,
    machine_created_human_pass_total: 0,
    non_semantic_delta_candidate_acceptance_total: 0,
    repaired_candidate_review_reuse_total: 0,
    stale_review_acceptance_total: 0,
    unproven_human_review_acceptance_total: 0
  });
});

test("any zero-tolerance violation fails the report", async () => {
  const mod = await loadReport();
  assert.ok(mod, "candidateReport module must exist");
  const report = mod.buildCandidateIsolationReport(context(), [
    probe("stale", { staleReviewAccepted: true }),
    probe("machine", { machineCreatedHumanPass: true })
  ]);
  assert.equal(report.verdict, "FAIL");
  assert.equal(report.metrics.stale_review_acceptance_total, 1);
  assert.equal(report.metrics.machine_created_human_pass_total, 1);
});

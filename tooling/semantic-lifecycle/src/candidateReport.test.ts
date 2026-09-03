// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

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

test("candidate isolation report is deterministic and zero-tolerance", async () => {
  const mod = await loadReport();
  assert.ok(mod, "candidateReport module must exist");
  const forward = mod.serializeCandidateIsolationReport(mod.buildCandidateIsolationReport([probe("b"), probe("a")]));
  const reverse = mod.serializeCandidateIsolationReport(mod.buildCandidateIsolationReport([probe("a"), probe("b")]));
  assert.equal(forward, reverse);
  const report = JSON.parse(forward);
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
  const report = mod.buildCandidateIsolationReport([
    probe("stale", { staleReviewAccepted: true }),
    probe("machine", { machineCreatedHumanPass: true })
  ]);
  assert.equal(report.verdict, "FAIL");
  assert.equal(report.metrics.stale_review_acceptance_total, 1);
  assert.equal(report.metrics.machine_created_human_pass_total, 1);
});

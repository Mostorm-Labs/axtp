// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function loadReport() {
  return import("./authorityReport.js").catch(() => null);
}

const taskAnchor = "40fa88a1d52df7e9f8251f0f7247b87f04409be0";
const packageRef = "AXTP-SEM-LC-03-P31-v0.1@40fa88a1d52df7e9f8251f0f7247b87f04409be0";

function fixtureIds(name) {
  return JSON.parse(readFileSync(`fixtures/authority/${name}`, "utf8")).map((entry) => entry.id);
}

function probe(probeId, overrides = {}) {
  return {
    probeId,
    partialAuthorityCommitObserved: false,
    staleBasisAuthorityAccepted: false,
    lostUpdateObserved: false,
    pathDerivedIdentityChangeObserved: false,
    operationIdCollisionAccepted: false,
    candidateReviewMismatchAccepted: false,
    unrelatedAuthorityKeyInterferenceObserved: false,
    ...overrides
  };
}

function context(overrides = {}) {
  return {
    exactSource: { sourceRef: "source-sha", sourceTree: "source-tree", taskAnchor },
    implementationRelease: {
      notionPageId: "3d04c57a-590c-814d-9f9a-df6bfe38bd02",
      githubComment: 5527601747
    },
    predecessor: {
      taskId: "AXTP-SEM-LC-02",
      state: "REPOSITORY_INTEGRATION_CLOSED",
      mergeCommit: taskAnchor
    },
    authorityContract: { packageRef },
    authorityRefs: [
      { refType: "IMMUTABLE_REVISION", namespace: "semantic-authority", subject: "display.settings", revision: "authority-v1" },
      { refType: "IMMUTABLE_REVISION", namespace: "semantic-authority", subject: "display.settings", revision: "authority-v2" }
    ],
    candidateRefs: [
      { refType: "IMMUTABLE_REVISION", namespace: "semantic-candidate", subject: "candidate-1", revision: "candidate-v1" },
      { refType: "IMMUTABLE_REVISION", namespace: "semantic-candidate", subject: "candidate-1", revision: "candidate-v2" }
    ],
    reviewIds: ["review:v1", "review:v2"],
    fixtureCaseIds: {
      authority: fixtureIds("authority-cases.json"),
      concurrency: fixtureIds("concurrency-cases.json")
    },
    c3EvidenceManifest: ["C3-T1", "C3-T2", "C3-T3", "C3-T4", "C3-T5", "C3-T6"],
    deterministicRepeat: { enumerations: 2, byteEqual: true },
    ...overrides
  };
}

test("authority report binds exact source, lineage, fixtures, evidence groups, and zero metrics deterministically", async () => {
  const reportModule = await loadReport();
  assert.ok(reportModule, "authorityReport module must exist");
  const forward = reportModule.serializeAuthorityReport(reportModule.buildAuthorityReport(context(), [probe("b"), probe("a")]));
  const base = context();
  const reverse = reportModule.serializeAuthorityReport(reportModule.buildAuthorityReport(context({
    authorityRefs: [...base.authorityRefs].reverse(),
    candidateRefs: [...base.candidateRefs].reverse(),
    reviewIds: [...base.reviewIds].reverse(),
    fixtureCaseIds: {
      authority: [...base.fixtureCaseIds.authority].reverse(),
      concurrency: [...base.fixtureCaseIds.concurrency].reverse()
    },
    c3EvidenceManifest: [...base.c3EvidenceManifest].reverse()
  }), [probe("a"), probe("b")]));
  assert.equal(forward, reverse);
  const report = JSON.parse(forward);
  assert.equal(report.reportVersion, "sem-lc-03-authority-report/v1");
  assert.deepEqual(report.exactSource, context().exactSource);
  assert.deepEqual(report.implementationRelease, context().implementationRelease);
  assert.deepEqual(report.predecessor, context().predecessor);
  assert.deepEqual(report.authorityContract, context().authorityContract);
  assert.equal(report.fixtureCaseIds.authority.length, 12);
  assert.equal(report.fixtureCaseIds.concurrency.length, 6);
  assert.deepEqual(report.c3EvidenceManifest, context().c3EvidenceManifest);
  assert.deepEqual(report.deterministicRepeat, { enumerations: 2, byteEqual: true });
  assert.deepEqual(report.metrics, {
    candidate_review_mismatch_acceptance_total: 0,
    lost_update_total: 0,
    operation_id_collision_acceptance_total: 0,
    partial_authority_commit_total: 0,
    path_derived_identity_change_total: 0,
    stale_basis_authority_acceptance_total: 0,
    unrelated_authority_key_interference_total: 0
  });
  assert.equal(report.verdict, "PASS");
});

test("authority report uses locale-independent ordinal ordering for non-ASCII sortable values", async () => {
  const reportModule = await loadReport();
  assert.ok(reportModule, "authorityReport module must exist");
  const base = context();
  const report = reportModule.buildAuthorityReport(context({
    reviewIds: ["z", "ä", "a"],
    authorityRefs: [
      { refType: "IMMUTABLE_REVISION", namespace: "semantic-authority", subject: "z", revision: "v1" },
      { refType: "IMMUTABLE_REVISION", namespace: "semantic-authority", subject: "ä", revision: "v1" },
      { refType: "IMMUTABLE_REVISION", namespace: "semantic-authority", subject: "a", revision: "v1" }
    ],
    candidateRefs: base.candidateRefs
  }), [probe("z"), probe("ä"), probe("a")]);
  assert.deepEqual(report.reviewIds, ["a", "z", "ä"]);
  assert.deepEqual(report.probes.map((entry) => entry.probeId), ["a", "z", "ä"]);
  assert.deepEqual(report.authorityRefs.map((entry) => entry.subject), ["a", "z", "ä"]);
});

test("every zero-tolerance Authority violation makes the report fail", async () => {
  const reportModule = await loadReport();
  assert.ok(reportModule, "authorityReport module must exist");
  const report = reportModule.buildAuthorityReport(context(), [
    probe("partial", { partialAuthorityCommitObserved: true }),
    probe("lost-update", { lostUpdateObserved: true }),
    probe("mismatch", { candidateReviewMismatchAccepted: true })
  ]);
  assert.equal(report.verdict, "FAIL");
  assert.equal(report.metrics.partial_authority_commit_total, 1);
  assert.equal(report.metrics.lost_update_total, 1);
  assert.equal(report.metrics.candidate_review_mismatch_acceptance_total, 1);
});

// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function loadReportModule() {
  return import("./semanticFirstReport.js").catch(() => null);
}

const taskAnchor = "6848ab7ec62a6b2b67ddc3f4d63474c959bb2177";
const packageRef = "AXTP-SEM-LC-04-P31-v0.1@6848ab7ec62a6b2b67ddc3f4d63474c959bb2177";

function fixtureIds(name) {
  return JSON.parse(readFileSync(`fixtures/semantic-first/${name}`, "utf8")).map((entry) => entry.id);
}

function ref(namespace, subject, revision) {
  return { refType: "IMMUTABLE_REVISION", namespace, subject, revision, digest: `sha256:${revision}` };
}

function probe(probeId, overrides = {}) {
  return {
    probeId,
    missingProtocolAuthorityBlocked: false,
    missingProtocolBindingsBlocked: false,
    machineCreatedHumanPass: false,
    projectionBasisMismatchAccepted: false,
    projectionFailureRolledBackAuthority: false,
    repairReusedReviewAccepted: false,
    retryDuplicatedAuthority: false,
    cancelMutatedAuthority: false,
    cancelRolledBackAcceptedAuthority: false,
    supersedeSameCaseAccepted: false,
    protocolMutationObserved: false,
    forbiddenSurfaceChangeObserved: false,
    ...overrides
  };
}

function context(overrides = {}) {
  return {
    exactSource: { sourceRef: "source-sha", sourceTree: "source-tree", taskAnchor },
    implementationRelease: "AXTP-SEM-LC-04-P30-v0.3",
    predecessor: {
      taskId: "AXTP-SEM-LC-03",
      state: "REPOSITORY_INTEGRATION_CLOSED",
      mergeCommit: taskAnchor
    },
    semanticFirstContract: { packageRef },
    fixtureCaseIds: {
      route: fixtureIds("route-cases.json"),
      lifecycle: fixtureIds("lifecycle-cases.json"),
      projection: fixtureIds("projection-cases.json")
    },
    authorityRefs: [
      ref("semantic-authority", "display.settings", "authority-v1"),
      ref("semantic-authority", "display.settings", "authority-v2")
    ],
    projectionBasisRefs: [
      ref("semantic-authority", "display.settings", "authority-v1"),
      ref("semantic-authority", "display.settings", "authority-v2")
    ],
    c4EvidenceManifest: ["C4-T1", "C4-T2", "C4-T3", "C4-T4", "C4-T5", "C4-T6"],
    deterministicRepeat: { enumerations: 2, byteEqual: true },
    ...overrides
  };
}

test("C4-T6 report binds exact source, fixtures, refs, evidence groups, and zero metrics deterministically", async () => {
  const module = await loadReportModule();
  assert.ok(module, "semanticFirstReport module must exist for C4-T6");
  const base = context();
  const forward = module.serializeSemanticFirstReport(module.buildSemanticFirstReport(base, [probe("z"), probe("a")]));
  const reversed = module.serializeSemanticFirstReport(module.buildSemanticFirstReport(context({
    fixtureCaseIds: {
      route: [...base.fixtureCaseIds.route].reverse(),
      lifecycle: [...base.fixtureCaseIds.lifecycle].reverse(),
      projection: [...base.fixtureCaseIds.projection].reverse()
    },
    authorityRefs: [...base.authorityRefs].reverse(),
    projectionBasisRefs: [...base.projectionBasisRefs].reverse(),
    c4EvidenceManifest: [...base.c4EvidenceManifest].reverse()
  }), [probe("a"), probe("z")]));
  assert.equal(forward, reversed);

  const report = JSON.parse(forward);
  assert.equal(report.reportVersion, "sem-lc-04-semantic-first-report/v1");
  assert.equal(report.gate, "VG-SM-04 SEMANTIC_FIRST_AUTHORITY_ROUTE");
  assert.equal(report.implementationRelease, "AXTP-SEM-LC-04-P30-v0.3");
  assert.deepEqual(report.predecessor, base.predecessor);
  assert.deepEqual(report.semanticFirstContract, base.semanticFirstContract);
  assert.deepEqual(report.fixtureCaseIds, {
    lifecycle: ["SF09", "SF10", "SF11", "SF12", "SF13", "SF14"],
    projection: ["SF05", "SF06", "SF07", "SF08"],
    route: ["SF01", "SF02", "SF03", "SF04"]
  });
  assert.deepEqual(report.c4EvidenceManifest, ["C4-T1", "C4-T2", "C4-T3", "C4-T4", "C4-T5", "C4-T6"]);
  assert.equal(Object.values(report.metrics).every((value) => value === 0), true);
  assert.equal(Object.keys(report.metrics).length, 12);
  assert.equal(report.verdict, "PASS");
});

test("every zero-tolerance SEMANTIC_FIRST violation fails the report", async () => {
  const module = await loadReportModule();
  assert.ok(module, "semanticFirstReport module must exist for C4-T6 metrics");
  const violationFields = [
    "missingProtocolAuthorityBlocked",
    "missingProtocolBindingsBlocked",
    "machineCreatedHumanPass",
    "projectionBasisMismatchAccepted",
    "projectionFailureRolledBackAuthority",
    "repairReusedReviewAccepted",
    "retryDuplicatedAuthority",
    "cancelMutatedAuthority",
    "cancelRolledBackAcceptedAuthority",
    "supersedeSameCaseAccepted",
    "protocolMutationObserved",
    "forbiddenSurfaceChangeObserved"
  ];
  for (const field of violationFields) {
    const report = module.buildSemanticFirstReport(context(), [probe(field, { [field]: true })]);
    assert.equal(report.verdict, "FAIL", field);
    assert.equal(Object.values(report.metrics).reduce((sum, value) => sum + value, 0), 1, field);
  }
});

test("C4 evidence manifest rejects duplicate groups instead of hiding them during normalization", async () => {
  const module = await loadReportModule();
  assert.ok(module, "semanticFirstReport module must exist for C4-T6 manifest validation");
  assert.throws(
    () => module.buildSemanticFirstReport(context({
      c4EvidenceManifest: ["C4-T1", "C4-T2", "C4-T3", "C4-T4", "C4-T5", "C4-T6", "C4-T6"]
    }), [probe("manifest")]),
    /INVALID_SEMANTIC_FIRST_REPORT_CONTEXT:c4EvidenceManifest/
  );
});

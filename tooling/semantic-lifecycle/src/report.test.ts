// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { InMemoryLifecycleControlStore } from "./controlStore.js";
import { SemanticLifecycleCoordinator } from "./coordinator.js";

async function loadReport() {
  return import("./report.js").catch(() => null);
}

const basisRef = {
  refType: "IMMUTABLE_REVISION",
  namespace: "classification-policy",
  subject: "semantic-delta-v1",
  revision: "policy-a",
  digest: "sha256:policy-a"
};

function fixture(name) {
  return JSON.parse(readFileSync(`fixtures/classification/${name}`, "utf8"));
}

function exactRef(caseId) {
  return {
    refType: "IMMUTABLE_REVISION",
    namespace: "semantic-scope",
    subject: caseId,
    revision: `scope:${caseId}`,
    digest: `sha256:${caseId}`
  };
}

function proofCase(entry, observations = entry.observations) {
  const coordinator = new SemanticLifecycleCoordinator(new InMemoryLifecycleControlStore());
  const scopeRef = exactRef(entry.id);
  const proof = coordinator.assess({ caseId: entry.id, scopeRef, observations }, basisRef);
  const fastPath = coordinator.evaluateFastPath(proof.assessment, scopeRef, basisRef);
  return {
    caseId: entry.id,
    semanticDimension: entry.changedDimension ?? null,
    expectedDisposition: entry.expected,
    observations,
    proof,
    fastPath
  };
}

function buildCorpus(reverse = false) {
  const semantic = fixture("semantic-delta-cases.json");
  const noDelta = fixture("no-delta-cases.json");
  const unresolved = fixture("unresolved-cases.json").filter((entry) => entry.kind === "CLASSIFICATION");
  const source = [...semantic, ...noDelta, ...unresolved];
  const ordered = reverse ? [...source].reverse() : source;
  return ordered.map((entry) => {
    const observations = reverse
      ? [...entry.observations].reverse().map((observation) => ({
          ...observation,
          evidenceRefs: [...observation.evidenceRefs].reverse()
        }))
      : entry.observations;
    return proofCase(entry, observations);
  });
}

test("classification report covers every frozen category and all hard metrics are zero", async () => {
  const reportModule = await loadReport();
  assert.ok(reportModule, "report module must exist");
  const cases = buildCorpus(false);
  const noDeltaCase = cases.find((entry) => entry.expectedDisposition === "NO_SEMANTIC_DELTA");
  const staleScope = { ...noDeltaCase.proof.assessment.scopeRef, revision: "scope:stale", digest: "sha256:stale" };
  const staleBasis = { ...basisRef, revision: "policy-b", digest: "sha256:policy-b" };
  const coordinator = new SemanticLifecycleCoordinator(new InMemoryLifecycleControlStore());
  const freshnessProbes = [
    {
      probeId: "stale-scope",
      expectedEligible: false,
      decision: coordinator.evaluateFastPath(noDeltaCase.proof.assessment, staleScope, basisRef)
    },
    {
      probeId: "stale-basis",
      expectedEligible: false,
      decision: coordinator.evaluateFastPath(noDeltaCase.proof.assessment, noDeltaCase.proof.assessment.scopeRef, staleBasis)
    }
  ];
  const report = reportModule.buildClassificationReport(cases, freshnessProbes);
  assert.equal(report.verdict, "PASS");
  assert.equal(report.coverage.coveredSemanticDeltaCategories.length, 15);
  assert.deepEqual(report.coverage.coveredSemanticDeltaCategories, report.coverage.frozenSemanticDeltaCategories);
  for (const value of Object.values(report.metrics)) assert.equal(value, 0);
});

test("canonical report bytes are invariant to case, observation, and evidence enumeration order", async () => {
  const reportModule = await loadReport();
  assert.ok(reportModule, "report module must exist");
  const left = reportModule.serializeClassificationReport(reportModule.buildClassificationReport(buildCorpus(false), []));
  const right = reportModule.serializeClassificationReport(reportModule.buildClassificationReport(buildCorpus(true), []));
  assert.equal(left, right);
});

test("report binds exact proof basis, rule IDs, digest, and actual disposition", async () => {
  const reportModule = await loadReport();
  assert.ok(reportModule, "report module must exist");
  const report = reportModule.buildClassificationReport(buildCorpus(false), []);
  const entry = report.cases.find((item) => item.semanticDimension === "RESOURCE_IDENTITY");
  assert.equal(entry.actualDisposition, "SEMANTIC_DELTA");
  assert.equal(entry.scopeRef.refType, "IMMUTABLE_REVISION");
  assert.deepEqual(entry.classificationBasisRef, basisRef);
  assert.ok(entry.ruleIds.length > 0);
  assert.match(entry.inputDigest, /^fnv1a64:/);
  assert.equal(entry.verdict, "PASS");
});

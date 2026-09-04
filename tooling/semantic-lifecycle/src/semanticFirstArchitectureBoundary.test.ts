// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function source(path, label) {
  assert.ok(existsSync(path), `${label} must exist for C4-T5`);
  return readFileSync(path, "utf8");
}

test("C4-T5 route composition stays inside accepted semantic-lifecycle ownership", async () => {
  const routeSource = source("src/semanticFirstRoute.ts", "semanticFirstRoute.ts");
  const modelSource = source("src/model.ts", "model.ts");
  const routeModule = await import("./semanticFirstRoute.js").catch(() => null);
  assert.ok(routeModule, "semanticFirstRoute module must exist for C4-T5");

  const imports = [...routeSource.matchAll(/from\s+["'](.+?)["']/g)].map((match) => match[1]).sort();
  const allowed = [
    "./authorityCommitter.js",
    "./authorityRepository.js",
    "./basis.js",
    "./candidateReviewCoordinator.js",
    "./coordinator.js",
    "./model.js"
  ];
  assert.equal(imports.every((entry) => allowed.includes(entry)), true);
  assert.doesNotMatch(routeSource, /contract\/protocol|contract\/semantic|DescriptorPipeline|sourceLoader|node:fs|GitHub|Stage30|ProtocolAdoption|BOUND_EXISTING/i);

  const caseModel = modelSource.match(/export interface SemanticChangeCase\s*\{([\s\S]*?)\n\}/);
  const basisModel = modelSource.match(/export interface SemanticAuthorityProjectionBasis\s*\{([\s\S]*?)\n\}/);
  assert.ok(caseModel, "SemanticChangeCase must exist");
  assert.ok(basisModel, "SemanticAuthorityProjectionBasis must exist");
  assert.doesNotMatch(`${caseModel[1]}\n${basisModel[1]}`, /payload|current|approved|eligible|protocolAuthority|protocolBindingsRequired/i);
  const methods = Object.getOwnPropertyNames(routeModule.SemanticFirstRoute.prototype);
  assert.equal(methods.some((name) => /protocol|projectionReview|adopt|stage|workflow/i.test(name)), false);
});

test("route control state contains refs and IDs but no Candidate payload truth", async () => {
  const routeModule = await import("./semanticFirstRoute.js").catch(() => null);
  assert.ok(routeModule, "semanticFirstRoute module must exist for C4-T5 state probe");
  const stateShape = routeModule.semanticFirstControlStateFields;
  assert.deepEqual(stateShape, [
    "acceptedAuthorityRef",
    "assessmentId",
    "caseId",
    "classificationBasisRef",
    "currentCandidateRef",
    "currentReviewId",
    "scopeRef",
    "status"
  ]);
  assert.equal(stateShape.some((field) => /payload|source|protocol|eligible|approved/i.test(field)), false);
});

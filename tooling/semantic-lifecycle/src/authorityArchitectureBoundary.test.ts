// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function source(path, label) {
  assert.ok(existsSync(path), `${label} must exist`);
  return readFileSync(path, "utf8");
}

test("Authority ownership remains outside classification, Candidate, generator, Protocol, and Stage modules", () => {
  const identity = source("src/authorityIdentity.ts", "authorityIdentity.ts");
  const repository = source("src/authorityRepository.ts", "authorityRepository.ts");
  const committer = source("src/authorityCommitter.ts", "authorityCommitter.ts");
  const coordinator = source("src/coordinator.ts", "coordinator.ts");
  const candidateStore = source("src/candidateStore.ts", "candidateStore.ts");
  const candidateCoordinator = source("src/candidateReviewCoordinator.ts", "candidateReviewCoordinator.ts");

  assert.doesNotMatch(coordinator, /commitAuthority|supersedeAuthority|SemanticAuthorityRepository/);
  assert.doesNotMatch(candidateStore, /contract\/semantic|SemanticAuthorityRecord|commitAuthority|supersedeAuthority/);
  assert.doesNotMatch(candidateCoordinator, /contract\/semantic|SemanticAuthorityRepository|commitAuthority|supersedeAuthority/);
  assert.doesNotMatch(identity, /sourceKey|Descriptor|generator|sourceLoader/);
  assert.doesNotMatch(repository, /DescriptorPipeline|sourceLoader|globalSemanticHead|mergeAuthority|autoMerge/);
  assert.doesNotMatch(`${identity}\n${repository}\n${committer}`, /ProtocolAdoption|SEMANTIC_FIRST|BOUND_EXISTING|Stage99|stage workflow/i);
});

test("Authority control records bind payload digest and path without duplicating semantic payload truth", () => {
  const model = source("src/model.ts", "model.ts");
  const match = model.match(/export interface SemanticAuthorityRecord\s*\{([\s\S]*?)\n\}/);
  assert.ok(match, "SemanticAuthorityRecord interface must exist");
  assert.match(match[1], /sourceBinding:\s*CanonicalSemanticSourceBinding/);
  assert.doesNotMatch(match[1], /\bpayload\b|\bcurrent\b|\bapproved\b|\beligible\b|branch|git/i);
});

test("Authority repository exposes per-key heads and no automatic global merge surface", async () => {
  const repositoryModule = await import("./authorityRepository.js").catch(() => null);
  assert.ok(repositoryModule, "authorityRepository module must exist");
  const names = Object.getOwnPropertyNames(repositoryModule.InMemorySemanticAuthorityRepository.prototype);
  assert.ok(names.includes("getCurrentAuthority"));
  assert.ok(names.includes("getAuthority"));
  assert.ok(names.includes("getCanonicalSource"));
  assert.ok(names.includes("publishAuthority"));
  assert.equal(names.some((name) => /global|merge|adopt|protocol|stage/i.test(name)), false);
});

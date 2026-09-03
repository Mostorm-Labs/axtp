// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function source(name) {
  return readFileSync(`src/${name}`, "utf8");
}

test("coordinator has no YAML/generator/Candidate/Authority/Protocol-adoption dependency", () => {
  const text = source("coordinator.ts");
  for (const forbidden of [
    "yaml",
    "loadSemanticSources",
    "tooling/generators/src/semantic",
    "CandidateStore",
    "AuthorityRepository",
    "AuthorityCommitter",
    "ProtocolAdoption"
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});

test("control store owns control records only", () => {
  const text = source("controlStore.ts");
  for (const forbidden of ["SemanticSource", "protocolBindings", "approved:", "eligible:", "current:"]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});

test("candidate payload ownership is isolated from canonical semantic source and generators", () => {
  assert.equal(existsSync("src/candidateStore.ts"), true, "candidateStore.ts must exist");
  const text = source("candidateStore.ts");
  for (const forbidden of ["contract/semantic", "loadSemanticSources", "tooling/generators/src/semantic", "node:fs", "from \"fs\"", "AuthorityRepository", "ProtocolAdoption"]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});

test("candidate review coordinator remains separate from classification and Authority/Protocol mutation", () => {
  assert.equal(existsSync("src/candidateReviewCoordinator.ts"), true, "candidateReviewCoordinator.ts must exist");
  const candidateText = source("candidateReviewCoordinator.ts");
  for (const forbidden of ["AuthorityRepository", "AuthorityCommitter", "ProtocolAdoption", "commitAuthority", "supersedeAuthority"]) {
    assert.equal(candidateText.includes(forbidden), false, forbidden);
  }
  const classificationText = source("coordinator.ts");
  assert.equal(classificationText.includes("CandidateReviewCoordinator"), false);
  assert.equal(classificationText.includes("SemanticCandidateStore"), false);
});

test("machine proof has no human ReviewDecision surface", () => {
  const machineProof = source("machineProof.ts");
  assert.equal(machineProof.includes("ReviewDecision"), false);
  assert.equal(machineProof.includes("createPassReview"), false);
  assert.equal(machineProof.includes("autoApprove"), false);
  assert.equal(machineProof.includes("approveCandidate"), false);
});

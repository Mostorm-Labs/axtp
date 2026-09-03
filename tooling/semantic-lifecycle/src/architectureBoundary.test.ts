// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

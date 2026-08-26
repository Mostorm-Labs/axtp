import test from "node:test";
import assert from "node:assert/strict";
import { buildRuleCoverage } from "./lib/rule-coverage.mjs";

const baseRule = {
  id: "RPC.METHOD.001",
  status: "stable",
  level: "must",
  statement: "Unknown method returns RPC_METHOD_NOT_FOUND.",
  source: { path: "specs/30-registry.md", section: "方法 Methods" },
  since: "spec/v0.0.2",
  verification: { disposition: "covered" }
};

test("rejects case references to unknown rule ids", () => {
  const result = buildRuleCoverage([baseRule], [
    { id: "rpc.method_not_found", authorityRules: ["RPC.METHOD.999"] }
  ]);
  assert.deepEqual(result.errors, [
    "case rpc.method_not_found references unknown authority rule: RPC.METHOD.999",
    "covered rule RPC.METHOD.001 has no conformance case"
  ]);
});

test("rejects stable MUST rules left uncovered", () => {
  const rule = {
    ...baseRule,
    id: "CORE.FRAME.001",
    verification: { disposition: "uncovered", reason: "missing case" }
  };
  const result = buildRuleCoverage([rule], []);
  assert.deepEqual(result.errors, [
    "stable MUST rule CORE.FRAME.001 is uncovered: missing case"
  ]);
});

test("derives bidirectional coverage from case authorityRules", () => {
  const structural = {
    ...baseRule,
    id: "CORE.FRAME.001",
    verification: {
      disposition: "structural-only",
      evidence: ["contract/protocol/axtp.protocol.yaml"]
    }
  };
  const result = buildRuleCoverage([baseRule, structural], [
    { id: "rpc.method_not_found", authorityRules: ["RPC.METHOD.001"] }
  ]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.rows, [
    {
      id: "CORE.FRAME.001",
      status: "stable",
      level: "must",
      disposition: "structural-only",
      cases: [],
      evidence: ["contract/protocol/axtp.protocol.yaml"]
    },
    {
      id: "RPC.METHOD.001",
      status: "stable",
      level: "must",
      disposition: "covered",
      cases: ["rpc.method_not_found"],
      evidence: []
    }
  ]);
});

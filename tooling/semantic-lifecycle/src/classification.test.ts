// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function loadClassification() {
  return import("./classification.js").catch(() => null);
}

function fixture(name) {
  return JSON.parse(readFileSync(`fixtures/classification/${name}`, "utf8"));
}

test("canonical Semantic Delta dimension set is complete and unique", async () => {
  const classification = await loadClassification();
  assert.ok(classification, "classification module must exist");
  assert.equal(classification.SEMANTIC_DELTA_DIMENSIONS.length, 15);
  assert.equal(new Set(classification.SEMANTIC_DELTA_DIMENSIONS).size, 15);

  const corpus = fixture("semantic-delta-cases.json").filter((entry) => entry.id.startsWith("delta-") && entry.id !== "delta-dominates-unknown");
  const covered = new Set(corpus.map((entry) => entry.changedDimension));
  assert.deepEqual([...covered].sort(), [...classification.SEMANTIC_DELTA_DIMENSIONS].sort());
});

test("every frozen Semantic Delta dimension independently classifies SEMANTIC_DELTA", async () => {
  const classification = await loadClassification();
  assert.ok(classification, "classification module must exist");
  for (const entry of fixture("semantic-delta-cases.json")) {
    const result = classification.classifySemanticDelta(entry.observations);
    assert.equal(result.disposition, entry.expected, entry.id);
  }
});

test("complete proven unchanged coverage classifies NO_SEMANTIC_DELTA", async () => {
  const classification = await loadClassification();
  assert.ok(classification, "classification module must exist");
  for (const entry of fixture("no-delta-cases.json")) {
    const result = classification.classifySemanticDelta(entry.observations);
    assert.equal(result.disposition, entry.expected, entry.id);
    assert.deepEqual(result.evaluatedDimensions, classification.SEMANTIC_DELTA_DIMENSIONS);
  }
});

test("unknown, missing coverage, conflicts, empty evidence, and unproven changes fail closed", async () => {
  const classification = await loadClassification();
  assert.ok(classification, "classification module must exist");
  for (const entry of fixture("unresolved-cases.json").filter((entry) => entry.kind === "CLASSIFICATION")) {
    const result = classification.classifySemanticDelta(entry.observations);
    assert.equal(result.disposition, "UNRESOLVED", entry.id);
    assert.ok(result.diagnostics.length > 0, entry.id);
  }
});

test("proven CHANGED dominates UNKNOWN while preserving diagnostics", async () => {
  const classification = await loadClassification();
  assert.ok(classification, "classification module must exist");
  const entry = fixture("semantic-delta-cases.json").find((item) => item.id === "delta-dominates-unknown");
  const result = classification.classifySemanticDelta(entry.observations);
  assert.equal(result.disposition, "SEMANTIC_DELTA");
  assert.ok(result.diagnostics.some((item) => item.includes("UNKNOWN")));
});

test("duplicate identical observations are canonicalized deterministically", async () => {
  const classification = await loadClassification();
  assert.ok(classification, "classification module must exist");
  const base = fixture("no-delta-cases.json")[0].observations;
  const duplicate = { ...base[0], evidenceRefs: [...base[0].evidenceRefs] };
  const result = classification.classifySemanticDelta([...base, duplicate]);
  assert.equal(result.disposition, "NO_SEMANTIC_DELTA");
  assert.deepEqual(result.evaluatedDimensions, classification.SEMANTIC_DELTA_DIMENSIONS);
});

test("any invalid EvidenceRef makes an otherwise NO_DELTA case UNRESOLVED", async () => {
  const classification = await loadClassification();
  assert.ok(classification, "classification module must exist");
  const base = structuredClone(fixture("no-delta-cases.json")[0].observations);
  base[0].evidenceRefs.push({ refType: "EVIDENCE", id: "" });
  const result = classification.classifySemanticDelta(base);
  assert.equal(result.disposition, "UNRESOLVED");
  assert.ok(result.diagnostics.some((item) => item.startsWith("INVALID_EVIDENCE_REF:")));
});

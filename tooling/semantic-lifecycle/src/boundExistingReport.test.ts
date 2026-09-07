// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { createBoundExistingReport } from "./boundExistingReport.js";
test("V7 report is deterministic and retains zero metrics", () => {
  const a = createBoundExistingReport({ source: "HEAD", packageRef: "pkg", metrics: { z: 0, a: 0 } });
  const b = createBoundExistingReport({ source: "HEAD", packageRef: "pkg", metrics: { a: 0, z: 0 } });
  assert.deepEqual(a, b);
});

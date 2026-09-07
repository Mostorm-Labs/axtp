// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
test("BOUND_EXISTING architecture has one acceptance boundary and no protocol writer", () => {
  const route = readFileSync(join(process.cwd(), "src/boundExistingRoute.ts"), "utf8");
  assert.equal(route.includes("publishAuthority"), false);
});

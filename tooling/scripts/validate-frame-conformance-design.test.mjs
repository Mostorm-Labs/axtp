import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const validator = path.join(here, "validate-frame-conformance-design.mjs");

test("A1 frame verification design is internally consistent", () => {
  const result = spawnSync(process.execPath, [validator, root], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(
    result.status,
    0,
    `frame verification validator failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
  assert.match(result.stdout, /\[OK\] A1 frame verification design:/);
});

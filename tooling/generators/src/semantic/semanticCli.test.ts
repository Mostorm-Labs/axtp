import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CLI_PATH = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));
const VALID_FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/valid/", import.meta.url));
const INVALID_FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/invalid/", import.meta.url));

function runValidateSemantic(sourceRoot: string) {
  return spawnSync(
    process.execPath,
    [CLI_PATH, "validate-semantic", "--source", sourceRoot],
    { encoding: "utf8" }
  );
}

describe("axtp-gen validate-semantic", () => {
  it("accepts a valid committed semantic source root", () => {
    const result = runValidateSemantic(VALID_FIXTURE_ROOT);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
  });

  it("fails closed with the exact structured diagnostic for the first invalid source", () => {
    const result = runValidateSemantic(INVALID_FIXTURE_ROOT);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe([
      "ERROR SEM_STRUCTURE_DOMAIN_RESOURCES_ARRAY_REQUIRED",
      "file: domain-resources-map.yaml",
      "path: /domains/0/resources",
      "category: structure",
      "message: invalid semantic source structure at /domains/0/resources: expected array"
    ].join("\n"));
  });
});

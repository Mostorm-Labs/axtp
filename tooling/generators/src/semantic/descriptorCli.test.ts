import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const CLI_PATH = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const REPO_SEMANTIC_ROOT = path.join(REPO_ROOT, "contract", "semantic");
const INVALID_REPO_SOURCE = path.join(REPO_SEMANTIC_ROOT, "__descriptor_cli_invalid__.yaml");
const roots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "axtp-semantic-cli-"));
  roots.push(root);
  return root;
}

function runCli(args: string[]) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], { encoding: "utf8" });
}

function invalidBindingYaml(): string {
  return [
    'version: "0.1"',
    "mode: BOUND_EXISTING",
    "valueTypes:",
    "  - name: BooleanValue",
    "    shape: BOOL",
    "domains:",
    "  - name: network",
    "    features: []",
    "    resources:",
    "      - name: network.ipConfig",
    "        lifetime: persistent",
    "        fields:",
    "          - name: enabled",
    "            valueType: BooleanValue",
    "            readable: true",
    "    operations:",
    "      - name: network.setIpConfig",
    "        resource: network.ipConfig",
    "        kind: MUTATION",
    "        mode: PATCH",
    "protocolBindings:",
    "  operations:",
    "    - operation: network.setIpConfig",
    "      method: network.__definitelyMissing__",
    ""
  ].join("\n");
}

afterEach(async () => {
  await rm(INVALID_REPO_SOURCE, { force: true });
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe.sequential("semantic descriptor CLI", () => {
  it("generate-semantic writes the canonical descriptor to an explicit output", async () => {
    const sourceRoot = await tempRoot();
    const outputRoot = await tempRoot();
    const outputPath = path.join(outputRoot, "semantic.json");

    const result = runCli([
      "generate-semantic",
      "--spec", REPO_ROOT,
      "--source", sourceRoot,
      "--out", outputPath
    ]);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(await readFile(outputPath, "utf8")).toBe([
      "{",
      '  "descriptorVersion": "0.1",',
      '  "sources": []',
      "}",
      ""
    ].join("\n"));
  });

  it("generate-semantic fails exact binding validation without publishing output", async () => {
    const sourceRoot = await tempRoot();
    const outputRoot = await tempRoot();
    const outputPath = path.join(outputRoot, "semantic.json");
    await writeFile(path.join(sourceRoot, "network.yaml"), invalidBindingYaml(), "utf8");

    const result = runCli([
      "generate-semantic",
      "--spec", REPO_ROOT,
      "--source", sourceRoot,
      "--out", outputPath
    ]);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Protocol method target not found: network.__definitelyMissing__"
    );
    expect(existsSync(outputPath)).toBe(false);
  });

  it("integrated generate preflights Semantic before any Protocol or staging write", async () => {
    const outputRoot = await tempRoot();
    const protocolOut = path.join(outputRoot, "protocol", "axtp.protocol.yaml");
    const stagingOut = path.join(outputRoot, "generated");

    await mkdir(REPO_SEMANTIC_ROOT, { recursive: true });
    await writeFile(INVALID_REPO_SOURCE, invalidBindingYaml(), "utf8");

    const result = runCli([
      "generate",
      "--spec", REPO_ROOT,
      "--protocol-out", protocolOut,
      "--out", stagingOut
    ]);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Protocol method target not found: network.__definitelyMissing__"
    );
    expect(existsSync(protocolOut)).toBe(false);
    expect(existsSync(stagingOut)).toBe(false);
  });
});

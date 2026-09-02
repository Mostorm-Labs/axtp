import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const SEMANTIC_ARTIFACT = path.join(REPO_ROOT, "contract", "generated", "semantic.json");
const SEMANTIC_PATH = "contract/generated/semantic.json";

async function text(relativePath: string): Promise<string> {
  return readFile(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("semantic descriptor repository integration", () => {
  it("commits the canonical empty semantic descriptor artifact", async () => {
    expect(existsSync(SEMANTIC_ARTIFACT)).toBe(true);
    if (!existsSync(SEMANTIC_ARTIFACT)) return;

    expect(await readFile(SEMANTIC_ARTIFACT, "utf8")).toBe([
      "{",
      '  "descriptorVersion": "0.1",',
      '  "sources": []',
      "}",
      ""
    ].join("\n"));
  });

  it("includes semantic.json in the single generated-drift boundary", async () => {
    const drift = await text("tooling/scripts/check-generated-drift.sh");
    expect(drift).toContain(
      'diff -u "$root/contract/generated/semantic.json" "$tmp/generated/semantic.json"'
    );
  });

  it("requires semantic.json in the release artifact contract", async () => {
    const contract = JSON.parse(
      await text("tooling/release/artifact-contract.json")
    ) as { required_paths?: string[] };

    expect(contract.required_paths).toContain(SEMANTIC_PATH);
  });

  it("covers semantic.json in the release manifest", async () => {
    const manifest = await text("tooling/release/manifest.template.yaml");
    expect(manifest).toContain(`    - ${SEMANTIC_PATH}`);
  });

  it("defines Linux macOS Windows Node 22 semantic descriptor portability evidence", async () => {
    const workflow = await text(".github/workflows/validate-conformance.yml");
    expect(workflow).toContain("semantic-descriptor-portability:");
    expect(workflow).toContain("ubuntu-latest");
    expect(workflow).toContain("macos-latest");
    expect(workflow).toContain("windows-latest");
    expect(workflow).toContain("node-version: 22");
    expect(workflow).toContain("Verify semantic descriptor canonical bytes");
  });
});

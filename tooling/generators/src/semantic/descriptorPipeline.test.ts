import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { SemanticDescriptorBundleV01 } from "./descriptorModel.js";

type DescriptorPipelineModule = {
  prepareSemanticDescriptor?: (
    specRoot: string,
    sourceRoot?: string
  ) => Promise<SemanticDescriptorBundleV01>;
};

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const roots: string[] = [];

async function pipeline(): Promise<DescriptorPipelineModule> {
  const modulePath = "./descriptorPipeline.js";
  return await import(modulePath).catch(() => ({}));
}

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "axtp-semantic-pipeline-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("semantic descriptor repository pipeline", () => {
  it("prepares the canonical empty descriptor from an empty semantic source root", async () => {
    const loaded = await pipeline();
    expect(typeof loaded.prepareSemanticDescriptor).toBe("function");

    const sourceRoot = await tempRoot();
    await expect(loaded.prepareSemanticDescriptor!(REPO_ROOT, sourceRoot)).resolves.toEqual({
      descriptorVersion: "0.1",
      sources: []
    });
  });

  it("fails exact Protocol binding validation before returning a publishable descriptor", async () => {
    const loaded = await pipeline();
    expect(typeof loaded.prepareSemanticDescriptor).toBe("function");

    const sourceRoot = await tempRoot();
    await writeFile(path.join(sourceRoot, "network.yaml"), [
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
    ].join("\n"), "utf8");

    try {
      await loaded.prepareSemanticDescriptor!(REPO_ROOT, sourceRoot);
      throw new Error("expected exact Protocol binding validation to fail");
    } catch (error) {
      const failure = error as Error & { diagnostic?: { code?: string } };
      expect(failure.message).toBe(
        "Protocol method target not found: network.__definitelyMissing__"
      );
      expect(failure.diagnostic?.code).toBe("SEM_PROTOCOL_METHOD_NOT_FOUND");
    }
  });
});

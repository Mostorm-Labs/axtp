import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadSemanticSources } from "./sourceLoader.js";

const VALID_SOURCE = `version: "0.1"
mode: BOUND_EXISTING
valueTypes:
  - name: BooleanValue
    shape: BOOL
domains:
  - name: network
    features:
      - name: network.ipConfig
        resources: [network.ipConfig]
        operations: [network.setIpConfig]
    resources:
      - name: network.ipConfig
        lifetime: persistent
        fields:
          - name: enabled
            valueType: BooleanValue
    operations:
      - name: network.setIpConfig
        resource: network.ipConfig
        kind: MUTATION
        mode: PATCH
`;

describe("loadSemanticSources", () => {
  it("discovers YAML sources recursively in stable relative-path order", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "axtp-semantic-loader-"));
    try {
      await mkdir(path.join(dir, "nested"), { recursive: true });
      await writeFile(path.join(dir, "z.yaml"), VALID_SOURCE);
      await writeFile(path.join(dir, "nested", "b.yaml"), VALID_SOURCE);
      await writeFile(path.join(dir, "nested", "a.yml"), VALID_SOURCE);
      await writeFile(path.join(dir, "nested", "ignored.txt"), VALID_SOURCE);

      const loaded = await loadSemanticSources(dir);

      expect(loaded.map((entry) => entry.relativePath)).toEqual([
        "nested/a.yml",
        "nested/b.yaml",
        "z.yaml"
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("parses each discovered YAML document into the semantic source model", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "axtp-semantic-loader-"));
    try {
      await writeFile(path.join(dir, "network.yaml"), VALID_SOURCE);

      const loaded = await loadSemanticSources(dir);

      expect(loaded).toHaveLength(1);
      expect(loaded[0].relativePath).toBe("network.yaml");
      expect(loaded[0].source.version).toBe("0.1");
      expect(loaded[0].source.mode).toBe("BOUND_EXISTING");
      expect(loaded[0].source.domains[0].name).toBe("network");
      expect(loaded[0].source.domains[0].resources[0].name).toBe("network.ipConfig");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("fails closed on malformed YAML and identifies the offending file", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "axtp-semantic-loader-"));
    try {
      await writeFile(path.join(dir, "broken.yaml"), "version: [");

      await expect(loadSemanticSources(dir)).rejects.toThrow(/broken\.yaml.*(yaml|parse|flow sequence)|(yaml|parse|flow sequence).*broken\.yaml/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

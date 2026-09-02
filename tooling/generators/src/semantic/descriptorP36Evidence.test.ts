import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { materializeSemanticDescriptor } from "./descriptorMaterializer.js";
import { resolveSemanticProtocolBindings } from "./protocolBindingResolver.js";
import { resolveSemanticSources } from "./resolver.js";
import type { SemanticSourceModel } from "./sourceModel.js";
import { loadProtocolSources } from "../sourceLoader.js";

const CLI_PATH = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const roots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "axtp-semantic-p36-"));
  roots.push(root);
  return root;
}

async function copySpecFixture(): Promise<string> {
  const root = await tempRoot();
  const specRoot = path.join(root, "spec");

  await mkdir(path.join(specRoot, "contract"), { recursive: true });
  await mkdir(path.join(specRoot, "specs"), { recursive: true });
  await mkdir(path.join(specRoot, "tooling", "generators"), { recursive: true });
  await mkdir(path.join(specRoot, "contract", "semantic"), { recursive: true });

  const { cp } = await import("node:fs/promises");
  await cp(
    path.join(REPO_ROOT, "contract", "registry"),
    path.join(specRoot, "contract", "registry"),
    { recursive: true }
  );
  await copyFile(
    path.join(REPO_ROOT, "specs", "20-core.md"),
    path.join(specRoot, "specs", "20-core.md")
  );
  await copyFile(
    path.join(REPO_ROOT, "specs", "40-codec.md"),
    path.join(specRoot, "specs", "40-codec.md")
  );
  await copyFile(
    path.join(REPO_ROOT, "tooling", "generators", "generator.yaml"),
    path.join(specRoot, "tooling", "generators", "generator.yaml")
  );
  return specRoot;
}

function runCli(args: string[]) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], { encoding: "utf8" });
}

function validBoundSemanticModel(): SemanticSourceModel {
  return {
    version: "0.1",
    mode: "BOUND_EXISTING",
    valueTypes: [
      { name: "StringValue", shape: "STRING" },
      { name: "ObjectValue", shape: "OBJECT" }
    ],
    domains: [
      {
        name: "network",
        features: [],
        resources: [
          {
            name: "network.ipConfig",
            lifetime: "persistent",
            fields: [
              { name: "interfaceId", valueType: "StringValue", readable: true },
              { name: "config", valueType: "ObjectValue", readable: true, writable: true }
            ]
          }
        ],
        operations: [
          {
            name: "semantic.network.setIpConfig",
            resource: "network.ipConfig",
            kind: "MUTATION",
            mode: "PATCH",
            inputProjection: {
              selector: ["interfaceId"],
              state: ["config"],
              methodLocal: ["applyPolicy"]
            },
            outputProjection: { state: ["config"] }
          }
        ]
      }
    ],
    protocolBindings: {
      operations: [
        {
          operation: "semantic.network.setIpConfig",
          method: "network.setIpConfig",
          request: {
            selector: [{ semanticField: "interfaceId", protocolField: "interfaceId" }],
            state: [{ semanticField: "config", protocolField: "config" }],
            methodLocal: [{ methodLocal: "applyPolicy", protocolField: "applyPolicy" }]
          },
          response: {
            state: [{ semanticField: "config", protocolField: "config" }]
          }
        }
      ]
    }
  };
}

function validBoundSemanticYaml(): string {
  return [
    'version: "0.1"',
    "mode: BOUND_EXISTING",
    "valueTypes:",
    "  - name: StringValue",
    "    shape: STRING",
    "  - name: ObjectValue",
    "    shape: OBJECT",
    "domains:",
    "  - name: network",
    "    features: []",
    "    resources:",
    "      - name: network.ipConfig",
    "        lifetime: persistent",
    "        fields:",
    "          - name: interfaceId",
    "            valueType: StringValue",
    "            readable: true",
    "          - name: config",
    "            valueType: ObjectValue",
    "            readable: true",
    "            writable: true",
    "    operations:",
    "      - name: semantic.network.setIpConfig",
    "        resource: network.ipConfig",
    "        kind: MUTATION",
    "        mode: PATCH",
    "        inputProjection:",
    "          selector: [interfaceId]",
    "          state: [config]",
    "          methodLocal: [applyPolicy]",
    "        outputProjection:",
    "          state: [config]",
    "protocolBindings:",
    "  operations:",
    "    - operation: semantic.network.setIpConfig",
    "      method: network.setIpConfig",
    "      request:",
    "        selector:",
    "          - semanticField: interfaceId",
    "            protocolField: interfaceId",
    "        state:",
    "          - semanticField: config",
    "            protocolField: config",
    "        methodLocal:",
    "          - methodLocal: applyPolicy",
    "            protocolField: applyPolicy",
    "      response:",
    "        state:",
    "          - semanticField: config",
    "            protocolField: config",
    ""
  ].join("\n");
}

function expectedBoundDescriptor(sourceKey = "network.yaml") {
  return {
    descriptorVersion: "0.1",
    sources: [
      {
        sourceKey,
        version: "0.1",
        mode: "BOUND_EXISTING",
        valueTypes: [
          { name: "ObjectValue", shape: "OBJECT" },
          { name: "StringValue", shape: "STRING" }
        ],
        domains: [
          {
            name: "network",
            features: [],
            resources: [
              {
                name: "network.ipConfig",
                lifetime: "persistent",
                identity: [],
                invariants: [],
                readModel: [],
                derivedState: [],
                fields: [
                  { name: "config", valueType: "ObjectValue", readable: true, writable: true },
                  { name: "interfaceId", valueType: "StringValue", readable: true }
                ]
              }
            ],
            operations: [
              {
                name: "semantic.network.setIpConfig",
                resource: "network.ipConfig",
                kind: "MUTATION",
                inputProjection: {
                  selector: ["interfaceId"],
                  state: ["config"],
                  methodLocal: ["applyPolicy"]
                },
                outputProjection: { state: ["config"] },
                mode: "PATCH"
              }
            ]
          }
        ],
        protocolBindings: [
          {
            operation: "semantic.network.setIpConfig",
            method: "network.setIpConfig",
            request: {
              selector: [{ semanticField: "interfaceId", protocolField: "interfaceId" }],
              state: [{ semanticField: "config", protocolField: "config" }],
              methodLocal: [{ methodLocal: "applyPolicy", protocolField: "applyPolicy" }]
            },
            response: {
              state: [{ semanticField: "config", protocolField: "config" }]
            }
          }
        ]
      }
    ]
  } as const;
}

function semanticFirstAllKindsSource(): SemanticSourceModel {
  return {
    version: "0.1",
    mode: "SEMANTIC_FIRST",
    valueTypes: [{ name: "SharedValue", shape: "STRING" }],
    domains: [
      {
        name: "example",
        features: [],
        resources: [
          {
            name: "example.resource",
            lifetime: "session",
            identity: { fields: ["value"] },
            invariants: ["value remains addressable"],
            readModel: { fields: ["value"] },
            derivedState: { fields: ["value"] },
            fields: [
              {
                name: "value",
                valueType: "SharedValue",
                required: false,
                constraints: { z: ["b", "a"], a: { z: 2, a: 1 } },
                unit: "opaque",
                defaultSemantics: { mode: "none" },
                emptySemantics: { mode: "empty" },
                readable: false,
                writable: true,
                version: "1",
                compatibility: { strategy: "exact" }
              }
            ]
          }
        ],
        operations: [
          {
            name: "example.query",
            resource: "example.resource",
            kind: "QUERY",
            outputProjection: { state: ["value"] }
          },
          {
            name: "example.mutate",
            resource: "example.resource",
            kind: "MUTATION",
            mode: "PATCH",
            inputProjection: { state: ["value"] },
            outputProjection: { state: ["value"] }
          },
          {
            name: "example.action",
            resource: "example.resource",
            kind: "ACTION",
            inputProjection: { methodLocal: ["force"] }
          },
          {
            name: "example.lifecycle",
            resource: "example.resource",
            kind: "LIFECYCLE",
            mode: "START"
          }
        ]
      }
    ]
  };
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const key of Reflect.ownKeys(object)) {
    deepFreeze((object as Record<PropertyKey, unknown>)[key], seen);
  }
  return Object.freeze(value);
}

async function snapshotDirectory(root: string): Promise<Record<string, string>> {
  const output: Record<string, string> = {};
  if (!existsSync(root)) return output;

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const relative = path.relative(root, fullPath).split(path.sep).join("/");
        output[relative] = (await readFile(fullPath)).toString("base64");
      }
    }
  }

  await walk(root);
  return output;
}

async function snapshotRepositoryOutputs(specRoot: string): Promise<Record<string, string>> {
  const output: Record<string, string> = {};
  for (const relativeRoot of [
    "contract/protocol",
    "contract/generated",
    "contract/mcp",
    "contract/test-vectors"
  ]) {
    const absolute = path.join(specRoot, ...relativeRoot.split("/"));
    const snapshot = await snapshotDirectory(absolute);
    for (const [relative, bytes] of Object.entries(snapshot)) {
      output[`${relativeRoot}/${relative}`] = bytes;
    }
  }
  return output;
}

function withoutSemanticArtifact(snapshot: Record<string, string>): Record<string, string> {
  const copy = { ...snapshot };
  delete copy["contract/generated/semantic.json"];
  return copy;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe.sequential("semantic descriptor P36 gate evidence", () => {
  it("preserves source-local identity and all four operation kinds in an exact descriptor projection", () => {
    const duplicateTypeSource: SemanticSourceModel = {
      version: "0.2",
      mode: "SEMANTIC_FIRST",
      valueTypes: [{ name: "SharedValue", shape: "STRING" }],
      domains: []
    };
    const descriptor = materializeSemanticDescriptor(resolveSemanticSources([
      { relativePath: "z/all-kinds.yaml", source: semanticFirstAllKindsSource() },
      { relativePath: "a/duplicate-type.yaml", source: duplicateTypeSource }
    ]));

    expect(descriptor.sources.map((source) => [source.sourceKey, source.valueTypes[0]?.name])).toEqual([
      ["a/duplicate-type.yaml", "SharedValue"],
      ["z/all-kinds.yaml", "SharedValue"]
    ]);
    const operations = descriptor.sources[1].domains[0].operations;
    expect(operations.map((operation) => [operation.name, operation.kind, operation.mode])).toEqual([
      ["example.action", "ACTION", undefined],
      ["example.lifecycle", "LIFECYCLE", "START"],
      ["example.mutate", "MUTATION", "PATCH"],
      ["example.query", "QUERY", undefined]
    ]);
    expect(descriptor.sources[1].protocolBindings).toEqual([]);
    expect(descriptor.sources[1].domains[0].resources[0].fields[0]).toEqual({
      name: "value",
      valueType: "SharedValue",
      required: false,
      constraints: { a: { a: 1, z: 2 }, z: ["b", "a"] },
      unit: "opaque",
      defaultSemantics: { mode: "none" },
      emptySemantics: { mode: "empty" },
      readable: false,
      writable: true,
      version: "1",
      compatibility: { strategy: "exact" }
    });
  });

  it("fails closed for the representative non-JSON metadata corpus", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const invalidValues: unknown[] = [
      BigInt(1),
      Number.NaN,
      Number.POSITIVE_INFINITY,
      undefined,
      Symbol("invalid"),
      () => "invalid",
      cyclic
    ];

    for (const invalid of invalidValues) {
      const semantic = resolveSemanticSources([
        { relativePath: "all-kinds.yaml", source: semanticFirstAllKindsSource() }
      ]);
      semantic.sources[0].domains[0].resources[0].fields[0].constraints = {
        invalid
      };
      expect(() => materializeSemanticDescriptor(semantic)).toThrow(
        /non-serializable semantic metadata/
      );
    }
  });

  it("does not mutate deeply frozen Semantic IR or Protocol inputs during validation/materialization", async () => {
    const semantic = resolveSemanticSources([
      { relativePath: "network.yaml", source: validBoundSemanticModel() }
    ]);
    const protocol = await loadProtocolSources(REPO_ROOT);
    const semanticBefore = JSON.stringify(semantic);
    const protocolBefore = JSON.stringify(protocol);

    deepFreeze(semantic);
    deepFreeze(protocol);

    expect(() => resolveSemanticProtocolBindings(semantic, protocol)).not.toThrow();
    expect(() => materializeSemanticDescriptor(semantic)).not.toThrow();
    expect(JSON.stringify(semantic)).toBe(semanticBefore);
    expect(JSON.stringify(protocol)).toBe(protocolBefore);
  });

  it("generate-semantic uses default source/output and emits an exact non-empty golden artifact", async () => {
    const specRoot = await copySpecFixture();
    const sourcePath = path.join(specRoot, "contract", "semantic", "network.yaml");
    await writeFile(sourcePath, validBoundSemanticYaml(), "utf8");

    const result = runCli(["generate-semantic", "--spec", specRoot]);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);

    const outputPath = path.join(specRoot, "contract", "generated", "semantic.json");
    expect(await readFile(outputPath, "utf8")).toBe(
      `${JSON.stringify(expectedBoundDescriptor(), null, 2)}\n`
    );
  });

  it("generate-semantic is path-independent for equivalent custom source/output roots", async () => {
    const specRoot = await copySpecFixture();
    const sourceA = await tempRoot();
    const sourceB = await tempRoot();
    const outputRoot = await tempRoot();
    await writeFile(path.join(sourceA, "network.yaml"), validBoundSemanticYaml(), "utf8");
    await writeFile(path.join(sourceB, "network.yaml"), validBoundSemanticYaml(), "utf8");

    const outputA = path.join(outputRoot, "a.json");
    const outputB = path.join(outputRoot, "b.json");
    const first = runCli([
      "generate-semantic", "--spec", specRoot, "--source", sourceA, "--out", outputA
    ]);
    const second = runCli([
      "generate-semantic", "--spec", specRoot, "--source", sourceB, "--out", outputB
    ]);

    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(await readFile(outputB)).toEqual(await readFile(outputA));
  });

  it("invalid raw Semantic input returns nonzero and preserves a pre-existing target", async () => {
    const specRoot = await copySpecFixture();
    const sourceRoot = await tempRoot();
    const outputRoot = await tempRoot();
    const outputPath = path.join(outputRoot, "semantic.json");
    await writeFile(path.join(sourceRoot, "broken.yaml"), "version: [\n", "utf8");
    await writeFile(outputPath, "sentinel-semantic-bytes\n", "utf8");

    const result = runCli([
      "generate-semantic", "--spec", specRoot, "--source", sourceRoot, "--out", outputPath
    ]);

    expect(result.status).not.toBe(0);
    expect(await readFile(outputPath, "utf8")).toBe("sentinel-semantic-bytes\n");
  });

  it("integrated generate preserves every prior output when Semantic preparation fails", async () => {
    const specRoot = await copySpecFixture();
    const baseline = runCli(["generate", "--spec", specRoot]);
    expect(baseline.status).toBe(0);
    const before = await snapshotRepositoryOutputs(specRoot);

    await writeFile(
      path.join(specRoot, "contract", "semantic", "broken.yaml"),
      "version: [\n",
      "utf8"
    );
    const failed = runCli(["generate", "--spec", specRoot]);
    expect(failed.status).not.toBe(0);
    expect(await snapshotRepositoryOutputs(specRoot)).toEqual(before);
  });

  it("integrated generate preserves every prior output when Protocol preparation fails", async () => {
    const specRoot = await copySpecFixture();
    const baseline = runCli(["generate", "--spec", specRoot]);
    expect(baseline.status).toBe(0);
    const before = await snapshotRepositoryOutputs(specRoot);

    await writeFile(
      path.join(specRoot, "contract", "registry", "core", "payload_type.yaml"),
      "payload_types: [\n",
      "utf8"
    );
    const failed = runCli(["generate", "--spec", specRoot]);
    expect(failed.status).not.toBe(0);
    expect(await snapshotRepositoryOutputs(specRoot)).toEqual(before);
  });

  it("integrated non-empty Semantic generation leaves the complete existing generated surface byte-identical", async () => {
    const specRoot = await copySpecFixture();
    const baseline = runCli(["generate", "--spec", specRoot]);
    expect(baseline.status).toBe(0);
    const emptySemantic = await readFile(
      path.join(specRoot, "contract", "generated", "semantic.json"),
      "utf8"
    );
    const before = await snapshotRepositoryOutputs(specRoot);

    await writeFile(
      path.join(specRoot, "contract", "semantic", "network.yaml"),
      validBoundSemanticYaml(),
      "utf8"
    );
    const withSemantic = runCli(["generate", "--spec", specRoot]);
    expect(withSemantic.status).toBe(0);
    const after = await snapshotRepositoryOutputs(specRoot);

    expect(withoutSemanticArtifact(after)).toEqual(withoutSemanticArtifact(before));
    const semanticBytes = await readFile(
      path.join(specRoot, "contract", "generated", "semantic.json"),
      "utf8"
    );
    expect(semanticBytes).toBe(`${JSON.stringify(expectedBoundDescriptor(), null, 2)}\n`);
    expect(semanticBytes).not.toBe(emptySemantic);
  });

  it("integrated staged generation publishes semantic.json in the staging directory", async () => {
    const specRoot = await copySpecFixture();
    const outputRoot = await tempRoot();
    const protocolOut = path.join(outputRoot, "protocol", "axtp.protocol.yaml");
    const staging = path.join(outputRoot, "generated");

    const result = runCli([
      "generate", "--spec", specRoot, "--protocol-out", protocolOut, "--out", staging
    ]);
    expect(result.status).toBe(0);
    expect(existsSync(path.join(staging, "semantic.json"))).toBe(true);
    expect(await readFile(path.join(staging, "semantic.json"), "utf8")).toBe([
      "{",
      '  "descriptorVersion": "0.1",',
      '  "sources": []',
      "}",
      ""
    ].join("\n"));
  });
});

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emitProtocolDocs } from "../emitters/index.js";
import {
  buildProtocolDefinition,
  buildProtocolDefinitionRaw,
  writeProtocolDefinition
} from "../protocolBuilder.js";
import { loadProtocolSources } from "../sourceLoader.js";
import type { SemanticSourceModel } from "./sourceModel.js";
import { resolveSemanticSources } from "./resolver.js";
import { resolveSemanticProtocolBindings } from "./protocolBindingResolver.js";
import { composeEffectiveProtocolSource } from "./protocolSourceComposer.js";

const repoRoot = path.resolve("../..");

function networkIpConfigSemanticSource(): SemanticSourceModel {
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
            outputProjection: {
              state: ["config"]
            }
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

async function readUtf8(file: string): Promise<string> {
  return readFile(file, "utf8");
}

describe("Semantic binding Protocol compatibility", () => {
  it("keeps ProtocolBuilder raw output deeply and deterministically identical for a real non-empty binding delta", async () => {
    const base = await loadProtocolSources(repoRoot);
    const semantic = resolveSemanticSources([
      {
        relativePath: "semantic/network-ip-config.yaml",
        source: networkIpConfigSemanticSource()
      }
    ]);
    const delta = resolveSemanticProtocolBindings(semantic, base);
    expect(delta.operationBindings).toHaveLength(1);

    const effective = composeEffectiveProtocolSource(base, delta);
    const baseRaw = buildProtocolDefinitionRaw(base);
    const effectiveRaw = buildProtocolDefinitionRaw(effective);

    expect(effectiveRaw).toEqual(baseRaw);
    expect(JSON.stringify(effectiveRaw)).toBe(JSON.stringify(baseRaw));
  });

  it("emits byte-identical Protocol YAML, JSON, and Markdown for a real non-empty binding delta", async () => {
    const base = await loadProtocolSources(repoRoot);
    const semantic = resolveSemanticSources([
      {
        relativePath: "semantic/network-ip-config.yaml",
        source: networkIpConfigSemanticSource()
      }
    ]);
    const delta = resolveSemanticProtocolBindings(semantic, base);
    expect(delta.operationBindings).toHaveLength(1);
    const effective = composeEffectiveProtocolSource(base, delta);

    const baseDir = await mkdtemp(path.join(os.tmpdir(), "axtp-srl-a3-base-"));
    const effectiveDir = await mkdtemp(path.join(os.tmpdir(), "axtp-srl-a3-effective-"));

    try {
      const baseRaw = buildProtocolDefinitionRaw(base);
      const effectiveRaw = buildProtocolDefinitionRaw(effective);
      await Promise.all([
        writeProtocolDefinition(baseRaw, path.join(baseDir, "axtp.protocol.yaml")),
        writeProtocolDefinition(effectiveRaw, path.join(effectiveDir, "axtp.protocol.yaml")),
        emitProtocolDocs(buildProtocolDefinition(base), baseDir),
        emitProtocolDocs(buildProtocolDefinition(effective), effectiveDir)
      ]);

      for (const artifact of ["axtp.protocol.yaml", "protocol.json", "protocol.md"]) {
        expect(await readUtf8(path.join(effectiveDir, artifact)))
          .toBe(await readUtf8(path.join(baseDir, artifact)));
      }
    } finally {
      await Promise.all([
        rm(baseDir, { recursive: true, force: true }),
        rm(effectiveDir, { recursive: true, force: true })
      ]);
    }
  });
});

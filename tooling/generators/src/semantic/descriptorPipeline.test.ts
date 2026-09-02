import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { Method, Schema } from "../models.js";
import type { ProtocolSourceModel } from "../sourceModel.js";
import type { SemanticDescriptorBundleV01 } from "./descriptorModel.js";
import { serializeSemanticDescriptor } from "./descriptorEmitter.js";
import { materializeSemanticDescriptor } from "./descriptorMaterializer.js";
import { resolveSemanticProtocolBindings } from "./protocolBindingResolver.js";
import { resolveSemanticSources } from "./resolver.js";
import type { LoadedSemanticSource } from "./sourceLoader.js";
import type { SemanticSourceModel } from "./sourceModel.js";

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

function boundSemanticSource(): SemanticSourceModel {
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
            name: "network.setIpConfig",
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
          operation: "network.setIpConfig",
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

function protocolMethod(wireVariant: boolean): Method {
  return {
    id: wireVariant ? 0x7f01 : 0x0e03,
    name: "network.setIpConfig",
    domain: "network",
    status: "stable",
    bitOffset: wireVariant ? 27 : 3,
    rpcOp: wireVariant ? "wire_variant_rpc" : "request_response",
    requestSchema: "NetworkSetIpConfigParams",
    responseSchema: "NetworkSetIpConfigResult",
    recommendedEncoding: wireVariant ? ["wire-variant"] : ["json", "tlv"],
    capabilities: ["network.ip"],
    events: ["network.ipConfigChanged"],
    errors: ["SUCCESS"]
  };
}

function requestSchema(wireVariant: boolean): Schema {
  return {
    name: "NetworkSetIpConfigParams",
    type: "object",
    fields: [
      { id: wireVariant ? 101 : 1, name: "interfaceId", type: "string", required: false, deprecated: false },
      { id: wireVariant ? 102 : 2, name: "config", type: "NetworkIpConfig", required: true, deprecated: false },
      { id: wireVariant ? 103 : 3, name: "applyPolicy", type: "enum", required: false, deprecated: false }
    ]
  };
}

function responseSchema(wireVariant: boolean): Schema {
  return {
    name: "NetworkSetIpConfigResult",
    type: "object",
    fields: [
      { id: wireVariant ? 201 : 1, name: "config", type: "NetworkIpConfig", required: true, deprecated: false },
      { id: wireVariant ? 202 : 2, name: "applyState", type: "enum", required: true, deprecated: false }
    ]
  };
}

function protocolSource(wireVariant: boolean): ProtocolSourceModel {
  return {
    specRoot: "/spec",
    version: {},
    config: {},
    payloadTypes: [],
    controlOpcodes: [],
    rpcEncodings: [],
    rpcBodyEncodings: [],
    rpcOps: [],
    streamProfiles: [],
    domainRegistry: [{
      highByte: wireVariant ? 0x7f : 0x0e,
      domain: "network",
      status: "stable"
    }],
    methods: [protocolMethod(wireVariant)],
    events: [],
    errors: [],
    capabilities: [],
    legacyMappings: [],
    schemas: [requestSchema(wireVariant), responseSchema(wireVariant)],
    mvpProfile: { methods: [], events: [], errors: [], capabilities: [] },
    protocolMeta: { version: "1.0.0" },
    sourceFiles: ["contract/registry/domains/network/domain.yaml"],
    profiles: []
  };
}

function resolvedBoundSemantic(): ReturnType<typeof resolveSemanticSources> {
  const loaded: LoadedSemanticSource = {
    relativePath: "semantic/network.yaml",
    source: boundSemanticSource()
  };
  return resolveSemanticSources([loaded]);
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

  it("keeps descriptor bytes identical when only Protocol wire facts change", () => {
    const baselineSemantic = resolvedBoundSemantic();
    const wireVariantSemantic = resolvedBoundSemantic();

    resolveSemanticProtocolBindings(baselineSemantic, protocolSource(false));
    resolveSemanticProtocolBindings(wireVariantSemantic, protocolSource(true));

    const baseline = serializeSemanticDescriptor(
      materializeSemanticDescriptor(baselineSemantic)
    );
    const wireVariant = serializeSemanticDescriptor(
      materializeSemanticDescriptor(wireVariantSemantic)
    );

    expect(wireVariant).toBe(baseline);
    expect(wireVariant).not.toContain("wire_variant_rpc");
    expect(wireVariant).not.toContain("wire-variant");
    expect(wireVariant).not.toContain("32513");
    expect(wireVariant).not.toContain('"id"');
    expect(wireVariant).not.toContain('"bitOffset"');
  });
});

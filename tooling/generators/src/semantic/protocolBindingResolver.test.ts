import { describe, expect, it } from "vitest";
import type { Method, Schema } from "../models.js";
import type { ProtocolSourceModel } from "../sourceModel.js";
import type { LoadedSemanticSource } from "./sourceLoader.js";
import type { SemanticSourceModel } from "./sourceModel.js";
import { resolveSemanticSources } from "./resolver.js";
import { resolveSemanticProtocolBindings } from "./protocolBindingResolver.js";

function semanticSource(mode: SemanticSourceModel["mode"] = "BOUND_EXISTING"): SemanticSourceModel {
  return {
    version: "0.1",
    mode,
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

function loaded(source = semanticSource(), relativePath = "semantic/network.yaml"): LoadedSemanticSource {
  return { relativePath, source };
}

function method(name = "network.setIpConfig", domain = "network"): Method {
  return {
    id: 0x0e03,
    name,
    domain,
    status: "stable",
    bitOffset: 3,
    rpcOp: "request_response",
    requestSchema: "NetworkSetIpConfigParams",
    responseSchema: "NetworkSetIpConfigResult",
    recommendedEncoding: ["json", "tlv"],
    capabilities: ["network.ip"],
    events: ["network.ipConfigChanged"],
    errors: ["SUCCESS"]
  };
}

function requestSchema(): Schema {
  return {
    name: "NetworkSetIpConfigParams",
    type: "object",
    fields: [
      { id: 1, name: "interfaceId", type: "string", required: false, deprecated: false },
      { id: 2, name: "config", type: "NetworkIpConfig", required: true, deprecated: false },
      { id: 3, name: "applyPolicy", type: "enum", required: false, deprecated: false }
    ]
  };
}

function responseSchema(): Schema {
  return {
    name: "NetworkSetIpConfigResult",
    type: "object",
    fields: [
      { id: 1, name: "config", type: "NetworkIpConfig", required: true, deprecated: false },
      { id: 2, name: "applyState", type: "enum", required: true, deprecated: false }
    ]
  };
}

function baseProtocol(): ProtocolSourceModel {
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
    domainRegistry: [{ highByte: 0x0e, domain: "network", status: "stable" }],
    methods: [method()],
    events: [],
    errors: [],
    capabilities: [],
    legacyMappings: [],
    schemas: [requestSchema(), responseSchema()],
    mvpProfile: { methods: [], events: [], errors: [], capabilities: [] },
    protocolMeta: { version: "1.0.0" },
    sourceFiles: ["contract/registry/domains/network/domain.yaml"],
    profiles: []
  };
}

function resolved(source = semanticSource(), relativePath = "semantic/network.yaml") {
  return resolveSemanticSources([loaded(source, relativePath)]);
}

function captureDiagnostic(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return (error as Error & { diagnostic?: unknown }).diagnostic;
  }
  throw new Error("expected binding resolution to fail");
}

function addSecondOperation(source: SemanticSourceModel): void {
  const first = source.domains[0].operations[0];
  source.domains[0].operations.push({
    ...first,
    name: "network.replaceIpConfig",
    inputProjection: {
      selector: [...(first.inputProjection?.selector ?? [])],
      state: [...(first.inputProjection?.state ?? [])],
      methodLocal: [...(first.inputProjection?.methodLocal ?? [])]
    },
    outputProjection: {
      state: [...(first.outputProjection?.state ?? [])]
    }
  });
}

function bindingFor(operation: string, protocolMethod: string) {
  return {
    operation,
    method: protocolMethod,
    request: {
      selector: [{ semanticField: "interfaceId", protocolField: "interfaceId" }],
      state: [{ semanticField: "config", protocolField: "config" }],
      methodLocal: [{ methodLocal: "applyPolicy", protocolField: "applyPolicy" }]
    },
    response: {
      state: [{ semanticField: "config", protocolField: "config" }]
    }
  };
}

describe("resolveSemanticProtocolBindings", () => {
  it("resolves exact Method, Schema, and Field object identities from BaseProtocolSourceModel", () => {
    const base = baseProtocol();
    const semantic = resolved();
    const delta = resolveSemanticProtocolBindings(semantic, base);
    const binding = delta.operationBindings[0];

    expect(delta.kind).toBe("SEMANTIC_BINDING_OVERLAY");
    expect(delta.version).toBe(1);
    expect(binding.protocolMethod).toBe(base.methods[0]);
    expect(binding.requestSchema).toBe(base.schemas[0]);
    expect(binding.responseSchema).toBe(base.schemas[1]);
    expect(binding.request[0].protocolSchema).toBe(base.schemas[0]);
    expect(binding.request[0].protocolField).toBe(base.schemas[0].fields[0]);
    expect(binding.request[1].protocolField).toBe(base.schemas[0].fields[1]);
    expect(binding.response[0].protocolField).toBe(base.schemas[1].fields[0]);
    expect(binding.semanticOperation).toBe(semantic.sources[0].domains[0].operations[0]);
  });

  it("rejects similar-but-not-exact Protocol method names", () => {
    const source = semanticSource();
    source.protocolBindings!.operations[0].method = "network.setIpConfigV2";

    expect(() => resolveSemanticProtocolBindings(resolved(source), baseProtocol()))
      .toThrow(/method|target|network\.setIpConfigV2/i);
  });

  it("rejects cross-domain binding", () => {
    const base = baseProtocol();
    base.methods[0] = method("network.setIpConfig", "display");

    expect(() => resolveSemanticProtocolBindings(resolved(), base))
      .toThrow(/domain|network|display/i);
  });

  it("rejects a Method whose request or response schema cannot be resolved", () => {
    const base = baseProtocol();
    base.schemas = [requestSchema()];

    expect(() => resolveSemanticProtocolBindings(resolved(), base))
      .toThrow(/response|schema|NetworkSetIpConfigResult/i);
  });

  it("rejects a projected request item that is not mapped", () => {
    const source = semanticSource();
    source.protocolBindings!.operations[0].request!.state = [];

    expect(() => resolveSemanticProtocolBindings(resolved(source), baseProtocol()))
      .toThrow(/request|state|config|mapped|mapping/i);
  });

  it("rejects a required Protocol request field that is not accounted for", () => {
    const source = semanticSource();
    source.domains[0].operations[0].inputProjection!.state = [];
    source.protocolBindings!.operations[0].request!.state = [];

    expect(() => resolveSemanticProtocolBindings(resolved(source), baseProtocol()))
      .toThrow(/required|config|request/i);
  });

  it("rejects a projected semantic output that is not mapped", () => {
    const source = semanticSource();
    source.protocolBindings!.operations[0].response!.state = [];

    expect(() => resolveSemanticProtocolBindings(resolved(source), baseProtocol()))
      .toThrow(/response|output|state|config|mapped|mapping/i);
  });

  it("rejects Protocol request field collisions across semantic roles", () => {
    const source = semanticSource();
    source.protocolBindings!.operations[0].request!.selector![0].protocolField = "config";

    expect(() => resolveSemanticProtocolBindings(resolved(source), baseProtocol()))
      .toThrow(/collision|duplicate|config|request/i);
  });

  it("rejects multiple semantic operations targeting one Protocol method", () => {
    const source = semanticSource();
    addSecondOperation(source);
    source.protocolBindings!.operations.push(
      bindingFor("network.replaceIpConfig", "network.setIpConfig")
    );

    expect(() => resolveSemanticProtocolBindings(resolved(source), baseProtocol()))
      .toThrow(/duplicate|multiple|method|network\.setIpConfig/i);
  });

  it("fails the entire resolution when one of multiple bindings is invalid", () => {
    const source = semanticSource();
    addSecondOperation(source);
    source.protocolBindings!.operations.push(
      bindingFor("network.replaceIpConfig", "network.missing")
    );

    expect(() => resolveSemanticProtocolBindings(resolved(source), baseProtocol()))
      .toThrow(/network\.missing|method|target/i);
  });

  it("leaves an unbound SEMANTIC_FIRST source unprojected without allocating Protocol facts", () => {
    const source = semanticSource("SEMANTIC_FIRST");
    delete source.protocolBindings;
    const base = baseProtocol();
    const beforeMethods = base.methods.length;
    const beforeSchemas = base.schemas.length;

    const delta = resolveSemanticProtocolBindings(resolved(source), base);

    expect(delta.operationBindings).toEqual([]);
    expect(base.methods).toHaveLength(beforeMethods);
    expect(base.schemas).toHaveLength(beforeSchemas);
  });

  it("canonicalizes operation binding order independently of declaration order", () => {
    const source = semanticSource();
    addSecondOperation(source);
    source.protocolBindings!.operations.push(
      bindingFor("network.replaceIpConfig", "network.replaceIpConfig")
    );
    const base = baseProtocol();
    base.methods.push({ ...method("network.replaceIpConfig"), id: 0x0e04, bitOffset: 4 });

    const forward = resolveSemanticProtocolBindings(resolved(source), base);
    source.protocolBindings!.operations.reverse();
    const reverse = resolveSemanticProtocolBindings(resolved(source), base);

    expect(forward.operationBindings.map((item) => item.semanticOperation.name)).toEqual([
      "network.replaceIpConfig",
      "network.setIpConfig"
    ]);
    expect(reverse.operationBindings.map((item) => item.semanticOperation.name)).toEqual(
      forward.operationBindings.map((item) => item.semanticOperation.name)
    );
  });

  it("emits deterministic diagnostics with semantic provenance and Protocol target identity", () => {
    const source = semanticSource();
    source.protocolBindings!.operations[0].method = "network.missing";

    const first = captureDiagnostic(() => resolveSemanticProtocolBindings(resolved(source), baseProtocol()));
    const second = captureDiagnostic(() => resolveSemanticProtocolBindings(resolved(source), baseProtocol()));

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      file: "semantic/network.yaml",
      protocolTarget: "network.missing"
    });
  });
});

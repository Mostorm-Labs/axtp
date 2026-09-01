import { describe, expect, it } from "vitest";
import type { LoadedSemanticSource } from "./sourceLoader.js";
import type {
  SemanticOperationSource,
  SemanticSourceModel
} from "./sourceModel.js";
import { resolveSemanticSources } from "./resolver.js";
import { validateSemanticSource } from "./validator.js";

type OperationWithOutputProjection = SemanticOperationSource & {
  outputProjection?: {
    state?: string[];
  };
};

type SourceWithProtocolBindings = SemanticSourceModel & {
  protocolBindings?: {
    operations: Array<{
      operation: string;
      method: string;
      request?: {
        selector?: Array<{ semanticField: string; protocolField: string }>;
        state?: Array<{ semanticField: string; protocolField: string }>;
        methodLocal?: Array<{ methodLocal: string; protocolField: string }>;
      };
      response?: {
        state?: Array<{ semanticField: string; protocolField: string }>;
      };
    }>;
  };
};

function semanticSource(): SemanticSourceModel {
  return {
    version: "0.1",
    mode: "BOUND_EXISTING",
    valueTypes: [
      { name: "BooleanValue", shape: "BOOL" },
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
            fields: [
              {
                name: "interfaceId",
                valueType: "StringValue",
                required: true,
                readable: true
              },
              {
                name: "enabled",
                valueType: "BooleanValue",
                readable: true,
                writable: true
              }
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
              state: ["enabled"],
              methodLocal: ["requestedBy"]
            }
          }
        ]
      }
    ]
  };
}

function loaded(source: SemanticSourceModel): LoadedSemanticSource {
  return {
    relativePath: "semantic/network.yaml",
    source
  };
}

function operationOf(source: SemanticSourceModel): OperationWithOutputProjection {
  return source.domains[0].operations[0] as OperationWithOutputProjection;
}

describe("semantic protocol binding source contract", () => {
  it("fails closed on malformed outputProjection structure", () => {
    const source = semanticSource();
    operationOf(source).outputProjection = 42 as never;

    expect(() => validateSemanticSource(source, { file: "semantic/network.yaml" }))
      .toThrow(/outputProjection|output projection|structure/i);
  });

  it("fails closed on malformed protocolBindings structure", () => {
    const source = semanticSource();
    (source as unknown as Record<string, unknown>).protocolBindings = {
      operations: {}
    };

    expect(() => validateSemanticSource(source, { file: "semantic/network.yaml" }))
      .toThrow(/protocolBindings|protocol bindings|structure/i);
  });

  it("rejects a binding that references a missing semantic operation", () => {
    const source = semanticSource() as SourceWithProtocolBindings;
    source.protocolBindings = {
      operations: [
        {
          operation: "network.missing",
          method: "network.setIpConfig"
        }
      ]
    };

    expect(() => validateSemanticSource(source, { file: "semantic/network.yaml" }))
      .toThrow(/binding.*operation|operation.*binding|missing/i);
  });

  it("resolves outputProjection.state to exact resolved resource fields", () => {
    const source = semanticSource();
    operationOf(source).outputProjection = { state: ["enabled"] };
    validateSemanticSource(source, { file: "semantic/network.yaml" });

    const ir = resolveSemanticSources([loaded(source)]);
    const operation = ir.sources[0].domains[0].operations[0] as typeof ir.sources[0]["domains"][0]["operations"][0] & {
      outputProjection?: { state: Array<{ name: string }> };
    };
    const enabled = ir.sources[0].domains[0].resources[0].fields[1];

    expect(operation.outputProjection?.state[0]).toBe(enabled);
  });

  it("resolves semantic-side binding references while preserving Protocol names symbolically", () => {
    const source = semanticSource() as SourceWithProtocolBindings;
    operationOf(source).outputProjection = { state: ["enabled"] };
    source.protocolBindings = {
      operations: [
        {
          operation: "network.setIpConfig",
          method: "network.setIpConfig",
          request: {
            selector: [{ semanticField: "interfaceId", protocolField: "interfaceId" }],
            state: [{ semanticField: "enabled", protocolField: "config" }],
            methodLocal: [{ methodLocal: "requestedBy", protocolField: "applyPolicy" }]
          },
          response: {
            state: [{ semanticField: "enabled", protocolField: "config" }]
          }
        }
      ]
    };
    validateSemanticSource(source, { file: "semantic/network.yaml" });

    const ir = resolveSemanticSources([loaded(source)]);
    const resolvedSource = ir.sources[0] as typeof ir.sources[0] & {
      protocolBindings?: {
        operations: Array<{
          operation: object;
          method: string;
          request: {
            state: Array<{ semanticField: object; protocolField: string }>;
          };
        }>;
      };
    };
    const binding = resolvedSource.protocolBindings?.operations[0];
    const operation = ir.sources[0].domains[0].operations[0];
    const enabled = operation.resource.fields[1];

    expect(binding?.operation).toBe(operation);
    expect(binding?.method).toBe("network.setIpConfig");
    expect(binding?.request.state[0].semanticField).toBe(enabled);
    expect(binding?.request.state[0].protocolField).toBe("config");
  });
});

import { describe, expect, it } from "vitest";
import type { LoadedSemanticSource } from "./sourceLoader.js";
import type { SemanticSourceModel } from "./sourceModel.js";
import { resolveSemanticSources } from "./resolver.js";
import { materializeSemanticDescriptor } from "./descriptorMaterializer.js";

function loaded(relativePath: string, source: SemanticSourceModel): LoadedSemanticSource {
  return { relativePath, source };
}

function auxiliarySource(): SemanticSourceModel {
  return {
    version: "0.2",
    mode: "SEMANTIC_FIRST",
    valueTypes: [],
    domains: []
  };
}

function primarySource(reverse = false): SemanticSourceModel {
  const valueTypes: SemanticSourceModel["valueTypes"] = [
    { name: "StringValue", shape: "STRING" },
    { name: "BoolValue", shape: "BOOL", nullable: true }
  ];
  const fields: SemanticSourceModel["domains"][number]["resources"][number]["fields"] = [
    { name: "interfaceId", valueType: "StringValue" },
    {
      name: "enabled",
      valueType: "BoolValue",
      required: true,
      constraints: reverse
        ? { z: [2, 1], a: { z: 2, a: 1 } }
        : { a: { a: 1, z: 2 }, z: [2, 1] },
      readable: true,
      writable: true
    }
  ];
  const features: SemanticSourceModel["domains"][number]["features"] = [
    {
      name: "z.feature",
      resources: reverse ? ["network.config"] : ["network.config"],
      operations: ["network.setConfig"]
    },
    {
      name: "a.feature",
      resources: ["network.config"],
      operations: ["network.setConfig"]
    }
  ];

  if (reverse) {
    valueTypes.reverse();
    fields.reverse();
    features.reverse();
  }

  return {
    version: "0.1",
    mode: "BOUND_EXISTING",
    valueTypes,
    domains: [
      {
        name: "network",
        features,
        resources: [
          {
            name: "network.config",
            lifetime: "persistent",
            identity: { fields: ["interfaceId"] },
            invariants: ["enabled implies configured"],
            readModel: { fields: reverse ? ["interfaceId", "enabled"] : ["enabled", "interfaceId"] },
            derivedState: { fields: ["enabled"] },
            fields
          }
        ],
        operations: [
          {
            name: "network.setConfig",
            resource: "network.config",
            kind: "MUTATION",
            mode: "PATCH",
            inputProjection: {
              selector: ["interfaceId"],
              state: ["enabled"],
              methodLocal: ["applyPolicy"]
            },
            outputProjection: { state: ["enabled"] }
          }
        ]
      }
    ],
    protocolBindings: {
      operations: [
        {
          operation: "network.setConfig",
          method: "network.setConfig",
          request: {
            selector: [{ semanticField: "interfaceId", protocolField: "interfaceId" }],
            state: [{ semanticField: "enabled", protocolField: "enabled" }],
            methodLocal: [{ methodLocal: "applyPolicy", protocolField: "applyPolicy" }]
          },
          response: {
            state: [{ semanticField: "enabled", protocolField: "enabled" }]
          }
        }
      ]
    }
  };
}

describe("semantic descriptor materializer", () => {
  it("materializes the canonical empty descriptor bundle", () => {
    expect(materializeSemanticDescriptor({ sources: [] })).toEqual({
      descriptorVersion: "0.1",
      sources: []
    });
  });

  it("projects resolved semantic truth into the complete v0.1 descriptor without Protocol wire facts", () => {
    const descriptor = materializeSemanticDescriptor(resolveSemanticSources([
      loaded("z/network.yaml", primarySource()),
      loaded("a/empty.yaml", auxiliarySource())
    ]));

    expect(descriptor).toEqual({
      descriptorVersion: "0.1",
      sources: [
        {
          sourceKey: "a/empty.yaml",
          version: "0.2",
          mode: "SEMANTIC_FIRST",
          valueTypes: [],
          domains: [],
          protocolBindings: []
        },
        {
          sourceKey: "z/network.yaml",
          version: "0.1",
          mode: "BOUND_EXISTING",
          valueTypes: [
            { name: "BoolValue", shape: "BOOL", nullable: true },
            { name: "StringValue", shape: "STRING" }
          ],
          domains: [
            {
              name: "network",
              features: [
                { name: "a.feature", resources: ["network.config"], operations: ["network.setConfig"] },
                { name: "z.feature", resources: ["network.config"], operations: ["network.setConfig"] }
              ],
              resources: [
                {
                  name: "network.config",
                  lifetime: "persistent",
                  identity: ["interfaceId"],
                  invariants: ["enabled implies configured"],
                  readModel: ["enabled", "interfaceId"],
                  derivedState: ["enabled"],
                  fields: [
                    {
                      name: "enabled",
                      valueType: "BoolValue",
                      required: true,
                      constraints: { a: { a: 1, z: 2 }, z: [2, 1] },
                      readable: true,
                      writable: true
                    },
                    { name: "interfaceId", valueType: "StringValue" }
                  ]
                }
              ],
              operations: [
                {
                  name: "network.setConfig",
                  resource: "network.config",
                  kind: "MUTATION",
                  mode: "PATCH",
                  inputProjection: {
                    selector: ["interfaceId"],
                    state: ["enabled"],
                    methodLocal: ["applyPolicy"]
                  },
                  outputProjection: { state: ["enabled"] }
                }
              ]
            }
          ],
          protocolBindings: [
            {
              operation: "network.setConfig",
              method: "network.setConfig",
              request: {
                selector: [{ semanticField: "interfaceId", protocolField: "interfaceId" }],
                state: [{ semanticField: "enabled", protocolField: "enabled" }],
                methodLocal: [{ methodLocal: "applyPolicy", protocolField: "applyPolicy" }]
              },
              response: {
                state: [{ semanticField: "enabled", protocolField: "enabled" }]
              }
            }
          ]
        }
      ]
    });

    const serialized = JSON.stringify(descriptor);
    expect(serialized).not.toContain("bitOffset");
    expect(serialized).not.toContain("rpcOp");
    expect(serialized).not.toContain("recommendedEncoding");
    expect(serialized).not.toContain("protocolMethodId");
    expect(serialized).not.toContain("protocolFieldId");

    const network = descriptor.sources[1];
    const interfaceField = network.domains[0].resources[0].fields[1];
    expect(Object.hasOwn(interfaceField, "required")).toBe(false);
    expect(Object.hasOwn(interfaceField, "nullable")).toBe(false);
    expect(Object.hasOwn(interfaceField, "readable")).toBe(false);
    expect(Object.hasOwn(interfaceField, "writable")).toBe(false);
  });

  it("is deterministic across source, collection, reference, and metadata-key ordering", () => {
    const left = materializeSemanticDescriptor(resolveSemanticSources([
      loaded("z/network.yaml", primarySource(false)),
      loaded("a/empty.yaml", auxiliarySource())
    ]));
    const right = materializeSemanticDescriptor(resolveSemanticSources([
      loaded("a/empty.yaml", auxiliarySource()),
      loaded("z/network.yaml", primarySource(true))
    ]));

    expect(JSON.stringify(right)).toBe(JSON.stringify(left));
    const constraints = right.sources[1].domains[0].resources[0].fields[0].constraints;
    expect(JSON.stringify(constraints)).toBe('{"a":{"a":1,"z":2},"z":[2,1]}');
  });
});

import { describe, expect, it } from "vitest";
import type {
  FieldShape,
  OperationKind,
  ResourceLifetime,
  SemanticSourceModel
} from "./sourceModel.js";
import { validateSemanticSource } from "./validator.js";

function baseSemanticSource(): SemanticSourceModel {
  return {
    version: "0.1",
    mode: "BOUND_EXISTING",
    valueTypes: [
      {
        name: "BooleanValue",
        shape: "BOOL"
      }
    ],
    domains: [
      {
        name: "network",
        features: [
          {
            name: "network.ipConfig",
            resources: ["network.ipConfig"],
            operations: ["network.setIpConfig"]
          }
        ],
        resources: [
          {
            name: "network.ipConfig",
            lifetime: "persistent",
            fields: [
              {
                name: "enabled",
                valueType: "BooleanValue"
              }
            ]
          }
        ],
        operations: [
          {
            name: "network.setIpConfig",
            resource: "network.ipConfig",
            kind: "MUTATION",
            mode: "PATCH"
          }
        ]
      }
    ]
  };
}

describe("validateSemanticSource", () => {
  it("accepts a valid semantic source", () => {
    expect(() => validateSemanticSource(baseSemanticSource())).not.toThrow();
  });

  it("rejects an invalid resource lifetime", () => {
    const source = baseSemanticSource();
    source.domains[0].resources[0].lifetime = "forever" as ResourceLifetime;

    expect(() => validateSemanticSource(source)).toThrow(/lifetime/i);
  });

  it("rejects an invalid field shape", () => {
    const source = baseSemanticSource();
    source.valueTypes[0].shape = "MAP" as FieldShape;

    expect(() => validateSemanticSource(source)).toThrow(/shape/i);
  });

  it("rejects duplicate resource identity", () => {
    const source = baseSemanticSource();
    source.domains[0].resources.push({ ...source.domains[0].resources[0] });

    expect(() => validateSemanticSource(source)).toThrow(/duplicate resource/i);
  });

  it("rejects duplicate resource-local field identity", () => {
    const source = baseSemanticSource();
    source.domains[0].resources[0].fields.push({
      ...source.domains[0].resources[0].fields[0]
    });

    expect(() => validateSemanticSource(source)).toThrow(/duplicate field/i);
  });

  it("rejects an unknown field valueType", () => {
    const source = baseSemanticSource();
    source.domains[0].resources[0].fields[0].valueType = "MissingType";

    expect(() => validateSemanticSource(source)).toThrow(/valueType/i);
  });

  it("rejects an invalid operation kind", () => {
    const source = baseSemanticSource();
    source.domains[0].operations[0].kind = "UPSERT" as OperationKind;

    expect(() => validateSemanticSource(source)).toThrow(/operation kind/i);
  });

  it("rejects a lifecycle mode on a mutation", () => {
    const source = baseSemanticSource();
    source.domains[0].operations[0].mode = "TRANSITION";

    expect(() => validateSemanticSource(source)).toThrow(/operation mode|mutation/i);
  });

  it("rejects a mutation mode on a query", () => {
    const source = baseSemanticSource();
    source.domains[0].operations[0].kind = "QUERY";
    source.domains[0].operations[0].mode = "PATCH";

    expect(() => validateSemanticSource(source)).toThrow(/operation mode|query/i);
  });

  it("rejects an unknown semantic source mode", () => {
    const source = baseSemanticSource();
    source.mode = "LEGACY_FIRST" as SemanticSourceModel["mode"];

    expect(() => validateSemanticSource(source)).toThrow(/source mode|semantic mode|mode/i);
  });

  it("rejects an operation that references a missing resource", () => {
    const source = baseSemanticSource();
    source.domains[0].operations[0].resource = "network.missing";

    expect(() => validateSemanticSource(source)).toThrow(/resource/i);
  });

  it("rejects a mode on an action", () => {
    const source = baseSemanticSource();
    source.domains[0].operations[0].kind = "ACTION";
    source.domains[0].operations[0].mode = "PATCH";

    expect(() => validateSemanticSource(source)).toThrow(/operation mode|action/i);
  });

  it("rejects a mutation mode on a lifecycle operation", () => {
    const source = baseSemanticSource();
    source.domains[0].operations[0].kind = "LIFECYCLE";
    source.domains[0].operations[0].mode = "PATCH";

    expect(() => validateSemanticSource(source)).toThrow(/operation mode|lifecycle/i);
  });

  it("requires a mode for mutation operations", () => {
    const source = baseSemanticSource();
    source.domains[0].operations[0].mode = undefined;

    expect(() => validateSemanticSource(source)).toThrow(/operation mode|mutation/i);
  });

  it("requires a mode for lifecycle operations", () => {
    const source = baseSemanticSource();
    source.domains[0].operations[0].kind = "LIFECYCLE";
    source.domains[0].operations[0].mode = undefined;

    expect(() => validateSemanticSource(source)).toThrow(/operation mode|lifecycle/i);
  });
});

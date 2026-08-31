import { describe, expect, it } from "vitest";
import type {
  FieldShape,
  OperationKind,
  ResourceLifetime,
  SemanticOperationSource,
  SemanticResourceSource,
  SemanticSourceModel
} from "./sourceModel.js";
import { validateSemanticSource } from "./validator.js";

type ResourceWithIdentity = SemanticResourceSource & {
  identity?: {
    fields: string[];
  };
};

type OperationWithInputProjection = SemanticOperationSource & {
  inputProjection?: {
    selector?: string[];
    state?: string[];
    methodLocal?: string[];
  };
};

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

function resourceOf(source: SemanticSourceModel): ResourceWithIdentity {
  return source.domains[0].resources[0] as ResourceWithIdentity;
}

function operationOf(source: SemanticSourceModel): OperationWithInputProjection {
  return source.domains[0].operations[0] as OperationWithInputProjection;
}

function addValidIdentity(source: SemanticSourceModel): void {
  resourceOf(source).identity = { fields: ["enabled"] };
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

  it("rejects a malformed resource identity field path", () => {
    const source = baseSemanticSource();
    resourceOf(source).identity = { fields: [""] };

    expect(() => validateSemanticSource(source)).toThrow(/resource identity|identity/i);
  });

  it("rejects a resource identity that references a missing resource field", () => {
    const source = baseSemanticSource();
    resourceOf(source).identity = { fields: ["missing"] };

    expect(() => validateSemanticSource(source)).toThrow(/identity.*field|field.*identity|resource identity/i);
  });

  it("rejects a selector projection that references a missing resource field", () => {
    const source = baseSemanticSource();
    addValidIdentity(source);
    operationOf(source).inputProjection = { selector: ["missing"] };

    expect(() => validateSemanticSource(source)).toThrow(/selector|projection|field/i);
  });

  it("rejects a state projection that references a missing resource field", () => {
    const source = baseSemanticSource();
    addValidIdentity(source);
    operationOf(source).inputProjection = { state: ["missing"] };

    expect(() => validateSemanticSource(source)).toThrow(/state|projection|field/i);
  });

  it("rejects selector and state category collision", () => {
    const source = baseSemanticSource();
    addValidIdentity(source);
    operationOf(source).inputProjection = {
      selector: ["enabled"],
      state: ["enabled"]
    };

    expect(() => validateSemanticSource(source)).toThrow(/collision|selector|state/i);
  });

  it("rejects selector and method-local category collision", () => {
    const source = baseSemanticSource();
    addValidIdentity(source);
    operationOf(source).inputProjection = {
      selector: ["enabled"],
      methodLocal: ["enabled"]
    };

    expect(() => validateSemanticSource(source)).toThrow(/collision|selector|method-local|methodLocal/i);
  });

  it("rejects state and method-local category collision", () => {
    const source = baseSemanticSource();
    addValidIdentity(source);
    operationOf(source).inputProjection = {
      state: ["enabled"],
      methodLocal: ["enabled"]
    };

    expect(() => validateSemanticSource(source)).toThrow(/collision|state|method-local|methodLocal/i);
  });
});

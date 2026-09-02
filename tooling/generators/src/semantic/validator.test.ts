import { describe, expect, it } from "vitest";
import type {
  FieldShape,
  OperationKind,
  ResourceLifetime,
  SemanticFieldSource,
  SemanticOperationSource,
  SemanticResourceSource,
  SemanticSourceModel
} from "./sourceModel.js";
import { validateSemanticSource } from "./validator.js";

type ResourceWithMetadata = SemanticResourceSource & {
  identity?: {
    fields: string[];
  };
  invariants?: unknown;
  readModel?: unknown;
  derivedState?: unknown;
};

type OperationWithInputProjection = SemanticOperationSource & {
  inputProjection?: {
    selector?: string[];
    state?: string[];
    methodLocal?: string[];
  };
};

type FieldWithMetadata = SemanticFieldSource & {
  constraints?: unknown;
  unit?: unknown;
  defaultSemantics?: unknown;
  emptySemantics?: unknown;
  readable?: unknown;
  writable?: unknown;
  version?: unknown;
  compatibility?: unknown;
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

function resourceOf(source: SemanticSourceModel): ResourceWithMetadata {
  return source.domains[0].resources[0] as ResourceWithMetadata;
}

function operationOf(source: SemanticSourceModel): OperationWithInputProjection {
  return source.domains[0].operations[0] as OperationWithInputProjection;
}

function fieldOf(source: SemanticSourceModel, index = 0): FieldWithMetadata {
  return source.domains[0].resources[0].fields[index] as FieldWithMetadata;
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

  it("accepts structurally valid resource and field metadata", () => {
    const source = baseSemanticSource();
    source.valueTypes.push({
      name: "Percentage",
      shape: "NUMBER"
    });
    resourceOf(source).fields.push(
      {
        name: "gain",
        valueType: "Percentage"
      },
      {
        name: "effectiveGain",
        valueType: "Percentage"
      }
    );
    resourceOf(source).invariants = ["gain metadata is source-defined"];
    resourceOf(source).readModel = { fields: ["gain"] };
    resourceOf(source).derivedState = { fields: ["effectiveGain"] };

    const gain = fieldOf(source, 1);
    gain.constraints = { minimum: 0, maximum: 100 };
    gain.unit = "percent";
    gain.defaultSemantics = { policy: "source-defined" };
    gain.emptySemantics = { policy: "source-defined" };
    gain.readable = true;
    gain.writable = true;
    gain.version = "0.1";
    gain.compatibility = { policy: "source-defined" };

    expect(() => validateSemanticSource(source)).not.toThrow();
  });

  it("rejects a blank resource invariant", () => {
    const source = baseSemanticSource();
    resourceOf(source).invariants = ["   "];

    expect(() => validateSemanticSource(source)).toThrow(/invariant/i);
  });

  it("rejects a read model that references a missing resource field", () => {
    const source = baseSemanticSource();
    resourceOf(source).readModel = { fields: ["missing"] };

    expect(() => validateSemanticSource(source)).toThrow(/read model|readModel|field/i);
  });

  it("rejects derived state that references a missing resource field", () => {
    const source = baseSemanticSource();
    resourceOf(source).derivedState = { fields: ["missing"] };

    expect(() => validateSemanticSource(source)).toThrow(/derived state|derivedState|field/i);
  });

  it("rejects non-object field constraints metadata", () => {
    const source = baseSemanticSource();
    fieldOf(source).constraints = 42;

    expect(() => validateSemanticSource(source)).toThrow(/constraint/i);
  });

  it("rejects a blank field unit", () => {
    const source = baseSemanticSource();
    fieldOf(source).unit = "   ";

    expect(() => validateSemanticSource(source)).toThrow(/unit/i);
  });

  it("rejects non-object default semantics metadata", () => {
    const source = baseSemanticSource();
    fieldOf(source).defaultSemantics = "literal";

    expect(() => validateSemanticSource(source)).toThrow(/default.*semantic|semantic.*default/i);
  });

  it("rejects non-object empty semantics metadata", () => {
    const source = baseSemanticSource();
    fieldOf(source).emptySemantics = null;

    expect(() => validateSemanticSource(source)).toThrow(/empty.*semantic|semantic.*empty/i);
  });

  it("rejects a non-boolean readable flag", () => {
    const source = baseSemanticSource();
    fieldOf(source).readable = "yes";

    expect(() => validateSemanticSource(source)).toThrow(/readable/i);
  });

  it("rejects a non-boolean writable flag", () => {
    const source = baseSemanticSource();
    fieldOf(source).writable = 1;

    expect(() => validateSemanticSource(source)).toThrow(/writable/i);
  });

  it("rejects a blank field version", () => {
    const source = baseSemanticSource();
    fieldOf(source).version = "";

    expect(() => validateSemanticSource(source)).toThrow(/version/i);
  });

  it("rejects non-object field compatibility metadata", () => {
    const source = baseSemanticSource();
    fieldOf(source).compatibility = "backward";

    expect(() => validateSemanticSource(source)).toThrow(/compatibility/i);
  });
});

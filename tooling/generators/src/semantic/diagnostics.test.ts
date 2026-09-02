import { describe, expect, it } from "vitest";
import type { SemanticSourceModel } from "./sourceModel.js";
import { validateSemanticSource } from "./validator.js";

interface ExpectedDiagnostic {
  file: string;
  path: string;
  category: string;
  code: string;
  message: string;
}

type ValidatorWithContext = (
  source: SemanticSourceModel,
  context?: { file: string }
) => void;

const validateWithContext = validateSemanticSource as unknown as ValidatorWithContext;
const SOURCE_FILE = "network/ip-config.semantic.yaml";

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

function captureError(source: SemanticSourceModel): Error & { diagnostic?: unknown } {
  try {
    validateWithContext(source, { file: SOURCE_FILE });
  } catch (error) {
    return error as Error & { diagnostic?: unknown };
  }

  throw new Error("expected semantic validation to fail");
}

function expectDiagnostic(
  source: SemanticSourceModel,
  expected: ExpectedDiagnostic
): void {
  const error = captureError(source);
  expect(error.diagnostic).toEqual(expected);
  expect(error.message).toBe(expected.message);
}

describe("semantic validation diagnostics", () => {
  it("emits a stable diagnostic for invalid source mode", () => {
    const source = baseSemanticSource();
    source.mode = "LEGACY_FIRST" as SemanticSourceModel["mode"];

    expectDiagnostic(source, {
      file: SOURCE_FILE,
      path: "/mode",
      category: "source",
      code: "SEM_SOURCE_MODE_INVALID",
      message: "invalid semantic source mode: LEGACY_FIRST"
    });
  });

  it("emits a stable diagnostic for an unknown field valueType", () => {
    const source = baseSemanticSource();
    source.domains[0].resources[0].fields[0].valueType = "MissingType";

    expectDiagnostic(source, {
      file: SOURCE_FILE,
      path: "/domains/0/resources/0/fields/0/valueType",
      category: "field",
      code: "SEM_FIELD_VALUE_TYPE_UNKNOWN",
      message: "unknown valueType MissingType for network.ipConfig.enabled"
    });
  });

  it("emits a stable diagnostic for an operation that references a missing resource", () => {
    const source = baseSemanticSource();
    source.domains[0].operations[0].resource = "network.missing";

    expectDiagnostic(source, {
      file: SOURCE_FILE,
      path: "/domains/0/operations/0/resource",
      category: "operation",
      code: "SEM_OPERATION_RESOURCE_MISSING",
      message: "missing resource network.missing for operation network.setIpConfig"
    });
  });

  it("emits a stable diagnostic for a projection category collision", () => {
    const source = baseSemanticSource();
    source.domains[0].operations[0].inputProjection = {
      selector: ["enabled"],
      state: ["enabled"]
    };

    expectDiagnostic(source, {
      file: SOURCE_FILE,
      path: "/domains/0/operations/0/inputProjection",
      category: "projection",
      code: "SEM_PROJECTION_CATEGORY_COLLISION",
      message:
        "projection category collision for operation network.setIpConfig: enabled appears in selector and state"
    });
  });

  it("emits a stable diagnostic for invalid field metadata", () => {
    const source = baseSemanticSource();
    const field = source.domains[0].resources[0].fields[0] as unknown as {
      constraints?: unknown;
    };
    field.constraints = 42;

    expectDiagnostic(source, {
      file: SOURCE_FILE,
      path: "/domains/0/resources/0/fields/0/constraints",
      category: "field",
      code: "SEM_FIELD_CONSTRAINTS_INVALID",
      message: "invalid constraints for network.ipConfig.enabled: expected metadata object"
    });
  });

  it("produces the same diagnostic for the same invalid source on repeated validation", () => {
    const first = baseSemanticSource();
    first.domains[0].resources[0].fields[0].valueType = "MissingType";
    const second = baseSemanticSource();
    second.domains[0].resources[0].fields[0].valueType = "MissingType";

    const firstError = captureError(first);
    const secondError = captureError(second);

    expect(firstError.diagnostic).toEqual({
      file: SOURCE_FILE,
      path: "/domains/0/resources/0/fields/0/valueType",
      category: "field",
      code: "SEM_FIELD_VALUE_TYPE_UNKNOWN",
      message: "unknown valueType MissingType for network.ipConfig.enabled"
    });
    expect(secondError.diagnostic).toEqual(firstError.diagnostic);
  });
});

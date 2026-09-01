import { describe, expect, it } from "vitest";
import type { SemanticSourceModel } from "./sourceModel.js";
import {
  validateSemanticSource,
  type SemanticDiagnostic
} from "./validator.js";

const SOURCE_FILE = "malformed.semantic.yaml";

function validRawSource(): Record<string, unknown> {
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
        features: [],
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
        operations: []
      }
    ]
  };
}

function expectStructuralDiagnostic(
  rawSource: unknown,
  expected: SemanticDiagnostic
): void {
  let caught: unknown;
  try {
    validateSemanticSource(rawSource as SemanticSourceModel, { file: SOURCE_FILE });
  } catch (error) {
    caught = error;
  }

  expect((caught as Error & { diagnostic?: SemanticDiagnostic } | undefined)?.diagnostic)
    .toEqual(expected);
}

describe("semantic raw structural fail-closed boundary", () => {
  it.each([
    {
      name: "rejects a null root as a structural diagnostic",
      source: null,
      diagnostic: {
        file: SOURCE_FILE,
        path: "/",
        category: "structure",
        code: "SEM_STRUCTURE_ROOT_OBJECT_REQUIRED",
        message: "invalid semantic source structure at /: expected object"
      }
    },
    {
      name: "rejects missing domains as a structural diagnostic",
      source: (() => {
        const source = validRawSource();
        delete source.domains;
        return source;
      })(),
      diagnostic: {
        file: SOURCE_FILE,
        path: "/domains",
        category: "structure",
        code: "SEM_STRUCTURE_DOMAINS_ARRAY_REQUIRED",
        message: "invalid semantic source structure at /domains: expected array"
      }
    },
    {
      name: "rejects non-array domains as a structural diagnostic",
      source: { ...validRawSource(), domains: {} },
      diagnostic: {
        file: SOURCE_FILE,
        path: "/domains",
        category: "structure",
        code: "SEM_STRUCTURE_DOMAINS_ARRAY_REQUIRED",
        message: "invalid semantic source structure at /domains: expected array"
      }
    },
    {
      name: "rejects a non-object domain entry as a structural diagnostic",
      source: { ...validRawSource(), domains: [null] },
      diagnostic: {
        file: SOURCE_FILE,
        path: "/domains/0",
        category: "structure",
        code: "SEM_STRUCTURE_DOMAIN_OBJECT_REQUIRED",
        message: "invalid semantic source structure at /domains/0: expected object"
      }
    },
    {
      name: "rejects a non-object resource entry as a structural diagnostic",
      source: (() => {
        const source = validRawSource();
        const domain = (source.domains as Array<Record<string, unknown>>)[0];
        domain.resources = [null];
        return source;
      })(),
      diagnostic: {
        file: SOURCE_FILE,
        path: "/domains/0/resources/0",
        category: "structure",
        code: "SEM_STRUCTURE_RESOURCE_OBJECT_REQUIRED",
        message: "invalid semantic source structure at /domains/0/resources/0: expected object"
      }
    },
    {
      name: "rejects a non-object valueType entry as a structural diagnostic",
      source: { ...validRawSource(), valueTypes: [null] },
      diagnostic: {
        file: SOURCE_FILE,
        path: "/valueTypes/0",
        category: "structure",
        code: "SEM_STRUCTURE_VALUE_TYPE_OBJECT_REQUIRED",
        message: "invalid semantic source structure at /valueTypes/0: expected object"
      }
    },
    {
      name: "rejects a non-object field entry as a structural diagnostic",
      source: (() => {
        const source = validRawSource();
        const domain = (source.domains as Array<Record<string, unknown>>)[0];
        const resource = (domain.resources as Array<Record<string, unknown>>)[0];
        resource.fields = [null];
        return source;
      })(),
      diagnostic: {
        file: SOURCE_FILE,
        path: "/domains/0/resources/0/fields/0",
        category: "structure",
        code: "SEM_STRUCTURE_FIELD_OBJECT_REQUIRED",
        message: "invalid semantic source structure at /domains/0/resources/0/fields/0: expected object"
      }
    },
    {
      name: "rejects missing operations as a structural diagnostic",
      source: (() => {
        const source = validRawSource();
        const domain = (source.domains as Array<Record<string, unknown>>)[0];
        delete domain.operations;
        return source;
      })(),
      diagnostic: {
        file: SOURCE_FILE,
        path: "/domains/0/operations",
        category: "structure",
        code: "SEM_STRUCTURE_DOMAIN_OPERATIONS_ARRAY_REQUIRED",
        message: "invalid semantic source structure at /domains/0/operations: expected array"
      }
    },
    {
      name: "rejects a non-object operation entry as a structural diagnostic",
      source: (() => {
        const source = validRawSource();
        const domain = (source.domains as Array<Record<string, unknown>>)[0];
        domain.operations = [null];
        return source;
      })(),
      diagnostic: {
        file: SOURCE_FILE,
        path: "/domains/0/operations/0",
        category: "structure",
        code: "SEM_STRUCTURE_OPERATION_OBJECT_REQUIRED",
        message: "invalid semantic source structure at /domains/0/operations/0: expected object"
      }
    }
  ])("$name", ({ source, diagnostic }) => {
    expectStructuralDiagnostic(source, diagnostic);
  });
});

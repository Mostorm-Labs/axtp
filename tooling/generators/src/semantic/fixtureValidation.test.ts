import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadSemanticSources, type LoadedSemanticSource } from "./sourceLoader.js";
import {
  validateSemanticSource,
  type SemanticDiagnostic
} from "./validator.js";

const FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/", import.meta.url));

async function loadFixture(relativePath: string): Promise<LoadedSemanticSource> {
  const loaded = await loadSemanticSources(FIXTURE_ROOT);
  const fixture = loaded.find((entry) => entry.relativePath === relativePath);
  if (fixture === undefined) {
    throw new Error(`missing semantic fixture: ${relativePath}`);
  }
  return fixture;
}

function captureDiagnostic(entry: LoadedSemanticSource): SemanticDiagnostic | undefined {
  try {
    validateSemanticSource(entry.source, { file: entry.relativePath });
  } catch (error) {
    return (error as Error & { diagnostic?: SemanticDiagnostic }).diagnostic;
  }
  return undefined;
}

describe("committed semantic fixtures", () => {
  it("discovers the committed fixture inventory in deterministic relative-path order", async () => {
    const loaded = await loadSemanticSources(FIXTURE_ROOT);

    expect(loaded.map((entry) => entry.relativePath)).toEqual([
      "invalid/domain-resources-map.yaml",
      "invalid/resource-fields-missing.yaml",
      "invalid/top-level-value-types-map.yaml",
      "valid/minimal.yaml"
    ]);
  });

  it("loads and validates the committed positive fixture through the real Loader -> Validator path", async () => {
    const fixture = await loadFixture("valid/minimal.yaml");

    expect(() =>
      validateSemanticSource(fixture.source, { file: fixture.relativePath })
    ).not.toThrow();
  });

  it.each([
    {
      file: "invalid/top-level-value-types-map.yaml",
      diagnostic: {
        file: "invalid/top-level-value-types-map.yaml",
        path: "/valueTypes",
        category: "structure",
        code: "SEM_STRUCTURE_VALUE_TYPES_ARRAY_REQUIRED",
        message: "invalid semantic source structure at /valueTypes: expected array"
      }
    },
    {
      file: "invalid/domain-resources-map.yaml",
      diagnostic: {
        file: "invalid/domain-resources-map.yaml",
        path: "/domains/0/resources",
        category: "structure",
        code: "SEM_STRUCTURE_DOMAIN_RESOURCES_ARRAY_REQUIRED",
        message: "invalid semantic source structure at /domains/0/resources: expected array"
      }
    },
    {
      file: "invalid/resource-fields-missing.yaml",
      diagnostic: {
        file: "invalid/resource-fields-missing.yaml",
        path: "/domains/0/resources/0/fields",
        category: "structure",
        code: "SEM_STRUCTURE_RESOURCE_FIELDS_ARRAY_REQUIRED",
        message: "invalid semantic source structure at /domains/0/resources/0/fields: expected array"
      }
    }
  ])("fails closed with a stable structural diagnostic for $file", async ({ file, diagnostic }) => {
    const fixture = await loadFixture(file);

    expect(captureDiagnostic(fixture)).toEqual(diagnostic);
  });
});

import { describe, expect, it } from "vitest";
import type { LoadedSemanticSource } from "./sourceLoader.js";
import type { SemanticSourceModel } from "./sourceModel.js";
import { validateSemanticSource } from "./validator.js";
import type { ResolvedSemanticIR } from "./resolvedModel.js";
import { resolveSemanticSources } from "./resolver.js";

function semanticSource(suffix = ""): SemanticSourceModel {
  const token = suffix.length > 0 ? `.${suffix}` : "";
  const valueTypeSuffix = suffix.length > 0 ? `_${suffix}` : "";
  const resourceName = `network.ipConfig${token}`;
  const operationName = `network.setIpConfig${token}`;

  return {
    version: "0.1",
    mode: "BOUND_EXISTING",
    valueTypes: [
      { name: `BooleanValue${valueTypeSuffix}`, shape: "BOOL" },
      { name: `StringValue${valueTypeSuffix}`, shape: "STRING" }
    ],
    domains: [
      {
        name: `network${token}`,
        features: [
          {
            name: `network.ipConfig${token}`,
            resources: [resourceName],
            operations: [operationName]
          }
        ],
        resources: [
          {
            name: resourceName,
            lifetime: "persistent",
            identity: { fields: ["interfaceName"] },
            invariants: ["interfaceName is the stable resource selector"],
            readModel: { fields: ["enabled"] },
            derivedState: { fields: ["effectiveEnabled"] },
            fields: [
              {
                name: "interfaceName",
                valueType: `StringValue${valueTypeSuffix}`,
                required: true,
                readable: true,
                writable: false
              },
              {
                name: "enabled",
                valueType: `BooleanValue${valueTypeSuffix}`,
                readable: true,
                writable: true,
                constraints: { semantic: "boolean" },
                version: "0.1"
              },
              {
                name: "effectiveEnabled",
                valueType: `BooleanValue${valueTypeSuffix}`,
                readable: true,
                writable: false,
                compatibility: { policy: "source-defined" }
              }
            ]
          }
        ],
        operations: [
          {
            name: operationName,
            resource: resourceName,
            kind: "MUTATION",
            mode: "PATCH",
            inputProjection: {
              selector: ["interfaceName"],
              state: ["enabled"],
              methodLocal: ["requestedBy"]
            }
          }
        ]
      }
    ]
  };
}

function loaded(relativePath: string, suffix = ""): LoadedSemanticSource {
  const source = semanticSource(suffix);
  validateSemanticSource(source, { file: relativePath });
  return { relativePath, source };
}

function sourceOf(ir: ResolvedSemanticIR, index = 0) {
  return ir.sources[index];
}

function domainOf(ir: ResolvedSemanticIR, index = 0) {
  return sourceOf(ir, index).domains[0];
}

describe("resolveSemanticSources", () => {
  it("resolves one valid loaded semantic source into deterministic IR", () => {
    const ir = resolveSemanticSources([loaded("network.yaml")]);

    expect(ir.sources).toHaveLength(1);
    expect(sourceOf(ir).provenance.relativePath).toBe("network.yaml");
    expect(domainOf(ir).name).toBe("network");
    expect(domainOf(ir).resources.map((resource) => resource.name)).toEqual([
      "network.ipConfig"
    ]);
  });

  it("resolves field valueType references to declared semantic value types", () => {
    const ir = resolveSemanticSources([loaded("network.yaml")]);
    const domain = domainOf(ir);
    const enabled = domain.resources[0].fields.find((field) => field.name === "enabled");

    expect(enabled?.valueType.name).toBe("BooleanValue");
    expect(enabled?.valueType).toBe(sourceOf(ir).valueTypes[0]);
  });

  it("resolves resource identity, readModel, and derivedState to resource fields", () => {
    const ir = resolveSemanticSources([loaded("network.yaml")]);
    const resource = domainOf(ir).resources[0];

    expect(resource.identity.map((field) => field.name)).toEqual(["interfaceName"]);
    expect(resource.readModel.map((field) => field.name)).toEqual(["enabled"]);
    expect(resource.derivedState.map((field) => field.name)).toEqual(["effectiveEnabled"]);
    expect(resource.identity[0]).toBe(resource.fields[0]);
  });

  it("resolves operation.resource to the resolved resource", () => {
    const ir = resolveSemanticSources([loaded("network.yaml")]);
    const domain = domainOf(ir);

    expect(domain.operations[0].resource).toBe(domain.resources[0]);
  });

  it("resolves selector and state projections to resolved resource fields", () => {
    const ir = resolveSemanticSources([loaded("network.yaml")]);
    const domain = domainOf(ir);
    const projection = domain.operations[0].inputProjection;

    expect(projection?.selector[0]).toBe(domain.resources[0].fields[0]);
    expect(projection?.state[0]).toBe(domain.resources[0].fields[1]);
    expect(projection?.methodLocal).toEqual(["requestedBy"]);
  });

  it("resolves feature resource and operation references", () => {
    const ir = resolveSemanticSources([loaded("network.yaml")]);
    const domain = domainOf(ir);
    const feature = domain.features[0];

    expect(feature.resources[0]).toBe(domain.resources[0]);
    expect(feature.operations[0]).toBe(domain.operations[0]);
  });

  it("preserves deterministic source provenance on resolved entities", () => {
    const ir = resolveSemanticSources([loaded("semantic/network.yaml")]);
    const source = sourceOf(ir);
    const domain = domainOf(ir);

    expect(source.provenance.relativePath).toBe("semantic/network.yaml");
    expect(source.valueTypes[0].provenance.relativePath).toBe("semantic/network.yaml");
    expect(domain.provenance.relativePath).toBe("semantic/network.yaml");
    expect(domain.resources[0].provenance.relativePath).toBe("semantic/network.yaml");
    expect(domain.resources[0].fields[0].provenance.relativePath).toBe("semantic/network.yaml");
    expect(domain.operations[0].provenance.relativePath).toBe("semantic/network.yaml");
    expect(domain.features[0].provenance.relativePath).toBe("semantic/network.yaml");
  });

  it("fails closed when two loaded sources declare the same global resource identity", () => {
    const first = loaded("a.yaml");
    const second = loaded("b.yaml", "secondary");
    second.source.domains[0].resources[0].name = "network.ipConfig";
    second.source.domains[0].operations[0].resource = "network.ipConfig";
    second.source.domains[0].features[0].resources = ["network.ipConfig"];
    validateSemanticSource(second.source, { file: second.relativePath });

    expect(() => resolveSemanticSources([first, second])).toThrow(
      /duplicate.*resource|ambiguous.*resource/i
    );
  });

  it("fails closed when a feature references an unresolved resource", () => {
    const input = loaded("network.yaml");
    input.source.domains[0].features[0].resources = ["network.missing"];
    validateSemanticSource(input.source, { file: input.relativePath });

    expect(() => resolveSemanticSources([input])).toThrow(/feature.*resource|resource.*feature|unresolved/i);
  });

  it("fails closed when a feature references an unresolved operation", () => {
    const input = loaded("network.yaml");
    input.source.domains[0].features[0].operations = ["network.missing"];
    validateSemanticSource(input.source, { file: input.relativePath });

    expect(() => resolveSemanticSources([input])).toThrow(/feature.*operation|operation.*feature|unresolved/i);
  });

  it("canonicalizes resolved output independently of loaded-source input ordering", () => {
    const alpha = loaded("a/network.yaml", "alpha");
    const beta = loaded("b/network.yaml", "beta");

    const forward = resolveSemanticSources([alpha, beta]);
    const reverse = resolveSemanticSources([beta, alpha]);

    const summarize = (ir: ResolvedSemanticIR) =>
      ir.sources.map((source) => ({
        file: source.provenance.relativePath,
        domains: source.domains.map((domain) => domain.name),
        resources: source.domains.flatMap((domain) =>
          domain.resources.map((resource) => resource.name)
        ),
        operations: source.domains.flatMap((domain) =>
          domain.operations.map((operation) => operation.name)
        )
      }));

    expect(summarize(forward)).toEqual(summarize(reverse));
    expect(forward.sources.map((source) => source.provenance.relativePath)).toEqual([
      "a/network.yaml",
      "b/network.yaml"
    ]);
  });
});

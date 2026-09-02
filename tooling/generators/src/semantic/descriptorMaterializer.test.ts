import { describe, expect, it } from "vitest";
import type { ResolvedSemanticIR } from "./resolvedModel.js";

describe("semantic descriptor materializer", () => {
  it("materializes the canonical empty descriptor bundle", async () => {
    const modulePath = "./descriptorMaterializer.js";
    const loaded = await import(modulePath).catch(() => ({}));

    expect(typeof (loaded as { materializeSemanticDescriptor?: unknown }).materializeSemanticDescriptor)
      .toBe("function");

    const materializeSemanticDescriptor = (
      loaded as {
        materializeSemanticDescriptor: (input: ResolvedSemanticIR) => unknown;
      }
    ).materializeSemanticDescriptor;

    expect(materializeSemanticDescriptor({ sources: [] })).toEqual({
      descriptorVersion: "0.1",
      sources: []
    });
  });
});

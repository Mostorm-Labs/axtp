import type { ResolvedSemanticIR } from "./resolvedModel.js";
import type { SemanticDescriptorBundleV01 } from "./descriptorModel.js";

export function materializeSemanticDescriptor(
  semantic: ResolvedSemanticIR
): SemanticDescriptorBundleV01 {
  if (semantic.sources.length !== 0) {
    throw new Error("non-empty semantic descriptor materialization is not implemented");
  }

  return {
    descriptorVersion: "0.1",
    sources: []
  };
}

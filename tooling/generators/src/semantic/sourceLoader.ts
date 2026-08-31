import type { SemanticSourceModel } from "./sourceModel.js";

export interface LoadedSemanticSource {
  relativePath: string;
  source: SemanticSourceModel;
}

export async function loadSemanticSources(_root: string): Promise<LoadedSemanticSource[]> {
  // TDD RED seam: discovery and YAML parsing are intentionally not implemented yet.
  return [];
}

import type { LoadedSemanticSource } from "./sourceLoader.js";
import type { ResolvedSemanticIR } from "./resolvedModel.js";

export function resolveSemanticSources(
  _sources: LoadedSemanticSource[]
): ResolvedSemanticIR {
  return { sources: [] };
}

import path from "node:path";
import { loadProtocolSources } from "../sourceLoader.js";
import type { SemanticDescriptorBundleV01 } from "./descriptorModel.js";
import { materializeSemanticDescriptor } from "./descriptorMaterializer.js";
import { resolveSemanticProtocolBindings } from "./protocolBindingResolver.js";
import { resolveSemanticSources } from "./resolver.js";
import { loadSemanticSources } from "./sourceLoader.js";

export async function prepareSemanticDescriptor(
  specRoot: string,
  sourceRoot = path.join(specRoot, "contract", "semantic")
): Promise<SemanticDescriptorBundleV01> {
  const [semanticSources, baseProtocol] = await Promise.all([
    loadSemanticSources(sourceRoot),
    loadProtocolSources(specRoot)
  ]);

  const semantic = resolveSemanticSources(semanticSources);
  resolveSemanticProtocolBindings(semantic, baseProtocol);
  return materializeSemanticDescriptor(semantic);
}

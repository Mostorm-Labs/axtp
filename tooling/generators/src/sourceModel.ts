import type { SpecModel } from "./models.js";
import type { VectorRecipeCatalog } from "./vectorRecipes.js";

export interface ProtocolSourceModel extends SpecModel {
  protocolMeta: Record<string, unknown>;
  sourceFiles: string[];
  profiles: Array<Record<string, unknown>>;
  vectorRecipes: VectorRecipeCatalog;
}

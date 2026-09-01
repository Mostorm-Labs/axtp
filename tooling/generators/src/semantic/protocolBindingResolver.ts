import type { ResolvedSemanticIR } from "./resolvedModel.js";
import type {
  BaseProtocolSourceModel,
  ProtocolProjectionDelta
} from "./protocolProjectionModel.js";

export function resolveSemanticProtocolBindings(
  _semantic: ResolvedSemanticIR,
  _base: BaseProtocolSourceModel
): ProtocolProjectionDelta {
  return {
    kind: "SEMANTIC_BINDING_OVERLAY",
    version: 1,
    operationBindings: []
  };
}

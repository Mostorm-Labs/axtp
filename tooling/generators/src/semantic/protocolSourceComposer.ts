import type { ProtocolSourceModel } from "../sourceModel.js";
import type {
  BaseProtocolSourceModel,
  ProtocolProjectionDelta
} from "./protocolProjectionModel.js";

export interface EffectiveProtocolSourceModel extends ProtocolSourceModel {
  readonly semanticProjection: ProtocolProjectionDelta;
}

export function composeEffectiveProtocolSource(
  base: BaseProtocolSourceModel,
  delta: ProtocolProjectionDelta
): EffectiveProtocolSourceModel {
  return {
    ...base,
    semanticProjection: delta
  };
}

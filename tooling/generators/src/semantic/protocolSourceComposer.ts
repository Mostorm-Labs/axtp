import type { ProtocolSourceModel } from "../sourceModel.js";
import type {
  BaseProtocolSourceModel,
  ProtocolProjectionDelta
} from "./protocolProjectionModel.js";

export interface EffectiveProtocolSourceModel extends ProtocolSourceModel {
  readonly semanticProjection: ProtocolProjectionDelta;
}

export function composeEffectiveProtocolSource(
  _base: BaseProtocolSourceModel,
  _delta: ProtocolProjectionDelta
): EffectiveProtocolSourceModel {
  throw new Error("SRL-A3 protocol source composition is not implemented");
}

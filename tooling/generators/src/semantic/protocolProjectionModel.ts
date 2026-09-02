import type { Field, Method, Schema } from "../models.js";
import type { ProtocolSourceModel } from "../sourceModel.js";
import type {
  ResolvedSemanticField,
  ResolvedSemanticOperation,
  SemanticProvenance
} from "./resolvedModel.js";

export type BaseProtocolSourceModel = ProtocolSourceModel;

export type SemanticBindingRole =
  | "request.selector"
  | "request.state"
  | "request.methodLocal"
  | "response.state";

export interface ResolvedProtocolFieldBinding {
  role: SemanticBindingRole;
  semanticField?: ResolvedSemanticField;
  methodLocal?: string;
  protocolSchema: Schema;
  protocolField: Field;
}

export interface ResolvedProtocolOperationBinding {
  semanticOperation: ResolvedSemanticOperation;
  protocolMethod: Method;
  requestSchema: Schema;
  responseSchema: Schema;
  request: readonly ResolvedProtocolFieldBinding[];
  response: readonly ResolvedProtocolFieldBinding[];
  semanticProvenance: SemanticProvenance;
  protocolSourceFile?: string;
}

export interface ProtocolProjectionDelta {
  kind: "SEMANTIC_BINDING_OVERLAY";
  version: 1;
  operationBindings: readonly ResolvedProtocolOperationBinding[];
}

export interface SemanticProtocolBindingDiagnostic {
  file: string;
  category: "protocol-binding";
  code: string;
  semanticOperation?: string;
  protocolTarget?: string;
  protocolSourceFiles: string[];
  message: string;
}

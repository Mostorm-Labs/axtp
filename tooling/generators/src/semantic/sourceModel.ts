export type SemanticSourceMode = "BOUND_EXISTING" | "SEMANTIC_FIRST";

export type ResourceLifetime = "persistent" | "session" | "ephemeral";

export type FieldShape =
  | "BOOL"
  | "NUMBER"
  | "ENUM"
  | "STRING"
  | "BYTES"
  | "OBJECT"
  | "ARRAY";

export type OperationKind = "QUERY" | "MUTATION" | "ACTION" | "LIFECYCLE";
export type MutationMode = "PATCH" | "REPLACE" | "RESET";
export type LifecycleMode =
  | "OPEN"
  | "CREATE"
  | "CLOSE"
  | "DELETE"
  | "START"
  | "STOP"
  | "TRANSITION"
  | "RECONFIGURE"
  | "ABORT";

export type SemanticMetadataSource = Record<string, unknown>;

export interface SemanticValueTypeSource {
  name: string;
  shape: FieldShape;
  nullable?: boolean;
}

export interface SemanticFieldSource {
  name: string;
  valueType: string;
  required?: boolean;
  constraints?: SemanticMetadataSource;
  unit?: string;
  defaultSemantics?: SemanticMetadataSource;
  emptySemantics?: SemanticMetadataSource;
  readable?: boolean;
  writable?: boolean;
  version?: string;
  compatibility?: SemanticMetadataSource;
}

export interface SemanticResourceIdentitySource {
  fields: string[];
}

export interface SemanticResourceReadModelSource {
  fields: string[];
}

export interface SemanticResourceDerivedStateSource {
  fields: string[];
}

export interface SemanticResourceSource {
  name: string;
  lifetime: ResourceLifetime;
  identity?: SemanticResourceIdentitySource;
  invariants?: string[];
  readModel?: SemanticResourceReadModelSource;
  derivedState?: SemanticResourceDerivedStateSource;
  fields: SemanticFieldSource[];
}

export interface SemanticOperationInputProjectionSource {
  selector?: string[];
  state?: string[];
  methodLocal?: string[];
}

export interface SemanticOperationSource {
  name: string;
  resource: string;
  kind: OperationKind;
  mode?: MutationMode | LifecycleMode;
  inputProjection?: SemanticOperationInputProjectionSource;
}

export interface SemanticFeatureSource {
  name: string;
  resources: string[];
  operations: string[];
}

export interface SemanticDomainSource {
  name: string;
  features: SemanticFeatureSource[];
  resources: SemanticResourceSource[];
  operations: SemanticOperationSource[];
}

export interface SemanticSourceModel {
  version: string;
  mode: SemanticSourceMode;
  valueTypes: SemanticValueTypeSource[];
  domains: SemanticDomainSource[];
}

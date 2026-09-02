import type { FieldShape, ResourceLifetime, SemanticSourceMode } from "./sourceModel.js";

export type SemanticDescriptorMetadata = Record<string, unknown>;

export interface SemanticValueTypeDescriptorV01 {
  name: string;
  shape: FieldShape;
  nullable?: boolean;
}

export interface SemanticFieldDescriptorV01 {
  name: string;
  valueType: string;
  required?: boolean;
  constraints?: SemanticDescriptorMetadata;
  unit?: string;
  defaultSemantics?: SemanticDescriptorMetadata;
  emptySemantics?: SemanticDescriptorMetadata;
  readable?: boolean;
  writable?: boolean;
  version?: string;
  compatibility?: SemanticDescriptorMetadata;
}

export interface SemanticResourceDescriptorV01 {
  name: string;
  lifetime: ResourceLifetime;
  identity: string[];
  invariants: string[];
  readModel: string[];
  derivedState: string[];
  fields: SemanticFieldDescriptorV01[];
}

export interface SemanticOperationDescriptorV01 {
  name: string;
  resource: string;
  kind: "QUERY" | "MUTATION" | "ACTION" | "LIFECYCLE";
  mode?: string;
  inputProjection: {
    selector: string[];
    state: string[];
    methodLocal: string[];
  };
  outputProjection: {
    state: string[];
  };
}

export interface SemanticFeatureDescriptorV01 {
  name: string;
  resources: string[];
  operations: string[];
}

export interface SemanticProtocolFieldBindingDescriptorV01 {
  semanticField: string;
  protocolField: string;
}

export interface SemanticProtocolMethodLocalBindingDescriptorV01 {
  methodLocal: string;
  protocolField: string;
}

export interface SemanticProtocolBindingDescriptorV01 {
  operation: string;
  method: string;
  request: {
    selector: SemanticProtocolFieldBindingDescriptorV01[];
    state: SemanticProtocolFieldBindingDescriptorV01[];
    methodLocal: SemanticProtocolMethodLocalBindingDescriptorV01[];
  };
  response: {
    state: SemanticProtocolFieldBindingDescriptorV01[];
  };
}

export interface SemanticDomainDescriptorV01 {
  name: string;
  features: SemanticFeatureDescriptorV01[];
  resources: SemanticResourceDescriptorV01[];
  operations: SemanticOperationDescriptorV01[];
}

export interface SemanticSourceDescriptorV01 {
  sourceKey: string;
  version: string;
  mode: SemanticSourceMode;
  valueTypes: SemanticValueTypeDescriptorV01[];
  domains: SemanticDomainDescriptorV01[];
  protocolBindings: SemanticProtocolBindingDescriptorV01[];
}

export interface SemanticDescriptorBundleV01 {
  descriptorVersion: "0.1";
  sources: SemanticSourceDescriptorV01[];
}

import type {
  FieldShape,
  LifecycleMode,
  MutationMode,
  OperationKind,
  ResourceLifetime,
  SemanticMetadataSource,
  SemanticSourceMode
} from "./sourceModel.js";

export interface SemanticProvenance {
  relativePath: string;
}

export interface ResolvedSemanticValueType {
  name: string;
  shape: FieldShape;
  nullable?: boolean;
  provenance: SemanticProvenance;
}

export interface ResolvedSemanticField {
  name: string;
  valueType: ResolvedSemanticValueType;
  required?: boolean;
  constraints?: SemanticMetadataSource;
  unit?: string;
  defaultSemantics?: SemanticMetadataSource;
  emptySemantics?: SemanticMetadataSource;
  readable?: boolean;
  writable?: boolean;
  version?: string;
  compatibility?: SemanticMetadataSource;
  provenance: SemanticProvenance;
}

export interface ResolvedSemanticResource {
  name: string;
  lifetime: ResourceLifetime;
  identity: ResolvedSemanticField[];
  invariants: string[];
  readModel: ResolvedSemanticField[];
  derivedState: ResolvedSemanticField[];
  fields: ResolvedSemanticField[];
  provenance: SemanticProvenance;
}

export interface ResolvedSemanticOperationInputProjection {
  selector: ResolvedSemanticField[];
  state: ResolvedSemanticField[];
  methodLocal: string[];
}

export interface ResolvedSemanticOperation {
  name: string;
  resource: ResolvedSemanticResource;
  kind: OperationKind;
  mode?: MutationMode | LifecycleMode;
  inputProjection?: ResolvedSemanticOperationInputProjection;
  provenance: SemanticProvenance;
}

export interface ResolvedSemanticFeature {
  name: string;
  resources: ResolvedSemanticResource[];
  operations: ResolvedSemanticOperation[];
  provenance: SemanticProvenance;
}

export interface ResolvedSemanticDomain {
  name: string;
  features: ResolvedSemanticFeature[];
  resources: ResolvedSemanticResource[];
  operations: ResolvedSemanticOperation[];
  provenance: SemanticProvenance;
}

export interface ResolvedSemanticSource {
  version: string;
  mode: SemanticSourceMode;
  valueTypes: ResolvedSemanticValueType[];
  domains: ResolvedSemanticDomain[];
  provenance: SemanticProvenance;
}

export interface ResolvedSemanticIR {
  sources: ResolvedSemanticSource[];
}

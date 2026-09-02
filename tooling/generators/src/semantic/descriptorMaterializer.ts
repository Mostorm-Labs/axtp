import type {
  ResolvedSemanticDomain,
  ResolvedSemanticField,
  ResolvedSemanticIR,
  ResolvedSemanticOperation,
  ResolvedSemanticProtocolOperationBinding,
  ResolvedSemanticResource,
  ResolvedSemanticSource,
  ResolvedSemanticValueType
} from "./resolvedModel.js";
import type {
  SemanticDescriptorBundleV01,
  SemanticDescriptorMetadata,
  SemanticDomainDescriptorV01,
  SemanticFeatureDescriptorV01,
  SemanticFieldDescriptorV01,
  SemanticOperationDescriptorV01,
  SemanticProtocolBindingDescriptorV01,
  SemanticProtocolFieldBindingDescriptorV01,
  SemanticProtocolMethodLocalBindingDescriptorV01,
  SemanticResourceDescriptorV01,
  SemanticSourceDescriptorV01,
  SemanticValueTypeDescriptorV01
} from "./descriptorModel.js";

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedText(values: readonly string[]): string[] {
  return [...values].sort(compareText);
}

function assertUniqueBy<T>(
  values: readonly T[],
  key: (value: T) => string,
  label: string
): void {
  const seen = new Set<string>();
  for (const value of values) {
    const identity = key(value);
    if (seen.has(identity)) {
      throw new Error(`duplicate ${label}: ${identity}`);
    }
    seen.add(identity);
  }
}

function canonicalizeMetadataValue(
  value: unknown,
  path: string,
  active: WeakSet<object>
): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`non-serializable semantic metadata at ${path}: non-finite number`);
    }
    return value;
  }

  if (typeof value !== "object") {
    throw new Error(`non-serializable semantic metadata at ${path}: ${typeof value}`);
  }

  if (active.has(value)) {
    throw new Error(`non-serializable semantic metadata at ${path}: cyclic object`);
  }

  active.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item, index) => canonicalizeMetadataValue(item, `${path}/${index}`, active));
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`non-serializable semantic metadata at ${path}: non-plain object`);
    }
    if (Object.getOwnPropertySymbols(value).length !== 0) {
      throw new Error(`non-serializable semantic metadata at ${path}: symbol key`);
    }

    const output: SemanticDescriptorMetadata = {};
    for (const key of Object.keys(value).sort(compareText)) {
      output[key] = canonicalizeMetadataValue(
        (value as Record<string, unknown>)[key],
        `${path}/${key}`,
        active
      );
    }
    return output;
  } finally {
    active.delete(value);
  }
}

function canonicalizeMetadata(
  metadata: Record<string, unknown>,
  path: string
): SemanticDescriptorMetadata {
  return canonicalizeMetadataValue(metadata, path, new WeakSet<object>()) as SemanticDescriptorMetadata;
}

function assertFieldReferencesBelong(
  references: readonly ResolvedSemanticField[],
  fields: ReadonlySet<ResolvedSemanticField>,
  context: string
): void {
  for (const field of references) {
    if (!fields.has(field)) {
      throw new Error(`${context} field ${field.name} does not belong to its resource`);
    }
  }
}

function materializeValueType(valueType: ResolvedSemanticValueType): SemanticValueTypeDescriptorV01 {
  const output: SemanticValueTypeDescriptorV01 = {
    name: valueType.name,
    shape: valueType.shape
  };
  if (valueType.nullable !== undefined) output.nullable = valueType.nullable;
  return output;
}

function materializeField(field: ResolvedSemanticField): SemanticFieldDescriptorV01 {
  const output: SemanticFieldDescriptorV01 = {
    name: field.name,
    valueType: field.valueType.name
  };

  if (field.required !== undefined) output.required = field.required;
  if (field.constraints !== undefined) {
    output.constraints = canonicalizeMetadata(field.constraints, `${field.name}/constraints`);
  }
  if (field.unit !== undefined) output.unit = field.unit;
  if (field.defaultSemantics !== undefined) {
    output.defaultSemantics = canonicalizeMetadata(
      field.defaultSemantics,
      `${field.name}/defaultSemantics`
    );
  }
  if (field.emptySemantics !== undefined) {
    output.emptySemantics = canonicalizeMetadata(field.emptySemantics, `${field.name}/emptySemantics`);
  }
  if (field.readable !== undefined) output.readable = field.readable;
  if (field.writable !== undefined) output.writable = field.writable;
  if (field.version !== undefined) output.version = field.version;
  if (field.compatibility !== undefined) {
    output.compatibility = canonicalizeMetadata(field.compatibility, `${field.name}/compatibility`);
  }

  return output;
}

function materializeResource(resource: ResolvedSemanticResource): SemanticResourceDescriptorV01 {
  assertUniqueBy(resource.fields, (field) => field.name, `field identity for ${resource.name}`);
  const fields = new Set(resource.fields);
  assertFieldReferencesBelong(resource.identity, fields, `resource identity for ${resource.name}`);
  assertFieldReferencesBelong(resource.readModel, fields, `resource readModel for ${resource.name}`);
  assertFieldReferencesBelong(resource.derivedState, fields, `resource derivedState for ${resource.name}`);

  return {
    name: resource.name,
    lifetime: resource.lifetime,
    identity: sortedText(resource.identity.map((field) => field.name)),
    invariants: [...resource.invariants],
    readModel: sortedText(resource.readModel.map((field) => field.name)),
    derivedState: sortedText(resource.derivedState.map((field) => field.name)),
    fields: [...resource.fields]
      .sort((left, right) => compareText(left.name, right.name))
      .map(materializeField)
  };
}

function materializeOperation(operation: ResolvedSemanticOperation): SemanticOperationDescriptorV01 {
  const resourceFields = new Set(operation.resource.fields);
  assertFieldReferencesBelong(
    operation.inputProjection?.selector ?? [],
    resourceFields,
    `operation selector for ${operation.name}`
  );
  assertFieldReferencesBelong(
    operation.inputProjection?.state ?? [],
    resourceFields,
    `operation state for ${operation.name}`
  );
  assertFieldReferencesBelong(
    operation.outputProjection?.state ?? [],
    resourceFields,
    `operation output for ${operation.name}`
  );

  const output: SemanticOperationDescriptorV01 = {
    name: operation.name,
    resource: operation.resource.name,
    kind: operation.kind,
    inputProjection: {
      selector: sortedText((operation.inputProjection?.selector ?? []).map((field) => field.name)),
      state: sortedText((operation.inputProjection?.state ?? []).map((field) => field.name)),
      methodLocal: sortedText(operation.inputProjection?.methodLocal ?? [])
    },
    outputProjection: {
      state: sortedText((operation.outputProjection?.state ?? []).map((field) => field.name))
    }
  };
  if (operation.mode !== undefined) output.mode = operation.mode;
  return output;
}

function materializeFeature(
  feature: ResolvedSemanticDomain["features"][number]
): SemanticFeatureDescriptorV01 {
  return {
    name: feature.name,
    resources: sortedText(feature.resources.map((resource) => resource.name)),
    operations: sortedText(feature.operations.map((operation) => operation.name))
  };
}

function materializeFieldBinding(
  binding: ResolvedSemanticProtocolOperationBinding["request"]["selector"][number]
): SemanticProtocolFieldBindingDescriptorV01 {
  return {
    semanticField: binding.semanticField.name,
    protocolField: binding.protocolField
  };
}

function materializeMethodLocalBinding(
  binding: ResolvedSemanticProtocolOperationBinding["request"]["methodLocal"][number]
): SemanticProtocolMethodLocalBindingDescriptorV01 {
  return {
    methodLocal: binding.methodLocal,
    protocolField: binding.protocolField
  };
}

function compareFieldBinding(
  left: SemanticProtocolFieldBindingDescriptorV01,
  right: SemanticProtocolFieldBindingDescriptorV01
): number {
  return compareText(left.semanticField, right.semanticField)
    || compareText(left.protocolField, right.protocolField);
}

function compareMethodLocalBinding(
  left: SemanticProtocolMethodLocalBindingDescriptorV01,
  right: SemanticProtocolMethodLocalBindingDescriptorV01
): number {
  return compareText(left.methodLocal, right.methodLocal)
    || compareText(left.protocolField, right.protocolField);
}

function materializeProtocolBinding(
  binding: ResolvedSemanticProtocolOperationBinding
): SemanticProtocolBindingDescriptorV01 {
  return {
    operation: binding.operation.name,
    method: binding.method,
    request: {
      selector: binding.request.selector.map(materializeFieldBinding).sort(compareFieldBinding),
      state: binding.request.state.map(materializeFieldBinding).sort(compareFieldBinding),
      methodLocal: binding.request.methodLocal
        .map(materializeMethodLocalBinding)
        .sort(compareMethodLocalBinding)
    },
    response: {
      state: binding.response.state.map(materializeFieldBinding).sort(compareFieldBinding)
    }
  };
}

function materializeDomain(domain: ResolvedSemanticDomain): SemanticDomainDescriptorV01 {
  assertUniqueBy(domain.features, (feature) => feature.name, `feature identity in ${domain.name}`);
  assertUniqueBy(domain.resources, (resource) => resource.name, `resource identity in ${domain.name}`);
  assertUniqueBy(domain.operations, (operation) => operation.name, `operation identity in ${domain.name}`);

  return {
    name: domain.name,
    features: [...domain.features]
      .sort((left, right) => compareText(left.name, right.name))
      .map(materializeFeature),
    resources: [...domain.resources]
      .sort((left, right) => compareText(left.name, right.name))
      .map(materializeResource),
    operations: [...domain.operations]
      .sort((left, right) => compareText(left.name, right.name))
      .map(materializeOperation)
  };
}

function materializeSource(source: ResolvedSemanticSource): SemanticSourceDescriptorV01 {
  assertUniqueBy(source.valueTypes, (valueType) => valueType.name, `valueType identity in ${source.provenance.relativePath}`);
  assertUniqueBy(source.domains, (domain) => domain.name, `domain identity in ${source.provenance.relativePath}`);
  const bindings = source.protocolBindings?.operations ?? [];
  assertUniqueBy(bindings, (binding) => binding.operation.name, `protocol binding operation in ${source.provenance.relativePath}`);

  return {
    sourceKey: source.provenance.relativePath,
    version: source.version,
    mode: source.mode,
    valueTypes: [...source.valueTypes]
      .sort((left, right) => compareText(left.name, right.name))
      .map(materializeValueType),
    domains: [...source.domains]
      .sort((left, right) => compareText(left.name, right.name))
      .map(materializeDomain),
    protocolBindings: [...bindings]
      .sort((left, right) => compareText(left.operation.name, right.operation.name))
      .map(materializeProtocolBinding)
  };
}

export function materializeSemanticDescriptor(
  semantic: ResolvedSemanticIR
): SemanticDescriptorBundleV01 {
  assertUniqueBy(
    semantic.sources,
    (source) => source.provenance.relativePath,
    "sourceKey"
  );

  return {
    descriptorVersion: "0.1",
    sources: [...semantic.sources]
      .sort((left, right) => compareText(left.provenance.relativePath, right.provenance.relativePath))
      .map(materializeSource)
  };
}

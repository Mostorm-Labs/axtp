import type { LoadedSemanticSource } from "./sourceLoader.js";
import type {
  ResolvedSemanticDomain,
  ResolvedSemanticField,
  ResolvedSemanticIR,
  ResolvedSemanticOperation,
  ResolvedSemanticProtocolBindings,
  ResolvedSemanticResource,
  ResolvedSemanticSource,
  ResolvedSemanticValueType,
  SemanticProvenance
} from "./resolvedModel.js";
import type { SemanticProtocolBindingsSource } from "./sourceModel.js";
import { validateSemanticSource } from "./validator.js";

function compareLoadedSources(left: LoadedSemanticSource, right: LoadedSemanticSource): number {
  if (left.relativePath < right.relativePath) {
    return -1;
  }
  if (left.relativePath > right.relativePath) {
    return 1;
  }
  return 0;
}

function provenance(relativePath: string): SemanticProvenance {
  return { relativePath };
}

function resolveFields(
  fieldNames: string[],
  fieldsByName: Map<string, ResolvedSemanticField>,
  context: string
): ResolvedSemanticField[] {
  return fieldNames.map((fieldName) => {
    const field = fieldsByName.get(fieldName);
    if (field === undefined) {
      throw new Error(`unresolved ${context} field: ${fieldName}`);
    }
    return field;
  });
}

function assertGlobalIdentityUniqueness(sources: LoadedSemanticSource[]): void {
  const resources = new Map<string, string>();
  const operations = new Map<string, string>();

  for (const loaded of sources) {
    for (const domain of loaded.source.domains) {
      for (const resource of domain.resources) {
        const previous = resources.get(resource.name);
        if (previous !== undefined) {
          throw new Error(
            `duplicate resource identity ${resource.name}: ${previous} and ${loaded.relativePath}`
          );
        }
        resources.set(resource.name, loaded.relativePath);
      }

      for (const operation of domain.operations) {
        const previous = operations.get(operation.name);
        if (previous !== undefined) {
          throw new Error(
            `duplicate operation identity ${operation.name}: ${previous} and ${loaded.relativePath}`
          );
        }
        operations.set(operation.name, loaded.relativePath);
      }
    }
  }
}

function resolveProtocolBindings(
  bindings: SemanticProtocolBindingsSource | undefined,
  operationsByName: Map<string, ResolvedSemanticOperation>,
  sourceProvenance: SemanticProvenance
): ResolvedSemanticProtocolBindings | undefined {
  if (bindings === undefined) {
    return undefined;
  }

  return {
    operations: bindings.operations.map((binding) => {
      const operation = operationsByName.get(binding.operation);
      if (operation === undefined) {
        throw new Error(`unresolved semantic operation for protocol binding: ${binding.operation}`);
      }
      const fieldsByName = new Map(operation.resource.fields.map((field) => [field.name, field]));
      const resolveBindingField = (fieldName: string, context: string): ResolvedSemanticField => {
        const field = fieldsByName.get(fieldName);
        if (field === undefined) {
          throw new Error(`unresolved ${context} semantic field: ${fieldName}`);
        }
        return field;
      };

      return {
        operation,
        method: binding.method,
        request: {
          selector: (binding.request?.selector ?? []).map((item) => ({
            semanticField: resolveBindingField(item.semanticField, "request selector binding"),
            protocolField: item.protocolField
          })),
          state: (binding.request?.state ?? []).map((item) => ({
            semanticField: resolveBindingField(item.semanticField, "request state binding"),
            protocolField: item.protocolField
          })),
          methodLocal: (binding.request?.methodLocal ?? []).map((item) => ({
            methodLocal: item.methodLocal,
            protocolField: item.protocolField
          }))
        },
        response: {
          state: (binding.response?.state ?? []).map((item) => ({
            semanticField: resolveBindingField(item.semanticField, "response state binding"),
            protocolField: item.protocolField
          }))
        },
        provenance: sourceProvenance
      };
    })
  };
}

function resolveSource(loaded: LoadedSemanticSource): ResolvedSemanticSource {
  const sourceProvenance = provenance(loaded.relativePath);
  const valueTypes: ResolvedSemanticValueType[] = [];
  const valueTypesByName = new Map<string, ResolvedSemanticValueType>();

  for (const valueType of loaded.source.valueTypes) {
    if (valueTypesByName.has(valueType.name)) {
      throw new Error(`duplicate value type identity: ${valueType.name}`);
    }

    const resolvedValueType: ResolvedSemanticValueType = {
      ...valueType,
      provenance: sourceProvenance
    };
    valueTypes.push(resolvedValueType);
    valueTypesByName.set(resolvedValueType.name, resolvedValueType);
  }

  const domainStates = loaded.source.domains.map((domain) => {
    const resources: ResolvedSemanticResource[] = domain.resources.map((resource) => {
      const fields: ResolvedSemanticField[] = resource.fields.map((field) => {
        const valueType = valueTypesByName.get(field.valueType);
        if (valueType === undefined) {
          throw new Error(`unresolved valueType ${field.valueType} for ${resource.name}.${field.name}`);
        }

        return {
          ...field,
          valueType,
          provenance: sourceProvenance
        };
      });
      const fieldsByName = new Map(fields.map((field) => [field.name, field]));

      return {
        name: resource.name,
        lifetime: resource.lifetime,
        identity: resolveFields(
          resource.identity?.fields ?? [],
          fieldsByName,
          `resource identity for ${resource.name}`
        ),
        invariants: [...(resource.invariants ?? [])],
        readModel: resolveFields(
          resource.readModel?.fields ?? [],
          fieldsByName,
          `read model for ${resource.name}`
        ),
        derivedState: resolveFields(
          resource.derivedState?.fields ?? [],
          fieldsByName,
          `derived state for ${resource.name}`
        ),
        fields,
        provenance: sourceProvenance
      };
    });

    return { domain, resources };
  });

  const resourcesByName = new Map<string, ResolvedSemanticResource>();
  for (const state of domainStates) {
    for (const resource of state.resources) {
      resourcesByName.set(resource.name, resource);
    }
  }

  const operationsByName = new Map<string, ResolvedSemanticOperation>();
  const operationsByDomain = domainStates.map((state) =>
    state.domain.operations.map((operation): ResolvedSemanticOperation => {
      const resource = resourcesByName.get(operation.resource);
      if (resource === undefined) {
        throw new Error(`unresolved resource ${operation.resource} for operation ${operation.name}`);
      }

      const fieldsByName = new Map(resource.fields.map((field) => [field.name, field]));
      const inputProjection = operation.inputProjection === undefined
        ? undefined
        : {
            selector: resolveFields(
              operation.inputProjection.selector ?? [],
              fieldsByName,
              `selector projection for operation ${operation.name}`
            ),
            state: resolveFields(
              operation.inputProjection.state ?? [],
              fieldsByName,
              `state projection for operation ${operation.name}`
            ),
            methodLocal: [...(operation.inputProjection.methodLocal ?? [])]
          };
      const outputProjection = operation.outputProjection === undefined
        ? undefined
        : {
            state: resolveFields(
              operation.outputProjection.state ?? [],
              fieldsByName,
              `output projection for operation ${operation.name}`
            )
          };

      const resolvedOperation: ResolvedSemanticOperation = {
        name: operation.name,
        resource,
        kind: operation.kind,
        mode: operation.mode,
        inputProjection,
        outputProjection,
        provenance: sourceProvenance
      };
      operationsByName.set(resolvedOperation.name, resolvedOperation);
      return resolvedOperation;
    })
  );

  const domains: ResolvedSemanticDomain[] = domainStates.map((state, domainIndex) => ({
    name: state.domain.name,
    resources: state.resources,
    operations: operationsByDomain[domainIndex],
    features: state.domain.features.map((feature) => ({
      name: feature.name,
      resources: feature.resources.map((resourceName) => {
        const resource = resourcesByName.get(resourceName);
        if (resource === undefined) {
          throw new Error(`unresolved feature resource ${resourceName} for feature ${feature.name}`);
        }
        return resource;
      }),
      operations: feature.operations.map((operationName) => {
        const operation = operationsByName.get(operationName);
        if (operation === undefined) {
          throw new Error(
            `unresolved feature operation ${operationName} for feature ${feature.name}`
          );
        }
        return operation;
      }),
      provenance: sourceProvenance
    })),
    provenance: sourceProvenance
  }));

  return {
    version: loaded.source.version,
    mode: loaded.source.mode,
    valueTypes,
    domains,
    protocolBindings: resolveProtocolBindings(
      loaded.source.protocolBindings,
      operationsByName,
      sourceProvenance
    ),
    provenance: sourceProvenance
  };
}

export function resolveSemanticSources(sources: LoadedSemanticSource[]): ResolvedSemanticIR {
  const orderedSources = [...sources].sort(compareLoadedSources);

  for (const loaded of orderedSources) {
    validateSemanticSource(loaded.source, { file: loaded.relativePath });
  }
  assertGlobalIdentityUniqueness(orderedSources);

  return {
    sources: orderedSources.map(resolveSource)
  };
}

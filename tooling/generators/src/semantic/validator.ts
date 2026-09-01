import type {
  SemanticOperationSource,
  SemanticProtocolFieldBindingSource,
  SemanticProtocolMethodLocalBindingSource,
  SemanticProtocolOperationBindingSource,
  SemanticSourceModel
} from "./sourceModel.js";

export interface SemanticDiagnostic {
  file: string;
  path: string;
  category: string;
  code: string;
  message: string;
}

export interface SemanticValidationContext {
  file: string;
}

const SOURCE_MODES = new Set(["BOUND_EXISTING", "SEMANTIC_FIRST"]);
const RESOURCE_LIFETIMES = new Set(["persistent", "session", "ephemeral"]);
const FIELD_SHAPES = new Set([
  "BOOL",
  "NUMBER",
  "ENUM",
  "STRING",
  "BYTES",
  "OBJECT",
  "ARRAY"
]);
const OPERATION_KINDS = new Set(["QUERY", "MUTATION", "ACTION", "LIFECYCLE"]);
const MUTATION_MODES = new Set(["PATCH", "REPLACE", "RESET"]);
const LIFECYCLE_MODES = new Set([
  "OPEN",
  "CREATE",
  "CLOSE",
  "DELETE",
  "START",
  "STOP",
  "TRANSITION",
  "RECONFIGURE",
  "ABORT"
]);

function throwDiagnostic(
  validationContext: SemanticValidationContext | undefined,
  path: string,
  category: string,
  code: string,
  message: string
): never {
  const diagnostic: SemanticDiagnostic = {
    file: validationContext?.file ?? "",
    path,
    category,
    code,
    message
  };
  const error = new Error(message) as Error & { diagnostic: SemanticDiagnostic };
  error.diagnostic = diagnostic;
  throw error;
}

function isMetadataObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequiredObjectStructure(
  value: unknown,
  validationContext: SemanticValidationContext | undefined,
  path: string,
  code: string
): asserts value is Record<string, unknown> {
  if (!isMetadataObject(value)) {
    const message = `invalid semantic source structure at ${path}: expected object`;
    throwDiagnostic(validationContext, path, "structure", code, message);
  }
}

function validateRequiredArrayStructure(
  value: unknown,
  validationContext: SemanticValidationContext | undefined,
  path: string,
  code: string
): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    const message = `invalid semantic source structure at ${path}: expected array`;
    throwDiagnostic(validationContext, path, "structure", code, message);
  }
}

function validateNonBlankStringStructure(
  value: unknown,
  validationContext: SemanticValidationContext | undefined,
  path: string,
  code: string
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    const message = `invalid semantic source structure at ${path}: expected non-empty string`;
    throwDiagnostic(validationContext, path, "structure", code, message);
  }
}

function validateStringArrayEntriesStructure(
  value: unknown[],
  validationContext: SemanticValidationContext | undefined,
  path: string,
  code: string
): void {
  for (let index = 0; index < value.length; index += 1) {
    validateNonBlankStringStructure(value[index], validationContext, `${path}/${index}`, code);
  }
}

function validateProtocolFieldBindingArrayStructure(
  value: unknown,
  validationContext: SemanticValidationContext | undefined,
  path: string,
  prefix: string
): void {
  if (value === undefined) {
    return;
  }

  validateRequiredArrayStructure(
    value,
    validationContext,
    path,
    `SEM_STRUCTURE_${prefix}_ARRAY_REQUIRED`
  );

  for (let index = 0; index < value.length; index += 1) {
    const entryPath = `${path}/${index}`;
    const entry = value[index];
    validateRequiredObjectStructure(
      entry,
      validationContext,
      entryPath,
      `SEM_STRUCTURE_${prefix}_ENTRY_OBJECT_REQUIRED`
    );
    validateNonBlankStringStructure(
      entry.semanticField,
      validationContext,
      `${entryPath}/semanticField`,
      `SEM_STRUCTURE_${prefix}_SEMANTIC_FIELD_REQUIRED`
    );
    validateNonBlankStringStructure(
      entry.protocolField,
      validationContext,
      `${entryPath}/protocolField`,
      `SEM_STRUCTURE_${prefix}_PROTOCOL_FIELD_REQUIRED`
    );
  }
}

function validateProtocolMethodLocalBindingArrayStructure(
  value: unknown,
  validationContext: SemanticValidationContext | undefined,
  path: string
): void {
  if (value === undefined) {
    return;
  }

  validateRequiredArrayStructure(
    value,
    validationContext,
    path,
    "SEM_STRUCTURE_PROTOCOL_BINDING_REQUEST_METHOD_LOCAL_ARRAY_REQUIRED"
  );

  for (let index = 0; index < value.length; index += 1) {
    const entryPath = `${path}/${index}`;
    const entry = value[index];
    validateRequiredObjectStructure(
      entry,
      validationContext,
      entryPath,
      "SEM_STRUCTURE_PROTOCOL_BINDING_REQUEST_METHOD_LOCAL_ENTRY_OBJECT_REQUIRED"
    );
    validateNonBlankStringStructure(
      entry.methodLocal,
      validationContext,
      `${entryPath}/methodLocal`,
      "SEM_STRUCTURE_PROTOCOL_BINDING_METHOD_LOCAL_REQUIRED"
    );
    validateNonBlankStringStructure(
      entry.protocolField,
      validationContext,
      `${entryPath}/protocolField`,
      "SEM_STRUCTURE_PROTOCOL_BINDING_METHOD_LOCAL_PROTOCOL_FIELD_REQUIRED"
    );
  }
}

function validateProtocolBindingsStructure(
  rawSource: Record<string, unknown>,
  validationContext: SemanticValidationContext | undefined
): void {
  const protocolBindings = rawSource.protocolBindings;
  if (protocolBindings === undefined) {
    return;
  }

  validateRequiredObjectStructure(
    protocolBindings,
    validationContext,
    "/protocolBindings",
    "SEM_STRUCTURE_PROTOCOL_BINDINGS_OBJECT_REQUIRED"
  );
  validateRequiredArrayStructure(
    protocolBindings.operations,
    validationContext,
    "/protocolBindings/operations",
    "SEM_STRUCTURE_PROTOCOL_BINDING_OPERATIONS_ARRAY_REQUIRED"
  );

  for (let bindingIndex = 0; bindingIndex < protocolBindings.operations.length; bindingIndex += 1) {
    const bindingPath = `/protocolBindings/operations/${bindingIndex}`;
    const binding = protocolBindings.operations[bindingIndex];
    validateRequiredObjectStructure(
      binding,
      validationContext,
      bindingPath,
      "SEM_STRUCTURE_PROTOCOL_BINDING_OPERATION_OBJECT_REQUIRED"
    );
    validateNonBlankStringStructure(
      binding.operation,
      validationContext,
      `${bindingPath}/operation`,
      "SEM_STRUCTURE_PROTOCOL_BINDING_OPERATION_REQUIRED"
    );
    validateNonBlankStringStructure(
      binding.method,
      validationContext,
      `${bindingPath}/method`,
      "SEM_STRUCTURE_PROTOCOL_BINDING_METHOD_REQUIRED"
    );

    if (binding.request !== undefined) {
      validateRequiredObjectStructure(
        binding.request,
        validationContext,
        `${bindingPath}/request`,
        "SEM_STRUCTURE_PROTOCOL_BINDING_REQUEST_OBJECT_REQUIRED"
      );
      validateProtocolFieldBindingArrayStructure(
        binding.request.selector,
        validationContext,
        `${bindingPath}/request/selector`,
        "PROTOCOL_BINDING_REQUEST_SELECTOR"
      );
      validateProtocolFieldBindingArrayStructure(
        binding.request.state,
        validationContext,
        `${bindingPath}/request/state`,
        "PROTOCOL_BINDING_REQUEST_STATE"
      );
      validateProtocolMethodLocalBindingArrayStructure(
        binding.request.methodLocal,
        validationContext,
        `${bindingPath}/request/methodLocal`
      );
    }

    if (binding.response !== undefined) {
      validateRequiredObjectStructure(
        binding.response,
        validationContext,
        `${bindingPath}/response`,
        "SEM_STRUCTURE_PROTOCOL_BINDING_RESPONSE_OBJECT_REQUIRED"
      );
      validateProtocolFieldBindingArrayStructure(
        binding.response.state,
        validationContext,
        `${bindingPath}/response/state`,
        "PROTOCOL_BINDING_RESPONSE_STATE"
      );
    }
  }
}

function validateSemanticSourceStructure(
  source: SemanticSourceModel,
  validationContext: SemanticValidationContext | undefined
): void {
  validateRequiredObjectStructure(
    source as unknown,
    validationContext,
    "/",
    "SEM_STRUCTURE_ROOT_OBJECT_REQUIRED"
  );

  const rawSource = source as unknown as Record<string, unknown>;
  const valueTypes = rawSource.valueTypes;
  validateRequiredArrayStructure(
    valueTypes,
    validationContext,
    "/valueTypes",
    "SEM_STRUCTURE_VALUE_TYPES_ARRAY_REQUIRED"
  );

  for (let valueTypeIndex = 0; valueTypeIndex < valueTypes.length; valueTypeIndex += 1) {
    validateRequiredObjectStructure(
      valueTypes[valueTypeIndex],
      validationContext,
      `/valueTypes/${valueTypeIndex}`,
      "SEM_STRUCTURE_VALUE_TYPE_OBJECT_REQUIRED"
    );
  }

  const domains = rawSource.domains;
  validateRequiredArrayStructure(
    domains,
    validationContext,
    "/domains",
    "SEM_STRUCTURE_DOMAINS_ARRAY_REQUIRED"
  );

  for (let domainIndex = 0; domainIndex < domains.length; domainIndex += 1) {
    const domainPath = `/domains/${domainIndex}`;
    const domain = domains[domainIndex];
    validateRequiredObjectStructure(
      domain,
      validationContext,
      domainPath,
      "SEM_STRUCTURE_DOMAIN_OBJECT_REQUIRED"
    );

    const resources = domain.resources;
    const resourcesPath = `${domainPath}/resources`;
    validateRequiredArrayStructure(
      resources,
      validationContext,
      resourcesPath,
      "SEM_STRUCTURE_DOMAIN_RESOURCES_ARRAY_REQUIRED"
    );

    for (let resourceIndex = 0; resourceIndex < resources.length; resourceIndex += 1) {
      const resourcePath = `${resourcesPath}/${resourceIndex}`;
      const resource = resources[resourceIndex];
      validateRequiredObjectStructure(
        resource,
        validationContext,
        resourcePath,
        "SEM_STRUCTURE_RESOURCE_OBJECT_REQUIRED"
      );

      const fields = resource.fields;
      const fieldsPath = `${resourcePath}/fields`;
      validateRequiredArrayStructure(
        fields,
        validationContext,
        fieldsPath,
        "SEM_STRUCTURE_RESOURCE_FIELDS_ARRAY_REQUIRED"
      );

      for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex += 1) {
        validateRequiredObjectStructure(
          fields[fieldIndex],
          validationContext,
          `${fieldsPath}/${fieldIndex}`,
          "SEM_STRUCTURE_FIELD_OBJECT_REQUIRED"
        );
      }
    }

    const operations = domain.operations;
    const operationsPath = `${domainPath}/operations`;
    validateRequiredArrayStructure(
      operations,
      validationContext,
      operationsPath,
      "SEM_STRUCTURE_DOMAIN_OPERATIONS_ARRAY_REQUIRED"
    );

    for (let operationIndex = 0; operationIndex < operations.length; operationIndex += 1) {
      const operationPath = `${operationsPath}/${operationIndex}`;
      const operation = operations[operationIndex];
      validateRequiredObjectStructure(
        operation,
        validationContext,
        operationPath,
        "SEM_STRUCTURE_OPERATION_OBJECT_REQUIRED"
      );

      if (operation.outputProjection !== undefined) {
        const outputPath = `${operationPath}/outputProjection`;
        validateRequiredObjectStructure(
          operation.outputProjection,
          validationContext,
          outputPath,
          "SEM_STRUCTURE_OUTPUT_PROJECTION_OBJECT_REQUIRED"
        );
        if (operation.outputProjection.state !== undefined) {
          validateRequiredArrayStructure(
            operation.outputProjection.state,
            validationContext,
            `${outputPath}/state`,
            "SEM_STRUCTURE_OUTPUT_PROJECTION_STATE_ARRAY_REQUIRED"
          );
          validateStringArrayEntriesStructure(
            operation.outputProjection.state,
            validationContext,
            `${outputPath}/state`,
            "SEM_STRUCTURE_OUTPUT_PROJECTION_STATE_FIELD_REQUIRED"
          );
        }
      }
    }
  }

  validateProtocolBindingsStructure(rawSource, validationContext);
}

function validateMetadataObject(value: unknown, context: string): void {
  if (value !== undefined && !isMetadataObject(value)) {
    throw new Error(`invalid ${context}: expected metadata object`);
  }
}

function validateOptionalNonBlankString(value: unknown, context: string): void {
  if (value !== undefined && (typeof value !== "string" || value.trim().length === 0)) {
    throw new Error(`invalid ${context}: expected non-empty string`);
  }
}

function validateOptionalBoolean(value: unknown, context: string): void {
  if (value !== undefined && typeof value !== "boolean") {
    throw new Error(`invalid ${context}: expected boolean`);
  }
}

function validateResourceFieldReference(
  fieldPath: string,
  resourceFields: Set<string>,
  context: string
): void {
  if (fieldPath.trim().length === 0) {
    throw new Error(`invalid ${context}: empty field path`);
  }

  if (!resourceFields.has(fieldPath)) {
    throw new Error(`${context} references missing resource field: ${fieldPath}`);
  }
}

function validateResourceFieldView(
  view: unknown,
  resourceFields: Set<string>,
  context: string
): void {
  if (view === undefined) {
    return;
  }

  if (!isMetadataObject(view) || !Array.isArray(view.fields)) {
    throw new Error(`invalid ${context}: expected fields array`);
  }

  for (const fieldPath of view.fields) {
    if (typeof fieldPath !== "string") {
      throw new Error(`invalid ${context}: field reference must be a string`);
    }
    validateResourceFieldReference(fieldPath, resourceFields, context);
  }
}

function validateResourceInvariants(value: unknown, resourceName: string): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    throw new Error(`invalid invariant list for resource ${resourceName}`);
  }

  for (const invariant of value) {
    if (typeof invariant !== "string" || invariant.trim().length === 0) {
      throw new Error(`invalid invariant for resource ${resourceName}: expected non-empty string`);
    }
  }
}

function rejectProjectionCollision(
  operationName: string,
  leftCategory: string,
  leftValues: string[],
  rightCategory: string,
  rightValues: string[],
  validationContext: SemanticValidationContext | undefined,
  path: string
): void {
  const left = new Set(leftValues);
  for (const value of rightValues) {
    if (left.has(value)) {
      const message =
        `projection category collision for operation ${operationName}: ${value} appears in ${leftCategory} and ${rightCategory}`;
      throwDiagnostic(
        validationContext,
        path,
        "projection",
        "SEM_PROJECTION_CATEGORY_COLLISION",
        message
      );
    }
  }
}

function validateUniqueSemanticFieldBindings(
  bindings: SemanticProtocolFieldBindingSource[],
  allowedFields: Set<string>,
  context: string,
  validationContext: SemanticValidationContext | undefined,
  path: string
): void {
  const seen = new Set<string>();
  for (let index = 0; index < bindings.length; index += 1) {
    const binding = bindings[index];
    if (!allowedFields.has(binding.semanticField)) {
      const message = `${context} references missing projected semantic field: ${binding.semanticField}`;
      throwDiagnostic(
        validationContext,
        `${path}/${index}/semanticField`,
        "protocol-binding",
        "SEM_PROTOCOL_BINDING_SEMANTIC_FIELD_MISSING",
        message
      );
    }
    if (seen.has(binding.semanticField)) {
      const message = `${context} duplicates semantic field mapping: ${binding.semanticField}`;
      throwDiagnostic(
        validationContext,
        `${path}/${index}/semanticField`,
        "protocol-binding",
        "SEM_PROTOCOL_BINDING_SEMANTIC_FIELD_DUPLICATE",
        message
      );
    }
    seen.add(binding.semanticField);
  }
}

function validateUniqueMethodLocalBindings(
  bindings: SemanticProtocolMethodLocalBindingSource[],
  allowedNames: Set<string>,
  context: string,
  validationContext: SemanticValidationContext | undefined,
  path: string
): void {
  const seen = new Set<string>();
  for (let index = 0; index < bindings.length; index += 1) {
    const binding = bindings[index];
    if (!allowedNames.has(binding.methodLocal)) {
      const message = `${context} references missing methodLocal name: ${binding.methodLocal}`;
      throwDiagnostic(
        validationContext,
        `${path}/${index}/methodLocal`,
        "protocol-binding",
        "SEM_PROTOCOL_BINDING_METHOD_LOCAL_MISSING",
        message
      );
    }
    if (seen.has(binding.methodLocal)) {
      const message = `${context} duplicates methodLocal mapping: ${binding.methodLocal}`;
      throwDiagnostic(
        validationContext,
        `${path}/${index}/methodLocal`,
        "protocol-binding",
        "SEM_PROTOCOL_BINDING_METHOD_LOCAL_DUPLICATE",
        message
      );
    }
    seen.add(binding.methodLocal);
  }
}

function validateProtocolBindingSemanticReferences(
  source: SemanticSourceModel,
  operationsByName: Map<string, SemanticOperationSource>,
  validationContext: SemanticValidationContext | undefined
): void {
  const seenOperations = new Set<string>();
  const bindings = source.protocolBindings?.operations ?? [];

  for (let bindingIndex = 0; bindingIndex < bindings.length; bindingIndex += 1) {
    const binding: SemanticProtocolOperationBindingSource = bindings[bindingIndex];
    const bindingPath = `/protocolBindings/operations/${bindingIndex}`;
    const operation = operationsByName.get(binding.operation);
    if (operation === undefined) {
      const message = `protocol binding references missing semantic operation: ${binding.operation}`;
      throwDiagnostic(
        validationContext,
        `${bindingPath}/operation`,
        "protocol-binding",
        "SEM_PROTOCOL_BINDING_OPERATION_MISSING",
        message
      );
    }
    if (seenOperations.has(binding.operation)) {
      const message = `duplicate protocol binding for semantic operation: ${binding.operation}`;
      throwDiagnostic(
        validationContext,
        `${bindingPath}/operation`,
        "protocol-binding",
        "SEM_PROTOCOL_BINDING_OPERATION_DUPLICATE",
        message
      );
    }
    seenOperations.add(binding.operation);

    const selector = new Set(operation.inputProjection?.selector ?? []);
    const state = new Set(operation.inputProjection?.state ?? []);
    const methodLocal = new Set(operation.inputProjection?.methodLocal ?? []);
    const outputState = new Set(operation.outputProjection?.state ?? []);

    validateUniqueSemanticFieldBindings(
      binding.request?.selector ?? [],
      selector,
      `request selector binding for ${binding.operation}`,
      validationContext,
      `${bindingPath}/request/selector`
    );
    validateUniqueSemanticFieldBindings(
      binding.request?.state ?? [],
      state,
      `request state binding for ${binding.operation}`,
      validationContext,
      `${bindingPath}/request/state`
    );
    validateUniqueMethodLocalBindings(
      binding.request?.methodLocal ?? [],
      methodLocal,
      `request methodLocal binding for ${binding.operation}`,
      validationContext,
      `${bindingPath}/request/methodLocal`
    );
    validateUniqueSemanticFieldBindings(
      binding.response?.state ?? [],
      outputState,
      `response state binding for ${binding.operation}`,
      validationContext,
      `${bindingPath}/response/state`
    );
  }
}

export function validateSemanticSource(
  source: SemanticSourceModel,
  validationContext?: SemanticValidationContext
): void {
  validateSemanticSourceStructure(source, validationContext);

  if (!SOURCE_MODES.has(source.mode)) {
    const message = `invalid semantic source mode: ${source.mode}`;
    throwDiagnostic(
      validationContext,
      "/mode",
      "source",
      "SEM_SOURCE_MODE_INVALID",
      message
    );
  }

  const valueTypes = new Set(source.valueTypes.map((valueType) => valueType.name));

  for (const valueType of source.valueTypes) {
    if (!FIELD_SHAPES.has(valueType.shape)) {
      throw new Error(`invalid field shape: ${valueType.shape}`);
    }
  }

  const resourceIdentities = new Set<string>();
  const fieldsByResource = new Map<string, Set<string>>();

  for (let domainIndex = 0; domainIndex < source.domains.length; domainIndex += 1) {
    const domain = source.domains[domainIndex];

    for (let resourceIndex = 0; resourceIndex < domain.resources.length; resourceIndex += 1) {
      const resource = domain.resources[resourceIndex];

      if (!RESOURCE_LIFETIMES.has(resource.lifetime)) {
        throw new Error(`invalid resource lifetime: ${resource.lifetime}`);
      }

      if (resourceIdentities.has(resource.name)) {
        throw new Error(`duplicate resource identity: ${resource.name}`);
      }
      resourceIdentities.add(resource.name);

      const fieldIdentities = new Set<string>();
      for (let fieldIndex = 0; fieldIndex < resource.fields.length; fieldIndex += 1) {
        const field = resource.fields[fieldIndex];

        if (fieldIdentities.has(field.name)) {
          throw new Error(`duplicate field identity in ${resource.name}: ${field.name}`);
        }
        fieldIdentities.add(field.name);

        if (!valueTypes.has(field.valueType)) {
          const message = `unknown valueType ${field.valueType} for ${resource.name}.${field.name}`;
          throwDiagnostic(
            validationContext,
            `/domains/${domainIndex}/resources/${resourceIndex}/fields/${fieldIndex}/valueType`,
            "field",
            "SEM_FIELD_VALUE_TYPE_UNKNOWN",
            message
          );
        }

        if (field.constraints !== undefined && !isMetadataObject(field.constraints)) {
          const message =
            `invalid constraints for ${resource.name}.${field.name}: expected metadata object`;
          throwDiagnostic(
            validationContext,
            `/domains/${domainIndex}/resources/${resourceIndex}/fields/${fieldIndex}/constraints`,
            "field",
            "SEM_FIELD_CONSTRAINTS_INVALID",
            message
          );
        }
        validateOptionalNonBlankString(field.unit, `unit for ${resource.name}.${field.name}`);
        validateMetadataObject(
          field.defaultSemantics,
          `default semantics for ${resource.name}.${field.name}`
        );
        validateMetadataObject(
          field.emptySemantics,
          `empty semantics for ${resource.name}.${field.name}`
        );
        validateOptionalBoolean(field.readable, `readable for ${resource.name}.${field.name}`);
        validateOptionalBoolean(field.writable, `writable for ${resource.name}.${field.name}`);
        validateOptionalNonBlankString(field.version, `version for ${resource.name}.${field.name}`);
        validateMetadataObject(
          field.compatibility,
          `compatibility for ${resource.name}.${field.name}`
        );
      }

      fieldsByResource.set(resource.name, fieldIdentities);

      for (const identityField of resource.identity?.fields ?? []) {
        validateResourceFieldReference(
          identityField,
          fieldIdentities,
          `resource identity for ${resource.name}`
        );
      }

      validateResourceInvariants(resource.invariants, resource.name);
      validateResourceFieldView(resource.readModel, fieldIdentities, `read model for ${resource.name}`);
      validateResourceFieldView(
        resource.derivedState,
        fieldIdentities,
        `derived state for ${resource.name}`
      );
    }
  }

  const operationsByName = new Map<string, SemanticOperationSource>();

  for (let domainIndex = 0; domainIndex < source.domains.length; domainIndex += 1) {
    const domain = source.domains[domainIndex];

    for (let operationIndex = 0; operationIndex < domain.operations.length; operationIndex += 1) {
      const operation = domain.operations[operationIndex];

      if (!OPERATION_KINDS.has(operation.kind)) {
        throw new Error(`invalid operation kind: ${operation.kind}`);
      }

      const resourceFields = fieldsByResource.get(operation.resource);
      if (resourceFields === undefined) {
        const message = `missing resource ${operation.resource} for operation ${operation.name}`;
        throwDiagnostic(
          validationContext,
          `/domains/${domainIndex}/operations/${operationIndex}/resource`,
          "operation",
          "SEM_OPERATION_RESOURCE_MISSING",
          message
        );
      }

      if (operation.kind === "MUTATION") {
        if (operation.mode === undefined || !MUTATION_MODES.has(operation.mode)) {
          throw new Error(`invalid operation mode for mutation: ${operation.mode ?? "missing"}`);
        }
      }

      if (operation.kind === "LIFECYCLE") {
        if (operation.mode === undefined || !LIFECYCLE_MODES.has(operation.mode)) {
          throw new Error(`invalid operation mode for lifecycle: ${operation.mode ?? "missing"}`);
        }
      }

      if (operation.kind === "QUERY" && operation.mode !== undefined) {
        throw new Error(`invalid operation mode for query: ${operation.mode}`);
      }

      if (operation.kind === "ACTION" && operation.mode !== undefined) {
        throw new Error(`invalid operation mode for action: ${operation.mode}`);
      }

      const selector = operation.inputProjection?.selector ?? [];
      const state = operation.inputProjection?.state ?? [];
      const methodLocal = operation.inputProjection?.methodLocal ?? [];
      const outputState = operation.outputProjection?.state ?? [];
      const projectionPath = `/domains/${domainIndex}/operations/${operationIndex}/inputProjection`;

      for (const selectorField of selector) {
        validateResourceFieldReference(
          selectorField,
          resourceFields,
          `selector projection for operation ${operation.name}`
        );
      }

      for (const stateField of state) {
        validateResourceFieldReference(
          stateField,
          resourceFields,
          `state projection for operation ${operation.name}`
        );
      }

      for (const outputField of outputState) {
        validateResourceFieldReference(
          outputField,
          resourceFields,
          `output projection for operation ${operation.name}`
        );
      }

      rejectProjectionCollision(
        operation.name,
        "selector",
        selector,
        "state",
        state,
        validationContext,
        projectionPath
      );
      rejectProjectionCollision(
        operation.name,
        "selector",
        selector,
        "methodLocal",
        methodLocal,
        validationContext,
        projectionPath
      );
      rejectProjectionCollision(
        operation.name,
        "state",
        state,
        "methodLocal",
        methodLocal,
        validationContext,
        projectionPath
      );

      operationsByName.set(operation.name, operation);
    }
  }

  validateProtocolBindingSemanticReferences(source, operationsByName, validationContext);
}

import type { SemanticSourceModel } from "./sourceModel.js";

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

function validateSemanticSourceStructure(
  source: SemanticSourceModel,
  validationContext: SemanticValidationContext | undefined
): void {
  const rawSource = source as unknown as Record<string, unknown>;
  validateRequiredArrayStructure(
    rawSource.valueTypes,
    validationContext,
    "/valueTypes",
    "SEM_STRUCTURE_VALUE_TYPES_ARRAY_REQUIRED"
  );

  for (let domainIndex = 0; domainIndex < source.domains.length; domainIndex += 1) {
    const domain = source.domains[domainIndex] as unknown as Record<string, unknown>;
    const resources = domain.resources;
    const resourcesPath = `/domains/${domainIndex}/resources`;
    validateRequiredArrayStructure(
      resources,
      validationContext,
      resourcesPath,
      "SEM_STRUCTURE_DOMAIN_RESOURCES_ARRAY_REQUIRED"
    );

    for (let resourceIndex = 0; resourceIndex < resources.length; resourceIndex += 1) {
      const resource = resources[resourceIndex] as Record<string, unknown>;
      const fieldsPath = `/domains/${domainIndex}/resources/${resourceIndex}/fields`;
      validateRequiredArrayStructure(
        resource.fields,
        validationContext,
        fieldsPath,
        "SEM_STRUCTURE_RESOURCE_FIELDS_ARRAY_REQUIRED"
      );
    }
  }
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
    }
  }
}

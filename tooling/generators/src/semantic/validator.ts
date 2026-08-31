import type { SemanticSourceModel } from "./sourceModel.js";

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

export function validateSemanticSource(source: SemanticSourceModel): void {
  if (!SOURCE_MODES.has(source.mode)) {
    throw new Error(`invalid semantic source mode: ${source.mode}`);
  }

  const valueTypes = new Set(source.valueTypes.map((valueType) => valueType.name));

  for (const valueType of source.valueTypes) {
    if (!FIELD_SHAPES.has(valueType.shape)) {
      throw new Error(`invalid field shape: ${valueType.shape}`);
    }
  }

  const resourceIdentities = new Set<string>();

  for (const domain of source.domains) {
    for (const resource of domain.resources) {
      if (!RESOURCE_LIFETIMES.has(resource.lifetime)) {
        throw new Error(`invalid resource lifetime: ${resource.lifetime}`);
      }

      if (resourceIdentities.has(resource.name)) {
        throw new Error(`duplicate resource identity: ${resource.name}`);
      }
      resourceIdentities.add(resource.name);

      const fieldIdentities = new Set<string>();
      for (const field of resource.fields) {
        if (fieldIdentities.has(field.name)) {
          throw new Error(`duplicate field identity in ${resource.name}: ${field.name}`);
        }
        fieldIdentities.add(field.name);

        if (!valueTypes.has(field.valueType)) {
          throw new Error(`unknown valueType ${field.valueType} for ${resource.name}.${field.name}`);
        }
      }
    }
  }

  for (const domain of source.domains) {
    for (const operation of domain.operations) {
      if (!OPERATION_KINDS.has(operation.kind)) {
        throw new Error(`invalid operation kind: ${operation.kind}`);
      }

      if (!resourceIdentities.has(operation.resource)) {
        throw new Error(`missing resource ${operation.resource} for operation ${operation.name}`);
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
    }
  }
}

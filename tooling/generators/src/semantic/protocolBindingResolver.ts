import type { Field, Method, Schema } from "../models.js";
import type {
  ResolvedSemanticField,
  ResolvedSemanticIR,
  ResolvedSemanticProtocolOperationBinding
} from "./resolvedModel.js";
import type {
  BaseProtocolSourceModel,
  ProtocolProjectionDelta,
  ResolvedProtocolFieldBinding,
  ResolvedProtocolOperationBinding,
  SemanticBindingRole,
  SemanticProtocolBindingDiagnostic
} from "./protocolProjectionModel.js";

type BindingCandidate = {
  binding: ResolvedSemanticProtocolOperationBinding;
  domain: string;
};

const ROLE_ORDER: Record<SemanticBindingRole, number> = {
  "request.selector": 0,
  "request.state": 1,
  "request.methodLocal": 2,
  "response.state": 3
};

function compareCandidates(left: BindingCandidate, right: BindingCandidate): number {
  const leftFile = left.binding.provenance.relativePath;
  const rightFile = right.binding.provenance.relativePath;
  return leftFile.localeCompare(rightFile)
    || left.domain.localeCompare(right.domain)
    || left.binding.operation.name.localeCompare(right.binding.operation.name)
    || left.binding.method.localeCompare(right.binding.method);
}

function compareResolvedFieldBindings(
  left: ResolvedProtocolFieldBinding,
  right: ResolvedProtocolFieldBinding
): number {
  return ROLE_ORDER[left.role] - ROLE_ORDER[right.role]
    || (left.semanticField?.name ?? left.methodLocal ?? "").localeCompare(
      right.semanticField?.name ?? right.methodLocal ?? ""
    )
    || left.protocolField.name.localeCompare(right.protocolField.name);
}

function failBinding(
  candidate: BindingCandidate,
  base: BaseProtocolSourceModel,
  code: string,
  message: string,
  protocolTarget = candidate.binding.method
): never {
  const diagnostic: SemanticProtocolBindingDiagnostic = {
    file: candidate.binding.provenance.relativePath,
    category: "protocol-binding",
    code,
    semanticOperation: candidate.binding.operation.name,
    protocolTarget,
    protocolSourceFiles: [...base.sourceFiles].sort(),
    message
  };
  const error = new Error(message) as Error & {
    diagnostic: SemanticProtocolBindingDiagnostic;
  };
  error.diagnostic = diagnostic;
  throw error;
}

function exactMethod(
  candidate: BindingCandidate,
  base: BaseProtocolSourceModel
): Method {
  const matches = base.methods.filter((item) => item.name === candidate.binding.method);
  if (matches.length === 0) {
    return failBinding(
      candidate,
      base,
      "SEM_PROTOCOL_METHOD_NOT_FOUND",
      `Protocol method target not found: ${candidate.binding.method}`
    );
  }
  if (matches.length !== 1) {
    return failBinding(
      candidate,
      base,
      "SEM_PROTOCOL_METHOD_AMBIGUOUS",
      `ambiguous Protocol method target: ${candidate.binding.method}`
    );
  }
  if (matches[0].status === "reserved") {
    return failBinding(
      candidate,
      base,
      "SEM_PROTOCOL_METHOD_NON_BEHAVIORAL",
      `Protocol method target is reserved and non-behavioral: ${candidate.binding.method}`
    );
  }
  return matches[0];
}

function exactSchema(
  candidate: BindingCandidate,
  base: BaseProtocolSourceModel,
  name: string,
  side: "request" | "response"
): Schema {
  const matches = base.schemas.filter((item) => item.name === name);
  if (matches.length === 0) {
    return failBinding(
      candidate,
      base,
      `SEM_PROTOCOL_${side.toUpperCase()}_SCHEMA_NOT_FOUND`,
      `Protocol ${side} schema not found: ${name}`,
      name
    );
  }
  if (matches.length !== 1) {
    return failBinding(
      candidate,
      base,
      `SEM_PROTOCOL_${side.toUpperCase()}_SCHEMA_AMBIGUOUS`,
      `ambiguous Protocol ${side} schema target: ${name}`,
      name
    );
  }
  return matches[0];
}

function exactField(
  candidate: BindingCandidate,
  base: BaseProtocolSourceModel,
  schema: Schema,
  fieldName: string,
  role: SemanticBindingRole
): Field {
  const matches = schema.fields.filter((item) => item.name === fieldName);
  if (matches.length === 0) {
    return failBinding(
      candidate,
      base,
      "SEM_PROTOCOL_FIELD_NOT_FOUND",
      `Protocol field target not found for ${role}: ${schema.name}.${fieldName}`,
      `${schema.name}.${fieldName}`
    );
  }
  if (matches.length !== 1) {
    return failBinding(
      candidate,
      base,
      "SEM_PROTOCOL_FIELD_AMBIGUOUS",
      `ambiguous Protocol field target for ${role}: ${schema.name}.${fieldName}`,
      `${schema.name}.${fieldName}`
    );
  }
  return matches[0];
}

function assertFieldProjectionComplete(
  candidate: BindingCandidate,
  base: BaseProtocolSourceModel,
  projected: readonly ResolvedSemanticField[],
  mapped: readonly { semanticField: ResolvedSemanticField }[],
  label: string
): void {
  const mappedFields = new Set(mapped.map((item) => item.semanticField));
  for (const field of projected) {
    if (!mappedFields.has(field)) {
      failBinding(
        candidate,
        base,
        "SEM_PROTOCOL_SEMANTIC_PROJECTION_UNMAPPED",
        `${label} semantic field is not mapped: ${field.name}`,
        candidate.binding.method
      );
    }
  }
  if (mappedFields.size !== projected.length) {
    failBinding(
      candidate,
      base,
      "SEM_PROTOCOL_SEMANTIC_PROJECTION_CARDINALITY",
      `${label} mapping cardinality does not match the semantic projection`,
      candidate.binding.method
    );
  }
}

function assertMethodLocalProjectionComplete(
  candidate: BindingCandidate,
  base: BaseProtocolSourceModel
): void {
  const projected = candidate.binding.operation.inputProjection?.methodLocal ?? [];
  const mapped = candidate.binding.request.methodLocal;
  const mappedNames = new Set(mapped.map((item) => item.methodLocal));
  for (const name of projected) {
    if (!mappedNames.has(name)) {
      failBinding(
        candidate,
        base,
        "SEM_PROTOCOL_METHOD_LOCAL_UNMAPPED",
        `request methodLocal is not mapped: ${name}`
      );
    }
  }
  if (mappedNames.size !== projected.length) {
    failBinding(
      candidate,
      base,
      "SEM_PROTOCOL_METHOD_LOCAL_CARDINALITY",
      "request methodLocal mapping cardinality does not match the semantic projection"
    );
  }
}

function resolveRequestBindings(
  candidate: BindingCandidate,
  base: BaseProtocolSourceModel,
  requestSchema: Schema
): ResolvedProtocolFieldBinding[] {
  const input = candidate.binding.operation.inputProjection;
  assertFieldProjectionComplete(
    candidate,
    base,
    input?.selector ?? [],
    candidate.binding.request.selector,
    "request selector"
  );
  assertFieldProjectionComplete(
    candidate,
    base,
    input?.state ?? [],
    candidate.binding.request.state,
    "request state"
  );
  assertMethodLocalProjectionComplete(candidate, base);

  const output: ResolvedProtocolFieldBinding[] = [];
  const usedFields = new Set<Field>();

  const addField = (
    role: SemanticBindingRole,
    protocolFieldName: string,
    semanticField?: ResolvedSemanticField,
    methodLocal?: string
  ): void => {
    const protocolField = exactField(candidate, base, requestSchema, protocolFieldName, role);
    if (usedFields.has(protocolField)) {
      failBinding(
        candidate,
        base,
        "SEM_PROTOCOL_REQUEST_FIELD_COLLISION",
        `Protocol request field collision: ${requestSchema.name}.${protocolField.name}`,
        `${requestSchema.name}.${protocolField.name}`
      );
    }
    usedFields.add(protocolField);
    output.push({
      role,
      semanticField,
      methodLocal,
      protocolSchema: requestSchema,
      protocolField
    });
  };

  for (const item of candidate.binding.request.selector) {
    addField("request.selector", item.protocolField, item.semanticField);
  }
  for (const item of candidate.binding.request.state) {
    addField("request.state", item.protocolField, item.semanticField);
  }
  for (const item of candidate.binding.request.methodLocal) {
    addField("request.methodLocal", item.protocolField, undefined, item.methodLocal);
  }

  for (const field of requestSchema.fields) {
    if (field.required && !usedFields.has(field)) {
      failBinding(
        candidate,
        base,
        "SEM_PROTOCOL_REQUIRED_REQUEST_FIELD_UNMAPPED",
        `required Protocol request field is not accounted for: ${requestSchema.name}.${field.name}`,
        `${requestSchema.name}.${field.name}`
      );
    }
  }

  return output.sort(compareResolvedFieldBindings);
}

function resolveResponseBindings(
  candidate: BindingCandidate,
  base: BaseProtocolSourceModel,
  responseSchema: Schema
): ResolvedProtocolFieldBinding[] {
  assertFieldProjectionComplete(
    candidate,
    base,
    candidate.binding.operation.outputProjection?.state ?? [],
    candidate.binding.response.state,
    "response output state"
  );

  const output: ResolvedProtocolFieldBinding[] = [];
  const usedFields = new Set<Field>();
  for (const item of candidate.binding.response.state) {
    const protocolField = exactField(
      candidate,
      base,
      responseSchema,
      item.protocolField,
      "response.state"
    );
    if (usedFields.has(protocolField)) {
      failBinding(
        candidate,
        base,
        "SEM_PROTOCOL_RESPONSE_FIELD_COLLISION",
        `Protocol response field collision: ${responseSchema.name}.${protocolField.name}`,
        `${responseSchema.name}.${protocolField.name}`
      );
    }
    usedFields.add(protocolField);
    output.push({
      role: "response.state",
      semanticField: item.semanticField,
      protocolSchema: responseSchema,
      protocolField
    });
  }

  return output.sort(compareResolvedFieldBindings);
}

function collectCandidates(semantic: ResolvedSemanticIR): BindingCandidate[] {
  const domainByOperation = new Map<object, string>();
  for (const source of semantic.sources) {
    for (const domain of source.domains) {
      for (const operation of domain.operations) {
        domainByOperation.set(operation, domain.name);
      }
    }
  }

  const candidates: BindingCandidate[] = [];
  for (const source of semantic.sources) {
    for (const binding of source.protocolBindings?.operations ?? []) {
      const domain = domainByOperation.get(binding.operation);
      if (domain === undefined) {
        throw new Error(
          `resolved semantic operation has no containing domain: ${binding.operation.name}`
        );
      }
      candidates.push({ binding, domain });
    }
  }
  return candidates.sort(compareCandidates);
}

export function resolveSemanticProtocolBindings(
  semantic: ResolvedSemanticIR,
  base: BaseProtocolSourceModel
): ProtocolProjectionDelta {
  const candidates = collectCandidates(semantic);
  const usedMethods = new Set<Method>();
  const usedOperations = new Set<object>();
  const operationBindings: ResolvedProtocolOperationBinding[] = [];

  for (const candidate of candidates) {
    if (usedOperations.has(candidate.binding.operation)) {
      failBinding(
        candidate,
        base,
        "SEM_PROTOCOL_OPERATION_DUPLICATE",
        `duplicate Protocol binding for semantic operation: ${candidate.binding.operation.name}`
      );
    }

    const protocolMethod = exactMethod(candidate, base);
    if (usedMethods.has(protocolMethod)) {
      failBinding(
        candidate,
        base,
        "SEM_PROTOCOL_METHOD_TARGET_DUPLICATE",
        `multiple semantic operations target the same Protocol method: ${protocolMethod.name}`
      );
    }

    if (protocolMethod.domain !== candidate.domain) {
      failBinding(
        candidate,
        base,
        "SEM_PROTOCOL_DOMAIN_MISMATCH",
        `semantic domain ${candidate.domain} does not match Protocol method domain ${protocolMethod.domain}`
      );
    }

    const requestSchema = exactSchema(candidate, base, protocolMethod.requestSchema, "request");
    const responseSchema = exactSchema(candidate, base, protocolMethod.responseSchema, "response");
    const request = resolveRequestBindings(candidate, base, requestSchema);
    const response = resolveResponseBindings(candidate, base, responseSchema);

    usedOperations.add(candidate.binding.operation);
    usedMethods.add(protocolMethod);
    operationBindings.push({
      semanticOperation: candidate.binding.operation,
      protocolMethod,
      requestSchema,
      responseSchema,
      request,
      response,
      semanticProvenance: candidate.binding.provenance,
      protocolSourceFile: base.sourceFiles.length === 1 ? base.sourceFiles[0] : undefined
    });
  }

  return {
    kind: "SEMANTIC_BINDING_OVERLAY",
    version: 1,
    operationBindings
  };
}

export type ProtocolStatus = "draft" | "experimental" | "mvp" | "stable" | "deprecated" | "reserved" | string;

export interface ProtocolMetadata {
  name: string;
  version: string;
  specVersion: number;
  registryVersion: string;
  status?: string;
}

export interface ProtocolOverview {
  title: string;
  summary: string;
  goals: string[];
  nonGoals: string[];
}

export interface ArchitectureLayer {
  name: string;
  description: string;
}

export interface LifecycleStep {
  step: string;
  from?: string;
  to?: string;
  status?: string;
  description: string;
}

export interface ProtocolArchitecture {
  layers: ArchitectureLayer[];
  lifecycle: LifecycleStep[];
  optionalLifecycleExtensions: LifecycleStep[];
}

export interface ProtocolGuide {
  quickStart: Array<{
    title: string;
    steps: string[];
  }>;
}

export interface WireDefinition {
  byteOrder: string;
  byteOrderAlias?: string;
  integerEncoding: string;
  crcByteOrder: string;
  scope?: string;
}

export interface StandardFrameHeaderField {
  name: string;
  offset: number;
  bytes: number;
  type: string;
}

export interface StandardFrameEffectiveParameter {
  openField: string;
  acceptOverrideField: string;
  fallback: string;
  formula?: string;
}

export interface StandardFrameContract {
  header: {
    size: number;
    magicBytes: number[];
    version: number;
    fields: StandardFrameHeaderField[];
  };
  footer: { size: number; field: string };
  overheadBytes: number;
  crc: { algorithm: string; coverage: string; excludesFooter: boolean; byteOrder: string };
  effectiveParameters: {
    maxFrameSize: StandardFrameEffectiveParameter;
    heartbeatIntervalMs: StandardFrameEffectiveParameter;
  };
  fragmentation: {
    sender: {
      fragmentedFrameCountMin: number;
      fragmentedFrameCountMax: number;
      frameIndexCoverage: string;
      emissionOrder: string;
      contiguousPerDirection: boolean;
      invariants: string[];
      over255Disposition: string;
    };
    reassemblyKey: string[];
    contextInvariants: string[];
    receiveOrder: string;
    payloadOrder: string;
    dispatch: string;
    duplicate: { identical: string; conflicting: string; diagnostic: string };
    messageId: { type: string; zeroReserved: boolean; allocationOwner: string; activeUniqueness: string; reuseAfter: string[] };
    missing: { trigger: string; diagnostic: string };
    timeout: { diagnostic: string; durationOwner: string };
    resources: { bounded: boolean; numericLimitsOwner: string; exhaustionDiagnostic: string; partialDispatch: boolean };
  };
  parser: {
    validateBeforeDispatch: string[];
    invalidDispatch: boolean;
    byteStream: { scanMagic: boolean; incompleteCandidate: string; recoverySearch: string; trailingMagicPrefixRetention: boolean };
    packet: { boundaryMayDiscardBadFrame: boolean; boundaryReplacesValidation: boolean };
    recoveryAggressivenessOwner: string;
  };
  diagnostics: string[];
  heartbeat: {
    activeAfter: string;
    sender: string;
    ack: { opcode: string; controlId: string; statusCode: string };
    outstandingControlIdUnique: boolean;
    allocatorOwner: string;
    cadenceSource: string;
    failureDeadlineOwner: string;
    schedulerOwner: string;
    reconnectOwner: string;
  };
}

export interface FrameProfile {
  name: string;
  magic?: string | number;
  l1: string;
  l2: string;
  supportsMixing?: boolean;
  contract?: StandardFrameContract;
}

export interface TransportProfile {
  name: string;
  family: string;
  mode?: string;
  frameProfile: string;
  production: boolean;
  maxFrameSize?: number;
  rpcEncodings?: string[];
  supportsControl?: boolean;
  supportsStream?: boolean;
  physicalClient?: string;
  physicalServer?: string;
  logicalClient?: string;
  logicalServer?: string;
  helloSender?: string;
  usage?: string;
  notes?: string;
}

export interface PayloadType {
  name: string;
  id: number;
  headerBytes: number;
  description: string;
  selectionRule?: string;
  headerFields?: Array<{
    name: string;
    type: string;
    bytes: number | string;
    description: string;
  }>;
}

export interface ControlDefinition {
  requiredOpcodes: string[];
  optionalOpcodes: string[];
  reservedOpcodes: string[];
  rules: string[];
}

export interface StreamDefinition {
  header: {
    name: string;
    size: number;
    fields: Array<{
      name: string;
      type: string;
    }>;
  };
  rules: string[];
}

export interface CompatibilityDefinition {
  legacySources: string[];
  rules: string[];
}

export interface SchemaField {
  fieldId: number;
  name: string;
  type: string;
  required: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  default?: unknown;
  deprecated?: boolean;
  derivedFrom?: string;
  schema?: string;
  enumValues?: string[];
  repeated?: boolean;
  array?: {
    itemType?: string;
    itemSchema?: string;
  };
  description?: string;
}

export interface SchemaDefinition {
  name: string;
  kind: string;
  description?: string;
  fields: SchemaField[];
}

/** @deprecated Use SchemaField */
export type TypeField = SchemaField;
/** @deprecated Use SchemaDefinition */
export type TypeDefinition = SchemaDefinition;

export interface MethodDefinition {
  name: string;
  description?: string;
  methodId: number;
  bitOffset: number;
  domain: string;
  since: string;
  status: ProtocolStatus;
  request: { type: string };
  response: { type: string };
  encodings: string[];
  capabilities: string[];
  events: string[];
  errors: string[];
  legacy?: Record<string, unknown>;
}

export interface EventDefinition {
  name: string;
  description?: string;
  eventId: number;
  bitOffset: number;
  domain: string;
  since: string;
  status: ProtocolStatus;
  payload: { type: string };
  severity?: string;
  trigger: string[];
  capabilities: string[];
}

export interface ErrorDefinition {
  name: string;
  code: number;
  category: string;
  since?: string;
  status: ProtocolStatus;
  severity: string;
  retryable: boolean;
  message: string;
}

export interface CapabilityDefinition {
  name: string;
  description?: string;
  capabilityId: number;
  domain: string;
  since?: string;
  status: ProtocolStatus;
  type: string;
  schema?: string;
}

export interface ProfileDefinition {
  name: string;
  since: string;
  status: ProtocolStatus;
  extends?: string;
  requiredMethods: string[];
  requiredEvents: string[];
  requiredTypes: string[];
  requiredErrors: string[];
  transportProfiles: string[];
  frameProfile?: string;
  frameProfiles: string[];
  notes?: string;
}

export interface WireExampleStep {
  direction: string;
  label: string;
  asciiLayout: string;
  hexBytes: string;
  fieldAnnotations: string[];
}

export interface WireExample {
  title: string;
  transport: string;
  frameProfile: string;
  description: string;
  steps: WireExampleStep[];
}

export interface ProtocolModel {
  specRoot: string;
  sourcePath: string;
  protocol: ProtocolMetadata;
  overview: ProtocolOverview;
  architecture: ProtocolArchitecture;
  guide: ProtocolGuide;
  wire: WireDefinition;
  frameProfiles: FrameProfile[];
  transports: TransportProfile[];
  payloadTypes: PayloadType[];
  control: ControlDefinition;
  stream: StreamDefinition;
  compatibility: CompatibilityDefinition;
  schemas: SchemaDefinition[];
  wireExamples: WireExample[];
  methods: MethodDefinition[];
  events: EventDefinition[];
  errors: ErrorDefinition[];
  capabilities: CapabilityDefinition[];
  profiles: ProfileDefinition[];
  raw: unknown;
}

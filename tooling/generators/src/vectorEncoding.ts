import { createHash } from "node:crypto";
import { GeneratorError } from "./errors.js";
import type { Field, Schema } from "./models.js";
import type { ProtocolSourceModel } from "./sourceModel.js";
import type {
  BitmapSelection,
  CurrentPayloadRecipe,
  CurrentVectorRecipe,
  JsonBinaryRequestPayloadRecipe
} from "./vectorRecipes.js";

export interface DerivedVector {
  name: string;
  bytes: Uint8Array;
  payloadType: string;
  encoding: string;
  hexFile: string;
  authorityRules: string[];
  recipe: string;
  derivation: "authority-resolved";
  wireDigest: string;
  expectDecode?: Record<string, unknown>;
  expectError?: string;
}

function fail(message: string, entry?: string, field?: string): never {
  throw new GeneratorError({
    code: "AXTP-GEN-1004",
    file: "contract/vector-recipes/current-core.yaml",
    entry,
    field,
    message
  });
}

function asInteger(value: unknown, label: string, max: number, entry?: string): number {
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > max) {
    fail(`${label} must be an integer in 0..${max}`, entry, label);
  }
  return Number(value);
}

function byName<T extends { name: string; id: number }>(items: T[], name: string, label: string, entry?: string): T {
  const item = items.find((candidate) => candidate.name === name);
  if (!item) fail(`unknown ${label}: ${name}`, entry, label);
  return item;
}

function schemaByName(source: ProtocolSourceModel, name: string, entry?: string): Schema {
  const schema = source.schemas.find((candidate) => candidate.name === name);
  if (!schema) fail(`unknown schema: ${name}`, entry, "schema");
  return schema;
}

function fieldByName(schema: Schema, name: string, entry?: string): Field {
  const field = schema.fields.find((candidate) => candidate.name === name);
  if (!field) fail(`unknown field ${schema.name}.${name}`, entry, name);
  return field;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function uint(value: number | bigint, bytes: 1 | 2 | 4 | 8, entry?: string, field?: string): Uint8Array {
  const numeric = typeof value === "bigint" ? value : BigInt(value);
  const max = (1n << BigInt(bytes * 8)) - 1n;
  if (numeric < 0n || numeric > max) fail(`${field ?? "value"} does not fit uint${bytes * 8}`, entry, field);
  const out = new Uint8Array(bytes);
  let current = numeric;
  for (let index = bytes - 1; index >= 0; index -= 1) {
    out[index] = Number(current & 0xffn);
    current >>= 8n;
  }
  return out;
}

function int(value: number, bytes: 1 | 2 | 4 | 8, entry?: string, field?: string): Uint8Array {
  if (!Number.isInteger(value)) fail(`${field ?? "value"} must be an integer`, entry, field);
  const bits = BigInt(bytes * 8);
  const min = -(1n << (bits - 1n));
  const max = (1n << (bits - 1n)) - 1n;
  let numeric = BigInt(value);
  if (numeric < min || numeric > max) fail(`${field ?? "value"} does not fit int${bytes * 8}`, entry, field);
  if (numeric < 0n) numeric = (1n << bits) + numeric;
  return uint(numeric, bytes, entry, field);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isBitmapSelection(value: unknown): value is BitmapSelection {
  return isObject(value) &&
    (value.bitmapFrom === "payloadTypes" || value.bitmapFrom === "rpcEncodings") &&
    Array.isArray(value.names) && value.names.every((name) => typeof name === "string");
}

function encodeBitmap(source: ProtocolSourceModel, selection: BitmapSelection, entry: string, field: string): Uint8Array {
  const registry = selection.bitmapFrom === "payloadTypes" ? source.payloadTypes : source.rpcEncodings;
  let mask = 0;
  for (const name of selection.names) {
    const id = byName(registry, name, selection.bitmapFrom, entry).id;
    if (!Number.isInteger(id) || id < 1 || id > 8) {
      fail(`${selection.bitmapFrom} bitmap seed encoder only supports IDs 1..8; got ${name}=${id}`, entry, field);
    }
    mask |= 1 << (id - 1);
  }
  return Uint8Array.of(mask);
}

function encodeScalar(source: ProtocolSourceModel, field: Field, value: unknown, entry: string): Uint8Array {
  switch (field.type) {
    case "bool":
      if (typeof value !== "boolean") fail(`${field.name} must be boolean`, entry, field.name);
      return Uint8Array.of(value ? 1 : 0);
    case "uint8": return uint(asInteger(value, field.name, 0xff, entry), 1, entry, field.name);
    case "uint16": return uint(asInteger(value, field.name, 0xffff, entry), 2, entry, field.name);
    case "uint32": return uint(asInteger(value, field.name, 0xffffffff, entry), 4, entry, field.name);
    case "uint64": {
      if ((typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) && typeof value !== "bigint") {
        fail(`${field.name} must be a non-negative safe integer or bigint`, entry, field.name);
      }
      return uint(value as number | bigint, 8, entry, field.name);
    }
    case "int8": return int(Number(value), 1, entry, field.name);
    case "int16": return int(Number(value), 2, entry, field.name);
    case "int32": return int(Number(value), 4, entry, field.name);
    case "int64": return int(Number(value), 8, entry, field.name);
    case "string": {
      if (typeof value !== "string") fail(`${field.name} must be string`, entry, field.name);
      return new TextEncoder().encode(value);
    }
    case "bytes": {
      if (typeof value !== "string" || !/^(?:[0-9A-Fa-f]{2})*$/.test(value)) fail(`${field.name} bytes seed value must be hex`, entry, field.name);
      return Uint8Array.from(Buffer.from(value, "hex"));
    }
    case "bitmap":
      if (!isBitmapSelection(value)) fail(`${field.name} must use a named bitmap selection`, entry, field.name);
      return encodeBitmap(source, value, entry, field.name);
    case "array":
    case "enum":
      fail(`${field.type} TLV encoding is intentionally unsupported by the G4 seed encoder`, entry, field.name);
    default: {
      const nested = source.schemas.find((candidate) => candidate.name === field.type);
      if (!nested) fail(`unsupported TLV field type ${field.type} for ${field.name}`, entry, field.name);
      if (!isObject(value)) fail(`${field.name} must be an object for schema ${field.type}`, entry, field.name);
      return encodeTlv8Object(source, nested.name, value, entry);
    }
  }
}

export function encodeTlv8Object(
  source: ProtocolSourceModel,
  schemaName: string,
  values: Record<string, unknown>,
  entry = schemaName
): Uint8Array {
  const schema = schemaByName(source, schemaName, entry);
  if (schema.type !== "object") fail(`TLV8 seed encoder requires object schema: ${schemaName}`, entry, "schema");
  for (const field of schema.fields) {
    if (field.required && !Object.hasOwn(values, field.name)) fail(`missing required field ${schemaName}.${field.name}`, entry, field.name);
  }
  for (const name of Object.keys(values)) fieldByName(schema, name, entry);

  const selected = Object.keys(values)
    .map((name) => fieldByName(schema, name, entry))
    .sort((a, b) => a.id - b.id);
  const parts: Uint8Array[] = [];
  for (const field of selected) {
    if (field.id < 1 || field.id > 0xfe) fail(`TLV8 field id out of range: ${schemaName}.${field.name}=${field.id}`, entry, field.name);
    const encoded = encodeScalar(source, field, values[field.name], entry);
    if (encoded.length > 0xfe) fail(`TLV8 value too large: ${schemaName}.${field.name}`, entry, field.name);
    parts.push(Uint8Array.of(field.id, encoded.length), encoded);
  }
  return concat(parts);
}

export function crc16CcittFalse(bytes: Uint8Array): number {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

function encodeControl(source: ProtocolSourceModel, payload: Extract<CurrentPayloadRecipe, { kind: "control" }>, entry: string): Uint8Array {
  const opcode = byName(source.controlOpcodes, payload.opcode, "CONTROL opcode", entry).id;
  const status = byName(source.errors, payload.status, "error/status", entry).id;
  const body = encodeTlv8Object(source, payload.body.schema, payload.body.values, entry);
  return concat([
    uint(opcode, 1, entry, "opcode"),
    uint(payload.controlId, 2, entry, "controlId"),
    uint(status, 2, entry, "status"),
    body
  ]);
}

function encodeJsonBinaryRequest(source: ProtocolSourceModel, payload: JsonBinaryRequestPayloadRecipe, entry: string): Uint8Array {
  const encoding = byName(source.rpcEncodings, payload.rpcEncoding ?? "JSON_BINARY", "RPC encoding", entry).id;
  const rpcOp = byName(source.rpcOps, payload.rpcOp ?? "REQUEST", "RPC op", entry).id;
  const method = byName(source.methods, payload.method, "method", entry);
  const status = byName(source.errors, payload.status ?? "SUCCESS", "error/status", entry).id;
  const bodyEncoding = byName(source.rpcBodyEncodings, payload.bodyEncoding, "RPC body encoding", entry).id;
  let body = new Uint8Array();
  if (payload.bodyEncoding === "NONE") {
    if (payload.body && Object.keys(payload.body).length > 0) fail("NONE bodyEncoding cannot carry a body", entry, "payload.body");
  } else if (payload.bodyEncoding === "TLV8") {
    body = encodeTlv8Object(source, method.requestSchema, payload.body ?? {}, entry);
  } else {
    fail(`unsupported JSON_BINARY bodyEncoding in G4 seed encoder: ${payload.bodyEncoding}`, entry, "payload.bodyEncoding");
  }
  return concat([
    uint(encoding, 1, entry, "rpcEncoding"),
    uint(rpcOp, 1, entry, "rpcOp"),
    uint(payload.sid, 4, entry, "sid"),
    uint(payload.requestId, 4, entry, "requestId"),
    uint(method.id, 2, entry, "methodId"),
    uint(status, 2, entry, "statusCode"),
    uint(bodyEncoding, 1, entry, "bodyEncoding"),
    body
  ]);
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableJsonValue(value[key])]));
}

function encodeJsonEvent(source: ProtocolSourceModel, payload: Extract<CurrentPayloadRecipe, { kind: "json-event" }>, entry: string): Uint8Array {
  const encoding = byName(source.rpcEncodings, payload.rpcEncoding ?? "JSON", "RPC encoding", entry).id;
  const rpcOp = byName(source.rpcOps, payload.rpcOp ?? "EVENT", "RPC op", entry).id;
  const event = byName(source.events, payload.event, "event", entry);
  const envelope = stableJsonValue({
    sid: payload.sid,
    op: rpcOp,
    d: {
      event: event.name,
      data: payload.data
    }
  });
  return concat([uint(encoding, 1, entry, "rpcEncoding"), new TextEncoder().encode(JSON.stringify(envelope))]);
}

function encodeStream(payload: Extract<CurrentPayloadRecipe, { kind: "stream" }>, entry: string): Uint8Array {
  if (!/^(?:[0-9A-Fa-f]{2})*$/.test(payload.dataHex)) fail("stream dataHex must contain whole hex bytes", entry, "payload.dataHex");
  return concat([
    uint(payload.streamId, 4, entry, "streamId"),
    uint(payload.seqId, 4, entry, "seqId"),
    uint(payload.cursor, 8, entry, "cursor"),
    Uint8Array.from(Buffer.from(payload.dataHex, "hex"))
  ]);
}

function encodePayload(source: ProtocolSourceModel, payload: CurrentPayloadRecipe, entry: string): { bytes: Uint8Array; encoding: string } {
  switch (payload.kind) {
    case "control": return { bytes: encodeControl(source, payload, entry), encoding: "tlv" };
    case "json-binary-request": return { bytes: encodeJsonBinaryRequest(source, payload, entry), encoding: "json-binary" };
    case "json-event": return { bytes: encodeJsonEvent(source, payload, entry), encoding: "json" };
    case "stream": return { bytes: encodeStream(payload, entry), encoding: "binary" };
  }
}

function standardFrameMetadata(source: ProtocolSourceModel, entry: string): { magic: Uint8Array; version: number } {
  const meta = source.protocolMeta as any;
  if (meta?.wire?.byteOrder !== "big-endian") fail("G4 v1 vector encoder requires wire.byteOrder=big-endian", entry, "wire.byteOrder");
  if (meta?.wire?.crcByteOrder !== "big-endian") fail("G4 v1 vector encoder requires wire.crcByteOrder=big-endian", entry, "wire.crcByteOrder");
  const frameProfile = Array.isArray(meta?.frameProfiles)
    ? meta.frameProfiles.find((profile: any) => profile?.name === "STANDARD_FRAME")
    : undefined;
  if (!frameProfile || typeof frameProfile.magic !== "string" || new TextEncoder().encode(frameProfile.magic).length !== 2) {
    fail("STANDARD_FRAME.magic must be a two-byte string", entry, "frameProfiles.STANDARD_FRAME.magic");
  }
  const version = asInteger(meta?.protocol?.specVersion, "protocol.specVersion", 0xff, entry);
  return { magic: new TextEncoder().encode(frameProfile.magic), version };
}

function wrapStandardFrame(source: ProtocolSourceModel, recipe: CurrentVectorRecipe, payload: Uint8Array): Uint8Array {
  const entry = recipe.id;
  const { magic, version } = standardFrameMetadata(source, entry);
  const payloadType = byName(source.payloadTypes, recipe.frame.payloadType, "payload type", entry).id;
  if (payload.length > 0xffff) fail("payload is too large for Standard Frame uint16 PayloadLength", entry, "payloadLength");
  const header = concat([
    magic,
    uint(version, 1, entry, "version"),
    uint(payloadType, 1, entry, "payloadType"),
    uint(payload.length, 2, entry, "payloadLength"),
    uint(asInteger(recipe.frame.sourceId, "sourceId", 0xff, entry), 1, entry, "sourceId"),
    uint(asInteger(recipe.frame.destinationId, "destinationId", 0xff, entry), 1, entry, "destinationId"),
    uint(asInteger(recipe.frame.messageId, "messageId", 0xffff, entry), 2, entry, "messageId"),
    uint(asInteger(recipe.frame.frameIndex, "frameIndex", 0xff, entry), 1, entry, "frameIndex"),
    uint(asInteger(recipe.frame.frameCount, "frameCount", 0xff, entry), 1, entry, "frameCount")
  ]);
  if (header.length !== 12) fail(`internal Standard Frame header size mismatch: ${header.length}`, entry, "frame");
  const withoutCrc = concat([header, payload]);
  const crc = crc16CcittFalse(withoutCrc);
  return concat([withoutCrc, uint(crc, 2, entry, "crc16")]);
}

function digest(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function deriveCurrentVector(source: ProtocolSourceModel, recipe: CurrentVectorRecipe): DerivedVector {
  const payload = encodePayload(source, recipe.payload, recipe.id);
  const bytes = wrapStandardFrame(source, recipe, payload.bytes);
  return {
    name: recipe.id,
    bytes,
    payloadType: recipe.frame.payloadType,
    encoding: payload.encoding,
    hexFile: recipe.hexFile,
    authorityRules: [...recipe.authorityRules],
    recipe: `contract/vector-recipes/current-core.yaml#${recipe.id}`,
    derivation: "authority-resolved",
    wireDigest: digest(bytes),
    expectDecode: recipe.expectDecode,
    expectError: recipe.expectError
  };
}

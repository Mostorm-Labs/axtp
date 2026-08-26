import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { GeneratorError } from "./errors.js";

export type HistoricalClassification = "historical-stale" | "historical-compatibility";

export interface VectorFrameRecipe {
  payloadType: string;
  sourceId: number;
  destinationId: number;
  messageId: number;
  frameIndex: number;
  frameCount: number;
}

export interface BitmapSelection {
  bitmapFrom: "payloadTypes" | "rpcEncodings";
  names: string[];
}

export type RecipeValue = unknown;

export interface ControlPayloadRecipe {
  kind: "control";
  opcode: string;
  controlId: number;
  status: string;
  body: {
    schema: string;
    values: Record<string, RecipeValue>;
  };
}

export interface JsonBinaryRequestPayloadRecipe {
  kind: "json-binary-request";
  rpcEncoding?: string;
  rpcOp?: string;
  sid: number;
  requestId: number;
  method: string;
  status?: string;
  bodyEncoding: string;
  body?: Record<string, RecipeValue>;
}

export interface JsonEventPayloadRecipe {
  kind: "json-event";
  rpcEncoding?: string;
  rpcOp?: string;
  sid: string;
  event: string;
  data: Record<string, unknown>;
}

export interface StreamPayloadRecipe {
  kind: "stream";
  streamId: number;
  seqId: number;
  cursor: number;
  dataHex: string;
}

export type CurrentPayloadRecipe =
  | ControlPayloadRecipe
  | JsonBinaryRequestPayloadRecipe
  | JsonEventPayloadRecipe
  | StreamPayloadRecipe;

export interface CurrentVectorRecipe {
  id: string;
  classification: "current-core";
  authorityRules: string[];
  hexFile: string;
  profile: "standard-framed";
  frame: VectorFrameRecipe;
  payload: CurrentPayloadRecipe;
  expectDecode?: Record<string, unknown>;
  expectError?: string;
}

export interface HistoricalVectorRecipe {
  id: string;
  classification: HistoricalClassification;
  reason: string;
  originalHexFile?: string;
  outputPath: string;
  historicalHex: string;
  payloadType?: string;
  encoding?: string;
  expectDecode?: Record<string, unknown>;
  expectError?: string;
}

export interface VectorRecipeCatalog {
  schemaVersion: 1;
  currentCore: CurrentVectorRecipe[];
  historical: HistoricalVectorRecipe[];
}

const CURRENT_FORBIDDEN_HEX_KEYS = new Set(["hex", "historicalHex", "finalHex", "wireHex", "expectedHex"]);
const CURRENT_PAYLOAD_KINDS = new Set(["control", "json-binary-request", "json-event", "stream"]);

function fail(message: string, entry?: string, field?: string): never {
  throw new GeneratorError({
    code: "AXTP-GEN-1004",
    file: "contract/vector-recipes",
    entry,
    field,
    message
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expectString(value: unknown, label: string, entry?: string): string {
  if (typeof value !== "string" || value.trim() === "") fail(`${label} must be a non-empty string`, entry, label);
  return value;
}

function expectInteger(value: unknown, label: string, entry?: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) fail(`${label} must be a non-negative integer`, entry, label);
  return Number(value);
}

function expectHex(value: unknown, label: string, entry?: string): string {
  const text = expectString(value, label, entry);
  if (!/^(?:[0-9A-Fa-f]{2})+$/.test(text)) fail(`${label} must contain an even number of hex bytes`, entry, label);
  return text.toUpperCase();
}

function visitForbiddenCurrentHex(value: unknown, pathLabel: string, entry: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitForbiddenCurrentHex(item, `${pathLabel}[${index}]`, entry));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (CURRENT_FORBIDDEN_HEX_KEYS.has(key)) fail(`current-core recipe must not author final hex via ${pathLabel}.${key}`, entry, key);
    visitForbiddenCurrentHex(child, `${pathLabel}.${key}`, entry);
  }
}

function validateFrame(frame: unknown, entry: string): void {
  if (!isObject(frame)) fail("current-core frame must be an object", entry, "frame");
  expectString(frame.payloadType, "frame.payloadType", entry);
  for (const field of ["sourceId", "destinationId", "messageId", "frameIndex", "frameCount"] as const) {
    expectInteger(frame[field], `frame.${field}`, entry);
  }
  if (Number(frame.frameCount) < 1) fail("frame.frameCount must be >= 1", entry, "frame.frameCount");
  if (Number(frame.frameIndex) >= Number(frame.frameCount)) fail("frame.frameIndex must be < frame.frameCount", entry, "frame.frameIndex");
}

function validateCurrent(recipe: unknown): asserts recipe is CurrentVectorRecipe {
  if (!isObject(recipe)) fail("current-core recipe must be an object");
  const id = expectString(recipe.id, "id");
  if (recipe.classification !== "current-core") fail("current-core recipe classification must be current-core", id, "classification");
  expectString(recipe.hexFile, "hexFile", id);
  if (recipe.profile !== "standard-framed") fail("current-core profile must be standard-framed", id, "profile");
  if (!Array.isArray(recipe.authorityRules) || recipe.authorityRules.length === 0 || recipe.authorityRules.some((rule) => typeof rule !== "string" || rule.trim() === "")) {
    fail("current-core authorityRules must contain at least one Rule ID", id, "authorityRules");
  }
  if (new Set(recipe.authorityRules as string[]).size !== (recipe.authorityRules as string[]).length) fail("current-core authorityRules must be unique", id, "authorityRules");
  validateFrame(recipe.frame, id);
  if (!isObject(recipe.payload)) fail("current-core payload must be an object", id, "payload");
  if (!CURRENT_PAYLOAD_KINDS.has(String(recipe.payload.kind))) fail(`unsupported current-core payload kind: ${String(recipe.payload.kind)}`, id, "payload.kind");
  visitForbiddenCurrentHex(recipe, "recipe", id);
}

function validateHistorical(recipe: unknown): asserts recipe is HistoricalVectorRecipe {
  if (!isObject(recipe)) fail("historical recipe must be an object");
  const id = expectString(recipe.id, "id");
  if (recipe.classification !== "historical-stale" && recipe.classification !== "historical-compatibility") {
    fail("historical classification must be historical-stale or historical-compatibility", id, "classification");
  }
  expectString(recipe.reason, "reason", id);
  const outputPath = expectString(recipe.outputPath, "outputPath", id).replaceAll("\\", "/");
  if (!outputPath.startsWith("historical/")) fail("historical outputPath must stay under historical/", id, "outputPath");
  expectHex(recipe.historicalHex, "historicalHex", id);
}

export function validateVectorRecipeCatalog(value: VectorRecipeCatalog): void {
  if (!isObject(value)) fail("vector recipe catalog must be an object");
  if (value.schemaVersion !== 1) fail("vector recipe schemaVersion must be 1", undefined, "schemaVersion");
  if (!Array.isArray(value.currentCore)) fail("currentCore must be an array", undefined, "currentCore");
  if (!Array.isArray(value.historical)) fail("historical must be an array", undefined, "historical");

  const ids = new Set<string>();
  const outputPaths = new Set<string>();
  for (const recipe of value.currentCore) {
    validateCurrent(recipe);
    if (ids.has(recipe.id)) fail(`duplicate vector id: ${recipe.id}`, recipe.id, "id");
    ids.add(recipe.id);
    const output = recipe.hexFile.replaceAll("\\", "/");
    if (output.includes("/") || output === "manifest.json") fail("current-core hexFile must be a top-level file name", recipe.id, "hexFile");
    if (outputPaths.has(output)) fail(`duplicate vector output path: ${output}`, recipe.id, "hexFile");
    outputPaths.add(output);
  }
  for (const recipe of value.historical) {
    validateHistorical(recipe);
    if (ids.has(recipe.id)) fail(`duplicate vector id: ${recipe.id}`, recipe.id, "id");
    ids.add(recipe.id);
    const output = recipe.outputPath.replaceAll("\\", "/");
    if (outputPaths.has(output)) fail(`duplicate vector output path: ${output}`, recipe.id, "outputPath");
    outputPaths.add(output);
  }
}

async function readYaml(file: string): Promise<Record<string, unknown>> {
  try {
    return (YAML.parse(await readFile(file, "utf8")) ?? {}) as Record<string, unknown>;
  } catch (error) {
    throw new GeneratorError({
      code: "AXTP-GEN-1001",
      file,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function loadVectorRecipeCatalog(specRoot: string): Promise<VectorRecipeCatalog> {
  const dir = path.join(specRoot, "contract", "vector-recipes");
  const currentPath = path.join(dir, "current-core.yaml");
  const historicalPath = path.join(dir, "historical.yaml");
  const [current, historical] = await Promise.all([readYaml(currentPath), readYaml(historicalPath)]);
  if (current.schemaVersion !== 1 || historical.schemaVersion !== 1) fail("both vector recipe source files must use schemaVersion 1");
  const catalog = {
    schemaVersion: 1,
    currentCore: Array.isArray(current.currentCore) ? current.currentCore : [],
    historical: Array.isArray(historical.historical) ? historical.historical : []
  } as VectorRecipeCatalog;
  validateVectorRecipeCatalog(catalog);
  return catalog;
}

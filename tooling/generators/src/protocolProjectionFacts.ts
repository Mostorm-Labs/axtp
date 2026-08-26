import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { GeneratorError } from "./errors.js";

export interface ProtocolProjectionFacts {
  standardFrameHeaderBytes: number;
  rpcOps: Record<string, number>;
}

const REQUIRED_RPC_OPS = [
  "HELLO",
  "IDENTIFY",
  "IDENTIFIED",
  "EVENT",
  "REQUEST",
  "REQUEST_RESPONSE"
] as const;

function fail(message: string, file?: string): never {
  throw new GeneratorError({
    code: "AXTP-GEN-1004",
    file,
    message
  });
}

function numericId(value: unknown, label: string, file: string): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 0) fail(`${label} must be a non-negative integer`, file);
  return parsed;
}

export function deriveStandardFrameHeaderBytes(coreSpec: string, file = "specs/20-core.md"): number {
  const heading = "## Standard Frame 标准帧";
  const start = coreSpec.indexOf(heading);
  if (start < 0) fail(`missing normative heading: ${heading}`, file);

  const nextHeading = coreSpec.indexOf("\n## ", start + heading.length);
  const section = coreSpec.slice(start, nextHeading < 0 ? undefined : nextHeading);
  const rowPattern = /^\|\s*`[^`]+`\s*\|\s*(\d+)\s*\|\s*(\d+)B\s*\|/gm;
  const boundaries: number[] = [];
  for (const match of section.matchAll(rowPattern)) {
    boundaries.push(Number(match[1]) + Number(match[2]));
  }
  if (boundaries.length === 0) fail("Standard Frame header table has no numeric offset/size rows", file);

  const headerBytes = Math.max(...boundaries);
  if (!Number.isInteger(headerBytes) || headerBytes <= 0) fail("derived Standard Frame header size is invalid", file);
  return headerBytes;
}

export function deriveRpcOpFacts(document: unknown, file = "contract/registry/core/rpc_op.yaml"): Record<string, number> {
  const entries = (document as { rpc_ops?: unknown })?.rpc_ops;
  if (!Array.isArray(entries)) fail("rpc_ops must be an array", file);

  const result: Record<string, number> = {};
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const name = (entry as { name?: unknown }).name;
    if (typeof name !== "string" || name.length === 0) continue;
    if (Object.hasOwn(result, name)) fail(`duplicate rpc op name: ${name}`, file);
    result[name] = numericId((entry as { id?: unknown }).id, `rpc op ${name} id`, file);
  }

  for (const name of REQUIRED_RPC_OPS) {
    if (!Object.hasOwn(result, name)) fail(`missing required rpc op: ${name}`, file);
  }
  return result;
}

export async function loadProtocolProjectionFacts(specRoot: string): Promise<ProtocolProjectionFacts> {
  const rpcPath = path.join(specRoot, "contract", "registry", "core", "rpc_op.yaml");
  const coreSpecPath = path.join(specRoot, "specs", "20-core.md");
  let rpcText: string;
  let coreSpec: string;
  try {
    [rpcText, coreSpec] = await Promise.all([
      readFile(rpcPath, "utf8"),
      readFile(coreSpecPath, "utf8")
    ]);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  let rpcDocument: unknown;
  try {
    rpcDocument = YAML.parse(rpcText);
  } catch (error) {
    fail(`failed to parse rpc_op.yaml: ${error instanceof Error ? error.message : String(error)}`, rpcPath);
  }

  return {
    standardFrameHeaderBytes: deriveStandardFrameHeaderBytes(coreSpec, coreSpecPath),
    rpcOps: deriveRpcOpFacts(rpcDocument, rpcPath)
  };
}

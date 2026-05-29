import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { GeneratorError } from "./errors.js";
import { loadSpec } from "./loader.js";
import type { ProtocolSourceModel } from "./sourceModel.js";

async function loadYamlFile(filePath: string): Promise<any> {
  try {
    const text = await readFile(filePath, "utf8");
    return YAML.parse(text) ?? {};
  } catch (error) {
    throw new GeneratorError({
      code: "AXTP-GEN-1001",
      file: filePath,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function listYamlFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listYamlFiles(fullPath));
    if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) files.push(fullPath);
  }
  return files.sort();
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

export async function loadProtocolSources(specRoot: string): Promise<ProtocolSourceModel> {
  const spec = await loadSpec(specRoot);
  const protocolMetaPath = path.join(specRoot, "registry", "core", "protocol_meta.yaml");
  const protocolMeta = await loadYamlFile(protocolMetaPath);
  const domainFiles = await listYamlFiles(path.join(specRoot, "domains"));
  const sourceFiles = [protocolMetaPath, ...domainFiles];
  const profiles: Array<Record<string, unknown>> = [];

  for (const file of domainFiles) {
    const doc = await loadYamlFile(file);
    spec.methods.push(...asArray(doc.methods).map((item) => ({
      id: Number(item.id),
      bitOffset: Number(item.bit_offset ?? item.bitOffset),
      name: String(item.name),
      domain: String(item.domain ?? doc.domain),
      status: item.status ?? "draft",
      description: item.description,
      since: item.since,
      deprecated: Boolean(item.deprecated),
      rpcOp: item.rpc_op ?? item.rpcOp ?? "request_response",
      requestSchema: item.request_schema ?? item.requestSchema,
      responseSchema: item.response_schema ?? item.responseSchema,
      recommendedEncoding: asArray(item.recommended_encoding ?? item.recommendedEncoding).map(String),
      capabilities: asArray(item.capabilities).map(String),
      events: asArray(item.events).map(String),
      errors: asArray(item.errors).map(String),
      legacy: item.legacy
    })));
    spec.events.push(...asArray(doc.events).map((item) => ({
      id: Number(item.id),
      bitOffset: Number(item.bit_offset ?? item.bitOffset),
      name: String(item.name),
      domain: String(item.domain ?? doc.domain),
      status: item.status ?? "draft",
      description: item.description,
      since: item.since,
      deprecated: Boolean(item.deprecated),
      eventSchema: item.event_schema ?? item.eventSchema,
      severity: item.severity,
      trigger: asArray(item.trigger).map(String),
      capabilities: asArray(item.capabilities).map(String)
    })));
    profiles.push(...asArray(doc.profiles));
  }

  return { ...spec, protocolMeta, sourceFiles, profiles };
}

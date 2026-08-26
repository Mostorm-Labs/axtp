import path from "node:path";
import { rm } from "node:fs/promises";
import type { ProtocolSourceModel } from "../sourceModel.js";
import { deriveCurrentVector } from "../vectorEncoding.js";
import { toJsonStable, writeTextFile } from "../util.js";

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex").toUpperCase();
}

export async function emitTestVectors(source: ProtocolSourceModel, outDir: string): Promise<void> {
  await emitTestVectorFiles(source, path.join(outDir, "test_vectors"));
}

export async function emitTestVectorFiles(source: ProtocolSourceModel, dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });

  const derived = source.vectorRecipes.currentCore.map((recipe) => deriveCurrentVector(source, recipe));
  const vectors = derived.map((vector) => ({
    name: vector.name,
    classification: "current-core",
    authorityRules: vector.authorityRules,
    recipe: vector.recipe,
    derivation: vector.derivation,
    payloadType: vector.payloadType,
    encoding: vector.encoding,
    hexFile: vector.hexFile,
    wireDigest: vector.wireDigest,
    ...(vector.expectDecode ? { expectDecode: vector.expectDecode } : {}),
    ...(vector.expectError ? { expectError: vector.expectError } : {})
  }));

  const historicalFixtures = source.vectorRecipes.historical.map((fixture) => ({
    name: fixture.id,
    classification: fixture.classification,
    reason: fixture.reason,
    recipe: `contract/vector-recipes/historical.yaml#${fixture.id}`,
    derivation: "preserved-historical",
    ...(fixture.originalHexFile ? { originalHexFile: fixture.originalHexFile } : {}),
    hexFile: fixture.outputPath,
    ...(fixture.payloadType ? { payloadType: fixture.payloadType } : {}),
    ...(fixture.encoding ? { encoding: fixture.encoding } : {}),
    ...(fixture.expectDecode ? { expectDecode: fixture.expectDecode } : {}),
    ...(fixture.expectError ? { expectError: fixture.expectError } : {})
  }));

  await Promise.all([
    writeTextFile(path.join(dir, "manifest.json"), toJsonStable({ vectors, historicalFixtures })),
    ...derived.map((vector) => writeTextFile(path.join(dir, vector.hexFile), bytesToHex(vector.bytes))),
    ...source.vectorRecipes.historical.map((fixture) => writeTextFile(path.join(dir, fixture.outputPath), fixture.historicalHex.toUpperCase()))
  ]);
}

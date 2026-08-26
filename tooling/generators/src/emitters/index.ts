import path from "node:path";
import { emitCpp } from "./cpp.js";
import { emitDart } from "./dart.js";
import { emitJson } from "./json.js";
import { emitJsonFiles } from "./json.js";
import { emitMarkdown } from "./markdown.js";
import { emitMarkdownFiles } from "./markdown.js";
import { emitProtocolJson } from "./protocolJson.js";
import { emitProtocolMarkdown } from "./protocolMarkdown.js";
import { emitTestVectors } from "./testVectors.js";
import { emitTestVectorFiles } from "./testVectors.js";
import { emitTs } from "./ts.js";
import type { ProtocolModel } from "../protocolModel.js";
import type { ProtocolSourceModel } from "../sourceModel.js";

export async function emitAll(spec: ProtocolSourceModel, outDir: string): Promise<void> {
  await Promise.all([
    emitCpp(spec, outDir),
    emitDart(spec, outDir),
    emitJson(spec, outDir),
    emitMarkdown(spec, outDir),
    emitTestVectors(spec, outDir),
    emitTs(spec, outDir)
  ]);
}

export { emitMarkdown, emitMarkdownFiles, emitTestVectors, emitTestVectorFiles };

export async function emitProtocolDocs(model: ProtocolModel, outDir: string): Promise<void> {
  await Promise.all([
    emitProtocolJson(model, outDir),
    emitProtocolMarkdown(model, outDir)
  ]);
}

export async function emitRepositoryArtifacts(spec: ProtocolSourceModel, model: ProtocolModel, repoRoot: string): Promise<void> {
  await Promise.all([
    emitProtocolDocs(model, path.join(repoRoot, "contract", "generated")),
    emitRepositoryRegistryArtifacts(spec, repoRoot)
  ]);
}

export async function emitRepositoryRegistryArtifacts(spec: ProtocolSourceModel, repoRoot: string): Promise<void> {
  await Promise.all([
    emitMarkdownFiles(spec, path.join(repoRoot, "contract", "generated")),
    emitJsonFiles(spec, path.join(repoRoot, "contract", "mcp")),
    emitTestVectorFiles(spec, path.join(repoRoot, "contract", "test-vectors"))
  ]);
}

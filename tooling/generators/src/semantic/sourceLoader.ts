import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type { SemanticSourceModel } from "./sourceModel.js";

export interface LoadedSemanticSource {
  relativePath: string;
  source: SemanticSourceModel;
}

async function listYamlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listYamlFiles(fullPath));
    } else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function relativePath(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}

export async function loadSemanticSources(root: string): Promise<LoadedSemanticSource[]> {
  const files = (await listYamlFiles(root))
    .map((file) => ({ file, relativePath: relativePath(root, file) }))
    .sort((left, right) => left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0);

  const loaded: LoadedSemanticSource[] = [];
  for (const entry of files) {
    const text = await readFile(entry.file, "utf8");
    try {
      loaded.push({
        relativePath: entry.relativePath,
        source: YAML.parse(text) as SemanticSourceModel
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`failed to parse YAML source ${entry.relativePath}: ${message}`);
    }
  }

  return loaded;
}

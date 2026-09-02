import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SemanticDescriptorBundleV01 } from "./descriptorModel.js";

type DescriptorEmitterModule = {
  serializeSemanticDescriptor?: (descriptor: SemanticDescriptorBundleV01) => string;
  writeSemanticDescriptor?: (
    descriptor: SemanticDescriptorBundleV01,
    outputPath: string
  ) => Promise<void>;
};

const roots: string[] = [];

async function emitter(): Promise<DescriptorEmitterModule> {
  const modulePath = "./descriptorEmitter.js";
  return await import(modulePath).catch(() => ({}));
}

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "axtp-semantic-descriptor-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("semantic descriptor emitter", () => {
  it("serializes canonical JSON bytes with LF and one trailing newline", async () => {
    const loaded = await emitter();
    expect(typeof loaded.serializeSemanticDescriptor).toBe("function");

    const bytes = loaded.serializeSemanticDescriptor!({
      descriptorVersion: "0.1",
      sources: []
    });

    expect(bytes).toBe([
      "{",
      '  "descriptorVersion": "0.1",',
      '  "sources": []',
      "}",
      ""
    ].join("\n"));
    expect(bytes.startsWith("\uFEFF")).toBe(false);
    expect(bytes.includes("\r")).toBe(false);
    expect(loaded.serializeSemanticDescriptor!({ descriptorVersion: "0.1", sources: [] }))
      .toBe(bytes);
  });

  it("atomically writes the exact canonical bytes and leaves no temp file", async () => {
    const loaded = await emitter();
    expect(typeof loaded.writeSemanticDescriptor).toBe("function");

    const root = await tempRoot();
    const outputPath = path.join(root, "nested", "semantic.json");
    await loaded.writeSemanticDescriptor!(
      { descriptorVersion: "0.1", sources: [] },
      outputPath
    );

    expect(await readFile(outputPath, "utf8")).toBe(
      loaded.serializeSemanticDescriptor!({ descriptorVersion: "0.1", sources: [] })
    );
    expect(await readdir(path.dirname(outputPath))).toEqual(["semantic.json"]);
  });

  it("preserves the previous target when serialization fails before replacement", async () => {
    const loaded = await emitter();
    expect(typeof loaded.writeSemanticDescriptor).toBe("function");

    const root = await tempRoot();
    const outputPath = path.join(root, "semantic.json");
    await writeFile(outputPath, "previous-canonical-bytes\n", "utf8");

    const invalid = {
      descriptorVersion: "0.1",
      sources: [BigInt(1)]
    } as unknown as SemanticDescriptorBundleV01;

    await expect(loaded.writeSemanticDescriptor!(invalid, outputPath)).rejects.toThrow();
    expect(await readFile(outputPath, "utf8")).toBe("previous-canonical-bytes\n");
    expect(await readdir(root)).toEqual(["semantic.json"]);
  });

  it("preserves the previous target when temporary-file creation fails", async () => {
    vi.resetModules();
    const loaded = await import("./descriptorEmitter.js");

    const root = await tempRoot();
    const outputPath = path.join(root, "semantic.json");
    const temporaryPath = path.join(root, `.semantic.json.${process.pid}.1.tmp`);
    await writeFile(outputPath, "previous-canonical-bytes\n", "utf8");
    await writeFile(temporaryPath, "occupied-temp-path\n", "utf8");

    await expect(loaded.writeSemanticDescriptor(
      { descriptorVersion: "0.1", sources: [] },
      outputPath
    )).rejects.toThrow();

    expect(await readFile(outputPath, "utf8")).toBe("previous-canonical-bytes\n");
    expect(await readdir(root)).toEqual(["semantic.json"]);
  });

  it("cleans temporary state when atomic replacement fails", async () => {
    const loaded = await emitter();
    expect(typeof loaded.writeSemanticDescriptor).toBe("function");

    const root = await tempRoot();
    const outputPath = path.join(root, "semantic.json");
    await mkdir(outputPath);

    await expect(loaded.writeSemanticDescriptor!(
      { descriptorVersion: "0.1", sources: [] },
      outputPath
    )).rejects.toThrow();

    expect(await readdir(root)).toEqual(["semantic.json"]);
    expect(await readdir(outputPath)).toEqual([]);
  });
});

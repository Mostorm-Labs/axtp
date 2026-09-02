import { mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import type { SemanticDescriptorBundleV01 } from "./descriptorModel.js";

let temporarySequence = 0;

export function serializeSemanticDescriptor(
  descriptor: SemanticDescriptorBundleV01
): string {
  return `${JSON.stringify(descriptor, null, 2)}\n`;
}

export async function writeSemanticDescriptor(
  descriptor: SemanticDescriptorBundleV01,
  outputPath: string
): Promise<void> {
  const bytes = serializeSemanticDescriptor(descriptor);
  const directory = path.dirname(outputPath);
  const basename = path.basename(outputPath);
  const temporaryPath = path.join(
    directory,
    `.${basename}.${process.pid}.${++temporarySequence}.tmp`
  );

  await mkdir(directory, { recursive: true });

  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(temporaryPath, "wx");
    await handle.writeFile(bytes, "utf8");
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, outputPath);
  } catch (error) {
    if (handle !== undefined) {
      await handle.close().catch(() => undefined);
    }
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

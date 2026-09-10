import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildReferenceBundle, canonicalJson } from "./semanticLifecycleEvidenceCore.js";

export function materializeReferenceEvidence(): void {
  const outputDirectory = required("OUTPUT_DIRECTORY");
  const bundle = buildReferenceBundle({
    resultRevision: required("RESULT_REVISION"),
    resultTree: required("RESULT_TREE"),
    platform: required("PLATFORM_LABEL"),
    runner: process.env.RUNNER_NAME ?? required("PLATFORM_LABEL"),
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    job: process.env.EVIDENCE_JOB ?? process.env.GITHUB_JOB,
    artifactName: process.env.EVIDENCE_ARTIFACT_NAME,
    artifactUrl: process.env.EVIDENCE_ARTIFACT_URL
  });
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, "reference-bundle.json"), `${canonicalJson(bundle)}\n`, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) materializeReferenceEvidence();

function required(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`MISSING_${name}`);
  return value;
}

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const REPOSITORY_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COMMIT_RE = /^[0-9a-f]{40}$/i;
const SPEC_TAG_RE = /^spec\/v\d+\.\d+\.\d+$/;
const IMPLEMENTATION_VERSION_RE = /^v\d+\.\d+\.\d+\.\d+$/;
const RUN_URL_RE = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/runs\/\d+(?:\/.*)?$/;
const KINDS = new Set(["runtime", "sdk", "tool", "mock"]);
const STATUSES = new Set(["unverified", "in-progress", "pass", "fail", "stale"]);

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function validDateTime(value) {
  if (!nonEmptyString(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && /T/.test(value);
}

export function validateConsumerEvidenceDocument(value) {
  const errors = [];
  const fail = (message) => errors.push(message);

  if (!object(value)) return ["consumer evidence document must be an object"];
  if (value.schemaVersion !== 1) fail("schemaVersion must be 1");
  if (!Array.isArray(value.consumers)) return [...errors, "consumers must be an array"];

  const seen = new Set();
  for (const [index, consumer] of value.consumers.entries()) {
    const label = `consumers[${index}]`;
    if (!object(consumer)) {
      fail(`${label} must be an object`);
      continue;
    }
    if (!nonEmptyString(consumer.repository) || !REPOSITORY_RE.test(consumer.repository)) {
      fail(`${label}.repository must use owner/name form`);
    } else if (seen.has(consumer.repository)) {
      fail(`duplicate consumer repository: ${consumer.repository}`);
    } else {
      seen.add(consumer.repository);
    }
    if (!KINDS.has(consumer.kind)) fail(`${label}.kind is invalid: ${consumer.kind}`);
    if (!STATUSES.has(consumer.adoptionStatus)) fail(`${label}.adoptionStatus is invalid: ${consumer.adoptionStatus}`);

    if (consumer.adoptionStatus !== "pass") continue;

    const missing = [];
    if (!object(consumer.specLock)) missing.push("specLock");
    if (!object(consumer.implementation)) missing.push("implementation");
    if (!Array.isArray(consumer.declaredProfiles) || consumer.declaredProfiles.length === 0) missing.push("declaredProfiles");
    if (!object(consumer.conformance)) missing.push("conformance");
    if (!nonEmptyString(consumer.verifiedAt)) missing.push("verifiedAt");
    if (missing.length > 0) {
      fail(`${label} pass requires exact evidence: ${missing.join(", ")}`);
      continue;
    }

    if (!SPEC_TAG_RE.test(consumer.specLock.tag ?? "")) fail(`${label}.specLock.tag must be spec/vX.Y.Z`);
    if (!COMMIT_RE.test(consumer.specLock.commit ?? "")) fail(`${label}.specLock.commit must be a 40-hex commit`);
    if (!IMPLEMENTATION_VERSION_RE.test(consumer.implementation.version ?? "")) fail(`${label}.implementation.version must be vX.Y.Z.R`);
    if (!COMMIT_RE.test(consumer.implementation.commit ?? "")) fail(`${label}.implementation.commit must be a 40-hex commit`);
    if (!consumer.declaredProfiles.every(nonEmptyString)) fail(`${label}.declaredProfiles must contain non-empty strings`);
    if (consumer.conformance.status !== "pass") fail(`${label}.conformance.status must be pass when adoptionStatus is pass`);

    const run = consumer.conformance.run;
    if (!object(run)) {
      fail(`${label}.conformance.run is required for pass`);
    } else {
      if (!REPOSITORY_RE.test(run.repository ?? "")) fail(`${label}.conformance.run.repository must use owner/name form`);
      if (!Number.isInteger(run.id) || run.id <= 0) fail(`${label}.conformance.run.id must be a positive integer`);
      if (!RUN_URL_RE.test(run.url ?? "")) fail(`${label}.conformance.run.url must be an exact GitHub Actions run URL`);
      if (!COMMIT_RE.test(run.commit ?? "")) fail(`${label}.conformance.run.commit must be a 40-hex commit`);
    }
    if (!validDateTime(consumer.verifiedAt)) fail(`${label}.verifiedAt must be an RFC3339/ISO date-time`);
  }

  return errors;
}

export async function runConsumerEvidenceValidation(root = process.cwd()) {
  const requireFromGenerators = createRequire(path.join(root, "tooling", "generators", "package.json"));
  const YAML = requireFromGenerators("yaml");
  const Ajv2020Module = requireFromGenerators("ajv/dist/2020");
  const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;
  const dir = path.join(root, "docs", "governance", "consumer-evidence");
  const schema = JSON.parse(fs.readFileSync(path.join(dir, "schema.json"), "utf8"));
  const value = YAML.parse(fs.readFileSync(path.join(dir, "ledger.yaml"), "utf8"));
  const ajv = new Ajv2020({ allErrors: true });
  const validate = ajv.compile(schema);
  const errors = [];
  if (!validate(value)) {
    for (const error of validate.errors ?? []) errors.push(`${error.instancePath || "/"} ${error.message}`);
  }
  errors.push(...validateConsumerEvidenceDocument(value));
  if (errors.length > 0) return { ok: false, errors, count: Array.isArray(value?.consumers) ? value.consumers.length : 0 };
  return { ok: true, errors: [], count: value.consumers.length };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] ?? process.cwd());
  try {
    const result = await runConsumerEvidenceValidation(root);
    if (!result.ok) {
      for (const error of result.errors) console.error(`[FAIL] ${error}`);
      process.exitCode = 1;
    } else {
      console.log(`[OK] consumer evidence: ${result.count} consumers`);
    }
  } catch (error) {
    console.error(`[FAIL] consumer evidence validator: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

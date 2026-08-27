#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(process.argv[2] ?? process.cwd());
const framingDir = path.join(root, "conformance", "framing");
const requireFromGenerators = createRequire(path.join(root, "tooling", "generators", "package.json"));
const YAML = requireFromGenerators("yaml");
const Ajv2020Module = requireFromGenerators("ajv/dist/2020");
const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;
const errors = [];

const fail = (message) => errors.push(message);
const readYaml = (file) => YAML.parse(fs.readFileSync(file, "utf8"), { merge: true });
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const rel = (file) => path.relative(root, file);

function walkYaml(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkYaml(full));
    else if (entry.isFile() && entry.name.endsWith(".yaml")) out.push(full);
  }
  return out.sort();
}

function validateWith(schemaFile, value, label) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(readJson(schemaFile));
  if (!validate(value)) {
    for (const error of validate.errors ?? []) fail(`${label}${error.instancePath || "/"} ${error.message}`);
  }
}

function hexBytes(hex, label) {
  if (typeof hex !== "string" || !/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    fail(`${label} must be even-length hexadecimal`);
    return Buffer.alloc(0);
  }
  return Buffer.from(hex, "hex");
}

function crc16CcittFalse(bytes) {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

const requiredPaths = [
  "manifest.yaml",
  "state-oracle.yaml",
  "virtual-time.yaml",
  "schemas/frame-verification-manifest.schema.json",
  "schemas/raw-frame-corpus.schema.json",
  "schemas/state-oracle.schema.json",
  "schemas/virtual-time.schema.json",
  "schemas/frame-conformance-case.schema.json",
  "corpus/raw-frames.yaml"
].map((item) => path.join(framingDir, item));
for (const file of requiredPaths) if (!fs.existsSync(file)) fail(`missing ${rel(file)}`);

if (errors.length === 0) {
  const manifest = readYaml(path.join(framingDir, "manifest.yaml"));
  const stateOracle = readYaml(path.join(framingDir, "state-oracle.yaml"));
  const virtualTime = readYaml(path.join(framingDir, "virtual-time.yaml"));
  const corpus = readYaml(path.join(framingDir, "corpus", "raw-frames.yaml"));

  validateWith(path.join(framingDir, "schemas", "frame-verification-manifest.schema.json"), manifest, "manifest");
  validateWith(path.join(framingDir, "schemas", "state-oracle.schema.json"), stateOracle, "state-oracle");
  validateWith(path.join(framingDir, "schemas", "virtual-time.schema.json"), virtualTime, "virtual-time");
  validateWith(path.join(framingDir, "schemas", "raw-frame-corpus.schema.json"), corpus, "raw-frame-corpus");

  const expectedDecisions = Array.from({ length: 10 }, (_, index) => `A1-D${String(index + 1).padStart(2, "0")}`);
  const requiredDecisions = new Set(manifest.required_decisions ?? []);
  for (const decision of expectedDecisions) if (!requiredDecisions.has(decision)) fail(`manifest missing required decision ${decision}`);
  if (requiredDecisions.size !== expectedDecisions.length) fail("manifest.required_decisions must contain exactly A1-D01..A1-D10");

  const frameIds = new Set();
  for (const frame of corpus.frames ?? []) {
    if (frameIds.has(frame.id)) fail(`duplicate raw frame id ${frame.id}`);
    frameIds.add(frame.id);
    const bytes = hexBytes(frame.hex, `frame ${frame.id}.hex`);
    if (bytes.length !== frame.total_bytes) fail(`frame ${frame.id} total_bytes=${frame.total_bytes} but hex has ${bytes.length} bytes`);
    if (bytes.length >= 14) {
      const declaredPayload = bytes.readUInt16BE(4);
      const declaredTotal = declaredPayload + 14;
      if (frame.length_relation === "exact" && declaredTotal !== bytes.length) fail(`frame ${frame.id} declared total ${declaredTotal} != actual ${bytes.length}`);
      if (frame.length_relation === "mismatch" && declaredTotal === bytes.length) fail(`frame ${frame.id} must exercise a length mismatch`);
      if (frame.expected_crc !== "unchecked") {
        const footer = bytes.readUInt16BE(bytes.length - 2);
        const computed = crc16CcittFalse(bytes.subarray(0, bytes.length - 2));
        if (frame.expected_crc === "valid" && footer !== computed) fail(`frame ${frame.id} expected valid CRC, got footer=0x${footer.toString(16)} computed=0x${computed.toString(16)}`);
        if (frame.expected_crc === "invalid" && footer === computed) fail(`frame ${frame.id} expected invalid CRC but CRC is valid`);
      }
    }
  }

  const streamIds = new Set();
  for (const stream of corpus.streams ?? []) {
    if (streamIds.has(stream.id) || frameIds.has(stream.id)) fail(`duplicate corpus id ${stream.id}`);
    streamIds.add(stream.id);
    for (const [index, chunk] of (stream.chunks ?? []).entries()) hexBytes(chunk, `stream ${stream.id}.chunks[${index}]`);
  }
  const corpusIds = new Set([...frameIds, ...streamIds]);

  const policyDeadlines = new Set();
  for (const deadline of virtualTime.policy_deadlines ?? []) {
    if (policyDeadlines.has(deadline.id)) fail(`duplicate virtual-time policy deadline ${deadline.id}`);
    policyDeadlines.add(deadline.id);
    if (deadline.owner === "runtime_or_profile" && deadline.numeric_equality !== false) fail(`runtime-owned deadline ${deadline.id} must declare numeric_equality: false`);
  }

  const caseFiles = walkYaml(path.join(framingDir, "cases"));
  const caseIds = new Set();
  const decisionCoverage = new Set();
  const caseSchema = path.join(framingDir, "schemas", "frame-conformance-case.schema.json");
  for (const file of caseFiles) {
    const value = readYaml(file);
    validateWith(caseSchema, value, `${rel(file)} `);
    if (caseIds.has(value.id)) fail(`duplicate frame conformance case id ${value.id}`);
    caseIds.add(value.id);
    for (const decision of value.authority_decisions ?? []) {
      if (!requiredDecisions.has(decision)) fail(`${value.id} references non-P23 decision ${decision}`);
      decisionCoverage.add(decision);
    }
    for (const [index, step] of (value.steps ?? []).entries()) {
      if (step.corpus && !corpusIds.has(step.corpus)) fail(`${value.id}.steps[${index}] references missing corpus ${step.corpus}`);
      if (step.to_policy_deadline && !policyDeadlines.has(step.to_policy_deadline)) fail(`${value.id}.steps[${index}] references missing policy deadline ${step.to_policy_deadline}`);
      if (step.when_capability && !(manifest.adapter_capabilities?.optional ?? []).includes(step.when_capability) && !(manifest.adapter_capabilities?.core_required ?? []).includes(step.when_capability)) {
        fail(`${value.id}.steps[${index}] uses undeclared capability ${step.when_capability}`);
      }
    }
  }

  for (const id of manifest.required_cases ?? []) if (!caseIds.has(id)) fail(`manifest references missing frame case ${id}`);
  for (const id of caseIds) if (!(manifest.required_cases ?? []).includes(id)) fail(`frame case ${id} is not listed in manifest.required_cases`);
  for (const decision of expectedDecisions) if (!decisionCoverage.has(decision)) fail(`no frame conformance case covers ${decision}`);

  const oracleEvents = new Set((stateOracle.observable_events ?? []).map((event) => event.id));
  for (const required of ["effective_params", "dispatch", "control_emission", "context_outcome", "local_reject", "diagnostic", "policy_probe"]) {
    if (!oracleEvents.has(required)) fail(`state oracle missing observable event ${required}`);
  }

  if (errors.length === 0) {
    console.log(`[OK] A1 frame verification design: decisions=${expectedDecisions.length}, cases=${caseIds.size}, frames=${frameIds.size}, streams=${streamIds.size}`);
  }
}

if (errors.length > 0) {
  console.error("[FAIL] A1 frame verification design invalid");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

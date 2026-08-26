#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? process.cwd());
const generatedPath = path.join(root, "contract", "generated", "protocol.json");
const domainStatusPath = path.join(root, "docs", "product", "domain-status.md");
const protocolDraftRoot = path.join(root, "workspace", "protocol");
const proposalTemplatePath = path.join(
  root,
  "tooling",
  "skills",
  "20-draft-business-protocol",
  "references",
  "protocol-draft-template.md",
);
const errors = [];

function fail(message) {
  errors.push(message);
}

function walkProtocolDrafts(dir) {
  const out = [];
  for (const domain of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    const domainDir = path.join(dir, domain.name);
    for (const entry of fs.readdirSync(domainDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".md")) out.push(path.join(domainDir, entry.name));
    }
  }
  return out.sort();
}

function parseFlatFrontmatterBlock(block) {
  const data = {};
  for (const line of block.trim().split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (match) data[match[1]] = match[2].trim();
  }
  return data;
}

function readFrontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.startsWith("---\n")) return { text, data: {} };
  const end = text.indexOf("\n---", 4);
  if (end < 0) return { text, data: {} };
  return { text, data: parseFlatFrontmatterBlock(text.slice(4, end)) };
}

function boolValue(value) {
  return value === "true" ? true : value === "false" ? false : undefined;
}

function validateProposalTemplate() {
  const relative = path.relative(root, proposalTemplatePath).replaceAll(path.sep, "/");
  const text = fs.readFileSync(proposalTemplatePath, "utf8");
  const match = /````markdown\s*\n---\n([\s\S]*?)\n---/.exec(text);
  if (!match) {
    fail(`${relative}: cannot find template proposal frontmatter`);
    return;
  }

  const data = parseFlatFrontmatterBlock(match[1]);
  const expected = {
    authorityClass: "proposal",
    lifecycle: "captured",
    protocolStability: "draft",
  };

  for (const [key, value] of Object.entries(expected)) {
    if (data[key] !== value) fail(`${relative}: template ${key} must be ${value}`);
  }
  if (!data.domain || !data.feature || data.lastReviewed !== "YYYY-MM-DD") {
    fail(`${relative}: template must include domain, feature, and lastReviewed placeholders`);
  }
  if (data.adoptedBy === undefined) {
    fail(`${relative}: template must include empty adoptedBy for pre-adoption proposals`);
  }
  for (const legacyKey of ["status", "contract", "generated", "registry"]) {
    if (data[legacyKey] !== undefined) {
      fail(`${relative}: template must not emit legacy proposal metadata field ${legacyKey}`);
    }
  }
}

function isCanonicalRegistryPath(value) {
  return /^contract\/registry\/.+\.ya?ml$/.test(value);
}

function validateAdoptedBy(relative, data) {
  if (!data.adoptedBy) {
    fail(`${relative}: accepted proposal must declare adoptedBy primary canonical authority`);
    return;
  }
  if (!isCanonicalRegistryPath(data.adoptedBy)) {
    fail(`${relative}: adoptedBy must be one scalar contract/registry/**/*.yaml path`);
    return;
  }
  if (!fs.existsSync(path.join(root, data.adoptedBy))) {
    fail(`${relative}: adoptedBy target does not exist: ${data.adoptedBy}`);
  }
}

const allowedLifecycles = new Set(["captured", "reviewing", "accepted", "superseded", "archived"]);
const allowedProtocolStability = new Set(["draft", "experimental", "stable", "deprecated", "reserved"]);

validateProposalTemplate();

const generated = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
const generatedFeatures = new Set();
const generatedCounts = new Map();
const draftCounts = new Map();

function addDomainCount(domain) {
  generatedCounts.set(domain, (generatedCounts.get(domain) ?? 0) + 1);
}

for (const method of generated.methods ?? []) {
  addDomainCount(method.domain);
  for (const capability of method.capabilities ?? []) generatedFeatures.add(capability);
}
for (const event of generated.events ?? []) {
  addDomainCount(event.domain);
  for (const capability of event.capabilities ?? []) generatedFeatures.add(capability);
}

for (const file of walkProtocolDrafts(protocolDraftRoot)) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  const { text, data } = readFrontmatter(file);
  const domain = data.domain || path.relative(protocolDraftRoot, file).split(path.sep)[0];
  draftCounts.set(domain, (draftCounts.get(domain) ?? 0) + 1);

  const isV2 =
    data.authorityClass !== undefined ||
    data.lifecycle !== undefined ||
    data.protocolStability !== undefined ||
    data.adoptedBy !== undefined;
  const isGenerated = generatedFeatures.has(data.feature);

  if (isV2) {
    if (!data.authorityClass || !data.lifecycle || !data.protocolStability || !data.domain || !data.feature || !data.lastReviewed) {
      fail(`${relative}: incomplete proposal authority metadata v2`);
      continue;
    }
    if (data.authorityClass !== "proposal") {
      fail(`${relative}: workspace/protocol authorityClass must be proposal`);
    }
    if (!allowedLifecycles.has(data.lifecycle)) {
      fail(`${relative}: invalid proposal lifecycle ${data.lifecycle}`);
    }
    if (!allowedProtocolStability.has(data.protocolStability)) {
      fail(`${relative}: invalid protocolStability ${data.protocolStability}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.lastReviewed)) {
      fail(`${relative}: lastReviewed must use YYYY-MM-DD`);
    }
    for (const legacyKey of ["status", "contract", "generated", "registry"]) {
      if (data[legacyKey] !== undefined) {
        fail(`${relative}: proposal authority metadata v2 must not mix legacy ${legacyKey} field`);
      }
    }

    if (data.lifecycle === "accepted") validateAdoptedBy(relative, data);

    if (isGenerated) {
      if (data.lifecycle !== "accepted") {
        fail(`${relative}: generated feature ${data.feature} must use lifecycle accepted`);
      }
      if (/是否可直接实现\s*\|\s*是/.test(text)) {
        fail(`${relative}: accepted proposal must not claim it is directly implementable`);
      }
      if (/当前 generated 协议没有 adopted/.test(text)) {
        fail(`${relative}: accepted proposal still says the feature is not adopted`);
      }
    } else if (data.lifecycle === "accepted") {
      fail(`${relative}: lifecycle accepted but ${data.feature} is not present in contract/generated/protocol.json`);
    }
    continue;
  }

  // Transitional G1 compatibility: non-adopted legacy proposal metadata remains readable
  // until the historical proposal corpus is migrated. Legacy metadata may never claim
  // runtime authority and any generated/adopted feature must migrate to v2 immediately.
  if (!data.status || data.contract === undefined || data.generated === undefined || !data.feature) {
    fail(`${relative}: missing required protocol frontmatter`);
    continue;
  }
  if (boolValue(data.contract) === true) {
    fail(`${relative}: workspace proposal must not claim contract: true; migrate to proposal authority metadata v2`);
  }
  if (boolValue(data.generated) === true || data.status === "generated" || isGenerated) {
    fail(`${relative}: adopted/generated feature ${data.feature} must migrate to proposal authority metadata v2`);
  }
}

const domainStatus = fs.readFileSync(domainStatusPath, "utf8");
if (/最后更新：\s*\d{4}-\d{2}-\d{2}/.test(domainStatus)) {
  fail("docs/product/domain-status.md: remove manual Last update dates; Drafts and Generated counts are script-checked");
}
if (!/草案数和已生成数量由 `tooling\/scripts\/check-protocol-status\.mjs` 校验/.test(domainStatus)) {
  fail("docs/product/domain-status.md: missing script-checked count policy");
}

const matrixRows = Array.from(domainStatus.matchAll(/^\|\s*([a-z][a-z0-9]*)\s*\|\s*(\d+)\s*\|\s*[^|]*\|\s*(\d+)\s*\|/gm));
if (matrixRows.length === 0) {
  fail("docs/product/domain-status.md: Domain matrix has no parseable rows");
}
const matrixDomains = new Set();
for (const match of matrixRows) {
  const domain = match[1];
  matrixDomains.add(domain);
  const documentedDrafts = Number(match[2]);
  const documentedGenerated = Number(match[3]);
  const actualDrafts = draftCounts.get(domain) ?? 0;
  const actualGenerated = generatedCounts.get(domain) ?? 0;
  if (documentedDrafts !== actualDrafts) {
    fail(`docs/product/domain-status.md: Domain matrix draft count for ${domain} is ${documentedDrafts}, expected ${actualDrafts}`);
  }
  if (documentedGenerated !== actualGenerated) {
    fail(`docs/product/domain-status.md: Domain matrix generated count for ${domain} is ${documentedGenerated}, expected ${actualGenerated}`);
  }
}

for (const domain of new Set([...draftCounts.keys(), ...generatedCounts.keys()])) {
  if (!matrixDomains.has(domain)) {
    fail(`docs/product/domain-status.md: Domain matrix is missing ${domain}`);
  }
}

if (errors.length > 0) {
  console.error("[FAIL] protocol status consistency check failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("[OK] proposal authoring source, authority metadata, and product domain matrix are consistent");

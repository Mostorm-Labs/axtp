#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? process.cwd());
const generatedPath = path.join(root, "contract", "generated", "protocol.json");
const domainStatusPath = path.join(root, "docs", "product", "domain-status.md");
const protocolDraftRoot = path.join(root, "workspace", "protocol");
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

function readFrontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.startsWith("---\n")) return { text, data: {} };
  const end = text.indexOf("\n---", 4);
  if (end < 0) return { text, data: {} };
  const block = text.slice(4, end).trim().split(/\r?\n/);
  const data = {};
  for (const line of block) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (match) data[match[1]] = match[2].trim();
  }
  return { text, data };
}

function boolValue(value) {
  return value === "true" ? true : value === "false" ? false : undefined;
}

const allowedLifecycles = new Set(["captured", "reviewing", "accepted", "superseded", "archived"]);
const allowedProtocolStability = new Set(["draft", "experimental", "stable", "deprecated", "reserved"]);

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
  const relative = path.relative(root, file);
  const { text, data } = readFrontmatter(file);
  const domain = data.domain || path.relative(protocolDraftRoot, file).split(path.sep)[0];
  draftCounts.set(domain, (draftCounts.get(domain) ?? 0) + 1);

  const isV2 = data.authorityClass !== undefined || data.lifecycle !== undefined || data.protocolStability !== undefined || data.adoptedBy !== undefined;
  const isGenerated = generatedFeatures.has(data.feature);

  if (isV2) {
    if (!data.authorityClass || !data.lifecycle || !data.protocolStability || !data.feature) {
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
    if (data.contract !== undefined || data.generated !== undefined || data.status !== undefined || data.registry !== undefined) {
      fail(`${relative}: proposal authority metadata v2 must not mix legacy status/contract/generated/registry fields`);
    }

    if (isGenerated) {
      if (data.lifecycle !== "accepted") {
        fail(`${relative}: generated feature ${data.feature} must use lifecycle accepted`);
      }
      if (!data.adoptedBy) {
        fail(`${relative}: accepted feature ${data.feature} must declare adoptedBy canonical authority`);
      }
      if (/当前 generated 协议没有 adopted/.test(text)) {
        fail(`${relative}: accepted proposal still says the feature is not adopted`);
      }
    } else if (data.lifecycle === "accepted") {
      fail(`${relative}: lifecycle accepted but ${data.feature} is not present in contract/generated/protocol.json`);
    }
    continue;
  }

  // Legacy proposal metadata remains temporarily readable for non-adopted drafts
  // during the G1 migration, but it may never claim runtime authority.
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

console.log("[OK] protocol proposal authority metadata and product domain matrix match workspace and generated protocol");

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? process.cwd());
const methodCatalogPath = path.join(root, "contract", "mcp", "method_registry.generated.json");
const eventCatalogPath = path.join(root, "contract", "mcp", "event_registry.generated.json");
const capabilityCatalogPath = path.join(root, "contract", "mcp", "capability_registry.generated.json");
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

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const methodCatalog = readJson(methodCatalogPath).methods ?? [];
const eventCatalog = readJson(eventCatalogPath).events ?? [];
const capabilityCatalog = readJson(capabilityCatalogPath).capabilities ?? [];
const catalogFeatures = new Set(capabilityCatalog.map((item) => item.name));
const catalogCounts = new Map();
const draftCounts = new Map();

function addDomainCount(domain) {
  catalogCounts.set(domain, (catalogCounts.get(domain) ?? 0) + 1);
}

for (const method of methodCatalog) addDomainCount(method.domain);
for (const event of eventCatalog) addDomainCount(event.domain);

for (const file of walkProtocolDrafts(protocolDraftRoot)) {
  const relative = path.relative(root, file);
  const { text, data } = readFrontmatter(file);
  const domain = data.domain || path.relative(protocolDraftRoot, file).split(path.sep)[0];
  draftCounts.set(domain, (draftCounts.get(domain) ?? 0) + 1);
  if (!data.status || data.contract === undefined || data.generated === undefined || !data.feature) {
    fail(`${relative}: missing required protocol frontmatter`);
    continue;
  }

  const isCatalogGenerated = catalogFeatures.has(data.feature);
  if (isCatalogGenerated) {
    if (data.status !== "generated" || boolValue(data.contract) !== true || boolValue(data.generated) !== true) {
      fail(`${relative}: catalog-generated feature ${data.feature} must use status/generated/contract true frontmatter`);
    }
    if (/当前 generated 协议没有 adopted/.test(text)) {
      fail(`${relative}: catalog-generated draft still says the feature is not adopted`);
    }
  } else if (boolValue(data.generated) === true || boolValue(data.contract) === true || data.status === "generated") {
    fail(`${relative}: frontmatter says generated but ${data.feature} is not present in the generated registry catalog`);
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
  const actualGenerated = catalogCounts.get(domain) ?? 0;
  if (documentedDrafts !== actualDrafts) {
    fail(`docs/product/domain-status.md: Domain matrix draft count for ${domain} is ${documentedDrafts}, expected ${actualDrafts}`);
  }
  if (documentedGenerated !== actualGenerated) {
    fail(`docs/product/domain-status.md: Domain matrix catalog-generated count for ${domain} is ${documentedGenerated}, expected ${actualGenerated}`);
  }
}

for (const domain of new Set([...draftCounts.keys(), ...catalogCounts.keys()])) {
  if (!matrixDomains.has(domain)) {
    fail(`docs/product/domain-status.md: Domain matrix is missing ${domain}`);
  }
}

if (errors.length > 0) {
  console.error("[FAIL] protocol status consistency check failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("[OK] protocol draft frontmatter and product domain matrix match the generated registry catalog");

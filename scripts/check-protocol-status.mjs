#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? process.cwd());
const generatedPath = path.join(root, "docs", "generated", "protocol.json");
const protocolReadmePath = path.join(root, "docs", "protocol", "README.md");
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

const generated = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
const generatedFeatures = new Set();
const generatedCounts = new Map();

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

for (const file of walkProtocolDrafts(path.join(root, "docs", "protocol"))) {
  const relative = path.relative(root, file);
  const { text, data } = readFrontmatter(file);
  if (!data.status || data.contract === undefined || data.generated === undefined || !data.feature) {
    fail(`${relative}: missing required protocol frontmatter`);
    continue;
  }

  const isGenerated = generatedFeatures.has(data.feature);
  if (isGenerated) {
    if (data.status !== "generated" || boolValue(data.contract) !== true || boolValue(data.generated) !== true) {
      fail(`${relative}: generated feature ${data.feature} must use status/generated/contract true frontmatter`);
    }
    if (/当前 generated 协议没有 adopted/.test(text)) {
      fail(`${relative}: generated draft still says the feature is not adopted`);
    }
  } else if (boolValue(data.generated) === true || boolValue(data.contract) === true || data.status === "generated") {
    fail(`${relative}: frontmatter says generated but ${data.feature} is not present in docs/generated/protocol.json`);
  }
}

const readme = fs.readFileSync(protocolReadmePath, "utf8");
const matrixRows = readme.matchAll(/^\|\s*([a-z][a-z0-9]*)\s*\|\s*[^|]*\|\s*[^|]*\|\s*(\d+)\s*\|/gm);
for (const match of matrixRows) {
  const domain = match[1];
  const actual = generatedCounts.get(domain) ?? 0;
  const documented = Number(match[2]);
  if (documented !== actual) {
    fail(`docs/protocol/README.md: Domain matrix generated count for ${domain} is ${documented}, expected ${actual}`);
  }
}

if (errors.length > 0) {
  console.error("[FAIL] protocol status consistency check failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("[OK] protocol draft frontmatter and domain matrix match generated protocol");

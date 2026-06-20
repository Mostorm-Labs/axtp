#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
let rootArg = null;
let writePath = null;
let checkPath = null;
let json = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--write") {
    writePath = args[index + 1] ?? "docs/product/protocol-draft-health.md";
    index += 1;
  } else if (arg === "--check") {
    checkPath = args[index + 1] ?? "docs/product/protocol-draft-health.md";
    index += 1;
  } else if (arg === "--json") {
    json = true;
  } else if (!arg.startsWith("--") && rootArg === null) {
    rootArg = arg;
  } else {
    usage(2);
  }
}

const root = path.resolve(rootArg ?? process.cwd());
const protocolRoot = path.join(root, "workspace", "protocol");
const generatedPath = path.join(root, "contract", "generated", "protocol.json");

function usage(exitCode) {
  console.error("Usage: node tooling/scripts/report-protocol-draft-health.mjs [root] [--write PATH] [--check PATH] [--json]");
  process.exit(exitCode);
}

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(entryPath);
  }
  return out.sort();
}

function readFrontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.startsWith("---\n")) return { text, data: {} };
  const end = text.indexOf("\n---", 4);
  if (end < 0) return { text, data: {} };
  const data = {};
  for (const line of text.slice(4, end).trim().split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (match) data[match[1]] = match[2].trim();
  }
  return { text, data };
}

function boolValue(value) {
  return value === "true";
}

function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function countJsonFences(text) {
  const invalid = [];
  let count = 0;
  const regex = /```json\n([\s\S]*?)\n```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    count += 1;
    try {
      JSON.parse(match[1]);
    } catch (error) {
      invalid.push(error.message);
    }
  }
  return { count, invalid: invalid.length };
}

function countGenericExampleHints(text) {
  const patterns = [
    /"state": \{\n\s+"target": "default",\n\s+"status": "ok"\n\s+\}/g,
    /"config": \{\n\s+"mode": "auto"\n\s+\}/g,
    /"params": \{\n\s+"target": "default",\n\s+"sections": \[\n\s+"summary"\n\s+\]\n\s+\}/g,
    /"result": \{\n\s+"state": \{\n\s+"target": "default",\n\s+"status": "ok"\n\s+\}\n\s+\}/g,
  ];
  return patterns.reduce((total, pattern) => total + countMatches(text, pattern), 0);
}

function generatedDomainCounts() {
  const generated = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
  const counts = new Map();
  for (const item of [...(generated.methods ?? []), ...(generated.events ?? [])]) {
    counts.set(item.domain, (counts.get(item.domain) ?? 0) + 1);
  }
  return counts;
}

function emptyDomainStats(domain) {
  return {
    domain,
    drafts: 0,
    generatedDrafts: 0,
    generatedFacts: 0,
    methods: 0,
    compactExamples: 0,
    exampleGaps: 0,
    jsonExamples: 0,
    invalidJsonExamples: 0,
    genericExampleHints: 0,
    reviewAsk: 0,
    reviewDraft: 0,
    reviewFix: 0,
    reviewBlocker: 0,
    tbdAfterAdoption: 0,
    lines: 0,
  };
}

function analyze() {
  const generatedCounts = generatedDomainCounts();
  const domains = new Map();
  const files = [];

  for (const [domain, count] of generatedCounts) {
    const stats = emptyDomainStats(domain);
    stats.generatedFacts = count;
    domains.set(domain, stats);
  }

  for (const file of walk(protocolRoot)) {
    const relative = path.relative(root, file).replaceAll(path.sep, "/");
    if (relative.endsWith("/README.md") || relative.endsWith("/draft-conventions.md")) continue;
    const { text, data } = readFrontmatter(file);
    const domain = data.domain || path.relative(protocolRoot, file).split(path.sep)[0];
    const stats = domains.get(domain) ?? emptyDomainStats(domain);
    domains.set(domain, stats);

    const methods = countMatches(text, /^### 3\.\d+ `/gm);
    const compactExamples = countMatches(text, /^#### \d+\.\d+\.\d+ d block 示例$/gm);
    const jsonExamples = countJsonFences(text);
    const fileStats = {
      file: relative,
      domain,
      feature: data.feature ?? "",
      status: data.status ?? "",
      generated: boolValue(data.generated),
      contract: boolValue(data.contract),
      methods,
      compactExamples,
      exampleGaps: Math.max(0, methods - compactExamples),
      reviewAsk: countMatches(text, /\[REVIEW-ASK\]/g),
      reviewDraft: countMatches(text, /\[REVIEW-DRAFT\]/g),
      reviewFix: countMatches(text, /\[REVIEW-FIX\]/g),
      reviewBlocker: countMatches(text, /\[REVIEW-BLOCKER\]/g),
      tbdAfterAdoption: countMatches(text, /TBD after adoption/g),
      genericExampleHints: countGenericExampleHints(text),
      jsonExamples: jsonExamples.count,
      invalidJsonExamples: jsonExamples.invalid,
      lines: text.split(/\r?\n/).length,
    };

    stats.drafts += 1;
    stats.generatedDrafts += fileStats.generated ? 1 : 0;
    stats.methods += fileStats.methods;
    stats.compactExamples += fileStats.compactExamples;
    stats.exampleGaps += fileStats.exampleGaps;
    stats.jsonExamples += fileStats.jsonExamples;
    stats.invalidJsonExamples += fileStats.invalidJsonExamples;
    stats.genericExampleHints += fileStats.genericExampleHints;
    stats.reviewAsk += fileStats.reviewAsk;
    stats.reviewDraft += fileStats.reviewDraft;
    stats.reviewFix += fileStats.reviewFix;
    stats.reviewBlocker += fileStats.reviewBlocker;
    stats.tbdAfterAdoption += fileStats.tbdAfterAdoption;
    stats.lines += fileStats.lines;
    files.push(fileStats);
  }

  return {
    domains: [...domains.values()].sort((a, b) => a.domain.localeCompare(b.domain)),
    files,
  };
}

function reviewSummary(stats) {
  return `ASK ${stats.reviewAsk} / DRAFT ${stats.reviewDraft} / FIX ${stats.reviewFix} / BLOCKER ${stats.reviewBlocker}`;
}

function focus(stats) {
  if (stats.exampleGaps > 0) return "补 method 示例覆盖";
  if (stats.invalidJsonExamples > 0) return "修 JSON 示例语法";
  if (stats.reviewBlocker > 0 || stats.reviewFix > 0) return "先处理 blocker/fix";
  if (stats.reviewAsk > 0 && stats.genericExampleHints > 0) return "确认 REVIEW-ASK + 调真实业务示例";
  if (stats.reviewAsk > 0) return "确认 REVIEW-ASK";
  if (stats.genericExampleHints > 0) return "调真实业务示例";
  if (stats.generatedFacts > 0) return "维护 generated 合同";
  return "可排采纳评审";
}

function renderMarkdown(report) {
  const total = report.domains.reduce(
    (acc, domain) => {
      for (const key of Object.keys(acc)) acc[key] += domain[key] ?? 0;
      return acc;
    },
    {
      drafts: 0,
      generatedDrafts: 0,
      generatedFacts: 0,
      methods: 0,
      compactExamples: 0,
      exampleGaps: 0,
      jsonExamples: 0,
      invalidJsonExamples: 0,
      genericExampleHints: 0,
      reviewAsk: 0,
      reviewDraft: 0,
      reviewFix: 0,
      reviewBlocker: 0,
      tbdAfterAdoption: 0,
      lines: 0,
    },
  );

  const tuningQueue = report.files
    .filter((file) => file.genericExampleHints > 0 || file.reviewAsk > 0 || file.reviewFix > 0 || file.reviewBlocker > 0)
    .sort(
      (a, b) =>
        b.genericExampleHints - a.genericExampleHints ||
        b.reviewBlocker - a.reviewBlocker ||
        b.reviewFix - a.reviewFix ||
        b.reviewAsk - a.reviewAsk ||
        b.lines - a.lines,
    )
    .slice(0, 30);

  return `# AXTP Protocol Draft Health

本页是产品和协议维护者查看草案健康度、示例质量和待确认问题密度的报告。它不是 runtime 实现合同；可实现事实仍以 \`contract/**\`、\`specs/**\` 和 \`conformance/**\` 为准。

本页在 source repository 中由脚本生成并校验：

\`\`\`bash
node tooling/scripts/report-protocol-draft-health.mjs --write docs/product/protocol-draft-health.md
node tooling/scripts/report-protocol-draft-health.mjs --check docs/product/protocol-draft-health.md
\`\`\`

为避免 release artifact 断链，下方后台草案路径以纯文本显示，不作为 Markdown 链接。

## Summary

| Metric | Count |
|---|---:|
| Draft files | ${total.drafts} |
| Generated draft files | ${total.generatedDrafts} |
| Generated method/event facts | ${total.generatedFacts} |
| Method sections | ${total.methods} |
| Compact method examples | ${total.compactExamples} |
| Method example gaps | ${total.exampleGaps} |
| JSON examples | ${total.jsonExamples} |
| Invalid JSON examples | ${total.invalidJsonExamples} |
| Generic example hints | ${total.genericExampleHints} |
| REVIEW-ASK | ${total.reviewAsk} |
| REVIEW-DRAFT | ${total.reviewDraft} |
| REVIEW-FIX | ${total.reviewFix} |
| REVIEW-BLOCKER | ${total.reviewBlocker} |
| TBD after adoption | ${total.tbdAfterAdoption} |

## Domain Health Matrix

| Domain | Drafts | Generated Drafts | Generated Facts | Methods | Example Coverage | Review Markers | Generic Example Hints | Focus |
|---|---:|---:|---:|---:|---:|---|---:|---|
${report.domains
  .map((domain) => `| ${domain.domain} | ${domain.drafts} | ${domain.generatedDrafts} | ${domain.generatedFacts} | ${domain.methods} | ${domain.compactExamples}/${domain.methods} | ${reviewSummary(domain)} | ${domain.genericExampleHints} | ${focus(domain)} |`)
  .join("\n")}

## Example Tuning Queue

这些文件不是错误；它们只是含有较多机械示例或未决标记，适合下一轮人工把示例改得更贴近真实业务。

| File | Domain | Methods | Generic Example Hints | Review Markers | Lines |
|---|---|---:|---:|---|---:|
${tuningQueue
  .map((file) => `| \`${file.file}\` | ${file.domain} | ${file.methods} | ${file.genericExampleHints} | ASK ${file.reviewAsk} / DRAFT ${file.reviewDraft} / FIX ${file.reviewFix} / BLOCKER ${file.reviewBlocker} | ${file.lines} |`)
  .join("\n")}
`;
}

const report = analyze();
const rendered = renderMarkdown(report);

if (json) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else if (writePath) {
  const absolute = path.resolve(root, writePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, rendered);
  console.log(`[OK] wrote ${path.relative(root, absolute)}`);
} else if (checkPath) {
  const absolute = path.resolve(root, checkPath);
  const current = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
  if (current !== rendered) {
    console.error(`[FAIL] ${path.relative(root, absolute)} is out of date`);
    console.error(`Run: node tooling/scripts/report-protocol-draft-health.mjs --write ${path.relative(root, absolute)}`);
    process.exit(1);
  }
  console.log(`[OK] ${path.relative(root, absolute)} is up to date`);
} else {
  process.stdout.write(rendered);
}

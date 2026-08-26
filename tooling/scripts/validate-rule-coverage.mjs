#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { buildRuleCoverage } from "./lib/rule-coverage.mjs";

const root = path.resolve(process.argv[2] ?? process.cwd());
const mode = process.argv.includes("--json") ? "json" : process.argv.includes("--markdown") ? "markdown" : "check";
const requireFromGenerators = createRequire(path.join(root, "tooling", "generators", "package.json"));
const YAML = requireFromGenerators("yaml");

const rulePath = path.join(root, "contract", "rules", "rules.yaml");
const casesDir = path.join(root, "conformance", "cases");
const allowedLevels = new Set(["must", "should", "may"]);
const allowedStatuses = new Set(["draft", "experimental", "stable", "deprecated", "reserved"]);
const ruleIdPattern = /^[A-Z][A-Z0-9]*(?:\.[A-Z][A-Z0-9]*)+\.\d{3}$/;
const specTagPattern = /^spec\/v\d+\.\d+\.\d+$/;

function readYaml(file) {
  return YAML.parse(fs.readFileSync(file, "utf8"), { merge: true });
}

function walkYaml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkYaml(full));
    else if (entry.isFile() && entry.name.endsWith(".yaml")) out.push(full);
  }
  return out.sort();
}

function metadataErrors(registry) {
  const errors = [];
  const rules = registry?.rules;
  if (!registry?.ruleRegistry || registry.ruleRegistry.version !== 1) {
    errors.push("contract/rules/rules.yaml ruleRegistry.version must be 1");
  }
  if (!Array.isArray(rules)) return [...errors, "contract/rules/rules.yaml rules must be an array"];

  for (const [index, rule] of rules.entries()) {
    const label = `rules[${index}]`;
    if (!ruleIdPattern.test(String(rule?.id ?? ""))) errors.push(`${label}.id must be a stable Rule ID`);
    if (!allowedStatuses.has(rule?.status)) errors.push(`${label}.status is invalid`);
    if (!allowedLevels.has(rule?.level)) errors.push(`${label}.level is invalid`);
    if (typeof rule?.statement !== "string" || rule.statement.trim() === "") errors.push(`${label}.statement is required`);
    if (!rule?.source || typeof rule.source.path !== "string" || typeof rule.source.section !== "string") {
      errors.push(`${label}.source.path and source.section are required`);
    } else if (!fs.existsSync(path.join(root, rule.source.path))) {
      errors.push(`${label}.source.path does not exist: ${rule.source.path}`);
    }
    if (!specTagPattern.test(String(rule?.since ?? ""))) errors.push(`${label}.since must be spec/vMAJOR.MINOR.PATCH`);

    const disposition = rule?.verification?.disposition;
    if (["structural-only", "manual-evidence"].includes(disposition)) {
      if (!Array.isArray(rule.verification?.evidence) || rule.verification.evidence.length === 0) {
        errors.push(`${label} ${disposition} requires verification.evidence`);
      }
    }
    if (disposition === "not-applicable" && !rule.verification?.reason) {
      errors.push(`${label} not-applicable requires verification.reason`);
    }
    for (const evidence of rule?.verification?.evidence ?? []) {
      if (!fs.existsSync(path.join(root, evidence))) errors.push(`${label}.verification.evidence does not exist: ${evidence}`);
    }
  }
  return errors;
}

const registry = readYaml(rulePath);
const rules = registry.rules ?? [];
const cases = walkYaml(casesDir).map((file) => {
  const value = readYaml(file);
  return {
    id: value?.id ?? path.relative(casesDir, file).replace(/\.yaml$/, "").split(path.sep).join("."),
    authorityRules: value?.authorityRules ?? []
  };
});

const result = buildRuleCoverage(rules, cases);
const errors = [...metadataErrors(registry), ...result.errors];
if (errors.length > 0) {
  console.error(`Rule coverage validation failed (${errors.length} error(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const report = {
  version: registry.ruleRegistry.version,
  rules: result.rows,
  summary: {
    total: result.rows.length,
    covered: result.rows.filter((row) => row.disposition === "covered").length,
    structuralOnly: result.rows.filter((row) => row.disposition === "structural-only").length,
    manualEvidence: result.rows.filter((row) => row.disposition === "manual-evidence").length,
    notApplicable: result.rows.filter((row) => row.disposition === "not-applicable").length,
    uncovered: result.rows.filter((row) => row.disposition === "uncovered").length
  }
};

if (mode === "json") {
  console.log(JSON.stringify(report, null, 2));
} else if (mode === "markdown") {
  console.log("| Rule | Level | Disposition | Cases / Evidence |");
  console.log("|---|---|---|---|");
  for (const row of report.rules) {
    const refs = row.cases.length > 0 ? row.cases.join("<br>") : row.evidence.join("<br>") || "-";
    console.log(`| \`${row.id}\` | ${row.level} | ${row.disposition} | ${refs} |`);
  }
  console.log("");
  console.log(`Total: ${report.summary.total}; covered: ${report.summary.covered}; structural-only: ${report.summary.structuralOnly}; uncovered: ${report.summary.uncovered}`);
} else {
  console.log(`[OK] normative rules: ${report.summary.total}`);
  console.log(`[OK] rule coverage: covered=${report.summary.covered}, structural-only=${report.summary.structuralOnly}, manual-evidence=${report.summary.manualEvidence}, not-applicable=${report.summary.notApplicable}, uncovered=${report.summary.uncovered}`);
}

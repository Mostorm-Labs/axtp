const allowedDispositions = new Set([
  "covered",
  "structural-only",
  "manual-evidence",
  "not-applicable",
  "uncovered"
]);

export function buildRuleCoverage(rules, cases) {
  const errors = [];
  const rulesById = new Map();
  const casesByRule = new Map();

  for (const rule of rules ?? []) {
    if (rulesById.has(rule.id)) errors.push(`duplicate authority rule id: ${rule.id}`);
    rulesById.set(rule.id, rule);
    casesByRule.set(rule.id, []);

    const disposition = rule.verification?.disposition;
    if (!allowedDispositions.has(disposition)) {
      errors.push(`rule ${rule.id} has invalid verification disposition: ${String(disposition)}`);
    }
  }

  for (const item of cases ?? []) {
    for (const ruleId of item.authorityRules ?? []) {
      if (!rulesById.has(ruleId)) {
        errors.push(`case ${item.id} references unknown authority rule: ${ruleId}`);
        continue;
      }
      casesByRule.get(ruleId).push(item.id);
    }
  }

  for (const rule of rules ?? []) {
    const disposition = rule.verification?.disposition;
    const linkedCases = casesByRule.get(rule.id) ?? [];
    if (disposition === "covered" && linkedCases.length === 0) {
      errors.push(`covered rule ${rule.id} has no conformance case`);
    }
    if (rule.status === "stable" && rule.level === "must" && disposition === "uncovered") {
      const reason = rule.verification?.reason ? `: ${rule.verification.reason}` : "";
      errors.push(`stable MUST rule ${rule.id} is uncovered${reason}`);
    }
  }

  const rows = [...(rules ?? [])]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((rule) => ({
      id: rule.id,
      status: rule.status,
      level: rule.level,
      disposition: rule.verification?.disposition,
      cases: [...(casesByRule.get(rule.id) ?? [])].sort(),
      evidence: [...(rule.verification?.evidence ?? [])].sort()
    }));

  return { errors, rows };
}

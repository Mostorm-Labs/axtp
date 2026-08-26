# AXTP G5 Repository & Consumer Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close G5 without redesigning the G0-G4 authority architecture by adding evidence-backed consumer adoption governance, repairing generated human Markdown derivation, and recording the remaining structural/external findings as explicit deferred work.

**Architecture:** Preserve the existing AXTP authority chain unchanged. Add one repository-only governance evidence loop under `docs/governance/consumer-evidence/**`, validated by existing CI infrastructure, and make `protocolMarkdown.ts` a model-derived human projection instead of an independent protocol-fact source. Do not physically decompose registry sources, mass-compact proposals, invent GitHub teams/settings, or design new security semantics.

**Tech Stack:** Markdown/YAML/JSON Schema, Node.js ESM tooling scripts, AJV/YAML dependencies already installed under `tooling/generators`, TypeScript generator/Vitest, GitHub Actions `Validate AXTP Spec`.

**Spec:** `docs/superpowers/specs/2026-08-26-g5-repository-consumer-closure-design.md`

## Global Constraints

- Protected release baseline remains `spec/v0.15.0` at `1bf9e89ede12470e20733d4cea4e50edad989528`.
- Wire semantics, stable IDs, schemas, Standard Frame, CONTROL, RPC and STREAM semantics MUST NOT change.
- Existing G1-G4 authority decisions are inputs, not redesign targets.
- No consumer may be recorded as `pass` without exact external commit/run evidence.
- `docs/governance/consumer-evidence/**` is repository governance evidence and MUST NOT be promoted into immutable Spec authority.
- G5 implementation occurs on `chatgpt/axtp-authority-governance-v1`; Draft PR #12 remains closed during edits.
- Any unexpected protocol-semantic requirement is `PROTOCOL-SEMANTIC` / out of scope.

---

### Task 1: Consumer Evidence Validator — RED to GREEN

**Files:**
- Create: `tooling/scripts/consumer-evidence.test.mjs`
- Create: `tooling/scripts/validate-consumer-evidence.mjs`
- Modify: `tooling/scripts/validate-conformance.sh`
- Later consumes: `docs/governance/consumer-evidence/schema.json`
- Later consumes: `docs/governance/consumer-evidence/ledger.yaml`

**Interfaces:**
- Consumes: repository root path; YAML ledger; JSON Schema.
- Produces: CLI exit 0 for valid ledger and non-zero for malformed/unsupported evidence.

- [ ] **Step 1: Write failing validator tests**

Create Node tests covering at least:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateConsumerEvidenceDocument } from "./validate-consumer-evidence.mjs";

const base = {
  schemaVersion: 1,
  consumers: [{
    repository: "Mostorm-Labs/example-runtime",
    kind: "runtime",
    adoptionStatus: "unverified"
  }]
};

test("accepts evidence-free unverified consumer", () => {
  assert.deepEqual(validateConsumerEvidenceDocument(base), []);
});

test("rejects duplicate consumer repositories", () => {
  const value = structuredClone(base);
  value.consumers.push(structuredClone(value.consumers[0]));
  assert.match(validateConsumerEvidenceDocument(value).join("\n"), /duplicate consumer repository/i);
});

test("rejects PASS without exact external evidence", () => {
  const value = structuredClone(base);
  value.consumers[0].adoptionStatus = "pass";
  assert.match(validateConsumerEvidenceDocument(value).join("\n"), /pass.*specLock|pass.*evidence/i);
});
```

Add one positive PASS fixture with exact `specLock`, implementation commit/version, non-empty profiles, conformance PASS, run repository/id/url/commit and RFC3339 `verifiedAt`.

- [ ] **Step 2: Run RED**

Run:

```bash
node --test tooling/scripts/consumer-evidence.test.mjs
```

Expected: FAIL because `validate-consumer-evidence.mjs` does not exist.

- [ ] **Step 3: Implement minimal validator**

`validate-consumer-evidence.mjs` must:

```js
export function validateConsumerEvidenceDocument(value) { /* returns string[] */ }
```

Rules:

- object with `schemaVersion: 1` and `consumers[]`;
- `repository` unique and `owner/name` shaped;
- `kind` in `runtime|sdk|tool|mock`;
- `adoptionStatus` in `unverified|in-progress|pass|fail|stale`;
- `pass` requires exact evidence fields from the design spec;
- PASS `conformance.status` must equal `pass`;
- commit fields must be 40 hex characters;
- run `id` must be positive integer; run URL must be `https://github.com/...`;
- `verifiedAt` must parse as RFC3339/ISO date-time;
- CLI mode reads repository schema + ledger, validates JSON Schema with AJV 2020, applies semantic validation, prints `[OK] consumer evidence: N consumers` or exits 1 with `[FAIL]` lines.

Resolve `yaml` and `ajv` using `createRequire(path.join(root, "tooling", "generators", "package.json"))`, matching `validate-conformance.mjs`.

- [ ] **Step 4: Run GREEN**

Run:

```bash
node --test tooling/scripts/consumer-evidence.test.mjs
```

Expected: all consumer-evidence tests PASS.

- [ ] **Step 5: Wire into repository validation**

Append to `tooling/scripts/validate-conformance.sh` after rule coverage:

```bash
node "$root/tooling/scripts/validate-consumer-evidence.mjs" "$root"
```

- [ ] **Step 6: Commit Task 1**

Commit message:

```text
test: gate consumer adoption evidence
```

---

### Task 2: Add Repository-Only Consumer Evidence Contract

**Files:**
- Create: `docs/governance/consumer-evidence/README.md`
- Create: `docs/governance/consumer-evidence/schema.json`
- Create: `docs/governance/consumer-evidence/ledger.yaml`

**Interfaces:**
- Consumes: Task 1 validator.
- Produces: validated mutable governance ledger; no Spec release artifact input.

- [ ] **Step 1: Add JSON Schema**

Use Draft 2020-12. Required top level:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["schemaVersion", "consumers"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "consumers": { "type": "array", "items": { "$ref": "#/$defs/consumer" } }
  }
}
```

Define consumer fields and conditional `if adoptionStatus == pass` then require `specLock`, `implementation`, `declaredProfiles`, `conformance`, `verifiedAt`. Keep semantic equality/URL/commit rules in the Node validator.

- [ ] **Step 2: Seed ledger without fabricated PASS**

Seed exactly the known runtime/tool repositories from `release/AXTP_RUNTIME_UPDATE_FLOW.md`:

```yaml
schemaVersion: 1
consumers:
  - repository: Mostorm-Labs/axtp-c-runtime
    kind: runtime
    adoptionStatus: unverified
  - repository: Mostorm-Labs/axtp-cpp-runtime
    kind: runtime
    adoptionStatus: unverified
  - repository: Mostorm-Labs/axtp-flutter-runtime
    kind: runtime
    adoptionStatus: unverified
  - repository: Mostorm-Labs/axtp-ts-runtime
    kind: runtime
    adoptionStatus: unverified
  - repository: Mostorm-Labs/axtp-python-runtime
    kind: runtime
    adoptionStatus: unverified
  - repository: Mostorm-Labs/axtp-mock-server
    kind: mock
    adoptionStatus: unverified
```

Do not add Spec locks, commits, profiles or run identities unless independently verified.

- [ ] **Step 3: Document authority boundary**

README must say:

- ledger is mutable repository governance evidence;
- it is not protocol authority, not generated contract, and not a Spec release input;
- `pass` means externally evidenced adoption, not merely dispatch/upgrade intent;
- update process requires exact consumer commit/run evidence;
- `unverified` is the correct state when evidence is absent.

- [ ] **Step 4: Run validator**

Run:

```bash
node tooling/scripts/validate-consumer-evidence.mjs .
node --test tooling/scripts/consumer-evidence.test.mjs
```

Expected: PASS; 6 consumers, all unverified.

- [ ] **Step 5: Commit Task 2**

Commit message:

```text
governance: add consumer evidence ledger
```

---

### Task 3: Repair Generated Protocol Markdown Derivation with TDD

**Files:**
- Modify: `tooling/generators/src/protocolValidator.test.ts`
- Modify: `tooling/generators/src/emitters/protocolMarkdown.ts`
- Regenerate: `tooling/generators/src/__snapshots__/protocol.generated.md`
- Regenerate: `contract/generated/protocol.md`

**Interfaces:**
- Consumes: current `ProtocolModel` from `contract/protocol/axtp.protocol.yaml`.
- Produces: human-readable Markdown that projects model-owned protocol facts without independent literal op/layout facts.

- [ ] **Step 1: Add failing regression assertions**

In the existing `protocol definition emitters` test add assertions equivalent to:

```ts
expect(markdown).not.toMatch(/Hello \(op=\d+\)/);
expect(markdown).not.toMatch(/REQUEST \(op=\d+\)/);
expect(markdown).not.toContain("12-byte Standard Frame header");
for (const rule of model.control.rules) expect(markdown).toContain(rule);
for (const rule of model.stream.rules) expect(markdown).toContain(rule);
for (const rule of model.compatibility.rules) expect(markdown).toContain(rule);
```

Update the old expectations that explicitly required absence of Control/Stream rule sections, because G5 intentionally projects model-owned rules.

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --dir tooling/generators test -- protocolValidator.test.ts
```

Expected: FAIL on hard-coded op/layout assertions and missing model-rule projections.

- [ ] **Step 3: Make framework rendering model-derived**

Modify `renderProtocolFramework(model)` so it:

- keeps explanatory headings/labels;
- derives framed/unframed transport rows entirely from `model.transports`;
- removes literal `12-byte Standard Frame header` wording;
- removes hard-coded `Hello (op=0)`, `Identify (op=2)`, `Identified (op=3)`, `EVENT (op=6)`, `REQUEST (op=7)`, `REQUEST_RESPONSE (op=8)` table facts;
- projects `model.control.rules`, `model.stream.rules`, and `model.compatibility.rules` under clearly named generated rule sections;
- does not introduce another numeric fact source.

The WebSocket comparison may use semantic names only (`Hello`, `Identify`, `REQUEST`, etc.) if useful, with no copied numeric op values.

- [ ] **Step 4: Run GREEN**

Run:

```bash
pnpm --dir tooling/generators test -- protocolValidator.test.ts
```

Expected: PASS except snapshot mismatch until regenerated.

- [ ] **Step 5: Regenerate normally**

Run the existing generator commands used by repository validation so both snapshot and `contract/generated/protocol.md` are produced by the generator, not manually edited.

Then run:

```bash
pnpm --dir tooling/generators build
pnpm --dir tooling/generators lint
pnpm --dir tooling/generators test
tooling/scripts/check-generated-drift.sh
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

Commit message:

```text
fix: derive generated protocol prose from model
```

---

### Task 4: G5 Review and Finding Dispositions

**Files:**
- Modify: `docs/governance/reviews/G5-information-architecture-consumer.md`
- Modify: `docs/governance/findings.yaml`

**Interfaces:**
- Consumes: Tasks 1-3 evidence plus current GitHub branch/ruleset evidence.
- Produces: G5 functional Gate record.

- [ ] **Step 1: Record retrieval review**

Compare and cite:

- `docs/README.md`
- `docs/guides/runtime.md`
- `workspace/protocol/README.md`
- Governance v1

Close `AXTP-GOV-005` only if no maintained entry point allows backstage material to override runtime authority.

- [ ] **Step 2: Close consumer evidence finding**

Set `AXTP-GOV-006: closed` with evidence paths to schema/ledger/validator/tests. Record that all initial entries are `unverified`, proving no PASS was fabricated.

- [ ] **Step 3: Defer external/structural findings precisely**

Set:

- `AXTP-GOV-007: deferred` — external GitHub branch protection/team configuration; retain evidence `mainProtected:false`, `rulesets:[]` and required future policy.
- `AXTP-GOV-008: deferred` — future feature-level registry decomposition, gated by semantic/generated equivalence.
- `AXTP-GOV-009: deferred` — future proposal corpus compaction; authority risk already neutralized by G1 retrieval boundary.
- `AXTP-GOV-010: deferred` — future security authority program; new semantic requirements require separate protocol amendment/release.

Each deferred finding must include `deferredReason`, `futureWork`, and `exitEvidence` or equivalent explicit fields; do not use vague prose-only "later".

- [ ] **Step 4: Close Markdown derivation finding**

Set `AXTP-GOV-012: closed` only after generator tests/generated drift prove the emitter repair.

- [ ] **Step 5: Perform five drift reviews**

Record independent outcomes for authority, semantic duplication, derivation, verification and release/consumer drift.

- [ ] **Step 6: Freeze functional state**

Set G5 status `READY FOR FULL VERIFICATION`, record current branch head and state that PR #12 remains closed until Gate-boundary CI.

- [ ] **Step 7: Commit Task 4**

Commit message:

```text
docs: prepare G5 governance closure
```

---

### Task 5: Full Gate Verification and Exact-Head Closure

**Files:**
- Modify after functional PASS only: `docs/governance/reviews/G5-information-architecture-consumer.md`
- Modify after functional PASS only: `docs/governance/findings.yaml` if evidence details need closure references
- PR metadata: Draft PR #12

**Interfaces:**
- Consumes: exact functional head.
- Produces: G5 PASS evidence and frozen closure head.

- [ ] **Step 1: Reopen Draft PR #12 only at the Gate boundary**

Update PR body with G5 functional head and status `READY FOR FULL VERIFICATION`, then reopen.

- [ ] **Step 2: Run/observe exact-head `Validate AXTP Spec`**

Required successful steps:

```text
generator build/lint/tests/validate
source + Protocol IR validation
generated drift
conformance + Rule coverage + consumer evidence validation
docs/status/path checks
release artifact dry-run
```

Ignore stale-head race runs; only the exact current head counts.

- [ ] **Step 3: On failure, close PR and classify first**

Use `systematic-debugging`; classify `IMPLEMENTATION_DEFECT`, `TEST_DEFECT`, `EVIDENCE_GAP`, `ENVIRONMENT_DEFECT`, etc. Repair only on the closed branch and rerun the full Gate.

- [ ] **Step 4: On functional PASS, close PR and write closure record**

Set G5 review status `PASS`, record exact functional run, all finding dispositions, and protected invariant check.

- [ ] **Step 5: Reopen once on exact closure head**

Run `Validate AXTP Spec` again and require `completed/success` on that exact closure SHA.

- [ ] **Step 6: Close Draft PR #12 and freeze G5**

PR body must record G0-G5 status and exact-head run IDs. No merge is performed as part of G5.

- [ ] **Step 7: Verification-before-completion**

Before claiming G5 complete, independently confirm:

- exact workflow run SHA equals closure head;
- conclusion is success;
- PR #12 is closed/unmerged;
- `AXTP-GOV-005`, `006`, `012` are closed;
- `AXTP-GOV-007`, `008`, `009`, `010` are explicitly deferred with evidence/exit conditions;
- no G5 commit changed canonical protocol semantics or `spec/v0.15.0`.

---

## Plan Self-Review

- Spec coverage: all seven G5 findings have an implementation/defer task.
- No placeholder/TODO steps remain.
- Consumer evidence is repository-only and not added to release artifact inputs.
- Protocol Markdown repair uses existing `ProtocolModel`; no new protocol source is introduced.
- Physical registry/proposal/security/branch-protection migrations are explicitly out of scope.
- Final Gate follows the same closed-PR -> functional CI -> closure -> exact-head CI discipline used by G1-G4.
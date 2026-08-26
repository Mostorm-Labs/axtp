# AXTP G1 — Authority Boundary Closure

Status: **PASS**  
Prerequisite: G0 PASS  
Primary findings: `AXTP-GOV-001`, `AXTP-GOV-011`

## 1. Objective

G1 removes shadow authority without changing protocol semantics.

The invariant is:

```text
workspace/** = evidence | intent | proposal
workspace/** != runtime contract
```

An accepted proposal may explain why a canonical fact exists and point to adopted canonical/generated authority, but it does not become that authority.

## 2. Baseline contradiction

At the protected baseline, workspace guidance said `workspace/protocol/**` was proposal material but also allowed adopted/generated proposals to use:

```yaml
status: generated
contract: true
generated: true
```

Repository search found **21 active `workspace/protocol/**` proposals containing `contract: true`**. This was both a path-class contradiction and an AI retrieval hazard.

## 3. Authority Metadata v2

Maintained `workspace/protocol/<domain>/<domain.feature>.md` proposals now use:

```yaml
---
authorityClass: proposal
lifecycle: captured | reviewing | accepted | superseded | archived
protocolStability: draft | experimental | stable | deprecated | reserved
domain: <domain>
feature: <domain.feature>
adoptedBy: <single primary contract/registry/**/*.yaml path when accepted>
lastReviewed: YYYY-MM-DD
---
```

Rules:

1. `authorityClass` is always `proposal` inside `workspace/protocol/**`.
2. `lifecycle: accepted` means the proposal was adopted elsewhere; it never promotes the Markdown file into runtime authority.
3. `protocolStability` describes the canonical protocol fact and is independent from proposal lifecycle.
4. New proposals default to `lifecycle: captured` + `protocolStability: draft`.
5. `adoptedBy` is one scalar primary canonical Registry owner; secondary canonical sources belong in Adoption/Amendment notes.
6. Migrated v2 proposal frontmatter prohibits `status`, `contract`, `generated`, and `registry`.
7. Current-state wording must never claim that a workspace proposal itself is directly implementable.

The key semantic distinction is:

```text
accepted != stable
```

A proposal may be accepted while its canonical protocol fact remains draft.

## 4. Retrieval rule

Runtime/SDK/firmware implementation agents must treat the following paths as non-contract regardless of lifecycle:

```text
workspace/business/**
workspace/flows/**
workspace/protocol/**
workspace/legacy-*/**
workspace/registry-planning/**
workspace/runtime/**
docs/superpowers/**
tooling/skills/**
```

These paths may be read for rationale, history, migration, evidence or protocol-authoring work only.

## 5. Source fix

G1 fixes the mechanism before treating the historical corpus:

| Surface | G1 behavior |
|---|---|
| Stage 20 proposal template | emits `authorityClass: proposal`, `lifecycle: captured`, `protocolStability: draft`, empty `adoptedBy` |
| Stage 20 skill | cannot create `contract/generated/status/registry` shadow-authority metadata |
| Stage 30 skill | adoption writes canonical Registry facts; proposal becomes accepted, never contract |
| Stage 40 skill | amendment preserves proposal authority; semantic change occurs in canonical source |
| Stage 50 skill | one-way `Registry -> IR -> generated`; does not read/write proposal authority metadata |
| README / conventions | absolute workspace non-contract rule and scalar `adoptedBy` |
| status validator | validates the template source, v2 metadata, canonical `adoptedBy`, and direct-implementation prohibition |
| proposal health report | separates `Accepted proposal` from `Generated facts` |

The pre-fix authoring defect is captured in `docs/governance/reviews/G1-source-fix-red-baseline.md`.

## 6. Historical accepted-proposal migration

Original baseline:

```text
active workspace/protocol proposals with contract:true = 21
```

Current G1 closure state:

```text
active accepted/generated proposals still using contract:true = 0
```

All 21 active shadow-authority proposals have been migrated to Authority Metadata v2, including the accepted `cast.*`, `audio.algorithm`, `audio.stream`, `device.info`, `device.enrollment`, `firmware.update`, `network.*`, `signage.playlist`, `software.*`, `stream.flowControl`, and `video.stream` surfaces.

For each migrated proposal:

- the proposal remains `authorityClass: proposal`;
- `lifecycle: accepted` is used only where canonical adoption is demonstrable;
- `protocolStability` is taken from the actual canonical Registry state rather than inferred from adoption;
- `adoptedBy` points to the primary canonical Registry owner as a scalar path;
- current-state wording says implementation must use canonical/generated/conformance authority;
- no protocol IDs, field IDs, method/event semantics, schema semantics, wire formats or runtime behavior were intentionally changed.

Canonical review confirmed that the last 11 migrated accepted proposals remain `protocolStability: draft`; `audio.algorithm` remains `stable` because its canonical Registry facts are actually stable. This verifies the lifecycle/stability split rather than flattening both dimensions.

The final five large historical files were migrated mechanically with a guarded one-shot workflow. Before commit it asserted that, after masking the approved current-status rows, the document body remained byte-for-byte unchanged. The resulting migration commit was `2882548c753b65176a4e129cd287a9acd6f208ac`. The temporary migration workflow was removed immediately afterward.

## 7. Verification evidence

### 7.1 Targeted authority preflight

Successful run:

```text
GitHub Actions run: 32951426806
Result: PASS
```

The targeted preflight verified:

- JavaScript syntax for `check-protocol-status.mjs` and `report-protocol-draft-health.mjs`;
- local Markdown links;
- plain-text repository paths;
- Chinese-first frontstage navigation language;
- protocol proposal template-noise rules;
- proposal authoring source and Authority Metadata v2 consistency;
- scalar canonical `adoptedBy` targets;
- product domain matrix consistency;
- generated protocol proposal-health report freshness;
- `git diff --check`.

### 7.2 Full repository validation — first attempt

```text
GitHub Actions run: 32952724583
Head: 5c95baee9d5a7b1b87355fd0786f8decf1892fe2
Result: FAIL
```

The failure was isolated to release artifact link validation. Generator/generated artifacts, conformance, and repository docs/status validation all passed.

Root cause:

```text
docs/README.md
  -> local Markdown link to docs/governance/AXTP_AUTHORITY_ARCHITECTURE_AND_REPOSITORY_GOVERNANCE_V1.md
release artifact
  -> intentionally packages docs/README.md
  -> intentionally does not package repository-governance documents
```

This was classified as **DOC-DRIFT / release packaging boundary drift**, not protocol-semantic drift.

The minimal fix in commit `f7f5c05f7c04c01b3819f24727ed14982552bdb5` kept the existing Spec artifact boundary unchanged and changed the repository-governance navigation entry into an explicit repository-only path. No artifact contract, generator, Registry, Protocol IR, conformance case or protocol fact was changed.

### 7.3 Full repository validation — corrected functional state

```text
GitHub Actions run: 32952949759
Head: f7f5c05f7c04c01b3819f24727ed14982552bdb5
Result: PASS
```

The successful full run confirmed together:

- generator build/lint/tests;
- source validation;
- Protocol IR validation;
- generated artifact drift check;
- conformance validation;
- documentation/link/protocol-status validation;
- release artifact dry run and artifact-local link integrity.

### 7.4 Exact-head closure evidence rule

This Markdown record cannot embed the run ID that validates its own final commit without creating a new self-invalidating commit. Therefore the repository record cites the last successful functional-state run above, while **the exact-head revalidation of this G1 closure record is stored externally in Draft PR #12 Checks**.

G2 MUST NOT begin unless the existing `Validate AXTP Spec` workflow is green on the exact commit containing this PASS record and the corresponding closed findings.

## 8. Defect classification

| Finding | Class | Final G1 disposition |
|---|---|---|
| AXTP-GOV-001 | GOV-AMBIGUITY | CLOSED |
| AXTP-GOV-011 | GOV-AMBIGUITY | CLOSED |
| legacy authoring source recreates shadow authority | GOV-AMBIGUITY / GOV-TOOLING | CLOSED |
| repository-only governance linked as artifact-local content | DOC-DRIFT | CLOSED; artifact boundary preserved |
| duplicated proposal payload/reference material | GOV-STRUCTURE | DEFER-WITH-OWNER: G5 |
| any future canonical-vs-proposal semantic mismatch | DOC-DRIFT or PROTOCOL-SEMANTIC | must not be silently resolved in G1 |

No G1 finding requires a protocol-semantic amendment.

## 9. Five drift reviews

### Authority drift

**PASS.** Source creation rules and all 21 active accepted/generated shadow-authority proposals are migrated. `workspace/protocol/**` has no runtime-contract exception.

### Semantic duplication

**DEFER-WITH-OWNER: G5.** G1 closes authority ambiguity but intentionally does not shrink the full proposal corpus.

### Derivation drift

**PASS.** Canonical Registry facts, Protocol IR semantics and generated protocol facts remained valid under the full repository validation.

### Verification drift

**PASS.** Targeted authority preflight passed, and the corrected functional state passed the existing full generator/conformance/docs/release validation workflow.

### Release / consumer drift

**PASS.** `spec/v0.15.0`, release tags, artifact contract and runtime spec locks were not changed. The release dry-run issue was fixed by preserving the pre-existing artifact packaging boundary rather than expanding the artifact with repository-governance content.

## 10. Semantic impact check

```text
Wire semantic impact = NONE
spec/v0.15.0 mutation = NONE
Runtime behavior change = NONE
Stable identifier change = NONE
Canonical Registry semantic change = NONE
Release artifact contract change = NONE
```

## 11. Exit criteria

| Exit criterion | Result |
|---|---|
| maintained workspace proposals no longer claim runtime contract authority | PASS |
| accepted proposal wording does not claim direct implementation authority | PASS |
| lifecycle and protocol stability are distinct | PASS |
| accepted proposals link to canonical adoption targets | PASS |
| runtime/AI retrieval excludes backstage surfaces from implementation authority | PASS |
| generator/generated artifacts remain valid | PASS |
| conformance remains valid | PASS |
| docs/protocol-status validation remains valid | PASS |
| release artifact dry run remains valid without expanding artifact scope | PASS |
| wire/released/runtime semantics unchanged | PASS |

## 12. Current decision

**PASS**

G1 Authority Boundary Closure is complete. The only non-embedded closure evidence is the exact-head `Validate AXTP Spec` result stored in Draft PR #12 Checks, by design to avoid a self-referential verification commit loop.

After that exact-head check is green, the next Gate is **G2 — Spec Identity & Version Closure**.

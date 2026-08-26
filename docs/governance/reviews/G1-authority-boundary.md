# AXTP G1 — Authority Boundary Closure

Status: **READY FOR FULL VERIFICATION**  
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

Current branch:

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

## 7. Targeted preflight evidence

A one-shot G1 authority preflight was run before reopening the main migration PR.

Successful run:

```text
GitHub Actions run: 32951426806
Result: PASS
```

The run verified:

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

The report generator refreshed `docs/product/protocol-draft-health.md` in commit `7349be2b9a1fd1d6e02b215e9cbc963f18513180`. The temporary preflight workflow was then removed.

This targeted preflight is not a substitute for the repository's existing full `Validate AXTP Spec` workflow; that is the remaining G1 exit evidence.

## 8. Defect classification

| Finding | Class | Current disposition |
|---|---|---|
| AXTP-GOV-001 | GOV-AMBIGUITY | READY-FOR-FULL-VERIFICATION |
| AXTP-GOV-011 | GOV-AMBIGUITY | READY-FOR-FULL-VERIFICATION |
| legacy authoring source recreates shadow authority | GOV-AMBIGUITY / GOV-TOOLING | FIXED-IN-G1 |
| duplicated proposal payload/reference material | GOV-STRUCTURE | DEFER-WITH-OWNER: G5 |
| any future canonical-vs-proposal semantic mismatch | DOC-DRIFT or PROTOCOL-SEMANTIC | must not be silently resolved in G1 |

No G1 finding requires a protocol-semantic amendment.

## 9. Five drift reviews

### Authority drift

**PASS, PENDING FULL-CI CONFIRMATION.** Source creation rules and all 21 active accepted/generated shadow-authority proposals are migrated. `workspace/protocol/**` no longer has a runtime-contract exception.

### Semantic duplication

**DEFER-WITH-OWNER: G5.** G1 closes authority ambiguity but intentionally does not shrink the full 110-proposal corpus.

### Derivation drift

**PASS, PENDING FULL-CI CONFIRMATION.** G1 does not modify canonical Registry protocol facts or Protocol IR semantics. Stage 50 is explicitly one-way from Registry to generated authority.

### Verification drift

**PASS, PENDING FULL-CI CONFIRMATION.** The targeted authority preflight passed. The existing full generator/conformance/release workflow remains the final exit evidence.

### Release / consumer drift

**PASS, PENDING FULL-CI CONFIRMATION.** No release tag, release artifact or runtime spec lock has been changed.

## 10. Semantic impact check

```text
Wire semantic impact = NONE
spec/v0.15.0 mutation = NONE
Runtime behavior change = NONE
Stable identifier change = NONE
Canonical Registry semantic change = NONE
```

## 11. Remaining exit blocker

All content-level G1 exit blockers are closed. The only remaining blocker is fresh full repository verification on the completed branch using the existing `Validate AXTP Spec` workflow.

G1 MUST remain non-PASS until that full workflow confirms generator/tests, source validation, Protocol IR/generated drift, conformance, docs/status and release dry-run remain valid together.

## 12. Current decision

**READY FOR FULL VERIFICATION**

The source mechanism and historical accepted-proposal corpus are closed. The existing Draft PR is the sole full-validation surface; reopen it once, do not add more intermediate commits, and promote G1 to PASS only if that full repository validation is green.

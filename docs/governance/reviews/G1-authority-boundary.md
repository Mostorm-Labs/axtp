# AXTP G1 — Authority Boundary Closure

Status: **IN PROGRESS**  
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

Repository search found **21 active `workspace/protocol/**` proposals containing `contract: true`**. That was a path-class contradiction and an AI retrieval hazard.

## 3. G1 target metadata model

Maintained `workspace/protocol/**` proposals converge to:

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

### Rules

1. `authorityClass` is always `proposal` inside `workspace/protocol/**`.
2. `lifecycle: accepted` means the proposal was adopted elsewhere; it does not make the proposal a contract.
3. `protocolStability` describes the canonical protocol fact, not proposal authority.
4. New proposals default to `lifecycle: captured` + `protocolStability: draft`.
5. `adoptedBy` is one scalar primary canonical Registry owner. Secondary Registry/spec files belong in the Adoption/Amendment note.
6. `contract`, `generated`, `status`, and `registry` are prohibited in migrated v2 proposal frontmatter.
7. Current-state wording must never say a workspace proposal itself is directly implementable.

## 4. Retrieval rule

After G1 closure, runtime/SDK/firmware implementation agents must treat these paths as non-contract regardless of proposal lifecycle:

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

They may be read for rationale, history, migration, evidence or protocol-authoring tasks only.

## 5. Migration strategy

### G1-A — Authoring source fix

Fix the mechanism that creates proposals before migrating historical data:

- protocol proposal reference template;
- Stage 20 draft skill;
- Stage 30 adoption skill;
- Stage 40 amendment skill;
- Stage 50 generation boundary;
- workspace protocol README and conventions;
- proposal status validator;
- proposal health report vocabulary.

### G1-B — Historical accepted proposal normalization

For each active legacy accepted/generated proposal:

- preserve protocol body and historical rationale;
- migrate only authority metadata/current-state wording;
- set `lifecycle: accepted` when canonical adoption is demonstrable;
- set `protocolStability` from actual canonical Registry status, not from adoption state;
- add scalar `adoptedBy` primary canonical owner;
- do not edit method IDs, event IDs, schema fields, examples or wire semantics.

Non-adopted legacy proposals may remain temporarily readable through the validator during G1; the source template prevents creating new legacy-format proposals. Broader proposal corpus normalization is G5 unless needed to remove active authority ambiguity.

## 6. Source-fix checkpoint — 2026-08-26

The authoring mechanism has been changed on `chatgpt/axtp-authority-governance-v1`:

| Surface | G1 behavior |
|---|---|
| Stage 20 template | emits `authorityClass: proposal`, `lifecycle: captured`, `protocolStability: draft`, empty `adoptedBy` |
| Stage 20 skill | cannot create `contract/generated/status/registry` shadow-authority metadata |
| Stage 30 skill | adoption creates canonical Registry facts; proposal becomes `accepted`, never contract |
| Stage 40 skill | amendment preserves proposal authority class; canonical source carries semantic change |
| Stage 50 skill | one-way `Registry -> IR -> generated`; does not read/write proposal authority metadata |
| README / conventions | define absolute workspace non-contract rule and scalar `adoptedBy` |
| status validator | validates template source, v2 metadata, scalar canonical `adoptedBy`, and direct-implementation prohibition |
| health report | separates `Accepted proposal` from `Generated facts`; removes “generated draft” mixed concept |

RED baseline evidence is recorded in `docs/governance/reviews/G1-source-fix-red-baseline.md`.

This checkpoint is **not G1 PASS**. The historical accepted-proposal corpus must still close before the gate can pass.

## 7. Historical migration state

At the original baseline: 21 active proposals claimed `contract: true`.

Already normalized in the current branch include the accepted `cast.*` set, `device.info`, `device.enrollment`, and `audio.algorithm`. `audio.algorithm` also now uses scalar:

```yaml
adoptedBy: contract/registry/domains/audio/domain.yaml
```

The remaining historical accepted proposals identified by the last status check are:

```text
audio.stream
firmware.update
network.interface
network.ip
network.wifi
network.ap
signage.playlist
software.config
software.updatePolicy
stream.flowControl
video.stream
```

Canonical Registry review confirms all 11 are **accepted proposals whose current protocol facts are still `draft`**, so their target metadata is:

```yaml
authorityClass: proposal
lifecycle: accepted
protocolStability: draft
adoptedBy: contract/registry/domains/<domain>/domain.yaml
```

This distinction is intentional: **accepted != stable**.

## 8. Defect classification

| Finding | Class | Disposition |
|---|---|---|
| AXTP-GOV-001 | GOV-AMBIGUITY | FIX-IN-GATE |
| AXTP-GOV-011 | GOV-AMBIGUITY | FIX-IN-GATE |
| legacy authoring template recreates shadow authority | GOV-AMBIGUITY / GOV-TOOLING | FIXED-IN-G1-SOURCE-CHECKPOINT; gate still open pending corpus migration |
| duplicated proposal payload/reference material | GOV-STRUCTURE | DEFER to G5 unless required to remove authority ambiguity |
| any canonical-vs-proposal semantic mismatch | DOC-DRIFT or PROTOCOL-SEMANTIC after review | do not silently resolve in G1 |

## 9. Five drift reviews — current state

### Authority drift

**FIX-IN-GATE.** Authoring source has been fixed; 11 historical accepted proposals still require metadata normalization before the original 21-file contradiction is fully closed.

### Semantic duplication

**DEFER-WITH-OWNER (G5).** G1 changes classification, not the full 110-proposal corpus shape.

### Derivation drift

**PASS FOR CURRENT G1 SCOPE.** G1 changes authoring/governance tooling and proposal metadata, not Registry/Protocol IR/generated protocol facts.

### Verification drift

**PASS FOR CURRENT G1 SCOPE, FINAL EVIDENCE PENDING.** Conformance semantics are unchanged. Full repository validation will be rerun only after the historical migration is internally closed.

### Release / consumer drift

**PASS FOR CURRENT G1 SCOPE.** No release tag, release artifact, runtime lock or wire fact is being changed.

## 10. Semantic impact check

```text
Wire semantic impact = NONE
spec/v0.15.0 mutation = NONE
Runtime behavior change = NONE
Stable identifier change = NONE
Canonical Registry semantic change = NONE
```

## 11. Exit blockers

G1 MUST NOT be marked PASS until:

- all maintained accepted/generated `workspace/protocol/**` proposals no longer claim `contract: true`;
- accepted proposal current-state wording does not claim direct implementation authority;
- lifecycle and protocol stability remain distinct;
- accepted proposals link to scalar canonical adoption targets;
- runtime/AI retrieval guidance treats workspace as non-contract with no exception;
- fresh repository verification evidence is obtained after migration closure.

## 12. Current decision

**IN PROGRESS**

The authoring source defect is closed. Historical accepted-proposal normalization remains the active G1 work item. No protocol-semantic decision is required for that normalization.

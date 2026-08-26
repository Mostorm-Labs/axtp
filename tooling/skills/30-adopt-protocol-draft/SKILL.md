---
name: adopt-protocol-draft
description: Stage 30 adoption skill for reviewed AXTP workspace/protocol domain-feature proposals. Use when a reviewed proposal should be formalized into canonical Registry/spec facts without turning the workspace proposal itself into implementation authority.
---

# Adopt Protocol Draft

Stage 30 converts a reviewed `workspace/protocol/<domain>/<domain.feature>.md` proposal into canonical AXTP protocol facts.

The proposal remains `authorityClass: proposal`. Adoption changes **where the accepted fact lives**, not the authority class of the Markdown file.

## Hard authority invariant

Before adoption, a typical proposal is:

```yaml
authorityClass: proposal
lifecycle: reviewing
protocolStability: draft
adoptedBy:
```

After successful adoption, it becomes:

```yaml
authorityClass: proposal
lifecycle: accepted
protocolStability: <canonical fact stability>
adoptedBy: contract/registry/<primary canonical owner>.yaml
```

`adoptedBy` MUST be one scalar repository-relative path naming the primary canonical owner. If the adoption also changes common errors, profiles, shared schemas, or specs, list those additional sources in the proposal adoption note rather than turning `adoptedBy` into a YAML list.

Never write these legacy fields into v2 proposal frontmatter:

```text
status
contract
generated
registry
```

An accepted proposal is still not directly implementable. Runtime / SDK / firmware must read canonical/generated/verification authority.

## Hard boundaries

- Start from an existing reviewed proposal.
- Do not adopt unresolved `[REVIEW-BLOCKER]`, `[REVIEW-FIX]`, or `[REVIEW-ASK]` facts unless the user supplies exact confirmation and adoption is explicitly scoped.
- Do not invent semantics absent from reviewed evidence or existing authority.
- Do not hand-edit `contract/protocol/axtp.protocol.yaml`, `contract/generated/**`, `contract/mcp/**`, or `contract/test-vectors/**`.
- New business features normally land in `contract/registry/domains/<domain>/domain.yaml`.
- Shared/core facts use the existing canonical registry structure only when governance requires it.
- Preserve stable IDs, field IDs, `bitOffset`, names, and compatibility constraints.

## Required evidence

Read enough to avoid guessing:

```text
workspace/protocol/README.md
workspace/protocol/draft-conventions.md
workspace/protocol/<domain>/<domain.feature>.md
specs/30-registry.md
specs/40-codec.md
specs/50-tooling.md
contract/registry/**/*.yaml
contract/registry/domains/**/*.yaml
contract/protocol/axtp.protocol.yaml
contract/generated/protocol.md
```

For transport-sensitive or low-bandwidth features, also read the relevant Core specs. For legacy adoption, read concrete legacy evidence.

## Workflow

### 1. Confirm proposal eligibility

| State | Meaning | Action |
|---|---|---|
| Already adopted | Canonical source already fully covers the proposal | Do not duplicate; verify metadata/adoption link |
| Partially adopted | Some canonical facts exist | Add only missing confirmed facts |
| Ready for adoption | Reviewed, exact, no unresolved blocker | Proceed |
| Not ready | Missing semantic decisions or unresolved blocker | Stop and report blocker |

If the proposal still uses legacy frontmatter, migrate only its metadata to Authority Metadata v2 before continuing. That migration must not change protocol semantics.

### 2. Extract accepted facts

Extract only confirmed facts:

- `domain.feature` boundary;
- capability names and descriptors;
- methods, request/response schemas, linked events and errors;
- events and event schemas;
- schemas and field constraints;
- domain-specific errors;
- profile additions when explicitly confirmed;
- concrete legacy mappings;
- open questions that must stay outside canonical authority.

### 3. Align normative specs where needed

Update only the relevant governance/normative explanations in `specs/**`. Specs explain rules; Registry YAML remains the machine-readable canonical input.

### 4. Choose the primary canonical owner

Select exactly one primary `adoptedBy` path, normally:

```text
contract/registry/domains/<domain>/domain.yaml
```

Use a core Registry file only where the fact is genuinely core/shared. Record any secondary canonical files in the adoption note.

### 5. Assign IDs and bitOffsets

Follow existing Registry rules:

- IDs globally unique and in the correct domain range;
- domain-local bitOffsets unique/contiguous unless intentionally reserved;
- new schema field IDs start from the next safe value;
- existing IDs never reused for different semantics;
- prefer common errors before adding domain-specific errors.

### 6. Write canonical sources

Patch only the chosen canonical YAML/spec sources.

Do not copy review prose, `[REVIEW-*]`, open questions, `TBD`, or proposal examples into canonical YAML unless they are explicitly accepted facts.

### 7. Validate source adoption

Run the repository's source-level validation before marking the proposal accepted:

```bash
pnpm --dir tooling/generators build
pnpm --dir tooling/generators test
pnpm --dir tooling/generators validate:sources
git diff --check
```

If source validation fails, keep the proposal in `reviewing` and fix/report the canonical source issue. Do not falsely mark it `accepted`.

### 8. Finalize proposal acceptance metadata

Only after the canonical source exists and source validation is satisfactory:

- `authorityClass: proposal`;
- `lifecycle: accepted`;
- `protocolStability` = the actual maturity of the adopted canonical fact, defaulting to `draft` unless authority explicitly says otherwise;
- `adoptedBy` = the scalar primary canonical owner path;
- update `lastReviewed`;
- add/refresh an adoption note listing assigned IDs, secondary canonical files, scoped decisions, compatibility notes, and deferred questions;
- replace any current-state wording that says the proposal is directly implementable or itself the generated contract.

Historical review/adoption rationale may remain, but current-state summaries must not contradict canonical reality.

### 9. Final report

Report:

- eligibility decision;
- primary `adoptedBy` owner;
- additional canonical sources changed;
- proposal metadata transition;
- assigned IDs / bitOffsets / field IDs;
- scoped/deferred questions;
- validation evidence;
- next step: `tooling/skills/50-generate-axtp-protocol/SKILL.md`.

Future semantic changes to accepted facts use `tooling/skills/40-amend-adopted-protocol/SKILL.md`.

## Non-negotiable source-of-truth rule

Stage 30 creates canonical authority in Registry/spec sources. It never promotes a `workspace/protocol/**` Markdown file into runtime authority and never uses `contract: true`, `generated: true`, or equivalent shadow-authority metadata.

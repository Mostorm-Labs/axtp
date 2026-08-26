---
name: draft-business-protocol
description: Stage 20 drafting skill for AXTP business protocol proposals. Use when business intake or flow planning has identified a concrete AXTP protocol gap that needs a workspace/protocol domain-feature proposal, including method/event/schema/error/capability/profile candidates, JSON examples, stream behavior, protocol classification, or review questions.
---

# Draft Business Protocol

Stage 20 creates or updates `workspace/protocol/<domain>/<domain.feature>.md` as a **proposal / review artifact**. It never creates runtime implementation authority.

## Authority invariant

Every new or materially rewritten proposal MUST use Authority Metadata v2:

```yaml
---
authorityClass: proposal
lifecycle: captured
protocolStability: draft
domain: <domain>
feature: <domain.feature>
adoptedBy:
lastReviewed: YYYY-MM-DD
---
```

`workspace/protocol/**` is always `authorityClass: proposal`, regardless of lifecycle or protocol stability.

The following legacy frontmatter fields are forbidden in v2 proposal metadata:

```text
status
contract
generated
registry
```

Do not describe a workspace proposal as a runtime contract, generated contract, implementation truth, or directly implementable source.

`lifecycle` and `protocolStability` are independent:

- lifecycle: `captured | reviewing | accepted | superseded | archived`
- protocol stability: `draft | experimental | stable | deprecated | reserved`

New proposal default: `captured + draft`.

## Boundaries

- Edit `workspace/protocol/**` only unless the user explicitly asks for closely related authoring documentation.
- Do not edit `contract/registry/**`, `contract/protocol/**`, `contract/generated/**`, `contract/mcp/**`, or `contract/test-vectors/**` in Stage 20.
- Do not assign final numeric IDs unless they already exist in canonical authority. Use `TBD after adoption` for new methodId/eventId/errorCode/fieldId values.
- Do not introduce new PayloadType, Frame Header business fields, WebSocket STREAM support, or runtime Header Profile negotiation without a separate protocol-level design decision.
- Do not use this stage for raw PRD intake; route product intent to business intake first.
- Always preserve unresolved facts as `[REVIEW-ASK]`, `[REVIEW-DRAFT]`, `[REVIEW-FIX]`, or `[REVIEW-BLOCKER]`.
- Follow `workspace/protocol/draft-conventions.md` and the reference template under this skill.

## Workflow

### 1. Read the authority boundary

Read:

```text
workspace/protocol/README.md
workspace/protocol/draft-conventions.md
tooling/skills/20-draft-business-protocol/references/protocol-draft-template.md
specs/30-registry.md
specs/40-codec.md
specs/50-tooling.md
```

For stream, firmware.update, transport-sensitive, HID media, or low-bandwidth work, also read `specs/20-core.md`.

Search relevant proposal and canonical sources before creating anything.

### 2. Decide reuse, modify, or create

| Decision | Use when | Action |
|---|---|---|
| Reuse | Existing proposal already covers the requirement | Add only a review note if needed |
| Modify | Existing `domain.feature` is correct but incomplete | Patch the proposal and preserve review history |
| Create | No existing proposal has the right boundary | Start from the v2 reference template |

If an existing proposal still uses legacy `status/contract/generated/registry` frontmatter and is materially edited, normalize it to Authority Metadata v2 as part of the edit. Do not change protocol semantics merely to migrate metadata.

### 3. Inspect implementation degree without changing authority class

Check matching facts in:

```text
contract/registry/**/*.yaml
contract/registry/domains/**/*.yaml
contract/protocol/axtp.protocol.yaml
contract/generated/**
```

Classify implementation degree separately from proposal lifecycle:

| Degree | Meaning |
|---|---|
| proposal-only | no matching canonical fact |
| partially adopted | some matching canonical facts exist |
| adopted | canonical/generated authority already covers the feature |

Implementation degree NEVER changes `authorityClass: proposal`.

If the requested semantic change targets already-adopted facts, route to `amend-adopted-protocol` instead of creating a second proposal truth source.

### 4. Write the proposal

Use the reference template. At minimum include:

- Authority Metadata v2 frontmatter;
- `0. 速读结论` with proposal lifecycle, protocol stability, canonical adoption, direct implementation = no, interaction type, STREAM usage, registry readiness, conformance, and open questions;
- feature purpose and capability boundary;
- method overview plus one section per method;
- params/result field tables with explicit schema names;
- one compact `d block 示例` per method with request + success;
- event overview plus event payload details where applicable;
- capability fields;
- schema organization appropriate to feature complexity;
- end-to-end flow examples only where real sequencing matters;
- feature-specific errors;
- legacy mapping evidence or explicit absence;
- verification focus and adoption risks;
- real open questions only.

Examples are review aids, not wire truth. Do not use JSON-RPC 2.0 as AXTP wire format unless documenting an external adapter.

### 5. Review marker semantics

| Marker | Meaning |
|---|---|
| `[REVIEW-DRAFT]` | reasonable proposal candidate, not confirmed |
| `[REVIEW-OK]` | this proposal decision passed review |
| `[REVIEW-FIX]` | must revise before adoption |
| `[REVIEW-ASK]` | needs product/architecture/device/legacy confirmation |
| `[REVIEW-BLOCKER]` | would mislead adoption if formalized |

Never move unresolved markers into canonical YAML in Stage 20.

### 6. Final response

Report:

- reuse / modify / create decision;
- proposal path;
- proposal lifecycle + protocol stability;
- what was added or changed;
- key `[REVIEW-*]` questions;
- confirmation that no canonical/generated protocol files were modified;
- next step: human review, then `tooling/skills/30-adopt-protocol-draft/SKILL.md`.

## Non-negotiable source-of-truth rule

A Stage 20 proposal may describe candidate or already-adopted semantics for human review, but runtime/SDK/firmware implementation must read canonical/generated/verification authority. Stage 20 must never create `contract: true`, `generated: true`, or any equivalent shadow-authority signal in `workspace/protocol/**`.

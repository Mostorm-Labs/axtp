---
name: amend-adopted-protocol
description: Stage 40 amendment skill for already-adopted AXTP protocol facts. Use when an adopted method, event, schema field, error, capability, profile, or legacy mapping must be corrected, removed, deprecated, renamed, narrowed, or extended.
---

# Amend Adopted Protocol

Stage 40 changes protocol facts that already exist in canonical Registry/spec sources and generated artifacts.

The associated `workspace/protocol/<domain>/<domain.feature>.md` remains a **proposal / amendment record**. It never becomes implementation authority.

## Authority invariant

An accepted proposal normally has:

```yaml
authorityClass: proposal
lifecycle: accepted
protocolStability: <draft | experimental | stable | deprecated | reserved>
adoptedBy: contract/registry/<primary canonical owner>.yaml
```

During an unresolved amendment review, `lifecycle` MAY temporarily become `reviewing`. After the canonical amendment is accepted and validated, restore `lifecycle: accepted`.

`authorityClass` MUST remain `proposal` throughout. `adoptedBy` remains a single scalar primary canonical owner. Secondary Registry/spec files belong in the amendment note, not in frontmatter lists.

Never introduce legacy v1 metadata (`status`, `contract`, `generated`, `registry`) into a v2 proposal.

## Hard boundaries

- Start from existing accepted canonical facts plus the associated proposal/amendment record.
- Do not infer new semantics from generated files; they are derived evidence only.
- Do not hand-edit `contract/protocol/**`, `contract/generated/**`, `contract/mcp/**`, or `contract/test-vectors/**`.
- Do not silently break stable/MVP wire contracts.
- Preserve unchanged IDs, `bitOffset`, field IDs, method/event names, and capability IDs.
- Never reuse a removed/deprecated stable ID or field ID for different semantics.
- If exact change facts are not confirmed, keep the amendment at proposal/review level and do not patch canonical YAML.
- Legacy mappings require concrete evidence and an explicit canonical target.

## Required evidence

Read only what is needed, including:

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

For transport-sensitive or low-bandwidth changes, also read the relevant Core specs.

## Workflow

### 1. Confirm amendment eligibility

| State | Meaning | Action |
|---|---|---|
| Not adopted | No canonical fact yet | Route to Stage 20/30 |
| Adopted draft/experimental | Canonical fact exists but is not stable | Direct source amendment may be allowed after exact confirmation |
| Adopted stable/MVP | Compatibility-sensitive | Deprecate/version/add optional replacement rather than hard-delete |
| Generated-only mismatch | Canonical YAML correct, derived output stale | Route to Stage 50 |
| Unclear request | Missing exact semantic decision | Keep proposal reviewing; do not patch YAML |

If the proposal still has legacy authority metadata, normalize the metadata only before proceeding. Do not alter protocol semantics as part of metadata migration.

### 2. Capture confirmed change facts

Record:

- target `domain.feature` and canonical owner;
- exact method/event/type/capability/error/profile/legacy mapping affected;
- fields or behavior to add/remove/deprecate/rename/narrow;
- current protocol stability;
- compatibility action;
- rationale/evidence;
- unresolved facts that must remain outside canonical YAML.

### 3. Choose compatibility action

| Change | draft/experimental | stable/MVP |
|---|---|---|
| Remove optional field | May remove if explicitly confirmed and unshipped | Keep/deprecate; never reuse field ID |
| Remove required field | Breaking correction only with explicit approval | Version schema/method or retain compatibility |
| Rename field/method | Replace before broad use where safe | Add replacement and deprecate old name |
| Narrow enum/range | Allowed only if not shipped and confirmed | Treat as breaking/versioned |
| Add optional field | Append next safe field ID | Append next safe field ID |
| Change stable ID | Only if never canonical/generated and explicitly corrected | Never; allocate replacement ID |

### 4. Record the amendment in the proposal

Before editing canonical sources:

- set `lifecycle: reviewing` when the amendment is not yet accepted;
- add/update amendment history with date, change summary, rationale, compatibility action, primary `adoptedBy` owner, and any secondary canonical targets;
- update stale tables/examples only where they describe the amended semantics;
- preserve historical adoption rationale;
- keep unresolved facts as `[REVIEW-ASK]` / `[REVIEW-FIX]` / `[REVIEW-BLOCKER]`.

This proposal update records intent and review context. It is not the semantic change itself.

### 5. Update normative specs only where required

Update `specs/**` only when the amendment changes normative rules, taxonomy, compatibility guidance, profile membership, or shared schema/error governance.

### 6. Patch canonical Registry sources

Edit the existing canonical owner. Do not duplicate the same fact in multiple Registry locations.

Rules:

- preserve unchanged IDs and ordering conventions;
- append new field IDs safely;
- remove only confirmed draft-only facts;
- deprecate stable/MVP facts instead of deleting;
- update schema references consistently;
- do not copy open review prose into YAML.

### 7. Validate canonical sources

Run:

```bash
pnpm --dir tooling/generators build
pnpm --dir tooling/generators test
pnpm --dir tooling/generators validate:sources
git diff --check
```

If source validation fails, do not mark the amendment accepted.

### 8. Regenerate derived authority

After source validation passes, use Stage 50 / the normal generator pipeline. Generated files change only through the generator.

### 9. Finalize proposal metadata

After the canonical amendment and derived validation are accepted:

```yaml
authorityClass: proposal
lifecycle: accepted
protocolStability: <actual canonical stability>
adoptedBy: <primary canonical owner>
```

Update `lastReviewed` and the amendment note. Do not write `contract: true`, `generated: true`, or equivalent direct-implementation wording.

### 10. Final report

Report:

- amendment target and eligibility;
- confirmed change facts and compatibility action;
- primary canonical owner plus secondary sources changed;
- proposal lifecycle transition;
- IDs/bitOffsets/field IDs preserved, removed, deprecated, or newly assigned;
- generated outputs changed by Stage 50;
- validation evidence;
- remaining open questions.

## Non-negotiable source-of-truth rule

Stage 40 changes canonical source facts and records the rationale in a proposal/amendment document. The proposal never replaces Registry/generated/conformance authority, even when its lifecycle is `accepted` and its protocol stability is `stable`.

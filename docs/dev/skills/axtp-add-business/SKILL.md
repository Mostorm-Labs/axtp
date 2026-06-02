---
name: axtp-add-business
description: Interactively guide AXTP business protocol additions. Use when a user wants to add, change, activate, or migrate an AXTP business method, event, type/schema, error, capability, profile, stream/OTA flow, or legacy mapping using the current registry/domains source model and three-stage generator.
---

# AXTP Add Business

Use this skill to add one AXTP business capability or adapt one legacy protocol feature through an interactive, form-driven flow. The goal is to classify the feature with the current `domain.feature` rules, fill protocol facts step by step, then update YAML sources and run the three-stage generator.

## Non-Negotiables

- Ask interactively. Do not dump the full form at once. Ask the next 1-3 missing questions, wait for the user, then continue.
- Do not edit `protocol/axtp.protocol.yaml` by hand.
- Do not edit `docs/generated/*`, `runtimes/*/generated/*`, `tooling/mcp/*`, or `tooling/test-vectors/*` by hand.
- New business features default to `registry/domains/<domain>/domain.yaml`.
- Use core `registry/` files only for core constants, shared schemas, MVP/Core adopted entries, and accepted legacy mappings.
- Never duplicate the same method/event/type/error/capability/profile in both core registry files and domain YAML.
- Promotion from domain to Core/MVP is a governance step: preserve IDs/fieldIds/bit_offset and remove the old domain entry.
- Preserve stable wire values. Never reuse deprecated or stable IDs for different semantics.
- Treat `docs/business/` as intake and review material, not as the final protocol fact source.
- Do not write TBD legacy mappings into specs or YAML. Missing legacy CmdValue, payload, or status details must stay in Open Questions until the user provides evidence.

## Required Evidence

Before proposing YAML, read enough local evidence to avoid guessing:

- `docs/specs/08-AXTP-Capability-Naming-and-Feature-Taxonomy.md` for `domain.feature` naming, feature taxonomy, and method/event naming templates.
- `docs/specs/09-AXTP-Protocol-Definition-Mapping-Spec.md` for domain names, domain placement, ID ranges, DomainId, and bit offset rules.
- `docs/specs/09-14` for Protocol Definition mapping, registry/type/profile meta rules, planning tables, candidate IDs, MVP notes, and legacy hints.
- Existing YAML under `registry/`, especially `registry/domains/`.
- `docs/business/README.md` for the intake-to-registry generation path.
- For stream, OTA, low-bandwidth, or transport-sensitive features, also check `docs/specs/02`, `04`, `05`, `06`, `07`, and `18`.
- For legacy protocol intake, read the user-provided old protocol material first. If `docs/migration/` already has approved mappings for the same command, use them as evidence; otherwise treat the legacy material as unapproved intake.

Summarize the evidence chain before editing.

## Interactive Flow

At each step, ask only what is still unknown. If the repo already answers something, state the inferred value and ask for confirmation only when it materially affects the protocol.

### Step 0 - Intake Mode

Classify the request before collecting fields:

| Mode | Use when | Default output |
|---|---|---|
| `new_business_intake` | The user is defining a new AXTP feature without an old command. | `registry/domains/<domain>/domain.yaml` draft entries. |
| `legacy_protocol_intake` | The user provides old command names, payload bytes, status codes, event reports, spreadsheets, or protocol snippets. | Domain-feature classification, AXTP method/event/capability draft entries, and confirmed legacy mappings only when concrete old values are provided. |

For unapproved legacy intake:

- Classify old commands into `domain.feature` using 08 before naming AXTP methods/events.
- Do not write legacy mappings with unknown CmdValue or status codes.
- Do not add historical explanation or TBD tables to specs.
- Produce Open Questions for missing old command values, payload layout, status mapping, direction, and event trigger evidence.

### Step 1 - Business Intent

Confirm:

- Actor: who calls it, usually Client/Host/Cloud.
- Device behavior: what the device must do.
- Interaction model: `request_response`, `event_only`, or `stream_control`.

Example question:

> 这个业务的核心动作是什么？例如“Host 请求设备打开 HID 音视频 STREAM，设备返回 streamId 和协商参数”。

### Step 2 - Domain Placement

Domain placement must follow `docs/specs/09-AXTP-Protocol-Definition-Mapping-Spec.md`. Do not maintain an independent domain list in this skill.

Required checks:

- Read Section 6.1 `Domain 命名` for the allowed native AXTP domains and explicit non-domain names.
- Read Section 9 `Domain Registry 规则` for domain meaning, MVP scope, and old-domain normalization rules.
- Read Section 10 `MethodId 分配规则` and Section 11 `EventId 分配规则` before assigning method/event IDs.
- Read Section 13 `CapabilityId 分配规则` and Section 23 `Domain-Scoped Mask` before assigning capability IDs, DomainId, or bit offsets.

Selection rules:

- Choose an existing domain from Section 9 whenever possible.
- If the user's term is a legacy/product term, map it according to Section 9 notes instead of creating a new domain.
- If no Section 9 domain fits, stop and propose a registry governance change to `docs/specs/09-AXTP-Protocol-Definition-Mapping-Spec.md` before adding source YAML.
- Method name and event name rationale must cite 08; ID range, DomainId, and bit offset rationale must cite the matching 09 sections in the evidence chain.

Default target for new business:

```text
registry/domains/<domain>/domain.yaml
```

### Step 3 - Method Shape

For each method, confirm:

- Name: `domain.verbObject`, camelCase.
- RPC op: usually `request_response`.
- Status: usually `draft` for new business.
- Since: usually current protocol version.
- Description.

Recommended verbs: `get`, `set`, `list`, `open`, `close`, `start`, `stop`, `begin`, `end`, `verify`, `apply`, `abort`, `resume`.

### Step 4 - Request Fields

Collect one field at a time or in a short table:

- `name`
- `type`: `uint8`, `uint16`, `uint32`, `uint64`, `int*`, `bool`, `enum`, `bitmap`, `string`, `bytes`, `object`, `array`
- `required`
- limits: `min`, `max`, `max_length`
- description

Use `verifyType` + `verifyValue` for generic object verification unless a spec explicitly requires algorithm-specific fields.

### Step 5 - Response Fields

Collect response fields the same way. If there are no business fields, use an empty response schema and let Protocol IR map it to `Empty`.

### Step 6 - Events

Ask whether async notification is needed. If yes:

- Name events as `domain.objectChanged`, `domain.actionCompleted`, or `domain.error`.
- Define payload fields.
- Link `trigger` to the method.
- Link required capability.

### Step 7 - Errors

Prefer existing errors first. Common choices:

| Error | Use |
|---|---|
| `SUCCESS` | success |
| `RPC_PARAM_INVALID` | invalid parameter |
| `OUT_OF_RANGE` | value outside valid range |
| `BUSY` | device busy |
| `NOT_SUPPORTED` | unsupported feature |
| `INVALID_STATE` | current state disallows operation |
| `PERMISSION_DENIED` | access denied |

Add a domain-specific error only when existing errors are not precise enough.

### Step 8 - Capability And Profile

Confirm:

- Capability name: usually `domain.featureName`.
- Capability type/schema.
- Whether this is optional, draft, or part of an implementation profile.
- Whether it should remain domain-level or be promoted to Core/MVP.

New business capabilities normally stay in `registry/domains/<domain>/domain.yaml`.

### Step 9 - Legacy Mapping

Use this step for `legacy_protocol_intake`, or when a new business request also has an existing old command.

Collect only evidence-backed values:

- `legacy_protocol`
- `legacy_cmd_value`
- `legacy_name`
- target method
- direction
- status/error mapping
- old payload shape and field mapping
- old event/report trigger, if any

Write `registry/legacy/legacy_mapping.yaml` only after the AXTP target method is clear and the old command value/status mapping is concrete. If the user has not supplied approved legacy values, update only the AXTP domain draft and leave legacy mapping as Open Questions.

### Step 10 - Review Before Editing

Before editing YAML, present:

```text
Business intent:
Intake mode:
Evidence chain:
Chosen YAML target:
Method/event/type/error/capability/profile summary:
Domain-feature classification:
ID and bit_offset rationale:
Legacy impact:
Generated outputs expected:
Open questions:
```

Proceed with edits only when the form is complete enough to avoid inventing wire facts.

## YAML Source Rules

- Source YAML uses `id` and `bit_offset`; generated Protocol IR uses `methodId`/`eventId` and `bitOffset`.
- `bit_offset` must be unique and contiguous from 0 within the same domain.
- Method/event names and IDs must be globally unique.
- Field IDs are one byte (`0x01`-`0xFF`) within a schema and must remain stable.
- Empty requests/responses may use an empty source schema; Protocol IR must map empty schemas to `Empty`.
- `capability.supportedMethods` bitmaps derive from `methods[].bitOffset`.
- Do not add legacy Protocol Definition fields such as `bitmapId`, `requests`, or `requiredRequests`.

## Generator Workflow

After source edits:

```bash
pnpm --dir generators build
pnpm --dir generators test
pnpm --dir generators validate:sources
pnpm --dir generators generate
pnpm --dir generators validate:protocol
git diff --check
```

`generate --spec ..` performs the three-stage flow:

```text
validate sources -> build protocol/axtp.protocol.yaml -> validate Protocol IR -> emit generated artifacts
```

Expected generated outputs include:

- `protocol/axtp.protocol.yaml`
- `docs/generated/protocol.md`
- `docs/generated/protocol.json`
- `docs/generated/*_registry.generated.md`
- `tooling/mcp/*.generated.json`
- `runtimes/cpp-core/include/axtp/generated/*`
- `tooling/test-vectors/*`

## Report Back

Final response should include:

- Evidence read.
- Source YAML files changed.
- Generated files changed.
- Validation commands and results.
- Any unresolved protocol choices.

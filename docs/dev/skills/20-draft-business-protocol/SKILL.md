---
name: draft-business-protocol
description: Stage 20 drafting skill for AXTP business protocol proposals. Use when rough product, architecture, legacy, or flow-gap requirements need a docs/protocol domain-feature draft, including method/event/schema/error/capability/profile candidates, JSON examples, stream or firmware.update flows, or protocol classification. Writes docs/protocol drafts only by default and must not write registry YAML or generated artifacts.
---

# Draft Business Protocol

Stage 20. Create or update an AXTP business protocol draft in `docs/protocol/<domain>/<domain.feature>.md`. This stage produces a reviewable protocol proposal for product, architecture, R&D, and test review.

## Boundaries

- Edit only `docs/protocol/**` unless the user explicitly asks for documentation around the draft.
- Do not edit `registry/**`, `registry/domains/**`, `protocol/axtp.protocol.yaml`, `docs/generated/**`, `tooling/mcp/**`, or `tooling/test-vectors/**`.
- Do not assign final numeric IDs unless they already exist in YAML/specs; use `TBD after adoption` for new methodId/eventId/errorCode/fieldId values.
- Do not introduce new PayloadType, Frame Header business fields, WebSocket STREAM support, or runtime Header Profile negotiation.
- JSON examples must be embedded in the `docs/protocol/**` Markdown draft by default; do not create generated JSON artifacts unless the user explicitly asks.
- JSON examples in protocol drafts must show only the RPC `d` data block, not the outer `sid` / `op` / `d` wire envelope, unless the user explicitly asks to document wire format. Request examples use `id`, `method`, and optional `params`; response examples use `id`, `status`, and optional `result`; event examples use `event`, numeric `intent`, and optional `data`.
- Always leave `[REVIEW-*]` markers for human review. Unconfirmed facts must be `[REVIEW-ASK]`, `[REVIEW-DRAFT]`, `[REVIEW-FIX]`, or `[REVIEW-BLOCKER]`.

## Required Workflow

### 1. Locate AXTP Context

Work from the repository root containing `docs/specs`, `docs/protocol`, and `registry`. Read only the relevant parts of:

```text
docs/protocol/README.md
docs/specs/2-registry/01-Naming-and-Taxonomy.md
docs/specs/4-tooling/01-YAML-Mapping.md
docs/specs/2-registry/02-Methods-Registry.md
docs/specs/2-registry/03-Events-Registry.md
docs/specs/2-registry/04-Errors-Registry.md
docs/specs/3-codec/02-Capability-Types.md
docs/specs/2-registry/05-Profiles-Registry.md
docs/specs/4-tooling/02-Generator-V1.md
```

For stream, firmware.update, transport-sensitive, HID media, or low-bandwidth work, also read:

```text
docs/specs/1-core/03-Frame-and-Payload.md
docs/specs/1-core/04-Transport-Profiles.md
docs/specs/1-core/05-Control-Session.md
docs/specs/1-core/06-RPC-Session.md
docs/specs/1-core/07-Stream-Data-Plane.md
docs/specs/1-core/08-Low-Bandwidth-Degradation.md
```

Search `docs/protocol/**`, `registry/**`, and `registry/domains/**` for the requirement keywords and likely English equivalents.

### 2. Decide Reuse, Modify, Or Create

Make one decision and explain it in the draft and final response:

| Decision | Use when | Action |
|---|---|---|
| Reuse existing draft | Existing `docs/protocol/<domain>/<domain.feature>.md` already covers the requirement | Add a short review note or leave unchanged if complete |
| Modify existing draft | Existing domain.feature is right but lacks scenario, method, event, schema, error, or boundary details | Patch that draft; preserve existing review markers and user edits |
| Create new draft | No existing feature has the right boundary | Create `docs/protocol/<domain>/<domain.feature>.md` from `references/protocol-draft-template.md` |

Choose `domain.feature` by 08 rules: feature is a capability block, not a field name. Keep `stream` for common data plane only; business streams are owned by the business domain and bind to STREAM through RPC-created `streamId`.

### 3. Inspect Implementation Degree

Check whether matching facts already exist:

```text
registry/**/*.yaml
registry/domains/**/*.yaml
docs/generated/protocol.md
protocol/axtp.protocol.yaml
```

Use the result to label implementation degree:

| State | Meaning |
|---|---|
| Not drafted | No matching protocol draft found |
| Drafted only | Exists in `docs/protocol`, not in YAML |
| Partially adopted | Some facts exist in YAML, but draft has gaps |
| Adopted | YAML/generated already cover the feature |

If adopted, do not create a duplicate draft. If the user asks for a semantic change, field removal, deprecation, rename, narrowing, or extension to adopted facts, route to `amend-adopted-protocol`; otherwise add a review note explaining the existing path and any remaining gap.

### 4. Write The Draft

Use `apply_patch` for manual edits. A draft must include:

- frontmatter status and contract state
- a `0. 速读结论` table summarizing purpose, state, implementation contract status, main interaction type, STREAM usage, registry readiness, conformance state, and unresolved questions
- concise function description
- capability boundary: included, excluded, and data-plane usage
- method section with two layers: `3.0 方法速览` and one independent subsection per method
- method overview table columns: Method, 调用类型, 用途, Params Schema, Result Schema, 是否触发事件, 状态
- per-method detail blocks with purpose, call type, Params Schema, Result Schema, event trigger behavior, idempotency/async notes, common errors, params fields, result fields, possible events, and method-specific error table
- params/result field table headings that include the schema name, such as `请求参数 Params：SetVolumeParams` and `返回结果 Result：AudioVolumeState`
- event section with two layers: `4.0 事件速览` and one independent subsection per event
- event overview table columns: Event, 触发条件, Payload Schema, 客户端处理建议, 状态
- per-event detail blocks with trigger conditions, Payload Schema, payload field table, and client handling advice
- event payload field table headings that include the schema name, such as `Payload：XxxChangedEvent`
- capability table with field, type, required, range/enum, and description
- schema field tables with field, type, required, range/enum, default, and description
- JSON examples for key method requests/responses/events/failures
- candidate errors
- legacy mapping candidates or `[REVIEW-ASK]`
- registry/conformance status
- test notes
- a `12. 待确认问题` table with issue, impact, current recommendation, and status

Prefer concise tables. Do not force a heavy Purpose/Scope/Lifecycle/Stream Usage/Non-goals template on simple features. Complex features may add state machines, interaction flows, STREAM details, or more examples only when useful. Use `TBD after adoption` for numeric IDs.

The default `docs/protocol/<domain>/<domain.feature>.md` draft is a human-readable review artifact, not the machine truth source and not a runtime implementation contract. It should help product/architecture understand scope, engineers see method/event/schema details, test owners derive conformance cases, migration owners map legacy commands, and protocol maintainers judge registry readiness. Formal machine truth remains in `registry/**/*.yaml`, `protocol/axtp.protocol.yaml`, `docs/generated/**`, and `docs/conformance/**`.

For schema-heavy features, organize the schema section for reading, not just completeness:

- Start with a schema hierarchy overview that explains the main data blocks and how they relate.
- Separate request/response schemas, capability schemas, runtime config/state schemas, and event payload schemas.
- For object families, split each object into its own field table instead of putting every nested field into one long flat table.
- Explain `Capabilities` / descriptor schemas as "what the device can do" and `Config` / `State` schemas as "what currently applies or will be changed".
- Include range, enum, unit, default, and restart/apply notes close to the field table where readers need them.
- Choose one schema expansion mode and stay consistent:
  - For simple features, expand params/result/payload fields directly under each method/event, and keep the schema section as an index.
  - For complex features, keep method/event blocks readable by naming the schema and linking to the exact schema subsection, then define fields once in the schema section.
- Never make readers infer whether a field table is method params, method result, event payload, shared schema, or capability. The heading and nearby prose must say which schema it belongs to.
- Keep capability fields only in the Capability section; do not mix capability descriptors into method params/results or event payloads.

When creating a new draft or materially updating an existing draft, include or refresh a `JSON 示例` section:

- Structure examples as scenario blocks: short scenario, request, response or event, and a brief "读法" paragraph.
- Cover the main happy-path request/response pairs for the feature.
- Include representative event payload examples when events are proposed.
- Include at least one important edge or failure example when the scenario depends on error handling.
- For schema-heavy features, include at least one complete representative config/state example, not only a minimal patch.
- Keep examples consistent with candidate schema names and fields, but do not imply final methodId/eventId/fieldId values.
- Use RPC `d` data-block examples only; do not wrap examples in the outer `sid` / `op` / `d` envelope.
- Request examples must include `id`, `method`, and optional `params`.
- Response examples must echo `id`, include `status.ok`, and use numeric `status.code`; use `0` for success.
- Event examples must include `event`, numeric `intent`, and optional `data`; do not include request `id` in events.
- Do not use string error names in `status.code`. Use adopted numeric ErrorCode values from specs/YAML/generated. If a draft-only candidate error lacks a numeric code, either use the nearest adopted common numeric code in the JSON example and put the candidate name in `status.details.candidateError`, or state that the final code is `TBD after adoption` in prose outside JSON.
- Validate JSON examples mentally or with a parser when practical; examples should be readable and syntactically valid.
- Use placeholders for secrets, credentials, tokens, keys, personal data, serial numbers, MAC addresses, and IP addresses when exact values are not confirmed.
- Mark unconfirmed example fields or behavior in nearby prose with `[REVIEW-ASK]`.
- For existing drafts, refresh examples for methods/events that were added or changed; if the draft has no examples yet, add examples for the feature's primary workflow.

For complex or high-risk features, append optional review appendices instead of forcing them into every draft. Use these appendices for reset/factory restore, firmware update, security/auth, network config, storage format, lifecycle/reboot/shutdown, or any capability that may disconnect, delete data, change permissions, change software versions, or alter device identity:

- `附录 A. 协议审核标记`
- `附录 B. 协议决策记录`
- `附录 C. Registry 草案输入`
- `附录 D. 采纳检查清单`

Appendix Registry draft input is only draft input: never assign final methodId/eventId/errorCode/fieldId values in Markdown; use `TBD after adoption`.

### 5. Final Response

Return:

- decision: reuse, modify, or create
- draft file path
- what was added or changed
- JSON examples added or refreshed
- key review questions / `[REVIEW-*]` blockers
- confirmation that no registry/generated/protocol files were modified
- next step: after human review, use `docs/dev/skills/30-adopt-protocol-draft/SKILL.md`

## Review Marker Semantics

| Marker | Meaning |
|---|---|
| `[REVIEW-DRAFT]` | Reasonable draft candidate, not yet accepted |
| `[REVIEW-OK]` | Naming/boundary/interface direction looks acceptable |
| `[REVIEW-FIX]` | Must revise before adoption |
| `[REVIEW-ASK]` | Needs product, architecture, device, or legacy confirmation |
| `[REVIEW-BLOCKER]` | Would mislead adoption or generation if formalized as-is |

Never move `[REVIEW-ASK]`, `[REVIEW-FIX]`, or `[REVIEW-BLOCKER]` facts into YAML in this skill.

## Useful Commands

```bash
rg --files docs/protocol registry registry/domains docs/specs
rg -n "keyword1|keyword2|关键词" docs/protocol registry registry/domains docs/specs
git diff --check -- docs/protocol
git status --short docs/protocol docs/specs docs/generated registry protocol
```

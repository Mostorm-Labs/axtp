---
name: axtp-add-business
description: Guide an AXTP business protocol addition through registry/domain YAML forms, evidence checks, Protocol IR generation, and generated protocol artifacts. Use when a user asks to add, change, activate, or migrate an AXTP business method, event, schema, error, capability, profile, or legacy mapping.
---

# AXTP Add Business

Use this skill when the user asks to add or change AXTP business protocol content. The source of truth is `registry/**/*.yaml` and `domains/**/*.yaml`; `protocol/axtp.protocol.yaml` and every `generated/` path are generated outputs.

## Non-Negotiables

- Do not hand-edit `protocol/axtp.protocol.yaml`.
- Do not hand-edit `docs/generated/*`, `runtimes/*/generated/*`, or `tooling/*` generated artifacts.
- Read the relevant specs before proposing YAML: `docs/specs/08-13` plus the planning/reference material in `docs/source/09-13`.
- Prefer `domains/<domain>/domain.yaml` for new business features. Use `registry/` for core constants, shared schema, MVP adopted entries, and legacy mappings already accepted into the core registry.
- Preserve stable IDs, `fieldId`, and `bit_offset`; never reuse a deprecated or stable wire value for different semantics.

## Workflow

1. Capture the business intent in one sentence: actor, action, target device behavior, and whether the operation is request/response, event-only, or stream-related.
2. Check evidence:
   - `docs/specs/08-13` for meta rules.
   - `docs/source/09-13` for planning tables, candidate IDs, MVP notes, and legacy hints.
   - `registry/**/*.yaml` and `domains/**/*.yaml` for existing equivalent entries.
3. Decide placement:
   - Existing MVP/core item: update the matching `registry/` YAML.
   - New domain business item: write or update `domains/<domain>/domain.yaml`.
   - Shared primitive/type/capability: update `registry/schema/` or `registry/capability/`.
   - Legacy command mapping: update `registry/legacy/legacy_mapping.yaml` only after a current AXTP method target is clear.
4. Fill the business form below. Ask only for missing facts that cannot be derived from the repo.
5. Write YAML source changes only after the form is complete.
6. Run generation and validation:
   - `cd generators && node dist/cli.js validate-sources --spec ..`
   - `cd generators && node dist/cli.js build-protocol --spec .. --out ../protocol/axtp.protocol.yaml`
   - `cd generators && node dist/cli.js validate-protocol --spec ..`
   - `cd generators && node dist/cli.js emit-protocol --spec .. --out ../docs/generated`
   - `git diff --check`
7. Report the evidence chain, source YAML changes, generated artifacts, and verification results.

## Business Form

Collect these fields before editing YAML:

```yaml
businessIntent:
  summary:
  clientActor:
  deviceBehavior:
  syncModel: request_response | event_only | stream_control

domain:
  name:
  reason:
  existingDomainIdOrRange:

methods:
  - name:
    id:
    bit_offset:
    status: draft | mvp | stable
    since:
    description:
    request_schema:
    response_schema:
    encodings: [json, binary_tlv]
    capabilities: []
    events: []
    errors: []

types:
  - name:
    kind: object
    fields:
      - id:
        name:
        type:
        required:
        min:
        max:
        max_length:
        description:

events:
  - name:
    id:
    bit_offset:
    status:
    since:
    event_schema:
    severity:
    trigger: []
    capabilities: []

errors:
  - name:
    id:
    domain:
    retryable:
    description:

capabilities:
  - name:
    id:
    domain:
    type:
    schema:
    description:

legacyMapping:
  legacy_protocol:
  legacy_cmd_value:
  legacy_name:
  axtp_method_name:
  direction:
  status_mapping:

streamOrOta:
  createsStream:
  streamProfile:
  streamContextFields:
  objectVerification:
    verifyTypeField:
    verifyValueField:
```

## Evidence Output

Before editing, summarize:

```text
Business intent:
Registry/spec evidence:
Existing entries checked:
Chosen YAML target:
ID and bit_offset rationale:
Schema/error/event/capability impact:
Legacy impact:
Generated outputs expected:
```

## YAML Rules

- Method names use `domain.verbObject`; event names use `domain.objectChanged` or `domain.actionCompleted`.
- Source YAML uses `id` and `bit_offset`; generated Protocol IR uses `methodId`/`eventId` and `bitOffset`.
- Empty requests/responses may use existing empty schemas in source YAML, but the generated Protocol IR must map them to `Empty`.
- Field IDs are one byte (`0x01`-`0xFF`) within a schema and must remain stable.
- `capability.supportedMethods` bitmaps derive from `methods[].bitOffset`; do not add `bitmapId`, `requests`, or `requiredRequests`.
- For stream/OTA object verification, prefer generic `verifyType` and `verifyValue`; do not hard-code algorithm-specific `hashAlgo`/`hash` unless the referenced spec explicitly requires it.

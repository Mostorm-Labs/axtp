# AXTP Contract Boundaries

This file defines source-of-truth order and conflict handling. It does not define new wire fields, registry entries, generated protocol facts, or release procedures.

## Implementation Contract

Runtime, SDK, mock server, and test tooling consume the AXTP contract in this order:

1. Released spec artifact or exact `spec/vMAJOR.MINOR.PATCH` tag.
2. `contract/protocol/axtp.protocol.yaml`.
3. `contract/generated/protocol.md` and `contract/generated/protocol.json`.
4. `conformance/**`.
5. `specs/**`.

`specs/**` explains design rules and compatibility boundaries. Current callable methods, events, schemas, errors, capabilities, profiles, ids, and generated metadata come from `contract/registry/**`, Protocol IR, and generated outputs.

Runtime MUST NOT implement draft-only `workspace/protocol/**` entries unless explicitly building a mock/prototype.

## Maintenance Sources

Protocol maintainers modify protocol facts through:

```text
specs/**                         # standard rules
contract/registry/**/*.yaml       # hand-written machine facts
tooling/generators/**             # deterministic source-to-contract tooling
contract/protocol/**              # generated Protocol IR
contract/generated/**             # generated references
conformance/**                    # behavior acceptance inputs
```

Generated outputs are not hand-written inputs. If generated output is wrong, fix specs, YAML, or generator behavior, then regenerate.

## Non-Contract Material

These paths are review input, planning, archive, or workflow material:

```text
workspace/business/**
workspace/flows/**
workspace/protocol/** before adoption
workspace/registry-planning/**
workspace/legacy-migration/**
docs/product/roadmap.md
docs/archive/**
tooling/skills/**
```

They can guide review, but they cannot bypass adoption, registry update, generation, and conformance.

## Conflict Rules

| Conflict | Winner | Action |
|---|---|---|
| Generated output vs draft | Generated output | Fix draft or adoption path. |
| Generated output vs specs/YAML | YAML/spec/generator source | Fix source or generator, regenerate. |
| Conformance vs specs/generated | Formal contract | Fix conformance or contract; do not make runtimes work around contradictions. |
| Roadmap vs generated contract | Generated contract | Roadmap must become business/flow/draft/registry before implementation. |
| Legacy mapping vs generated contract | Generated contract | Mark blocked, adapter-private, or route through migration review. |

## Session Boundary

AXTP deliberately separates link, RPC, and stream contexts:

| Context | Created by | Use |
|---|---|---|
| Transport connection | Transport connect/accept | Raw carrier. |
| Framed Link Context | CONTROL OPEN / ACCEPT | Standard Framed runtime link. |
| RPC Session | Hello / Identify / Identified | Business session route via `sid`. |
| Stream Context | Adopted RPC method or profile | STREAM payload interpretation. |

`sessionId` from CONTROL is not `sid`. `sid` is the business RPC Session ID. `messageId` is not `requestId`. `streamId` is not `requestId`.

## Business Adoption Path

Business protocol facts move in one direction:

```text
workspace/business or workspace/flows
  -> workspace/protocol/<domain>/<domain.feature>.md
  -> contract/registry/domains/<domain>/domain.yaml
  -> contract/protocol/axtp.protocol.yaml
  -> contract/generated/**
  -> conformance and runtime implementation
```

`domain.feature` decides business ownership. `method`, `event`, `schema`, `error`, `capability`, and `profile` decide machine-readable facts.

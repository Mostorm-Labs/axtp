# AXTP Tooling And Versioning

This file defines how source registry YAML becomes Protocol IR, generated references, release artifacts, and runtime binding metadata.

## Source To Contract

Registry YAML is the hand-written machine source model. Protocol IR and generated references are outputs.

```text
contract/registry/**/*.yaml
  -> validate-sources
  -> contract/protocol/axtp.protocol.yaml
  -> validate-protocol
  -> contract/generated/protocol.md
  -> contract/generated/protocol.json
  -> contract/mcp/**
  -> contract/test-vectors/**
```

Rules:

1. `contract/protocol/axtp.protocol.yaml` MUST NOT be hand-edited.
2. `contract/generated/**`, `contract/mcp/**`, and `contract/test-vectors/**` MUST be regenerated from source.
3. Generator MUST NOT infer formal protocol facts from `workspace/protocol/**`, `workspace/registry-planning/**`, archive docs, or generated markdown.
4. Domain YAML and core registry YAML become one Protocol IR fact set after validation.
5. The same method/event/error/schema/capability/profile MUST NOT be defined twice.
6. Protocol IR MUST preserve enough information for generated docs, machine JSON, SDK/runtime metadata, and conformance.

## Source Inputs

| Input | Responsibility |
|---|---|
| `contract/registry/core/*.yaml` | PayloadType, RPC op, encoding, CONTROL opcode, and core enums. |
| `contract/registry/error/error_code.yaml` | Core/shared error registry. |
| `contract/registry/schema/*.yaml` | Core/shared schema. |
| `contract/registry/capability/*.yaml` | Core/shared capability/profile facts. |
| `contract/registry/domains/<domain>/domain.yaml` | Business domain methods, events, schemas, errors, capabilities, and profiles. |
| `contract/registry/version.yaml` | Spec/contract/registry/schema/wire metadata. |

Business facts enter the source model only after review, adoption, and registry update.

## Generator Requirements

Generator MUST:

- parse YAML deterministically;
- validate id/name uniqueness and references before emitting;
- preserve stable ids, fieldIds, bitOffsets, status, and since metadata;
- fail on unsupported source shapes rather than silently dropping facts;
- emit deterministic Protocol IR and generated references;
- keep generated artifacts byte-for-byte stable for the same source and template version;
- fail CI when generated outputs drift from source.

Generator SHOULD emit target-language metadata or code from Protocol IR, not from markdown.

## Validation

`validate-sources` MUST check:

- source YAML shape;
- id/name uniqueness;
- domain/name prefix alignment;
- method request/response schema references;
- event payload references;
- error/capability/profile references;
- fieldId, bitOffset, status, and since consistency;
- no duplicate facts between core and domain YAML.

`validate-protocol` MUST check Protocol IR against source model, core specs, and generated output. It also checks key protocol invariants such as Big-Endian / network byte order, required CONTROL opcodes, optional READY, ACK/NACK future status, and the 16B STREAM Header.

Required repository checks:

| Command | Contract guarded |
|---|---|
| `pnpm --dir tooling/generators validate` | Source YAML shape and registry references. |
| `pnpm --dir tooling/generators validate:sources` | Source YAML plus generated Protocol IR consistency. |
| `pnpm --dir tooling/generators validate:protocol` | Protocol IR plus hand-written core/codec spec invariants. |
| `tooling/scripts/check-generated-drift.sh` | Generated artifacts are reproducible from source. |
| `tooling/scripts/check-release-artifact.sh <version>` | Release artifact contains the consumable contract and excludes maintainer-only material. |
| `tooling/scripts/validate-conformance.sh` | Conformance manifest and cases remain structurally valid. |

## Versioning

AXTP releases immutable spec snapshots with tags:

```text
spec/vMAJOR.MINOR.PATCH
```

Runtime package versions are separate from AXTP Spec versions. Runtime repositories MUST bind to a spec tag, exact commit, or release artifact; they MUST NOT depend on floating `main` for release builds.

Version semantics:

| Part | Meaning |
|---|---|
| MAJOR | Incompatible protocol change. |
| MINOR | Backward-compatible capability, registry, profile, generated fact, or artifact-layout addition. |
| PATCH | Non-breaking correction or clarification. |

Patch releases MUST NOT change wire compatibility. Minor releases MAY expand generated registry and machine-readable facts without invalidating previous minor functionality. Major releases are explicit compatibility boundaries.

## Release Artifact

Default release artifact contains the runtime-consumable contract:

```text
README.md
LICENSE
CHANGELOG.md
docs/README.md
docs/guides/**
docs/product/**
specs/**
contract/**
conformance/**
release/**
manifest.yaml
```

It MUST NOT contain maintainer-only workspace planning, legacy evidence, lifecycle skills, local outputs, or release templates.

## Compatibility

Breaking changes include incompatible changes to Standard Frame layout, PayloadType semantics, CONTROL required fields, RPC envelope semantics, STREAM Header, stable method/event/error ids, stable schema fields, or stable profile required sets.

Compatible changes usually include new optional schema fields, new optional capabilities, new draft entries, new generated metadata that preserves old facts, and documentation clarifications.

Deprecated facts MUST remain generated until release policy explicitly removes them. Reserved ids MUST NOT be reused.

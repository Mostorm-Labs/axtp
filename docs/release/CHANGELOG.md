# AXTP Spec Changelog

This changelog records AXTP Spec releases published with `spec/vMAJOR.MINOR.PATCH` tags.

## spec/v0.0.4

Spec repository purification, documentation workflow, and Phase 1 STREAM data-plane alignment release.

### Protocol

- Reorganizes the main repository as a protocol-first spec repository with root runtime leftovers removed and runtime source/docs moved out of the AXTP spec tree.
- Groups the formal `docs/specs/` corpus into core, registry, codec, and tooling sections to make the protocol reading path easier to follow.
- Aligns Phase 1 CONTROL scope to `OPEN / ACCEPT`, `HEARTBEAT / HEARTBEAT_ACK`, and `CLOSE / CLOSE_ACK`; ACK/NACK remains reserved for future reliable-transfer profiles.
- Aligns Standard Framed transports to support CONTROL, RPC, and Phase 1 STREAM data packets for adopted audio/video media stream profiles.
- Clarifies RPC encoding order and semantics: `JSON`, `CBOR`, `MSGPACK`, and `JSON_BINARY`; `bodyEncoding` applies only to `JSON_BINARY` with `NONE`, `TLV8`, and `TLV16`.
- Adds and refines onboarding docs including `KICKOFF.md`, `ROADMAP.md`, core protocol flow, quickstart, and runtime MVP/conformance guidance.

### Registry

- Updates protocol metadata, transport capability declarations, control opcode status, RPC encoding facts, body encoding facts, and `protocol.payload.stream` capability status to match the Phase 1 decisions.
- Refreshes `protocol/axtp.protocol.yaml`, generated protocol references, generator snapshots, and MCP/tooling registry outputs from the YAML source facts.
- Keeps adopted business methods limited to the current generated `audio.algorithm` surface while documenting that video/audio stream business methods must be adopted before becoming a published runtime contract.

### Schemas

- No breaking schema shape changes are introduced for adopted business methods.
- Refreshes generated schema references and snapshots as part of the source-to-generated validation pipeline.
- Clarifies `sid`, `requestId`, `rpcEncoding`, `bodyEncoding`, and STREAM header typing in the core specs and generated references.

### Conformance

- Moves conformance into the `docs/conformance/**` documentation hierarchy and keeps release artifacts compatible by packaging conformance at the artifact root.
- Updates conformance manifest and framed-binary/stream profiles so Standard Framed runtime MVP covers CONTROL open/heartbeat/close, RPC request matching, and media STREAM open/data/close semantics.
- Revises STREAM conformance cases to model media stream lifecycle through business-domain methods such as `video.openStream` / `video.closeStream` instead of requiring generic `stream.open` / `stream.close`.
- Keeps ACK/NACK strict retransmission outside Phase 1 conformance requirements.

### Migration

- Consolidates legacy evidence, classification, plans, generated outputs, and planning docs under `docs/legacy-migration/**`.
- Updates legacy classification and migration tooling paths to the new docs layout.
- Preserves legacy migration guidance while keeping legacy adapters outside the AXTP Core wire contract.

### Runtime Impact

- Standard Framed runtimes should treat STREAM as a Phase 1 P0 data-plane requirement for adopted audio/video media stream profiles.
- WebSocket JSON remains RPC-only and does not carry CONTROL or STREAM payloads.
- Runtime conformance scripts should prefer `$AXTP_SPEC_PATH/docs/conformance` and may retain `$AXTP_SPEC_PATH/conformance` fallback for release artifact compatibility.
- Runtime and SDK teams should continue to bind to a fixed `spec/v0.0.4` tag or commit through their spec lock metadata; no runtime package release is part of this Spec release.

## spec/v0.0.3

Conformance foundation release for AXTP Spec and runtime/tool repositories.

### Protocol

- No wire protocol fact changes from `spec/v0.0.2`.
- Keeps current `spec/v0.0.2` method and event names, including `audio.getAlgorithmConfig`, `audio.setAlgorithmConfig`, `audio.getAlgorithmCapabilities`, and `audio.algorithmConfigChanged`.
- Keeps capability discovery out of the wire-level conformance surface because current protocol docs reserve `capability.getAll` for v2/P1.

### Registry

- No registry ID or method/event fact changes from `spec/v0.0.2`.
- Treats capability conformance as generated registry and capability metadata validation against the existing registry facts.

### Schemas

- Adds conformance case and result JSON schemas under `docs/conformance/schemas/`.
- Keeps existing protocol and business schema facts unchanged.

### Conformance

- Adds the first AXTP conformance manifest, profiles, fixtures, and YAML case suite.
- Adds 22 conformance cases covering core RPC/error behavior, session gating, framed binary handshakes, WebSocket JSON-RPC, events, streams, and capability metadata.
- Adds `scripts/validate-conformance.sh` and a `Validate conformance cases` CI workflow to validate case IDs, manifest references, profile coverage, schemas, and result shape.

### Migration

- No migration content changes from `spec/v0.0.2`.
- Existing legacy migration boundaries continue to apply.

### Runtime Impact

- Runtime/tool repositories should consume the shared `docs/conformance/` directory from the locked AXTP Spec checkout instead of defining their own case sources.
- Native runtime conformance runners should emit `conformance-results/result.json` using the shared result schema and explicitly report unsupported or skipped cases.
- No npm, pub, PyPI, Docker, or runtime package registry publish is part of this Spec release.

## spec/v0.0.2

Automation validation release for the AXTP Spec to runtime/tool upgrade flow.

### Protocol

- No protocol fact changes from `spec/v0.0.1`.
- Uses the current generated AXTP protocol snapshot to validate release artifact packaging.

### Registry

- No registry fact changes from `spec/v0.0.1`.
- Reuses the current method, event, error, capability, profile, and domain registry facts.

### Schemas

- No schema source changes from `spec/v0.0.1`.
- Reuses the current generated schema descriptors and metadata.

### Conformance

- Validates that the release workflow can build the Spec artifact and dispatch runtime/tool upgrades.
- Validates that runtime/tool repositories can regenerate artifacts from the released Spec tag.

### Migration

- No migration content changes from `spec/v0.0.1`.
- Reuses the current legacy classification and migration planning material.

### Runtime Impact

- Exercises the automatic `spec/v0.0.2` to runtime/tool `v0.0.2` synchronization path.
- Expected runtime/tool behavior is automated upgrade PR creation, generated manifest refresh, auto-merge after checks, `v0.0.2` tag creation, and GitHub Release creation.
- No npm, pub, PyPI, Docker, or runtime package registry publish is part of this Spec release.

## spec/v0.0.1

Initial tagged AXTP Spec release from the current repository snapshot.

### Protocol

- Publishes the current AXTP protocol specs as the first immutable Spec tag.
- Establishes AXTP v1 core wire documentation, transport profiles, RPC/CONTROL/STREAM specs, and compatibility/versioning guidance as the baseline documentation set.

### Registry

- Publishes current registry facts for core protocol metadata, RPC operations and encodings, control opcodes, errors, schemas, capabilities, profiles, and adopted domain registry entries.
- Keeps generated protocol facts sourced from `registry/**/*.yaml` and `registry/domains/**/*.yaml`.

### Schemas

- Publishes current generated schema descriptors and schema metadata for adopted AXTP methods, events, capabilities, and shared types.
- Keeps generated protocol outputs as machine-consumable artifacts derived from the YAML source facts.

### Conformance

- Publishes current generator tests, generated snapshots, and tooling test vectors as the baseline conformance material.
- Includes current C++/TypeScript/Flutter runtime generated references present in the repository snapshot.

### Migration

- Publishes current legacy classification and migration planning material for AXDP HID, Rooms, VM33, signage, firmware, and other legacy protocol mapping work.
- Keeps legacy compatibility behavior outside AXTP Core by documenting adapter and migration boundaries.

### Runtime Impact

- Establishes `spec/v0.0.1` as the first fixed AXTP Spec dependency target for runtime repositories.
- Runtime packages should record this tag through `AXTP_SPEC.lock.yaml` or package metadata instead of depending on `main`.
- No runtime package release is created by this Spec release.

# AXTP Spec Changelog

This changelog records AXTP Spec releases published with `spec/vMAJOR.MINOR.PATCH` tags.

Current repository path note: conformance cases now live at the root `conformance/` directory. Older release entries may mention their historical paths.

## spec/v0.8.0

Repository contract layout and release artifact boundary release.

### Protocol

- Keeps AXTP wire, session, RPC, STREAM, method, event, schema, and error semantics unchanged from `spec/v0.7.0`.
- Promotes the current machine-readable contract paths as the implementation authority: `contract/protocol/axtp.protocol.yaml`, `contract/generated/**`, `contract/registry/**`, `contract/mcp/**`, and `contract/test-vectors/**`.
- Keeps human-readable normative specs under root `specs/**` so runtime and SDK teams can separate implementation rules from maintainer workbench material.

### Registry

- Moves registry source facts to `contract/registry/**` and updates generator, validation, release, and workflow references to consume that path.
- Does not add, remove, or renumber adopted registry methods, events, capabilities, profiles, schemas, or error codes in this release.
- Updates protocol metadata references so generated artifacts point to the root `workspace/**` maintainer inputs rather than removed docs-hosted workspace paths.

### Schemas

- Refreshes generated protocol JSON/YAML metadata and generator snapshots for the new contract/workspace path model.
- Keeps generated Protocol IR structure and field semantics compatible with `spec/v0.7.0`; changes are path and release-boundary metadata only.
- Keeps MCP and test-vector artifacts inside `contract/` as part of the runtime-consumable release contract.

### Conformance

- Keeps conformance as a root-level testing entry point at `conformance/**`, independent from maintainer `workspace/**`.
- Adds plain-text path validation for maintainer draft and legacy evidence references so stale hidden paths fail before release.
- Extends protocol status validation to check generated and draft counts in `docs/product/domain-status.md`.

### Migration

- Moves maintainer workbench material to root `workspace/**`.
- Moves release operation documents to root `release/**`.
- Keeps historical audits in `docs/archive/**` and keeps legacy evidence in `workspace/legacy-migration/evidence/**`, but excludes those maintainer-only inputs from the default release artifact.

### Release Governance

- Tightens the default release artifact to include only `contract/`, `specs/`, `conformance/`, `docs/guides/`, `docs/product/`, root `release/`, and top-level release metadata.
- Excludes `workspace/business`, `workspace/flows`, `workspace/protocol`, `workspace/legacy-migration`, lifecycle skills, release templates, and legacy evidence from the published artifact.
- Updates release scripts, manifest template, CODEOWNERS, CI references, and lifecycle skill instructions to the new `contract/`, `tooling/`, `workspace/`, `conformance/`, and `release/` paths.

### Runtime Impact

- Runtime and SDK teams should bind to `spec/v0.8.0` when they need the new release artifact layout and root `conformance/**` packaging.
- Implementations already compatible with `spec/v0.7.0` protocol facts do not need wire-level or API behavior changes for this release.
- Tooling that previously consumed `docs/generated/**`, `protocol/axtp.protocol.yaml`, `registry/**`, `tooling/mcp/**`, or `tooling/test-vectors/**` from the spec repository must update to the `contract/**` paths.
- No npm, pub, PyPI, Docker, or runtime package registry publish is part of this Spec release.

## spec/v0.7.0

Release contract, generated artifact governance, and Protocol IR fidelity release.

### Protocol

- Promotes capability metadata into top-level Protocol IR so runtimes and SDK generators can consume capability ids, status, type, and schema bindings directly.
- Preserves field defaults, enum values, schema references, repeated metadata, and array item typing in generated Protocol IR and JSON references.
- Converts generated-domain JSON-array fields from opaque `bytes` placeholders into first-class `array<T>` schema facts for device, firmware, network, audio stream, and video stream contracts.

### Registry

- Updates adopted domain YAML sources to express object arrays and scalar arrays with `type: array` plus `schema` or `array.item_type`.
- Adds source validation for array item type references so malformed array declarations fail before generated artifacts drift.

### Schemas

- Refreshes `contract/protocol/axtp.protocol.yaml`, `contract/generated/protocol.md`, `contract/generated/protocol.json`, MCP schema output, and generator snapshots from the richer contract/registry/source model.
- Keeps the remaining opaque `bytes` field only where the value is intentionally a polymorphic JSON selector rather than a simple array.

### Conformance

- Replaces loose conformance case validation with AJV-backed JSON Schema validation for case and result files.
- Adds cross-reference checks for manifest levels, profiles, fixtures, methods, events, errors, and capabilities.
- Keeps existing conformance behavior intact while making case authoring failures fail in CI.

### Release Governance

- Defines the release artifact as an explicit runtime-consumable contract containing `contract/protocol/`, `contract/generated/`, `contract/registry/`, `specs/`, `conformance/`, `contract/mcp`, `contract/test-vectors`, and `LICENSE`.
- Excludes `.DS_Store`, legacy evidence files, and repository-only lifecycle skills from the published archive.
- Adds generated drift, Markdown link, protocol status, and release artifact dry-run checks to CI and release validation.
- Adds repository governance entry points: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, and `CODEOWNERS`.

### Documentation

- Updates the protocol domain matrix to match generated method/event counts.
- Fixes generated protocol draft status text for adopted device, network, audio stream, video stream, and firmware update features.
- Fixes local Markdown links and clarifies renamed or merged draft paths.

### Runtime Impact

- Runtime and SDK teams should bind to `spec/v0.7.0` and regenerate from `contract/protocol/axtp.protocol.yaml` or `contract/generated/protocol.json`.
- Generators should treat `array<T>`, field defaults, enum values, and top-level capability records as authoritative.
- Implementations that previously treated generated JSON-array fields as opaque bytes should update bindings to typed arrays where the new IR declares `type: array`.
- No npm, pub, PyPI, Docker, or runtime package registry publish is part of this Spec release.

## spec/v0.6.1

Core session field cleanup and CONTROL negotiation clarification release.

### Protocol

- Makes RPC `axtpVersion` the AXTP v1 compatibility authority and demotes `rpcVersion` / `negotiatedRpcVersion` to rc1 transition compatibility only.
- Adds required Identify `randomSeed:uint32` so devices without reliable clocks or hardware RNG can mix caller-provided entropy into RPC `sid` generation.
- Clarifies CONTROL `protocolVersion` as Deprecated/Transition and keeps Frame Header `Version` plus RPC `axtpVersion` as the primary version boundaries.
- Clarifies CONTROL sizing: `maxFrameSize` is the complete Standard Frame size limit, while `maxPayloadSize` is deprecated/reserved and `mtu` is profile-specific optional.

### Registry

- Updates core RPC op descriptions and protocol lifecycle metadata to reference `randomSeed` and AXTP version semantics.
- Updates CONTROL schema facts so `protocolVersion` is optional/deprecated, `mtu` is optional, and `maxFrameSize` has the minimum needed for the smallest CONTROL payload.

### Schemas

- Refreshes `contract/protocol/axtp.protocol.yaml`, generated protocol references, MCP schema output, and generator snapshots from the updated registry and schema facts.
- Keeps deprecated transition fields represented in generated artifacts for compatibility while removing them from new minimal handshake examples.

### Conformance

- Updates session and event conformance cases to require Identify `randomSeed:uint32`.
- Refreshes guides and testing quickstarts so WebSocket JSON and Standard Framed examples use the current Hello / Identify / Identified shape.

### Migration

- Updates legacy migration planning notes and cast receiver flow examples to use `randomSeed` and the revised RPC session startup shape.
- Leaves historical legacy evidence unchanged.

### Runtime Impact

- Runtime and SDK teams should bind to `spec/v0.6.1`, accept missing `rpcVersion` in AXTP v1 handshakes, require `randomSeed:uint32` in Identify, and generate `sid` by mixing that seed with local state.
- Standard Framed runtimes should treat `maxFrameSize` as the peer receive limit for complete frames and should not require CONTROL `protocolVersion`, `maxPayloadSize`, or core `mtu` in new v1 handshakes.
- No npm, pub, PyPI, Docker, or runtime package registry publish is part of this Spec release.

## spec/v0.6.0

Business registry expansion and generated protocol refresh release.

### Protocol

- Expands the generated Protocol IR from the previously adopted audio algorithm surface to 38 methods, 17 events, 154 errors, 135 schemas, and 2 profiles.
- Generates newly adopted business protocol surfaces for `device.info`, `network.interface`, `network.ip`, `network.wifi`, `network.ap`, `audio.stream`, `video.stream`, and the P0 subset of `firmware.update`.
- Refreshes `contract/protocol/axtp.protocol.yaml`, `contract/generated/protocol.md`, `contract/generated/protocol.json`, generated registry markdown, MCP JSON registry artifacts, and generator snapshots from contract/registry/domain YAML sources.
- Keeps AXTP core wire semantics unchanged from `spec/v0.5.1`, including Big-Endian / network byte order.

### Registry

- Adds domain registry source files for `device`, `network`, `video`, and `firmware`.
- Extends the existing `audio` domain registry with `audio.stream` methods, events, schemas, and capability metadata.
- Marks the adopted protocol drafts as generated while preserving unresolved `[REVIEW-ASK]` items as non-contract review notes.
- Keeps legacy mappings unadopted where field-level behavior remains unconfirmed.

### Schemas

- Adds generated schema coverage for device information snapshots, network interface/IP/Wi-Fi/AP configuration and state, audio/video stream control, stream state events, and firmware update sessions.
- Adds capability descriptors for `device.info`, `network.interface`, `network.ip`, `network.wifi`, `network.ap`, `audio.stream`, `video.stream`, and `firmware.update`.
- Keeps advanced firmware update flows such as cancel, resume, URL update, rollback, and external verify/install out of the generated P0 contract.

### Conformance

- Updates generator tests and protocol snapshots so validation tracks the expanded generated protocol model.
- Source and generated protocol validation now pass against the 38-method / 17-event registry model.
- No new hand-written conformance cases are added in this release; domain-specific conformance suites should follow the generated facts.

### Migration

- Preserves legacy review notes in the adopted protocol drafts but does not promote unconfirmed legacy aliases into stable registry mappings.
- Keeps adapter-only or uncertain legacy behavior outside the generated implementation contract.

### Runtime Impact

- Runtime and SDK teams should bind to `spec/v0.6.0`, regenerate from `contract/protocol/axtp.protocol.yaml` or `contract/generated/protocol.json`, and update method/event/capability registries accordingly.
- Existing `spec/v0.5.1` core wire behavior remains compatible; this release primarily expands generated business registry facts.
- Implementations should treat generated `draft` business methods as adopted registry facts for this snapshot, while using capability discovery before invoking optional device/network/stream/firmware features.
- No npm, pub, PyPI, Docker, or runtime package registry publish is part of this Spec release.

## spec/v0.5.1

Wire byte order metadata and runtime release hotfix.

### Protocol

- Adds machine-readable `wire` metadata to the Protocol IR with `byteOrder: big-endian`, `byteOrderAlias: network`, and `crcByteOrder: big-endian`.
- Emits the same wire byte order facts into `contract/generated/protocol.json` and `contract/generated/protocol.md`.
- Updates generator validation so Protocol IR and core specs must continue to agree on Big-Endian / network byte order.

### Conformance

- Updates Standard Framed test vectors to use Big-Endian / network byte order for frame length, message id, RPC method/event ids, and STREAM header fields.
- Adds a STREAM conformance byte-order assertion for `streamId:uint32`, `seqId:uint32`, and `cursor:uint64`.

### Runtime Impact

- Runtime repositories should bind to `spec/v0.5.1` rather than `spec/v0.5.0` for Standard Framed binary work.
- Runtime wire codecs must serialize and parse AXTP multi-byte wire integers using Big-Endian / network byte order.
- Runtime vendored generator templates and generated protocol references should no longer mention Little-Endian for AXTP wire integers.

## spec/v0.5.0

Documentation governance, business protocol draft consolidation, and AXTP network byte order alignment release.

### Protocol

- Establishes a clearer repository narrative and role-based documentation entry points for first-time readers, runtime/SDK implementers, conformance owners, protocol maintainers, product/architecture reviewers, legacy migration owners, and release owners.
- Adds a shared AXTP glossary and refactors `specs/**` into a more normative core/contract/registry/codec/tooling specification backbone.
- Rewrites core runtime specs for Frame/Payload, Transport Profiles, CONTROL, RPC, STREAM, and low-bandwidth degradation to separate required v1 behavior from optional/future behavior.
- Aligns AXTP multi-byte wire fields to Big-Endian / network byte order across specs, guides, and STREAM draft examples. Runtime implementations that followed earlier Little-Endian draft text must update frame, CONTROL, RPC JSON_BINARY, TLV, STREAM, and CRC byte handling.
- Updates flow and protocol-draft templates so business flows identify protocol coverage/gaps, and domain-feature drafts use readable method/event overview plus per-item schema expansion.
- Adds or refines draft business protocol documents for device information, system state/lifecycle/reset, device enrollment/child devices, signage management, software config/update policy, firmware update policy, and audio/video stream-related drafts.

### Registry

- No registry YAML source facts are changed in this release.
- Keeps adopted runtime contract facts sourced from `contract/registry/**`, `contract/protocol/axtp.protocol.yaml`, and `contract/generated/**`.
- Moves historical registry planning tables into non-normative appendix documents under `specs/2-registry/appendix/**`; runtimes must not implement from these appendix tables.
- Clarifies domain.feature naming, method/event/error/profile allocation rules, draft ID boundaries, and registry adoption readiness criteria.

### Schemas

- No adopted generated schema contract changes are introduced by this release.
- Refines protocol draft schema presentation for audio.algorithm, audio.eq, audio.volume, device.info, system.state, system.lifecycle, system.reset, signage, software, and related draft modules.
- Clarifies that draft methodId, eventId, errorCode, capabilityId, and fieldId values remain registry-assigned or intentionally unassigned until adoption.

### Conformance

- Expands conformance documentation into a clearer main entry, runtime checklist, support-level guidance, failure classification, and Phase 1 MVP expectations.
- Adds audit material and module review checklists for future business-domain conformance planning.
- Existing conformance cases remain the source for runtime validation; draft business protocol documents do not become conformance requirements until adopted and generated.

### Migration

- Adds and updates flow documents for device/system, signage device management, cast receiver/pairing, firmware update, audio/video streaming, and audio algorithm control scenarios.
- Preserves legacy migration evidence while moving new protocol decisions into flows and protocol drafts.
- Clarifies that legacy aliases and adapter-only behavior must not pollute formal domain.feature boundaries.

### Runtime Impact

- Runtime and SDK teams should bind to `spec/v0.5.0`, the exact commit, or the generated release artifact; they must not depend on floating `main`.
- Standard Framed binary runtimes must treat AXTP multi-byte wire integers as Big-Endian / network byte order for new work against this release.
- WebSocket JSON behavior remains RPC-oriented; CONTROL and STREAM remain Standard Framed concerns.
- Business protocol documents under `workspace/protocol/**` are review drafts unless backed by registry YAML and generated artifacts.
- No npm, pub, PyPI, Docker, or runtime package registry publish is part of this Spec release.

## spec/v0.0.4

Spec repository purification, documentation workflow, and Phase 1 STREAM data-plane alignment release.

### Protocol

- Reorganizes the main repository as a protocol-first spec repository with root runtime leftovers removed and runtime source/docs moved out of the AXTP spec tree.
- Groups the formal `specs/` corpus into core, registry, codec, and tooling sections to make the protocol reading path easier to follow.
- Aligns Phase 1 CONTROL scope to `OPEN / ACCEPT`, `HEARTBEAT / HEARTBEAT_ACK`, and `CLOSE / CLOSE_ACK`; ACK/NACK remains reserved for future reliable-transfer profiles.
- Aligns Standard Framed transports to support CONTROL, RPC, and Phase 1 STREAM data packets for adopted audio/video media stream profiles.
- Clarifies RPC encoding order and semantics: `JSON`, `CBOR`, `MSGPACK`, and `JSON_BINARY`; `bodyEncoding` applies only to `JSON_BINARY` with `NONE`, `TLV8`, and `TLV16`.
- Adds and refines onboarding docs including `KICKOFF.md`, `ROADMAP.md`, core protocol flow, quickstart, and runtime MVP/conformance guidance.

### Registry

- Updates protocol metadata, transport capability declarations, control opcode status, RPC encoding facts, body encoding facts, and `protocol.payload.stream` capability status to match the Phase 1 decisions.
- Refreshes `contract/protocol/axtp.protocol.yaml`, generated protocol references, generator snapshots, and MCP/tooling registry outputs from the YAML source facts.
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

- Consolidates legacy evidence, classification, plans, generated outputs, and planning docs under `workspace/legacy-migration/**`.
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
- Adds `tooling/scripts/validate-conformance.sh` and a `Validate conformance cases` CI workflow to validate case IDs, manifest references, profile coverage, schemas, and result shape.

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
- Keeps generated protocol facts sourced from `contract/registry/**/*.yaml` and `contract/registry/domains/**/*.yaml`.

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

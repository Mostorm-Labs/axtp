# A1 Core Framing Contract Materialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Materialize the P23 Core Framing authority into the normative core spec, the generated machine-readable Protocol IR, and release-required frame conformance without modifying any runtime repository.

**Architecture:** Keep `docs/governance/AXTP-Core-Framing-Authority-v0.1.md` as Current A1 Design Authority. Materialize Standard Frame facts in `contract/registry/core/protocol_meta.yaml`, teach the Protocol IR loader/model/validator/emitters to preserve and validate those facts, then bind the existing `conformance/framing/**` package to the generated contract before promoting its cases into the main `framed-binary` conformance level. Runtime-owned policy remains symbolic/non-numeric.

**Tech Stack:** TypeScript + Vitest generator toolchain, YAML Protocol IR sources, Node.js/Ajv conformance validators, Markdown normative spec.

**Spec:** `docs/governance/AXTP-Core-Framing-Authority-v0.1.md`

## Global Constraints

- Repository boundary is `Mostorm-Labs/axtp` only.
- Do not modify any runtime repository or runtime `AXTP_SPEC.lock.yaml`.
- Do not change P23 decisions A1-D01 through A1-D10; materialization must be isomorphic to current authority.
- Preserve the 12-byte Standard Frame header, 2-byte CRC16 footer, Header Version `0x01`, and PayloadType CONTROL/RPC/STREAM values `0x01/0x02/0x03`.
- OPEN establishes `maxFrameSize` and `heartbeatIntervalMs`; successful ACCEPT fields are optional overrides.
- Do not standardize allocator sequences, timeout durations, numeric resource caps, scheduler topology, reconnect/backoff, parser-close thresholds, or diagnostic API shape.
- `conformance/framing/**` stays adapter-neutral; formal promotion means making its already-validated case IDs release-required, not rewriting the DSL into runtime-specific tests.
- No merge, tag, release, or runtime migration is authorized by this plan.

---

### Task 1: RED tests for the machine-readable Standard Frame contract

**Files:**
- Modify: `tooling/generators/src/protocolValidator.test.ts`
- Modify: `tooling/scripts/validate-frame-conformance-design.test.mjs`

**Interfaces:**
- Consumes: current P23 authority and existing Protocol IR loader.
- Produces: failing expectations for `STANDARD_FRAME.contract`, generated JSON/Markdown exposure, and P20-to-contract cross-checking.

- [ ] **Step 1: Add a Protocol IR test that requires `STANDARD_FRAME.contract`**

Assert the current protocol model exposes exact header/footer bytes, field offsets/types, CRC algorithm/coverage, effective-parameter fallback/override sources, fragmentation/reassembly semantics, parser safety semantics, and heartbeat wire semantics.

- [ ] **Step 2: Add negative validator tests**

Clone the model and mutate representative authority facts (`header.size`, MessageId zero reservation, reassembly key, CRC coverage, effective max formula, heartbeat ACK controlId behavior); each mutation must be rejected by `validateProtocolDefinition`.

- [ ] **Step 3: Add emitter assertions**

Require generated `protocol.json` and `protocol.md` to expose the Standard Frame contract and its authority-critical sections.

- [ ] **Step 4: Add P20 cross-check expectation**

Require `validate-frame-conformance-design.mjs` to load `contract/generated/protocol.json` and report a successful machine-contract alignment line.

- [ ] **Step 5: Run standard CI and verify RED**

Expected: generator/conformance validation fails because the machine-readable frame contract and cross-check do not yet exist.

---

### Task 2: Synchronize `specs/20-core.md` to P23 without redesign

**Files:**
- Modify: `specs/20-core.md`

**Interfaces:**
- Consumes: A1-D01..A1-D10 verbatim semantics.
- Produces: normative human-readable contract that machine validation can compare against.

- [ ] **Step 1: Replace the pre-A1 framing paragraph with explicit effective-parameter rules**

Document OPEN baseline + ACCEPT override for `effectiveMaxFrameSize` and `effectiveHeartbeatIntervalMs`, including `PayloadLength + 14 <= effectiveMaxFrameSize`.

- [ ] **Step 2: Add normative fragmentation/reassembly rules**

Document contiguous sender emission, `2..255` fragmented `FrameCount`, exact sender index coverage, reassembly key/invariants, complete-only dispatch, out-of-order receive tolerance, duplicate/conflict behavior, MessageId active uniqueness/reuse/zero semantics, missing-vs-timeout classification, and bounded runtime resource ownership.

- [ ] **Step 3: Add parser/error disposition rules**

Document candidate validation, byte-stream recovery boundary, packet-boundary behavior, no invalid upper-layer dispatch, local diagnostic mapping, and runtime-owned close aggressiveness.

- [ ] **Step 4: Add heartbeat wire-semantics boundary**

Document post-`FRAMING_READY` HEARTBEAT/ACK behavior, matching `controlId`, SUCCESS status, outstanding controlId uniqueness, effective cadence input, and runtime/profile ownership of failure deadline/scheduler/reconnect policy.

---

### Task 3: Materialize and validate the Standard Frame contract in Protocol IR

**Files:**
- Modify: `contract/registry/core/protocol_meta.yaml`
- Modify: `tooling/generators/src/protocolModel.ts`
- Modify: `tooling/generators/src/protocolLoader.ts`
- Modify: `tooling/generators/src/protocolValidator.ts`
- Modify: `tooling/generators/src/protocolDocsValidator.ts`
- Modify: `tooling/generators/src/emitters/protocolMarkdown.ts`
- Regenerate: `contract/protocol/axtp.protocol.yaml`
- Regenerate: `contract/generated/protocol.json`
- Regenerate: `contract/generated/protocol.md`
- Regenerate snapshots under `tooling/generators/src/__snapshots__/` as required by the existing generator test suite.

**Interfaces:**
- Consumes: normative spec + P23 authority.
- Produces: `model.frameProfiles[name=STANDARD_FRAME].contract` with validated machine semantics.

- [ ] **Step 1: Add the source-of-generation contract**

Under `frameProfiles[].contract`, encode only P23-owned facts: header/footer structure, CRC, effective parameter resolution, fragmentation/reassembly semantics, parser safety/recovery semantics, frame diagnostic names, and heartbeat wire semantics. Encode runtime/profile-owned values as ownership markers, never numeric constants.

- [ ] **Step 2: Extend ProtocolModel and loader**

Add focused typed interfaces for Standard Frame header fields, CRC, effective parameters, fragmentation/reassembly, parser behavior, diagnostics, heartbeat, and policy ownership; map YAML into those fields without dropping data.

- [ ] **Step 3: Implement validator invariants**

Add `assertStandardFrameContract(model)` and call it from `validateProtocolDefinition`. Fail closed if any authority-critical field is missing or contradicted.

- [ ] **Step 4: Add docs-consistency checks**

Require `specs/20-core.md` to contain the authority facts represented by the machine contract, including effective parameter formulas, reassembly key, duplicate/conflict semantics, parser safety, and heartbeat ACK matching.

- [ ] **Step 5: Extend generated Markdown**

Render a `Standard Frame Contract` section from the typed model so generated docs expose the same machine contract humans see in JSON.

- [ ] **Step 6: Regenerate derived artifacts and snapshots**

Use the existing generator commands; do not hand-author generated files except as a last-resort diagnostic step.

- [ ] **Step 7: Run generator tests and generated-drift checks**

Expected: all generator tests, protocol validation, docs consistency, and drift checks pass.

---

### Task 4: Bind P20 evidence to the machine contract and promote framed-binary conformance

**Files:**
- Modify: `tooling/scripts/validate-frame-conformance-design.mjs`
- Modify: `tooling/scripts/validate-conformance.mjs`
- Modify: `conformance/framing/manifest.yaml`
- Modify: `conformance/manifest.yaml`
- Modify: `conformance/framing/README.md`
- Modify: `docs/governance/AXTP-Core-Framing-Verification-Design-v0.1.md`

**Interfaces:**
- Consumes: generated `contract/generated/protocol.json` Standard Frame contract and existing P20 corpus/oracle/virtual-time/DSL.
- Produces: release-required `frame.*` cases under the main `framed-binary` conformance level, still executed through the frame DSL/adapter contract.

- [ ] **Step 1: Cross-check corpus constants against Protocol IR**

Validate header size, footer size, total overhead, magic, version, PayloadType values, CRC algorithm/coverage, frame length formula, and diagnostic names against generated Protocol IR rather than hard-coding independent truth.

- [ ] **Step 2: Cross-check P20 semantic ownership**

Require the generated contract to mark reassembly timeout, resource numeric limits, heartbeat failure deadline, allocator algorithm, and recovery aggressiveness as runtime/profile owned where P23 does so.

- [ ] **Step 3: Promote the frame verification manifest**

Set `conformance/framing/manifest.yaml` to release-required status only after machine-contract alignment passes.

- [ ] **Step 4: Bridge frame case IDs into the main conformance validator**

Allow the main manifest to reference release-required frame DSL cases without forcing them through the unrelated RPC conformance-case schema. Restrict external frame cases to the `framed-binary` level and require the framing manifest to list them.

- [ ] **Step 5: Add all seven P20 cases to `levels.framed-binary.required_cases`**

Promote `frame.effective_parameters`, `frame.fragmentation_sender`, `frame.reassembly_and_duplicates`, `frame.missing_and_timeout`, `frame.resource_bounds`, `frame.parser_integrity_and_recovery`, and `frame.heartbeat_wire`.

- [ ] **Step 6: Update governance/docs status**

Mark P20 materialized/promoted while keeping runtime adoption, merge, tag, and release explicitly separate.

- [ ] **Step 7: Run the complete AXTP validation workflow**

Expected: generator/artifacts PASS, P20 machine-contract alignment PASS, main conformance PASS, docs/status PASS, release dry-run PASS.

---

### Task 5: Gate review and PR synchronization

**Files:**
- Update PR #15 body/status only; no merge/tag/release.

**Interfaces:**
- Consumes: fresh standard CI evidence on the exact PR head.
- Produces: evidence-backed A1 materialization status and next safe handoff.

- [ ] **Step 1: Verify exact PR head and changed-file scope**

Confirm all modifications remain inside `Mostorm-Labs/axtp`; verify no runtime paths/locks appear.

- [ ] **Step 2: Confirm standard CI on the exact head**

All standard steps must be green. A prior run or partial command is insufficient.

- [ ] **Step 3: Classify any failure before fixing**

Use Aegis defect classes; never mutate P23 authority merely to satisfy tests.

- [ ] **Step 4: Update PR #15 with final evidence**

Keep it Draft/unmerged unless a later explicit release/merge action is authorized.

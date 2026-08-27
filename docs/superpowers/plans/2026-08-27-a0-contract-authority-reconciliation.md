# A0 Contract Authority Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AXTP contract eligibility, generated runtime projection, CONTROL ACCEPT field presence, and conformance ownership unambiguous and machine-enforced.

**Architecture:** `docs/governance/AXTP-Contract-Authority-Model-v0.1.md` is the A0 semantic authority. Source registry facts are normalized through one authority-policy helper before runtime Protocol IR generation; catalog facts may remain visible outside the default runtime projection. CONTROL ACCEPT is permissive at Core level, while conformance profiles stay layer-correct.

**Tech Stack:** TypeScript 5.7, Vitest, YAML registries, generated AXTP Protocol IR, GitHub Actions.

**Spec:** `docs/governance/AXTP-Contract-Authority-Model-v0.1.md`

## Global Constraints

- Do not hand-edit `contract/protocol/axtp.protocol.yaml`, `contract/generated/**`, `contract/mcp/**`, or `contract/test-vectors/**`; regenerate them with existing tooling.
- CONTROL envelope fields `opcode`, `controlId`, and `statusCode` remain structural requirements.
- Every `ControlAcceptBody` TLV is optional in AXTP v1 Core.
- Missing ACCEPT TLVs mean no ACCEPT-level override; absence alone is never a protocol error.
- Existing OPEN requirements are outside this A0 relaxation.
- WebSocket Unframed JSON never requires CONTROL.
- `framed-binary` is Standard Frame + CONTROL + RPC; STREAM is a separate conformance scope.
- Runtime-contract registry facts are `stable` + `deprecated`; `experimental` is explicit opt-in; `draft` and `reserved` are not default runtime facts.
- Legacy source statuses are normalized only by the mapping frozen in the A0 authority; unknown values fail closed.

---

### Task 1: Freeze A0 Authority and ACCEPT Presence Semantics

**Files:**
- Create: `docs/governance/AXTP-Contract-Authority-Model-v0.1.md`
- Modify: `specs/20-core.md`
- Modify: `specs/30-registry.md`
- Modify: `docs/README.md` if needed to expose governance entrypoint

**Interfaces:**
- Consumes: current `spec/v0.15.0` authority and A0 review findings.
- Produces: normative contract-status mapping, generated-surface policy, ACCEPT presence rule, WebSocket error ownership, conformance ownership.

- [ ] Update CONTROL text so ACCEPT has an optional TLV body and every ACCEPT TLV is optional.
- [ ] State that present fields are validated/consumed and absent fields keep profile/local defaults.
- [ ] Preserve current OPEN requirements unchanged.
- [ ] Update registry status text to distinguish contract lifecycle from roadmap/release maturity and document legacy normalization.
- [ ] Verify no normative sentence still claims `selectedRpcEncoding` or another ACCEPT TLV is Core-required.

### Task 2: Write Failing Authority-Policy Tests

**Files:**
- Create: `tooling/generators/src/authorityPolicy.test.ts`
- Later create: `tooling/generators/src/authorityPolicy.ts`

**Interfaces:**
- Produces: `normalizeRegistryStatus(status)` and `isDefaultRuntimeContract(status)` behavioral contract.

- [ ] Create tests asserting `mvp -> { contractStatus: "stable", maturity: "mvp" }`.
- [ ] Create tests asserting `p1/p2 -> draft + corresponding maturity`.
- [ ] Create tests asserting lifecycle values remain lifecycle values.
- [ ] Create a test asserting an unknown value such as `ga` throws.
- [ ] Create tests asserting only `stable` and `deprecated` are default runtime-contract statuses.
- [ ] Run `pnpm --dir tooling/generators test authorityPolicy.test.ts` and confirm RED because the authority-policy module/behavior does not yet exist.

### Task 3: Implement Status Normalization and Runtime Projection

**Files:**
- Create: `tooling/generators/src/authorityPolicy.ts`
- Modify: `tooling/generators/src/protocolBuilder.ts`
- Modify: `tooling/generators/src/models.ts` if required for finite source-status typing
- Modify: `tooling/generators/src/protocolModel.ts` if generated maturity is retained in the parsed model

**Interfaces:**
- Consumes: registry item source `status`.
- Produces: normalized lifecycle status, optional maturity, and default-runtime eligibility.

- [ ] Implement the exact A0 normalization mapping and fail unknown values with `GeneratorError`.
- [ ] Replace the old `mvp -> stable` one-off conversion with the central helper.
- [ ] Filter default Protocol IR methods/events/errors/capabilities so only `stable` and `deprecated` facts enter the default runtime projection.
- [ ] Preserve catalog source files; do not delete draft/reserved registrations.
- [ ] Run the focused authority-policy tests and confirm GREEN.
- [ ] Run the full generator Vitest suite.

### Task 4: Relax CONTROL ACCEPT Machine Schema

**Files:**
- Modify: `contract/registry/schema/control_schema.yaml`
- Test through generated protocol/validator drift checks.

**Interfaces:**
- Consumes: A0 ACCEPT field-presence contract.
- Produces: `ControlAcceptBody` with all TLV `required: false`.

- [ ] Set `sessionId`, `maxFrameSize`, `supportedPayloadTypes`, `heartbeatIntervalMs`, `ackMode`, and `selectedRpcEncoding` to `required: false`; keep already-optional ACCEPT fields optional.
- [ ] Do not change OPEN field requirements.
- [ ] Regenerate Protocol IR and generated artifacts using existing generator commands.
- [ ] Verify generated `ControlAcceptBody` contains no required TLV.

### Task 5: Repair WebSocket and L1/L2 Conformance Ownership

**Files:**
- Modify: `conformance/cases/session/request_before_identified.yaml`
- Modify: `conformance/manifest.yaml`
- Modify: `conformance/README.md` / `conformance/CONFORMANCE_LEVELS.md` only where wording conflicts.

**Interfaces:**
- Produces: WebSocket state errors owned by RPC/session layer and `framed-binary` independent of STREAM.

- [ ] Change WebSocket pre-identify expected code from `CONTROL_OPEN_REQUIRED` to `INVALID_STATE`.
- [ ] Remove `stream.stream_open`, `stream.stream_data`, and `stream.stream_close` from `framed-binary.required_cases`.
- [ ] Keep STREAM cases in the `stream` scope.
- [ ] Verify L1 can be represented as `core + framed-binary` and L2 adds `stream`.

### Task 6: Add A0 Authority Lint Coverage

**Files:**
- Extend focused generator tests and/or existing validator tests without creating a parallel validator stack.

**Interfaces:**
- Consumes: A0 authority rules.
- Produces: CI failures for status leakage and generated-surface drift.

- [ ] Test that unknown registry status fails closed.
- [ ] Test that a draft method is not present in the default Protocol IR.
- [ ] Test that an MVP/stable method remains present with normalized `stable` lifecycle.
- [ ] Test ACCEPT schema has no required TLV fields.
- [ ] Test `framed-binary` manifest has no `stream.*` required case.

### Task 7: Regenerate and Gate

**Files:**
- Generated by tooling only: `contract/protocol/axtp.protocol.yaml`, `contract/generated/**`, `contract/mcp/**`, applicable snapshots/vectors.

**Interfaces:**
- Produces: reviewable generated diff and gate evidence.

- [ ] Run generator build.
- [ ] Run source validation.
- [ ] Regenerate all committed generated artifacts.
- [ ] Run generator tests, TypeScript lint, protocol validation, generated-drift checks, and conformance validation.
- [ ] Open/update the A0 pull request.
- [ ] Treat A0 as `PASS` only when GitHub CI is green and generated drift is clean; otherwise classify exact blockers.

## Self-review

Coverage: status authority, generated runtime eligibility, ACCEPT optionality, WebSocket layer ownership, L1/L2 separation, and executable evidence are all mapped to tasks. No business-domain semantic redesign is included. Core framing reassembly, heartbeat completeness, WS future major epoch, release tag protection, and trust model remain later A1-A4 work unless needed to make A0 tests compile.

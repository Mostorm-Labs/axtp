# AXTP Contract Authority Model v0.1

Status: **Current A0 Authority**  
Scope: contract eligibility, generated runtime surface, CONTROL ACCEPT presence semantics, conformance level/profile ownership, and authority validation.  
Applies to: AXTP v1 maintenance after `spec/v0.15.0`.

## 1. Purpose

AXTP is the protocol authority between runtimes, SDKs, devices, agents, applications, and cloud services. This document closes ambiguity about which facts are implementation contracts, which facts are planning/catalog facts, and which evidence proves a published contract.

This A0 authority does not redesign business domains. It governs how protocol facts become runtime authority.

When this document conflicts with pre-A0 wording about contract eligibility or CONTROL ACCEPT field presence, this document is the Current Authority until the downstream normative specs and generated artifacts are synchronized in the same A0 change.

## 2. Authority layers

AXTP has two distinct authority chains.

### 2.1 Publication authority

A published `spec/vMAJOR.MINOR.PATCH` release artifact is the immutable authority consumed by runtimes and SDKs **only after** its release gate passes. A tag or artifact that fails the release gate is invalid publication authority; implementations MUST NOT resolve an internally inconsistent release by choosing an arbitrary file inside it.

### 2.2 Source-of-generation authority

For maintenance work before publication:

1. normative governance and protocol specs define semantics and eligibility;
2. `contract/registry/**` is the canonical machine source for adopted registry facts;
3. generator code materializes the Protocol IR and generated views;
4. `contract/protocol/axtp.protocol.yaml` and `contract/generated/protocol.*` are derived runtime-contract projections;
5. status-bearing generated registry tables are catalog/reference projections unless a file explicitly declares itself runtime-only;
6. `conformance/**` is executable evidence, not a source allowed to redefine protocol semantics;
7. `workspace/**` is planning/maintainer input and never runtime authority.

Generated files MUST NOT be hand-edited.

## 3. Contract status and roadmap maturity are different dimensions

### 3.1 Contract lifecycle

Every implementable registry fact resolves to exactly one lifecycle state:

| Contract status | Meaning | Default runtime contract |
|---|---|---:|
| `draft` | Under review; semantics may change. | No |
| `experimental` | Intentionally exposed only by an explicit experimental/profile contract. | Profile-specific |
| `stable` | Current adopted runtime contract. | Yes |
| `deprecated` | Compatibility contract retained for existing implementations. | Yes |
| `reserved` | Identifier/name is reserved but has no runtime behavior. | No |

Only `stable` and `deprecated` are included in the default runtime-contract projection. `experimental` requires explicit profile opt-in. `draft` and `reserved` remain catalog/planning facts and MUST NOT silently become default runtime requirements.

### 3.2 Roadmap / release maturity

`mvp`, `p1`, `p2`, `rc1` and similar labels describe roadmap or release maturity. They are not contract lifecycle states and MUST NOT be used by a runtime to decide whether a fact is implementable.

During A0 migration, legacy source `status` values are normalized as follows:

| Legacy source value | Contract status | Maturity |
|---|---|---|
| `mvp` | `stable` | `mvp` |
| `p1` | `draft` | `p1` |
| `p2` | `draft` | `p2` |
| `draft` | `draft` | unset |
| `experimental` | `experimental` | unset |
| `stable` | `stable` | unset |
| `deprecated` | `deprecated` | unset |
| `reserved` | `reserved` | unset |

Unknown lifecycle/maturity strings MUST fail authority validation rather than pass through as arbitrary strings.

New source schemas SHOULD move toward explicit `contractStatus` + `maturity`. The legacy `status` field remains a migration input until the registry source migration is completed; it is not permission to add new composite values.

At protocol metadata level, values such as `rc1` are release maturity. They MUST NOT be interpreted as lifecycle status for registry facts.

## 4. Generated surface policy

AXTP generated output has two roles and they MUST be distinguishable:

- **Runtime contract projection**: `contract/protocol/axtp.protocol.yaml` and runtime-oriented `contract/generated/protocol.*`. It contains only default runtime-contract facts (`stable` + `deprecated`) plus explicitly required structural protocol facts.
- **Catalog/reference projection**: status-bearing registry documentation/JSON may show draft, experimental, stable, deprecated, and reserved facts so maintainers can inspect the complete namespace.

A runtime MUST NOT infer implementability merely because a fact appears in a catalog/reference file. Runtime eligibility is determined by normalized contract status and profile membership.

## 5. CONTROL ACCEPT field-presence contract

### 5.1 Fixed CONTROL envelope

The CONTROL payload envelope remains structural and required:

```text
opcode:uint8 + controlId:uint16 + statusCode:uint16 + optional TLV body
```

For ACCEPT, `opcode=ACCEPT`, `controlId`, and `statusCode` are required because they are part of the CONTROL payload structure, not optional negotiation fields.

### 5.2 ACCEPT TLVs are optional

All `ControlAcceptBody` TLV fields are optional in AXTP v1 Core, including:

- `sessionId`
- `protocolVersion` (deprecated)
- `reservedHeaderProfile` (deprecated)
- `maxFrameSize`
- `mtu`
- `supportedPayloadTypes`
- `heartbeatIntervalMs`
- `ackMode`
- `selectedRpcEncoding`

A valid ACCEPT MUST NOT be rejected solely because any one of these TLVs is absent.

Presence semantics are uniform:

1. if a TLV is present, the receiver MUST validate and consume it according to its field definition;
2. if a TLV is absent, the receiver MUST NOT synthesize a protocol error merely for absence;
3. absence means "no override conveyed by this ACCEPT";
4. the runtime continues with the transport/profile/local default already applicable to that parameter;
5. a profile or product-specific contract MAY require a field for that profile, but that requirement belongs to the profile/product contract, not AXTP v1 Core ACCEPT parsing;
6. an unsuccessful ACCEPT (`statusCode != SUCCESS`) may carry no TLV body at all.

This deliberately keeps CONTROL lightweight for real devices that only need a small subset of negotiation values.

### 5.3 OPEN is not changed by this decision

A0 only relaxes ACCEPT field presence. Existing OPEN requirements remain unchanged until separately reviewed. A server may use OPEN values to decide whether to accept or reject the link, and may echo/override only the ACCEPT fields relevant to its implementation.

## 6. WebSocket session-state error ownership

WebSocket Unframed JSON does not use CONTROL. A request issued before the RPC session reaches `Identified` MUST therefore not return `CONTROL_OPEN_REQUIRED`.

A0 uses existing common `INVALID_STATE` for this case. This avoids creating a new error code solely to repair a layer-ownership defect. The session remains usable so the client can complete Hello/Identify/Identified.

## 7. Conformance level/profile ownership

Conformance scopes are cumulative capabilities, not aliases:

- `core`: common RPC/registry behavior.
- `websocket-jsonrpc`: WebSocket Unframed JSON session/RPC behavior; no CONTROL or STREAM.
- `framed-binary`: Standard Frame + CONTROL + RPC evidence; STREAM is not implicitly required.
- `stream`: STREAM data-plane behavior.

Therefore a framed implementation equivalent to L1 may satisfy `core + framed-binary` without STREAM. L2 adds the `stream` scope.

A conformance scope MUST NOT list test cases owned by another optional scope merely to make the test suite convenient.

`conformance/cases/**` is an evidence catalog and MAY retain cases for known draft/future registry facts. Case existence, directory placement, or a case-level `level` label does not make that case release-required. `conformance/manifest.yaml` `required_cases` is the runtime/release requirement set: every method, event, error, and capability referenced by a required case MUST resolve in the default runtime Protocol IR. Draft/reserved/catalog-only facts MUST NOT become required merely because a test already exists for them.

## 8. Authority validation rules

A0 adds executable validation for at least these invariants:

1. unknown source status values fail closed;
2. legacy composite status values normalize deterministically into contract lifecycle + maturity;
3. default runtime Protocol IR excludes `draft` and `reserved` registry facts;
4. `experimental` facts require explicit opt-in and are not default runtime facts;
5. ACCEPT schema marks all TLV fields optional;
6. WebSocket pre-identify conformance does not use CONTROL-layer readiness errors;
7. `framed-binary` required cases do not require `stream.*` cases;
8. catalog-only conformance cases may reference known registry facts, while every `manifest.required_cases` reference must exist in the default runtime Protocol IR.

## 9. Supersession / downstream synchronization

This document supersedes, for the scopes listed above, conflicting pre-A0 wording in:

- `specs/20-core.md` requiring ACCEPT negotiation TLVs in AXTP v1 Core;
- `specs/30-registry.md` where roadmap labels and contract lifecycle could be interpreted as one status dimension;
- generated Protocol IR that exposes non-runtime draft/reserved facts as if they were default runtime contract;
- conformance cases/manifest that assign WebSocket readiness to CONTROL or make STREAM mandatory for `framed-binary`.

Those files remain historical implementation reality until updated by this A0 branch. A0 is not complete until downstream files are synchronized and the gate evidence passes.

## 10. Exit gate

A0 may be marked `PASS` only when:

- authority wording and machine sources agree;
- ACCEPT TLV presence tests prove all fields are optional;
- generator tests prove non-runtime facts are excluded from the default runtime projection;
- unknown source status is rejected;
- WebSocket pre-identify expects `INVALID_STATE`;
- `framed-binary` no longer requires STREAM cases;
- generated drift checks are clean;
- repository CI is green on the A0 pull request.

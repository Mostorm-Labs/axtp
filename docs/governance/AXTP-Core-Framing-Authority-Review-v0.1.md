# AXTP Core Framing Authority Review v0.1

Status: **A1 / P21 Review Record — BLOCKED_AUTHORITY**  
Branch: `aegis/a1-core-framing-authority-review`  
Dependency: A0 PASS head `d3dbe8ccb2570b51b9e0ebe5cc8f706bc680aac2`  
Scope: Standard Frame parsing, fragmentation/reassembly, frame limits, heartbeat/liveness, parser recovery, frame error disposition, and frame-level verification readiness.

> This document is a P21 authority review record. It is **not** the new Core Framing contract and MUST NOT be used to invent runtime behavior. Its purpose is to identify which current facts are trusted and which contract gaps must be closed before implementation or release-required conformance treats Core Framing as complete.

## 1. Role

Aegis stage: `P21 Authority Review`.

This review establishes the source-of-truth map for A1 and identifies the earliest untrusted layer. Repository implementation or historical documents do not win an authority conflict merely because they contain more detail.

## 2. Authority

### 2.1 Current Authority

The following sources are Current Authority for A1 maintenance work:

1. `docs/governance/AXTP-Contract-Authority-Model-v0.1.md`
   - A0 authority for source-of-generation vs runtime projection, contract eligibility, and conformance ownership.
2. `specs/10-contract.md`
   - authority ordering and conflict handling.
3. `specs/20-core.md`
   - active normative Standard Frame / CONTROL / RPC / STREAM contract.
4. `specs/40-codec.md`
   - active byte-order and TLV/schema codec rules where they intersect CONTROL/framing.
5. `contract/registry/core/protocol_meta.yaml`
   - machine source for current transport/frame profile metadata.
6. `contract/registry/schema/control_schema.yaml`
   - machine source for OPEN/ACCEPT TLV shape and bounds.
7. `contract/registry/error/error_code.yaml`
   - machine source for stable frame/control error identifiers.

Derived runtime projections such as `contract/protocol/axtp.protocol.yaml` and `contract/generated/protocol.*` are evidence that these sources were materialized; they are not handwritten authority.

### 2.2 Draft / Proposed

No A1 Core Framing replacement contract exists yet. P21 deliberately does not create one.

### 2.3 Superseded / Historical

The archived legacy 1-core documents named `03-Frame-and-Payload.md` and `05-Control-Session.md` contain useful historical design intent but are not Current Authority.

They may be used as design evidence in P22/P23, but their rules MUST NOT be silently restored. In particular, historical CONTROL ACCEPT required-field wording has already been superseded by A0.

### 2.4 Implementation Reality / Maintainer Reference

- `workspace/runtime/core-protocol-flow.md`

This file explicitly says `specs/20-core.md` and `contract/**` remain the formal runtime contract. Its “3 missed heartbeats” and bidirectional heartbeat recommendations are therefore implementation/reference guidance, not authority.

### 2.5 Evidence

- `conformance/manifest.yaml`
- `conformance/cases/handshake/**`
- `conformance/schemas/conformance-case.schema.json`
- `contract/test-vectors/**`
- `tooling/generators/src/emitters/testVectors.ts`
- `tooling/generators/src/protocolValidator.ts`
- A0 standard PR CI PASS at dependency head.

## 3. Objective

Determine whether the current Core Framing authority is sufficiently explicit for independent compliant runtimes to produce the same parsing, reassembly, liveness, recovery, and failure behavior from the same wire input.

A1's intended interoperability invariant is:

> For the same valid AXTP Standard Framed byte stream, compliant implementations must derive the same complete message sequence; for the same invalid or incomplete input, they must apply the same normative rejection, recovery, timeout, and cleanup class rather than implementation-private behavior.

P21 evaluates whether current authority is strong enough to support that invariant. It does not yet choose the missing semantics.

## 4. Non-goals

P21 does not:

- redesign the 12-byte Standard Frame header;
- change Header `Version=0x01`;
- change PayloadType IDs;
- reintroduce Compact/HID-64/BLE/UART framing into v1 Core;
- make ACK/NACK a Phase 1 requirement;
- tighten A0 CONTROL ACCEPT optional TLV presence;
- modify business RPC or STREAM business lifecycle contracts;
- implement runtime code;
- publish, tag, or merge A1.

## 5. Trusted facts that A1 may preserve

| Scope | Trusted fact |
|---|---|
| Envelope | Standard Frame is `12B Header + Payload + 2B CRC16` on Standard Framed transports. |
| Magic | `0x41 0x58` (`AX`). |
| Header version | current value `0x01`. |
| PayloadType | CONTROL=`0x01`, RPC=`0x02`, STREAM=`0x03`. |
| PayloadLength | uint16, payload bytes only. |
| Link addresses | `SourceId` and `DestinationId` are 1-byte link-local logical-node fields, not Endpoint IDs. |
| Fragment fields | `MessageId:uint16`, `FrameIndex:uint8`, `FrameCount:uint8`; unfragmented messages use `FrameCount=1`. |
| CRC | CRC16-CCITT-FALSE over Header + Payload; CRC footer excluded. |
| Byte order | multi-byte wire integers and CRC serialization are Big-Endian/network byte order. |
| Basic frame validation | parser checks magic, version, payload type, length vs max frame, `FrameCount>=1`, `FrameIndex<FrameCount`, CRC, and complete payload bytes before dispatch. |
| Layer ownership | fragmentation belongs to Frame layer; RPC matching uses requestId; STREAM ordering uses seqId. |
| Transport ownership | TCP is a byte-stream Standard Framed transport; packet boundaries on USB-HID do not replace AXTP header/CRC validation. |
| CONTROL liveness messages | HEARTBEAT and HEARTBEAT_ACK are required CONTROL opcodes for Standard Framed links. |
| A0 ACCEPT semantics | every ACCEPT TLV remains optional; absent fields cannot alone invalidate ACCEPT. |
| Reliability boundary | ACK/NACK remain future/profile-specific and are not required for v1 Core framing. |

## 6. Findings

### P21-F01 — Fragment reassembly state machine is missing

Classification: **MISSING_CONTRACT**  
Severity for A1: **P0**

Current `specs/20-core.md` defines fragment fields and two basic range checks, but does not normatively define the reassembly key, invariant header fields, ordering/interleaving, duplicate/conflict behavior, active MessageId collision behavior, timeout lifecycle, CLOSE/transport-loss cleanup, aggregate size, concurrent context limits, or whether upper layers can observe partial fragments.

The error registry already treats `FRAME_FRAGMENT_INVALID`, `FRAME_FRAGMENT_MISSING`, and `FRAME_REASSEMBLY_TIMEOUT` as stable/MVP facts, so leaving their triggering conditions implementation-defined is an authority defect.

Historical evidence contains a candidate “same MessageId, complete reassembly, then dispatch” model, but archived semantics cannot be adopted implicitly.

### P21-F02 — `FRAME_FRAGMENT_MISSING` vs `FRAME_REASSEMBLY_TIMEOUT` has no normative distinction

Classification: **MISSING_CONTRACT**  
Severity: **P0**

Without ACK/NACK or a separate end marker, a receiver generally recognizes an incomplete message through timeout or another lifecycle boundary. Current authority does not define when an incomplete context becomes `FRAME_FRAGMENT_MISSING` versus `FRAME_REASSEMBLY_TIMEOUT`.

### P21-F03 — MessageId lifecycle and uniqueness scope are missing

Classification: **MISSING_CONTRACT**  
Severity: **P0**

Current authority does not define sender allocation, uniqueness scope, whether unfragmented messages consume MessageId uniqueness, reuse after completion, `0xFFFF -> 0x0000` wrap, or collision behavior with an active reassembly context.

### P21-F04 — Effective `maxFrameSize` semantics are incomplete after A0

Classification: **MISSING_CONTRACT**  
Severity: **P0**

OPEN requires `maxFrameSize`; ACCEPT may omit it under A0. The current contract does not fully define whether OPEN is a symmetric proposal or a receive-limit declaration, what an omitted ACCEPT means for the peer's transmit ceiling, which exact value is used by `PayloadLength + 14 <= effectiveMaxFrameSize`, or how profile/local defaults participate.

A1 must preserve ACCEPT optionality while making effective frame-limit semantics deterministic.

### P21-F05 — Heartbeat/liveness contract is incomplete

Classification: **MISSING_CONTRACT**  
Severity: **P0**

Current authority requires HEARTBEAT/HEARTBEAT_ACK and requires `heartbeatIntervalMs` in OPEN, but does not normatively define initiator, timer start, final interval, whether ordinary traffic refreshes liveness, ACK deadline, missed count/timeout formula, simultaneous heartbeat behavior, heartbeat controlId lifecycle, timeout state transition, graceful CLOSE vs immediate teardown, pending work cleanup, or reconnect/re-OPEN behavior.

`workspace/runtime/core-protocol-flow.md` suggests bidirectional heartbeats and three missed ACKs, but that is non-authoritative guidance.

### P21-F06 — Parser recovery / resynchronization is underspecified

Classification: **MISSING_CONTRACT**  
Severity: **P0** for TCP interoperability/resilience

`specs/20-core.md` says TCP receivers SHOULD scan for magic, but does not define recovery after invalid magic/version/type/length/CRC, truncated frames, or magic-like bytes inside corrupt input. Discard length, bounded rescan policy, candidate commitment, repeated-failure policy, and packet-transport behavior remain unspecified.

### P21-F07 — Frame error disposition/carrier is missing

Classification: **MISSING_CONTRACT**  
Severity: **P0**

Stable frame errors exist, but current authority does not say which conditions are local diagnostics, which may produce a CONTROL/RPC error when enough context survives, which discard one frame, which invalidate one reassembly context, and which close the transport. Registry `retryable` metadata does not define an on-wire carrier, especially while ACK/NACK is not required.

### P21-F08 — Resource/budget limits are not contractually bounded

Classification: **MISSING_CONTRACT**  
Severity: **P1**

FrameCount is uint8 and frame PayloadLength is uint16. Current authority does not define a normative assembled-message limit or the minimum anti-exhaustion behavior for multiple in-flight reassembly contexts. A1 must separate interoperability limits from implementation-local caps and define failure semantics for local caps.

### P21-F09 — Machine-readable frame contract is incomplete

Classification: **MISSING_CONTRACT / EVIDENCE_GAP**  
Severity: **P1**

`protocol_meta.yaml` names `STANDARD_FRAME`, but `ProtocolModel.FrameProfile` only models high-level profile fields. It does not machine-model the 12B header layout, field widths/offsets, Header Version, CRC algorithm/coverage, PayloadLength semantics, fragmentation invariants, recovery policy, or effective frame-size rules.

`protocolValidator.ts` validates byte order, STREAM header, CONTROL opcodes, and transport/profile relationships, but not the Standard Frame structure itself.

### P21-F10 — Current framed conformance does not prove framing

Classification: **EVIDENCE_GAP**  
Severity: **P0 gate gap**

`framed-binary` currently requires only `handshake.open_accept`, `handshake.close`, `handshake.heartbeat`, and `rpc.request_id_match`. There is no `conformance/cases/frame/**` suite. Existing handshake cases operate on CONTROL objects rather than raw Standard Frame bytes, so the gate does not prove magic, header version, payload length, max-frame enforcement, CRC, fragmentation, reassembly, timeout, recovery, or frame error disposition.

### P21-F11 — Conformance DSL cannot express the required frame oracle

Classification: **EVIDENCE_GAP**  
Severity: **P1 enabling gap**

`conformance-case.schema.json` has typed RPC/JSON-RPC/CONTROL/STREAM/event/error steps but no typed raw-frame input model for exact frame bytes, corrupt header/CRC injection, byte-stream chunk boundaries, fragmented sequences, time advancement, reassembly timeout, or resynchronization outcomes.

A1 P20 must define a frame-level fixture/oracle representation before release-required frame conformance can be credible.

### P21-F12 — Existing generated test vectors are not a trustworthy frame oracle

Classification: **TEST_DEFECT / EVIDENCE_GAP**  
Severity: **P1**

`tooling/generators/src/emitters/testVectors.ts` ignores its `_spec` input and hardcodes vector bytes. `control_open.hex` contains a Standard Frame-like header plus a 5-byte OPEN payload but no CRC footer and no required OPEN TLVs. The set also includes deferred Compact cases and `COMPACT_MESSAGE_ID_OVERFLOW`, which is not current v1 Core runtime authority.

These fixtures must not be used as the A1 golden frame oracle without explicit repair/replacement.

## 7. Authority conflict assessment

P21 did **not** find two competing Current Authorities for the trusted 12B header layout, PayloadType IDs, Big-Endian rule, or CRC algorithm. The dominant failure mode is **missing contract**, not active-document disagreement.

The most important ambiguity created by cross-layer evolution is `maxFrameSize`: A0 correctly relaxed ACCEPT field presence while the older framing/control model assumed more explicit negotiation. A1 must resolve the effective-limit semantics without undoing A0.

## 8. Required output of the next trusted authority

Before A1 may become implementation authority, the Core Framing contract must freeze at least:

1. Standard Frame machine-readable header contract.
2. Effective frame-size model and directionality.
3. Fragmentation trigger and sender responsibilities.
4. Reassembly key and invariant fields.
5. Ordering/interleaving/duplicate/conflict behavior.
6. MessageId allocation/reuse/wrap policy.
7. Reassembly timeout and cleanup lifecycle.
8. Maximum assembled-message / reassembly resource semantics.
9. Parser recovery and bounded resynchronization behavior.
10. Frame error disposition and exact error mapping.
11. Heartbeat initiator, interval, timeout, state transition, and cleanup semantics.
12. Verification oracle/DSL sufficient to test all of the above.

## 9. Quality / Evidence Gate for P21

P21 exit criteria:

- source hierarchy classified;
- Current Authority separated from archive/workspace/evidence;
- stable existing facts separated from missing contract;
- interoperability-critical framing gaps identified at the correct authority layer;
- no new wire behavior silently invented;
- downstream implementation remains blocked until authority closure.

Result: **P21 REVIEW COMPLETE; A1 remains BLOCKED_AUTHORITY.**

## 10. Handoff

Next stage: **A1 / P22 — Core Framing Five-Axis Drift Review**.

P22 may rely on the trusted facts in section 5 and the source classification in section 2. It must determine where current generated artifacts, conformance, maintainer guidance, historical semantics, and runtime-facing assumptions have drifted across Product / Semantic / Architecture / Implementation / Verification axes.

After P22, A1 should enter Verification Design / Authority Supersession in the order justified by the findings. No runtime implementation, tag, release, or framing behavior change is authorized by this P21 record alone.
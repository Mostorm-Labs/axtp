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

The following sources contain useful historical design intent but are not Current Authority:

- `docs/archive/specs/legacy-structured-specs/1-core/03-Frame-and-Payload.md`
- `docs/archive/specs/legacy-structured-specs/1-core/05-Control-Session.md`

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

The following active facts are sufficiently explicit and do not need to be reopened merely to close A1:

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

Current `specs/20-core.md` defines fragment fields and the two range checks, but does not normatively define:

- the reassembly key;
- whether `PayloadType`, `SourceId`, `DestinationId`, `FrameCount`, and Header Version must remain identical across all fragments;
- whether fragments may arrive out of order;
- whether multiple fragmented messages may interleave;
- duplicate-fragment behavior;
- conflicting duplicate behavior;
- inconsistent `FrameCount` behavior;
- same `MessageId` reused before previous completion;
- MessageId allocation/reuse/wrap rules;
- timeout start/reset semantics;
- cleanup on CLOSE or transport loss;
- maximum assembled logical-message size;
- maximum concurrent reassembly contexts;
- whether upper layers see only a complete reassembled payload or may observe partial fragments.

The error registry already treats `FRAME_FRAGMENT_INVALID`, `FRAME_FRAGMENT_MISSING`, and `FRAME_REASSEMBLY_TIMEOUT` as stable/MVP facts, so leaving the conditions implementation-defined is an interoperability defect in the authority layer.

Historical evidence contains a candidate “same MessageId, complete reassembly, then dispatch” model, but because it is archived it cannot be adopted implicitly.

### P21-F02 — `FRAME_FRAGMENT_MISSING` vs `FRAME_REASSEMBLY_TIMEOUT` has no normative distinction

Classification: **MISSING_CONTRACT**  
Severity: **P0**

Without ACK/NACK or an explicit end-of-message signal beyond `FrameCount`, a receiver usually knows a fragment is missing only after another protocol event or timeout. Current authority does not define when `FRAME_FRAGMENT_MISSING` is emitted/recorded versus when the same incomplete context becomes `FRAME_REASSEMBLY_TIMEOUT`.

The two stable error codes therefore name states that are not yet normatively distinguishable.

### P21-F03 — MessageId lifecycle and uniqueness scope are missing

Classification: **MISSING_CONTRACT**  
Severity: **P0**

Current authority says MessageId is for fragment/message association and must not replace RPC requestId or STREAM seqId, but it does not define:

- sender allocation policy;
- uniqueness scope (per direction/link/source/destination/payload type);
- whether unfragmented frames also consume MessageId uniqueness;
- reuse window after complete delivery;
- wrap behavior at `0xFFFF -> 0x0000`;
- collision handling with an active reassembly context.

Independent implementations cannot safely choose compatible reassembly keys until this is fixed.

### P21-F04 — Effective `maxFrameSize` semantics are incomplete after A0

Classification: **MISSING_CONTRACT**  
Severity: **P0**

OPEN requires `maxFrameSize`; ACCEPT may omit it under A0. Current authority correctly states that omission is not an error, but it does not fully define the directional/effective send ceiling after ACCEPT:

- whether OPEN is a proposal for a symmetric link maximum or a declaration of the sender's receive maximum;
- when ACCEPT omits `maxFrameSize`, whether the OPEN value is implicitly accepted for both directions or only for the server-to-client direction;
- which exact value a sender uses in `PayloadLength + 14 <= effectiveMaxFrameSize`;
- how profile/local defaults participate when no ACCEPT override exists;
- whether an implementation may locally choose a smaller transmit frame size without advertising it.

A1 must preserve ACCEPT optionality while making effective frame-limit semantics deterministic.

### P21-F05 — Heartbeat/liveness contract is incomplete

Classification: **MISSING_CONTRACT**  
Severity: **P0**

Current authority requires HEARTBEAT/HEARTBEAT_ACK and requires `heartbeatIntervalMs` in OPEN, but does not normatively define:

- initiator: client, server, or both;
- when the liveness timer starts;
- final interval when ACCEPT omits or supplies an override;
- whether ordinary valid frame/RPC/STREAM traffic refreshes liveness;
- response deadline for HEARTBEAT_ACK;
- number of missed acknowledgements or timeout formula;
- simultaneous bidirectional heartbeat behavior;
- controlId allocation/reuse for heartbeats;
- state transition on timeout;
- whether timeout attempts graceful CLOSE or immediately tears down transport;
- pending RPC, STREAM, and reassembly cleanup behavior;
- reconnect/re-OPEN expectations.

`workspace/runtime/core-protocol-flow.md` suggests bidirectional heartbeats and three missed ACKs, but that is explicitly non-authoritative reference material.

### P21-F06 — Parser recovery / resynchronization is underspecified

Classification: **MISSING_CONTRACT**  
Severity: **P0** for TCP interoperability/resilience

`specs/20-core.md` says AXTP-TCP receivers SHOULD scan for magic before parsing a header, but does not define recovery after:

- invalid magic;
- unsupported version;
- invalid PayloadType;
- impossible/oversized PayloadLength;
- CRC mismatch;
- truncated frame followed by later bytes;
- magic-like bytes appearing inside corrupt payload data.

Missing rules include discard length, bounded rescan policy, when a candidate magic is committed, whether a failed candidate resumes at byte `candidate+1`, and when repeated failures force transport close. Packet-oriented transports also need an explicit statement about whether recovery is packet-local or link-level.

### P21-F07 — Frame error disposition/carrier is missing

Classification: **MISSING_CONTRACT**  
Severity: **P0**

Stable frame errors exist (`FRAME_MAGIC_INVALID`, `FRAME_VERSION_UNSUPPORTED`, `FRAME_HEADER_INVALID`, `FRAME_LENGTH_INVALID`, `FRAME_PAYLOAD_TYPE_INVALID`, `FRAME_CRC_ERROR`, fragment errors, `FRAME_TOO_LARGE`), but current authority does not define which are:

- local diagnostic-only conditions;
- allowed to produce a CONTROL/RPC status response when enough structure survives;
- reasons to discard only one frame;
- reasons to invalidate one reassembly context;
- reasons to close the whole transport.

For errors such as bad magic or CRC there may be no trustworthy request/control context to carry a response. The registry's `retryable` metadata is not a substitute for an on-wire error-delivery contract, especially because v1 does not require ACK/NACK.

### P21-F08 — Resource/budget limits are not contractually bounded

Classification: **MISSING_CONTRACT**  
Severity: **P1**

FrameCount is uint8 and each frame PayloadLength is uint16, so naive implementations can allocate large aggregate buffers or many concurrent reassembly contexts. Current active authority requires checking `maxFrameSize`, but does not define a normative assembled-message limit or minimum required anti-exhaustion behavior.

A1 must distinguish interoperable protocol limits from implementation-local resource caps, and define how a local cap fails without creating divergent upper-layer semantics.

### P21-F09 — Machine-readable frame contract is incomplete

Classification: **MISSING_CONTRACT / EVIDENCE_GAP**  
Severity: **P1**

`protocol_meta.yaml` names `STANDARD_FRAME` and current transports, but `ProtocolModel.FrameProfile` only models fields such as `name`, `magic`, `l1`, `l2`, and `supportsMixing`. It does not machine-model:

- fixed 12B header layout and field widths/offsets;
- Header Version value;
- CRC algorithm/coverage;
- PayloadLength semantics;
- fragment invariants;
- reassembly policy;
- parser recovery policy;
- effective frame-size rules.

`protocolValidator.ts` validates byte order, STREAM header, CONTROL opcode sets, and transport/profile relationships, but does not assert the Standard Frame header or fragmentation contract. A generated runtime projection can therefore drift in framing semantics without the generator gate detecting it.

### P21-F10 — Current framed conformance does not prove framing

Classification: **EVIDENCE_GAP**  
Severity: **P0 gate gap**

`conformance/manifest.yaml` requires only:

- `handshake.open_accept`
- `handshake.close`
- `handshake.heartbeat`
- `rpc.request_id_match`

for `framed-binary`.

There is no `conformance/cases/frame/**` suite. Existing handshake cases describe CONTROL objects rather than raw Standard Frame bytes. `handshake.heartbeat` proves only one matching controlId response; `handshake.open_accept` does not even express the OPEN required TLVs.

The current conformance gate therefore does not prove magic, header version, payload length, max frame enforcement, CRC, fragmentation, reassembly, timeout, parser recovery, or error disposition.

### P21-F11 — Conformance DSL cannot currently express the required frame oracle

Classification: **EVIDENCE_GAP**  
Severity: **P1 enabling gap**

`conformance-case.schema.json` models RPC, JSON RPC, CONTROL, STREAM, events, errors, registry lookups, and generic expected wire metadata, but has no typed raw-frame input/expectation model for:

- exact frame bytes/header fields;
- corrupt CRC/magic/length injection;
- byte-stream chunks and split boundaries;
- fragmented message sequences;
- time advancement / reassembly timeout;
- parser recovery/resynchronization outcome.

A1 P20 must define a frame-level fixture/oracle representation before release-required frame conformance can be credible.

### P21-F12 — Existing generated test vectors are not a trustworthy frame oracle

Classification: **TEST_DEFECT / EVIDENCE_GAP**  
Severity: **P1**

`tooling/generators/src/emitters/testVectors.ts` ignores its `_spec` input and hardcodes vector bytes. The emitted `control_open.hex` contains a Standard Frame-like header plus a 5-byte OPEN payload but no CRC footer and no required OPEN TLVs. The same vector set also includes deferred Compact cases and `COMPACT_MESSAGE_ID_OVERFLOW`, which is not part of current v1 Core runtime authority.

These vectors may remain useful historical fixtures, but A1 MUST NOT use them as the golden Standard Frame oracle without replacement or explicit repair.

## 7. Authority conflict assessment

P21 did **not** find evidence that the trusted 12B header layout, payload type IDs, big-endian rule, or CRC algorithm currently have two competing Current Authorities.

The primary failure mode is **missing contract**, not two active specifications disagreeing.

The most important ambiguity created by cross-layer evolution is `maxFrameSize`: A0 correctly relaxed ACCEPT field presence, while the older framing/control model assumed more explicit negotiation. This is not a reason to undo A0. It is a requirement for A1 to define deterministic effective-limit semantics compatible with optional ACCEPT TLVs.

## 8. Required output of the next trusted authority

Before A1 may become implementation authority, a new/updated Core Framing contract must freeze at least:

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
- all interoperability-critical framing gaps identified at the correct authority layer;
- no new wire behavior silently invented;
- downstream implementation remains blocked until authority closure.

Result: **P21 REVIEW COMPLETE; A1 remains BLOCKED_AUTHORITY.**

## 10. Handoff

Next stage: **A1 / P22 — Core Framing Five-Axis Drift Review**.

P22 may rely on the trusted facts in section 5 and the source classification in section 2. It must determine where current generated artifacts, conformance, maintainer guidance, historical semantics, and any runtime-facing assumptions have drifted across Product / Semantic / Architecture / Implementation / Verification axes.

After P22, A1 should enter Verification Design / Authority Supersession in the order justified by the findings. No runtime implementation, tag, release, or framing behavior change is authorized by this P21 record alone.

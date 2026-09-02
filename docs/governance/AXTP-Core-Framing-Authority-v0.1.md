# AXTP Core Framing Authority v0.1

Status: **Current A1 Design Authority — not yet a published runtime contract**  
Aegis stage: **P23 Authority Supersession**  
Depends on: `AXTP Contract Authority Model v0.1`, A1 / P21 Authority Review, and A1 / P22 Five-Axis Drift Review.  
Scope: Standard Framed Binary framing semantics, fragmentation/reassembly, effective frame limits, frame-level error disposition, parser recovery boundary, and CONTROL heartbeat wire semantics.

> This document establishes the first Current A1 Authority. It does not retroactively modify any runtime repository already pinned to `spec/v0.15.0`, and it does not authorize automatic runtime migration. Existing C++/TS/other runtime behavior remains implementation reality until that runtime explicitly adopts a future published AXTP contract containing this authority.

## 1. Role

This is the A1 P23 authority-supersession record. P21 proved that active Core Framing authority was incomplete; P22 proved that the gap had already produced implementation-specific choices. P23 resolves which matters are AXTP protocol authority and which matters intentionally remain transport/profile/runtime policy.

The primary boundary is:

> **AXTP standardizes peer-visible wire meaning and compatibility. A runtime owns local scheduling, memory, threading, allocator, retry, reconnect, and diagnostic policy unless a published AXTP profile explicitly promotes one of those choices into protocol authority.**

Implementation convergence is evidence, not authority. Implementation divergence is not automatically a defect when the differing behavior is explicitly runtime-owned.

## 2. Supersession and publication boundary

This authority supersedes incomplete or ambiguous pre-A1 Core Framing semantics for future AXTP maintenance after `spec/v0.15.0`.

It does **not** rewrite the immutable meaning of already-published `spec/v0.15.0`. A runtime pinned to that release continues to consume that release until it deliberately updates its AXTP spec lock or release artifact.

The authority chain is therefore:

```text
Published runtime today
  -> pinned published AXTP spec/release

AXTP maintenance after A1
  -> A0 authority
  -> this A1 Current Design Authority
  -> normative spec/machine materialization
  -> conformance evidence
  -> release gate
  -> future published spec
  -> explicit runtime adoption
```

A1 does not create runtime pull requests, change runtime locks, or claim that a currently deployed runtime is non-conformant to an authority it has not adopted.

## 3. What AXTP owns vs what runtimes own

### 3.1 AXTP-owned contract

AXTP Core owns:

- Standard Frame bytes, field widths, offsets, byte order, CRC coverage, and PayloadType values;
- the meaning of `MessageId`, `FrameIndex`, and `FrameCount` on the wire;
- which fields identify one reassembly context and which fields must remain invariant;
- when a logical message is complete and may cross into CONTROL/RPC/STREAM;
- legal fragment sequences and peer-visible invalid sequences;
- the effective `maxFrameSize` and `heartbeatIntervalMs` resolution produced by OPEN/ACCEPT;
- required HEARTBEAT/HEARTBEAT_ACK request/response behavior;
- the fact that frame parse failures are frame-layer failures rather than business RPC results;
- the minimum semantic outcome expected from a compliant decoder/reassembler.

### 3.2 Runtime/profile-owned policy

Unless a future published profile says otherwise, AXTP Core does not standardize:

- thread or task model;
- buffer/container implementation;
- exact reassembly timeout duration;
- exact maximum concurrent reassembly-context count;
- exact local maximum reassembled-message byte budget;
- exact `MessageId` allocation algorithm;
- automatic heartbeat scheduler topology;
- missed-heartbeat threshold or timeout formula;
- whether ordinary traffic refreshes a local liveness timer;
- graceful CLOSE vs immediate transport termination after a local liveness failure;
- retry, reconnect, backoff, and re-OPEN strategy;
- logging, metrics, tracing, or diagnostic API shape.

A local policy is compliant only if it does not reinterpret valid wire fields, merge incompatible fragments, dispatch partial messages, or silently change an OPEN/ACCEPT effective parameter.

## 4. Preserved framing facts

A1 preserves the trusted pre-A1 facts:

- Standard Frame = 12-byte Header + Payload + 2-byte CRC16 footer;
- magic = `0x41 0x58`;
- Header Version = `0x01`;
- CONTROL=`0x01`, RPC=`0x02`, STREAM=`0x03`;
- multi-byte wire integers are Big-Endian/network byte order;
- CRC16-CCITT-FALSE covers Header + Payload and excludes its own footer;
- `PayloadLength` counts payload bytes only;
- `FrameCount >= 1` and `FrameIndex < FrameCount`;
- fragmentation belongs to the Frame layer;
- RPC correlation uses requestId, never `MessageId`;
- STREAM ordering uses seqId, never `MessageId`;
- ACK/NACK retransmission is not required by AXTP v1 Core;
- A0 ACCEPT TLV fields remain optional.

No A1 decision changes the 12-byte header shape or Header Version.

## 5. P23 decisions

### A1-D01 — OPEN establishes the baseline link parameters; ACCEPT only overrides

`maxFrameSize` and `heartbeatIntervalMs` remain required in OPEN.

For a successful ACCEPT:

```text
effectiveMaxFrameSize =
  ACCEPT.maxFrameSize if present
  otherwise OPEN.maxFrameSize

effectiveHeartbeatIntervalMs =
  ACCEPT.heartbeatIntervalMs if present
  otherwise OPEN.heartbeatIntervalMs
```

A successful empty ACCEPT therefore means "accept the OPEN baseline without these overrides". This preserves A0 optional-field semantics while making the effective value deterministic.

`effectiveMaxFrameSize` is the symmetric Standard Frame ceiling for this Framed Link Context. Every transmitted frame in either direction MUST satisfy:

```text
PayloadLength + 14 <= effectiveMaxFrameSize
```

A peer that cannot honor the OPEN baseline MUST either return a supported `maxFrameSize` override or reject OPEN. It MUST NOT accept the link and then silently enforce a different peer-visible frame ceiling.

An implementation MAY transmit frames smaller than the effective ceiling.

Evidence obligation: one OPEN + empty ACCEPT vector and one OPEN + single-field ACCEPT override vector MUST resolve to the same effective values in every conforming language adapter.

### A1-D02 — Fragmentation is contiguous in v1 Core

A sender MAY fragment a logical CONTROL/RPC/STREAM payload when it does not fit one Standard Frame.

For one fragmented logical message:

- all fragments MUST use one `MessageId`;
- `FrameCount` MUST be in `2..255`;
- `FrameIndex` values MUST cover `0..FrameCount-1` exactly once at the sender;
- sender emission order MUST be ascending by `FrameIndex`;
- `Version`, `PayloadType`, `SourceId`, `DestinationId`, `MessageId`, and `FrameCount` MUST remain invariant across all fragments;
- all fragments for one message MUST be emitted contiguously on the same `(SourceId, DestinationId)` direction before a different `MessageId` is emitted for that direction.

Core v1 therefore does not require a receiver to support same-direction fragment interleaving across multiple logical messages. A receiver MAY support it as a private extension, but a sender MUST NOT depend on that extension without a future profile contract.

A logical message requiring more than 255 frames cannot be represented by one Standard Frame message. The sender MUST fail locally before transmitting a wrapped/truncated `FrameCount`.

Evidence obligation: fragmenter vectors MUST prove exact count/index coverage, invariant fields, contiguous emission, and deterministic local rejection when more than 255 fragments would be required.

### A1-D03 — Reassembly context and complete-only delivery are normative

The receiver reassembly key is:

```text
(local Framed Link Context, SourceId, DestinationId, MessageId)
```

`PayloadType`, `FrameCount`, and Header Version are context invariants, not additional key fields. A fragment that conflicts with an active context on one of those invariants MUST NOT be merged into that context.

The receiver reconstructs the logical payload in ascending `FrameIndex` order. Arrival order is not payload order; a receiver MAY receive valid fragments out of order and still reconstruct by index.

CONTROL/RPC/STREAM parsers MUST receive either:

- one complete unfragmented payload; or
- one fully reassembled fragmented payload.

They MUST NOT observe partial fragments as if they were complete logical messages.

Evidence obligation: a raw-frame corpus MUST show identical reconstructed payload for in-order and out-of-order arrival and must prove zero upper-layer delivery before completion.

### A1-D04 — Duplicate and conflicting fragments have different semantics

For an already-present `FrameIndex` in an active reassembly context:

- if the duplicate payload bytes are identical, the receiver MUST treat it idempotently and MUST NOT append the bytes twice;
- if the duplicate payload bytes differ, or invariant header fields differ, the receiver MUST invalidate the active context as `FRAME_FRAGMENT_INVALID` local diagnostic state and MUST NOT dispatch a payload from that context.

The conflicting fragment itself is not silently treated as the start of a replacement message. A later valid frame may establish a new context after the invalid context has been cleared.

Evidence obligation: identical-duplicate and conflicting-duplicate fixtures MUST produce different deterministic outcomes across language adapters.

### A1-D05 — `MessageId` is opaque; only active uniqueness is normative

`MessageId` is a uint16 frame/message association value. AXTP Core does not require monotonic allocation and does not reserve zero.

A sender MUST NOT reuse the same `MessageId` for a second fragmented message on the same `(SourceId, DestinationId)` direction while the prior context is active.

After the prior context has completed, been invalidated, been abandoned, or expired, the value MAY be reused immediately. Wrap is legal if it does not collide with an active context.

For `FrameCount=1`, `MessageId` has no persistent uniqueness window beyond that frame.

Evidence obligation: collision/reuse/wrap fixtures MUST verify the active-uniqueness rule. Conformance MUST NOT compare the allocator sequence chosen by different runtimes.

### A1-D06 — `FRAME_FRAGMENT_MISSING` and `FRAME_REASSEMBLY_TIMEOUT` are local diagnostic classifications

Because v1 Core forbids same-direction fragment interleaving, receipt of a different `MessageId` on the same `(SourceId, DestinationId)` direction while the prior fragmented context is incomplete proves that the prior message will not complete under the Core sequence. The receiver MUST abandon the prior context; if it exposes a frame diagnostic, the classification is `FRAME_FRAGMENT_MISSING`.

`FRAME_REASSEMBLY_TIMEOUT` means a receiver-owned or profile-owned reassembly timer expired while a context was incomplete.

The timeout duration itself is not a Core constant.

On CONTROL CLOSE or transport loss, all incomplete reassembly state MUST be discarded. The link/transport termination reason remains the primary lifecycle cause; Core does not require one `FRAME_FRAGMENT_MISSING` diagnostic per abandoned context.

Neither error requires an on-wire CONTROL/RPC error response.

Evidence obligation: the corpus MUST distinguish "new message proves prior incomplete" from "local expiry" without requiring all runtimes to use the same timeout duration.

### A1-D07 — Resource budgets are bounded runtime policy, not shared protocol constants

Hard wire bounds remain:

- `PayloadLength` is uint16;
- `FrameCount` is uint8 and valid range is `1..255`;
- each frame is bounded by `effectiveMaxFrameSize`.

Every runtime MUST bound memory consumed by incomplete reassembly state. The exact local maximum reassembled-message size and maximum simultaneous context count are runtime/profile policy unless a future profile publishes stronger minimums.

A local resource cap MAY reject an otherwise structurally valid fragmented message. If the runtime exposes a diagnostic, common `RESOURCE_EXHAUSTED` is the appropriate classification unless a future profile defines a more specific code. The runtime MUST discard the affected context without partial upper-layer delivery.

Evidence obligation: audit/probes MUST prove finite resource bounds and no partial dispatch on exhaustion. Numeric limits do not need to match across languages unless a profile standardizes them.

### A1-D08 — Parser recovery has a normative safety outcome and a runtime-owned aggressiveness policy

A Standard Frame candidate MUST pass all required header, length, fragment-range, payload-completeness, and CRC checks before dispatch.

For byte-stream profiles such as AXTP-TCP:

- the receiver scans for magic before committing to a candidate header;
- a structurally plausible candidate with incomplete bytes is held for more bytes rather than resynchronizing inside its declared payload merely because payload data contains `0x41 0x58`;
- a rejected candidate MUST NOT dispatch any payload;
- if the implementation chooses to recover rather than close, its next candidate search MUST begin after the first byte of the rejected candidate so that a later valid magic sequence is not skipped;
- a trailing single `0x41` at a chunk boundary MAY be retained as a possible first magic byte.

The number of consecutive corrupt candidates tolerated before transport close, buffering strategy, and logging policy are runtime/profile policy.

For packet-oriented Standard Framed profiles, a bad packet/frame MAY be discarded at its packet boundary; packet boundaries never replace header/CRC validation.

Evidence obligation: raw-byte fixtures MUST prove no invalid dispatch, correct handling of magic-like bytes inside an incomplete valid candidate, and recovery to a later valid frame for implementations that advertise recovery rather than fail-closed termination.

### A1-D09 — Frame errors are local frame-layer diagnostics by default

AXTP v1 Core has no mandatory peer-facing error carrier for a frame that failed framing integrity.

A runtime MUST NOT fabricate a business RPC result or CONTROL response from untrusted frame context solely to report a bad magic, version, length, fragment metadata, or CRC.

When a runtime exposes local diagnostics, the existing registry taxonomy applies, including:

- `FRAME_VERSION_UNSUPPORTED` for unsupported Header Version;
- `FRAME_PAYLOAD_TYPE_INVALID` for an unsupported PayloadType value;
- `FRAME_LENGTH_INVALID` for an invalid frame-length relationship;
- `FRAME_TOO_LARGE` for a frame above `effectiveMaxFrameSize`;
- `FRAME_CRC_ERROR` for CRC mismatch;
- `FRAME_FRAGMENT_INVALID` for invalid/conflicting fragment metadata;
- `FRAME_FRAGMENT_MISSING` and `FRAME_REASSEMBLY_TIMEOUT` as defined above.

Whether a local frame failure closes the whole transport after the affected frame/context is discarded is runtime/profile policy unless a future profile makes that disposition normative.

Evidence obligation: frame error fixtures MUST prove that invalid input never reaches CONTROL/RPC/STREAM as a valid payload. Diagnostic mapping is checked when the adapter exposes diagnostics; no on-wire error packet is expected by Core.

### A1-D10 — Core heartbeat authority stops at wire semantics and effective cadence

After `FRAMING_READY`, either peer MAY send CONTROL HEARTBEAT. A receiver of a valid HEARTBEAT MUST return HEARTBEAT_ACK with the same `controlId` and `statusCode=SUCCESS`.

A sender MUST NOT reuse an outstanding heartbeat `controlId` for another simultaneous heartbeat request. The allocator algorithm remains runtime-owned.

`effectiveHeartbeatIntervalMs` is resolved by A1-D01. It is the link's negotiated/default heartbeat cadence input when an implementation or profile enables automatic liveness probing; it is **not** itself a normative failure deadline.

AXTP Core intentionally does not require one universal:

- heartbeat initiator role;
- automatic scheduling topology;
- missed-ACK count;
- timeout formula;
- ordinary-traffic refresh rule;
- reconnect/backoff policy.

Those belong to the transport profile or runtime. `CONTROL_HEARTBEAT_TIMEOUT` is a local diagnostic when that selected liveness policy declares timeout.

WebSocket Unframed JSON continues to use WebSocket/native keepalive rather than CONTROL heartbeat.

Evidence obligation: cross-language conformance MUST prove HEARTBEAT/ACK encoding, matching controlId, and effective interval fallback/override. Scheduler timeout values are audited, not compared for numeric equality unless a profile standardizes them.

## 6. Verification contract attached to A1 decisions

P23 freezes not only decisions but the evidence class needed before those decisions may become a published runtime contract.

| Decision area | Invariant | Required oracle/evidence | Cross-language equality? |
|---|---|---|---:|
| Fixed frame bytes | same semantic frame -> same header/CRC bytes | deterministic golden vectors | Yes |
| OPEN/ACCEPT effective values | empty ACCEPT preserves OPEN; present field overrides | handshake state-table vectors | Yes |
| Fragment count/index | no wrap; exact index set; invariant fields | raw frame corpus | Yes |
| Reassembly | same fragments -> same complete payload; no partial dispatch | sequence oracle | Yes |
| Duplicate/conflict | identical duplicate idempotent; conflict invalidates | negative fragment corpus | Yes |
| MessageId | active collision prohibited; allocator otherwise opaque | collision/reuse corpus | Semantics only |
| Missing vs timeout | different trigger class | lifecycle/virtual-time adapter | Classification only |
| Resource limits | finite; exhaustion never partial-dispatches | runtime audit/probe | No numeric equality |
| Parser corruption | invalid frame never dispatches | raw byte/chunk corpus | Safety outcome |
| Recovery aggressiveness | later valid frame can be recovered if runtime chooses recovery | optional resilience corpus | Capability-dependent |
| Frame errors | frame failure stays below business layer | negative frame corpus | Semantic classification |
| Heartbeat | request/ACK match and interval fallback/override | CONTROL vector + state oracle | Wire semantics only |

A future frame-level conformance DSL may encode these fixtures differently by language, but the oracle semantics above MUST remain unchanged.

## 7. Runtime adoption and audit policy

Runtime repositories are downstream consumers, not co-owners of AXTP protocol authority.

Therefore:

1. A1 may inspect runtime code to understand compatibility risk.
2. A1 may publish an audit report describing where a runtime currently differs from this authority.
3. A1 MUST NOT automatically modify C++, TS, Python, C, Flutter, mock-server, firmware, or product runtime repositories as part of P23.
4. A runtime becomes accountable to A1 only after explicitly updating to a future AXTP release/artifact that contains A1.
5. Runtime-specific choices that fall inside the runtime-owned policy list are not migration defects merely because another language chose different values.
6. Protocol-owned differences become migration work only when that runtime elects to adopt the future A1 publication authority.

This protects deployed behavior while keeping the AXTP contract precise.

## 8. P23 change summary

P23 resolves the twelve P21/P22 findings as follows:

| Finding | P23 resolution |
|---|---|
| F01 Reassembly state machine | Closed by D02-D04. |
| F02 Missing vs timeout | Closed by D06 as local diagnostic trigger classes. |
| F03 MessageId lifecycle | Closed by D05; allocator remains runtime-owned. |
| F04 effective `maxFrameSize` | Closed by D01; OPEN baseline + optional ACCEPT override. |
| F05 heartbeat/liveness | Wire semantics closed by D01/D10; scheduler/timeout intentionally runtime/profile-owned. |
| F06 parser recovery | Safety/recovery boundary closed by D08; aggressiveness remains runtime/profile-owned. |
| F07 frame error disposition | Closed by D09; no mandatory v1 peer error carrier. |
| F08 resource limits | Boundary closed by D07; finite resource use required, numeric caps local. |
| F09 machine-readable frame contract | Authority resolved; downstream materialization still required. |
| F10 framed conformance coverage | Evidence requirements defined; executable cases still required. |
| F11 conformance DSL | Oracle semantics defined; tooling representation still required. |
| F12 hardcoded test vectors | Existing fixtures remain non-authoritative until replaced/repaired. |

## 9. Current status and next gate

With this document, **A1 has Current Design Authority** for Core Framing.

That does not mean A1 is release-ready. Before a future spec publication may claim these rules as runtime contract, AXTP still needs:

- normative synchronization into `specs/**`;
- machine-readable framing materialization in `contract/registry/**` / Protocol IR as appropriate;
- frame-level conformance schema/cases and deterministic golden vectors;
- generator and drift validation;
- a clean repository gate on the materialized contract.

Until those steps are complete:

```text
A1 Authority: CURRENT / READY
A1 Published Runtime Contract: NOT YET
A1 Release Gate: BLOCKED_EVIDENCE
Existing runtime locks: UNCHANGED
```

No merge, tag, release, or runtime migration is authorized by this P23 record alone.

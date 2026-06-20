# AXTP Core

This file is the normative core runtime contract for AXTP transport paths, Standard Framed Binary, CONTROL, RPC, STREAM, and low-bandwidth boundaries.

## Core Model

AXTP exposes the same business registry over two production paths:

| Path | Transport examples | Wire shape | Required capability |
|---|---|---|---|
| Standard Framed | `AXTP-TCP`, `AXTP-USB-HID` | `Standard Frame Header(12B) + Payload(N) + CRC16(2B)` | CONTROL / RPC / STREAM |
| WebSocket Unframed JSON | `AXTP-WS-JSON`, `AXTP-WS-CLOUD-REVERSE` | WebSocket message payload is JSON `{ sid, op, d }` | RPC-only |

PayloadType only chooses a parser:

| PayloadType | Value | Parser |
|---|---:|---|
| CONTROL | `0x01` | Link runtime control. |
| RPC | `0x02` | Session, request/response, and event control plane. |
| STREAM | `0x03` | Continuous data plane. |

PayloadType MUST NOT encode business types such as video, audio, firmware, file, domain.feature, method, event, or capability.

## Standard Frame

Standard Framed Binary runtime MUST implement:

```text
Standard Frame Header(12B) + Payload(N) + CRC16(2B)
```

Header layout:

| Field | Offset | Size | Rule |
|---|---:|---:|---|
| `Magic[0]` | 0 | 1B | MUST be `0x41` (`A`). |
| `Magic[1]` | 1 | 1B | MUST be `0x58` (`X`). |
| `Version` | 2 | 1B | Current value is `0x01`. |
| `PayloadType` | 3 | 1B | CONTROL=`0x01`, RPC=`0x02`, STREAM=`0x03`. |
| `PayloadLength` | 4 | 2B | Payload bytes only; excludes header and CRC. |
| `SourceId` | 6 | 1B | Sender logical node. |
| `DestinationId` | 7 | 1B | Receiver logical node. |
| `MessageId` | 8 | 2B | Frame/message association for fragmentation/debug. |
| `FrameIndex` | 10 | 1B | Fragment index, starting at 0. |
| `FrameCount` | 11 | 1B | Fragment count; unfragmented messages use 1. |
| `CRC16` | Footer | 2B | CRC16-CCITT-FALSE over header + payload. |

All AXTP multi-byte wire integers MUST use Big-Endian / network byte order.

Frame parser MUST validate magic, version, PayloadType, `PayloadLength + 14 <= maxFrameSize`, `FrameCount >= 1`, `FrameIndex < FrameCount`, CRC, and complete payload availability before dispatch.

Fragmentation belongs to the Frame layer. Request/Response matching uses RPC request id, not `MessageId`. STREAM ordering uses `seqId`, not `MessageId`.

## Transport Profiles

Transport profile fixes the outer envelope. AXTP does not negotiate Standard Frame shape at runtime.

| Profile | Envelope | Notes |
|---|---|---|
| `AXTP-TCP` | Standard Framed over a TCP byte stream. | Receiver SHOULD scan magic, parse 12B header, read payload and CRC, then dispatch. |
| `AXTP-USB-HID` | Standard Framed over reports/packets. | Packet boundaries do not replace header/CRC validation. |
| `AXTP-WS-JSON` | WebSocket Unframed JSON. | RPC-only; no CONTROL, STREAM, CRC, Standard Frame Header, or JSON_BINARY fixed header. |
| `AXTP-WS-CLOUD-REVERSE` | WebSocket Unframed JSON. | Same RPC-only wire shape; physical connection direction can differ from logical role. |

Standard Framed startup:

```text
Transport connected
CONTROL OPEN
CONTROL ACCEPT
RPC Hello
RPC Identify(randomSeed)
RPC Identified
APP_READY
```

WebSocket JSON startup:

```text
WebSocket connected
RPC Hello
RPC Identify(randomSeed)
RPC Identified
APP_READY
```

Runtime gate states:

| State | Allowed traffic | Rejected traffic |
|---|---|---|
| `LINK_CONNECTED` | Standard Framed: CONTROL OPEN only. WebSocket JSON: RPC Hello can start. | Business RPC and STREAM. |
| `FRAMING_READY` | RPC Hello / Identify / Identified. | Business Request, Event, and STREAM. |
| `APP_READY` | Request / RequestResponse / Event; STREAM if profile and business Stream Context allow it. | Unknown method, unauthorized method, invalid sid, unknown streamId. |
| `CLOSING` | CLOSE_ACK and local cleanup. | New business RPC or new STREAM contexts. |

Request-before-identified MUST be rejected or close the session according to profile policy; it MUST NOT be processed as business traffic.

## CONTROL

CONTROL exists only in Standard Framed profiles. WebSocket Unframed JSON MUST NOT send or require CONTROL.

CONTROL payload is:

```text
opcode:uint8 + controlId:uint16 + statusCode:uint16 + TLV body
```

`controlId` and `statusCode` use Big-Endian / network byte order. `statusCode=0x0000` means SUCCESS; non-zero values use the ErrorCode registry.

Required CONTROL opcodes:

| Opcode | Name | Required behavior |
|---:|---|---|
| `0x01` | `OPEN` | Physical Client starts framed link negotiation. |
| `0x02` | `ACCEPT` | Physical Server accepts or rejects OPEN. |
| `0x04` | `HEARTBEAT` | Keepalive. |
| `0x05` | `HEARTBEAT_ACK` | Keepalive response. |
| `0x0A` | `CLOSE` | Graceful close request. |
| `0x0B` | `CLOSE_ACK` | Graceful close response. |

There is no `REJECT` opcode. Rejected OPEN is an `ACCEPT` with non-zero `statusCode`.

Responses to OPEN, HEARTBEAT, and CLOSE MUST echo the request `controlId`. A receiver that cannot parse CONTROL payload length, TLV length, opcode, or required negotiation fields SHOULD return the closest matching CONTROL error when a valid response can be framed; otherwise it MAY close the transport.

Required OPEN / ACCEPT TLVs:

| TLV | Name | Rule |
|---:|---|---|
| `0x04` | `maxFrameSize` | Required; total frame size including 12B header and 2B CRC. |
| `0x07` | `supportedPayloadTypes` | Required bitmap. |
| `0x08` | `supportedRpcEncodings` | Required in OPEN. |
| `0x0A` | `heartbeatIntervalMs` | Required. |
| `0x0B` | `ackMode` | Required; Phase 1 default is `NONE`. |
| `0x1E` | `selectedRpcEncoding` | Required in successful ACCEPT. |

`sessionId(0x01)` MAY be parsed for tracing or future resume but MUST NOT route RPC or STREAM business state.

New implementations SHOULD omit deprecated CONTROL `protocolVersion(0x02)` and MUST NOT reject an otherwise valid v1 handshake because it is absent. `maxPayloadSize(0x05)` is deprecated/reserved; use `maxFrameSize`.

READY is optional / 可选. 默认握手只要求 OPEN / ACCEPT. Runtime MUST NOT require READY as a third default handshake step.

Phase 1 不要求 runtime 实现 ACK/NACK. ACK, NACK, RESUME, SESSION_RESET, WINDOW_UPDATE, PING, PONG, GOAWAY, and VENDOR are future/profile-specific unless a released profile requires them.

Minimal CONTROL example, shown at payload level:

```text
OPEN:
01 00 01 00 00
04 02 10 00        # maxFrameSize = 4096
07 01 07           # CONTROL + RPC + STREAM
08 01 09           # JSON + JSON_BINARY supported
0a 02 03 e8        # heartbeatIntervalMs = 1000
0b 01 00           # ackMode = NONE

ACCEPT:
02 00 01 00 00
04 02 10 00        # maxFrameSize = 4096
07 01 07           # CONTROL + RPC + STREAM
1e 01 01           # selectedRpcEncoding = JSON
0a 02 03 e8        # heartbeatIntervalMs = 1000
0b 01 00           # ackMode = NONE
```

The Standard Frame Header, payload length, and CRC wrap this CONTROL payload. See `docs/guides/core-protocol-flow.md` for full packet examples.

## RPC

RPC is the business control plane. It runs inside Standard Framed `PayloadType=RPC` or directly as WebSocket Unframed JSON.

JSON/CBOR/MSGPACK RPC envelope:

```json
{ "sid": "12345678", "op": 7, "d": {} }
```

| Field | Rule |
|---|---|
| `sid` | Empty string before assignment; fixed 8 hex chars after Identified. |
| `op` | uint8 operation code. |
| `d` | op-specific object; empty object allowed. |

Required RPC ops:

| op | Name | Required behavior |
|---:|---|---|
| `0` | `Hello` | Logical Server announces AXTP version/auth requirements. |
| `2` | `Identify` | Logical Client sends identity, `randomSeed`, auth, and event subscription intent. |
| `3` | `Identified` | Logical Server assigns `sid`; session becomes app-ready. |
| `6` | `Event` | Low-frequency event delivery. |
| `7` | `Request` | Business method request after Identified. |
| `8` | `RequestResponse` | Business result or error. |

Minimal RPC JSON sequence:

```json
{ "sid": "", "op": 0, "d": { "axtpVersion": "1.0.0" } }
{ "sid": "", "op": 2, "d": { "randomSeed": 305419896, "eventMasks": "090101" } }
{ "sid": "12345678", "op": 3, "d": { "accepted": true } }
{ "sid": "12345678", "op": 7, "d": { "id": 1, "method": "audio.getAlgorithmConfig", "params": {} } }
{ "sid": "12345678", "op": 8, "d": { "id": 1, "status": 0, "result": {} } }
```

In Standard Framed JSON RPC, the RPC payload is `rpcEncoding(1B) + JSON bytes`; with `selectedRpcEncoding=JSON`, `rpcEncoding=0x01`. In WebSocket Unframed JSON, the WebSocket message payload is exactly the JSON object.

`axtpVersion` in Hello is the AXTP spec compatibility authority. `rpcVersion` and `negotiatedRpcVersion` are transition fields only; new senders SHOULD omit them, receivers MAY accept value `1`, and receivers MUST reject other values unless a future released spec says otherwise.

Identify MUST include `randomSeed:uint32`. The Logical Server MUST mix `randomSeed` with local state when generating `sid`; it MUST NOT use `randomSeed` directly as `sid`. `randomSeed` is not an authentication secret.

After Identified, both sides MAY initiate RPC Request if the method's domain.feature, capability, or role policy allows it. This does not change the Hello / Identify / Identified logical roles or CONTROL physical roles.

Malformed, empty, non-hex, zero, or missing `sid` MUST be rejected after APP_READY.

Standard Framed RPC MUST prefix payload with `rpcEncoding`. JSON (`0x01`) is required for Phase 1 interoperability. JSON_BINARY (`0x04`) SHOULD be implemented by high-throughput or embedded Standard Framed profiles.

JSON_BINARY fixed header is 15B:

```text
rpcEncoding(1) + rpcOp(1) + sid(4) + requestId(4)
  + methodOrEventId(2) + statusCode(2) + bodyEncoding(1)
  + body(N)
```

JSON_BINARY multi-byte fields use Big-Endian / network byte order. Event uses requestId `0`. `bodyEncoding` values are NONE=`0x00`, TLV8=`0x01`, TLV16=`0x02`.

Request/Response matching MUST use RPC request id. Unknown method MUST return an RPC error such as `RPC_METHOD_NOT_FOUND`; CONTROL MUST NOT handle business method errors.

`eventMasks` encodes domain-scoped event subscriptions. Each entry is `domainId:uint8 + maskLen:uint8 + bitmask(maskLen)`; bit 0 maps to the event whose registry `bitOffset=0` within that domain. Empty or absent masks mean no event subscription unless a profile states otherwise.

## STREAM

STREAM exists only in Standard Framed profiles. WebSocket Unframed JSON is RPC-only and MUST NOT carry STREAM.

STREAM Payload is:

```text
STREAM Header(16B) + data(N)
```

STREAM Header layout:

| Field | Type | Size | Rule |
|---|---|---:|---|
| `streamId` | uint32 | 4B | Non-zero stream context id. |
| `seqId` | uint32 | 4B | Packet sequence id in the stream. |
| `cursor` | uint64 | 8B | Position/time cursor interpreted by Stream Context. |

The 16B STREAM Header fields `streamId:uint32`, `seqId:uint32`, and `cursor:uint64` use Big-Endian / network byte order. `Frame.payloadLength` MUST equal `16 + dataLength`.

STREAM Header MUST NOT carry codec, file type, firmware metadata, offset fields, timestamp fields, flags, domain, event, or capability. Business meaning comes from Stream Context created by an adopted RPC method or profile.

StreamParser MUST validate `payloadLength >= 16`, `streamId != 0`, known Stream Context, data size limits, and profile-specific `seqId` behavior. It MUST treat `data` as opaque bytes and dispatch it to the profile handler.

CONTROL CLOSE, transport loss, or session teardown MUST release the session's Stream Contexts.

Reliable retransmission, resume, window update, chunk-level CRC, and object-level verification are future/profile-specific and MUST keep the 16B STREAM Header unchanged.

## Low-Bandwidth Boundary

Compact/HID-64/BLE/UART framing is a low-bandwidth degradation path, not an AXTP v1 Core requirement.

Low-bandwidth profiles MUST preserve:

- PayloadType values CONTROL=`0x01`, RPC=`0x02`, STREAM=`0x03`.
- CONTROL 5B payload header.
- JSON_BINARY 15B fixed header when JSON_BINARY is used.
- STREAM 16B Header.
- MethodId, EventId, ErrorCode, schema, capability, and profile registry semantics.

Low-bandwidth profiles MUST NOT redefine Standard Frame, PayloadType, RPC envelope, or STREAM Header semantics for normal Standard Framed runtimes.

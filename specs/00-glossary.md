# AXTP Glossary

This file defines shared AXTP vocabulary. It does not define field layout, registry facts, generated outputs, or release status.

## Layers

| Term | Meaning |
|---|---|
| AXTP | Auditoryworks Transport Protocol, the protocol standard consumed by runtime, SDK, tooling, mock server, and conformance repositories. |
| Transport | The carrier for AXTP bytes or JSON messages, such as TCP, USB HID, WebSocket, BLE, UART, or a mock transport. |
| Transport Profile | A fixed rule for how a transport carries AXTP, including whether it uses Standard Framed Binary or WebSocket Unframed JSON. |
| Frame Layer | Standard Frame parsing: magic, version, payload length, PayloadType, fragmentation, and CRC. |
| Payload Layer | CONTROL, RPC, or STREAM parsing after PayloadType dispatch. |
| Registry Layer | Machine facts for methods, events, errors, schemas, capabilities, and profiles. |
| Business Layer | Device or product semantics such as `audio`, `video`, `network`, `firmware`, or `room`. |

## Payloads

| Term | Meaning |
|---|---|
| PayloadType | The top-level parser selector: CONTROL=`0x01`, RPC=`0x02`, STREAM=`0x03`. It is not a business type. |
| CONTROL | Standard Framed link control for OPEN / ACCEPT, heartbeat, and close. |
| RPC | Business control plane for Hello / Identify / Identified, Request / Response, and Event. |
| STREAM | Continuous data plane for an already established stream context. |
| Control Plane | CONTROL plus RPC behavior that manages sessions and business commands. |
| Data Plane | STREAM behavior that carries continuous data such as media, firmware, file, log, or sensor chunks. |

## Contexts And IDs

| Term | Meaning |
|---|---|
| Transport connection | The underlying socket, WebSocket, HID connection, or equivalent transport handle. |
| Framed Link Context | Standard Framed context created by CONTROL OPEN / ACCEPT. |
| RPC Session | Application session created by RPC Hello / Identify / Identified. |
| Stream Context | Per-stream metadata created by an adopted RPC method or profile before STREAM data is sent. |
| `sessionId` | Optional CONTROL link identifier for trace or future resume; not a business session id. |
| `sid` | RPC Session ID allocated by the Logical Server after Identify succeeds. |
| `requestId` | RPC request/response correlation id. |
| `messageId` | Standard Frame fragmentation/reassembly/debug id. |
| `streamId` | STREAM context id. |
| `seqId` | STREAM packet sequence id. |
| `cursor` | STREAM position/time cursor whose unit is defined by the stream context. |

## Registry Terms

| Term | Meaning |
|---|---|
| Domain | Stable business or protocol category such as `audio`, `video`, `device`, `system`, `network`, or `capability`. |
| Feature | Reviewable capability block within a domain, such as `audio.algorithm` or `network.wifi`. |
| Method | RPC business operation with a stable name and optional binary methodId. |
| Event | RPC asynchronous notification for state, progress, result, or report semantics. |
| ErrorCode | Shared numeric error code used by RPC status, CONTROL status, and STREAM/profile error mapping. |
| Schema | Structured object definition for method params/result, event payload, capability, or profile data. |
| Capability | Device-declared availability or limits for a domain.feature. |
| Profile | Named implementation requirement set for transports, methods, events, errors, types, and capabilities. |
| Protocol IR | Generated machine-readable model at `contract/protocol/axtp.protocol.yaml`. |
| Generated Reference | Generated human/machine references under `contract/generated/**`. |

## Roles

| Term | Meaning |
|---|---|
| Physical Client | The side that initiates the underlying transport connection. |
| Physical Server | The side that accepts the underlying transport connection. |
| Logical Client | The side that identifies to the Logical Server and primarily consumes exposed methods/events/streams. |
| Logical Server | The side that sends Hello, assigns `sid`, and exposes methods/events/streams. |

Physical direction and logical direction can differ. For example, a device may be the Physical Client when connecting to cloud, while still acting as the Logical Server.

## Encodings

| Term | Meaning |
|---|---|
| JSON | Default RPC object encoding for `{ sid, op, d }`. |
| CBOR | Optional compact object encoding for the same RPC semantics. |
| MSGPACK | Optional compact object encoding for the same RPC semantics. |
| JSON_BINARY | AXTP RPC fixed binary envelope encoding; not a generic binary JSON format. |
| TLV8 | `fieldId:uint8 + length:uint8 + value` body encoding. |
| TLV16 | Longer TLV body encoding, optional/future unless required by a profile. |

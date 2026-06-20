# AXTP Registry

This file defines registry taxonomy, entry models, id stability, compatibility, and validation rules. Current registry facts live in `contract/registry/**`, `contract/protocol/axtp.protocol.yaml`, and `contract/generated/**`.

## Domain And Feature Taxonomy

`domain.feature` is the business classification unit. Every adopted method, event, schema, error, capability, or profile MUST explain its `domain.feature`.

| Rule | Requirement |
|---|---|
| Domain | MUST be a stable business or protocol boundary, such as `audio`, `video`, `device`, `system`, `network`, `firmware`, `capability`, `room`, or `signage`. |
| Feature | MUST be a reviewable, testable, evolvable capability block; it MUST NOT be a field name, UI control, codec, transport, product SKU, or legacy command id. |
| Method name | MUST use `domain.actionObject` or an adopted `domain.verbNoun` form. |
| Event name | MUST express state change, result, progress, or report semantics; Event MUST NOT replace RPC Response. |
| Capability name | SHOULD use `domain.feature`. |
| Stream business | Business streams belong to business domains such as `video.stream` or `audio.stream`; public `stream` is reserved for shared data-plane or flow-control concepts. |

Classification rules:

- `room` describes a logical space or business endpoint.
- `device` describes endpoint identity, product, hardware, and topology.
- `system` describes OS/runtime state and lifecycle.
- Generic resources such as network, storage, file, log, software, and firmware use their own domains.
- Functional capabilities such as audio, video, camera, display, signage, cast, input, output, diagnostic, auth, and privacy use capability-specific domains.
- Software application updates belong to `software`; low-level device images, bootloaders, MCU/DSP/ISP/FPGA images belong to `firmware`.
- Power, reboot, shutdown, and sleep/wake belong to `system`, not device identity.

Long classification examples and legacy intake tables live in `workspace/registry-planning/**`; they are not release/runtime contracts.

## Status And ID Allocation

Registry facts use the same status vocabulary across methods, events, errors, schemas, capabilities, and profiles:

| Status | Meaning | Runtime contract |
|---|---|---:|
| `draft` | Under review or not yet generated. | No |
| `experimental` | Generated for limited interop, may change before stable release. | Profile-specific |
| `stable` | Adopted and generated as current implementation contract. | Yes |
| `deprecated` | Still generated for compatibility, not recommended for new use. | Yes, with deprecation rules |
| `reserved` | Held for future or compatibility; no runtime behavior. | No |

Numeric ids are `uint16` unless a generated fact says otherwise. New domain-scoped method/event/error/capability ids SHOULD use a stable high-byte domain allocation and a low-byte local id. Once generated in a stable release, numeric ids, names, `bitOffset`, and schema field ids MUST NOT be reused for different meaning.

`bitOffset` is domain-local metadata for generated masks and discovery. It is not a wire id by itself and MUST NOT be used as a substitute for methodId or eventId.

## Methods

Method is an RPC business operation. JSON RPC uses method name; JSON_BINARY uses `methodId:uint16`; both MUST resolve to the same registry fact.

Method rules:

1. Method MUST be carried by RPC, never by Frame Header, CONTROL header, or STREAM Header.
2. Method name and methodId MUST be globally unique.
3. Stable methodId MUST NOT change meaning or be reused.
4. `bitOffset` MUST be unique within a domain when domain-scoped method bitmap metadata is used.
5. Every method MUST bind request and response schemas; empty request/response MUST use the registered Empty schema.
6. Every method MUST declare possible errors; each error MUST resolve to the error registry.
7. Events and capabilities referenced by a method MUST resolve to registered facts.
8. Continuous data MUST use STREAM; method handles setup, query, control, start/stop, or finite results.

Minimum source shape:

```yaml
methods:
  - id: 0x0901
    name: audio.getAlgorithmConfig
    domain: audio
    status: stable
    bitOffset: 1
    since: 1.0.0
    request_schema: AudioGetAlgorithmConfigRequest
    response_schema: AudioAlgorithmConfig
    errors:
      - SUCCESS
      - NOT_SUPPORTED
      - INVALID_ARGUMENT
```

Runtime MUST use generated registry or Protocol IR for method lookup and MUST NOT keep a hand-written second method table.

## Events

Event is an RPC asynchronous notification for state, progress, result, or report semantics.

Event rules:

1. Event MUST be carried by RPC `op=EVENT`.
2. Event name and eventId MUST be globally unique.
3. Stable eventId MUST NOT change meaning or be reused.
4. `bitOffset` MUST be unique within the domain and is used by domain-scoped `eventMasks`.
5. Every event MUST bind an event payload schema.
6. Event MUST NOT express synchronous success/failure of one request; RPC Response does that.
7. High-frequency continuous data MUST use STREAM.

Domain-scoped event mask format is defined by core RPC behavior. Bit 0 maps to the event whose registry `bitOffset=0` in that domain.

Receivers MUST tolerate unknown or unsubscribed events according to profile policy; unknown event handling MUST NOT invalidate the session by itself.

## Errors

ErrorCode is the shared numeric error space for RPC Response status, CONTROL status, and STREAM/profile error mapping.

Error rules:

1. `0x0000` MUST mean success; failures MUST use non-zero errorCode.
2. ErrorCode MUST be globally unique `uint16`.
3. Stable errorCode MUST NOT change meaning or be reused.
4. RPC business failure SHOULD be expressed by RPC Response, not Frame Header or CONTROL NACK.
5. CONTROL negotiation, frame parse, transport limit, and stream data-plane failures SHOULD use common/frame/control/stream errors.
6. Fine-grained diagnostics SHOULD go into status details, event payload, diagnostic payload, or vendor detail fields rather than many duplicate error codes.

Core ranges:

| Range | Category |
|---:|---|
| `0x0000-0x00FF` | common / frame / control / rpc |
| `0x0100-0x05FF` | device / capability / system / firmware / stream |
| `0x0600-0x15FF` | business domains |
| `0x7000-0x7EFF` | vendor |
| `0x7F00-0x7FFF` | legacy adapter |

Runtime MUST use generated error enum/lookup and SHOULD preserve unknown error codes for diagnostics.

## Profiles

Profile is a named implementation requirement set. It can reference methods, events, types, errors, capabilities, transport profiles, and frame profiles; it MUST NOT redefine wire fields.

Profile rules:

1. Profile MUST reference already defined facts.
2. Profile MUST NOT change methodId, eventId, errorCode, PayloadType, Standard Frame Header, RPC envelope, or STREAM Header semantics.
3. Standard Framed profiles MAY require CONTROL, RPC, and STREAM.
4. WebSocket Unframed JSON profiles MUST NOT require CONTROL or STREAM.
5. Supporting a profile means satisfying required facts and passing the corresponding conformance scope.
6. Adding required facts to a stable profile can be breaking; optional capability expansion is usually compatible.

Runtime repositories MUST declare supported profiles with exact spec tag, commit, or release artifact metadata.

## Validation

Generator validation MUST check at least:

- global uniqueness of method/event/error/profile names and numeric ids;
- domain prefix alignment for method/event/capability names;
- method/event bitOffset uniqueness within a domain;
- schema, error, event, capability, transport, and profile references exist;
- stable/deprecated/reserved ids are not reused;
- core registry and domain YAML do not duplicate the same fact;
- Protocol IR and generated docs match source YAML.

Candidate planning tables under `workspace/registry-planning/**` are not validation input unless explicitly adopted into `contract/registry/**`.

<!-- This file was automatically generated. Do not edit directly! -->

# AXTP Protocol

## Main Table of Contents

- [Overview](#overview)
- [Protocol Framework](#protocol-framework)
- [Supported Connection Profiles](#supported-connection-profiles)
- [Design Goals / Non-Goals](#design-goals--non-goals)
- [Connection Lifecycle](#connection-lifecycle)
- [Capability Discovery](#capability-discovery)
- [Methods](#methods)
  - [audio Methods](#audio-methods)
- [Events](#events)
  - [audio Events](#audio-events)
- [Additional Types](#additional-types)
- [Errors Reference](#errors-reference)
- [Profiles Reference](#profiles-reference)

## Implemented Domains

| Domain | Methods | Events |
| ---- | ---- | ---- |
| audio | 4 | 1 |

## Overview

AXTP is a transport-independent device communication protocol for CONTROL, RPC and STREAM payloads across Standard Framed transports, plus a formal WebSocket Unframed JSON RPC profile. Phase 1 requires the STREAM data plane for audio/video media flow profiles.

| Property | Value |
| ---- | ---- |
| Protocol | AXTP |
| Version | 1.0.0 |
| Spec Version | 1 |
| Registry Version | 1.0.0 |
| Status | rc1 |
| Wire Byte Order | big-endian / network |
| Wire Integer Encoding | unsigned and signed multi-byte integers use Big-Endian / network byte order |
| CRC Byte Order | big-endian |

## Protocol Framework

AXTP v1 has two formal integration paths:

- **Standard Framed**: uses the 12-byte Standard Frame header, CONTROL OPEN/ACCEPT, HEARTBEAT/CLOSE, RPC, STREAM, fragmentation and CRC16. ACK/NACK reliability is future/profile-level work.
- **WebSocket Unframed JSON**: uses the JSON `sid`/`op`/`d` envelope directly over WebSocket. It is RPC-only and does not carry CONTROL or STREAM payloads.

| Path | Transports | Frame | RPC Encodings | CONTROL | STREAM |
| ---- | ---- | ---- | ---- | ---- | ---- |
| Standard Framed | AXTP-USB-HID<br>AXTP-TCP | STANDARD_FRAME | `JSON`, `CBOR`, `MSGPACK`, `JSON_BINARY` | Yes | Yes |
| WebSocket Unframed JSON | AXTP-WS-JSON<br>AXTP-WS-CLOUD-REVERSE | None | `JSON` | No | No |

Compact/HID-64/BLE/UART framing is a low-bandwidth degradation path, not an AXTP v1 Core requirement. See `specs/20-core.md` for that path.

## Design Goals / Non-Goals

### Goals

- Provide one unified protocol model for control, request/response RPC and audio/video stream transfer.
- Make Standard Frame the AXTP v1 Core binary path for USB HID High Speed and TCP.
- Support WebSocket Unframed JSON as the formal RPC-only integration path.
- Keep full dynamic capability modeling optional outside AXTP v1 Core.

### Non-Goals

- Full dynamic UI capability modeling is not required in v1.
- Compact/HID-64/BLE/UART low-bandwidth framing is not required by AXTP v1 Core.
- STREAM is not carried over WebSocket Unframed JSON.
- Header profile negotiation is not performed dynamically in v1.

## Connection Lifecycle

| Step | From | To | Status | Description |
| ---- | ---- | ---- | ---- | ---- |
| OPEN | Client | Server | - | Open an AXTP logical session and declare runtime limits. |
| ACCEPT | Server | Client | - | Accept or reject the framed link and optionally return parameter overrides relevant to this profile or implementation. |
| Hello | Server | Client | - | Announce RPC session rules, AXTP version and authentication requirements. |
| Identify | Client | Server | - | Submit client identity, randomSeed uint32 and optional authentication data. |
| Identified | Server | Client | - | Confirm that the RPC session is ready. |
| Load Adopted Registry | Client | Server | - | Use the generated protocol registry to select adopted business methods for the current product. |

### Optional Lifecycle Extensions

| Step | From | To | Status | Description |
| ---- | ---- | ---- | ---- | ---- |
| READY | - | - | optional | Reserved for transports that need an explicit client acknowledgement after ACCEPT; not required by AXTP v1 Core. |

## Supported Connection Profiles

The current protocol definition exposes the connection profiles that are intended for AXTP v1 readers and SDKs.

| Profile | Family | Mode | Frame | RPC Encodings | CONTROL | STREAM | Notes |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| AXTP-USB-HID | usb-hid | standard-framed | STANDARD_FRAME | `JSON`, `CBOR`, `MSGPACK`, `JSON_BINARY` | Yes | Yes | USB HID High Speed or large-report HID transport using Standard Frame. |
| AXTP-TCP | tcp | standard-framed | STANDARD_FRAME | `JSON`, `CBOR`, `MSGPACK`, `JSON_BINARY` | Yes | Yes | TCP byte stream transport using Standard Frame magic and length parsing. |
| AXTP-WS-JSON | websocket | unframed-json | None | `JSON` | No | No | Formal RPC-only WebSocket JSON profile using the sid/op/d envelope. |
| AXTP-WS-CLOUD-REVERSE | websocket | unframed-json-cloud-reverse | None | `JSON` | No | No | Device initiates the WebSocket connection but remains the Logical Server. |

### Role Matrix

| Profile | Physical Client | Physical Server | Logical Client | Logical Server | Hello Sender |
| ---- | ---- | ---- | ---- | ---- | ---- |
| AXTP-USB-HID | Host / App | USB HID Device | Host / App | Device | Device |
| AXTP-TCP | App / PC | Device | App / PC | Device | Device |
| AXTP-WS-JSON | App / Cloud | Device / Gateway | App / Cloud | Device | Device |
| AXTP-WS-CLOUD-REVERSE | Device | Cloud | Cloud | Device | Device |

**Logical Server sends Hello.** This is true even when the device is the Physical Client in `AXTP-WS-CLOUD-REVERSE`.

### Cloud Reverse Connection

In `AXTP-WS-CLOUD-REVERSE`, the device initiates the WebSocket connection to the cloud endpoint, but the device remains the Logical Server:

```text
Physical Client: Device    Physical Server: Cloud
Logical Client:  Cloud     Logical Server:  Device

  Device opens the WebSocket connection to the cloud endpoint.
  No CONTROL OPEN or Standard Frame is used in this profile.
  Device remains the Logical Server and sends Hello after the WebSocket is established.
  Cloud identifies as the Logical Client and then issues JSON RPC requests.
```

The key invariant: **the Logical Server sends Hello** after the WebSocket is established.

### WebSocket Unframed JSON

This profile is a formal RPC-only path. It skips the Frame and CONTROL layers, uses JSON `sid`/`op`/`d`, and does not carry STREAM data.

- Open the WebSocket connection.
- Wait for Hello from the Logical Server.
- Send Identify using the JSON sid/op/d envelope.
- Wait for Identified.
- Load generated protocol registry for the current product build.
- Start JSON RPC requests and receive JSON events; event payload data does not repeat sid, but every event message still carries sid in the JSON sid/op/d envelope.

| WebSocket Unframed JSON | Standard Framed AXTP |
| --- | --- |
| WebSocket Upgrade | Transport connect + CONTROL OPEN/ACCEPT |
| Hello (op=0) | RPC Hello |
| Identify (op=2) | RPC Identify |
| Identified (op=3) | RPC Identified |
| REQUEST (op=7) | RPC Request |
| REQUEST_RESPONSE (op=8) | RPC RequestResponse |
| EVENT (op=6) | RPC Event |
| WebSocket Close | CONTROL CLOSE or transport close |
| Not supported | STREAM |

## Payload Types

Every Standard Framed AXTP Frame carries exactly one payload. WebSocket Unframed JSON skips this layer and carries only RPC JSON envelopes.

| Type | ID | Header Size | When to Use |
| ---- | ---- | ---- | ---- |
| `CONTROL` | 0x01 | 5B | Logical session control payload. |
| `RPC` | 0x02 | 1B | RPC payload starts with rpcEncoding; JSON_BINARY then carries the fixed binary envelope. |
| `STREAM` | 0x03 | 16B | Chunk-oriented data plane payload. |

## Capability Discovery

Generated capabilities are the feature-level switches that runtimes and devices use to declare support before invoking optional business methods or subscribing to events.

| Capability ID | Name | Domain | Status | Type | Schema | Description |
| :---: | ---- | ---- | :---: | :---: | ---- | ---- |
| 0x0001 | protocol.payload.control | protocol | stable | bool | - | Device supports CONTROL payload. |
| 0x0002 | protocol.payload.rpc | protocol | stable | bool | - | Device supports RPC payload. |
| 0x0003 | protocol.payload.stream | protocol | stable | bool | - | Device supports STREAM data-plane payloads. |
| 0x0901 | audio.algorithm | audio | stable | object | AudioAlgorithmCapability | Device supports runtime audio algorithm capability discovery, configuration, reset, and change notification. |

## Generated Method Index

The generated registry groups methods by domain. Each method keeps a stable `bitOffset` within its domain for generated indexes, test vectors, and any adopted runtime discovery method.

| Domain | Methods |
| ---- | ---- |
| audio | 1: audio.getAlgorithmConfig<br>2: audio.setAlgorithmConfig<br>0: audio.getAlgorithmCapabilities<br>3: audio.resetAlgorithmConfig |

# Methods

## audio Methods

### Methods in this domain

- [audio.getAlgorithmConfig](#audiogetalgorithmconfig)
- [audio.setAlgorithmConfig](#audiosetalgorithmconfig)
- [audio.getAlgorithmCapabilities](#audiogetalgorithmcapabilities)
- [audio.resetAlgorithmConfig](#audioresetalgorithmconfig)

---

### audio.getAlgorithmConfig

Return the current effective configuration for supported audio algorithm objects.

- Method ID: `0x0901`
- Domain: `audio`
- bitOffset: `1`
- Status: `stable`
- Added in v1.0.0
- Encodings: `json`, `tlv`
- Required Capabilities: `audio.algorithm`
- Possible Events: `None`
- Possible Errors: `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INTERNAL_ERROR`

#### Request Fields

Type: `AudioGetAlgorithmConfigRequest`

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?items | Array<String> | 0x01 | Optional algorithm object names; omit to query all supported algorithms. | array.itemType=string | Omit if not used. |

#### Response Fields

Type: `AudioAlgorithmConfig`

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?noiseSuppression | AudioNoiseSuppressionConfig | 0x01 | Noise suppression configuration. | None | Omit if not used. |
| ?echoCancellation | AudioEchoCancellationConfig | 0x02 | Echo cancellation configuration. | None | Omit if not used. |
| ?autoGainControl | AudioAutoGainControlConfig | 0x03 | Automatic gain control configuration. | None | Omit if not used. |
| ?beamforming | AudioBeamformingConfig | 0x04 | Beamforming configuration. | None | Omit if not used. |
| ?dereverberation | AudioDereverberationConfig | 0x05 | Dereverberation configuration. | None | Omit if not used. |
| ?voiceActivityDetection | AudioVoiceActivityDetectionConfig | 0x06 | Voice activity detection configuration. | None | Omit if not used. |
| ?directionOfArrival | AudioDirectionOfArrivalConfig | 0x07 | Direction of arrival configuration. | None | Omit if not used. |
| ?howlingSuppression | AudioHowlingSuppressionConfig | 0x08 | Howling suppression configuration. | None | Omit if not used. |

---

### audio.setAlgorithmConfig

Partially update one or more audio algorithm configuration objects atomically.

- Method ID: `0x0902`
- Domain: `audio`
- bitOffset: `2`
- Status: `stable`
- Added in v1.0.0
- Encodings: `json`, `tlv`
- Required Capabilities: `audio.algorithm`
- Possible Events: `audio.algorithmConfigChanged`
- Possible Errors: `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED`, `INTERNAL_ERROR`

#### Request Fields

Type: `AudioSetAlgorithmConfigRequest`

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| config | AudioAlgorithmConfig | 0x01 | Partial configuration keyed by algorithm object name. | None | N/A |

#### Response Fields

Type: `AudioSetAlgorithmConfigResponse`

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| applyState | Enum | 0x01 | Apply state; values are applied or pending_restart. | None | N/A |
| requiresAudioRestart | Boolean | 0x02 | Whether the change requires restarting the audio link or rebuilding the audio pipeline. | None | N/A |
| config | AudioAlgorithmConfig | 0x03 | Final effective configuration for the algorithms affected by this operation. | None | N/A |

---

### audio.getAlgorithmCapabilities

Return supported audio algorithm objects, fields, defaults, ranges, units, and update policy.

- Method ID: `0x090D`
- Domain: `audio`
- bitOffset: `0`
- Status: `stable`
- Added in v1.0.0
- Encodings: `json`, `tlv`
- Required Capabilities: `audio.algorithm`
- Possible Events: `None`
- Possible Errors: `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INTERNAL_ERROR`

#### Request Fields

Type: `AudioGetAlgorithmCapabilitiesRequest`

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?items | Array<String> | 0x01 | Optional algorithm object names; omit to query all supported algorithms. | array.itemType=string | Omit if not used. |

#### Response Fields

Type: `AudioGetAlgorithmCapabilitiesResponse`

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| capability | String | 0x01 | Fixed capability name audio.algorithm. | maxLength=32 | N/A |
| updatePolicy | AudioAlgorithmUpdatePolicy | 0x02 | Update and atomicity policy for set and reset operations. | None | N/A |
| algorithms | AudioAlgorithmCapabilities | 0x03 | Capability descriptors keyed by algorithm object name. | None | N/A |

---

### audio.resetAlgorithmConfig

Reset all, selected, or selected-field audio algorithm configuration to declared default values.

- Method ID: `0x090E`
- Domain: `audio`
- bitOffset: `3`
- Status: `stable`
- Added in v1.0.0
- Encodings: `json`, `tlv`
- Required Capabilities: `audio.algorithm`
- Possible Events: `audio.algorithmConfigChanged`
- Possible Errors: `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED`, `INTERNAL_ERROR`

#### Request Fields

Type: `AudioResetAlgorithmConfigRequest`

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| items | Bytes | 0x01 | JSON reset selector: the string all, an array of algorithm object names, or a map from algorithm names to field-name arrays. | maxLength=256 | N/A |

#### Response Fields

Type: `AudioSetAlgorithmConfigResponse`

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| applyState | Enum | 0x01 | Apply state; values are applied or pending_restart. | None | N/A |
| requiresAudioRestart | Boolean | 0x02 | Whether the change requires restarting the audio link or rebuilding the audio pipeline. | None | N/A |
| config | AudioAlgorithmConfig | 0x03 | Final effective configuration for the algorithms affected by this operation. | None | N/A |

---

# Events

## audio Events

### Events in this domain

- [audio.algorithmConfigChanged](#audioalgorithmconfigchanged)

---

### audio.algorithmConfigChanged

Emitted when audio algorithm configuration changes after set, reset, profile, restore, factory reset, or device policy changes.

- Event ID: `0x0901`
- Domain: `audio`
- bitOffset: `0`
- Status: `stable`
- Severity: `info`
- Added in v1.0.0
- Trigger: `audio.setAlgorithmConfig`, `audio.resetAlgorithmConfig`, `profile changed`, `factory reset`, `restore config`, `device policy`
- Required Capabilities: `audio.algorithm`

#### Payload Fields

Type: `AudioAlgorithmConfigChangedEvent`

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| reason | Enum | 0x01 | Change reason; values include user_request, reset_to_default, factory_reset, profile_changed, device_policy, restore_config, and unknown. | None | N/A |
| applyState | Enum | 0x02 | Apply state; values are applied or pending_restart. | None | N/A |
| requiresAudioRestart | Boolean | 0x03 | Whether the change requires restarting the audio link or rebuilding the audio pipeline. | None | N/A |
| config | AudioAlgorithmConfig | 0x04 | Changed or affected algorithm configuration values. | None | N/A |
| ?changedFields | Array<String> | 0x05 | Optional changed field paths such as noiseSuppression.level. | array.itemType=string | Omit if not used. |

---

# Additional Types

## AudioAlgorithmCapabilities

Capability descriptors for audio algorithm objects.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?noiseSuppression | AudioNoiseSuppressionCapabilities | 0x01 | Noise suppression capability descriptor. | None | Omit if not used. |
| ?echoCancellation | AudioEchoCancellationCapabilities | 0x02 | Echo cancellation capability descriptor. | None | Omit if not used. |
| ?autoGainControl | AudioAutoGainControlCapabilities | 0x03 | Automatic gain control capability descriptor. | None | Omit if not used. |
| ?beamforming | AudioBeamformingCapabilities | 0x04 | Beamforming capability descriptor. | None | Omit if not used. |
| ?dereverberation | AudioDereverberationCapabilities | 0x05 | Dereverberation capability descriptor. | None | Omit if not used. |
| ?voiceActivityDetection | AudioVoiceActivityDetectionCapabilities | 0x06 | Voice activity detection capability descriptor. | None | Omit if not used. |
| ?directionOfArrival | AudioDirectionOfArrivalCapabilities | 0x07 | Direction of arrival capability descriptor. | None | Omit if not used. |
| ?howlingSuppression | AudioHowlingSuppressionCapabilities | 0x08 | Howling suppression capability descriptor. | None | Omit if not used. |

---

## AudioAlgorithmPropertyCapability

Descriptor for one algorithm configuration property.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| type | Enum | 0x01 | Property type; values include boolean, enum, uint8, uint16, uint32, int32, float, string, object, and array. | None | N/A |
| ?defaultBool | Boolean | 0x02 | Boolean default value when type is boolean. | None | Omit if not used. |
| ?defaultEnum | String | 0x03 | Enum default value when type is enum. | maxLength=32 | Omit if not used. |
| ?defaultInt32 | Int32 | 0x04 | Numeric default value for integer-backed properties. | None | Omit if not used. |
| ?min | Int32 | 0x05 | Inclusive numeric minimum. | None | Omit if not used. |
| ?max | Int32 | 0x06 | Inclusive numeric maximum. | None | Omit if not used. |
| ?step | Int32 | 0x07 | Numeric step size. | None | Omit if not used. |
| ?values | Array<String> | 0x08 | Optional enum values. | array.itemType=string | Omit if not used. |
| ?unit | String | 0x09 | Unit such as ms, dB, or degree. | maxLength=16 | Omit if not used. |
| ?requiresAudioRestart | Boolean | 0x0A | Whether modifying this field requires restarting the audio link or rebuilding the audio pipeline. | None | Omit if not used. |

---

## AudioAlgorithmUpdatePolicy

Audio algorithm update and atomicity policy.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| partialUpdateSupported | Boolean | 0x01 | Whether clients may send only the fields they want to modify. | None | N/A |
| multiAlgorithmUpdateSupported | Boolean | 0x02 | Whether one request may update multiple algorithm objects. | None | N/A |
| atomicUpdateSupported | Boolean | 0x03 | Whether set and reset operations are applied atomically. | None | N/A |

---

## AudioAutoGainControlCapabilities

Automatic gain control supported fields.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supported | Boolean | 0x01 | Whether the device supports autoGainControl. | None | N/A |
| ?displayName | String | 0x02 | UI-readable display name. | maxLength=64 | Omit if not used. |
| ?enabled | AudioAlgorithmPropertyCapability | 0x03 | enabled property descriptor. | None | Omit if not used. |
| ?targetLevelDb | AudioAlgorithmPropertyCapability | 0x04 | targetLevelDb property descriptor. | None | Omit if not used. |
| ?maxGainDb | AudioAlgorithmPropertyCapability | 0x05 | maxGainDb property descriptor. | None | Omit if not used. |
| ?attackTimeMs | AudioAlgorithmPropertyCapability | 0x06 | attackTimeMs property descriptor. | None | Omit if not used. |
| ?releaseTimeMs | AudioAlgorithmPropertyCapability | 0x07 | releaseTimeMs property descriptor. | None | Omit if not used. |

---

## AudioAutoGainControlConfig

Automatic gain control configuration object.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?enabled | Boolean | 0x01 | Whether automatic gain control is enabled. | None | Omit if not used. |
| ?targetLevelDb | Int32 | 0x02 | Target output level in dB. | min=-36, max=-6 | Omit if not used. |
| ?maxGainDb | UInt8 | 0x03 | Maximum gain in dB. | min=0, max=36 | Omit if not used. |
| ?attackTimeMs | UInt32 | 0x04 | Gain attack time in milliseconds. | min=1, max=1000 | Omit if not used. |
| ?releaseTimeMs | UInt32 | 0x05 | Gain release time in milliseconds. | min=10, max=5000 | Omit if not used. |

---

## AudioBeamformingCapabilities

Beamforming supported fields.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supported | Boolean | 0x01 | Whether the device supports beamforming. | None | N/A |
| ?displayName | String | 0x02 | UI-readable display name. | maxLength=64 | Omit if not used. |
| ?enabled | AudioAlgorithmPropertyCapability | 0x03 | enabled property descriptor. | None | Omit if not used. |
| ?lookDirectionDeg | AudioAlgorithmPropertyCapability | 0x05 | lookDirectionDeg property descriptor. | None | Omit if not used. |
| ?beamWidthDeg | AudioAlgorithmPropertyCapability | 0x06 | beamWidthDeg property descriptor. | None | Omit if not used. |

---

## AudioBeamformingConfig

Beamforming configuration object.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?enabled | Boolean | 0x01 | Whether beamforming is enabled. | None | Omit if not used. |
| ?lookDirectionDeg | Int32 | 0x03 | Fixed beam look direction in degrees. | min=-180, max=180 | Omit if not used. |
| ?beamWidthDeg | UInt32 | 0x04 | Beam width in degrees. | min=10, max=180 | Omit if not used. |

---

## AudioCloseStreamParams

Request to close an audio stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |
| ?peerRole | Enum | 0x02 | Peer role in this stream. | None | Omit if not used. |
| ?reason | Enum | 0x03 | Close reason. | None | Omit if not used. |
| ?finalCursor | UInt64 | 0x04 | Last processed cursor value. | None | Omit if not used. |

---

## AudioCloseStreamResult

Result of closing an audio stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | Closed stream identifier. | None | N/A |
| state | Enum | 0x02 | Close state, such as closing, closed, or failed. | None | N/A |
| ?reason | Enum | 0x03 | Final close reason. | None | Omit if not used. |
| ?alreadyClosed | Boolean | 0x04 | Whether the stream was already terminal before this request. | None | Default: false |

---

## AudioDereverberationCapabilities

Dereverberation supported fields.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supported | Boolean | 0x01 | Whether the device supports dereverberation. | None | N/A |
| ?displayName | String | 0x02 | UI-readable display name. | maxLength=64 | Omit if not used. |
| ?enabled | AudioAlgorithmPropertyCapability | 0x03 | enabled property descriptor. | None | Omit if not used. |
| ?level | AudioAlgorithmPropertyCapability | 0x05 | level property descriptor. | None | Omit if not used. |

---

## AudioDereverberationConfig

Dereverberation configuration object.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?enabled | Boolean | 0x01 | Whether dereverberation is enabled. | None | Omit if not used. |
| ?level | UInt8 | 0x03 | Dereverberation strength. | min=0, max=3 | Omit if not used. |

---

## AudioDirectionOfArrivalCapabilities

Direction of arrival supported fields.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supported | Boolean | 0x01 | Whether the device supports directionOfArrival. | None | N/A |
| ?displayName | String | 0x02 | UI-readable display name. | maxLength=64 | Omit if not used. |
| ?enabled | AudioAlgorithmPropertyCapability | 0x03 | enabled property descriptor. | None | Omit if not used. |
| ?reportingEnabled | AudioAlgorithmPropertyCapability | 0x04 | reportingEnabled property descriptor. | None | Omit if not used. |
| ?reportIntervalMs | AudioAlgorithmPropertyCapability | 0x05 | reportIntervalMs property descriptor. | None | Omit if not used. |
| ?smoothingMs | AudioAlgorithmPropertyCapability | 0x06 | smoothingMs property descriptor. | None | Omit if not used. |

---

## AudioDirectionOfArrivalConfig

Direction of arrival configuration object.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?enabled | Boolean | 0x01 | Whether direction of arrival estimation is enabled. | None | Omit if not used. |
| ?reportingEnabled | Boolean | 0x02 | Whether DOA or beam result reporting is enabled by this configuration. | None | Omit if not used. |
| ?reportIntervalMs | UInt32 | 0x03 | Result report interval in milliseconds. | min=20, max=5000 | Omit if not used. |
| ?smoothingMs | UInt32 | 0x04 | Smoothing window in milliseconds. | min=0, max=5000 | Omit if not used. |

---

## AudioEchoCancellationCapabilities

Echo cancellation supported fields.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supported | Boolean | 0x01 | Whether the device supports echoCancellation. | None | N/A |
| ?displayName | String | 0x02 | UI-readable display name. | maxLength=64 | Omit if not used. |
| ?enabled | AudioAlgorithmPropertyCapability | 0x03 | enabled property descriptor. | None | Omit if not used. |
| ?tailLengthMs | AudioAlgorithmPropertyCapability | 0x05 | tailLengthMs property descriptor. | None | Omit if not used. |
| ?nlpLevel | AudioAlgorithmPropertyCapability | 0x06 | nlpLevel property descriptor. | None | Omit if not used. |

---

## AudioEchoCancellationConfig

Echo cancellation configuration object.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?enabled | Boolean | 0x01 | Whether echo cancellation is enabled. | None | Omit if not used. |
| ?tailLengthMs | UInt32 | 0x03 | Echo tail length in milliseconds; modifying it may require restarting the audio link. | min=64, max=512 | Omit if not used. |
| ?nlpLevel | UInt8 | 0x04 | Non-linear processing strength. | min=0, max=3 | Omit if not used. |

---

## AudioGetStreamCapabilitiesParams

Selector for real-time audio stream capability.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?source | String | 0x01 | Optional audio source identifier; omit to query all visible sources. | maxLength=128 | Omit if not used. |
| ?includeRuntimeState | Boolean | 0x02 | Whether to include current source runtime state. | None | Default: false |

---

## AudioGetStreamSourceStateParams

Selector for audio source runtime state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| source | String | 0x01 | Audio source identifier. | maxLength=128 | N/A |

---

## AudioGetStreamStateParams

Selector for an audio stream state query.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |

---

## AudioHowlingSuppressionCapabilities

Howling suppression supported fields.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supported | Boolean | 0x01 | Whether the device supports howlingSuppression. | None | N/A |
| ?displayName | String | 0x02 | UI-readable display name. | maxLength=64 | Omit if not used. |
| ?enabled | AudioAlgorithmPropertyCapability | 0x03 | enabled property descriptor. | None | Omit if not used. |
| ?level | AudioAlgorithmPropertyCapability | 0x05 | level property descriptor. | None | Omit if not used. |

---

## AudioHowlingSuppressionConfig

Howling suppression configuration object.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?enabled | Boolean | 0x01 | Whether howling suppression is enabled. | None | Omit if not used. |
| ?level | UInt8 | 0x03 | Howling suppression strength. | min=0, max=3 | Omit if not used. |

---

## AudioNoiseSuppressionCapabilities

Noise suppression supported fields.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supported | Boolean | 0x01 | Whether the device supports noiseSuppression. | None | N/A |
| ?displayName | String | 0x02 | UI-readable display name. | maxLength=64 | Omit if not used. |
| ?enabled | AudioAlgorithmPropertyCapability | 0x03 | enabled property descriptor. | None | Omit if not used. |
| ?level | AudioAlgorithmPropertyCapability | 0x05 | level property descriptor. | None | Omit if not used. |

---

## AudioNoiseSuppressionConfig

Noise suppression configuration object.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?enabled | Boolean | 0x01 | Whether noise suppression is enabled. | None | Omit if not used. |
| ?level | UInt8 | 0x03 | Suppression strength. | min=0, max=3 | Omit if not used. |

---

## AudioOpenStreamParams

Request to open a real-time audio stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| source | String | 0x01 | Audio source identifier. | maxLength=128 | N/A |
| peerRole | Enum | 0x02 | Requested peer media role; values include receiver and transmitter. | None | N/A |
| codec | Enum | 0x03 | Requested audio codec, such as aac, opus, or pcm. | None | N/A |
| ?transportFormat | Enum | 0x04 | Optional codec transport format, such as adts, latm, or raw_aac. | None | Omit if not used. |
| ?sampleRate | UInt32 | 0x05 | Requested sample rate in Hz. | None | Omit if not used. |
| ?channels | UInt8 | 0x06 | Requested channel count. | None | Omit if not used. |
| ?sampleFormat | Enum | 0x07 | Requested sample format. | None | Omit if not used. |
| ?chunkDurationMs | UInt32 | 0x08 | Preferred chunk duration in milliseconds. | None | Omit if not used. |
| ?streamProfile | String | 0x09 | STREAM profile name. | maxLength=64 | Default: "media.audio" |
| ?cursorUnit | Enum | 0x0A | STREAM cursor unit, such as timestampUs or sampleIndex. | None | Omit if not used. |
| ?syncGroupId | String | 0x0B | Optional synchronization group identifier. | maxLength=128 | Omit if not used. |
| ?castSessionId | String | 0x0C | Optional cast session identifier. | maxLength=128 | Omit if not used. |
| ?clockDomain | String | 0x0D | Source media clock domain. | maxLength=128 | Omit if not used. |
| ?receiverClockDomain | String | 0x0E | Receiver clock domain. | maxLength=128 | Omit if not used. |
| ?maxDataSize | UInt32 | 0x0F | Preferred maximum STREAM payload data size. | None | Omit if not used. |
| ?audioPtsMode | Enum | 0x10 | Audio PTS mode; NA20/NT10 MVP uses derivedFromSeq. | None | Default: "derivedFromSeq" |
| ?timebase | UInt32 | 0x11 | Audio PTS timebase in ticks per second. | None | Default: 48000 |
| ?samplesPerPacket | UInt32 | 0x12 | Fixed samples consumed by each STREAM packet when packetizationMode is fixedSamplesPerPacket. | None | Default: 1024 |
| ?firstMediaSeqId | UInt32 | 0x13 | First STREAM seqId used as the base for derived audio PTS. | None | Default: 0 |
| ?audioPtsBase | UInt64 | 0x14 | Audio PTS value corresponding to firstMediaSeqId. | None | Default: 0 |
| ?packetizationMode | Enum | 0x15 | Audio packetization mode; NA20/NT10 MVP uses fixedSamplesPerPacket. | None | Default: "fixedSamplesPerPacket" |

---

## AudioOpenStreamResult

Result of opening a real-time audio stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |
| state | Enum | 0x02 | Initial state, normally opening or streaming. | None | N/A |
| source | String | 0x03 | Bound source identifier. | maxLength=128 | N/A |
| peerRole | Enum | 0x04 | Confirmed peer media role. | None | N/A |
| codec | Enum | 0x05 | Negotiated codec. | None | N/A |
| ?transportFormat | Enum | 0x06 | Negotiated transport format. | None | Omit if not used. |
| sampleRate | UInt32 | 0x07 | Negotiated sample rate in Hz. | None | N/A |
| channels | UInt8 | 0x08 | Negotiated channel count. | None | N/A |
| ?sampleFormat | Enum | 0x09 | Negotiated sample format. | None | Omit if not used. |
| streamProfile | String | 0x0A | Normalized stream profile. | maxLength=64 | N/A |
| cursorUnit | Enum | 0x0B | STREAM cursor unit. | None | N/A |
| ?syncGroupId | String | 0x0C | Synchronization group identifier. | maxLength=128 | Omit if not used. |
| ?castSessionId | String | 0x0D | Cast session identifier. | maxLength=128 | Omit if not used. |
| ?clockDomain | String | 0x0E | Source media clock domain. | maxLength=128 | Omit if not used. |
| ?receiverClockDomain | String | 0x0F | Receiver clock domain. | maxLength=128 | Omit if not used. |
| ?maxDataSize | UInt32 | 0x10 | Negotiated maximum STREAM payload data size. | None | Omit if not used. |
| ?audioPtsMode | Enum | 0x11 | Negotiated audio PTS mode. | None | Omit if not used. |
| ?timebase | UInt32 | 0x12 | Negotiated audio PTS timebase in ticks per second. | None | Omit if not used. |
| ?samplesPerPacket | UInt32 | 0x13 | Fixed samples consumed by each STREAM packet when packetizationMode is fixedSamplesPerPacket. | None | Omit if not used. |
| ?firstMediaSeqId | UInt32 | 0x14 | First STREAM seqId used as the base for derived audio PTS. | None | Omit if not used. |
| ?audioPtsBase | UInt64 | 0x15 | Audio PTS value corresponding to firstMediaSeqId. | None | Omit if not used. |
| ?packetizationMode | Enum | 0x16 | Negotiated audio packetization mode. | None | Omit if not used. |

---

## AudioStreamCapabilities

Device-level audio.stream capability summary.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| capability | String | 0x01 | Fixed capability name audio.stream. | maxLength=32 | N/A |
| sources | Array<AudioStreamSource> | 0x02 | Audio stream source objects. | schema=AudioStreamSource, array.itemType=AudioStreamSource, array.itemSchema=AudioStreamSource | N/A |
| streamProfiles | Array<String> | 0x03 | Supported stream profiles, normally media.audio. | array.itemType=string | N/A |
| openModes | Array<String> | 0x04 | Supported open modes, such as producer_open and receiver_pull. | array.itemType=string | N/A |
| peerRoles | Array<String> | 0x05 | Peer roles, such as receiver and transmitter. | array.itemType=string | N/A |
| supportsSourceStateEvent | Boolean | 0x06 | Whether audio.streamSourceStateChanged is supported. | None | N/A |
| supportsSyncGroup | Boolean | 0x07 | Whether audio streams can share a synchronization group with video streams. | None | N/A |
| flowControlManagedByRuntime | Boolean | 0x08 | Whether normal applications can rely on runtime-managed STREAM flow control. | None | N/A |
| ?aacTransportFormats | Array<String> | 0x09 | Optional AAC transport format strings; exact supported set remains product-confirmed. | array.itemType=string | Omit if not used. |
| ?supportedAudioPtsModes | Array<String> | 0x0A | Optional audio PTS modes such as derivedFromSeq and explicit. | array.itemType=string | Omit if not used. |
| ?supportedPacketizationModes | Array<String> | 0x0B | Optional audio packetization modes such as fixedSamplesPerPacket. | array.itemType=string | Omit if not used. |
| ?supportsSourceCaptureTimestampCursor | Boolean | 0x0C | Whether STREAM cursorUnit sourceCaptureTimestampUs is supported. | None | Omit if not used. |

---

## AudioStreamSourceState

Runtime state of an audio stream source.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| source | String | 0x01 | Audio source identifier. | maxLength=128 | N/A |
| ?mediaKind | Enum | 0x02 | Media kind, normally audio. | None | Omit if not used. |
| state | Enum | 0x03 | Source state, such as unavailable, available, receiving, stopped, or failed. | None | N/A |
| ?available | Boolean | 0x04 | Whether the source is available for openStream. | None | Omit if not used. |
| ?activeStreamId | UInt32 | 0x05 | Active downstream stream id, if any. | None | Omit if not used. |
| ?lastOpenRejectedReason | Enum | 0x06 | Last open rejection reason. | None | Omit if not used. |

---

## AudioStreamSourceStateChangedEvent

Event payload for audio stream source state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| source | String | 0x01 | Audio source identifier. | maxLength=128 | N/A |
| ?mediaKind | Enum | 0x02 | Media kind, normally audio. | None | Omit if not used. |
| state | Enum | 0x03 | New source state. | None | N/A |
| ?reason | Enum | 0x04 | Source state change reason. | None | Omit if not used. |
| ?activeStreamId | UInt32 | 0x05 | Active downstream stream id, if any. | None | Omit if not used. |

---

## AudioStreamState

Runtime state of one audio stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |
| state | Enum | 0x02 | Stream state, such as opening, streaming, closing, closed, or failed. | None | N/A |
| source | String | 0x03 | Bound audio source. | maxLength=128 | N/A |
| ?peerRole | Enum | 0x04 | Peer media role. | None | Omit if not used. |
| ?codec | Enum | 0x05 | Negotiated audio codec. | None | Omit if not used. |
| ?streamProfile | String | 0x06 | Stream profile. | maxLength=64 | Omit if not used. |
| ?syncGroupId | String | 0x07 | Synchronization group identifier. | maxLength=128 | Omit if not used. |
| ?cursorUnit | Enum | 0x08 | STREAM cursor unit. | None | Omit if not used. |
| ?lastCursor | UInt64 | 0x09 | Last known cursor value. | None | Omit if not used. |
| ?failureReason | Enum | 0x0A | Failure reason when state is failed. | None | Omit if not used. |

---

## AudioStreamStateChangedEvent

Event payload for audio stream state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |
| state | Enum | 0x02 | New stream state. | None | N/A |
| source | String | 0x03 | Bound audio source. | maxLength=128 | N/A |
| ?reason | Enum | 0x04 | State change reason. | None | Omit if not used. |
| ?stats | AudioStreamStats | 0x05 | Optional bounded stream statistics. | None | Omit if not used. |

---

## AudioStreamStats

Bounded runtime statistics for an audio stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?packets | UInt64 | 0x01 | Number of STREAM packets observed. | None | Omit if not used. |
| ?bytes | UInt64 | 0x02 | Number of STREAM payload bytes observed. | None | Omit if not used. |
| ?droppedPackets | UInt64 | 0x03 | Number of dropped packets. | None | Omit if not used. |
| ?jitterMs | UInt32 | 0x04 | Estimated jitter in milliseconds. | None | Omit if not used. |

---

## AudioStreamStatsReportedEvent

Event payload for audio stream statistics reports.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |
| stats | AudioStreamStats | 0x02 | Bounded stream statistics. | None | N/A |

---

## AudioVoiceActivityDetectionCapabilities

Voice activity detection supported fields.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supported | Boolean | 0x01 | Whether the device supports voiceActivityDetection. | None | N/A |
| ?displayName | String | 0x02 | UI-readable display name. | maxLength=64 | Omit if not used. |
| ?enabled | AudioAlgorithmPropertyCapability | 0x03 | enabled property descriptor. | None | Omit if not used. |
| ?sensitivity | AudioAlgorithmPropertyCapability | 0x04 | sensitivity property descriptor. | None | Omit if not used. |
| ?hangoverMs | AudioAlgorithmPropertyCapability | 0x05 | hangoverMs property descriptor. | None | Omit if not used. |

---

## AudioVoiceActivityDetectionConfig

Voice activity detection configuration object.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?enabled | Boolean | 0x01 | Whether voice activity detection is enabled. | None | Omit if not used. |
| ?sensitivity | UInt8 | 0x02 | Detection sensitivity. | min=0, max=3 | Omit if not used. |
| ?hangoverMs | UInt32 | 0x03 | Speech-end hangover time in milliseconds. | min=0, max=2000 | Omit if not used. |

---

## BeginUpdateParams

Request to begin a firmware update session.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| manifest | FirmwareUpdateManifest | 0x01 | Minimal firmware update manifest. | None | N/A |

---

## BeginUpdateResult

Result of creating a firmware update session.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| updateSessionId | String | 0x01 | Firmware update session identifier. | maxLength=128 | N/A |
| state | Enum | 0x02 | State after begin, normally receiving. | None | N/A |
| streams | Array<FirmwareUpdateStreamBinding> | 0x03 | Firmware update stream bindings. | schema=FirmwareUpdateStreamBinding, array.itemType=FirmwareUpdateStreamBinding, array.itemSchema=FirmwareUpdateStreamBinding | N/A |
| ?chunkSize | UInt32 | 0x04 | Recommended STREAM chunk size. | None | Omit if not used. |

---

## CastAirPlayNameState

AirPlay display name and backend publish state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| displayName | String | 0x01 | Current AirPlay display name. | maxLength=128 | N/A |
| ?previousDisplayName | String | 0x02 | Previous display name when a change was applied. | maxLength=128 | Omit if not used. |
| ?source | Enum | 0x03 | Source of the current display name. | enum=configured/default/backend/unknown | Omit if not used. |
| ?apply | Enum | 0x04 | Apply timing used for the latest update. | enum=immediate/onNextBackendStart | Omit if not used. |
| publishState | Enum | 0x05 | Bonjour or backend service publish state. | enum=published/republishing/pending/failed/unpublished | N/A |
| ?backendType | Enum | 0x06 | Backend that owns the published name. | enum=uxplay/unknown | Omit if not used. |
| ?updatedAt | String | 0x07 | Timestamp for this name state. | maxLength=64 | Omit if not used. |

---

## CastAudioCapability

Capability descriptor for cast.audio.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?defaultEnabled | Boolean | 0x01 | Default local playback enablement for received cast audio. | None | Default: false |
| ?supportsMute | Boolean | 0x02 | Whether local mute state can be controlled separately. | None | Default: true |
| ?reportsEffectivePlayback | Boolean | 0x03 | Whether the receiver reports effective local playback state. | None | Default: true |
| ?supportsAudioDelay | Boolean | 0x04 | Whether receiver-local audio playback delay compensation can be configured. | None | Default: true |
| ?defaultAudioDelayMs | UInt32 | 0x05 | Default receiver-local audio playback delay in milliseconds. | min=0, max=1000 | Default: 250 |
| ?maxAudioDelayMs | UInt32 | 0x06 | Maximum supported receiver-local audio playback delay in milliseconds. | min=0 | Default: 1000 |

---

## CastAudioChangedEvent

Event payload for local cast audio state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| changedFields | Array<String> | 0x01 | Field names changed by this event. | array.itemType=string | N/A |
| state | CastAudioState | 0x02 | State after the change. | None | N/A |
| ?reason | Enum | 0x03 | Change reason. | enum=externalSet/localUi/sessionStarted/sessionStopped/unknown | Omit if not used. |
| ?updatedAt | String | 0x04 | Timestamp for this event. | maxLength=64 | Omit if not used. |

---

## CastAudioState

Local cast audio playback and mute state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| enabled | Boolean | 0x01 | Whether local receiver playback is enabled. | None | Default: false |
| muted | Boolean | 0x02 | Whether local receiver output is muted. | None | Default: false |
| effectivePlayback | Boolean | 0x03 | Whether audio is effectively playing locally after state and session conditions are applied. | None | N/A |
| ?scope | Enum | 0x04 | State target hint represented by this snapshot. | enum=currentSession/default | Omit if not used. |
| ?sessionId | String | 0x05 | Receiver-local session id for session-specific state. | maxLength=128 | Omit if not used. |
| ?source | Enum | 0x06 | Source of the latest state value. | enum=defaultConfig/externalSet/localUi/sessionStarted/sessionStopped/unknown | Omit if not used. |
| ?reason | Enum | 0x07 | Latest audio state transition reason. | enum=receiverDefault/externalSet/localUi/sessionStarted/sessionStopped/unknown | Omit if not used. |
| ?changedFields | Array<String> | 0x08 | Field names changed by the latest operation or event. | array.itemType=string | Omit if not used. |
| ?updatedAt | String | 0x09 | Timestamp for this audio state. | maxLength=64 | Omit if not used. |
| ?audioDelayMs | UInt32 | 0x0A | Configured receiver-local audio playback delay in milliseconds; zero disables compensation. | min=0, max=1000 | Default: 250 |

---

## CastBackendCapability

Capability descriptor for cast.backend.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| backendTypes | Array<String> | 0x01 | Backend implementations controlled by the receiver. | array.itemType=string | N/A |
| ?supportsRestart | Boolean | 0x02 | Whether cast.restartBackend is supported. | None | Default: true |
| ?reportsProcess | Boolean | 0x03 | Whether backend process metadata such as pid may be reported. | None | Default: true |
| ?supportsLastError | Boolean | 0x04 | Whether last backend error summaries are available. | None | Default: true |

---

## CastBackendChangedEvent

Event payload for cast backend state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| changedFields | Array<String> | 0x01 | Field names changed by this event. | array.itemType=string | N/A |
| state | CastBackendStatus | 0x02 | Backend status after the change. | None | N/A |
| ?reason | Enum | 0x03 | Change reason. | enum=manualRecovery/configChanged/backendUnhealthy/backendExited/unknown | Omit if not used. |
| ?restartId | String | 0x04 | Restart operation id when this event is restart-related. | maxLength=128 | Omit if not used. |
| ?activeSessionEnded | Boolean | 0x05 | Whether this backend change ended an active session. | None | Omit if not used. |
| ?endedSessionId | String | 0x06 | Session ended by this backend change. | maxLength=128 | Omit if not used. |
| ?updatedAt | String | 0x07 | Timestamp for this event. | maxLength=64 | Omit if not used. |

---

## CastBackendStatus

Cast backend state, process summary, discoverability, and last error.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| backendType | Enum | 0x01 | Backend implementation type. | enum=uxplay/unknown | N/A |
| state | Enum | 0x02 | Backend runtime state. | enum=starting/ready/restarting/exited/failed/disabled | N/A |
| discoverable | Boolean | 0x03 | Whether the cast service is discoverable by sources. | None | N/A |
| ?pid | UInt32 | 0x04 | Backend process id when available. | None | Omit if not used. |
| ?version | String | 0x05 | Backend version or build identifier. | maxLength=128 | Omit if not used. |
| ?activeSessionId | String | 0x06 | Active cast session id currently owned by the backend. | maxLength=128 | Omit if not used. |
| restartInProgress | Boolean | 0x07 | Whether a backend restart is currently in progress. | None | Default: false |
| ?lastError | CastLastError | 0x08 | Last backend error summary when requested and available. | None | Omit if not used. |
| ?updatedAt | String | 0x09 | Timestamp for this backend status. | maxLength=64 | Omit if not used. |

---

## CastFlowControlCapability

Capability descriptor for cast.flowControl.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?supportsRenderFps | Boolean | 0x01 | Whether receiver-local target render fps can be controlled. | None | Default: true |
| ?supportsQueuePolicy | Boolean | 0x02 | Whether queue and late-frame policy can be controlled. | None | Default: true |
| ?supportsOverlay | Boolean | 0x03 | Whether diagnostics overlay can be controlled. | None | Default: true |
| ?supportsStats | Boolean | 0x04 | Whether low-frequency flow diagnostics are reported. | None | Default: true |
| ?exposesExternalKeyframeRequest | Boolean | 0x05 | Whether a public keyframe request method is exposed; current draft keeps this false. | None | Default: false |
| ?supportsVideoStreamParams | Boolean | 0x06 | Whether cast.setVideoStreamParams can update source video frame rate or bitrate. | None | Default: false |
| ?supportsActiveVideoReconfigure | Boolean | 0x07 | Whether active video stream parameter changes may reconfigure or replace the current stream. | None | Default: false |
| ?supportedVideoStreamProfiles | Array<String> | 0x08 | Video STREAM profiles supported by cast.setVideoStreamParams; each profile may declare source-specific support and frame-rate/bitrate ranges. | array.itemType=string | Omit if not used. |
| ?supportedVideoEncoders | Array<String> | 0x09 | Encoder or encoder profile identifiers exposed for source video reconfiguration. | array.itemType=string | Omit if not used. |
| ?supportsSourceSpecificVideoParams | Boolean | 0x0A | Whether video parameter support and ranges may vary by source and are described by the selected video profile. | None | Default: true |

---

## CastFlowControlChangedEvent

Event payload for cast flow control changes or low-frequency diagnostic samples.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| changedFields | Array<String> | 0x01 | Field names changed or sampled by this event. | array.itemType=string | N/A |
| state | CastFlowControlState | 0x02 | Flow control state after the change or sample. | None | N/A |
| ?reason | Enum | 0x03 | Change or sampling reason. | enum=manualFlowControl/videoStreamParams/videoStreamReconfigure/diagnosticsSample/sessionStarted/sessionStopped/unknown | Omit if not used. |
| ?sampledAt | String | 0x04 | Timestamp for this event. | maxLength=64 | Omit if not used. |
| ?sourceVideo | CastVideoStreamParamsState | 0x05 | Effective source video stream parameter state associated with this event. | None | Omit if not used. |
| ?reconfigureId | String | 0x06 | Video stream reconfiguration operation id associated with this event. | maxLength=128 | Omit if not used. |

---

## CastFlowControlState

Receiver-local cast flow control policy and low-frequency statistics.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| targetRenderFps | Number | 0x01 | Configured target render fps; zero means uncapped. | min=0 | N/A |
| ?inputFps | Number | 0x02 | Estimated incoming media frame rate. | min=0 | Omit if not used. |
| ?renderFps | Number | 0x03 | Estimated local render frame rate. | min=0 | Omit if not used. |
| dropMode | Enum | 0x04 | Local frame drop policy. | enum=drop-late/drop-oldest/render-latest | N/A |
| videoQueueFrames | UInt32 | 0x05 | Maximum queued video frames. | min=1 | N/A |
| ?videoQueueDepth | UInt32 | 0x06 | Current queued video frame depth. | None | Omit if not used. |
| ?audioQueueDepth | UInt32 | 0x07 | Current queued audio frame depth when known. | None | Omit if not used. |
| lateFrameThresholdMs | UInt32 | 0x08 | Late-frame threshold in milliseconds. | None | N/A |
| overlayEnabled | Boolean | 0x09 | Whether diagnostics overlay is enabled. | None | N/A |
| ?droppedFrames | UInt64 | 0x0A | Low-frequency dropped-frame counter. | None | Omit if not used. |
| ?lateFrames | UInt64 | 0x0B | Low-frequency late-frame counter. | None | Omit if not used. |
| ?keyframeRequestCount | UInt32 | 0x0C | Internal keyframe requests triggered by receiver policy. | None | Omit if not used. |
| ?keyFrameOnDropBurst | Boolean | 0x0D | Whether the receiver may internally request a keyframe after a drop burst. | None | Omit if not used. |
| ?changedFields | Array<String> | 0x0E | Field names changed by the latest operation or event. | array.itemType=string | Omit if not used. |
| ?sampledAt | String | 0x0F | Timestamp for this flow sample. | maxLength=64 | Omit if not used. |
| ?sourceVideo | CastVideoStreamParamsState | 0x10 | Effective source video stream parameters and reconfiguration state. | None | Omit if not used. |

---

## CastGetAudioParams

Selector for local cast audio state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?includeEffective | Boolean | 0x01 | Whether to include effective local playback state. | None | Default: true |
| ?sessionId | String | 0x02 | Optional receiver-local session id. | maxLength=128 | Omit if not used. |

---

## CastGetBackendStatusParams

Selector for cast backend status.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?includeLastError | Boolean | 0x01 | Whether to include the last backend error summary. | None | Default: false |

---

## CastGetFlowControlStateParams

Selector for cast receiver flow control state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?includeStats | Boolean | 0x01 | Whether to include low-frequency diagnostic counters. | None | Default: true |
| ?includePolicy | Boolean | 0x02 | Whether to include current flow policy fields. | None | Default: true |
| ?sessionId | String | 0x03 | Optional receiver-local session id. | maxLength=128 | Omit if not used. |

---

## CastGetPinCodeConfigParams

Selector for cast PIN protection configuration.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?includeSecret | Boolean | 0x01 | Whether authorized clients request plaintext PIN material. | None | Default: false |

---

## CastGetSessionParams

Selector for cast receiver and active session summary.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?include | Array<String> | 0x01 | Optional summary sections, such as source, media, or airPlayName. | array.itemType=string | Omit if not used. |
| ?sessionId | String | 0x02 | Optional receiver-local session id to query. | maxLength=128 | Omit if not used. |

---

## CastGetStatusParams

Selector for current cast receiver snapshot.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?include | Array<String> | 0x01 | Optional status sections to include. | array.itemType=string | Omit if not used. |
| ?includeSensitive | Boolean | 0x02 | Whether authorized callers request sensitive summary fields. | None | Default: false |

---

## CastLastError

Redactable backend or receiver error summary.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?code | String | 0x01 | Backend-local or AXTP-visible error code. | maxLength=64 | Omit if not used. |
| ?message | String | 0x02 | Human-readable error summary suitable for authorized clients. | maxLength=512 | Omit if not used. |
| ?occurredAt | String | 0x03 | Timestamp when the error was observed. | maxLength=64 | Omit if not used. |
| ?redacted | Boolean | 0x04 | Whether sensitive details were removed from this summary. | None | Default: false |

---

## CastMediaSummary

Low-frequency media summary for a cast session.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?firstFrame | Boolean | 0x01 | Whether the first visible frame has rendered. | None | Omit if not used. |
| ?width | UInt32 | 0x02 | Current media width in pixels. | None | Omit if not used. |
| ?height | UInt32 | 0x03 | Current media height in pixels. | None | Omit if not used. |
| ?orientation | Enum | 0x04 | Current media orientation summary. | enum=landscape/portrait/unknown | Omit if not used. |
| ?inputFps | Number | 0x05 | Estimated incoming media frame rate. | min=0 | Omit if not used. |
| ?renderFps | Number | 0x06 | Estimated local render frame rate. | min=0 | Omit if not used. |
| ?audioActive | Boolean | 0x07 | Whether local receiver audio output is active. | None | Omit if not used. |

---

## CastPinCodeAuthFailedEvent

Event payload for failed PIN authentication.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?sessionId | String | 0x01 | Receiver-local session id. | maxLength=128 | Omit if not used. |
| ?source | CastSourceSummary | 0x02 | Source that failed authentication. | None | Omit if not used. |
| ?authFailureReason | Enum | 0x03 | Authentication failure reason. | enum=wrongPin/timeout/cancelled/tooManyAttempts/unknown | Omit if not used. |
| ?attemptCount | UInt16 | 0x04 | Attempt count visible to the receiver. | None | Omit if not used. |
| ?failedAt | String | 0x05 | Timestamp when authentication failed. | maxLength=64 | Omit if not used. |

---

## CastPinCodeCapability

Capability descriptor for cast.pinCode.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?defaultEnabled | Boolean | 0x01 | Whether PIN protection is enabled by default. | None | Default: true |
| ?supportsPlaintextResponse | Boolean | 0x02 | Whether authorized responses or events may carry plaintext PIN values. | None | Default: true |
| ?supportedPinDisplays | Array<String> | 0x03 | PIN display policies supported by the receiver. | array.itemType=string | Omit if not used. |
| ?supportsGeneratedPin | Boolean | 0x04 | Whether the receiver can generate a default PIN. | None | Default: true |
| ?redactionRequired | Boolean | 0x05 | Whether logs, diagnostics, and error summaries must redact PIN values. | None | Default: true |

---

## CastPinCodeChangedEvent

Event payload for PIN configuration or PIN state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| changedFields | Array<String> | 0x01 | Field names changed by this event. | array.itemType=string | N/A |
| config | CastPinCodeConfig | 0x02 | PIN state after the change. | None | N/A |
| ?reason | Enum | 0x03 | Change reason. | enum=externalSet/localUi/generated/backendChanged/unknown | Omit if not used. |
| ?updatedAt | String | 0x04 | Timestamp for this event. | maxLength=64 | Omit if not used. |

---

## CastPinCodeConfig

Cast PIN protection state and optional plaintext PIN value.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| enabled | Boolean | 0x01 | Whether PIN protection is enabled. | None | Default: true |
| hasPinCode | Boolean | 0x02 | Whether a current PIN exists. | None | N/A |
| ?pinCode | String | 0x03 | Plaintext PIN value when visible to the caller. | None | Omit if not used. |
| ?pinDisplay | Enum | 0x04 | Where the current PIN may be displayed. | enum=hidden/authorizedClients/localUi/both | Omit if not used. |
| ?generatedBy | Enum | 0x05 | Component or actor that generated the current PIN. | enum=nearcast/uxplay/external/unknown | Omit if not used. |
| ?visibility | Enum | 0x06 | Visibility policy for the PIN value. | enum=hidden/authorizedOnly/localUi/both | Omit if not used. |
| ?expiresAt | String | 0x07 | Expiration timestamp when applicable. | maxLength=64 | Omit if not used. |
| ?redactionRequired | Boolean | 0x08 | Whether logs, diagnostics, and error summaries must redact the PIN. | None | Default: true |
| ?changedFields | Array<String> | 0x09 | Field names changed by the latest operation or event. | array.itemType=string | Omit if not used. |
| ?updatedAt | String | 0x0A | Timestamp for this PIN state. | maxLength=64 | Omit if not used. |
| ?redacted | Boolean | 0x0B | Whether sensitive fields were withheld in this snapshot. | None | Omit if not used. |

---

## CastPinCodeRequiredEvent

Event payload for a session waiting for PIN authentication.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?sessionId | String | 0x01 | Receiver-local session id. | maxLength=128 | Omit if not used. |
| ?source | CastSourceSummary | 0x02 | Source waiting for authentication. | None | Omit if not used. |
| ?pinCode | String | 0x03 | Plaintext PIN value when visible to the event subscriber. | None | Omit if not used. |
| ?visibility | Enum | 0x04 | Visibility policy for this event payload. | enum=hidden/authorizedOnly/localUi/both | Omit if not used. |
| ?redactionRequired | Boolean | 0x05 | Whether logs and diagnostics must redact this PIN value. | None | Default: true |
| ?requestedAt | String | 0x06 | Timestamp when PIN input was requested. | maxLength=64 | Omit if not used. |

---

## CastPinCodeStatusSummary

Snapshot PIN summary for status views.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| enabled | Boolean | 0x01 | Whether PIN protection is enabled. | None | N/A |
| hasPinCode | Boolean | 0x02 | Whether a current PIN exists. | None | N/A |
| ?pinDisplay | Enum | 0x03 | Where the current PIN may be displayed. | enum=hidden/authorizedClients/localUi/both | Omit if not used. |
| ?pinCode | String | 0x04 | Plaintext PIN value when visible to the caller. | None | Omit if not used. |
| ?redacted | Boolean | 0x05 | Whether sensitive fields were withheld. | None | Omit if not used. |
| ?visibility | Enum | 0x06 | Visibility policy applied to this summary. | enum=hidden/authorizedOnly/localUi/both | Omit if not used. |

---

## CastReceiverSummary

Snapshot receiver role and protocol-neutral phase summary.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| role | Enum | 0x01 | Cast endpoint role. | enum=receiver | N/A |
| protocols | Array<String> | 0x02 | Supported or active cast protocol paths. | array.itemType=string | N/A |
| state | Enum | 0x03 | Receiver service availability state. | enum=disabled/starting/ready/busy/failed | N/A |
| receiverPhase | Enum | 0x04 | Protocol-neutral receiver phase. | enum=idle/incoming/authenticating/streamStarting/streaming/rendering/interrupted/stopping/ended/failed | N/A |

---

## CastRect

Cast window rectangle in screen coordinates.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| x | Int32 | 0x01 | Rectangle left coordinate. | None | N/A |
| y | Int32 | 0x02 | Rectangle top coordinate. | None | N/A |
| width | UInt32 | 0x03 | Rectangle width in pixels. | None | N/A |
| height | UInt32 | 0x04 | Rectangle height in pixels. | None | N/A |

---

## CastRestartBackendParams

Request to restart the cast backend.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?reason | Enum | 0x01 | Caller-visible restart reason. | enum=manualRecovery/configChanged/backendUnhealthy/unknown | Omit if not used. |
| ?force | Boolean | 0x02 | Whether the backend adapter may force cleanup before restart. | None | Default: false |

---

## CastRestartBackendResult

Result of requesting a cast backend restart.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| accepted | Boolean | 0x01 | Whether the receiver accepted the restart request. | None | N/A |
| backendType | Enum | 0x02 | Backend implementation affected by the restart. | enum=uxplay/unknown | N/A |
| state | Enum | 0x03 | Backend state after accepting the restart request. | enum=starting/ready/restarting/exited/failed/disabled | N/A |
| ?restartId | String | 0x04 | Receiver-local restart operation id. | maxLength=128 | Omit if not used. |
| activeSessionEnded | Boolean | 0x05 | Whether an active cast session was ended by the restart. | None | N/A |
| ?endedSessionId | String | 0x06 | Session ended by the restart. | maxLength=128 | Omit if not used. |
| ?sessionStopReason | Enum | 0x07 | Session stop reason reported for the ended session. | enum=backendRestart/backendExited/error/unknown | Omit if not used. |
| ?estimatedReadyInMs | UInt32 | 0x08 | Estimated backend recovery time in milliseconds. | None | Omit if not used. |
| ?updatedAt | String | 0x09 | Timestamp for this restart result. | maxLength=64 | Omit if not used. |

---

## CastSessionCapability

Capability descriptor for cast.session.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| protocols | Array<String> | 0x01 | Cast protocol paths represented by the receiver. | array.itemType=string | N/A |
| receiverPhases | Array<String> | 0x02 | Supported protocol-neutral receiver phases. | array.itemType=string | N/A |
| ?supportsAirPlayName | Boolean | 0x03 | Whether AirPlay display name query and update are supported. | None | Default: true |
| ?supportsStopSession | Boolean | 0x04 | Whether active cast sessions can be stopped through cast.stopSession. | None | Default: true |
| ?backendTypes | Array<String> | 0x05 | Backend implementations represented by this receiver. | array.itemType=string | Omit if not used. |

---

## CastSessionFailedEvent

Event payload for cast session failure.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?sessionId | String | 0x01 | Receiver-local failed session id when assigned. | maxLength=128 | Omit if not used. |
| receiverPhase | Enum | 0x02 | Receiver phase after failure. | enum=failed | N/A |
| ?sessionState | Enum | 0x03 | Backend-specific failed state. | enum=failed | Omit if not used. |
| ?protocol | Enum | 0x04 | Protocol path represented by the failed session. | enum=airplay/hid/unknown | Omit if not used. |
| ?source | CastSourceSummary | 0x05 | Source summary when available. | None | Omit if not used. |
| ?reason | Enum | 0x06 | Failure reason. | enum=connectionFailed/authFailed/negotiationFailed/backendFailed/mediaFailed/unknown | Omit if not used. |
| ?error | CastLastError | 0x07 | Redactable error summary. | None | Omit if not used. |
| ?failedAt | String | 0x08 | Timestamp when the failure was observed. | maxLength=64 | Omit if not used. |

---

## CastSessionIncomingEvent

Event payload for a new incoming cast session.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?sessionId | String | 0x01 | Receiver-local session id assigned to the incoming session. | maxLength=128 | Omit if not used. |
| receiverPhase | Enum | 0x02 | Receiver phase entered for the incoming session. | enum=incoming/authenticating | N/A |
| ?protocol | Enum | 0x03 | Protocol path used by the incoming session. | enum=airplay/hid/unknown | Omit if not used. |
| ?source | CastSourceSummary | 0x04 | Source summary when available. | None | Omit if not used. |
| ?authRequired | Boolean | 0x05 | Whether this incoming session requires authentication. | None | Omit if not used. |
| ?incomingAt | String | 0x06 | Timestamp when the incoming session was observed. | maxLength=64 | Omit if not used. |

---

## CastSessionStartedEvent

Event payload for a user-visible cast session start.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| sessionId | String | 0x01 | Receiver-local started session id. | maxLength=128 | N/A |
| receiverPhase | Enum | 0x02 | Receiver phase after first visible frame or local playback starts. | enum=rendering | N/A |
| ?sessionState | Enum | 0x03 | Backend-specific state after session start. | enum=casting | Omit if not used. |
| ?protocol | Enum | 0x04 | Protocol path represented by the started session. | enum=airplay/hid/unknown | Omit if not used. |
| ?source | CastSourceSummary | 0x05 | Source summary when available. | None | Omit if not used. |
| ?media | CastMediaSummary | 0x06 | Media summary at session start. | None | Omit if not used. |
| ?startedAt | String | 0x07 | Timestamp when the session became user-visible. | maxLength=64 | Omit if not used. |

---

## CastSessionState

Current receiver phase and active session state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| receiverState | Enum | 0x01 | Receiver service availability state. | enum=disabled/starting/ready/busy/failed | N/A |
| ?sessionId | String | 0x02 | Receiver-local active session id. | maxLength=128 | Omit if not used. |
| receiverPhase | Enum | 0x03 | Protocol-neutral receiver phase used by UI and reconnection calibration. | enum=idle/incoming/authenticating/streamStarting/streaming/rendering/interrupted/stopping/ended/failed | N/A |
| ?sessionState | Enum | 0x04 | AirPlay or backend-specific session state detail. | enum=idle/incoming/waitingForPassword/authenticated/preparing/casting/interrupted/stopping/ended/failed | Omit if not used. |
| ?protocol | Enum | 0x05 | Cast protocol path currently represented by this state. | enum=airplay/hid/unknown | Omit if not used. |
| ?airPlayName | String | 0x06 | Current published AirPlay receiver display name. | maxLength=128 | Omit if not used. |
| ?source | CastSourceSummary | 0x07 | Source device summary. | None | Omit if not used. |
| ?media | CastMediaSummary | 0x08 | Low-frequency media summary. | None | Omit if not used. |
| ?backendState | Enum | 0x09 | Current backend state summary. | enum=starting/ready/restarting/exited/failed/disabled | Omit if not used. |
| ?reason | Enum | 0x0A | Last state transition reason. | enum=sessionStarted/mediaFlowStarted/externalRequest/sourceClosed/backendRestart/backendExited/authFailed/error/unknown | Omit if not used. |
| ?authRequired | Boolean | 0x0B | Whether this session path currently requires authentication. | None | Omit if not used. |
| ?updatedAt | String | 0x0C | Timestamp for this state snapshot. | maxLength=64 | Omit if not used. |

---

## CastSessionStateChangedEvent

Event payload for receiver phase or backend session state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?sessionId | String | 0x01 | Receiver-local session id. | maxLength=128 | Omit if not used. |
| ?previousReceiverPhase | Enum | 0x02 | Previous receiver phase. | enum=idle/incoming/authenticating/streamStarting/streaming/rendering/interrupted/stopping/ended/failed | Omit if not used. |
| receiverPhase | Enum | 0x03 | New receiver phase. | enum=idle/incoming/authenticating/streamStarting/streaming/rendering/interrupted/stopping/ended/failed | N/A |
| ?previousState | Enum | 0x04 | Previous backend-specific session state. | enum=idle/incoming/waitingForPassword/authenticated/preparing/casting/interrupted/stopping/ended/failed | Omit if not used. |
| ?sessionState | Enum | 0x05 | New backend-specific session state. | enum=idle/incoming/waitingForPassword/authenticated/preparing/casting/interrupted/stopping/ended/failed | Omit if not used. |
| ?protocol | Enum | 0x06 | Protocol path represented by this event. | enum=airplay/hid/unknown | Omit if not used. |
| ?authRequired | Boolean | 0x07 | Whether the current session phase requires authentication. | None | Omit if not used. |
| ?media | CastMediaSummary | 0x08 | Low-frequency media summary at the time of transition. | None | Omit if not used. |
| ?reason | Enum | 0x09 | Transition reason. | enum=sessionStarted/mediaFlowStarted/externalRequest/sourceClosed/backendRestart/backendExited/authFailed/error/unknown | Omit if not used. |
| ?updatedAt | String | 0x0A | Timestamp for the transition. | maxLength=64 | Omit if not used. |

---

## CastSessionStatusSummary

Snapshot active session summary for status views.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?sessionId | String | 0x01 | Receiver-local session id. | maxLength=128 | Omit if not used. |
| ?receiverPhase | Enum | 0x02 | Protocol-neutral receiver phase. | enum=idle/incoming/authenticating/streamStarting/streaming/rendering/interrupted/stopping/ended/failed | Omit if not used. |
| ?sessionState | Enum | 0x03 | Backend-specific session state. | enum=idle/incoming/waitingForPassword/authenticated/preparing/casting/interrupted/stopping/ended/failed | Omit if not used. |
| ?protocol | Enum | 0x04 | Protocol path represented by the active session. | enum=airplay/hid/unknown | Omit if not used. |
| ?sourceName | String | 0x05 | User-visible source name. | maxLength=128 | Omit if not used. |

---

## CastSessionStoppedEvent

Event payload for a stopped cast session.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?sessionId | String | 0x01 | Receiver-local stopped session id. | maxLength=128 | Omit if not used. |
| ?previousReceiverPhase | Enum | 0x02 | Receiver phase before stop completion. | enum=idle/incoming/authenticating/streamStarting/streaming/rendering/interrupted/stopping/ended/failed | Omit if not used. |
| receiverPhase | Enum | 0x03 | Receiver phase after stop completion. | enum=ended/failed/idle | N/A |
| ?previousState | Enum | 0x04 | Backend-specific state before stop completion. | enum=idle/incoming/waitingForPassword/authenticated/preparing/casting/interrupted/stopping/ended/failed | Omit if not used. |
| ?sessionState | Enum | 0x05 | Backend-specific state after stop completion. | enum=ended/failed/idle | Omit if not used. |
| ?reason | Enum | 0x06 | Stop reason. | enum=externalRequest/sourceClosed/backendRestart/backendExited/shutdown/error/unknown | Omit if not used. |
| ?backendType | Enum | 0x07 | Backend type associated with the stopped session. | enum=uxplay/unknown | Omit if not used. |
| ?stoppedAt | String | 0x08 | Timestamp when the stop was observed. | maxLength=64 | Omit if not used. |

---

## CastSetAirPlayNameParams

Request to set the AirPlay receiver display name.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| displayName | String | 0x01 | Target AirPlay display name. | maxLength=128 | N/A |
| ?apply | Enum | 0x02 | Requested backend apply timing. | enum=immediate/onNextBackendStart | Omit if not used. |

---

## CastSetAudioDelayParams

Request to set receiver-local audio playback delay compensation.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| audioDelayMs | UInt32 | 0x01 | Target local audio playback delay in milliseconds; zero disables delay compensation. | min=0, max=1000 | N/A |
| ?sessionId | String | 0x02 | Optional receiver-local session id. | maxLength=128 | Omit if not used. |
| ?scope | Enum | 0x03 | State target hint; default persists the receiver delay for future sessions. | enum=currentSession/default | Omit if not used. |

---

## CastSetAudioParams

Request to enable or disable local cast audio playback.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| enabled | Boolean | 0x01 | Whether local receiver playback is enabled. | None | N/A |
| ?sessionId | String | 0x02 | Optional receiver-local session id. | maxLength=128 | Omit if not used. |
| ?scope | Enum | 0x03 | State target hint; this is not an authorization scope. | enum=currentSession/default | Omit if not used. |

---

## CastSetFlowPolicyParams

Request to update receiver-local queue, late-frame, drop, and overlay policy.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?videoQueueFrames | UInt32 | 0x01 | Maximum queued video frames. | min=1 | Omit if not used. |
| ?lateFrameThresholdMs | UInt32 | 0x02 | Late-frame threshold in milliseconds. | None | Omit if not used. |
| ?dropMode | Enum | 0x03 | Local frame drop policy. | enum=drop-late/drop-oldest/render-latest | Omit if not used. |
| ?overlayEnabled | Boolean | 0x04 | Whether receiver diagnostics overlay is enabled. | None | Omit if not used. |
| ?sessionId | String | 0x05 | Optional receiver-local session id. | maxLength=128 | Omit if not used. |
| ?scope | Enum | 0x06 | State target hint; this is not an authorization scope. | enum=currentSession/default | Omit if not used. |

---

## CastSetMutedParams

Request to mute or unmute local cast audio output.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| muted | Boolean | 0x01 | Whether local receiver output is muted. | None | N/A |
| ?sessionId | String | 0x02 | Optional receiver-local session id. | maxLength=128 | Omit if not used. |
| ?scope | Enum | 0x03 | State target hint; this is not an authorization scope. | enum=currentSession/default | Omit if not used. |

---

## CastSetPinCodeConfigParams

Request to update cast PIN protection configuration.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?enabled | Boolean | 0x01 | Whether PIN protection is enabled. | None | Omit if not used. |
| ?pinDisplay | Enum | 0x02 | Where the current PIN may be displayed. | enum=hidden/authorizedClients/localUi/both | Omit if not used. |
| ?rotatePin | Boolean | 0x03 | Whether the receiver should rotate or regenerate the PIN. | None | Default: false |
| ?visibility | Enum | 0x04 | Visibility policy for responses and events. | enum=hidden/authorizedOnly/localUi/both | Omit if not used. |

---

## CastSetPinCodeParams

Request to set the active cast PIN value.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| pinCode | String | 0x01 | Opaque PIN value; concrete format is backend or product policy. | None | N/A |
| ?expirePrevious | Boolean | 0x02 | Whether prior PIN material should stop being accepted. | None | Default: true |
| ?visibility | Enum | 0x03 | Visibility policy for the new PIN. | enum=hidden/authorizedOnly/localUi/both | Omit if not used. |

---

## CastSetRenderFpsParams

Request to set receiver-local target render fps.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| fps | Number | 0x01 | Target local render fps; zero means uncapped. | min=0 | N/A |
| ?sessionId | String | 0x02 | Optional receiver-local session id. | maxLength=128 | Omit if not used. |
| ?scope | Enum | 0x03 | State target hint; this is not an authorization scope. | enum=currentSession/default | Omit if not used. |

---

## CastSetVideoStreamParamsParams

Request to update the active cast video stream frame rate or bitrate, optionally resetting selected fields.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?sessionId | String | 0x01 | Optional receiver-local cast session id. | maxLength=128 | Omit if not used. |
| ?frameRate | UInt32 | 0x02 | Optional target encoded video frame rate; zero is invalid, omission leaves the current session value unchanged or unset if never configured, and only resetFields clears it and restores the source/profile default. | min=1 | Omit if not used. |
| ?bitrateKbps | UInt32 | 0x03 | Optional target encoded video bitrate in kbps; zero is invalid, omission leaves the current session value unchanged or unset if never configured, and only resetFields clears it and restores the source/profile default. | min=1 | Omit if not used. |
| ?resetFields | Array<String> | 0x04 | Optional video parameter field names to reset to the source or profile default. | array.itemType=string | Omit if not used. |

---

## CastSetVideoStreamParamsResult

Result and reconfiguration status for cast video stream parameter changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| accepted | Boolean | 0x01 | Whether the receiver accepted the requested video parameter change. | None | N/A |
| state | Enum | 0x02 | Reconfiguration lifecycle state. | enum=pending/applied/failed/rolledBack/unchanged | N/A |
| ?sessionId | String | 0x03 | Receiver-local cast session id associated with the result. | maxLength=128 | Omit if not used. |
| ?reconfigureId | String | 0x04 | Identifier for this video stream reconfiguration operation. | maxLength=128 | Omit if not used. |
| ?previousStreamId | UInt32 | 0x05 | Previously active video stream id when the operation replaced a stream. | None | Omit if not used. |
| ?activeStreamId | UInt32 | 0x06 | Currently active video stream id after the operation. | None | Omit if not used. |
| sourceVideo | CastVideoStreamParamsState | 0x07 | Effective source video stream parameter state after the request. | None | N/A |

---

## CastSetWindowStateParams

Request to update cast window state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?mode | Enum | 0x01 | Target cast window mode. | enum=normal/fullscreen | Omit if not used. |
| ?fullscreen | Boolean | 0x02 | Whether the cast window should be fullscreen. | None | Omit if not used. |
| ?alwaysOnTop | Boolean | 0x03 | Whether the cast window should stay above normal windows. | None | Omit if not used. |
| ?bounds | CastRect | 0x04 | Optional target normal-mode window bounds. | None | Omit if not used. |

---

## CastSourceSummary

Summary of a cast source device or local AXTP sender.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?name | String | 0x01 | User-visible source name when known. | maxLength=128 | Omit if not used. |
| ?model | String | 0x02 | Source model identifier when known. | maxLength=128 | Omit if not used. |
| ?address | String | 0x03 | Network or transport address summary when safe to expose. | maxLength=128 | Omit if not used. |
| ?sourceId | String | 0x04 | Receiver-local source identifier. | maxLength=128 | Omit if not used. |
| ?protocol | Enum | 0x05 | Protocol path that produced the source summary. | enum=airplay/hid/unknown | Omit if not used. |

---

## CastStatus

Current cast receiver snapshot for reconnect and event-loss recovery.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| receiver | CastReceiverSummary | 0x01 | Receiver role and phase summary. | None | N/A |
| ?session | CastSessionStatusSummary | 0x02 | Active session summary. | None | Omit if not used. |
| ?pinCode | CastPinCodeStatusSummary | 0x03 | PIN protection summary. | None | Omit if not used. |
| ?audio | CastAudioState | 0x04 | Local audio summary. | None | Omit if not used. |
| ?window | CastWindowState | 0x05 | Cast window summary. | None | Omit if not used. |
| ?backend | CastBackendStatus | 0x06 | Backend summary. | None | Omit if not used. |
| ?flowControl | CastFlowControlState | 0x07 | Flow control summary. | None | Omit if not used. |
| sampledAt | String | 0x08 | Timestamp for this status snapshot. | maxLength=64 | N/A |
| ?redacted | Boolean | 0x09 | Whether any sensitive snapshot fields were withheld. | None | Omit if not used. |

---

## CastStatusCapability

Capability descriptor for cast.status snapshot query.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| sections | Array<String> | 0x01 | Status snapshot sections the receiver can report. | array.itemType=string | N/A |
| ?supportsSensitiveRedaction | Boolean | 0x02 | Whether sensitive status fields can be withheld and marked redacted. | None | Default: true |

---

## CastStopSessionParams

Request to stop an active cast session.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?sessionId | String | 0x01 | Optional receiver-local session id; omitted means current active session. | maxLength=128 | Omit if not used. |
| ?reason | Enum | 0x02 | Caller-visible reason for stopping the session. | enum=externalRequest/localUi/backendRestart/shutdown/unknown | Omit if not used. |
| ?force | Boolean | 0x03 | Whether the receiver may force backend/session cleanup. | None | Default: false |

---

## CastStopSessionResult

Result of a cast session stop request.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| accepted | Boolean | 0x01 | Whether the receiver accepted the stop request. | None | N/A |
| ?sessionId | String | 0x02 | Session affected by the request. | maxLength=128 | Omit if not used. |
| ?previousReceiverPhase | Enum | 0x03 | Receiver phase before the stop transition. | enum=idle/incoming/authenticating/streamStarting/streaming/rendering/interrupted/stopping/ended/failed | Omit if not used. |
| receiverPhase | Enum | 0x04 | Receiver phase after accepting the stop request. | enum=idle/incoming/authenticating/streamStarting/streaming/rendering/interrupted/stopping/ended/failed | N/A |
| ?previousState | Enum | 0x05 | Backend-specific state before the stop transition. | enum=idle/incoming/waitingForPassword/authenticated/preparing/casting/interrupted/stopping/ended/failed | Omit if not used. |
| ?sessionState | Enum | 0x06 | Backend-specific state after accepting the stop request. | enum=idle/incoming/waitingForPassword/authenticated/preparing/casting/interrupted/stopping/ended/failed | Omit if not used. |
| ?reason | Enum | 0x07 | Applied stop reason. | enum=externalRequest/sourceClosed/backendRestart/backendExited/shutdown/unknown | Omit if not used. |
| ?noActiveSession | Boolean | 0x08 | Whether no active session existed when the request was processed. | None | Omit if not used. |
| ?updatedAt | String | 0x09 | Timestamp for the result. | maxLength=64 | Omit if not used. |

---

## CastVideoStreamParamsState

Desired and effective cast source video stream parameters and reconfiguration state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?sessionId | String | 0x01 | Receiver-local cast session id. | maxLength=128 | Omit if not used. |
| ?source | String | 0x02 | Source identifier whose video stream parameters are represented. | maxLength=128 | Omit if not used. |
| ?desiredFrameRate | UInt32 | 0x03 | Requested video encoder frame rate, if one is pending or configured; zero is invalid. | min=1 | Omit if not used. |
| ?desiredBitrateKbps | UInt32 | 0x04 | Requested video encoder bitrate in kbps, if one is pending or configured; zero is invalid. | min=1 | Omit if not used. |
| ?effectiveFrameRate | UInt32 | 0x05 | Effective encoded video frame rate currently applied by the source. | min=1 | Omit if not used. |
| ?effectiveBitrateKbps | UInt32 | 0x06 | Effective encoded video bitrate in kbps currently applied by the source. | min=1 | Omit if not used. |
| ?streamProfile | String | 0x07 | Effective video STREAM profile. | maxLength=64 | Omit if not used. |
| ?encoder | String | 0x08 | Encoder or encoder profile selected for the source video stream. | maxLength=128 | Omit if not used. |
| ?reconfigureId | String | 0x09 | Most recent video stream reconfiguration operation id. | maxLength=128 | Omit if not used. |
| ?state | Enum | 0x0A | Current source video stream reconfiguration state. | enum=idle/pending/closing/opening/streaming/failed/rolledBack | Omit if not used. |
| ?phase | Enum | 0x0B | Current source video stream lifecycle phase during reconfiguration. | enum=idle/pending/closing/opening/streaming/failed/rolledBack | Omit if not used. |
| ?previousStreamId | UInt32 | 0x0C | Previous active downstream video stream id when a reconfiguration replaces it. | None | Omit if not used. |
| ?activeStreamId | UInt32 | 0x0D | Active downstream video stream id, if one is established. | None | Omit if not used. |
| ?rollbackApplied | Boolean | 0x0E | Whether the previous stream parameters were restored after a failed reconfiguration. | None | Omit if not used. |
| ?lastError | CastLastError | 0x0F | Last reconfiguration or stream lifecycle error, when available. | None | Omit if not used. |
| ?changedFields | Array<String> | 0x10 | Video parameter fields changed by the most recent operation. | array.itemType=string | Omit if not used. |

---

## CastWindowCapability

Capability descriptor for cast.window.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?supportsFullscreen | Boolean | 0x01 | Whether fullscreen window mode is supported. | None | Default: true |
| ?supportsAlwaysOnTop | Boolean | 0x02 | Whether topmost window state is supported. | None | Default: true |
| ?supportsNormalRestore | Boolean | 0x03 | Whether normal mode can restore remembered normal-mode bounds. | None | Default: true |
| ?noWindowPolicy | Enum | 0x04 | Receiver policy when a window command is received without an active cast window. | enum=reject/remember/runtimeDefault | Omit if not used. |

---

## CastWindowChangedEvent

Event payload for cast window state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| changedFields | Array<String> | 0x01 | Field names changed by this event. | array.itemType=string | N/A |
| state | CastWindowState | 0x02 | Window state after the change. | None | N/A |
| ?reason | Enum | 0x03 | Change reason. | enum=externalSet/localUi/sessionStarted/sessionStopped/unknown | Omit if not used. |
| ?updatedAt | String | 0x04 | Timestamp for this event. | maxLength=64 | Omit if not used. |

---

## CastWindowState

Cast window visibility, mode, and bounds state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| hasWindow | Boolean | 0x01 | Whether a cast window currently exists. | None | N/A |
| visible | Boolean | 0x02 | Whether the cast window is visible. | None | N/A |
| mode | Enum | 0x03 | Current cast window mode. | enum=normal/fullscreen | N/A |
| fullscreen | Boolean | 0x04 | Whether the cast window is fullscreen. | None | N/A |
| alwaysOnTop | Boolean | 0x05 | Whether the cast window is topmost. | None | N/A |
| ?sessionId | String | 0x06 | Receiver-local session id associated with the window. | maxLength=128 | Omit if not used. |
| ?bounds | CastRect | 0x07 | Current window bounds when available. | None | Omit if not used. |
| ?changedFields | Array<String> | 0x0A | Field names changed by the latest operation or event. | array.itemType=string | Omit if not used. |
| ?updatedAt | String | 0x0B | Timestamp for this window state. | maxLength=64 | Omit if not used. |

---

## ControlAcceptBody

Kind: `object`

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?sessionId | UInt32 | 0x01 | - | None | Omit if not used. |
| ?protocolVersion | UInt8 | 0x02 | - | min=1, max=15, deprecated | Omit if not used. |
| ?reservedHeaderProfile | UInt8 | 0x03 | - | min=1, max=2, deprecated | Omit if not used. |
| ?maxFrameSize | UInt16 | 0x04 | - | min=19, max=65535 | Omit if not used. |
| ?mtu | UInt16 | 0x06 | - | min=1, max=65535 | Omit if not used. |
| ?supportedPayloadTypes | Bitmap | 0x07 | - | None | Omit if not used. |
| ?heartbeatIntervalMs | UInt32 | 0x0A | - | min=500, max=60000 | Omit if not used. |
| ?ackMode | UInt8 | 0x0B | - | min=0, max=4 | Omit if not used. |
| ?selectedRpcEncoding | UInt8 | 0x1E | - | min=1, max=4 | Omit if not used. |

---

## ControlOpenBody

Kind: `object`

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?protocolVersion | UInt8 | 0x02 | - | min=1, max=15, deprecated | Omit if not used. |
| ?reservedHeaderProfile | UInt8 | 0x03 | - | min=1, max=2, deprecated | Omit if not used. |
| maxFrameSize | UInt16 | 0x04 | - | min=19, max=65535 | N/A |
| ?mtu | UInt16 | 0x06 | - | min=1, max=65535 | Omit if not used. |
| supportedPayloadTypes | Bitmap | 0x07 | - | None | N/A |
| supportedRpcEncodings | Bitmap | 0x08 | - | None | N/A |
| heartbeatIntervalMs | UInt32 | 0x0A | - | min=500, max=60000 | N/A |
| ackMode | UInt8 | 0x0B | - | min=0, max=4 | N/A |

---

## DeviceAxtpRuntime

AXTP runtime summary.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?axtpRuntime | String | 0x01 | AXTP runtime implementation name. | maxLength=128 | Omit if not used. |
| ?axtpRuntimeVersion | String | 0x02 | AXTP runtime implementation version. | maxLength=64 | Omit if not used. |
| ?hostAppId | String | 0x03 | Host application identifier. | maxLength=64 | Omit if not used. |

---

## DeviceCapabilitySummary

Lightweight capability modeling summary returned by device.getInfo.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?domains | Array<String> | 0x01 | Domain names represented by the device. | array.itemType=string | Omit if not used. |
| ?features | Array<String> | 0x02 | Domain.feature names represented by the device. | array.itemType=string | Omit if not used. |
| ?profiles | Array<String> | 0x03 | Profile names or product profile hints. | array.itemType=string | Omit if not used. |

---

## DeviceEnrollmentCapability

Capability descriptor for device.enrollment.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?supportsPairingCode | Boolean | 0x01 | Whether pairing code is supported. | None | Omit if not used. |
| ?pairingCodeTtlSeconds | UInt32 | 0x02 | Default code TTL in seconds; MUST be greater than 0. | None | Omit if not used. |
| ?supportsUnenroll | Boolean | 0x03 | Whether remote unbind or enrollment state clear is supported. | None | Omit if not used. |
| ?endpointTypes | Array<String> | 0x04 | Endpoint type strings that enrollment may produce; candidate values include room, device, and asset. P0 only requires room. [REVIEW-ADOPTED-SCOPED] | array.itemType=string | Omit if not used. |
| ?supportedPurposes | Array<String> | 0x05 | Supported pairing code purpose strings; candidate values include initial_enrollment, re_enrollment, and service_repair. Omission means only initial_enrollment is supported. [REVIEW-ADOPTED-SCOPED] | array.itemType=string | Omit if not used. |
| ?maxActivePairingCodes | UInt32 | 0x06 | Maximum number of simultaneously valid pairing codes. Default 1. [REVIEW-ADOPTED-SCOPED] | None | Default: 1 |
| ?pairingCodeLength | UInt32 | 0x07 | Pairing code character length. Default 6. [REVIEW-ADOPTED-SCOPED] | min=6, max=8 | Default: 6 |

---

## DeviceEnrollmentEndpointSummary

Backend endpoint summary associated with enrollment. Nested in DeviceEnrollmentInfo and DeviceSetEnrollmentStateParams. When type is room, profileId is required.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| endpointId | String | 0x01 | Backend endpoint identifier. | maxLength=128 | N/A |
| type | Enum | 0x02 | Endpoint type; candidate values include room, device, and asset. Operations such as room.setName only allow type=room. | None | N/A |
| ?displayName | String | 0x03 | Endpoint display name, non-empty and trimmed. Max length aligned with device.info product.displayName (128) as a scoped default. [REVIEW-ADOPTED-SCOPED] 待产品确认后走 amend | maxLength=128 | Omit if not used. |
| ?profileId | String | 0x04 | Room profile or business profile identifier. MUST be present when type is room; other types allow omission. | maxLength=128 | Omit if not used. |
| ?workspaceId | String | 0x05 | Endpoint workspace identifier. Takes precedence over the parent DeviceEnrollmentInfo.workspaceId when both are present. [REVIEW-ADOPTED-SCOPED] | maxLength=128 | Omit if not used. |

---

## DeviceEnrollmentInfo

Enrollment state snapshot. Shared by the device.getEnrollmentState result, DeviceSetEnrollmentStateResult.state, and DeviceEnrollmentStateChangedEvent.state. workspaceId, endpoint, and enrolledAt are populated only when state is enrolled or unenrolling.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| state | Enum | 0x01 | Current enrollment state; candidate values include unmanaged, pairing_available, pending, enrolled, failed, and unenrolling. Valid transitions follow the enrollment state machine; invalid transitions return INVALID_STATE. | None | N/A |
| ?deviceId | String | 0x02 | Server-assigned device identifier, stable across sessions. | maxLength=128 | Omit if not used. |
| ?workspaceId | String | 0x03 | Enrolled workspace identifier. Populated only when state is enrolled or unenrolling. Privacy-sensitive; exposure policy to be confirmed. [REVIEW-ADOPTED-SCOPED] 待确认后走 amend | maxLength=128 | Omit if not used. |
| ?endpoint | DeviceEnrollmentEndpointSummary | 0x04 | Post-enrollment backend endpoint. Populated only when state is enrolled or unenrolling and subject to includeEndpoint. | None | Omit if not used. |
| ?enrolledAt | String | 0x05 | RFC 3339 timestamp of when the state became enrolled. Present only when state is enrolled or unenrolling. [REVIEW-ADOPTED-SCOPED] | None | Omit if not used. |
| ?updatedAt | String | 0x06 | RFC 3339 timestamp of the most recent state update. | None | Omit if not used. |
| ?message | String | 0x07 | Human-readable detail, populated when state is failed or pending, optional when unenrolling. | maxLength=512 | Omit if not used. |

---

## DeviceEnrollmentStateChangedEvent

Event payload emitted when the enrollment state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| state | DeviceEnrollmentInfo | 0x01 | Enrollment state after the change. | None | N/A |
| ?previousState | Enum | 0x02 | State enum value (not a full object) before the change; candidate values are the same DeviceEnrollmentInfo.state set. | None | Omit if not used. |
| ?reason | Enum | 0x03 | Change reason; candidate values include pairing_code_used, server_claimed, user_unenrolled, admin_reset, and unknown (default). | None | Omit if not used. |
| ?triggerMethod | Enum | 0x04 | Operation type that triggered the change; candidate values include setEnrollmentState (explicit call), getPairingCode (indirect, for code-expiry fallback), and server_sync (device-internal such as code-expiry rollback or server-side revoke). triggerId MUST be omitted when triggerMethod is server_sync. [REVIEW-ADOPTED-SCOPED] | None | Omit if not used. |
| ?triggerId | String | 0x05 | RPC request id of the triggering operation. Omitted when triggerMethod is server_sync. [REVIEW-ADOPTED-SCOPED] | maxLength=64 | Omit if not used. |

---

## DeviceGetEnrollmentStateParams

Request for device.getEnrollmentState; controls whether the post-enrollment endpoint summary is returned.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?includeEndpoint | Boolean | 0x01 | Whether to include the post-enrollment endpoint summary. Defaults to true since the most common caller (the cloud management backend) needs endpoint info; set to false for lightweight polling or when the endpoint is already cached. | None | Default: true |

---

## DeviceGetPairingCodeParams

Request for device.getPairingCode; selects refresh behavior and the pairing code purpose.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?refresh | Boolean | 0x01 | Whether to force a fresh pairing code. false (default) returns the current valid code; true generates a new code and invalidates the previous one. | None | Default: false |
| ?purpose | Enum | 0x02 | Pairing code usage scenario; candidate values include initial_enrollment (first-time enrollment of a new device, default), re_enrollment (re-enrollment such as workspace migration), and service_repair (service/repair pairing, may have a different TTL or permission). Unsupported purpose returns NOT_SUPPORTED. | None | Omit if not used. |

---

## DeviceHardware

Hardware summary.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?revision | String | 0x01 | Hardware revision. | maxLength=32 | Omit if not used. |
| ?cpuArch | Enum | 0x02 | CPU architecture; candidate values include x86_64, arm64, armv7, riscv64, and unknown. | None | Omit if not used. |
| ?memoryBytes | UInt64 | 0x03 | Physical memory capacity in bytes. | None | Omit if not used. |

---

## DeviceIdentity

Stable identity fields for the current main device.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| deviceId | String | 0x01 | Stable AXTP or business device identifier. | maxLength=128 | N/A |
| ?serialNumber | String | 0x02 | Vendor serial number; may be omitted by permission policy. | maxLength=128 | Omit if not used. |
| ?vendorId | String | 0x03 | Vendor identifier. | maxLength=64 | Omit if not used. |
| ?productId | String | 0x04 | Product identifier. | maxLength=64 | Omit if not used. |

---

## DeviceInfo

Read-only information snapshot for the current AXTP endpoint main device.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| identity | DeviceIdentity | 0x01 | Stable device identity fields. | None | N/A |
| product | DeviceProduct | 0x02 | Brand, product type, model, and display information. | None | N/A |
| ?hardware | DeviceHardware | 0x03 | Hardware summary. | None | Omit if not used. |
| ?os | DeviceOs | 0x04 | Operating system summary. | None | Omit if not used. |
| ?software | DeviceSoftware | 0x05 | Installed or hosted software component summary. | None | Omit if not used. |
| ?runtime | DeviceAxtpRuntime | 0x06 | AXTP runtime summary. | None | Omit if not used. |
| ?capability | DeviceCapabilitySummary | 0x07 | Lightweight modeling summary; not a complete capability registry. | None | Omit if not used. |

---

## DeviceInfoCapability

Capability descriptor for device.info.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| readOnly | Boolean | 0x01 | device.info currently exposes only read-only information. | None | Default: true |
| ?supportsCapabilitySummary | Boolean | 0x02 | Whether device.getInfo can include DeviceCapabilitySummary. | None | Default: true |
| ?identityMerged | Boolean | 0x03 | Whether device.identity has been merged into device.info. | None | Default: true |

---

## DeviceOs

Operating system summary.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| type | Enum | 0x01 | OS type; candidate values include windows, android, linux, rtos, and unknown. | None | N/A |
| ?name | String | 0x02 | OS display name. | maxLength=128 | Omit if not used. |
| ?version | String | 0x03 | OS version string. | maxLength=64 | Omit if not used. |
| ?arch | Enum | 0x04 | OS architecture; candidate values include x86_64, arm64, armv7, riscv64, and unknown. | None | Omit if not used. |

---

## DevicePairingCodeInfo

Pairing code snapshot returned by device.getPairingCode. The code field carries a displayable or inputtable code; expiresAt is the authoritative absolute expiry while expiresInSeconds is retained for legacy device-sdk compatibility.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| code | String | 0x01 | Displayable pairing code, 6-8 uppercase alphanumeric characters excluding confusable characters (0/O, 1/I/L); MUST match the regex ^[A-HJ-NP-Z2-9]{6,8}$. | maxLength=8 | N/A |
| ?expiresAt | String | 0x02 | Absolute expiry time as an RFC 3339 timestamp. Authoritative when present. Legacy GetBindCode returned a Unix timestamp integer here; the adapter MUST convert integer to RFC 3339 string. | None | Omit if not used. |
| ?expiresInSeconds | UInt32 | 0x03 | Relative expiry in seconds, retained for legacy device-sdk compatibility (observed value 1800). MUST be greater than 0 when present. | min=1 | Omit if not used. |
| ?state | Enum | 0x04 | Pairing code lifecycle state; candidate values include available (default), expired (TTL reached), used (consumed by the cloud), and disabled (revoked by the server). | None | Omit if not used. |

---

## DeviceProduct

Product and user-visible model information.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?brand | String | 0x01 | Product brand. | maxLength=64 | Omit if not used. |
| productType | Enum | 0x02 | Product type; candidate values include windowsDevice, androidDevice, embeddedDevice, rtosDevice, cameraDevice, displayDevice, and unknown. | None | N/A |
| model | String | 0x03 | Hardware or whole-product model. | maxLength=128 | N/A |
| ?displayName | String | 0x04 | User-visible display name; this feature exposes it as read-only. | maxLength=128 | Omit if not used. |

---

## DeviceSetEnrollmentStateParams

Request for device.setEnrollmentState. Validation rules follow the enrollment state machine. For desiredState enrolled, only reachable from pending, endpoint and reason required, and endpoint.profileId required when endpoint.type is room. For desiredState unmanaged, reachable from enrolled/failed/pairing_available, reason recommended. For desiredState failed, only reachable from pending, message required. For desiredState pending, reachable from failed (retry) or pairing_available (code submitted). Transitions must follow the state machine; violations return INVALID_STATE.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| desiredState | Enum | 0x01 | Target state; candidate values include enrolled, unmanaged, failed, and pending. | None | N/A |
| ?reason | Enum | 0x02 | Change reason; candidate values include pairing_code_used, server_claimed, user_unenrolled, admin_reset, and unknown (default). | None | Omit if not used. |
| ?endpoint | DeviceEnrollmentEndpointSummary | 0x03 | Endpoint summary associated with a successful enrollment. Required when desiredState is enrolled. | None | Omit if not used. |
| ?message | String | 0x04 | Failure, unbind, or repair detail. Required when desiredState is failed. | maxLength=512 | Omit if not used. |

---

## DeviceSetEnrollmentStateResult

Result of device.setEnrollmentState; carries the post-operation enrollment snapshot.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| state | DeviceEnrollmentInfo | 0x01 | Enrollment state after the operation. | None | N/A |
| ?disconnectExpected | Boolean | 0x02 | Whether the unbind or reset is expected to cause a connection change. true only when desiredState is unmanaged and the device needs to close the management session; false for all other transitions. | None | Default: false |

---

## DeviceSoftware

Software component summary.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?components | Array<SoftwareComponent> | 0x01 | Software component objects. | schema=SoftwareComponent, array.itemType=SoftwareComponent, array.itemSchema=SoftwareComponent | Omit if not used. |

---

## Empty

Kind: `object`

No fields.

---

## FinishUpdateParams

Request to finish firmware upload and hand off processing to the device.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| updateSessionId | String | 0x01 | Firmware update session identifier. | maxLength=128 | N/A |

---

## FinishUpdateResult

Result of finishUpdate.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| updateSessionId | String | 0x01 | Firmware update session identifier. | maxLength=128 | N/A |
| accepted | Boolean | 0x02 | Whether the device accepted the finish handoff. | None | N/A |
| state | Enum | 0x03 | State after finish, normally verifying or failed. | None | N/A |

---

## FirmwareUpdateCapabilities

P0 firmware update capability and upload constraints.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supported | Boolean | 0x01 | Whether firmware.update P0 is supported. | None | N/A |
| supportsMultiFile | Boolean | 0x02 | Whether manifest may contain multiple files. | None | N/A |
| streamLayout | Enum | 0x03 | P0 stream layout, currently file. | None | N/A |
| hashAlgorithm | Enum | 0x04 | P0 hash algorithm, currently md5. | None | N/A |
| autoReboot | Boolean | 0x05 | Whether the device automatically reboots after installation. | None | N/A |
| ?maxChunkSize | UInt32 | 0x06 | Maximum STREAM data chunk size supported by the device. | None | Omit if not used. |
| ?devicePolicyVersion | String | 0x07 | Optional device policy version used by host tooling. | maxLength=64 | Omit if not used. |

---

## FirmwareUpdateErrorInfo

Firmware update error details.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| error | Enum | 0x01 | Candidate or adopted error name. | None | N/A |
| ?message | String | 0x02 | Developer-facing error message. | maxLength=256 | Omit if not used. |
| ?fileId | String | 0x03 | Related file identifier, if applicable. | maxLength=128 | Omit if not used. |

---

## FirmwareUpdateManifest

Minimal firmware update manifest.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?packageId | String | 0x01 | Firmware package identifier. | maxLength=128 | Omit if not used. |
| ?version | String | 0x02 | Target firmware version string. | maxLength=64 | Omit if not used. |
| files | Array<FirmwareUpdateFile> | 0x03 | Firmware update files. | schema=FirmwareUpdateFile, array.itemType=FirmwareUpdateFile, array.itemSchema=FirmwareUpdateFile | N/A |
| ?devicePolicyVersion | String | 0x04 | Optional policy version used to interpret the package. | maxLength=64 | Omit if not used. |

---

## FirmwareUpdateProgressEvent

Event payload for firmware update progress.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| updateSessionId | String | 0x01 | Firmware update session identifier. | maxLength=128 | N/A |
| state | Enum | 0x02 | Current firmware update state. | None | N/A |
| ?progress | UInt8 | 0x03 | Overall progress percentage. | min=0, max=100 | Omit if not used. |
| ?fileId | String | 0x04 | Current file identifier. | maxLength=128 | Omit if not used. |

---

## FirmwareUpdateState

Current firmware update state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| updateSessionId | String | 0x01 | Firmware update session identifier. | maxLength=128 | N/A |
| state | Enum | 0x02 | State, such as idle, receiving, verifying, installing, rebooting, confirmed, or failed. | None | N/A |
| ?progress | UInt8 | 0x03 | Overall progress percentage. | min=0, max=100 | Omit if not used. |
| ?currentFileId | String | 0x04 | Current file identifier, if file-level progress is available. | maxLength=128 | Omit if not used. |
| ?error | FirmwareUpdateErrorInfo | 0x05 | Error details when state is failed. | None | Omit if not used. |

---

## FirmwareUpdateStateChangedEvent

Event payload for firmware update state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| updateSessionId | String | 0x01 | Firmware update session identifier. | maxLength=128 | N/A |
| state | Enum | 0x02 | New firmware update state. | None | N/A |
| ?error | FirmwareUpdateErrorInfo | 0x03 | Error details when state is failed. | None | Omit if not used. |

---

## GetDeviceInfoParams

Optional selector for the read-only device information snapshot.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?includeCapabilitySummary | Boolean | 0x01 | Whether to include the lightweight DeviceCapabilitySummary block. | None | Default: true |

---

## GetUpdateStateParams

Selector for firmware update state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| updateSessionId | String | 0x01 | Firmware update session identifier. | maxLength=128 | N/A |

---

## LauncherAppearance

Appearance configuration for the launcher panel, nested under LauncherConfig.appearance.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?panelLayout | Enum | 0x01 | Panel layout mode; candidate values are focus (focus mode) and sidebar (sidebar mode, default). | None | Omit if not used. |
| ?autoHidePanel | Boolean | 0x02 | Whether to auto-hide the panel. Default is false. | None | Omit if not used. |
| ?autoHideDelay | UInt32 | 0x03 | Auto-hide delay in seconds; MUST be greater than 0. Only effective when autoHidePanel is true. The value is preserved and persisted even when autoHidePanel is false and takes effect again once autoHidePanel switches back to true. | min=1 | Default: 5 |

---

## LauncherConfig

Configuration fragment for target launcher. Referenced by SoftwareConfig.config, SoftwareSetConfigParams.config, and SoftwareConfigChangedEvent.config when target is launcher.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?displayName | String | 0x01 | User-visible device display name. Overrides the device factory name returned read-only by device.info product.displayName. MUST be non-empty; an empty string or value exceeding the max length returns INVALID_ARGUMENT. Omitted means keep current value on set, or the device factory name on get/reset. | maxLength=64 | Omit if not used. |
| ?appearance | LauncherAppearance | 0x02 | Appearance configuration for the launcher panel. | None | Omit if not used. |

---

## LauncherUpdatePolicy

Update policy fragment for target launcher. Referenced by SoftwareUpdatePolicy.policy, SoftwareSetUpdatePolicyParams.policy, and SoftwareUpdatePolicyChangedEvent.policy when target is launcher. schedule null means no update time restriction (any time) and conditions null means no prerequisites; both are valid persisted values and the reset default sets both to null. When updateMode is manual or notify, schedule may still be set and persisted but the device does not automatically perform updates in the window; the schedule value is preserved across updateMode changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| updateMode | Enum | 0x01 | Update behavior mode; candidate values are auto (fully automatic download and install), manual (manual trigger only), and notify (notify only when an update is available). | None | N/A |
| ?schedule | UpdateSchedule | 0x02 | Automatic update time window. Only effective when updateMode is auto. null means no time restriction (any time of day). In setUpdatePolicy partial update, null explicitly clears the window while omitted keeps the current value. See UpdateSchedule. | None | Omit if not used. |
| channel | Enum | 0x03 | Update channel; candidate values are release (stable), beta (test), and alpha (development). | None | N/A |
| ?conditions | UpdateConditions | 0x04 | Automatic update prerequisites. null means no prerequisites (no restriction). In setUpdatePolicy partial update, null explicitly clears all conditions while omitted keeps the current value. See UpdateConditions. | None | Omit if not used. |

---

## NetworkApActionParams

Start or stop AP request.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi AP interface identifier. | maxLength=64 | Default: "defaults.wifiAp" |
| ?reason | Enum | 0x02 | Action reason. | None | Omit if not used. |

---

## NetworkApActionResult

Result of starting or stopping AP.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| accepted | Boolean | 0x01 | Whether the action was accepted. | None | N/A |
| state | NetworkApState | 0x02 | Current or target AP state. | None | N/A |

---

## NetworkApCapabilities

Wi-Fi AP capability descriptor.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| capability | String | 0x01 | Fixed capability name network.ap. | maxLength=32 | N/A |
| securityTypes | Array<String> | 0x02 | Supported security types. | array.itemType=string | N/A |
| ?bands | Array<String> | 0x03 | Supported bands. | array.itemType=string | Omit if not used. |
| ?credentialExportModes | Array<String> | 0x04 | Credential export modes. | array.itemType=string | Omit if not used. |
| ?clientsSupported | Boolean | 0x05 | Whether client list query and client change events are supported. | None | Omit if not used. |

---

## NetworkApClientChangedEvent

Event payload for Wi-Fi AP client changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| change | Enum | 0x01 | Client change type; candidate values include joined, left, and updated. | None | N/A |
| client | NetworkApClientInfo | 0x02 | Client summary. | None | N/A |
| ?reason | Enum | 0x03 | Change reason. | None | Omit if not used. |

---

## NetworkApClients

AP client list result.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| clients | Array<NetworkApClientInfo> | 0x01 | NetworkApClientInfo objects. | schema=NetworkApClientInfo, array.itemType=NetworkApClientInfo, array.itemSchema=NetworkApClientInfo | N/A |

---

## NetworkApConfig

Wi-Fi AP configuration.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi AP interface identifier. | maxLength=64 | Omit if not used. |
| ?enabled | Boolean | 0x02 | Whether AP should be enabled by configuration. | None | Omit if not used. |
| ssid | String | 0x03 | AP SSID. | maxLength=64 | N/A |
| ?hidden | Boolean | 0x04 | Whether SSID broadcast is hidden. | None | Default: false |
| ?band | Enum | 0x05 | AP band. | None | Omit if not used. |
| ?channel | UInt16 | 0x06 | AP channel. | None | Omit if not used. |
| securityType | Enum | 0x07 | AP security type. | None | N/A |
| ?credential | NetworkCredential | 0x08 | Credential descriptor; plaintext must not be returned unless policy explicitly allows it. | None | Omit if not used. |
| ?maxClients | UInt16 | 0x09 | Maximum client count. | None | Omit if not used. |

---

## NetworkApConfigChangedEvent

Event payload for Wi-Fi AP configuration changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi AP interface identifier. | maxLength=64 | Omit if not used. |
| config | NetworkApConfig | 0x02 | New AP configuration. | None | N/A |
| ?changedFields | Array<String> | 0x03 | Changed field paths. | array.itemType=string | Omit if not used. |
| ?reason | Enum | 0x04 | Change reason. | None | Omit if not used. |

---

## NetworkApState

Wi-Fi AP runtime state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi AP interface identifier. | maxLength=64 | Omit if not used. |
| enabled | Boolean | 0x02 | Whether AP is currently enabled. | None | N/A |
| state | Enum | 0x03 | AP state; candidate values include disabled, starting, enabled, stopping, failed, and unknown. | None | N/A |
| ?ssid | String | 0x04 | Active AP SSID. | maxLength=64 | Omit if not used. |
| ?clientCount | UInt16 | 0x05 | Current associated client count. | None | Omit if not used. |
| ?failureReason | Enum | 0x06 | Failure reason when state is failed. | None | Omit if not used. |

---

## NetworkApStateChangedEvent

Event payload for Wi-Fi AP state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| state | NetworkApState | 0x01 | New AP state. | None | N/A |
| ?previousState | NetworkApState | 0x02 | Previous AP state. | None | Omit if not used. |
| ?reason | Enum | 0x03 | Change reason. | None | Omit if not used. |

---

## NetworkConnectWifiParams

Wi-Fi station connect request.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi station interface identifier. | maxLength=64 | Default: "defaults.wifiSta" |
| ?profileId | String | 0x02 | Saved profile identifier. | maxLength=128 | Omit if not used. |
| ?profile | NetworkWifiProfile | 0x03 | Inline profile to connect with. | None | Omit if not used. |
| ?timeoutMs | UInt32 | 0x04 | Connection timeout in milliseconds. | None | Omit if not used. |

---

## NetworkCredential

Credential descriptor or secret reference.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| type | Enum | 0x01 | Credential type; candidate values include passphrase, pairing_token, opaque_ref, and none. | None | N/A |
| ?secretRef | String | 0x02 | Opaque reference to sensitive credential material. | maxLength=256 | Omit if not used. |
| ?expiresInSeconds | UInt32 | 0x03 | Relative validity lifetime for ephemeral credentials. | None | Omit if not used. |

---

## NetworkDefaultInterfaceIds

Default network interface identifiers by role.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?primary | String | 0x01 | Primary interface. | maxLength=64 | Omit if not used. |
| ?wifiSta | String | 0x02 | Default Wi-Fi station interface. | maxLength=64 | Omit if not used. |
| ?wifiAp | String | 0x03 | Default Wi-Fi AP interface. | maxLength=64 | Omit if not used. |

---

## NetworkDisconnectWifiParams

Wi-Fi station disconnect request.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi station interface identifier. | maxLength=64 | Default: "defaults.wifiSta" |
| ?reason | Enum | 0x02 | Disconnect reason; candidate values include user_request, profile_changed, shutdown, and unknown. | None | Omit if not used. |

---

## NetworkGetApCapabilitiesParams

Selector for Wi-Fi AP capability.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi AP interface identifier. | maxLength=64 | Default: "defaults.wifiAp" |

---

## NetworkGetApConfigParams

Selector for Wi-Fi AP configuration, state, or client list.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi AP interface identifier. | maxLength=64 | Default: "defaults.wifiAp" |

---

## NetworkGetInterfaceInfoParams

Selector for one network interface.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| interfaceId | String | 0x01 | Interface identifier. | maxLength=64 | N/A |

---

## NetworkGetInterfacesParams

Selector for network interface enumeration.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?includeDisabled | Boolean | 0x01 | Whether disabled interfaces should be included. | None | Default: false |

---

## NetworkGetIpConfigParams

Selector for IP configuration.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Interface identifier; omitted means default primary interface. | maxLength=64 | Default: "defaults.primary" |
| ?family | Enum | 0x02 | IP family; candidate values include ipv4 and ipv6. | None | Default: "ipv4" |

---

## NetworkGetWifiCapabilitiesParams

Selector for Wi-Fi station capability.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi station interface identifier. | maxLength=64 | Default: "defaults.wifiSta" |

---

## NetworkGetWifiConfigParams

Selector for saved Wi-Fi configuration.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi station interface identifier. | maxLength=64 | Default: "defaults.wifiSta" |
| ?includeProfiles | Boolean | 0x02 | Whether to include saved profile summaries. | None | Default: true |

---

## NetworkGetWifiStateParams

Selector for Wi-Fi station runtime state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi station interface identifier. | maxLength=64 | Default: "defaults.wifiSta" |

---

## NetworkInterfaceCapability

Capability descriptor for network.interface.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceTypes | Array<String> | 0x01 | Supported interface type strings. | array.itemType=string | Omit if not used. |
| ?supportsStateEvent | Boolean | 0x02 | Whether network.interfaceStateChanged is supported. | None | Omit if not used. |

---

## NetworkInterfaceInfo

Detailed information for one network interface.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| interfaceId | String | 0x01 | Interface identifier. | maxLength=64 | N/A |
| type | Enum | 0x02 | Interface type. | None | N/A |
| ?macAddress | String | 0x03 | Interface MAC address, if available and permitted. | maxLength=32 | Omit if not used. |
| ?state | NetworkInterfaceState | 0x04 | Current interface state. | None | Omit if not used. |
| ?supportsIpConfig | Boolean | 0x05 | Whether this interface can be used with network.ip. | None | Omit if not used. |

---

## NetworkInterfaces

Network interface enumeration result.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| interfaces | Array<NetworkInterfaceSummary> | 0x01 | Network interface summary objects. | schema=NetworkInterfaceSummary, array.itemType=NetworkInterfaceSummary, array.itemSchema=NetworkInterfaceSummary | N/A |
| ?defaults | NetworkDefaultInterfaceIds | 0x02 | Default interface identifiers for common roles. | None | Omit if not used. |

---

## NetworkInterfaceState

Network interface administrative and link state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?admin | Enum | 0x01 | Administrative state; candidate values include up, down, disabled, and unknown. | None | Omit if not used. |
| ?link | Enum | 0x02 | Link state; candidate values include up, down, dormant, unknown. | None | Omit if not used. |
| ?speedMbps | UInt32 | 0x03 | Link speed in Mbps. | None | Omit if not used. |

---

## NetworkInterfaceStateChangedEvent

Event payload for network interface state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| interfaceId | String | 0x01 | Interface identifier. | maxLength=64 | N/A |
| state | NetworkInterfaceState | 0x02 | New interface state. | None | N/A |
| ?previousState | NetworkInterfaceState | 0x03 | Previous interface state. | None | Omit if not used. |
| ?reason | Enum | 0x04 | Change reason. | None | Omit if not used. |

---

## NetworkIpCapability

Capability descriptor for network.ip.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?families | Array<String> | 0x01 | Supported IP families. | array.itemType=string | Omit if not used. |
| ?modes | Array<String> | 0x02 | Supported IP modes. | array.itemType=string | Omit if not used. |
| ?applyPolicies | Array<String> | 0x03 | Supported apply policies. | array.itemType=string | Omit if not used. |

---

## NetworkIpConfig

IP configuration for one interface and address family.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| interfaceId | String | 0x01 | Interface identifier. | maxLength=64 | N/A |
| ?family | Enum | 0x02 | IP family; candidate values include ipv4 and ipv6. | None | Default: "ipv4" |
| mode | Enum | 0x03 | IP mode; candidate values include dhcp, static, disabled, link_local, and unknown. | None | N/A |
| ?address | String | 0x04 | IP address. | maxLength=64 | Omit if not used. |
| ?prefixLength | UInt8 | 0x05 | Network prefix length. | min=0, max=128 | Omit if not used. |
| ?gateway | String | 0x06 | Default gateway. | maxLength=64 | Omit if not used. |
| ?dns | Array<String> | 0x07 | DNS server addresses. | array.itemType=string | Omit if not used. |

---

## NetworkIpConfigChangedEvent

Event payload for IP configuration changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| interfaceId | String | 0x01 | Interface identifier. | maxLength=64 | N/A |
| ?family | Enum | 0x02 | IP family. | None | Omit if not used. |
| config | NetworkIpConfig | 0x03 | New IP configuration. | None | N/A |
| ?previousConfig | NetworkIpConfig | 0x04 | Previous IP configuration. | None | Omit if not used. |
| ?reason | Enum | 0x05 | Change reason. | None | Omit if not used. |

---

## NetworkScanWifiParams

Wi-Fi scan request.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi station interface identifier. | maxLength=64 | Default: "defaults.wifiSta" |
| ?ssidFilter | String | 0x02 | Optional SSID filter. | maxLength=64 | Omit if not used. |
| ?timeoutMs | UInt32 | 0x03 | Scan timeout in milliseconds. | None | Omit if not used. |

---

## NetworkScanWifiResult

Wi-Fi scan result.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?scanId | String | 0x01 | Asynchronous scan identifier. | maxLength=128 | Omit if not used. |
| ?results | Array<NetworkWifiScanResult> | 0x02 | NetworkWifiScanResult objects. | schema=NetworkWifiScanResult, array.itemType=NetworkWifiScanResult, array.itemSchema=NetworkWifiScanResult | Omit if not used. |
| ?complete | Boolean | 0x03 | Whether returned results are complete. | None | Omit if not used. |

---

## NetworkSetApConfigParams

Wi-Fi AP configuration update request.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi AP interface identifier. | maxLength=64 | Default: "defaults.wifiAp" |
| config | NetworkApConfig | 0x02 | AP configuration patch or target configuration. | None | N/A |

---

## NetworkSetApConfigResult

Result of setting Wi-Fi AP configuration.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| config | NetworkApConfig | 0x01 | Applied or pending AP configuration. | None | N/A |
| applyState | Enum | 0x02 | Apply state; candidate values include applied, pending_restart, and failed. | None | N/A |

---

## NetworkSetIpConfigParams

IP configuration update request.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Interface identifier. | maxLength=64 | Default: "defaults.primary" |
| ?family | Enum | 0x02 | IP family. | None | Default: "ipv4" |
| config | NetworkIpConfig | 0x03 | Target IP configuration. | None | N/A |
| ?applyPolicy | Enum | 0x04 | Apply policy; candidate values include immediate and pending_restart. | None | Default: "immediate" |

---

## NetworkSetIpConfigResult

Result of setting IP configuration.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| config | NetworkIpConfig | 0x01 | Applied or pending IP configuration. | None | N/A |
| applyState | Enum | 0x02 | Apply state; candidate values include applied, pending_restart, and failed. | None | N/A |

---

## NetworkSetWifiConfigParams

Wi-Fi profile create or update request.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi station interface identifier. | maxLength=64 | Default: "defaults.wifiSta" |
| profile | NetworkWifiProfile | 0x02 | Profile to create or update. | None | N/A |
| ?replaceExisting | Boolean | 0x03 | Whether an existing matching profile may be replaced. | None | Default: false |
| ?makeDefault | Boolean | 0x04 | Whether to make this the default profile. | None | Default: false |
| ?connectAfterSave | Boolean | 0x05 | Whether to start connection after saving. | None | Omit if not used. |

---

## NetworkSetWifiConfigResult

Result of setting Wi-Fi profile configuration.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| profileId | String | 0x01 | Accepted or assigned profile identifier. | maxLength=128 | N/A |
| ?config | NetworkWifiConfig | 0x02 | Updated profile summary. | None | Omit if not used. |
| ?connectStarted | Boolean | 0x03 | Whether connection was started after saving. | None | Omit if not used. |

---

## NetworkWifiActionResult

Result of a Wi-Fi connect or disconnect action.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| accepted | Boolean | 0x01 | Whether the action was accepted. | None | N/A |
| state | NetworkWifiState | 0x02 | Current or target Wi-Fi state after accepting the action. | None | N/A |

---

## NetworkWifiCapabilities

Wi-Fi station capability descriptor.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| capability | String | 0x01 | Fixed capability name network.wifi. | maxLength=32 | N/A |
| securityTypes | Array<String> | 0x02 | Supported security type strings. | array.itemType=string | N/A |
| ?bands | Array<String> | 0x03 | Supported Wi-Fi bands. | array.itemType=string | Omit if not used. |
| credentialImportModes | Array<String> | 0x04 | Supported credential import modes such as passphrase, pairing_token, and opaque_ref. | array.itemType=string | N/A |
| savedProfilesSupported | Boolean | 0x05 | Whether saved profiles are supported. | None | N/A |
| scanSupported | Boolean | 0x06 | Whether Wi-Fi scanning is supported. | None | N/A |
| ?autoConnectSupported | Boolean | 0x07 | Whether profiles can auto-connect. | None | Omit if not used. |

---

## NetworkWifiConfig

Saved Wi-Fi profile summary.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi station interface identifier. | maxLength=64 | Omit if not used. |
| ?profiles | Array<NetworkWifiProfile> | 0x02 | NetworkWifiProfile summaries. Plaintext credentials must not be returned. | schema=NetworkWifiProfile, array.itemType=NetworkWifiProfile, array.itemSchema=NetworkWifiProfile | Omit if not used. |
| ?defaultProfileId | String | 0x03 | Default profile identifier. | maxLength=128 | Omit if not used. |

---

## NetworkWifiConfigChangedEvent

Event payload for Wi-Fi profile configuration changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi station interface identifier. | maxLength=64 | Omit if not used. |
| config | NetworkWifiConfig | 0x02 | New Wi-Fi configuration summary. | None | N/A |
| ?changedFields | Array<String> | 0x03 | Changed field paths. | array.itemType=string | Omit if not used. |
| ?reason | Enum | 0x04 | Change reason. | None | Omit if not used. |

---

## NetworkWifiScanResultReportedEvent

Event payload for asynchronous Wi-Fi scan results.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?scanId | String | 0x01 | Scan identifier. | maxLength=128 | Omit if not used. |
| ?results | Array<NetworkWifiScanResult> | 0x02 | NetworkWifiScanResult objects. | schema=NetworkWifiScanResult, array.itemType=NetworkWifiScanResult, array.itemSchema=NetworkWifiScanResult | Omit if not used. |
| complete | Boolean | 0x03 | Whether this event completes the scan. | None | N/A |

---

## NetworkWifiState

Wi-Fi station runtime state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?interfaceId | String | 0x01 | Wi-Fi station interface identifier. | maxLength=64 | Omit if not used. |
| state | Enum | 0x02 | State; candidate values include disabled, disconnected, scanning, authenticating, associating, connected, failed, and unknown. | None | N/A |
| ?profileId | String | 0x03 | Active profile identifier. | maxLength=128 | Omit if not used. |
| ?ssid | String | 0x04 | Active SSID. | maxLength=64 | Omit if not used. |
| ?rssi | Int32 | 0x05 | Received signal strength indicator in dBm. | None | Omit if not used. |
| ?ipReady | Boolean | 0x06 | Whether IP configuration is ready. | None | Omit if not used. |
| ?failureReason | Enum | 0x07 | Failure reason, if state is failed. | None | Omit if not used. |

---

## NetworkWifiStateChangedEvent

Event payload for Wi-Fi station state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| state | NetworkWifiState | 0x01 | New Wi-Fi station state. | None | N/A |
| ?previousState | NetworkWifiState | 0x02 | Previous state. | None | Omit if not used. |
| ?reason | Enum | 0x03 | Change reason. | None | Omit if not used. |

---

## SignageGetPlaylistItemUrlParams

Request to refresh a playlist item URL by itemId.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| itemId | String | 0x01 | Playlist item unique identifier (UUID). | maxLength=64 | N/A |

---

## SignageGetPlaylistItemUrlResult

Refreshed playlist item URL result. The internal structure of settings depends on type.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| type | Enum | 0x01 | Playlist item type used to discriminate the settings structure; candidate values include image, video, website, and unsplash. Clock is excluded from URL refresh. | None | N/A |
| settings | SignagePlaylistItemSettings | 0x02 | Refreshed complete settings; the device may replace the locally cached settings with this value. | None | N/A |

---

## SignagePlaylistCapabilitiesResult

Capability scope for signage.playlist.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supportedItemTypes | Array<String> | 0x01 | Supported playlist item type strings; candidate values include image, website, video, clock, and unsplash. | array.itemType=string | N/A |
| ?maxPlaylists | UInt32 | 0x02 | Maximum number of playlists; product-defined. | None | Omit if not used. |
| ?maxItemsPerPlaylist | UInt32 | 0x03 | Maximum number of playlist items per playlist; product-defined. | None | Omit if not used. |
| supportsScheduledPlaylist | Boolean | 0x04 | Whether scheduled playlists are supported. | None | N/A |
| supportsUrlRefresh | Boolean | 0x05 | Whether playlist item URL refresh (getPlaylistItemUrl) is supported. | None | N/A |
| supportsReset | Boolean | 0x06 | Whether resetting the playlist to default (resetPlaylistConfig) is supported. | None | N/A |

---

## SignagePlaylistCapability

Capability descriptor for signage.playlist.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supportedItemTypes | Array<String> | 0x01 | Supported playlist item type strings; candidate values include image, website, video, clock, and unsplash. | array.itemType=string | N/A |
| ?maxPlaylists | UInt32 | 0x02 | Maximum number of playlists; product-defined. | None | Omit if not used. |
| ?maxItemsPerPlaylist | UInt32 | 0x03 | Maximum number of playlist items per playlist; product-defined. | None | Omit if not used. |
| supportsScheduledPlaylist | Boolean | 0x04 | Whether scheduled playlists are supported. | None | N/A |
| supportsUrlRefresh | Boolean | 0x05 | Whether playlist item URL refresh is supported. | None | N/A |
| supportsReset | Boolean | 0x06 | Whether resetting the playlist to default is supported. | None | N/A |

---

## SignagePlaylistConfigChangedEvent

Event payload emitted when the playlist configuration changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| reason | Enum | 0x01 | Change reason; candidate values include set_config (triggered by setPlaylistConfig) and reset_config (triggered by resetPlaylistConfig). | None | N/A |
| ?playlists | Array<SignagePlaylist> | 0x02 | Optional playlist objects representing the full post-change configuration. The device MAY omit it to shrink the payload; when omitted the client MUST call signage.getPlaylistConfig to reconcile. | schema=SignagePlaylist, array.itemType=SignagePlaylist, array.itemSchema=SignagePlaylist | Omit if not used. |

---

## SignagePlaylistConfigResult

Current playlist configuration snapshot.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| playlists | Array<SignagePlaylist> | 0x01 | Playlist objects. An empty array means no playlist is configured and is not an error. | schema=SignagePlaylist, array.itemType=SignagePlaylist, array.itemSchema=SignagePlaylist | N/A |

---

## SignagePlaylistItemSettings

Aggregated playlist item settings spanning all item types. Only the subset matching the enclosing item type is meaningful; see the per-type rules in the signage.playlist draft.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?urls | Array<String> | 0x01 | image type: non-empty image URLs. | array.itemType=string | Omit if not used. |
| ?delaySeconds | UInt32 | 0x02 | image and unsplash types: per-image display interval in seconds. | min=1 | Default: 5 |
| ?expiresAt | UInt64 | 0x03 | image, video, and unsplash types: Unix timestamp URL expiry. 0 or absent means never expires. | None | Omit if not used. |
| ?url | String | 0x04 | video and website types: media or page URL. | maxLength=2048 | Omit if not used. |
| ?muted | Boolean | 0x05 | video type: whether to play muted. | None | Default: false |
| ?ignoreCertificateError | Boolean | 0x06 | website type: whether to ignore TLS certificate errors. Enabling bypasses certificate validation and carries MITM risk; the default policy and caller permission requirements are product-defined. | None | Default: false |
| ?refreshIntervalSecs | UInt32 | 0x07 | website type: page refresh interval in seconds. 0 or absent means no refresh. | min=1 | Omit if not used. |
| ?clocks | Array<SignagePlaylistClockEntry> | 0x08 | clock type: non-empty playlist clock entry objects. | schema=SignagePlaylistClockEntry, array.itemType=SignagePlaylistClockEntry, array.itemSchema=SignagePlaylistClockEntry | Omit if not used. |
| ?photos | Array<SignagePlaylistUnsplashPhoto> | 0x09 | unsplash type: non-empty playlist unsplash photo objects. | schema=SignagePlaylistUnsplashPhoto, array.itemType=SignagePlaylistUnsplashPhoto, array.itemSchema=SignagePlaylistUnsplashPhoto | Omit if not used. |

---

## SignageSetPlaylistConfigParams

Full replacement payload for signage.setPlaylistConfig.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| playlists | Array<SignagePlaylist> | 0x01 | Playlist objects. MUST be non-empty; an empty array returns INVALID_ARGUMENT. | schema=SignagePlaylist, array.itemType=SignagePlaylist, array.itemSchema=SignagePlaylist | N/A |

---

## SoftwareConfig

Runtime configuration snapshot of a software object. For the launcher target, config carries the LauncherConfig structure (displayName and appearance).

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| target | String | 0x01 | Software object this configuration belongs to. Currently defined value is launcher. | maxLength=64 | N/A |
| config | LauncherConfig | 0x02 | Target-specific configuration fragment. For the launcher target this is the LauncherConfig structure (displayName plus appearance); see the LauncherConfig and LauncherAppearance schemas. | None | N/A |

---

## SoftwareConfigCapability

Capability descriptor for software.config.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supportedTargets | Array<String> | 0x01 | Supported software object target strings; candidate values include launcher, signagePlayer, and agent. | array.itemType=string | N/A |
| ?supportsReset | Boolean | 0x02 | Whether restoring defaults via resetConfig is supported. | None | Omit if not used. |
| ?resetMayRestartSoftware | Boolean | 0x03 | Whether reset may restart the software object (not the device). System-level factory reset is handled by system.restoreFactorySettings. | None | Omit if not used. |

---

## SoftwareConfigChangedEvent

Event payload emitted when a software object configuration changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| target | String | 0x01 | Software object whose configuration changed. | maxLength=64 | N/A |
| config | LauncherConfig | 0x02 | Full post-change configuration fragment (not a patch). For the launcher target this is the LauncherConfig structure; see SoftwareConfig.config. | None | N/A |
| ?changedFields | Array<String> | 0x03 | Optional changed field paths using dot notation for nested levels, e.g. appearance.panelLayout. Omitted when the device cannot compute the diff. | array.itemType=string | Omit if not used. |
| ?reason | Enum | 0x04 | Change reason; candidate values include user_request (triggered by setConfig), restore_default (triggered by resetConfig), device_policy (triggered by device-internal policy), and unknown (default when the reason is not reported). | None | Omit if not used. |

---

## SoftwareGetConfigParams

Request for software.getConfig; selects the software object to read by target.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| target | String | 0x01 | Software object to read. Currently defined value is launcher; other values such as signagePlayer and agent are reserved for future adoption and their config fields are not defined in this version. | maxLength=64 | N/A |

---

## SoftwareGetUpdatePolicyParams

Request for software.getUpdatePolicy; selects the software object to read by target.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| target | String | 0x01 | Software object to read the update policy of. Currently defined value is launcher; other values such as signagePlayer and agent are reserved for future adoption and their policy fields are not defined in this version. | maxLength=64 | N/A |

---

## SoftwareResetConfigParams

Request for software.resetConfig; restores the specified software object to its current-version defaults.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| target | String | 0x01 | Software object to reset. | maxLength=64 | N/A |

---

## SoftwareResetUpdatePolicyParams

Request for software.resetUpdatePolicy; restores the specified software object update policy to its current-version defaults.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| target | String | 0x01 | Software object to reset the update policy of. | maxLength=64 | N/A |

---

## SoftwareSetConfigParams

Request for software.setConfig; applies a partial update to the target software object. Fields absent from config are left unchanged; config itself must be a valid object and does not accept null.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| target | String | 0x01 | Software object to configure. | maxLength=64 | N/A |
| config | LauncherConfig | 0x02 | Target-specific configuration fragment to apply (partial update). For the launcher target this is the LauncherConfig structure; see SoftwareConfig.config and LauncherAppearance. | None | N/A |

---

## SoftwareSetUpdatePolicyParams

Request for software.setUpdatePolicy; applies a partial update to the target software object. Fields absent from policy are left unchanged; policy itself must be a valid object and does not accept null. Within the launcher policy fragment, schedule null explicitly clears the time window and conditions null explicitly clears all prerequisites; omitted means keep current value.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| target | String | 0x01 | Software object to configure the update policy of. | maxLength=64 | N/A |
| policy | LauncherUpdatePolicy | 0x02 | Target-specific update policy fragment to apply (partial update). For the launcher target this is the LauncherUpdatePolicy structure; see SoftwareUpdatePolicy.policy. Within the fragment, schedule null or conditions null explicitly clears those sub-objects while omitted keeps them unchanged. | None | N/A |

---

## SoftwareUpdatePolicy

Update policy snapshot of a software object. For the launcher target, policy carries the LauncherUpdatePolicy structure (updateMode, schedule, channel, conditions). When target is launcher, schedule and conditions may be null to explicitly clear the time window or prerequisites; null is distinct from omitted.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| target | String | 0x01 | Software object this update policy belongs to. | maxLength=64 | N/A |
| policy | LauncherUpdatePolicy | 0x02 | Target-specific update policy fragment. For the launcher target this is the LauncherUpdatePolicy structure (updateMode plus schedule, channel, conditions); see the LauncherUpdatePolicy, UpdateSchedule, and UpdateConditions schemas. | None | N/A |

---

## SoftwareUpdatePolicyCapability

Capability descriptor for software.updatePolicy.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| supportedTargets | Array<String> | 0x01 | Supported software object target strings; candidate values include launcher, signagePlayer, and agent. | array.itemType=string | N/A |
| ?supportedChannels | Array<String> | 0x02 | Optional supported update channel strings; candidate values include release, beta, and alpha. | array.itemType=string | Omit if not used. |
| ?supportsSchedule | Boolean | 0x03 | Whether configuring an update time window via schedule is supported. | None | Omit if not used. |
| ?supportsReset | Boolean | 0x04 | Whether restoring defaults via resetUpdatePolicy is supported. | None | Omit if not used. |

---

## SoftwareUpdatePolicyChangedEvent

Event payload emitted when a software object update policy changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| target | String | 0x01 | Software object whose update policy changed. | maxLength=64 | N/A |
| policy | LauncherUpdatePolicy | 0x02 | Full post-change update policy fragment (not a patch). For the launcher target this is the LauncherUpdatePolicy structure; see SoftwareUpdatePolicy.policy. | None | N/A |
| ?changedFields | Array<String> | 0x03 | Optional changed field paths using dot notation for nested levels, e.g. schedule.start. Omitted when the device cannot compute the diff. | array.itemType=string | Omit if not used. |
| ?reason | Enum | 0x04 | Change reason; candidate values include user_request (triggered by setUpdatePolicy), restore_default (triggered by resetUpdatePolicy), device_policy (triggered by device-internal policy), and unknown (default when the reason is not reported). | None | Omit if not used. |

---

## StreamAbortParams

Request payload for aborting a STREAM runtime context.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data-plane stream identifier. | None | N/A |
| ?reason | Enum | 0x02 | Abort reason. | enum=timeout/peerClosed/transportLost/userRequest/profileFailure/unknown | Omit if not used. |
| ?message | String | 0x03 | Optional diagnostic message. | maxLength=256 | Omit if not used. |

---

## StreamAckParams

Request payload for acknowledging received STREAM packet ranges.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data-plane stream identifier. | None | N/A |
| ackedSeqId | UInt32 | 0x02 | Highest contiguous STREAM seqId received. | None | N/A |
| ?ackedCursor | UInt64 | 0x03 | Optional cursor value associated with ackedSeqId. | None | Omit if not used. |
| ?missingSeqIds | Array<UInt32> | 0x04 | Optional sparse list of missing seqId values for diagnostics. | array.itemType=uint32 | Omit if not used. |

---

## StreamAckResult

Result of a STREAM ACK update.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| accepted | Boolean | 0x01 | Whether the ACK update was accepted. | None | N/A |
| ?state | StreamState | 0x02 | Updated STREAM runtime state, when returned. | None | Omit if not used. |

---

## StreamActionResult

Result of a pause, resume, or abort action.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| accepted | Boolean | 0x01 | Whether the action was accepted. | None | N/A |
| ?state | StreamState | 0x02 | Updated STREAM runtime state, when returned. | None | Omit if not used. |

---

## StreamClockMediaAnchor

One media timeline anchor carried by stream.clockReport.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?streamId | UInt32 | 0x01 | STREAM data-plane stream identifier for this media timeline. | None | Omit if not used. |
| mediaPts | UInt64 | 0x02 | Media PTS at the anchor point; audio derivedFromSeq uses sample-count PTS, video sameAsCursor uses capture timestamp PTS. | None | N/A |
| timebase | UInt32 | 0x03 | Media PTS timebase in ticks per second, such as 48000 for audio or 1000000 for video. | None | N/A |
| anchorNt10MonotonicUs | UInt64 | 0x04 | NT10 source monotonic timestamp corresponding to mediaPts. | None | N/A |
| ?seqId | UInt32 | 0x05 | Optional STREAM seqId associated with the media anchor. | None | Omit if not used. |
| ?cursor | UInt64 | 0x06 | Optional STREAM cursor associated with the media anchor. | None | Omit if not used. |

---

## StreamClockReportEvent

Latest-wins timing sample linking NT10 media anchors, NT10 source clock, NA20 relay clock, and receiver arrival time.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| reportSeq | UInt32 | 0x01 | Source or relay report sequence number. | None | N/A |
| ?syncGroupId | String | 0x02 | Synchronization group that links related audio and video streams. | maxLength=128 | Omit if not used. |
| ?sourceDeviceId | String | 0x03 | Source device identifier, such as NT10. | maxLength=128 | Omit if not used. |
| ?sourceClockDomain | String | 0x04 | Source monotonic clock domain for this report. | maxLength=128 | Omit if not used. |
| nt10ReportMonotonicUs | UInt64 | 0x05 | NT10 source monotonic timestamp sampled when the report was produced. | None | N/A |
| ?sentAtNt10MonotonicUs | UInt64 | 0x06 | NT10 source monotonic timestamp sampled when the report was sent to NA20. | None | Omit if not used. |
| ?na20ReceivedAtUs | UInt64 | 0x07 | NA20 monotonic timestamp sampled when the source report or associated media anchor was received. | None | Omit if not used. |
| ?na20SentAtUs | UInt64 | 0x08 | NA20 monotonic timestamp sampled when the AXTP event was sent to MediaHost. | None | Omit if not used. |
| ?audio | StreamClockMediaAnchor | 0x09 | Optional audio media timeline anchor. | None | Omit if not used. |
| ?video | StreamClockMediaAnchor | 0x0A | Optional video media timeline anchor. | None | Omit if not used. |
| ?discontinuity | Boolean | 0x0B | Whether this report follows a media or source clock discontinuity. | None | Default: false |
| ?reason | Enum | 0x0C | Report reason. | enum=periodic/streamOpened/streamResumed/discontinuity/sourceReset/diagnosticSample/unknown | Omit if not used. |

---

## StreamFlowControlCapabilities

Common STREAM runtime flow-control and diagnostics capability summary.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| capability | String | 0x01 | Fixed capability name stream.flowControl. | maxLength=32 | N/A |
| supportsAck | Boolean | 0x02 | Whether stream.ack is supported. | None | N/A |
| supportsWindowUpdate | Boolean | 0x03 | Whether stream.windowUpdate is supported. | None | N/A |
| supportsPauseResume | Boolean | 0x04 | Whether stream.pause and stream.resume are supported. | None | N/A |
| supportsAbort | Boolean | 0x05 | Whether stream.abort is supported. | None | N/A |
| supportsStats | Boolean | 0x06 | Whether stream.getState, stream.getStats, and stats events are supported. | None | N/A |
| supportsClockReport | Boolean | 0x07 | Whether stream.clockReport timing samples are supported. | None | N/A |
| ?defaultWindowBytes | UInt32 | 0x08 | Default receive window in bytes, if advertised. | None | Omit if not used. |
| ?clockReportIntervalMs | UInt32 | 0x09 | Suggested clock-report interval in milliseconds. | None | Omit if not used. |

---

## StreamFlowControlChangedEvent

Event payload for ACK, window, pause, or resume changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data-plane stream identifier. | None | N/A |
| ?reason | Enum | 0x02 | Flow-control change reason. | enum=ack/windowUpdate/pause/resume/bufferPressure/bufferAvailable/diagnosticSample/unknown | Omit if not used. |
| ?state | StreamState | 0x03 | Updated STREAM runtime state, when returned. | None | Omit if not used. |

---

## StreamPauseParams

Request payload for pausing a STREAM runtime context.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data-plane stream identifier. | None | N/A |
| ?reason | Enum | 0x02 | Pause reason. | enum=bufferPressure/userRequest/diagnostic/unknown | Omit if not used. |

---

## StreamResumeParams

Request payload for resuming a STREAM runtime context.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data-plane stream identifier. | None | N/A |
| ?reason | Enum | 0x02 | Resume reason. | enum=bufferAvailable/userRequest/diagnostic/unknown | Omit if not used. |

---

## StreamSelector

Selector for a STREAM runtime context; omit streamId for aggregate state when the method allows it.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?streamId | UInt32 | 0x01 | STREAM data-plane stream identifier. | None | Omit if not used. |

---

## StreamState

Common runtime state for a STREAM context or aggregate stream runtime.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?streamId | UInt32 | 0x01 | STREAM data-plane stream identifier, omitted for aggregate state. | None | Omit if not used. |
| state | Enum | 0x02 | Common STREAM runtime state. | enum=opening/streaming/paused/draining/closing/closed/aborted/failed/aggregate | N/A |
| ?paused | Boolean | 0x03 | Whether data-plane sending is currently paused. | None | Omit if not used. |
| ?windowBytes | UInt32 | 0x04 | Current advertised receive window or sender credit in bytes. | None | Omit if not used. |
| ?ackedSeqId | UInt32 | 0x05 | Highest contiguous STREAM seqId acknowledged by the receiver. | None | Omit if not used. |
| ?lastSeqId | UInt32 | 0x06 | Last observed or sent STREAM seqId. | None | Omit if not used. |
| ?lastCursor | UInt64 | 0x07 | Last observed STREAM cursor value. | None | Omit if not used. |
| ?reason | Enum | 0x08 | Reason associated with the current state or last state change. | enum=ack/windowUpdate/pause/resume/abort/timeout/peerClosed/transportLost/diagnosticSample/unknown | Omit if not used. |

---

## StreamStateChangedEvent

Event payload for common STREAM runtime state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?streamId | UInt32 | 0x01 | STREAM data-plane stream identifier, omitted for aggregate state changes. | None | Omit if not used. |
| state | StreamState | 0x02 | New STREAM runtime state. | None | N/A |

---

## StreamStats

Bounded STREAM transport-level runtime statistics.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?streamId | UInt32 | 0x01 | STREAM data-plane stream identifier, omitted for aggregate stats. | None | Omit if not used. |
| ?packets | UInt64 | 0x02 | Number of STREAM packets observed. | None | Omit if not used. |
| ?bytes | UInt64 | 0x03 | Number of STREAM payload bytes observed. | None | Omit if not used. |
| ?droppedPackets | UInt64 | 0x04 | Number of dropped STREAM packets. | None | Omit if not used. |
| ?seqGaps | UInt64 | 0x05 | Number of detected seqId gaps. | None | Omit if not used. |
| ?jitterMs | UInt32 | 0x06 | Estimated transport jitter in milliseconds. | None | Omit if not used. |
| ?lastSeqId | UInt32 | 0x07 | Last observed STREAM seqId. | None | Omit if not used. |
| ?lastCursor | UInt64 | 0x08 | Last observed STREAM cursor value. | None | Omit if not used. |
| ?latestClockReportAgeMs | UInt32 | 0x09 | Age of the latest clock report sample known to the receiver. | None | Omit if not used. |

---

## StreamStatsReportedEvent

Event payload for common STREAM statistics reports.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?streamId | UInt32 | 0x01 | STREAM data-plane stream identifier, omitted for aggregate stats. | None | Omit if not used. |
| stats | StreamStats | 0x02 | Bounded STREAM transport-level statistics. | None | N/A |

---

## StreamWindowUpdateParams

Request payload for updating receive window or sender credit.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data-plane stream identifier. | None | N/A |
| windowBytes | UInt32 | 0x02 | Advertised receive window or sender credit in bytes. | None | N/A |
| ?reason | Enum | 0x03 | Reason for the window update. | enum=bufferAvailable/bufferPressure/manualFlowControl/diagnosticSample/unknown | Omit if not used. |

---

## StreamWindowUpdateResult

Result of a STREAM window update.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| accepted | Boolean | 0x01 | Whether the window update was accepted. | None | N/A |
| ?state | StreamState | 0x02 | Updated STREAM runtime state, when returned. | None | Omit if not used. |

---

## UpdateConditions

Automatic update prerequisites, nested under LauncherUpdatePolicy.conditions.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?requireIdle | Boolean | 0x01 | Whether the device must be idle before performing an update. | None | Default: true |
| ?requireWifi | Boolean | 0x02 | Whether updates may only be downloaded over a Wi-Fi network. | None | Default: false |

---

## UpdateSchedule

Automatic update time window, nested under LauncherUpdatePolicy.schedule.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| start | String | 0x01 | Window start time in local time, matching the regex ^([01]\d\|2[0-3]):[0-5]\d$ (HH:mm). A value that does not match returns INVALID_ARGUMENT. | None | N/A |
| end | String | 0x02 | Window end time in local time, matching the regex ^([01]\d\|2[0-3]):[0-5]\d$ (HH:mm). A value that does not match returns INVALID_ARGUMENT. When end is earlier than start it denotes a cross-midnight window (from start on the current day to end on the next day). | None | N/A |
| ?timezone | String | 0x03 | IANA timezone ID. Omitted means the device local timezone. | None | Omit if not used. |

---

## VideoCloseStreamParams

Request to close a video stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |
| ?peerRole | Enum | 0x02 | Peer role in this stream. | None | Omit if not used. |
| ?reason | Enum | 0x03 | Close reason. | enum=receiver_closed/user_stop/not_needed/source_disconnected/producer_stopped/session_lost/receiver_timeout/encodingReconfigure/error | Omit if not used. |
| ?finalCursor | UInt64 | 0x04 | Last processed cursor value. | None | Omit if not used. |

---

## VideoCloseStreamResult

Result of closing a video stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | Closed stream identifier. | None | N/A |
| state | Enum | 0x02 | Close state, such as closing, closed, or failed. | None | N/A |
| ?reason | Enum | 0x03 | Final close reason. | enum=receiver_closed/user_stop/not_needed/source_disconnected/producer_stopped/session_lost/receiver_timeout/encodingReconfigure/error | Omit if not used. |
| ?alreadyClosed | Boolean | 0x04 | Whether the stream was already terminal before this request. | None | Default: false |

---

## VideoGetStreamCapabilitiesParams

Selector for video stream capability.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?source | String | 0x01 | Optional video source identifier; omit to query all visible sources. | maxLength=128 | Omit if not used. |
| ?includeRuntimeState | Boolean | 0x02 | Whether to include current source runtime state. | None | Default: false |

---

## VideoGetStreamSourceStateParams

Selector for video source runtime state.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| source | String | 0x01 | Video source identifier. | maxLength=128 | N/A |

---

## VideoGetStreamStateParams

Selector for a video stream state query.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |

---

## VideoOpenStreamParams

Request to open a real-time video stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| source | String | 0x01 | Video source identifier. | maxLength=128 | N/A |
| peerRole | Enum | 0x02 | Requested peer media role; values include receiver and transmitter. | None | N/A |
| codec | Enum | 0x03 | Requested video codec, such as h264, h265, mjpeg, or raw. | None | N/A |
| ?width | UInt32 | 0x04 | Requested frame width in pixels. | None | Omit if not used. |
| ?height | UInt32 | 0x05 | Requested frame height in pixels. | None | Omit if not used. |
| ?frameRate | UInt32 | 0x06 | Requested frame rate for the selected video encoder target; zero is invalid and omission uses the source/session default. | min=1 | Omit if not used. |
| ?bitrateKbps | UInt32 | 0x07 | Requested bitrate in kbps for the selected video encoder target; zero is invalid and omission uses the source/session default. | min=1 | Omit if not used. |
| ?streamProfile | String | 0x08 | STREAM profile name. | maxLength=64 | Default: "media.video" |
| ?cursorUnit | Enum | 0x09 | STREAM cursor unit, such as timestampUs or frameIndex. | None | Omit if not used. |
| ?syncGroupId | String | 0x0A | Optional synchronization group identifier. | maxLength=128 | Omit if not used. |
| ?castSessionId | String | 0x0B | Optional cast session identifier. | maxLength=128 | Omit if not used. |
| ?clockDomain | String | 0x0C | Source media clock domain. | maxLength=128 | Omit if not used. |
| ?maxDataSize | UInt32 | 0x0D | Preferred maximum STREAM payload data size. | None | Omit if not used. |
| ?videoPtsMode | Enum | 0x0E | Video PTS mode; NA20/NT10 MVP uses sameAsCursor. | None | Default: "sameAsCursor" |
| ?timebase | UInt32 | 0x0F | Video PTS timebase in ticks per second. | None | Default: 1000000 |
| ?packetizationMode | Enum | 0x10 | Video packetization mode; NA20/NT10 MVP uses completeFrame. | None | Default: "completeFrame" |

---

## VideoOpenStreamResult

Result of opening a real-time video stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |
| state | Enum | 0x02 | Initial state, normally opening or streaming. | None | N/A |
| source | String | 0x03 | Bound source identifier. | maxLength=128 | N/A |
| peerRole | Enum | 0x04 | Confirmed peer media role. | None | N/A |
| codec | Enum | 0x05 | Negotiated codec. | None | N/A |
| ?width | UInt32 | 0x06 | Negotiated frame width. | None | Omit if not used. |
| ?height | UInt32 | 0x07 | Negotiated frame height. | None | Omit if not used. |
| ?frameRate | UInt32 | 0x08 | Negotiated frame rate; zero is invalid and omission means the source/session default was used. | min=1 | Omit if not used. |
| ?bitrateKbps | UInt32 | 0x09 | Negotiated bitrate in kbps; zero is invalid and omission means the source/session default was used. | min=1 | Omit if not used. |
| streamProfile | String | 0x0A | Normalized stream profile. | maxLength=64 | N/A |
| cursorUnit | Enum | 0x0B | STREAM cursor unit. | None | N/A |
| ?syncGroupId | String | 0x0C | Synchronization group identifier. | maxLength=128 | Omit if not used. |
| ?maxDataSize | UInt32 | 0x0D | Negotiated maximum STREAM payload data size. | None | Omit if not used. |
| ?videoPtsMode | Enum | 0x0E | Negotiated video PTS mode. | None | Omit if not used. |
| ?timebase | UInt32 | 0x0F | Negotiated video PTS timebase in ticks per second. | None | Omit if not used. |
| ?packetizationMode | Enum | 0x10 | Negotiated video packetization mode. | None | Omit if not used. |

---

## VideoRequestKeyFrameParams

Request a key frame for an active video stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |
| ?reason | Enum | 0x02 | Request reason. | None | Omit if not used. |

---

## VideoRequestKeyFrameResult

Result of a key frame request.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| accepted | Boolean | 0x01 | Whether the request was accepted. | None | N/A |
| ?state | VideoStreamState | 0x02 | Current or updated stream state. | None | Omit if not used. |

---

## VideoStreamCapabilities

Device-level video.stream capability summary.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| capability | String | 0x01 | Fixed capability name video.stream. | maxLength=32 | N/A |
| sources | Array<VideoStreamSource> | 0x02 | Video stream source objects. | schema=VideoStreamSource, array.itemType=VideoStreamSource, array.itemSchema=VideoStreamSource | N/A |
| streamProfiles | Array<String> | 0x03 | Supported stream profiles, normally media.video. | array.itemType=string | N/A |
| openModes | Array<String> | 0x04 | Supported open modes, such as producer_open and receiver_pull. | array.itemType=string | N/A |
| peerRoles | Array<String> | 0x05 | Peer roles, such as receiver and transmitter. | array.itemType=string | N/A |
| supportsSourceStateEvent | Boolean | 0x06 | Whether video.streamSourceStateChanged is supported. | None | N/A |
| supportsSyncGroup | Boolean | 0x07 | Whether video streams can share a synchronization group with audio streams. | None | N/A |
| flowControlManagedByRuntime | Boolean | 0x08 | Whether normal applications can rely on runtime-managed STREAM flow control. | None | N/A |
| ?supportedVideoPtsModes | Array<String> | 0x09 | Optional video PTS modes such as sameAsCursor and explicit. | array.itemType=string | Omit if not used. |
| ?supportedPacketizationModes | Array<String> | 0x0A | Optional video packetization modes such as completeFrame. | array.itemType=string | Omit if not used. |
| ?supportsSourceCaptureTimestampCursor | Boolean | 0x0B | Whether STREAM cursorUnit sourceCaptureTimestampUs is supported. | None | Omit if not used. |

---

## VideoStreamSourceState

Runtime state of a video stream source.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| source | String | 0x01 | Video source identifier. | maxLength=128 | N/A |
| ?mediaKind | Enum | 0x02 | Media kind, normally video. | None | Omit if not used. |
| state | Enum | 0x03 | Source state, such as unavailable, available, receiving, stopped, or failed. | None | N/A |
| ?available | Boolean | 0x04 | Whether the source is available for openStream. | None | Omit if not used. |
| ?activeStreamId | UInt32 | 0x05 | Active downstream stream id, if any. | None | Omit if not used. |

---

## VideoStreamSourceStateChangedEvent

Event payload for video stream source state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| source | String | 0x01 | Video source identifier. | maxLength=128 | N/A |
| ?mediaKind | Enum | 0x02 | Media kind, normally video. | None | Omit if not used. |
| state | Enum | 0x03 | New source state. | None | N/A |
| ?reason | Enum | 0x04 | Source state change reason. | None | Omit if not used. |
| ?activeStreamId | UInt32 | 0x05 | Active downstream stream id, if any. | None | Omit if not used. |

---

## VideoStreamState

Runtime state of one video stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |
| state | Enum | 0x02 | Stream state, such as opening, streaming, closing, closed, or failed. | None | N/A |
| source | String | 0x03 | Bound video source. | maxLength=128 | N/A |
| ?peerRole | Enum | 0x04 | Peer media role. | None | Omit if not used. |
| ?codec | Enum | 0x05 | Negotiated video codec. | None | Omit if not used. |
| ?streamProfile | String | 0x06 | Stream profile. | maxLength=64 | Omit if not used. |
| ?syncGroupId | String | 0x07 | Synchronization group identifier. | maxLength=128 | Omit if not used. |
| ?cursorUnit | Enum | 0x08 | STREAM cursor unit. | None | Omit if not used. |
| ?lastCursor | UInt64 | 0x09 | Last known cursor value. | None | Omit if not used. |
| ?keyFrameRequested | Boolean | 0x0A | Whether a key frame has been requested and is pending. | None | Omit if not used. |
| ?failureReason | Enum | 0x0B | Failure reason when state is failed. | None | Omit if not used. |
| ?frameRate | UInt32 | 0x0C | Effective negotiated video frame rate; zero is invalid and omission means the source/session default was used. | min=1 | Omit if not used. |
| ?bitrateKbps | UInt32 | 0x0D | Effective negotiated video bitrate in kbps; zero is invalid and omission means the source/session default was used. | min=1 | Omit if not used. |

---

## VideoStreamStateChangedEvent

Event payload for video stream state changes.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |
| state | Enum | 0x02 | New stream state. | None | N/A |
| source | String | 0x03 | Bound video source. | maxLength=128 | N/A |
| ?reason | Enum | 0x04 | State change reason. | None | Omit if not used. |
| ?stats | VideoStreamStats | 0x05 | Optional bounded stream statistics. | None | Omit if not used. |
| ?frameRate | UInt32 | 0x06 | Effective video frame rate at the time of this event; zero is invalid and omission means the source/session default was used. | min=1 | Omit if not used. |
| ?bitrateKbps | UInt32 | 0x07 | Effective video bitrate in kbps at the time of this event; zero is invalid and omission means the source/session default was used. | min=1 | Omit if not used. |

---

## VideoStreamStats

Bounded runtime statistics for a video stream.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| ?frames | UInt64 | 0x01 | Number of frames observed. | None | Omit if not used. |
| ?bytes | UInt64 | 0x02 | Number of STREAM payload bytes observed. | None | Omit if not used. |
| ?droppedFrames | UInt64 | 0x03 | Number of dropped frames. | None | Omit if not used. |
| ?bitrateKbps | UInt32 | 0x04 | Estimated bitrate in kbps. | None | Omit if not used. |

---

## VideoStreamStatsReportedEvent

Event payload for video stream statistics reports.

| Name | Type | Field ID | Description | Value Restrictions | ?Default Behavior |
| ---- | :---: | :---: | ---- | :---: | ---- |
| streamId | UInt32 | 0x01 | STREAM data plane stream identifier. | None | N/A |
| stats | VideoStreamStats | 0x02 | Bounded stream statistics. | None | N/A |

---

# Errors Reference

| Code | Name | Category | Severity | Retryable | Status | Message |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| 0x0000 | SUCCESS | common | info | No | stable | Operation completed successfully. |
| 0x0001 | UNKNOWN_ERROR | common | error | No | stable | Unknown error. |
| 0x0002 | NOT_IMPLEMENTED | common | error | No | stable | Feature is not implemented. |
| 0x0003 | NOT_SUPPORTED | common | error | No | stable | Canonical error new senders use when a registered operation is unavailable under the current runtime, device, profile, mode, or capability set; the session remains usable. |
| 0x0004 | INVALID_STATE | common | error | No | stable | Operation is not allowed in the current state. |
| 0x0005 | BUSY | common | warning | Yes | stable | Device or resource is busy. |
| 0x0006 | TIMEOUT | common | warning | Yes | stable | Operation timed out. |
| 0x0007 | CANCELED | common | error | No | stable | Operation was canceled. |
| 0x0008 | RESOURCE_EXHAUSTED | common | warning | Yes | stable | Resource is exhausted. |
| 0x0009 | PERMISSION_DENIED | common | error | No | stable | Permission denied. |
| 0x000A | INVALID_ARGUMENT | common | error | No | stable | Argument is invalid. |
| 0x000B | OUT_OF_RANGE | common | error | No | stable | Argument is out of range. |
| 0x000C | NOT_FOUND | common | error | No | stable | Resource was not found. |
| 0x000E | INTERNAL_ERROR | common | error | No | stable | Internal error. |
| 0x0011 | FRAME_MAGIC_INVALID | frame | error | No | stable | Frame magic is invalid. |
| 0x0012 | FRAME_VERSION_UNSUPPORTED | frame | error | No | stable | Frame version is not supported. |
| 0x0013 | FRAME_HEADER_INVALID | frame | error | No | stable | Frame header is invalid. |
| 0x0014 | FRAME_LENGTH_INVALID | frame | error | No | stable | Frame payload length or total length is invalid. |
| 0x0015 | FRAME_PAYLOAD_TYPE_INVALID | frame | error | No | stable | Frame payload type is invalid. |
| 0x0016 | FRAME_CRC_ERROR | frame | warning | Yes | stable | Frame CRC check failed. |
| 0x0017 | FRAME_FRAGMENT_INVALID | frame | error | No | stable | Frame fragment metadata is invalid. |
| 0x0018 | FRAME_FRAGMENT_MISSING | frame | warning | Yes | stable | One or more frame fragments are missing. |
| 0x0019 | FRAME_REASSEMBLY_TIMEOUT | frame | warning | Yes | stable | Frame reassembly timed out. |
| 0x001A | FRAME_TOO_LARGE | frame | error | No | stable | Frame exceeds the negotiated maximum size. |
| 0x001B | TRANSPORT_MTU_EXCEEDED | frame | error | No | stable | Transport MTU was exceeded. |
| 0x001E | TRANSPORT_DISCONNECTED | frame | warning | Yes | stable | Transport disconnected. |
| 0x0021 | CONTROL_OPCODE_INVALID | control | error | No | stable | Control opcode is invalid. |
| 0x0022 | CONTROL_PAYLOAD_INVALID | control | error | No | stable | Control payload is invalid. |
| 0x0024 | CONTROL_OPEN_REQUIRED | control | error | No | stable | Session has not completed CONTROL OPEN. |
| 0x0025 | CONTROL_OPEN_REJECTED | control | error | No | stable | Control OPEN was rejected. |
| 0x0027 | CONTROL_NEGOTIATION_FAILED | control | error | No | stable | Control negotiation failed. |
| 0x0028 | CONTROL_SESSION_INVALID | control | error | No | stable | SessionId is invalid. |
| 0x0029 | CONTROL_SESSION_EXPIRED | control | error | No | stable | Session has expired. |
| 0x002A | CONTROL_RESUME_FAILED | control | error | No | stable | Session resume failed. |
| 0x002B | CONTROL_ACK_TARGET_INVALID | control | error | No | stable | ACK/NACK target type is invalid. |
| 0x002C | CONTROL_WINDOW_EXCEEDED | control | warning | Yes | stable | Flow-control window was exceeded. |
| 0x002D | CONTROL_HEARTBEAT_TIMEOUT | control | warning | Yes | stable | Control heartbeat timed out. |
| 0x0031 | RPC_ENCODING_UNSUPPORTED | rpc | error | No | stable | RPC encoding is not supported. |
| 0x0032 | RPC_OP_INVALID | rpc | error | No | stable | RPC operation is invalid. |
| 0x0033 | RPC_PAYLOAD_INVALID | rpc | error | No | stable | RPC payload is invalid. |
| 0x0034 | RPC_BODY_ENCODING_UNSUPPORTED | rpc | error | No | stable | RPC body encoding is not supported. |
| 0x0035 | RPC_BODY_DECODE_FAILED | rpc | error | No | stable | RPC body decoding failed. |
| 0x0036 | RPC_METHOD_NOT_FOUND | rpc | error | No | stable | MethodId or method name is not registered; do not use for a registered but currently unavailable method. |
| 0x0037 | RPC_METHOD_NOT_SUPPORTED | rpc | error | No | stable | Compatibility error for a registered but unsupported method. Receivers must continue to decode it; new senders use common NOT_SUPPORTED. |
| 0x0039 | RPC_REQUEST_ID_INVALID | rpc | error | No | stable | RPC requestId is invalid. |
| 0x003A | RPC_PARAM_MISSING | rpc | error | No | stable | Required RPC parameter is missing. |
| 0x003B | RPC_PARAM_INVALID | rpc | error | No | stable | RPC parameters are invalid. |
| 0x003C | RPC_PARAM_OUT_OF_RANGE | rpc | error | No | stable | RPC parameter is out of range. |
| 0x003D | RPC_EXECUTION_FAILED | rpc | error | No | stable | RPC method execution failed. |
| 0x003E | RPC_RESPONSE_TIMEOUT | rpc | warning | Yes | stable | RPC response timed out. |
| 0x0101 | DEVICE_INFO_UNAVAILABLE | device | warning | Yes | stable | Device information is unavailable. |
| 0x0106 | DEVICE_STORAGE_FULL | device | error | No | stable | Device storage is full. |
| 0x0107 | DEVICE_MODE_CONFLICT | device | error | No | stable | Device mode conflicts with the requested operation. |
| 0x0108 | DEVICE_RESOURCE_BUSY | device | warning | Yes | stable | Device resource is busy. |
| 0x0201 | CAPABILITY_NOT_FOUND | capability | error | No | stable | Capability does not exist. |
| 0x0202 | CAPABILITY_DOMAIN_NOT_FOUND | capability | error | No | stable | Capability domain does not exist. |
| 0x0203 | CAPABILITY_METHOD_UNSUPPORTED | capability | error | No | stable | Compatibility error for an unsupported method capability. Receivers must continue to decode it; new senders use common NOT_SUPPORTED. |
| 0x0204 | CAPABILITY_EVENT_UNSUPPORTED | capability | error | No | stable | Event capability is not supported. |
| 0x0205 | CAPABILITY_STREAM_UNSUPPORTED | capability | error | No | stable | Stream capability is not supported. |
| 0x0206 | CAPABILITY_ENCODING_UNSUPPORTED | capability | error | No | stable | Encoding capability is not supported. |
| 0x0207 | CAPABILITY_NEGOTIATION_FAILED | capability | error | No | stable | Business capability negotiation failed. |
| 0x0208 | CAPABILITY_LIMIT_EXCEEDED | capability | error | No | stable | Capability limit was exceeded. |
| 0x0401 | FW_IMAGE_INVALID | firmware | error | No | stable | Firmware image is invalid. |
| 0x0402 | FW_IMAGE_TYPE_UNSUPPORTED | firmware | error | No | stable | Firmware image type is not supported. |
| 0x0403 | FW_VERSION_UNSUPPORTED | firmware | error | No | stable | Firmware version is not supported. |
| 0x0405 | FW_TRANSFER_NOT_STARTED | firmware | error | No | stable | Firmware transfer has not started. |
| 0x0407 | FW_CHUNK_INVALID | firmware | error | No | stable | Firmware chunk is invalid. |
| 0x0408 | FW_CHUNK_CRC_ERROR | firmware | warning | Yes | stable | Firmware chunk CRC failed. |
| 0x0409 | FW_SIZE_MISMATCH | firmware | error | No | stable | Firmware size does not match the declared size. |
| 0x040A | FW_HASH_MISMATCH | firmware | error | No | stable | Firmware hash does not match the declared verification value. |
| 0x040B | FW_VERIFY_FAILED | firmware | error | No | stable | Firmware verification failed. |
| 0x040C | FW_APPLY_FAILED | firmware | error | No | stable | Firmware apply failed. |
| 0x040E | FW_STORAGE_NOT_ENOUGH | firmware | error | No | stable | Not enough storage for firmware update. |
| 0x040F | FW_DEVICE_NOT_READY | firmware | warning | Yes | stable | Device is not ready for firmware update. |
| 0x0501 | STREAM_NOT_FOUND | stream | error | No | stable | Stream context does not exist. |
| 0x0502 | STREAM_TIMEOUT | stream | warning | Yes | stable | Stream timed out. |
| 0x0503 | STREAM_CRC_ERROR | stream | warning | Yes | stable | Stream chunk CRC check failed. |
| 0x0504 | STREAM_PAYLOAD_INVALID | stream | error | No | stable | Stream payload is invalid. |
| 0x0505 | STREAM_ID_INVALID | stream | error | No | stable | StreamId is invalid. |
| 0x0506 | STREAM_NOT_OPEN | stream | error | No | stable | Stream is not open. |
| 0x0508 | STREAM_SEQ_INVALID | stream | error | No | stable | Stream seqId is invalid. |
| 0x050A | STREAM_CHUNK_MISSING | stream | warning | Yes | stable | Stream chunk is missing. |
| 0x050B | STREAM_OFFSET_INVALID | stream | error | No | stable | Stream cursor or offset is invalid. |
| 0x050C | STREAM_WINDOW_FULL | stream | warning | Yes | stable | Stream receive window is full. |
| 0x050E | STREAM_RESUME_UNSUPPORTED | stream | error | No | stable | Stream resume is not supported. |
| 0x050F | STREAM_RESUME_FAILED | stream | error | No | stable | Stream resume failed. |
| 0x0510 | STREAM_CLOSED | stream | error | No | stable | Stream is closed. |
| 0x0511 | STREAM_TRANSFER_ABORTED | stream | error | No | stable | Stream transfer was aborted. |
| 0x0801 | MEDIA_SOURCE_NOT_FOUND | video | error | No | stable | Requested media source does not exist. |
| 0x0802 | MEDIA_SOURCE_UNAVAILABLE | video | warning | Yes | stable | Requested media source is currently unavailable. |
| 0x0803 | MEDIA_CODEC_UNSUPPORTED | video | error | No | stable | Requested media codec or sample format is unsupported. |
| 0x0804 | MEDIA_RESOLUTION_UNSUPPORTED | video | error | No | stable | Requested video resolution is unsupported. |
| 0x0805 | MEDIA_FRAMERATE_UNSUPPORTED | video | error | No | stable | Requested video frame rate is unsupported. |
| 0x0806 | MEDIA_BITRATE_UNSUPPORTED | video | error | No | stable | Requested media bitrate is unsupported. |
| 0x0807 | MEDIA_STREAM_START_FAILED | video | warning | Yes | stable | Device failed to start the requested media stream. |
| 0x1001 | FILE_NOT_FOUND | file | error | No | stable | File does not exist. |
| 0x1003 | FILE_PERMISSION_DENIED | file | error | No | stable | File permission denied. |
| 0x1004 | FILE_PATH_INVALID | file | error | No | stable | File path is invalid. |
| 0x1005 | FILE_TYPE_UNSUPPORTED | file | error | No | stable | File type is not supported. |
| 0x1006 | FILE_TOO_LARGE | file | error | No | stable | File is too large. |
| 0x1007 | FILE_READ_FAILED | file | warning | Yes | stable | File read failed. |
| 0x1008 | FILE_WRITE_FAILED | file | warning | Yes | stable | File write failed. |
| 0x100A | FILE_TRANSFER_FAILED | file | warning | Yes | stable | File transfer failed. |
| 0x100B | FILE_VERIFY_FAILED | file | error | No | stable | File verification failed. |
| 0x100C | FILE_STORAGE_FULL | file | error | No | stable | File storage is full. |
| 0x7F01 | LEGACY_CMD_UNMAPPED | legacy | error | No | stable | Legacy CmdValue is not mapped to an AXTP method. |
| 0x7F02 | LEGACY_STATUS_UNMAPPED | legacy | error | No | stable | Legacy status is not mapped to an AXTP ErrorCode. |
| 0x7F03 | LEGACY_PAYLOAD_INVALID | legacy | error | No | stable | Legacy payload is invalid. |
| 0x7F04 | LEGACY_PAYLOAD_TOO_SHORT | legacy | error | No | stable | Legacy payload is too short. |
| 0x7F05 | LEGACY_PAYLOAD_TOO_LONG | legacy | error | No | stable | Legacy payload is too long. |
| 0x7F06 | LEGACY_FIELD_UNSUPPORTED | legacy | error | No | stable | Legacy field cannot be adapted. |
| 0x7F07 | LEGACY_CAPABILITY_CONFLICT | legacy | error | No | stable | Legacy capability conflicts with AXTP capability. |
| 0x7F08 | LEGACY_RESPONSE_TIMEOUT | legacy | warning | Yes | stable | Legacy response timed out. |

# Profiles Reference

## AXTP-MVP

- Status: `stable`
- Added in v1.0.0
- Extends: `-`
- Required Methods: `None`
- Required Events: `None`
- Required Errors: `SUCCESS`, `RPC_METHOD_NOT_FOUND`, `RPC_PARAM_INVALID`, `STREAM_NOT_FOUND`, `STREAM_CRC_ERROR`, `BUSY`
- Notes: -

---

## AXTP-MVP-HID

- Status: `stable`
- Added in v1.0.0
- Extends: `AXTP-MVP`
- Required Methods: `None`
- Required Events: `None`
- Required Errors: `SUCCESS`, `RPC_METHOD_NOT_FOUND`, `RPC_PARAM_INVALID`, `STREAM_NOT_FOUND`, `STREAM_CRC_ERROR`, `BUSY`
- Notes: -

---

# AXTP G4 Golden Vector Derivation Design

Status: **APPROVED DESIGN / IMPLEMENTATION AUTHORITY FOR G4**  
Date: 2026-08-26  
Gate: G4 — Derivation & Golden Vector Closure  
Primary finding: `AXTP-GOV-003`

## 1. Stage contract

**Role**: P35 defect classification → P20 verification design → P30/P32 derivation repair → P34 Gate review.  
**Authority**: current `specs/**`, `contract/registry/**`, generated Protocol IR, G3 `contract/rules/rules.yaml`, immutable `spec/v0.15.0` as historical release evidence.  
**Objective**: eliminate independent protocol truth from the test-vector emitter by introducing canonical semantic vector recipes and a narrow deterministic encoder that resolves protocol facts from current authority.  
**Non-goals**: do not redesign AXTP wire semantics; do not build a general runtime codec; do not make Compact/HID-64/BLE/UART part of v1 Core; do not mutate `spec/v0.15.0`; do not silently bless stale pseudo-golden bytes.  
**Required analysis**: classify every existing vector, identify the source of every emitted protocol fact, prove current-core derivation, preserve historical evidence, and run five drift reviews.  
**Required output**: canonical recipe source, deterministic narrow encoder, provenance-rich generated manifest, separated historical fixtures, derivation tests, generated-drift integration, G4 review record.  
**Quality / Evidence Gate**: no current-core output may depend on handwritten final hex or independently authored method/event/opcode/payload IDs; current-core frames must satisfy current Standard Frame/RPC/STREAM authority; historical bytes must remain available as history; full generator/conformance/docs/release CI must pass.  
**Handoff**: G5 may treat `contract/test-vectors/**` as derived verification evidence, never as an independent source of protocol semantics.

## 2. Authority topology

```text
specs/**
contract/registry/**
contract/protocol/axtp.protocol.yaml
contract/rules/rules.yaml
        ↓
contract/vector-recipes/**
        ↓ semantic input + names + Rule refs
narrow deterministic vector encoder
        ↓ resolves IDs/schema fields/wire version from authority
contract/test-vectors/**
        ↓
generated drift / release artifact / consumer verification
```

`contract/vector-recipes/**` is **verification-authority input**, not a semantic specification. It may choose fixture values such as `requestId`, `sid`, `messageId`, stream cursor and field values. It MUST NOT author final current-core hex, numeric method/event/opcode/payload IDs, schema field IDs, or a second wire layout.

## 3. Defect classification of the current seven vectors

The current emitter accepts `_spec` but does not use it. It hard-codes both manifest semantics and final bytes. This is the primary `DERIVATION-DEFECT`.

Audit of the existing bytes also found that they are not all valid current-core Standard Frames:

| Existing vector | Classification | Reason |
|---|---|---|
| `control_open` | stale pseudo-golden / current-core intent | 12B frame header + 5B CONTROL payload is present, but the required 2B CRC footer is absent; the OPEN body also omits current required negotiation TLVs. |
| `rpc_audio_get_algorithm_config_request` | stale pseudo-golden / current-core intent | no CRC footer; payload does not use the current 15B JSON_BINARY fixed header and begins with historical `0x02` instead of resolving current `JSON_BINARY=0x04`. |
| `rpc_audio_set_algorithm_config_request` | stale pseudo-golden / current-core intent | same fixed-header/CRC defect plus body bytes reflect an older schema projection rather than the current nested `AudioSetAlgorithmConfigRequest → AudioAlgorithmConfig → AudioNoiseSuppressionConfig.level` field chain. |
| `event_audio_algorithm_config_changed` | stale pseudo-golden / current-core intent | no CRC footer and old binary envelope/body; current event schema has required fields that the old body does not represent. |
| `stream_object_chunk` | stale pseudo-golden / mostly current payload | current 16B `streamId/seqId/cursor` payload shape is present, but the Standard Frame CRC footer is absent. |
| `compact_crc8_error` | historical compatibility fixture | Compact framing is explicitly outside AXTP v1 Core. |
| `compact_message_id_overflow` | historical compatibility fixture | Compact framing is explicitly outside AXTP v1 Core. |

Therefore the G4 preservation rule is:

```text
valid historical current-core bytes → preserve byte-for-byte
stale pseudo-golden bytes           → preserve as historical evidence,
                                      generate a current replacement from authority
legacy/non-core bytes               → preserve as historical compatibility evidence,
                                      never count as current-core derivation coverage
```

This is not a protocol semantic change. The protocol authority already requires Standard Frame CRC16 and the current JSON_BINARY envelope. G4 is correcting derived evidence that drifted from that authority.

## 4. Canonical recipe model

Source paths:

```text
contract/vector-recipes/current-core.yaml
contract/vector-recipes/historical.yaml
```

Current-core recipes contain no final hex. Each recipe records:

```yaml
id: rpc_audio_get_algorithm_config_request
classification: current-core
authorityRules:
  - CORE.FRAME.001
profile: standard-framed
frame:
  payloadType: RPC
  sourceId: 1
  destinationId: 16
  messageId: 2
  frameIndex: 0
  frameCount: 1
payload:
  kind: json-binary-request
  sid: 305419896
  requestId: 1
  method: audio.getAlgorithmConfig
  bodyEncoding: NONE
expectDecode:
  method: audio.getAlgorithmConfig
```

Names such as `RPC`, `REQUEST`, `JSON_BINARY`, method names, event names and schema field names are resolved against loaded authority. Numeric IDs are never repeated in current-core recipe source.

Historical recipes may contain `historicalHex` because their purpose is preservation, not current derivation. Every such entry must carry a classification and reason explaining why it is not current-core truth.

## 5. Current-core seed set

G4 retains the five public vector names as current replacement outputs so release consumers keep stable filenames:

1. `control_open`
2. `rpc_audio_get_algorithm_config_request`
3. `rpc_audio_set_algorithm_config_request`
4. `event_audio_algorithm_config_changed`
5. `stream_object_chunk`

Their old pre-G4 bytes are additionally emitted under `contract/test-vectors/historical/pre-g4/`.

The two Compact vectors are emitted under `contract/test-vectors/historical/compact/` and represented only in the historical-fixture manifest projection.

### 5.1 CONTROL OPEN

The recipe names `OPEN` and current `ControlOpenBody` fields. The encoder resolves the opcode ID and TLV field IDs/types from `SpecModel`. Fixture values are:

- `maxFrameSize = 4096`
- `supportedPayloadTypes = [CONTROL, RPC, STREAM]` resolved to a bitmap from payload-type authority
- `supportedRpcEncodings = [JSON, JSON_BINARY]` resolved to a bitmap from RPC-encoding authority
- `heartbeatIntervalMs = 1000`
- `ackMode = 0`

The encoder uses the current schema type width for scalar TLV values. The prose example is not copied as independent byte truth.

### 5.2 JSON_BINARY requests

The encoder implements only the frozen v1 fixed header:

```text
rpcEncoding(1) + rpcOp(1) + sid(4) + requestId(4)
+ methodOrEventId(2) + statusCode(2) + bodyEncoding(1)
+ body(N)
```

All multi-byte fields use current authority byte order. `JSON_BINARY`, `REQUEST`, `NONE`, `TLV8`, method IDs and `SUCCESS` are resolved by name.

`audio.getAlgorithmConfig` uses an empty optional request selector and therefore `bodyEncoding=NONE`.

`audio.setAlgorithmConfig` uses `TLV8` and semantic input:

```yaml
config:
  noiseSuppression:
    level: 3
```

The TLV encoder recursively resolves `config`, `noiseSuppression` and `level` field IDs/types from the current schema graph. It does not contain audio-specific field numbers.

### 5.3 Event vector

The current event schema contains required enum fields whose binary numeric enum mapping is not fully machine-readable. G4 MUST NOT invent that mapping.

Therefore the current event replacement uses the required Standard Framed **JSON RPC encoding**, which carries the current object-envelope semantics without inventing binary enum values. The encoder resolves `JSON` and `EVENT` IDs by name, constructs the semantic event object, serializes it deterministically, and wraps it in a Standard Frame with CRC16.

The generated manifest marks JSON bytes as a deterministic fixture representation, not as the only legal JSON serialization.

### 5.4 STREAM vector

The current STREAM semantic input remains:

```text
streamId = 9
seqId    = 1
cursor   = 1
data     = AABBCCDD
```

The encoder resolves `STREAM` payload type by name and emits the current 16B Big-Endian STREAM header plus data, then wraps it in a Standard Frame with CRC16.

## 6. Narrow encoder boundary

Create focused generator modules rather than turning `testVectors.ts` into a runtime codec:

```text
tooling/generators/src/vectorRecipes.ts
tooling/generators/src/vectorEncoding.ts
tooling/generators/src/emitters/testVectors.ts
```

`vectorRecipes.ts` owns recipe types/loading/validation.  
`vectorEncoding.ts` owns pure deterministic byte derivation.  
`testVectors.ts` owns only output projection and file writing.

Supported encoding primitives are intentionally limited to the G4 seed set:

- Standard Frame 12B header + payload + CRC16-CCITT-FALSE footer
- CONTROL 5B header + TLV8 body
- JSON_BINARY Request fixed header
- recursive TLV8 object encoding for bool and fixed-width integer fields needed by seed recipes
- Standard Framed JSON RPC Event fixture
- STREAM 16B header + opaque data

Unsupported recipe constructs fail generation explicitly. G4 does not implement CBOR, MSGPACK, general arrays, arbitrary enum binary encoding, fragmentation, or a full runtime decoder.

## 7. CRC and wire rules

The encoder is an implementation of existing normative wire rules, not a second registry. It must:

- resolve frame magic from the current `STANDARD_FRAME` profile;
- resolve Standard Frame Version from the already-classified wire-generation field in current source authority;
- resolve payload type IDs by name;
- use Big-Endian/network order and reject a source model that declares a different byte order for this v1 encoder;
- compute CRC16-CCITT-FALSE over header + payload;
- serialize the CRC footer Big-Endian as required by current authority.

The algorithm implementation is covered by known-answer unit tests and full generated-drift validation.

## 8. Manifest provenance

Generated `contract/test-vectors/manifest.json` must distinguish current evidence from history. Each current entry includes at least:

```json
{
  "name": "stream_object_chunk",
  "classification": "current-core",
  "authorityRules": ["CORE.FRAME.001", "STREAM.FRAME.001"],
  "recipe": "contract/vector-recipes/current-core.yaml#stream_object_chunk",
  "derivation": "authority-resolved",
  "hexFile": "stream_object_chunk.hex",
  "wireDigest": "sha256:<derived digest>",
  "expectDecode": { "streamId": 9 }
}
```

Historical entries are projected separately and must state `classification`, `reason`, original filename and historical fixture path. Historical raw hex is never counted as current-core coverage.

## 9. Tests and evidence

TDD must establish RED before production implementation for these contracts:

1. changing an authority ID in the in-memory model changes derived bytes;
2. current-core recipes containing `historicalHex` or numeric protocol IDs are rejected;
3. JSON_BINARY request header is 15B before body and resolves names to current IDs;
4. nested TLV field IDs come from schema names;
5. CRC16-CCITT-FALSE known-answer vector passes;
6. generated current-core frames end with a valid CRC;
7. current/historical manifest projections are separated;
8. historical pre-G4 and Compact bytes remain byte-for-byte preserved.

Repository Gate evidence additionally requires generator build/lint/test/validate, generated drift, conformance, docs/status/path checks and release artifact dry run.

## 10. Release artifact

`contract/vector-recipes/**` is part of the provenance chain and must be included in future spec artifacts alongside `contract/test-vectors/**`. The release artifact contract and copy script should therefore include the recipe directory as additive verification metadata.

`spec/v0.15.0` remains immutable. G4 changes the migration branch/future release content only.

## 11. Five drift-review expectations

- **Authority drift**: current-core recipes may select semantic fixture values but must not own protocol IDs/layouts.
- **Semantic duplication**: no final current-core hex is authored outside generated output; schema names are references, not copied field maps.
- **Derivation drift**: every current-core output has recipe → authority resolution → encoder → digest provenance.
- **Verification drift**: stale/legacy bytes are visibly historical and excluded from current-core counts.
- **Release/consumer drift**: stable current vector filenames are retained where practical; recipe provenance is shipped; historical bytes remain available without masquerading as current truth.

## 12. Exit decision rule

G4 may be PASS only when `AXTP-GOV-003` is closed with fresh full-CI evidence showing:

```text
hard-coded current-core final hex in emitter = 0
current-core recipe final hex fields          = 0
current-core vectors authority-derived        = 100%
stale pre-G4 bytes preserved as history       = 100%
Compact vectors counted as current-core        = 0
unexplained byte changes                       = 0
protocol semantic changes                      = 0
```

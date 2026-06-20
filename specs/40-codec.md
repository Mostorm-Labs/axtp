# AXTP Codec

This file defines AXTP data types, schema model, capability model, TLV encoding, and schema field numbering. Current schema facts live in `contract/registry/**` and generated outputs.

## Type System

All AXTP multi-byte wire integers MUST use Big-Endian / network byte order.

| Type | JSON expression | Binary/TLV expression | Rule |
|---|---|---|---|
| `bool` | boolean | 1B | `0x00=false`, `0x01=true`; other values SHOULD fail validation. |
| `uint8/16/32/64` | number or string for large values | fixed-width unsigned BE | Range MUST match type width and schema constraints. |
| `int8/16/32/64` | number or string for large values | fixed-width signed BE | Two's-complement signed integers. |
| `string` | string | UTF-8 bytes | No NUL terminator; length comes from outer encoding. |
| `bytes` | base64/hex/profile-specific | raw bytes | Opaque bytes; schema/profile limits length. |
| `enum` | string or numeric value | enum8/enum16/profile-specific | Legal values MUST be declared. |
| `bitmap` | array/string/numeric profile-specific | bitmap8/16/32/64/bytes | bit0 is least significant bit. |
| `array<T>` | JSON array | repeated or packed | Element type MUST be declared. |
| `object` | JSON object | nested TLV fields | Field meaning comes from schema. |

AXTP v1 TLV has no independent null sentinel. Use optional/default for missing values. JSON `null` is allowed only when a schema explicitly permits it.

Stable field type, unit, required/optional semantics, and range MUST NOT change incompatibly.

JSON, TLV, and generated SDK views are projections of the same schema fact. They MUST preserve the same required/optional status, default semantics, enum values, array item type, range, unit, and deprecation metadata. A field that cannot be represented consistently across the declared encodings MUST be rejected by validation or marked profile-specific.

## Schema Model

Object schema fields MUST have schema-local `fieldId` values. Field ids are not global.

Minimum object shape:

```yaml
schemas:
  ExampleLevelConfig:
    kind: object
    fields:
      - id: 0x01
        name: level
        type: uint8
        required: true
        min: 0
        max: 100
      - id: 0x02
        name: applyDelayMs
        type: uint16
        required: false
        default: 0
```

Schema rules:

1. Required fields MUST be present.
2. Optional fields MAY be omitted; receivers apply defaults only when the schema declares them.
3. Unknown optional fields MUST be skippable.
4. Object fields reference built-in types or named schemas.
5. Array fields MUST declare item type and item schema where applicable.
6. Empty request/response uses the registered Empty schema.
7. Generated SDKs SHOULD keep wire types and host-language types separate.

## Capability Model

Capability describes what a device supports in the current firmware, configuration, session, and authorization state. Capability does not change methodId, eventId, PayloadType, CONTROL, RPC, or STREAM wire shape.

Capability rules:

1. Capability names SHOULD use `domain.feature`.
2. Capability schema MAY describe limits, supported modes, ranges, defaults, update policy, and availability.
3. Capability references MUST resolve to registered method/event/schema/profile facts.
4. Capability discovery, when adopted, is an RPC business method; it is not CONTROL.
5. Unknown optional capability fields MUST be ignored or preserved according to SDK policy.

Full capability reflection, capability trees, and complex profile negotiation are future or separately adopted business protocols unless present in the generated contract.

## TLV Encoding

TLV body encoding uses field id, length, and raw value:

```text
TLV8  = fieldId:uint8 + length:uint8 + value(length)
TLV16 = fieldId:uint16 + length:uint16 + value(length)
```

CONTROL uses short TLV with optional extended length marker:

```text
type:uint8 + length:uint8 + value
type:uint8 + 0xFF + extendedLength:uint16 + value
```

TLV rules:

1. Field order SHOULD be ascending for canonical generation.
2. Receivers MUST validate length before reading value bytes.
3. Unknown fields with valid length MUST be skipped.
4. Duplicate non-repeated fields SHOULD fail strict validation.
5. Repeated fields MUST be explicitly declared by schema/profile.
6. TLV object decoding uses schema-local field ids; field names are not on wire.
7. Packed array encoding is allowed only when schema/profile defines element width and layout.

## Field Numbering

Schema field id rules:

1. `fieldId=0x00` is reserved and MUST NOT be used for normal fields.
2. For TLV8-compatible object fields, fieldId MUST be `0x01..0xFE`.
3. `0xFF` is reserved in short TLV contexts for extended length marker.
4. Field id MUST be unique within a schema.
5. Stable field id MUST NOT be reused for a different name or meaning.
6. Deprecated fields retain their id until compatibility policy removes them.
7. New fields SHOULD be optional unless a breaking version boundary is declared.
8. Renaming SHOULD use new field plus deprecated old field; silent replacement is forbidden.

Compatibility rules:

| Change | Default compatibility |
|---|---|
| Add optional field | Compatible. |
| Add required field | Usually breaking. |
| Add enum/bitmap value | Compatible only when unknown-value policy is defined. |
| Change type/unit/range/requiredness | Usually breaking. |
| Reuse removed field id | Forbidden for stable contracts. |

Runtime or generated codecs MUST validate numeric ranges, UTF-8 strings, enum/bitmap values, required fields, object recursion, array element types, and length boundaries.

Unknown-field policy:

- Unknown TLV fields with valid length MUST be skipped by forward-compatible decoders.
- Unknown enum or bitmap values MUST be preserved for diagnostics when possible; strict business validation MAY reject them after decode.
- Defaults are applied only after successful decode and only when the schema declares a default.
- Deprecated fields MAY be emitted for compatibility but SHOULD NOT be required by new senders.

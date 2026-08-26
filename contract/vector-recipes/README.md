# AXTP Vector Recipes

`contract/vector-recipes/**` is the machine-readable **verification input** for generated test vectors.

Authority chain:

```text
specs/** + contract/registry/** + contract/rules/**
                ↓
contract/vector-recipes/current-core.yaml
                ↓
AXTP generator authority resolution / narrow encoder
                ↓
contract/test-vectors/**
```

## Current-core recipes

`current-core.yaml` may choose fixture values such as `sid`, `requestId`, `messageId`, stream cursor/data, and semantic field values. It does **not** own final wire bytes or numeric protocol identifiers.

Current-core recipes therefore must not contain final golden hex, numeric method/event/opcode/PayloadType IDs, or copied schema field IDs. The generator resolves those facts by name from current canonical source and fails if the referenced authority cannot be resolved.

`contract/test-vectors/manifest.json` records each generated vector's recipe anchor, Rule IDs, derivation mode, and wire digest.

## Historical recipes

`historical.yaml` is deliberately different: its purpose is to preserve old evidence byte-for-byte. `historicalHex` is allowed only there and every fixture must explain why it is historical.

Two classifications are used:

- `historical-stale`: previously presented as current evidence but found to be derived from older/incomplete wire assumptions.
- `historical-compatibility`: compatibility/degradation material that is not AXTP v1 Core, such as Compact framing fixtures.

Historical bytes are emitted under `contract/test-vectors/historical/**`. They are not current protocol truth and are not counted as current-core golden-vector coverage.

## Editing rule

Do not hand-edit generated files under `contract/test-vectors/**` to change protocol behavior. Change the appropriate canonical protocol authority or semantic recipe input, regenerate, and classify any byte change against the applicable Rule/spec authority.

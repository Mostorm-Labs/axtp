# AXTP G4 Golden Vector Derivation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace pseudo-generated AXTP test-vector truth with authority-resolved current-core recipes while preserving stale/legacy bytes as explicitly historical evidence.

**Architecture:** `contract/vector-recipes/**` owns semantic fixture input and provenance; `ProtocolSourceModel` loads those recipes; a small pure encoder resolves IDs/schema fields/wire generation from current source authority and emits current-core frames; `testVectors.ts` only projects files/manifest. Historical raw hex remains allowed only in the historical recipe catalog and is emitted under `contract/test-vectors/historical/**`.

**Tech Stack:** TypeScript 5.9, Node.js 22, Vitest 2.1, YAML 2.9, existing AXTP generator/source loader and GitHub Actions validation.

**Spec:** `docs/superpowers/specs/2026-08-26-g4-golden-vector-derivation-design.md`

## Global Constraints

- No AXTP protocol semantic change.
- `spec/v0.15.0` is immutable historical release evidence.
- Current-core recipe source MUST NOT contain final hex or numeric protocol IDs.
- Current-core IDs/schema field IDs MUST resolve from current source authority by name.
- Historical raw hex MUST be classified and excluded from current-core coverage.
- The current five public vector filenames remain stable as generated current replacements.
- Any byte change from the pre-G4 current files is accepted only when classified as existing stale derived evidence, never as an implicit protocol amendment.
- Compact/HID-64/BLE/UART fixtures remain non-core.
- Full G4 PASS requires fresh generator/conformance/docs/release CI on the final head.

---

### Task 1: Freeze the recipe source model and RED contracts

**Files:**
- Create: `contract/vector-recipes/current-core.yaml`
- Create: `contract/vector-recipes/historical.yaml`
- Create: `tooling/generators/src/vectorRecipes.ts`
- Create: `tooling/generators/src/vectorRecipes.test.ts`
- Modify: `tooling/generators/src/sourceModel.ts`
- Modify: `tooling/generators/src/sourceLoader.ts`

**Interfaces:**
- Produces: `VectorRecipeCatalog`, `CurrentVectorRecipe`, `HistoricalVectorRecipe`, `loadVectorRecipeCatalog(specRoot)`.
- `ProtocolSourceModel.vectorRecipes: VectorRecipeCatalog` becomes the single in-memory recipe source consumed by vector emission.

- [ ] **Step 1: Write failing recipe validation tests**

Tests must prove:

```ts
it("rejects current-core recipes that contain final hex", () => {
  expect(() => validateVectorRecipeCatalog({
    currentCore: [{ id: "bad", classification: "current-core", hex: "4158" }]
  } as any)).toThrow(/current-core.*hex/i);
});

it("allows historical fixtures to preserve historicalHex", () => {
  expect(() => validateVectorRecipeCatalog({
    schemaVersion: 1,
    currentCore: [],
    historical: [{
      id: "legacy",
      classification: "historical-compatibility",
      reason: "legacy compact fixture",
      outputPath: "historical/compact/legacy.hex",
      historicalHex: "1211"
    }]
  } as any)).not.toThrow();
});
```

- [ ] **Step 2: Run the isolated RED contract before production implementation**

Use a Node built-in-test mirror in the isolated execution environment if the repository checkout is unavailable. Confirm failure is caused by the missing validator/model behavior, not syntax.

- [ ] **Step 3: Implement recipe types/loading/validation**

`vectorRecipes.ts` must export:

```ts
export type HistoricalClassification = "historical-stale" | "historical-compatibility";
export interface VectorRecipeCatalog {
  schemaVersion: 1;
  currentCore: CurrentVectorRecipe[];
  historical: HistoricalVectorRecipe[];
}
export function validateVectorRecipeCatalog(value: VectorRecipeCatalog): void;
export async function loadVectorRecipeCatalog(specRoot: string): Promise<VectorRecipeCatalog>;
```

Validation must reject duplicate IDs/output paths, current-core `hex`/`historicalHex` fields, missing `authorityRules`, unknown classifications, and historical output paths outside `historical/`.

- [ ] **Step 4: Load recipes in `loadProtocolSources`**

Add:

```ts
const vectorRecipes = await loadVectorRecipeCatalog(specRoot);
return { ...spec, protocolMeta, sourceFiles, profiles, vectorRecipes };
```

`sourceFiles` must include both recipe YAML paths so provenance/audits can see them.

- [ ] **Step 5: Populate canonical recipes**

`current-core.yaml` defines the five approved current vectors without final hex. `historical.yaml` preserves all seven pre-G4 byte strings, classifying the first five `historical-stale` and the Compact pair `historical-compatibility`.

- [ ] **Step 6: Run recipe tests GREEN**

Run targeted Vitest when repository execution is available; otherwise run the exact pure validator contracts in the isolated Node harness and defer integrated evidence to Gate CI.

---

### Task 2: Build the narrow authority-resolved encoder with TDD

**Files:**
- Create: `tooling/generators/src/vectorEncoding.ts`
- Create: `tooling/generators/src/vectorEncoding.test.ts`

**Interfaces:**
- Consumes: `ProtocolSourceModel`, `CurrentVectorRecipe`.
- Produces:

```ts
export function crc16CcittFalse(bytes: Uint8Array): number;
export function encodeTlv8Object(source: ProtocolSourceModel, schemaName: string, values: Record<string, unknown>): Uint8Array;
export function deriveCurrentVector(source: ProtocolSourceModel, recipe: CurrentVectorRecipe): DerivedVector;
```

`DerivedVector` contains `bytes`, `payloadType`, `encoding`, `expectDecode`, `wireDigest` and recipe provenance.

- [ ] **Step 1: Write failing CRC known-answer test**

```ts
expect(crc16CcittFalse(new TextEncoder().encode("123456789"))).toBe(0x29b1);
```

- [ ] **Step 2: Write failing authority-resolution tests**

Mutate an in-memory source model so `REQUEST`, `JSON_BINARY`, or `audio.getAlgorithmConfig` uses a different test ID. Derived bytes must contain the mutated authority value; a hard-coded emitter must fail this test.

- [ ] **Step 3: Write failing nested TLV test**

For semantic input:

```ts
{ config: { noiseSuppression: { level: 3 } } }
```

assert the field IDs are resolved through the active schema graph rather than constants. Mutating `AudioNoiseSuppressionConfig.level.fieldId` in the test model must change the output.

- [ ] **Step 4: Implement deterministic scalar/TLV primitives**

Support only `bool`, `uint8`, `uint16`, `uint32`, `uint64`, nested object schemas and the two named bitmap-selection inputs required by `ControlOpenBody`. Sort TLV fields by resolved field ID. Reject arrays, enum-binary values and unknown fields in this G4 encoder.

- [ ] **Step 5: Implement current payload encoders**

Implement:

```text
control
json-binary-request
json-event
stream
```

Resolve `OPEN`, `SUCCESS`, `REQUEST`, `EVENT`, `JSON`, `JSON_BINARY`, `NONE`, `TLV8`, method/event IDs and payload-type IDs by name.

- [ ] **Step 6: Implement Standard Frame wrapping**

Resolve `STANDARD_FRAME.magic`, wire generation, payload-type ID and byte-order declarations from current source. Encode the 12B header, append payload, calculate CRC16-CCITT-FALSE over header+payload, append CRC Big-Endian.

- [ ] **Step 7: GREEN all encoder tests**

Confirm known-answer CRC, authority mutation, nested schema mutation, JSON_BINARY 15B header, STREAM 16B header and frame CRC all pass.

---

### Task 3: Replace pseudo-generation with projection-only emission

**Files:**
- Modify: `tooling/generators/src/emitters/testVectors.ts`
- Modify: `tooling/generators/src/emitters/index.ts`
- Modify: `tooling/generators/src/validator.test.ts`
- Modify: `tooling/generators/src/__snapshots__/manifest.json`

**Interfaces:**
- `emitTestVectorFiles(source: ProtocolSourceModel, dir: string)` consumes loaded recipes and pure derived vectors.
- The emitter owns no protocol IDs, semantic vector list or current-core hex constants.

- [ ] **Step 1: Add failing emitter test proving Spec/source authority affects bytes**

Use an in-memory `ProtocolSourceModel` with recipes. Change one method/opcode ID and assert the generated corresponding `.hex` changes.

- [ ] **Step 2: Refactor emitter**

`testVectors.ts` must only:

1. clear/create output directory;
2. call `deriveCurrentVector` for `source.vectorRecipes.currentCore`;
3. write current `.hex` files;
4. write historical `historicalHex` values to their declared `historical/**` paths;
5. emit a manifest containing current `vectors` plus separate `historicalFixtures`.

No current final hex literal may remain in the emitter.

- [ ] **Step 3: Preserve manifest compatibility where safe**

Keep top-level `vectors` and existing fields (`name`, `payloadType`, `encoding`, `hexFile`, `expectDecode`/`expectError`) for current entries, while adding `classification`, `authorityRules`, `recipe`, `derivation`, `wireDigest`. Add `historicalFixtures` as a separate collection.

- [ ] **Step 4: Update emitter snapshot tests**

The five current public filenames remain unchanged. The previous bytes for all five must exist under `historical/pre-g4/`; Compact bytes must exist under `historical/compact/`.

---

### Task 4: Materialize generated current vectors and classify every byte change

**Files:**
- Modify generated: `contract/test-vectors/manifest.json`
- Modify generated current files:
  - `contract/test-vectors/control_open.hex`
  - `contract/test-vectors/rpc_audio_get_algorithm_config.hex`
  - `contract/test-vectors/rpc_audio_set_algorithm_config.hex`
  - `contract/test-vectors/event_audio_algorithm_config_changed.hex`
  - `contract/test-vectors/stream_object_chunk.hex`
- Remove/move generated Compact top-level files if replaced by historical paths:
  - `contract/test-vectors/compact_crc8_error.hex`
  - `contract/test-vectors/compact_message_id_overflow.hex`
- Add generated historical files under `contract/test-vectors/historical/**`

**Interfaces:**
- Current outputs are derived only from current-core recipes/source authority.
- Historical outputs reproduce catalogued pre-G4 bytes exactly.

- [ ] **Step 1: Generate expected current bytes using the new encoder**

Do not edit generated hex by hand. Record every diff against pre-G4 bytes.

- [ ] **Step 2: Classify each diff**

Expected classifications from the design audit are:

```text
control_open                         stale derived evidence: missing CRC + old/incomplete OPEN body
rpc_audio_get_algorithm_config      stale derived evidence: old RPC envelope + missing CRC
rpc_audio_set_algorithm_config      stale derived evidence: old envelope/schema projection + missing CRC
event_audio_algorithm_config_changed stale derived evidence: old envelope/body + missing CRC
stream_object_chunk                 stale derived evidence: missing CRC only
```

If a diff has another cause, stop and classify it before accepting it.

- [ ] **Step 3: Prove historical preservation**

The old seven hex strings in `historical.yaml` and generated historical files must match pre-G4 bytes byte-for-byte.

---

### Task 5: Make generated drift and release provenance recursive/self-contained

**Files:**
- Modify: `tooling/scripts/check-generated-drift.sh`
- Modify: `tooling/scripts/build-spec-artifact.sh`
- Modify: `tooling/release/artifact-contract.json`
- Modify if explanatory wording requires: `specs/50-tooling.md`
- Modify if consumer guidance requires: `docs/guides/testing.md`

**Interfaces:**
- Generated drift compares the complete recursive `contract/test-vectors` tree.
- Release artifact includes both `contract/vector-recipes/**` and generated `contract/test-vectors/**`.

- [ ] **Step 1: Replace flat test-vector drift loop with recursive directory diff**

Use one deterministic recursive comparison after generation so nested historical paths are checked.

- [ ] **Step 2: Ship recipe provenance**

Copy `contract/vector-recipes` in `build-spec-artifact.sh` and require at least `contract/vector-recipes/current-core.yaml` and `contract/vector-recipes/historical.yaml` in the artifact contract.

- [ ] **Step 3: Document source/derived boundary**

State that recipes are verification input, current `.hex` is derived output, and historical raw hex is preserved evidence only.

---

### Task 6: G4 review, finding closure and Gate verification

**Files:**
- Modify: `docs/governance/reviews/G4-derivation-golden-vectors.md`
- Modify: `docs/governance/findings.yaml`
- Modify PR #12 metadata only at Gate boundaries.

**Interfaces:**
- Produces: final G4 evidence and `AXTP-GOV-003` disposition.
- Handoff: G5 consumes a closed derivation chain.

- [ ] **Step 1: Record emitter audit**

Document every emitter under `tooling/generators/src/emitters/**` and explicitly show that G4's protocol-fact defect was isolated to test-vector pseudo-generation; any additional hidden facts become classified findings rather than silent scope creep.

- [ ] **Step 2: Run five drift reviews**

Record Authority, Semantic Duplication, Derivation, Verification, and Release/Consumer drift results.

- [ ] **Step 3: Freeze functional head with PR closed**

Before full CI, confirm branch diff contains no protocol semantic source change except additive machine-readable/provenance metadata that restates already-effective authority.

- [ ] **Step 4: Reopen Draft PR #12 once for functional-state full validation**

Count only a workflow run whose `head_sha` is the current functional head. Required checks: generator build/lint/test/validate, generated drift, conformance, Rule coverage, docs/status/path checks, release artifact dry run.

- [ ] **Step 5: Close PR and record PASS/finding closure**

Only after fresh successful evidence, set G4 PASS and close `AXTP-GOV-003`; then produce a final closure head.

- [ ] **Step 6: Reopen once for exact-head validation**

Count only the final closure-head run. If green, close Draft PR again and freeze G4. If failing, classify before any repair.

## Plan self-review

- Spec coverage: all design sections map to Tasks 1–6.
- Placeholder scan: no TBD/TODO or unspecified implementation step remains.
- Type consistency: `ProtocolSourceModel.vectorRecipes` → `deriveCurrentVector` → `emitTestVectorFiles` is the single current derivation chain.
- Scope boundary: no full codec, no Compact promotion, no protocol amendment.

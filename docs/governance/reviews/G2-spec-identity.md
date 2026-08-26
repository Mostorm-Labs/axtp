# AXTP G2 — Spec Identity & Version Closure

Status: **PASS**  
Prerequisite: G1 PASS  
Primary finding: `AXTP-GOV-002`

## 1. Objective

G2 closes version-name ambiguity without changing AXTP wire semantics, released `spec/v0.15.0`, runtime parser behavior, generated protocol facts, or downstream runtime binding compatibility.

The governing question for every version field is:

> **What exactly is being versioned?**

A numeric value is not an identity by itself. `0.15.0`, `1.0.0`, `1`, and `v0.15.0.3` may all legitimately describe the same ecosystem snapshot at different layers.

## 2. Protected baseline

```text
Protected release tag:    spec/v0.15.0
Protected release commit: 1bf9e89ede12470e20733d4cea4e50edad989528
G2 entry branch head:     959db6e1305bab602c4356b09de4a19fc4af263f
```

G2 did not retag, rewrite or reinterpret the protected release into another protocol/wire version namespace.

## 3. Baseline contradiction

At G2 entry the repository contained several legitimate but overloaded names:

```text
spec/v0.15.0
contract/registry/version.yaml:
  spec.version: 1.0.0
  registry_version: 1.0.0
  schema_version: 1.0.0
  wire_version: 1

contract/registry/core/protocol_meta.yaml:
  protocol.version: 1.0.0
  protocol.specVersion: 1
  protocol.registryVersion: 1.0.0

Standard Frame Header:
  Version = 0x01

RPC Hello:
  d.axtpVersion = optional string

Runtime/tool release:
  vX.Y.Z.R
```

The collision was semantic, not numeric: the repository used `spec` both for immutable repository release identity and for historical wire/Core generation metadata.

## 4. Version-field inventory

| Existing surface | Current value/example | Real meaning found by G2 | Wire impact | G2 disposition |
|---|---|---|---:|---|
| Git tag `spec/vX.Y.Z` | `spec/v0.15.0` | immutable repository authority snapshot | none | canonical `release.tag/version` |
| release manifest `axtp_spec.version` | `0.15.0` | release version projection | none | canonical release projection |
| dispatch `spec_version` | `0.15.0` | release-version API field | none | compatibility field; meaning frozen |
| `protocol.version` | `1.0.0` | protocol semantic lineage | none | `protocolSemantics.version` |
| `protocol.specVersion` | `1` | historical Core wire/header generation | indirect mirror | legacy alias of `wire.standardFrameVersion` |
| Standard Frame Header `Version` | `0x01` | hard parser compatibility boundary | **yes** | normative `wire.standardFrameVersion` |
| `protocol.registryVersion` | `1.0.0` | registry/schema model metadata | none | registry-schema projection |
| `version.yaml spec.version` | `1.0.0` | protocol semantic metadata mirror | none | legacy mirror; **not release version** |
| `version.yaml registry_version` | `1.0.0` | registry model metadata | none | legacy mirror |
| `version.yaml schema_version` | `1.0.0` | schema/model metadata | none | legacy mirror |
| `version.yaml wire_version` | `1` | Standard Frame wire-generation mirror | none by itself | legacy mirror |
| generator config/package version | `1.0.0` | generator implementation identity | none | `generator.version` |
| runtime/tool tag | `v0.15.0.R` | downstream implementation release | none | `runtimeImplementation.version` |
| `Hello.d.axtpVersion` | `"1.0.0"` | advisory diagnostics string | yes, RPC field | `advisoryHelloVersion`; never admission authority |
| deprecated `protocolVersion/rpcVersion/negotiatedRpcVersion` | legacy | historical compatibility inputs | possibly transported | preserve/deprecate; never admission authority |

## 5. Source and consumer trace

### 5.1 Release identity

`tooling/release/manifest.template.yaml` writes `axtp_spec.version/tag/commit` from the release workflow. `tooling/scripts/print-spec-version.sh` derives the printed version from a `spec/v*` tag. Runtime dispatch sends `spec_tag`, `spec_version`, `spec_repository`, and `spec_commit` from this release namespace.

Therefore release `spec_version` means **repository release version**, not Protocol IR semantic or wire version.

### 5.2 Protocol IR semantic metadata

`tooling/generators/src/sourceLoader.ts` loads `contract/registry/core/protocol_meta.yaml` as `protocolMeta`, and `tooling/generators/src/protocolBuilder.ts` projects it into `contract/protocol/axtp.protocol.yaml`.

Therefore current Protocol IR `protocol.version/specVersion/registryVersion` comes from `contract/registry/core/protocol_meta.yaml`, not from similarly named fields in `contract/registry/version.yaml`.

### 5.3 `contract/registry/version.yaml`

The loader still reads this file into `SpecModel.version`, and release artifacts still include it. G2 found no independent live runtime/IR authority chain for its `registry_version`, `schema_version`, or `wire_version` fields beyond tooling retention and documentation.

It is therefore classified as a **legacy metadata mirror surface retained for compatibility**, not a second independent compatibility authority.

### 5.4 Historical meaning of `specVersion`

The v1 Core freeze history explicitly separated:

```text
specVersion     = Core wire format generation, corresponding to Header Version
registryVersion = registry evolution, independent from wire format
```

G2 therefore freezes current `protocol.specVersion: 1` as a legacy alias of Standard Frame wire generation. It MUST NOT be interpreted as release `spec/v1` or `spec/v1.0.0`.

### 5.5 Hello advisory version

`specs/20-core.md` and conformance case `session.axtp_version_advisory` establish that missing, malformed, major-different, minor-different and patch-different `Hello.d.axtpVersion` values MUST NOT prevent `Hello -> Identify -> Identified` or become a feature/admission gate.

Its canonical name is therefore diagnostic-only `advisoryHelloVersion`.

## 6. Canonical SpecIdentity semantic model

G2 adopts the governance-v1 identity model:

```yaml
specIdentity:
  release:
    version: 0.15.0
    tag: spec/v0.15.0
    commit: 1bf9e89ede12470e20733d4cea4e50edad989528

  protocolSemantics:
    generation: 1
    version: 1.0.0

  wire:
    standardFrameVersion: 1

  registrySchema:
    version: 1.0.0

  authoritySchema:
    version: 1

  generator:
    version: 1.0.0
```

Additional consumer/projection identities:

```text
runtimeImplementation.version = v<release X.Y.Z>.<runtime revision>
advisoryHelloVersion           = peer-reported optional diagnostic string
```

### Identity invariants

1. `release.version` identifies the immutable repository snapshot being bound.
2. `protocolSemantics.version` identifies the Protocol IR semantic lineage.
3. `wire.standardFrameVersion` is the Standard Frame parser compatibility boundary.
4. `registrySchema.version` describes registry/schema authoring-model compatibility, not session availability.
5. `authoritySchema.version` describes repository-governance metadata only.
6. `generator.version` describes operational tooling only.
7. `runtimeImplementation.version` belongs to the downstream consumer implementation.
8. `advisoryHelloVersion` is observed diagnostics only.
9. No two dimensions are required to have equal numeric values.
10. Runtime feature support comes from wire/profile/capability/registry authority and conformance, not from comparing unrelated version namespaces.

## 7. Existing-field compatibility mapping

| Current field | Canonical meaning after G2 | Physical action |
|---|---|---|
| `spec/vX.Y.Z` | release identity | preserve |
| `axtp_spec.version` / dispatch `spec_version` | `release.version` | preserve API/schema |
| `protocol.version` | `protocolSemantics.version` | preserve |
| `protocol.specVersion` | legacy alias of `wire.standardFrameVersion` | preserve |
| Header `Version` | normative `wire.standardFrameVersion` | preserve `0x01` |
| `protocol.registryVersion` | `registrySchema.version` projection | preserve |
| `version.yaml spec.version` | protocol-semantics legacy mirror | preserve |
| `version.yaml registry_version` | registry/schema legacy mirror | preserve |
| `version.yaml schema_version` | registry/schema legacy mirror | preserve |
| `version.yaml wire_version` | Standard Frame wire legacy mirror | preserve |
| package-local runtime `axtp.specVersion` where already used | consumer alias of `release.version` | preserve; new designs SHOULD prefer explicit release naming |
| `Hello.axtpVersion` | `advisoryHelloVersion` | preserve field and advisory behavior |
| runtime `vX.Y.Z.R` | `runtimeImplementation.version` | preserve |

## 8. Physical rename decision

**Decision: DEFER PHYSICAL MACHINE-FIELD RENAMES.**

G2 is a semantic naming closure, not a schema migration.

Reasons:

- Protocol IR fields may already be parsed by runtime/SDK/tool consumers.
- release/dispatch field names may be external automation API.
- deleting or renaming `contract/registry/version.yaml` fields could break tooling not visible to this repository.
- changing wire field names/values is unnecessary and could cross the protocol-semantic boundary.

New canonical metadata MUST identify its owner/dimension, for example `releaseVersion`, `protocolSemanticsVersion`, `standardFrameVersion`, or `registrySchemaVersion`. New bare `version`, `specVersion` or `protocolVersion` metadata is prohibited.

Any future physical cleanup requires an explicit tooling/schema migration with downstream consumer evidence.

## 9. Generated human-readable projection

`contract/generated/protocol.md` still presents historical labels equivalent to:

```text
Version
Spec Version
Registry Version
```

G2 does not change the emitter. These labels are compatibility projections with frozen meanings:

```text
Version          -> protocolSemantics.version
Spec Version     -> wire.standardFrameVersion legacy label
Registry Version -> registrySchema.version projection
```

Changing the generated labels requires a generator projection migration and regeneration; it is not required for semantic identity closure. No consumer may infer release identity from generated label `Spec Version` after G2.

## 10. Frontstage documentation closure

G2 updated:

- `release/README.md`
- `release/AXTP_SPEC_VERSIONING.zh-CN.md`
- `release/AXTP_SPEC_VERSIONING.md`
- `release/AXTP_RUNTIME_SPEC_LOCK.zh-CN.md`
- `release/AXTP_RUNTIME_SPEC_LOCK.md`
- `release/AXTP_RUNTIME_UPDATE_FLOW.md`
- `specs/50-tooling.md`
- `docs/guides/runtime.md`

All now separate release SemVer, Protocol IR semantics, wire parser generation, registry model, Hello diagnostics and runtime implementation releases.

No canonical Registry or Protocol IR value was changed.

## 11. Verification evidence

Completed G2 functional-state validation:

```text
Workflow: Validate AXTP Spec
Run:      32954862246
Head:     a28b7aeba3be8066c500a9c0b2707ee5957aa856
Result:   SUCCESS
```

The run verified together:

```text
Validate generator and generated artifacts = PASS
Validate conformance cases                  = PASS
Validate docs and protocol status           = PASS
Validate release artifact dry run           = PASS
```

This proves the G2 documentation/governance changes did not create generated drift, conformance drift, document/path/status errors, or release-artifact packaging breakage.

The exact-head closure check for the final PASS record is retained in Draft PR #12 Checks to avoid an infinite self-referential commit/run-ID loop.

## 12. Defect classification

| Finding | Class | Disposition |
|---|---|---|
| `AXTP-GOV-002` | GOV-AMBIGUITY | CLOSED-IN-G2 |
| `spec/vX.Y.Z` vs `protocol.version` collision | GOV-AMBIGUITY | CLOSED-IN-G2 naming model |
| `protocol.specVersion` ambiguous label | GOV-AMBIGUITY | compatibility alias semantics frozen; physical rename deferred |
| duplicate `contract/registry/version.yaml` / `contract/registry/core/protocol_meta.yaml` metadata surfaces | GOV-AMBIGUITY / GOV-STRUCTURE | authority clarified; physical consolidation deferred to explicit tooling/schema migration |
| generated Markdown legacy labels | DOC-DRIFT risk | semantics frozen; emitter rename deferred |
| Hello version used as possible admission gate | VERIFICATION-GAP risk | existing core spec + conformance already prove advisory behavior |

No G2 defect requires a `PROTOCOL-SEMANTIC` amendment.

## 13. Five drift reviews

### Authority drift

**PASS.** Release identity, protocol semantic identity, wire authority, registry model metadata, generator identity and runtime identity now have distinct owners. Legacy fields remain aliases rather than competing authority.

### Semantic duplication

**DEFER-WITH-OWNER.** `contract/registry/version.yaml` and `contract/registry/core/protocol_meta.yaml` still physically duplicate some values. G2 proves which surface drives Protocol IR and freezes mirror semantics; physical consolidation requires an explicit tooling/schema migration.

### Derivation drift

**PASS.** Full validation confirms no Protocol IR source value, generator behavior or generated semantic artifact changed.

### Verification drift

**PASS.** Existing `session.axtp_version_advisory` remains valid and full conformance validation passed. G2 introduces no new runtime behavior.

### Release / consumer drift

**PASS.** Existing `spec/vX.Y.Z`, artifact `axtp_spec.version`, dispatch `spec_version` and runtime `vX.Y.Z.R` formats are preserved, and release-artifact dry-run passed.

## 14. Semantic impact check

```text
Wire semantic impact = NONE
Standard Frame Version value change = NONE
Hello.axtpVersion behavior change = NONE
spec/v0.15.0 mutation = NONE
Protocol IR machine-field rename = NONE
Canonical Registry semantic change = NONE
Stable identifier change = NONE
Runtime parser migration required = NONE
Release/dispatch API field rename = NONE
```

## 15. Exit decision

**PASS**

G2 establishes a single semantic vocabulary for AXTP version identity while deliberately preserving compatibility fields. Any future physical field cleanup is a separate tooling/schema migration, not unfinished G2 work.

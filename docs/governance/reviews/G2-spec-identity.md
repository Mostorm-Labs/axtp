# AXTP G2 — Spec Identity & Version Closure

Status: **READY FOR FULL VERIFICATION**  
Prerequisite: G1 PASS  
Primary finding: `AXTP-GOV-002`

## 1. Objective

G2 closes version-name ambiguity without changing AXTP wire semantics, released `spec/v0.15.0`, runtime parser behavior, generated protocol facts, or downstream runtime binding compatibility.

The question for every version field is:

> **What exactly is being versioned?**

A numeric value is not an identity by itself. `0.15.0`, `1.0.0`, `1`, and `v0.15.0.3` may all legitimately describe the same repository/runtime ecosystem snapshot at different layers.

## 2. Protected baseline

```text
Protected release tag:    spec/v0.15.0
Protected release commit: 1bf9e89ede12470e20733d4cea4e50edad989528
G2 entry branch head:     959db6e1305bab602c4356b09de4a19fc4af263f
```

G2 MUST NOT retag, rewrite or reinterpret the protected release into another protocol/wire version namespace.

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

The collision was semantic, not numeric: the repository used the word `spec` for both immutable repository release identity and historical wire/Core generation metadata.

## 4. Version-field inventory

| Existing surface | Current value/example | Owner / producer | Real meaning found by G2 | Wire impact | G2 disposition |
|---|---|---|---|---:|---|
| Git tag `spec/vX.Y.Z` | `spec/v0.15.0` | release process | immutable repository authority snapshot | none | canonical `release.tag/version` |
| release manifest `axtp_spec.version` | `0.15.0` | release tooling | release version projection | none | canonical release projection |
| dispatch `spec_version` | `0.15.0` | runtime update workflow | release version API field | none | compatibility field; meaning frozen |
| `protocol.version` | `1.0.0` | `core/protocol_meta.yaml` -> Protocol IR | protocol semantic lineage | none | canonical semantic projection |
| `protocol.specVersion` | `1` | `core/protocol_meta.yaml` -> Protocol IR | historical Core wire/header generation | indirect; mirrors wire generation | legacy alias of `wire.standardFrameVersion` |
| Standard Frame Header `Version` | `0x01` | `specs/20-core.md` | hard parser compatibility boundary | **yes** | normative `wire.standardFrameVersion` |
| `protocol.registryVersion` | `1.0.0` | `core/protocol_meta.yaml` | registry/schema model metadata | none | legacy/current projection |
| `version.yaml spec.version` | `1.0.0` | legacy registry metadata | protocol semantic metadata mirror | none | legacy mirror; **not release version** |
| `version.yaml registry_version` | `1.0.0` | legacy registry metadata | registry model metadata | none | legacy mirror |
| `version.yaml schema_version` | `1.0.0` | legacy registry metadata | schema/model metadata | none | legacy mirror |
| `version.yaml wire_version` | `1` | legacy registry metadata | Standard Frame wire generation mirror | none by itself | legacy mirror |
| generator config/package version | `1.0.0` | operational tooling | generator implementation identity | none | `generator.version` |
| runtime/tool tag | `v0.15.0.R` | consumer repository | downstream implementation release | none | `runtimeImplementation.version` |
| `Hello.d.axtpVersion` | `"1.0.0"` | peer RPC Hello | advisory diagnostics string | yes, RPC field | `advisoryHelloVersion`; never admission authority |
| deprecated `protocolVersion/rpcVersion/negotiatedRpcVersion` | legacy | compatibility input | historical diagnostics/compatibility metadata | possibly transported | preserve/deprecate; never admission authority |

## 5. Source and consumer trace

### 5.1 Release identity

`tooling/release/manifest.template.yaml` creates:

```yaml
axtp_spec:
  version: "{{VERSION}}"
  tag: "spec/v{{VERSION}}"
  commit: "{{COMMIT}}"
```

`tooling/scripts/print-spec-version.sh` derives the printed version from a `spec/v*` tag. Runtime dispatch sends `spec_tag`, `spec_version`, `spec_repository`, `spec_commit` from this release namespace.

Therefore release `spec_version` means **repository release version**, not Protocol IR semantic or wire version.

### 5.2 Protocol IR semantic metadata

`tooling/generators/src/sourceLoader.ts` loads `contract/registry/core/protocol_meta.yaml` as `protocolMeta`.

`tooling/generators/src/protocolBuilder.ts` directly projects:

```text
source.protocolMeta
  -> buildProtocolDefinitionRaw
  -> contract/protocol/axtp.protocol.yaml
```

Therefore current Protocol IR top-level `protocol.version/specVersion/registryVersion` comes from `protocol_meta.yaml`, not from the similarly named fields in `contract/registry/version.yaml`.

### 5.3 `contract/registry/version.yaml`

The loader still reads the file into `SpecModel.version`, and release artifacts still include it. Repository search found no independent live runtime/IR consumer for its `registry_version`, `schema_version`, or `wire_version` fields beyond tooling retention and documentation.

G2 therefore classifies it as a **legacy metadata mirror surface retained for compatibility**, not as a second independent compatibility authority.

### 5.4 Historical meaning of `specVersion`

The v1 Core freeze history explicitly separated:

```text
specVersion     = Core wire format generation, corresponding to Header Version
registryVersion = registry evolution, independent from wire format
```

That history resolves the otherwise dangerous modern collision with `spec/vX.Y.Z` release tags.

G2 freezes current `protocol.specVersion: 1` as a legacy alias of Standard Frame wire generation. It MUST NOT be interpreted as release `spec/v1` or `spec/v1.0.0`.

### 5.5 Hello advisory version

`specs/20-core.md` and conformance case `session.axtp_version_advisory` establish that missing, malformed, major-different, minor-different and patch-different `Hello.d.axtpVersion` values MUST NOT prevent `Hello -> Identify -> Identified` or become a feature/admission gate.

Therefore its canonical name is diagnostic-only `advisoryHelloVersion`.

## 6. Canonical SpecIdentity semantic model

G2 adopts the governance-v1 identity model as the naming authority:

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

1. `release.version` answers which immutable repository snapshot is bound.
2. `protocolSemantics.version` answers which protocol semantic lineage the current Protocol IR represents.
3. `wire.standardFrameVersion` answers whether a Standard Frame parser can safely parse the current header layout.
4. `registrySchema.version` describes registry/schema authoring model compatibility, not session availability.
5. `authoritySchema.version` describes repository-governance metadata shape only.
6. `generator.version` describes operational tooling only.
7. `runtimeImplementation.version` belongs to the downstream consumer implementation.
8. `advisoryHelloVersion` is observed diagnostics only.
9. No two dimensions are required to have equal numeric values.
10. Runtime feature support comes from wire/profile/capability/registry authority and conformance, not from comparing unrelated version namespaces.

## 7. Current-field compatibility mapping

| Current field | Canonical meaning after G2 | Physical action in G2 |
|---|---|---|
| `spec/vX.Y.Z` | release identity | preserve |
| `axtp_spec.version` / dispatch `spec_version` | `release.version` | preserve API/schema |
| `protocol.version` | `protocolSemantics.version` | preserve |
| `protocol.specVersion` | `wire.standardFrameVersion` legacy alias | preserve |
| Header `Version` | normative `wire.standardFrameVersion` | preserve `0x01` |
| `protocol.registryVersion` | `registrySchema.version` projection | preserve |
| `version.yaml spec.version` | protocol-semantics legacy mirror | preserve |
| `version.yaml registry_version` | registry/schema legacy mirror | preserve |
| `version.yaml schema_version` | registry/schema legacy mirror | preserve |
| `version.yaml wire_version` | Standard Frame wire legacy mirror | preserve |
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

New canonical metadata MUST use names that identify the owner/dimension, such as `releaseVersion`, `protocolSemanticsVersion`, `standardFrameVersion`, or `registrySchemaVersion`. New bare `version`, `specVersion` or `protocolVersion` metadata is prohibited.

A future physical cleanup requires an explicit tooling/schema migration with downstream consumer evidence. It is not hidden inside G2.

## 9. Generated human-readable projection

`contract/generated/protocol.md` currently presents historical labels equivalent to:

```text
Version
Spec Version
Registry Version
```

G2 does not change the emitter in this Gate. Those labels are now formally compatibility projections whose meanings are defined by the mapping above:

```text
Version          -> protocolSemantics.version
Spec Version     -> wire.standardFrameVersion legacy label
Registry Version -> registrySchema.version projection
```

Changing those generated labels requires modifying the generator emitter and regenerating artifacts; that is a tooling projection migration rather than a prerequisite for semantic identity closure. No consumer may infer release identity from the generated label `Spec Version` after G2.

## 10. Frontstage documentation closure

G2 updates the maintained frontstage explanation surfaces:

- `release/README.md`
- `release/AXTP_SPEC_VERSIONING.zh-CN.md`
- `release/AXTP_SPEC_VERSIONING.md`
- `release/AXTP_RUNTIME_UPDATE_FLOW.md`
- `specs/50-tooling.md`
- `docs/guides/runtime.md`

They now use explicit identity names and state that release SemVer / Protocol IR semantics / wire parser generation / registry model / Hello diagnostics / runtime implementation releases are separate namespaces.

No canonical Registry or Protocol IR value was changed to achieve this closure.

## 11. Defect classification

| Finding | Class | Disposition |
|---|---|---|
| `AXTP-GOV-002` | GOV-AMBIGUITY | FIXED-IN-G2; pending full verification |
| `spec/vX.Y.Z` vs `protocol.version` collision | GOV-AMBIGUITY | FIXED-IN-G2 naming model |
| `protocol.specVersion` ambiguous label | GOV-AMBIGUITY | compatibility alias semantics frozen; physical rename deferred |
| duplicate `version.yaml` / `protocol_meta.yaml` metadata surfaces | GOV-AMBIGUITY / GOV-STRUCTURE | authority clarified; physical consolidation deferred to explicit tooling/schema migration |
| generated Markdown legacy labels | DOC-DRIFT risk | semantics documented; emitter rename deferred |
| Hello version used as possible admission gate | VERIFICATION-GAP risk | existing core spec + conformance already prove advisory behavior |

No G2 defect requires a `PROTOCOL-SEMANTIC` amendment.

## 12. Five drift reviews

### Authority drift

**PASS, PENDING FULL-CI CONFIRMATION.** Release identity, protocol semantic identity, wire authority, registry model metadata, generator identity and runtime identity now have distinct owners. Legacy fields remain aliases rather than competing authority.

### Semantic duplication

**DEFER-WITH-OWNER.** `contract/registry/version.yaml` and `core/protocol_meta.yaml` still physically duplicate some values. G2 proves which surface drives Protocol IR and freezes mirror semantics; physical consolidation is intentionally not performed without a tooling/schema migration.

### Derivation drift

**PASS, PENDING FULL-CI CONFIRMATION.** No Protocol IR source value, generator behavior or generated semantic artifact is changed by G2.

### Verification drift

**PASS, PENDING FULL-CI CONFIRMATION.** Existing `session.axtp_version_advisory` already verifies that Hello version differences are advisory. G2 introduces no new runtime behavior to test.

### Release / consumer drift

**PASS, PENDING FULL-CI CONFIRMATION.** Existing `spec/vX.Y.Z`, artifact `axtp_spec.version`, dispatch `spec_version` and runtime `vX.Y.Z.R` formats are preserved; only their meaning is made explicit.

## 13. Semantic impact check

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

## 14. Exit criteria

Content-level G2 exit criteria are satisfied when:

- every maintained frontstage version reference can be assigned to an explicit canonical identity dimension;
- `spec/vX.Y.Z` is unambiguously repository release identity;
- `protocol.version` is not treated as release identity;
- `protocol.specVersion` is documented as the historical wire/Core alias rather than release Spec SemVer;
- Standard Frame Header Version remains the hard wire parser authority;
- registry/schema metadata is not treated as wire or release authority;
- `Hello.axtpVersion` remains diagnostic/advisory only;
- runtime `vX.Y.Z.R` remains downstream implementation identity;
- physical machine-field renames are not silently performed inside G2;
- fresh full repository validation proves docs, generated facts, conformance and release artifact remain valid together.

## 15. Current decision

**READY FOR FULL VERIFICATION**

The G2 semantic identity model is closed at the documentation/governance layer. The remaining Gate blocker is fresh full `Validate AXTP Spec` evidence on the completed G2 branch state.

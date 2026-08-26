# AXTP Spec Versioning

AXTP uses Git tags and GitHub Releases to publish immutable protocol-authority snapshots. The AXTP repository is the source of truth for normative specs, registry YAML, Protocol IR, generated references, conformance material, product guidance, release documentation, and artifact manifests.

Runtime repositories implement an explicit AXTP release snapshot. They must not redefine protocol facts and must not depend on floating `main` for reproducible builds.

## 1. Core rule: identify what is being versioned

AXTP has several legitimate version dimensions. Equal-looking values do not imply equal meaning, and different values do not by themselves imply incompatibility.

G2 uses these canonical names:

```yaml
specIdentity:
  release:
    version: 0.15.0
    tag: spec/v0.15.0
    commit: <exact-sha>

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

`runtimeImplementation.version` and `Hello.d.axtpVersion` are separate consumer/wire-projection dimensions, not aliases for release identity.

## 2. Identity Matrix

| Canonical name | Current example | Current authority / projection | On wire | Runtime admission authority |
|---|---|---|---:|---:|
| `release.version` | `0.15.0` | `spec/v0.15.0`, release manifest, exact commit | No | No; reproducible binding only |
| `protocolSemantics.generation` | `1` | AXTP v1 Core semantic family; governance name with no dedicated machine field yet | No | No |
| `protocolSemantics.version` | `1.0.0` | `contract/registry/core/protocol_meta.yaml -> protocol.version` | No | No |
| `wire.standardFrameVersion` | `1` / `0x01` | Standard Frame Header `Version` in `specs/20-core.md` | **Yes** | **Yes, as a frame-parser boundary** |
| `registrySchema.version` | `1.0.0` | Current registry/schema model metadata; see compatibility aliases | No | No |
| `authoritySchema.version` | `1` | Repository Governance v1 authority-metadata generation | No | No |
| `generator.version` | `1.0.0` | generator config/package metadata | No | No |
| `runtimeImplementation.version` | `v0.15.0.0`, `v0.15.0.1` | consumer runtime/tool GitHub Release | No | No |
| `advisoryHelloVersion` | `Hello.d.axtpVersion="1.0.0"` | optional RPC Hello diagnostic field | **Yes** | **Never** |

A valid snapshot can therefore simultaneously have:

```text
release.version               = 0.15.0
protocolSemantics.version     = 1.0.0
wire.standardFrameVersion     = 1
registrySchema.version        = 1.0.0
generator.version             = 1.0.0
runtimeImplementation.version = 0.15.0.R
```

These values are not required to match.

## 3. Release Identity

AXTP release tags use:

```text
spec/vMAJOR.MINOR.PATCH
```

For the governance-protected baseline:

```text
release.version = 0.15.0
release.tag     = spec/v0.15.0
release.commit  = 1bf9e89ede12470e20733d4cea4e50edad989528
```

Release identity names the **entire repository authority snapshot**. Runtime `AXTP_SPEC.lock.yaml`, release artifact manifests, and runtime-update fields such as `spec_tag`, `spec_version`, and `spec_commit` use this release namespace.

Release SemVer defines repository-release compatibility promises:

| Part | Meaning | Example | Runtime impact |
|---|---|---|---|
| MAJOR | Incompatible protocol change. | Breaking frame/header/session/RPC semantics. | Runtime must explicitly adapt. |
| MINOR | Backward-compatible capability addition. | New optional field/capability/method/event/schema/profile. | Runtime may add support. |
| PATCH | Non-breaking correction. | Documentation, description, or compatible metadata correction. | Usually no runtime behavior migration. |

A patch release must not change existing wire compatibility. Conversely, a release SemVer number must not be used directly as a session-admission decision.

## 4. Protocol Semantics Identity

The current Protocol IR contains:

```yaml
protocol:
  version: 1.0.0
```

It is derived from:

```text
contract/registry/core/protocol_meta.yaml
  -> Protocol IR
  -> generated references
```

G2 defines its canonical meaning as:

```text
protocolSemantics.version = 1.0.0
```

It identifies the semantic lineage represented by Protocol IR. It is neither an alias for `spec/v0.15.0` nor the Standard Frame Header Version.

`protocolSemantics.generation=1` names the AXTP v1 Core semantic family. G2 does not add a new machine field merely to materialize that name; a future tooling/schema migration may do so explicitly.

## 5. Wire Version

The real Standard Frame parser boundary is the Header byte defined by `specs/20-core.md`:

```text
Offset 2
Field: Version
Current value: 0x01
```

Canonical name:

```text
wire.standardFrameVersion = 1
```

A receiver that cannot safely parse the layout rejects the frame with `FRAME_VERSION_UNSUPPORTED`.

Historical `protocol.specVersion: 1` was introduced for the Core wire/header generation. G2 therefore freezes it as a **legacy compatibility alias** for `wire.standardFrameVersion`, not as the repository release version.

## 6. Registry / Schema Model Version

The repository currently retains:

```text
protocol.registryVersion: 1.0.0
contract/registry/version.yaml -> registry_version: 1.0.0
contract/registry/version.yaml -> schema_version: 1.0.0
```

G2 does not delete or physically rename those machine fields. They remain historical authoring/tooling compatibility metadata under the conceptual identity:

```text
registrySchema.version = 1.0.0
```

`contract/registry/core/protocol_meta.yaml` currently drives Protocol IR metadata. `contract/registry/version.yaml` is still loaded by tooling and shipped in the release artifact, but its fields must not be interpreted as release identity, wire admission authority, or capability-negotiation authority.

A future split into distinct registry/schema machine generations requires an explicit tooling/schema migration rather than another ambiguous bare `version` field.

## 7. Hello `axtpVersion`

`Hello.d.axtpVersion` is optional advisory diagnostic metadata.

Whether it is absent, malformed, or differs by major/minor/patch, a receiver must not reject or delay `Hello -> Identify -> Identified` because of it and must not use it as a capability/profile/codec feature gate.

Conformance case `session.axtp_version_advisory` covers these behaviors.

Canonical description:

```text
advisoryHelloVersion = peer-reported diagnostic string
```

It is not release identity, protocol-semantic authority, or the frame-parser version.

Historical `protocolVersion`, `rpcVersion`, and `negotiatedRpcVersion` are deprecated compatibility inputs. New senders should omit them; receivers may read them but must not promote them into session-admission authority.

## 8. Generator Identity

Generator identity comes from operational tooling, for example:

```yaml
generator:
  name: axtp-generator
  version: 1.0.0
```

It identifies the generation tool, not AXTP runtime or wire compatibility. For strict reproducibility, an exact AXTP source commit is stronger provenance than comparing generator SemVer alone.

## 9. Runtime Implementation Identity

Runtime/tool GitHub Releases derived from a bound AXTP release use:

```text
vSPEC_MAJOR.SPEC_MINOR.SPEC_PATCH.RUNTIME_REVISION
```

For example:

```text
spec/v0.15.0 -> runtime v0.15.0.0
spec/v0.15.0 -> runtime v0.15.0.1
```

The first three fields coordinate with the bound AXTP **release version**. `R` is the consumer implementation's own release revision. It is not `protocolSemantics.version` and is not the wire version.

Package managers that cannot represent four numeric components may use ecosystem-specific projections while keeping the GitHub Release tag, generated runtime manifest, and `AXTP_SPEC.lock.yaml` traceable.

## 10. Existing Field Compatibility Map

| Existing field / label | G2 canonical meaning | Disposition |
|---|---|---|
| `spec/vX.Y.Z` | `release.tag` / `release.version` | canonical release identity |
| release manifest `axtp_spec.version` | `release.version` | canonical release projection |
| dispatch `spec_version` | `release.version` | compatibility/API field; meaning frozen |
| `protocol.version` | `protocolSemantics.version` | current machine projection; preserve |
| `protocol.specVersion` | `wire.standardFrameVersion` | legacy ambiguous name; preserve, do not introduce anew |
| Standard Frame Header `Version` | `wire.standardFrameVersion` | normative wire authority |
| `protocol.registryVersion` | `registrySchema.version` | current/legacy projection; preserve |
| `version.yaml spec.version` | mirror of `protocolSemantics.version` | legacy metadata mirror, not release version |
| `version.yaml registry_version` | mirror of `registrySchema.version` | legacy metadata mirror |
| `version.yaml schema_version` | mirror of `registrySchema.version` | legacy metadata mirror |
| `version.yaml wire_version` | mirror of `wire.standardFrameVersion` | legacy metadata mirror |
| `generator.version` | `generator.version` | operational tooling identity |
| runtime `vX.Y.Z.R` | `runtimeImplementation.version` | consumer identity |
| `Hello.d.axtpVersion` | `advisoryHelloVersion` | diagnostics only |

## 11. Physical Rename Policy

G2 **does not physically rename** historical fields already present in Protocol IR, generated output, release artifacts, runtime parsers, or dispatch payloads. A field name can itself be part of a consumer API/schema.

Rules:

1. New canonical metadata must identify what is versioned; do not introduce new bare `version`, `specVersion`, or `protocolVersion` fields.
2. Existing ambiguous fields remain compatibility aliases with meanings frozen by this document.
3. Future machine-field deletion/renaming requires a separate tooling/schema migration with downstream consumer validation.
4. G2 documentation governance must not change wire values, stable IDs, runtime parser behavior, or Hello compatibility behavior.

## 12. Rules

- Do not describe `protocol.version=1.0.0` as “the current release is spec/v1.0.0”.
- Do not equate Standard Frame `Version=1` with the repository release major version.
- Do not use runtime package/release versions as AXTP protocol-semantic versions.
- Do not use `Hello.axtpVersion` for feature negotiation or session admission.
- Runtime builds must bind `spec/vX.Y.Z`, an exact commit, or a verifiable release artifact; never floating `main`.
- Do not hand-edit generated outputs for versioning; change canonical source/tooling and regenerate.

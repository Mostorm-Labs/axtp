# AXTP Runtime Spec Lock

Runtime repositories should declare the AXTP **release identity** they bind. The preferred repository-level file is:

```text
AXTP_SPEC.lock.yaml
```

This file makes runtime builds reproducible and auditable. Runtimes must not depend directly on the AXTP `main` branch.

In this document, Spec tag, `version`, and `compatibility` all belong to the **`release.version` namespace**. They do not mean Protocol IR `protocol.version`, the Standard Frame Header Version, registry/schema model version, or `Hello.axtpVersion`.

## Lock File Format

```yaml
axtp_spec:
  repository: https://github.com/Mostorm-Labs/axtp
  tag: spec/v0.15.0
  version: 0.15.0
  commit: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  compatibility: ">=0.15.0 <0.16.0"
  updated_at: "YYYY-MM-DD"
```

Fields:

| Field | Meaning |
|---|---|
| `repository` | AXTP authority repository URL. |
| `tag` | Exact `release.tag` used by the runtime. |
| `version` | `release.version`, with the `spec/v` prefix removed. |
| `commit` | Exact release commit resolved by the tag, used for audit and reproducible builds. |
| `compatibility` | AXTP **release-version range** the runtime declares it can bind/verify; not a session-admission rule. |
| `updated_at` | Date the lock was updated. |

Package metadata may repeat the same information, but source control should still keep an explicit release binding.

## Do Not Treat Lock Version As Wire Version

These values can all be valid at the same time:

```text
AXTP release lock            = spec/v0.15.0
Protocol IR protocol.version = 1.0.0
Standard Frame Version       = 1
Hello.axtpVersion            = "1.0.0" (advisory)
```

The lock value `0.15.0` answers only which immutable repository snapshot the runtime implements. Frame parsing is governed by the Standard Frame Header Version; optional feature availability is governed by profile/capability/registry authority.

## Runtime Release Version

Runtime/tool GitHub Release tags use the locked **release version** plus a runtime revision:

```text
spec/vX.Y.Z -> vX.Y.Z.0
spec/vX.Y.Z -> vX.Y.Z.1
```

The first runtime release aligned with a release tag uses revision `0`. Later implementation-only fixes that keep the same `AXTP_SPEC.lock.yaml` release snapshot increment only the fourth field.

If a package ecosystem cannot use four numeric fields, keep the four-part value in runtime release metadata, a generated manifest, or a root `VERSION` file and map the package-manager version separately. Package metadata must not be the only place that records AXTP release binding.

## C++ Runtime

C++ runtimes should depend on a fixed AXTP Spec tag or commit. Two common options are Git submodules and CMake `FetchContent`.

### Git Submodule

```bash
git submodule add https://github.com/Mostorm-Labs/axtp third_party/axtp-spec
git -C third_party/axtp-spec checkout spec/v0.15.0
git add .gitmodules third_party/axtp-spec AXTP_SPEC.lock.yaml
```

If the tag cannot be tracked like a branch, check out the fixed commit resolved by the tag and record both tag and commit in `AXTP_SPEC.lock.yaml`.

### CMake FetchContent

```cmake
include(FetchContent)

FetchContent_Declare(
  axtp_spec
  GIT_REPOSITORY https://github.com/Mostorm-Labs/axtp.git
  GIT_TAG spec/v0.15.0
)

FetchContent_MakeAvailable(axtp_spec)
```

C++ runtimes should prefer fixed tags over floating branches. If a build system vendors generated headers, the lock file should still identify the AXTP release snapshot that produced those headers.

## TypeScript Runtime

Short term, TypeScript runtimes can record AXTP release metadata in `package.json`:

```json
{
  "name": "@mostorm/axtp-ts-runtime",
  "version": "0.15.0-runtime.1",
  "axtp": {
    "specVersion": "0.15.0",
    "specTag": "spec/v0.15.0",
    "specRepository": "https://github.com/Mostorm-Labs/axtp"
  }
}
```

The package-local `axtp.specVersion` above is a historical consumer field name. G2 freezes its meaning as **`release.version`**. It is not the same namespace as historical AXTP Protocol IR `protocol.specVersion`, which is a legacy alias of Standard Frame wire generation.

New consumer metadata should prefer explicit names such as `releaseVersion` / `releaseTag`, but G2 does not break existing package metadata consumers merely to rename fields.

If there is no published `@mostorm/axtp-spec` package yet, a git dependency may be used:

```json
{
  "devDependencies": {
    "@mostorm/axtp-spec": "github:Mostorm-Labs/axtp#spec/v0.15.0"
  }
}
```

Long term, AXTP may publish a machine-readable `@mostorm/axtp-spec` package containing the same consumable contract shape as the release artifact: `contract/`, `specs/`, `conformance/`, role/product docs, release docs, changelog, and manifest.

## Flutter And Dart Runtime

Flutter/Dart runtime package versions remain in `pubspec.yaml`:

```yaml
name: axtp_flutter_runtime
version: 0.15.0-runtime.1
```

Do not hide AXTP release binding inside the Dart package version. Use `AXTP_SPEC.lock.yaml`, generated release metadata, or a project-local `axtp_spec.yaml`:

```yaml
axtp_spec:
  repository: https://github.com/Mostorm-Labs/axtp
  tag: spec/v0.15.0
  version: 0.15.0
  compatibility: ">=0.15.0 <0.16.0"
```

Long term, AXTP may publish an `axtp_spec` Dart package containing generated Dart types, schema/capability metadata, and conformance cases derived from the locked release snapshot.

## Submodule Boundaries

Submodules can be useful for C++, internal runtimes, mock servers, conformance runners, and firmware integration projects. They are not always appropriate for npm or pub package publication.

Runtime repositories may use submodules during development, but release artifacts must declare an exact AXTP release identity. All dependencies must point to a tag or commit; none may float on `main`.

See [AXTP Spec Versioning](AXTP_SPEC_VERSIONING.md) for the complete identity mapping.

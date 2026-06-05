# AXTP Runtime Spec Lock

Runtime repositories should declare the AXTP Spec version they implement. The preferred repository-level file is:

```text
AXTP_SPEC.lock.yaml
```

This file makes runtime builds reproducible and auditable. Runtimes must not depend directly on the AXTP `main` branch.

## Lock File Format

```yaml
axtp_spec:
  repository: https://github.com/Mostorm-Labs/axtp
  tag: spec/v0.3.0
  version: 0.3.0
  commit: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  compatibility: ">=0.3.0 <0.4.0"
  updated_at: "YYYY-MM-DD"
```

Fields:

| Field | Meaning |
|---|---|
| `repository` | AXTP spec repository URL. |
| `tag` | Exact AXTP Spec tag used by the runtime. |
| `version` | Spec version without the `spec/v` prefix. |
| `commit` | Commit hash resolved by the tag, used for audit and reproducible builds. |
| `compatibility` | Spec range the runtime is expected to support. |
| `updated_at` | Date the lock was updated. |

Package metadata may repeat the same information, but the runtime should still keep a clear spec binding in source control.

## C++ Runtime

C++ runtimes should depend on a fixed AXTP Spec tag or commit. Two common options are Git submodules and CMake `FetchContent`.

### Git Submodule

```bash
git submodule add https://github.com/Mostorm-Labs/axtp third_party/axtp-spec
git -C third_party/axtp-spec checkout spec/v0.3.0
git add .gitmodules third_party/axtp-spec AXTP_SPEC.lock.yaml
```

If the tag cannot be tracked like a branch, check out the fixed commit resolved by the tag and record both tag and commit in `AXTP_SPEC.lock.yaml`.

### CMake FetchContent

```cmake
include(FetchContent)

FetchContent_Declare(
  axtp_spec
  GIT_REPOSITORY https://github.com/Mostorm-Labs/axtp.git
  GIT_TAG spec/v0.3.0
)

FetchContent_MakeAvailable(axtp_spec)
```

C++ runtimes should prefer fixed tags over floating branches. If a build system vendors generated headers, the lock file should still identify the AXTP Spec snapshot that produced those headers.

## TypeScript Runtime

Short term, TypeScript runtimes can record AXTP Spec metadata in `package.json`:

```json
{
  "name": "@mostorm/axtp-ts-runtime",
  "version": "0.3.1",
  "axtp": {
    "specVersion": "0.3.0",
    "specTag": "spec/v0.3.0",
    "specRepository": "https://github.com/Mostorm-Labs/axtp"
  }
}
```

If there is no published `@mostorm/axtp-spec` package yet, a git dependency may be used:

```json
{
  "devDependencies": {
    "@mostorm/axtp-spec": "github:Mostorm-Labs/axtp#spec/v0.3.0"
  }
}
```

Long term, AXTP may publish a machine-readable spec package:

```text
@mostorm/axtp-spec
```

That package should contain machine-readable spec material such as `registry/`, schemas, generated TypeScript metadata, and test/conformance assets. Runtime packages can then declare:

```json
{
  "peerDependencies": {
    "@mostorm/axtp-spec": "^0.3.0"
  }
}
```

## Flutter And Dart Runtime

Flutter/Dart runtime package versions remain in `pubspec.yaml`:

```yaml
name: axtp_flutter_runtime
version: 0.3.0
```

Do not hide AXTP Spec version inside the Dart package version. Use `AXTP_SPEC.lock.yaml` or a project-local `axtp_spec.yaml`:

```yaml
axtp_spec:
  repository: https://github.com/Mostorm-Labs/axtp
  tag: spec/v0.3.0
  version: 0.3.0
  compatibility: ">=0.3.0 <0.4.0"
```

Long term, AXTP may publish a Dart package:

```text
axtp_spec
```

That package can contain generated Dart types, schema metadata, capability registry data, and conformance fixtures.

## Submodule Boundaries

Submodules can be useful for C++, internal runtimes, mock servers, conformance runners, and firmware integration projects. They are not always appropriate for npm or pub package publication.

Runtime repositories may use submodules during development, but release artifacts must declare an exact AXTP Spec version. All dependencies must point to a tag or commit; none may float on `main`.

# AXTP Runtime Update Flow

AXTP Spec releases are the source of truth for runtime, SDK, tooling, and mock
server updates. Runtime repositories must implement a released Spec tag or an
explicit commit; they must not track the AXTP `main` branch as a reproducible
build dependency.

In this document, **Spec version means `release.version` derived from the
`spec/vX.Y.Z` tag**. It does not mean Protocol IR `protocol.version`, Standard
Frame Header Version, registry/schema model version, or `Hello.axtpVersion`.

## Release Contract

- AXTP Spec tags use `spec/vMAJOR.MINOR.PATCH`, for example `spec/v0.15.0`.
- The main AXTP repository publishes release artifacts with `contract/`,
  `specs/`, `conformance/`, role/product docs, release docs, a changelog, and
  a manifest.
- Runtime repositories record their release binding in `AXTP_SPEC.lock.yaml`.
- Runtime repositories expose runtime-local upgrade and lock-check scripts
  named `upgrade-axtp-spec.sh spec/vX.Y.Z` and `check-axtp-spec-lock.sh`.
- Runtime/tool GitHub release tags extend the bound AXTP **release version**
  with an implementation revision: `spec/vX.Y.Z` maps to `vX.Y.Z.0` for the
  first runtime/tool release, and later runtime-only fixes use `vX.Y.Z.R`.
- Runtime upgrades create pull requests, auto-merge after checks pass, create
  runtime/tool tags, and then create GitHub Releases.

The update automation does not infer feature compatibility from release version
numbers. Runtime support remains governed by the bound Protocol IR/specs,
transport/profile/capability facts, wire parser rules, and conformance evidence.

## Mode A: Spec Tag Automation

The default release path is fully automated:

1. AXTP maintainers push `spec/vX.Y.Z`.
2. The `spec-release-dispatch` workflow builds `dist/axtp-spec-vX.Y.Z.zip`.
3. The workflow creates or updates the AXTP Spec GitHub Release.
4. The workflow sends `axtp_spec_released` repository dispatch events to the
   runtime/tool repositories.
5. Runtime/tool repositories update `AXTP_SPEC.lock.yaml`, set their own
   release version to `X.Y.Z.0`, regenerate artifacts, and open upgrade PRs.
6. Upgrade PR checks run and GitHub auto-merge is enabled for automation
   branches only.
7. After merge to `main`, the runtime/tool repository creates `vX.Y.Z.0`.
8. The runtime/tool `vX.Y.Z.0` tag creates the GitHub Release.

## Mode B: Manual Backfill Dispatch

Manual workflow dispatch remains available for backfills and dry runs:

1. AXTP maintainers run the `notify-runtimes` workflow with
   `spec_tag=spec/vX.Y.Z`.
2. In `dry_run` mode it prints the repositories and payload without calling the
   GitHub API.
3. With `dry_run=false`, it sends the same `axtp_spec_released` event used by
   tag automation.

Both workflows use the `AXTP_RUNTIME_DISPATCH_TOKEN` secret. This PAT must be
configured in the `axtp` repository and must be able to send
`repository_dispatch` events to the runtime/tool repositories.

The dispatch payload includes:

- `spec_tag` = canonical `release.tag`, for example `spec/v0.15.0`;
- `spec_version` = canonical `release.version`, for example `0.15.0`;
- `spec_repository` = source repository identity;
- `spec_commit` = exact release commit.

`spec_version` is a historical public field name and is preserved for
compatibility. G2 freezes its meaning as **release version only**.

## Verification

For an end-to-end test release such as `spec/v0.0.2`, verify:

- The `axtp` release workflow uploads `dist/axtp-spec-v0.0.2.zip`.
- Each runtime/tool repository opens or updates
  `automation/upgrade-axtp-spec-v0.0.2`.
- Each generated manifest records AXTP release `0.0.2` and runtime/tool version
  `0.0.2.0`.
- Each automation PR auto-merges only after checks pass.
- Each runtime/tool repository creates `v0.0.2.0` and a GitHub Release.

## Version Contract

Runtime repositories keep three release/implementation records:

- AXTP `release.version` from the main repository tag, for example
  `spec/v0.15.0` / `0.15.0`.
- `runtimeImplementation.version` from the runtime/tool repository, for example
  `v0.15.0.0` or `v0.15.0.1`.
- Runtime generated artifact version/provenance from the runtime repository
  generated manifest or release metadata.

These records must not be confused with AXTP Protocol IR
`protocolSemantics.version`, Standard Frame `wire.standardFrameVersion`, or
optional `Hello.d.axtpVersion` diagnostics.

Runtime repositories use runtime tags `vX.Y.Z.R`; they must not tag runtime
releases as `spec/vX.Y.Z`.

The first runtime/tool release for a Spec tag uses revision `0`. Later fixes
that do not change the AXTP release lock increment only the fourth field:

```text
spec/v0.8.4 -> runtime/tool v0.8.4.0
spec/v0.8.4 -> runtime/tool v0.8.4.1
spec/v0.8.5 -> runtime/tool v0.8.5.0
```

Package-manager versions may need ecosystem-specific projections when a
four-part version is not legal. In that case, the GitHub release tag and
generated manifest remain canonical consumer release identity, and the package
metadata must keep the AXTP Spec lock visible.

AXTP Spec releases do not publish npm, pub, PyPI, Docker, or other package
registries. Runtime/tool GitHub Releases are created only from runtime/tool
`vX.Y.Z.R` tags.

## Runtime Repositories

The real runtime and mock repositories are:

- `axtp-c-runtime`
- `axtp-cpp-runtime`
- `axtp-flutter-runtime`
- `axtp-ts-runtime`
- `axtp-python-runtime`
- `axtp-mock-server`

## Non-Goals

- Do not automatically merge ordinary development PRs.
- Do not publish npm, pub, PyPI, Docker, or registry packages from an AXTP Spec
  release.
- Do not make runtime repositories depend on AXTP `main`.
- Do not redefine specs, registry facts, schemas, or conformance material in
  runtime repositories.
- Do not use release `spec_version` as a generic session admission or feature
  negotiation gate.

## Required Repository Settings

- The `axtp` repository must define `AXTP_RUNTIME_DISPATCH_TOKEN`.
- Runtime/tool repositories must allow GitHub Actions to create pull requests.
- Runtime/tool repositories must allow GitHub auto-merge.
- Runtime/tool repositories must allow GitHub Actions to create tags and
  releases.
- Runtime/tool repositories should define `AXTP_RUNTIME_AUTOMATION_TOKEN` when
  automation-created PRs must trigger downstream `pull_request` checks. If this
  secret is absent, workflows fall back to the repository `GITHUB_TOKEN`.

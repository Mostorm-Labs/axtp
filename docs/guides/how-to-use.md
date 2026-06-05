# AXTP How To Use

This guide explains how to use the AXTP main repository after the runtime
split. The main repository is for protocol facts, drafts, generated references,
conformance cases, release artifacts, and maintainer workflows. Language
runtime code and runtime-specific API docs live in their own repositories.

## 1. Understand The Source Model

AXTP uses a staged protocol pipeline:

```text
docs/business/<requirement>.md
  -> docs/flows/<scenario>.md
  -> docs/protocol/<domain>/<domain.feature>.md
  -> registry/**/*.yaml + registry/domains/**/*.yaml
  -> protocol/axtp.protocol.yaml
  -> docs/generated/**
```

Only YAML facts and generated outputs are current implementation contracts.
Business docs, flow plans, protocol drafts, and legacy migration notes are
review inputs until they are adopted into `registry/`.

## 2. Find Current Protocol Facts

Read the generated protocol reference:

```bash
sed -n '1,220p' docs/generated/protocol.md
```

Use the generated registries for focused lookup:

```bash
sed -n '1,120p' docs/generated/method_registry.generated.md
sed -n '1,120p' docs/generated/event_registry.generated.md
sed -n '1,120p' docs/generated/error_code.generated.md
sed -n '1,120p' docs/generated/capability_registry.generated.md
```

Use the machine-readable protocol model for tooling:

```bash
jq '.protocol.version' docs/generated/protocol.json
```

## 3. Run The Generator

Install dependencies:

```bash
pnpm --dir generators install
```

Build and validate source YAML:

```bash
pnpm --dir generators build
pnpm --dir generators validate:sources
```

Regenerate all main-repo protocol artifacts:

```bash
pnpm --dir generators generate
pnpm --dir generators validate:protocol
```

Run generator tests:

```bash
pnpm --dir generators test
```

## 4. Validate Conformance Cases

Conformance cases live under `docs/conformance/`.

```bash
pnpm --dir generators build
scripts/validate-conformance.sh
```

Runtime repositories should point `AXTP_SPEC_PATH` at this repository or at a
released spec artifact. Source checkouts use `docs/conformance/`; release
artifacts may expose the same content as top-level `conformance/` for
compatibility.

## 5. Work From Business Need To Protocol PR

1. Put raw product context, user goals, field feedback, or UI sketches in
   `docs/business/<requirement>.md`.
2. If the input is a scenario or workflow, create a flow plan in
   `docs/flows/<scenario>.md` using `docs/dev/skills/10-plan-protocol-flow/`.
3. Create or update an RFC draft in
   `docs/protocol/<domain>/<domain.feature>.md`.
4. Review naming, schema, method, event, error, capability, profile, and legacy
   evidence. Do not move unresolved `[REVIEW-*]` facts into YAML.
5. Adopt confirmed facts into `registry/` or `registry/domains/**`.
6. Regenerate protocol outputs and validate.
7. Runtime repositories consume the released spec tag or explicit commit through
   their own generators and lock files.

## 6. Use Legacy Material

Legacy material is consolidated under `docs/legacy-migration/`:

| Path | Purpose |
|---|---|
| `evidence/` | Original legacy documents and spreadsheets. |
| `classification/` | Domain-feature intake generated from legacy evidence. |
| `plans/` | Human migration plans and migration matrix. |
| `generated/` | Generated migration candidates and adapter planning outputs. |
| `planning/` | Legacy compatibility planning references. |

Regenerate classification intake:

```bash
python3 tooling/legacy_classification/classify_legacy_protocols.py
```

Regenerate migration candidates:

```bash
python3 tooling/migration/generate_legacy_migration_outputs.py
```

Legacy evidence does not become protocol fact until it is reviewed and adopted
into YAML.

## 7. Release A Spec Artifact

Check the release docs:

```bash
sed -n '1,120p' docs/release/README.md
```

Build a local spec artifact for the current version:

```bash
scripts/build-spec-artifact.sh "$(scripts/print-spec-version.sh)"
```

The release artifact includes specs, registry facts, conformance cases, legacy
migration material, and `CHANGELOG.md`.

## 8. Runtime Repositories

Runtime, SDK, CLI, mock server, and language-specific API design are maintained
outside this repository:

- `https://github.com/Mostorm-Labs/axtp-c-runtime`
- `https://github.com/Mostorm-Labs/axtp-cpp-runtime`
- `https://github.com/Mostorm-Labs/axtp-flutter-runtime`
- `https://github.com/Mostorm-Labs/axtp-ts-runtime`
- `https://github.com/Mostorm-Labs/axtp-python-runtime`
- `https://github.com/Mostorm-Labs/axtp-mock-server`

Do not add language-specific runtime design back into `docs/dev/`.

## 9. Commit Checks

For docs-only changes:

```bash
pnpm --dir generators build
pnpm --dir generators test
pnpm --dir generators validate:sources
pnpm --dir generators validate:protocol
git diff --check
```

For protocol fact changes:

```bash
pnpm --dir generators build
pnpm --dir generators test
pnpm --dir generators validate:sources
pnpm --dir generators generate
pnpm --dir generators validate:protocol
scripts/validate-conformance.sh
git diff --check
```

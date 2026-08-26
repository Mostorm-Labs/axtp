---
name: generate-axtp-protocol
description: Stage 50 generation skill for accepted AXTP registry YAML facts. Use when specs and contract/registry/domain YAML are already updated and the user asks to generate, regenerate, build, emit, refresh, validate, or publish AXTP protocol artifacts.
---

# Generate AXTP Protocol

Stage 50 runs the deterministic AXTP generation stage after Stage 30 or Stage 40 has updated canonical Registry facts.

## Authority invariant

Generation direction is strictly one-way:

```text
contract/registry/**
        ↓
Protocol IR
        ↓
contract/generated/** + contract/mcp/** + contract/test-vectors/**
```

`workspace/protocol/**` is never generator input and never generator output. Stage 50 MUST NOT modify proposal frontmatter, change proposal lifecycle, set `contract: true`, set `generated: true`, or otherwise upgrade a proposal's authority class.

If a generated artifact disagrees with a proposal, do not copy the proposal into generated output. Resolve the canonical Registry/source-of-truth question first.

## Boundaries

- Input is `contract/registry/**/*.yaml` and `contract/registry/domains/**/*.yaml`.
- Registry/Profile/Capability Types specs are governance context, not machine input for generation.
- Do not infer new protocol facts from `workspace/protocol/**` or `specs/**` during generation.
- Do not edit `workspace/protocol/**` as part of Stage 50.
- Do not hand-edit generated outputs.
- If validation fails because source YAML or Generator logic is wrong, stop and report the source issue unless the user explicitly asked to fix it.

## Required context

Read only what is needed:

```text
specs/50-tooling.md
contract/registry/**/*.yaml
contract/registry/domains/**/*.yaml
tooling/generators/package.json
```

If validation errors mention wire facts, also read the relevant Core/Registry/Codec specs.

## Workflow

### 1. Confirm inputs

Check the working tree and identify source changes:

```bash
git status --short
git diff --name-only -- contract/registry specs workspace/protocol tooling/generators
```

If only a proposal changed and no canonical YAML was adopted, do not generate. Route to Stage 30 or Stage 40 as appropriate.

A documentation-only proposal metadata migration is intentionally outside generation and should produce no generated protocol diff.

### 2. Run generator pipeline

Run:

```bash
pnpm --dir tooling/generators build
pnpm --dir tooling/generators test
pnpm --dir tooling/generators validate:sources
pnpm --dir tooling/generators generate
pnpm --dir tooling/generators validate:protocol
git diff --check
```

### 3. Verify outputs

Expected generated outputs include:

```text
contract/protocol/axtp.protocol.yaml
contract/generated/protocol.md
contract/generated/protocol.json
contract/generated/*_registry.generated.md
contract/mcp/*.generated.json
contract/test-vectors/*
tooling/generators/src/__snapshots__/*
```

Use `git diff --name-only` and targeted checks to confirm accepted canonical facts appear in Protocol IR/generated outputs.

Also confirm that no `workspace/protocol/**` file changed as a side effect of generation.

### 4. Handle failures

- `validate:sources` failure: fix/report canonical YAML or spec alignment; do not patch generated files.
- unexpected generated files: inspect generator configuration before proceeding.
- `validate:protocol` failure: compare Protocol IR, generated docs, canonical Registry and normative specs.
- snapshot changes: update only after confirming the generated output intentionally changed.

## Final report

Report:

- canonical source inputs detected;
- commands run and results;
- generated files changed;
- validation failures or skipped checks;
- confirmation that generated files were produced by the generator;
- confirmation that Stage 50 did not modify proposal authority metadata.

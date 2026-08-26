# AXTP Consumer Adoption Evidence

This directory is mutable repository-governance evidence for downstream adoption. It does not define AXTP protocol semantics, canonical registry facts, generated contracts, or immutable Spec release identity.

The Spec release defines what a consumer is expected to implement. `ledger.yaml` records whether a specific runtime, SDK, tool, or mock has externally demonstrated adoption.

## Status

- `unverified`: evidence is absent or insufficient.
- `in-progress`: adoption work exists but has not passed the external gate.
- `pass`: exact release binding, implementation identity, declared profiles, conformance PASS, and exact CI-run evidence exist.
- `fail`: external evidence shows the adoption gate failed.
- `stale`: prior evidence no longer proves current consumer state.

A matching version string, repository existence, release notification, or upgrade request is not enough for `pass`.

## PASS evidence

A PASS entry must include the consumer repository, exact AXTP Spec tag/commit, consumer implementation version/commit, declared profiles, conformance PASS, exact GitHub Actions run identity and tested commit, and a verification timestamp.

The initial entries are intentionally `unverified`. G5 does not infer downstream PASS from release automation and does not invent missing consumer evidence.

Validate changes with:

```bash
node tooling/scripts/validate-consumer-evidence.mjs .
```

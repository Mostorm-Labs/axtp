# AXTP Repository Governance

Status: **Current Governance Navigation**

This directory contains repository-governance authority and Gate evidence. It is repository-only material and is not part of the AXTP runtime protocol contract or immutable Spec release authority.

## Current governance authority

Read these together:

1. `AXTP_AUTHORITY_ARCHITECTURE_AND_REPOSITORY_GOVERNANCE_V1.md` — primary Governance v1 authority.
2. `AXTP_GOVERNANCE_V1_G5_SCOPE_AMENDMENT.md` — current scope-specific amendment; supersedes only Section 18 G5 `Required work` and `Exit criteria`.
3. `findings.yaml` — machine-readable G0–G5 / Task 7 finding register.
4. `reviews/G0-G5-final-closure.md` — current program-level closure review and final authority map.

No other review record may override these current governance surfaces.

## Gate closure records

| Gate | Current closure / evidence record |
|---|---|
| G0 | `reviews/G0-baseline.md` |
| G1 | `reviews/G1-authority-boundary.md` |
| G2 | `reviews/G2-spec-identity.md` |
| G3 | `reviews/G3-rule-verification.md` |
| G4 | `reviews/G4-derivation-golden-vectors.md` |
| G5 | `reviews/G5-closure.md` |

`reviews/G5-information-architecture-consumer.md` preserves the approved G5 scope/design and pre-CI review history. Its pre-CI status is superseded by `reviews/G5-closure.md`.

`reviews/G5-ci-attempts.md` is historical environment/CI incident evidence. It must not be used as the current Gate verdict.

## Authority boundary

Repository governance defines process, authority classification, supersession and Gate acceptance. It does not independently define AXTP wire/runtime semantics.

Runtime/SDK/Firmware implementation authority remains the frontstage chain defined by Governance v1 and `docs/README.md`:

```text
exact release / Spec lock
  -> canonical registry / normative specs
  -> Protocol IR / generated contract
  -> verification authority
```

`workspace/**`, `docs/superpowers/**`, `tooling/skills/**`, historical review records and this governance directory do not override released/canonical protocol facts.

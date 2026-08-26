# AXTP G2 — Spec Identity & Version Closure

Status: **NOT STARTED**  
Prerequisite: G1 PASS  
Primary finding: `AXTP-GOV-002`

## Purpose

This file is the review record reserved for G2. G2 must not begin until G1 Authority Boundary Closure is PASS.

G2 will inventory and disambiguate release identity, protocol-semantics identity, Standard Frame wire version, registry/schema version, authority-schema version, generator version, runtime implementation version and advisory Hello version without changing AXTP wire semantics or invalidating `spec/v0.15.0` runtime bindings.

## Entry invariants

- `spec/v0.15.0` remains immutable.
- No stable protocol ID or wire-layout change is allowed.
- Existing machine fields are not renamed unless review proves the rename is tooling-only and consumer-safe; compatibility aliases are preferred when in doubt.
- G2 closes only after the five drift reviews defined by the governance authority.

No G2 decision has been made yet.

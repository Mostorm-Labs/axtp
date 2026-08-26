# AXTP G4 — Derivation & Golden Vector Closure

Status: **NOT STARTED**  
Prerequisite: G3 PASS  
Primary finding: `AXTP-GOV-003`

## Purpose

This file is the review record reserved for G4. G4 must not begin until G3 Normative Rule & Verification Closure is PASS.

G4 will audit derivation boundaries, with particular attention to `contract/test-vectors/**`, and replace pseudo-generated binary truth with authority-backed vector recipes and deterministic derivation where required.

## Entry invariants

- Current released `spec/v0.15.0` artifacts are historical immutable evidence.
- Any generator/tooling change must preserve existing protocol semantics unless a separate protocol amendment is created.
- Generated outputs may never become independent handwritten truth.
- G4 requires normal generator/CI validation before PASS.
- G4 closes only after the five drift reviews defined by the governance authority.

No G4 decision has been made yet.

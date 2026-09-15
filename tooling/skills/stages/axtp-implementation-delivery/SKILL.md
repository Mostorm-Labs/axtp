---
name: axtp-implementation-delivery
description: AXTP implementation-delivery skill for turning trusted semantic, architecture, and verification authority into an executable implementation plan/package, controlled coding execution, CI evidence, and resumable result. Use for Aegis P30-P33 after verification is established. Reuses aegis-implementation and coding agents such as Codex; never issues a P34 Gate verdict.
---

# AXTP Implementation Delivery

Treat P30-P33 as one user-facing phase: **Implementation Delivery**. Keep the package approval checkpoint visible; hide ordinary coding substeps behind the execution contract.

## Required flow

1. Require established Semantic, Architecture, and Verification Authority bundles plus repository identity.
2. Use `aegis-implementation` for:
   - P30 Implementation Planning
   - P31 Task Packaging
   - P32 Implementation control
   - P33 Resume Interrupted Work
3. At P31 freeze an `EXECUTION_CLOSURE_CONTRACT` containing required/forbidden changes, exact scope, tests/oracles, hosted verification, evidence classes, terminal success, blockers, and continuation policy.
4. Require human approval of the materialized package before code mutation.
5. Transfer code execution to the coding surface (normally Codex) with exact `package_ref`, repository identity, `task_anchor`, and optional `resume_cursor`.
6. Continue until terminal success or an explicit blocker; do not stop at arbitrary intermediate checkpoints.
7. Materialize reviewer-accessible exact result/evidence required by the package.

## Output contract

```yaml
ImplementationDeliveryBundle:
  implementation_plan_ref:
  package_ref:
  package_materialization_ref:
  result_revision:
  result_tree:
  evidence_refs: []
  hosted_run_refs: []
  status: COMPLETE | BLOCKED_AUTHORITY | BLOCKED_PACKAGE_BINDING | BLOCKED_VERIFICATION | BLOCKED_EXECUTION_DIVERGENCE
  next_dependency: axtp-gate-integration
```

## Boundaries

- P32 may not redesign upstream Authority or Verification.
- Package omissions return to P31; Verification omissions return to P20; semantic/architecture defects return to their owners.
- Green CI is not a Gate verdict.
- Generated protocol artifacts may only be refreshed from already-adopted protocol authority using the existing generator workflow.

## Human review

Required at P31 package authorization. Ordinary P32 coding may run automatically inside the frozen package. A separate human/independent Gate review follows.

## Automation level

`HIGH_AFTER_APPROVAL`: planning/package drafting is assisted; approved code execution and CI are highly automated.

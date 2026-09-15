---
name: axtp-gate-integration
description: AXTP independent Gate and integration skill for auditing an implementation result, classifying defects, reverifying repairs, and deciding development-baseline, repository-integration, or release disposition. Use for Aegis P34-P36 after implementation evidence is materialized. Reuses aegis-gate-review and may route to release-axtp-spec only when the user explicitly chooses a spec release.
---

# AXTP Gate & Integration

Treat P34-P36 plus the post-Gate baseline decision as one user-facing phase, while preserving independent review and defect ownership.

## Required flow

1. Require an `ImplementationDeliveryBundle` with reviewer-accessible exact result/evidence.
2. Use `aegis-gate-review` for:
   - P34 Frozen Requirement Audit, Frozen Evidence Audit, Repository Reality Audit
   - P35 defect ownership classification when blocked
   - P36 implementation-owned repair/reverification when applicable
3. Do not move the frozen completion target merely for extra confidence.
4. If Gate passes, choose an explicit integration disposition:
   - continue on verified development baseline
   - integrate to a canonical development branch
   - merge/release to stable main
   - defer integration
5. Do not merge or release automatically unless the user explicitly authorizes that action.
6. If a spec release is chosen, reuse `tooling/skills/60-release-axtp-spec/SKILL.md` after the release preconditions are met.

## Output contract

```yaml
GateIntegrationBundle:
  gate_decision_ref:
  verdict: PASS | PASS_WITH_FINDINGS | BLOCKED
  exact_result_revision:
  blocking_findings: []
  non_blocking_findings: []
  integration_disposition: DEVELOPMENT_BASELINE | INTEGRATE | RELEASE | DEFER
  baseline_ref: null
  release_ref: null
  status: COMPLETE | BLOCKED
  next_dependency: feedback_or_new_business_input
```

## Boundaries

- Executor claims, green CI, and summaries cannot issue official P34 PASS.
- Upstream Verification/Package/Authority defects route back to their owning phase.
- A conflict during repository integration is not silently treated as a Gate failure; reconcile result identity and evidence applicability explicitly.

## Human review

Mandatory. Gate is independent; merge/release disposition is an explicit human decision.

## Automation level

`CONTROLLED`: evidence resolution and audits may be automated, but Gate verdict/integration action remains independently controlled.

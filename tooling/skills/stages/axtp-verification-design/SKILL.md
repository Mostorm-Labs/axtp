---
name: axtp-verification-design
description: AXTP verification-family skill for defining how trusted requirements, semantics, and architecture will be proven before coding. Use for Aegis P20 verification design and its authority review/materialization, including invariants, failure modes, independent oracles, fixtures, evidence artifacts, blocking versus corroborative classification, and Gate criteria. Produces a VerificationAuthorityBundle consumed by implementation packaging.
---

# AXTP Verification Design

Keep verification as a separate user-facing phase because it freezes the proof target before code exists.

## Required flow

1. Require trusted requirement/capability, Semantic Authority, and Architecture Authority.
2. Use `aegis-verification` for P20.
3. Map each material requirement through:
   `Requirement -> Invariant -> Failure Mode -> Existing Independent Coverage -> Residual Proof Gap -> Oracle -> Fixture -> Exact Execution -> Evidence -> Gate Criterion`.
4. Classify evidence as blocking only when it uniquely closes a material residual proof gap; keep confidence-only evidence corroborative.
5. Freeze exact evidence inputs, command families, fixture/corpus identities, hosted-CI requirements, and Gate criteria.
6. Complete independent review/materialization of the Verification Authority before P31 packaging.

## Output contract

```yaml
VerificationAuthorityBundle:
  verification_spec_ref:
  obligation_set_ref:
  trusted_basis_ref:
  acceptance_oracle_refs: []
  evidence_compilation_ref:
  blocking_evidence: []
  corroborative_evidence: []
  gate_criteria_ref:
  status: READY_FOR_HUMAN_REVIEW | ESTABLISHED | BLOCKED
  next_dependency: axtp-implementation-delivery
```

## Boundaries

- Do not defer undefined correctness to P34.
- Do not treat duplicated test execution as independent evidence.
- Do not redesign requirements, semantics, or architecture inside verification.
- Do not start implementation until verification authority is trusted.

## Human review

Required. The user/reviewer approves the proof target before implementation packaging.

## Automation level

`ASSISTED`: evidence design can be generated and checked automatically; blocking classification and authority acceptance require review.

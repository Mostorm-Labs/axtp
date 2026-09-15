---
name: axtp-architecture-design
description: AXTP architecture-family skill for converting trusted semantic authority into system architecture, module ownership, runtime data flow, platform contracts, and engineering/optimization boundaries. Use for Aegis P14-P18 work after semantic modeling is established. Reuses aegis-architecture and produces one reviewed ArchitectureAuthorityBundle instead of exposing five separate user-facing steps.
---

# AXTP Architecture Design

Treat P14-P18 as one user-facing phase: **Engineering Architecture**.

## Required flow

1. Require an established `SemanticAuthorityBundle`.
2. Use `aegis-architecture` as the Primary Owner for:
   - P14 System Architecture
   - P15 Module Design
   - P16 Runtime Data Flow
   - P17 Platform Contract
   - P18 Engineering / Optimization
3. Assign ownership before interfaces; freeze module contracts before runtime sequencing; model happy/failure/recovery flows before platform details; keep common semantics separate from platform realization; justify optimization with measurable cost/evidence plans.
4. Review architecture against the semantic operation contract and capability traceability.
5. Require explicit human acceptance of the architecture bundle before verification design.

## Output contract

```yaml
ArchitectureAuthorityBundle:
  system_architecture_ref:
  module_contract_ref:
  runtime_flow_ref:
  platform_contract_ref:
  engineering_plan_ref:
  status: READY_FOR_HUMAN_REVIEW | ESTABLISHED | BLOCKED
  next_dependency: axtp-verification-design
```

## Boundaries

- Do not redefine object meaning, lifecycle semantics, schema, or operation behavior.
- Do not start code implementation.
- If an upstream semantic decision is missing or contradictory, return to semantic modeling rather than patching around it.

## Human review

Required at phase exit. Architecture acceptance establishes the implementation design basis but does not authorize coding.

## Automation level

`ASSISTED`: AI may synthesize and audit architecture; humans approve ownership, platform tradeoffs, and engineering boundaries.

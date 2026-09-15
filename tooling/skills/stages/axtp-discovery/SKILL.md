---
name: axtp-discovery
description: AXTP business discovery and requirement-family skill. Use when a rough product idea, customer request, business scenario, UI flow, legacy need, or new capability must be turned into a reviewed business intent, product requirement, and capability traceability bundle before semantic modeling. Covers Aegis P00-P03 at a user-facing macro level and reuses AXTP business-intake and plan-protocol-flow when repository context is available.
---

# AXTP Discovery

Turn business intent into a reviewed capability definition. Keep this as one user-facing phase even though it may internally cover P00-P03.

## Required flow

1. Resolve project/repository identity and current business/protocol context.
2. For rough input, reuse `tooling/skills/00-business-intake/SKILL.md` when available.
3. For end-to-end scenarios, UI stories, actors, or failure paths, reuse `tooling/skills/10-plan-protocol-flow/SKILL.md` when available.
4. Establish P02 Product Requirement: goals, actors, scenarios, constraints, non-goals, acceptance criteria.
5. Establish P03 Capability Traceability: requirement -> capability -> affected semantic scope -> likely protocol/runtime impact.
6. Mark unknowns as review questions instead of inventing downstream semantic facts.
7. Require explicit human approval of the capability bundle before semantic modeling.

## Output contract

Produce one `DiscoveryBundle` containing:

```yaml
business_intent_ref:
requirement_authority_ref:
capability_traceability_ref:
protocol_impact: none | existing | gap | amendment
open_questions: []
status: READY_FOR_HUMAN_REVIEW | APPROVED | BLOCKED
next_dependency: axtp-semantic-modeling
```

The bundle may reference separate repository/Notion artifacts; it does not need to collapse them into one file.

## Boundaries

- Do not define final object fields, protocol method/event/schema names, numeric IDs, architecture modules, tests, or code.
- Do not write Registry or generated protocol facts.
- If current adopted/generated AXTP already covers the need and no semantic change is required, route directly to runtime/implementation planning after documenting the coverage.
- If requirements are contradictory or materially incomplete, stop at the earliest untrusted point.

## Human review

Human review is required at phase exit. The reviewer chooses: approve, modify, cancel, or keep blocked.

## Automation level

`ASSISTED`: AI may extract, compare, draft, and trace; the user owns business intent and acceptance.

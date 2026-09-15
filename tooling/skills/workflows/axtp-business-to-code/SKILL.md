---
name: axtp-business-to-code
description: End-to-end AXTP business-to-code workflow router. Use when the user wants to take a new business idea, customer requirement, product capability, or protocol change from natural-language input through reviewed semantics, architecture, verification, controlled implementation, evidence, and Gate. Presents six user-facing phases and routes internally to existing AXTP protocol skills and Aegis specialist stage families rather than exposing every P-stage separately.
---

# AXTP Business to Code

Operate AXTP as a six-phase human-in-the-loop software production workflow.

## User-facing phases

1. `axtp-discovery` — Business & Capability: P00-P03.
2. `axtp-semantic-modeling` — Semantic Contract: P10-P13 plus AXTP protocol draft/adopt/generate when required.
3. `axtp-architecture-design` — Engineering Architecture: P14-P18.
4. `axtp-verification-design` — Verification Authority: P20 and review/materialization.
5. `axtp-implementation-delivery` — Implementation Delivery: P30-P33.
6. `axtp-gate-integration` — Independent Gate & Integration: P34-P36 plus baseline/release disposition.

Do not expose internal P-stage granularity unless the current phase is blocked, needs review, or the user asks for it.

## Routing algorithm

1. Inspect available project state, current Authority, repository reality, and prior artifacts.
2. Find the earliest phase whose required input artifact is missing, stale, contradictory, or unapproved.
3. Run only that phase's skill as the substantive owner.
4. Present its reviewable output and required decision: `approve`, `modify`, `cancel`, or `blocked`.
5. After approval, persist/freeze the output artifact and set `next_dependency`.
6. Continue only when the user asks to continue or an already-approved workflow contract explicitly permits automatic continuation.
7. Resume from existing valid artifacts; never restart the whole lifecycle merely because a later phase is blocked.

## Artifact chain

```text
Business input
  -> DiscoveryBundle
  -> SemanticAuthorityBundle
  -> ArchitectureAuthorityBundle
  -> VerificationAuthorityBundle
  -> ImplementationDeliveryBundle
  -> GateIntegrationBundle
```

Read `../../skill-registry.v0.1.yaml` for the frozen skill/component dependency map.

## Existing AXTP component reuse

Prefer existing repository skills rather than duplicating them:

- `00-business-intake`
- `10-plan-protocol-flow`
- `20-draft-business-protocol`
- `30-adopt-protocol-draft`
- `40-amend-adopted-protocol`
- `50-generate-axtp-protocol`
- `60-release-axtp-spec`
- `99-axtp-protocol-workflow`

Prefer Aegis specialist ownership for stage families when available:

- `aegis-modeling` -> P10-P13
- `aegis-architecture` -> P14-P18
- `aegis-verification` -> P20
- `aegis-implementation` -> P30-P33
- `aegis-gate-review` -> P34-P36
- central `aegis` -> ambiguity, earliest-untrusted-layer routing, successor routing

## Non-negotiables

- `Code Complete != Gate Complete`.
- Do not skip human acceptance when an artifact becomes Authority.
- Do not turn a rough business request directly into Registry YAML or code.
- Do not let architecture or verification invent missing semantic truth.
- Do not let implementation expand its own package.
- Do not let Gate invent new blocking obligations without failure-mode justification.

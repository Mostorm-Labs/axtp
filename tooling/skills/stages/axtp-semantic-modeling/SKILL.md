---
name: axtp-semantic-modeling
description: AXTP semantic-contract skill for turning an approved capability into durable product objects, behavior, canonical schema, operations, and reviewable/adopted AXTP protocol facts. Use after discovery approval when Aegis P10-P13 modeling or AXTP protocol drafting/adoption/amendment/generation is needed. Reuses aegis-modeling plus draft-business-protocol, adopt-protocol-draft, amend-adopted-protocol, and generate-axtp-protocol where applicable.
---

# AXTP Semantic Modeling

Treat P10-P13 as one user-facing phase: **Semantic Contract**. Preserve internal boundaries but do not make the user manually operate four separate stages unless a defect requires it.

## Required flow

1. Require an approved `DiscoveryBundle` or equivalent trusted requirement/capability authority.
2. Use `aegis-modeling` for the owned modeling family:
   - P10 Product Object Model
   - P11 Interaction / Behavior
   - P12 Semantic Schema
   - P13 Operation / Mutation Model
3. Freeze object identity, fields/relationships, transient versus canonical state, lifecycle behavior, invariants, mutations, atomicity, replay, compatibility, and errors before architecture.
4. If the capability changes AXTP protocol semantics, reuse `tooling/skills/20-draft-business-protocol/SKILL.md` to create a human-reviewable protocol proposal.
5. Require explicit human approval before turning protocol proposals into machine truth.
6. After approval:
   - new reviewed facts -> `30-adopt-protocol-draft`
   - changes to adopted facts -> `40-amend-adopted-protocol`
   - committed Registry Authority -> `50-generate-axtp-protocol`
7. If no protocol semantic change exists, skip draft/adoption/generation and preserve the semantic authority as runtime-only product truth.

## Output contract

Produce a `SemanticAuthorityBundle`:

```yaml
object_model_ref:
behavior_ref:
semantic_schema_ref:
operation_contract_ref:
protocol_proposal_ref: null
protocol_authority_ref: null
generated_protocol_ref: null
semantic_change_class: none | new | amendment
status: READY_FOR_HUMAN_REVIEW | ESTABLISHED | BLOCKED
next_dependency: axtp-architecture-design
```

## Boundaries

- Architecture must not invent missing semantics.
- Working-tree drafts are proposals, not Authority.
- Registry mutation must use the repository's accepted adoption boundary; do not hand-edit generated artifacts.
- Do not silently accept `[REVIEW-ASK]`, `[REVIEW-FIX]`, or `[REVIEW-BLOCKER]` facts.
- Preserve stable IDs and compatibility rules when amending adopted protocol.

## Human review

Human review is mandatory before Semantic Authority establishment and mandatory again before protocol adoption when protocol facts change.

## Automation level

`SEMI_AUTOMATIC`: modeling and generation may be automated; Authority acceptance is human-controlled.

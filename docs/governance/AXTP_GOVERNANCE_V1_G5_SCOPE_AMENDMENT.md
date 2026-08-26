# AXTP Governance v1 — G5 Scope Amendment

Status: **Current Governance Amendment**  
Authority scope: `AXTP_AUTHORITY_ARCHITECTURE_AND_REPOSITORY_GOVERNANCE_V1.md` Section 18, **G5 — Repository Information Architecture & Consumer Closure**, specifically its `Required work` and `Exit criteria`  
Finding: `AXTP-GOV-013`  
Aegis defect classification: `AUTHORITY_CONFLICT`  
Protocol semantic impact: **NONE**

## 1. Why this amendment exists

The Governance v1 program document was authored before the detailed G5 authority review. Its Section 18 described a broad G5 target that bundled:

- proposal corpus compaction;
- feature-level Registry decomposition;
- review-ownership / branch-protection improvement;
- consumer evidence closure;
- future security-authority preparation.

During G5 review, the approved execution decision narrowed the Gate because several of those items were valid future target-state improvements but were not required to close the actual remaining authority defects. Treating every broad target-state item as mandatory G5 implementation would have caused G5 to redesign already-valid repository structures merely to satisfy an early planning description.

The approved G5 execution authority therefore closed only the remaining correctness seams and explicitly deferred non-blocking structural programs with owners and exit evidence.

Task 7 found that this accepted scope correction had not yet been reflected in the Current Governance Authority itself. Leaving both texts effective would create two incompatible answers to the question "what must G5 complete before PASS?". This amendment closes that authority conflict without rewriting historical G5 review evidence.

## 2. Supersession rule

This amendment supersedes **only** the following portion of Governance v1:

```text
Section 18
  G5 — Repository Information Architecture & Consumer Closure
    Required work
    Exit criteria
```

All other Governance v1 sections remain current and unchanged, including:

- Sections 1–17 authority, invariant, identity, verification and supersession rules;
- Section 18 G0–G4 definitions;
- Section 19 Gate execution rule;
- Section 20 Definition of completion.

This is a scope correction, not a new authority architecture.

## 3. Current G5 required work

G5 is satisfied by the following evidence-backed closure work:

1. **Review existing repository information architecture** and prove that the existing frontstage/backstage retrieval model is sufficient. Do not create a redundant second implementation-retrieval authority.
2. **Close the consumer evidence loop** from runtime/SDK verification back into AXTP governance without fabricating downstream PASS status.
3. **Repair generated-human projection authority drift** discovered by the G4 emitter audit: deterministic numeric/layout protocol facts must derive from existing canonical/normative authority, while fixed explanatory template prose must be explicitly non-authoritative.
4. **Classify operational governance requirements** such as protected branches and concrete review teams as external configuration when the repository cannot truthfully claim those settings exist.
5. **Record non-blocking future structural programs explicitly** rather than silently expanding G5 into canonical-source or protocol redesign.

## 4. Explicit deferred work

The following items are valid future work but are **not G5 correctness blockers**:

| Finding | Disposition | Future program |
|---|---|---|
| `AXTP-GOV-007` | `DEFERRED_EXTERNAL_CONFIGURATION` | Protect `main`, require review/status checks, and map CODEOWNERS to real existing teams after organization identities are provisioned. |
| `AXTP-GOV-008` | `DEFERRED_FUTURE_MIGRATION` | Feature-level Registry source decomposition with stable IDs, schemas, Protocol IR, generated artifacts and conformance behavior unchanged. |
| `AXTP-GOV-009` | `DEFERRED_MAINTENANCE_MIGRATION` | Proposal corpus compaction preserving rationale, adoption/supersession traceability and open questions. |
| `AXTP-GOV-010` | `DEFERRED_FUTURE_AUTHORITY_PROGRAM` | Protocol Security Authority Program; any semantic change requires a separate protocol amendment/release. |

These dispositions are not waivers. Each remains tracked with `futureWork` and `exitEvidence` in `docs/governance/findings.yaml`.

## 5. Current G5 exit criteria

G5 may PASS only when all of the following are true:

- maintained runtime/AI retrieval entry points expose an unambiguous frontstage authority chain and keep backstage proposal/history/tooling non-contract;
- downstream consumer adoption has an evidence model whose PASS state requires exact external evidence and whose initial state does not fabricate verification;
- the G4-discovered generated-human projection defect is closed by source-derived facts and/or an explicit non-authoritative explanatory-text boundary;
- non-blocking external/structural/security items are recorded as deferred with future work and exit evidence rather than hidden as completed;
- wire semantics, canonical Registry semantics, Protocol IR semantics, stable identifiers, runtime behavior, conformance expectations and `spec/v0.15.0` remain unchanged by G5;
- the full repository validation workflow succeeds on an exact G5 closure head.

## 6. Evidence that satisfied the amended Gate

G5 functional verification:

```text
Validate AXTP Spec run = 33020869297
head_sha                = 04559cd4df33dfbaa25f7c87f5b90baabf776e10
result                  = SUCCESS
```

G5 final exact-head closure verification:

```text
Validate AXTP Spec run = 33022180940
head_sha                = 6443460b230a634872c484d82da0b235c4160f3d
result                  = SUCCESS
```

The final run completed generator/build/lint/tests/generated drift, conformance, docs/status/path checks and release artifact dry run successfully.

## 7. Relationship to Governance v1 completion criteria

This amendment does not weaken Section 20.

In particular:

- "proposal/history/tooling surfaces are retrieval-safe" is satisfied by authority isolation; physical proposal compaction is an optimization, not a prerequisite to safety;
- "repository can expose downstream adoption evidence without inventing it" is satisfied by the G5 consumer-evidence model;
- feature-level Registry decomposition remains a `SHOULD converge` target from Section 11, not a prerequisite for proving current canonical authority correctness;
- future security work remains a separate authority/release program because Governance v1 explicitly forbids hiding protocol-semantic changes inside G0–G5.

## 8. Decision

**CURRENT GOVERNANCE AMENDMENT — EFFECTIVE FOR G5 SCOPE AND CLOSURE INTERPRETATION**

The accepted narrowed G5 execution model is now explicitly reconciled with Governance v1. No upstream architecture, protocol semantic rule, release identity or runtime contract is superseded by this amendment.

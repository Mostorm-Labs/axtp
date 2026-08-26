# AXTP G5 — Closure Record

Status: **PASS**  
Gate: G5 Repository Governance & Consumer Closure  
Prerequisite: G4 PASS  
Functional evidence: GitHub Actions run `33020869297`  
Functional head: `04559cd4df33dfbaa25f7c87f5b90baabf776e10`  
Final exact-head evidence: GitHub Actions run `33022180940`  
Final G5 closure head: `6443460b230a634872c484d82da0b235c4160f3d`

## Authority relationship

This record is the current G5 Gate-status and closure-evidence record. It supersedes the pre-CI status / verification-pending statements in `G5-information-architecture-consumer.md` and `G5-ci-attempts.md`.

The approved G5 scope/design rationale remains preserved in `G5-information-architecture-consumer.md`. The current governance interpretation of that narrowed scope is formalized by:

```text
docs/governance/AXTP_GOVERNANCE_V1_G5_SCOPE_AMENDMENT.md
```

The amendment supersedes only Governance v1 Section 18 G5 `Required work` / `Exit criteria`; it does not supersede the G0–G4 authority architecture or any AXTP protocol authority.

## Functional Gate evidence

`Validate AXTP Spec` run `33020869297` completed `success` on immutable workflow `head_sha`:

```text
04559cd4df33dfbaa25f7c87f5b90baabf776e10
```

The run executed the full repository validation path and produced:

```text
generator TypeScript build/lint        PASS
generator Vitest                       56/56 PASS
protocol Markdown authority test       PASS
canonical registry validation          PASS
source -> Protocol IR validation       PASS
generated drift                        PASS
conformance cases                      39 PASS
normative Rules                         11
Rule coverage                           10 covered
                                        1 structural-only
                                        0 uncovered
consumer evidence                       6 consumers / PASS
local Markdown links                    PASS
plain-text repository paths             PASS
frontstage language                     PASS
proposal/status checks                  PASS
release artifact dry run                PASS
```

The consumer evidence validator emitted AJV `strictTypes` advisory warnings for a conditional schema branch while the current ledger validated successfully. The warnings did not invalidate JSON Schema validation, semantic PASS gating, the six-consumer ledger, or any G5 exit criterion. They remain non-blocking tooling hygiene rather than protocol/Gate-failure evidence.

## Finding dispositions

### Closed from evidence

- `AXTP-GOV-005` — existing frontstage/backstage retrieval boundary is sufficient; no second retrieval authority was introduced.
- `AXTP-GOV-006` — downstream consumer-adoption evidence now has a repository-only ledger, schema, semantic validator and conformance-entry integration; the initial ledger keeps all six consumers `unverified` and claims zero fabricated PASS results.
- `AXTP-GOV-012` — human Markdown numeric/layout protocol facts are derived fail-closed from existing canonical/normative authority; fixed explanatory prose is explicitly non-authoritative.

### Explicitly deferred, not hidden as closed

- `AXTP-GOV-007` — protected-main / concrete CODEOWNERS teams: external repository configuration.
- `AXTP-GOV-008` — feature-level Registry decomposition: future canonical-source migration.
- `AXTP-GOV-009` — proposal corpus compaction: future maintenance/retrieval-cost migration.
- `AXTP-GOV-010` — protocol security threat-model authority: future security-authority program and separate protocol amendment if semantics change.

These deferred items do not invalidate the amended/narrowed G5 exit criteria and remain tracked with future work and exit evidence.

## Five drift closure review

### 1. Authority drift — PASS

No new implementation authority was introduced. `workspace/**` remains non-contract. Consumer evidence is mutable governance evidence and cannot redefine Spec release or protocol semantics. `ProtocolProjectionFacts` resolves existing authority for generation and is not serialized as a new semantic contract.

### 2. Semantic duplication — PASS

The emitter no longer independently owns the identified Standard Frame / RPC numeric facts. Consumer evidence records downstream verification state rather than protocol behavior. Deferred Registry/proposal cleanup was not disguised as G5 semantic work.

### 3. Derivation drift — PASS

`rpc_op.yaml` and the normative Standard Frame field table are resolved fail-closed into the human Markdown projection. Generated drift passed, proving current output remains reproducible from declared authority.

### 4. Verification drift — PASS

Consumer `adoptionStatus: pass` requires exact Spec lock, consumer implementation identity, declared profiles, conformance PASS, exact external CI identity/tested commit and verification timestamp. The current ledger contains six consumers and zero PASS claims. The validator executes from the normal conformance validation entry point.

### 5. Release / consumer drift — PASS

Consumer evidence stays under `docs/governance/**` and does not enter immutable Spec artifact authority. Release dry-run passed. `spec/v0.15.0` remains unchanged.

## Protected invariant check

```text
Wire semantic impact             = NONE
Registry semantic impact         = NONE
Protocol IR semantic impact      = NONE
Stable identifier change         = NONE
Runtime behavior change          = NONE
Conformance expectation change   = NONE
spec/v0.15.0 mutation            = NONE
Generated Markdown semantic text = NONE; derivation ownership repaired
```

## Final exact-head evidence

The first reopen after writing G5 closure records created run `33022074284`, but that run's immutable `head_sha` remained the older functional head `04559cd4df33dfbaa25f7c87f5b90baabf776e10` even though its PR association moved to a newer branch head. It was correctly rejected as stale-head evidence.

A later clean PR reopen created:

```text
Validate AXTP Spec run = 33022180940
immutable head_sha     = 6443460b230a634872c484d82da0b235c4160f3d
PR #12 head            = 6443460b230a634872c484d82da0b235c4160f3d
result                 = SUCCESS
```

Every `validate-spec` step completed successfully:

- checkout / Node / pnpm / dependency installation;
- generator build, lint, tests, source/protocol validation and generated drift;
- conformance validation;
- docs / path / protocol-status validation;
- release artifact dry run.

Therefore the G5 exact-head Gate requirement is satisfied.

## Decision

**PASS**

G5 closed the remaining repository-governance correctness seams without redesigning the protocol or forcing deferred structural programs into the Gate. Task 7 may now consume G5 as a completed prerequisite and perform the program-level G0–G5 final closure review.

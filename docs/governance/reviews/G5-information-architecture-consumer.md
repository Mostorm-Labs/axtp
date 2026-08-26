# AXTP G5 — Repository Governance & Consumer Closure

Status: **READY FOR FULL VERIFICATION**  
Prerequisite: G4 PASS  
Primary findings: `AXTP-GOV-005`, `AXTP-GOV-006`, `AXTP-GOV-007`, `AXTP-GOV-008`, `AXTP-GOV-009`, `AXTP-GOV-010`, `AXTP-GOV-012`

## 1. Stage contract

**Role**: P21 Authority Review → P20 Evidence Design → P30/P32 Targeted Governance Repair → P34 Gate Review.  
**Authority**: Governance v1, G1-G4 closure records, current frontstage/backstage guides, existing release/runtime update contract, canonical Registry / normative specs for projection facts.  
**Objective**: close the remaining repository-governance edges without redesigning the authority architecture already established by G0-G4.  
**Non-goals**: no new authority chain; no mass proposal rewrite; no physical registry decomposition; no invented GitHub team/ruleset state; no new protocol security semantics; no wire/ID/schema/runtime change.  
**Required analysis**: retrieval consistency, downstream evidence gap, generated-human-projection drift, external/structural finding classification, five drift reviews.  
**Required output**: consumer adoption evidence gate, source-derived human Markdown projection, explicit deferred follow-up contracts, G5 finding dispositions.  
**Quality / Evidence Gate**: consumer PASS cannot exist without exact external evidence; generated prose numbers are source-derived; no shadow retrieval authority; normal repository CI remains green.  
**Handoff**: Task 7 final governance closure may treat G5 as PASS only after exact-head repository validation.

## 2. Scope correction

The original migration plan described G5 broadly as information-architecture closure. Review showed that interpreting this as a second repository architecture redesign would violate the program's own source-of-truth principles.

G5 therefore follows the approved scoped execution design:

```text
G1 authority boundary      = inherited
G2 identity model          = inherited
G3 Rule/Evidence model     = inherited
G4 derivation model        = inherited

G5 adds only:
  downstream consumer evidence closure
  targeted generated-prose derivation repair
  explicit defer contracts for non-blocking future work
```

The frozen authority chain remains:

```text
Business Intent
  -> Flow
  -> Protocol Proposal
  -> Canonical Registry
  -> Protocol IR
  -> Generated Contract
  -> Conformance
  -> Spec Release
  -> Runtime Spec Lock
  -> Runtime / SDK
```

G5 does not supersede any upstream architecture decision.

## 3. Retrieval closure — AXTP-GOV-005

Reviewed maintained entry points:

- `docs/governance/AXTP_AUTHORITY_ARCHITECTURE_AND_REPOSITORY_GOVERNANCE_V1.md`
- `docs/README.md`
- `docs/guides/runtime.md`
- `workspace/protocol/README.md`

They are consistent on the important boundary:

```text
runtime implementation authority
  = exact release / Spec lock
  + canonical/generated authority
  + normative specs
  + verification authority

not runtime implementation authority
  = workspace/**
  + docs/superpowers/**
  + tooling/skills/**
  + legacy/history
```

Governance v1 explicitly states that its purpose is not to redesign the protocol chain and permanently classifies `workspace/**` as non-contract. The docs entry point, runtime guide and proposal workspace guide repeat the same retrieval rule.

No maintained implementation entry point was found that allows backstage material to override current release/canonical/generated/spec/conformance authority.

Decision: **AXTP-GOV-005 CLOSED BY REVIEW**.

A new `implementation-retrieval.yaml` was deliberately not created because it would duplicate the existing governance rule and recreate shadow-authority risk.

## 4. Consumer evidence closure — AXTP-GOV-006

Before G5, `release/AXTP_RUNTIME_UPDATE_FLOW.md` defined release dispatch, downstream Spec locks and runtime/tool release versions, but AXTP had no evidence surface that distinguished:

```text
release dispatched / upgrade requested
```

from:

```text
consumer actually verified this release/profile
```

G5 adds repository-only governance evidence:

```text
docs/governance/consumer-evidence/
  README.md
  schema.json
  ledger.yaml
```

and validation:

```text
tooling/scripts/validate-consumer-evidence.mjs
tooling/scripts/consumer-evidence.test.mjs
```

integrated into `tooling/scripts/validate-conformance.sh`.

### Status model

```text
unverified | in-progress | pass | fail | stale
```

`pass` requires exact external evidence:

- consumer repository;
- AXTP Spec tag + exact AXTP commit;
- consumer implementation version + exact consumer commit;
- non-empty declared profiles;
- conformance status `pass`;
- exact external GitHub Actions run repository / ID / URL / tested commit;
- verification timestamp.

The semantic validator rejects duplicate consumer repositories and evidence-free PASS claims in addition to JSON Schema validation.

### Initial ledger

Six repositories already named by the runtime-update authority are seeded:

```text
Mostorm-Labs/axtp-c-runtime
Mostorm-Labs/axtp-cpp-runtime
Mostorm-Labs/axtp-flutter-runtime
Mostorm-Labs/axtp-ts-runtime
Mostorm-Labs/axtp-python-runtime
Mostorm-Labs/axtp-mock-server
```

All six are intentionally:

```text
adoptionStatus: unverified
```

No Spec lock, implementation commit, profile, CI run or PASS was fabricated.

### TDD evidence

Consumer semantic tests were authored before the validator. The isolated RED failed because `validate-consumer-evidence.mjs` did not exist. The isolated GREEN then passed 4/4 contracts:

- unverified consumer may exist without evidence;
- duplicate repository is rejected;
- evidence-free PASS is rejected;
- complete exact-evidence PASS is accepted.

Actual repository AJV/YAML/CI integration remains pending the full Gate run.

Decision before full CI: **AXTP-GOV-006 remains OPEN / verification pending**.

## 5. Generated human Markdown derivation — AXTP-GOV-012

G4's emitter audit found two concrete independent facts in `protocolMarkdown.ts`:

- literal Standard Frame header byte count;
- literal RPC op numbers in the WebSocket/Standard-Framed comparison table.

Extending Protocol IR merely to preserve explanatory prose would enlarge G5 unnecessarily. G5 instead introduces a repository-only generator projection dependency:

```text
contract/registry/core/rpc_op.yaml
        -> required RPC op projection values

specs/20-core.md Standard Frame field table
        -> max(offset + width)
        -> Standard Frame header bytes

        -> ProtocolProjectionFacts
        -> protocolMarkdown renderer
```

Implementation:

```text
tooling/generators/src/protocolProjectionFacts.ts
tooling/generators/src/protocolMarkdown.test.ts
```

`ProtocolProjectionFacts` is not serialized into Protocol IR or generated JSON and is not a new semantic authority. It is operational generation input that points the human projection back to existing canonical/normative authority.

The loader fails closed if required RPC op names, the Standard Frame heading, or numeric offset/size rows are absent. It contains no fallback op IDs or header byte count.

`protocolMarkdown.ts` now interpolates these derived values rather than owning the numbers.

### Byte-preservation design

Current authority derives:

```text
Standard Frame header = 12 bytes
HELLO                  = 0
IDENTIFY               = 2
IDENTIFIED              = 3
EVENT                   = 6
REQUEST                 = 7
REQUEST_RESPONSE        = 8
```

These equal the existing displayed Markdown values. Therefore the intended repair changes **derivation**, not generated human content.

An isolated GREEN harness proved that the field-table algorithm derives 12 and that changing projection facts changes rendered numbers. The real Vitest/generator/generated-drift evidence is still required before closure.

Decision before full CI: **AXTP-GOV-012 remains OPEN / verification pending**.

## 6. Explicit deferred findings

### AXTP-GOV-007 — GitHub ownership / branch protection

Status: **DEFERRED_EXTERNAL_CONFIGURATION**.

Current external evidence remains:

```text
main.protected = false
repository rulesets = []
```

Current CODEOWNERS largely points to one maintainer team. G5 does not invent team identities or claim external settings are configured.

Future exit requires actual protected-main/ruleset evidence, required PR review and repository validation status check, prevention of unreviewed direct pushes, and concrete existing review teams mapped to logical ownership.

### AXTP-GOV-008 — Registry authoring granularity

Status: **DEFERRED_FUTURE_MIGRATION**.

Current domain-level registry files remain valid canonical authority. Physical feature-level decomposition is a separate canonical-source migration and must prove:

```text
stable IDs unchanged
schemas unchanged
Protocol IR equivalent
generated artifacts equivalent
conformance unchanged
```

No current registry file is moved by G5.

### AXTP-GOV-009 — Proposal corpus compaction

Status: **DEFERRED_MAINTENANCE_MIGRATION**.

The proposal corpus remains verbose, but G1 already neutralized its runtime-authority risk. Bulk compaction is therefore maintenance/retrieval-cost work, not a G5 correctness requirement.

Future compaction must preserve rationale, decisions, legacy/compatibility evidence, open questions and adoption/supersession links while replacing unnecessary current canonical mirrors with links/projections.

### AXTP-GOV-010 — Security authority

Status: **DEFERRED_FUTURE_AUTHORITY_PROGRAM**.

`SECURITY.md` remains vulnerability-reporting policy. Threat model, authentication, authorization, replay, downgrade, relay trust, credential lifecycle and OTA trust require a separate security-authority project.

Any resulting protocol-semantic change requires a separate protocol amendment/release and cannot be hidden inside G5.

## 7. Implementation-surface audit

Compared with the G4 closure head `2d198750be23e3a4d02852022230c13242376914`, G5 implementation changes are limited to:

```text
docs/governance/consumer-evidence/**
docs/governance/findings.yaml
docs/governance/reviews/G5-information-architecture-consumer.md
docs/superpowers/specs/2026-08-26-g5-repository-consumer-closure-design.md
docs/superpowers/plans/2026-08-26-g5-repository-consumer-closure.md
tooling/generators/src/protocolProjectionFacts.ts
tooling/generators/src/protocolMarkdown.test.ts
tooling/generators/src/emitters/protocolMarkdown.ts
tooling/scripts/consumer-evidence.test.mjs
tooling/scripts/validate-consumer-evidence.mjs
tooling/scripts/validate-conformance.sh
```

No G5 implementation change has touched:

```text
specs/** semantic content
contract/registry/**
contract/protocol/**
contract/rules/**
conformance case expectations
spec/v0.15.0
```

The only normative/canonical files read by the new projection path are existing authority; they are not modified.

## 8. Five drift reviews

### Authority drift

**PASS-PENDING-FULL-CI.** No new retrieval authority was created. Consumer evidence is explicitly governance evidence, not protocol authority. Projection facts are operational generator input derived from existing authority and are not serialized as a new contract layer.

### Semantic duplication

**PASS-PENDING-FULL-CI.** The identified Markdown numbers are no longer independently authored by the emitter. Consumer evidence describes downstream verification state and does not define protocol behavior. Deferred proposal/registry cleanup is not disguised as current semantic work.

### Derivation drift

**PASS-PENDING-FULL-CI.** Human Markdown op/header numbers now resolve from canonical/normative source through a fail-closed projection loader. Full generated-drift validation must still prove current output is reproducible and byte-preserved.

### Verification drift

**PASS-PENDING-FULL-CI.** Consumer PASS is schema- and semantic-gated. Initial ledger has zero PASS claims. The conformance entry point now invokes the consumer evidence validator; repository CI must prove actual integration.

### Release / consumer drift

**PASS-PENDING-FULL-CI.** Consumer evidence remains under `docs/governance/**` and is intentionally absent from Spec release artifact inputs. Immutable `spec/v0.15.0` identity is unchanged. Full release dry-run remains required.

## 9. Semantic impact check

```text
Wire semantic impact          = NONE
Registry semantic impact      = NONE
Protocol IR semantic impact   = NONE
Stable identifier change      = NONE
Runtime behavior change       = NONE
Conformance expectation change= NONE
spec/v0.15.0 mutation         = NONE
Generated Markdown content    = EXPECTED NONE; derivation changes only, CI proof pending
```

## 10. Pre-CI evidence

TDD / static evidence available before the repository Gate run:

```text
consumer evidence RED         = expected module-missing failure
consumer evidence GREEN       = 4/4 isolated semantic tests
Markdown projection RED       = missing projection source / old hard-coded ownership exposed
projection GREEN              = header derivation + mutation proof passed in isolated Node harness
G5 vs G4 source audit         = no canonical protocol source changes
Draft PR #12                  = closed / unmerged during implementation
```

The local execution environment cannot resolve `github.com`, so it cannot install the repository dependency graph. This is classified as environment limitation, not repository evidence. Actual TypeScript/Vitest/AJV/generated-drift results are intentionally withheld until GitHub full CI.

## 11. Exit criteria

G5 may become PASS only after a fresh full repository run proves:

- generator TypeScript build/lint passes;
- all generator tests including Markdown projection derivation pass;
- source / Protocol IR validation passes;
- generated drift passes with no unexplained generated Markdown change;
- conformance and G3 Rule coverage remain green;
- consumer evidence schema + semantic validation passes and reports six consumers;
- docs/status/path checks remain green;
- release artifact dry-run remains green;
- consumer governance evidence has not leaked into immutable Spec artifact authority;
- `AXTP-GOV-006` and `AXTP-GOV-012` can be closed from evidence rather than implementation intent.

## 12. Current decision

**READY FOR FULL VERIFICATION**

Implementation has reached the Gate boundary. Draft PR #12 must remain closed until the exact functional head is frozen. Reopen it only once for the intentional full repository validation. Any failure must be classified before repair; G5 must not broaden into upstream protocol redesign.
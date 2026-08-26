# AXTP G5 Repository & Consumer Closure Design

Status: **Current G5 Execution Design**  
Date: 2026-08-26  
Supersedes for G5 execution only: the broader interpretation of Task 6 in `docs/superpowers/plans/2026-08-26-axtp-authority-governance-migration.md`. The overall G0-G5 migration plan remains current; this document narrows how G5 is executed after review.

## 1. Decision

G5 does **not** redesign AXTP information architecture and does **not** replace the authority chain established by G0-G4.

The frozen upstream chain remains:

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

G5 closes only repository-governance edges that remain open after G4.

## 2. Current Authority

G5 consumes without redesign:

- `docs/governance/AXTP_AUTHORITY_ARCHITECTURE_AND_REPOSITORY_GOVERNANCE_V1.md`
- G1 authority boundary and the rule that `workspace/**` is permanently non-contract
- G2 SpecIdentity semantics
- G3 Rule/Evidence model
- G4 derivation model and generated-artifact source rules
- `docs/README.md`
- `docs/guides/runtime.md`
- `workspace/protocol/README.md`
- `release/AXTP_RUNTIME_UPDATE_FLOW.md`

Repository implementation reality is evidence, not architecture authority.

## 3. Objective

Close the smallest remaining gaps necessary for a retrieval-safe, evidence-backed repository:

1. prove the existing frontstage/backstage retrieval boundary is sufficient and consistent;
2. add a repository-only downstream consumer evidence contract and ledger;
3. remove independent protocol facts from generated human Markdown projection;
4. explicitly defer structural or external work that is valid future improvement but not required to make the current authority model correct.

## 4. Non-goals

G5 will not:

- create a second machine-readable authority map that duplicates Governance v1 / docs navigation;
- move or rewrite the existing authority chain;
- mass-edit or delete accepted proposals;
- physically split `contract/registry/domains/*/domain.yaml` into feature files;
- invent GitHub teams or claim branch protection/rulesets are configured when they are not;
- design authentication, authorization, replay, downgrade, OTA, relay-trust or other new security protocol semantics;
- mutate stable protocol IDs, schemas, Standard Frame, CONTROL, RPC, STREAM or `spec/v0.15.0`.

## 5. Finding Dispositions

### AXTP-GOV-005 — Retrieval ambiguity

Target: **CLOSE BY REVIEW**.

Existing maintained entry points already agree that runtime implementation authority is release + canonical/generated + specs + conformance, and that `workspace/**`, `docs/superpowers/**`, `tooling/skills/**` and historical material are backstage/non-contract.

G5 will review these surfaces for contradiction. It will not add a new `implementation-retrieval.yaml` shadow authority unless the review finds a concrete missing machine boundary.

### AXTP-GOV-006 — Consumer adoption evidence

Target: **CLOSE BY IMPLEMENTATION**.

Add a repository-only evidence contract under:

```text
docs/governance/consumer-evidence/
  README.md
  schema.json
  ledger.yaml
```

The ledger is governance evidence, not Spec authority and not part of immutable Spec release artifacts.

Supported adoption statuses:

```text
unverified | in-progress | pass | fail | stale
```

`pass` is legal only when the entry includes exact external evidence: consumer repository, Spec lock tag/commit, consumer implementation version/commit, declared profiles, conformance PASS, exact CI run identity/URL, and verification timestamp.

The initial ledger may list known consumer repositories only as `unverified`; it must not fabricate locks, commits, profiles, CI or PASS.

Add CI validation that rejects duplicate consumers, malformed evidence, and any unsupported evidence-free PASS.

### AXTP-GOV-007 — Ownership / branch protection

Target: **DEFERRED_EXTERNAL_CONFIGURATION**.

Current evidence shows `main` is unprotected and repository rulesets are empty. Existing CODEOWNERS points to a single maintainer team. G5 will document the required future policy, but will not invent team identities or claim external GitHub settings are complete.

Required future policy:

- protect `main`;
- require PR review for authority changes;
- require `Validate AXTP Spec` or its successor status check;
- prevent unreviewed direct pushes to protected authority branches;
- split logical review responsibilities when concrete organization teams exist.

No CODEOWNERS rewrite is required in G5 unless valid concrete teams are available.

### AXTP-GOV-008 — Registry authoring granularity

Target: **DEFERRED_FUTURE_MIGRATION**.

Current domain-level source is valid canonical authority. A future `Registry Feature-Level Source Decomposition` project may split large domain files only under a deterministic equivalence gate:

```text
same stable IDs
same schemas
same Protocol IR
same generated artifacts
same conformance behavior
```

G5 records the migration contract but does not move current canonical source.

### AXTP-GOV-009 — Proposal corpus size / duplication

Target: **DEFERRED_MAINTENANCE_MIGRATION**.

G1 already removed runtime authority from proposal prose. Bulk proposal compaction is therefore a retrieval-cost/maintenance improvement, not a current authority blocker.

Future accepted-proposal compaction should preserve rationale, boundaries, rejected alternatives, compatibility reasoning, legacy evidence, review findings and open questions while replacing current method/schema/error/ID/example mirrors with canonical/generated links where safe.

G5 does not mass-rewrite the proposal corpus.

### AXTP-GOV-010 — Security authority

Target: **DEFERRED_FUTURE_AUTHORITY_PROGRAM**.

`SECURITY.md` remains vulnerability-reporting policy. A future security authority project must cover threat model, authentication, authorization, replay, downgrade, credential lifecycle, relay trust and OTA trust boundaries.

Any new wire/runtime semantic requirement must enter a separate protocol amendment/release, not G5.

### AXTP-GOV-012 — Generated human Markdown derivation

Target: **CLOSE BY IMPLEMENTATION**.

`tooling/generators/src/emitters/protocolMarkdown.ts` currently includes human-readable protocol facts that are independently authored in the emitter, including literal Standard Frame layout wording and explicit JSON RPC op numbers.

Repair rule:

- numeric/layout protocol facts must come from `ProtocolModel` or be omitted from explanatory prose;
- transport CONTROL/STREAM behavior must project `model.transports`;
- CONTROL/STREAM/compatibility statements should project model-owned rule arrays;
- generated Markdown may contain formatting/explanatory connective text, but that text must not become an independent source of protocol IDs or layouts.

The repair must not change canonical source semantics.

## 6. Consumer Evidence Contract

The ledger contract is intentionally narrow.

Each consumer entry has:

```yaml
repository: Mostorm-Labs/example-runtime
kind: runtime | sdk | tool | mock
adoptionStatus: unverified | in-progress | pass | fail | stale
```

For `pass`, require:

```yaml
specLock:
  tag: spec/vX.Y.Z
  commit: <40-hex AXTP commit>
implementation:
  version: vX.Y.Z.R
  commit: <40-hex consumer commit>
declaredProfiles:
  - <profile>
conformance:
  status: pass
  run:
    repository: Mostorm-Labs/example-runtime
    id: <positive integer>
    url: https://github.com/...
    commit: <same exact consumer commit or explicitly evidenced tested commit>
verifiedAt: <RFC3339 timestamp>
```

The validator must fail closed if `adoptionStatus: pass` lacks any required evidence.

## 7. Protocol Markdown Repair Contract

The G5 repair must make these tests true:

1. generated Markdown contains no literal hard-coded JSON RPC `op=<number>` comparison table facts;
2. generated Markdown does not independently assert a literal `12-byte Standard Frame header` layout fact;
3. protocol framework details still expose transport/profile behavior from `ProtocolModel`;
4. model-owned CONTROL, STREAM and compatibility rule text is projected rather than duplicated in emitter constants;
5. existing generated snapshot is regenerated normally and generated drift passes.

No new ProtocolModel semantic source is introduced solely for prose convenience.

## 8. Evidence Gate

G5 can PASS only if:

- current retrieval entry points are mutually consistent and no maintained backstage path claims runtime implementation authority;
- consumer evidence schema/ledger validation passes;
- a synthetic `pass` entry without exact external evidence fails validation;
- initial real ledger contains no fabricated PASS;
- `protocolMarkdown.ts` no longer owns the identified independent numeric/layout facts;
- generator build/lint/tests/validate/generated-drift pass;
- conformance and G3 Rule coverage remain green;
- docs/status/path checks remain green;
- release artifact dry-run remains green and the governance-only consumer ledger is not promoted into Spec release authority;
- G5 review records all deferred P1 findings with owner/reason/future gate rather than silently closing them.

## 9. Five Drift Reviews

G5 closure must explicitly review:

1. **Authority drift** — no new shadow authority, especially no second retrieval authority.
2. **Semantic duplication** — generated Markdown and consumer evidence do not redefine protocol semantics.
3. **Derivation drift** — generated human facts remain model-derived.
4. **Verification drift** — consumer PASS cannot exist without exact external evidence.
5. **Release / consumer drift** — mutable adoption evidence stays repository governance evidence and does not rewrite immutable Spec release identity.

## 10. Handoff

After G5 PASS, Task 7 Final Governance Closure may evaluate all findings. Deferred G5 findings remain explicit follow-up programs; they do not invalidate the current authority architecture unless their recorded conditions become Gate blockers.
# AXTP G3 — Normative Rule & Verification Closure

Status: **READY FOR FULL VERIFICATION**  
Prerequisite: G2 PASS  
Primary finding: `AXTP-GOV-004`

## 1. Stage contract

**Role**: P20 Verification Design + P21/P22 Authority/Drift Review under the current AXTP governance authority.  
**Authority**: `docs/governance/AXTP_AUTHORITY_ARCHITECTURE_AND_REPOSITORY_GOVERNANCE_V1.md`, current `specs/**`, current `conformance/**`, protected baseline `spec/v0.15.0`.  
**Objective**: assign stable IDs to a high-value seed set of existing normative rules and make Rule <-> Conformance evidence mechanically traceable.  
**Non-goals**: do not redesign protocol behavior, renumber IDs, change wire/session/runtime semantics, rewrite conformance steps/assertions, or bulk-number every MUST/SHOULD sentence.  
**Required analysis**: source authority, evidence strength, case-to-rule fit, verification disposition, release-artifact visibility, five drift reviews.  
**Required output**: Rule registry, case backlinks, coverage validator/report, unit contract, Gate record.  
**Quality / Evidence Gate**: no unknown Rule refs, every `covered` rule has case evidence, no seeded stable `must` remains `uncovered`, structural/manual dispositions carry evidence, existing conformance still validates unchanged behavior.  
**Handoff**: G4 may consume stable Rule IDs when defining vector recipes and golden-vector evidence.

## 2. Protected invariants

```text
Wire semantic change = FORBIDDEN
spec/v0.15.0 mutation = FORBIDDEN
Stable protocol identifier change = FORBIDDEN
Existing case behavior/assertion rewrite = FORBIDDEN
Rule ID creates new runtime behavior = FORBIDDEN
```

A Rule ID names an existing requirement. `specs/**` remains semantic authority; the Rule registry is verification-authority metadata.

## 3. Authority map

| Surface | G3 classification | Role |
|---|---|---|
| `specs/20-core.md`, `30-registry.md`, `40-codec.md` | Current Authority / normative-spec | Defines protocol semantics. |
| `contract/rules/rules.yaml` | verification-authority metadata | Stable Rule IDs, source pointers, levels and dispositions. |
| `conformance/cases/**` | verification-authority | Executable behavior evidence. |
| `conformance/cases/*.authorityRules` | verification edge source | Single authored Rule -> Case relationship edge. |
| coverage tooling | operational-tooling | Validates and projects the relationship; defines no protocol semantics. |
| generated protocol / registry | derived/canonical contract | Structural evidence where explicitly referenced. |

Relationship ownership is intentionally one-way:

```text
Case.authorityRules = authored edge
Rule -> Cases         = derived backlink
```

The rule registry does **not** independently maintain a case list. This avoids a second mapping source that could drift.

## 4. Seed Rule model

G3 uses stable domain-oriented IDs:

```text
<NAMESPACE>.<SUBSCOPE>.<NNN>
```

Seed examples:

```text
CORE.FRAME.001
CONTROL.SESSION.001
RPC.SESSION.001
RPC.COMPAT.001
RPC.METHOD.001
RPC.EVENT.001
CODEC.COMPAT.001
STREAM.FRAME.001
RPC.RELAY.001
```

Each rule records:

```yaml
id: RPC.METHOD.001
status: stable
level: must
statement: <existing normative requirement>
source:
  path: specs/30-registry.md
  section: 方法 Methods
since: spec/v0.0.2
verification:
  disposition: covered
```

Allowed dispositions are exactly:

```text
covered
structural-only
manual-evidence
not-applicable
uncovered
```

A seeded `stable + must + uncovered` rule is a G3 blocker.

## 5. Seeded current-core rules

G3 seeds 11 rules rather than numbering the full prose corpus.

| Rule | Requirement | Disposition | Evidence |
|---|---|---|---|
| `CORE.FRAME.001` | Standard Frame Header Version remains parser compatibility boundary; current value `0x01`. | `structural-only` | `protocol_meta.yaml` + Protocol IR. |
| `CONTROL.SESSION.001` | OPEN -> ACCEPT; ACCEPT echoes OPEN `controlId`. | `covered` | `handshake.open_accept`. |
| `RPC.SESSION.001` | Hello -> Identify -> Identified with non-empty `sid`. | `covered` | `session.hello_identify_identified`. |
| `RPC.SESSION.002` | Business Request before Identified is rejected/not processed. | `covered` | `session.request_before_identified`. |
| `RPC.COMPAT.001` | `Hello.axtpVersion` is advisory and never handshake/feature admission authority. | `covered` | `session.axtp_version_advisory`. |
| `RPC.METHOD.001` | Unknown method -> `RPC_METHOD_NOT_FOUND`. | `covered` | `rpc.method_not_found`. |
| `RPC.METHOD.002` | Registered-unavailable -> `NOT_SUPPORTED`; session remains usable. | `covered` | `capability.registered_method_not_supported`, `capability.session_survives_not_supported`. |
| `CODEC.COMPAT.001` | Structurally valid unknown optional fields do not kill message/session or later RPC. | `covered` | `capability.unknown_optional_field_ignored`. |
| `RPC.EVENT.001` | Unknown event is ignored/diagnostic-only and session remains usable. | `covered` | `event.unknown_event_ignored`. |
| `STREAM.FRAME.001` | STREAM uses the 16B BE `streamId/seqId/cursor` header. | `covered` | `stream.stream_data`. |
| `RPC.RELAY.001` | `m.dst` is one logical Endpoint string, not array/route path. | `covered` | `rpc.endpoint_relay_addressing`. |

Coverage summary expected from the completed G3 content state:

```text
rules = 11
covered = 10
structural-only = 1
manual-evidence = 0
not-applicable = 0
uncovered = 0
case backlinks = 11
```

`CORE.FRAME.001` is deliberately **not** called executable coverage. The current case DSL has no raw invalid-frame injection primitive. G3 records structural evidence and leaves any future raw-parser negative case to a later verification extension rather than fabricating a PASS.

## 6. Conformance integration

`conformance-case.schema.json` now allows:

```yaml
authorityRules:
  - RPC.METHOD.001
```

G3 only adds this metadata to selected existing cases. It does not alter their executable steps, assertions, profiles, expected status codes, wire bytes, or semantic kinds.

This preserves the evidence meaning while making it discoverable in both directions:

```text
Rule -> coverage report -> Case
Case -> authorityRules -> Rule -> normative source
```

A runtime result already identifies its conformance case, so Rule-level result attribution can be derived without adding a second runtime result field in G3.

## 7. Coverage tooling

New operational tooling:

```text
tooling/scripts/lib/rule-coverage.mjs
tooling/scripts/rule-coverage.test.mjs
tooling/scripts/validate-rule-coverage.mjs
```

`validate-conformance.sh` now executes:

```text
node --test tooling/scripts/rule-coverage.test.mjs
existing validate-conformance.mjs
validate-rule-coverage.mjs --check
```

Coverage validation fails when:

- a case references an unknown Rule ID;
- a `covered` rule has no case backlink;
- a seeded `stable + must` rule is `uncovered`;
- rule level/status/disposition metadata is invalid;
- structural/manual evidence metadata is missing or points to a missing repository path.

Human projection:

```bash
node tooling/scripts/validate-rule-coverage.mjs . --markdown
```

Machine projection:

```bash
node tooling/scripts/validate-rule-coverage.mjs . --json
```

No generated report file is independently authored; projections are derived from the Rule registry + case metadata each run.

## 8. TDD evidence

The pure coverage core was implemented with an explicit RED -> GREEN cycle before repository integration.

RED contract demonstrated missing behavior for:

1. unknown case Rule references;
2. seeded stable MUST rules left `uncovered`;
3. derived Rule -> Case backlinks.

GREEN evidence in the isolated executable test environment:

```text
node --test rule-coverage.test.mjs
3 tests
3 pass
0 fail
```

Static preflight also confirmed:

```text
validate-rule-coverage.mjs: node --check PASS
Rule YAML: parse PASS
```

This local evidence proves the pure relationship algorithm and basic syntax only. It does **not** replace the required full repository CI, YAML/schema integration, existing conformance validation, or release-artifact dry run.

## 9. Why normative specs were not rewritten

The migration plan allowed modification of selected `specs/**`, but G3 found no semantic defect requiring prose changes. The current specs already state the seeded requirements correctly.

Therefore G3 deliberately does not add duplicate inline requirement text merely to place IDs beside paragraphs. `contract/rules/rules.yaml` points to the current spec path/section and names the existing requirement. This preserves the current normative authority and avoids turning Rule metadata into a second semantic specification.

Future spec editing MAY render Rule IDs inline as a projection if tooling can guarantee synchronization, but inline labels are not required for G3 closure.

## 10. Defect classification

| Finding | Class | Disposition |
|---|---|---|
| `AXTP-GOV-004` | VERIFICATION-GAP | FIXED-IN-G3; pending full verification. |
| Prose-only requirement discovery | EVIDENCE_GAP | Seed current-core Rule IDs and source pointers. |
| No Rule -> Case backlinks | EVIDENCE_GAP | Derive from `case.authorityRules`. |
| Potential double-authored mapping | GOV-STRUCTURE risk | Prevented: relationship owner is case metadata only. |
| Raw invalid-frame runtime negative test absent | EVIDENCE_GAP | Explicit `structural-only` for seed Rule; no false executable claim. |

No finding discovered by G3 requires a `PROTOCOL-SEMANTIC` amendment.

## 11. Five drift reviews

### Authority drift

**PASS, pending full-CI confirmation.** `specs/**` remains semantic authority. Rules and coverage tooling are verification metadata/tooling only.

### Semantic duplication

**PASS, pending full-CI confirmation.** Rule statements summarize and point to existing requirements; executable expectations remain in conformance. Rule-to-case edges are authored only on cases and reverse-mapped by tooling.

### Derivation drift

**PASS, pending full-CI confirmation.** Rule->Case coverage projections are derived, not maintained as duplicate generated files. No generated protocol fact changes.

### Verification drift

**PASS, pending full-CI confirmation.** Selected cases retain their original steps/assertions and are now tied to named requirements. One structural-only limitation is explicit rather than hidden.

### Release / consumer drift

**PASS, pending full-CI confirmation.** `contract/rules/**` is release-consumable metadata; its source/evidence paths remain inside release-consumable `specs/**` / `contract/**`. Runtime behavior and result schema remain unchanged. `contract/rules/README.md` is release-artifact self-contained and does not require maintainer-only tooling paths to interpret the Rule-to-Evidence chain.

## 12. Semantic impact check

```text
Wire semantic impact = NONE
Registry semantic impact = NONE
Protocol IR semantic impact = NONE
Existing conformance case behavior change = NONE
Stable ID renumbering = NONE
Runtime parser behavior change = NONE
spec/v0.15.0 mutation = NONE
```

## 13. Exit criteria

G3 can close when fresh full repository validation proves the completed branch state satisfies all of the following:

- Rule registry metadata is parseable and source/evidence paths resolve;
- existing case schema accepts `authorityRules` and all existing cases remain valid;
- all referenced Rule IDs exist;
- all 10 `covered` seed rules have executable case backlinks;
- `CORE.FRAME.001` remains explicit `structural-only` with structural evidence;
- no seeded stable `must` is `uncovered`;
- coverage unit tests pass;
- existing conformance validation passes;
- docs/protocol-status checks pass;
- release artifact dry run remains valid;
- no protocol semantic or runtime behavior change is introduced.

## 14. Functional-head freeze

The last G3 implementation/content commit before full CI is:

```text
024d5bf7329491519f43644c04c59c174e23c9d7
```

The commit only made the release-consumable Rule README self-contained after the Rule/case/tooling model was already complete. This review-record update is governance evidence, not a further implementation change. Any subsequent functional failure will be classified before repair rather than patched opportunistically.

## 15. Current decision

**READY FOR FULL VERIFICATION**

The G3 authority/coverage model is implemented on the feature branch. Gate PASS is withheld until one fresh full `Validate AXTP Spec` run succeeds on the completed G3 branch state, followed by exact-head closure evidence.

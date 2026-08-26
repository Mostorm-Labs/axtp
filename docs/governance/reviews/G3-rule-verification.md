# AXTP G3 — Normative Rule & Verification Closure

Status: **PASS**  
Prerequisite: G2 PASS  
Primary finding: `AXTP-GOV-004`

## 1. Gate decision

G3 closes the prose-only verification gap by assigning stable Rule IDs to a high-value seed set of existing AXTP normative requirements and establishing machine-checkable Rule <-> Conformance traceability.

This Gate does **not** change protocol semantics. `specs/**` remains the normative semantic authority; `contract/rules/**` is verification-authority metadata; `conformance/cases/**` remains executable acceptance authority.

Functional-state full validation evidence:

```text
Validate AXTP Spec run: 32957936731
Validated branch head:  acdb83555e2a5758d762978d971dbf688eecafb9
Result:                 SUCCESS
```

The run proved all four repository validation layers together:

- generator / generated artifact build, lint, tests, source validation, Protocol IR validation and generated drift: PASS;
- conformance validation including the new Rule coverage contract: PASS;
- docs / protocol status / path / frontstage checks: PASS;
- release artifact dry run: PASS.

The closure-record commit is intentionally followed by one exact-head full validation run. That final run is recorded in Draft PR #12 Checks without creating another repository commit.

## 2. Stage contract

**Role**: P20 Verification Design + P21/P22 Authority/Drift Review.  
**Authority**: current AXTP governance authority, current `specs/**`, current `conformance/**`, protected baseline `spec/v0.15.0`.  
**Objective**: stable IDs for selected existing normative requirements plus bidirectional evidence traceability.  
**Non-goals**: no protocol redesign, wire change, runtime behavior change, identifier renumbering, case expectation rewrite, or bulk numbering of all normative prose.  
**Output**: Rule registry, case backlinks, coverage validation/projection, unit contract, Gate evidence.  
**Handoff**: G4 may consume the stable Rule IDs for vector recipes and golden-vector evidence.

## 3. Authority model

| Surface | Authority class / role |
|---|---|
| `specs/20-core.md`, `specs/30-registry.md`, `specs/40-codec.md` | normative semantic authority |
| `contract/rules/rules.yaml` | verification-authority metadata: stable Rule ID, source pointer, level, status and disposition |
| `conformance/cases/**` | executable verification authority |
| case `authorityRules` | single authored Rule-to-Case relationship edge |
| coverage tooling | derived backlink/report and consistency validation only |

The relationship is intentionally authored once:

```text
Case.authorityRules = authored edge
Rule -> Cases         = derived backlink
```

The Rule registry does not independently maintain case lists, preventing a second mapping source from drifting.

## 4. Rule schema and verification dispositions

Stable IDs use domain-oriented namespaces such as:

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

Each rule records `id`, `status`, `level`, `statement`, normative `source`, `since`, and `verification.disposition`.

Allowed dispositions are:

```text
covered
structural-only
manual-evidence
not-applicable
uncovered
```

A seeded `stable + must + uncovered` rule is rejected by validation.

## 5. Seed coverage

G3 deliberately seeds 11 high-value rules rather than numbering the entire prose corpus.

| Rule | Requirement | Disposition / evidence |
|---|---|---|
| `CORE.FRAME.001` | Standard Frame Header Version is parser compatibility boundary; current value `0x01`. | `structural-only`; Protocol metadata + Protocol IR |
| `CONTROL.SESSION.001` | OPEN -> ACCEPT and ACCEPT echoes OPEN `controlId`. | `handshake.open_accept` |
| `RPC.SESSION.001` | Hello -> Identify -> Identified with non-empty `sid`. | `session.hello_identify_identified` |
| `RPC.SESSION.002` | Business Request before Identified is rejected/not processed. | `session.request_before_identified` |
| `RPC.COMPAT.001` | `Hello.axtpVersion` is advisory, never admission/feature authority. | `session.axtp_version_advisory` |
| `RPC.METHOD.001` | Unknown method -> `RPC_METHOD_NOT_FOUND`. | `rpc.method_not_found` |
| `RPC.METHOD.002` | Registered-unavailable -> canonical `NOT_SUPPORTED`; session remains usable. | two capability cases |
| `CODEC.COMPAT.001` | Structurally valid unknown optional fields preserve message/session liveness. | `capability.unknown_optional_field_ignored` |
| `RPC.EVENT.001` | Unknown event is ignored/diagnostic-only; session remains usable. | `event.unknown_event_ignored` |
| `STREAM.FRAME.001` | STREAM uses 16B BE `streamId/seqId/cursor` header. | `stream.stream_data` |
| `RPC.RELAY.001` | `m.dst` is one logical Endpoint string, not array/route path. | `rpc.endpoint_relay_addressing` |

Validated coverage output from run `32957936731`:

```text
[OK] normative rules: 11
[OK] rule coverage: covered=10, structural-only=1,
                    manual-evidence=0, not-applicable=0, uncovered=0
```

`CORE.FRAME.001` is intentionally **not** reported as runtime executable coverage. The current case DSL cannot inject an invalid raw Standard Frame version, so G3 records structural evidence instead of fabricating a negative-case PASS.

## 6. Conformance integration

Selected existing cases now carry only metadata such as:

```yaml
authorityRules:
  - RPC.METHOD.001
```

Their executable steps, assertions, profiles, expected status/error values, wire bytes and semantic kinds were not changed.

The conformance schema accepts and validates Rule IDs, while repository coverage validation rejects:

- unknown Rule references;
- `covered` rules with no case backlink;
- invalid status/level/disposition metadata;
- missing structural/manual evidence metadata;
- any seeded stable MUST rule left `uncovered`.

A runtime result already identifies its conformance case, so Rule-level result attribution can be derived without creating a second result-authority field.

## 7. TDD and repository evidence

The pure Rule coverage helper followed explicit RED -> GREEN before repository integration.

RED covered:

1. unknown case Rule references;
2. stable MUST rules left uncovered;
3. Rule -> Case backlink derivation.

GREEN local evidence:

```text
node --test rule-coverage.test.mjs
3 tests
3 pass
0 fail
```

The full GitHub validation independently repeated the unit contract and reported:

```text
# tests 3
# pass 3
# fail 0
```

It then validated all existing conformance inputs:

```text
[OK] conformance cases: 39
```

Generator tests also remained green:

```text
Test Files 3 passed
Tests      45 passed
```

## 8. Release-artifact boundary

`contract/rules/**` is included in the runtime-consumable `contract/**` release surface. Rule source/evidence pointers use release-consumable `specs/**` / `contract/**` paths.

`contract/rules/README.md` is self-contained inside the release artifact and explains the Rule -> Spec -> Conformance chain without requiring maintainer-only `tooling/**` content.

The release dry run in `32957936731` reported:

```text
[OK] release archive contract paths verified
[OK] local Markdown links resolved
[OK] frontstage docs use Chinese-first navigation language
```

## 9. Why normative specs were not rewritten

The migration plan allowed selected spec edits, but the review found no semantic defect in the seeded requirements. Rewriting the same MUST statements merely to place Rule IDs inline would create unnecessary duplication.

Therefore:

- normative meaning remains in existing `specs/**`;
- Rule metadata points to the current spec path/section;
- case metadata points to Rule IDs;
- reverse coverage is derived.

Future tooling may render Rule IDs inline as a synchronized projection, but G3 does not create a second hand-maintained normative source.

## 10. Five drift reviews

### Authority drift — PASS

Normative semantics remain owned by `specs/**`; Rule metadata and coverage tooling do not create protocol behavior.

### Semantic duplication — PASS

Rule-to-Case edges are authored only on cases. Rule statements identify existing requirements; they do not replace the normative source.

### Derivation drift — PASS

Rule -> Case backlinks and coverage reports are derived each run. No generated protocol fact changed.

### Verification drift — PASS

Selected cases retained their existing executable behavior. Ten Rule IDs have executable case backlinks; the one non-executable parser-boundary rule is explicitly `structural-only`.

### Release / consumer drift — PASS

The new Rule metadata is release-consumable and self-contained; runtime behavior/result schema and existing release binding remain unchanged.

## 11. Defect classification

| Finding | Class | Final disposition |
|---|---|---|
| `AXTP-GOV-004` | `VERIFICATION-GAP` | CLOSED by stable Rule IDs + machine-enforced Rule-to-Evidence traceability |
| prose-only requirement discovery | `EVIDENCE_GAP` | closed for the seeded current-core scope |
| missing Rule -> Case backlinks | `EVIDENCE_GAP` | closed through derived backlinks |
| raw invalid-frame negative case absent | `EVIDENCE_GAP` | explicitly `structural-only`; not misrepresented as executable coverage |

No `PROTOCOL-SEMANTIC` defect was discovered.

## 12. Semantic impact check

```text
Wire semantic impact = NONE
Registry semantic impact = NONE
Protocol IR semantic impact = NONE
Existing conformance case behavior change = NONE
Stable protocol ID renumbering = NONE
Runtime parser behavior change = NONE
spec/v0.15.0 mutation = NONE
```

## 13. Exit criteria result

- Rule registry parse/source/evidence validation: PASS
- case schema + all existing cases: PASS
- Rule references resolve: PASS
- 10 executable `covered` rules have backlinks: PASS
- `CORE.FRAME.001` structural evidence explicit: PASS
- seeded stable MUST `uncovered`: **0**
- Rule coverage unit tests: PASS, 3/3
- existing conformance validation: PASS, 39 cases
- generator test suite: PASS, 45/45
- generated drift: PASS
- docs/protocol-status/path checks: PASS
- release artifact dry run: PASS
- protocol semantic impact: NONE

## 14. Final decision

**PASS**

G3 establishes a stable, evidence-gated verification identity layer:

```text
Normative Spec
    ↓ source
Stable Rule ID
    ↓ authorityRules
Conformance Case
    ↓ runtime result
Evidence
```

G4 may now use these Rule IDs as authority references for canonical vector recipes and golden-vector derivation.

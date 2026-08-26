# AXTP G0 — Governance Baseline & Semantic Freeze

Status: **PASS**  
Governance authority: `docs/governance/AXTP_AUTHORITY_ARCHITECTURE_AND_REPOSITORY_GOVERNANCE_V1.md`  
Finding register: `docs/governance/findings.yaml`

## 1. Protected baseline

| Item | Value |
|---|---|
| Repository | `Mostorm-Labs/axtp` |
| Default branch at program start | `main` |
| Protected semantic baseline commit | `1bf9e89ede12470e20733d4cea4e50edad989528` |
| Protected release | `spec/v0.15.0` |
| `spec/v0.15.0` annotated tag object | `a15e47f67395bc66614b4a7e5acc7d9346622420` |
| `spec/v0.15.0` target commit | `1bf9e89ede12470e20733d4cea4e50edad989528` |
| Migration branch | `chatgpt/axtp-authority-governance-v1` |

The migration branch was created from the same commit targeted by `spec/v0.15.0`. Therefore the governance migration begins from an exact released semantic snapshot rather than a later floating protocol state.

## 2. Semantic freeze declaration

G0 establishes the following hard assertion for all G0-G5 work:

```text
Wire semantic impact = NONE
Released spec/v0.15.0 mutation = NONE
Mandatory downstream runtime behavior change caused by governance = NONE
Stable protocol identifier renumbering = NONE
```

Any finding that cannot be fixed while preserving these assertions is reclassified `PROTOCOL-SEMANTIC` and is outside this governance program.

## 3. Current authority-surface inventory

### 3.1 Governance / navigation

| Surface | G0 classification | Notes |
|---|---|---|
| `README.md` | governance/navigation projection | Defines repository role and implementation entry points; does not independently define wire facts. |
| `docs/README.md` | governance/navigation projection | Public reading map and contract boundary explanation. |
| `docs/guides/**` | explanatory projection | Role/runtime/product guidance; runtime-facing but subordinate to canonical/generated/spec authority. |
| `docs/product/**` | product/status projection | Product/domain status and health views; not runtime contract. |
| `docs/governance/**` | governance-authority | Added by this program as the repository governance source. |

### 3.2 Backstage evidence / intent / proposal

| Surface | G0 classification | Runtime contract? |
|---|---|---:|
| `workspace/business/**` | intent/evidence | No |
| `workspace/flows/**` | intent/proposal-support | No |
| `workspace/protocol/**` | proposal | No — current metadata contains contradictory exceptions to fix in G1 |
| `workspace/legacy-migration/**` | evidence/history | No |
| `workspace/registry-planning/**` | proposal/planning | No |
| `workspace/runtime/**` | explanatory backstage reference | No |

### 3.3 Canonical and normative authority

| Surface | G0 classification | Notes |
|---|---|---|
| `contract/registry/**` | canonical-source | Hand-maintained machine-readable facts consumed by generator. |
| `specs/**` | normative-spec | Human-readable normative semantics and compatibility rules. |

### 3.4 Derived contracts

| Surface | G0 classification | Notes |
|---|---|---|
| `contract/protocol/axtp.protocol.yaml` | derived-contract | Generated Protocol IR; read-only. |
| `contract/generated/**` | derived-contract | Generated human/machine references; read-only. |
| `contract/mcp/**` | derived-contract | Generated machine/agent metadata; read-only. |
| `contract/test-vectors/**` | derived-contract / verification input | Claimed generated; derivation defect exists and is assigned to G4. |

### 3.5 Verification authority

| Surface | G0 classification | Notes |
|---|---|---|
| `conformance/manifest.yaml` | verification-authority | Declares shared conformance scopes/levels. |
| `conformance/cases/**` | verification-authority | Machine-readable behavioral acceptance scenarios. |
| `conformance/fixtures/**` | verification support | Test inputs, not independent protocol source. |

### 3.6 Release authority

| Surface | G0 classification | Notes |
|---|---|---|
| `release/**` | release-authority + release governance | Defines binding, packaging and downstream update flow. |
| Git tag `spec/v*` | immutable release-authority | Exact bindable semantic snapshot. |
| GitHub release artifact | immutable release projection | Runtime/SDK consumable snapshot. |

### 3.7 Operational tooling

| Surface | G0 classification | Notes |
|---|---|---|
| `tooling/generators/**` | operational-tooling | Must project canonical facts, not create hidden semantic truth. |
| `tooling/scripts/**` | operational-tooling | Validation/reporting/release checks. |
| `tooling/skills/**` | operational-tooling | AI/Codex workflow instructions; not protocol authority. |
| `.github/workflows/**` | operational-tooling/governance enforcement | CI/release automation. |
| `.github/CODEOWNERS` | repository governance | Current ownership is coarse; G5 finding. |

## 4. Confirmed initial findings

The machine-readable register contains the detailed findings. G0 confirms the following priority defects as real and in scope:

| Finding | Priority | Target Gate | G0 conclusion |
|---|---:|---|---|
| AXTP-GOV-001 Workspace proposal shadow authority | P0 | G1 | Confirmed |
| AXTP-GOV-002 overloaded version identity | P0 | G2 | Confirmed |
| AXTP-GOV-003 hard-coded generated test-vector truth | P0 | G4 | Confirmed |
| AXTP-GOV-004 missing Rule -> Conformance traceability | P1 | G3 | Confirmed |
| AXTP-GOV-005 AI retrieval pollution/backstage ambiguity | P1 | G5 | Confirmed |
| AXTP-GOV-006 missing consumer evidence closure | P1 | G5 | Confirmed |
| AXTP-GOV-007 coarse ownership / unprotected main | P1 | G5 | Confirmed |
| AXTP-GOV-008 coarse domain-registry authoring granularity | P1 | G5 | Confirmed |
| AXTP-GOV-009 oversized/duplicative proposal corpus | P1 | G5 | Confirmed |
| AXTP-GOV-010 security policy without full protocol security authority | P1 | G5/future | Confirmed |
| AXTP-GOV-011 lifecycle/stability status ambiguity | P1 | G1 | Confirmed |

## 5. Additional repository-governance observation

At G0 review time the GitHub `main` branch reports:

```text
protected = false
required status checks enforcement = off
repository rulesets = []
```

This does not alter protocol semantics, but it means the repository's actual merge authority is weaker than the sophistication of its internal CI/contract model. The issue is therefore recorded as governance debt rather than a protocol defect.

No branch protection setting is changed in G0 because G0's purpose is to establish an auditable baseline, not to modify repository administration implicitly.

## 6. Five drift reviews

### Drift Review 1 — Authority drift

**Result: FIX-IN-GATE (G1).**

The repository-level documentation correctly says workspace protocol material is not the runtime implementation contract, but accepted/generated proposal documents can still use metadata such as `contract: true` and language equivalent to “可直接实现”. This produces a shadow-authority contradiction.

G0 does not fix it; G1 owns closure.

### Drift Review 2 — Semantic duplication

**Result: DEFER-WITH-OWNER (G1/G5).**

Multiple human-readable layers intentionally repeat protocol facts for different audiences. Some repetition is projection; some proposal documents still carry large copies of method/schema/example material. G1 establishes the authority boundary; G5 reduces unnecessary authoring duplication.

### Drift Review 3 — Derivation drift

**Result: FIX-IN-GATE (G4).**

The primary registry -> IR/generated chain is governed and validated, but the current test-vector emitter contains hard-coded semantic vectors and bytes instead of deriving them from `SpecModel`. Therefore not every artifact described as generated has an equally defensible derivation chain.

### Drift Review 4 — Verification drift

**Result: FIX-IN-GATE (G3).**

Conformance is already machine-readable and strong, but normative prose lacks stable Rule IDs and explicit coverage linkage. Current expected behavior can be read and tested, yet the repository cannot mechanically prove which normative MUST is covered by which case.

### Drift Review 5 — Release / consumer drift

**Result: FIX-IN-GATE (G2/G5).**

Release tags and runtime Spec locks are well-defined, but version dimensions are ambiguously named and downstream upgrade status is dispatched outward without a canonical evidence closure back into the authority repository.

## 7. Defect classification check

No confirmed G0 finding requires a protocol semantic change to describe or plan its remediation.

Therefore:

```text
PROTOCOL-SEMANTIC findings discovered in G0 = 0
```

The program remains valid under the semantic freeze.

## 8. G0 Exit Criteria

- [x] Exact migration baseline recorded.
- [x] `spec/v0.15.0` target commit recorded and protected as immutable historical authority.
- [x] Authority surfaces classified.
- [x] Wire-zero-change invariant established.
- [x] Initial P0/P1 finding register created.
- [x] Five drift reviews completed.
- [x] No protocol semantic modification made.

## 9. G0 Decision

**PASS**

G1 may begin.

G1 authority is limited to **Authority Boundary Closure**. It may reclassify proposal metadata, wording and retrieval guidance, but MUST NOT alter protocol IDs, schemas, wire behavior, generated semantic facts or release/runtime compatibility.

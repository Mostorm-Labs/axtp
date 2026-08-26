# AXTP Authority Architecture & Repository Governance v1

Status: **Current Governance Authority**  
Scope: `Mostorm-Labs/axtp`  
Applies to: protocol maintainers, product/architecture reviewers, runtime/SDK maintainers, test/conformance maintainers, release owners, AI agents, Codex and other automated contributors  
Baseline protected by this governance revision: **`spec/v0.15.0`**  
Primary constraint: **this governance migration MUST NOT change AXTP wire semantics, released `spec/v0.15.0` contents, or downstream runtime behavior solely as a consequence of repository reorganization.**

---

## 1. Purpose

AXTP is not only a protocol specification repository. It is the protocol authority system that converts product and hardware collaboration intent into versioned, machine-readable, verifiable and releasable contracts consumed by firmware, runtimes, SDKs, tools and cloud/product software.

The repository already contains a valid authority supply chain:

```text
Business intent
  -> interaction / product flow
  -> protocol proposal
  -> adopted registry facts
  -> Protocol IR
  -> generated contract projections
  -> conformance
  -> immutable Spec release
  -> runtime / SDK Spec lock
```

The purpose of this governance version is not to redesign that protocol chain. It is to remove ambiguity around which artifacts are authoritative, how facts move between lifecycle stages, how versions are named, how generated outputs are proven, how normative rules map to executable evidence, and how AI agents are allowed to retrieve and modify repository content.

The target state is **Authority by Construction** rather than **Authority by Convention**.

---

## 2. Non-negotiable migration invariants

Every G0-G5 migration change MUST preserve all of the following unless a later protocol-change proposal is explicitly opened outside this governance program.

### INV-001 — Wire semantic freeze

No governance migration may change:

- Standard Frame binary layout;
- CONTROL opcode semantics;
- RPC envelope semantics;
- STREAM header semantics;
- byte order or CRC semantics;
- transport profile wire behavior;
- methodId, eventId, errorCode, capabilityId, fieldId or stable bitOffset meaning;
- existing request / response / event behavior;
- compatibility behavior already released in `spec/v0.15.0`.

### INV-002 — Released Spec immutability

`spec/v0.15.0` and its release artifact are historical immutable authority. Migration work may describe, index or compare that release, but MUST NOT mutate or retag it.

### INV-003 — Runtime compatibility freeze

Existing runtime repositories bound to `spec/v0.15.0` MUST remain valid without a mandatory runtime behavior change caused only by this repository-governance migration.

### INV-004 — Generated contract preservation

Until a Gate explicitly introduces a new generator projection, existing generated facts remain canonical according to the current source-of-truth rules. A file move or metadata normalization must not silently alter generated semantic content.

### INV-005 — No shadow authority

After the relevant migration Gate closes, no artifact may simultaneously claim incompatible authority classes. In particular, maintainer workspace material MUST NOT claim runtime-contract authority.

### INV-006 — No hidden supersession

Any authority artifact replaced or reclassified by this program MUST remain discoverable through an explicit supersession or migration record. Deletion without traceability is prohibited.

---

## 3. Authority classes

Every governed AXTP artifact belongs to exactly one primary authority class.

| Authority class | Purpose | May define runtime behavior? | Typical contents |
|---|---|---:|---|
| `evidence` | Record observations, legacy facts, product needs, hardware findings and external constraints | No | legacy captures, product inputs, hardware evidence |
| `intent` | Define approved problem, desired outcome, scope and constraints | No | business requirement, accepted product intent |
| `proposal` | Describe a candidate protocol change before canonical adoption | No | protocol change proposal, review notes, compatibility analysis |
| `canonical-source` | Human-maintained machine-readable protocol facts used by generators | Yes | registry YAML, rule metadata, version identity source |
| `normative-spec` | Human-readable normative explanation of canonical protocol semantics | Yes, subject to conflict rules | core/registry/codec/security specifications |
| `derived-contract` | Deterministic projection generated from canonical source | Yes, read-only | Protocol IR, generated registries, generated reference, SDK metadata |
| `verification-authority` | Executable or machine-readable proof obligations derived from normative requirements | Defines acceptance, not new behavior | conformance cases, rule coverage, golden vectors |
| `release-authority` | Immutable binding of a verified authority snapshot | Yes, by exact release identity | spec tag, manifest, release artifact, compatibility report |
| `governance-authority` | Defines repository lifecycle, conflict resolution and change procedure | Governs process only | this document, supersession rules, review gates |
| `operational-tooling` | Implements generation, validation, release and workflow behavior | No independent protocol semantics | generators, scripts, skills, CI workflows |

An artifact MUST NOT be both `proposal` and `canonical-source`, or both `proposal` and `derived-contract`.

A proposal may be marked `accepted`, but acceptance only means that canonical facts were adopted elsewhere. The proposal itself does not become a runtime contract.

---

## 4. Lifecycle and stability are separate dimensions

AXTP MUST stop using a single status word to simultaneously describe review lifecycle and protocol maturity.

### 4.1 Lifecycle

Allowed lifecycle values:

```text
captured
reviewing
accepted
superseded
archived
```

These answer: **where is this artifact in the governance process?**

### 4.2 Protocol stability

Allowed protocol stability values:

```text
draft
experimental
stable
deprecated
reserved
```

These answer: **what compatibility promises apply to this protocol fact?**

Example:

```yaml
lifecycle: accepted
authorityClass: proposal
adoptedBy:
  - authority://registry/audio/algorithm
```

is valid.

This is not equivalent to:

```yaml
contract: true
```

and proposal/workspace documents MUST NOT use `contract: true` after G1 closes.

---

## 5. Source-of-truth hierarchy

When two artifacts disagree, consumers MUST resolve the conflict in the following order.

### 5.1 Released consumers

For a runtime or SDK bound to a release:

1. exact immutable release artifact / `spec/vMAJOR.MINOR.PATCH`;
2. Protocol IR included in that release;
3. generated machine contracts included in that release;
4. verification authority associated with that release;
5. normative specs included in that release.

### 5.2 Main-branch maintainers

For current protocol maintenance:

1. canonical source;
2. normative specification;
3. generator implementation only insofar as it faithfully projects canonical source;
4. derived contracts;
5. verification authority;
6. accepted proposals and migration records;
7. unaccepted proposal / intent / evidence.

If a generated artifact disagrees with canonical source, the generated artifact is defective and MUST be regenerated or the generator fixed. It MUST NOT be manually corrected as an independent fact.

If a conformance case contradicts a normative rule, the case is defective unless an approved amendment changes the rule first.

---

## 6. Repository-zone policy

The physical repository layout MUST make authority boundaries obvious enough that a human or AI agent can correctly classify a file without relying on historical knowledge.

### 6.1 Frontstage contract zone

Runtime- and SDK-consumable material belongs only to explicit contract/spec/verification/release surfaces.

Target logical zones:

```text
authority/ or equivalent canonical source zone
specs/
contract/
conformance/ or verification/
release/
```

Existing paths may remain during staged migration, but their class MUST be machine-identifiable.

### 6.2 Backstage work zone

`workspace/**` is permanently non-contract.

Its allowed authority classes are limited to:

```text
evidence
intent
proposal
```

`workspace/**` MUST NOT claim:

```text
contract: true
authorityClass: canonical-source
authorityClass: derived-contract
```

An accepted workspace proposal references its adopted canonical facts through stable links; it does not transform into the contract itself.

### 6.3 Operational tooling zone

`tooling/**`, CI workflows and AI skills may enforce authority rules but MUST NOT become an independent protocol semantic source.

Hard-coded semantic data in generator code is prohibited when that data is represented as a generated protocol contract.

---

## 7. Spec identity and version governance

AXTP currently has multiple valid but ambiguously named version dimensions. G2 MUST normalize them into a single explicit identity model.

The target semantic model is:

```yaml
specIdentity:
  release:
    version: 0.15.0
    tag: spec/v0.15.0
    commit: <sha>

  protocolSemantics:
    generation: 1
    version: 1.0.0

  wire:
    standardFrameVersion: 1

  registrySchema:
    version: 1.0.0

  authoritySchema:
    version: 1

  generator:
    version: <generator-version>
```

The exact physical representation may evolve during G2, but the following naming rule is normative:

> A version field MUST identify what is being versioned. Bare ambiguous fields such as `version`, `specVersion` or `protocolVersion` MUST NOT be introduced as new canonical metadata.

Existing fields needed for backward compatibility may remain as generated aliases until a future protocol release explicitly removes them.

Runtime compatibility MUST continue to be based on wire parsing boundaries, supported profiles and capabilities. A release number alone MUST NOT become a runtime feature-admission gate.

---

## 8. Normative Rule model

G3 introduces stable Rule IDs for behavior that uses normative language such as MUST, MUST NOT, REQUIRED, SHOULD or equivalent statements.

Rule IDs use domain-oriented namespaces, for example:

```text
CORE.FRAME.001
CONTROL.SESSION.004
RPC.SESSION.012
RPC.COMPAT.003
STREAM.LIFECYCLE.007
CAST.RECONFIG.002
SECURITY.AUTH.001
```

Each normative rule SHOULD eventually expose at least:

```yaml
id: RPC.COMPAT.003
status: stable
level: must
statement: Registered but unavailable operations return NOT_SUPPORTED without invalidating the session.
source: specs/...
since: spec/v...
verification:
  - capability.registered_method_not_supported
  - capability.session_survives_not_supported
```

Stable rules introduced into the verification model MUST have explicit verification disposition:

```text
covered
structural-only
manual-evidence
not-applicable
```

Unexplained `uncovered` stable MUST rules block G3 closure and, after G3, block release readiness.

---

## 9. Golden vector governance

`contract/test-vectors/**` is a derived contract surface. Therefore binary/vector truth MUST ultimately be generated from canonical semantic input and an explicit vector recipe.

The following pattern is prohibited as a final state:

```text
hard-coded hex in generator source
  -> copied into generated vector files
```

Target pipeline:

```text
Canonical registry / wire rules
        +
Vector recipe
        -> canonical encoder
        -> golden bytes
        -> canonical decoder
        -> semantic projection
        -> vector manifest
```

Each vector SHOULD identify:

```yaml
id: vector.control.open.minimal
authorityRules:
  - CORE.FRAME.001
  - CONTROL.OPEN.001
input: <semantic input>
encodingProfile: standard-framed
expectedDecode: <semantic projection>
expectedWireDigest: <digest>
```

Hex bytes are an output/evidence artifact, not the primary human-authored semantic source.

Legacy or non-v1-core vectors may remain only when explicitly classified as compatibility/legacy vectors and excluded from claims about current core coverage.

---

## 10. Proposal policy

Proposal documents exist to capture the semantic delta required to make a decision.

A proposal SHOULD contain:

- problem and motivation;
- evidence and affected products/hardware;
- scope / non-scope;
- proposed semantic delta;
- compatibility impact;
- affected canonical entities;
- open review questions;
- acceptance criteria;
- adoption/supersession links once accepted.

A proposal SHOULD NOT duplicate full canonical registries, full generic RPC envelopes, generic error rules or generic test matrices when those can be linked or generated.

The long-term authoring principle is:

> **Proposal describes the delta; canonical source defines the fact; generated views explain the fact.**

---

## 11. Canonical registry granularity

The authoring unit SHOULD converge toward feature-level source files while preserving aggregated runtime consumption.

Target concept:

```text
canonical source
  domains/audio/domain.yaml
  domains/audio/algorithm.yaml
  domains/audio/stream.yaml
  domains/audio/volume.yaml
        -> generator
        -> aggregated Protocol IR / generated registries
```

The migration MUST preserve IDs and semantic content. File splitting is repository-structure work, not a protocol behavior change.

---

## 12. Verification Authority

Conformance remains the common behavioral acceptance surface for runtimes, SDKs, mock servers and tools.

After G3, verification authority SHOULD answer both directions:

```text
Rule -> which evidence proves it?
Case -> which rule(s) justify this expectation?
```

Structural facts that can be deterministically inferred from registry/IR SHOULD be generated rather than copied into independent handwritten conformance cases.

Behavioral scenarios that require state transitions, degradation, timing, failure recovery or cross-version interaction remain explicit conformance cases and reference stable Rule IDs.

---

## 13. Consumer evidence closure

A Spec release is not fully operationally closed merely because an artifact was published. AXTP SHOULD eventually maintain a machine-readable consumer-adoption view showing which maintained runtimes/tools/devices have bound and verified each release.

Target evidence shape:

```yaml
spec: spec/v0.15.0
consumers:
  axtp-cpp-runtime:
    specLock: spec/v0.15.0
    implementationVersion: 0.15.0.0
    conformance:
      core: pass
      framed-binary: pass
      stream: pass
```

The authority repository MUST NOT fabricate downstream PASS status. Consumer evidence must originate from actual downstream CI/release evidence or an explicitly recorded manual verification source.

---

## 14. AI / Codex retrieval policy

AI agents are first-class repository consumers and contributors. Retrieval rules therefore form part of governance.

When asked to implement runtime behavior, an agent MUST prefer:

1. exact bound release / Spec lock;
2. generated machine contract / Protocol IR;
3. normative specs;
4. verification authority.

The agent MUST NOT infer implementable protocol facts from:

```text
workspace/business/**
workspace/flows/**
workspace/protocol/**
workspace/legacy-*/**
docs/superpowers/**
tooling/skills/**
```

unless the task is explicitly protocol design, migration, historical analysis or governance.

Accepted proposals are evidence of why a canonical fact exists; they are not a substitute for the canonical fact.

---

## 15. Change classification

Every governance-program finding is classified before modification.

| Class | Meaning | Protocol release impact |
|---|---|---|
| `GOV-STRUCTURE` | path, metadata, navigation, classification or ownership cleanup | none |
| `GOV-AMBIGUITY` | conflicting authority/lifecycle/version labels | none if aliases preserved |
| `DERIVATION-DEFECT` | generated artifact is not truly derived from canonical source | none if corrected output remains semantically identical; otherwise stop and reclassify |
| `VERIFICATION-GAP` | normative behavior lacks adequate executable evidence | none unless fixing reveals protocol ambiguity |
| `DOC-DRIFT` | explanatory projection conflicts with canonical facts | none; fix projection |
| `PROTOCOL-SEMANTIC` | actual behavior, wire, IDs, schemas or compatibility must change | **out of scope for G0-G5; requires separate protocol amendment/release** |

If any migration task discovers a required `PROTOCOL-SEMANTIC` change, that task is BLOCKED and MUST NOT be silently completed inside the governance refactor.

---

## 16. Supersession protocol

When an artifact is replaced:

Old artifact:

- remains in history or an explicit archive path;
- is marked `superseded` where practical;
- points to the current authority;
- records the reason for supersession.

New artifact:

- declares its authority class;
- links the superseded predecessor when relevant;
- records the governance finding that caused replacement;
- does not silently rewrite historical released truth.

Generated artifacts are not "superseded" manually; they are regenerated from the new source and tied to a new commit/release snapshot.

---

## 17. Review procedure applied to every Gate

Every G0-G5 Gate MUST execute the same five review questions.

### Drift Review 1 — Authority drift

Does any non-authoritative artifact claim or imply authority that belongs elsewhere?

### Drift Review 2 — Semantic duplication

Is the same protocol fact independently authored in multiple places rather than projected from one canonical source?

### Drift Review 3 — Derivation drift

Can every claimed generated artifact be deterministically traced to declared canonical source?

### Drift Review 4 — Verification drift

Can normative behavior be traced to verification, or is conformance independently inventing expected behavior?

### Drift Review 5 — Release / consumer drift

Can the current release identity and downstream binding be unambiguously determined without relying on floating `main` or ambiguous version labels?

Each finding receives one defect class from Section 15 and one disposition:

```text
PASS
FIX-IN-GATE
DEFER-WITH-OWNER
BLOCKED-PROTOCOL-SEMANTIC
```

---

# 18. Migration Gates

## G0 — Governance Baseline & Semantic Freeze

### Goal

Establish this document as the audit authority, freeze protocol semantics for the migration, and record the exact pre-migration baseline.

### Required outputs

- governance authority document;
- exact branch/base commit and protected release baseline;
- G0 inventory of authority surfaces;
- explicit `wire semantic zero-change` declaration;
- finding register using the classification in Section 15.

### Exit criteria

G0 passes only when a reviewer can distinguish current canonical, derived, verification, release, proposal/evidence and tooling surfaces without making any protocol change.

---

## G1 — Authority Boundary Closure

### Goal

Remove shadow authority and make lifecycle/classification unambiguous.

### Required work

- prohibit `workspace/**` from being runtime contract;
- replace ambiguous `contract:true` proposal metadata;
- separate lifecycle from protocol stability;
- define accepted-proposal links to canonical adoption targets;
- add explicit retrieval guidance for AI/runtime implementers;
- identify duplicated frontstage/backstage explanations that should become projections or references.

### Exit criteria

No file under `workspace/**` claims runtime-contract authority. An AI agent can classify every maintained protocol artifact into exactly one authority class using repository metadata/path policy.

---

## G2 — Spec Identity & Version Closure

### Goal

Eliminate semantic ambiguity between release version, protocol semantics version, wire version, registry schema version and generator metadata.

### Required work

- inventory every version field and consumer;
- define canonical `SpecIdentity` semantics;
- preserve compatibility aliases where required;
- update explanatory documentation so bare `version` terminology is not overloaded;
- ensure runtime compatibility remains capability/profile driven rather than release-number gated.

### Exit criteria

Given any version value in the repository, a reviewer can state exactly what entity it versions and whether it affects wire parsing, build/release identity, schema compatibility or diagnostics.

---

## G3 — Normative Rule & Verification Closure

### Goal

Create traceability between normative protocol requirements and executable evidence.

### Required work

- introduce stable Rule ID convention;
- seed Rule IDs for current core/session/compatibility/stream behaviors;
- map existing conformance cases to rules;
- classify structural versus behavioral verification;
- publish rule-coverage report format;
- prevent stable normative MUST rules from remaining silently unverified.

### Exit criteria

Every in-scope stable normative requirement has an explicit verification disposition and every migrated conformance case identifies its normative source.

---

## G4 — Derivation & Golden Vector Closure

### Goal

Ensure artifacts described as generated are actually derived from declared source.

### Required work

- audit all generator emitters for semantic hard-coding;
- redesign test vectors around canonical semantic recipes;
- distinguish core vectors from legacy/compatibility vectors;
- record canonical encoder/decoder expectations;
- ensure generated artifacts are reproducible from source without hidden protocol facts in emitter code.

### Exit criteria

No current-core generated test vector depends on hand-authored opaque hex as its sole protocol truth, and every generated artifact has a declared derivation path.

---

## G5 — Repository Information Architecture & Consumer Closure

### Goal

Reduce AI/human retrieval noise, converge authoring units, and close the release-to-consumer evidence loop.

### Required work

- reduce proposal duplication and retain semantic delta only;
- plan/execute feature-level canonical registry decomposition without semantic changes;
- isolate legacy/history/workflow material from runtime retrieval surfaces;
- improve ownership boundaries for core/domain/security/release review;
- define consumer-adoption evidence model;
- prepare security-authority work as a future protocol/release gate rather than smuggling semantic changes into governance migration.

### Exit criteria

The repository presents a small, unambiguous frontstage authority surface; backstage/history remains available but cannot masquerade as current implementation truth; downstream adoption state has an explicit evidence model.

---

## 19. Gate execution rule

Gates are sequential by default:

```text
G0 -> G1 -> G2 -> G3 -> G4 -> G5
```

A later Gate may be investigated early, but its migration changes MUST NOT be treated as accepted until all prerequisite Gate invariants are satisfied.

Each Gate closes with a review record containing:

```text
Baseline
Changed authority surfaces
Five drift-review results
Defect classifications
Wire-semantic impact: MUST be NONE for this program
Release impact
Downstream runtime impact
Deferred findings
Exit decision: PASS / BLOCKED
```

---

## 20. Definition of completion

The AXTP Authority Governance migration is complete only when:

1. protocol wire semantics remain unchanged from the protected baseline unless separately amended outside this program;
2. `spec/v0.15.0` remains immutable;
3. runtime bindings remain valid;
4. no workspace artifact claims runtime authority;
5. version dimensions have explicit names and semantics;
6. normative rule-to-verification traceability exists;
7. generated artifacts have defensible derivation paths;
8. proposal/history/tooling surfaces are retrieval-safe;
9. the repository can expose downstream adoption evidence without inventing it;
10. future protocol work can enter through a single auditable authority chain.

At that point AXTP is governed as an **AI-native Protocol Authority System**: humans and AI may collaborate on intent and design, canonical facts are explicit and machine-readable, generated projections are deterministic, conformance is executable evidence, releases are immutable authority snapshots, and downstream implementations are consumers rather than independent definitions of the protocol.

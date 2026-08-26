# AXTP Authority Governance Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the AXTP repository from convention-driven protocol governance to an AI-native authority system through G0-G5 while preserving wire semantics, the immutable `spec/v0.15.0` release, and existing runtime bindings.

**Architecture:** Treat the repository as an authority supply chain with explicit classes for evidence, intent, proposal, canonical source, normative spec, derived contract, verification authority, release authority, governance authority and operational tooling. Execute the migration as sequential evidence-gated reviews; any discovered protocol-semantic change is blocked and split into a separate protocol amendment rather than being folded into this governance program.

**Tech Stack:** GitHub repository contents, Markdown/YAML governance metadata, existing AXTP registry/generator/conformance/release structure. This plan is intentionally documentation/governance-first and does not require local code execution for G0-G3 planning work; later generator changes under G4 require their normal repository validation before merge.

**Spec:** `docs/governance/AXTP_AUTHORITY_ARCHITECTURE_AND_REPOSITORY_GOVERNANCE_V1.md`

## Global Constraints

- Protected release baseline: `spec/v0.15.0`.
- Wire semantics MUST remain unchanged by G0-G5 governance migration.
- Existing runtime bindings to `spec/v0.15.0` MUST remain valid.
- No stable methodId, eventId, errorCode, capabilityId, fieldId, bitOffset meaning, Standard Frame layout, CONTROL semantics, RPC envelope semantics or STREAM header semantics may change inside this program.
- `workspace/**` is backstage material and MUST converge to non-contract authority classes only.
- Generated outputs MUST never be manually edited as independent protocol truth.
- If a task discovers a required protocol behavior change, classify it `PROTOCOL-SEMANTIC`, stop that subtask, record it, and defer it to a separate protocol amendment/release.
- Every Gate closes with the five drift reviews: Authority, Semantic Duplication, Derivation, Verification, Release/Consumer.
- Every Gate records one exit decision: `PASS` or `BLOCKED`.

---

## File Structure

The migration uses these governance artifacts:

- `docs/governance/AXTP_AUTHORITY_ARCHITECTURE_AND_REPOSITORY_GOVERNANCE_V1.md` — current governance authority and G0-G5 review procedure.
- `docs/governance/reviews/G0-baseline.md` — protected baseline, inventory, invariants and initial finding register.
- `docs/governance/reviews/G1-authority-boundary.md` — shadow-authority findings and migration decisions.
- `docs/governance/reviews/G2-spec-identity.md` — version inventory and canonical naming decisions.
- `docs/governance/reviews/G3-rule-verification.md` — normative Rule ID model and coverage decisions.
- `docs/governance/reviews/G4-derivation-golden-vectors.md` — derivation audit and test-vector remediation design.
- `docs/governance/reviews/G5-information-architecture-consumer.md` — repository information architecture and downstream evidence design.
- `docs/governance/findings.yaml` — machine-readable finding register spanning all Gates.
- Existing files are changed only when the relevant Gate explicitly authorizes their migration.

The target source layout should be introduced incrementally; do not mass-move files before G1/G5 reviews prove the mapping.

---

### Task 1: Establish G0 Governance Baseline

**Files:**
- Create: `docs/governance/reviews/G0-baseline.md`
- Create: `docs/governance/findings.yaml`
- Reference: `docs/governance/AXTP_AUTHORITY_ARCHITECTURE_AND_REPOSITORY_GOVERNANCE_V1.md`
- Reference: `README.md`
- Reference: `docs/README.md`
- Reference: `specs/10-contract.md`
- Reference: `specs/20-core.md`
- Reference: `specs/30-registry.md`
- Reference: `specs/50-tooling.md`
- Reference: `contract/registry/version.yaml`
- Reference: `contract/protocol/axtp.protocol.yaml`
- Reference: `conformance/manifest.yaml`
- Reference: `release/README.md`
- Reference: `release/AXTP_RUNTIME_UPDATE_FLOW.md`

**Interfaces:**
- Consumes: current `main`/branch baseline and released `spec/v0.15.0`.
- Produces: canonical G0 audit record and finding IDs used by all later Gates.

- [ ] **Step 1: Record exact baseline identity**

Write the branch base commit, current migration branch, latest protected release, release tag, and explicit statement that the governance program does not supersede released protocol semantics.

- [ ] **Step 2: Inventory authority surfaces**

Classify at minimum `workspace/**`, `specs/**`, `contract/registry/**`, `contract/protocol/**`, `contract/generated/**`, `contract/mcp/**`, `contract/test-vectors/**`, `conformance/**`, `release/**`, `tooling/**`, `.github/**` and role/product documentation according to the v1 authority classes.

- [ ] **Step 3: Seed the finding register**

Create entries for the already-confirmed findings:

```yaml
findings:
  - id: AXTP-GOV-001
    gate: G1
    class: GOV-AMBIGUITY
    title: Workspace proposal claims runtime contract authority
    status: open
    evidence:
      - workspace/protocol/README.md
      - workspace/protocol/audio/audio.algorithm.md

  - id: AXTP-GOV-002
    gate: G2
    class: GOV-AMBIGUITY
    title: Spec and protocol version dimensions use overloaded names
    status: open
    evidence:
      - contract/registry/version.yaml
      - contract/registry/core/protocol_meta.yaml
      - release/AXTP_SPEC_VERSIONING.zh-CN.md

  - id: AXTP-GOV-003
    gate: G4
    class: DERIVATION-DEFECT
    title: Test-vector emitter hard-codes semantic vectors and bytes
    status: open
    evidence:
      - tooling/generators/src/emitters/testVectors.ts
      - contract/test-vectors/manifest.json

  - id: AXTP-GOV-004
    gate: G3
    class: VERIFICATION-GAP
    title: Normative requirements have no stable Rule ID coverage model
    status: open
    evidence:
      - specs/
      - conformance/

  - id: AXTP-GOV-005
    gate: G5
    class: GOV-STRUCTURE
    title: Backstage proposal and legacy corpus increases AI retrieval ambiguity
    status: open
    evidence:
      - workspace/

  - id: AXTP-GOV-006
    gate: G5
    class: GOV-STRUCTURE
    title: Downstream consumer adoption evidence is not closed back into AXTP
    status: open
    evidence:
      - release/AXTP_RUNTIME_UPDATE_FLOW.md
```

- [ ] **Step 4: Perform the five G0 drift reviews**

Record PASS/FIX/DEFER/BLOCKED for each review and explain why G0 itself does not modify protocol semantics.

- [ ] **Step 5: Close G0**

Set G0 to PASS only if the protected baseline and authority map are unambiguous. Commit the baseline and finding register as one reviewable governance checkpoint.

---

### Task 2: Execute G1 Authority Boundary Closure

**Files:**
- Create: `docs/governance/reviews/G1-authority-boundary.md`
- Modify: `docs/governance/findings.yaml`
- Modify as required: `workspace/protocol/README.md`
- Modify as required: `workspace/protocol/draft-conventions.md`
- Modify as required: accepted/generated proposal frontmatter under `workspace/protocol/**`
- Modify as required: `docs/README.md`
- Modify as required: `docs/guides/runtime.md`

**Interfaces:**
- Consumes: authority classes and G0 inventory.
- Produces: one-way backstage/non-contract rule and accepted-proposal linkage model.

- [ ] **Step 1: Enumerate shadow-authority patterns**

Search/document every backstage pattern that implies implementation authority, including `contract: true`, “可直接实现”, “generated” lifecycle wording used as an authority classification, or runtime-facing guidance that points directly into workspace as implementation truth.

- [ ] **Step 2: Define proposal frontmatter v2**

Adopt a non-contract model such as:

```yaml
---
authorityClass: proposal
lifecycle: accepted
protocolStability: stable
domain: audio
feature: audio.algorithm
adoptedBy:
  - contract/registry/domains/audio/domain.yaml
lastReviewed: 2026-08-26
---
```

Do not use `contract: true` in workspace after migration.

- [ ] **Step 3: Migrate accepted proposal wording**

Change accepted proposal text from “可直接实现” to wording equivalent to “已采纳；实现必须读取 adopted canonical/generated authority”. Preserve historical design rationale and open questions that remain useful.

- [ ] **Step 4: Update runtime/AI retrieval guidance**

Make runtime implementation entry points explicitly exclude `workspace/**`, `docs/superpowers/**` and `tooling/skills/**` from implementation authority.

- [ ] **Step 5: Run the five G1 drift reviews**

Pay special attention to whether any proposal still duplicates canonical schemas/method facts in a way that could be mistaken for current source.

- [ ] **Step 6: Close G1**

G1 passes only when no maintained `workspace/**` artifact claims runtime contract authority.

---

### Task 3: Execute G2 Spec Identity & Version Closure

**Files:**
- Create: `docs/governance/reviews/G2-spec-identity.md`
- Modify: `docs/governance/findings.yaml`
- Reference/modify cautiously: `contract/registry/version.yaml`
- Reference/modify cautiously: `contract/registry/core/protocol_meta.yaml`
- Modify documentation: `release/README.md`
- Modify documentation: `release/AXTP_SPEC_VERSIONING.zh-CN.md`
- Modify documentation: `specs/50-tooling.md`
- Modify documentation: `docs/guides/runtime.md`

**Interfaces:**
- Consumes: current release/version fields and compatibility rules.
- Produces: canonical names for release identity, protocol semantics generation/version, wire version, registry schema version and generator identity.

- [ ] **Step 1: Build a version-field inventory**

For every field named `version`, `specVersion`, `protocolVersion`, `registryVersion`, `schemaVersion`, `wireVersion`, runtime four-part release version and `Hello.axtpVersion`, record owner, meaning, wire impact, release impact, runtime use and deprecation constraints.

- [ ] **Step 2: Define canonical SpecIdentity mapping**

Specify exactly which current field maps to:

```text
releaseVersion
protocolSemanticsVersion / generation
standardFrameVersion
registrySchemaVersion
authoritySchemaVersion
generatorVersion
runtimeImplementationVersion
advisoryHelloVersion
```

- [ ] **Step 3: Classify aliases**

Do not delete a current machine field merely because its name is poor. Mark whether it is canonical, compatibility alias, generated projection, wire field or diagnostic field.

- [ ] **Step 4: Update explanatory docs first**

Ensure all maintainer/runtime documentation stops saying “spec version” when it actually means protocol semantics version or wire version.

- [ ] **Step 5: Decide whether source-field renames are governance-only**

If renaming a machine-readable source field changes release artifacts or runtime parsers, defer physical rename to a future protocol/tooling release and keep G2 as semantic naming closure. Do not violate the zero-runtime-impact invariant.

- [ ] **Step 6: Run the five G2 drift reviews and close G2**

G2 passes when every version dimension is unambiguous even if some legacy aliases remain for compatibility.

---

### Task 4: Execute G3 Normative Rule & Verification Closure

**Files:**
- Create: `docs/governance/reviews/G3-rule-verification.md`
- Modify: `docs/governance/findings.yaml`
- Create or define target: `contract/rules/` or equivalent machine-readable rule registry
- Modify selected normative specs: `specs/20-core.md`, `specs/30-registry.md`, relevant compatibility sections
- Modify selected cases under `conformance/cases/**`
- Modify: `conformance/manifest.yaml` if rule metadata integration requires it

**Interfaces:**
- Consumes: normative MUST/SHOULD statements and current conformance cases.
- Produces: stable Rule IDs and bidirectional Rule <-> Evidence traceability.

- [ ] **Step 1: Define Rule ID namespaces and schema**

Use stable domain-oriented IDs and fields for status, level, statement, source, since and verification disposition.

- [ ] **Step 2: Seed core Rule IDs**

Start with high-value current behaviors rather than attempting to tag every sentence at once:

```text
Standard Frame parsing boundary
OPEN/ACCEPT gating
Hello/Identify/Identified gating
advisory axtpVersion behavior
unknown method vs registered-but-not-supported
unknown optional field compatibility
unknown event handling
STREAM 16-byte header/lifecycle
endpoint-relay addressing
```

- [ ] **Step 3: Map existing conformance cases to Rule IDs**

Each migrated case records the normative rule(s) that authorize its assertions.

- [ ] **Step 4: Classify coverage**

For each seeded stable rule assign exactly one disposition: `covered`, `structural-only`, `manual-evidence`, `not-applicable`, or `uncovered` with a blocking reason.

- [ ] **Step 5: Define rule-coverage report**

Specify a machine-readable and human-readable coverage projection so future CI can fail on unexplained uncovered stable MUST rules.

- [ ] **Step 6: Run the five G3 drift reviews and close G3**

G3 passes when seeded current-core normative behavior no longer depends on prose-only discoverability.

---

### Task 5: Execute G4 Derivation & Golden Vector Closure

**Files:**
- Create: `docs/governance/reviews/G4-derivation-golden-vectors.md`
- Modify: `docs/governance/findings.yaml`
- Audit/modify: `tooling/generators/src/emitters/testVectors.ts`
- Audit all emitters under: `tooling/generators/src/emitters/**`
- Modify generated vector model under: `contract/test-vectors/**`
- Add canonical vector recipe source at a Gate-approved path
- Modify generator tests as required

**Interfaces:**
- Consumes: canonical source, Rule IDs and existing generated artifacts.
- Produces: defensible vector recipes and a source-to-bytes derivation chain.

- [ ] **Step 1: Audit every emitter for hidden protocol facts**

Record whether each emitter is a pure projection of `SpecModel` or carries independent IDs, payload shapes, bytes, compatibility assumptions or vectors.

- [ ] **Step 2: Isolate current test-vector defect**

Document that `_spec` is currently unused by the vector emitter and classify each hard-coded vector as current-core, compatibility/legacy or obsolete.

- [ ] **Step 3: Design canonical vector recipe schema**

Each recipe must identify Rule IDs, semantic input, encoding profile, expected semantic decode and expected wire digest.

- [ ] **Step 4: Preserve semantic output while changing derivation**

Where a current vector is valid, reproduce identical bytes from the new recipe/canonical encoder path. If bytes necessarily change, classify the cause before proceeding; a protocol-semantic change is out of scope.

- [ ] **Step 5: Separate legacy/non-core vectors**

Compact/HID-64/BLE/UART compatibility material must not be counted as current v1-core coverage unless the normative profile says so.

- [ ] **Step 6: Run normal generator validation before G4 closure**

Unlike G0-G3 documentation work, G4 modifies generator behavior and therefore must use the repository's existing build/test/validate/generated-drift checks before merge.

- [ ] **Step 7: Run the five G4 drift reviews and close G4**

G4 passes only when generated-vector authority is genuinely derived.

---

### Task 6: Execute G5 Information Architecture & Consumer Closure

**Files:**
- Create: `docs/governance/reviews/G5-information-architecture-consumer.md`
- Modify: `docs/governance/findings.yaml`
- Modify as approved: `workspace/**`
- Modify as approved: `contract/registry/domains/**`
- Modify as approved: `docs/product/**`
- Modify: `.github/CODEOWNERS`
- Add future consumer evidence schema/path at a Gate-approved location
- Add security-authority follow-up record without changing current protocol semantics

**Interfaces:**
- Consumes: G1 authority boundaries, G2 identity, G3 rule model, G4 derivation model.
- Produces: lower-noise repository information architecture and downstream evidence closure design.

- [ ] **Step 1: Define frontstage retrieval set**

List the smallest file/path set an implementation agent needs for runtime work. Everything else must be explicitly backstage, historical, generated support or operational tooling.

- [ ] **Step 2: Reduce proposal surface area**

For high-value accepted proposals, identify duplicated canonical method/schema/error/example material that can be replaced by generated links while preserving decision rationale and semantic deltas.

- [ ] **Step 3: Plan feature-level canonical registry decomposition**

Create a no-semantic-change mapping from large `domain.yaml` authoring units into feature-level source units while preserving generated aggregate behavior and stable IDs.

- [ ] **Step 4: Define ownership matrix**

Separate review responsibility at minimum for core/wire, business domains, verification, security and release/tooling instead of relying solely on one catch-all maintainer ownership line.

- [ ] **Step 5: Define downstream consumer evidence model**

Specify evidence fields for consumer repository, Spec lock, implementation version, commit/run identity, declared profiles and conformance status. AXTP must only record PASS when backed by external evidence.

- [ ] **Step 6: Record security-authority follow-up**

Create a future work item for threat model/authentication/authorization/replay/downgrade/OTA/relay trust boundaries. Do not introduce new security wire semantics inside G5.

- [ ] **Step 7: Run the five G5 drift reviews and close G5**

G5 passes when the current authority surface is compact, retrieval-safe and ready for AI/human parallel work.

---

### Task 7: Final Governance Closure Review

**Files:**
- Modify: `docs/governance/findings.yaml`
- Create: `docs/governance/reviews/G0-G5-final-closure.md`
- Reference all G0-G5 review records

**Interfaces:**
- Consumes: all Gate outputs.
- Produces: final statement of whether AXTP Authority Governance v1 migration is complete.

- [ ] **Step 1: Verify all P0/P1 findings have disposition**

No P0/P1 item may silently remain open. Each must be `closed`, `deferred` with explicit owner/reason, or `blocked-protocol-semantic`.

- [ ] **Step 2: Verify protected invariants**

Explicitly confirm:

```text
wire semantic impact = NONE
spec/v0.15.0 mutation = NONE
required runtime behavior migration caused by governance = NONE
stable identifier renumbering = NONE
```

- [ ] **Step 3: Review supersession and navigation**

Ensure old governance/process explanations point to the current authority rather than creating multiple live governance definitions.

- [ ] **Step 4: Produce final authority map**

Summarize the final paths for evidence, proposal, canonical source, normative spec, derived contract, verification, release and operational tooling.

- [ ] **Step 5: Close the program**

Mark the governance version Current and record any future protocol-semantic work as separate projects rather than unfinished G0-G5 cleanup.

---

## Review Cadence

Each Gate should be reviewed and committed independently. Do not combine G1-G5 into one opaque repository rewrite. The intended sequence is:

```text
G0 baseline
  -> review
G1 authority boundary
  -> review
G2 identity/version
  -> review
G3 rule/verification
  -> review
G4 derivation/vectors
  -> full generator validation + review
G5 information architecture/consumer evidence
  -> review
Final closure
```

This preserves a reversible migration history and makes every authority change attributable to a specific finding and Gate.

# AXTP G1 — Authority Boundary Closure

Status: **IN PROGRESS**  
Prerequisite: G0 PASS  
Primary findings: `AXTP-GOV-001`, `AXTP-GOV-011`

## 1. Objective

G1 removes shadow authority without changing protocol semantics.

The desired invariant is:

```text
workspace/** = evidence | intent | proposal
workspace/** != runtime contract
```

An accepted proposal may explain why a canonical fact exists and may point to the adopted registry/generated authority, but it does not become that authority.

## 2. Current contradiction confirmed

The current workspace protocol intake correctly says `workspace/protocol/**` contains maintainer proposals rather than the runtime implementation contract. However its current authority table allows an exception equivalent to:

```text
workspace/protocol/<domain>/<domain.feature>.md
  -> not contract unless adopted and generated refreshed
```

and its frontmatter model permits:

```yaml
contract: false | true
generated: false | true
```

This creates two incompatible interpretations of the same path class.

The contradiction is not theoretical. Repository search at the protected baseline found **21 active `workspace/protocol/**` files containing `contract: true`**. Examples include:

- `workspace/protocol/audio/audio.algorithm.md`
- `workspace/protocol/audio/audio.stream.md`
- `workspace/protocol/device/device.info.md`
- `workspace/protocol/device/device.enrollment.md`
- `workspace/protocol/firmware/firmware.update.md`
- `workspace/protocol/network/network.interface.md`
- `workspace/protocol/network/network.ip.md`
- `workspace/protocol/network/network.wifi.md`
- `workspace/protocol/network/network.ap.md`
- `workspace/protocol/video/video.stream.md`
- `workspace/protocol/stream/stream.flowControl.md`
- `workspace/protocol/signage/signage.playlist.md`
- `workspace/protocol/software/software.config.md`
- `workspace/protocol/software/software.updatePolicy.md`
- multiple accepted `cast.*` proposals

An archived audit also contains the same phrase, but archive material is historical evidence rather than an active workspace authority problem.

## 3. G1 target metadata model

All maintained `workspace/protocol/**` proposal frontmatter must converge to this semantic model:

```yaml
---
authorityClass: proposal
lifecycle: captured | reviewing | accepted | superseded | archived
protocolStability: draft | experimental | stable | deprecated | reserved
domain: <domain>
feature: <domain.feature>
adoptedBy:
  - <canonical registry/source path, when accepted>
lastReviewed: YYYY-MM-DD
---
```

### Rules

1. `authorityClass` is always `proposal` inside `workspace/protocol/**`.
2. `lifecycle: accepted` means the decision was adopted elsewhere; it does not make the proposal a contract.
3. `protocolStability` describes the adopted protocol fact, not the proposal's authority level.
4. `adoptedBy` must point to the canonical source or stable authority target when known.
5. `contract: true` is prohibited after G1 closure.
6. `generated: true` is prohibited as an authority-class signal. Where useful, it may be replaced by adoption/projection links.
7. Wording such as “是否可直接实现：是” must be replaced by wording equivalent to “已采纳；实现读取 canonical/generated authority”.

## 4. Retrieval rule

After G1 closure, runtime/SDK/firmware implementation agents must treat these paths as non-contract regardless of proposal lifecycle:

```text
workspace/business/**
workspace/flows/**
workspace/protocol/**
workspace/legacy-*/**
workspace/registry-planning/**
workspace/runtime/**
docs/superpowers/**
tooling/skills/**
```

These locations may be read for design rationale, historical evidence, migration context or protocol-authoring tasks only.

## 5. Migration strategy

G1 uses a two-step migration rather than silently redefining old metadata:

### G1-A — Governance boundary first

- update the workspace protocol conventions so path classification is absolute;
- define proposal frontmatter v2;
- update runtime/AI guidance to reject workspace as implementation authority;
- add explicit migration note that legacy `contract:true` metadata is deprecated and invalid under governance v1.

### G1-B — Per-proposal metadata normalization

For each active `contract:true` proposal:

- preserve the document body and historical rationale;
- replace authority metadata with proposal v2 metadata;
- map existing generated/accepted state to `lifecycle: accepted` when canonical adoption is demonstrable;
- add `adoptedBy` canonical source link;
- replace direct-implementation wording;
- do not edit method IDs, event IDs, schemas, examples or protocol semantics in this Gate.

## 6. Defect classification

| Finding | Class | Disposition |
|---|---|---|
| AXTP-GOV-001 | GOV-AMBIGUITY | FIX-IN-GATE |
| AXTP-GOV-011 | GOV-AMBIGUITY | FIX-IN-GATE |
| duplicated proposal payload/reference material discovered during migration | GOV-STRUCTURE | DEFER to G5 unless required to remove authority ambiguity |
| any canonical-vs-proposal semantic mismatch | DOC-DRIFT or PROTOCOL-SEMANTIC after review | do not silently resolve in G1 |

## 7. Five drift reviews — current state

### Authority drift

**FIX-IN-GATE.** 21 active workspace proposal files still contain `contract: true` at the protected baseline.

### Semantic duplication

**DEFER-WITH-OWNER (G5).** G1 changes classification, not the full proposal corpus shape.

### Derivation drift

**PASS FOR G1 SCOPE.** No generator source/output change is required to define the authority boundary.

### Verification drift

**PASS FOR G1 SCOPE.** G1 does not modify conformance expectations.

### Release / consumer drift

**PASS FOR G1 SCOPE.** No release tag, release artifact, runtime lock or wire fact changes.

## 8. Semantic impact check

```text
Wire semantic impact = NONE
spec/v0.15.0 mutation = NONE
Runtime behavior change = NONE
Stable identifier change = NONE
```

## 9. Exit blockers

G1 MUST NOT be marked PASS until:

- all maintained `workspace/protocol/**` files no longer claim `contract: true`;
- generated/accepted proposal wording no longer says the proposal itself is directly implementable;
- lifecycle and protocol stability are distinct;
- accepted proposals link to canonical adoption targets;
- runtime/AI retrieval guidance treats workspace as non-contract with no exception.

## 10. Current decision

**IN PROGRESS**

The design and migration set are now fixed. The remaining work is mechanical metadata normalization across the identified active proposals plus the central convention/runtime guidance updates. No protocol-semantic decision is required for that normalization.

# AXTP Runtime Boundary Audit v0.1

Status: **A1 Audit Record — runtime changes intentionally out of scope**  
Authority: `AXTP Core Framing Authority v0.1`  
Sampled implementations: `Mostorm-Labs/axtp-cpp-runtime` and `Mostorm-Labs/axtp-ts-runtime` at their current `spec/v0.15.0`-bound main baselines.

> This is an audit report, not an implementation plan. It MUST NOT be used as authorization to change a runtime merely because its current behavior differs from A1. Existing runtimes are in use and remain bound to their explicitly selected published AXTP contract until they opt into a future A1-containing release.

## 1. Purpose

A1 used runtime repositories as evidence because P22 needed to determine whether missing protocol authority had produced real implementation drift. That inspection does not make runtime code part of AXTP authority.

The intended ownership model is:

```text
AXTP repository
  owns protocol meaning, wire compatibility, registries,
  machine contracts, conformance and publication authority

Runtime repositories
  consume a published AXTP contract
  and own implementation strategy inside that contract
```

A runtime repository is therefore not edited as a side effect of protocol review.

## 2. Audit classification

Each observed runtime difference is classified into one of three buckets:

- **PROTOCOL-OWNED** — future adoption of A1 may require migration because the behavior affects wire meaning or peer compatibility.
- **RUNTIME-OWNED** — different implementations may legitimately choose different local values/algorithms.
- **EVIDENCE-ONLY** — current implementation behavior corroborates a design choice but is not itself a migration requirement.

None of the classifications below retroactively change conformance to `spec/v0.15.0`.

## 3. C++ / TS sampled audit

| Area | C++ implementation reality | TS implementation reality | A1 ownership | Audit result |
|---|---|---|---|---|
| Reassembly lookup | keyed primarily by `messageId` | keyed primarily by `messageId` | PROTOCOL-OWNED | Future A1 contract uses link + source + destination + MessageId context; record as future adoption delta only. |
| Complete-message delivery | dispatch after all fragments | dispatch after all fragments | PROTOCOL-OWNED | Compatible evidence; no action now. |
| Out-of-order fragments | accepted by index slots | accepted by index slots | PROTOCOL-OWNED outcome | Compatible evidence; no action now. |
| Duplicate index | silently ignored | silently ignored | PROTOCOL-OWNED for identical/conflicting distinction | Future A1 must distinguish identical vs conflicting duplicate; audit only. |
| Reassembly timeout | no timeout in reassembler component | default 10s | RUNTIME-OWNED duration | Different values/absence are not a protocol defect by themselves. A1 only standardizes timeout diagnostic meaning if a timeout policy exists. |
| Concurrent reassembly cap | no explicit cap in sampled component | 256 contexts | RUNTIME-OWNED numeric cap | A1 requires bounded resource use, not the same numeric cap. C++ is a future adoption risk to audit, not an immediate change order. |
| Reassembled byte cap | default 1 MiB | default 1 MiB | RUNTIME-OWNED numeric cap | Same value is implementation convergence, not authority. |
| >255 fragment handling | sampled path can narrow/cast count without explicit guard | explicit local rejection | PROTOCOL-OWNED | A1 requires local rejection before emitting invalid FrameCount; future adoption delta for C++. |
| MessageId allocator | monotonic, skips zero, wraps | monotonic, skips zero, wraps | RUNTIME-OWNED allocator | A1 does not standardize this sequence and does not reserve zero. No migration needed merely to choose another allocator. |
| Inbound maxFrame check | sampled decoder does not enforce configured max at same boundary | sampled decoder checks max | PROTOCOL-OWNED effective ceiling | Future A1 adoption must enforce the accepted effective frame ceiling somewhere before dispatch; exact module placement is runtime-owned. |
| ACCEPT heartbeat omission | sampled SDK heartbeat path depends on accepted interval being present | control/session path falls back to local OPEN parameter | PROTOCOL-OWNED fallback | A1 defines OPEN baseline + optional ACCEPT override. Record future adoption delta; do not patch current C++. |
| Heartbeat scheduler | explicit/probe-oriented SDK behavior | endpoint timer orchestration | RUNTIME-OWNED | Both models are allowed under A1 Core if HEARTBEAT/ACK wire behavior is correct. |
| Heartbeat timeout formula | caller/local timeout | endpoint-specific formula | RUNTIME-OWNED | No cross-language numeric convergence required by Core. |
| Parser resync | scans magic and retries from later bytes | similar magic scan/resync | PROTOCOL safety outcome / implementation detail | Useful evidence. A1 standardizes no invalid dispatch and recoverability semantics, not identical buffer code. |
| Frame diagnostics | several paths are silent | more typed local error emission | RUNTIME-OWNED API; protocol-owned classification if exposed | Diagnostic API shape may differ. No peer-facing frame error carrier is required by A1 Core. |
| Reconnect/backoff | SDK-specific | coordinator-specific | RUNTIME-OWNED | Explicitly outside Core Framing authority. |

## 4. What this audit does not authorize

This audit does not authorize:

- changing any C++ runtime source file;
- changing any TS runtime source file;
- changing Python, C, Flutter, mock-server, firmware, or product integration repositories;
- changing any runtime `AXTP_SPEC.lock.yaml`;
- opening runtime migration pull requests;
- releasing a new runtime version;
- calling an existing runtime defective merely because A1 chose a different future contract.

Any such work requires a separate explicit runtime-adoption decision after an A1-containing AXTP release exists.

## 5. Future adoption rule

A runtime migration is triggered only by an explicit event such as:

```text
runtime chooses new AXTP release
  -> update exact AXTP spec/artifact lock
  -> compare runtime against that published contract
  -> classify only protocol-owned deltas
  -> keep runtime-owned choices intact
  -> run the conformance profile required by that runtime
```

This keeps AXTP evolution and deployed-runtime maintenance decoupled.

## 6. Boundary examples

### Example A — MessageId allocator

Two runtimes may legally allocate:

```text
Runtime A: 1,2,3,...,65535,1,...
Runtime B: random/nonzero sequence
Runtime C: includes 0
```

A1 only requires that an active fragmented context is not collided with on the same wire uniqueness scope. The allocator algorithm is not interoperability authority.

### Example B — Reassembly timeout

One constrained device may expire incomplete reassembly after a short local duration; a desktop runtime may use a longer duration. A1 does not force equality. If either runtime classifies an expiry as a frame timeout, the semantic label is `FRAME_REASSEMBLY_TIMEOUT`, and neither may dispatch a partial payload.

### Example C — heartbeat

A TS runtime may run an endpoint heartbeat timer continuously; a C++ product may call an explicit probe from a product scheduler. A1 only requires correct HEARTBEAT/HEARTBEAT_ACK wire behavior and deterministic OPEN/ACCEPT interval resolution. Core does not require the schedulers to look alike.

### Example D — effective maxFrameSize

This is not merely local policy. Once OPEN/ACCEPT establishes an effective frame ceiling, a runtime cannot silently choose a smaller peer-visible receive ceiling after accepting the link. If a future adopted A1 runtime cannot honor the proposed OPEN value, the protocol-level action is override or reject during negotiation.

## 7. Audit status

```text
Runtime repositories modified: NO
Runtime locks modified: NO
Runtime PRs created: NO
Runtime releases created: NO

C++/TS implementation evidence: RECORDED
A1 protocol/runtime ownership boundary: EXPLICIT
Future migration decisions: DEFERRED until explicit runtime adoption
```

This audit remains evidence attached to A1 authority. It is not runtime execution authority.

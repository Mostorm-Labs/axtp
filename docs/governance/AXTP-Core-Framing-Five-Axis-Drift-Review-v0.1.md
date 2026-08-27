# AXTP Core Framing Five-Axis Drift Review v0.1

Status: **A1 / P22 Review Record — BLOCKED_AUTHORITY**  
Branch: `aegis/a1-core-framing-authority-review`  
Dependency: A1 / P21 `AXTP Core Framing Authority Review v0.1`  
Scope: the twelve P21 Core Framing findings across Product, Semantic, Architecture, Implementation, and Verification drift.

> This document is a P22 drift review record. It does not create the replacement Core Framing contract. It classifies where drift occurred, what historical behavior is safe to consider again, what must be re-decided explicitly, and which layer owns each repair.

## 1. Role

Aegis stage: `P22 Five-Axis Drift Review`.

P21 established that Core Framing is `BLOCKED_AUTHORITY` primarily because required semantics are missing rather than because two Current Authorities directly disagree. P22 now determines how that authority gap propagated into runtime implementations, machine projections, tests, and maintainer guidance.

The five axes are:

1. **Product Drift** — the user/product value or requirement changed.
2. **Semantic Drift** — the meaning of protocol state, fields, operations, errors, or lifecycle changed or became ambiguous.
3. **Architecture Drift** — ownership or dependency boundaries moved or became inconsistent.
4. **Implementation Drift** — runtime repositories made implementation-specific choices where authority was absent or differ from current authority.
5. **Verification Drift** — tests/oracles prove incomplete, stale, or implementation-specific behavior.

## 2. Authority and implementation baselines

### 2.1 Current authority baseline

P22 inherits the P21 source hierarchy and does not reopen its trusted framing facts.

Relevant current maintenance authority:

- `docs/governance/AXTP-Contract-Authority-Model-v0.1.md`
- `specs/10-contract.md`
- `specs/20-core.md`
- `specs/40-codec.md`
- `contract/registry/core/protocol_meta.yaml`
- `contract/registry/schema/control_schema.yaml`
- `contract/registry/error/error_code.yaml`

A0 remains authoritative for CONTROL ACCEPT presence semantics: ACCEPT TLVs are optional and absence means no ACCEPT-level override; absence alone is not a protocol error.

### 2.2 Historical/reference baseline

P21 already classified the old Frame/Payload and CONTROL Session documents as **Superseded/Historical**, and `workspace/runtime/core-protocol-flow.md` as maintainer/reference material rather than protocol authority.

P22 uses those materials only to identify candidate intent. Historical rules are not restored merely because a runtime copied them.

### 2.3 Runtime implementation reality sampled by P22

Two independent language runtimes are sufficient to prove that missing authority has already produced implementation drift:

| Runtime | Baseline | Bound AXTP spec |
|---|---|---|
| `Mostorm-Labs/axtp-cpp-runtime` | `main@598691614abbf6c9d0ceb622b1bc9361a1e16e04` | `spec/v0.15.0` / `1bf9e89ede12470e20733d4cea4e50edad989528` |
| `Mostorm-Labs/axtp-ts-runtime` | `main@e6ba1859b557c03b1f50239c11483de0b1cee49e` | `spec/v0.15.0` / `1bf9e89ede12470e20733d4cea4e50edad989528` |

Both runtimes therefore made their current framing choices while nominally consuming the same published protocol baseline.

Important qualification: A0 is not yet a published release. A runtime behavior that differs from A0 is therefore recorded as a **downstream migration requirement** unless it also violates `spec/v0.15.0`. P22 does not retroactively declare a runtime non-conformant to authority it has not yet bound.

## 3. Product Drift assessment

**Finding: no material Product Drift was found for A1.**

The product-level need remains stable:

- one deterministic Standard Framed contract across TCP and USB-HID;
- independent language runtimes must interoperate without private framing conventions;
- corrupt/incomplete input must fail safely and predictably;
- constrained hardware implementations must be able to keep CONTROL lightweight;
- framing must remain independent from business methods and STREAM business semantics.

A0's ACCEPT simplification is not a new A1 product requirement; it is an upstream authority change that A1 must respect when defining effective link limits and heartbeat defaults.

Therefore the primary A1 drift is **Semantic + Architecture + Implementation + Verification**, not Product.

## 4. Cross-runtime implementation evidence

Before classifying each P21 finding, P22 records several concrete differences.

### 4.1 Reassembly

C++ runtime `MessageReassembler` currently:

- keys assemblies only by `messageId`;
- records `payloadType` and `frameCount` as consistency checks;
- accepts out-of-order arrival because fragments are stored by `frameIndex`;
- silently ignores duplicate indexes;
- deletes an assembly on inconsistent payload type/frame count;
- uses a default 1 MiB assembled-message cap;
- has no normative timer/expiry mechanism in the reassembler;
- has no concurrent-assembly cap in that component;
- does not emit the stable frame error codes from these rejection paths.

TS runtime `MessageReassembler` currently:

- also keys assemblies only by `messageId`;
- also accepts out-of-order arrival and silently ignores duplicate indexes;
- uses a default 1 MiB assembled-message cap;
- adds a 10 second assembly timeout;
- adds a 256 pending-assembly cap;
- maps timeout to `FRAME_REASSEMBLY_TIMEOUT`;
- maps pending-context exhaustion to `FRAME_FRAGMENT_MISSING`;
- maps aggregate-message oversize to `FRAME_TOO_LARGE`.

Those extra TS behaviors are not defined by current Core Framing authority. Their existence proves implementation-specific policy has leaked into protocol-observable outcomes.

### 4.2 Frame size and parser

TS `FrameDecoder` applies `PayloadLength + 14 <= maxFrameSize` before CRC validation and emits typed local errors. C++ `FrameDecoder` currently validates version, payload type, fragment ranges and CRC, but does not apply a configured `maxFrameSize` check at the decoder boundary.

Both implementations use a similar byte-stream recovery strategy: scan for `AX`; after a candidate header or CRC failure, consume one byte and resume scanning. That convergence is useful evidence, but it is still not Current Authority.

### 4.3 Fragment count and MessageId

Both runtimes allocate outbound `MessageId` monotonically starting from 1 and wrap back to 1, effectively reserving zero in practice even though Current Authority does not reserve zero.

TS explicitly rejects a logical message that would require more than 255 fragments. C++ computes fragment count and casts it to `uint8_t` without an explicit >255 guard, so oversized fragmentation can wrap instead of failing deterministically.

### 4.4 Heartbeat

TS endpoint runtime starts heartbeat after link-ready on either physical role. It sends fixed-period probes and uses `timeout = max(2 * interval, 10000ms)`; HEARTBEAT_ACK resets the timeout, while ordinary decoded traffic does not. Timeout force-closes the endpoint and rejects pending RPC/stream work.

C++ exposes a synchronous `heartbeat(timeout)` SDK operation. It requires an accepted heartbeat interval to be present and otherwise returns `NotSupported`; it does not itself define the same continuously scheduled liveness policy as TS.

A0 now states that an omitted ACCEPT `heartbeatIntervalMs` does not remove the already-applicable local/profile default. Therefore the C++ behavior is a known downstream A0 migration point, while the TS fallback model is closer to the A0 presence rule. Neither runtime's timeout formula or initiator policy becomes authority through implementation precedence.

## 5. Twelve-finding five-axis matrix

Legend for historical disposition:

- **RE-ADOPT CANDIDATE** — historical intent is compatible with current trusted facts and may be carried into the new authority after explicit P23 approval.
- **RE-ADOPT WITH NEW BOUNDS** — the historical principle is useful, but A1 must add missing deterministic constraints.
- **RE-DECIDE** — history/current implementations contain insufficient or competing choices; P23 must make a new explicit decision.
- **REPAIR ONLY** — no protocol semantic choice is required; the affected machine/test artifact must be repaired after authority is known.

| P21 finding | Product | Semantic | Architecture | Implementation | Verification | Historical disposition | Correct repair layer |
|---|---|---|---|---|---|---|---|
| F01 Reassembly state machine | none | **high** | **high** | **high** | **high** | RE-ADOPT WITH NEW BOUNDS | P23 authority + P20 oracle + runtimes |
| F02 Missing vs timeout error distinction | none | **high** | medium | **high** | **high** | RE-DECIDE | P23 error semantics + P20 cases |
| F03 MessageId lifecycle | none | **high** | medium | **high** | high | RE-DECIDE | P23 authority + frame vectors |
| F04 Effective maxFrameSize | none | **high** | **high** | **high** | high | RE-DECIDE | P23 authority; preserve A0 |
| F05 Heartbeat/liveness | none | **high** | **high** | **high** | **high** | RE-DECIDE | P23 authority + P20 time oracle |
| F06 Parser recovery/resync | none | medium | **high** | **high** | **high** | RE-ADOPT WITH NEW BOUNDS | P23 parser contract + raw-byte oracle |
| F07 Frame error disposition | none | **high** | **high** | **high** | **high** | RE-DECIDE | P23 disposition matrix + P20 cases |
| F08 Resource/budget limits | none | medium | high | **high** | high | RE-ADOPT WITH NEW BOUNDS | P23 min behavior + profile/local caps |
| F09 Machine-readable frame contract | none | medium | **high** | medium | **high** | REPAIR ONLY | machine schema/generator after P23 |
| F10 Framed conformance coverage | none | low | medium | medium | **high** | REPAIR ONLY | P20 + conformance manifest/cases |
| F11 Conformance DSL | none | low | medium | low | **high** | REPAIR ONLY | P20 verification design/tooling |
| F12 Hardcoded test vectors | none | low | low | medium | **high** | REPAIR ONLY | generator/test-vector repair |

## 6. Finding-by-finding drift analysis

### P22-F01 — Fragment reassembly drift

Source: P21-F01.

**Semantic Drift**

The active schema gives `MessageId`, `FrameIndex`, and `FrameCount`, but the meaning of a reassembly context is incomplete. In particular, `messageId` alone is not sufficient to define whether two frames from different source/destination directions or payload classes may collide.

**Architecture Drift**

P21 says fragmentation belongs to Frame layer, yet reassembly policy now lives as language-specific runtime logic instead of a shared machine contract. Upper layers therefore depend on behavior that is not encoded in Protocol IR.

**Implementation Drift**

C++ and TS share the historical `messageId`-keyed approach but differ on timeout, concurrent context limits, and error reporting. Those differences are observable under loss/adversarial input.

**Verification Drift**

No required raw-frame case proves the reassembly key, out-of-order behavior, duplicate semantics, conflict semantics, or partial-dispatch prohibition.

**Historical disposition: RE-ADOPT WITH NEW BOUNDS.**

The following historical principles are compatible and strong candidates:

- all fragments of one logical message carry one MessageId;
- fragment indexes define logical ordering;
- upper payload parsers receive the complete reassembled payload, not arbitrary partial fragments;
- invalid/incomplete reassembly must be bounded in memory.

The following must still be explicitly decided:

- exact reassembly key;
- allowed interleaving;
- duplicate identical vs duplicate conflicting fragment behavior;
- invariant header fields across fragments;
- active-ID collision handling;
- timeout/cleanup behavior.

### P22-F02 — `FRAME_FRAGMENT_MISSING` vs `FRAME_REASSEMBLY_TIMEOUT`

Source: P21-F02.

**Semantic Drift**

Two stable error identifiers exist without two stable triggering semantics. TS currently uses `FRAME_FRAGMENT_MISSING` for pending-context exhaustion, which is not obviously equivalent to a missing fragment. C++ emits neither from the reassembler.

**Architecture Drift**

Error registry identity was frozen before the lifecycle state machine that would own those errors was frozen.

**Implementation Drift**

The same invalid/incomplete framing condition can become silence, `FRAME_FRAGMENT_MISSING`, `FRAME_REASSEMBLY_TIMEOUT`, or another local failure depending on runtime.

**Verification Drift**

No oracle distinguishes the errors.

**Historical disposition: RE-DECIDE.**

P23 must either:

1. define distinct observable conditions for both errors; or
2. narrow/deprecate one error if the wire/state machine cannot deterministically distinguish it.

A1 must not invent a fake distinction merely to preserve two existing names.

### P22-F03 — MessageId lifecycle drift

Source: P21-F03.

**Semantic Drift**

MessageId is currently described as frame/message association, but its uniqueness domain and reuse window are undefined.

**Implementation Drift**

C++ and TS both choose `1..65535` and skip zero, but that convention is not Current Authority. C++ and TS reassembly both key only by MessageId, so an active collision can destroy or merge state depending on header compatibility.

TS rejects >255-fragment messages; C++ lacks the equivalent explicit guard.

**Verification Drift**

There are no wrap/collision vectors.

**Historical disposition: RE-DECIDE.**

The existing monotonic `1..65535` allocator is a useful implementation example, not a reason to make monotonic allocation normative. P23 should specify only the interoperability properties actually required: active uniqueness scope, collision handling, and legal reuse/wrap behavior.

### P22-F04 — Effective maxFrameSize drift

Source: P21-F04.

**Semantic Drift**

A0 intentionally made ACCEPT fields optional, but the framing contract still speaks as if one negotiated maximum exists. Directionality and fallback are not explicit.

**Architecture Drift**

The value crosses CONTROL negotiation, transport/profile defaults, outbound fragmentation, and inbound parser allocation. Ownership is therefore cross-layer and must be specified once.

**Implementation Drift**

TS treats local `maxFrameSize` as a fallback when ACCEPT omits the field and enforces its configured max in the decoder. C++ outbound fragmentation uses a configured preferred frame size, while its current decoder does not enforce the same limit. C++ heartbeat/control state also retains less fallback state from OPEN than TS.

**Verification Drift**

No case proves asymmetric peer limits, omitted ACCEPT override, local-smaller transmit choice, or oversized inbound rejection.

**Historical disposition: RE-DECIDE.**

The old “return negotiated max in ACCEPT” model cannot simply be restored because it would weaken A0. P23 must define directional receive/transmit ceilings with a deterministic fallback rule compatible with an empty ACCEPT body.

### P22-F05 — Heartbeat/liveness drift

Source: P21-F05.

**Semantic Drift**

HEARTBEAT/ACK existence is stable, but the liveness state machine is not.

**Architecture Drift**

Liveness spans CONTROL semantics, endpoint scheduling, transport teardown, pending RPC, STREAM, reassembly cleanup, and reconnect ownership. TS currently owns scheduling at Endpoint; C++ exposes probe mechanics in SDK/Core. Neither layer choice is yet contractual.

**Implementation Drift**

TS chooses bidirectional endpoint scheduling plus `max(2x interval, 10s)` timeout and ACK-only timeout reset. C++ exposes explicit heartbeat calls and requires an ACCEPT-advertised interval. Maintainer guidance suggests another policy: bidirectional probes and three missed ACKs.

These are three different policies around one under-specified contract.

**Verification Drift**

Current heartbeat conformance proves only one request/ACK controlId match and no time behavior.

**Historical disposition: RE-DECIDE.**

The only safe carry-forward principles are:

- framed links have a liveness mechanism based on HEARTBEAT/HEARTBEAT_ACK;
- ACK echoes the request controlId;
- WebSocket JSON owns keepalive outside CONTROL.

Initiator, timer formula, activity refresh, timeout transition, cleanup, and reconnect behavior all require an explicit P23 decision.

### P22-F06 — Parser recovery/resynchronization drift

Source: P21-F06.

**Semantic Drift**

The active contract says TCP SHOULD scan for magic but does not define when a candidate frame is trusted or abandoned.

**Architecture Drift**

Recovery belongs to the byte-stream/frame decoder boundary; it must not depend on RPC/CONTROL/business semantics.

**Implementation Drift**

C++ and TS independently converge on a similar algorithm: scan for `AX`, keep a trailing `A`, and after candidate header/CRC failure consume one byte and rescan. This is useful corroborating implementation evidence.

However neither runtime proves bounded false-candidate behavior when `AX` appears inside corrupt payload, and neither implementation can elevate its local loop to authority.

**Verification Drift**

No byte-chunk corpus tests split magic/header/payload/CRC boundaries or recovery after corruption.

**Historical disposition: RE-ADOPT WITH NEW BOUNDS.**

P23 may carry forward the historical/current principle “byte-stream transports resynchronize by scanning magic; packet transports still validate complete AXTP framing,” but must explicitly define candidate commit/discard behavior and a close/fail-safe bound.

### P22-F07 — Frame error disposition drift

Source: P21-F07.

**Semantic Drift**

Error identifiers are stable, but whether they are local diagnostics or peer-visible protocol outcomes is undefined.

**Architecture Drift**

Bad magic/CRC may leave no trustworthy CONTROL/RPC context, while a valid frame carrying malformed CONTROL can still support a CONTROL response. The frame layer and payload layer therefore need separate error-carrier rules.

**Implementation Drift**

TS exposes frame decoder errors locally through `AxtpError`; C++ frame decoder currently resynchronizes silently for several frame failures. Reassembly error behavior also differs.

**Verification Drift**

Tests cannot currently assert `drop frame`, `drop assembly`, `close link`, `local diagnostic`, or `send response` as separate outcomes.

**Historical disposition: RE-DECIDE.**

A1 should strongly prefer a disposition matrix over a universal “send ErrorCode” rule. P23 must decide outcome class per failure while keeping ACK/NACK optional.

### P22-F08 — Resource/budget drift

Source: P21-F08.

**Semantic Drift**

The protocol requires bounded memory but does not distinguish an interoperable wire maximum from implementation-local resource policy.

**Architecture Drift**

Resource policy touches parser allocation, reassembly, profile constraints and error disposition; it must be split into protocol minimum guarantees vs local defensive caps.

**Implementation Drift**

Both C++ and TS default to 1 MiB max assembled message. TS additionally caps pending assemblies at 256 and expires them after 10s; C++ does not. These values therefore cannot be assumed portable.

**Verification Drift**

No resource-exhaustion corpus proves safe failure and session/link liveness.

**Historical disposition: RE-ADOPT WITH NEW BOUNDS.**

Re-adopt the principle that implementations MUST bound frame/reassembly memory. Re-decide which values are wire/profile contract, which are implementation-local, and what interoperable failure class applies when a local cap is hit.

### P22-F09 — Machine-readable frame contract drift

Source: P21-F09.

**Architecture Drift**

AXTP's maintenance architecture intends machine contract generation to prevent language drift, but the current `FrameProfile` model does not carry enough frame facts to do that. Human spec semantics are therefore not projected into a machine authority usable by all runtimes.

**Implementation Drift**

Each runtime has hand-maintained frame codec constants and policies. That is exactly the duplication the contract center is intended to eliminate.

**Verification Drift**

Generator validation cannot detect a runtime-oriented framing contract drift because the source model lacks the facts.

**Historical disposition: REPAIR ONLY.**

P23 first freezes framing semantics; then the machine source/model/generator must represent the stable portions. Runtime-specific timers or local caps must not be serialized as universal frame facts unless authority makes them universal.

### P22-F10 — Framed conformance coverage drift

Source: P21-F10.

**Verification Drift**

The `framed-binary` level currently proves CONTROL/RPC flows but not Standard Frame behavior. Its name therefore implies stronger evidence than it actually carries.

**Architecture Drift**

Conformance is downstream evidence and must not be used to invent missing framing semantics.

**Historical disposition: REPAIR ONLY.**

P20 must produce a frame evidence matrix and then add required cases only for frozen Current Authority.

### P22-F11 — Conformance DSL drift

Source: P21-F11.

**Verification Drift**

The test DSL grew around RPC/CONTROL/STREAM semantic objects, while the new framing gate requires raw bytes, chunk boundaries, corruptions, time advancement, and parser/reassembly outcomes.

**Architecture Drift**

A frame oracle should sit below payload semantics so the same vectors can drive C++, TS, Python, C/embedded, mock server, and future runtimes.

**Historical disposition: REPAIR ONLY.**

P20 must design this evidence interface before implementation begins. Do not encode TS or C++ object models into the common conformance format.

### P22-F12 — Test-vector drift

Source: P21-F12.

**Verification Drift**

Current generated vectors are hardcoded and include stale Compact material. They are snapshots of past tooling behavior, not derived proof of Current Authority.

**Implementation Drift**

Runtime generator snapshots can copy those vectors and thereby amplify stale facts across repositories.

**Historical disposition: REPAIR ONLY.**

After P20/P23 define the oracle and frame contract, vectors must be generated or validated from authoritative frame facts. Compact/deferred vectors should be cataloged separately from current Core release-required vectors.

## 7. Historical semantics decision register

This register is the main P22 handoff into P20/P23.

### 7.1 Safe candidates to carry forward, subject to explicit approval

These principles are consistent with current trusted facts and observed implementations:

1. **Complete-message delivery** — upper CONTROL/RPC/STREAM payload parsing sees a complete logical message after frame reassembly, not arbitrary partial fragments.
2. **Shared MessageId within one fragmented logical message** — all its fragments use the same MessageId.
3. **FrameIndex defines logical order** — reassembled payload order follows `0..FrameCount-1`, independent of physical arrival order if out-of-order support is adopted.
4. **Frame-layer isolation** — reassembly does not use RPC requestId or STREAM seqId.
5. **Byte-stream magic scanning** — TCP-like transports may resynchronize by searching Standard Frame magic; packet boundaries never waive AXTP header/CRC validation.
6. **No mandatory v1 ACK/NACK retransmission** — parser/reassembly correctness must not depend on future ACK/NACK opcodes.
7. **Bounded memory** — parser and reassembly state must have finite resource limits and deterministic cleanup.

These are **candidates**, not Current A1 Authority until P23 approves them.

### 7.2 Must be re-decided explicitly

P23 must make new decisions for:

1. exact reassembly key and directional scope;
2. permitted fragment interleaving;
3. identical duplicate and conflicting duplicate behavior;
4. invariant fields across fragments;
5. active MessageId collision behavior;
6. MessageId zero legality, allocation guidance, reuse window and wrap;
7. >255-fragment sender behavior;
8. exact meaning of `FRAME_FRAGMENT_MISSING` vs `FRAME_REASSEMBLY_TIMEOUT`;
9. reassembly timeout start/reset and cleanup triggers;
10. effective/directional `maxFrameSize` semantics with empty ACCEPT;
11. parser candidate/discard/rescan and repeated-failure bounds;
12. frame error disposition/carrier matrix;
13. which reassembly limits are universal/profile/local;
14. heartbeat initiator(s), interval ownership, ACK deadline/miss formula, ordinary-traffic refresh, timeout transition and cleanup;
15. reconnect/re-OPEN behavior after liveness failure.

No runtime's existing behavior is privileged in these decisions.

## 8. Repair ownership by layer

### Authority / Semantic repair

Owned by A1 P23 after P20 provides executable acceptance targets:

- F01, F02, F03, F04, F05, F06, F07, F08.

### Machine contract / generator repair

After authority freezes:

- F09: extend machine-readable Standard Frame facts and validation.

### Verification repair

Owned by P20 and downstream conformance tooling:

- F10: frame case matrix;
- F11: raw-frame/time/chunk/recovery DSL or equivalent oracle contract;
- F12: authoritative generated/golden vectors.

### Runtime migration / implementation repair

After A1 Current Authority exists:

- update C++ and TS framing/reassembly/liveness behaviors to the same contract;
- then propagate to C, Python, Flutter and mock server as applicable;
- do not repair cross-language differences before P23 by choosing one runtime as reference authority.

## 9. Verification implications for P20

P20 must be able to prove at least these invariants without relying on a particular runtime implementation:

1. identical valid frame bytes decode to identical frame fields in every runtime;
2. a fragmented message produces exactly one complete payload and no partial upper-layer dispatch;
3. fragment ordering/interleaving/duplicates/collisions follow one explicit state machine;
4. MessageId wrap/reuse cannot alias an active assembly under the normative scope;
5. effective frame limits are deterministic when ACCEPT contains zero, one, or many optional TLVs;
6. invalid header/CRC/length input has a deterministic disposition and bounded recovery;
7. parser resynchronization cannot grow memory without bound;
8. reassembly timeout/resource exhaustion has deterministic cleanup and error class;
9. liveness timeout can be driven by a virtual clock and produces deterministic link/pending-work cleanup;
10. packet and byte-stream transport profiles produce equivalent frame semantics after transport-specific chunking;
11. golden vectors are generated/validated from authority rather than hand-maintained byte strings;
12. differential execution of the same corpus across at least C++ and TS yields the same normative outcomes.

## 10. Quality / Evidence Gate for P22

P22 exit criteria:

- all twelve P21 findings mapped across all five drift axes;
- Product Drift explicitly assessed rather than assumed;
- at least two independent runtime implementations inspected as implementation evidence;
- implementation behavior kept subordinate to authority;
- historical semantics separated into re-adopt candidates vs mandatory re-decisions;
- each finding assigned a correct repair layer;
- no new Core Framing behavior declared Current Authority;
- downstream implementation remains blocked until P20/P23 closure.

Result: **P22 REVIEW COMPLETE; A1 remains BLOCKED_AUTHORITY.**

## 11. Handoff

Next stage: **A1 / P20 — Core Framing Verification Design**.

P20 should consume:

- P21 trusted facts and twelve authority gaps;
- this P22 five-axis matrix;
- the historical decision register;
- C++/TS implementation divergence as evidence of why a common oracle is required.

P20 should produce the executable evidence model first: requirement/invariant/oracle/corpus/test/threshold/gate mapping for Standard Frame decode, fragmentation/reassembly, limits, parser recovery, errors and liveness.

Only after P20 defines what evidence will prove the contract should A1 proceed to **P23 Authority Supersession**, where the re-adopt candidates and mandatory re-decisions become the actual `A1 Current Authority`.

No runtime implementation, merge to release authority, spec tag, or release is authorized by this P22 record.
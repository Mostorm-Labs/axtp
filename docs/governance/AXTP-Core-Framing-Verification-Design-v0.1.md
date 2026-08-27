# AXTP Core Framing Verification Design v0.1

Status: **A1 / P20 Verification Design — READY for authority materialization, release evidence not yet complete**  
Authority: `AXTP Core Framing Authority v0.1`  
Scope: evidence design for A1-D01 through A1-D10.  
Repository boundary: `Mostorm-Labs/axtp` only.

> P20 defines how A1 framing decisions will be proven without modifying any current runtime. C++/TS/C/Python/Flutter/mock/firmware repositories remain outside this stage. A future runtime may implement a thin conformance adapter only after it explicitly adopts a published A1-containing AXTP release.

## 1. Role

Aegis stage: `P20 Verification Design`.

P23 established the first Current A1 Design Authority and deliberately separated AXTP-owned wire semantics from runtime-owned local policy. P20 turns every P23 decision into an evidence contract before `specs/20-core.md`, Protocol IR, generators, or published conformance requirements are changed.

The verification chain is:

```text
P23 decision
  -> invariant
  -> oracle/reference
  -> fixture/corpus
  -> adapter-neutral probe
  -> evidence artifact
  -> A1 gate
```

## 2. Authority

P20 consumes, and does not redesign:

- `docs/governance/AXTP-Contract-Authority-Model-v0.1.md`;
- `docs/governance/AXTP-Core-Framing-Authority-v0.1.md`;
- P21 and P22 review records;
- current stable frame/control/error identifiers used as references.

`conformance/framing/**` is evidence design. It cannot override P23 semantics.

## 3. Objective

Create one portable Core Framing verification package that can prove protocol-owned behavior across independent implementations while explicitly refusing to compare runtime-owned choices.

P20 must provide:

1. deterministic raw-frame and byte-stream corpus;
2. adapter-neutral framing state oracle;
3. symbolic virtual-time model;
4. machine-validated frame conformance DSL;
5. P23 decision-to-evidence traceability;
6. a repository gate that detects drift in this design before later materialization.

## 4. Non-goals

P20 does **not**:

- modify any runtime repository;
- modify any runtime `AXTP_SPEC.lock.yaml`;
- create runtime migration plans or PRs;
- require C++ and TS to use the same MessageId allocator, timeout duration, scheduler, memory limit, thread model, or reconnect policy;
- synchronize `specs/20-core.md` yet;
- add Standard Frame structure to Protocol IR yet;
- add these P20 cases to the current release-required `conformance/manifest.yaml` yet;
- tag, release, or claim A1 is a published runtime contract.

## 5. Verification architecture

### 5.1 Raw Frame Corpus

`conformance/framing/corpus/raw-frames.yaml` is the deterministic wire fixture layer.

It contains:

- valid unfragmented and fragmented frames;
- identical/conflicting fragment input;
- MessageId zero and reuse examples;
- bad Version, PayloadType, CRC, length and fragment-range inputs;
- a valid frame that exceeds a configured effective maximum;
- a valid payload containing `0x41 0x58` to test byte-stream candidate commitment;
- corrupt-then-valid recovery stream;
- HEARTBEAT fixed input.

The design validator independently checks fixture hex length and CRC16-CCITT-FALSE where CRC is expected to be valid/invalid. This makes the corpus an inspected evidence input rather than a copy of runtime output.

### 5.2 State Oracle

`conformance/framing/state-oracle.yaml` defines the only state/outcomes a portable adapter may be required to expose:

- resolved effective parameters;
- complete payload dispatch;
- CONTROL semantic emission;
- reassembly lifecycle outcome;
- local sender rejection;
- optional frame diagnostic;
- policy probe result.

This is a **test adapter contract**, not a new production runtime API.

Private implementation details such as buffer type, mutex, task graph, allocator state, timer object, retry loop, worker thread, and reconnect state are explicitly outside the oracle.

### 5.3 Virtual Time

`conformance/framing/virtual-time.yaml` uses a monotonic virtual clock.

Two operation classes exist:

- `advance_by` for protocol-defined deterministic intervals if one is ever required;
- `advance_to_policy_deadline` for runtime/profile-owned deadlines.

For `reassembly_timeout` and heartbeat failure policy, the adapter supplies its configured deadline. Required comparison is the **semantic transition and safety outcome**, not the duration.

Therefore these are both valid implementations:

```text
Runtime A reassembly timeout = 10 s
Runtime B reassembly timeout = 30 s
```

provided each advertises that policy and produces the A1-defined timeout classification/no-partial-dispatch outcome at its own deadline.

An implementation without a reassembly timer does not fail Core merely because another implementation has one; the timeout-specific scenario is capability-gated.

### 5.4 Frame Conformance DSL

`conformance/framing/schemas/frame-conformance-case.schema.json` defines an adapter-neutral YAML DSL.

Core operations are:

```text
negotiate_link
feed_raw
fragment_message
advance_time
probe_policy
induce_policy_boundary
send_control
reset
expect
```

The DSL can therefore express exact wire input, semantic OPEN/ACCEPT setup, sender fragmentation, virtual-time progression, runtime-owned policy evidence, and state-oracle expectations without importing runtime source code.

## 6. P23 decision -> evidence matrix

| Decision | Requirement / invariant | Oracle | Corpus / case | Cross-language equality |
|---|---|---|---|---|
| A1-D01 | OPEN is baseline; ACCEPT overrides only present fields | `effective_params` | `frame.effective_parameters` | Exact resolved values |
| A1-D02 | sender emits one contiguous sequence; indexes complete; >255 rejected locally | `fragmenter`, `local_reject` | `frame.fragmentation_sender` | Frame semantics, not allocator/threading |
| A1-D03 | reassembly key/invariants yield one complete logical payload; out-of-order accepted | `dispatch`, `context_outcome` | `frame.reassembly_and_duplicates` | Exact completed payload / no partial dispatch |
| A1-D04 | identical duplicate idempotent; conflicting duplicate invalidates | `context_outcome`, optional diagnostic | `frame.reassembly_and_duplicates` | Exact semantic outcome |
| A1-D05 | MessageId opaque uint16; zero legal; active uniqueness only | dispatch/local reject semantics | fragmentation + reassembly cases | No allocator-sequence comparison |
| A1-D06 | new MessageId proves missing under contiguous rule; timer expiry is separate | `context_outcome`, virtual time | `frame.missing_and_timeout` | Classification only; no timeout-value equality |
| A1-D07 | reassembly resources finite; exhaustion never partial-dispatches | `policy_probe`, `context_outcome` | `frame.resource_bounds` | Finite/safe outcome, not numeric cap |
| A1-D08 | invalid candidate never dispatches; incomplete declared candidate is not resynced inside payload | dispatch oracle | raw negative corpus + parser case | Safety outcome; recovery capability conditional |
| A1-D09 | frame errors remain local by default; no synthetic business error carrier | optional diagnostic + no dispatch | parser negative corpus | Error class when exposed; never fabricated wire response |
| A1-D10 | HEARTBEAT ACK echoes controlId/SUCCESS; scheduler/failure policy local | `control_emission`, `effective_params` | `frame.heartbeat_wire` | CONTROL semantics only |

## 7. Runtime-owned policy protection

P20 deliberately prevents these values from becoming accidental AXTP constants:

| Runtime-owned choice | P20 treatment |
|---|---|
| MessageId allocation sequence | never compared |
| reassembly timeout duration | symbolic policy deadline |
| max pending reassembly contexts | finite-policy evidence only |
| max reassembled bytes | finite-policy evidence only |
| heartbeat scheduler topology | not in oracle |
| missed-heartbeat threshold / failure deadline | not numerically compared |
| ordinary traffic refreshing liveness | not a Core equality target |
| parser consecutive-error close threshold | not a Core equality target |
| reconnect/backoff/re-OPEN | outside framing oracle |
| diagnostic API shape | optional adapter capability |

A future profile may standardize one of these values. If so, that profile becomes a new authority input and its own evidence can require numeric equality.

## 8. Evidence levels and gates

P20 uses the cheapest evidence that credibly proves each contract:

```text
Fixed bytes / CRC / header facts
  -> deterministic golden corpus

Reassembly / duplicate / effective parameter semantics
  -> deterministic state oracle

Runtime-owned timeout boundary
  -> virtual-time semantic oracle

Runtime-owned finite resource policy
  -> executable policy probe OR equivalent auditable policy artifact

Optional parser recovery
  -> capability-gated resilience corpus
```

The P20 package itself passes only when:

1. every A1-D01..A1-D10 decision has at least one case;
2. every case conforms to the DSL schema;
3. every corpus reference exists;
4. raw frame byte count and declared CRC expectation are internally consistent;
5. every symbolic time deadline is declared;
6. runtime/profile-owned deadlines explicitly set `numeric_equality: false`;
7. required state-oracle event types are present;
8. the ordinary repository `Validate AXTP Spec` workflow passes on the P20 head.

Passing this gate proves **verification design integrity**, not A1 runtime conformance.

## 9. Publication / promotion boundary

During P20:

```text
conformance/framing/manifest.yaml
release_required: false
```

This prevents a design-stage fixture from silently becoming a published requirement before the normative and machine-readable authority is synchronized.

After P20, A1 must perform AXTP-side materialization in this order:

```text
P23 Current A1 Authority
  -> P20 Verification Design
  -> synchronize specs/20-core.md
  -> materialize machine-readable Standard Frame contract
  -> regenerate / validate derived protocol artifacts
  -> reconcile P20 corpus/cases with materialized authority
  -> explicitly promote selected cases into main conformance required_cases
  -> A1 Gate Review
```

No runtime adoption belongs inside that sequence.

## 10. Quality / Evidence Gate

P20 result may be `READY` when the design validator and standard AXTP CI are green.

A1 overall remains `BLOCKED_EVIDENCE` after P20 because:

- current normative `specs/20-core.md` has not yet been synchronized to all P23 decisions;
- Protocol IR does not yet machine-model the Standard Frame authority;
- the P20 cases are not yet promoted into release-required conformance;
- no A1 release Gate has been run.

## 11. Handoff

Next trusted work is **AXTP-side Core Framing contract materialization**:

1. synchronize `specs/20-core.md` to P23;
2. add the machine-readable Standard Frame contract and generator/validator coverage;
3. then bind/promote the P20 verification package against those materialized authorities.

Runtime repositories remain audit-only until a separately authorized future adoption phase.

# A1 Core Framing Verification Package

Status: **P20 verification design — not yet part of the published `framed-binary` required-case set**.

Authority: `docs/governance/AXTP-Core-Framing-Authority-v0.1.md`.

This directory defines the adapter-neutral evidence contract for A1 Core Framing. It belongs to the AXTP repository and does not modify or embed any runtime implementation.

## Package

```text
conformance/framing/
├── manifest.yaml
├── state-oracle.yaml
├── virtual-time.yaml
├── schemas/
│   ├── frame-verification-manifest.schema.json
│   ├── raw-frame-corpus.schema.json
│   ├── state-oracle.schema.json
│   ├── virtual-time.schema.json
│   └── frame-conformance-case.schema.json
├── corpus/
│   └── raw-frames.yaml
└── cases/
    ├── effective_parameters.yaml
    ├── fragmentation_sender.yaml
    ├── reassembly_and_duplicates.yaml
    ├── missing_and_timeout.yaml
    ├── resource_bounds.yaml
    ├── parser_integrity_and_recovery.yaml
    └── heartbeat_wire.yaml
```

## Four-layer model

1. **Raw Frame Corpus** fixes exact bytes/chunk boundaries for wire facts that must be deterministic. Corpus bytes are validated for size and, where applicable, CRC16-CCITT-FALSE.
2. **State Oracle** defines only observable framing outcomes: resolved link parameters, complete payload dispatch, CONTROL semantic emission, reassembly outcome, local rejection, optional diagnostics, and policy probes. It is a test-adapter interface, not a production runtime API.
3. **Virtual Time** advances a monotonic test clock. Runtime/profile-owned deadlines are resolved by the adapter; their numeric values are not compared across languages.
4. **Frame Conformance DSL** composes corpus input, semantic link setup, virtual-time operations, policy probes, and oracle expectations into portable YAML cases.

## Runtime boundary

A runtime that later adopts an A1-containing published AXTP release may provide a thin test adapter for these operations. The adapter does not need to expose its production container/thread model and is not required to use the same allocator, timeout value, scheduler, resource budget, or reconnect policy as another runtime.

Cross-language equality is required only for protocol-owned outcomes. Optional capabilities such as `parser_recovery`, `frame_diagnostics`, `reassembly_timeout_policy`, and `resource_probe` gate evidence that is intentionally implementation/profile dependent.

## Promotion boundary

`conformance/framing/manifest.yaml` has `release_required: false` during P20. These cases are therefore **not** silently added to `conformance/manifest.yaml` and do not change the current published `framed-binary` requirement set.

Promotion happens only after:

1. `specs/20-core.md` is synchronized to A1 authority;
2. the machine-readable Standard Frame contract is materialized;
3. the P20 package still validates against those authorities;
4. release-required cases are explicitly selected in the main conformance manifest.

Validation runs through `tooling/scripts/validate-conformance.sh`.

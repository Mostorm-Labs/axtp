# Generated Contract Authority Boundary

`contract/generated/**` contains generated, implementation-facing projections of AXTP authority. Files in this directory are derived outputs and MUST NOT be edited or interpreted as an independent source of protocol semantics.

## What is authoritative here

Machine facts rendered from the active protocol model — including method/event/capability/error identifiers, schema fields, transport/profile tables and other generated registry projections — are derived views of their canonical owners.

For current protocol truth, use the authority chain:

```text
specs/**                         normative semantics
contract/registry/**             canonical machine-readable facts
        ↓ generator
contract/protocol/axtp.protocol.yaml
contract/generated/**            derived implementation-facing projection
```

If a generated projection disagrees with its canonical or normative source, classify it as a derivation defect and fix the source/generator. Do not hand-edit the generated output to create a new protocol fact.

## Explanatory prose in `protocol.md`

`protocol.md` intentionally includes human-readable framework and integration prose in addition to model-derived tables and identifiers.

That fixed explanatory prose is **non-authoritative reading guidance**. It may summarize current behavior, but it does not own protocol semantics and MUST NOT override:

- `specs/**` for normative behavior;
- `contract/registry/**` for canonical protocol facts;
- `contract/protocol/axtp.protocol.yaml` for the generated aggregate machine model;
- `contract/rules/**` and `conformance/**` for verification authority.

Numeric/layout claims that are suitable for deterministic projection must be derived from current authority rather than copied as emitter constants. G5 specifically enforces this for Standard Frame header size and RPC operation numbers through `ProtocolProjectionFacts`.

When fixed prose and machine-derived content appear to conflict, treat the prose as explanatory text, report a derivation/documentation defect, and resolve against the authority chain above.

## Runtime / SDK consumption

Runtime and SDK implementations may use generated files as convenient implementation-facing projections, but release binding still requires an exact Spec tag/commit/artifact and verification against the matching conformance authority.

For the complete implementation entry path, see `docs/guides/runtime.md`.

# AXTP Specs

`specs/` is the hand-written AXTP standard text. It explains the rules behind the machine contract in `contract/`; it does not contain generated registries, candidate tables, legacy evidence, or workflow playbooks.

## Read This Way

| Reader | Read |
|---|---|
| Runtime / SDK implementer | [20-core.md](20-core.md), then [40-codec.md](40-codec.md) as needed. |
| Registry / generator maintainer | [30-registry.md](30-registry.md), [40-codec.md](40-codec.md), [50-tooling.md](50-tooling.md). |
| Product / protocol reviewer | [30-registry.md](30-registry.md), then `docs/product/domain-status.md`. |
| Release owner | [10-contract.md](10-contract.md), [50-tooling.md](50-tooling.md), `release/README.md`. |
| Anyone confused by terms | [00-glossary.md](00-glossary.md). |

## Standard Texts

| File | Contract |
|---|---|
| [00-glossary.md](00-glossary.md) | Shared terms only. |
| [10-contract.md](10-contract.md) | Source-of-truth order, conflict handling, and non-contract material. |
| [20-core.md](20-core.md) | Frame, transport profile, CONTROL, RPC, STREAM, and low-bandwidth boundaries. |
| [30-registry.md](30-registry.md) | Domain/feature taxonomy and method/event/error/profile registry rules. |
| [40-codec.md](40-codec.md) | Types, schemas, capability model, TLV, and field numbering. |
| [50-tooling.md](50-tooling.md) | Registry YAML to Protocol IR, generator behavior, versioning, and release binding. |

## Authority

For implementation, use this order:

1. Released spec artifact or `spec/vMAJOR.MINOR.PATCH` tag.
2. `contract/protocol/axtp.protocol.yaml`.
3. `contract/generated/protocol.md` and `contract/generated/protocol.json`.
4. `conformance/**`.
5. `specs/**`.

Current method/event/error/capability/profile facts live in `contract/registry/**` and generated outputs. Candidate planning lives in `workspace/registry-planning/**` and is not a runtime contract.

## Keywords

| Keyword | Meaning |
|---|---|
| MUST | Required for the relevant AXTP profile. |
| SHOULD | Strongly recommended; deviations need an explicit engineering reason. |
| MAY | Optional or profile-specific behavior. |
| RESERVED / FUTURE | Not a v1 required behavior; do not implement as a required profile claim. |

# AXTP Product Roadmap

This roadmap is planning material for product and architecture decisions. It is not a runtime implementation contract. Runtime, SDK, CLI, mock server, and adapter repositories must bind to spec tags, release artifacts, `contract/protocol/axtp.protocol.yaml`, `contract/generated/**`, `specs/**`, and `conformance/**`.

## Current Status

Current generated/adopted coverage is tracked in [Product Domain Status](domain-status.md). A domain is runtime-contract ready only when its source YAML exists under `contract/registry/domains/<domain>/domain.yaml`, generated artifacts are refreshed, and validation passes.

Today the repository front door is intentionally narrow:

- Product and architecture use [Product Guide](../guides/product.md) and [Domain Status](domain-status.md).
- Runtime and SDK teams use generated protocol, specs, release artifacts, and conformance.
- Protocol maintainers use business inputs, flows, drafts, registry, and generator only when changing protocol facts.

## Planning Themes

| Theme | Direction | Contract boundary |
|---|---|---|
| Runtime interoperability | Keep C++ / TypeScript / mock-server aligned around released spec tags and conformance profiles. | Implement in runtime/tool repositories, not this repo. |
| Standard Framed transport | Use AXTP-TCP and Standard Frame as the primary cross-runtime interop baseline where available. | Behavior must be validated by conformance and mock-server interop. |
| Generated business domains | Promote reviewed domain drafts into `contract/registry/domains/**` only after product and protocol review. | Drafts are not implementation contracts. |
| Conformance expansion | Add profile/case coverage when generated protocol behavior changes. | Tests validate declared support levels. |
| Legacy migration | Keep old protocol evidence and adapter planning as background material. | Legacy evidence does not override generated AXTP facts. |

## Near-Term Priorities

| Priority | Outcome | Owner path |
|---|---|---|
| P0 | Keep release artifact, generated protocol, and conformance validation green. | [Release Docs](../../release/README.md), [Testing Guide](../guides/testing.md) |
| P0 | Use Node mock-server plus runtime conformance to verify TCP / framed behavior across active runtimes. | Runtime repositories + conformance profiles |
| P1 | Move high-confidence drafts from `workspace/protocol/**` into registry YAML and generated outputs. | [Protocol Maintainer Guide](../guides/protocol-maintainer.md) |
| P1 | Clarify product status and adoption priority per domain. | [Product Domain Status](domain-status.md) |
| P2 | Continue legacy adapter planning only when it supports an active migration target. | [Legacy Migration Guide](../guides/legacy-migration.md) |

## Rules

- Roadmap milestones are planning labels, not spec versions.
- Runtime teams bind to `spec/vMAJOR.MINOR.PATCH`, a commit, or a release artifact.
- Unadopted drafts, flow plans, audits, and legacy evidence cannot be used as runtime implementation contracts.
- Tool and runtime delivery happens outside this repository unless explicitly generated here.

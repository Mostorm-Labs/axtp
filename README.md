# AXTP

AXTP is the spec contract center for Auditoryworks Transport Protocol. This repository defines the protocol facts, generated references, release artifacts, and conformance inputs consumed by runtime and SDK repositories; it is not a runtime implementation repository.

## Start Here

| Role | Read this first | Use it for |
|---|---|---|
| Product / architecture | [Product Guide](docs/guides/product.md) | Capability status, domain boundaries, roadmap, adoption priorities. |
| Runtime / SDK engineering | [Runtime / SDK Guide](docs/guides/runtime.md) | Binding a spec version, using generated protocol, connecting to mock/server/runtime implementations. |
| Testing / conformance | [Testing Guide](docs/guides/testing.md) | Validating runtime, SDK, and mock-server behavior by profile and level. |
| Protocol maintainer | [Protocol Maintainer Guide](docs/guides/protocol-maintainer.md) | Moving requirements through business input, flow, draft, registry, generated, and release. |
| Release owner | [Release Docs](docs/workspace/release/README.md) | Publishing spec tags, release artifacts, and runtime update flow. |

For the full documentation reading route, use [docs/README.md](docs/README.md). Do not browse the whole repository as an onboarding path.

## Current Implementation Contract

Runtime and SDK work should bind to a spec tag, a commit, or a release artifact. The current implementation contract is:

| Contract | Path |
|---|---|
| Protocol IR | [contract/protocol/axtp.protocol.yaml](contract/protocol/axtp.protocol.yaml) |
| Generated reference | [contract/generated/protocol.md](contract/generated/protocol.md), [contract/generated/protocol.json](contract/generated/protocol.json) |
| Hand-written specs | [specs/](specs/README.md) |
| Conformance inputs | [conformance/](conformance/README.md) |
| Release governance | [docs/workspace/release/](docs/workspace/release/README.md) |

The registry source of truth lives in `contract/registry/**` and `contract/registry/domains/**`. Generated artifacts must not be edited by hand.

## Hard Rules

- Do not implement runtime behavior from `docs/workspace/business/**`, `docs/workspace/flows/**`, or unadopted `docs/workspace/protocol/**` drafts.
- Do not hand-edit `contract/protocol/axtp.protocol.yaml`, `contract/generated/**`, `contract/mcp/**`, or `contract/test-vectors/**`.
- Do not bypass protocol review and write new business semantics directly into registry YAML.
- Conformance is the behavior acceptance surface for runtime, SDK, and mock-server work.

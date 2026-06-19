# AXTP Docs Reading Route

This directory contains both the public reading path and the protocol maintenance workspace. Start from a role guide first; most subdirectories are background material, not onboarding pages.

## Front Door

| Role | Entry |
|---|---|
| Product / architecture | [guides/product.md](guides/product.md) |
| Runtime / SDK engineering | [guides/runtime.md](guides/runtime.md) |
| Testing / conformance | [guides/testing.md](guides/testing.md) |
| Protocol maintenance | [guides/protocol-maintainer.md](guides/protocol-maintainer.md) |

## Implementation Contract

| Contract class | Read from | Runtime can implement from it |
|---|---|---:|
| Generated contract | [../contract/generated/protocol.md](../contract/generated/protocol.md), [../contract/generated/protocol.json](../contract/generated/protocol.json), `../contract/protocol/axtp.protocol.yaml` | Yes |
| Hand-written specs | [../specs/](../specs/README.md) | Yes, when aligned with generated/YAML |
| Registry facts | `../contract/registry/**`, `../contract/registry/domains/**` | Yes |
| Conformance | [../conformance/](../conformance/README.md) | Yes, as behavior acceptance |
| Release state | [workspace/release/](workspace/release/README.md) | Yes, for version binding |

## Background Workspace

Do not browse these directories by default. Open them only when the role guide or a maintenance task sends you there.

| Directory | Purpose | Runtime contract |
|---|---|---:|
| [workspace/](workspace/README.md) | Maintainer workspace for business inputs, flows, drafts, and legacy migration. | No |
| [workspace/release/](workspace/release/README.md) | Release governance, changelog, spec lock, and runtime update flow. | No, except for version binding |
| `docs/archive/audits/` | Historical audits and dated decision context. | No |
| `tooling/skills/` | Agent lifecycle skills and workflow definitions. | No |
| `../specs/2-registry/appendix/` | Historical/candidate registry tables. | No |

## Generated Files

Generated outputs are read-only from a documentation-editing perspective. If generated content is wrong, fix the source YAML, specs, or generator and rerun the pipeline.

| Generated path | Source |
|---|---|
| `../contract/protocol/axtp.protocol.yaml` | `../contract/registry/**`, `../contract/registry/domains/**` |
| `../contract/generated/**` | Generator output from Protocol IR and registry sources |
| `../contract/mcp/**` | Generator output |
| `../contract/test-vectors/**` | Generator or test-vector tooling output |

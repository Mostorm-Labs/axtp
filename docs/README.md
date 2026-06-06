# AXTP Docs

`docs/` is the active documentation workspace for AXTP protocol governance. It
contains business inputs, flow plans, RFC drafts, architecture guidance,
generated references, legacy migration material, conformance cases, and release
management docs.

Do not treat drafts, flow plans, or legacy migration material as implementation
contracts. Current implementation facts come from YAML and generated outputs.

## Reader Paths

| Goal | Reading Order |
|---|---|
| Understand AXTP | `specs/README.md` -> `specs/1-core/01-Overview.md` |
| Check the current contract | `generated/protocol.md` or `generated/protocol.json` |
| Start from a product requirement | `business/README.md` -> `business/<requirement>.md` |
| Plan an interaction flow | `business/README.md` -> `dev/skills/10-plan-protocol-flow/SKILL.md` -> `flows/README.md` |
| Draft or review protocol changes | `protocol/README.md` -> `protocol/<domain>/<domain.feature>.md` -> `dev/skills/**` |
| Run generator and maintainer workflows | `guides/how-to-use.md` -> `dev/skills/README.md` -> `../generators/README.md` |
| Review shared architecture | `architecture/README.md` |
| Trace legacy migration | `legacy-migration/README.md` |
| Validate runtime behavior | `conformance/README.md` |
| Prepare a release | `release/README.md` |

## Documentation Areas

| Group | Path | Audience | Purpose | Hand Written |
|---|---|---|---|---:|
| Active specs | `docs/specs/` | Protocol maintainers, runtime/tool authors | Formal protocol rules, wire format, governance, and generator contract | Yes |
| Business requirements | `docs/business/` | Product, architecture, engineering, test | PRDs, user goals, constraints, and open questions | Yes |
| Flow plans | `docs/flows/` | Product, architecture, app, firmware, backend, test | Sequence diagrams and scenario-level protocol coverage/gaps | Yes |
| Protocol RFCs | `docs/protocol/` | Protocol maintainers and reviewers | Drafts and review records before registry adoption | Yes |
| Architecture | `docs/architecture/` | Architecture, protocol maintainers, runtime authors | Cross-language protocol design principles | Yes |
| Generated reference | `docs/generated/` | Engineering, test, SDK/tool authors | Current generated protocol reference | No |
| Guides | `docs/guides/` | Maintainers and integrators | Repo usage, generator commands, workflow examples | Yes |
| Dev docs | `docs/dev/` | Protocol maintainers and automation agents | Maintainer workflows and protocol lifecycle skills only | Yes |
| Legacy migration | `docs/legacy-migration/` | Protocol maintainers and legacy adapter authors | Evidence, classification, plans, and generated migration candidates | Partial |
| Conformance | `docs/conformance/` | Runtime/tool authors and test | Cross-runtime behavior cases, profiles, fixtures, and schemas | Yes |
| Release | `docs/release/` | Maintainers and release automation | Changelog, versioning, release checklist, runtime update contract | Yes |

## Authority Boundary

```text
docs/business/**                         Original business input, not a protocol contract
docs/flows/**                            Scenario-level interaction plan, not a protocol contract
docs/protocol/**                         RFC / draft and review input
registry/**/*.yaml + registry/domains/** Hand-written machine facts
protocol/axtp.protocol.yaml              Generated Protocol IR
docs/generated/**                        Generated human/machine reference
```

The active specs are grouped under `1-core/` through `4-tooling/`. Registry,
Profile, and Capability Types specs govern taxonomy, mapping, registry,
schema/capability, profile, and MVP rules. If a spec table conflicts with YAML
or generated output, fix the source rule and regenerate instead of maintaining
a second active fact source.

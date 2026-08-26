# AXTP Normative Rule Registry

`contract/rules/rules.yaml` assigns stable Rule IDs to selected existing normative requirements so conformance evidence can be traced without duplicating protocol semantics.

## Authority boundary

- `specs/**` remains the normative semantic authority.
- `contract/rules/rules.yaml` is verification-authority metadata: stable ID, source pointer, normative level, lifecycle/status, and verification disposition.
- `conformance/cases/**` remains executable acceptance authority.
- A conformance case links to the rule(s) it proves through `authorityRules`.
- Rule -> Case backlinks are derived by tooling; they are not independently authored in the rule registry.
- A Rule ID does not create or amend runtime behavior. Any semantic change still requires the normal protocol amendment/release process.

## Rule ID format

Rule IDs use stable domain-oriented namespaces:

```text
CORE.FRAME.001
CONTROL.SESSION.001
RPC.SESSION.001
RPC.COMPAT.001
RPC.METHOD.001
RPC.EVENT.001
CODEC.COMPAT.001
STREAM.FRAME.001
RPC.RELAY.001
```

Once published as a stable Rule ID, an ID is not reused for a different requirement. If a requirement is replaced, preserve the old ID as deprecated/superseded metadata and introduce a new ID when the semantic contract is materially different.

## Verification dispositions

Every seeded stable rule has exactly one disposition:

| Disposition | Meaning |
|---|---|
| `covered` | One or more executable conformance cases reference the Rule ID. |
| `structural-only` | The requirement is proven by deterministic structure/source validation rather than a runtime behavior case. |
| `manual-evidence` | The requirement needs explicit non-automated evidence; evidence paths/notes must be recorded. |
| `not-applicable` | The requirement is deliberately outside the selected verification scope and must carry a reason. |
| `uncovered` | No acceptable evidence exists. A stable `must` rule in this state blocks G3/release readiness. |

`covered` does not mean every assertion in a case belongs to one rule. It means the case contains executable evidence for that rule. One case may reference multiple Rule IDs, and one Rule ID may be proven by multiple cases.

## Coverage commands

Repository validation runs the Rule coverage checker through `tooling/scripts/validate-conformance.sh`.

Human-readable projection:

```bash
node tooling/scripts/validate-rule-coverage.mjs . --markdown
```

Machine-readable projection:

```bash
node tooling/scripts/validate-rule-coverage.mjs . --json
```

The checker fails when:

- a case references an unknown Rule ID;
- a `covered` rule has no case backlink;
- a seeded stable `must` rule is `uncovered`;
- rule metadata/disposition is malformed;
- required structural/manual evidence metadata is missing.

## G3 seed scope

G3 intentionally starts with high-value current behavior rather than assigning an ID to every normative sentence. Seed coverage includes Standard Frame version identity, CONTROL OPEN/ACCEPT, RPC session gating, advisory `axtpVersion`, method degradation, unknown optional fields, unknown events, STREAM header shape, and Endpoint Relay single-destination addressing.

Future Rule IDs should be added when a requirement becomes important enough to need stable evidence traceability. Do not bulk-number prose merely to increase coverage percentages.

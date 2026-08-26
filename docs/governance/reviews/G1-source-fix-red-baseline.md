# G1 Authoring Source RED Baseline

Status: EVIDENCE
Date: 2026-08-26
Gate: G1 Authority Boundary Closure

This record captures the pre-fix authoring behavior that allowed shadow authority metadata to be recreated.

## Baseline failures

1. `tooling/skills/20-draft-business-protocol/references/protocol-draft-template.md` emits legacy frontmatter:
   - `status: draft`
   - `contract: false`
   - `generated: false`
   - `registry:`
2. `tooling/skills/20-draft-business-protocol/SKILL.md` instructs authors to include "frontmatter status and contract state" instead of the Authority Metadata v2 model.
3. `tooling/skills/30-adopt-protocol-draft/SKILL.md` records adoption but does not require the accepted proposal metadata tuple `authorityClass: proposal`, `lifecycle: accepted`, `protocolStability`, and scalar `adoptedBy`.
4. `tooling/skills/40-amend-adopted-protocol/SKILL.md` does not explicitly preserve proposal authority class through amendment.
5. Stage 50 already treats registry YAML as generator input, but does not explicitly forbid generation from mutating proposal authority metadata.

## Expected post-fix behavior

New or materially rewritten protocol proposals must start with:

```yaml
authorityClass: proposal
lifecycle: captured
protocolStability: draft
domain: <domain>
feature: <domain.feature>
adoptedBy:
lastReviewed: YYYY-MM-DD
```

After adoption, only proposal lifecycle/adoption metadata changes:

```yaml
authorityClass: proposal
lifecycle: accepted
protocolStability: <canonical fact stability>
adoptedBy: contract/registry/<primary canonical owner>.yaml
```

The following legacy authority signals are forbidden in migrated v2 proposal frontmatter:

- `status`
- `contract`
- `generated`
- `registry`

`workspace/protocol/**` remains non-contract in every lifecycle state.

## Semantic impact

Wire semantic impact = NONE.
Registry fact impact = NONE.
Generated protocol impact = NONE.
Runtime behavior impact = NONE.

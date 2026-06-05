# AXTP Legacy Migration

`docs/legacy-migration/` keeps old protocol evidence, classification output,
migration plans, and generated migration candidates in one place. It is a
migration workspace, not an AXTP protocol fact source.

Stable AXTP facts still come from:

```text
registry/**/*.yaml + registry/domains/**/*.yaml
  -> protocol/axtp.protocol.yaml
  -> docs/generated/**
```

## Layout

| Path | Purpose |
|---|---|
| `evidence/` | Original AXDP, VM33, Rooms, NearHub, and other legacy protocol evidence. |
| `classification/` | Script-generated domain-feature classification intake. |
| `plans/` | Human migration plans and review matrices. |
| `generated/` | Generated migration candidates and adapter planning outputs. |
| `planning/` | Historical planning references that remain relevant to legacy compatibility. |

Do not promote legacy mappings into `registry/` without concrete legacy command,
status, payload, or behavior evidence and human review.

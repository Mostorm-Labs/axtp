# AXTP Governance

Current governance authority:

- `AXTP-Contract-Authority-Model-v0.1.md` — A0 authority for contract lifecycle, generated runtime projection, CONTROL ACCEPT field presence, WebSocket session-state ownership, and conformance scope ownership.

Active governance review records:

- `AXTP-Core-Framing-Authority-Review-v0.1.md` — A1 / P21 source-of-truth review for Standard Frame parsing, fragmentation/reassembly, frame limits, heartbeat/liveness, parser recovery, frame error disposition, and frame-level evidence. Status: `BLOCKED_AUTHORITY`; this review record is not itself a replacement framing contract.
- `AXTP-Core-Framing-Five-Axis-Drift-Review-v0.1.md` — A1 / P22 five-axis drift review mapping the twelve P21 findings across Product, Semantic, Architecture, Implementation, and Verification drift. It separates historical re-adoption candidates from semantics that require explicit re-decision. Status: `BLOCKED_AUTHORITY`; this review record is not itself A1 Current Authority.

Governance documents define promotion and interpretation rules for normative protocol facts. Runtime and SDK repositories still bind to an exact published spec tag, commit, or release artifact.
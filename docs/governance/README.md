# AXTP Governance

Current governance authority:

- `AXTP-Contract-Authority-Model-v0.1.md` — A0 authority for contract lifecycle, generated runtime projection, CONTROL ACCEPT field presence, WebSocket session-state ownership, and conformance scope ownership.
- `AXTP-Core-Framing-Authority-v0.1.md` — **Current A1 Design Authority** for Standard Framed fragmentation/reassembly, effective OPEN/ACCEPT frame limits, MessageId semantics, parser/error boundaries, heartbeat wire semantics, and the AXTP-vs-runtime ownership boundary. It is not yet a published runtime contract.

Active governance review / audit records:

- `AXTP-Core-Framing-Authority-Review-v0.1.md` — A1 / P21 source-of-truth review. Historical review input to the A1 Current Authority; it does not independently define framing behavior.
- `AXTP-Core-Framing-Five-Axis-Drift-Review-v0.1.md` — A1 / P22 drift review across Product, Semantic, Architecture, Implementation, and Verification axes. Historical review input to P23.
- `AXTP-Runtime-Boundary-Audit-v0.1.md` — audit of sampled C++/TS implementation reality and the protocol/runtime ownership boundary. This is evidence only and explicitly does not authorize runtime modification.

Authority status is intentionally separated from publication status. A runtime or SDK continues to bind to its exact published spec tag/commit/release artifact until it explicitly adopts a future publication that contains A1.

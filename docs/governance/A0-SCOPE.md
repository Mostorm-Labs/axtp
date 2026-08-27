# A0 Scope

A0 is limited to protocol-authority reconciliation. It does not redesign business-domain methods or add new domain capabilities.

In scope:
- contract lifecycle vs maturity;
- generated runtime surface policy;
- CONTROL ACCEPT optional TLV semantics;
- WebSocket session-state error ownership;
- framed-binary vs STREAM conformance ownership;
- executable authority validation.

Deferred to later phases:
- frame fragmentation/reassembly closure;
- heartbeat/liveness closure;
- future WebSocket breaking-version epoch;
- trust/security boundary closure;
- release-tag protection and post-gate tag creation.

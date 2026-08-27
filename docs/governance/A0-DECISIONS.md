# A0 Decisions

- CONTROL ACCEPT TLV fields are optional in AXTP v1 Core. Presence means validate/use; absence means no ACCEPT-level override and is not an error.
- Existing OPEN requirements are unchanged by A0.
- WebSocket pre-identify requests use `INVALID_STATE`, not `CONTROL_OPEN_REQUIRED`.
- `framed-binary` conformance does not imply STREAM; STREAM is a separate scope.
- Contract lifecycle and roadmap/release maturity are separate dimensions.

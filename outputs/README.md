# Manual Outputs

`outputs/` is a workspace area for one-off manual exports, presentation builds, screenshots, and other local delivery artifacts.

This directory is not an AXTP protocol source of truth.

Do not use files under `outputs/` as runtime implementation contracts. Runtime implementations should follow released artifacts, `protocol/axtp.protocol.yaml`, `docs/generated/**`, `docs/specs/**`, and `docs/conformance/**`.

If the project decides these exports should not be tracked, handle that separately in repository hygiene; do not delete historical outputs as part of protocol documentation edits.

# AXTP Roadmap

AXTP is maintained as a protocol source-of-truth repository. The main
iteration path is:

```text
business requirement
  -> scenario flow
  -> protocol RFC / draft
  -> registry facts
  -> generated protocol reference
  -> runtime and tool consumption
```

Runtime, SDK, CLI, mock server, and language-specific implementation work live
in dedicated runtime repositories. This repository focuses on protocol
semantics, governance, generated references, release artifacts, and conformance
cases.

## Product Direction

AXTP exists to unify device control, events, capability discovery, and data
streams across HID, TCP, WebSocket, cloud, app, firmware, and test tooling.

The near-term product goals are:

- Replace scattered legacy command tables with reviewed `domain.feature`
  protocol drafts and generated protocol references.
- Make event, stream, error, schema, capability, and transport semantics
  consistent across device families and integration paths.
- Give firmware, app, backend, SDK, tool, and test teams one shared protocol
  language and one generated source of implementation truth.
- Keep legacy protocol material as evidence and migration input, not as a
  second active protocol contract.

## Technical Direction

AXTP evolves through a staged governance pipeline:

| Stage | Repository area | Purpose |
|---|---|---|
| Business input | `docs/business/` | PRD, user goals, field feedback, UI sketches, and raw scenario context |
| Flow planning | `docs/flows/` | End-to-end actors, sequence diagrams, existing protocol coverage, and gaps |
| RFC / draft | `docs/protocol/` | Reviewable method/event/schema/error/capability/profile proposals |
| Adopted facts | `registry/` | Machine-readable protocol facts after review |
| Generated reference | `protocol/`, `docs/generated/`, `tooling/` | Protocol IR, human docs, tooling JSON, and test vectors |
| Conformance | `docs/conformance/` | Cross-runtime protocol behavior cases |
| Release | `docs/release/`, `release/`, `dist/` | Spec versions, release checklist, runtime update contract, and artifacts |

Architecture material that applies across languages belongs in
`docs/architecture/`. Language-specific runtime design belongs in the matching
runtime repository.

## Priority Batches

The current adoption priority is based on legacy coverage, product dependency,
and shared foundation value.

| Priority | Capability area | Direction |
|---|---|---|
| P1 | `device.*`, `system.*` | Adopt core device identity, state, lifecycle, initialization, and time facts first. |
| P2 | `video.framing` | Stabilize high-frequency video framing controls after the shared device/system base. |
| P2b | `output.layout`, `video.layout` | Confirm screen/window/layout semantics before UXPlay and multi-output workflows. |
| P3 | `camera.focus`, `camera.zoom`, `camera.ptz` | Adopt camera control methods and state events as one coherent control batch. |
| P4 | `camera.image`, `camera.exposure`, `camera.calibration`, `camera.whiteBalance` | Finish camera image and calibration configuration after control semantics settle. |
| P5 | `diagnostic.*` | Bring manufacturing, self-test, network test, storage test, audio/video test, and KVM test into the reviewed protocol model. |
| P6 | Tooling follow-up | After each generated batch, update runtime generators, CLI/tool surfaces, and conformance cases. |
| P7 | `room.*`, `signage.*` | Adopt application-level room/signage orchestration when product windows are clear. |

High-coverage candidates that may run in parallel when product schedules demand
it:

- `network.wifi`, `network.ip`, `network.ap`
- `firmware.update`, `firmware.updatePolicy`
- `audio.volume`, `audio.input`, `audio.recording`
- `video.stream`, `video.ndi`, `video.rtsp`

## Milestones

| Milestone | Outcome |
|---|---|
| M0: Repository purification | Runtime-specific docs and historical archaeology leave the active main-repo path. |
| M1: Workflow hardening | Business, flow, draft, registry, generated, conformance, and release directories have clear ownership and README guidance. |
| M2: Foundation adoption | P1 device/system drafts are reviewed, adopted, generated, and covered by tests. |
| M3: Media/control adoption | Video, output layout, and camera control batches become generated protocol facts. |
| M4: Firmware and stream confidence | Firmware update, file/stream interaction, and related conformance cases are stable enough for runtime consumption. |
| M5: Product-domain expansion | Room, signage, launcher, and backend integration areas are adopted only after product semantics are clear. |

## Current Rules

- Do not implement from unadopted drafts.
- Do not write generated artifacts by hand.
- Do not bypass `docs/protocol/` and write business semantics directly into
  `registry/`.
- Do not preserve language-specific runtime design inside the main repository.
- Do keep legacy evidence traceable under `docs/legacy-migration/`.
- Do keep runtime repositories bound to explicit AXTP Spec tags or commits.

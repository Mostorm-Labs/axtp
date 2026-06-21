# AXTP Protocol Draft Health

本页是产品和协议维护者查看草案健康度、示例质量和待确认问题密度的报告。它不是 runtime 实现合同；可实现事实仍以 `contract/**`、`specs/**` 和 `conformance/**` 为准。

本页在 source repository 中由脚本生成并校验：

```bash
node tooling/scripts/report-protocol-draft-health.mjs --write docs/product/protocol-draft-health.md
node tooling/scripts/report-protocol-draft-health.mjs --check docs/product/protocol-draft-health.md
```

为避免 release artifact 断链，下方后台草案路径以纯文本显示，不作为 Markdown 链接。

## Summary

| Metric | Count |
|---|---:|
| Draft files | 103 |
| Generated draft files | 9 |
| Generated method/event facts | 55 |
| Method sections | 431 |
| Compact method examples | 431 |
| Method example gaps | 0 |
| JSON examples | 1173 |
| Invalid JSON examples | 0 |
| Generic example hints | 0 |
| REVIEW-ASK | 312 |
| REVIEW-DRAFT | 112 |
| REVIEW-FIX | 0 |
| REVIEW-BLOCKER | 0 |
| TBD after adoption | 7 |

## Domain Health Matrix

| Domain | Priority | Drafts | Generated Drafts | Generated Facts | Methods | Example Coverage | Review Markers | Generic Example Hints | Focus |
|---|---|---:|---:|---:|---:|---:|---|---:|---|
| audio | 旁路高覆盖 / P0 stream | 12 | 2 | 13 | 54 | 54/54 | ASK 29 / DRAFT 5 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| auth | 待排期 | 3 | 0 | 0 | 12 | 12/12 | ASK 6 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| camera | P3/P4 | 7 | 0 | 0 | 40 | 40/40 | ASK 46 / DRAFT 48 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| capability | 待排期 | 1 | 0 | 0 | 4 | 4/4 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| device | P1 | 6 | 1 | 1 | 20 | 20/20 | ASK 18 / DRAFT 13 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| diagnostic | P5 | 10 | 0 | 0 | 39 | 39/39 | ASK 20 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| display | 待排期 | 6 | 0 | 0 | 24 | 24/24 | ASK 12 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| file | 待排期 | 2 | 0 | 0 | 8 | 8/8 | ASK 4 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| firmware | 旁路高覆盖 | 3 | 1 | 6 | 7 | 7/7 | ASK 19 / DRAFT 1 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| input | 待排期 | 5 | 0 | 0 | 20 | 20/20 | ASK 10 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| log | 待排期 | 3 | 0 | 0 | 9 | 9/9 | ASK 6 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| network | 旁路高覆盖 | 6 | 4 | 26 | 24 | 24/24 | ASK 25 / DRAFT 17 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| output | P2b | 1 | 0 | 0 | 3 | 3/3 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| privacy | 待排期 | 3 | 0 | 0 | 10 | 10/10 | ASK 6 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| room | P7 | 5 | 0 | 0 | 20 | 20/20 | ASK 10 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| signage | P7 | 2 | 0 | 0 | 9 | 9/9 | ASK 4 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| software | P7 | 2 | 0 | 0 | 6 | 6/6 | ASK 34 / DRAFT 15 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| storage | 待排期 | 6 | 0 | 0 | 24 | 24/24 | ASK 12 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| stream | P0 data-plane plumbing | 2 | 0 | 0 | 18 | 18/18 | ASK 4 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| system | P1 | 6 | 0 | 0 | 29 | 29/29 | ASK 12 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| video | P0 stream | 12 | 1 | 9 | 51 | 51/51 | ASK 31 / DRAFT 13 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |

## Product Priority Tuning Queue

这张表按产品优先级排序，用于决定下一轮先人工调哪些草案。

| File | Priority | Domain | Methods | Generic Example Hints | Review Markers | Lines |
|---|---|---|---:|---:|---|---:|
| `workspace/protocol/audio/audio.stream.md` | 旁路高覆盖 / P0 stream | audio | 5 | 0 | ASK 9 / DRAFT 5 / FIX 0 / BLOCKER 0 | 1096 |
| `workspace/protocol/video/video.stream.md` | P0 stream | video | 6 | 0 | ASK 6 / DRAFT 5 / FIX 0 / BLOCKER 0 | 1154 |
| `workspace/protocol/video/video.framing.md` | P0 stream | video | 5 | 0 | ASK 5 / DRAFT 8 / FIX 0 / BLOCKER 0 | 871 |
| `workspace/protocol/stream/stream.flowControl.md` | P0 data-plane plumbing | stream | 16 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 1517 |
| `workspace/protocol/audio/audio.recording.md` | 旁路高覆盖 / P0 stream | audio | 9 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 925 |
| `workspace/protocol/video/video.ndi.md` | P0 stream | video | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 561 |
| `workspace/protocol/video/video.rtsp.md` | P0 stream | video | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 557 |
| `workspace/protocol/audio/audio.eq.md` | 旁路高覆盖 / P0 stream | audio | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 538 |
| `workspace/protocol/audio/audio.mixer.md` | 旁路高覆盖 / P0 stream | audio | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 520 |
| `workspace/protocol/video/video.layout.md` | P0 stream | video | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 518 |
| `workspace/protocol/video/video.overlay.md` | P0 stream | video | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 514 |
| `workspace/protocol/audio/audio.playback.md` | 旁路高覆盖 / P0 stream | audio | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 512 |
| `workspace/protocol/audio/audio.routing.md` | 旁路高覆盖 / P0 stream | audio | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 512 |
| `workspace/protocol/video/video.osd.md` | P0 stream | video | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 511 |
| `workspace/protocol/video/video.recording.md` | P0 stream | video | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 511 |
| `workspace/protocol/video/video.encoder.md` | P0 stream | video | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 508 |
| `workspace/protocol/video/video.outputTransform.md` | P0 stream | video | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 507 |
| `workspace/protocol/audio/audio.uac.md` | 旁路高覆盖 / P0 stream | audio | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 506 |
| `workspace/protocol/audio/audio.dante.md` | 旁路高覆盖 / P0 stream | audio | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 502 |
| `workspace/protocol/audio/audio.input.md` | 旁路高覆盖 / P0 stream | audio | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 499 |
| `workspace/protocol/video/video.pip.md` | P0 stream | video | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 499 |
| `workspace/protocol/video/video.scene.md` | P0 stream | video | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 499 |
| `workspace/protocol/audio/audio.output.md` | 旁路高覆盖 / P0 stream | audio | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 498 |
| `workspace/protocol/audio/audio.volume.md` | 旁路高覆盖 / P0 stream | audio | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 496 |
| `workspace/protocol/stream/stream.profile.md` | P0 data-plane plumbing | stream | 2 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 307 |
| `workspace/protocol/device/device.info.md` | P1 | device | 1 | 0 | ASK 4 / DRAFT 1 / FIX 0 / BLOCKER 0 | 505 |
| `workspace/protocol/device/device.enrollment.md` | P1 | device | 3 | 0 | ASK 6 / DRAFT 12 / FIX 0 / BLOCKER 0 | 678 |
| `workspace/protocol/system/system.lifecycle.md` | P1 | system | 9 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 951 |
| `workspace/protocol/system/system.reset.md` | P1 | system | 6 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 643 |
| `workspace/protocol/device/device.button.md` | P1 | device | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 529 |

## Mechanical Example Tuning Queue

这张表按机械示例密度排序。它不是产品优先级，只用于找到模板味最重的草案。

| File | Domain | Methods | Generic Example Hints | Review Markers | Lines |
|---|---|---:|---:|---|---:|
| `workspace/protocol/software/software.config.md` | software | 3 | 0 | ASK 19 / DRAFT 8 / FIX 0 / BLOCKER 0 | 696 |
| `workspace/protocol/firmware/firmware.update.md` | firmware | 4 | 0 | ASK 15 / DRAFT 1 / FIX 0 / BLOCKER 0 | 872 |
| `workspace/protocol/software/software.updatePolicy.md` | software | 3 | 0 | ASK 15 / DRAFT 7 / FIX 0 / BLOCKER 0 | 657 |
| `workspace/protocol/camera/camera.focus.md` | camera | 11 | 0 | ASK 12 / DRAFT 19 / FIX 0 / BLOCKER 0 | 1798 |
| `workspace/protocol/camera/camera.ptz.md` | camera | 7 | 0 | ASK 11 / DRAFT 6 / FIX 0 / BLOCKER 0 | 934 |
| `workspace/protocol/audio/audio.stream.md` | audio | 5 | 0 | ASK 9 / DRAFT 5 / FIX 0 / BLOCKER 0 | 1096 |
| `workspace/protocol/network/network.ip.md` | network | 2 | 0 | ASK 9 / DRAFT 3 / FIX 0 / BLOCKER 0 | 625 |
| `workspace/protocol/camera/camera.image.md` | camera | 4 | 0 | ASK 7 / DRAFT 5 / FIX 0 / BLOCKER 0 | 593 |
| `workspace/protocol/video/video.stream.md` | video | 6 | 0 | ASK 6 / DRAFT 5 / FIX 0 / BLOCKER 0 | 1154 |
| `workspace/protocol/camera/camera.zoom.md` | camera | 6 | 0 | ASK 6 / DRAFT 6 / FIX 0 / BLOCKER 0 | 762 |
| `workspace/protocol/device/device.enrollment.md` | device | 3 | 0 | ASK 6 / DRAFT 12 / FIX 0 / BLOCKER 0 | 678 |
| `workspace/protocol/network/network.wifi.md` | network | 7 | 0 | ASK 5 / DRAFT 9 / FIX 0 / BLOCKER 0 | 1215 |
| `workspace/protocol/video/video.framing.md` | video | 5 | 0 | ASK 5 / DRAFT 8 / FIX 0 / BLOCKER 0 | 871 |
| `workspace/protocol/network/network.interface.md` | network | 2 | 0 | ASK 5 / DRAFT 1 / FIX 0 / BLOCKER 0 | 574 |
| `workspace/protocol/camera/camera.exposure.md` | camera | 4 | 0 | ASK 4 / DRAFT 6 / FIX 0 / BLOCKER 0 | 597 |
| `workspace/protocol/camera/camera.whiteBalance.md` | camera | 4 | 0 | ASK 4 / DRAFT 6 / FIX 0 / BLOCKER 0 | 589 |
| `workspace/protocol/device/device.info.md` | device | 1 | 0 | ASK 4 / DRAFT 1 / FIX 0 / BLOCKER 0 | 505 |
| `workspace/protocol/stream/stream.flowControl.md` | stream | 16 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 1517 |
| `workspace/protocol/network/network.ap.md` | network | 7 | 0 | ASK 2 / DRAFT 4 / FIX 0 / BLOCKER 0 | 1154 |
| `workspace/protocol/system/system.lifecycle.md` | system | 9 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 951 |
| `workspace/protocol/audio/audio.recording.md` | audio | 9 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 925 |
| `workspace/protocol/system/system.reset.md` | system | 6 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 643 |
| `workspace/protocol/file/file.transfer.md` | file | 5 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 612 |
| `workspace/protocol/signage/signage.playlist.md` | signage | 5 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 595 |
| `workspace/protocol/video/video.ndi.md` | video | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 561 |
| `workspace/protocol/video/video.rtsp.md` | video | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 557 |
| `workspace/protocol/audio/audio.eq.md` | audio | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 538 |
| `workspace/protocol/device/device.button.md` | device | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 529 |
| `workspace/protocol/input/input.gpio.md` | input | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 525 |
| `workspace/protocol/auth/auth.permission.md` | auth | 4 | 0 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 522 |

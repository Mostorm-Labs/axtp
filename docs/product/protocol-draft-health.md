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
| Generic example hints | 584 |
| REVIEW-ASK | 312 |
| REVIEW-DRAFT | 112 |
| REVIEW-FIX | 0 |
| REVIEW-BLOCKER | 0 |
| TBD after adoption | 7 |

## Domain Health Matrix

| Domain | Priority | Drafts | Generated Drafts | Generated Facts | Methods | Example Coverage | Review Markers | Generic Example Hints | Focus |
|---|---|---:|---:|---:|---:|---:|---|---:|---|
| audio | 旁路高覆盖 / P0 stream | 12 | 2 | 13 | 54 | 54/54 | ASK 29 / DRAFT 5 / FIX 0 / BLOCKER 0 | 72 | 确认 REVIEW-ASK + 调真实业务示例 |
| auth | 待排期 | 3 | 0 | 0 | 12 | 12/12 | ASK 6 / DRAFT 0 / FIX 0 / BLOCKER 0 | 24 | 确认 REVIEW-ASK + 调真实业务示例 |
| camera | P3/P4 | 7 | 0 | 0 | 40 | 40/40 | ASK 46 / DRAFT 48 / FIX 0 / BLOCKER 0 | 8 | 确认 REVIEW-ASK + 调真实业务示例 |
| capability | 待排期 | 1 | 0 | 0 | 4 | 4/4 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 1 | 确认 REVIEW-ASK + 调真实业务示例 |
| device | P1 | 6 | 1 | 1 | 20 | 20/20 | ASK 18 / DRAFT 13 / FIX 0 / BLOCKER 0 | 25 | 确认 REVIEW-ASK + 调真实业务示例 |
| diagnostic | P5 | 10 | 0 | 0 | 39 | 39/39 | ASK 20 / DRAFT 0 / FIX 0 / BLOCKER 0 | 79 | 确认 REVIEW-ASK + 调真实业务示例 |
| display | 待排期 | 6 | 0 | 0 | 24 | 24/24 | ASK 12 / DRAFT 0 / FIX 0 / BLOCKER 0 | 48 | 确认 REVIEW-ASK + 调真实业务示例 |
| file | 待排期 | 2 | 0 | 0 | 8 | 8/8 | ASK 4 / DRAFT 0 / FIX 0 / BLOCKER 0 | 12 | 确认 REVIEW-ASK + 调真实业务示例 |
| firmware | 旁路高覆盖 | 3 | 1 | 6 | 7 | 7/7 | ASK 19 / DRAFT 1 / FIX 0 / BLOCKER 0 | 8 | 确认 REVIEW-ASK + 调真实业务示例 |
| input | 待排期 | 5 | 0 | 0 | 20 | 20/20 | ASK 10 / DRAFT 0 / FIX 0 / BLOCKER 0 | 40 | 确认 REVIEW-ASK + 调真实业务示例 |
| log | 待排期 | 3 | 0 | 0 | 9 | 9/9 | ASK 6 / DRAFT 0 / FIX 0 / BLOCKER 0 | 16 | 确认 REVIEW-ASK + 调真实业务示例 |
| network | 旁路高覆盖 | 6 | 4 | 26 | 24 | 24/24 | ASK 25 / DRAFT 17 / FIX 0 / BLOCKER 0 | 11 | 确认 REVIEW-ASK + 调真实业务示例 |
| output | P2b | 1 | 0 | 0 | 3 | 3/3 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 7 | 确认 REVIEW-ASK + 调真实业务示例 |
| privacy | 待排期 | 3 | 0 | 0 | 10 | 10/10 | ASK 6 / DRAFT 0 / FIX 0 / BLOCKER 0 | 23 | 确认 REVIEW-ASK + 调真实业务示例 |
| room | P7 | 5 | 0 | 0 | 20 | 20/20 | ASK 10 / DRAFT 0 / FIX 0 / BLOCKER 0 | 40 | 确认 REVIEW-ASK + 调真实业务示例 |
| signage | P7 | 2 | 0 | 0 | 9 | 9/9 | ASK 4 / DRAFT 0 / FIX 0 / BLOCKER 0 | 8 | 确认 REVIEW-ASK + 调真实业务示例 |
| software | P7 | 2 | 0 | 0 | 6 | 6/6 | ASK 34 / DRAFT 15 / FIX 0 / BLOCKER 0 | 2 | 确认 REVIEW-ASK + 调真实业务示例 |
| storage | 待排期 | 6 | 0 | 0 | 24 | 24/24 | ASK 12 / DRAFT 0 / FIX 0 / BLOCKER 0 | 47 | 确认 REVIEW-ASK + 调真实业务示例 |
| stream | P0 data-plane plumbing | 2 | 0 | 0 | 18 | 18/18 | ASK 4 / DRAFT 0 / FIX 0 / BLOCKER 0 | 9 | 确认 REVIEW-ASK + 调真实业务示例 |
| system | P1 | 6 | 0 | 0 | 29 | 29/29 | ASK 12 / DRAFT 0 / FIX 0 / BLOCKER 0 | 37 | 确认 REVIEW-ASK + 调真实业务示例 |
| video | P0 stream | 12 | 1 | 9 | 51 | 51/51 | ASK 31 / DRAFT 13 / FIX 0 / BLOCKER 0 | 67 | 确认 REVIEW-ASK + 调真实业务示例 |

## Product Priority Tuning Queue

这张表按产品优先级排序，用于决定下一轮先人工调哪些草案。

| File | Priority | Domain | Methods | Generic Example Hints | Review Markers | Lines |
|---|---|---|---:|---:|---|---:|
| `workspace/protocol/audio/audio.stream.md` | 旁路高覆盖 / P0 stream | audio | 5 | 0 | ASK 9 / DRAFT 5 / FIX 0 / BLOCKER 0 | 1096 |
| `workspace/protocol/video/video.stream.md` | P0 stream | video | 6 | 0 | ASK 6 / DRAFT 5 / FIX 0 / BLOCKER 0 | 1154 |
| `workspace/protocol/audio/audio.dante.md` | 旁路高覆盖 / P0 stream | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/audio/audio.input.md` | 旁路高覆盖 / P0 stream | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/audio/audio.mixer.md` | 旁路高覆盖 / P0 stream | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/audio/audio.output.md` | 旁路高覆盖 / P0 stream | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/audio/audio.routing.md` | 旁路高覆盖 / P0 stream | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/audio/audio.uac.md` | 旁路高覆盖 / P0 stream | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/video/video.encoder.md` | P0 stream | video | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/video/video.layout.md` | P0 stream | video | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/video/video.osd.md` | P0 stream | video | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/video/video.outputTransform.md` | P0 stream | video | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/video/video.overlay.md` | P0 stream | video | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/video/video.pip.md` | P0 stream | video | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/video/video.scene.md` | P0 stream | video | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/audio/audio.eq.md` | 旁路高覆盖 / P0 stream | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 478 |
| `workspace/protocol/audio/audio.playback.md` | 旁路高覆盖 / P0 stream | audio | 4 | 7 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 478 |
| `workspace/protocol/audio/audio.volume.md` | 旁路高覆盖 / P0 stream | audio | 4 | 7 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 478 |
| `workspace/protocol/video/video.recording.md` | P0 stream | video | 4 | 7 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 478 |
| `workspace/protocol/stream/stream.profile.md` | P0 data-plane plumbing | stream | 2 | 6 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 281 |
| `workspace/protocol/stream/stream.flowControl.md` | P0 data-plane plumbing | stream | 16 | 3 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 1492 |
| `workspace/protocol/audio/audio.recording.md` | 旁路高覆盖 / P0 stream | audio | 9 | 2 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 919 |
| `workspace/protocol/video/video.rtsp.md` | P0 stream | video | 4 | 2 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 549 |
| `workspace/protocol/video/video.ndi.md` | P0 stream | video | 4 | 2 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 543 |
| `workspace/protocol/video/video.framing.md` | P0 stream | video | 5 | 0 | ASK 5 / DRAFT 8 / FIX 0 / BLOCKER 0 | 871 |
| `workspace/protocol/device/device.info.md` | P1 | device | 1 | 0 | ASK 4 / DRAFT 1 / FIX 0 / BLOCKER 0 | 505 |
| `workspace/protocol/device/device.button.md` | P1 | device | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/device/device.indicator.md` | P1 | device | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/device/device.inventory.md` | P1 | device | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/system/system.initialization.md` | P1 | system | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |

## Mechanical Example Tuning Queue

这张表按机械示例密度排序。它不是产品优先级，只用于找到模板味最重的草案。

| File | Domain | Methods | Generic Example Hints | Review Markers | Lines |
|---|---|---:|---:|---|---:|
| `workspace/protocol/audio/audio.dante.md` | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/audio/audio.input.md` | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/audio/audio.mixer.md` | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/audio/audio.output.md` | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/audio/audio.routing.md` | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/audio/audio.uac.md` | audio | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/auth/auth.permission.md` | auth | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/auth/auth.session.md` | auth | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/auth/auth.token.md` | auth | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/camera/camera.calibration.md` | camera | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/device/device.button.md` | device | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/device/device.indicator.md` | device | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/device/device.inventory.md` | device | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/diagnostic/diagnostic.audioTest.md` | diagnostic | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/diagnostic/diagnostic.calibration.md` | diagnostic | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/diagnostic/diagnostic.inputTest.md` | diagnostic | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/diagnostic/diagnostic.kvmTest.md` | diagnostic | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/diagnostic/diagnostic.manufacturing.md` | diagnostic | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/diagnostic/diagnostic.networkTest.md` | diagnostic | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/diagnostic/diagnostic.selfTest.md` | diagnostic | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/diagnostic/diagnostic.storageTest.md` | diagnostic | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/diagnostic/diagnostic.videoTest.md` | diagnostic | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/display/display.backlight.md` | display | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/display/display.brightness.md` | display | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/display/display.color.md` | display | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/display/display.input.md` | display | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/display/display.output.md` | display | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/display/display.power.md` | display | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/input/input.gpio.md` | input | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |
| `workspace/protocol/input/input.hid.md` | input | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 480 |

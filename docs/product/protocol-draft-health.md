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
| Generic example hints | 647 |
| REVIEW-ASK | 312 |
| REVIEW-DRAFT | 112 |
| REVIEW-FIX | 0 |
| REVIEW-BLOCKER | 0 |
| TBD after adoption | 7 |

## Domain Health Matrix

| Domain | Drafts | Generated Drafts | Generated Facts | Methods | Example Coverage | Review Markers | Generic Example Hints | Focus |
|---|---:|---:|---:|---:|---:|---|---:|---|
| audio | 12 | 2 | 13 | 54 | 54/54 | ASK 29 / DRAFT 5 / FIX 0 / BLOCKER 0 | 81 | 确认 REVIEW-ASK + 调真实业务示例 |
| auth | 3 | 0 | 0 | 12 | 12/12 | ASK 6 / DRAFT 0 / FIX 0 / BLOCKER 0 | 24 | 确认 REVIEW-ASK + 调真实业务示例 |
| camera | 7 | 0 | 0 | 40 | 40/40 | ASK 46 / DRAFT 48 / FIX 0 / BLOCKER 0 | 8 | 确认 REVIEW-ASK + 调真实业务示例 |
| capability | 1 | 0 | 0 | 4 | 4/4 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 13 | 确认 REVIEW-ASK + 调真实业务示例 |
| device | 6 | 1 | 1 | 20 | 20/20 | ASK 18 / DRAFT 13 / FIX 0 / BLOCKER 0 | 37 | 确认 REVIEW-ASK + 调真实业务示例 |
| diagnostic | 10 | 0 | 0 | 39 | 39/39 | ASK 20 / DRAFT 0 / FIX 0 / BLOCKER 0 | 79 | 确认 REVIEW-ASK + 调真实业务示例 |
| display | 6 | 0 | 0 | 24 | 24/24 | ASK 12 / DRAFT 0 / FIX 0 / BLOCKER 0 | 48 | 确认 REVIEW-ASK + 调真实业务示例 |
| file | 2 | 0 | 0 | 8 | 8/8 | ASK 4 / DRAFT 0 / FIX 0 / BLOCKER 0 | 12 | 确认 REVIEW-ASK + 调真实业务示例 |
| firmware | 3 | 1 | 6 | 7 | 7/7 | ASK 19 / DRAFT 1 / FIX 0 / BLOCKER 0 | 8 | 确认 REVIEW-ASK + 调真实业务示例 |
| input | 5 | 0 | 0 | 20 | 20/20 | ASK 10 / DRAFT 0 / FIX 0 / BLOCKER 0 | 40 | 确认 REVIEW-ASK + 调真实业务示例 |
| log | 3 | 0 | 0 | 9 | 9/9 | ASK 6 / DRAFT 0 / FIX 0 / BLOCKER 0 | 16 | 确认 REVIEW-ASK + 调真实业务示例 |
| network | 6 | 4 | 26 | 24 | 24/24 | ASK 25 / DRAFT 17 / FIX 0 / BLOCKER 0 | 11 | 确认 REVIEW-ASK + 调真实业务示例 |
| output | 1 | 0 | 0 | 3 | 3/3 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 7 | 确认 REVIEW-ASK + 调真实业务示例 |
| privacy | 3 | 0 | 0 | 10 | 10/10 | ASK 6 / DRAFT 0 / FIX 0 / BLOCKER 0 | 23 | 确认 REVIEW-ASK + 调真实业务示例 |
| room | 5 | 0 | 0 | 20 | 20/20 | ASK 10 / DRAFT 0 / FIX 0 / BLOCKER 0 | 40 | 确认 REVIEW-ASK + 调真实业务示例 |
| signage | 2 | 0 | 0 | 9 | 9/9 | ASK 4 / DRAFT 0 / FIX 0 / BLOCKER 0 | 17 | 确认 REVIEW-ASK + 调真实业务示例 |
| software | 2 | 0 | 0 | 6 | 6/6 | ASK 34 / DRAFT 15 / FIX 0 / BLOCKER 0 | 2 | 确认 REVIEW-ASK + 调真实业务示例 |
| storage | 6 | 0 | 0 | 24 | 24/24 | ASK 12 / DRAFT 0 / FIX 0 / BLOCKER 0 | 47 | 确认 REVIEW-ASK + 调真实业务示例 |
| stream | 2 | 0 | 0 | 18 | 18/18 | ASK 4 / DRAFT 0 / FIX 0 / BLOCKER 0 | 9 | 确认 REVIEW-ASK + 调真实业务示例 |
| system | 6 | 0 | 0 | 29 | 29/29 | ASK 12 / DRAFT 0 / FIX 0 / BLOCKER 0 | 46 | 确认 REVIEW-ASK + 调真实业务示例 |
| video | 12 | 1 | 9 | 51 | 51/51 | ASK 31 / DRAFT 13 / FIX 0 / BLOCKER 0 | 79 | 确认 REVIEW-ASK + 调真实业务示例 |

## Example Tuning Queue

这些文件不是错误；它们只是含有较多机械示例或未决标记，适合下一轮人工把示例改得更贴近真实业务。

| File | Domain | Methods | Generic Example Hints | Review Markers | Lines |
|---|---|---:|---:|---|---:|
| `workspace/protocol/capability/capability.registry.md` | capability | 4 | 13 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 486 |
| `workspace/protocol/device/device.childDevice.md` | device | 4 | 13 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 486 |
| `workspace/protocol/system/system.lifecycle.md` | system | 9 | 11 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 911 |
| `workspace/protocol/audio/audio.recording.md` | audio | 9 | 11 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 907 |
| `workspace/protocol/signage/signage.playlist.md` | signage | 5 | 10 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 561 |
| `workspace/protocol/video/video.ndi.md` | video | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 531 |
| `workspace/protocol/video/video.rtsp.md` | video | 4 | 8 | ASK 2 / DRAFT 0 / FIX 0 / BLOCKER 0 | 531 |
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

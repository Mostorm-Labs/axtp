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
| JSON examples | 1133 |
| Invalid JSON examples | 0 |
| Generic example hints | 0 |
| REVIEW-ASK | 111 |
| REVIEW-DRAFT | 114 |
| REVIEW-FIX | 0 |
| REVIEW-BLOCKER | 0 |
| TBD after adoption | 7 |

## Domain Health Matrix

| Domain | Priority | Drafts | Generated Drafts | Generated Facts | Methods | Example Coverage | Review Markers | Generic Example Hints | Focus |
|---|---|---:|---:|---:|---:|---:|---|---:|---|
| audio | 旁路高覆盖 / P0 stream | 12 | 2 | 13 | 54 | 54/54 | ASK 3 / DRAFT 5 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| auth | 待排期 | 3 | 0 | 0 | 12 | 12/12 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| camera | P3/P4 | 7 | 0 | 0 | 40 | 40/40 | ASK 37 / DRAFT 49 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| capability | 待排期 | 1 | 0 | 0 | 4 | 4/4 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| device | P1 | 6 | 1 | 1 | 20 | 20/20 | ASK 9 / DRAFT 13 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| diagnostic | P5 | 10 | 0 | 0 | 39 | 39/39 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| display | 待排期 | 6 | 0 | 0 | 24 | 24/24 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| file | 待排期 | 2 | 0 | 0 | 8 | 8/8 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| firmware | 旁路高覆盖 | 3 | 1 | 6 | 7 | 7/7 | ASK 15 / DRAFT 1 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| input | 待排期 | 5 | 0 | 0 | 20 | 20/20 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| log | 待排期 | 3 | 0 | 0 | 9 | 9/9 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| network | 旁路高覆盖 | 6 | 4 | 26 | 24 | 24/24 | ASK 15 / DRAFT 18 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| output | P2b | 1 | 0 | 0 | 3 | 3/3 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| privacy | 待排期 | 3 | 0 | 0 | 10 | 10/10 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| room | P7 | 5 | 0 | 0 | 20 | 20/20 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| signage | P7 | 2 | 0 | 0 | 9 | 9/9 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| software | P7 | 2 | 0 | 0 | 6 | 6/6 | ASK 22 / DRAFT 15 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |
| storage | 待排期 | 6 | 0 | 0 | 24 | 24/24 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| stream | P0 data-plane plumbing | 2 | 0 | 0 | 18 | 18/18 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| system | P1 | 6 | 0 | 0 | 29 | 29/29 | ASK 0 / DRAFT 0 / FIX 0 / BLOCKER 0 | 0 | 可排采纳评审 |
| video | P0 stream | 12 | 1 | 9 | 51 | 51/51 | ASK 10 / DRAFT 13 / FIX 0 / BLOCKER 0 | 0 | 确认 REVIEW-ASK |

## Product Priority Tuning Queue

这张表按产品优先级排序，用于决定下一轮先人工调哪些草案。

| File | Priority | Domain | Methods | Generic Example Hints | Review Markers | Lines |
|---|---|---|---:|---:|---|---:|
| `workspace/protocol/video/video.stream.md` | P0 stream | video | 6 | 0 | ASK 5 / DRAFT 5 / FIX 0 / BLOCKER 0 | 958 |
| `workspace/protocol/audio/audio.stream.md` | 旁路高覆盖 / P0 stream | audio | 5 | 0 | ASK 3 / DRAFT 5 / FIX 0 / BLOCKER 0 | 921 |
| `workspace/protocol/video/video.framing.md` | P0 stream | video | 5 | 0 | ASK 5 / DRAFT 8 / FIX 0 / BLOCKER 0 | 871 |
| `workspace/protocol/device/device.info.md` | P1 | device | 1 | 0 | ASK 3 / DRAFT 1 / FIX 0 / BLOCKER 0 | 505 |
| `workspace/protocol/device/device.enrollment.md` | P1 | device | 3 | 0 | ASK 6 / DRAFT 12 / FIX 0 / BLOCKER 0 | 678 |
| `workspace/protocol/firmware/firmware.update.md` | 旁路高覆盖 | firmware | 4 | 0 | ASK 15 / DRAFT 1 / FIX 0 / BLOCKER 0 | 872 |
| `workspace/protocol/network/network.ip.md` | 旁路高覆盖 | network | 2 | 0 | ASK 8 / DRAFT 3 / FIX 0 / BLOCKER 0 | 625 |
| `workspace/protocol/network/network.interface.md` | 旁路高覆盖 | network | 2 | 0 | ASK 4 / DRAFT 1 / FIX 0 / BLOCKER 0 | 574 |
| `workspace/protocol/network/network.wifi.md` | 旁路高覆盖 | network | 7 | 0 | ASK 3 / DRAFT 9 / FIX 0 / BLOCKER 0 | 1023 |
| `workspace/protocol/camera/camera.ptz.md` | P3/P4 | camera | 7 | 0 | ASK 11 / DRAFT 6 / FIX 0 / BLOCKER 0 | 934 |
| `workspace/protocol/camera/camera.image.md` | P3/P4 | camera | 4 | 0 | ASK 7 / DRAFT 5 / FIX 0 / BLOCKER 0 | 593 |
| `workspace/protocol/camera/camera.zoom.md` | P3/P4 | camera | 6 | 0 | ASK 6 / DRAFT 6 / FIX 0 / BLOCKER 0 | 762 |
| `workspace/protocol/camera/camera.focus.md` | P3/P4 | camera | 11 | 0 | ASK 5 / DRAFT 20 / FIX 0 / BLOCKER 0 | 1598 |
| `workspace/protocol/camera/camera.exposure.md` | P3/P4 | camera | 4 | 0 | ASK 4 / DRAFT 6 / FIX 0 / BLOCKER 0 | 597 |
| `workspace/protocol/camera/camera.whiteBalance.md` | P3/P4 | camera | 4 | 0 | ASK 4 / DRAFT 6 / FIX 0 / BLOCKER 0 | 589 |
| `workspace/protocol/software/software.config.md` | P7 | software | 3 | 0 | ASK 12 / DRAFT 8 / FIX 0 / BLOCKER 0 | 696 |
| `workspace/protocol/software/software.updatePolicy.md` | P7 | software | 3 | 0 | ASK 10 / DRAFT 7 / FIX 0 / BLOCKER 0 | 657 |

## Mechanical Example Tuning Queue

这张表按机械示例密度排序。它不是产品优先级，只用于找到模板味最重的草案。

| File | Domain | Methods | Generic Example Hints | Review Markers | Lines |
|---|---|---:|---:|---|---:|
| `workspace/protocol/firmware/firmware.update.md` | firmware | 4 | 0 | ASK 15 / DRAFT 1 / FIX 0 / BLOCKER 0 | 872 |
| `workspace/protocol/software/software.config.md` | software | 3 | 0 | ASK 12 / DRAFT 8 / FIX 0 / BLOCKER 0 | 696 |
| `workspace/protocol/camera/camera.ptz.md` | camera | 7 | 0 | ASK 11 / DRAFT 6 / FIX 0 / BLOCKER 0 | 934 |
| `workspace/protocol/software/software.updatePolicy.md` | software | 3 | 0 | ASK 10 / DRAFT 7 / FIX 0 / BLOCKER 0 | 657 |
| `workspace/protocol/network/network.ip.md` | network | 2 | 0 | ASK 8 / DRAFT 3 / FIX 0 / BLOCKER 0 | 625 |
| `workspace/protocol/camera/camera.image.md` | camera | 4 | 0 | ASK 7 / DRAFT 5 / FIX 0 / BLOCKER 0 | 593 |
| `workspace/protocol/camera/camera.zoom.md` | camera | 6 | 0 | ASK 6 / DRAFT 6 / FIX 0 / BLOCKER 0 | 762 |
| `workspace/protocol/device/device.enrollment.md` | device | 3 | 0 | ASK 6 / DRAFT 12 / FIX 0 / BLOCKER 0 | 678 |
| `workspace/protocol/camera/camera.focus.md` | camera | 11 | 0 | ASK 5 / DRAFT 20 / FIX 0 / BLOCKER 0 | 1598 |
| `workspace/protocol/video/video.stream.md` | video | 6 | 0 | ASK 5 / DRAFT 5 / FIX 0 / BLOCKER 0 | 958 |
| `workspace/protocol/video/video.framing.md` | video | 5 | 0 | ASK 5 / DRAFT 8 / FIX 0 / BLOCKER 0 | 871 |
| `workspace/protocol/camera/camera.exposure.md` | camera | 4 | 0 | ASK 4 / DRAFT 6 / FIX 0 / BLOCKER 0 | 597 |
| `workspace/protocol/camera/camera.whiteBalance.md` | camera | 4 | 0 | ASK 4 / DRAFT 6 / FIX 0 / BLOCKER 0 | 589 |
| `workspace/protocol/network/network.interface.md` | network | 2 | 0 | ASK 4 / DRAFT 1 / FIX 0 / BLOCKER 0 | 574 |
| `workspace/protocol/network/network.wifi.md` | network | 7 | 0 | ASK 3 / DRAFT 9 / FIX 0 / BLOCKER 0 | 1023 |
| `workspace/protocol/audio/audio.stream.md` | audio | 5 | 0 | ASK 3 / DRAFT 5 / FIX 0 / BLOCKER 0 | 921 |
| `workspace/protocol/device/device.info.md` | device | 1 | 0 | ASK 3 / DRAFT 1 / FIX 0 / BLOCKER 0 | 505 |

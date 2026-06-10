# NA20/NT10 Device Streaming Audio And Video Protocol Interaction Flow

> Status: flow design
> Scope: NA20 receiver USB-HID media bridge, NT10 wireless transmitter, and host-side audio/video playback
> Source inputs: `docs/business/device-streaming.md`, `docs/flows/cast-rxtx-paring.md`, `docs/protocol/video/video.stream.md`, `docs/protocol/stream/stream.flowControl.md`, `docs/protocol/audio/audio.stream.md`
> Protocol lifecycle: Stage 10 `plan-protocol-flow`

本文根据 NA20/NT10 投屏设备业务需求，输出音频和视频的交互流程方案。当前 `docs/business/device-streaming.md` 只描述了目标和边界，尚未包含可读取的业务流程图或详细 story；因此本文以配对流程为前置条件，并根据现有 `stream` / `video.stream` / `audio.stream` 草案推导投屏阶段的协议交互。

本文不是最终协议事实源。当前 generated 协议只采纳了 AXTP core、STREAM 数据面和少量业务事实；视频流、音频实时媒体流、投屏会话状态仍需要后续 Stage 20 `draft-business-protocol` 细化和采纳。

Flow 文档负责描述业务场景和交互步骤、判断每一步协议覆盖状态、识别协议缺口，并将缺口路由到 candidate `domain.feature`。Flow 文档不负责定义完整 method / event / schema / capability，不分配 methodId / eventId / errorCode / fieldId，也不能替代 `docs/protocol/<domain>/<feature>.md`。

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| Flow 目标 | NA20 通过 USB HID 向 Host 暴露 NT10 无线投屏产生的 H.264 视频和 AAC 透传音频，Host 打开两路 STREAM 并完成同步播放。 |
| 当前协议覆盖 | partial |
| 涉及 domain.feature | `video.stream`, `audio.stream`, `stream.flowControl`; pairing 前置依赖 `network.ap` / `network.wifi` |
| 已有 adopted/generated | AXTP Standard Framed transport、Core STREAM payload、STREAM error codes。 |
| 缺口 | `video.stream` / `audio.stream` 业务 methods/events 未 generated；H.264 Annex-B、AAC transportFormat、syncGroupId、source proxy control 需草案采纳。 |
| 是否需要新增协议草案 | yes，已有草案需 review/adopt。 |
| 是否涉及 Legacy | yes，NA20/NT10 内部无线投屏实现只作为设备实现证据。 |
| 是否涉及 STREAM | yes |
| 下一步 | draft protocol / adopt draft；优先采纳 `video.stream` 和 `audio.stream` 的 P0 媒体桥能力。 |

## 1. Story Summary

| Item | Content |
|---|---|
| User goal | 用户将 NA20 作为投屏接收端接入上位机，将 NT10 作为投屏发射端接入源端；开始投屏后，上位机能从 NA20 的 USB HID 通道同时接收并播放来自 NT10 的 H.264 视频和 AAC 透传音频。 |
| Trigger | NA20/NT10 已完成配对，NT10 接入 NA20 后自动开始无线投屏推流；Host 发现 NA20 的 `wireless_cast` source 后打开音视频 STREAM。 |
| Success result | NT10 通过 Wi-Fi 将音视频推到 NA20；NA20 将视频和音频分成独立 AXTP STREAM 传给上位机；上位机完成解码、同步和播放。 |
| Primary actors | User, host streaming app/service, NA20 AXTP server, NA20 cast receiver/media bridge, NT10 cast transmitter, host media player |
| Product scope | NA20 receiver AP + USB HID media bridge；NT10 Wi-Fi STA transmitter；上位机播放软件。 |

## 2. Source Observations

### 2.1 UI / Prototype

| Screen or control | Observed behavior | Protocol relevance |
|---|---|---|
| USB 插入行为 | 用户将 NA20 插到上位机，作为投屏接收设备。 | 上位机需要建立到 NA20 的 `AXTP-USB-HID` 会话。 |
| NT10 发射端 | 用户将 NT10 插到源端 PC，作为投屏发射端。 | NT10 接入 NA20 后自动开始向 NA20 推送无线投屏媒体流；NT10 到 NA20 的内部控制由设备实现决定。 |
| 开始投屏 | NT10 接入 NA20 后自动开始无线推流；Host 不需要先发“开始投屏”命令才能让 NT10 推流。 | Host 侧流程从发现 `wireless_cast` source、查询能力并打开 video/audio stream 开始；可选 source proxy control 不作为 MVP 前置条件。 |
| 上位机播放 | NA20 通过 USB HID 将音视频数据给上位机，由上位机播放。 | 需要 NA20 暴露视频 streamId、音频 streamId、时间戳/同步组和运行状态。 |
| 业务流程图 | 当前文件未包含实际流程图。 | 本文使用 `[REVIEW-ASK]` 标出仍需产品确认的触发、停止、AAC transportFormat 和断连细节。 |

### 2.2 Requirement Notes

- NA20 是投屏接收端，同时是 Wi-Fi AP 端点和 USB HID 设备。
- NT10 是投屏发射端，作为 Wi-Fi STA 连接 NA20，向 NA20 推送 H.264 + AAC 音视频流。
- NA20 不在本流程中本地播放；它作为媒体桥，将收到的音视频经 USB HID 给上位机。
- 视频优先按 `video.stream` 草案建模，数据面走 AXTP `PayloadType = STREAM`。
- 音频采用 AAC 透传方案，通过 `audio.stream` 建模；不采用 NA20 解码 PCM 后再给上位机作为本场景 MVP。
- 上位机 MVP 同时从 NA20 接收视频和音频；不按 audio-only 范围设计。

### 2.3 Device / System State Observations

| State | Meaning | Protocol relevance |
|---|---|---|
| pairing completed | NA20/NT10 已完成 AP/Wi-Fi 配对。 | precondition；详见 `cast-rxtx-paring.md`。 |
| NA20 session ready | Host 与 NA20 已建立 Standard Framed AXTP session。 | generated；RPC + STREAM 前置条件。 |
| wireless_cast source available | NA20 已检测到 NT10 无线投屏源。 | draft query/event；`video.getStreamCapabilities` 或 source state。 |
| video opening / streaming / closed | NA20 正在准备、发送或停止视频 stream。 | draft query/event；`video.openStream`, `video.streamStateChanged`。 |
| audio opening / streaming / closed | NA20 正在准备、发送或停止音频 stream。 | draft query/event；`audio.openStream`, `audio.streamStateChanged`。 |
| sync group ready | 视频和音频使用同一 `syncGroupId` / `castSessionId`。 | result fields；Host 绑定播放器时间线。 |
| video seq gap | Host 检测到视频 STREAM seq gap 或解码失败。 | event/action；`video.requestKeyFrame` draft。 |
| audio seq gap | Host 检测到音频缺包。 | runtime handling；实时音频优先静音补偿或丢弃旧 chunk。 |
| source disconnected | NT10 断开或无线投屏停止。 | event；video/audio state changed，Host 释放播放器资源。 |

## 3. Assumptions And Non-Goals

| Type | Item | Status |
|---|---|---|
| Assumption | NA20/NT10 配对流程已经完成，NT10 已可连接 NA20 AP；配对详见 `docs/flows/cast-rxtx-paring.md`。 | `[REVIEW-DRAFT]` |
| Assumption | 上位机至少与 NA20 建立一条 AXTP-over-USB-HID 会话；主流程不要求 Host 直接控制 NT10 开始推流。 | `[REVIEW-DRAFT]` |
| Assumption | NA20 将音频和视频拆成两个独立 `streamId`，通过同一 AXTP session 多路复用。 | `[REVIEW-DRAFT]` |
| Assumption | 音视频同步通过共同的 `castSessionId` / `syncGroupId` 完成；播放主时间轴使用 NT10 源媒体 `timestampUs`。 | `[REVIEW-OK]` |
| Assumption | 实时投屏低延迟优先，视频丢包优先请求关键帧，音频丢包优先丢弃过旧 chunk，不默认重传历史媒体数据。 | `[REVIEW-DRAFT]` |
| Decision | NA20 到上位机的音频格式采用 AAC 透传方案；AAC 具体封装如 ADTS/LATM/raw AAC 由 `audio.stream` 草案继续确认。 | `[REVIEW-OK]` |
| Decision | NA20 到上位机的视频 H.264 使用 Annex-B，SPS/PPS 随关键帧发送。 | `[REVIEW-OK]` |
| Decision | NT10 开始/停止无线推流可以做成可选 AXTP source proxy control，由 Host 通过 NA20 触发；NA20 与 NT10 之间实现看设备。 | `[REVIEW-OK]` |
| Non-goal | 不设计 NT10 到 NA20 的私有 Wi-Fi 媒体协议、无线丢包恢复或 Wi-Fi 加密细节。 | `[REVIEW-OK]` |
| Non-goal | 不设计设备升级、AP/Wi-Fi 配对、UI 文案或上位机播放器内部渲染实现。 | `[REVIEW-OK]` |
| Non-goal | 不把 H.264/AAC 大数据塞进普通 RPC response；媒体数据必须走 STREAM 数据面。 | `[REVIEW-OK]` |

## 4. Protocol Coverage

| Need | Coverage state | AXTP protocol | Evidence | Next action |
|---|---|---|---|---|
| 上位机与 NA20 建立 USB HID 会话 | generated | `AXTP-USB-HID`, `PayloadType = RPC/STREAM` | `docs/generated/protocol.md`, `docs/specs/1-core/07-Stream-Data-Plane.md` | 可按 AXTP core 实现。 |
| 通过 USB HID 承载连续音视频数据 | generated | STREAM 16B header: `streamId`, `seqId`, `cursor` | `docs/generated/protocol.md`, `docs/specs/1-core/07-Stream-Data-Plane.md` | 可作为数据面基础。 |
| 查询 NA20 是否有投屏输入源和媒体桥能力 | draft | `video.stream` source `wireless_cast`, optional source proxy control | `docs/business/device-streaming.md`, `docs/protocol/video/video.stream.md` | 不新增独立 `cast.streaming`；通过 video/audio state 聚合投屏会话。 |
| 打开 H.264 视频到上位机 | draft | `video.getStreamCapabilities`, `video.openStream`, `video.closeStream`, `video.streamStateChanged` | `docs/protocol/video/video.stream.md` | 采纳 `video.stream` 或按本场景补齐 source/sync 字段。 |
| 视频数据分片、帧边界、关键帧和丢包重同步 | draft | `VideoChunkHeaderV1`, `video.requestKeyFrame`, `media.video` profile | `docs/protocol/video/video.stream.md` | H.264 Annex-B、SPS/PPS 随关键帧需采纳固化。 |
| 打开 AAC 透传音频到上位机 | draft | Candidate `audio.stream`, `audio.openStream`, `audio.closeStream`, `audio.streamStateChanged` | `docs/protocol/audio/audio.stream.md`, `docs/protocol/stream/stream.flowControl.md` | 采纳前确认 AAC transportFormat。 |
| 音频数据分片、采样时间戳和丢包统计 | draft | `media.audio` / `realtime_audio` stream profile, candidate `AudioChunkHeaderV1` | `docs/protocol/audio/audio.stream.md`, `docs/protocol/stream/stream.flowControl.md` | 确认 AAC frame/chunk envelope。 |
| 音视频同步 | draft | `syncGroupId`, `castSessionId`, `clockDomain`, `receiverClockDomain`, `timestampUs` fields | `docs/protocol/video/video.stream.md`, `docs/protocol/audio/audio.stream.md` | 采纳时统一 video/audio schema。 |
| 查询/订阅整体投屏状态 | draft | Host 聚合 `video.streamStateChanged` + `audio.streamStateChanged`，可选 source state | `docs/protocol/video/video.stream.md`, `docs/protocol/audio/audio.stream.md` | 不新增 `cast.streaming`；聚合展示是 local-only。 |
| 上位机本地解码、jitter buffer、A/V sync 和播放 | local-only | Host media player/runtime | business implementation | 不进入协议；测试验收需覆盖。 |

Coverage 取值：

| Coverage | Meaning |
|---|---|
| generated | 已进入 `docs/generated/**` 或 protocol IR，可作为实现合同视图。 |
| adopted | 已写入 registry YAML，但当前 flow 未直接引用 generated 输出。 |
| draft | 已有 `docs/protocol/**` 草案，但尚未 adopted/generated。 |
| missing | 没有合适的 adopted/generated/draft 协议覆盖。 |
| local-only | App/UI/runtime 本地逻辑，不需要 AXTP 协议。 |
| non-protocol | 产品规则、人工流程、运营策略或文档说明，不进入协议。 |

## 5. End-To-End Sequence

```mermaid
sequenceDiagram
    participant User
    participant Host as Host Streaming App
    participant Player as Host Media Player
    participant NA20 as NA20 AXTP Server
    participant Bridge as NA20 Cast Receiver / Media Bridge
    participant NT10 as NT10 Cast Transmitter

    User->>Host: Insert NA20 and start streaming flow
    Host->>NA20: Open AXTP-USB-HID session
    NA20-->>Host: Session accepted / identified

    Note over Host,NT10: Pairing is already completed by cast-rxtx-paring flow.
    NT10->>Bridge: Auto-start wireless cast after connecting to NA20 (H.264 + AAC)
    Bridge-->>NA20: Incoming cast session ready

    Host->>NA20: Query cast/video/audio capabilities
    NA20-->>Host: wireless_cast source, supported codecs, profiles, limits

    Host->>NA20: video.openStream(source=wireless_cast, codec=h264, streamProfile=media.video)
    NA20->>Bridge: Bind video producer to stream context
    NA20-->>Host: videoStreamId, syncGroupId, timestamp clock, state=opening

    Host->>NA20: audio.openStream(source=wireless_cast_audio, codec=aac, profile=media.audio)
    NA20->>Bridge: Bind audio producer to stream context
    NA20-->>Host: audioStreamId, syncGroupId, timestamp clock, state=opening

    NA20-->>Host: video.streamStateChanged(streaming)
    NA20-->>Host: audio.streamStateChanged(streaming)
    Host->>Player: Create decoders and A/V sync group

    loop realtime media
        Bridge->>NA20: Demux H.264 video frame
        NA20-->>Host: STREAM(videoStreamId, seqId, cursor=timestampUs, VideoChunkHeaderV1 + H.264 bytes)
        Bridge->>NA20: Demux AAC passthrough audio chunk
        NA20-->>Host: STREAM(audioStreamId, seqId, cursor=timestampUs, AudioChunkHeaderV1 + AAC bytes)
        Host->>Player: Decode, jitter-buffer, sync, render/play
    end

    User->>Host: Stop streaming
    Host->>NA20: audio.closeStream(audioStreamId)
    NA20-->>Host: audio stream closed
    Host->>NA20: video.closeStream(videoStreamId)
    NA20-->>Host: video.streamStateChanged(closed)
    Host->>Player: Release decoders and buffers
```

## 6. Interaction Steps

| Step | Actor | Action | Capability / precondition | Protocol call/event | Payload fields | Result / state change | Coverage | Error / fallback |
|---:|---|---|---|---|---|---|---|---|
| 1 | Host | 建立到 NA20 的控制和数据会话。 | NA20 connected, Standard Framed supported。 | `AXTP-USB-HID` session | session fields | Host 可调用 NA20 RPC 并接收 STREAM。 | generated | HID 打开失败则提示 NA20 未连接或被占用。 |
| 2 | Host | 确认配对已经完成。 | NA20/NT10 pairing done。 | local-only / previous flow result | pair record, source availability | 进入投屏媒体阶段。 | local-only | 未配对时跳转配对 flow。 |
| 3 | Host | 查询视频能力和无线投屏源。 | `video.stream` supported。 | `video.getStreamCapabilities` | source selector, codecs/profile selector | 期望 `sources[]` 包含 `wireless_cast`，`codecs` 包含 `h264`。 | draft | source 不存在时等待 NT10 开始推流或提示未检测到投屏源。 |
| 4 | Host | 查询音频实时输出能力。 | `audio.stream` supported。 | `audio.getStreamCapabilities` | source selector, codecs/profile selector | 期望 `source=wireless_cast_audio`、`codec=aac`、`streamProfile=media.audio`。 | draft | 不支持 AAC 透传时，本场景 MVP 不应误报 AV 可用。 |
| 5 | Host | 打开视频流。 | H.264 source capability available。 | `video.openStream` | source, codec=h264, streamProfile, syncGroupId optional | NA20 返回 `videoStreamId`、cursorUnit、state=opening。 | draft | codec/resolution 不支持时按能力重试或降级。 |
| 6 | Host | 打开音频流。 | AAC source capability available。 | `audio.openStream` | source, codec=aac, transportFormat, sampleRate, channels, syncGroupId | NA20 返回 `audioStreamId`、syncGroupId、clock domains。 | draft | 音频能力缺失时判定 AV MVP 不完整，除非产品定义 video-only 降级。 |
| 7 | NA20 | 视频进入 streaming 状态。 | Video stream producer ready。 | `video.streamStateChanged` | streamId, state, codec, resolution, syncGroupId | Host 创建 H.264 decoder。 | draft | 启动失败返回 media stream start failure。 |
| 8 | NA20 | 音频进入 streaming 状态。 | Audio stream producer ready。 | `audio.streamStateChanged` | streamId, state, codec=aac, sampleRate, channels, syncGroupId | Host 创建 AAC decoder/playback pipeline。 | draft | 启动失败需区分 source 不可用、codec 不支持、音频设备忙。 |
| 9 | NA20 | 发送视频数据。 | video stream opened。 | PayloadType `STREAM` | `streamId`, `seqId`, `cursor`, `VideoChunkHeaderV1`, H.264 bytes | Host 按 `seqId` 检测丢包，按 frame header 重组帧。 | draft | Core STREAM generated；视频 chunk header 和 profile binding 仍是 draft。 |
| 10 | NA20 | 发送音频数据。 | audio stream opened。 | PayloadType `STREAM` | `streamId`, `seqId`, `cursor`, `AudioChunkHeaderV1`, AAC bytes | Host 按 timestamp/sampleIndex 放入音频 jitter buffer。 | draft | Core STREAM generated；音频 chunk header 和 profile binding 仍是 draft。 |
| 11 | Host / Player | 音频与视频同步播放。 | video/audio share syncGroupId。 | local-only using stream metadata | syncGroupId, timestampUs, receiverClockDomain | Player 做 A/V sync、缓冲控制和漂移修正。 | local-only | 缺少源媒体时间戳或 clock mapping 时需草案补字段。 |
| 12 | Host / NA20 | 统计和状态同步。 | stats event supported。 | `video.streamStatsReported`, `video.getStreamState`, audio stats candidates | framesSent, droppedFrames, bitrate, nextSeqId, cursor | Host 展示诊断或调整 buffer。 | draft | 事件缺失时可低频轮询 state。 |
| 13 | Host | 正常停止音频。 | audio stream active。 | `audio.closeStream` | streamId, drain optional | NA20 停止音频 producer 并释放 stream context。 | draft | 异常释放使用 stream abort，同时上报音频状态失败。 |
| 14 | Host | 正常停止视频。 | video stream active。 | `video.closeStream` | streamId, drain optional | NA20 停止视频 producer 并释放 stream context。 | draft | 异常释放使用 stream abort，但不作为正常关闭入口。 |
| 15 | NA20 | NT10 断连或无线 source 停止。 | source state changes。 | `video.streamStateChanged`, `audio.streamStateChanged`, optional source event | failed/closed reason | Host 释放播放器资源并提示 source disconnected。 | draft | 是否保留 streamId 等待重连需产品确认。 |

## 7. State Changes And Events

| State change | Trigger | Event needed | Payload | Client handling | Coverage |
|---|---|---|---|---|---|
| wireless_cast source available | NT10 接入 NA20 并开始推流 | optional source state event | source id, codecs, session id | Host 查询能力并打开 video/audio stream。 | draft |
| video opening / streaming / closed | Host 打开或关闭视频流，或 source 断开 | `video.streamStateChanged` | streamId, state, codec, syncGroupId, reason | 创建/释放 video decoder。 | draft |
| audio opening / streaming / closed | Host 打开或关闭音频流，或 source 断开 | `audio.streamStateChanged` | streamId, state, codec, syncGroupId, reason | 创建/释放 audio decoder。 | draft |
| video seq gap / decode error | Host 检测缺 chunk 或 H.264 解码失败 | no event required; request action needed | streamId, seq gap, frame id | 调用 `video.requestKeyFrame`。 | draft |
| audio seq gap | Host 检测缺 chunk | no protocol event | streamId, seq gap | 静音补偿或丢弃过期 chunk。 | local-only |
| stats update | NA20 周期统计或 Host 轮询 | stream stats event/query | bitrate, dropped frames/chunks, jitter | 更新诊断 UI。 | draft |
| source disconnected | NT10 Wi-Fi 断开或停止投屏 | video/audio state events, optional source event | reason, last stream states | 关闭播放器并提示用户。 | draft |

## 8. Protocol Details

### 8.1 Adopted / Generated Protocols

| Method/Event/Profile | Purpose in this flow | Source |
|---|---|---|
| `AXTP-USB-HID` | 上位机通过 USB HID 与 NA20 建立 AXTP Standard Framed 会话。 | `docs/generated/protocol.md` |
| `PayloadType = STREAM` | 承载视频和音频连续数据。 | `docs/generated/protocol.md`, `docs/specs/1-core/07-Stream-Data-Plane.md` |
| STREAM 16B header | 每个媒体 chunk 使用 `streamId`, `seqId`, `cursor`。 | `docs/specs/1-core/07-Stream-Data-Plane.md` |
| STREAM error codes | `STREAM_NOT_FOUND`, `STREAM_TIMEOUT`, `STREAM_PAYLOAD_INVALID`, `STREAM_CHUNK_MISSING`, `STREAM_CLOSED` 等错误可复用。 | `docs/generated/protocol.md` |

### 8.2 Draft Or Missing Protocol Gaps

| Gap | Candidate domain.feature | Candidate method/event/schema | Routed skill | Review question |
|---|---|---|---|---|
| 整体投屏会话状态不新建独立 domain。 | none | Host 聚合 video/audio state；`castSessionId` 仅作为透明关联字段。 | Runtime/App implementation | `[REVIEW-OK]` 不治理独立 `cast.streaming`。 |
| `video.stream` 尚未采纳到 generated。 | `video.stream` | `video.getStreamCapabilities`, `video.openStream`, `video.closeStream`, `video.requestKeyFrame`, events, optional source proxy control | `docs/dev/skills/30-adopt-protocol-draft/SKILL.md` after review | `[REVIEW-DRAFT]` `wireless_cast` source、H.264 Annex-B、SPS/PPS 随关键帧和同步字段已在草案中补齐。 |
| 投屏音频实时流需要采纳。 | `audio.stream` | `audio.getStreamCapabilities`, `audio.openStream`, `audio.closeStream`, `audio.getStreamState`, `audio.streamStateChanged`, `AudioChunkHeaderV1` | `docs/dev/skills/30-adopt-protocol-draft/SKILL.md` after review | `[REVIEW-OK]` 音频采用 AAC 透传方案；采纳前只需确认 transportFormat。 |
| 音视频同步字段需要采纳。 | `video.stream` / `audio.stream` | `syncGroupId`, `clockDomain`, `receiverClockDomain`, `timestampBaseUs`, `firstPtsUs` | `docs/dev/skills/30-adopt-protocol-draft/SKILL.md` after review | `[REVIEW-DRAFT]` 时间戳来源包含 NT10 源媒体时钟和 NA20 接收时钟。 |
| NT10 开始/停止无线推流为可选 source proxy 控制。 | `video.stream` optional source control | `video.startStreamSource`, `video.stopStreamSource`, `video.getStreamSourceState`, `video.streamSourceStateChanged` | `docs/protocol/video/video.stream.md` | `[REVIEW-OK]` 主流程中 NT10 接入 NA20 后自动开始推流；是否进入 MVP 或 P1/deferred 采纳时决定。 |

### 8.3 Candidate Video Open Payload

候选语义如下，字段名和类型不得视为 adopted 协议：

```json
{
  "method": "video.openStream",
  "params": {
    "source": "wireless_cast",
    "codec": "h264",
    "width": 1920,
    "height": 1080,
    "frameRate": 30,
    "bitrateKbps": 4096,
    "chunkSizeHint": 65536,
    "streamProfile": "media.video",
    "syncGroupId": "cast_001"
  }
}
```

返回：

```json
{
  "result": {
    "streamId": 101,
    "state": "opening",
    "streamProfile": "media.video",
    "source": "wireless_cast",
    "codec": "h264",
    "cursorUnit": "timestampUs",
    "syncGroupId": "cast_001",
    "clockDomain": "nt10_media_clock",
    "receiverClockDomain": "na20_receive_clock",
    "chunkSize": 65536,
    "nextSeqId": 0,
    "nextFrameId": 0
  }
}
```

### 8.4 Candidate Audio Open Payload

AAC 透传候选如下；`transportFormat=adts` 只是示例值，采纳前仍需确认实际默认封装是 ADTS、LATM、raw AAC 之一还是多种都支持：

```json
{
  "method": "audio.openStream",
  "params": {
    "source": "wireless_cast_audio",
    "codec": "aac",
    "transportFormat": "adts",
    "sampleRate": 48000,
    "channels": 2,
    "chunkDurationMs": 20,
    "streamProfile": "media.audio",
    "cursorUnit": "timestampUs",
    "syncGroupId": "cast_001"
  }
}
```

### 8.5 STREAM Payload Rules

| Field | Video rule | Audio rule |
|---|---|---|
| `streamId` | `video.openStream` 分配。 | `audio.openStream` 或替代音频建流方法分配。 |
| `seqId` | 每个 video stream 从 0 递增，用于 chunk 丢失检测。 | 每个 audio stream 从 0 递增，用于 chunk 丢失和统计。 |
| `cursor` | 推荐 `timestampUs`；同一视频帧多个 chunk 共享同一 cursor。 | 投屏 AAC 推荐 `timestampUs`，绑定 NT10 源媒体时钟；`sampleIndex` 可保留给其他音频 source。 |
| data | `VideoChunkHeaderV1 + H.264 bytes`。 | `AudioChunkHeaderV1 + AAC passthrough bytes`；具体 AAC transportFormat 待 Stage 20 确认。 |
| recovery | `video.requestKeyFrame`。 | 实时音频丢包不补旧包，Host 做静音补偿或丢弃。 |

## 9. Test / Conformance Notes

| Case | Given | When | Then | Protocol evidence |
|---|---|---|---|---|
| happy path | 配对完成，NA20 暴露 `wireless_cast` source | Host 打开 video 和 audio stream | 收到 H.264 + AAC chunk，播放器同步播放 | `video.openStream`, `audio.openStream`, STREAM |
| unsupported | NA20 不支持 `audio.stream` 或 AAC 透传 | Host 查询音频能力 | AV MVP 不应判定成功，除非产品定义 video-only 降级 | `audio.getStreamCapabilities` |
| boundary case | Host 请求超过 capability 的分辨率或 unsupported codec | Host 调用 open stream | 设备返回 typed error，Host 按能力重试或提示 | `video.getStreamCapabilities`, `video.openStream` |
| event path | NT10 开始推流或断开 | NA20 上报 state changed | Host 打开/关闭播放器资源 | `video.streamStateChanged`, `audio.streamStateChanged` |
| video seq gap | Host 检测 video `seqId` 缺失 | Host 请求关键帧 | 下一关键帧后恢复画面 | `video.requestKeyFrame` |
| audio seq gap | Host 检测 audio `seqId` 缺失 | Host 播放音频 | 静音补偿或丢弃过期 chunk，不要求 NA20 重传旧音频 | STREAM + runtime handling |
| backpressure | Host 处理过慢 | NA20 继续实时发送 | 视频丢旧帧、音频丢旧 chunk，保持低延迟并上报统计 | stream stats / policy |
| host stop | 用户停止播放 | Host 关闭音频再关闭视频 | NA20 停止 producer，不再发送旧 streamId 数据 | `audio.closeStream`, `video.closeStream` |

## 10. Acceptance Gates

- 上位机能通过 `AXTP-USB-HID` 与 NA20 建立 Standard Framed session，并接收 `PayloadType=STREAM`。
- NA20 对每一路媒体返回明确的 `streamId`、profile、cursorUnit、codec/format、状态和限制。
- 视频 H.264 chunk 能被 Host 依据 `seqId`、`cursor`、`frameId`、`frameOffset`、`frameStart/frameEnd` 重组并解码。
- 音频 AAC 透传 chunk 能被 Host 依据 `seqId` 和 NT10 源媒体 `timestampUs` 放入音频播放 pipeline。
- 音频和视频具备共同 `syncGroupId/castSessionId` 与统一时钟语义，Host 可做 A/V sync。
- 丢包、背压、NT10 断连、source 不可用、codec 不支持等错误路径都有状态或错误码可观测。
- 本流程不修改 registry、generated、protocol IR；后续协议事实必须通过 Stage 20/30/50 工作流进入正式生成路径。

## 11. Open Questions

| Question | Impact | Owner | Status | Next action |
|---|---|---|---|---|
| 业务流程图是否另有文件或图片？当前 `docs/business/device-streaming.md` 未包含图，本文仅按文字需求推导。 | product / docs | TBD | REVIEW-ASK | 补充真实流程图后复核步骤。 |
| AAC 透传的具体 `transportFormat` 是 ADTS、LATM、raw AAC，还是多种都支持？ | protocol / firmware | TBD | REVIEW-ASK | Stage 20 固化 `audio.stream` schema。 |
| 可选 `video.startStreamSource` / `video.stopStreamSource` 是否进入 `video.stream` MVP，还是 P1/deferred？ | product / protocol | TBD | REVIEW-ASK | 决定 source proxy control 范围。 |
| NT10 断连后，NA20 是否保留 streamId 等待重连，还是立即关闭 video/audio stream？ | firmware / product | TBD | REVIEW-ASK | 决定 source disconnected 状态机。 |

---
status: draft
contract: false
generated: false
domain: cast
feature: cast.flowControl
registry:
lastReviewed: 2026-06-22
---

# cast.flowControl

## 1. Purpose

控制投屏接收端本地渲染 fps、视频队列上限、late frame 阈值、丢帧策略和 overlay。它不要求 AirPlay source 降低输入 fps，也不定义 STREAM 流控。

## 2. Candidate Surface

| Method / Event | Purpose | Schema | Notes |
|---|---|---|---|
| `cast.getFlowControlState` | 查询本地流控配置和统计。 | `CastGetFlowControlStateParams` -> `CastFlowControlState` | query |
| `cast.setRenderFps` | 设置本地目标渲染 fps。 | `CastSetRenderFpsParams` -> `CastFlowControlState` | command |
| `cast.setFlowPolicy` | 设置队列、late frame、drop policy 和 overlay。 | `CastSetFlowPolicyParams` -> `CastFlowControlState` | command |
| `cast.flowControlChanged` | 流控状态或统计变化。 | `CastFlowControlChangedEvent` | event |

## 3. Methods

### 3.0 方法速览

方法概览见第 2 章；本节只保留每个 method 的最小 request / success 示例。

### 3.1 `cast.getFlowControlState`

返回目标 fps、输入 fps、实际渲染 fps、队列和丢帧统计。

#### 3.1.1 d block 示例

request:

```json
{
  "id": 3601,
  "method": "cast.getFlowControlState",
  "params": {
    "includeStats": true,
    "includePolicy": true
  }
}
```

success:

```json
{
  "id": 3601,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "targetRenderFps": 10,
    "inputFps": 25,
    "renderFps": 10.1,
    "dropMode": "drop-late",
    "videoQueueFrames": 3,
    "videoQueueDepth": 2,
    "audioQueueDepth": 1,
    "lateFrameThresholdMs": 120,
    "overlayEnabled": true,
    "droppedFrames": 240,
    "lateFrames": 18,
    "keyframeRequestCount": 1,
    "sampledAt": "2026-06-22T10:30:00Z"
  }
}
```

### 3.2 `cast.setRenderFps`

设置接收端本地目标渲染 fps；`fps=0` 表示不限速。

#### 3.2.1 d block 示例

request:

```json
{
  "id": 3602,
  "method": "cast.setRenderFps",
  "params": {
    "fps": 10,
    "scope": "currentSession"
  }
}
```

success:

```json
{
  "id": 3602,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "targetRenderFps": 10,
    "inputFps": 25,
    "renderFps": 10,
    "dropMode": "drop-late",
    "videoQueueFrames": 3,
    "videoQueueDepth": 1,
    "lateFrameThresholdMs": 120,
    "overlayEnabled": true,
    "changedFields": [
      "targetRenderFps"
    ],
    "sampledAt": "2026-06-22T10:31:00Z"
  }
}
```

### 3.3 `cast.setFlowPolicy`

设置视频队列和丢帧策略。默认 `dropMode=drop-late`。

#### 3.3.1 d block 示例

request:

```json
{
  "id": 3603,
  "method": "cast.setFlowPolicy",
  "params": {
    "videoQueueFrames": 3,
    "lateFrameThresholdMs": 120,
    "dropMode": "drop-late",
    "overlayEnabled": true
  }
}
```

success:

```json
{
  "id": 3603,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "targetRenderFps": 10,
    "inputFps": 25,
    "renderFps": 10,
    "dropMode": "drop-late",
    "videoQueueFrames": 3,
    "videoQueueDepth": 1,
    "lateFrameThresholdMs": 120,
    "overlayEnabled": true,
    "keyFrameOnDropBurst": true,
    "changedFields": [
      "videoQueueFrames",
      "lateFrameThresholdMs",
      "dropMode",
      "overlayEnabled"
    ],
    "sampledAt": "2026-06-22T10:32:00Z"
  }
}
```

## 4. State And Events

| Field | Meaning |
|---|---|
| `targetRenderFps` | 配置目标；`0` 表示不限速。 |
| `inputFps` | 当前输入 fps，不因本地 cap 自动降低。 |
| `renderFps` | 实际本地渲染 fps；通常不高于 `inputFps` 和非零 `targetRenderFps`。 |
| `dropMode` | `drop-late`、`drop-oldest`、`render-latest`。 |
| `videoQueueFrames` | 视频队列上限。 |
| `lateFrameThresholdMs` | late frame 判定阈值。 |
| `overlayEnabled` | 是否显示诊断 overlay。 |
| `droppedFrames` / `lateFrames` | 低频诊断统计。 |

`cast.flowControlChanged` 只承载低频状态和统计摘要；高频媒体帧不进入该事件。

### 4.1 Event 示例

event:

```json
{
  "event": "cast.flowControlChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "targetRenderFps",
      "renderFps",
      "videoQueueDepth"
    ],
    "state": {
      "targetRenderFps": 10,
      "inputFps": 25.0,
      "renderFps": 10.0,
      "dropMode": "drop-late",
      "videoQueueFrames": 3,
      "videoQueueDepth": 1,
      "droppedFrames": 244,
      "lateFrames": 19,
      "overlayEnabled": true
    },
    "reason": "manualFlowControl",
    "sampledAt": "2026-06-22T10:31:00Z"
  }
}
```

## 5. Rules

- 目标 fps 高于输入 fps 时，`targetRenderFps` 保留配置值，实际 `renderFps` 按输入 fps 运行。
- 手动 fps cap 不得阻塞 HID 输入消费或 AXTP 数据解析。
- 视频队列必须有上限，未渲染帧不得无限排队。
- 外部控制端不直接请求关键帧；内部可根据丢帧、解码和 fps 变化自动触发。
- overlay / diagnostics 是正式能力，但不得变成高频状态流。

## 6. Errors

| Error | Scenario |
|---|---|
| `INVALID_ARGUMENT` | 非法 drop mode 或字段组合。 |
| `OUT_OF_RANGE` | fps、queue 或 threshold 越界。 |
| `UNAVAILABLE` | media / render pipeline 不可用。 |

## 7. Review Items

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| 是否暴露外部 keyframe request？ | scope | 不暴露；内部自动触发。 | `[REVIEW-OK]` |

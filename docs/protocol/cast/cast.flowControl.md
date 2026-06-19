---
status: draft
contract: false
generated: false
domain: cast
feature: cast.flowControl
registry:
lastReviewed: 2026-06-19
---

# cast.flowControl

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 控制投屏接收端本地渲染 fps、视频队列上限、late frame 阈值、drop policy，并查询相关运行统计。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否。它只控制接收端本地渲染策略，不定义 STREAM payload。 |
| Registry readiness | partial，需确认 `fps=0`、默认 dropMode 和 overlay 是否正式可控。 |
| Conformance | needed |
| 主要未决问题 | 目标 fps 高于输入 fps 的行为、默认 dropMode、overlay 是否进入正式能力、聚合 `cast.getStatus` 是否另建 feature。 |

## JSON 示例约定

本文中的 JSON 示例默认 RPC Session 已进入 `APP_READY`，`sid` 已由 Server 分配。除本节的 envelope 速查外，后续 method/event/flow 示例默认只展示 RPC `d` 数据块：

```json
{ "sid": "12345678", "op": 7, "d": {} }
```

| op | 名称 | 用途 |
|---:|---|---|
| `6` | Event | 设备向客户端推送事件。 |
| `7` | Request | 客户端调用业务 method。 |
| `8` | RequestResponse | 设备返回业务 method 结果或错误。 |

正式 methodId、eventId、fieldId、errorCode 由 registry 采纳后分配。本文不暴露外部关键帧请求 method。

## 1. 功能说明

`cast.flowControl` 用于投屏接收端本地渲染流控。典型场景是外部控制端把本地渲染降到 10fps，而 HID 输入继续消费、AXTP 数据继续解析、视频队列不持续增长、端到端延迟不持续变大。

关键边界：`cast.setRenderFps` 只控制接收端本地渲染 fps，不要求 NT10、AirPlay Source 或其他发射端降低发送 fps。关键帧请求由接收端内部按策略自动触发，不作为外部公开 cast method。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 查询本地渲染目标 fps、输入 fps、渲染 fps、队列、丢帧、late frame 和内部关键帧请求统计。 |
| 包含 | 设置本地目标渲染 fps。 |
| 包含 | 设置视频队列上限、late frame 阈值、drop policy 和丢帧爆发时是否允许内部关键帧请求。 |
| 包含 | flow-control 状态变化事件。 |
| 不包含 | 要求 source 降低输入 fps。 |
| 不包含 | 外部公开请求关键帧 method；内部可复用 `video.requestKeyFrame` 能力。 |
| 不包含 | 通用 STREAM/runtime ACK/window 流控；见 `stream.flowControl`。 |
| 不包含 | 视频 codec、stream 建立、key frame wire 语义；见 `video.stream`。 |
| 数据面 | 不定义 STREAM payload；所有控制通过 RPC 完成。 |

## 3. 方法 Methods

方法 ID、bitOffset 和 schema fieldId 均为 `TBD after adoption`，由 registry 采纳时分配。

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `cast.getFlowControlState` | query | 查询本地流控配置、状态和统计。 | `CastGetFlowControlStateParams` | `CastFlowControlState` | 否 | candidate |
| `cast.setRenderFps` | command | 设置接收端本地目标渲染 fps。 | `CastSetRenderFpsParams` | `CastFlowControlState` | 是，`cast.flowControlChanged` | candidate |
| `cast.setFlowPolicy` | command | 设置视频队列、late frame 和 drop policy。 | `CastSetFlowPolicyParams` | `CastFlowControlState` | 是，`cast.flowControlChanged` | candidate |

### 3.1 `cast.getFlowControlState`

**用途**：查询本地渲染流控状态和统计，用于诊断、重连校准和确认 fps cap 是否生效。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `CastGetFlowControlStateParams` |
| Result Schema | `CastFlowControlState` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回采样快照。 |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.1.1 请求参数 Params：`CastGetFlowControlStateParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sessionId` | string | no | receiver-local session id | omitted | 指定会话；省略表示当前活动 pipeline。 |
| `includeStats` | boolean | no | `true`, `false` | `true` | 是否返回 fps、queue、drop 等统计。 |
| `includePolicy` | boolean | no | `true`, `false` | `true` | 是否返回策略字段。 |

#### 3.1.2 Request d block Example (op=7)

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

#### 3.1.3 返回结果 Result：`CastFlowControlState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `targetRenderFps` | integer | yes | `1..120` or policy TBD | none | 当前本地目标渲染 fps。 |
| `inputFps` | number | no | `0..N` | omitted | 当前实际输入 fps，不因目标渲染 fps 自动降低。 |
| `renderFps` | number | no | `0..N` | omitted | 当前实际本地渲染 fps。 |
| `dropMode` | string | yes | `drop-late`, `drop-oldest`, `render-latest` | none | 当前丢帧策略。 |
| `videoQueueFrames` | integer | yes | `1..N` | none | 视频队列上限。 |
| `lateFrameThresholdMs` | integer | yes | `0..N` | none | late frame 阈值。 |
| `keyFrameOnDropBurst` | boolean | yes | `true`, `false` | none | 丢帧爆发时是否允许内部自动请求关键帧。 |
| `muted` | boolean | no | `true`, `false` | omitted | 投屏音频静音摘要；正式归属 `cast.audio`。 |
| `overlayEnabled` | boolean | no | `true`, `false` | omitted | overlay 是否启用；是否正式可控待确认。 |
| `videoQueueDepth` | integer | no | `0..N` | omitted | 当前视频队列深度。 |
| `audioQueueDepth` | integer | no | `0..N` | omitted | 当前音频队列深度。 |
| `droppedFrames` | integer | no | `0..N` | omitted | 累计丢弃视频帧数。 |
| `lateFrames` | integer | no | `0..N` | omitted | 累计 late frame 数。 |
| `keyframeRequestCount` | integer | no | `0..N` | omitted | 内部自动关键帧请求次数。 |
| `lastError` | object | no | `CastFlowControlErrorSummary` | omitted | 最近流控错误摘要。 |
| `sampledAt` | string timestamp | no | RFC 3339 | omitted | 采样时间。 |

#### 3.1.4 Success Response d block Example (op=8)

```json
{
  "id": 3601,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "targetRenderFps": 10,
    "inputFps": 25.0,
    "renderFps": 10.1,
    "dropMode": "drop-oldest",
    "videoQueueFrames": 3,
    "lateFrameThresholdMs": 120,
    "keyFrameOnDropBurst": true,
    "muted": false,
    "overlayEnabled": true,
    "videoQueueDepth": 2,
    "audioQueueDepth": 1,
    "droppedFrames": 240,
    "lateFrames": 18,
    "keyframeRequestCount": 1,
    "sampledAt": "2026-06-19T10:40:00Z"
  }
}
```

#### 3.1.5 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持本地流控状态查询。 | UI 隐藏诊断。 |
| `PERMISSION_DENIED` | 调用方无权读取运行统计。 | 返回权限错误。 |
| `UNAVAILABLE` | media pipeline 尚未 ready。 | 返回 pipeline 状态。 |

### 3.2 `cast.setRenderFps`

**用途**：设置接收端本地目标渲染 fps，例如将本地渲染降到 10fps。该 method 不要求 source 降低输入 fps。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `CastSetRenderFpsParams` |
| Result Schema | `CastFlowControlState` |
| 是否触发事件 | 是，`targetRenderFps` 实际变化后触发 `cast.flowControlChanged`。 |
| 幂等性 / 异步性 | 幂等；响应表示目标已更新，媒体线程后续按状态执行。 |
| 常见错误 | `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.2.1 请求参数 Params：`CastSetRenderFpsParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `fps` | integer | yes | `1..120`; `0` 语义待确认 | none | 目标本地渲染 fps。 |
| `scope` | string | no | `currentSession`, `default` | `currentSession` | 作用于当前会话还是保存为默认。 |
| `reason` | string | no | free text / reason enum | omitted | 设置原因，用于日志。 |

#### 3.2.2 Request d block Example (op=7)

```json
{
  "id": 3602,
  "method": "cast.setRenderFps",
  "params": {
    "fps": 10,
    "scope": "currentSession",
    "reason": "manualFlowControl"
  }
}
```

#### 3.2.3 返回结果 Result：`CastFlowControlState`

字段见 3.1.3。响应中的 `inputFps` 仍应表示实际输入 fps，不因 `targetRenderFps` 降低而伪造。

#### 3.2.4 Success Response d block Example (op=8)

```json
{
  "id": 3602,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "targetRenderFps": 10,
    "inputFps": 25.0,
    "renderFps": 24.8,
    "dropMode": "drop-oldest",
    "videoQueueFrames": 3,
    "lateFrameThresholdMs": 120,
    "keyFrameOnDropBurst": true
  }
}
```

#### 3.2.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `cast.flowControlChanged` | `targetRenderFps` 更新，或媒体线程应用后状态变化。 | `CastFlowControlChangedEvent` | 更新 UI；需要完整统计时调用 `getFlowControlState`。 |

#### 3.2.6 相关 Event d block Example (op=6)

```json
{
  "event": "cast.flowControlChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "targetRenderFps"
    ],
    "state": {
      "targetRenderFps": 10,
      "inputFps": 25.0,
      "renderFps": 10.2,
      "dropMode": "drop-oldest",
      "videoQueueDepth": 2,
      "droppedFrames": 40
    },
    "reason": "manualFlowControl"
  }
}
```

#### 3.2.7 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `OUT_OF_RANGE` | `fps` 小于最小值或大于最大值。 | 返回 `minFps` / `maxFps`。 |
| `INVALID_ARGUMENT` | `fps=0` 在当前策略下不被接受，或 `scope` 非法。 | 返回合法范围和枚举。 |
| `PERMISSION_DENIED` | 调用方无权修改流控策略。 | 返回权限错误。 |
| `UNAVAILABLE` | render pipeline 不可用。 | 返回 pipeline 状态。 |

#### 3.2.8 Error Response d block Example (op=8)

```json
{
  "id": 3602,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Render fps is out of range.",
    "details": {
      "candidateError": "OUT_OF_RANGE",
      "field": "fps",
      "min": 1,
      "max": 120
    }
  }
}
```

### 3.3 `cast.setFlowPolicy`

**用途**：设置更细的本地流控策略，包括视频队列上限、late frame 阈值、dropMode 和丢帧爆发时是否允许内部关键帧请求。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `CastSetFlowPolicyParams` |
| Result Schema | `CastFlowControlState` |
| 是否触发事件 | 是，策略变化后触发 `cast.flowControlChanged`。 |
| 幂等性 / 异步性 | 幂等；WebSocket 回调线程只更新控制状态，媒体线程读取执行。 |
| 常见错误 | `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.3.1 请求参数 Params：`CastSetFlowPolicyParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `videoQueueFrames` | integer | no | `1..N` | omitted | 视频队列上限。 |
| `lateFrameThresholdMs` | integer | no | `0..N` | omitted | late frame 判定阈值。 |
| `dropMode` | string | no | `drop-late`, `drop-oldest`, `render-latest` | omitted | 丢帧策略。 |
| `keyFrameOnDropBurst` | boolean | no | `true`, `false` | omitted | 丢帧爆发时是否允许内部自动请求关键帧。 |
| `overlayEnabled` | boolean | no | `true`, `false` | omitted | 是否启用 overlay；是否正式可控待确认。 |

#### 3.3.2 Request d block Example (op=7)

```json
{
  "id": 3603,
  "method": "cast.setFlowPolicy",
  "params": {
    "videoQueueFrames": 3,
    "lateFrameThresholdMs": 120,
    "dropMode": "drop-oldest",
    "keyFrameOnDropBurst": true,
    "overlayEnabled": true
  }
}
```

#### 3.3.3 返回结果 Result：`CastFlowControlState`

字段见 3.1.3。

#### 3.3.4 Success Response d block Example (op=8)

```json
{
  "id": 3603,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "targetRenderFps": 10,
    "inputFps": 25.0,
    "renderFps": 10.0,
    "dropMode": "drop-oldest",
    "videoQueueFrames": 3,
    "lateFrameThresholdMs": 120,
    "keyFrameOnDropBurst": true,
    "overlayEnabled": true
  }
}
```

#### 3.3.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `cast.flowControlChanged` | queue、late threshold、dropMode、overlay 或 keyframe policy 变化。 | `CastFlowControlChangedEvent` | 同步诊断面板；需要完整统计时调用 get。 |

#### 3.3.6 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `INVALID_ARGUMENT` | `dropMode` 非法或字段组合冲突。 | 返回合法枚举。 |
| `OUT_OF_RANGE` | queue 或 threshold 越界。 | 返回合法范围。 |
| `PERMISSION_DENIED` | 无权修改策略。 | 返回权限错误。 |
| `UNAVAILABLE` | media pipeline 不可用。 | 返回状态摘要。 |

#### 3.3.7 Error Response d block Example (op=8)

```json
{
  "id": 3603,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Unsupported drop mode.",
    "details": {
      "candidateError": "INVALID_ARGUMENT",
      "field": "dropMode",
      "allowed": [
        "drop-late",
        "drop-oldest",
        "render-latest"
      ]
    }
  }
}
```

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `cast.flowControlChanged` | target fps、策略、队列压力、丢帧统计或 overlay 状态变化。 | `CastFlowControlChangedEvent` | 更新诊断 UI；必要时调用 `cast.getFlowControlState`。 | candidate |

### 4.1 `cast.flowControlChanged`

#### Payload：`CastFlowControlChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `changedFields` | string[] | no | field path array | omitted | 变化字段。 |
| `state` | object | yes | `CastFlowControlState` | none | 变化后的状态或摘要。 |
| `reason` | string | no | `manualFlowControl`, `policy`, `queuePressure`, `pipeline`, `autoKeyFrame` | omitted | 变化原因。 |
| `warning` | object | no | `CastFlowControlWarning` | omitted | 队列压力、late frame 等警告。 |

#### Event d block Example (op=6)

```json
{
  "event": "cast.flowControlChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "dropMode",
      "videoQueueDepth",
      "lateFrames"
    ],
    "state": {
      "targetRenderFps": 10,
      "inputFps": 25.0,
      "renderFps": 10.0,
      "dropMode": "drop-oldest",
      "videoQueueFrames": 3,
      "videoQueueDepth": 3,
      "droppedFrames": 120,
      "lateFrames": 8,
      "keyframeRequestCount": 1
    },
    "reason": "queuePressure"
  }
}
```

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| target fps 变化 | 更新控制 UI；短时间后可查询完整状态。 |
| queue pressure | 展示诊断；必要时恢复 fps 或提示 backend 异常。 |
| event payload 为摘要 | 调用 `cast.getFlowControlState` 获取完整统计。 |
| 重连后 | 主动调用 `cast.getFlowControlState`。 |

## 5. Capability

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `supported` | boolean | yes | `true`, `false` | 是否支持 `cast.flowControl`。 |
| `minRenderFps` | integer | yes | `1..120` | 最小目标渲染 fps。 |
| `maxRenderFps` | integer | yes | `1..120` | 最大目标渲染 fps。 |
| `supportsUnlimitedFps` | boolean | no | `true`, `false` | `fps=0` 是否表示不限速；待确认。 |
| `dropModes` | string[] | yes | `drop-late`, `drop-oldest`, `render-latest` | 支持的丢帧策略。 |
| `defaultDropMode` | string | yes | drop mode enum | 默认丢帧策略。 |
| `videoQueueFramesRange` | object | yes | min/max | 队列上限范围。 |
| `lateFrameThresholdMsRange` | object | yes | min/max | late frame 阈值范围。 |
| `supportsOverlay` | boolean | no | `true`, `false` | overlay 是否正式可控。 |
| `internalKeyFrameRequestOnly` | boolean | yes | `true` | 关键帧请求只由接收端内部触发。 |

## 6. Schemas

本文采用简单展开模式。`CastFlowControlState` 字段较多，但 method/event 小节已展开主要字段。

| Schema | 用途 | 定义位置 |
|---|---|---|
| `CastGetFlowControlStateParams` | 查询流控状态参数。 | 3.1.1 |
| `CastFlowControlState` | 本地流控状态和统计。 | 3.1.3 |
| `CastSetRenderFpsParams` | 设置本地目标渲染 fps。 | 3.2.1 |
| `CastSetFlowPolicyParams` | 设置队列和丢帧策略。 | 3.3.1 |
| `CastFlowControlChangedEvent` | 流控状态变化事件。 | 4.1 |

### 6.1 丢帧策略枚举

| 值 | 含义 | 适用场景 |
|---|---|---|
| `drop-late` | 丢弃超过 late frame 阈值的帧。 | 低延迟优先。 |
| `drop-oldest` | 队列满时丢弃最旧帧。 | 防止队列持续增长。 |
| `render-latest` | 尽量渲染最新帧。 | 低 fps 下保持画面跟随最新状态。 |

## 7. 交互流程示例 Flow Examples

### 7.1 降低本地渲染到 10fps

| Step | 交互 | 说明 |
|---:|---|---|
| 1 | `cast.setRenderFps(fps=10)` | 只更新接收端本地目标渲染 fps。 |
| 2 | media thread applies cap | HID 输入继续消费，AXTP 数据继续解析。 |
| 3 | `cast.flowControlChanged` | 上报 target/render/queue/drop 摘要。 |
| 4 | `cast.getFlowControlState` | 客户端确认 renderFps 接近 10，queue 不持续增长。 |

### 7.2 从 10fps 恢复到 25fps

| Step | 交互 | 说明 |
|---:|---|---|
| 1 | `cast.setRenderFps(fps=25)` | 恢复目标渲染 fps。 |
| 2 | internal keyframe request | 如出现解码异常或丢帧爆发，接收端内部可自动请求关键帧。 |
| 3 | `cast.getFlowControlState` | 确认画面继续正常播放。 |

## 8. Errors

| 错误 | 类型 | 场景 | 说明 |
|---|---|---|---|
| `INVALID_ARGUMENT` | common | 枚举非法、字段组合冲突或 `fps=0` 不支持。 | 返回字段路径。 |
| `OUT_OF_RANGE` | candidate/common | fps、queue、threshold 越界。 | 正式 code 需按 registry 确认。 |
| `PERMISSION_DENIED` | common | 无权修改流控策略。 | 返回权限错误。 |
| `UNAVAILABLE` | common | media/render pipeline 不可用。 | 返回 pipeline 状态。 |
| `FLOW_POLICY_UNSUPPORTED` | candidate | dropMode 或 overlay 不受支持。 | 可用 common `INVALID_ARGUMENT` 表达。 |
| `QUEUE_PRESSURE` | candidate | 队列压力持续异常。 | 主要用于 event warning。 |

## 9. Legacy Mapping

| Legacy 行为 | Candidate AXTP | 说明 |
|---|---|---|
| 无旧协议映射 | `cast.setRenderFps` | 新增手动流控需求。 |
| 无旧协议映射 | `cast.setFlowPolicy` | 新增队列/drop 策略控制。 |
| 无旧协议映射 | `cast.flowControlChanged` | 新增诊断/状态事件。 |
| 外部 key frame request | 不创建公开 cast 关键帧请求 method | 外部不暴露；内部可复用 `video.requestKeyFrame`。 |
| `setMuted` 类行为 | `cast.audio` | 静音归 `cast.audio`，本 feature 只读展示摘要。 |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| Registry | partial | 需确认 fps、dropMode、overlay、stats 字段。 |
| Generated | no | 未进入 generated。 |
| Contract | false | 草案不可直接作为 runtime 合同。 |
| Conformance | needed | 覆盖 25/15/10/5 fps、恢复、队列稳定、错误路径和 capability discovery。 |

## 11. 测试要点

| Case | Given | When | Then |
|---|---|---|---|
| 25fps 输入设置 25 | inputFps≈25 | `cast.setRenderFps(25)` | renderFps 接近 25，队列稳定。 |
| 25fps 输入设置 15 | inputFps≈25 | `cast.setRenderFps(15)` | renderFps 接近 15，输入继续消费。 |
| 25fps 输入设置 10 | inputFps≈25 | `cast.setRenderFps(10)` | renderFps 接近 10，queue/latency 不持续增长。 |
| 25fps 输入设置 5 | inputFps≈25 | `cast.setRenderFps(5)` | drop policy 生效，画面仍跟随最新状态。 |
| 从 10 恢复 25 | targetRenderFps=10 | `cast.setRenderFps(25)` | 画面继续正常播放。 |
| fps cap 下静音 | targetRenderFps=10 | `cast.setMuted(true)` | 由 `cast.audio` 处理，音频数据继续消费。 |
| fps cap 下窗口控制 | targetRenderFps=10 | 切换全屏/还原 | 不阻塞 HID 输入和 AXTP 解析。 |
| 长时间低 fps | targetRenderFps=10 | 运行 10 分钟 | 队列深度稳定，延迟不持续增长。 |
| 参数越界 | fps=121 | 调用 set | 返回 out-of-range 类错误。 |

## 12. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| `fps=0` 是不限速还是非法？ | schema / behavior | 建议能力字段声明；MVP 可拒绝。 | `[REVIEW-ASK]` |
| 目标 fps 高于输入 fps 时如何处理？ | behavior | 建议保存目标上限，实际 renderFps 不超过 input。 | `[REVIEW-DRAFT]` |
| 默认 `dropMode` 是什么？ | runtime / conformance | 建议 `drop-oldest` 或 `render-latest`，需实测。 | `[REVIEW-ASK]` |
| overlay 是否正式可控？ | scope | 建议先作为 optional capability。 | `[REVIEW-ASK]` |
| 是否需要独立 `cast.status` 聚合接口？ | feature boundary | 当前先用 `cast.getFlowControlState`，聚合状态另行评审。 | `[REVIEW-ASK]` |
| 是否暴露外部 keyframe request？ | scope | 不暴露；内部自动触发。 | `[REVIEW-OK]` |

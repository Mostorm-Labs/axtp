---
status: draft
contract: false
generated: false
domain: cast
feature: cast.audio
registry:
lastReviewed: 2026-06-19
---

# cast.audio

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 管理投屏接收端本地是否播放投屏音频，以及静音状态变化通知。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否。音频媒体数据不在本 feature 中承载。 |
| Registry readiness | partial，需确认 `enabled` 与 `muted` 的关系。 |
| Conformance | needed |
| 主要未决问题 | 默认关闭的配置来源、`setMuted` 是否保留为独立 method、是否影响 AirPlay 音频协商。 |

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

正式 methodId、eventId、fieldId、errorCode 由 registry 采纳后分配。

## 1. 功能说明

`cast.audio` 控制投屏接收端本地音频输出。业务要求默认不播放投屏音频，外部控制端可以打开或关闭投屏音频播放；在 fps cap 场景下，静音必须继续消费音频数据，不重启音频设备，也不影响视频渲染。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 查询投屏音频本地播放和静音状态。 |
| 包含 | 设置投屏音频播放开关；默认关闭。 |
| 包含 | 设置投屏音频静音状态。 |
| 包含 | 投屏音频状态变化事件。 |
| 不包含 | 系统主音量、通用音频输出音量；见 `audio.volume`。 |
| 不包含 | 音频输入、混音器、算法、EQ；见对应 `audio.*` feature。 |
| 不包含 | AirPlay 音频编码流或媒体 payload。 |
| 数据面 | 不定义 STREAM payload；只控制本地播放策略。 |

## 3. 方法 Methods

方法 ID、bitOffset 和 schema fieldId 均为 `TBD after adoption`，由 registry 采纳时分配。

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `cast.getAudio` | query | 查询投屏音频本地播放和静音状态。 | `CastGetAudioParams` | `CastAudioState` | 否 | candidate |
| `cast.setAudio` | command | 设置投屏音频本地播放开关。 | `CastSetAudioParams` | `CastAudioState` | 是，`cast.audioChanged` | candidate |
| `cast.setMuted` | command | 设置投屏音频静音状态。 | `CastSetMutedParams` | `CastAudioState` | 是，`cast.audioChanged` | candidate / REVIEW-ASK |

### 3.1 `cast.getAudio`

**用途**：查询投屏音频是否允许本地播放、当前是否静音，以及当前状态是默认配置还是活动会话有效状态。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `CastGetAudioParams` |
| Result Schema | `CastAudioState` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回快照。 |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.1.1 请求参数 Params：`CastGetAudioParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sessionId` | string | no | receiver-local session id | omitted | 指定会话；省略表示当前活动会话或默认状态。 |
| `scope` | string | no | `effective`, `default`, `session` | `effective` | 查询有效状态、默认状态或指定会话状态。 |

#### 3.1.2 Request d block Example (op=7)

```json
{
  "id": 3301,
  "method": "cast.getAudio",
  "params": {
    "scope": "effective"
  }
}
```

#### 3.1.3 返回结果 Result：`CastAudioState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `enabled` | boolean | yes | `true`, `false` | none | 是否允许接收端本地播放投屏音频；默认应为 `false`。 |
| `muted` | boolean | yes | `true`, `false` | none | 是否静音；静音时仍继续消费音频数据。 |
| `effectivePlayback` | boolean | yes | `true`, `false` | none | 当前是否实际输出音频。 |
| `scope` | string | yes | `effective`, `default`, `session` | none | 当前返回的作用域。 |
| `sessionId` | string | no | receiver-local session id | omitted | 关联会话。 |
| `reason` | string | no | `default`, `externalSet`, `policy`, `backend` | omitted | 状态来源。 |
| `updatedAt` | string timestamp | no | RFC 3339 | omitted | 更新时间。 |

#### 3.1.4 Success Response d block Example (op=8)

```json
{
  "id": 3301,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "enabled": false,
    "muted": true,
    "effectivePlayback": false,
    "scope": "effective",
    "reason": "default"
  }
}
```

#### 3.1.5 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持投屏音频控制。 | UI 隐藏或只读展示。 |
| `PERMISSION_DENIED` | 调用方无权读取音频状态。 | 返回权限错误。 |
| `UNAVAILABLE` | receiver/backend 暂不可用。 | 返回可诊断信息。 |

### 3.2 `cast.setAudio`

**用途**：设置投屏音频本地播放开关。关闭时，投屏视频不受影响，接收端不播放来自投屏会话的音频。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `CastSetAudioParams` |
| Result Schema | `CastAudioState` |
| 是否触发事件 | 是，状态实际变化后触发 `cast.audioChanged`。 |
| 幂等性 / 异步性 | 建议幂等；重复设置相同值应成功。 |
| 常见错误 | `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.2.1 请求参数 Params：`CastSetAudioParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `enabled` | boolean | yes | `true`, `false` | none | 是否允许本地播放投屏音频。 |
| `scope` | string | no | `default`, `currentSession` | `currentSession` | 仅当前会话还是保存为默认状态；需产品确认。 |
| `sessionId` | string | no | receiver-local session id | omitted | 指定会话。 |
| `reason` | string | no | free text / reason enum | omitted | 调用原因，用于日志。 |

#### 3.2.2 Request d block Example (op=7)

```json
{
  "id": 3302,
  "method": "cast.setAudio",
  "params": {
    "enabled": true,
    "scope": "currentSession",
    "reason": "userToggle"
  }
}
```

#### 3.2.3 返回结果 Result：`CastAudioState`

字段见 3.1.3。

#### 3.2.4 Success Response d block Example (op=8)

```json
{
  "id": 3302,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "enabled": true,
    "muted": false,
    "effectivePlayback": true,
    "scope": "currentSession",
    "sessionId": "cast_sess_001",
    "reason": "externalSet"
  }
}
```

#### 3.2.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `cast.audioChanged` | `enabled` 或有效播放状态变化。 | `CastAudioChangedEvent` | 同步音频开关和状态。 |

#### 3.2.6 相关 Event d block Example (op=6)

```json
{
  "event": "cast.audioChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "enabled",
      "effectivePlayback"
    ],
    "state": {
      "enabled": true,
      "muted": false,
      "effectivePlayback": true,
      "scope": "currentSession",
      "sessionId": "cast_sess_001"
    }
  }
}
```

#### 3.2.7 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `INVALID_ARGUMENT` | `scope` 非法或 `sessionId` 不匹配。 | 返回合法枚举和当前会话。 |
| `PERMISSION_DENIED` | 无权修改投屏音频播放。 | 返回权限错误。 |
| `UNAVAILABLE` | 音频 pipeline 不可用。 | 返回可重试信息。 |

#### 3.2.8 Error Response d block Example (op=8)

```json
{
  "id": 3302,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Invalid audio scope.",
    "details": {
      "candidateError": "INVALID_ARGUMENT",
      "field": "scope",
      "allowed": [
        "default",
        "currentSession"
      ]
    }
  }
}
```

### 3.3 `cast.setMuted`

**用途**：设置投屏音频静音状态。该方法用于 fps cap 和调试场景中的快速静音；采纳时可评审是否合并进 `cast.setAudio`。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `CastSetMutedParams` |
| Result Schema | `CastAudioState` |
| 是否触发事件 | 是，`muted` 或 `effectivePlayback` 变化后触发 `cast.audioChanged`。 |
| 幂等性 / 异步性 | 幂等；静音不应重启音频设备。 |
| 常见错误 | `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.3.1 请求参数 Params：`CastSetMutedParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `muted` | boolean | yes | `true`, `false` | none | 是否静音。 |
| `sessionId` | string | no | receiver-local session id | omitted | 指定会话；省略表示当前有效状态。 |
| `reason` | string | no | free text / reason enum | omitted | 调用原因。 |

#### 3.3.2 Request d block Example (op=7)

```json
{
  "id": 3303,
  "method": "cast.setMuted",
  "params": {
    "muted": true,
    "reason": "fpsCap"
  }
}
```

#### 3.3.3 返回结果 Result：`CastAudioState`

字段见 3.1.3。

#### 3.3.4 Success Response d block Example (op=8)

```json
{
  "id": 3303,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "enabled": true,
    "muted": true,
    "effectivePlayback": false,
    "scope": "currentSession",
    "sessionId": "cast_sess_001",
    "reason": "externalSet"
  }
}
```

#### 3.3.5 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `INVALID_ARGUMENT` | `sessionId` 不存在或不是投屏会话。 | 返回当前会话状态。 |
| `PERMISSION_DENIED` | 无权静音投屏音频。 | 返回权限错误。 |
| `UNAVAILABLE` | 音频 pipeline 暂不可用。 | 仍应尽量保持数据消费。 |

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `cast.audioChanged` | `enabled`、`muted` 或 `effectivePlayback` 变化。 | `CastAudioChangedEvent` | 同步 UI；需要完整状态时调用 `cast.getAudio`。 | candidate |

### 4.1 `cast.audioChanged`

#### Payload：`CastAudioChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `changedFields` | string[] | no | field path array | omitted | 变化字段。 |
| `state` | object | yes | `CastAudioState` | none | 变化后的状态。 |
| `reason` | string | no | `externalSet`, `default`, `policy`, `backend` | omitted | 变化原因。 |

#### Event d block Example (op=6)

```json
{
  "event": "cast.audioChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "muted"
    ],
    "state": {
      "enabled": true,
      "muted": true,
      "effectivePlayback": false,
      "scope": "currentSession",
      "sessionId": "cast_sess_001"
    },
    "reason": "externalSet"
  }
}
```

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| payload 是完整状态 | 可直接更新 UI。 |
| 与 fps cap 同时发生 | 保持音频数据消费，不将静音解读为停止音频流。 |
| event 丢失 | 调用 `cast.getAudio` 校准。 |

## 5. Capability

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `supported` | boolean | yes | `true`, `false` | 是否支持 `cast.audio`。 |
| `defaultEnabled` | boolean | yes | `true`, `false` | 默认是否播放投屏音频；需求建议为 `false`。 |
| `supportsMute` | boolean | yes | `true`, `false` | 是否支持静音。 |
| `supportsDefaultScope` | boolean | no | `true`, `false` | 是否可保存为后续会话默认状态。 |
| `supportsSessionScope` | boolean | no | `true`, `false` | 是否可只作用于当前会话。 |
| `muteKeepsConsumingAudio` | boolean | yes | `true` | 静音时必须继续消费音频数据。 |

## 6. Schemas

本文采用简单展开模式。主要 Params / Result / Payload 字段已在 method 和 event 小节内展开。

| Schema | 用途 | 定义位置 |
|---|---|---|
| `CastGetAudioParams` | 查询音频状态参数。 | 3.1.1 |
| `CastAudioState` | 音频状态。 | 3.1.3 |
| `CastSetAudioParams` | 设置播放开关参数。 | 3.2.1 |
| `CastSetMutedParams` | 设置静音参数。 | 3.3.1 |
| `CastAudioChangedEvent` | 音频状态变化事件。 | 4.1 |

## 7. 交互流程示例 Flow Examples

### 7.1 投屏过程中打开音频

| Step | 交互 | 说明 |
|---:|---|---|
| 1 | `cast.getAudio` | UI 查询默认状态，通常为 `enabled=false`。 |
| 2 | `cast.setAudio(enabled=true)` | 外部打开本地投屏音频播放。 |
| 3 | `cast.audioChanged` | 客户端同步开关和有效状态。 |

### 7.2 fps cap 下静音

| Step | 交互 | 说明 |
|---:|---|---|
| 1 | `cast.setRenderFps(fps=10)` | `cast.flowControl` 设置本地渲染 fps。 |
| 2 | `cast.setMuted(muted=true)` | 静音但继续消费音频数据。 |
| 3 | `cast.audioChanged` | UI 同步静音状态。 |

## 8. Errors

| 错误 | 类型 | 场景 | 说明 |
|---|---|---|---|
| `NOT_SUPPORTED` | common | 设备不支持投屏音频控制。 | UI 隐藏开关。 |
| `INVALID_ARGUMENT` | common | `scope`、`sessionId` 或参数非法。 | 返回合法范围。 |
| `PERMISSION_DENIED` | common | 无权设置音频。 | 返回权限错误。 |
| `UNAVAILABLE` | common | 音频 pipeline 不可用。 | 不应影响视频渲染。 |
| `AUDIO_PIPELINE_UNAVAILABLE` | candidate | 本地音频设备异常。 | 正式 code 待采纳。 |

## 9. Legacy Mapping

| Legacy 行为 | Candidate AXTP | 说明 |
|---|---|---|
| `getAudio` | `cast.getAudio` | 查询投屏音频播放状态。 |
| `setAudio` | `cast.setAudio` | 设置播放开关。 |
| `setMuted` | `cast.setMuted` 或合并进 `cast.setAudio` | 需评审是否保留独立 method。 |
| `audio.changed` | `cast.audioChanged` | 状态变化事件。 |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| Registry | partial | 需确认 `enabled` / `muted` 关系和默认 scope。 |
| Generated | no | 未进入 generated。 |
| Contract | false | 草案不可直接作为 runtime 合同。 |
| Conformance | needed | 覆盖默认关闭、打开/关闭、静音、fps cap 下继续消费。 |

## 11. 测试要点

| Case | Given | When | Then |
|---|---|---|---|
| 默认关闭 | receiver ready | 查询 `cast.getAudio` | 返回 `enabled=false` 或等价默认状态。 |
| 打开音频 | active session | 调用 `cast.setAudio(enabled=true)` | 返回有效状态并触发 `audioChanged`。 |
| 关闭音频 | active session | 调用 `cast.setAudio(enabled=false)` | 不播放本地音频，视频不受影响。 |
| 静音 | targetRenderFps=10 | 调用 `cast.setMuted(true)` | 音频数据继续消费，不重启设备。 |
| 权限不足 | 无权限调用方 | 调用 set 方法 | 返回 `PERMISSION_DENIED`。 |

## 12. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| `enabled` 与 `muted` 是否都保留？ | schema | 建议 `enabled` 表示是否播放投屏音频，`muted` 表示临时静音。 | `[REVIEW-DRAFT]` |
| `cast.setMuted` 是否独立保留？ | method model | 建议保留候选，采纳时可合并。 | `[REVIEW-ASK]` |
| 设置音频是否影响 AirPlay 音频协商？ | backend | 当前只控制本地播放，不影响 source。 | `[REVIEW-DRAFT]` |
| 默认关闭来自产品配置还是固定协议默认？ | product | 建议 capability 暴露 `defaultEnabled=false`。 | `[REVIEW-ASK]` |

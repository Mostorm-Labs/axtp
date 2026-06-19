---
status: draft
contract: false
generated: false
domain: cast
feature: cast.session
registry:
lastReviewed: 2026-06-19
---

# cast.session

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 管理投屏接收端的会话生命周期，包括投屏请求到达、鉴权阶段、投屏开始、低频媒体状态、停止和失败通知。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否。媒体数据不在本 feature 中承载。 |
| Registry readiness | partial，需确认状态枚举、停止幂等性和事件拆分。 |
| Conformance | needed |
| 主要未决问题 | session 状态枚举、无活动会话时 `stopSession` 行为、first frame / media interrupted 是否需要专门事件。 |

## JSON 示例约定

本文中的 JSON 示例默认 RPC Session 已进入 `APP_READY`，`sid` 已由 Server 分配。Hello、Identify、Identified 属于 RPC Session 规范，不在每篇业务 feature 草案中重复。

示例使用 AXTP RPC JSON envelope。除本节的 envelope 速查外，后续 method/event/flow 示例默认只展示 RPC `d` 数据块，并在小节标题中标明对应 `op`：

```json
{ "sid": "12345678", "op": 7, "d": {} }
```

| op | 名称 | 用途 |
|---:|---|---|
| `6` | Event | 设备向客户端推送事件。 |
| `7` | Request | 客户端调用业务 method。 |
| `8` | RequestResponse | 设备返回业务 method 结果或错误。 |

本文中的 `sid="12345678"`、`id=3101`、`intent=1` 均为示例值。正式 methodId、eventId、fieldId、errorCode、intent bit 由 registry 采纳后分配。

## 1. 功能说明

`cast.session` 描述投屏接收端当前会话状态，以及外部控制端停止当前投屏的控制面。它面向 AirPlay/UxPlay receiver 场景，但不把 AirPlay、mDNS、RAOP、H.264/AAC 媒体协议本身标准化为 AXTP。

本文来自 `docs/flows/cast-reciever-uxplay.md` 的 Stage 20 草案落地。draft 阶段不得作为 runtime 实现合同。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 查询接收端当前投屏会话摘要。 |
| 包含 | 外部控制端主动停止当前投屏会话。 |
| 包含 | 投屏请求、鉴权阶段、开始、首帧/低频媒体变化、停止、失败等事件。 |
| 不包含 | 投屏密码策略配置；见 `cast.pinCode`。 |
| 不包含 | 投屏音频播放开关；见 `cast.audio`。 |
| 不包含 | 投屏窗口置顶/全屏/还原；见 `cast.window`。 |
| 不包含 | UxPlay backend 进程重启；见 `cast.backend`。 |
| 不包含 | 本地渲染 fps、队列和 drop 策略；见 `cast.flowControl`。 |
| 数据面 | 不定义 STREAM payload；投屏媒体面由 UxPlay / media pipeline 实现，AXTP 只承载控制和状态。 |

## 3. 方法 Methods

方法 ID、bitOffset 和 schema fieldId 均为 `TBD after adoption`，由 registry 采纳时分配。不要在草案中分配正式 ID。

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `cast.getSession` | query | 查询当前 receiver、backend 和活动投屏会话摘要。 | `CastGetSessionParams` | `CastSessionState` | 否 | candidate |
| `cast.stopSession` | command | 停止当前活动投屏会话。 | `CastStopSessionParams` | `CastStopSessionResult` | 是，`cast.sessionStateChanged` / `cast.sessionStopped` | candidate |

### 3.1 `cast.getSession`

**用途**：查询当前投屏接收端会话摘要，用于 UI 初始加载、重连后校准和事件丢失后的状态对齐。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `CastGetSessionParams` |
| Result Schema | `CastSessionState` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回当前快照。 |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.1.1 请求参数 Params：`CastGetSessionParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sessionId` | string | no | receiver-local session id | omitted | 指定会话；省略表示当前活动或最近会话。 |
| `include` | string[] | no | `source`, `media`, `backend`, `pin`, `audio`, `window` | omitted | 需要返回的摘要段；省略表示基础会话状态。 |

#### 3.1.2 Request d block Example (op=7)

```json
{
  "id": 3101,
  "method": "cast.getSession",
  "params": {
    "include": [
      "source",
      "media",
      "backend"
    ]
  }
}
```

#### 3.1.3 返回结果 Result：`CastSessionState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `receiverState` | string | yes | `starting`, `ready`, `unavailable` | none | 接收端整体状态。 |
| `sessionId` | string | no | receiver-local session id | omitted | 当前或最近投屏会话 ID。 |
| `sessionState` | string | yes | `idle`, `incoming`, `waitingForPassword`, `authenticated`, `preparing`, `casting`, `interrupted`, `stopping`, `ended`, `failed` | none | 投屏会话状态；枚举需评审确认。 |
| `source` | object | no | `CastSourceSummary` | omitted | 发射端摘要。 |
| `media` | object | no | `CastMediaSummary` | omitted | 低频媒体摘要，如首帧、尺寸、方向。 |
| `backendState` | string | no | `starting`, `ready`, `restarting`, `failed`, `exited` | omitted | UxPlay backend 摘要。 |
| `reason` | string | no | reason enum | omitted | 最近状态变化原因。 |
| `lastError` | object | no | `CastErrorSummary` | omitted | 最近错误摘要。 |
| `updatedAt` | string timestamp | no | RFC 3339 | omitted | 状态更新时间。 |

#### 3.1.4 Success Response d block Example (op=8)

```json
{
  "id": 3101,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "receiverState": "ready",
    "sessionId": "cast_sess_001",
    "sessionState": "casting",
    "source": {
      "name": "iPhone",
      "protocol": "airplay"
    },
    "media": {
      "firstFrame": true,
      "width": 1920,
      "height": 1080,
      "orientation": "landscape"
    },
    "backendState": "ready",
    "updatedAt": "2026-06-19T10:30:00Z"
  }
}
```

#### 3.1.5 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持投屏接收端或 `cast.session`。 | 返回 unsupported feature。 |
| `PERMISSION_DENIED` | 调用方无权读取投屏会话状态。 | 返回权限错误。 |
| `UNAVAILABLE` | Receiver runtime 或 backend 暂不可用。 | 尽量返回可诊断的 `lastError`。 |

#### 3.1.6 Error Response d block Example (op=8)

```json
{
  "id": 3101,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Receiver is unavailable.",
    "details": {
      "candidateError": "UNAVAILABLE",
      "component": "cast.receiver"
    }
  }
}
```

### 3.2 `cast.stopSession`

**用途**：由外部控制端主动停止当前投屏会话。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `CastStopSessionParams` |
| Result Schema | `CastStopSessionResult` |
| 是否触发事件 | 是。通常先触发 `cast.sessionStateChanged`，完成后触发 `cast.sessionStopped`。 |
| 幂等性 / 异步性 | 建议幂等；停止过程可能异步完成。无活动会话时返回成功还是错误需评审。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `BUSY`, `UNAVAILABLE` |

#### 3.2.1 请求参数 Params：`CastStopSessionParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sessionId` | string | no | receiver-local session id | omitted | 要停止的会话；省略表示当前活动会话。 |
| `reason` | string | no | `externalRequest`, `userRequest`, `backendRestart`, `policy` | `externalRequest` | 停止原因。 |
| `force` | boolean | no | `true`, `false` | `false` | 是否强制停止；语义需 backend 确认。 |

#### 3.2.2 Request d block Example (op=7)

```json
{
  "id": 3102,
  "method": "cast.stopSession",
  "params": {
    "sessionId": "cast_sess_001",
    "reason": "externalRequest"
  }
}
```

#### 3.2.3 返回结果 Result：`CastStopSessionResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `accepted` | boolean | yes | `true`, `false` | none | 停止请求是否已接受。 |
| `sessionId` | string | no | receiver-local session id | omitted | 被停止的会话。 |
| `sessionState` | string | yes | `stopping`, `ended`, `idle` | none | 返回时的状态。 |
| `noActiveSession` | boolean | no | `true`, `false` | omitted | 无活动会话时是否按幂等成功处理。 |
| `expectedEvent` | string | no | event name | omitted | 客户端后续可等待的事件。 |

#### 3.2.4 Success Response d block Example (op=8)

```json
{
  "id": 3102,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "accepted": true,
    "sessionId": "cast_sess_001",
    "sessionState": "stopping",
    "expectedEvent": "cast.sessionStopped"
  }
}
```

#### 3.2.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `cast.sessionStateChanged` | 会话进入 `stopping`。 | `CastSessionStateChangedEvent` | UI 进入处理中。 |
| `cast.sessionStopped` | backend 确认投屏会话结束。 | `CastSessionStoppedEvent` | UI 恢复未投屏状态。 |

#### 3.2.6 相关 Event d block Example (op=6)

```json
{
  "event": "cast.sessionStopped",
  "intent": 1,
  "data": {
    "sessionId": "cast_sess_001",
    "reason": "externalRequest",
    "endedAt": "2026-06-19T10:31:00Z"
  }
}
```

#### 3.2.7 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `INVALID_ARGUMENT` | `sessionId` 不存在或与当前活动会话不匹配。 | 返回字段路径和当前状态。 |
| `PERMISSION_DENIED` | 调用方无权停止投屏。 | 返回权限错误。 |
| `BUSY` | backend 正在重启或会话已处于 stopping。 | 返回可重试建议。 |
| `UNAVAILABLE` | backend 不可用，无法执行停止。 | 返回 backend 摘要。 |

#### 3.2.8 Error Response d block Example (op=8)

```json
{
  "id": 3102,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "No active cast session.",
    "details": {
      "candidateError": "INVALID_STATE",
      "sessionState": "idle"
    }
  }
}
```

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `cast.sessionIncoming` | 发射端发起投屏连接请求。 | `CastSessionIncomingEvent` | 提示有设备请求投屏。 | candidate |
| `cast.sessionStateChanged` | 会话阶段、低频媒体状态或可恢复中断发生变化。 | `CastSessionStateChangedEvent` | 更新 UI；必要时调用 `cast.getSession` 校准。 | candidate |
| `cast.sessionStarted` | AirPlay mirror 正式开始。 | `CastSessionStartedEvent` | 进入投屏中状态。 | candidate |
| `cast.sessionStopped` | 投屏会话结束。 | `CastSessionStoppedEvent` | 恢复未投屏状态。 | candidate |
| `cast.sessionFailed` | 投屏连接、鉴权、媒体协商或 backend 处理失败。 | `CastSessionFailedEvent` | 展示错误并允许重试或重启 backend。 | candidate |

### 4.1 `cast.sessionIncoming`

**触发条件**：

- iOS / macOS source 发起 AirPlay 连接。
- Receiver adapter 从 backend 收到 incoming connection。

#### Payload：`CastSessionIncomingEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sessionId` | string | yes | receiver-local session id | none | 新会话 ID。 |
| `source` | object | no | `CastSourceSummary` | omitted | 发射端摘要。 |
| `requiresPassword` | boolean | yes | `true`, `false` | none | 是否需要密码。 |
| `receivedAt` | string timestamp | no | RFC 3339 | omitted | 请求到达时间。 |

#### Event d block Example (op=6)

```json
{
  "event": "cast.sessionIncoming",
  "intent": 1,
  "data": {
    "sessionId": "cast_sess_001",
    "source": {
      "name": "iPhone",
      "protocol": "airplay"
    },
    "requiresPassword": true,
    "receivedAt": "2026-06-19T10:29:40Z"
  }
}
```

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| `requiresPassword=true` | 准备展示密码提示；具体密码状态由 `cast.pinCode` 提供。 |
| 短时间后失败 | 等待 `cast.sessionFailed` 或调用 `cast.getSession` 校准。 |

### 4.2 `cast.sessionStateChanged`

**触发条件**：

- 会话进入 `waitingForPassword`、`authenticated`、`preparing`、`casting`、`interrupted`、`stopping` 等阶段。
- 首帧、分辨率、方向或 source 摘要等低频状态变化。

#### Payload：`CastSessionStateChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sessionId` | string | no | receiver-local session id | omitted | 相关会话。 |
| `previousState` | string | no | session state enum | omitted | 变化前状态。 |
| `state` | string | yes | session state enum | none | 变化后状态。 |
| `changedFields` | string[] | no | field path array | omitted | 变化字段。 |
| `media` | object | no | `CastMediaSummary` | omitted | 低频媒体摘要。 |
| `reason` | string | no | reason enum | omitted | 状态变化原因。 |
| `updatedAt` | string timestamp | no | RFC 3339 | omitted | 更新时间。 |

#### Event d block Example (op=6)

```json
{
  "event": "cast.sessionStateChanged",
  "intent": 1,
  "data": {
    "sessionId": "cast_sess_001",
    "previousState": "preparing",
    "state": "casting",
    "changedFields": [
      "state",
      "media.firstFrame"
    ],
    "media": {
      "firstFrame": true,
      "width": 1920,
      "height": 1080
    },
    "updatedAt": "2026-06-19T10:30:00Z"
  }
}
```

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| payload 是完整状态 | 可直接更新 UI。 |
| payload 只包含变化摘要 | 调用 `cast.getSession` 校准。 |
| 重连后 | 主动调用 `cast.getSession`。 |

### 4.3 `cast.sessionStarted`

#### Payload：`CastSessionStartedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sessionId` | string | yes | receiver-local session id | none | 会话 ID。 |
| `source` | object | no | `CastSourceSummary` | omitted | 发射端摘要。 |
| `authMode` | string | no | `pin`, `none`, `token`, `unknown` | omitted | 本次准入方式。 |
| `startedAt` | string timestamp | no | RFC 3339 | omitted | 开始时间。 |

#### Event d block Example (op=6)

```json
{
  "event": "cast.sessionStarted",
  "intent": 1,
  "data": {
    "sessionId": "cast_sess_001",
    "source": {
      "name": "iPhone",
      "protocol": "airplay"
    },
    "authMode": "pin",
    "startedAt": "2026-06-19T10:30:00Z"
  }
}
```

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| 投屏开始 | 进入 casting UI，启用停止投屏按钮。 |
| 需要展示首帧状态 | 继续等待 `cast.sessionStateChanged` 的 media 摘要。 |

### 4.4 `cast.sessionStopped`

#### Payload：`CastSessionStoppedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sessionId` | string | no | receiver-local session id | omitted | 已停止会话。 |
| `reason` | string | yes | `externalRequest`, `sourceClosed`, `backendRestart`, `backendExited`, `authFailed`, `error` | none | 停止原因。 |
| `endedAt` | string timestamp | no | RFC 3339 | omitted | 结束时间。 |

#### Event d block Example (op=6)

```json
{
  "event": "cast.sessionStopped",
  "intent": 1,
  "data": {
    "sessionId": "cast_sess_001",
    "reason": "sourceClosed",
    "endedAt": "2026-06-19T10:45:00Z"
  }
}
```

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| source 主动结束 | 恢复未投屏状态。 |
| backend restart 导致结束 | 同步展示 backend 恢复中。 |

### 4.5 `cast.sessionFailed`

#### Payload：`CastSessionFailedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sessionId` | string | no | receiver-local session id | omitted | 失败会话。 |
| `phase` | string | no | `incoming`, `auth`, `preparing`, `casting`, `stopping` | omitted | 失败阶段。 |
| `error` | object | yes | `CastErrorSummary` | none | 错误摘要。 |
| `recoverable` | boolean | no | `true`, `false` | omitted | 是否可恢复或重试。 |
| `failedAt` | string timestamp | no | RFC 3339 | omitted | 失败时间。 |

#### Event d block Example (op=6)

```json
{
  "event": "cast.sessionFailed",
  "intent": 1,
  "data": {
    "sessionId": "cast_sess_001",
    "phase": "auth",
    "error": {
      "name": "PIN_CODE_AUTH_FAILED",
      "message": "PIN verification failed."
    },
    "recoverable": true,
    "failedAt": "2026-06-19T10:29:55Z"
  }
}
```

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| `recoverable=true` | 允许重试或继续等待新的投屏请求。 |
| backend 失败 | 提示用户并可引导 `cast.restartBackend`。 |

## 5. Capability

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `supported` | boolean | yes | `true`, `false` | 是否支持 `cast.session`。 |
| `roles` | string[] | yes | `receiver` | MVP 仅 receiver。 |
| `protocols` | string[] | yes | `airplay`, `unknown` | 支持的投屏协议摘要，不标准化其内部媒体协议。 |
| `sessionStates` | string[] | yes | session state enum | 支持的状态枚举。 |
| `supportsStopSession` | boolean | yes | `true`, `false` | 是否支持外部停止投屏。 |
| `supportsSourceSummary` | boolean | no | `true`, `false` | 是否可提供 source 摘要。 |
| `supportsMediaSummary` | boolean | no | `true`, `false` | 是否可上报首帧、尺寸、方向等低频媒体状态。 |

## 6. Schemas

本文采用简单展开模式：主要 Params / Result / Payload 字段已在 method 和 event 小节内展开。本节只给出共享对象索引。

| Schema | 用途 | 定义位置 |
|---|---|---|
| `CastGetSessionParams` | 查询会话参数。 | 3.1.1 |
| `CastSessionState` | 会话状态结果。 | 3.1.3 |
| `CastStopSessionParams` | 停止会话参数。 | 3.2.1 |
| `CastStopSessionResult` | 停止会话结果。 | 3.2.3 |
| `CastSourceSummary` | source 摘要。 | 事件和结果内嵌对象，字段需 adoption 前确认。 |
| `CastMediaSummary` | 低频媒体摘要。 | 事件和结果内嵌对象，字段需 adoption 前确认。 |
| `CastErrorSummary` | 错误摘要。 | 事件和错误 details 内嵌对象。 |

## 7. 交互流程示例 Flow Examples

### 7.1 外部主动关闭投屏

| Step | 交互 | 说明 |
|---:|---|---|
| 1 | `cast.getSession` | 客户端确认当前存在活动会话。 |
| 2 | `cast.stopSession` | 服务端接受停止请求，返回 `sessionState=stopping`。 |
| 3 | `cast.sessionStateChanged` | UI 进入处理中。 |
| 4 | `cast.sessionStopped` | UI 恢复未投屏状态。 |

## 8. Errors

本文优先复用 core Error Model 和 registry common errors。feature-specific error 只作为 candidate，不分配正式 errorCode。

| 错误 | 类型 | 场景 | 说明 |
|---|---|---|---|
| `NOT_SUPPORTED` | common | 设备不支持投屏接收端。 | 优先复用 common error。 |
| `INVALID_ARGUMENT` | common | `sessionId`、`reason` 等参数非法。 | details 中返回字段路径。 |
| `PERMISSION_DENIED` | common | 调用方无权读取或停止投屏。 | 需配合 auth/permission。 |
| `UNAVAILABLE` | common | receiver/backend 不可用。 | 返回 backend 摘要。 |
| `INVALID_STATE` | candidate | 无活动会话、会话已结束或当前状态不能停止。 | 正式 code 待采纳。 |
| `CAST_SESSION_FAILED` | candidate | 会话连接、鉴权或媒体协商失败。 | 可作为 event error summary。 |

## 9. Legacy Mapping

| Legacy 行为 | Candidate AXTP | 说明 |
|---|---|---|
| `getStatus` / `status.changed` | `cast.getSession` / `cast.sessionStateChanged` | 聚合状态是否另设 `cast.status` 待确认。 |
| `mirrorStarted`, `casting.started` | `cast.sessionStarted` | 投屏正式开始。 |
| `mirrorStopped`, `casting.stopped` | `cast.sessionStopped` | 投屏结束。 |
| `stop`, `stopCasting` | `cast.stopSession` | 外部主动停止。 |
| `casting.frameStats` | optional diagnostic field | 不作为高频事件进入 `cast.session` MVP。 |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| Registry | partial | 需要确认 state enum、method/event 命名和错误模型。 |
| Generated | no | 未进入 generated。 |
| Contract | false | 草案不可直接作为 runtime 合同。 |
| Conformance | needed | 需要覆盖 query、stop、事件顺序、错误路径和重连校准。 |

## 11. 测试要点

| Case | Given | When | Then |
|---|---|---|---|
| 查询空闲状态 | receiver ready，无活动会话 | 调用 `cast.getSession` | 返回 `sessionState=idle` 或等价状态。 |
| 投屏开始事件 | source 成功投屏 | backend 上报 started | 客户端收到 `sessionIncoming` / `sessionStarted` / 状态变化。 |
| 停止投屏 | active session | 调用 `cast.stopSession` | 返回 accepted，随后收到 `sessionStopped`。 |
| 无活动会话停止 | no active session | 调用 `cast.stopSession` | 按待确认策略返回幂等成功或 typed error。 |
| backend 不可用 | backend exited | 调用 `cast.getSession` | 返回可诊断的 unavailable 状态或错误。 |
| 事件丢失校准 | 客户端重连 | 调用 `cast.getSession` | UI 可恢复正确状态。 |

## 12. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| session 状态枚举是否完整采用 `incoming/waitingForPassword/authenticated/preparing/casting/interrupted/stopping/ended/failed`？ | schema / conformance | 先保留完整枚举，采纳前收敛。 | `[REVIEW-ASK]` |
| `stopSession` 在无活动会话时是幂等成功还是错误？ | app / testing | 建议幂等成功，并带 `noActiveSession=true`；需产品确认。 | `[REVIEW-ASK]` |
| 首帧、分辨率、方向是否需要专门事件？ | event model | 建议先放入 `sessionStateChanged.media`。 | `[REVIEW-DRAFT]` |
| `mediaInterrupted` / `mediaResumed` 是否进入 MVP？ | scope | 建议先由 `sessionStateChanged` 表达。 | `[REVIEW-ASK]` |

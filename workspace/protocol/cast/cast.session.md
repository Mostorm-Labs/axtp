---
status: generated
contract: true
generated: true
domain: cast
feature: cast.session
registry: ../../../../contract/registry/domains/cast/domain.yaml
lastReviewed: 2026-06-22
---

# cast.session

## 0. 采纳状态

| 项目 | 内容 |
|---|---|
| 当前状态 | generated；已写入 `../../../../contract/registry/domains/cast/domain.yaml`，并已刷新到 `contract/protocol/axtp.protocol.yaml` 与 `contract/generated/**`。 |
| 是否可直接实现 | 是，但实现合同以 `contract/protocol/axtp.protocol.yaml` / `contract/generated/**` 为准。 |
| 本次采纳 | `receiverPhase` 阶段骨架、AirPlay 名称、session stop、incoming/started/stopped/failed 事件和字段编号。 |
| 未采纳 | AirPlay 名称 schema、无活动会话 stop 行为等 Review Items 不属于已生成合同；后续语义变更走 `amend-adopted-protocol`。 |

## 1. Purpose

管理 AirPlay receiver 名称、接收端统一阶段和 UxPlay 投屏会话生命周期。`receiverPhase` 用于 UI / 重连校准和跨协议对齐；AirPlay 细节仍保留在 `sessionState`。窗口、音频、PIN、backend 和本地流控分别归属其他 `cast.*` feature。

## 2. Candidate Surface

| Method / Event | Purpose | Schema | Notes |
|---|---|---|---|
| `cast.getSession` | 查询当前 receiver 和活动会话摘要。 | `CastGetSessionParams` -> `CastSessionState` | query |
| `cast.stopSession` | 停止当前活动投屏。 | `CastStopSessionParams` -> `CastStopSessionResult` | command |
| `cast.getAirPlayName` | 查询 AirPlay 显示名称。 | `CastGetAirPlayNameParams` -> `CastAirPlayNameState` | query |
| `cast.setAirPlayName` | 设置显示名称并重新发布服务发现名称。 | `CastSetAirPlayNameParams` -> `CastAirPlayNameState` | command |
| `cast.sessionIncoming` | source 发起连接。 | `CastSessionIncomingEvent` | event |
| `cast.sessionStateChanged` | 接收端阶段、AirPlay 细节状态或低频媒体状态变化。 | `CastSessionStateChangedEvent` | event |
| `cast.sessionStarted` | 首帧渲染或本地播放开始，用户可见投屏已开始。 | `CastSessionStartedEvent` | event |
| `cast.sessionStopped` | 会话结束。 | `CastSessionStoppedEvent` | event |
| `cast.sessionFailed` | 连接、鉴权、协商或 backend 处理失败。 | `CastSessionFailedEvent` | event |

## 3. Methods

### 3.0 方法速览

方法概览见第 2 章；本节只保留每个 method 的最小 request / success 示例。

### 3.1 `cast.getSession`

查询当前 receiver、活动会话和可选摘要段。

#### 3.1.1 d block 示例

request:

```json
{
  "id": 3101,
  "method": "cast.getSession",
  "params": {
    "include": [
      "source",
      "media",
      "airPlayName"
    ]
  }
}
```

success:

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
    "receiverPhase": "rendering",
    "sessionState": "casting",
    "protocol": "airplay",
    "airPlayName": "NearCast Room 01",
    "source": {
      "name": "Qing iPhone",
      "model": "iPhone17,2",
      "address": "192.168.31.24"
    },
    "media": {
      "firstFrame": true,
      "width": 1920,
      "height": 1080,
      "orientation": "landscape",
      "inputFps": 25
    },
    "backendState": "ready",
    "reason": "sessionStarted",
    "updatedAt": "2026-06-22T10:30:00Z"
  }
}
```

### 3.2 `cast.stopSession`

停止当前活动投屏；无活动会话时返回成功还是错误仍待确认。

#### 3.2.1 d block 示例

request:

```json
{
  "id": 3102,
  "method": "cast.stopSession",
  "params": {
    "reason": "externalRequest"
  }
}
```

success:

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
    "previousReceiverPhase": "rendering",
    "receiverPhase": "stopping",
    "previousState": "casting",
    "sessionState": "stopping",
    "reason": "externalRequest",
    "noActiveSession": false,
    "updatedAt": "2026-06-22T10:31:00Z"
  }
}
```

### 3.3 `cast.getAirPlayName`

查询当前 AirPlay 显示名称及其来源。

#### 3.3.1 d block 示例

request:

```json
{
  "id": 3103,
  "method": "cast.getAirPlayName",
  "params": {}
}
```

success:

```json
{
  "id": 3103,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "displayName": "NearCast Room 01",
    "source": "configured",
    "publishState": "published",
    "backendType": "uxplay",
    "updatedAt": "2026-06-22T10:30:00Z"
  }
}
```

### 3.4 `cast.setAirPlayName`

设置 AirPlay 显示名称，并要求 backend 重新发布 mDNS / Bonjour 名称。

#### 3.4.1 d block 示例

request:

```json
{
  "id": 3104,
  "method": "cast.setAirPlayName",
  "params": {
    "displayName": "NearCast Room 01",
    "apply": "immediate"
  }
}
```

success:

```json
{
  "id": 3104,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "displayName": "NearCast Room 01",
    "previousDisplayName": "NearCast",
    "source": "configured",
    "apply": "immediate",
    "publishState": "republishing",
    "backendType": "uxplay",
    "updatedAt": "2026-06-22T10:32:00Z"
  }
}
```

## 4. State And Events

| Field | Meaning |
|---|---|
| `receiverPhase` | 跨协议接收端阶段：`idle`、`incoming`、`authenticating`、`streamStarting`、`streaming`、`rendering`、`interrupted`、`stopping`、`ended`、`failed`。 |
| `sessionState` | AirPlay / UxPlay 细节状态：`idle`、`incoming`、`waitingForPassword`、`authenticated`、`preparing`、`casting`、`interrupted`、`stopping`、`ended`、`failed`。 |
| `sessionId` | receiver-local 会话 id。 |
| `source` | source 名称、地址或设备摘要。 |
| `protocol` | 当前为 `airplay`。 |
| `airPlayName` | 当前发布的显示名称。 |
| `media` | 低频媒体摘要，例如分辨率、fps、first frame 状态。 |
| `reason` | `externalRequest`、`sourceClosed`、`backendRestart`、`backendExited`、`authFailed`、`error`。 |

事件拆分：

- `sessionIncoming`：source 发起连接。
- `sessionStateChanged`：`receiverPhase`、等待密码、鉴权、preparing、streaming、interrupted、stopping 等阶段变化。
- `sessionStarted`：正式进入 `receiverPhase=rendering`。
- `sessionStopped`：正常或强制结束。
- `sessionFailed`：连接、鉴权、媒体协商或 backend 异常失败。

`receiverPhase=streaming` 表示媒体数据已经开始流动；`receiverPhase=rendering` 表示 Render Core 已经渲染首帧或本地音频播放已经开始。HID/NA20 聚合状态可以复用同一阶段集合，但其 source / stream 细节仍由 `video.stream` 和 `audio.stream` 表达。

### 4.1 Event 示例

started:

```json
{
  "event": "cast.sessionStarted",
  "intent": 1,
  "data": {
    "sessionId": "cast_sess_001",
    "receiverPhase": "rendering",
    "sessionState": "casting",
    "protocol": "airplay",
    "source": {
      "name": "Qing iPhone",
      "address": "192.168.31.24"
    },
    "media": {
      "firstFrame": true,
      "width": 1920,
      "height": 1080,
      "orientation": "landscape",
      "inputFps": 25.0
    },
    "startedAt": "2026-06-22T10:30:00Z"
  }
}
```

state changed:

```json
{
  "event": "cast.sessionStateChanged",
  "intent": 1,
  "data": {
    "sessionId": "cast_sess_001",
    "previousReceiverPhase": "streamStarting",
    "receiverPhase": "streaming",
    "previousState": "preparing",
    "sessionState": "casting",
    "protocol": "airplay",
    "authRequired": false,
    "media": {
      "firstFrame": false,
      "inputFps": 25.0,
      "renderFps": 0.0
    },
    "reason": "mediaFlowStarted",
    "updatedAt": "2026-06-22T10:29:58Z"
  }
}
```

stopped by backend restart:

```json
{
  "event": "cast.sessionStopped",
  "intent": 1,
    "data": {
      "sessionId": "cast_sess_001",
      "previousReceiverPhase": "rendering",
      "receiverPhase": "ended",
      "previousState": "casting",
      "sessionState": "ended",
      "reason": "backendRestart",
    "backendType": "uxplay",
    "stoppedAt": "2026-06-22T10:33:00Z"
  }
}
```

## 5. Rules

- AirPlay 名称属于 `cast.session`，不新增 `cast.runtime`。
- `stopSession` 和 AirPlay 名称设置按朴素可调用状态操作设计，不在本 feature 内拆分权限 scope。
- backend 重启会强制结束活动会话，并使用 `reason=backendRestart`。
- PIN 等待和鉴权失败不得误报为 `receiverPhase=streaming` 或 `receiverPhase=rendering`。
- `sessionState` 是 AirPlay / UxPlay 细节状态，不能作为 HID/NA20 等其他投屏路径的唯一 UI 状态模型。
- 高频 frame stats 不进入 `cast.session`；诊断统计优先放到 `cast.flowControl`。

## 6. Errors

| Error | Scenario |
|---|---|
| `INVALID_ARGUMENT` | AirPlay 名称、include 段或 reason 非法。 |
| `INVALID_STATE` | 无活动会话、会话已结束或当前状态不能停止。 |
| `UNAVAILABLE` | backend 或服务发现不可用。 |

## 7. Review Items

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| AirPlay 名称长度、字符集、立即生效策略和失败恢复如何定义？ | backend / schema | 采纳前补 name schema 和 republish 失败语义。 | `[REVIEW-ASK]` |
| `receiverPhase` 是否完整采用当前集合？ | schema / conformance | 先采用统一阶段集合；采纳前补 conformance case。 | `[REVIEW-DRAFT]` |
| `stopSession` 无活动会话时幂等成功还是错误？ | behavior | 待产品确认。 | `[REVIEW-ASK]` |
| first frame / interrupted 是否需要专门事件？ | event model | first frame 由 `sessionStarted(receiverPhase=rendering)` 表达；interrupted 默认并入 `sessionStateChanged`。 | `[REVIEW-DRAFT]` |

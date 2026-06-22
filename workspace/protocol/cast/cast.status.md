---
status: draft
contract: false
generated: false
domain: cast
feature: cast.status
registry:
lastReviewed: 2026-06-22
---

# cast.status

## 1. Purpose

提供投屏接收端的低频聚合状态，用于 UI 初始加载、控制端重连和事件丢失后的校准。它不替代各 feature 的 get method；明文 PIN 等敏感字段需要标明可见性并保持日志脱敏。

## 2. Candidate Surface

| Method / Event | Purpose | Schema | Notes |
|---|---|---|---|
| `cast.getStatus` | 查询 receiver、session、PIN、audio、window、backend、flowControl 摘要。 | `CastGetStatusParams` -> `CastStatus` | query |
| `cast.statusChanged` | 聚合状态段低频变化。 | `CastStatusChangedEvent` | event |

## 3. Methods

### 3.0 方法速览

方法概览见第 2 章；本节只保留每个 method 的最小 request / success 示例。

### 3.1 `cast.getStatus`

返回聚合状态；`includeSensitive=true` 表示请求包含明文 PIN 等敏感摘要，具体是否返回由可见性策略决定。

#### 3.1.1 d block 示例

request:

```json
{
  "id": 3701,
  "method": "cast.getStatus",
  "params": {
    "include": [
      "session",
      "pinCode",
      "audio",
      "window",
      "backend",
      "flowControl"
    ],
    "includeSensitive": false
  }
}
```

success:

```json
{
  "id": 3701,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "receiver": {
      "role": "receiver",
      "protocols": [
        "airplay"
      ],
      "state": "ready",
      "receiverPhase": "rendering"
    },
    "session": {
      "sessionId": "cast_sess_001",
      "receiverPhase": "rendering",
      "sessionState": "casting",
      "protocol": "airplay",
      "sourceName": "Qing iPhone"
    },
    "pinCode": {
      "enabled": true,
      "hasPinCode": true,
      "pinDisplay": "authorizedClients",
      "pinCode": null,
      "redacted": true
    },
    "audio": {
      "enabled": false,
      "muted": false,
      "effectivePlayback": false
    },
    "window": {
      "hasWindow": true,
      "visible": true,
      "mode": "fullscreen",
      "fullscreen": true,
      "alwaysOnTop": false
    },
    "backend": {
      "backendType": "uxplay",
      "state": "ready",
      "discoverable": true
    },
    "flowControl": {
      "targetRenderFps": 10,
      "inputFps": 25,
      "renderFps": 10,
      "dropMode": "drop-late",
      "videoQueueDepth": 1
    },
    "sampledAt": "2026-06-22T10:30:00Z"
  }
}
```

## 4. State And Events

| Section | Meaning |
|---|---|
| `receiver` | receiver role、protocol、runtime 可用性和 `receiverPhase` 摘要。 |
| `session` | 当前会话摘要，复用 `cast.session` 语义；`receiverPhase` 是 UI / 重连校准优先读取的阶段。 |
| `pinCode` | 密码保护摘要；明文 PIN 按可见性策略返回或置空。 |
| `audio` | 本地播放和静音摘要。 |
| `window` | 投屏窗口摘要。 |
| `backend` | backend type、状态和错误摘要。 |
| `flowControl` | target / input / render fps、队列和丢帧摘要。 |

`cast.statusChanged` 应携带变化段名和可见状态摘要；payload 被裁剪或不完整时，客户端再调用 `cast.getStatus` 或 feature-specific get method。

### 4.1 Event 示例

event:

```json
{
  "event": "cast.statusChanged",
  "intent": 1,
  "data": {
    "changedSections": [
      "receiver",
      "session",
      "window",
      "flowControl"
    ],
    "status": {
      "receiver": {
        "state": "ready",
        "receiverPhase": "rendering"
      },
      "session": {
        "sessionId": "cast_sess_001",
        "receiverPhase": "rendering",
        "sessionState": "casting",
        "sourceName": "Qing iPhone"
      },
      "window": {
        "hasWindow": true,
        "visible": true,
        "mode": "fullscreen"
      },
      "flowControl": {
        "targetRenderFps": 10,
        "inputFps": 25.0,
        "renderFps": 10.0
      }
    },
    "sampledAt": "2026-06-22T10:31:00Z"
  }
}
```

## 5. Rules

- `cast.status` 是重连校准入口，事件频率必须低。
- `receiver.receiverPhase` 和 `session.receiverPhase` 同时出现时必须一致；客户端应优先用它展示整体接收阶段，再按需读取 feature-specific 细节。
- 明文 PIN、错误详情和诊断字段需要标明可见性；普通日志和诊断输出必须脱敏。
- 聚合状态只返回摘要，不承载高频媒体统计。
- feature-specific 方法仍是详细状态事实源。

## 6. Errors

| Error | Scenario |
|---|---|
| `INVALID_ARGUMENT` | 请求了未知 include 段。 |
| `UNAVAILABLE` | receiver control surface 不可用。 |

## 7. Review Items

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| 聚合状态是否返回全部 feature 摘要，还是只返回 UI 首页最小集合？ | schema / performance | MVP 覆盖 receiver、session、pinCode、audio、window、backend、flowControl。 | `[REVIEW-ASK]` |
| `statusChanged` 是否需要节流和合并窗口？ | event model | 建议低频合并，详细变化由 feature events 承担。 | `[REVIEW-ASK]` |
| 敏感字段不可见时返回 null 还是省略字段？ | security | 默认保留字段并置空，同时标记 `redacted=true`。 | `[REVIEW-DRAFT]` |

---
status: draft
contract: false
generated: false
domain: cast
feature: cast.audio
registry:
lastReviewed: 2026-06-22
---

# cast.audio

## 1. Purpose

控制 AirPlay 投屏音频在接收端本地是否播放，以及是否静音。它不改变 AirPlay 媒体协商，也不定义音频 STREAM payload。

## 2. Candidate Surface

| Method / Event | Purpose | Schema | Notes |
|---|---|---|---|
| `cast.getAudio` | 查询本地播放和静音状态。 | `CastGetAudioParams` -> `CastAudioState` | query |
| `cast.setAudio` | 设置接收端本地是否播放投屏音频。 | `CastSetAudioParams` -> `CastAudioState` | command，触发 `cast.audioChanged` |
| `cast.setMuted` | 设置静音状态。 | `CastSetMutedParams` -> `CastAudioState` | candidate，是否独立保留待确认 |
| `cast.audioChanged` | 音频状态变化。 | `CastAudioChangedEvent` | event |

## 3. Methods

### 3.0 方法速览

方法概览见第 2 章；本节只保留每个 method 的最小 request / success 示例。

### 3.1 `cast.getAudio`

查询当前投屏音频状态。`includeEffective=true` 时返回当前会话下的实际播放状态。

#### 3.1.1 d block 示例

request:

```json
{
  "id": 3201,
  "method": "cast.getAudio",
  "params": {
    "includeEffective": true
  }
}
```

success:

```json
{
  "id": 3201,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "enabled": false,
    "muted": false,
    "effectivePlayback": false,
    "scope": "default",
    "sessionId": "cast_sess_001",
    "source": "defaultConfig",
    "reason": "receiverDefault",
    "updatedAt": "2026-06-22T10:30:00Z"
  }
}
```

### 3.2 `cast.setAudio`

设置是否允许接收端本地播放投屏音频。默认业务值为 `enabled=false`。

#### 3.2.1 d block 示例

request:

```json
{
  "id": 3202,
  "method": "cast.setAudio",
  "params": {
    "enabled": true,
    "scope": "currentSession"
  }
}
```

success:

```json
{
  "id": 3202,
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
    "source": "externalSet",
    "changedFields": [
      "enabled",
      "effectivePlayback"
    ],
    "updatedAt": "2026-06-22T10:31:00Z"
  }
}
```

### 3.3 `cast.setMuted`

设置本地静音；它只影响接收端输出，不要求 source 改变发送音频。

#### 3.3.1 d block 示例

request:

```json
{
  "id": 3203,
  "method": "cast.setMuted",
  "params": {
    "muted": true,
    "scope": "currentSession"
  }
}
```

success:

```json
{
  "id": 3203,
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
    "source": "externalSet",
    "changedFields": [
      "muted",
      "effectivePlayback"
    ],
    "updatedAt": "2026-06-22T10:32:00Z"
  }
}
```

## 4. State And Events

| Field | Meaning |
|---|---|
| `enabled` | 是否允许本地播放投屏音频。 |
| `muted` | 是否静音本地输出。 |
| `effectivePlayback` | 当前是否真的有本地声音输出，通常由 `enabled && !muted && sessionActive` 决定。 |
| `scope` | `currentSession` 或 `default`。 |
| `reason` | `externalSet`、`localUi`、`sessionStarted`、`sessionStopped` 等变化原因。 |

`cast.audioChanged` 应携带变化后的 `CastAudioState` 摘要；payload 不完整或事件丢失时，客户端调用 `cast.getAudio` 校准。

### 4.1 Event 示例

event:

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
    },
    "reason": "externalSet",
    "updatedAt": "2026-06-22T10:31:00Z"
  }
}
```

## 5. Rules

- 默认 `enabled=false`。
- `enabled=false` 时，`muted` 可保存但 `effectivePlayback=false`。
- `setAudio` 和 `setMuted` 是朴素可调用状态操作，不在本 feature 内拆分权限 scope。
- 音频开关不影响 AirPlay 连接、鉴权、编码或媒体协商。

## 6. Errors

| Error | Scenario |
|---|---|
| `INVALID_ARGUMENT` | 非法 scope 或字段组合。 |
| `UNAVAILABLE` | 本地音频输出服务不可用。 |

## 7. Review Items

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| `enabled` 与 `muted` 的有效状态公式是否进入 registry？ | schema / UI | 使用 `effectivePlayback` 承载实际结果。 | `[REVIEW-ASK]` |
| `cast.setMuted` 是否独立保留？ | method model | 保留候选；采纳时可合并到 `setAudio`。 | `[REVIEW-ASK]` |

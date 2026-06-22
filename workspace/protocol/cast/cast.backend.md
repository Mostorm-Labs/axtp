---
status: draft
contract: false
generated: false
domain: cast
feature: cast.backend
registry:
lastReviewed: 2026-06-22
---

# cast.backend

## 1. Purpose

查询和重启投屏 backend。当前 backend type 为 UxPlay；重启 backend 不等同于退出 Launcher、重启 receiver runtime 或重启设备。

## 2. Candidate Surface

| Method / Event | Purpose | Schema | Notes |
|---|---|---|---|
| `cast.getBackendStatus` | 查询 backend 状态和最近错误。 | `CastGetBackendStatusParams` -> `CastBackendStatus` | query |
| `cast.restartBackend` | 重启 backend。 | `CastRestartBackendParams` -> `CastRestartBackendResult` | command，触发 `cast.backendChanged` |
| `cast.backendChanged` | backend 状态变化。 | `CastBackendChangedEvent` | event |

## 3. Methods

### 3.0 方法速览

方法概览见第 2 章；本节只保留每个 method 的最小 request / success 示例。

### 3.1 `cast.getBackendStatus`

返回 backend type、运行状态、可发现性、进程摘要和最近错误。

#### 3.1.1 d block 示例

request:

```json
{
  "id": 3501,
  "method": "cast.getBackendStatus",
  "params": {
    "includeLastError": true
  }
}
```

success:

```json
{
  "id": 3501,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "backendType": "uxplay",
    "state": "ready",
    "discoverable": true,
    "pid": 48216,
    "version": "uxplay-nearcast-2026.06",
    "activeSessionId": "cast_sess_001",
    "restartInProgress": false,
    "lastError": null,
    "updatedAt": "2026-06-22T10:30:00Z"
  }
}
```

### 3.2 `cast.restartBackend`

请求重启 UxPlay backend。如存在活动投屏，会先强制结束当前会话，并通过 session/backend 事件上报。

#### 3.2.1 d block 示例

request:

```json
{
  "id": 3502,
  "method": "cast.restartBackend",
  "params": {
    "reason": "manualRecovery"
  }
}
```

success:

```json
{
  "id": 3502,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "accepted": true,
    "backendType": "uxplay",
    "state": "restarting",
    "restartId": "backend_restart_001",
    "activeSessionEnded": true,
    "endedSessionId": "cast_sess_001",
    "sessionStopReason": "backendRestart",
    "estimatedReadyInMs": 3000,
    "updatedAt": "2026-06-22T10:33:00Z"
  }
}
```

## 4. State And Events

| Field | Meaning |
|---|---|
| `backendType` | 当前为 `uxplay`。 |
| `state` | `starting`、`ready`、`restarting`、`exited`、`failed`、`disabled`。 |
| `discoverable` | AirPlay 服务是否可被发现。 |
| `pid` | 可选进程 id。 |
| `activeSessionEnded` | 本次重启是否结束了活动投屏。 |
| `lastError` | 最近 backend 错误摘要。 |

`cast.backendChanged` 用于上报 `ready`、`restarting`、`exited`、`failed` 等低频状态。backend 重启导致会话结束时，还需要 `cast.sessionStopped(reason=backendRestart)`。

### 4.1 Event 示例

event:

```json
{
  "event": "cast.backendChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "state",
      "restartInProgress"
    ],
    "state": {
      "backendType": "uxplay",
      "state": "restarting",
      "discoverable": false,
      "restartId": "backend_restart_001",
      "activeSessionEnded": true,
      "endedSessionId": "cast_sess_001"
    },
    "reason": "manualRecovery",
    "updatedAt": "2026-06-22T10:33:00Z"
  }
}
```

## 5. Rules

- `restartBackend` 只操作 backend，不退出 Launcher。
- 活动会话不阻止重启；重启前必须结束会话并给出用户可理解原因。
- UxPlay backend 内部控制口不作为公共 AXTP contract。
- `restartBackend` 是朴素可调用状态操作，不在本 feature 内拆分权限 scope。

## 6. Errors

| Error | Scenario |
|---|---|
| `BUSY` | 已有 backend 重启正在执行。 |
| `UNAVAILABLE` | backend adapter 不可用。 |
| `INVALID_STATE` | backend 被禁用或当前状态不允许重启。 |

## 7. Review Items

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| 重启时 session/backend 事件顺序如何固定？ | UI / conformance | 先 `backendChanged(restarting)`，再 `sessionStopped(backendRestart)`，最后 `backendChanged(ready/failed)`。 | `[REVIEW-ASK]` |

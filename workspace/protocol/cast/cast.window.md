---
status: generated
contract: true
generated: true
domain: cast
feature: cast.window
registry: ../../../../contract/registry/domains/cast/domain.yaml
lastReviewed: 2026-06-22
---

# cast.window

## 0. 采纳状态

| 项目 | 内容 |
|---|---|
| 当前状态 | generated；已写入 `../../../../contract/registry/domains/cast/domain.yaml`，并已刷新到 `contract/protocol/axtp.protocol.yaml` 与 `contract/generated/**`。 |
| 是否可直接实现 | 是，但实现合同以 `contract/protocol/axtp.protocol.yaml` / `contract/generated/**` 为准。 |
| 本次采纳 | `cast.getWindowState`、`cast.setWindowState`、`cast.windowChanged`、窗口模式和 bounds 字段外形。 |
| 未采纳 | 无窗口时预设行为和 show/hide scope 等 Review Items 不属于已生成合同；后续语义变更走 `amend-adopted-protocol`。 |

## 1. Purpose

控制投屏窗口可见性、全屏、置顶和 normal 还原状态。它不建模完整 OS 窗口管理，也不处理 PIN 窗口。

## 2. Candidate Surface

| Method / Event | Purpose | Schema | Notes |
|---|---|---|---|
| `cast.getWindowState` | 查询投屏窗口状态。 | `CastGetWindowStateParams` -> `CastWindowState` | query |
| `cast.setWindowState` | 设置全屏、置顶或 normal 模式。 | `CastSetWindowStateParams` -> `CastWindowState` | command |
| `cast.windowChanged` | 投屏窗口状态变化。 | `CastWindowChangedEvent` | event |

## 3. Methods

### 3.0 方法速览

方法概览见第 2 章；本节只保留每个 method 的最小 request / success 示例。

### 3.1 `cast.getWindowState`

查询当前是否有投屏窗口、是否可见、是否全屏和是否置顶。

#### 3.1.1 d block 示例

request:

```json
{
  "id": 3401,
  "method": "cast.getWindowState",
  "params": {}
}
```

success:

```json
{
  "id": 3401,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "hasWindow": true,
    "visible": true,
    "mode": "fullscreen",
    "fullscreen": true,
    "alwaysOnTop": false,
    "sessionId": "cast_sess_001",
    "bounds": {
      "x": 0,
      "y": 0,
      "width": 1920,
      "height": 1080
    },
    "previousNormalBounds": {
      "x": 160,
      "y": 120,
      "width": 1280,
      "height": 720
    },
    "updatedAt": "2026-06-22T10:30:00Z"
  }
}
```

### 3.2 `cast.setWindowState`

设置窗口状态。`mode=normal` 表示退出全屏、取消置顶，并恢复进入全屏 / 置顶前的窗口尺寸和位置。

#### 3.2.1 d block 示例

request:

```json
{
  "id": 3402,
  "method": "cast.setWindowState",
  "params": {
    "mode": "normal"
  }
}
```

success:

```json
{
  "id": 3402,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "hasWindow": true,
    "visible": true,
    "mode": "normal",
    "fullscreen": false,
    "alwaysOnTop": false,
    "sessionId": "cast_sess_001",
    "restoredBounds": {
      "x": 160,
      "y": 120,
      "width": 1280,
      "height": 720
    },
    "changedFields": [
      "mode",
      "fullscreen",
      "alwaysOnTop",
      "bounds"
    ],
    "updatedAt": "2026-06-22T10:31:00Z"
  }
}
```

## 4. State And Events

| Field | Meaning |
|---|---|
| `hasWindow` | 当前是否存在投屏窗口。 |
| `visible` | 窗口是否可见。 |
| `mode` | `normal` 或 `fullscreen`。 |
| `fullscreen` | 是否全屏；`mode=normal` 时必须为 `false`。 |
| `alwaysOnTop` | 是否置顶；`mode=normal` 时必须为 `false`。 |
| `sessionId` | 关联会话 id。 |
| `applyWhenNoWindow` | `reject` 或 `remember`；无窗口行为仍待确认。 |

`cast.windowChanged` 应携带变化后的完整窗口摘要。事件丢失时，客户端调用 `cast.getWindowState` 校准。

### 4.1 Event 示例

event:

```json
{
  "event": "cast.windowChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "mode",
      "fullscreen",
      "alwaysOnTop",
      "bounds"
    ],
    "state": {
      "hasWindow": true,
      "visible": true,
      "mode": "normal",
      "fullscreen": false,
      "alwaysOnTop": false,
      "sessionId": "cast_sess_001",
      "bounds": {
        "x": 160,
        "y": 120,
        "width": 1280,
        "height": 720
      }
    },
    "reason": "externalSet",
    "updatedAt": "2026-06-22T10:31:00Z"
  }
}
```

## 5. Rules

- `mode=normal` 后必须满足 `fullscreen=false` 且 `alwaysOnTop=false`。
- `mode=normal` 应恢复进入全屏 / 置顶前记录的窗口尺寸和位置；历史位置不可用时使用 runtime 默认普通窗口位置。
- `mode=normal` 不应同时携带 `fullscreen=true` 或 `alwaysOnTop=true`。
- 完整窗口坐标、多显示器选择和系统级窗口管理不进入本 feature。
- 当前不新增 public show / hide method；隐藏 / 显示由会话和本地 UI 驱动。

## 6. Errors

| Error | Scenario |
|---|---|
| `INVALID_ARGUMENT` | mode、fullscreen、alwaysOnTop 字段冲突。 |
| `INVALID_STATE` | 无窗口或当前状态不允许切换。 |
| `UNAVAILABLE` | 窗口服务不可用。 |

## 7. Review Items

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| 无活动投屏窗口时是否允许预设窗口状态？ | runtime / UI | 默认拒绝，capability 可声明支持 remember。 | `[REVIEW-ASK]` |
| 是否需要 public show / hide window method？ | scope | 当前不需要，隐藏 / 显示由会话和本地 UI 驱动。 | `[REVIEW-DRAFT]` |

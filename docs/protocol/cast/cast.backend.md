---
status: draft
contract: false
generated: false
domain: cast
feature: cast.backend
registry:
lastReviewed: 2026-06-19
---

# cast.backend

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 查询和重启投屏接收端 backend，并上报 backend ready、exited、restarting、failed 等状态。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | partial，需确认重启对活动会话的影响和权限 scope。 |
| Conformance | needed |
| 主要未决问题 | restart 是否强制结束投屏、是否只重启 UxPlay backend、是否重建 adapter 内部连接。 |

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

`cast.backend` 管理投屏接收端 backend 的业务可见状态。当前 business 输入中的 backend 是 UxPlay backend，但标准协议命名保留为 `cast.backend`，避免把实现名固化成 AXTP 公共 method name。

Backend 重启只表示重启投屏 backend，不表示退出 Launcher、重启 receiver runtime 或重启设备。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 查询 backend 状态。 |
| 包含 | 外部控制端请求重启 backend。 |
| 包含 | backend starting、ready、restarting、exited、failed 事件。 |
| 不包含 | Launcher 退出、整个 receiver runtime 重启、设备 reboot/shutdown。 |
| 不包含 | UxPlay 内部控制端口或内部 WebSocket wire contract。 |
| 不包含 | 投屏会话状态机；活动会话受影响时由 `cast.session` 上报。 |
| 数据面 | 不定义 STREAM payload。 |

## 3. 方法 Methods

方法 ID、bitOffset 和 schema fieldId 均为 `TBD after adoption`，由 registry 采纳时分配。

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `cast.getBackendStatus` | query | 查询投屏 backend 状态和最近错误。 | `CastGetBackendStatusParams` | `CastBackendStatus` | 否 | candidate |
| `cast.restartBackend` | command | 请求重启投屏 backend。 | `CastRestartBackendParams` | `CastRestartBackendResult` | 是，`cast.backendChanged`，活动会话可能触发 `cast.sessionStopped` | candidate |

### 3.1 `cast.getBackendStatus`

**用途**：查询 backend 当前状态，用于 UI 展示、健康检查和重启前判断。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `CastGetBackendStatusParams` |
| Result Schema | `CastBackendStatus` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回。 |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.1.1 请求参数 Params：`CastGetBackendStatusParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `includeLastError` | boolean | no | `true`, `false` | `true` | 是否返回最近错误摘要。 |

#### 3.1.2 Request d block Example (op=7)

```json
{
  "id": 3501,
  "method": "cast.getBackendStatus",
  "params": {
    "includeLastError": true
  }
}
```

#### 3.1.3 返回结果 Result：`CastBackendStatus`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `backendType` | string | yes | `uxplay`, `unknown` | none | backend 类型摘要；不进入 method name。 |
| `state` | string | yes | `starting`, `ready`, `restarting`, `failed`, `exited` | none | backend 状态。 |
| `discoverable` | boolean | no | `true`, `false` | omitted | receiver 是否可被发现。 |
| `activeSessionAffected` | boolean | no | `true`, `false` | omitted | 当前活动会话是否受影响。 |
| `restartCount` | integer | no | `0..N` | omitted | backend 重启次数。 |
| `lastError` | object | no | `CastBackendErrorSummary` | omitted | 最近错误。 |
| `updatedAt` | string timestamp | no | RFC 3339 | omitted | 更新时间。 |

#### 3.1.4 Success Response d block Example (op=8)

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
    "activeSessionAffected": false,
    "restartCount": 1,
    "updatedAt": "2026-06-19T10:10:00Z"
  }
}
```

#### 3.1.5 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持独立 backend 管理。 | UI 隐藏重启入口。 |
| `PERMISSION_DENIED` | 无权读取 backend 状态。 | 返回权限错误。 |
| `UNAVAILABLE` | receiver runtime 不可用。 | 返回可诊断信息。 |

### 3.2 `cast.restartBackend`

**用途**：请求重启投屏 backend，用于 backend 异常恢复或配置重新加载。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `CastRestartBackendParams` |
| Result Schema | `CastRestartBackendResult` |
| 是否触发事件 | 是，触发 `cast.backendChanged`；若活动会话被结束，也应触发 `cast.sessionStopped`。 |
| 幂等性 / 异步性 | 异步；响应表示请求已接受，不表示重启已完成。 |
| 常见错误 | `PERMISSION_DENIED`, `BUSY`, `INVALID_STATE`, `UNAVAILABLE` |

#### 3.2.1 请求参数 Params：`CastRestartBackendParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `reason` | string | no | `externalRequest`, `backendFailed`, `configReload`, `manualRecovery` | `externalRequest` | 重启原因。 |
| `force` | boolean | no | `true`, `false` | `false` | 是否强制重启；是否结束活动会话待确认。 |
| `activeSessionPolicy` | string | no | `reject`, `stopSession`, `forceRestart` | `reject` | 存在活动投屏时的处理策略。 |

#### 3.2.2 Request d block Example (op=7)

```json
{
  "id": 3502,
  "method": "cast.restartBackend",
  "params": {
    "reason": "manualRecovery",
    "activeSessionPolicy": "stopSession"
  }
}
```

#### 3.2.3 返回结果 Result：`CastRestartBackendResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `accepted` | boolean | yes | `true`, `false` | none | 重启请求是否已接受。 |
| `operationId` | string | no | receiver-local operation id | omitted | 异步操作 ID。 |
| `state` | string | yes | `restarting`, `ready`, `failed` | none | 返回时 backend 状态。 |
| `activeSessionImpact` | string | no | `none`, `willStop`, `alreadyStopped`, `rejected` | omitted | 对活动投屏的影响。 |
| `expectedEvent` | string | no | event name | omitted | 客户端后续可等待的事件。 |

#### 3.2.4 Success Response d block Example (op=8)

```json
{
  "id": 3502,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "accepted": true,
    "operationId": "cast_backend_restart_001",
    "state": "restarting",
    "activeSessionImpact": "willStop",
    "expectedEvent": "cast.backendChanged"
  }
}
```

#### 3.2.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `cast.backendChanged` | backend 进入 restarting、ready、failed 或 exited。 | `CastBackendChangedEvent` | 同步服务状态。 |
| `cast.sessionStopped` | 重启导致活动投屏结束。 | `CastSessionStoppedEvent` | UI 恢复未投屏状态并展示原因。 |

#### 3.2.6 相关 Event d block Example (op=6)

```json
{
  "event": "cast.backendChanged",
  "intent": 1,
  "data": {
    "previousState": "ready",
    "state": "restarting",
    "backendType": "uxplay",
    "reason": "manualRecovery",
    "activeSessionAffected": true
  }
}
```

#### 3.2.7 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `PERMISSION_DENIED` | 调用方无权重启 backend。 | 返回权限错误。 |
| `BUSY` | backend 已在 restarting 或正在执行冲突操作。 | 返回 retry-after 建议。 |
| `INVALID_STATE` | 存在活动会话且 policy 为 `reject`。 | 返回 active session 摘要。 |
| `UNAVAILABLE` | backend 管理器不可用。 | 返回可诊断信息。 |

#### 3.2.8 Error Response d block Example (op=8)

```json
{
  "id": 3502,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Active cast session blocks backend restart.",
    "details": {
      "candidateError": "INVALID_STATE",
      "activeSessionId": "cast_sess_001",
      "activeSessionPolicy": "reject"
    }
  }
}
```

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `cast.backendChanged` | backend 状态、错误或可发现状态变化。 | `CastBackendChangedEvent` | 同步服务可用性；必要时调用 `cast.getBackendStatus`。 | candidate |

### 4.1 `cast.backendChanged`

#### Payload：`CastBackendChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `previousState` | string | no | backend state enum | omitted | 变化前状态。 |
| `state` | string | yes | `starting`, `ready`, `restarting`, `failed`, `exited` | none | 变化后状态。 |
| `backendType` | string | yes | `uxplay`, `unknown` | none | backend 类型摘要。 |
| `reason` | string | no | reason enum | omitted | 变化原因。 |
| `discoverable` | boolean | no | `true`, `false` | omitted | receiver 是否可被发现。 |
| `activeSessionAffected` | boolean | no | `true`, `false` | omitted | 活动会话是否受影响。 |
| `lastError` | object | no | `CastBackendErrorSummary` | omitted | 错误摘要。 |

#### Event d block Example (op=6)

```json
{
  "event": "cast.backendChanged",
  "intent": 1,
  "data": {
    "previousState": "restarting",
    "state": "ready",
    "backendType": "uxplay",
    "reason": "restartCompleted",
    "discoverable": true,
    "activeSessionAffected": false
  }
}
```

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| `state=ready` | 恢复投屏入口。 |
| `state=failed` | 展示错误，允许有权限用户重启。 |
| `activeSessionAffected=true` | 同时关注 `cast.sessionStopped` 或调用 `cast.getSession` 校准。 |

## 5. Capability

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `supported` | boolean | yes | `true`, `false` | 是否支持 `cast.backend`。 |
| `backendTypes` | string[] | yes | `uxplay`, `unknown` | backend 类型摘要。 |
| `supportsRestart` | boolean | yes | `true`, `false` | 是否支持外部重启。 |
| `activeSessionPolicies` | string[] | no | `reject`, `stopSession`, `forceRestart` | 支持的活动会话处理策略。 |
| `requiresPermission` | boolean | yes | `true`, `false` | 重启是否需要高权限。 |

## 6. Schemas

本文采用简单展开模式。

| Schema | 用途 | 定义位置 |
|---|---|---|
| `CastGetBackendStatusParams` | 查询 backend 参数。 | 3.1.1 |
| `CastBackendStatus` | backend 状态。 | 3.1.3 |
| `CastRestartBackendParams` | 重启参数。 | 3.2.1 |
| `CastRestartBackendResult` | 重启结果。 | 3.2.3 |
| `CastBackendChangedEvent` | backend 状态变化事件。 | 4.1 |

## 7. 交互流程示例 Flow Examples

### 7.1 backend 异常后重启

| Step | 交互 | 说明 |
|---:|---|---|
| 1 | `cast.backendChanged(state=failed)` | 客户端收到 backend 异常。 |
| 2 | `cast.restartBackend` | 有权限调用方请求重启。 |
| 3 | `cast.backendChanged(state=restarting)` | UI 显示恢复中。 |
| 4 | `cast.backendChanged(state=ready)` | receiver 重新可用。 |

## 8. Errors

| 错误 | 类型 | 场景 | 说明 |
|---|---|---|---|
| `PERMISSION_DENIED` | common | 无权重启 backend。 | 重启通常需要管理权限。 |
| `BUSY` | common | 正在重启或冲突操作中。 | 返回可重试建议。 |
| `INVALID_STATE` | candidate | 活动会话阻止重启。 | 正式 code 待采纳。 |
| `BACKEND_RESTART_FAILED` | candidate | 重启失败。 | 主要用于 event error summary。 |
| `UNAVAILABLE` | common | backend 管理器不可用。 | 返回可诊断信息。 |

## 9. Legacy Mapping

| Legacy 行为 | Candidate AXTP | 说明 |
|---|---|---|
| `restartUxPlay` | `cast.restartBackend` | UxPlay 作为 backendType，不进入 method name。 |
| `uxplay.ready` | `cast.backendChanged(state=ready)` | backend ready。 |
| `uxplay.exited` | `cast.backendChanged(state=exited)` | backend 退出。 |
| backend error event | `cast.backendChanged(state=failed)` | 错误摘要进入 payload。 |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| Registry | partial | 需确认 active session policy 和权限。 |
| Generated | no | 未进入 generated。 |
| Contract | false | 草案不可直接作为 runtime 合同。 |
| Conformance | needed | 覆盖 ready/failed/restart、权限错误、活动会话策略。 |

## 11. 测试要点

| Case | Given | When | Then |
|---|---|---|---|
| 查询 ready | backend ready | 调用 `cast.getBackendStatus` | 返回 `state=ready`。 |
| 无活动会话重启 | backend ready，无 session | 调用 `cast.restartBackend` | 返回 accepted，事件 restarting -> ready。 |
| 活动会话重启 | active session | 调用 restart | 按 policy 拒绝或停止会话后重启。 |
| backend 异常退出 | backend exited | adapter 检测退出 | 发送 `cast.backendChanged(state=exited/failed)`。 |
| 权限不足 | 普通调用方 | 调用 restart | 返回 `PERMISSION_DENIED`。 |

## 12. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| backend 重启是否强制结束当前投屏？ | product / session | 建议默认 `reject`，可显式 `stopSession`。 | `[REVIEW-ASK]` |
| 重启是否只重启 UxPlay backend？ | boundary | 当前草案只定义投屏 backend，不重启 Launcher/runtime。 | `[REVIEW-DRAFT]` |
| 是否需要重建 adapter 到 backend 的内部连接？ | implementation | 作为实现细节，不进入标准 schema。 | `[REVIEW-DRAFT]` |
| backend restart 权限 scope 如何命名？ | auth | 进入 auth/permission 草案确认。 | `[REVIEW-ASK]` |

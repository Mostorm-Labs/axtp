---
status: draft
contract: false
generated: false
domain: cast
feature: cast.window
registry:
lastReviewed: 2026-06-19
---

# cast.window

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 控制投屏窗口置顶、全屏和还原正常状态，并上报窗口状态变化。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | partial，需确认无活动窗口时的行为和 normal 语义。 |
| Conformance | needed |
| 主要未决问题 | “还原正常状态”是否取消置顶、无活动投屏时是否允许预设窗口状态。 |

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

`cast.window` 用于投屏接收端窗口展示状态控制：置于顶部、进入全屏、还原到正常状态。它只覆盖当前业务需要的窗口状态，不尝试建模完整 OS 窗口管理。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 查询投屏窗口可见性、全屏和置顶状态。 |
| 包含 | 设置全屏、置顶和 normal 模式。 |
| 包含 | 窗口状态变化事件。 |
| 不包含 | 任意窗口坐标、尺寸拖拽、多显示器选择和系统级窗口管理。 |
| 不包含 | PIN 窗口显示隐藏；应由 `cast.pinCodeRequired` 驱动 UI。 |
| 不包含 | 视频画面 layout / transform；见 `video.*` 或 `output.*`。 |
| 数据面 | 不定义 STREAM payload。 |

## 3. 方法 Methods

方法 ID、bitOffset 和 schema fieldId 均为 `TBD after adoption`，由 registry 采纳时分配。

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `cast.getWindowState` | query | 查询投屏窗口状态。 | `CastGetWindowStateParams` | `CastWindowState` | 否 | candidate |
| `cast.setWindowState` | command | 设置投屏窗口置顶、全屏或 normal 模式。 | `CastSetWindowStateParams` | `CastWindowState` | 是，`cast.windowChanged` | candidate |

### 3.1 `cast.getWindowState`

**用途**：查询当前投屏窗口是否存在、是否可见、是否全屏和是否置顶。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `CastGetWindowStateParams` |
| Result Schema | `CastWindowState` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回。 |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.1.1 请求参数 Params：`CastGetWindowStateParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sessionId` | string | no | receiver-local session id | omitted | 指定会话窗口；省略表示当前窗口。 |

#### 3.1.2 Request d block Example (op=7)

```json
{
  "id": 3401,
  "method": "cast.getWindowState",
  "params": {}
}
```

#### 3.1.3 返回结果 Result：`CastWindowState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `hasWindow` | boolean | yes | `true`, `false` | none | 当前是否有投屏窗口。 |
| `visible` | boolean | yes | `true`, `false` | none | 窗口是否可见。 |
| `mode` | string | yes | `normal`, `fullscreen` | none | 当前窗口模式。 |
| `fullscreen` | boolean | yes | `true`, `false` | none | 是否全屏。 |
| `alwaysOnTop` | boolean | yes | `true`, `false` | none | 是否置顶。 |
| `sessionId` | string | no | receiver-local session id | omitted | 关联会话。 |
| `updatedAt` | string timestamp | no | RFC 3339 | omitted | 更新时间。 |

#### 3.1.4 Success Response d block Example (op=8)

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
    "alwaysOnTop": true,
    "sessionId": "cast_sess_001"
  }
}
```

#### 3.1.5 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持投屏窗口控制。 | UI 隐藏控制。 |
| `PERMISSION_DENIED` | 无权读取窗口状态。 | 返回权限错误。 |
| `UNAVAILABLE` | 窗口管理模块不可用。 | 返回可诊断信息。 |

### 3.2 `cast.setWindowState`

**用途**：设置投屏窗口全屏、置顶或 normal 模式。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `CastSetWindowStateParams` |
| Result Schema | `CastWindowState` |
| 是否触发事件 | 是，状态实际变化后触发 `cast.windowChanged`。 |
| 幂等性 / 异步性 | 建议幂等；窗口操作可能异步应用。 |
| 常见错误 | `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `INVALID_STATE`, `UNAVAILABLE` |

#### 3.2.1 请求参数 Params：`CastSetWindowStateParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `mode` | string | no | `normal`, `fullscreen` | omitted | 目标窗口模式。 |
| `fullscreen` | boolean | no | `true`, `false` | omitted | 是否全屏；与 `mode` 二选一或保持一致。 |
| `alwaysOnTop` | boolean | no | `true`, `false` | omitted | 是否置顶。 |
| `sessionId` | string | no | receiver-local session id | omitted | 指定会话窗口。 |
| `applyWhenNoWindow` | string | no | `reject`, `remember` | `reject` | 无活动窗口时拒绝还是保存预设。 |

#### 3.2.2 Request d block Example (op=7)

```json
{
  "id": 3402,
  "method": "cast.setWindowState",
  "params": {
    "mode": "fullscreen",
    "alwaysOnTop": true
  }
}
```

#### 3.2.3 返回结果 Result：`CastWindowState`

字段见 3.1.3。

#### 3.2.4 Success Response d block Example (op=8)

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
    "mode": "fullscreen",
    "fullscreen": true,
    "alwaysOnTop": true,
    "sessionId": "cast_sess_001"
  }
}
```

#### 3.2.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `cast.windowChanged` | mode、fullscreen、alwaysOnTop、visible 变化。 | `CastWindowChangedEvent` | 同步窗口按钮状态。 |

#### 3.2.6 相关 Event d block Example (op=6)

```json
{
  "event": "cast.windowChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "mode",
      "fullscreen",
      "alwaysOnTop"
    ],
    "state": {
      "hasWindow": true,
      "visible": true,
      "mode": "fullscreen",
      "fullscreen": true,
      "alwaysOnTop": true,
      "sessionId": "cast_sess_001"
    }
  }
}
```

#### 3.2.7 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `INVALID_ARGUMENT` | `mode`、`applyWhenNoWindow` 非法，或 fullscreen 与 mode 冲突。 | 返回合法枚举。 |
| `INVALID_STATE` | 当前无投屏窗口且策略为 `reject`。 | 返回 `hasWindow=false`。 |
| `PERMISSION_DENIED` | 无权控制窗口。 | 返回权限错误。 |
| `UNAVAILABLE` | OS/window service 不可用。 | 返回可诊断信息。 |

#### 3.2.8 Error Response d block Example (op=8)

```json
{
  "id": 3402,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "No active cast window.",
    "details": {
      "candidateError": "INVALID_STATE",
      "hasWindow": false
    }
  }
}
```

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `cast.windowChanged` | 投屏窗口可见性、全屏、置顶或模式变化。 | `CastWindowChangedEvent` | 同步 UI；需要完整状态时调用 `cast.getWindowState`。 | candidate |

### 4.1 `cast.windowChanged`

#### Payload：`CastWindowChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `changedFields` | string[] | no | field path array | omitted | 变化字段。 |
| `state` | object | yes | `CastWindowState` | none | 变化后的窗口状态。 |
| `reason` | string | no | `externalSet`, `localUi`, `sessionStarted`, `sessionStopped` | omitted | 变化原因。 |

#### Event d block Example (op=6)

```json
{
  "event": "cast.windowChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "visible"
    ],
    "state": {
      "hasWindow": false,
      "visible": false,
      "mode": "normal",
      "fullscreen": false,
      "alwaysOnTop": false
    },
    "reason": "sessionStopped"
  }
}
```

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| payload 是完整状态 | 可直接同步按钮状态。 |
| fps cap 同时启用 | 窗口操作不应阻塞 HID 输入或 AXTP 解析。 |
| event 丢失 | 调用 `cast.getWindowState` 校准。 |

## 5. Capability

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `supported` | boolean | yes | `true`, `false` | 是否支持 `cast.window`。 |
| `supportsFullscreen` | boolean | yes | `true`, `false` | 是否支持全屏。 |
| `supportsAlwaysOnTop` | boolean | yes | `true`, `false` | 是否支持置顶。 |
| `supportsRememberWhenNoWindow` | boolean | no | `true`, `false` | 无活动窗口时是否允许保存预设。 |
| `modes` | string[] | yes | `normal`, `fullscreen` | 支持的模式。 |

## 6. Schemas

本文采用简单展开模式。

| Schema | 用途 | 定义位置 |
|---|---|---|
| `CastGetWindowStateParams` | 查询窗口状态参数。 | 3.1.1 |
| `CastWindowState` | 窗口状态。 | 3.1.3 |
| `CastSetWindowStateParams` | 设置窗口状态参数。 | 3.2.1 |
| `CastWindowChangedEvent` | 窗口状态变化事件。 | 4.1 |

## 7. 交互流程示例 Flow Examples

### 7.1 置顶、全屏、还原

| Step | 交互 | 说明 |
|---:|---|---|
| 1 | `cast.setWindowState(alwaysOnTop=true)` | 将投屏窗口置顶。 |
| 2 | `cast.windowChanged` | UI 同步置顶按钮。 |
| 3 | `cast.setWindowState(mode=fullscreen)` | 进入全屏。 |
| 4 | `cast.setWindowState(mode=normal)` | 还原正常模式；是否取消置顶待确认。 |

## 8. Errors

| 错误 | 类型 | 场景 | 说明 |
|---|---|---|---|
| `INVALID_ARGUMENT` | common | 参数冲突或枚举非法。 | 返回字段路径。 |
| `INVALID_STATE` | candidate | 无窗口或当前状态不允许切换。 | 正式 code 待采纳。 |
| `PERMISSION_DENIED` | common | 无权控制窗口。 | 返回权限错误。 |
| `UNAVAILABLE` | common | 窗口服务不可用。 | 返回可诊断信息。 |

## 9. Legacy Mapping

| Legacy 行为 | Candidate AXTP | 说明 |
|---|---|---|
| `showCastWindow`, `hideCastWindow` | `cast.setWindowState` 或 local UI | 当前需求不要求隐藏/显示 public method。 |
| `setFullscreen` | `cast.setWindowState(mode=fullscreen)` | 全屏。 |
| `setAlwaysOnTop` | `cast.setWindowState(alwaysOnTop=true)` | 置顶。 |
| `window.changed` | `cast.windowChanged` | 窗口状态变化。 |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| Registry | partial | 需确认 normal 和无窗口策略。 |
| Generated | no | 未进入 generated。 |
| Contract | false | 草案不可直接作为 runtime 合同。 |
| Conformance | needed | 覆盖全屏、置顶、还原、无窗口错误和事件。 |

## 11. 测试要点

| Case | Given | When | Then |
|---|---|---|---|
| 全屏 | active window | 设置 `mode=fullscreen` | 返回 fullscreen 状态并触发事件。 |
| 置顶 | active window | 设置 `alwaysOnTop=true` | 返回置顶状态并触发事件。 |
| 还原 | fullscreen window | 设置 `mode=normal` | 退出全屏。 |
| 无窗口 | no active window | 设置窗口状态 | 按策略返回错误或保存预设。 |
| fps cap 下窗口控制 | targetRenderFps=10 | 切换全屏/还原 | 不影响输入消费和队列稳定。 |

## 12. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| “还原正常状态”是否同时取消置顶？ | UI / behavior | 建议只退出全屏，置顶独立控制。 | `[REVIEW-ASK]` |
| 无活动投屏窗口时是否允许预设窗口状态？ | runtime / UI | 建议默认拒绝，capability 可声明支持 remember。 | `[REVIEW-ASK]` |
| 是否需要 public show/hide window method？ | scope | 当前不需要，隐藏/显示由会话和本地 UI 驱动。 | `[REVIEW-DRAFT]` |

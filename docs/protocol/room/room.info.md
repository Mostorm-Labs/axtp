---
status: draft
contract: false
generated: false
domain: room
feature: room.info
registry:
lastReviewed: 2026-06-15
---

# room.info

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 会议室基础信息、房间身份和房间能力。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | partial |
| Conformance | needed |
| 主要未决问题 | schema 字段、错误模型、legacy 映射和 conformance case 仍需人工确认。 |

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

本文中的 `sid="12345678"`、`id=101`、`intent=1` 均为示例值。正式 methodId、eventId、fieldId、errorCode、intent bit 由 registry 采纳后分配。

业务草案不得使用 JSON-RPC 2.0 外层格式作为 AXTP wire 示例；不要在 AXTP 示例中写 `jsonrpc`、JSON-RPC 外层 `id/method/params`，或把 JSON-RPC envelope 当作 AXTP envelope。


## 1. 功能说明

`room.info` 用于会议室基础信息、房间身份和房间能力。

本文是 `docs/protocol` 下的协议草案或可读说明，不是新的机器事实源。draft / review-ok 阶段不得作为 runtime 实现合同；正式实现必须以 `registry/**/*.yaml`、`protocol/axtp.protocol.yaml`、`docs/generated/**` 和 conformance case 为准。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | room.info 的能力发现、配置、状态、动作或事件。 |
| 包含 | 与 room.info 直接相关的 method/event/schema 草案。 |
| 包含 | 已确认 legacy 协议到 room.info 的语义归类。 |
| 不包含 | 不承载其他 capability feature 的业务语义；跨域关系通过 schema 字段、引用或数据面 stream/file 表达。 |
| 不包含 | method/event 数值 ID 分配；数值以 registry/generated 为准。 |
| 不包含 | 未确认旧协议 payload 的稳定映射。 |
| 数据面 | 本 feature 默认不定义 STREAM payload，所有操作均通过 RPC method/event 完成。 |

## 3. 方法 Methods

方法 ID、bitOffset 和 schema fieldId 均为 `TBD after adoption`，由 registry 采纳时分配。不要在草案中分配正式 ID。

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `room.getInfoCapabilities` | query | 查询 room.info 能力范围 | `GetInfoCapabilitiesParams` | `GetInfoCapabilitiesResult` | 否 | draft |
| `room.getInfoConfig` | query | 查询 room.info 配置 | `GetInfoConfigParams` | `GetInfoConfigResult` | 否 | draft |
| `room.setInfoConfig` | command | 设置 room.info 配置 | `SetInfoConfigParams` | `SetInfoConfigResult` | 是，`room.infoConfigChanged` | draft |
| `room.resetInfoConfig` | action | 恢复 room.info 默认配置 | `ResetInfoConfigParams` | `ResetInfoConfigResult` | 是，`room.infoConfigChanged` | draft |

### 3.1 `room.getInfoCapabilities`

**用途**：查询 room.info 能力范围。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `GetInfoCapabilitiesParams` |
| Result Schema | `GetInfoCapabilitiesResult` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回当前快照。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.1.1 请求参数 Params：`GetInfoCapabilitiesParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | target id | `default` | 查询对象；具体 target 集合由 capability 声明。 |
| `sections` | string[] | no | section name array | omitted | 需要返回的字段段；省略表示默认摘要。 |

#### 3.1.2 Request d block Example (op=7)

```json
{
  "id": 101,
  "method": "room.getInfoCapabilities",
  "params": {
    "target": "default",
    "sections": [
      "summary"
    ]
  }
}
```

读法：该示例只展示 RPC `d` block。字段集合为草案占位，采纳前需按真实 schema 收敛。

#### 3.1.3 返回结果 Result：`GetInfoCapabilitiesResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | object | yes | see schema | none | 当前状态、配置或查询结果。 |
| `sampledAt` | string timestamp | no | RFC 3339 | omitted | 结果采样时间。 |

#### 3.1.4 Success Response d block Example (op=8)

```json
{
  "id": 101,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "state": {
      "target": "default",
      "status": "ok"
    }
  }
}
```

读法：成功响应仍然只展示 RPC `d` block，`id` 必须回显请求 `id`。

#### 3.1.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| 无 | query method 不应因查询触发状态变化事件。 | none | 无需处理。 |

#### 3.1.6 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持该 feature、method、target 或 scope。 | 返回 unsupported feature/method/target。 |
| `INVALID_ARGUMENT` | 请求字段非法、枚举非法或范围非法。 | 返回具体字段路径和合法范围。 |
| `PERMISSION_DENIED` | 调用方无权执行该操作。 | 返回权限错误。 |
| `BUSY` | 设备正在处理冲突操作。 | 建议稍后重试。 |

#### 3.1.7 Error Response d block Example (op=8)

```json
{
  "id": 101,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Invalid argument.",
    "details": {
      "candidateError": "INVALID_ARGUMENT",
      "field": "target",
      "reason": "unsupported target"
    }
  }
}
```

#### 3.1.8 规则

- Request MUST 使用 `op=7`。
- Success / Error Response MUST 使用 `op=8`，并回显 Request 的 `d.id`。
- 草案阶段不得分配正式 methodId、bitOffset 或 fieldId。

### 3.2 `room.getInfoConfig`

**用途**：查询 room.info 配置。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `GetInfoConfigParams` |
| Result Schema | `GetInfoConfigResult` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回当前快照。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.2.1 请求参数 Params：`GetInfoConfigParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | target id | `default` | 查询对象；具体 target 集合由 capability 声明。 |
| `sections` | string[] | no | section name array | omitted | 需要返回的字段段；省略表示默认摘要。 |

#### 3.2.2 Request d block Example (op=7)

```json
{
  "id": 102,
  "method": "room.getInfoConfig",
  "params": {
    "target": "default",
    "sections": [
      "summary"
    ]
  }
}
```

读法：该示例只展示 RPC `d` block。字段集合为草案占位，采纳前需按真实 schema 收敛。

#### 3.2.3 返回结果 Result：`GetInfoConfigResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | object | yes | see schema | none | 当前状态、配置或查询结果。 |
| `sampledAt` | string timestamp | no | RFC 3339 | omitted | 结果采样时间。 |

#### 3.2.4 Success Response d block Example (op=8)

```json
{
  "id": 102,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "state": {
      "target": "default",
      "status": "ok"
    }
  }
}
```

读法：成功响应仍然只展示 RPC `d` block，`id` 必须回显请求 `id`。

#### 3.2.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| 无 | query method 不应因查询触发状态变化事件。 | none | 无需处理。 |

#### 3.2.6 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持该 feature、method、target 或 scope。 | 返回 unsupported feature/method/target。 |
| `INVALID_ARGUMENT` | 请求字段非法、枚举非法或范围非法。 | 返回具体字段路径和合法范围。 |
| `PERMISSION_DENIED` | 调用方无权执行该操作。 | 返回权限错误。 |
| `BUSY` | 设备正在处理冲突操作。 | 建议稍后重试。 |

#### 3.2.7 Error Response d block Example (op=8)

```json
{
  "id": 102,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Invalid argument.",
    "details": {
      "candidateError": "INVALID_ARGUMENT",
      "field": "target",
      "reason": "unsupported target"
    }
  }
}
```

#### 3.2.8 规则

- Request MUST 使用 `op=7`。
- Success / Error Response MUST 使用 `op=8`，并回显 Request 的 `d.id`。
- 草案阶段不得分配正式 methodId、bitOffset 或 fieldId。

### 3.3 `room.setInfoConfig`

**用途**：设置 room.info 配置。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `SetInfoConfigParams` |
| Result Schema | `SetInfoConfigResult` |
| 是否触发事件 | 是，状态实际变化后触发 `room.infoConfigChanged`。 |
| 幂等性 / 异步性 | 建议幂等；重复提交相同目标状态应成功，可不重复触发事件。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED` |

#### 3.3.1 请求参数 Params：`SetInfoConfigParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | target id | `default` | 设置对象；具体 target 集合由 capability 声明。 |
| `config` | object | yes | see schema | none | 目标配置或状态片段；字段需在采纳前确认。 |

#### 3.3.2 Request d block Example (op=7)

```json
{
  "id": 103,
  "method": "room.setInfoConfig",
  "params": {
    "target": "default",
    "config": {
      "enabled": true
    }
  }
}
```

读法：该示例只展示 RPC `d` block。字段集合为草案占位，采纳前需按真实 schema 收敛。

#### 3.3.3 返回结果 Result：`SetInfoConfigResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `accepted` | boolean | yes | `true`, `false` | none | 设备是否接受并应用请求。 |
| `state` | object | no | see schema | omitted | 设置后的状态或配置快照。 |

#### 3.3.4 Success Response d block Example (op=8)

```json
{
  "id": 103,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "accepted": true
  }
}
```

读法：成功响应仍然只展示 RPC `d` block，`id` 必须回显请求 `id`。

#### 3.3.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `room.infoConfigChanged` | 该方法导致状态、配置或动作状态实际变化。 | `InfoConfigChangedEvent` | 可直接更新 UI；需要完整状态时调用对应 get method 校准。 |

```json
{
  "event": "room.infoConfigChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "state"
    ],
    "state": {
      "target": "default",
      "status": "ok"
    },
    "reason": "user_request"
  }
}
```

#### 3.3.6 Event d block Example (op=6)

```json
{
  "event": "room.infoConfigChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "config"
    ],
    "config": {
      "mode": "auto"
    },
    "reason": "user_request"
  }
}
```

读法：事件不携带 `d.id`；客户端可按 `data` 更新本地状态，事件丢失或重连后应调用对应 get method 校准。

#### 3.3.7 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持该 feature、method、target 或 scope。 | 返回 unsupported feature/method/target。 |
| `INVALID_ARGUMENT` | 请求字段非法、枚举非法或范围非法。 | 返回具体字段路径和合法范围。 |
| `PERMISSION_DENIED` | 调用方无权执行该操作。 | 返回权限错误。 |
| `BUSY` | 设备正在处理冲突操作。 | 建议稍后重试。 |

#### 3.3.8 Error Response d block Example (op=8)

```json
{
  "id": 103,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Invalid argument.",
    "details": {
      "candidateError": "INVALID_ARGUMENT",
      "field": "target",
      "reason": "unsupported target"
    }
  }
}
```

#### 3.3.9 规则

- Request MUST 使用 `op=7`。
- Success / Error Response MUST 使用 `op=8`，并回显 Request 的 `d.id`。
- 草案阶段不得分配正式 methodId、bitOffset 或 fieldId。

### 3.4 `room.resetInfoConfig`

**用途**：恢复 room.info 默认配置。

| 项 | 内容 |
|---|---|
| 调用类型 | action |
| Params Schema | `ResetInfoConfigParams` |
| Result Schema | `ResetInfoConfigResult` |
| 是否触发事件 | 是，状态实际变化后触发 `room.infoConfigChanged`。 |
| 幂等性 / 异步性 | 建议幂等；重复提交相同目标状态应成功，可不重复触发事件。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED` |

#### 3.4.1 请求参数 Params：`ResetInfoConfigParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | target id | `default` | 动作对象；具体 target 集合由 capability 声明。 |
| `reason` | string | no | caller-defined reason | omitted | 调用方给出的动作原因。 |

#### 3.4.2 Request d block Example (op=7)

```json
{
  "id": 104,
  "method": "room.resetInfoConfig",
  "params": {
    "target": "default",
    "reason": "user_request"
  }
}
```

读法：该示例只展示 RPC `d` block。字段集合为草案占位，采纳前需按真实 schema 收敛。

#### 3.4.3 返回结果 Result：`ResetInfoConfigResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `accepted` | boolean | yes | `true`, `false` | none | 设备是否接受动作请求。 |
| `actionId` | string | no | opaque action id | omitted | 动作 ID，用于日志或异步关联。 |

#### 3.4.4 Success Response d block Example (op=8)

```json
{
  "id": 104,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "accepted": true
  }
}
```

读法：成功响应仍然只展示 RPC `d` block，`id` 必须回显请求 `id`。

#### 3.4.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `room.infoConfigChanged` | 该方法导致状态、配置或动作状态实际变化。 | `InfoConfigChangedEvent` | 可直接更新 UI；需要完整状态时调用对应 get method 校准。 |

```json
{
  "event": "room.infoConfigChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "state"
    ],
    "state": {
      "target": "default",
      "status": "ok"
    },
    "reason": "user_request"
  }
}
```

#### 3.4.6 Event d block Example (op=6)

```json
{
  "event": "room.infoConfigChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "config"
    ],
    "config": {
      "mode": "auto"
    },
    "reason": "user_request"
  }
}
```

读法：事件不携带 `d.id`；客户端可按 `data` 更新本地状态，事件丢失或重连后应调用对应 get method 校准。

#### 3.4.7 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持该 feature、method、target 或 scope。 | 返回 unsupported feature/method/target。 |
| `INVALID_ARGUMENT` | 请求字段非法、枚举非法或范围非法。 | 返回具体字段路径和合法范围。 |
| `PERMISSION_DENIED` | 调用方无权执行该操作。 | 返回权限错误。 |
| `BUSY` | 设备正在处理冲突操作。 | 建议稍后重试。 |

#### 3.4.8 Error Response d block Example (op=8)

```json
{
  "id": 104,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Invalid argument.",
    "details": {
      "candidateError": "INVALID_ARGUMENT",
      "field": "target",
      "reason": "unsupported target"
    }
  }
}
```

#### 3.4.9 规则

- Request MUST 使用 `op=7`。
- Success / Error Response MUST 使用 `op=8`，并回显 Request 的 `d.id`。
- 草案阶段不得分配正式 methodId、bitOffset 或 fieldId。

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `room.infoConfigChanged` | room.info 配置变化 | `InfoConfigChangedEvent` | 更新 UI 或调用对应 get method 校准 | draft |

### 4.1 `room.infoConfigChanged`

**触发条件**：room.info 配置变化。

#### 4.1.1 Payload：`InfoConfigChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `changedFields` | string[] | no | field path array | omitted | 变化字段路径。 |
| `state` | object | no | see schema | omitted | 变化后的状态、配置或摘要。 |
| `source` | string enum | no | `remoteApp`, `localPanel`, `devicePolicy`, `adapter`, `unknown` | `unknown` | 状态变化来源。 |
| `reason` | string enum | no | feature-specific | `unknown` | 状态变化原因。 |
| `stateRevision` | uint32 | no | monotonic counter | omitted | 状态版本，用于多端同步和去重。 |

#### 4.1.2 Event d block Example (op=6)

```json
{
  "event": "room.infoConfigChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "state"
    ],
    "state": {
      "target": "default",
      "status": "ok"
    },
    "source": "remoteApp",
    "reason": "user_request",
    "stateRevision": 1
  }
}
```

#### 4.1.3 客户端处理建议

| 场景 | 建议 |
|---|---|
| payload 是完整状态 | 可直接更新 UI 或本地缓存。 |
| payload 是变化片段 | 调用对应 get method 校准完整状态。 |
| event 丢失或重连 | 重连后主动调用 get method 校准。 |

#### 4.1.4 规则

- Event MUST 使用 `op=6`。
- Event MUST NOT 携带 `d.id`。
- Event payload MUST 放在 `d.data` 中。

## 5. Capability

Capability name: `room.info`。

设备通过 capability 声明是否支持该 feature，以及支持哪些范围、模式、对象或约束。Capability 字段只描述“设备能做什么”，不得混入 method params/result 或 event payload。

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `room.info` | none | capability 名称。 |
| `supportedMethods` | string[] | no | method name array | omitted | 支持的 method 列表；采纳后应由 capability discovery 或 registry/generated 表达。 |
| `supportedEvents` | string[] | no | event name array | omitted | 支持的 event 列表；采纳后应由 capability discovery 或 registry/generated 表达。 |
| `supportedTargets` | string[] | no | target id array | omitted | 支持的对象、通道、端口、组件或 scope。 |
| `constraints` | object | no | feature-specific | omitted | 设备能力限制、范围、模式或策略摘要。 |

## 6. 字段 / Schemas

### 6.1 Schema 层级速览

本草案采用保守 schema 展开方式：method/event 小节给出 Params / Result / Payload 字段表和 JSON `d` block 示例；本章作为 schema 索引，避免在草案阶段重复维护大量未确认字段。

```text
InfoCapability
  capability / supportedMethods / supportedEvents / supportedTargets / constraints
InfoState
  target / status / sampledAt
InfoChangedEvent
  changedFields / state / source / reason / stateRevision
```

### 6.2 请求与响应 Schemas

| Schema | 用途 | 字段定义 |
|---|---|---|
| `GetInfoCapabilitiesParams` | `room.getInfoCapabilities` request params | 见 `room.getInfoCapabilities` 方法小节。 |
| `GetInfoCapabilitiesResult` | `room.getInfoCapabilities` result | 见 `room.getInfoCapabilities` 方法小节。 |
| `GetInfoConfigParams` | `room.getInfoConfig` request params | 见 `room.getInfoConfig` 方法小节。 |
| `GetInfoConfigResult` | `room.getInfoConfig` result | 见 `room.getInfoConfig` 方法小节。 |
| `SetInfoConfigParams` | `room.setInfoConfig` request params | 见 `room.setInfoConfig` 方法小节。 |
| `SetInfoConfigResult` | `room.setInfoConfig` result | 见 `room.setInfoConfig` 方法小节。 |
| `ResetInfoConfigParams` | `room.resetInfoConfig` request params | 见 `room.resetInfoConfig` 方法小节。 |
| `ResetInfoConfigResult` | `room.resetInfoConfig` result | 见 `room.resetInfoConfig` 方法小节。 |

### 6.3 Capability Schemas

Capability 字段见第 5 章。复杂 capability 对象在 registry review 前需要拆成独立字段表。

### 6.4 Event Schemas

| Schema | Event | 字段定义 |
|---|---|---|
| `InfoConfigChangedEvent` | `room.infoConfigChanged` | 见 `room.infoConfigChanged` 事件小节。 |

### 6.5 State / Config / Object Schemas

| Schema | 用途 | 状态 |
|---|---|---|
| `InfoState` | 表达 `room.info` 的当前状态、配置或摘要。 | `[REVIEW-ASK]` |
| `InfoConfig` | 表达 `room.info` 的可写配置。 | `[REVIEW-ASK]` |

## 7. 交互流程示例 Flow Examples

本章只展示多个 method/event 组成的端到端业务流程。单个 method 的 Request / Success Response / Error Response 示例见第 3 章；单个 event 的 Event 示例见第 4 章。

### 7.1 场景：读取或修改 `room.info`

#### Step 1. 调用 method：Request d block (op=7)

```json
{
  "id": 201,
  "method": "room.getInfoCapabilities",
  "params": {}
}
```

#### Step 2. 接收响应：Success Response d block (op=8)

```json
{
  "id": 201,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "accepted": true
  }
}
```


#### Step 3. 订阅事件：Event d block (op=6)

```json
{
  "event": "room.infoConfigChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "state"
    ],
    "state": {
      "target": "default",
      "status": "ok"
    }
  }
}
```

读法：客户端应先通过 capability discovery 判断 feature/method 是否支持；如果事件 payload 不完整或重连后状态不确定，应主动调用 query method 校准。

## 8. 错误

错误处理语义见 `docs/specs/1-core/09-Error-Model.md`；错误注册规则见 `docs/specs/2-registry/04-Errors-Registry.md`。草案不得随意分配正式 numeric errorCode。

| 错误 | 适用场景 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持 feature、method、target、scope 或 section。 | 优先复用通用错误。 |
| `INVALID_ARGUMENT` | 参数非法、枚举非法、范围非法。 | 应指出具体字段。 |
| `INVALID_STATE` | 当前状态不允许执行。 | 如 lifecycle/reset/initialization 冲突。 |
| `BUSY` | 设备或资源繁忙。 | 如已有动作执行中。 |
| `PERMISSION_DENIED` | 调用方权限不足。 | 危险操作或敏感信息读取。 |
| `<FEATURE_SPECIFIC_ERROR>` | 候选业务错误。 | `[REVIEW-DRAFT]`；采纳前确认是否需要 feature-specific errorCode。 |

JSON 示例中的 `status.code` 如果 registry 尚未采纳，可以使用 `10` 作为占位示例，并在 `status.details.candidateError` 中放候选错误名。正式 numeric code 必须由 registry 采纳时分配。

## 9. Legacy 映射

Legacy 映射是迁移证据，不是 runtime 合同。当前映射仍需从 `docs/legacy-migration/classification/` 和旧协议证据中按 `room.info` 人工确认。

| legacy 项 | 候选映射 | 状态 | 说明 |
|---|---|---|---|
| AXDP / Rooms / VM33 / Signage legacy command or field | `room.info` | `[REVIEW-ASK]` | 采纳前补齐确定的旧协议命令、字段路径、状态码和覆盖范围。 |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| registry | not generated | 尚未写入正式 registry YAML。 |
| generated | false | 是否已进入 protocol IR / docs/generated。 |
| protocol draft | draft | 当前草案状态。 |
| registry readiness | partial | 是否可进入 registry review。 |
| conformance | needed | 是否已有测试用例。 |

## 11. 测试要点

| 类型 | 要点 |
|---|---|
| happy path | capability discovery 后调用主要 query/command/action method，返回成功响应。 |
| event path | 会改变状态的 method 成功后，按需产生 changed/progress/state event；客户端可更新 UI 或调用 get 校准。 |
| boundary case | 省略可选字段、非法 target、非法枚举、越界值、空列表和最大对象数量。 |
| error case | unsupported feature/method、permission denied、busy、invalid argument、version/capability mismatch。 |
| compatibility | 新旧 App / 设备组合下，未知可选字段可忽略，未知必填语义必须返回标准错误。 |

## 12. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| `room.info` 的 MVP 字段范围是否完整？ | schema / conformance | 进入 registry review 前由产品、设备实现和测试共同确认。 | open |
| method/event 命名是否需要与已有 generated 事实合并？ | registry | 采纳前搜索 registry/generated，避免重复定义。 | open |
| legacy 命令和字段是否全部映射清楚？ | legacy | 未确认条目保持 `[REVIEW-ASK]`，不得写入正式 YAML。 | open |

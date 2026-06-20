---
status: draft
contract: false
generated: false
domain: device
feature: device.childDevice
registry:
lastReviewed: 2026-06-15
---

# device.childDevice

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 当前 AXTP endpoint 代理、管理或挂载的子设备/级联设备发现、详情读取、可选拓扑读取和子设备状态变化通知。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | partial |
| Conformance | needed |
| 主要未决问题 | schema 字段、错误模型、legacy 映射和 conformance case 仍需人工确认。 |

## 1. 功能说明

`device.childDevice` 用于当前 AXTP endpoint 代理、管理或挂载的子设备/级联设备发现、详情读取、可选拓扑读取和子设备状态变化通知。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | device.childDevice 的能力发现、状态查询、配置或动作控制。 |
| 包含 | 与 device.childDevice 直接相关的 method/event/schema 草案。 |
| 不包含 | 不承载其他 capability feature 的业务语义；跨域关系通过 schema 字段、引用或数据面 stream/file 表达。 |
| 不包含 | method/event 数值 ID 分配；数值以 contract/registry/generated 为准。 |
| 数据面 | 本 feature 默认不定义 STREAM payload，所有操作均通过 RPC method/event 完成。 |

## 3. 方法 Methods

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `device.getInfo` | query | 原草案中出现的候选方法 | `GetInfoParams` | `GetInfoResult` | 否 | draft |
| `device.getTopology` | query | 原草案中出现的候选方法 | `GetTopologyParams` | `DeviceTopology` | 否 | draft |
| `device.getChildren` | query | 原草案中出现的候选方法 | `GetChildrenParams` | `GetChildrenResult` | 否 | draft |
| `device.getChildInfo` | query | 原草案中出现的候选方法 | `GetChildInfoParams` | `ChildDeviceInfo` | 否 | draft |

### 3.1 `device.getInfo`

**用途**：原草案中出现的候选方法。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `GetInfoParams` |
| Result Schema | `GetInfoResult` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回当前快照。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.1.1 请求参数 Params：`GetInfoParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | target id | `default` | 查询对象；具体 target 集合由 capability 声明。 |
| `sections` | string[] | no | section name array | omitted | 需要返回的字段段；省略表示默认摘要。 |

#### 3.1.2 返回结果 Result：`GetInfoResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | object | yes | see schema | none | 当前状态、配置或查询结果。 |
| `sampledAt` | string timestamp | no | RFC 3339 | omitted | 结果采样时间。 |

#### 3.1.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| 无 | query method 不应因查询触发状态变化事件。 | none | 无需处理。 |

#### 3.1.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持该 feature、method、target 或 scope。 | 返回 unsupported feature/method/target。 |
| `INVALID_ARGUMENT` | 请求字段非法、枚举非法或范围非法。 | 返回具体字段路径和合法范围。 |
| `PERMISSION_DENIED` | 调用方无权执行该操作。 | 返回权限错误。 |
| `BUSY` | 设备正在处理冲突操作。 | 建议稍后重试。 |

#### 3.1.5 规则

- Request MUST 使用 `op=7`。
- Success / Error Response MUST 使用 `op=8`，并回显 Request 的 `d.id`。
- 草案阶段不得分配正式 methodId、bitOffset 或 fieldId。

### 3.2 `device.getTopology`

**用途**：原草案中出现的候选方法。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `GetTopologyParams` |
| Result Schema | `DeviceTopology` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回当前快照。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.2.1 请求参数 Params：`GetTopologyParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | target id | `default` | 查询对象；具体 target 集合由 capability 声明。 |
| `sections` | string[] | no | section name array | omitted | 需要返回的字段段；省略表示默认摘要。 |

#### 3.2.2 返回结果 Result：`DeviceTopology`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | object | yes | see schema | none | 当前状态、配置或查询结果。 |
| `sampledAt` | string timestamp | no | RFC 3339 | omitted | 结果采样时间。 |

#### 3.2.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| 无 | query method 不应因查询触发状态变化事件。 | none | 无需处理。 |

#### 3.2.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持该 feature、method、target 或 scope。 | 返回 unsupported feature/method/target。 |
| `INVALID_ARGUMENT` | 请求字段非法、枚举非法或范围非法。 | 返回具体字段路径和合法范围。 |
| `PERMISSION_DENIED` | 调用方无权执行该操作。 | 返回权限错误。 |
| `BUSY` | 设备正在处理冲突操作。 | 建议稍后重试。 |

#### 3.2.5 规则

- Request MUST 使用 `op=7`。
- Success / Error Response MUST 使用 `op=8`，并回显 Request 的 `d.id`。
- 草案阶段不得分配正式 methodId、bitOffset 或 fieldId。

### 3.3 `device.getChildren`

**用途**：原草案中出现的候选方法。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `GetChildrenParams` |
| Result Schema | `GetChildrenResult` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回当前快照。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.3.1 请求参数 Params：`GetChildrenParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | target id | `default` | 查询对象；具体 target 集合由 capability 声明。 |
| `sections` | string[] | no | section name array | omitted | 需要返回的字段段；省略表示默认摘要。 |

#### 3.3.2 返回结果 Result：`GetChildrenResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | object | yes | see schema | none | 当前状态、配置或查询结果。 |
| `sampledAt` | string timestamp | no | RFC 3339 | omitted | 结果采样时间。 |

#### 3.3.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| 无 | query method 不应因查询触发状态变化事件。 | none | 无需处理。 |

#### 3.3.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持该 feature、method、target 或 scope。 | 返回 unsupported feature/method/target。 |
| `INVALID_ARGUMENT` | 请求字段非法、枚举非法或范围非法。 | 返回具体字段路径和合法范围。 |
| `PERMISSION_DENIED` | 调用方无权执行该操作。 | 返回权限错误。 |
| `BUSY` | 设备正在处理冲突操作。 | 建议稍后重试。 |

#### 3.3.5 规则

- Request MUST 使用 `op=7`。
- Success / Error Response MUST 使用 `op=8`，并回显 Request 的 `d.id`。
- 草案阶段不得分配正式 methodId、bitOffset 或 fieldId。

### 3.4 `device.getChildInfo`

**用途**：原草案中出现的候选方法。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `GetChildInfoParams` |
| Result Schema | `ChildDeviceInfo` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回当前快照。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.4.1 请求参数 Params：`GetChildInfoParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | target id | `default` | 查询对象；具体 target 集合由 capability 声明。 |
| `sections` | string[] | no | section name array | omitted | 需要返回的字段段；省略表示默认摘要。 |

#### 3.4.2 返回结果 Result：`ChildDeviceInfo`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | object | yes | see schema | none | 当前状态、配置或查询结果。 |
| `sampledAt` | string timestamp | no | RFC 3339 | omitted | 结果采样时间。 |

#### 3.4.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| 无 | query method 不应因查询触发状态变化事件。 | none | 无需处理。 |

#### 3.4.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持该 feature、method、target 或 scope。 | 返回 unsupported feature/method/target。 |
| `INVALID_ARGUMENT` | 请求字段非法、枚举非法或范围非法。 | 返回具体字段路径和合法范围。 |
| `PERMISSION_DENIED` | 调用方无权执行该操作。 | 返回权限错误。 |
| `BUSY` | 设备正在处理冲突操作。 | 建议稍后重试。 |

#### 3.4.5 规则

- Request MUST 使用 `op=7`。
- Success / Error Response MUST 使用 `op=8`，并回显 Request 的 `d.id`。
- 草案阶段不得分配正式 methodId、bitOffset 或 fieldId。

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `device.childDeviceStateChanged` | 低频连接、在线、关系、摘要状态变化通过 RPC Event | `低频连接、在线、关系、摘要状态变化通过 RPC Event。` | 更新 UI 或调用对应 get method 校准 | draft |

### 4.1 `device.childDeviceStateChanged`

**触发条件**：低频连接、在线、关系、摘要状态变化通过 RPC Event。

#### 4.1.1 Payload：`低频连接、在线、关系、摘要状态变化通过 RPC Event。`

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
  "event": "device.childDeviceStateChanged",
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

Capability name: `device.childDevice`。

设备通过 capability 声明是否支持该 feature，以及支持哪些范围、模式、对象或约束。Capability 字段只描述“设备能做什么”，不得混入 method params/result 或 event payload。

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `device.childDevice` | none | capability 名称。 |
| `supportedTargets` | string[] | no | target id array | omitted | 支持的对象、通道、端口、组件或 scope。 |
| `constraints` | object | no | feature-specific | omitted | 设备能力限制、范围、模式或策略摘要。 |

## 6. 字段 / Schemas

### 6.1 Schema 层级速览

```text
ChildDeviceCapability
  capability / supportedTargets / constraints
ChildDeviceState
  target / status / sampledAt
ChildDeviceChangedEvent
  changedFields / state / source / reason / stateRevision
```

### 6.2 请求与响应 Schemas

| Schema | 用途 | 字段定义 |
|---|---|---|
| `GetInfoParams` | `device.getInfo` request params | 见 `device.getInfo` 方法小节。 |
| `GetInfoResult` | `device.getInfo` result | 见 `device.getInfo` 方法小节。 |
| `GetTopologyParams` | `device.getTopology` request params | 见 `device.getTopology` 方法小节。 |
| `DeviceTopology` | `device.getTopology` result | 见 `device.getTopology` 方法小节。 |
| `GetChildrenParams` | `device.getChildren` request params | 见 `device.getChildren` 方法小节。 |
| `GetChildrenResult` | `device.getChildren` result | 见 `device.getChildren` 方法小节。 |
| `GetChildInfoParams` | `device.getChildInfo` request params | 见 `device.getChildInfo` 方法小节。 |
| `ChildDeviceInfo` | `device.getChildInfo` result | 见 `device.getChildInfo` 方法小节。 |

### 6.3 Capability Schemas

Capability 字段见第 5 章。复杂 capability 对象在 registry review 前需要拆成独立字段表。

### 6.4 Event Schemas

| Schema | Event | 字段定义 |
|---|---|---|
| `低频连接、在线、关系、摘要状态变化通过 RPC Event。` | `device.childDeviceStateChanged` | 见 `device.childDeviceStateChanged` 事件小节。 |

### 6.5 State / Config / Object Schemas

| Schema | 用途 | 状态 |
|---|---|---|
| `ChildDeviceState` | 表达 `device.childDevice` 的当前状态、配置或摘要。 | `[REVIEW-ASK]` |
| `ChildDeviceConfig` | 表达 `device.childDevice` 的可写配置。 | `[REVIEW-ASK]` |

## 7. 错误

| 错误 | 适用场景 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持 feature、method、target、scope 或 section。 | 优先复用通用错误。 |
| `INVALID_ARGUMENT` | 参数非法、枚举非法、范围非法。 | 应指出具体字段。 |
| `INVALID_STATE` | 当前状态不允许执行。 | 如 lifecycle/reset/initialization 冲突。 |
| `BUSY` | 设备或资源繁忙。 | 如已有动作执行中。 |
| `PERMISSION_DENIED` | 调用方权限不足。 | 危险操作或敏感信息读取。 |

## 8. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| `device.childDevice` 的 MVP 字段范围是否完整？ | schema / conformance | 进入 registry review 前由产品、设备实现和测试共同确认。 | open |

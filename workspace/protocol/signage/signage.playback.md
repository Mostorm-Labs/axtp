---
status: draft
contract: false
generated: false
domain: signage
feature: signage.playback
registry:
lastReviewed: 2026-06-15
---

# signage.playback

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 标牌播放控制、播放状态和进度。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | partial |
| Conformance | needed |
| 主要未决问题 | schema 字段、错误模型、legacy 映射和 conformance case 仍需人工确认。 |

## 1. 功能说明

`signage.playback` 用于标牌播放控制、播放状态和进度。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | signage.playback 的能力发现、配置、状态、动作或事件。 |
| 包含 | 与 signage.playback 直接相关的 method/event/schema 草案。 |
| 包含 | 已确认 legacy 协议到 signage.playback 的语义归类。 |
| 不包含 | 不承载其他 capability feature 的业务语义；跨域关系通过 schema 字段、引用或数据面 stream/file 表达。 |
| 不包含 | method/event 数值 ID 分配；数值以 contract/registry/generated 为准。 |
| 不包含 | 未确认旧协议 payload 的稳定映射。 |
| 数据面 | 本 feature 默认不定义 STREAM payload，所有操作均通过 RPC method/event 完成。 |

## 3. 方法 Methods

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `signage.getPlaybackCapabilities` | query | 查询 signage.playback 能力范围 | `GetPlaybackCapabilitiesParams` | `GetPlaybackCapabilitiesResult` | 否 | draft |
| `signage.startPlayback` | action | 开始 signage.playback 任务 | `StartPlaybackParams` | `StartPlaybackResult` | 是，`signage.playbackStateChanged` | draft |
| `signage.stopPlayback` | action | 停止 signage.playback 任务 | `StopPlaybackParams` | `StopPlaybackResult` | 是，`signage.playbackStateChanged` | draft |
| `signage.getPlaybackState` | query | 查询 signage.playback 状态 | `GetPlaybackStateParams` | `GetPlaybackStateResult` | 否 | draft |

### 3.1 `signage.getPlaybackCapabilities`

**用途**：查询 signage.playback 能力范围。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `GetPlaybackCapabilitiesParams` |
| Result Schema | `GetPlaybackCapabilitiesResult` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回当前快照。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.1.1 请求参数 Params：`GetPlaybackCapabilitiesParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | target id | `default` | 查询对象；具体 target 集合由 capability 声明。 |
| `sections` | string[] | no | section name array | omitted | 需要返回的字段段；省略表示默认摘要。 |

#### 3.1.2 Request d block Example (op=7)

```json
{
  "id": 101,
  "method": "signage.getPlaybackCapabilities",
  "params": {
    "target": "default",
    "sections": [
      "summary"
    ]
  }
}
```


#### 3.1.3 返回结果 Result：`GetPlaybackCapabilitiesResult`

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

### 3.2 `signage.startPlayback`

**用途**：开始 signage.playback 任务。

| 项 | 内容 |
|---|---|
| 调用类型 | action |
| Params Schema | `StartPlaybackParams` |
| Result Schema | `StartPlaybackResult` |
| 是否触发事件 | 是，状态实际变化后触发 `signage.playbackStateChanged`。 |
| 幂等性 / 异步性 | 建议幂等；重复提交相同目标状态应成功，可不重复触发事件。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED` |

#### 3.2.1 请求参数 Params：`StartPlaybackParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | target id | `default` | 动作对象；具体 target 集合由 capability 声明。 |
| `reason` | string | no | caller-defined reason | omitted | 调用方给出的动作原因。 |

#### 3.2.2 Request d block Example (op=7)

```json
{
  "id": 102,
  "method": "signage.startPlayback",
  "params": {
    "target": "default",
    "reason": "user_request"
  }
}
```


#### 3.2.3 返回结果 Result：`StartPlaybackResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `accepted` | boolean | yes | `true`, `false` | none | 设备是否接受动作请求。 |
| `actionId` | string | no | opaque action id | omitted | 动作 ID，用于日志或异步关联。 |

#### 3.2.4 Success Response d block Example (op=8)

```json
{
  "id": 102,
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

#### 3.2.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `signage.playbackStateChanged` | 该方法导致状态、配置或动作状态实际变化。 | `PlaybackStateChangedEvent` | 可直接更新 UI；需要完整状态时调用对应 get method 校准。 |

```json
{
  "event": "signage.playbackStateChanged",
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

#### 3.2.6 Event d block Example (op=6)

```json
{
  "event": "signage.playbackStateChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "state"
    ],
    "state": {
      "state": "active"
    },
    "reason": "user_request"
  }
}
```

读法：事件不携带 `d.id`；客户端可按 `data` 更新本地状态，事件丢失或重连后应调用对应 get method 校准。

#### 3.2.7 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持该 feature、method、target 或 scope。 | 返回 unsupported feature/method/target。 |
| `INVALID_ARGUMENT` | 请求字段非法、枚举非法或范围非法。 | 返回具体字段路径和合法范围。 |
| `PERMISSION_DENIED` | 调用方无权执行该操作。 | 返回权限错误。 |
| `BUSY` | 设备正在处理冲突操作。 | 建议稍后重试。 |

#### 3.2.8 Error Response d block Example (op=8)

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

#### 3.2.9 规则

- Request MUST 使用 `op=7`。
- Success / Error Response MUST 使用 `op=8`，并回显 Request 的 `d.id`。
- 草案阶段不得分配正式 methodId、bitOffset 或 fieldId。

### 3.3 `signage.stopPlayback`

**用途**：停止 signage.playback 任务。

| 项 | 内容 |
|---|---|
| 调用类型 | action |
| Params Schema | `StopPlaybackParams` |
| Result Schema | `StopPlaybackResult` |
| 是否触发事件 | 是，状态实际变化后触发 `signage.playbackStateChanged`。 |
| 幂等性 / 异步性 | 建议幂等；重复提交相同目标状态应成功，可不重复触发事件。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED` |

#### 3.3.1 请求参数 Params：`StopPlaybackParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | target id | `default` | 动作对象；具体 target 集合由 capability 声明。 |
| `reason` | string | no | caller-defined reason | omitted | 调用方给出的动作原因。 |

#### 3.3.2 Request d block Example (op=7)

```json
{
  "id": 103,
  "method": "signage.stopPlayback",
  "params": {
    "target": "default",
    "reason": "user_request"
  }
}
```


#### 3.3.3 返回结果 Result：`StopPlaybackResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `accepted` | boolean | yes | `true`, `false` | none | 设备是否接受动作请求。 |
| `actionId` | string | no | opaque action id | omitted | 动作 ID，用于日志或异步关联。 |

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
| `signage.playbackStateChanged` | 该方法导致状态、配置或动作状态实际变化。 | `PlaybackStateChangedEvent` | 可直接更新 UI；需要完整状态时调用对应 get method 校准。 |

```json
{
  "event": "signage.playbackStateChanged",
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
  "event": "signage.playbackStateChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "state"
    ],
    "state": {
      "state": "active"
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

### 3.4 `signage.getPlaybackState`

**用途**：查询 signage.playback 状态。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `GetPlaybackStateParams` |
| Result Schema | `GetPlaybackStateResult` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回当前快照。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.4.1 请求参数 Params：`GetPlaybackStateParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | target id | `default` | 查询对象；具体 target 集合由 capability 声明。 |
| `sections` | string[] | no | section name array | omitted | 需要返回的字段段；省略表示默认摘要。 |

#### 3.4.2 Request d block Example (op=7)

```json
{
  "id": 104,
  "method": "signage.getPlaybackState",
  "params": {
    "target": "default",
    "sections": [
      "summary"
    ]
  }
}
```


#### 3.4.3 返回结果 Result：`GetPlaybackStateResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | object | yes | see schema | none | 当前状态、配置或查询结果。 |
| `sampledAt` | string timestamp | no | RFC 3339 | omitted | 结果采样时间。 |

#### 3.4.4 Success Response d block Example (op=8)

```json
{
  "id": 104,
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

#### 3.4.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| 无 | query method 不应因查询触发状态变化事件。 | none | 无需处理。 |

#### 3.4.6 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持该 feature、method、target 或 scope。 | 返回 unsupported feature/method/target。 |
| `INVALID_ARGUMENT` | 请求字段非法、枚举非法或范围非法。 | 返回具体字段路径和合法范围。 |
| `PERMISSION_DENIED` | 调用方无权执行该操作。 | 返回权限错误。 |
| `BUSY` | 设备正在处理冲突操作。 | 建议稍后重试。 |

#### 3.4.7 Error Response d block Example (op=8)

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

#### 3.4.8 规则

- Request MUST 使用 `op=7`。
- Success / Error Response MUST 使用 `op=8`，并回显 Request 的 `d.id`。
- 草案阶段不得分配正式 methodId、bitOffset 或 fieldId。

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `signage.playbackStateChanged` | signage.playback 状态变化 | `PlaybackStateChangedEvent` | 更新 UI 或调用对应 get method 校准 | draft |

### 4.1 `signage.playbackStateChanged`

**触发条件**：signage.playback 状态变化。

#### 4.1.1 Payload：`PlaybackStateChangedEvent`

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
  "event": "signage.playbackStateChanged",
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

Capability name: `signage.playback`。

设备通过 capability 声明是否支持该 feature，以及支持哪些范围、模式、对象或约束。Capability 字段只描述“设备能做什么”，不得混入 method params/result 或 event payload。

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `signage.playback` | none | capability 名称。 |
| `supportedTargets` | string[] | no | target id array | omitted | 支持的对象、通道、端口、组件或 scope。 |
| `constraints` | object | no | feature-specific | omitted | 设备能力限制、范围、模式或策略摘要。 |

## 6. 字段 / Schemas

### 6.1 Schema 层级速览

```text
PlaybackCapability
  capability / supportedTargets / constraints
PlaybackState
  target / status / sampledAt
PlaybackChangedEvent
  changedFields / state / source / reason / stateRevision
```

### 6.2 请求与响应 Schemas

| Schema | 用途 | 字段定义 |
|---|---|---|
| `GetPlaybackCapabilitiesParams` | `signage.getPlaybackCapabilities` request params | 见 `signage.getPlaybackCapabilities` 方法小节。 |
| `GetPlaybackCapabilitiesResult` | `signage.getPlaybackCapabilities` result | 见 `signage.getPlaybackCapabilities` 方法小节。 |
| `StartPlaybackParams` | `signage.startPlayback` request params | 见 `signage.startPlayback` 方法小节。 |
| `StartPlaybackResult` | `signage.startPlayback` result | 见 `signage.startPlayback` 方法小节。 |
| `StopPlaybackParams` | `signage.stopPlayback` request params | 见 `signage.stopPlayback` 方法小节。 |
| `StopPlaybackResult` | `signage.stopPlayback` result | 见 `signage.stopPlayback` 方法小节。 |
| `GetPlaybackStateParams` | `signage.getPlaybackState` request params | 见 `signage.getPlaybackState` 方法小节。 |
| `GetPlaybackStateResult` | `signage.getPlaybackState` result | 见 `signage.getPlaybackState` 方法小节。 |

### 6.3 Capability Schemas

Capability 字段见第 5 章。复杂 capability 对象在 registry review 前需要拆成独立字段表。

### 6.4 Event Schemas

| Schema | Event | 字段定义 |
|---|---|---|
| `PlaybackStateChangedEvent` | `signage.playbackStateChanged` | 见 `signage.playbackStateChanged` 事件小节。 |

### 6.5 State / Config / Object Schemas

| Schema | 用途 | 状态 |
|---|---|---|
| `PlaybackState` | 表达 `signage.playback` 的当前状态、配置或摘要。 | `[REVIEW-ASK]` |
| `PlaybackConfig` | 表达 `signage.playback` 的可写配置。 | `[REVIEW-ASK]` |

## 7. 交互流程示例 Flow Examples

### 7.1 场景：读取或修改 `signage.playback`

#### Step 1. 调用 method：Request d block (op=7)

```json
{
  "id": 201,
  "method": "signage.getPlaybackCapabilities",
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
  "event": "signage.playbackStateChanged",
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

| 错误 | 适用场景 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持 feature、method、target、scope 或 section。 | 优先复用通用错误。 |
| `INVALID_ARGUMENT` | 参数非法、枚举非法、范围非法。 | 应指出具体字段。 |
| `INVALID_STATE` | 当前状态不允许执行。 | 如 lifecycle/reset/initialization 冲突。 |
| `BUSY` | 设备或资源繁忙。 | 如已有动作执行中。 |
| `PERMISSION_DENIED` | 调用方权限不足。 | 危险操作或敏感信息读取。 |


## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| registry | not generated | 尚未写入正式 registry YAML。 |
| generated | false | 是否已进入 protocol IR / contract/generated。 |
| protocol draft | draft | 当前草案状态。 |
| registry readiness | partial | 是否可进入 registry review。 |
| conformance | needed | 是否已有测试用例。 |

## 11. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| `signage.playback` 的 MVP 字段范围是否完整？ | schema / conformance | 进入 registry review 前由产品、设备实现和测试共同确认。 | open |

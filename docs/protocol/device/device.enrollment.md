---
status: draft
contract: false
generated: false
domain: device
feature: device.enrollment
registry:
lastReviewed: 2026-06-11
---

# AXTP device.enrollment 协议草案

版本：v0.1

归属域：`device`

Capability ID：`device.enrollment`

适用范围：未入管设备通过 pairing code 完成注册纳管、纳管状态查询和变更、纳管状态变化事件。

---

## 协议审核标记（人工复核）

| 标记 | 条目 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-DRAFT]` | `device.enrollment` capability | 本文是根据业务需求创建的协议草案，不是最终事实源。替代已删除的 `device.binding` 草案。 | 产品/架构/研发确认后进入 `adopt-protocol-draft`。 |
| `[REVIEW-RESOLVED]` | 命名 | `device.enrollment` 比 `device.binding` 更准确描述"未入管设备成为后台管理对象"的语义。 | — |
| `[REVIEW-ASK]` | legacy 映射 | 旧协议命令字段和语义仍需确认。 | 采纳前补齐 legacyRefs 或明确 adapter-only。 |

---

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 让未入管设备通过 pairing code / enrollment state 成为后台可管理对象。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | pairing code 生成方向、endpoint 关联字段、解绑语义和跨域副作用仍需确认。 |

---


## JSON 示例约定

草案中的 JSON 示例遵循 [Protocol Draft Conventions](../draft-conventions.md#json-示例约定)。本文件只展示 feature-specific 的 RPC `d` block 示例；Hello / Identify / Identified、`sid`、`op` 和 JSON-RPC 禁用规则不在每篇草案中重复。

## 1. 功能说明

`device.enrollment` 用于设备注册、pairing code 获取、纳管状态查询和变更。它描述"未入管设备成为后台管理对象"的过程，不属于认证会话（`auth.*`），也不属于 room 业务域（`room.*`）。

本文落实 `docs/flows/signage-device-management.md` 中对 legacy `GetBindCode` / `GetBindConfig` / `SetBindConfig` / `OnBindState` 的最终定域。当前 generated 协议未包含这些方法或事件；本文所有 method、event、schema 均为候选，正式数值为 `TBD after adoption`。

**关键证据：** legacy device-sdk 实测中 `GetBindCode` 响应包含 `expiresInSeconds: 1800`（测试 `src/sdk.spec.ts` 中 `createServerSdk register wires command/event handlers` 断言失败暴露）。草案必须保留 `expiresInSeconds` 字段。

---

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | pairing code 获取和刷新、过期时间、纳管状态查询、纳管状态设置、纳管状态变化事件。 |
| 包含 | enrollment 后关联的 endpoint 摘要（endpointId、type、displayName）。 |
| 不包含 | 登录、token、session 鉴权；这些属于 `auth.*`。 |
| 不包含 | room 名称、room profile 修改；enrollment 完成后的 room endpoint 信息属于 `room.info`。 |
| 不包含 | 设备静态身份、硬件型号、软件版本；这些属于 `device.info` 或 `software.*`。 |
| 数据面 | 不使用 STREAM；所有交互通过 RPC method/event。 |

---

## 3. 方法 Methods

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `device.getPairingCode` | query / action | 获取或刷新设备纳管 pairing code。 | `GetPairingCodeParams` | `PairingCodeInfo` | 否 | draft |
| `device.getEnrollmentState` | query | 查询当前纳管状态。 | `GetEnrollmentStateParams` | `EnrollmentState` | 否 | draft |
| `device.setEnrollmentState` | command | 设置纳管状态（绑定成功、解绑等）。 | `SetEnrollmentStateParams` | `SetEnrollmentStateResult` | 是，状态变化后触发 `device.enrollmentStateChanged`。 | draft |

### 3.1 `device.getPairingCode`

| 项 | 内容 |
|---|---|
| 目的 | 返回用于现场纳管或后台认领的 pairing code。 |
| 调用类型 | query / action（Device → Server） |
| Params Schema | `GetPairingCodeParams` |
| Result Schema | `PairingCodeInfo` |
| 事件触发 | 不直接触发事件；pairing code 被使用或过期导致状态变化时由 `device.enrollmentStateChanged` 表达。 |
| 幂等 / 异步 | `refresh=false` 时返回当前有效 code；`refresh=true` 生成新 code 并使旧 code 失效。 |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED`, `INTERNAL_ERROR` |

#### 请求参数 Params：`GetPairingCodeParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `refresh` | boolean | no | `true` / `false` | `false` | 是否强制刷新 pairing code。 |
| `purpose` | string | no | `"initial_enrollment"`, `"re_enrollment"`, `"service_repair"` | `"initial_enrollment"` | code 使用场景。`[REVIEW-DRAFT]` |

#### Request d block Example (op=7)

```json
{
  "id": 101,
  "method": "device.getPairingCode",
  "params": {
    "refresh": true,
    "purpose": "initial_enrollment"
  }
}
```

读法：请求只展示 RPC `d` block；`params` 对应 `GetPairingCodeParams`，省略字段按上表默认值处理。

#### 返回结果 Result：`PairingCodeInfo`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `code` | string | yes | display-safe code | none | 可展示或输入的 pairing code。 |
| `expiresAt` | string | no | RFC 3339 timestamp | omitted | 绝对过期时间。 |
| `expiresInSeconds` | uint32 | no | `> 0` | omitted | 相对过期秒数。legacy device-sdk 实测值为 `1800`，不可省略。 |
| `state` | string | no | `"available"`, `"expired"`, `"used"`, `"disabled"` | `"available"` | code 当前状态。 |

#### Success Response d block Example (op=8)

```json
{
  "id": 101,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "code": "123456",
    "expiresInSeconds": 1800,
    "state": "available"
  }
}
```

读法：`result` 是 `PairingCodeInfo` 的示例快照；正式字段以 registry 采纳后的 schema 为准。

#### `device.getPairingCode` 候选错误

| Error | 类别 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | 设备或服务端不支持 pairing code。 |
| `PERMISSION_DENIED` | common | 无权获取 pairing code。 |
| `INTERNAL_ERROR` | common | 服务端无法生成 code。 |

#### Error Response d block Example (op=8)

```json
{
  "id": 101,
  "status": {
    "ok": false,
    "code": 3,
    "msg": "Request failed.",
    "details": {
      "candidateError": "NOT_SUPPORTED",
      "field": "refresh",
      "reason": "example failure"
    }
  }
}
```

读法：失败响应仍使用 `op=8`，`d.id` 回显请求；草案阶段的错误名放在 `status.details.candidateError` 中。

### 3.2 `device.getEnrollmentState`

| 项 | 内容 |
|---|---|
| 目的 | 查询设备是否已纳管，以及纳管后关联的后台对象摘要。 |
| 调用类型 | query（双向） |
| Params Schema | `GetEnrollmentStateParams` |
| Result Schema | `EnrollmentState` |
| 事件触发 | 无 |
| 幂等性 | 是 |
| 常见错误 | `NOT_SUPPORTED` |

#### 请求参数 Params：`GetEnrollmentStateParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `includeEndpoint` | boolean | no | `true` / `false` | `true` | 是否返回 enrollment 后的 endpoint 摘要。 |

#### Request d block Example (op=7)

```json
{
  "id": 102,
  "method": "device.getEnrollmentState",
  "params": {
    "includeEndpoint": true
  }
}
```

读法：请求只展示 RPC `d` block；`params` 对应 `GetEnrollmentStateParams`，省略字段按上表默认值处理。

#### 返回结果 Result：`EnrollmentState`

字段见 6.1。

#### Error Response d block Example (op=8)

```json
{
  "id": 102,
  "status": {
    "ok": false,
    "code": 3,
    "msg": "Request failed.",
    "details": {
      "candidateError": "NOT_SUPPORTED",
      "field": "includeEndpoint",
      "reason": "example failure"
    }
  }
}
```

读法：失败响应仍使用 `op=8`，`d.id` 回显请求；草案阶段的错误名放在 `status.details.candidateError` 中。

#### Success Response d block Example (op=8)

```json
{
  "id": 102,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "state": "enrolled",
    "deviceId": "dev_001",
    "workspaceId": "workspace_001",
    "endpoint": {
      "endpointId": "room_101",
      "type": "room",
      "displayName": "Room 101"
    }
  }
}
```

读法：`result` 是 `EnrollmentState` 的示例快照；正式字段以 registry 采纳后的 schema 为准。

### 3.3 `device.setEnrollmentState`

| 项 | 内容 |
|---|---|
| 目的 | 设置纳管状态（绑定成功、解绑、清除失败状态或同步服务端认领结果）。 |
| 调用类型 | command（Server → Device 为主） |
| Params Schema | `SetEnrollmentStateParams` |
| Result Schema | `SetEnrollmentStateResult` |
| 事件触发 | 状态实际变化后触发 `device.enrollmentStateChanged`。 |
| 幂等 / 异步 | 对同一 `desiredState` + `reason` 可幂等；解绑可能异步。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INVALID_STATE`, `PERMISSION_DENIED` |

#### 请求参数 Params：`SetEnrollmentStateParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `desiredState` | string | yes | `"enrolled"`, `"unmanaged"`, `"failed"`, `"pending"` | none | 目标状态。 |
| `reason` | string | no | `"pairing_code_used"`, `"server_claimed"`, `"user_unenrolled"`, `"admin_reset"`, `"unknown"` | `"unknown"` | 状态变化原因。 |
| `endpoint` | `EnrollmentEndpointSummary` | no | see schema | omitted | enrollment 成功后关联的 endpoint 摘要。 |
| `message` | string | no | human-readable | omitted | 失败、解绑或修复说明。 |

#### Request d block Example (op=7)

```json
{
  "id": 103,
  "method": "device.setEnrollmentState",
  "params": {
    "desiredState": "enrolled",
    "reason": "user_request"
  }
}
```

读法：请求只展示 RPC `d` block；`params` 对应 `SetEnrollmentStateParams`，省略字段按上表默认值处理。

#### 返回结果 Result：`SetEnrollmentStateResult`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | `EnrollmentState` | yes | see schema | none | 操作后的纳管状态。 |
| `disconnectExpected` | boolean | no | `true` / `false` | `false` | 解绑或重置是否预期导致连接变化。 |

#### Success Response d block Example (op=8)

```json
{
  "id": 103,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "state": "enrolled",
    "deviceId": "dev_001",
    "workspaceId": "workspace_001",
    "endpoint": {
      "endpointId": "room_101",
      "type": "room",
      "displayName": "Room 101"
    }
  }
}
```

读法：`result` 是 `SetEnrollmentStateResult` 的示例快照；正式字段以 registry 采纳后的 schema 为准。

#### 可能的事件

| Event | 条件 |
|---|---|
| `device.enrollmentStateChanged` | 状态实际变化时触发。 |

#### Event d block Example (op=6)

```json
{
  "event": "device.enrollmentStateChanged",
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

#### `device.setEnrollmentState` 候选错误

| Error | 类别 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | 设备不支持状态变更。 |
| `INVALID_ARGUMENT` | common | desiredState 或 endpoint 字段非法。 |
| `INVALID_STATE` | common | 当前状态不允许变更（如未纳管设备请求解绑）。 |
| `PERMISSION_DENIED` | common | 无权执行此操作。 |

---

#### Error Response d block Example (op=8)

```json
{
  "id": 103,
  "status": {
    "ok": false,
    "code": 3,
    "msg": "Request failed.",
    "details": {
      "candidateError": "NOT_SUPPORTED",
      "field": "desiredState",
      "reason": "example failure"
    }
  }
}
```

读法：失败响应仍使用 `op=8`，`d.id` 回显请求；草案阶段的错误名放在 `status.details.candidateError` 中。

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `device.enrollmentStateChanged` | pairing code 被使用、纳管成功、解绑、纳管失败或状态被服务端同步。 | `EnrollmentStateChangedEvent` | 更新纳管页面、设备列表和后续 room endpoint 操作门禁。 | draft |

### 4.1 `device.enrollmentStateChanged`

| 项 | 内容 |
|---|---|
| 触发条件 | pairing code 被使用、纳管成功/失败、解绑、服务端同步状态。 |
| Payload Schema | `EnrollmentStateChangedEvent` |
| 客户端处理建议 | 状态变为 `enrolled` 且 `endpoint.type=room` 时，后续 room endpoint 操作才可进入 `room.info`。事件丢失时调用 `device.getEnrollmentState` 校准。 |

#### Payload：`EnrollmentStateChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | `EnrollmentState` | yes | see schema | none | 变化后的纳管状态。 |
| `previousState` | string | no | state enum value | omitted | 变化前状态。 |
| `reason` | string | no | `"pairing_code_used"`, `"server_claimed"`, `"user_unenrolled"`, `"admin_reset"`, `"unknown"` | `"unknown"` | 变化原因。 |

---

#### Event d block Example (op=6)

```json
{
  "event": "device.enrollmentStateChanged",
  "intent": 1,
  "data": {
    "state": {
      "state": "enrolled",
      "deviceId": "dev_001",
      "workspaceId": "workspace_001",
      "endpoint": {
        "endpointId": "room_101",
        "type": "room",
        "displayName": "Room 101"
      }
    },
    "previousState": "active",
    "reason": "user_request"
  }
}
```

读法：事件不携带 `d.id`；客户端可按 `data` 更新本地状态，事件丢失或重连后应调用对应 get method 校准。

## 5. Capability

Capability name: `device.enrollment`。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `supportsPairingCode` | boolean | no | `true` / `false` | 是否支持 pairing code。 |
| `pairingCodeTtlSeconds` | uint32 | no | `> 0` | 默认 code TTL（秒）。 |
| `supportsUnenroll` | boolean | no | `true` / `false` | 是否支持远程解绑或清除纳管状态。 |
| `endpointTypes` | string[] | no | `"room"`, `"device"`, `"asset"` | enrollment 后可能生成的 endpoint 类型。 `[REVIEW-ASK]` |

---

## 6. 字段 / Schemas

### 6.1 `EnrollmentState`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | string | yes | `"unmanaged"`, `"pairing_available"`, `"pending"`, `"enrolled"`, `"failed"`, `"unenrolling"` | none | 当前纳管状态。 |
| `deviceId` | string | no | opaque id | omitted | 设备 ID。 |
| `workspaceId` | string | no | opaque id | omitted | 已纳管工作空间 ID。 |
| `endpoint` | `EnrollmentEndpointSummary` | no | see schema | omitted | 纳管后生成或绑定的后台 endpoint。 |
| `updatedAt` | string | no | RFC 3339 timestamp | omitted | 状态更新时间。 |
| `message` | string | no | human-readable | omitted | 失败或待处理说明。 |

### 6.2 `EnrollmentEndpointSummary`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `endpointId` | string | yes | opaque id | none | 后台 endpoint ID。 |
| `type` | string | yes | `"room"`, `"device"`, `"asset"` | none | endpoint 类型。`room.setName` 只允许 `type=room`。 |
| `displayName` | string | no | max length TBD | omitted | endpoint 显示名。 |
| `profileId` | string | no | opaque id | omitted | room profile 或业务 profile ID。 |

---

## 7. 交互流程示例 Flow Examples

### 7.1 获取 pairing code

**场景**：设备向云端请求注册码，设备展示给用户输入。

请求（Device → Server）：

```json
{
  "id": 1,
  "method": "device.getPairingCode",
  "params": {
    "refresh": false,
    "purpose": "initial_enrollment"
  }
}
```

响应：

```json
{
  "id": 1,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "code": "ABC123",
    "expiresAt": "2026-06-11T10:30:00Z",
    "expiresInSeconds": 1800,
    "state": "available"
  }
}
```

**读法**：`expiresInSeconds` 来自 legacy device-sdk 实测证据（`src/sdk.spec.ts` 断言差异暴露），草案必须保留。设备展示 `code` 和倒计时；用户在云端管理系统输入此 code。

### 7.2 查询纳管状态

**场景**：云端查询设备是否已注册。

请求：

```json
{
  "id": 2,
  "method": "device.getEnrollmentState",
  "params": {
    "includeEndpoint": true
  }
}
```

未纳管时响应：

```json
{
  "id": 2,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "state": "unmanaged",
    "deviceId": "<DEVICE_ID>"
  }
}
```

已纳管时响应：

```json
{
  "id": 2,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "state": "enrolled",
    "deviceId": "<DEVICE_ID>",
    "workspaceId": "<WORKSPACE_ID>",
    "endpoint": {
      "endpointId": "<ROOM_ENDPOINT_ID>",
      "type": "room",
      "displayName": "Boardroom A"
    },
    "updatedAt": "2026-06-11T10:02:00Z"
  }
}
```

### 7.3 设置纳管状态（注册成功）

**场景**：用户在云端输入注册码后，云端通知设备注册成功。

请求（Server → Device）：

```json
{
  "id": 3,
  "method": "device.setEnrollmentState",
  "params": {
    "desiredState": "enrolled",
    "reason": "pairing_code_used",
    "endpoint": {
      "endpointId": "<ROOM_ENDPOINT_ID>",
      "type": "room",
      "displayName": "Boardroom A"
    }
  }
}
```

响应：

```json
{
  "id": 3,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "state": {
      "state": "enrolled",
      "deviceId": "<DEVICE_ID>",
      "workspaceId": "<WORKSPACE_ID>",
      "endpoint": {
        "endpointId": "<ROOM_ENDPOINT_ID>",
        "type": "room",
        "displayName": "Boardroom A"
      }
    },
    "disconnectExpected": false
  }
}
```

**读法**：Server → Device 方向设置 enrolled 状态，同时下发 endpoint 信息。设备保存后后续 room endpoint 操作可进入 `room.info`。

### 7.4 纳管状态变化事件

**场景**：pairing code 被使用后，设备收到状态变化事件。

```json
{
  "event": "device.enrollmentStateChanged",
  "intent": 1,
  "data": {
    "previousState": "pending",
    "reason": "pairing_code_used",
    "state": {
      "state": "enrolled",
      "deviceId": "<DEVICE_ID>",
      "workspaceId": "<WORKSPACE_ID>",
      "endpoint": {
        "endpointId": "<ROOM_ENDPOINT_ID>",
        "type": "room",
        "displayName": "Boardroom A"
      },
      "updatedAt": "2026-06-11T10:02:00Z"
    }
  }
}
```

### 7.5 失败响应（权限不足）

**场景**：无权解绑设备。

请求：

```json
{
  "id": 4,
  "method": "device.setEnrollmentState",
  "params": {
    "desiredState": "unmanaged",
    "reason": "user_unenrolled"
  }
}
```

响应：

```json
{
  "id": 4,
  "status": {
    "ok": false,
    "code": 261,
    "msg": "Permission denied.",
    "details": {
      "candidateError": "ENROLLMENT_PERMISSION_DENIED"
    }
  }
}
```

---

## 8. 错误

| Error | 复用 / 候选 | 说明 | Review |
|---|---|---|---|
| `NOT_SUPPORTED` | common (0x0003) | 设备或服务端不支持 pairing code 或状态变更。 | — |
| `INVALID_ARGUMENT` | common (0x000A) | desiredState 或 endpoint 字段非法。 | `[REVIEW-DRAFT]` |
| `INVALID_STATE` | common (0x000E) | 当前状态不允许变更（如未纳管设备请求解绑）。 | `[REVIEW-DRAFT]` |
| `PERMISSION_DENIED` | common (0x0105) | 无权生成 code、纳管或解绑。 | `[REVIEW-DRAFT]` |
| `ENROLLMENT_CODE_EXPIRED` | candidate | pairing code 已过期。 | `[REVIEW-DRAFT]` |
| `ENROLLMENT_CODE_ALREADY_USED` | candidate | pairing code 已使用。 | `[REVIEW-DRAFT]` |

---

## 9. Legacy 待映射

| Legacy entry | Direction | AXTP target | 状态 | 说明 |
|---|---|---|---|---|
| `GetBindCode` | Device -> Server | `device.getPairingCode` | `[REVIEW-DRAFT]` | legacy 只返回 code + expiresAt；AXTP 增加 expiresInSeconds。 |
| `GetBindConfig` | Server <-> Device | `device.getEnrollmentState` | `[REVIEW-DRAFT]` | legacy 字段 `bound`(bool) → AXTP `state`(enum)，语义更丰富。 |
| `SetBindConfig` | Server -> Device | `device.setEnrollmentState` | `[REVIEW-DRAFT]` | legacy `bound: true` → AXTP `desiredState: "enrolled"`。 |
| `OnBindState` | Server -> Device | `device.enrollmentStateChanged` | `[REVIEW-DRAFT]` | legacy 事件标记为"未研发"，AXTP 事件为新设计。 |

---

## 10. Registry / Conformance 状态

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method / event IDs | `TBD after adoption` |
| Conformance | 需覆盖 pairing code TTL、状态查询、状态变更事件、解绑权限、legacy `expiresInSeconds`。 |

---

## 11. 测试要点

- `device.getPairingCode` 返回 `code`、`expiresAt`、`expiresInSeconds`。`expiresInSeconds` 不可省略。
- `device.getEnrollmentState` 未纳管时返回 `state: "unmanaged"`；已纳管时返回 `state: "enrolled"` + endpoint。
- `device.setEnrollmentState(desiredState: "enrolled")` 后触发 `device.enrollmentStateChanged`。
- 未 enrolled 时调用需要 room endpoint 的协议应被拒绝或隐藏。
- 解绑权限不足返回 `PERMISSION_DENIED`。
- `refresh=true` 应使旧 code 失效并返回新 code。

---

## 12. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| pairing code 是设备主动拉取，还是服务端预生成后由设备展示？ | 方法方向和缓存策略 | 保留 Device → Server current evidence，同时允许服务端 handler 生成。 | `[REVIEW-ASK]` |
| `workspaceId` / `endpointId` 是否都能暴露给设备？ | schema / privacy | 先作为 optional 摘要字段，采纳前与产品和安全确认。 | `[REVIEW-ASK]` |
| 解绑是否清除本地播放列表、网络配置或软件配置？ | 跨域副作用 | 不在 `device.enrollment` 内隐式清除；需要显式调用对应域。 | `[REVIEW-DRAFT]` |
| 状态枚举首批值 | schema / conformance | P0 至少覆盖 `unmanaged`、`pending`、`enrolled`；`pairing_available`、`failed`、`unenrolling` 是否纳入 P0？ | `[REVIEW-ASK]` |
| `device.enrollment` 是否需要 `device.revokeEnrollment` 方法？ | method 完整性 | 当前用 `setEnrollmentState(desiredState: "unmanaged")` 替代；如果需要独立权限或流程则另建方法。 | `[REVIEW-ASK]` |

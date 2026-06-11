---
status: draft
contract: false
generated: false
domain: device
feature: device.enrollment
registry:
lastReviewed: 2026-06-11
---

# device.enrollment

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
| 主要未决问题 | pairing code 生成方向、租户/账号 claim 字段、解绑语义和错误细分仍需确认。 |

## 1. 功能说明

`device.enrollment` 用于设备注册、pairing code、纳管、解绑和绑定状态同步。它描述“未入管设备成为后台管理对象”的过程，不属于认证会话，也不属于 room 业务域。

本文落实 `docs/flows/signage-device-management.md` 中对 legacy `GetBindCode` / `GetBindConfig` / `SetBindConfig` / `OnBindState` 的最终定域。当前 generated 协议未包含这些方法或事件；本文所有 method、event、schema、fieldId 均为候选，正式数值为 `TBD after adoption`。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | pairing code 获取、过期时间、纳管状态查询、纳管状态设置、纳管状态变化事件。 |
| 包含 | enrollment 后关联的 endpoint 摘要，例如 `endpointId`、`endpoint.type`、displayName。 |
| 不包含 | 登录、token、session 鉴权；这些属于 `auth.*`。 |
| 不包含 | room 名称、room profile 修改；enrollment 完成后的 room endpoint 信息属于 `room.info`。 |
| 不包含 | 设备静态身份、硬件型号、软件版本；这些属于 `device.info` 或 `software.*`。 |
| 数据面 | 不使用 STREAM；所有交互通过 RPC method/event。 |

## 3. 方法

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `device.getPairingCode` | query / action | 获取或刷新设备纳管 pairing code。 | `GetPairingCodeParams` | `PairingCodeInfo` | 否 | draft |
| `device.getEnrollmentState` | query | 查询当前纳管状态。 | `GetEnrollmentStateParams` | `EnrollmentState` | 否 | draft |
| `device.setEnrollmentState` | command | 服务端或设备端设置纳管状态，例如解绑、标记纳管完成。 | `SetEnrollmentStateParams` | `SetEnrollmentStateResult` | 是，状态变化后触发 `device.enrollmentStateChanged`。 | draft |

### 3.1 `device.getPairingCode`

| 项 | 内容 |
|---|---|
| 目的 | 返回用于现场纳管或后台认领的 pairing code。 |
| 调用类型 | query / action |
| Params Schema | `GetPairingCodeParams` |
| Result Schema | `PairingCodeInfo` |
| 事件触发 | 不直接触发事件；pairing code 被使用或过期导致状态变化时由 `device.enrollmentStateChanged` 表达。 |
| 幂等 / 异步 | `refresh=false` 时应返回当前有效 code；`refresh=true` 可生成新 code 并使旧 code 失效。 |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED`, `BUSY`, `INTERNAL_ERROR` |

#### 请求参数 Params：`GetPairingCodeParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `refresh` | boolean | no | `true`, `false` | `false` | 是否强制刷新 pairing code。 |
| `purpose` | enum | no | `initial_enrollment`, `re_enrollment`, `service_repair`, `unknown` | `initial_enrollment` | code 使用场景。 |

#### 返回结果 Result：`PairingCodeInfo`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `code` | string | yes | display-safe code | none | 可展示或输入的 pairing code。 |
| `expiresAt` | string timestamp | no | RFC 3339 | omitted | 绝对过期时间。 |
| `expiresInSeconds` | uint32 | no | `0..uint32 max` | omitted | 相对过期秒数；legacy device-sdk 测试显示当前响应包含 `1800`。 |
| `state` | enum | no | `available`, `expired`, `used`, `disabled` | `available` | code 状态。 |

### 3.2 `device.getEnrollmentState`

| 项 | 内容 |
|---|---|
| 目的 | 查询设备是否已纳管，以及纳管后关联的后台对象摘要。 |
| 调用类型 | query |
| Params Schema | `GetEnrollmentStateParams` |
| Result Schema | `EnrollmentState` |
| 事件触发 | 否 |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED`, `INTERNAL_ERROR` |

#### 请求参数 Params：`GetEnrollmentStateParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `includeEndpoint` | boolean | no | `true`, `false` | `true` | 是否返回 enrollment 后的 endpoint 摘要。 |

#### 返回结果 Result：`EnrollmentState`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | enum | yes | `unmanaged`, `pairing_available`, `pending`, `enrolled`, `failed`, `unenrolling`, `unknown` | none | 当前纳管状态。 |
| `deviceId` | string | no | AXTP / product device id | omitted | 设备 ID。 |
| `tenantId` | string | no | opaque id | omitted | 已纳管租户。 |
| `accountId` | string | no | opaque id | omitted | 已认领账号。 |
| `endpoint` | `EnrollmentEndpointSummary` | no | see schema | omitted | 纳管后生成或绑定的后台 endpoint。 |
| `updatedAt` | string timestamp | no | RFC 3339 | omitted | 状态更新时间。 |
| `message` | string | no | human-readable | omitted | 失败或待处理说明。 |

### 3.3 `device.setEnrollmentState`

| 项 | 内容 |
|---|---|
| 目的 | 设置纳管状态，例如绑定成功、解绑、清除失败状态或同步服务端认领结果。 |
| 调用类型 | command |
| Params Schema | `SetEnrollmentStateParams` |
| Result Schema | `SetEnrollmentStateResult` |
| 事件触发 | 状态实际变化后触发 `device.enrollmentStateChanged`。 |
| 幂等 / 异步 | 对同一 `desiredState` + `reason` 可以幂等；解绑可能异步并导致后续 capability 变化。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INVALID_STATE`, `PERMISSION_DENIED`, `BUSY`, `INTERNAL_ERROR` |

#### 请求参数 Params：`SetEnrollmentStateParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `desiredState` | enum | yes | `enrolled`, `unmanaged`, `failed`, `pending` | none | 目标状态。 |
| `reason` | enum | no | `pairing_code_used`, `server_claimed`, `user_unenrolled`, `admin_reset`, `service_repair`, `unknown` | `unknown` | 状态变化原因。 |
| `endpoint` | `EnrollmentEndpointSummary` | no | see schema | omitted | enrollment 成功后关联 endpoint 摘要。 |
| `message` | string | no | human-readable | omitted | 失败、解绑或修复说明。 |
| `confirmationToken` | string | no | opaque token | omitted | 解绑或清除纳管状态时的危险操作确认 token。 |

#### 返回结果 Result：`SetEnrollmentStateResult`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | `EnrollmentState` | yes | see schema | none | 操作后的纳管状态。 |
| `accepted` | boolean | no | `true`, `false` | `true` | 异步处理时表示请求已接受。 |
| `disconnectExpected` | boolean | no | `true`, `false` | `false` | 解绑或重置是否预期导致连接变化。 |

## 4. 事件

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `device.enrollmentStateChanged` | pairing code 被使用、纳管成功、解绑、纳管失败或状态被服务端同步。 | `EnrollmentStateChangedEvent` | 更新纳管页、设备列表和后续 room endpoint 操作门禁。 | draft |

### 4.1 `device.enrollmentStateChanged`

#### Payload：`EnrollmentStateChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | `EnrollmentState` | yes | see schema | none | 变化后的纳管状态。 |
| `previousState` | enum | no | `unmanaged`, `pairing_available`, `pending`, `enrolled`, `failed`, `unenrolling`, `unknown` | omitted | 变化前状态。 |
| `reason` | enum | no | same as `SetEnrollmentStateParams.reason` | `unknown` | 变化原因。 |
| `changedFields` | string[] | no | field paths | omitted | 变化字段路径。 |

客户端处理建议：如果状态变为 `enrolled` 且 `endpoint.type=room`，后续 room endpoint 名称和 profile 操作才可进入 `room.info`；如果事件丢失或乱序，调用 `device.getEnrollmentState` 校准。

## 5. Capability

Capability name: `device.enrollment`。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `device.enrollment` | capability 名称。 |
| `supportsPairingCode` | boolean | no | `true`, `false` | 是否支持 pairing code。 |
| `pairingCodeTtlSeconds` | uint32 | no | `0..uint32 max` | 默认 code TTL。 |
| `supportsUnenroll` | boolean | no | `true`, `false` | 是否支持远程解绑或清除纳管状态。 |
| `endpointTypes` | string[] | no | `room`, `device`, `asset`, `unknown` | enrollment 后可能生成的 endpoint 类型。 |

## 6. Schemas

### 6.1 Schema 层级速览

```text
PairingCodeInfo
EnrollmentState
  endpoint: EnrollmentEndpointSummary
EnrollmentStateChangedEvent
  state: EnrollmentState
```

### 6.2 `EnrollmentEndpointSummary`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `endpointId` | string | yes | opaque id | none | 后台 endpoint ID。 |
| `type` | enum | yes | `room`, `device`, `asset`, `unknown` | none | endpoint 类型；`room.setName` 只允许 `room`。 |
| `displayName` | string | no | max length TBD | omitted | endpoint 显示名。 |
| `profileId` | string | no | opaque id | omitted | room profile 或业务 profile ID。 |

## 7. JSON 示例

### 7.1 获取 pairing code

```json
{
  "id": 101,
  "method": "device.getPairingCode",
  "params": {
    "refresh": false,
    "purpose": "initial_enrollment"
  }
}
```

```json
{
  "id": 101,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "code": "<PAIRING_CODE>",
    "expiresAt": "2026-06-11T10:30:00Z",
    "expiresInSeconds": 1800,
    "state": "available"
  }
}
```

读法：`expiresInSeconds` 来自 current device-sdk evidence 中的实际测试差异，草案保留该字段避免 adapter 丢信息。

### 7.2 纳管完成事件

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
      "tenantId": "<TENANT_ID>",
      "endpoint": {
        "endpointId": "<ROOM_ENDPOINT_ID>",
        "type": "room",
        "displayName": "Boardroom A"
      },
      "updatedAt": "2026-06-11T10:02:00Z"
    },
    "changedFields": ["state", "endpoint"]
  }
}
```

### 7.3 解绑失败

```json
{
  "id": 103,
  "method": "device.setEnrollmentState",
  "params": {
    "desiredState": "unmanaged",
    "reason": "user_unenrolled"
  }
}
```

```json
{
  "id": 103,
  "status": {
    "ok": false,
    "code": 9,
    "message": "Permission denied",
    "details": {
      "candidateError": "ENROLLMENT_PERMISSION_DENIED"
    }
  }
}
```

## 8. Candidate Errors

| Error | 复用 / 候选 | 说明 |
|---|---|---|
| `INVALID_ARGUMENT` | common | pairing code purpose、desiredState 或 endpoint 字段非法。 |
| `INVALID_STATE` | common | 当前状态不允许变更，例如未纳管设备请求解绑。 |
| `PERMISSION_DENIED` | common | 调用方无权生成 code、纳管或解绑。 |
| `BUSY` | common | 正在处理纳管或解绑任务。 |
| `ENROLLMENT_CODE_EXPIRED` | candidate | pairing code 已过期。 |
| `ENROLLMENT_CODE_ALREADY_USED` | candidate | pairing code 已使用。 |

## 9. Legacy Mapping

| Legacy entry | Direction | AXTP target | 状态 |
|---|---|---|---|
| `GetBindCode` | Device -> Server | `device.getPairingCode` | `[REVIEW-OK]` |
| `GetBindConfig` | Server <-> Device | `device.getEnrollmentState` | `[REVIEW-DRAFT]` |
| `SetBindConfig` | Server <-> Device | `device.setEnrollmentState` | `[REVIEW-DRAFT]` |
| `OnBindState` | Server -> Device / Device -> Server evidence | `device.enrollmentStateChanged` | `[REVIEW-DRAFT]` |

## 10. Registry / Conformance Status

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method / event IDs | `TBD after adoption` |
| Conformance | 需覆盖 code TTL、状态查询、状态变更事件、解绑权限、legacy `expiresInSeconds`。 |

## 11. Test Notes

- `device.getPairingCode` 返回 `code`、`expiresAt`、`expiresInSeconds`。
- `device.setEnrollmentState(enrolled)` 后触发 `device.enrollmentStateChanged`。
- 未 enrolled 时调用需要 room endpoint 的协议应被拒绝或隐藏。
- 解绑权限不足返回 `PERMISSION_DENIED`。

## 12. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| pairing code 是设备主动拉取，还是服务端预生成后由设备展示？ | 方法方向和缓存策略 | 保留 Device -> Server current evidence，同时允许服务端 handler 生成。 | `[REVIEW-ASK]` |
| `tenantId` / `accountId` / `endpointId` 是否都能暴露给设备？ | schema / privacy | 先作为 optional 摘要字段。 | `[REVIEW-ASK]` |
| 解绑是否清除本地播放列表、网络配置或软件配置？ | 跨域副作用 | 不在 `device.enrollment` 内隐式清除；需要显式调用对应域。 | `[REVIEW-DRAFT]` |

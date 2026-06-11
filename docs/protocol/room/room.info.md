---
status: draft
contract: false
generated: false
domain: room
feature: room.info
registry:
lastReviewed: 2026-06-11
---

# room.info

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 读取和维护 enrollment 后后台生成的 room endpoint 基础信息、业务名称和 room profile。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | room endpoint ID 来源、displayName 长度/字符规则、profile 字段最小集仍需确认。 |

## 1. 功能说明

`room.info` 描述后台 room endpoint 的业务信息。它只在设备完成 `device.enrollment` 后生效；legacy `SetDeviceName` 在 signage flow 中实际设置的是 room endpoint `displayName`，因此映射为 `room.setName`。

本文是对原占位草案的 Stage 20 修改。当前 generated 协议未包含 `room.info` 方法或事件；本文候选 method、event、schema 均需后续采纳到 registry。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | room endpoint 名称读取/设置、room profile 摘要读取、信息变化事件。 |
| 包含 | 以 `endpointId` 或 current enrolled device 的 room endpoint 作为 selector。 |
| 不包含 | 未入管设备注册、pairing code、绑定状态；这些属于 `device.enrollment`。 |
| 不包含 | room 布局、参会人、预约排期、输入源；分别属于 `room.layout`、`room.participant`、`room.schedule`、`room.source`。 |
| 不包含 | 本地设备名称、硬件名或 Launcher 软件名；这些不由 `room.info` 写入。 |
| 数据面 | 不使用 STREAM。 |

## 3. 方法

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `room.getProfile` | query | 读取 room endpoint 的名称和 profile 摘要。 | `GetRoomProfileParams` | `RoomProfile` | 否 | draft |
| `room.setName` | command | 修改 room endpoint `displayName`。 | `SetRoomNameParams` | `SetRoomNameResult` | 是，名称变化后触发 `room.infoChanged`。 | draft |

### 3.1 `room.getProfile`

| 项 | 内容 |
|---|---|
| 目的 | 查询 enrollment 后关联 room endpoint 的业务名称和 profile。 |
| 调用类型 | query |
| Params Schema | `GetRoomProfileParams` |
| Result Schema | `RoomProfile` |
| 事件触发 | 否 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `NOT_FOUND`, `PERMISSION_DENIED`, `INVALID_STATE` |

#### 请求参数 Params：`GetRoomProfileParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `endpointId` | string | no | room endpoint id | current enrolled endpoint | 指定要读取的 room endpoint；省略表示当前 enrolled device 关联 endpoint。 |
| `includeProfile` | boolean | no | `true`, `false` | `true` | 是否返回 profile 摘要。 |

#### 返回结果 Result：`RoomProfile`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `endpointId` | string | yes | opaque id | none | room endpoint ID。 |
| `type` | enum | yes | fixed `room` | none | endpoint 类型；必须为 `room`。 |
| `displayName` | string | yes | max length TBD | none | room endpoint 展示名。 |
| `profileId` | string | no | opaque id | omitted | room profile ID。 |
| `profile` | `RoomProfileSummary` | no | see schema | omitted | room profile 摘要。 |
| `updatedAt` | string timestamp | no | RFC 3339 | omitted | 信息更新时间。 |

### 3.2 `room.setName`

| 项 | 内容 |
|---|---|
| 目的 | 修改 room endpoint `displayName`，用于替代 legacy `SetDeviceName`。 |
| 调用类型 | command |
| Params Schema | `SetRoomNameParams` |
| Result Schema | `SetRoomNameResult` |
| 事件触发 | displayName 实际变化后触发 `room.infoChanged`。 |
| 前置条件 | device 已 enrolled；目标 endpoint 存在；`endpoint.type=room`。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INVALID_STATE`, `NOT_FOUND`, `PERMISSION_DENIED`, `INTERNAL_ERROR` |

#### 请求参数 Params：`SetRoomNameParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `endpointId` | string | no | room endpoint id | current enrolled endpoint | 目标 room endpoint；省略表示当前 enrolled device 关联 endpoint。 |
| `displayName` | string | yes | max length / chars TBD | none | 新 room displayName。 |
| `expectedRevision` | string | no | opaque revision | omitted | 可选乐观锁。 |

#### 返回结果 Result：`SetRoomNameResult`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `profile` | `RoomProfile` | yes | see schema | none | 修改后的 room profile 摘要。 |
| `revision` | string | no | opaque revision | omitted | 新 revision。 |

## 4. 事件

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `room.infoChanged` | room endpoint displayName 或 profile 摘要变化。 | `RoomInfoChangedEvent` | 更新设备列表、room 名称展示和 profile 缓存。 | draft |

### 4.1 `room.infoChanged`

#### Payload：`RoomInfoChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `endpointId` | string | yes | room endpoint id | none | 变化的 endpoint。 |
| `changedFields` | string[] | yes | field paths | none | 例如 `displayName`、`profile.capacity`。 |
| `profile` | `RoomProfile` | no | see schema | omitted | 变化后的摘要或片段。 |
| `reason` | enum | no | `user_request`, `enrollment_completed`, `server_policy`, `unknown` | `unknown` | 变化原因。 |

## 5. Capability

Capability name: `room.info`。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `room.info` | capability 名称。 |
| `supportsSetName` | boolean | no | `true`, `false` | 是否允许 `room.setName`。 |
| `nameMaxLength` | uint32 | no | `1..uint32 max` | displayName 最大长度。 |
| `supportsProfileSummary` | boolean | no | `true`, `false` | 是否支持 profile 摘要读取。 |

## 6. Schemas

### 6.1 Schema 层级速览

```text
RoomProfile
  profile: RoomProfileSummary
RoomInfoChangedEvent
  profile: RoomProfile
```

### 6.2 `RoomProfileSummary`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capacity` | uint32 | no | `0..uint32 max` | omitted | 房间容量。 |
| `location` | string | no | max length TBD | omitted | 位置描述。 |
| `timezone` | string | no | IANA timezone | omitted | room 默认时区。 |
| `tags` | string[] | no | max count TBD | omitted | 业务标签。 |

## 7. JSON 示例

### 7.1 修改 room endpoint 名称

```json
{
  "id": 201,
  "method": "room.setName",
  "params": {
    "endpointId": "<ROOM_ENDPOINT_ID>",
    "displayName": "Lobby Signage"
  }
}
```

```json
{
  "id": 201,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "profile": {
      "endpointId": "<ROOM_ENDPOINT_ID>",
      "type": "room",
      "displayName": "Lobby Signage",
      "profileId": "<ROOM_PROFILE_ID>",
      "updatedAt": "2026-06-11T10:05:00Z"
    },
    "revision": "<REVISION>"
  }
}
```

读法：`room.setName` 不是设备本地名称写入；它修改 enrollment 后后台 room endpoint 的 `displayName`。

### 7.2 未纳管设备修改名称失败

```json
{
  "id": 202,
  "method": "room.setName",
  "params": {
    "displayName": "Room A"
  }
}
```

```json
{
  "id": 202,
  "status": {
    "ok": false,
    "code": 4,
    "message": "Device is not enrolled or endpoint is not a room"
  }
}
```

## 8. Candidate Errors

| Error | 复用 / 候选 | 说明 |
|---|---|---|
| `INVALID_STATE` | common | device 未 enrolled，或当前 endpoint 不是 room。 |
| `NOT_FOUND` | common | endpoint 不存在。 |
| `INVALID_ARGUMENT` | common | displayName 为空、过长或字符非法。 |
| `PERMISSION_DENIED` | common | 调用方无权修改 room 名称。 |

## 9. Legacy Mapping

| Legacy entry | Direction | AXTP target | 状态 |
|---|---|---|---|
| `SetDeviceName` | Server -> Device, Device -> Server | `room.setName` | `[REVIEW-OK]` |
| `GetDeviceInfo.devName` | Server -> Device | `room.getProfile.displayName` or `device.info` summary | `[REVIEW-DRAFT]` |

## 10. Registry / Conformance Status

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method / event IDs | `TBD after adoption` |
| Conformance | 需覆盖未 enrolled、非 room endpoint、名称长度、事件同步。 |

## 11. Test Notes

- 已 enrolled 且 `endpoint.type=room` 时，`room.setName` 成功并触发 `room.infoChanged`。
- 未 enrolled、endpoint 不存在或 endpoint 非 room 时返回 `INVALID_STATE` / `NOT_FOUND`。
- `GetDeviceInfo.devName` 的 adapter 映射应以 room endpoint displayName 为优先候选。

## 12. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| room endpoint ID 是否总能由 device enrollment 返回？ | method selector | `endpointId` 可选，默认 current enrolled endpoint。 | `[REVIEW-ASK]` |
| displayName 字符集、长度和唯一性规则是什么？ | schema / validation | 先记录 max length TBD，采纳前确认。 | `[REVIEW-ASK]` |
| room profile P0 字段是否需要 capacity/location/timezone？ | schema | 作为 optional summary 字段。 | `[REVIEW-DRAFT]` |

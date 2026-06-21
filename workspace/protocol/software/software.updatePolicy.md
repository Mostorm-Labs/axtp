---
status: draft
contract: false
generated: false
domain: software
feature: software.updatePolicy
registry:
lastReviewed: 2026-06-11
---

# AXTP software.updatePolicy 协议草案

版本：v0.1

归属域：`software`

Capability ID：`software.updatePolicy`

适用范围：设备上运行的软件对象（Launcher、signagePlayer、agent 等）的自动更新策略配置。

---

## 协议审核标记（人工复核）

| 标记 | 条目 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-DRAFT]` | `software.updatePolicy` capability | 本文是根据业务需求创建的协议草案，不是最终事实源。 | 产品/架构/研发确认后进入 `adopt-protocol-draft`。 |
| `[REVIEW-ASK]` | `software` 域名 | `software` 不在 Taxonomy spec rule 2 的示例列表（但 rule 2 使用 "e.g." 措辞）。 | 采纳前确认是否需要 taxonomy amendment。 |
| `[REVIEW-ASK]` | `target` 枚举值 | 完整的 target 枚举值列表需要产品和设备确认。 | 采纳前补齐 target enum baseline。 |
| `[REVIEW-ASK]` | 与 `firmware.updatePolicy` 的关系 | `firmware.updatePolicy` 已回退为 v0.1 骨架。两者是共存还是统一到 `software.updatePolicy(target: "firmware")`？ | 采纳前确认边界。 |
| `[REVIEW-ASK]` | legacy 映射 | 旧协议命令字段和语义仍需确认。 | 采纳前补齐 legacyRefs 或明确 adapter-only。 |

---

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 配置 Launcher / signagePlayer / agent 等软件对象的自动更新行为模式、时间窗口、通道和前置条件。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | `updateMode` 枚举首批值、跨日 window 语义、`conditions` 是否包含标牌特有条件。 |

---

## 1. 功能说明

`software.updatePolicy` 用于读取、设置和通知软件自动更新策略。通过 `target` 参数区分不同软件对象，每个对象有独立的更新策略。

本草案落实 signage flow 中 legacy `GetUpdateConfig` / `SetUpdateConfig` 的最终定域：这些配置面向 Launcher / signagePlayer / agent 软件，不属于设备固件策略。固件 OTA 更新策略保留在 `firmware.updatePolicy`。

**v0.1 设计决策：**

- `autoUpdate` 布尔值升级为 `updateMode` 枚举（`"auto"` / `"manual"` / `"notify"`），覆盖"仅下载"、"仅通知"等中间状态。`[REVIEW-DRAFT]`
- `autoUpdateWindow` 单一时间窗口扩展为 `schedule` 结构（支持时间段 + 时区）。`[REVIEW-DRAFT]`
- `channel.release` 保持为 `"release"`（匹配行业惯例）。
- `setUpdatePolicy` 使用 partial update 语义（只传需要修改的字段）。

---

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 更新行为模式（updateMode）、时间窗口（schedule）、发布通道（channel）、前置条件（conditions）。 |
| 包含 | `target=launcher` 时的自动更新策略。 |
| 不包含 | 一次性升级任务、进度和失败；属于 `software.update`。`[REVIEW-OK]` |
| 不包含 | 固件更新策略；属于 `firmware.updatePolicy`。 |
| 不包含 | Launcher 普通运行配置或外观；属于 `software.config`。 |
| 数据面 | 不使用 STREAM。 |

---

## 3. 方法 Methods

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `software.getUpdatePolicy` | query | 查询当前软件更新策略。 | `SoftwareGetUpdatePolicyParams` | `SoftwareUpdatePolicy` | 否 | draft |
| `software.setUpdatePolicy` | command | 设置软件更新策略。 | `SoftwareSetUpdatePolicyParams` | `SoftwareUpdatePolicy` | 是，变化后触发 `software.updatePolicyChanged`。 | draft |
| `software.resetUpdatePolicy` | command | 恢复软件默认更新策略。 | `SoftwareResetUpdatePolicyParams` | `SoftwareUpdatePolicy` | 是，变化后触发 `software.updatePolicyChanged`。 | draft |

### 3.1 `software.getUpdatePolicy`

| 项 | 内容 |
|---|---|
| 目的 | 查询指定软件对象的当前更新策略。 |
| 调用类型 | query（request_response） |
| Params Schema | `SoftwareGetUpdatePolicyParams` |
| Result Schema | `SoftwareUpdatePolicy` |
| 事件触发 | 无 |
| 幂等性 | 是 |
| 常见错误 | `NOT_SUPPORTED`（target 不支持） |

#### 3.1.1 请求参数 Params：`SoftwareGetUpdatePolicyParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` `[REVIEW-ASK]` | none | 要查询策略的软件对象。 |

#### 3.1.2 返回结果 Result：`SoftwareUpdatePolicy`

字段见 6.1。

#### 3.1.3 d block 示例

request:

```json
{
  "id": 101,
  "method": "software.getUpdatePolicy",
  "params": {
    "target": "launcher"
  }
}
```

success:

```json
{
  "id": 101,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "target": "launcher",
    "mode": "manual",
    "allowedWindow": {
      "start": "02:00",
      "end": "05:00"
    },
    "autoInstall": false
  }
}
```

#### 3.1.4 Error Response d block Example (op=8)

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
      "reason": "example failure"
    }
  }
}
```

### 3.2 `software.setUpdatePolicy`

| 项 | 内容 |
|---|---|
| 目的 | 设置指定软件对象的更新策略。未出现的字段保持不变（partial update 语义）。 |
| 调用类型 | command（request_response） |
| Params Schema | `SoftwareSetUpdatePolicyParams` |
| Result Schema | `SoftwareUpdatePolicy` |
| 事件触发 | 策略实际变化后触发 `software.updatePolicyChanged`。 |
| 幂等性 | 否（写入操作） |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED` |

#### 3.2.1 请求参数 Params：`SoftwareSetUpdatePolicyParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 软件对象。 |
| `policy` | object | yes | target-specific fields | none | 要设置的策略片段。未出现的字段保持不变。 |

#### 3.2.2 返回结果 Result：`SoftwareUpdatePolicy`

字段见 6.1。

#### 3.2.3 d block 示例

request:

```json
{
  "id": 102,
  "method": "software.setUpdatePolicy",
  "params": {
    "target": "launcher",
    "policy": {}
  }
}
```

success:

```json
{
  "id": 102,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "target": "launcher",
    "mode": "manual",
    "allowedWindow": {
      "start": "02:00",
      "end": "05:00"
    },
    "autoInstall": false
  }
}
```

#### 3.2.4 可能的事件

| Event | 条件 |
|---|---|
| `software.updatePolicyChanged` | 策略实际变化时触发。 |

#### 3.2.5 `software.setUpdatePolicy` 候选错误

| Error | 类别 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | target、channel 或 schedule 不支持。 |
| `INVALID_ARGUMENT` | common | policy 字段值非法（如时间格式错误）。 |
| `PERMISSION_DENIED` | common | 无权修改更新策略。 |

#### 3.2.6 Error Response d block Example (op=8)

```json
{
  "id": 102,
  "status": {
    "ok": false,
    "code": 3,
    "msg": "Request failed.",
    "details": {
      "candidateError": "NOT_SUPPORTED",
      "field": "target",
      "reason": "example failure"
    }
  }
}
```

### 3.3 `software.resetUpdatePolicy`

| 项 | 内容 |
|---|---|
| 目的 | 恢复指定软件对象的默认更新策略。 |
| 调用类型 | command（request_response） |
| Params Schema | `SoftwareResetUpdatePolicyParams` |
| Result Schema | `SoftwareUpdatePolicy` |
| 事件触发 | 策略实际变化后触发 `software.updatePolicyChanged`。reason 为 `restore_default`。 |
| 幂等性 | 是 |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED` |

#### 3.3.1 请求参数 Params：`SoftwareResetUpdatePolicyParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 要恢复默认策略的软件对象。 |

#### 3.3.2 返回结果 Result：`SoftwareUpdatePolicy`

返回重置后的完整策略，省去额外 round-trip。字段见 6.1。

---

#### 3.3.3 d block 示例

request:

```json
{
  "id": 103,
  "method": "software.resetUpdatePolicy",
  "params": {
    "target": "launcher"
  }
}
```

success:

```json
{
  "id": 103,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "target": "launcher",
    "mode": "manual",
    "allowedWindow": {
      "start": "02:00",
      "end": "05:00"
    },
    "autoInstall": false
  }
}
```

#### 3.3.4 Error Response d block Example (op=8)

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
      "reason": "example failure"
    }
  }
}
```

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `software.updatePolicyChanged` | 策略被 set、reset 或设备策略修改。 | `SoftwareUpdatePolicyChangedEvent` | 刷新更新策略页面；必要时调用 getUpdatePolicy 校准。 | draft |

### 4.1 `software.updatePolicyChanged`

| 项 | 内容 |
|---|---|
| 触发条件 | 更新策略被 `software.setUpdatePolicy`、`software.resetUpdatePolicy` 或设备内部策略修改。 |
| Payload Schema | `SoftwareUpdatePolicyChangedEvent` |
| 客户端处理建议 | 局部更新 UI；必要时调用 `software.getUpdatePolicy` 获取完整策略校准。 |

#### Payload：`SoftwareUpdatePolicyChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 变化的软件对象。 |
| `policy` | object | yes | target-specific fields | none | 变化后的完整策略。 |
| `changedFields` | string[] | no | field paths | omitted | 变化的字段路径列表。 |
| `reason` | string | no | `"user_request"`, `"restore_default"`, `"device_policy"`, `"unknown"` | `"unknown"` | 变化原因。 |

---

#### d block 示例

```json
{
  "event": "software.updatePolicyChanged",
  "intent": 1,
  "data": {
    "target": "launcher",
    "policy": {},
    "changedFields": [
      "state"
    ],
    "reason": "user_request"
  }
}
```


## 5. Capability

Capability name: `software.updatePolicy`。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `supportedTargets` | string[] | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | 支持配置策略的软件对象。 `[REVIEW-ASK]` |
| `supportedChannels` | string[] | no | `"release"`, `"beta"`, `"alpha"` | 支持的更新通道。 |
| `supportsSchedule` | boolean | no | `true` / `false` | 是否支持时间窗口配置。 |

---

## 6. 字段 / Schemas

### 6.1 `SoftwareUpdatePolicy`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 软件对象。 |
| `policy` | object | yes | target-specific fields | none | 更新策略。 |

### 6.2 `target: "launcher"` 策略字段

当 `target` 为 `"launcher"` 时，`policy` 对象包含以下字段：

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `updateMode` | string | yes | `"auto"`, `"manual"`, `"notify"` | `"auto"` | 更新行为模式。`"auto"` 为全自动下载安装；`"manual"` 为手动触发；`"notify"` 为仅通知有可用更新。 |
| `schedule` | `UpdateSchedule` or null | no | see 6.3 | null | 自动更新时间窗口。仅在 `updateMode` 为 `"auto"` 时生效。 |
| `channel` | string | yes | `"release"`, `"beta"`, `"alpha"` | `"release"` | 更新通道。`"release"` 为稳定通道；`"beta"` 为测试通道；`"alpha"` 为开发通道。 |
| `conditions` | `UpdateConditions` or null | no | see 6.4 | null | 自动更新前置条件。 |

### 6.3 `UpdateSchedule`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `start` | string | yes | `HH:mm`（本地时间） | none | 窗口开始时间。 |
| `end` | string | yes | `HH:mm`（本地时间） | none | 窗口结束时间。`end < start` 表示跨午夜。 `[REVIEW-ASK]` |
| `timezone` | string | no | IANA timezone ID | 设备本地时区 | 时区。 |

### 6.4 `UpdateConditions`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `requireIdle` | boolean | no | `true` / `false` | `true` | 是否要求设备空闲时才执行更新。 |
| `requireWifi` | boolean | no | `true` / `false` | `false` | 是否要求 WiFi 网络下才下载更新。 |

`[REVIEW-ASK]` `conditions` 是否需要标牌特有条件（如 `requirePlaybackIdle`——播放内容时暂停更新）。

---

## 7. 交互流程示例 Flow Examples

### 7.1 查询 Launcher 更新策略

**场景**：运维人员查询 Launcher 当前的自动更新策略。

请求：

```json
{
  "id": 1,
  "method": "software.getUpdatePolicy",
  "params": {
    "target": "launcher"
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
    "target": "launcher",
    "policy": {
      "updateMode": "auto",
      "schedule": {
        "start": "02:00",
        "end": "06:00"
      },
      "channel": "release",
      "conditions": {
        "requireIdle": true,
        "requireWifi": false
      }
    }
  }
}
```

**读法**：Launcher 配置为全自动更新，凌晨 2:00-6:00 执行，使用稳定通道，要求设备空闲。

### 7.2 设置 Launcher 更新策略

**场景**：运维人员将 Launcher 切换为 Beta 通道，设置更新窗口。

请求：

```json
{
  "id": 2,
  "method": "software.setUpdatePolicy",
  "params": {
    "target": "launcher",
    "policy": {
      "updateMode": "auto",
      "schedule": {
        "start": "03:00",
        "end": "05:00",
        "timezone": "Asia/Shanghai"
      },
      "channel": "beta"
    }
  }
}
```

响应：

```json
{
  "id": 2,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "target": "launcher",
    "policy": {
      "updateMode": "auto",
      "schedule": {
        "start": "03:00",
        "end": "05:00",
        "timezone": "Asia/Shanghai"
      },
      "channel": "beta",
      "conditions": {
        "requireIdle": true,
        "requireWifi": false
      }
    }
  }
}
```

**读法**：partial update 语义——只传了 `updateMode`、`schedule` 和 `channel`，`conditions` 保持不变。

### 7.3 恢复 Launcher 默认更新策略

**场景**：运维人员恢复 Launcher 出厂默认策略。

请求：

```json
{
  "id": 3,
  "method": "software.resetUpdatePolicy",
  "params": {
    "target": "launcher"
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
    "target": "launcher",
    "policy": {
      "updateMode": "auto",
      "schedule": null,
      "channel": "release",
      "conditions": null
    }
  }
}
```

**读法**：resetUpdatePolicy 返回重置后的完整策略（默认为自动更新、无时间窗口、稳定通道、无条件约束）。

### 7.4 策略变化事件

**场景**：云端通过 setPolicy 修改了 Launcher 更新策略。

```json
{
  "event": "software.updatePolicyChanged",
  "intent": 1,
  "data": {
    "target": "launcher",
    "policy": {
      "updateMode": "auto",
      "schedule": {
        "start": "03:00",
        "end": "05:00",
        "timezone": "Asia/Shanghai"
      },
      "channel": "beta",
      "conditions": {
        "requireIdle": true,
        "requireWifi": false
      }
    },
    "changedFields": ["schedule", "channel"],
    "reason": "user_request"
  }
}
```

### 7.5 失败响应

**场景**：不支持 Beta 通道。

```json
{
  "id": 4,
  "status": {
    "ok": false,
    "code": 3,
    "msg": "Not supported.",
    "details": {
      "field": "policy.channel"
    }
  }
}
```

---

## 8. 错误

| Error | 复用 / 候选 | 说明 | Review |
|---|---|---|---|
| `NOT_SUPPORTED` | common (0x0003) | target、channel 或 schedule 不支持。 | — |
| `INVALID_ARGUMENT` | common (0x000A) | policy 字段值非法（如时间格式错误、channel 值无效）。 | `[REVIEW-DRAFT]` |
| `PERMISSION_DENIED` | common (0x0105) | 无权修改更新策略。 | `[REVIEW-DRAFT]` |

---

## 9. Legacy 待映射

| Legacy entry | Direction | AXTP target | 状态 | 说明 |
|---|---|---|---|---|
| `GetUpdateConfig` | Server -> Device | `software.getUpdatePolicy(target: "launcher")` | `[REVIEW-DRAFT]` | 字段映射：`autoUpdate`(bool) → `updateMode`(enum), `autoUpdateWindow` → `schedule`, `channel` → `channel`。 |
| `SetUpdateConfig` | Server -> Device | `software.setUpdatePolicy(target: "launcher")` | `[REVIEW-DRAFT]` | 同上字段映射。legacy 布尔 `true` 映射为 `"auto"`，`false` 映射为 `"manual"`。 |

---

## 10. 测试要点

- `software.getUpdatePolicy(target: "launcher")` / `software.setUpdatePolicy(target: "launcher")` 策略 get/set 一致。
- `software.setUpdatePolicy` partial update 语义验证：只传 `channel`，其余字段保持不变。
- `software.resetUpdatePolicy(target: "launcher")` 恢复后策略与默认值一致。
- 收到 `software.updatePolicyChanged` 事件后，`software.getUpdatePolicy` 返回的策略应与事件 payload 一致。
- 不支持 `"beta"` 通道的设备传 `channel: "beta"` 时应返回 `NOT_SUPPORTED`。
- 跨日 window（`end < start`）语义需采纳前确认。`[REVIEW-ASK]`

---

## 11. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| `software` domain 未在 Taxonomy spec rule 2 示例列表中 | 采纳阻塞 | 采纳前确认是否需要 taxonomy amendment。 | `[REVIEW-ASK]` |
| `target` 枚举完整值列表 | schema 约束 | 当前草案列出 `launcher`、`signagePlayer`、`agent`；采纳前与产品和设备确认。 | `[REVIEW-ASK]` |
| 与 `firmware.updatePolicy` 的边界 | domain 划分 | 固件 OTA 策略保留在 `firmware.updatePolicy`；软件策略使用 `software.updatePolicy`。是否未来统一到 `software.updatePolicy(target: "firmware")`？ | `[REVIEW-ASK]` |
| `updateMode` 枚举首批值 | schema / conformance | `"auto"` 和 `"manual"` 确定需 P0；`"notify"` 是否纳入 P0？ | `[REVIEW-ASK]` |
| 跨日 window（`end < start`）语义 | schema / tests | 先按跨日候选处理（`start` 当天到次日 `end`），采纳前确认。 | `[REVIEW-ASK]` |
| `conditions` 是否包含标牌特有条件 | schema | 是否需要 `requirePlaybackIdle`（播放内容时暂停更新）？ | `[REVIEW-ASK]` |

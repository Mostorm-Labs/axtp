---
status: draft
contract: false
generated: false
domain: software
feature: software.config
registry:
lastReviewed: 2026-06-11
---

# AXTP software.config 协议草案

版本：v0.1

归属域：`software`

Capability ID：`software.config`

适用范围：设备上运行的软件对象（Launcher、signagePlayer、agent 等）的运行配置读取、设置和恢复默认。

---

## 协议审核标记（人工复核）

| 标记 | 条目 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-DRAFT]` | `software.config` capability | 本文是根据业务需求创建的协议草案，不是最终事实源。 | 产品/架构/研发确认后进入 `adopt-protocol-draft`。 |
| `[REVIEW-ASK]` | `software` 域名 | `software` 不在 Taxonomy spec rule 2 的示例列表（但 rule 2 使用 "e.g." 措辞）。 | 采纳前确认是否需要 taxonomy amendment。 |
| `[REVIEW-ASK]` | `target` 枚举值 | 完整的 target 枚举值列表需要产品和设备确认。 | 采纳前补齐 target enum baseline。 |
| `[REVIEW-ASK]` | legacy 映射 | 旧协议命令字段和语义仍需确认。 | 采纳前补齐 legacyRefs 或明确 adapter-only。 |
| `[REVIEW-ASK]` | `displayName` 归属 | `displayName` 在 `device.info` 中为只读，在 `software.config` 中提供写入路径。同一数据两个协议暴露可能引起困惑。 | 采纳前确认是保留此设计还是将写入路径归入 `device.info` 扩展。 |

---

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 读取、设置、恢复设备上软件对象的运行配置（如 Launcher 面板布局、自动隐藏等）。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | `target` 枚举完整值列表、`values` 是否需要按 target 展开强类型 schema、legacy `ResetConfig` 的真实 scope、`displayName` 归属 `software.config` 还是 `device.info`、`displayName` 最大长度约束。 |

---

## 1. 功能说明

`software.config` 用于设备上运行的软件对象的运行配置，例如 Launcher、signagePlayer、agent。通过 `target` 参数区分不同软件对象，每个对象有独立的配置字段集。

本草案合并了原 `device.appearance` 草案中的外观配置能力和 legacy `SetDeviceName` 设备名设置能力：Launcher 的面板布局、自动隐藏等配置统一作为 `software.config` 的 `target: "launcher"` 配置片段的 `appearance` 子对象；设备显示名称作为 `displayName` 字段提供写入路径，与 `device.info` 的只读 `product.displayName` 保持一致。

注意：系统级恢复、恢复出厂、清除 OS 或设备基线配置仍属于 `system.reset`；`software.config` 不隐式执行系统恢复。

---

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 软件配置读取、设置、恢复默认配置、配置变化事件。 |
| 包含 | `target=launcher` 时的面板布局、自动隐藏配置和设备显示名称。`[REVIEW-DRAFT]` |
| 不包含 | 软件升级和更新策略；属于 `software.update` / `software.updatePolicy`。 |
| 不包含 | 系统/设备级恢复；属于 `system.reset`。 |
| 不包含 | 播放列表配置；属于 `signage.playlist`。 |
| 不包含 | 设备显示名称的只读查询；属于 `device.info` 的 `product.displayName`。 |
| 数据面 | 不使用 STREAM。 |

---

## 3. 方法 Methods

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `software.getConfig` | query | 读取软件配置。 | `SoftwareGetConfigParams` | `SoftwareConfig` | 否 | draft |
| `software.setConfig` | command | 设置软件配置。 | `SoftwareSetConfigParams` | `SoftwareConfig` | 是，变化后触发 `software.configChanged`。 | draft |
| `software.resetConfig` | command | 恢复软件默认配置。 | `SoftwareResetConfigParams` | `SoftwareConfig` | 是，变化后触发 `software.configChanged`。 | draft |

### 3.1 `software.getConfig`

| 项 | 内容 |
|---|---|
| 目的 | 读取指定软件对象的当前运行配置。 |
| 调用类型 | query（request_response） |
| Params Schema | `SoftwareGetConfigParams` |
| Result Schema | `SoftwareConfig` |
| 事件触发 | 无 |
| 幂等性 | 是 |
| 常见错误 | `NOT_SUPPORTED`（target 不支持），`INVALID_ARGUMENT` |

#### 请求参数 Params：`SoftwareGetConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` `[REVIEW-ASK]` | none | 要读取配置的软件对象。 |

#### Request d block Example (op=7)

```json
{
  "id": 101,
  "method": "software.getConfig",
  "params": {
    "target": "launcher"
  }
}
```

读法：请求只展示 RPC `d` block；`params` 对应 `SoftwareGetConfigParams`，省略字段按上表默认值处理。

#### 返回结果 Result：`SoftwareConfig`

字段见 6.1。

#### Error Response d block Example (op=8)

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

读法：失败响应仍使用 `op=8`，`d.id` 回显请求；草案阶段的错误名放在 `status.details.candidateError` 中。

#### Success Response d block Example (op=8)

```json
{
  "id": 101,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "target": "launcher",
    "config": {
      "appearance": {
        "panelLayout": "compact",
        "autoHide": true
      },
      "displayName": "NearHub Display Controller"
    },
    "updatedAt": "2026-06-15T10:00:00Z"
  }
}
```

读法：`result` 是 `SoftwareConfig` 的示例快照；正式字段以 registry 采纳后的 schema 为准。

### 3.2 `software.setConfig`

| 项 | 内容 |
|---|---|
| 目的 | 设置指定软件对象的配置片段。未出现的字段保持不变（partial update 语义）。 |
| 调用类型 | command（request_response） |
| Params Schema | `SoftwareSetConfigParams` |
| Result Schema | `SoftwareConfig` |
| 事件触发 | 配置实际变化后触发 `software.configChanged`。 |
| 幂等性 | 否（写入操作） |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED` |

#### 请求参数 Params：`SoftwareSetConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 软件对象。 |
| `config` | object | yes | target-specific fields | none | 要设置的配置片段。未出现的字段保持不变。 |

#### Request d block Example (op=7)

```json
{
  "id": 102,
  "method": "software.setConfig",
  "params": {
    "target": "launcher",
    "config": {
      "mode": "auto"
    }
  }
}
```

读法：请求只展示 RPC `d` block；`params` 对应 `SoftwareSetConfigParams`，省略字段按上表默认值处理。

#### 返回结果 Result：`SoftwareConfig`

字段见 6.1。

#### Success Response d block Example (op=8)

```json
{
  "id": 102,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "target": "launcher",
    "config": {
      "appearance": {
        "panelLayout": "compact",
        "autoHide": true
      },
      "displayName": "NearHub Display Controller"
    },
    "updatedAt": "2026-06-15T10:00:00Z"
  }
}
```

读法：`result` 是 `SoftwareConfig` 的示例快照；正式字段以 registry 采纳后的 schema 为准。

#### 可能的事件

| Event | 条件 |
|---|---|
| `software.configChanged` | 配置实际变化时触发。 |

#### Event d block Example (op=6)

```json
{
  "event": "software.configChanged",
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

#### `software.setConfig` 候选错误

| Error | 类别 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | target 不支持。 |
| `INVALID_ARGUMENT` | common | config 字段值非法。 |
| `PERMISSION_DENIED` | common | 无权修改配置。 |
| `INVALID_STATE` | common | 软件正在升级或恢复中。 |

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
      "field": "target",
      "reason": "example failure"
    }
  }
}
```

读法：失败响应仍使用 `op=8`，`d.id` 回显请求；草案阶段的错误名放在 `status.details.candidateError` 中。

### 3.3 `software.resetConfig`

| 项 | 内容 |
|---|---|
| 目的 | 恢复指定软件对象的默认配置。 |
| 调用类型 | command（request_response） |
| Params Schema | `SoftwareResetConfigParams` |
| Result Schema | `SoftwareConfig` |
| 事件触发 | 配置实际变化后触发 `software.configChanged`。 |
| 幂等性 | 是（重复调用结果一致） |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED`, `INVALID_STATE` |

#### 请求参数 Params：`SoftwareResetConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 要恢复默认配置的软件对象。 |

#### Request d block Example (op=7)

```json
{
  "id": 103,
  "method": "software.resetConfig",
  "params": {
    "target": "launcher"
  }
}
```

读法：请求只展示 RPC `d` block；`params` 对应 `SoftwareResetConfigParams`，省略字段按上表默认值处理。

#### 返回结果 Result：`SoftwareConfig`

返回重置后的完整配置，省去额外 round-trip。字段见 6.1。

#### Error Response d block Example (op=8)

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

读法：失败响应仍使用 `op=8`，`d.id` 回显请求；草案阶段的错误名放在 `status.details.candidateError` 中。

#### Success Response d block Example (op=8)

```json
{
  "id": 103,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "target": "launcher",
    "config": {
      "appearance": {
        "panelLayout": "compact",
        "autoHide": true
      },
      "displayName": "NearHub Display Controller"
    },
    "updatedAt": "2026-06-15T10:00:00Z"
  }
}
```

读法：`result` 是 `SoftwareConfig` 的示例快照；正式字段以 registry 采纳后的 schema 为准。

#### 可能的事件

| Event | 条件 |
|---|---|
| `software.configChanged` | 配置实际变化时触发。reason 为 `restore_default`。 |

---

#### Event d block Example (op=6)

```json
{
  "event": "software.configChanged",
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

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `software.configChanged` | 软件配置被 set、reset 或设备策略修改。 | `SoftwareConfigChangedEvent` | 局部更新 UI；必要时调用 getConfig 校准。 | draft |

### 4.1 `software.configChanged`

| 项 | 内容 |
|---|---|
| 触发条件 | 软件配置被 `software.setConfig`、`software.resetConfig` 或设备内部策略修改。 |
| Payload Schema | `SoftwareConfigChangedEvent` |
| 客户端处理建议 | 局部更新 UI；必要时调用 `software.getConfig` 获取完整配置校准。 |

#### Payload：`SoftwareConfigChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 变化的软件对象。 |
| `config` | object | yes | target-specific fields | none | 变化后的完整配置片段。 |
| `changedFields` | string[] | no | field paths | omitted | 变化的字段路径列表。字段路径使用点号分隔嵌套层级，如 `"appearance.panelLayout"` 表示 `config.appearance.panelLayout` 字段变化。 |
| `reason` | string | no | `"user_request"`, `"restore_default"`, `"device_policy"`, `"unknown"` | `"unknown"` | 变化原因。 |

---

#### Event d block Example (op=6)

```json
{
  "event": "software.configChanged",
  "intent": 1,
  "data": {
    "target": "launcher",
    "config": {
      "mode": "auto"
    },
    "changedFields": [
      "state"
    ],
    "reason": "user_request"
  }
}
```

读法：事件不携带 `d.id`；客户端可按 `data` 更新本地状态，事件丢失或重连后应调用对应 get method 校准。

## 5. Capability

Capability name: `software.config`。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `supportedTargets` | string[] | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | 支持配置的软件对象。 `[REVIEW-ASK]` |
| `supportsReset` | boolean | no | `true` / `false` | 是否支持恢复默认配置。 |
| `resetMayRestartSoftware` | boolean | no | `true` / `false` | 恢复是否可能重启软件。 |

---

## 6. 字段 / Schemas

### 6.1 `SoftwareConfig`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 软件对象。 |
| `config` | object | yes | target-specific fields | none | 配置值。具体字段由 target 决定。 |

### 6.2 `target: "launcher"` 配置字段

当 `target` 为 `"launcher"` 时，`config` 对象包含以下顶层字段：

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `displayName` | string | no | non-empty, max 64 chars `[REVIEW-ASK]` | omitted（使用设备出厂名称） | 用户可见的设备显示名称。设置后覆盖 `device.info` 返回的 `product.displayName`。`[REVIEW-ASK]` 此字段是否应归 `device.info` 而非 `software.config` 管理。 |
| `appearance` | object | yes | 见子表 | (见子表) | 外观配置。 |

`appearance` 子对象字段：

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `panelLayout` | string | yes | `"focus"`, `"sidebar"` | `"sidebar"` | 面板布局模式。`"focus"` 为专注模式，`"sidebar"` 为侧边栏模式。 |
| `autoHidePanel` | boolean | yes | `true` / `false` | `false` | 是否自动隐藏面板。 |
| `autoHideDelay` | uint32 | yes | `> 0` | `5` | 自动隐藏延迟时间（秒）。仅在 `autoHidePanel` 为 `true` 时生效。 |

`[REVIEW-ASK]` 其他 target（`signagePlayer`, `agent`）的配置字段待产品和设备确认后补充。

---

## 7. 交互流程示例 Flow Examples

### 7.1 查询 Launcher 配置

**场景**：运维人员查询当前 Launcher 外观配置。

请求：

```json
{
  "id": 1,
  "method": "software.getConfig",
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
    "config": {
      "displayName": "Meeting Room A",
      "appearance": {
        "panelLayout": "sidebar",
        "autoHidePanel": false,
        "autoHideDelay": 5
      }
    }
  }
}
```

**读法**：target 为 `launcher`，设备显示名称为 "Meeting Room A"，当前使用侧边栏布局，面板不自动隐藏。`displayName` 与 `device.info` 的 `product.displayName` 返回相同值。

### 7.2 设置 Launcher 外观配置

**场景**：运维人员将面板布局切换为专注模式，并启用自动隐藏。

请求：

```json
{
  "id": 2,
  "method": "software.setConfig",
  "params": {
    "target": "launcher",
    "config": {
      "appearance": {
        "panelLayout": "focus",
        "autoHidePanel": true,
        "autoHideDelay": 10
      }
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
    "config": {
      "displayName": "Meeting Room A",
      "appearance": {
        "panelLayout": "focus",
        "autoHidePanel": true,
        "autoHideDelay": 10
      }
    }
  }
}
```

**读法**：partial update 语义——只传需要修改的 `appearance` 字段，`displayName` 保持不变。返回完整配置。

### 7.2b 设置 Launcher 设备显示名称

**场景**：运维人员修改设备显示名称，不影响外观配置。

请求：

```json
{
  "id": 201,
  "method": "software.setConfig",
  "params": {
    "target": "launcher",
    "config": {
      "displayName": "Lobby Display"
    }
  }
}
```

响应：

```json
{
  "id": 201,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "target": "launcher",
    "config": {
      "displayName": "Lobby Display",
      "appearance": {
        "panelLayout": "focus",
        "autoHidePanel": true,
        "autoHideDelay": 10
      }
    }
  }
}
```

**读法**：仅修改 `displayName`，`appearance` 保持不变。修改 `displayName` 后触发 `software.configChanged` 事件（`changedFields` 包含 `"displayName"`），同时 `device.info` 的 `product.displayName` 查询也返回新值。

### 7.3 恢复 Launcher 默认配置

**场景**：运维人员恢复 Launcher 出厂默认配置。

请求：

```json
{
  "id": 3,
  "method": "software.resetConfig",
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
    "config": {
      "displayName": "NearHub Display Controller",
      "appearance": {
        "panelLayout": "sidebar",
        "autoHidePanel": false,
        "autoHideDelay": 5
      }
    }
  }
}
```

**读法**：resetConfig 恢复所有配置到出厂默认值（包括 `displayName` 恢复为设备出厂名称），返回完整配置，省去额外 round-trip。`[REVIEW-ASK]` resetConfig 是否也重置 `displayName`。

### 7.4 配置变化事件

**场景**：云端通过 setConfig 修改了 Launcher 配置。

```json
{
  "event": "software.configChanged",
  "intent": 1,
  "data": {
    "target": "launcher",
    "config": {
      "displayName": "Lobby Display",
      "appearance": {
        "panelLayout": "focus",
        "autoHidePanel": true,
        "autoHideDelay": 10
      }
    },
    "changedFields": ["displayName", "appearance.panelLayout", "appearance.autoHidePanel", "appearance.autoHideDelay"],
    "reason": "user_request"
  }
}
```

### 7.5 失败响应

**场景**：target 不支持。

```json
{
  "id": 4,
  "status": {
    "ok": false,
    "code": 3,
    "msg": "Not supported.",
    "details": {
      "field": "target"
    }
  }
}
```

---

## 8. 错误

| Error | 复用 / 候选 | 说明 | Review |
|---|---|---|---|
| `NOT_SUPPORTED` | common (0x0003) | target 不支持或 config 字段不支持。 | — |
| `INVALID_ARGUMENT` | common (0x000A) | config 字段值非法（如 autoHideDelay ≤ 0）。 | `[REVIEW-DRAFT]` |
| `PERMISSION_DENIED` | common (0x0105) | 无权修改该 target 的配置。 | `[REVIEW-DRAFT]` |
| `INVALID_STATE` | common (0x000E) | 软件正在升级或恢复中，不允许配置变更。 | `[REVIEW-DRAFT]` |

---

## 9. Legacy 待映射

| Legacy entry | Direction | AXTP target | 状态 | 说明 |
|---|---|---|---|---|
| `GetAppearanceConfig` | Server -> Device | `software.getConfig(target: "launcher")` | `[REVIEW-DRAFT]` | 字段映射：`panelLayout` → `config.appearance.panelLayout`, `autoHidePanel` → `config.appearance.autoHidePanel`, `autoHideDelay` → `config.appearance.autoHideDelay`。结构从 flat 变为嵌套。 |
| `SetAppearanceConfig` | Server -> Device | `software.setConfig(target: "launcher")` | `[REVIEW-DRAFT]` | 同上字段映射。旧 flat 字段需 adapter 包装为 `config.appearance.*`。 |
| `SetDeviceName` | Server -> Device | `software.setConfig(target: "launcher", config: { displayName })` | `[REVIEW-DRAFT]` | 字段映射：`devName` → `config.displayName`。`[REVIEW-ASK]` 是否应在 adapter 中映射还是通过独立 AXTP 方法。 |
| `ResetConfig` | Server -> Device | `software.resetConfig(target: "launcher")` or `system.reset` | `[REVIEW-ASK]` | 需确认 legacy ResetConfig 是 Launcher 默认配置恢复还是系统级恢复。若是系统级，应走 `system.reset`。 |

---

## 10. Registry / Conformance 状态

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method / event IDs | `TBD after adoption` |
| Conformance | 需覆盖 get/set/reset 一致性、target 不支持、字段值校验、配置变化事件。 |

---

## 11. 测试要点

- `software.getConfig(target: "launcher")` / `software.setConfig(target: "launcher")` 配置 get/set 一致。
- `software.setConfig` partial update 语义验证：只传 `appearance.panelLayout`，`displayName`、`appearance.autoHidePanel` 和 `appearance.autoHideDelay` 保持不变。
- `software.setConfig` 独立修改 `displayName`：只传 `config.displayName`，`appearance` 整体保持不变。
- 修改 `displayName` 后，`device.info` 的 `product.displayName` 查询应返回相同新值（跨 capability 一致性）。
- `software.resetConfig(target: "launcher")` 恢复后配置与默认值一致（包括 `displayName` 恢复为出厂名称）。
- 收到 `software.configChanged` 事件后，`software.getConfig` 返回的配置应与事件 payload 一致。
- `software.configChanged` 的 `changedFields` 应使用点号路径：`"appearance.panelLayout"` 而非 `"panelLayout"`。
- `displayName` 传空字符串或超过最大长度时应返回 `INVALID_ARGUMENT`。
- `autoHideDelay` 传 0 或负数时应返回 `INVALID_ARGUMENT`。
- 不支持的 target 应返回 `NOT_SUPPORTED`。

---

## 12. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| `software` domain 未在 Taxonomy spec rule 2 示例列表中 | 采纳阻塞 | 采纳前确认是否需要 taxonomy amendment。 | `[REVIEW-ASK]` |
| `target` 枚举完整值列表 | schema 约束 | 当前草案列出 `launcher`、`signagePlayer`、`agent`；采纳前与产品和设备确认。 | `[REVIEW-ASK]` |
| legacy `ResetConfig` 真实 scope | legacy mapping | 暂按 Launcher 默认配置恢复处理；若是系统级恢复则走 `system.reset`。 | `[REVIEW-ASK]` |
| 其他 target 的配置字段 | schema / adoption | `target: "signagePlayer"` 和 `target: "agent"` 的配置字段待产品和设备确认后补充。 | `[REVIEW-ASK]` |
| `displayName` 归属：`software.config` vs `device.info` | schema / 语义边界 | 推荐在 `software.config` 写入，`device.info` 只读返回。同一个值两个协议暴露。 | `[REVIEW-ASK]` |
| `displayName` 最大长度和格式约束 | schema / 校验 | 推荐 64 字符，非空。采纳前与产品确认。 | `[REVIEW-ASK]` |
| `resetConfig` 是否重置 `displayName` | 语义 / UX | 推荐 resetConfig 重置所有 launcher 配置包括 displayName；但设备显示名恢复出厂可能影响设备识别。 | `[REVIEW-ASK]` |

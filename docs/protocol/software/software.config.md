---
status: draft
contract: false
generated: false
domain: software
feature: software.config
registry:
lastReviewed: 2026-06-11
---

# software.config

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 读取、设置、恢复设备上软件对象的运行配置。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | legacy `ResetConfig` 的真实 scope、配置 path 列表、restore preserve 规则仍需确认。 |

## 1. 功能说明

`software.config` 用于设备上运行的软件对象的运行配置，例如 Launcher、signagePlayer、agent。它承接 signage flow 中 legacy `ResetConfig` 在“恢复 Launcher 默认配置”语义下的目标方法 `software.restoreDefaultConfig`。

注意：系统级恢复、恢复出厂、清除 OS 或设备基线配置仍属于 `system.reset`；`software.config` 不隐式执行系统恢复。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 软件配置读取、设置、恢复默认配置、配置变化事件、恢复状态事件。 |
| 包含 | `target=launcher/signagePlayer/agent`。 |
| 不包含 | 软件升级和更新策略；属于 `software.update` / `software.updatePolicy`。 |
| 不包含 | Launcher 外观专用配置；为了 UI/业务清晰，单独放在 `software.appearanceConfig`。 |
| 不包含 | 系统/设备级恢复；属于 `system.reset`。 |
| 数据面 | 不使用 STREAM。 |

## 3. 方法

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `software.getConfig` | query | 读取软件配置片段。 | `SoftwareGetConfigParams` | `SoftwareConfig` | 否 | draft |
| `software.setConfig` | command | 设置软件配置片段。 | `SoftwareSetConfigParams` | `SoftwareConfig` | 是，变化后触发 `software.configChanged`。 | draft |
| `software.restoreDefaultConfig` | action / async-action | 恢复软件默认配置。 | `SoftwareRestoreDefaultConfigParams` | `SoftwareConfigRestoreState` | 是，触发 `software.configRestoreStateChanged` 和可能的 `software.configChanged`。 | draft |

### 3.1 `software.getConfig`

#### 请求参数 Params：`SoftwareGetConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | enum | yes | `launcher`, `signagePlayer`, `agent` | none | 软件对象。 |
| `scope` | string[] | no | `runtimePreferences`, `startup`, `window`, `cache`, `signageModule`, `updatePolicy` | all supported | 要读取的配置范围。 |

#### 返回结果 Result：`SoftwareConfig`

字段见 6.2。

### 3.2 `software.setConfig`

#### 请求参数 Params：`SoftwareSetConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `config` | `SoftwareConfig` | yes | see schema | none | 要设置的配置片段；未出现字段保持不变。 |
| `expectedRevision` | string | no | opaque revision | omitted | 可选乐观锁。 |

#### 返回结果 Result：`SoftwareConfig`

字段见 6.2。

### 3.3 `software.restoreDefaultConfig`

| 项 | 内容 |
|---|---|
| 目的 | 恢复 Launcher / signagePlayer / agent 默认配置，可选择 scope 和 preserve。 |
| 调用类型 | action / async-action |
| Params Schema | `SoftwareRestoreDefaultConfigParams` |
| Result Schema | `SoftwareConfigRestoreState` |
| 事件触发 | 恢复任务状态变化触发 `software.configRestoreStateChanged`；配置实际变化触发 `software.configChanged`。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED`, `INTERNAL_ERROR` |

#### 请求参数 Params：`SoftwareRestoreDefaultConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | enum | yes | `launcher`, `signagePlayer`, `agent` | none | 要恢复默认配置的软件对象。 |
| `scope` | string[] | no | `runtimePreferences`, `startup`, `window`, `cache`, `signageModule`, `updatePolicy`, `all` | `all` | 恢复范围。 |
| `preserve` | string[] | no | `enrollment`, `network`, `playlist`, `mediaCache`, `updatePolicy` | omitted | 要保留的配置或数据。 |
| `confirmationToken` | string | no | opaque token | omitted | 危险操作确认 token。 |

#### 返回结果 Result：`SoftwareConfigRestoreState`

字段见 6.3。

## 4. 事件

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `software.configChanged` | 软件配置被 set、restore 或设备策略修改。 | `SoftwareConfigChangedEvent` | 局部更新 UI；必要时调用 get 校准。 | draft |
| `software.configRestoreStateChanged` | restore 任务 accepted / running / succeeded / failed。 | `SoftwareConfigRestoreStateChangedEvent` | 展示恢复进度并处理软件或设备重启。 | draft |

### 4.1 `software.configChanged`

#### Payload：`SoftwareConfigChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `config` | `SoftwareConfig` | yes | see schema | none | 变化后的配置片段。 |
| `changedFields` | string[] | no | field paths | omitted | 变化字段。 |
| `reason` | enum | no | `user_request`, `restore_default`, `device_policy`, `unknown` | `unknown` | 变化原因。 |

### 4.2 `software.configRestoreStateChanged`

#### Payload：`SoftwareConfigRestoreStateChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `restore` | `SoftwareConfigRestoreState` | yes | see schema | none | 当前恢复任务状态。 |

## 5. Capability

Capability name: `software.config`。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `software.config` | capability 名称。 |
| `supportedTargets` | string[] | yes | `launcher`, `signagePlayer`, `agent` | 支持配置的软件对象。 |
| `supportedScopes` | string[] | no | scope array | 支持的配置范围。 |
| `supportsRestoreDefault` | boolean | no | `true`, `false` | 是否支持恢复默认配置。 |
| `restoreMayRestartSoftware` | boolean | no | `true`, `false` | 恢复是否可能重启软件。 |
| `restoreMayRestartDevice` | boolean | no | `true`, `false` | 恢复是否可能重启设备。 |

## 6. Schemas

### 6.1 Schema 层级速览

```text
SoftwareConfig
  values: object
SoftwareConfigRestoreState
SoftwareConfigChangedEvent
SoftwareConfigRestoreStateChangedEvent
```

### 6.2 `SoftwareConfig`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | enum | yes | `launcher`, `signagePlayer`, `agent` | none | 软件对象。 |
| `scope` | string[] | no | scope array | omitted | 本配置片段覆盖的范围。 |
| `values` | object | yes | JSON object | none | 配置值；具体字段由 target/scope 草案或 capability 描述。 |
| `revision` | string | no | opaque revision | omitted | 配置版本。 |

### 6.3 `SoftwareConfigRestoreState`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `taskId` | string | yes | opaque id | none | 恢复任务 ID。 |
| `target` | enum | yes | `launcher`, `signagePlayer`, `agent` | none | 软件对象。 |
| `scope` | string[] | no | scope array | omitted | 恢复范围。 |
| `state` | enum | yes | `accepted`, `running`, `succeeded`, `failed`, `cancelled` | none | 任务状态。 |
| `progress` | uint8 | no | `0..100` | omitted | 进度。 |
| `restartExpected` | enum | no | `none`, `software`, `device` | `none` | 是否预期重启。 |
| `error` | object | no | code/message | omitted | 失败信息。 |

## 7. JSON 示例

### 7.1 恢复 Launcher 默认配置

```json
{
  "id": 501,
  "method": "software.restoreDefaultConfig",
  "params": {
    "target": "launcher",
    "scope": ["runtimePreferences", "window", "cache"],
    "preserve": ["enrollment", "network", "playlist"]
  }
}
```

```json
{
  "id": 501,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "taskId": "<RESTORE_TASK_ID>",
    "target": "launcher",
    "scope": ["runtimePreferences", "window", "cache"],
    "state": "accepted",
    "progress": 0,
    "restartExpected": "software"
  }
}
```

### 7.2 恢复状态事件

```json
{
  "event": "software.configRestoreStateChanged",
  "intent": 1,
  "data": {
    "restore": {
      "taskId": "<RESTORE_TASK_ID>",
      "target": "launcher",
      "scope": ["runtimePreferences", "window", "cache"],
      "state": "succeeded",
      "progress": 100,
      "restartExpected": "software"
    }
  }
}
```

## 8. Candidate Errors

| Error | 复用 / 候选 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | target 或 scope 不支持。 |
| `INVALID_ARGUMENT` | common | scope/preserve 非法。 |
| `INVALID_STATE` | common | 软件正在升级、正在恢复或当前状态不允许恢复。 |
| `BUSY` | common | 软件或设备忙。 |
| `PERMISSION_DENIED` | common | 无权恢复默认配置。 |

## 9. Legacy Mapping

| Legacy entry | Direction | AXTP target | 状态 |
|---|---|---|---|
| `ResetConfig` | Server -> Device | `software.restoreDefaultConfig(target=launcher)` | `[REVIEW-DRAFT]` |

## 10. Registry / Conformance Status

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method / event IDs | `TBD after adoption` |
| Conformance | 需覆盖 restore scope、preserve、状态事件、忙状态、系统级 reset 分流。 |

## 11. Test Notes

- `software.restoreDefaultConfig(target=launcher)` 返回 accepted 并触发 restore state event。
- 如果确认 legacy `ResetConfig` 是系统级恢复，应改走 `system.reset`，本文 mapping 需调整。
- restore 不应隐式清除 `device.enrollment`，除非 params 明确没有 preserve 且产品确认。

## 12. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| legacy `ResetConfig` 是否只恢复 Launcher 配置？ | mapping | 暂按 Launcher 默认配置恢复处理。 | `[REVIEW-ASK]` |
| `values` 是否需要按 target/scope 展开强类型 schema？ | schema / adoption | 草案先保留通用 object，采纳前按 P0 scope 强类型化。 | `[REVIEW-FIX]` |
| preserve 默认值是什么？ | destructive behavior | 默认不承诺保留，调用方显式传 preserve。 | `[REVIEW-ASK]` |

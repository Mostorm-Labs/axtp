---
status: draft
contract: false
generated: false
domain: software
feature: software.config
registry:
lastReviewed: 2026-06-15
---

# AXTP software.config 协议草案

版本：v0.6

归属域：`software`

Capability ID：`software.config`

适用范围：设备上运行的软件对象（Launcher、signagePlayer、agent 等）的运行配置读取、设置和恢复默认。

---

## 协议审核标记（人工复核）

| 标记 | 条目 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-DRAFT]` | `software.config` capability | 本文是根据业务需求创建的协议草案，不是最终事实源。 | 产品/架构/研发确认后进入 `adopt-protocol-draft`。 |
| `[REVIEW-RESOLVED]` | `software` 域名 | Taxonomy spec rule 2 为 "e.g." 措辞（非穷举列表），rule 8 允许新增 domain 且 MUST 可追溯到 `docs/flows`/`docs/protocol` 评审输入；本草案已在 `docs/flows/signage-device-management.md` steps 8/16/19/23 使用。 | 采纳时无需 taxonomy amendment。 |
| `[REVIEW-ASK]` | `target` 枚举值 | 完整的 target 枚举值列表需要产品和设备确认。 | 采纳前补齐 target enum baseline。 |
| `[REVIEW-DRAFT]` | legacy 映射 | 已完成 evidence-based 字段映射。`GetAppearanceConfig` / `SetAppearanceConfig` / `SetDeviceName` 映射到 `software.config`；`ResetConfig` 映射到 `system.restoreFactorySettings`。 | 采纳前确认 Adapter 层实现计划。 |
| `[REVIEW-RESOLVED]` | `displayName` 归属 | `device.info.md`（line 185）确认 `displayName` 本轮只读返回、不提供写入接口；flow 文档 §11 已 REVIEW-RESOLVED。两草案一致：写入在 `software.config`、只读在 `device.info`。 | 采纳前最终确认。 |

---

**v0.6 变更说明：**
(1) 补齐 per-method 候选错误表：§3.1 `software.getConfig` 新增候选错误表（`NOT_SUPPORTED` / `INVALID_ARGUMENT`）；§3.3 `software.resetConfig` 新增候选错误表（`NOT_SUPPORTED` / `PERMISSION_DENIED` / `INVALID_STATE`）。与兄弟草案 `software.updatePolicy` v0.6 的 per-method 错误表结构对齐。
(2) §7 新增 3 个失败示例：7.5b `PERMISSION_DENIED`（`code: 9`）、7.5c `INVALID_STATE`（`code: 4`）、7.5d `INVALID_ARGUMENT`（`code: 10`，`autoHideDelay ≤ 0` 场景），使 §8 候选 Errors 的 4 个错误均有对应示例。
(3) §12 最后一条修正滞后描述：flow step 16/19（line 218/221）现已修正为"返回标准成功响应（无 result body）；触发 `software.configChanged` 事件"，与草案 `setConfig` 一致；Flow 与草案已对齐，本条闭合。
(4) frontmatter `lastReviewed` 同步至 2026-06-15；§7.2b 示例 `id: 201` 改为 `5` 消除跳号。

**v0.5 变更说明：**
(1) 基于 Taxonomy spec rule 2（"e.g." 措辞，非穷举列表）与 rule 8（新增 domain MUST 可追溯到 `docs/flows`/`docs/protocol` 评审输入；本草案已在 `docs/flows/signage-device-management.md` steps 8/16/19/23 使用），关闭 `software` domain `[REVIEW-ASK]`：采纳时无需 taxonomy amendment。
(2) 基于 `device.info.md`（line 185，`displayName` 本轮只读返回、不提供写入接口）与 flow 文档 §11（已 REVIEW-RESOLVED），同步关闭 `displayName` 归属 `[REVIEW-ASK]`：写入路径在 `software.config`、只读返回在 `device.info`。
(3) 同步 `lastReviewed`。
(4) §8 候选 Errors Review 列对齐：`INVALID_ARGUMENT` / `PERMISSION_DENIED` / `INVALID_STATE` 从 `[REVIEW-DRAFT]` 改为 `—`，与同表 `NOT_SUPPORTED` 一致——三者均为 `registry/error/error_code.yaml` 中 `status: mvp` 的已采纳 common 码，非草案候选。与 sibling 草案 `software.updatePolicy` v0.6 一致。

**v0.4 变更说明：**
(1) 修正 §8 候选 Errors 中 `INVALID_STATE` 和 `PERMISSION_DENIED` 的错误码：`INVALID_STATE` 从错误的 `0x000E` 更正为 `0x0004`；`PERMISSION_DENIED` 从错误的 `0x0105` 更正为 `0x0009`（`0x000E` 实际为 `INTERNAL_ERROR`，`0x0105` 实际为 `DEVICE_OVER_TEMPERATURE`）。与兄弟草案 `software.updatePolicy` v0.4 对齐。
(2) 增强 §3.2 `software.setConfig` 返回结果说明，明确列出两种确认方式（事件或主动查询）。
(3) 新增 §9.2b `software.resetConfig` AXTP-only 说明（无 legacy 对应方法）。
(4) §12 flow 一致性问题状态从 `[REVIEW-DRAFT]` 更新为 `[REVIEW-RESOLVED]`，明确 flow 文档 step 16/19 描述有误。
(5) 新增 flow 文档和 `software.updatePolicy` 交叉引用。

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
| 主要未决问题 | `target` 枚举完整值列表（`signagePlayer`/`agent` 配置字段无证据，待产品）、`values` 是否需要按 target 展开强类型 schema、`displayName` 最大长度约束。`software` domain taxonomy 与 `displayName` 归属已关闭（见 §协议审核标记 / §12）。legacy `ResetConfig` 已确认映射到 `system.restoreFactorySettings`（见 Section 9）。 |

---

## 1. 功能说明

`software.config` 用于设备上运行的软件对象的运行配置，例如 Launcher、signagePlayer、agent。通过 `target` 参数区分不同软件对象，每个对象有独立的配置字段集。

本草案在 signage 设备管理流程（`docs/flows/signage-device-management.md`）中覆盖以下交互步骤：步骤 8（查询外观配置）、步骤 16（设置设备名称）、步骤 19（设置外观配置）、步骤 23（恢复默认软件配置）。配置同步采用"云查询设备状态 + 比对差异 + 按需下发"模式。

本草案合并了原 `device.appearance` 草案中的外观配置能力和 legacy `SetDeviceName` 设备名设置能力：Launcher 的面板布局、自动隐藏等配置统一作为 `software.config` 的 `target: "launcher"` 配置片段的 `appearance` 子对象；设备显示名称作为 `displayName` 字段提供写入路径，与 `device.info` 的只读 `product.displayName` 保持一致。

注意：系统级恢复、恢复出厂、清除 OS 或设备基线配置仍属于 `system.reset`；`software.config` 不隐式执行系统恢复。Legacy `ResetConfig`（恢复出厂设置、设备重启）映射到 `system.restoreFactorySettings`（见 `docs/protocol/system/system.reset.md`），不映射到 `software.resetConfig`。

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

## 3. 方法

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `software.getConfig` | query | 读取软件配置。 | `SoftwareGetConfigParams` | `SoftwareConfig` | 否 | draft |
| `software.setConfig` | command | 设置软件配置。 | `SoftwareSetConfigParams` | —（仅 status 确认） | 是，变化后触发 `software.configChanged`。 | draft |
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

字段见 6.4。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` `[REVIEW-ASK]` | none | 要读取配置的软件对象。 |

#### 返回结果 Result：`SoftwareConfig`

字段见 6.1。

#### `software.getConfig` 候选错误

| Error | 类别 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | target 不支持。 |
| `INVALID_ARGUMENT` | common | target 值非法。 |

### 3.2 `software.setConfig`

| 项 | 内容 |
|---|---|
| 目的 | 设置指定软件对象的配置片段。未出现的字段保持不变（partial update 语义）。 |
| 调用类型 | command（request_response） |
| Params Schema | `SoftwareSetConfigParams` |
| Result Schema | 标准成功响应（无 result body） |
| 事件触发 | 配置实际变化后触发 `software.configChanged`。 |
| 幂等性 | 否（写入操作） |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED` |

#### 请求参数 Params：`SoftwareSetConfigParams`

字段见 6.5。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 软件对象。 |
| `config` | object | yes | target-specific fields | none | 要设置的配置片段。未出现的字段保持不变。 |

#### 返回结果

`software.setConfig` 返回标准成功响应（无 `result` 字段）。调用者如需确认配置变化，可通过以下方式：

1. 等待 `software.configChanged` 事件获取变化后的完整配置。
2. 调用 `software.getConfig` 主动查询最新配置。

#### 可能的事件

| Event | 条件 |
|---|---|
| `software.configChanged` | 配置实际变化时触发。 |

#### `software.setConfig` 候选错误

| Error | 类别 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | target 不支持。 |
| `INVALID_ARGUMENT` | common | config 字段值非法。 |
| `PERMISSION_DENIED` | common | 无权修改配置。 |
| `INVALID_STATE` | common | 软件正在升级或恢复中。 |

### 3.3 `software.resetConfig`

| 项 | 内容 |
|---|---|
| 目的 | 恢复指定软件对象的默认配置。注意：`software.resetConfig` 仅恢复指定软件对象的运行配置到当前版本默认值，不影响其他软件对象、系统配置或设备身份，不会触发设备重启。系统级恢复出厂使用 `system.restoreFactorySettings`。 |
| 调用类型 | command（request_response） |
| Params Schema | `SoftwareResetConfigParams` |
| Result Schema | `SoftwareConfig` |
| 事件触发 | 配置实际变化后触发 `software.configChanged`。 |
| 幂等性 | 是（重复调用结果一致） |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED`, `INVALID_STATE` |

#### 请求参数 Params：`SoftwareResetConfigParams`

字段见 6.6。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 要恢复默认配置的软件对象。 |

#### 返回结果 Result：`SoftwareConfig`

返回重置后的完整配置，省去额外 round-trip。字段见 6.1。

#### 可能的事件

| Event | 条件 |
|---|---|
| `software.configChanged` | 配置实际变化时触发。reason 为 `restore_default`。 |

#### `software.resetConfig` 候选错误

| Error | 类别 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | target 不支持。 |
| `PERMISSION_DENIED` | common | 无权重置配置。 |
| `INVALID_STATE` | common | 软件正在升级或恢复中。 |

---

## 4. 事件

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

字段见 6.7。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 变化的软件对象。 |
| `config` | object | yes | target-specific fields | none | 变化后的完整配置片段。 |
| `changedFields` | string[] | no | field paths | omitted | 变化的字段路径列表。字段路径使用点号分隔嵌套层级，如 `"appearance.panelLayout"` 表示 `config.appearance.panelLayout` 字段变化。 |
| `reason` | string | no | `"user_request"`, `"restore_default"`, `"device_policy"`, `"unknown"` | `"unknown"` | 变化原因。 |

---

## 5. Capability

Capability name: `software.config`。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `supportedTargets` | string[] | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | 支持配置的软件对象。 `[REVIEW-ASK]` |
| `supportsReset` | boolean | no | `true` / `false` | 是否支持恢复默认配置。 |
| `resetMayRestartSoftware` | boolean | no | `true` / `false` | 恢复是否可能重启该软件对象（非设备重启）。系统级恢复出厂使用 `system.restoreFactorySettings`。 |

---

## 6. Schemas

### 6.0 Schema 层级速览

```text
请求 Params
  SoftwareGetConfigParams          ← software.getConfig
  SoftwareSetConfigParams          ← software.setConfig
  SoftwareResetConfigParams        ← software.resetConfig

响应 / 事件共用
  SoftwareConfig
    target: string
    config: object（target-specific）
      ┌─ target: "launcher"
      │    displayName: string
      │    appearance: LauncherAppearance
      │                panelLayout: string
      │                autoHidePanel: boolean
      │                autoHideDelay: uint32
      └─ target: "signagePlayer" / "agent"  ← [REVIEW-ASK] 待补充

事件 Payload
  SoftwareConfigChangedEvent
    target + config + changedFields + reason
```

阅读规则：

- `config` 是 target-specific 动态对象；字段集合由 `target` 值决定。当前草案只定义了 `target: "launcher"` 的字段。
- `displayName` 在 `software.config` 中提供写入路径；`device.info` 的 `product.displayName` 为只读返回同值（跨 capability 同步）。
- `appearance` 是 `config` 的子对象，包含面板布局和自动隐藏配置。Legacy 使用 flat 结构（三个字段为顶层），AXTP 使用嵌套结构。
- `SoftwareConfig` 同时用于 `software.getConfig` / `software.resetConfig` 的 Result 和 `software.configChanged` 事件 Payload。

### 6.1 `SoftwareConfig`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 软件对象。 |
| `config` | object | yes | target-specific fields | none | 配置值。具体字段由 target 决定。 |

### 6.2 `target: "launcher"` 配置字段

当 `target` 为 `"launcher"` 时，`config` 对象包含以下顶层字段：

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `displayName` | string | no | non-empty, max 64 chars `[REVIEW-ASK]` | omitted（使用设备出厂名称） | 用户可见的设备显示名称。设置后覆盖 `device.info` 返回的 `product.displayName`。归属已确认：写入路径在 `software.config`，`device.info`（line 185）只读返回同值（采纳前最终确认）。 |
| `appearance` | object | no | 见 6.3 | omitted（使用设备默认值） | 外观配置。 |

`[REVIEW-ASK]` 其他 target（`signagePlayer`, `agent`）的配置字段待产品和设备确认后补充。

> **null / omitted 语义**：`setConfig` 使用 partial update 语义——未传（omitted）的字段保持不变。`config` 对象本身不支持 `null`（必须是一个有效的 object）。
>
> - `displayName: omitted` — 保持当前值不变。`getConfig` 永远返回当前有效值（用户自定义名或设备出厂名）。
> - `displayName: "" (empty)` — 返回 `INVALID_ARGUMENT`。不允许设为空字符串。
> - `appearance: omitted` — 保持当前外观配置不变。
> - `appearance` 对象不支持 `null`。如需恢复默认外观，使用 `software.resetConfig`。
> - `setConfig` 中 `config` 对象不包含任何字段时为 no-op（成功但不产生变化，不触发事件）。

### 6.3 `LauncherAppearance`

当 `target` 为 `"launcher"` 时，`config.appearance` 使用此 schema。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `panelLayout` | string | no | `"focus"`, `"sidebar"` | `"sidebar"` | 面板布局模式。`"focus"` 为专注模式，`"sidebar"` 为侧边栏模式。 |
| `autoHidePanel` | boolean | no | `true` / `false` | `false` | 是否自动隐藏面板。 |
| `autoHideDelay` | uint32 | no | `> 0` | `5` | 自动隐藏延迟时间（秒）。仅在 `autoHidePanel` 为 `true` 时生效。 |

> **校验规则**：
>
> - `panelLayout` 必须为 `"focus"` 或 `"sidebar"`。传其他值返回 `INVALID_ARGUMENT`。
> - `autoHideDelay` 必须 `> 0`。传 0 或负数返回 `INVALID_ARGUMENT`。
> - `displayName` 必须 non-empty 且 max 64 chars（前后空格自动 trimmed）。空字符串或超长返回 `INVALID_ARGUMENT`。`[REVIEW-ASK]` 64 字符上限需产品确认。

> **字段间约束**：`autoHideDelay` 的值不因 `autoHidePanel` 切换而丢失。当 `autoHidePanel` 为 `false` 时，`autoHideDelay` 可被设置和持久化，但不影响设备行为。切换回 `true` 后，原 `autoHideDelay` 继续生效。

> **null / omitted 语义**：`setConfig` 使用 partial update 语义——未传（omitted）的字段保持不变，这与显式传 `null`（清除）不同。具体规则：
>
> - `displayName: omitted` — 保持当前值不变。`getConfig` 永远返回当前有效值（用户自定义名或设备出厂名）。
> - `appearance: omitted` — 保持当前外观配置不变。
> - `software.resetConfig` 恢复所有 launcher 配置到出厂默认值，包括 `displayName` 恢复为设备出厂名称、`appearance` 恢复为默认值（`panelLayout: "sidebar"`、`autoHidePanel: false`、`autoHideDelay: 5`）。`[REVIEW-ASK]` resetConfig 是否也重置 `displayName`。
> - `getConfig` 和 `configChanged` 事件不区分"出厂默认"和"用户设置"，始终返回当前生效值。

### 6.4 `SoftwareGetConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` `[REVIEW-ASK]` | none | 要读取配置的软件对象。 |

### 6.5 `SoftwareSetConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 软件对象。 |
| `config` | object | yes | target-specific fields | none | 要设置的配置片段。未出现的字段保持不变（partial update 语义）。`target: "launcher"` 时见 6.2。 |

### 6.6 `SoftwareResetConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 要恢复默认配置的软件对象。 |

### 6.7 `SoftwareConfigChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 变化的软件对象。 |
| `config` | object | yes | target-specific fields | none | 变化后的完整配置片段。 |
| `changedFields` | string[] | no | field paths（dot-notation） | omitted | 变化的字段路径列表。字段路径使用点号分隔嵌套层级，如 `"appearance.panelLayout"`。 |
| `reason` | string | no | `"user_request"`, `"restore_default"`, `"device_policy"`, `"unknown"` | `"unknown"` | 变化原因。 |

---

## 7. JSON 示例

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
  }
}
```

**读法**：partial update 语义——只传需要修改的 `appearance` 字段，`displayName` 保持不变。设置成功后可调用 `software.getConfig` 获取最新配置，或等待 `software.configChanged` 事件。

### 7.2b 设置 Launcher 设备显示名称

**场景**：运维人员修改设备显示名称，不影响外观配置。

请求：

```json
{
  "id": 5,
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
  "id": 5,
  "status": {
    "ok": true,
    "code": 0
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

### 7.5b 权限不足

**场景**：操作者无权修改该 target 的配置。

```json
{
  "id": 6,
  "status": {
    "ok": false,
    "code": 9,
    "msg": "Permission denied.",
    "details": {
      "field": "target"
    }
  }
}
```

**读法**：`code: 9` 对应 `PERMISSION_DENIED` (0x0009)。操作者对指定 target 无修改权限。

### 7.5c 软件升级中

**场景**：软件正在升级或恢复中，不允许配置变更。

```json
{
  "id": 7,
  "status": {
    "ok": false,
    "code": 4,
    "msg": "Operation not allowed in current state.",
    "details": {
      "reason": "software_updating"
    }
  }
}
```

**读法**：`code: 4` 对应 `INVALID_STATE` (0x0004)。设备当前正在执行软件更新，配置修改需等待更新完成。

### 7.5d 参数非法（INVALID_ARGUMENT）

**场景**：运维人员将自动隐藏延迟设为 `0`，违反 `autoHideDelay > 0` 约束。

请求：

```json
{
  "id": 8,
  "method": "software.setConfig",
  "params": {
    "target": "launcher",
    "config": {
      "appearance": {
        "autoHidePanel": true,
        "autoHideDelay": 0
      }
    }
  }
}
```

响应：

```json
{
  "id": 8,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Invalid argument.",
    "details": {
      "field": "config.appearance.autoHideDelay",
      "reason": "must_be_positive"
    }
  }
}
```

**读法**：`code: 10` 对应 `INVALID_ARGUMENT` (0x000A)。`autoHideDelay` 必须 `> 0`，传 `0` 返回参数非法；设备配置保持不变。

---

## 8. 候选 Errors

| Error | 复用 / 候选 | 说明 | Review |
|---|---|---|---|
| `NOT_SUPPORTED` | common (0x0003) | target 不支持或 config 字段不支持。 | — |
| `INVALID_ARGUMENT` | common (0x000A) | config 字段值非法（如 autoHideDelay ≤ 0）。 | — |
| `PERMISSION_DENIED` | common (0x0009) | 无权修改该 target 的配置。 | — |
| `INVALID_STATE` | common (0x0004) | 软件正在升级或恢复中，不允许配置变更。 | — |

---

## 9. Legacy 映射

以下映射基于 `docs/legacy-migration/evidence/NearHub-Launcher数字标牌设备管理通用管理命令.md`。分类条目详见 `docs/legacy-migration/classification/by-source/signage_sdk.md`，其中 `GetAppearanceConfig`（line 557）、`SetAppearanceConfig`（line 580）和 `SetDeviceName`（line 81）均标记为 high confidence 映射到 `software.config`。

### 9.1 `GetAppearanceConfig` → `software.getConfig(target: "launcher")`

**方向**：Server -> Device

**状态**：`[REVIEW-DRAFT]`

| Legacy 字段 | Legacy 类型 | AXTP 字段路径 | 说明 |
|---|---|---|---|
| *(response root)* | — | `result.target` | AXTP 新增 `target: "launcher"` 包裹。 |
| `panelLayout` | string | `result.config.appearance.panelLayout` | 字段名不变，嵌套层级变化。 |
| `autoHidePanel` | boolean | `result.config.appearance.autoHidePanel` | 字段名不变，嵌套层级变化。 |
| `autoHideDelay` | number | `result.config.appearance.autoHideDelay` | 字段名不变，嵌套层级变化。 |

**结构变换**：Legacy 响应为 flat object `{ panelLayout, autoHidePanel, autoHideDelay }`；AXTP 响应嵌套为 `{ target, config: { displayName, appearance: { ... } } }`。Adapter 层需执行 flat → nested 包装。

**AXTP 新增字段**：`result.config.displayName` 在 legacy 中无对应字段。Adapter 可选保留或丢弃。

### 9.2 `SetAppearanceConfig` → `software.setConfig(target: "launcher")`

**方向**：Server -> Device

**状态**：`[REVIEW-DRAFT]`

| Legacy 字段 | Legacy 类型 | AXTP 字段路径 | 说明 |
|---|---|---|---|
| *(request root)* | — | `params.target` | AXTP 新增 `target: "launcher"` 包裹。 |
| `panelLayout` | string (必填) | `params.config.appearance.panelLayout` | 字段名不变，嵌套层级变化。 |
| `autoHidePanel` | boolean (必填) | `params.config.appearance.autoHidePanel` | 字段名不变，嵌套层级变化。 |
| `autoHideDelay` | number (必填) | `params.config.appearance.autoHideDelay` | 字段名不变，嵌套层级变化。 |

**语义差异**：Legacy `SetAppearanceConfig` 要求所有字段必填（全量覆盖语义）；AXTP `software.setConfig` 使用 partial update 语义（未传字段保持不变）。Adapter 层需在 legacy→AXTP 方向透传全部字段以兼容旧行为；在 AXTP→legacy 方向需将 partial update 转为全量覆盖（先 getConfig 读取当前值，合并变更字段后全量下发）。

**结构变换**：Legacy 请求为 flat object `{ panelLayout, autoHidePanel, autoHideDelay }`；AXTP 请求嵌套为 `{ target: "launcher", config: { appearance: { ... } } }`。

### 9.3 `SetDeviceName` → `software.setConfig(target: "launcher")`

**方向**：Server -> Device

**状态**：`[REVIEW-DRAFT]`

| Legacy 字段 | Legacy 类型 | AXTP 字段路径 | 说明 |
|---|---|---|---|
| *(request root)* | — | `params.target` | AXTP 新增 `target: "launcher"` 包裹。 |
| `devName` | string | `params.config.displayName` | 字段名从 `devName` 改为 `displayName`。 |

**字段映射**：`devName` → `config.displayName`。写入路径在 `software.config`；`device.info` 的 `product.displayName` 为只读返回同值。

### 9.4 `ResetConfig` → `system.restoreFactorySettings`

**方向**：Server -> Device

**状态**：`[REVIEW-RESOLVED]`

| Legacy 字段 | Legacy 类型 | AXTP 方法 | 说明 |
|---|---|---|---|
| *(no params)* | — | `system.restoreFactorySettings` | Legacy 无参数。AXTP 使用 `system.restoreFactorySettings`。 |

**重要结论**：Legacy `ResetConfig` 描述为"恢复出厂设置。注意：执行后设备通常会自动重启"。这是系统级出厂恢复（设备重启），不是软件配置默认值恢复。因此映射到 `system.restoreFactorySettings`（见 `docs/protocol/system/system.reset.md`），**不映射到** `software.resetConfig`。

**区分**：
- `software.resetConfig(target: "launcher")` — 恢复 Launcher 运行配置到当前版本默认值，不重启设备。
- `system.restoreFactorySettings` — 恢复出厂设置，设备重启，可能回退 Launcher 等软件组件到出厂初始版本。

**Legacy classification 验证**：`docs/legacy-migration/classification/system.md` 已将 signage_sdk 的 `ResetConfig` 映射到 `system.initialization` → `system.reset`，与本文结论一致。

### 9.4b `software.resetConfig` — AXTP-only

**状态**：`[REVIEW-DRAFT]`

`software.resetConfig` 在 legacy 协议中没有对应方法。Legacy 系统没有"恢复默认软件配置（非出厂恢复）"的专用命令。

- Legacy `ResetConfig`（恢复出厂设置）映射到 `system.restoreFactorySettings`，不是 `software.resetConfig`。两者语义不同：前者恢复整个设备出厂状态并重启，后者仅恢复指定软件对象的运行配置到当前版本默认值。
- Adapter 层在 legacy 请求恢复出厂时**不应**调用 `software.resetConfig`，应路由到 `system.restoreFactorySettings`。
- 如果 legacy 客户端需要仅重置 Launcher 配置（非恢复出厂），Adapter 需从带外知识合成默认值（`displayName` 恢复为出厂名称、`appearance` 恢复为 `panelLayout: "sidebar"`, `autoHidePanel: false`, `autoHideDelay: 5`），通过 `software.setConfig` 下发。
- `software.resetConfig` 返回重置后的完整配置，省去额外 round-trip，这是 AXTP-only 能力优势。

### 9.5 `GetDeviceInfo` → `device.getInfo` 读路径交叉引用

**方向**：Server -> Device

**状态**：`[REVIEW-DRAFT]`（交叉引用，非直接映射）

Legacy `GetDeviceInfo` 不是 `software.config` 的直接映射目标（归 `device.info`），但其响应中的 `devName` 字段与 `software.config` 的 `config.displayName` 读取同源数据。Adapter 层需注意此交叉关系：

| Legacy 字段 | Legacy 类型 | AXTP 读路径 | AXTP 写路径 | 说明 |
|---|---|---|---|---|
| `devName` (in `GetDeviceInfo` response) | string | `device.getInfo` → `product.displayName` | `software.setConfig(target: "launcher", config: { displayName })` | 同一数据两个协议暴露。`device.info` 只读，`software.config` 提供写入路径。 |

**Adapter 职责**：

1. Legacy `GetDeviceInfo` 的 `devName` 字段 → AXTP `device.getInfo` 的 `product.displayName`（primary mapping，见 `device.info` 草案）。
2. Adapter 无需在 `GetDeviceInfo` ↔ `software.getConfig` 之间做额外映射；两者返回同值但归属不同 capability。
3. `SetDeviceName` 修改 `displayName` 后，`GetDeviceInfo.devName` 应自动反映新值（跨 capability 同步）。

### 9.6 Adapter 层结构变换说明

Legacy 外观配置使用 flat object 结构（`panelLayout`、`autoHidePanel`、`autoHideDelay` 为顶层字段）。AXTP 使用嵌套结构（这三个字段位于 `config.appearance.*`）。Adapter 层职责：

1. **Get 方向**（AXTP → legacy）：从 `config.appearance.*` 中提取字段，展平为 `{ panelLayout, autoHidePanel, autoHideDelay }`。如 AXTP 响应包含 `displayName`，Adapter 可选保留或丢弃（legacy 不包含此字段）。
2. **Set 方向**（legacy → AXTP）：将 flat `{ panelLayout, autoHidePanel, autoHideDelay }` 包装为 `{ target: "launcher", config: { appearance: { panelLayout, autoHidePanel, autoHideDelay } } }`。由于 legacy 全量覆盖语义，Adapter 需透传全部字段。
3. **DeviceName 方向**：将 `{ devName }` 映射为 `{ target: "launcher", config: { displayName: devName } }`。反向提取 `config.displayName` 回填 `devName`。注意 legacy 无独立 GetDeviceName 命令——设备名通过 `GetDeviceInfo.devName` 读取（映射到 `device.getInfo` 的 `product.displayName`，非 `software.getConfig`）。Adapter 在 legacy→AXTP 方向：`SetDeviceName` → `software.setConfig`；在 AXTP→legacy 方向：`device.getInfo` 的 `product.displayName` → `GetDeviceInfo` 的 `devName`（跨 capability 读路径，见 9.5）。
4. **语义差异兼容**：Legacy `SetAppearanceConfig` 全量覆盖 vs AXTP partial update 的差异由 Adapter 层处理。

**JSON 变换示例 — Get 方向（AXTP → legacy）**：

AXTP 响应（`software.getConfig` result）：

```json
{
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
```

Legacy 响应（Adapter 输出，对应 `GetAppearanceConfig`）：

```json
{
  "panelLayout": "sidebar",
  "autoHidePanel": false,
  "autoHideDelay": 5
}
```

> 展平 `config.appearance.*` → 顶层字段；丢弃 `target`、`displayName`（legacy 无对应字段）。

**JSON 变换示例 — Set 方向（legacy → AXTP）**：

Legacy 请求（`SetAppearanceConfig`）：

```json
{
  "panelLayout": "focus",
  "autoHidePanel": true,
  "autoHideDelay": 10
}
```

AXTP 请求（Adapter 输出，对应 `software.setConfig` params）：

```json
{
  "target": "launcher",
  "config": {
    "appearance": {
      "panelLayout": "focus",
      "autoHidePanel": true,
      "autoHideDelay": 10
    }
  }
}
```

> 将 flat 字段包装为 `config.appearance.*` 嵌套结构；新增 `target: "launcher"` 包裹。由于 legacy 全量覆盖语义，Adapter 透传全部字段。

**JSON 变换示例 — DeviceName 方向（legacy → AXTP）**：

Legacy 请求（`SetDeviceName`）：

```json
{
  "devName": "Lobby Display"
}
```

AXTP 请求（Adapter 输出，对应 `software.setConfig` params）：

```json
{
  "target": "launcher",
  "config": {
    "displayName": "Lobby Display"
  }
}
```

> `devName` → `config.displayName`；新增 `target: "launcher"` 包裹。字段名变化，语义不变。

**响应变换**：AXTP `software.setConfig` 仅返回 status 确认（无 result body），与 legacy `{ ok: true }` 行为一致，Adapter 无需做响应变换。

---

## 10. Registry / Conformance Status

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method / event IDs | `TBD after adoption` |
| Conformance | 需覆盖 get/set/reset 一致性、target 不支持、字段值校验、配置变化事件。 |

---

## 11. Test Notes

- `software.getConfig(target: "launcher")` / `software.setConfig(target: "launcher")` 配置 get/set 一致：setConfig 返回成功后，getConfig 返回更新后的配置。
- `software.setConfig` partial update 语义验证：只传 `appearance.panelLayout`，`displayName`、`appearance.autoHidePanel` 和 `appearance.autoHideDelay` 保持不变（通过 getConfig 验证）。
- `software.setConfig` 独立修改 `displayName`：只传 `config.displayName`，`appearance` 整体保持不变（通过 getConfig 验证）。
- 修改 `displayName` 后，`device.info` 的 `product.displayName` 查询应返回相同新值（跨 capability 一致性）。
- `software.resetConfig(target: "launcher")` 恢复后配置与默认值一致（包括 `displayName` 恢复为出厂名称）。
- 收到 `software.configChanged` 事件后，`software.getConfig` 返回的配置应与事件 payload 一致。
- `software.configChanged` 的 `changedFields` 应使用点号路径：`"appearance.panelLayout"` 而非 `"panelLayout"`。
- `displayName` 传空字符串或超过最大长度时应返回 `INVALID_ARGUMENT`。
- `autoHideDelay` 传 0 或负数时应返回 `INVALID_ARGUMENT`。
- `panelLayout` 传非 `"focus"` / `"sidebar"` 值时应返回 `INVALID_ARGUMENT`。
- 不支持的 target 应返回 `NOT_SUPPORTED`。
- `autoHidePanel: false` 时设置 `autoHideDelay`，值持久化但行为不生效；切回 `true` 后原值生效（通过 getConfig 验证值未丢失）。
- `software.resetConfig` 后 `displayName` 恢复为出厂名称（与 `device.info` 默认 `product.displayName` 一致）。
- Legacy `GetAppearanceConfig` Adapter 测试：AXTP `{ target: "launcher", config: { displayName: "Meeting Room A", appearance: { panelLayout: "sidebar", autoHidePanel: false, autoHideDelay: 5 } } }` → legacy `{ panelLayout: "sidebar", autoHidePanel: false, autoHideDelay: 5 }`（丢弃 `displayName`）。
- Legacy `SetAppearanceConfig` Adapter 测试：legacy `{ panelLayout: "focus", autoHidePanel: true, autoHideDelay: 10 }` → AXTP `{ target: "launcher", config: { appearance: { panelLayout: "focus", autoHidePanel: true, autoHideDelay: 10 } } }`。
- Legacy `SetDeviceName` Adapter 测试：legacy `{ devName: "Lobby Display" }` → AXTP `{ target: "launcher", config: { displayName: "Lobby Display" } }`。
- Legacy `SetAppearanceConfig` 全量覆盖语义与 AXTP partial update 的 Adapter 兼容性测试：Adapter 在 legacy→AXTP 方向透传全部字段；在 AXTP→legacy 方向先 getConfig 读取当前值再全量合并下发。

---

## 12. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| `software` domain 未在 Taxonomy spec rule 2 示例列表中 | （原）采纳阻塞 | rule 2 为 "e.g." 措辞（非穷举列表），rule 8 允许新增 domain 且 MUST 可追溯到 `docs/flows`/`docs/protocol` 评审输入（本草案见 flow steps 8/16/19/23）；采纳无需 taxonomy amendment。 | `[REVIEW-RESOLVED]` |
| `target` 枚举完整值列表 | schema 约束 | 当前草案列出 `launcher`、`signagePlayer`、`agent`；采纳前与产品和设备确认。 | `[REVIEW-ASK]` |
| legacy `ResetConfig` 真实 scope | legacy mapping | 已确认为系统级出厂恢复（设备重启）。映射到 `system.restoreFactorySettings`，不映射到 `software.resetConfig`。见 Section 9.4。 | `[REVIEW-RESOLVED]` |
| 其他 target 的配置字段 | schema / adoption | `target: "signagePlayer"` 和 `target: "agent"` 的配置字段待产品和设备确认后补充。 | `[REVIEW-ASK]` |
| `displayName` 归属：`software.config` vs `device.info` | schema / 语义边界 | `device.info`（line 185）确认只读、flow §11 已 resolved：写入在 `software.config`、只读在 `device.info`。 | `[REVIEW-RESOLVED]` |
| `displayName` 最大长度和格式约束 | schema / 校验 | 推荐 64 字符，非空。采纳前与产品确认。 | `[REVIEW-ASK]` |
| `resetConfig` 是否重置 `displayName` | 语义 / UX | 推荐 resetConfig 重置所有 launcher 配置包括 displayName；但设备显示名恢复出厂可能影响设备识别。 | `[REVIEW-ASK]` |
| Adapter flat→nested 变换 | adapter 实现 | Legacy 外观配置为 flat 结构，AXTP 为 `config.appearance.*` 嵌套结构。Adapter 层负责包装/展平变换。Legacy `SetAppearanceConfig` 全量覆盖语义与 AXTP partial update 语义的差异由 Adapter 兼容。 | `[REVIEW-DRAFT]` |
| Flow step 16/19 vs 草案 setConfig 响应 | flow / draft 一致性 | Flow step 16/19（line 218/221）现已修正为"返回标准成功响应（无 result body）；触发 `software.configChanged` 事件"，与草案 `software.setConfig`（仅返回 status 确认、无 result body）一致。Flow 与草案已对齐，本条闭合。（同类 step 21 属 `software.updatePolicy`，见该草案。） | `[REVIEW-RESOLVED]` |

---
status: draft
contract: false
generated: false
domain: software
feature: software.updatePolicy
registry:
lastReviewed: 2026-06-15
---

# AXTP software.updatePolicy 协议草案

版本：v0.7

归属域：`software`

Capability ID：`software.updatePolicy`

适用范围：设备上运行的软件对象（Launcher、signagePlayer、agent 等）的自动更新策略配置。

---

## 协议审核标记（人工复核）

| 标记 | 条目 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-DRAFT]` | `software.updatePolicy` capability | 本文是根据业务需求创建的协议草案，不是最终事实源。 | 产品/架构/研发确认后进入 `adopt-protocol-draft`。 |
| `[REVIEW-RESOLVED]` | `software` 域名 | Taxonomy spec rule 2 为 "e.g." 措辞（非穷举列表），rule 8 允许新增 domain 且 MUST 可追溯到 `docs/flows`/`docs/protocol` 评审输入（本草案已在 flow steps 9/21 使用）。 | 采纳时无需 taxonomy amendment。与 `software.config` v0.5 一致。 |
| `[REVIEW-ASK]` | `target` 枚举值 | 完整的 target 枚举值列表需要产品和设备确认。 | 采纳前补齐 target enum baseline。 |
| `[REVIEW-ASK]` | 与 `firmware.updatePolicy` 的关系 | `firmware.updatePolicy` 已回退为 v0.1 骨架。两者是共存还是统一到 `software.updatePolicy(target: "firmware")`？ | 采纳前确认边界。 |
| `[REVIEW-DRAFT]` | legacy 映射 | 已完成 evidence-based 字段映射。`GetUpdateConfig` / `SetUpdateConfig` 映射到 `software.updatePolicy(target: "launcher")`。采纳前确认 Adapter 层实现计划和分类差异。 | 采纳前确认分类差异修正和 Adapter 层实现计划。 |
| `[REVIEW-RESOLVED]` | flow step 21 响应描述 | Flow 文档 step 21 原写"返回完整 SoftwareUpdatePolicy"，与草案 `setUpdatePolicy` 仅返回 status 确认（无 result body）不一致；flow step 16/19/21 现已统一修正为"返回标准成功响应（无 result body）；触发对应 *Changed 事件"。 | 已闭环，无需进一步动作。 |
| `[REVIEW-ASK]` | Legacy classification 差异 | Legacy classification CSV 和 `firmware.md` 将 `GetUpdateConfig` / `SetUpdateConfig` 归入 `firmware.updatePolicy`；flow 文档 re-classified 到 `software.updatePolicy`（正确，因为这些是软件而非固件设置）。generated map 仍使用旧名 `update.getConfig` / `update.setConfig`。 | 分类修正和 generated map 更新需在采纳前处理。 |
| `[REVIEW-RESOLVED]` | `software.config` §8 错误码 | sibling 草案 `software.config` 已修正至 v0.5，候选错误码现为正确 common 值（`0x0009` / `0x0004` / `0x000A`）。本草案 §8 Review 列同步对齐为 `—`（复用已采纳 common 码）。 | 无需进一步动作。 |

---

**v0.7 变更说明：**
(1) 统一 sibling 草案 `software.config` 版本引用为 v0.5（协议审核标记表、v0.6 变更说明第 1 条、§12 三处曾误记为 v0.4，与同草案另几处 v0.5 自相矛盾）。
(2) 修正 §12 与协议审核标记表中 flow step 一致性条目的过时描述：flow 文档 step 16/19/21 现已修正为"返回标准成功响应（无 result body）；触发对应 *Changed 事件"；澄清原"Flow step 20"系笔误（实为 step 21）。两条记录改为闭环状态。
(3) frontmatter `lastReviewed` 更新；标题版本升至 v0.7。
(4) 配套修正 sibling flow 文档 `docs/flows/signage-device-management.md` 中跨午夜 schedule 语义"已确认"措辞为草案候选 `[REVIEW-ASK]`，并对齐全部 `software.updatePolicy` 版本引用至 v0.7。

**v0.6 变更说明：**
(1) §12 software.config 错误码条目从 `[REVIEW-FIX]` 更新为 `[REVIEW-RESOLVED]`：sibling 草案 `software.config` 已修正至 v0.5，§8 错误码现为正确值（`0x0009` / `0x0004` / `0x000A`）。
(2) §8 候选 Errors Review 列对齐：`INVALID_ARGUMENT` / `PERMISSION_DENIED` / `INVALID_STATE` 从 `[REVIEW-DRAFT]` 改为 `—`，与同表 `NOT_SUPPORTED` 一致（均为 `registry/error/error_code.yaml` 中 `status: mvp` 的已采纳 common 码，非草案候选）。
(3) §7 新增 `7.5d` `INVALID_ARGUMENT` 失败示例（`schedule` 时间格式非法 → `code: 10`）。
(4) §6.2 末尾补 `signagePlayer` / `agent` target 字段集合说明（预期与 launcher 相同），与 `software.config` §6.2 对齐。
(5) §3.3 `resetUpdatePolicy` 补"仅恢复策略、不触发软件/设备重启"说明，与 `software.config` §3.3 对齐。
(6) frontmatter `lastReviewed` 更新；协议审核标记表新增一条 `[REVIEW-RESOLVED]` 记录。
(7) 同步修正 sibling 草案 `software.config` §8 Review 列标注（见 `software.config` v0.5）。
(8) 关闭 `software` domain `[REVIEW-ASK]`：基于 Taxonomy spec rule 8（新增 domain MUST 可追溯到 `docs/flows`/`docs/protocol` 评审输入；本草案已在 flow steps 9/21 使用）+ rule 2 "e.g." 非穷举措辞，采纳时无需 taxonomy amendment。与 sibling 草案 `software.config` v0.5 一致；并修正该草案 v0.5 中 rule 4 → rule 8 的引用错误（taxonomy rule 8 才是新增 domain 可追溯规则）。

**v0.5 变更说明：**
(1) §3.1 `software.getUpdatePolicy` 新增 per-method 候选错误表。
(2) §3.3 `software.resetUpdatePolicy` 新增"可能的事件"和候选错误表。
(3) §5 Capability 新增 `supportsReset` 字段。
(4) §7 新增 3 个 JSON 示例：7.3b reset 触发事件、7.5b `PERMISSION_DENIED` 错误、7.5c `INVALID_STATE` 错误。
(5) §9.2 新增 legacy `SetUpdateConfig` 失败响应（`ok: false`）→ AXTP error 映射说明。
(6) §11 新增 2 条测试笔记：reset 事件一致性、`device_policy` 触发验证。
(7) §12 新增跨草案 `software.config` 错误码修正项。
(8) §1 新增 `setUpdatePolicy` status-only 设计决策说明。
(9) 协议审核标记表新增 flow step 21 响应差异 `[REVIEW-RESOLVED]` 条目。

**v0.4 变更说明：**
(1) 修正 §8 候选 Errors 中 `INVALID_STATE` 和 `PERMISSION_DENIED` 的错误码：`INVALID_STATE` 从错误的 `0x000E` 更正为 `0x0004`；`PERMISSION_DENIED` 从错误的 `0x0105` 更正为 `0x0009`（`0x000E` 实际为 `INTERNAL_ERROR`，`0x0105` 实际为 `DEVICE_OVER_TEMPERATURE`）。
(2) 修正 §3.0/3.2 `software.setUpdatePolicy` Result Schema 命名，与兄弟草案 `software.config` 对齐。
(3) 新增 §6.0 Schema 层级速览，提供全局结构视图。
(4) 新增 §7.2b/7.2c/7.2d JSON 示例：partial update、跨午夜 schedule、显式 null 清除。
(5) 新增 §9.2b `software.resetUpdatePolicy` AXTP-only 说明（无 legacy 对应方法）。
(6) §12 flow 一致性问题状态从 `[REVIEW-DRAFT]` 更新为 `[REVIEW-RESOLVED]`，明确 flow 文档 step 21 描述有误。

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
- `setUpdatePolicy` 仅返回 status 确认（无 result body），与 `software.setConfig` pattern 一致。调用者通过 `software.updatePolicyChanged` 事件或后续 `software.getUpdatePolicy` 查询确认策略变化。

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

## 3. 方法

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `software.getUpdatePolicy` | query | 查询当前软件更新策略。 | `SoftwareGetUpdatePolicyParams` | `SoftwareUpdatePolicy` | 否 | draft |
| `software.setUpdatePolicy` | command | 设置软件更新策略。 | `SoftwareSetUpdatePolicyParams` | 标准成功响应（无 result body） | 是，变化后触发 `software.updatePolicyChanged`。 | draft |
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

#### 请求参数 Params：`SoftwareGetUpdatePolicyParams`

字段见 6.5。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` `[REVIEW-ASK]` | none | 要查询策略的软件对象。 |

#### 返回结果 Result：`SoftwareUpdatePolicy`

字段见 6.1。

#### `software.getUpdatePolicy` 候选错误

| Error | 类别 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | target 不支持。 |

### 3.2 `software.setUpdatePolicy`

| 项 | 内容 |
|---|---|
| 目的 | 设置指定软件对象的更新策略。未出现的字段保持不变（partial update 语义）。 |
| 调用类型 | command（request_response） |
| Params Schema | `SoftwareSetUpdatePolicyParams` |
| Result Schema | 标准成功响应（无 result body） |
| 事件触发 | 策略实际变化后触发 `software.updatePolicyChanged`。 |
| 幂等性 | 否（写入操作） |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED` |

#### 请求参数 Params：`SoftwareSetUpdatePolicyParams`

字段见 6.6。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 软件对象。 |
| `policy` | object | yes | target-specific fields | none | 要设置的策略片段。未出现的字段保持不变。 |

#### 返回结果

`software.setUpdatePolicy` 返回标准成功响应（无 `result` 字段）。调用者如需确认策略变化，可通过以下方式：

1. 等待 `software.updatePolicyChanged` 事件获取变化后的完整策略。
2. 调用 `software.getUpdatePolicy` 主动查询最新策略。

#### 可能的事件

| Event | 条件 |
|---|---|
| `software.updatePolicyChanged` | 策略实际变化时触发。 |

#### `software.setUpdatePolicy` 候选错误

| Error | 类别 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | target、channel 或 schedule 不支持。 |
| `INVALID_ARGUMENT` | common | policy 字段值非法（如时间格式错误）。 |
| `PERMISSION_DENIED` | common | 无权修改更新策略。 |
| `INVALID_STATE` | common | 软件正在升级中，不允许修改更新策略。 |

### 3.3 `software.resetUpdatePolicy`

| 项 | 内容 |
|---|---|
| 目的 | 恢复指定软件对象的默认更新策略。`resetUpdatePolicy` 仅恢复更新策略到当前版本默认值，不触发软件重启或设备重启；系统级恢复出厂使用 `system.restoreFactorySettings`。 |
| 调用类型 | command（request_response） |
| Params Schema | `SoftwareResetUpdatePolicyParams` |
| Result Schema | `SoftwareUpdatePolicy` |
| 事件触发 | 策略实际变化后触发 `software.updatePolicyChanged`。reason 为 `restore_default`。 |
| 幂等性 | 是 |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED` |

#### 请求参数 Params：`SoftwareResetUpdatePolicyParams`

字段见 6.7。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 要恢复默认策略的软件对象。 |

#### 返回结果 Result：`SoftwareUpdatePolicy`

返回重置后的完整策略，省去额外 round-trip。字段见 6.1。

#### 可能的事件

| Event | 条件 |
|---|---|
| `software.updatePolicyChanged` | 策略实际变化时触发。reason 为 `restore_default`。 |

#### `software.resetUpdatePolicy` 候选错误

| Error | 类别 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | target 不支持。 |
| `PERMISSION_DENIED` | common | 无权重置更新策略。 |
| `INVALID_STATE` | common | 软件正在升级中，不允许重置更新策略。 |

---

## 4. 事件

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

字段见 6.8。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 变化的软件对象。 |
| `policy` | object | yes | target-specific fields | none | 变化后的完整策略。 |
| `changedFields` | string[] | no | field paths（dot-notation） | omitted | 变化的字段路径列表。字段路径使用点号分隔嵌套层级，如 `"schedule.start"` 表示 `policy.schedule.start` 字段变化。 |
| `reason` | string | no | `"user_request"`, `"restore_default"`, `"device_policy"`, `"unknown"` | `"unknown"` | 变化原因。 |

---

## 5. Capability

Capability name: `software.updatePolicy`。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `supportedTargets` | string[] | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | 支持配置策略的软件对象。 `[REVIEW-ASK]` |
| `supportedChannels` | string[] | no | `"release"`, `"beta"`, `"alpha"` | 支持的更新通道。 |
| `supportsSchedule` | boolean | no | `true` / `false` | 是否支持时间窗口配置。 |
| `supportsReset` | boolean | no | `true` / `false` | 是否支持恢复默认更新策略。 |

---

## 6. Schemas

### 6.0 Schema 层级速览

```text
请求 Params
  SoftwareGetUpdatePolicyParams     ← software.getUpdatePolicy
  SoftwareSetUpdatePolicyParams     ← software.setUpdatePolicy
  SoftwareResetUpdatePolicyParams   ← software.resetUpdatePolicy

响应 / 事件共用
  SoftwareUpdatePolicy
    target: string
    policy: object（target-specific）
      ┌─ target: "launcher"
      │    updateMode: string
      │    schedule: UpdateSchedule | null
      │    channel: string
      │    conditions: UpdateConditions | null
      └─ target: "signagePlayer" / "agent"  ← [REVIEW-ASK] 待补充

事件 Payload
  SoftwareUpdatePolicyChangedEvent
    target + policy + changedFields + reason
```

阅读规则：

- `policy` 是 target-specific 动态对象；字段集合由 `target` 值决定。当前草案只定义了 `target: "launcher"` 的字段。
- `schedule` 和 `conditions` 均可为 `null`（显式清除）或 omitted（保持不变）。详见 §6.2 null 语义说明。
- `SoftwareUpdatePolicy` 同时用于 `software.getUpdatePolicy` / `software.resetUpdatePolicy` 的 Result 和 `software.updatePolicyChanged` 事件 Payload。
- `software.setUpdatePolicy` 仅返回 status 确认（无 Result body）；通过事件或后续 get 调用确认变化。

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
| `schedule` | `UpdateSchedule` or null | no | see 6.3 | null | 自动更新时间窗口。仅在 `updateMode` 为 `"auto"` 时生效。`null` 表示不限制更新时间（全天候可更新）。`setUpdatePolicy` 传入 `null` 显式清除时间窗口。 |
| `channel` | string | yes | `"release"`, `"beta"`, `"alpha"` | `"release"` | 更新通道。`"release"` 为稳定通道；`"beta"` 为测试通道；`"alpha"` 为开发通道。 |
| `conditions` | `UpdateConditions` or null | no | see 6.4 | null | 自动更新前置条件。`null` 表示无前置条件（不限制）。`setUpdatePolicy` 传入 `null` 显式清除所有条件。 |

> **null 语义**：`schedule: null` 等价于"不限制更新时间"；`conditions: null` 等价于"无前置条件"。两者均为合法持久值，`resetUpdatePolicy` 恢复的默认策略中二者均为 `null`。这与 omitted（未传）不同：omitted 在 `setUpdatePolicy` partial update 语义中表示"保持不变"，`null` 表示"显式清除"。

> **字段间约束**：当 `updateMode` 为 `"manual"` 或 `"notify"` 时，`schedule` 仍可被设置和持久化，但设备不会在时间窗口内自动执行更新。`schedule` 的值不因 `updateMode` 变化而丢失。切换回 `"auto"` 后，原 `schedule` 继续生效。

`[REVIEW-ASK]` 其他 target（`signagePlayer`、`agent`）的 policy 字段集合预期与 launcher 相同（`updateMode` / `schedule` / `channel` / `conditions`），采纳前与产品/设备确认 target 间是否存在字段差异或额外条件。与 `software.config` §6.2 处理方式一致。

### 6.3 `UpdateSchedule`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `start` | string | yes | `HH:mm`，正则 `^([01]\d|2[0-3]):[0-5]\d$`（本地时间） | none | 窗口开始时间。 |
| `end` | string | yes | `HH:mm`，正则 `^([01]\d|2[0-3]):[0-5]\d$`（本地时间） | none | 窗口结束时间。`end < start` 表示跨午夜（start 当天到次日 end）。`[REVIEW-DRAFT]` |
| `timezone` | string | no | IANA timezone ID | 设备本地时区 | 时区。 |

> **校验规则**：`start` 和 `end` 必须匹配 `^([01]\d|2[0-3]):[0-5]\d$`。不匹配时返回 `INVALID_ARGUMENT`。`end < start` 表示跨午夜窗口（start 当天到次日 end）。

### 6.4 `UpdateConditions`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `requireIdle` | boolean | no | `true` / `false` | `true` | 是否要求设备空闲时才执行更新。 |
| `requireWifi` | boolean | no | `true` / `false` | `false` | 是否要求 WiFi 网络下才下载更新。 |

`[REVIEW-ASK]` `conditions` 是否需要标牌特有条件（如 `requirePlaybackIdle`——播放内容时暂停更新）。

### 6.5 `SoftwareGetUpdatePolicyParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` `[REVIEW-ASK]` | none | 要查询策略的软件对象。 |

### 6.6 `SoftwareSetUpdatePolicyParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 软件对象。 |
| `policy` | object | yes | target-specific fields | none | 要设置的策略片段。未出现的字段保持不变（partial update 语义）。`target: "launcher"` 时见 6.2。 |

### 6.7 `SoftwareResetUpdatePolicyParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 要恢复默认策略的软件对象。 |

### 6.8 `SoftwareUpdatePolicyChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | `"launcher"`, `"signagePlayer"`, `"agent"` | none | 变化的软件对象。 |
| `policy` | object | yes | target-specific fields | none | 变化后的完整策略。 |
| `changedFields` | string[] | no | field paths（dot-notation） | omitted | 变化的字段路径列表。字段路径使用点号分隔嵌套层级，如 `"schedule.start"`。 |
| `reason` | string | no | `"user_request"`, `"restore_default"`, `"device_policy"`, `"unknown"` | `"unknown"` | 变化原因。 |

---

## 7. JSON 示例

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
  }
}
```

**读法**：setUpdatePolicy 仅返回成功确认，不回传完整策略。策略变化通过 `software.updatePolicyChanged` 事件或后续 `software.getUpdatePolicy` 查询确认。

### 7.2b 部分更新（仅修改通道）

**场景**：运维人员仅将更新通道从 `"release"` 切换到 `"beta"`，不修改其他策略字段。

请求：

```json
{
  "id": 5,
  "method": "software.setUpdatePolicy",
  "params": {
    "target": "launcher",
    "policy": {
      "channel": "beta"
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

**读法**：partial update 语义——只传需要修改的 `channel` 字段，`updateMode`、`schedule` 和 `conditions` 保持不变。设置成功后可通过 `software.updatePolicyChanged` 事件或 `software.getUpdatePolicy` 确认策略变化。

### 7.2c 跨午夜 schedule

**场景**：运维人员将更新窗口设置为夜间 22:00 到次日 06:00（跨午夜）。

请求：

```json
{
  "id": 6,
  "method": "software.setUpdatePolicy",
  "params": {
    "target": "launcher",
    "policy": {
      "schedule": {
        "start": "22:00",
        "end": "06:00"
      }
    }
  }
}
```

响应：

```json
{
  "id": 6,
  "status": {
    "ok": true,
    "code": 0
  }
}
```

**读法**：`end < start` 表示跨午夜窗口（22:00 当天到次日 06:00）。仅修改 `schedule`，其余策略字段保持不变。跨午夜语义采纳前仍需确认。`[REVIEW-ASK]`

### 7.2d 显式 null 清除

**场景**：运维人员显式清除更新时间窗口并移除所有前置条件。

请求：

```json
{
  "id": 7,
  "method": "software.setUpdatePolicy",
  "params": {
    "target": "launcher",
    "policy": {
      "schedule": null,
      "conditions": null
    }
  }
}
```

响应：

```json
{
  "id": 7,
  "status": {
    "ok": true,
    "code": 0
  }
}
```

**读法**：`schedule: null` 显式清除时间窗口（不限制更新时间）；`conditions: null` 显式清除所有前置条件。`null` 与 omitted 不同：omitted 表示"保持不变"，`null` 表示"显式清除"。设置成功后 `software.getUpdatePolicy` 应返回 `schedule: null` 和 `conditions: null`。

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

### 7.3b 恢复默认策略触发事件

**场景**：`software.resetUpdatePolicy` 成功后触发 `software.updatePolicyChanged` 事件。

```json
{
  "event": "software.updatePolicyChanged",
  "intent": 1,
  "data": {
    "target": "launcher",
    "policy": {
      "updateMode": "auto",
      "schedule": null,
      "channel": "release",
      "conditions": null
    },
    "changedFields": ["updateMode", "schedule", "channel", "conditions"],
    "reason": "restore_default"
  }
}
```

**读法**：reset 触发的事件 reason 为 `"restore_default"`，`changedFields` 包含所有被重置的字段路径。

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

### 7.5b 权限不足

**场景**：操作者无权修改更新策略。

```json
{
  "id": 8,
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

**场景**：软件正在升级中，不允许修改更新策略。

```json
{
  "id": 9,
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

**读法**：`code: 4` 对应 `INVALID_STATE` (0x0004)。设备当前正在执行软件更新，策略修改需等待更新完成。

### 7.5d 参数非法（INVALID_ARGUMENT）

**场景**：运维人员设置的更新窗口时间格式不匹配 `HH:mm`（如 `"25:00"`，小时越界）。

请求：

```json
{
  "id": 10,
  "method": "software.setUpdatePolicy",
  "params": {
    "target": "launcher",
    "policy": {
      "schedule": {
        "start": "25:00",
        "end": "06:00"
      }
    }
  }
}
```

响应：

```json
{
  "id": 10,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Invalid argument.",
    "details": {
      "field": "policy.schedule.start",
      "reason": "invalid_time_format"
    }
  }
}
```

**读法**：`code: 10` 对应 `INVALID_ARGUMENT` (0x000A)。`schedule.start` 不匹配 `^([01]\d|2[0-3]):[0-5]\d$`，返回参数非法错误；设备策略保持不变。

---

## 8. 候选 Errors

| Error | 复用 / 候选 | 说明 | Review |
|---|---|---|---|
| `NOT_SUPPORTED` | common (0x0003) | target、channel 或 schedule 不支持。 | — |
| `INVALID_ARGUMENT` | common (0x000A) | policy 字段值非法（如时间格式错误、channel 值无效）。 | — |
| `PERMISSION_DENIED` | common (0x0009) | 无权修改更新策略。 | — |
| `INVALID_STATE` | common (0x0004) | 软件正在升级中，不允许修改更新策略。 | — |

---

## 9. Legacy 映射

以下映射基于 `docs/legacy-migration/evidence/NearHub-Launcher数字标牌设备管理通用管理命令.md`。

### 9.1 `GetUpdateConfig` → `software.getUpdatePolicy(target: "launcher")`

**方向**：Server -> Device, Device -> Server

**状态**：`[REVIEW-DRAFT]`

| Legacy 字段 | Legacy 类型 | AXTP 字段路径 | 说明 |
|---|---|---|---|
| *(response root)* | — | `result.target` | AXTP 新增 `target: "launcher"` 包裹。 |
| `autoUpdate` | Boolean | `result.policy.updateMode` | 类型变换：Boolean → enum。`true` → `"auto"`，`false` → `"manual"`。 |
| `autoUpdateWindow` | Object | `result.policy.schedule` | 字段名变化：`autoUpdateWindow` → `schedule`。嵌套层级不变。 |
| `autoUpdateWindow.start` | String | `result.policy.schedule.start` | 字段名不变，嵌套路径变化。 |
| `autoUpdateWindow.end` | String | `result.policy.schedule.end` | 字段名不变，嵌套路径变化。 |
| `channel` | String | `result.policy.channel` | 字段名不变，嵌套层级变化。 |
| *(AXTP 新增)* | — | `result.policy.schedule.timezone` | AXTP 独有。Legacy 无时区概念（隐含设备本地时区）。Adapter 可选填充为设备系统时区或忽略。 |
| *(AXTP 新增)* | — | `result.policy.conditions` | AXTP 独有。Legacy 无更新前置条件。Adapter 可选丢弃。 |

**结构变换**：Legacy 响应为 flat object `{ autoUpdate, autoUpdateWindow: { start, end }, channel }`；AXTP 响应嵌套为 `{ target, policy: { updateMode, schedule: { start, end }, channel, conditions } }`。Adapter 层需执行 flat → nested 包装和 Boolean → enum 类型变换。

**AXTP 新增字段**：`result.policy.schedule.timezone` 和 `result.policy.conditions` 在 legacy 中无对应字段。Adapter 可选填充（timezone 使用设备系统时区）或丢弃。

**类型变换**：`autoUpdate: true` → `updateMode: "auto"`；`autoUpdate: false` → `updateMode: "manual"`。AXTP `"notify"` 模式无 legacy 等价。

### 9.2 `SetUpdateConfig` → `software.setUpdatePolicy(target: "launcher")`

**方向**：Server -> Device, Device -> Server

**状态**：`[REVIEW-DRAFT]`

| Legacy 字段 | Legacy 类型 | AXTP 字段路径 | 说明 |
|---|---|---|---|
| *(request root)* | — | `params.target` | AXTP 新增 `target: "launcher"` 包裹。 |
| `autoUpdate` | Boolean (必填) | `params.policy.updateMode` | 类型变换：Boolean → enum。`true` → `"auto"`，`false` → `"manual"`。 |
| `autoUpdateWindow` | Object (必填) | `params.policy.schedule` | 字段名变化：`autoUpdateWindow` → `schedule`。嵌套层级不变。 |
| `autoUpdateWindow.start` | String (必填) | `params.policy.schedule.start` | 字段名不变，嵌套路径变化。 |
| `autoUpdateWindow.end` | String (必填) | `params.policy.schedule.end` | 字段名不变，嵌套路径变化。 |
| `channel` | String (必填) | `params.policy.channel` | 字段名不变，嵌套层级变化。 |
| *(AXTP 新增)* | — | `params.policy.schedule.timezone` | AXTP 独有。Legacy 无时区概念。Adapter 在 legacy→AXTP 方向可选填充设备系统时区；AXTP→legacy 方向丢弃。 |
| *(AXTP 新增)* | — | `params.policy.conditions` | AXTP 独有。Legacy 无更新前置条件。Adapter 在 legacy→AXTP 方向可选设为 `null` 或默认值；AXTP→legacy 方向丢弃。 |

**语义差异**：Legacy `SetUpdateConfig` 要求所有字段必填（全量覆盖语义）；AXTP `software.setUpdatePolicy` 使用 partial update 语义（未传字段保持不变）。Adapter 层需在 legacy→AXTP 方向透传全部字段以兼容旧行为；在 AXTP→legacy 方向需将 partial update 转为全量覆盖（先 getUpdatePolicy 读取当前值，合并变更字段后全量下发）。

**响应差异**：Legacy 返回 `{ ok: true }`；AXTP `software.setUpdatePolicy` 同样仅返回 status 确认（无 result body）。两者行为一致，Adapter 无需做响应变换。

**失败映射**：Legacy `SetUpdateConfig` 返回 `{ ok: false }` 时无结构化错误码。Adapter 需根据上下文推断并映射为 AXTP 错误：字段值非法 → `INVALID_ARGUMENT`；不支持的通道或时间窗口 → `NOT_SUPPORTED`；权限不足 → `PERMISSION_DENIED`。当无法确定具体原因时，使用 `INTERNAL_ERROR`。

**类型变换**：`autoUpdate: true` → `updateMode: "auto"`；`autoUpdate: false` → `updateMode: "manual"`。反向 `updateMode: "notify"` 无 legacy 等价，Adapter 应按 `"manual"` 处理（不自动更新）。

**结构变换**：Legacy 请求为 flat object `{ autoUpdate, autoUpdateWindow: { start, end }, channel }`；AXTP 请求嵌套为 `{ target: "launcher", policy: { updateMode, schedule: { start, end }, channel } }`。

### 9.2b `software.resetUpdatePolicy` — AXTP-only

**状态**：`[REVIEW-DRAFT]`

`software.resetUpdatePolicy` 在 legacy 协议中没有对应方法。Legacy 系统没有"恢复默认更新策略"的专用命令。

- Legacy `ResetConfig`（恢复出厂设置）映射到 `system.restoreFactorySettings`，不是 `software.resetUpdatePolicy`。两者语义不同：前者恢复整个设备出厂状态，后者仅恢复软件更新策略到默认值。
- Adapter 层在 legacy 请求恢复出厂时**不应**调用 `software.resetUpdatePolicy`，应路由到 `system.restoreFactorySettings`。
- 如果 legacy 客户端需要仅重置更新策略（非恢复出厂），Adapter 需从带外知识合成默认值（`updateMode: "auto"`, `schedule: null`, `channel: "release"`, `conditions: null`），通过 `software.setUpdatePolicy` 下发。
- `software.resetUpdatePolicy` 返回重置后的完整策略，省去额外 round-trip，这是 AXTP-only 能力优势。

### 9.3 Legacy classification 差异说明

**状态**：`[REVIEW-DRAFT]`（signage_sdk.md 已更新；CSV 和 firmware.md 待同步）

Legacy classification CSV（`docs/legacy-migration/classification/legacy-protocol-classification.csv`）和 `docs/legacy-migration/classification/firmware.md` 将 `GetUpdateConfig` / `SetUpdateConfig` 归入 `firmware.updatePolicy` → `firmware.getUpdatePolicyConfig` / `firmware.setUpdatePolicyConfig`。

Flow 文档（`docs/flows/signage-device-management.md`）已 re-classified 到 `software.updatePolicy`（target: `"launcher"`）。理由：这些命令管理的是 Launcher 软件的自动更新设置，不是设备固件 OTA 策略。

Generated legacy-to-axtp map（`docs/legacy-migration/generated/legacy-to-axtp-map.generated.yaml`）仍使用旧通用名 `update.getConfig` / `update.setConfig`，既不是 `firmware.updatePolicy` 也不是 `software.updatePolicy`。

**修正进度**：

1. `software.updatePolicy` 分类为正确归属（软件更新策略，非固件 OTA）。**已确认**。
2. `docs/legacy-migration/classification/by-source/signage_sdk.md` 已更新：GetUpdateConfig / SetUpdateConfig 映射到 `software.updatePolicy`。**已完成**。
3. `docs/legacy-migration/classification/legacy-protocol-classification.csv` 仍将 GetUpdateConfig / SetUpdateConfig 归入 `firmware.updatePolicy`。**待修正**为 `software.updatePolicy`。
4. `docs/legacy-migration/classification/firmware.md` 仍包含 GetUpdateConfig / SetUpdateConfig 行。**待移除**（这些行应出现在 `software.md` 或保留在 signage.md）。
5. `docs/legacy-migration/generated/legacy-to-axtp-map.generated.yaml` 仍使用旧通用名 `update.getConfig` / `update.setConfig`。**待重新生成**为 `software.getUpdatePolicy` / `software.setUpdatePolicy`。
6. `docs/protocol/firmware/firmware.updatePolicy.md` 保持为 v0.1 骨架，等待真实固件 OTA 策略需求填充。**无需变动**。

### 9.4 Adapter 层结构变换说明

Legacy 更新配置使用 flat object 结构（`autoUpdate`、`autoUpdateWindow`、`channel` 为顶层字段）。AXTP 使用嵌套结构（这些字段位于 `policy.*`）。Adapter 层职责：

1. **Get 方向**（AXTP → legacy）：从 `policy.updateMode` 提取并转为 Boolean `autoUpdate`（`"auto"` → `true`，`"manual"` / `"notify"` → `false`）；从 `policy.schedule` 提取并重命名为 `autoUpdateWindow`；从 `policy.channel` 提取 `channel`。展平为 `{ autoUpdate, autoUpdateWindow: { start, end }, channel }`。如 AXTP 响应包含 `conditions`，Adapter 可选保留或丢弃（legacy 不包含此字段）。
2. **Set 方向**（legacy → AXTP）：将 flat `{ autoUpdate, autoUpdateWindow, channel }` 包装为 `{ target: "launcher", policy: { updateMode, schedule: { start, end }, channel } }`。Boolean `autoUpdate` 转为 enum `updateMode`。由于 legacy 全量覆盖语义，Adapter 需透传全部字段。
3. **类型变换**：`autoUpdate: true` → `updateMode: "auto"`；`autoUpdate: false` → `updateMode: "manual"`。反向 `"auto"` → `true`；`"manual"` / `"notify"` → `false`。
4. **响应变换**：AXTP `setUpdatePolicy` 仅返回 status 确认，与 legacy `{ ok: true }` 行为一致，Adapter 无需变换。
5. **语义差异兼容**：Legacy `SetUpdateConfig` 全量覆盖 vs AXTP partial update 的差异由 Adapter 层处理。Adapter 在 legacy→AXTP 方向透传全部字段；在 AXTP→legacy 方向先读取当前值再全量合并下发。

**JSON 变换示例 — Get 方向（AXTP → legacy）**：

AXTP 响应：

```json
{
  "target": "launcher",
  "policy": {
    "updateMode": "auto",
    "schedule": { "start": "02:00", "end": "06:00" },
    "channel": "release",
    "conditions": { "requireIdle": true, "requireWifi": false }
  }
}
```

Legacy 响应（Adapter 输出）：

```json
{
  "autoUpdate": true,
  "autoUpdateWindow": { "start": "02:00", "end": "06:00" },
  "channel": "release"
}
```

> `updateMode: "auto"` → `autoUpdate: true`；`schedule` → `autoUpdateWindow`（丢弃 `timezone`）；`conditions` 丢弃。

**JSON 变换示例 — Set 方向（legacy → AXTP）**：

Legacy 请求：

```json
{
  "autoUpdate": false,
  "autoUpdateWindow": { "start": "03:00", "end": "05:00" },
  "channel": "beta"
}
```

AXTP 请求（Adapter 输出）：

```json
{
  "target": "launcher",
  "policy": {
    "updateMode": "manual",
    "schedule": { "start": "03:00", "end": "05:00" },
    "channel": "beta"
  }
}
```

> `autoUpdate: false` → `updateMode: "manual"`；`autoUpdateWindow` → `schedule`；无 `timezone`（设备使用默认本地时区）；无 `conditions`（partial update 中 omitted 保持不变）。

---

## 10. Registry / Conformance Status

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method / event IDs | `TBD after adoption` |
| Conformance | 需覆盖 get/set/reset 一致性、target 不支持、非法 channel、跨日 window、事件校准。 |

---

## 11. Test Notes

- `software.getUpdatePolicy(target: "launcher")` / `software.setUpdatePolicy(target: "launcher")` 策略 get/set 一致。
- `software.setUpdatePolicy` partial update 语义验证：只传 `channel`，其余字段保持不变。
- `software.resetUpdatePolicy(target: "launcher")` 恢复后策略与默认值一致。
- 收到 `software.updatePolicyChanged` 事件后，`software.getUpdatePolicy` 返回的策略应与事件 payload 一致。
- 不支持 `"beta"` 通道的设备传 `channel: "beta"` 时应返回 `NOT_SUPPORTED`。
- 跨日 window（`end < start`）语义需采纳前确认。`[REVIEW-ASK]`
- `software.setUpdatePolicy` partial update 语义验证：只传 `channel`，`updateMode`、`schedule` 和 `conditions` 保持不变。set 成功后应通过 `software.updatePolicyChanged` 事件或 `software.getUpdatePolicy` 确认策略变化。
- Legacy `GetUpdateConfig` Adapter 测试：AXTP `{ policy: { updateMode: "auto", schedule: { start: "02:00", end: "06:00" }, channel: "release" } }` 应转换为 legacy `{ autoUpdate: true, autoUpdateWindow: { start: "02:00", end: "06:00" }, channel: "release" }`。
- Legacy `SetUpdateConfig` Adapter 测试：legacy `{ autoUpdate: false, autoUpdateWindow: { start: "03:00", end: "05:00" }, channel: "beta" }` 应转换为 AXTP `{ target: "launcher", policy: { updateMode: "manual", schedule: { start: "03:00", end: "05:00" }, channel: "beta" } }`。
- Legacy `SetUpdateConfig` 全量覆盖语义与 AXTP partial update 的 Adapter 兼容性测试。
- `updateMode: "notify"` 无 legacy 等价，Adapter 反向映射应按 `"manual"` 处理（不自动更新）。
- `updateMode` 设为 `"manual"` 后再切回 `"auto"`，`schedule` 应保持原值不丢失。
- `software.setUpdatePolicy` 传入 `schedule: null` 后，`software.getUpdatePolicy` 应返回 `schedule: null`（显式清除 vs omitted 保持不变）。
- 软件正在升级时调用 `software.setUpdatePolicy` 应返回 `INVALID_STATE`。
- `software.resetUpdatePolicy(target: "launcher")` 后应触发 `software.updatePolicyChanged` 事件，`reason` 为 `"restore_default"`，`changedFields` 应包含所有被重置的字段。
- 设备内部策略修改触发 `software.updatePolicyChanged` 事件（`reason: "device_policy"`）后，`software.getUpdatePolicy` 返回的策略应与事件 payload 一致。

---

## 12. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| `software` domain 未在 Taxonomy spec rule 2 示例列表中 | （原）采纳阻塞 | rule 2 为 "e.g." 措辞（非穷举列表），rule 8 允许新增 domain 且 MUST 可追溯到 `docs/flows`/`docs/protocol` 评审输入（本草案见 flow steps 9/21）；采纳无需 taxonomy amendment。与 `software.config` v0.5 一致。 | `[REVIEW-RESOLVED]` |
| `target` 枚举完整值列表 | schema 约束 | 当前草案列出 `launcher`、`signagePlayer`、`agent`；采纳前与产品和设备确认。 | `[REVIEW-ASK]` |
| 与 `firmware.updatePolicy` 的边界 | domain 划分 | 固件 OTA 策略保留在 `firmware.updatePolicy`；软件策略使用 `software.updatePolicy`。是否未来统一到 `software.updatePolicy(target: "firmware")`？ | `[REVIEW-ASK]` |
| `updateMode` 枚举首批值 | schema / conformance | `"auto"` 和 `"manual"` 确定需 P0；`"notify"` 是否纳入 P0？ | `[REVIEW-ASK]` |
| 跨日 window（`end < start`）语义 | schema / tests | 先按跨日候选处理（`start` 当天到次日 `end`），采纳前确认。 | `[REVIEW-ASK]` |
| `conditions` 是否包含标牌特有条件 | schema | 是否需要 `requirePlaybackIdle`（播放内容时暂停更新）？ | `[REVIEW-ASK]` |
| Legacy classification 差异（`GetUpdateConfig` / `SetUpdateConfig`） | classification 准确性 | Classification CSV 归入 `firmware.updatePolicy`；flow 文档 re-classified 到 `software.updatePolicy`（正确）。需修正 classification 和 generated map。 | `[REVIEW-ASK]` |
| Flow step 21 响应描述（setUpdatePolicy 是否返回完整策略） | flow / draft 一致性 | Flow 文档 step 16/19/21 已修正为"返回标准成功响应（无 result body）；触发对应 *Changed 事件"，与草案 `setUpdatePolicy` status-only 设计一致（原 step 编号曾误记为 step 20，实为 step 21）。本条闭环。 | `[REVIEW-RESOLVED]` |
| `software.config` §8 错误码 | 跨草案一致性 | sibling 草案 `software.config` 已修正至 v0.5，§8 中 `PERMISSION_DENIED` / `INVALID_STATE` / `INVALID_ARGUMENT` 现为正确值 `0x0009` / `0x0004` / `0x000A`（见 `software.config` v0.5 错误码修正说明）。本草案 §8 Review 列同步对齐为已采纳复用码（标 `—`）。 | `[REVIEW-RESOLVED]` |

# 协议草案模板

创建或重写 `docs/protocol/<domain>/<domain.feature>.md` 时，使用这份轻量中文模板。

`domain.feature` 草案的目标是让人快速看懂协议意图、接口形状、字段含义、测试重点和采纳风险。它不是最终机器事实源，也不是长篇规范论文。正式机器事实源仍然是 `registry/**/*.yaml`、`protocol/axtp.protocol.yaml`、`docs/generated/**` 和 `docs/conformance/**`。

````markdown
---
status: draft
contract: false
generated: false
domain: <domain>
feature: <domain.feature>
registry:
lastReviewed: YYYY-MM-DD
---

# <domain.feature>

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | <一句话说明> |
| 当前状态 | draft / review-ok / generated / deprecated |
| 是否可直接实现 | 否。draft/review-ok 阶段仅供评审；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC / RPC + EVENT / RPC + STREAM |
| 是否使用 STREAM | 是 / 否 |
| Registry readiness | none / partial / candidate / ready |
| Conformance | none / needed / ready |
| 主要未决问题 | <一句话列出，若无则写“暂无”> |

## 1. 功能说明

用 3-5 句话说明这个 feature 解决什么问题、面向哪些调用方、适用于哪些设备或场景。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | <能力 1> |
| 包含 | <能力 2> |
| 不包含 | <不属于本文的能力；说明应归属哪个 feature> |
| 不包含 | <不属于本文的能力；说明应归属哪个 feature> |
| 数据面 | 本 feature 不定义 STREAM payload，所有操作均通过 RPC method/event 完成。 |

## 3. 方法 Methods

方法 ID、bitOffset 和 schema fieldId 均为 `TBD after adoption`，由 registry 采纳时分配。不要在草案中分配正式 ID。

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `<domain.feature>.get` | query | 查询当前状态或配置 | `GetXxxParams` | `XxxState` | 否 | draft / review-ok |
| `<domain.feature>.set` | command | 设置目标状态或配置 | `SetXxxParams` | `XxxState` | 是，`<domain.feature>.changed` | draft / review-ok |

### 3.1 `<domain.feature>.get`

**用途**：查询当前状态或配置。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `GetXxxParams` |
| Result Schema | `XxxState` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回当前快照。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.1.1 请求参数 Params：`GetXxxParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

#### 3.1.2 返回结果 Result：`XxxState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

#### 3.1.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| 无 | query method 不应因查询触发状态变化事件。 | none | 无需处理。 |

#### 3.1.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持该 feature、method 或 target。 | 返回 unsupported feature/method/target。 |
| `INVALID_ARGUMENT` | 请求字段非法。 | 返回具体字段路径和合法范围。 |

### 3.2 `<domain.feature>.set`

**用途**：设置目标状态或配置。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `SetXxxParams` |
| Result Schema | `XxxState` |
| 是否触发事件 | 是，状态实际变化后触发 `<domain.feature>.changed` |
| 幂等性 / 异步性 | 建议幂等；重复设置相同值应成功，可不重复触发事件。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `PERMISSION_DENIED`, `BUSY` |

#### 3.2.1 请求参数 Params：`SetXxxParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

#### 3.2.2 返回结果 Result：`XxxState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

#### 3.2.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `<domain.feature>.changed` | 状态实际发生变化。 | `XxxChangedEvent` | 可直接更新 UI；需要完整状态时调用 get 校准。 |

#### 3.2.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `OUT_OF_RANGE` | 字段超出 capability 声明范围。 | 返回合法范围。 |
| `BUSY` | 设备正在处理冲突操作。 | 稍后重试。 |

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `<domain.featureChanged>` | <触发条件> | `<EventPayload>` | <直接更新 UI / 调用 get 校准 / 可忽略等> | draft / review-ok |

### 4.1 `<domain.featureChanged>`

**触发条件**：

- RPC 设置导致状态或配置实际变化。
- 本地按键、设备策略、profile、restore 或 factory reset 导致状态变化。
- 设备上报来自外部系统的同步变化。

#### Payload：`XxxChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| payload 是完整状态 | 可直接更新 UI 或本地缓存。 |
| payload 是变化片段 | 调用对应 get method 校准完整状态。 |
| event 丢失或重连 | 重连后主动调用 get method 校准。 |

## 5. Capability

Capability name: `<domain.feature>`。

设备通过 capability 声明是否支持该 feature，以及支持哪些范围、模式、对象或约束。

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `<domain.feature>` | none | capability 名称。 |
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

## 6. 字段 / Schemas

### 6.1 Schema 层级速览

用一小段话和简单结构说明本 feature 有哪些核心数据对象，以及它们分别用于 method params、method result、event payload 还是 capability。

Schema 展开模式必须二选一：

- 简单 feature：method/event 章节已经直接展开 Params / Result / Payload 字段表，本章只保留 schema 索引，避免重复。
- 复杂 feature：method/event 章节只写 schema 名称和本章链接，本章集中定义完整字段表；method/event 下必须明确写“字段见 6.x”，不能让读者自己猜。

Capability 字段始终放在第 5 章；不要混入 method params/result 或 event payload。

```text
XxxState
  fieldA
  fieldB
SetXxxParams
  target
  value
XxxChangedEvent
  changedFields
  state: XxxState
```

### 6.2 请求与响应 Schemas

#### `<ParamsSchema>`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

#### `<ResultSchema>`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

### 6.3 Capability Schemas

如 capability 字段较复杂，在这里展开能力对象。

### 6.4 Event Schemas

如 event payload 字段较复杂，在这里展开事件对象。

### 6.5 State / Config / Object Schemas

如存在状态对象、配置对象、数组元素对象，在这里展开。对象字段较多时，每个对象单独成表。

## 7. JSON 示例

示例只展示 RPC `d` 数据块，不包裹外层 `sid` / `op` / `d` wire envelope。字段和 ID 在采纳前均为草案。

每个 feature 至少提供：

- 一个 query 示例，如果存在 query method。
- 一个 command/action 示例，如果存在 set/action method。
- 一个 event 示例，如果存在 event。
- 一个 failure 示例，如果有重要错误。

示例下方请加“读法”，用 1-3 句话解释调用方应该如何理解结果。

### 7.1 场景：<客户端要完成什么>

#### request

```json
{
  "id": 1,
  "method": "<domain.method>",
  "params": {
    "<field>": "<value>"
  }
}
```

#### response

```json
{
  "id": 1,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "<field>": "<value>"
  }
}
```

读法：<解释 result 中关键字段如何对应 schema、capability、默认值、范围、事件或后续动作。>

### 7.2 场景：事件通知

```json
{
  "event": "<domain.featureChanged>",
  "intent": 1,
  "data": {
    "<field>": "<value>"
  }
}
```

读法：<解释 event payload 是完整状态还是变化片段，以及客户端是否需要再 get。>

### 7.3 场景：失败响应

```json
{
  "id": 1,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Invalid argument.",
    "details": {
      "candidateError": "<FEATURE_SPECIFIC_ERROR>"
    }
  }
}
```

读法：<解释这个错误为什么发生、请求是否会部分生效、是否会触发事件。>

## 8. 错误

| 错误 | 适用场景 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持 feature、method、target、scope 或 section。 | 优先复用通用错误。 |
| `INVALID_ARGUMENT` | 参数非法、枚举非法、范围非法。 | 应指出具体字段。 |
| `INVALID_STATE` | 当前状态不允许执行。 | 如 lifecycle/reset/initialization 冲突。 |
| `BUSY` | 设备或资源繁忙。 | 如已有动作执行中。 |
| `PERMISSION_DENIED` | 调用方权限不足。 | 危险操作或敏感信息读取。 |
| `<FEATURE_SPECIFIC_ERROR>` | 候选业务错误。 | `[REVIEW-DRAFT]`；采纳前确认是否需要 feature-specific errorCode。 |

## 9. Legacy 映射

Legacy 映射是迁移证据，不是 runtime 合同。如果没有 legacy 映射，写“暂无”。

| legacy 项 | 候选映射 | 状态 | 说明 |
|---|---|---|---|
| `<legacy command / field>` | `<domain.method>` / `<event>` / adapter-only | `[REVIEW-ASK]` / `[REVIEW-OK]` / `[REVIEW-DRAFT]` | <说明> |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| registry | not generated / candidate / adopted | 是否已写入 registry YAML。 |
| generated | true / false | 是否已进入 protocol IR / docs/generated。 |
| protocol draft | draft / review-ok / deprecated | 当前草案状态。 |
| registry readiness | none / partial / candidate / ready | 是否可进入 registry review。 |
| conformance | missing / needed / ready | 是否已有测试用例。 |

## 11. 测试要点

| 类型 | 要点 |
|---|---|
| happy path | <正常查询/设置/动作> |
| event path | <事件触发和客户端处理> |
| boundary case | <边界值、默认值、省略字段、非法枚举> |
| error case | <权限、busy、unsupported、invalid argument> |
| compatibility | <旧字段/旧命令迁移、可选字段兼容> |

## 12. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| <问题> | schema / registry / conformance / legacy / product behavior | <当前建议> | open / decided / blocked |

## 可选附录：复杂 / 高风险 feature 增强

reset / factory restore、firmware.ota、security/auth、network.config、storage.format、lifecycle/reboot/shutdown，或任何会导致断连、数据清除、权限变化、软件版本变化、设备身份变化的能力，可以追加以下附录。

### 附录 A. 协议审核标记

| 标记 | 条目 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-OK]` | <item> | <已确认结论> | <后续动作> |
| `[REVIEW-DRAFT]` | <item> | <草案结论> | <后续动作> |
| `[REVIEW-ASK]` | <item> | <待确认问题> | <需要谁确认> |

### 附录 B. 协议决策记录

| 决策点 | 结论 | 理由 |
|---|---|---|
| <decision> | <result> | <reason> |

### 附录 C. Registry 草案输入

如果该 feature 已经接近 registry review，可以给出 YAML 候选片段。不得分配正式 methodId / eventId / errorCode / fieldId；ID 使用 `TBD after adoption`。

### 附录 D. 采纳检查清单

- [ ] domain.feature 边界已确认。
- [ ] methods/events/schemas/capability 已确认。
- [ ] methodId/eventId/fieldId/errorCode 将由 registry 采纳时分配。
- [ ] legacy 映射已人工确认。
- [ ] conformance cases 已规划。
````

## 示例片段：audio.volume 的 method / event 层级

下面只展示层级样式，不表示正式 registry 命名或 ID。

```markdown
## 3. 方法 Methods

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `audio.volume.get` | query | 查询当前音量状态 | `GetVolumeParams` | `AudioVolumeState` | 否 | draft |
| `audio.volume.set` | command | 设置音量或静音 | `SetVolumeParams` | `AudioVolumeState` | 是，`audio.volume.changed` | draft |

### 3.2 `audio.volume.set`

**用途**：设置指定 target 的音量或静音状态。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `SetVolumeParams` |
| Result Schema | `AudioVolumeState` |
| 是否触发事件 | 是，状态实际变化后触发 `audio.volume.changed` |
| 幂等性 / 异步性 | 建议幂等；重复设置相同值应成功，可不重复触发事件。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `PERMISSION_DENIED`, `BUSY` |

#### 3.2.1 请求参数 Params：`SetVolumeParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | no | `master`, `speaker`, `lineOut` | `master` | 设置对象。 |
| `level` | integer | no | `0..100` | omitted | 目标音量。 |
| `muted` | boolean | no | `true`, `false` | omitted | 目标静音状态。 |

#### 3.2.2 返回结果 Result：`AudioVolumeState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | capability-declared target | none | 状态对象。 |
| `level` | integer | yes | `0..100` | none | 设置后的当前音量。 |
| `muted` | boolean | yes | `true`, `false` | none | 设置后的静音状态。 |

#### 3.2.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `audio.volume.changed` | 音量或静音实际变化。 | `AudioVolumeChangedEvent` | 可直接更新 UI；需要完整状态时调用 `audio.volume.get` 校准。 |

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `audio.volume.changed` | 音量或静音变化 | `AudioVolumeChangedEvent` | 更新 UI 或调用 `audio.volume.get` 校准 | draft |

### 4.1 `audio.volume.changed`

**触发条件**：

- RPC 设置导致音量或静音变化。
- 本地按键或 HID report 导致音量变化。
- 设备策略、restore 或 factory reset 改变音量。

#### Payload：`AudioVolumeChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `changedFields` | string[] | no | field path array | omitted | 变化字段。 |
| `state` | `AudioVolumeState` | yes | see schema | none | 变化后的音量状态。 |
| `reason` | string enum | no | `user_request`, `physical_control`, `device_policy`, `unknown` | `unknown` | 变化原因。 |

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| payload 是完整状态 | 可直接更新 UI。 |
| payload 是部分状态 | 调用 `audio.volume.get` 校准。 |
| event 丢失风险 | 客户端应在重连后主动 get。 |
```

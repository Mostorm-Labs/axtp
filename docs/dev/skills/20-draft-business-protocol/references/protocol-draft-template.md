# 协议草案模板

创建或重写 `docs/protocol/<domain>/<domain.feature>.md` 时，使用这份轻量中文模板。

`domain.feature` 草案的目标是让人快速看懂协议意图、接口形状、字段含义、测试重点和采纳风险。它不是最终机器事实源，也不是长篇规范论文。正式机器事实源仍然是 `registry/**/*.yaml`、`protocol/axtp.protocol.yaml`、`docs/generated/**` 和 `docs/conformance/**`。

公共 JSON envelope、错误占位、schema 展开和 flow example 写法维护在 `docs/protocol/draft-conventions.md`，模板和草案只保留 feature-specific 内容。

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

## JSON 示例约定

草案中的 JSON 示例遵循 [Protocol Draft Conventions](../draft-conventions.md#json-示例约定)。本文只展示 feature-specific 的 RPC `d` block 示例；Hello / Identify / Identified、`sid`、`op` 和 JSON-RPC 禁用规则不在每篇草案中重复。

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

#### 3.1.2 Request d block Example (op=7)

```json
{
  "id": 101,
  "method": "<domain.feature>.get",
  "params": {
    "<field>": "<value>"
  }
}
```

读法：<用 1-3 句话解释调用方如何理解这个请求，特别说明默认值、target、scope 或省略字段语义。>

#### 3.1.3 返回结果 Result：`XxxState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

#### 3.1.4 Success Response d block Example (op=8)

```json
{
  "id": 101,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "<field>": "<value>"
  }
}
```

读法：<解释 result 是完整状态、配置快照、变化片段，还是 accepted 状态。>

#### 3.1.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| 无 | query method 不应因查询触发状态变化事件。 | none | 无需处理。 |

#### 3.1.6 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持该 feature、method 或 target。 | 返回 unsupported feature/method/target。 |
| `INVALID_ARGUMENT` | 请求字段非法。 | 返回具体字段路径和合法范围。 |

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
      "field": "<field>",
      "reason": "<reason>"
    }
  }
}
```

读法：失败响应仍然使用 `op=8`，`d.id` 必须匹配原 Request。`status.ok=false` 或非零 `code` 时不得携带业务 `result`。

#### 3.1.8 规则

- Request MUST 使用 `op=7`。
- Success Response MUST 使用 `op=8`，并回显 Request 的 `d.id`。
- query method SHOULD NOT 因查询本身触发状态变化事件。
- <补充本 method 的协议约束。>

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

#### 3.2.2 Request d block Example (op=7)

```json
{
  "id": 102,
  "method": "<domain.feature>.set",
  "params": {
    "<field>": "<value>"
  }
}
```

读法：<说明这是完整替换、局部 patch、目标状态设置，还是异步动作请求。>

#### 3.2.3 返回结果 Result：`XxxState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

#### 3.2.4 Success Response d block Example (op=8)

```json
{
  "id": 102,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "<field>": "<value>"
  }
}
```

读法：<解释 result 是设置后的完整状态、accepted 状态，还是最终状态。>

#### 3.2.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `<domain.feature>.changed` | 状态实际发生变化。 | `XxxChangedEvent` | 可直接更新 UI；需要完整状态时调用 get 校准。 |

如果该方法成功后 SHOULD / MUST 触发事件，请在本节直接给出事件 `d` block 示例：

```json
{
  "event": "<domain.feature>.changed",
  "intent": 1,
  "data": {
    "<field>": "<value>"
  }
}
```

读法：<解释事件 payload 是完整状态还是变化片段，以及客户端是否需要再调用 get。>

#### 3.2.6 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `OUT_OF_RANGE` | 字段超出 capability 声明范围。 | 返回合法范围。 |
| `BUSY` | 设备正在处理冲突操作。 | 稍后重试。 |

#### 3.2.7 Error Response d block Example (op=8)

```json
{
  "id": 102,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Invalid argument.",
    "details": {
      "candidateError": "OUT_OF_RANGE",
      "field": "<field>",
      "min": 0,
      "max": 100
    }
  }
}
```

读法：<解释错误为什么发生、请求是否部分生效、是否会触发事件。>

#### 3.2.8 规则

- Request MUST 使用 `op=7`。
- Success / Error Response MUST 使用 `op=8`，并回显 Request 的 `d.id`。
- 失败响应 MUST NOT 携带业务 `result`。
- 状态未实际变化时，method MAY 成功返回且 MAY 不触发 changed event。

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `<domain.feature>.changed` | <触发条件> | `XxxChangedEvent` | <直接更新 UI / 调用 get 校准 / 可忽略等> | draft / review-ok |

### 4.1 `<domain.feature>.changed`

**触发条件**：

- RPC 设置导致状态或配置实际变化。
- 本地按键、设备策略、profile、restore、factory reset 或自动算法导致状态变化。
- 设备上报来自外部系统的同步变化。

#### 4.1.1 Payload：`XxxChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |
| `source` | string enum | no | `remoteApp`, `localPanel`, `hardwareKey`, `autoAlgorithm`, `devicePolicy`, `preset`, `cloud`, `unknown` | `unknown` | 状态变化来源。 |
| `reason` | string enum | no | feature-specific | `unknown` | 状态变化原因。 |
| `stateRevision` | uint32 | no | monotonic counter | omitted | 状态版本，用于多端同步和去重。 |

#### 4.1.2 Event d block Example (op=6)

```json
{
  "event": "<domain.feature>.changed",
  "intent": 1,
  "data": {
    "<field>": "<value>",
    "source": "remoteApp",
    "reason": "user_request",
    "stateRevision": 1025
  }
}
```

读法：<解释该事件 payload 是完整状态还是变化片段，以及客户端如何更新 UI 或缓存。>

#### 4.1.3 客户端处理建议

| 场景 | 建议 |
|---|---|
| payload 是完整状态 | 可直接更新 UI 或本地缓存。 |
| payload 是变化片段 | 调用对应 get method 校准完整状态。 |
| event 丢失或重连 | 重连后主动调用 get method 校准。 |
| 多端同时控制 | 使用 `stateRevision` 或后续 get 结果解决冲突。 |

#### 4.1.4 规则

- Event MUST 使用 `op=6`。
- Event MUST NOT 携带 `d.id`。
- Event payload MUST 放在 `d.data` 中。
- 如果事件表示状态变化，SHOULD 包含 `source`、`reason` 或 `stateRevision`。
- 如果 event payload 是部分变化，文档必须明确客户端是否需要调用 get method 校准。

## 5. Capability

Capability name: `<domain.feature>`。

设备通过 capability 声明是否支持该 feature，以及支持哪些范围、模式、对象或约束。Capability 字段只描述“设备能做什么”，不得混入 method params/result 或 event payload。

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `<domain.feature>` | none | capability 名称。 |
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

## 6. 字段 / Schemas

### 6.1 Schema 层级速览

用一小段话和简单结构说明本 feature 有哪些核心数据对象，以及它们分别用于 method params、method result、event payload 还是 capability。

Schema 展开模式必须二选一：

- 简单 feature：method/event 章节已经直接展开 Params / Result / Payload 字段表，本章只保留 schema 索引，避免重复。
- 复杂 feature：method/event 章节必须给出关键字段和 JSON `d` block 示例；本章集中展开复杂对象；method/event 小节必须明确引用第 6.x 节，不能让读者自己猜。

Schema 展开规则见 [Protocol Draft Conventions](../draft-conventions.md#schema-展开约定)。禁止出现 method 小节只有 schema 名称，而字段表和示例都被丢到后文的写法。

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

## 7. 交互流程示例 Flow Examples

Flow examples 的定位见 [Protocol Draft Conventions](../draft-conventions.md#flow-example-约定)。本章只展示多个 method/event 组成的端到端业务流程，不再承担单个 method/event 的 API 契约示例。

每个 flow example 应展示：

- 调用顺序；
- 每一步使用哪个 method/event；
- 关键 `d` block；
- 客户端如何更新状态；
- 出错时是否会触发事件。

### 7.1 场景：<客户端要完成什么>

#### Step 1. <method request>：Request d block (op=7)

```json
{
  "id": 101,
  "method": "<domain.feature>.get",
  "params": {}
}
```

#### Step 2. <method response>：Success Response d block (op=8)

```json
{
  "id": 101,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {}
}
```

#### Step 3. <event if any>：Event d block (op=6)

```json
{
  "event": "<domain.feature>.changed",
  "intent": 1,
  "data": {}
}
```

读法：<说明这个流程中的状态变化、客户端缓存更新、事件订阅和异常处理。>

## 8. 错误

错误响应和 numeric code 占位规则见 [Protocol Draft Conventions](../draft-conventions.md#错误约定) 与 `docs/specs/2-registry/04-Errors-Registry.md`；本节只列 feature-specific 候选错误。

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

## 示例片段：audio.volume 的 method / event `d` block 层级

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

#### 3.2.2 Request d block Example (op=7)

```json
{
  "id": 101,
  "method": "audio.volume.set",
  "params": {
    "target": "master",
    "level": 42,
    "muted": false
  }
}
```

#### 3.2.3 返回结果 Result：`AudioVolumeState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string | yes | capability-declared target | none | 状态对象。 |
| `level` | integer | yes | `0..100` | none | 设置后的当前音量。 |
| `muted` | boolean | yes | `true`, `false` | none | 设置后的静音状态。 |

#### 3.2.4 Success Response d block Example (op=8)

```json
{
  "id": 101,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "target": "master",
    "level": 42,
    "muted": false
  }
}
```

#### 3.2.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `audio.volume.changed` | 音量或静音实际变化。 | `AudioVolumeChangedEvent` | 可直接更新 UI；需要完整状态时调用 `audio.volume.get` 校准。 |

```json
{
  "event": "audio.volume.changed",
  "intent": 1,
  "data": {
    "changedFields": [
      "level"
    ],
    "state": {
      "target": "master",
      "level": 42,
      "muted": false
    },
    "reason": "user_request"
  }
}
```

#### 3.2.6 Error Response d block Example (op=8)

```json
{
  "id": 101,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Invalid argument.",
    "details": {
      "candidateError": "OUT_OF_RANGE",
      "field": "level",
      "min": 0,
      "max": 100
    }
  }
}
```

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `audio.volume.changed` | 音量或静音变化 | `AudioVolumeChangedEvent` | 更新 UI 或调用 `audio.volume.get` 校准 | draft |

### 4.1 `audio.volume.changed`

#### Payload：`AudioVolumeChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `changedFields` | string[] | no | field path array | omitted | 变化字段。 |
| `state` | `AudioVolumeState` | yes | see schema | none | 变化后的音量状态。 |
| `reason` | string enum | no | `user_request`, `physical_control`, `device_policy`, `unknown` | `unknown` | 变化原因。 |

#### Event d block Example (op=6)

```json
{
  "event": "audio.volume.changed",
  "intent": 1,
  "data": {
    "changedFields": [
      "muted"
    ],
    "state": {
      "target": "master",
      "level": 42,
      "muted": true
    },
    "reason": "physical_control"
  }
}
```
```

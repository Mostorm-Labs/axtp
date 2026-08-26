# 协议 Proposal 模板

创建或重写 `workspace/protocol/<domain>/<domain.feature>.md` 时，使用这份模板。

这类文件是 **proposal / review artifact**，用于记录为什么提出某项协议设计、候选接口形状、兼容性判断、legacy 证据、评审结论和后续 amendment。它在任何 lifecycle 下都不是 runtime / SDK / firmware implementation contract。

正式实现事实只能来自 canonical / derived / verification authority：`contract/registry/**`、`contract/protocol/axtp.protocol.yaml`、`contract/generated/**`、适用的 `specs/**`、`conformance/**` 和明确的 spec release identity。

公共 RPC envelope、错误、schema 展开、flow example 和 authority metadata 规则见 `workspace/protocol/draft-conventions.md`。

````markdown
---
authorityClass: proposal
lifecycle: captured
protocolStability: draft
domain: <domain>
feature: <domain.feature>
adoptedBy:
lastReviewed: YYYY-MM-DD
---

# <domain.feature>

> 本文是 AXTP protocol proposal，不是实现合同。runtime / SDK / firmware 不得从本文 prose、示例或候选 ID 推导正式协议事实。

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | <一句话说明> |
| Proposal lifecycle | captured / reviewing / accepted / superseded / archived |
| Protocol stability | draft / experimental / stable / deprecated / reserved |
| Canonical adoption | none；accepted 后填写 frontmatter `adoptedBy` 指向 primary canonical registry owner |
| 是否可直接实现 | 否。实现必须读取 canonical / generated / conformance authority。 |
| 主要交互 | RPC / RPC + EVENT / RPC + STREAM |
| 是否使用 STREAM | 是 / 否 |
| Registry readiness | none / partial / candidate / ready |
| Conformance | none / needed / ready |
| 主要未决问题 | <一句话列出；若无则写“暂无”> |

## 1. 功能说明

用 3-5 句话说明这个 feature 解决什么问题、面向哪些调用方、适用于哪些设备或场景。公共 envelope、错误、schema 展开和 flow 写法遵循 [Protocol Draft Conventions](../draft-conventions.md)。

如果该 proposal 已 accepted，应在本节或 adoption note 中说明：

- primary canonical owner：`<adoptedBy>`；
- 其他相关 canonical source（如 error/profile/shared schema）可在正文列出，但不要把 `adoptedBy` 写成 YAML list；
- 正式 methodId / eventId / fieldId / errorCode / schema 以 canonical/generated authority 为准。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | <能力 1> |
| 包含 | <能力 2> |
| 不包含 | <不属于本文的能力；说明应归属哪个 feature> |
| 数据面 | 本 feature 是否定义或绑定 STREAM；如果没有，写“所有操作均通过 RPC method/event 完成”。 |

## 3. 方法 Methods

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 协议稳定度 |
|---|---|---|---|---|---|---|
| `<domain.feature>.get` | query | 查询当前状态或配置 | `GetXxxParams` | `XxxState` | 否 | draft / experimental / stable |
| `<domain.feature>.set` | command | 设置目标状态或配置 | `SetXxxParams` | `XxxState` | 是，`<domain.feature>.changed` | draft / experimental / stable |

### 3.1 `<domain.feature>.<method>`

**用途**：<说明 method 做什么。>

| 项 | 内容 |
|---|---|
| 调用类型 | query / command / action |
| Params Schema | `<ParamsSchema>` |
| Result Schema | `<ResultSchema>` |
| 是否触发事件 | 否 / 是，说明事件名和触发条件 |
| 幂等性 / 异步性 | <同步/异步、是否幂等、是否 accepted 后由事件收敛> |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `BUSY` |

#### 3.1.1 请求参数 Params：`<ParamsSchema>`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

#### 3.1.2 返回结果 Result：`<ResultSchema>`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

#### 3.1.3 d block 示例

request:

```json
{
  "id": 101,
  "method": "<domain.feature>.<method>",
  "params": {
    "<field>": "<value>"
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
    "<field>": "<value>"
  }
}
```

示例只帮助评审 payload 形状，不是独立 wire truth。正式 ID、field 编号、错误码和 schema 以 canonical/generated authority 为准。

#### 3.1.4 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `<domain.feature>.changed` | <状态实际变化时> | `<ChangedEvent>` | <直接更新 UI / 调用 get 校准 / 可忽略> |

#### 3.1.5 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持 feature、method、target 或 scope。 | 返回 unsupported detail。 |
| `INVALID_ARGUMENT` | 请求字段非法。 | 返回字段路径和合法范围。 |
| `BUSY` | 设备正在处理冲突操作。 | 稍后重试或等待状态事件。 |

#### 3.1.6 规则

- <补充本 method 的 feature-specific 协议约束。>
- query method SHOULD NOT 因查询本身触发状态变化事件。
- command/action 成功后是否触发事件，必须在本 method 中明确。

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 协议稳定度 |
|---|---|---|---|---|
| `<domain.feature>.changed` | <触发条件> | `<ChangedEvent>` | <直接更新 UI / 调用 get 校准 / 可忽略> | draft / experimental / stable |

### 4.1 `<domain.feature>.changed`

**触发条件**：

- <RPC 设置导致状态或配置实际变化。>
- <本地按键、设备策略、profile、restore、factory reset 或自动算法导致状态变化。>

#### 4.1.1 Payload：`<ChangedEvent>`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |
| `source` | string enum | no | feature-specific | `unknown` | 状态变化来源。 |
| `reason` | string enum | no | feature-specific | `unknown` | 状态变化原因。 |

#### 4.1.2 d block 示例

```json
{
  "event": "<domain.feature>.changed",
  "intent": 1,
  "data": {
    "<field>": "<value>",
    "source": "remoteApp",
    "reason": "user_request"
  }
}
```

#### 4.1.3 客户端处理建议

| 场景 | 建议 |
|---|---|
| payload 是完整状态 | 可直接更新 UI 或本地缓存。 |
| payload 是变化片段 | 调用对应 get method 校准完整状态。 |
| event 丢失或重连 | 重连后主动调用 get method 校准。 |

#### 4.1.4 规则

- Event payload MUST 放在 `d.data` 中。
- Event MUST NOT 携带 request `id`。
- 如果 event payload 是部分变化，文档必须明确客户端是否需要调用 get method 校准。

## 5. Capability

Capability name: `<domain.feature>`。

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `<domain.feature>` | none | capability 名称。 |
| `<field>` | `<type>` | yes/no | <range or enum> | <default or omitted> | <说明> |

## 6. 字段 / Schemas

### 6.1 Schema 层级速览

说明本 feature 有哪些核心数据对象，以及它们分别用于 method params、method result、event payload 还是 capability。

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

只在存在真实端到端顺序时保留本章，例如 capability discovery -> set method -> changed event、action accepted -> progress event、failure request -> no event、STREAM open -> STREAM data -> close、reconnect -> get state calibration。

## 8. 错误

通用错误读法见 `workspace/protocol/draft-conventions.md`。本章只保留会影响 feature 语义的候选错误、特殊触发条件、状态后果或 legacy 兼容说明。

| 错误 | 适用场景 | 说明 |
|---|---|---|
| `<NamedCandidateError>` | 候选业务错误。 | 只有存在真实业务语义时保留；采纳前确认是否需要 feature-specific ErrorCode。 |

## 9. Legacy 映射

Legacy 映射是迁移证据，不是 runtime contract。如果没有 legacy 映射，写“暂无”。

| legacy 项 | 候选映射 | 状态 | 说明 |
|---|---|---|---|
| `<legacy command / field>` | `<domain.method>` / `<event>` / adapter-only | `[REVIEW-ASK]` / `[REVIEW-OK]` / `[REVIEW-DRAFT]` | <说明> |

## 10. 测试重点与采纳风险

| 类型 | 要点 |
|---|---|
| registry readiness | <none / partial / candidate / ready，以及具体阻塞项> |
| conformance focus | <需要覆盖的 feature-specific 行为> |
| happy path | <正常查询/设置/动作> |
| event path | <事件触发和客户端处理> |
| boundary case | <边界值、默认值、省略字段、非法枚举> |
| error case | <权限、busy、unsupported、invalid argument> |
| compatibility | <旧字段/旧命令迁移、可选字段兼容> |

## 11. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| <问题> | schema / registry / conformance / legacy / product behavior | <当前建议> | open / decided / blocked |

## 可选附录：复杂 / 高风险 feature 增强

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

## Authority metadata transitions

新建 proposal：

```yaml
authorityClass: proposal
lifecycle: captured
protocolStability: draft
adoptedBy:
```

进入人工评审时可改为：

```yaml
lifecycle: reviewing
```

Stage 30 采纳成功后：

```yaml
authorityClass: proposal
lifecycle: accepted
protocolStability: <canonical fact stability>
adoptedBy: contract/registry/<primary canonical owner>.yaml
```

`adoptedBy` 是**单个 scalar primary canonical owner**。若采纳同时修改 error/profile/shared schema 等其他 canonical 文件，在正文 adoption note 中列出，不把 frontmatter 扩展成列表。

严禁在 v2 proposal frontmatter 中重新引入：

```yaml
status:
contract:
generated:
registry:
```

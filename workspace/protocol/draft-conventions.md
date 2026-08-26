# Protocol Proposal Conventions

本页集中维护 `workspace/protocol/**` proposal 的公共写法。这里的所有文件都是 proposal / review context，**无论 lifecycle 是 reviewing 还是 accepted，都不是 runtime implementation contract**。

正式实现必须从 `contract/registry/**`、`contract/protocol/axtp.protocol.yaml`、`contract/generated/**`、适用的 `specs/**`、`conformance/**` 以及明确的 spec release identity 读取。

## Authority metadata

新建或迁移后的 proposal 使用：

```yaml
---
authorityClass: proposal
lifecycle: captured | reviewing | accepted | superseded | archived
protocolStability: draft | experimental | stable | deprecated | reserved
domain: <domain>
feature: <domain.feature>
adoptedBy: <canonical source path when accepted>
lastReviewed: YYYY-MM-DD
---
```

`lifecycle` 与 `protocolStability` 不能互相替代。`accepted` 仅表示 proposal 已被 canonical authority 采纳；runtime 仍不得从本文实现。

对于已采纳 proposal，正文前部必须明确指出 canonical adoption target，并把“是否可直接实现”表达为否：实现读取 canonical / generated authority，本文只保留 rationale、review context 和 amendment input。

## JSON 示例约定

proposal 中的 JSON 示例用于让评审者看懂 feature-specific payload 形状，不是独立 wire truth。正式 methodId、eventId、fieldId、errorCode、schema 和 envelope 语义以 canonical/generated authority 为准。

示例默认 RPC Session 已进入 `APP_READY`，`sid` 已建立。公共 RPC envelope 为：

```json
{ "sid": "12345678", "op": 7, "d": {} }
```

业务 proposal SHOULD 优先展示 feature-specific `d` block：

| op | 名称 | 用途 |
|---:|---|---|
| `6` | Event | 设备向客户端推送事件。 |
| `7` | Request | 客户端调用业务 method。 |
| `8` | RequestResponse | 设备返回 method 结果或错误。 |

不得把 JSON-RPC 2.0 外层格式当成 AXTP wire contract。proposal 中出现的示例值、候选字段或候选错误不能绕过 adoption 直接成为正式协议事实。

## Method / Event 示例

单个 method 推荐使用一个 `d block 示例` 小节，内部展示 request / success；只有 feature-specific 错误结构、状态机后果或 legacy 语义值得表达时才保留 error example。

Method/Event proposal 应重点说明：

- feature-specific params/result/payload；
- 触发状态与事件；
- 幂等性、异步性和 lifecycle；
- feature-specific failure semantics；
- compatibility / migration impact；
- canonical schema link（accepted 后）。

不要在每篇 proposal 重复公共 requestId、sid、error envelope、unknown method/event 等 Core 规则。

## Schema 展开

简单 feature 可在 method/event 下直接展开关键字段；复杂 feature 可集中到 schema 章节，但 method/event 必须能明确找到对应 schema。

Capability 只表达“端点能做什么及其限制”，不能替代 method params/result 或 event payload。

proposal 可以讨论候选 schema；一旦 accepted，正式字段集合和 numeric IDs 只能由 canonical registry/generated authority 决定。

## Capability discovery

proposal 不重复维护第二套 `supportedMethods` / `supportedEvents` 真值。已采纳后的 support binding 以 generated capability facts、profile declarations 和 runtime capability discovery 为准。

feature-specific proposal 只需要表达：

- capability 边界；
- supported targets / modes；
- range / enum / limits；
- lifecycle / availability conditions；
- 需要的 conformance behavior。

## Flow examples

Flow example 只在它能表达真实业务顺序、跨 method 依赖、状态机分支、异常恢复或事件订阅策略时保留。不要为每个 feature 复制“query -> set -> event”模板。

端到端产品场景的主证据应放在 `workspace/flows/**`；protocol proposal 只保留与该 feature 决策直接相关的 protocol slice。

## Errors

proposal 不随意分配正式 numeric errorCode。优先讨论：

- 能否复用 common error；
- 是否真的需要 feature-specific error；
- 错误发生后 operation/session/stream 的状态；
- 是否可重试；
- 对 compatibility 的影响。

正式 numeric code 和稳定 error name 由 canonical registry adoption 决定。

## Testing / verification

proposal 只记录 feature-specific verification requirements，不复制通用测试矩阵。

至少考虑：

| 类型 | 关注点 |
|---|---|
| happy path | 主要 query/command/action 正常闭环。 |
| state/event | 成功变更后的可观察状态与事件。 |
| boundary | optional field、非法 target、enum/range、空/最大集合。 |
| failure | unsupported、permission、busy、invalid state/argument 等。 |
| compatibility | 新旧 endpoint、unknown optional facts、capability/profile degradation。 |
| recovery | retry、rollback、reconnect、session/stream cleanup。 |

进入 canonical authority 后，verification truth 由 `conformance/**` 和适用的 generated vectors/fixtures 承担，而不是 proposal prose。

## Review questions

`待确认问题` 只保留真正会改变 feature 设计或 adoption 的问题，例如：

- 字段范围/单位；
- state machine；
- legacy payload evidence；
- permission/security boundary；
- profile binding；
- conformance gap；
- compatibility classification。

不要保留“采纳前还需确认哪些 schema、事件和测试？”这类模板问题。

## Accepted proposal rule

Proposal accepted 后：

1. 保留 why / rationale / historical review；
2. metadata 改为 `lifecycle: accepted`；
3. `protocolStability` 独立记录对应 canonical fact 的成熟度；
4. `adoptedBy` 指向 canonical source；
5. 删除任何把 proposal 自己描述成“可直接实现合同”的措辞；
6. 后续语义修订必须同步修改 canonical authority，并重新生成/验证；
7. proposal 不重新成为第二份 source of truth。

## Supersession

当 proposal 被替代：

- 使用 `lifecycle: superseded`；
- 在正文顶部链接 successor；
- 写清 supersession 原因；
- 不删除历史 rationale；
- canonical/current authority 只指向当前采用的设计。

这个规则与 protocol fact 的 `deprecated` 不同：proposal 被 superseded 是文档生命周期；protocol fact deprecated 是协议兼容性状态。

# Protocol Draft Conventions

本页集中维护 `workspace/protocol/**` 草案的公共写法。业务草案只保留 feature-specific 的方法、事件、字段、错误候选、legacy 映射和待确认问题，不在每篇草案里重复通用合同边界和 JSON envelope 说明。

## 合同边界

`workspace/protocol/<domain>/<domain.feature>.md` 是协议草案和评审输入，不是新的机器事实源。draft / review-ok 阶段不得作为 runtime 实现合同。

正式实现必须以 `contract/registry/**/*.yaml`、`contract/registry/domains/**/*.yaml`、`contract/protocol/axtp.protocol.yaml`、`contract/generated/**` 和 `conformance/**` 为准。草案状态以 frontmatter、速读结论和 [Product Domain Status](../../docs/product/domain-status.md) 共同判断。

## JSON 示例约定

草案中的 JSON 示例默认 RPC Session 已进入 `APP_READY`，`sid` 已由 Server 分配。Hello、Identify、Identified 属于 [RPC Session Spec](../../specs/1-core/06-RPC-Session.md)，不在每篇业务 feature 草案中重复。

示例使用 AXTP RPC JSON envelope：

```json
{ "sid": "12345678", "op": 7, "d": {} }
```

除本页 envelope 速查外，业务草案 SHOULD 只展示 RPC `d` 数据块，并在标题中标明对应 `op`：

| op | 名称 | 用途 |
|---:|---|---|
| `6` | Event | 设备向客户端推送事件。 |
| `7` | Request | 客户端调用业务 method。 |
| `8` | RequestResponse | 设备返回业务 method 结果或错误。 |

`sid="12345678"`、`id=101`、`intent=1` 均为示例值。正式 methodId、eventId、fieldId、errorCode、intent bit 由 registry 采纳后分配。

业务草案不得使用 JSON-RPC 2.0 外层格式作为 AXTP wire 示例；不要在 AXTP 示例中写 `jsonrpc`、JSON-RPC 外层 `id/method/params`，或把 JSON-RPC envelope 当作 AXTP envelope。

## 错误约定

错误处理和 numeric code 规则以 [Errors Registry](../../specs/2-registry/04-Errors-Registry.md) 为准。草案不得随意分配正式 numeric errorCode。

如果 registry 尚未采纳 feature-specific error，JSON 示例可以使用最近的通用错误码作为占位，并在 `status.details.candidateError` 中放候选错误名。采纳时必须由 registry 分配正式 numeric code。

失败响应仍使用 `op=8`，必须回显请求 `d.id`，`status.ok=false` 或非零 `status.code` 时不得携带业务 `result`。

## Schema 展开约定

简单 feature：method/event 小节直接展开 Params / Result / Payload 字段表，本章只保留 schema 索引。

复杂 feature：method/event 小节给出关键字段和 JSON `d` block 示例，第 6 章集中展开复杂对象；method/event 小节必须明确引用 schema 小节，不能只给 schema 名称让读者自己找。

Capability 字段只描述“设备能做什么”，不得混入 method params/result 或 event payload。

## Flow Example 约定

`交互流程示例` 只展示多个 method/event 组成的端到端业务流程。单个 method 的 Request / Success Response / Error Response 示例写在对应 method 小节；单个 event 的 Event 示例写在对应 event 小节。

Flow example 应说明调用顺序、关键 `d` block、客户端状态更新、事件订阅和异常处理，不承担完整协议合同定义。


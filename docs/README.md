# AXTP 文档阅读路线

`docs/` 是 AXTP 仓库的前台阅读入口。默认从角色指南进入，不要从 `workspace/`、历史计划或 agent workflow 开始理解 runtime contract。

## 角色入口

| 角色 | 入口 |
|---|---|
| 产品 / 架构 | [guides/product.md](guides/product.md) |
| Runtime / SDK / Firmware | [guides/runtime.md](guides/runtime.md) |
| 测试 / Conformance | [guides/testing.md](guides/testing.md) |
| 协议维护 | [guides/protocol-maintainer.md](guides/protocol-maintainer.md) |
| Release owner | [../release/README.md](../release/README.md) |
| Repository governance | repository-only: `docs/governance/README.md`（不进入 Spec release artifact；该入口列出 Current Governance Authority、scope amendment 和 final closure） |

## Runtime implementation authority

Runtime/SDK/Firmware 默认只从以下 frontstage authority surfaces 获取正式协议事实：

| Authority | 位置 | 用途 |
|---|---|---|
| Release identity | `spec/vMAJOR.MINOR.PATCH`、exact commit 或 release artifact | 可重现绑定基线。 |
| Canonical registry | `../contract/registry/**` | 手写机器事实源。 |
| Protocol IR | `../contract/protocol/axtp.protocol.yaml` | 聚合机器模型；generated/read-only。 |
| Generated reference | `../contract/generated/**`、`../contract/mcp/**` | runtime/SDK/tool 消费视图。 |
| Formal specs | [../specs/](../specs/README.md) | wire/session/registry/codec/tooling normative context。 |
| Verification | [../conformance/](../conformance/README.md) | executable behavior acceptance。 |
| Release binding | [../release/](../release/README.md) | tag/artifact/spec-lock 和 downstream update contract。 |

如果这些 surface 之间出现冲突，按 [Contract and Source-of-Truth Rules](../specs/10-contract.md) 和 repository governance 处理；不要从 backstage proposal 猜测一个新的 runtime 事实。

## Backstage / non-contract material

以下路径不属于 runtime implementation authority，**不存在“accepted 以后自动变成 contract”的例外**：

| 路径 | 用途 |
|---|---|
| `../workspace/business/**` | business intent / requirement evidence |
| `../workspace/flows/**` | scenario / interaction planning |
| `../workspace/protocol/**` | protocol proposal / rationale / amendment context |
| `../workspace/legacy-*/**` | legacy migration evidence |
| `../workspace/registry-planning/**` | historical/candidate registry planning |
| `../workspace/runtime/**` | maintainer deep reference / implementation investigation |
| `archive/**` | historical audit / superseded material |
| `superpowers/**` | design/implementation plans and workflow artifacts |
| `../tooling/skills/**` | agent lifecycle workflow instructions |

这些材料可以帮助回答“为什么如此设计”“历史系统怎么迁移”“下一步如何 author protocol”，但不能覆盖 canonical/generated authority。

## Proposal 与 accepted authority 的关系

```text
workspace proposal
   ↓ review / adoption
canonical registry + specs
   ↓ deterministic generation
Protocol IR / generated reference
   ↓ verification
conformance
   ↓ release
immutable spec identity
```

`workspace/protocol/**` 中 `lifecycle: accepted` 只表示 proposal 已被右侧 canonical authority 采纳；runtime 实现仍读取 canonical/generated surface。

## Generated files

从维护角度，以下路径是只读派生产物：

| 生成路径 | 上游 |
|---|---|
| `../contract/protocol/axtp.protocol.yaml` | canonical registry/spec sources |
| `../contract/generated/**` | Protocol IR / registry generator |
| `../contract/mcp/**` | generator |
| `../contract/test-vectors/**` | generator / vector derivation tooling |

生成内容错误时修上游 source 或 generator，再重新生成；不得直接手改生成物制造协议事实。

## AI / agent 默认检索规则

实现型任务应先读取 release identity + canonical/generated authority + conformance，再按需要读取 formal specs。只有需求追踪、协议设计、legacy migration、审计或 supersession 任务才主动展开 backstage material。

这条规则用于降低 retrieval pollution：更多文档并不等于更多 authority，默认检索集合必须小而确定。

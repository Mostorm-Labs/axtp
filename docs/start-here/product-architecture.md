# 产品 / 架构负责人入口

产品 / 架构负责人主要关注：AXTP 现在覆盖哪些能力、哪些仍是缺口、能力边界怎么划分、优先级如何推进。

你不需要从 wire format 或 YAML 开始。先看 domain 状态、分类边界、业务输入和 flows；roadmap 只作为规划材料。

## 先理解什么

| 材料 | 作用 |
|---|---|
| Product Domain Status | 说明哪些 domain 已 generated，哪些仍是草案。 |
| Domain/feature 分类规则 | 帮助判断一个需求应该归 `device`、`system`、`audio`、`video`、`room` 还是其他 domain。 |
| Business input | 放 PRD、需求背景、用户目标和开放问题。 |
| Flows | 把端到端场景拆成消息和协议缺口。 |
| Roadmap | 说明阶段目标和规划优先级；不作为 runtime 合同。 |

Roadmap 和 draft 都不等于 runtime 合同。它们用于规划和评审，不能直接要求 runtime 实现。

## 推荐阅读顺序

| 顺序 | 文档 | 读它的目的 |
|---:|---|---|
| 1 | [../product/domain-status.md](../product/domain-status.md) | 查看 domain 生成状态和下一步动作。 |
| 2 | [../../ROADMAP.md](../../ROADMAP.md) | 了解阶段规划和优先级。 |
| 3 | [../architecture/domain-feature-classification.md](../architecture/domain-feature-classification.md) | 判断需求归属和能力边界。 |
| 4 | [../business/README.md](../business/README.md) | 查看或补充业务需求输入。 |
| 5 | [../flows/README.md](../flows/README.md) | 查看场景流程和协议覆盖。 |

## 不要从哪里开始

| 不建议入口 | 原因 |
|---|---|
| `protocol/axtp.protocol.yaml` | 这是机器 IR，不适合作为产品/架构第一入口。 |
| `docs/generated/protocol.json` | 适合工具读取，不适合判断业务优先级。 |
| `docs/protocol/**` 的单个草案 | 草案很多，容易只看到局部，不知道 domain 整体状态。 |
| runtime 仓库实现代码 | runtime 只能反映某个实现，不代表协议规划全貌。 |

## 评审时重点看什么

| 问题 | 建议检查点 |
|---|---|
| 这个需求属于哪个 domain？ | 先按 [domain-feature-classification](../architecture/domain-feature-classification.md) 判断逻辑空间、物理设备、系统运行态还是功能能力。 |
| 是否已有 generated 能力？ | 看 [generated 协议参考](../generated/protocol.md) 和 [Product Domain Status](../product/domain-status.md)。 |
| 是否需要新 flow？ | 跨多个角色、多条消息或有异常路径时，优先写 `docs/flows/**`。 |
| 是否需要新草案？ | generated 不覆盖，且 flow 识别出协议缺口时，进入 `docs/protocol/**`。 |
| 是否影响 runtime release？ | 只有 generated + conformance 后，runtime 才能正式跟进。 |

## 常见误区

| 误区 | 正确认知 |
|---|---|
| Roadmap 写了就能排 runtime 实现。 | Roadmap 是规划，runtime 只依赖 released/generated 合同。 |
| 老协议叫 System，所以新协议也必须放 `system`。 | 新 domain 按语义归属，不按旧 namespace。 |
| 所有设备信息都放 `device`。 | `device` 管“这是谁”，`system` 管“怎么运行”，功能能力放 `audio` / `video` / `display` 等。 |
| flow 文档越多越接近正式协议。 | flow 只是评审输入，仍需要草案、采纳、generated 和 conformance。 |

## 下一步动作

如果要新增业务能力，先补 [business](../business/README.md) 或请求生成对应 flow。

如果已经有端到端场景，进入 [flows](../flows/README.md)。

如果要推动采纳，和协议维护者确认草案 review 状态、registry 采纳计划和 conformance 影响。

## 输出物建议

产品 / 架构侧输出最好落到以下材料之一：

| 输出物 | 什么时候写 |
|---|---|
| Business input | 需求还在表达目标、约束、用户场景和开放问题。 |
| Flow | 已经能描述多个角色之间的端到端交互。 |
| Protocol draft feedback | 草案已有，但 domain、字段、状态、事件或 legacy 语义需要确认。 |
| Roadmap update | 影响阶段优先级、批次顺序或 release 计划。 |

## 评审完成定义

一次产品/架构评审完成时，建议留下：

| 项 | 说明 |
|---|---|
| 业务目标 | 这个能力解决什么用户或系统问题。 |
| Domain 边界 | 为什么属于这个 domain/feature，而不是相邻 domain。 |
| 交互路径 | 是否需要 flow，是否涉及事件、重试、断线或计划任务。 |
| 采纳优先级 | 属于 P0/P1/P2 还是 deferred。 |
| 未决问题 | 需要设备、legacy、测试或 runtime 确认的事项。 |

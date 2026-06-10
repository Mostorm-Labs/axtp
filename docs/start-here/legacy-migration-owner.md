# Legacy 迁移负责人入口

Legacy 迁移负责人负责把旧协议证据、分类结果和迁移计划追踪到 AXTP 的 domain / feature / method / event 候选。

核心规则：

```text
legacy mapping 在采纳前不是新协议正式合同。
```

旧协议可以解释“为什么需要某个能力”，但不能直接决定新协议命名和 runtime 行为。

## 先理解什么

| 材料 | 作用 |
|---|---|
| Evidence | 旧协议原文、PDF、Excel、扫描清单。 |
| Classification | 把旧命令按 AXTP domain / feature 做初步归类。 |
| Plans | 人工迁移计划、矩阵和 adapter 策略。 |
| Migration dashboard | 按来源追踪 classified、mapped、blocked 和 next step。 |
| Domain/feature 分类规则 | 判断旧 namespace 如何映射到新语义边界。 |

## 推荐阅读顺序

| 顺序 | 文档 | 读它的目的 |
|---:|---|---|
| 1 | [../legacy-migration/README.md](../legacy-migration/README.md) | 了解 legacy 工作区目录和非合同边界。 |
| 2 | [../legacy-migration/MIGRATION_DASHBOARD.md](../legacy-migration/MIGRATION_DASHBOARD.md) | 按 AXDP、Rooms、VM33、Signage、uxplay/cast 查看迁移总览。 |
| 3 | [../legacy-migration/classification/README.md](../legacy-migration/classification/README.md) | 了解分类输出和使用方式。 |
| 4 | [../legacy-migration/classification/by-source/axdp_hid.md](../legacy-migration/classification/by-source/axdp_hid.md) | 从 AXDP 来源看分类结构。 |
| 5 | [../legacy-migration/plans/README.md](../legacy-migration/plans/README.md) | 查看迁移计划入口。 |
| 6 | [../architecture/domain-feature-classification.md](../architecture/domain-feature-classification.md) | 按新协议语义判断 domain / feature。 |

## 不要从哪里开始

| 不建议入口 | 原因 |
|---|---|
| 直接改 `registry/**` | 旧命令必须先完成分类、草案评审和采纳。 |
| 只看旧命令名 | 旧 namespace 不一定对应新 AXTP domain。 |
| 只看 generated mapping | generated migration 产物是候选输出，仍需人工评审。 |
| runtime adapter 代码 | adapter 只能实现已确认映射，不能定义新协议事实。 |

## 迁移判断步骤

1. 找到旧协议 evidence，保留来源、命令、状态码、payload 和行为描述。
2. 查看 classification 是否已有 domain / feature 候选。
3. 用 [domain-feature-classification](../architecture/domain-feature-classification.md) 校准语义边界。
4. 判断目标能力是否已经 generated。
5. 如果已经 generated，补充或校准 legacyRefs 和 adapter 计划。
6. 如果还未 generated，进入 `docs/protocol/**` 草案或 `docs/flows/**` 场景流程。
7. 阻塞项写到 migration dashboard，不要假装已经映射完成。

## 常见误区

| 误区 | 正确认知 |
|---|---|
| 旧协议叫 `System.GetDevInfo`，新协议就必须放 `system`。 | 新协议按语义分类，设备身份通常归 `device.info`。 |
| 能映射到草案就等于 runtime 可用。 | 草案未采纳前只能作为迁移输入。 |
| adapter 可以自行发明字段。 | adapter 应消费 generated 合同，并记录无法表达的 legacy gap。 |
| 所有旧命令都要一比一迁移。 | 有些旧命令应合并、废弃、改为 vendor/private 或由业务端组合实现。 |

## 下一步动作

先更新 [Migration Dashboard](../legacy-migration/MIGRATION_DASHBOARD.md) 中对应来源的 next step。

如果缺少 evidence，补证据，不先起草协议。

如果 evidence 已明确但新协议缺口存在，和协议维护者一起进入 flow 或 protocol draft。

如果目标能力已 generated，推动 adapter 设计和 conformance 补充。

## Dashboard 更新规则

更新 migration dashboard 时，建议按以下粒度记录：

| 状态 | 什么时候使用 |
|---|---|
| `TBD` | 还没有可靠统计或映射结论。 |
| `blocked` | 缺少 evidence、字段语义、设备行为或产品决策。 |
| `mapped to draft` | 已能指向 `docs/protocol/**`，但未采纳。 |
| `mapped to generated` | 已能指向 generated 协议事实。 |
| `adapter needed` | 旧协议还需要兼容层、gateway 或数据转换。 |

## 迁移完成定义

一个 legacy 能力迁移完成时，至少应该有：

| 项 | 说明 |
|---|---|
| Evidence | 能追溯旧命令、字段、状态码或行为。 |
| AXTP target | 指向 generated method/event/schema 或明确 deferred。 |
| Adapter plan | 说明旧协议如何转换到 AXTP，或为什么不迁移。 |
| Test plan | 说明如何用 conformance、fixture 或 adapter 测试验证。 |

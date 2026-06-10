# 协议维护者入口

协议维护者负责把自然语言需求推进到可生成、可测试、可发布的协议事实。

生命周期是：

```text
business -> flows -> protocol draft -> registry -> generated -> conformance -> release
```

这条链路的重点是：草案可以讨论，registry 才能成为事实，generated 不能手写。

## 先理解什么

| 阶段 | 路径 | 作用 |
|---|---|---|
| Business input | `docs/business/**` | 需求、场景、用户目标和开放问题。 |
| Flow | `docs/flows/**` | 端到端交互、消息序列、协议覆盖和缺口。 |
| Protocol draft | `docs/protocol/**` | 候选 method、event、schema、error、capability 和 review。 |
| Registry | `registry/**`、`registry/domains/**` | 已采纳机器事实源。 |
| Generated | `protocol/axtp.protocol.yaml`、`docs/generated/**` | Generator 输出的实现合同。 |
| Conformance | `docs/conformance/**` | runtime 行为验收输入。 |
| Release | `docs/release/**` | spec tag、artifact、runtime lock 对齐。 |

## 推荐阅读顺序

| 顺序 | 文档 | 读它的目的 |
|---:|---|---|
| 1 | [../guides/how-to-use.md](../guides/how-to-use.md) | 了解自然语言请求如何进入 lifecycle workflow。 |
| 2 | [../architecture/protocol-lifecycle-boundaries.md](../architecture/protocol-lifecycle-boundaries.md) | 读取合同等级和冲突处理唯一权威说明。 |
| 3 | [../specs/README.md](../specs/README.md) | 找到 core、registry、codec、tooling 规范入口。 |
| 4 | [../protocol/README.md](../protocol/README.md) | 了解 draft intake、状态、frontmatter 和 review 标记。 |
| 5 | [../dev/skills/README.md](../dev/skills/README.md) | 选择 plan / draft / adopt / amend / generate / release skill。 |
| 6 | [../../generators/README.md](../../generators/README.md) | 理解 Generator 操作和输出边界。 |

## 不要从哪里开始

| 不建议动作 | 原因 |
|---|---|
| 直接改 `docs/generated/**` | generated 是输出，必须从 source 修正后生成。 |
| 直接把新业务写入 `registry/**` | 新 domain / feature / method / event 应先有 flow 或 protocol draft。 |
| 从 runtime 代码反推协议事实 | runtime 是消费方，不是主事实源。 |
| 忽略 `[REVIEW-ASK]` / `[REVIEW-FIX]` | 未确认事实不能被采纳。 |

## 标准动作

1. 判断输入是业务需求、场景流程、草案、采纳、修订、生成还是发布。
2. 需要端到端交互时，先形成 `docs/flows/<scenario>.md`。
3. 需要新增或修改业务能力时，形成 `docs/protocol/<domain>/<domain.feature>.md`。
4. 草案评审通过后，再反向确认 specs 和 registry YAML。
5. 从 YAML 运行 Generator，刷新 Protocol IR、generated reference、test vectors 或 snapshots。
6. 行为合同变化时，同步 conformance 或说明为何不需要。
7. release 时发布 spec tag，并让 runtime 仓库更新 spec lock。

## 常见误区

| 误区 | 正确认知 |
|---|---|
| 草案写得足够详细就等于合同。 | 只有采纳到 registry 并 generated 后才可实现。 |
| generated 错了就直接改 generated。 | 应修 specs、YAML 或 Generator，然后重新生成。 |
| 旧协议命令名决定新 domain。 | 新协议按语义分类，参考 [Domain And Feature Classification](../architecture/domain-feature-classification.md)。 |
| Roadmap milestone 是 spec 版本。 | runtime 绑定的是 `spec/vMAJOR.MINOR.PATCH` tag、commit 或 release artifact。 |

## 下一步动作

有新需求时，先读 [how-to-use](../guides/how-to-use.md) 判断生命周期阶段。

有 domain/feature 归属疑问时，先读 [domain-feature-classification](../architecture/domain-feature-classification.md)。

准备采纳草案时，先解决所有会阻塞采纳的 review 标记，再运行对应 skill 和校验。

## 采纳前检查清单

采纳一个 draft 前，至少确认：

| 检查项 | 说明 |
|---|---|
| 业务来源 | 能追溯到 business、flow、legacy evidence 或 review 结论。 |
| Domain/feature | 符合 naming 和分类规则。 |
| Review 标记 | 没有未解决的 `[REVIEW-ASK]`、`[REVIEW-FIX]`、`[REVIEW-BLOCKER]`。 |
| Schema | 字段命名、类型、可选性、默认值和兼容性清楚。 |
| Error | 错误码引用正式 registry 或明确新增需求。 |
| Capability | capability ID 使用 `domain.feature`。 |
| Conformance | 行为变化是否需要新增或调整 case 已有结论。 |

## 生成后检查清单

生成后再确认：

| 检查项 | 说明 |
|---|---|
| Protocol IR | `protocol/axtp.protocol.yaml` 反映采纳事实。 |
| Generated reference | `docs/generated/protocol.md` 和 `.json` 能被 runtime 读取。 |
| Validation | source validation、protocol validation 和 conformance source check 通过。 |
| Release impact | 若需要 runtime 跟进，准备 release 或 spec lock 更新说明。 |

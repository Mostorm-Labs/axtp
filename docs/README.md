# AXTP 文档地图

`docs/` 是 AXTP 主仓库的人读文档区，用来组织业务输入、流程、草案、正式规范、生成参考、conformance、legacy 迁移、架构边界和发版治理。

不同目录的合同等级不同。完整生命周期、合同等级和冲突处理规则只维护在 [连接建立边界与协议事实源边界](architecture/protocol-lifecycle-boundaries.md)；本文只做地图和入口。

## 你是谁？从这里开始

| 角色 | 入口 |
|---|---|
| 第一次了解 AXTP 的新人 | [start-here/new-to-axtp.md](start-here/new-to-axtp.md) |
| Runtime / SDK 实现者 | [start-here/runtime-implementer.md](start-here/runtime-implementer.md) |
| 协议维护者 | [start-here/protocol-maintainer.md](start-here/protocol-maintainer.md) |
| 产品 / 架构负责人 | [start-here/product-architecture.md](start-here/product-architecture.md) |
| 测试 / conformance 负责人 | [start-here/conformance-owner.md](start-here/conformance-owner.md) |
| Legacy 迁移负责人 | [start-here/legacy-migration-owner.md](start-here/legacy-migration-owner.md) |

完整操作 SOP 见 [guides/how-to-use.md](guides/how-to-use.md)。

## 目录地图

| 目录 | 定位 | 合同等级 |
|---|---|---|
| [start-here/](start-here/new-to-axtp.md) | 按角色进入仓库的短路径。 | 导航 |
| [business/](business/README.md) | 产品需求、业务背景、开放问题。 | 评审输入 |
| [flows/](flows/README.md) | 场景流程、消息序列、协议覆盖和缺口。 | 评审输入 |
| [protocol/](protocol/README.md) | human-written protocol drafts 和 review 记录。 | 草案 |
| [specs/](specs/README.md) | wire、session、registry、codec、tooling、versioning 的人工维护规范。 | 人工规范 |
| [generated/](generated/protocol.md) | Generator 输出的人读/机读协议参考。 | generated 实现合同 |
| [conformance/](conformance/README.md) | runtime、SDK、mock server 的行为验收输入。 | 验收合同 |
| [legacy-migration/](legacy-migration/README.md) | 旧协议证据、分类、迁移计划和 adapter 线索。 | 迁移输入 |
| [architecture/](architecture/README.md) | 协议边界、domain/feature 分类、事实源治理。 | 架构指导 |
| [guides/](guides/quickstart.md) | 研发接入、维护者 SOP、测试入门。 | 指南 |
| [release/](release/README.md) | spec tag、release artifact、runtime spec lock。 | 发布治理 |
| [dev/skills/](dev/skills/README.md) | lifecycle skills 和 agent 工作流。 | 维护流程 |

## 合同等级简表

| 等级 | 位置 | runtime 能否直接依赖 |
|---|---|---:|
| 评审输入 | `docs/business/**`、`docs/flows/**` | 否 |
| 草案 | `docs/protocol/**` before adoption | 否，除非显式做 mock/prototype |
| 迁移输入 | `docs/legacy-migration/**` | 否 |
| 人工规范 | `docs/specs/**` | 是，需与 generated/YAML 对齐 |
| 机器事实源 | `registry/**/*.yaml`、`registry/domains/**/*.yaml` | 是 |
| Protocol IR | `protocol/axtp.protocol.yaml` | 是 |
| Generated reference | `docs/generated/protocol.md`、`docs/generated/protocol.json` | 是 |
| Conformance | `docs/conformance/**` | 是 |
| 规划/宣讲 | `ROADMAP.md`、`KICKOFF.md` | 否 |

## 不要手写 generated

以下内容由 Generator 或工具链输出，不应为“修文档”手写：

| 路径 | 正确修改方式 |
|---|---|
| `docs/generated/**` | 修改 specs / registry YAML / Generator 后重新生成。 |
| `../protocol/axtp.protocol.yaml` | 从 `../registry/**` 和 `../registry/domains/**` 生成。 |
| `../tooling/test-vectors/**` | 由 Generator 或测试向量工具刷新。 |
| `../generators/src/__snapshots__/**` | 由 Generator 测试更新。 |

如果 generated 结果不符合预期，应回到源头：业务输入、flow、protocol draft、spec、registry YAML 或 Generator 逻辑。

# AXTP Docs

本文档区分为 active 文档、生成物和归档材料。

| 路径 | 角色 | 说明 |
|---|---|---|
| `docs/specs/` | 正式规范 | 协议框架、wire format、registry 规则、正式 registry 表格、Generator 规范和 capability 命名治理。 |
| `docs/business/` | 业务 intake | 业务域协议评审材料；采纳后必须同步到 `registry/**/*.yaml` 或 `registry/domains/**/*.yaml`。 |
| `docs/generated/` | 生成物 | 由 Generator 输出，不作为手写入口。 |
| `docs/demo/` | Demo 说明 | 示例实现和场景说明。 |
| `docs/dev/` | 工程说明 | SDK、runtime、研发流程、技能说明和唯一 kickoff 材料。 |
| `docs/migration/` | 迁移工作区 | legacy migration 尚在进行中，本轮不清理、不移动。 |
| `docs/legacy-protocols/` | legacy 原始资料 | AXDP、VM33、Rooms、NearHub 等原始输入资料。 |
| `docs/archive/` | 归档 | 非 active 事实源，仅用于追溯旧草稿、source 迁移材料和未来草案。 |

当前正式 specs 编号为 `00-19`。`08` 是后续 registry 与业务命名的 domain-feature 治理入口；原 source `08-13` 的正式表格已晋升到 `docs/specs/09-14`。

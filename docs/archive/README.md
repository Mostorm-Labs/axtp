# AXTP Docs Archive

`docs/archive/` 保存退出 active 路径的历史材料。归档文件只用于追溯旧草稿、source 迁移过程和未来草案，不作为实现输入或正式规范。

| 路径 | 说明 |
|---|---|
| `source-registry-v2/` | 原 `docs/source/08-13` 草稿。正式表格已晋升到 `docs/specs/09-14`。 |
| `source-planning/` | 原 source planning / legacy reference 文档。当前治理入口已转到 `docs/specs/`、`registry/` 和 `docs/generated/`。 |
| `future/` | v2/P1 或未来能力模型草案。 |
| `demo/` | 被替代或只保留历史追溯价值的 demo 文档。当前 active demo 在 `docs/demo/`。 |

需要新增或修改协议事实时，不要编辑归档材料；请修改 `registry/**/*.yaml`、`registry/domains/**/*.yaml`，并按需同步 `docs/specs/08-19`。

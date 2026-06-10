# AXTP 发布文档

`docs/release/` 存放 changelog、spec version、release checklist、runtime spec lock 和 runtime update flow。发布时以这里的流程和脚本为准。

## 版本号体系

| 版本体系 | 示例 | 含义 | Runtime 是否可绑定 |
|---|---|---|---:|
| Spec tag | `spec/v0.0.4` | Git tag，对应一个可复现的 AXTP spec 发布快照。 | 是 |
| 明确 commit | `0171ac1...` | 未打 tag 时的临时锁定点，适合开发期或内部联调。 | 是 |
| Roadmap milestone | `v0.1`、`v0.2`、`v1.0` | 规划阶段和功能完成度，不是发布快照。 | 否 |

Runtime 仓库必须绑定明确的 Spec tag、commit 或 release artifact，不得依赖浮动 `main`。Roadmap milestone 可以由多个 `spec/v0.0.x` 发布累积完成。

## 最小发布步骤

| 步骤 | 动作 | 主要检查 |
|---:|---|---|
| 1 | 确认 source、generated、conformance 都已同步。 | `pnpm --dir generators validate:sources`、`validate:protocol`、`scripts/validate-conformance.sh`。 |
| 2 | 更新 changelog 和 release checklist。 | `CHANGELOG.md` 与目标版本一致。 |
| 3 | 创建 `spec/vMAJOR.MINOR.PATCH` tag。 | tag 必须指向已验证 commit。 |
| 4 | 触发 release workflow。 | 构建 spec artifact，并 dispatch runtime/tool upgrades。 |
| 5 | Runtime 仓库更新 spec lock。 | 锁定 tag 或 commit，不使用浮动 `main`。 |

| 主题 | 英文 | 中文 |
|---|---|---|
| Changelog | [CHANGELOG.md](CHANGELOG.md) | - |
| Spec versioning | [AXTP_SPEC_VERSIONING.md](AXTP_SPEC_VERSIONING.md) | [AXTP_SPEC_VERSIONING.zh-CN.md](AXTP_SPEC_VERSIONING.zh-CN.md) |
| Release checklist | [AXTP_SPEC_RELEASE_CHECKLIST.md](AXTP_SPEC_RELEASE_CHECKLIST.md) | [AXTP_SPEC_RELEASE_CHECKLIST.zh-CN.md](AXTP_SPEC_RELEASE_CHECKLIST.zh-CN.md) |
| Runtime spec lock | [AXTP_RUNTIME_SPEC_LOCK.md](AXTP_RUNTIME_SPEC_LOCK.md) | [AXTP_RUNTIME_SPEC_LOCK.zh-CN.md](AXTP_RUNTIME_SPEC_LOCK.zh-CN.md) |
| Runtime update flow | [AXTP_RUNTIME_UPDATE_FLOW.md](AXTP_RUNTIME_UPDATE_FLOW.md) | - |

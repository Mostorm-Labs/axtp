# AXTP 发布文档

`release/` 存放 changelog、Spec release identity、release checklist、runtime spec lock 和 runtime update flow。发布时以这里的流程和脚本为准。

中文文档是维护者主读口径；英文文档保留给 runtime 仓库、release artifact 和跨仓自动化消费。两种语言描述冲突时，以同一 commit 中的中文发布流程和自动化脚本为准。

## 版本身份先分层

AXTP 存在多种合法版本号，但它们回答的是不同问题，不能放进同一个版本命名空间比较：

| Canonical identity | 示例 | 回答的问题 |
|---|---|---|
| Release version | `spec/v0.15.0` | “Runtime 绑定的是哪个不可变 AXTP 仓库快照？” |
| Protocol semantics version | `1.0.0` | “当前 Protocol IR 属于哪一条协议语义演进线？” |
| Standard Frame wire version | `0x01` / `1` | “这个二进制 Frame Header layout 能否被当前 parser 安全解析？” |
| Registry/schema model version | `1.0.0` | “当前 registry/schema authoring model 属于哪个模型版本？” |
| Generator version | `1.0.0` | “哪个工具版本生成了这些派生产物？” |
| Runtime implementation version | `v0.15.0.R` | “某个 consumer runtime 在绑定 `spec/v0.15.0` 后发布到了第几个实现修订？” |
| Hello advisory version | `Hello.d.axtpVersion` | “Peer 报告了什么诊断版本字符串？”；不是 compatibility authority。 |

完整映射和 legacy alias 规则见 [AXTP_SPEC_VERSIONING.zh-CN.md](AXTP_SPEC_VERSIONING.zh-CN.md)。

## Release 绑定体系

| 绑定类型 | 示例 | 含义 | Runtime 是否可绑定 |
|---|---|---|---:|
| Spec tag | `spec/v0.15.0` | Git tag，对应一个可复现的 AXTP release snapshot。 | 是 |
| 明确 commit | `1bf9e89...` | 未打 tag 时的精确仓库快照，适合开发期或内部联调。 | 是 |
| Release artifact | `axtp-spec-v0.15.0.zip` | 某个 release identity 的可消费合同包。 | 是 |
| Roadmap milestone | `v0.1`、`v0.2`、`v1.0` | 规划阶段和功能完成度，不是发布身份。 | 否 |

Runtime 仓库必须绑定明确的 Spec tag、commit 或 release artifact，不得依赖浮动 `main`。Release version 只负责可重现快照身份；session feature availability 仍由 wire/profile/capability/registry authority 决定。

本地反复 dry-run 后，可用 `tooling/scripts/clean-local-artifacts.sh` 清理 ignored `dist/axtp-spec-v*` 产物；这不会改变 release artifact 构建规则。

## 最小发布步骤

| 步骤 | 动作 | 主要检查 |
|---:|---|---|
| 1 | 确认 source、generated、conformance 都已同步。 | `pnpm --dir tooling/generators validate:sources`、`validate:protocol`、`tooling/scripts/validate-conformance.sh`。 |
| 2 | 更新 changelog 和 release checklist。 | `CHANGELOG.md` 与目标 release identity 一致。 |
| 3 | 创建 `spec/vMAJOR.MINOR.PATCH` tag。 | tag 必须指向已验证 commit。 |
| 4 | 触发 release workflow。 | 构建 spec artifact，并 dispatch runtime/tool upgrades。 |
| 5 | Runtime 仓库更新 spec lock。 | 锁定 tag/commit/artifact，不使用浮动 `main`。 |

| 主题 | 英文 | 中文 |
|---|---|---|
| Changelog | [CHANGELOG.md](CHANGELOG.md) | - |
| Spec identity / versioning | [AXTP_SPEC_VERSIONING.md](AXTP_SPEC_VERSIONING.md) | [AXTP_SPEC_VERSIONING.zh-CN.md](AXTP_SPEC_VERSIONING.zh-CN.md) |
| Release checklist | [AXTP_SPEC_RELEASE_CHECKLIST.md](AXTP_SPEC_RELEASE_CHECKLIST.md) | [AXTP_SPEC_RELEASE_CHECKLIST.zh-CN.md](AXTP_SPEC_RELEASE_CHECKLIST.zh-CN.md) |
| Runtime spec lock | [AXTP_RUNTIME_SPEC_LOCK.md](AXTP_RUNTIME_SPEC_LOCK.md) | [AXTP_RUNTIME_SPEC_LOCK.zh-CN.md](AXTP_RUNTIME_SPEC_LOCK.zh-CN.md) |
| Runtime update flow | [AXTP_RUNTIME_UPDATE_FLOW.md](AXTP_RUNTIME_UPDATE_FLOW.md) | - |

# AXTP Spec 版本管理

AXTP 使用 Git Tag 和 GitHub Release 发布不可变的协议标准版本。AXTP 主仓库是协议标准的唯一真源，包含文本规范、registry YAML、schema、生成后的协议参考、conformance 材料、迁移说明和发布文档。

Runtime 仓库只实现某个明确的 AXTP Spec 版本。Runtime 不应重新定义协议事实，也不应依赖 `main` 分支来构建可复现版本。

## 版本类型

AXTP 区分协议标准版本和语言 runtime 包版本。

```text
AXTP Spec Version:       spec/v0.3.0
Runtime Package Version: axtp-cpp-runtime v0.3.x
Runtime Package Version: @mostorm/axtp-ts-runtime 0.3.x
Runtime Package Version: axtp_flutter_runtime 0.3.x
```

Runtime 可以让自己的 major/minor 与兼容的 spec 范围对齐，但 runtime 版本仍然是独立的包版本。例如 runtime `0.3.x` 表示该 runtime 计划实现或兼容 AXTP `spec/v0.3.x`。

## Tag 格式

AXTP Spec tag 使用：

```text
spec/vMAJOR.MINOR.PATCH
```

示例：

```text
spec/v0.1.0
spec/v0.2.0
spec/v0.3.0
```

Tag 应使用 annotated tag：

```bash
git tag -a spec/v0.3.0 -m "AXTP Spec v0.3.0"
git push origin spec/v0.3.0
```

GitHub Release 名称应使用：

```text
AXTP Spec v0.3.0
```

## 版本语义

| 部分 | 含义 | 示例 | Runtime 影响 |
|---|---|---|---|
| MAJOR | 不兼容协议变更。 | Frame/header/session/RPC 语义发生破坏性变化。 | Runtime 必须显式适配，不得默认兼容。 |
| MINOR | 向后兼容能力新增。 | 新增 optional 字段、capability、method、event、schema 或 transport profile。 | Runtime 可选择支持新增事实；旧能力应继续兼容。 |
| PATCH | 非破坏性修正。 | 文档修正、schema 描述修正、非破坏性 registry metadata 修正。 | Runtime 不要求升级，除非需要该修正。 |

Patch 发布不得改变 wire compatibility。Minor 发布可以扩展生成 registry 和机器可读事实，但不得破坏既有 minor 功能。Major 发布是明确的兼容边界。

## Release 内容

每个 GitHub Release 应总结：

- Protocol changes
- Registry changes
- Schema changes
- Conformance changes
- Migration changes
- Compatibility notes
- Runtime impact

Release notes 应链接到 `docs/release/CHANGELOG.md`，并说明精确 tag 和 commit。

## 与现有 AXTP 版本字段的关系

Release tag 标识整个 AXTP Spec 快照。它不替代 spec 中已经定义的 wire-level 或 registry-level 字段，例如 `specVersion`、`registryVersion`、`wire_version` 或 generated protocol metadata。

使用 `spec/vMAJOR.MINOR.PATCH` 表示仓库发布身份。使用协议 metadata 和 generated registry facts 做 runtime 协商、校验和代码生成。

## 规则

- 不要把 runtime package version 当成 AXTP Spec version。
- 不要发布隐式追踪 AXTP `main` 的 runtime build。
- 不强制所有 runtime 使用 Git submodule；不同生态可以使用 package metadata、lock 文件或 spec package。
- 不要为了版本管理而把大量 runtime 实现代码放入 AXTP spec 仓库。
- 不要为了准备 release 手写 generated 输出；应先更新源事实并重新生成。

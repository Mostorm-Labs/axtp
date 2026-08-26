# AXTP Runtime Spec Lock

Runtime 仓库应声明自己绑定的 AXTP **release identity**。推荐在仓库根目录放置：

```text
AXTP_SPEC.lock.yaml
```

该文件用于保证 runtime 构建可复现、可审计。Runtime 不得直接依赖 AXTP `main` 分支。

本文件中的 `Spec tag`、`version`、`compatibility` 都属于 **`release.version` namespace**。它们不表示 Protocol IR `protocol.version`、Standard Frame Header Version、registry/schema model version，也不表示 `Hello.axtpVersion`。

## Lock 文件格式

```yaml
axtp_spec:
  repository: https://github.com/Mostorm-Labs/axtp
  tag: spec/v0.15.0
  version: 0.15.0
  commit: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  compatibility: ">=0.15.0 <0.16.0"
  updated_at: "YYYY-MM-DD"
```

字段说明：

| 字段 | 含义 |
|---|---|
| `repository` | AXTP authority 仓库 URL。 |
| `tag` | Runtime 当前绑定的精确 `release.tag`。 |
| `version` | 去掉 `spec/v` 前缀后的 `release.version`。 |
| `commit` | tag 解析到的 exact release commit，用于审计和可复现构建。 |
| `compatibility` | Runtime 声明可绑定/验证的 AXTP **release version range**；不是 session admission rule。 |
| `updated_at` | lock 文件更新时间。 |

Package metadata 可以重复记录同样信息，但 runtime 源码仓库仍应保留明确的 release binding。

## 不要把 Lock Version 当作 Wire Version

例如以下值可以同时成立：

```text
AXTP release lock           = spec/v0.15.0
Protocol IR protocol.version= 1.0.0
Standard Frame Version      = 1
Hello.axtpVersion           = "1.0.0" (advisory)
```

Runtime lock 的 `0.15.0` 只回答“实现基于哪个不可变 repository snapshot”。Frame parser 是否能接受 frame，仍读取 Standard Frame Header Version；optional feature 是否可用，仍读取 profile/capability/registry authority。

## Runtime Release 版本

Runtime/tool GitHub Release tag 使用已锁定的 **release version** 加一个 runtime revision：

```text
spec/vX.Y.Z -> vX.Y.Z.0
spec/vX.Y.Z -> vX.Y.Z.1
```

首次对齐某个 release tag 的 runtime release 使用 revision `0`。后续如果只是实现层修复，并且 `AXTP_SPEC.lock.yaml` 仍锁定同一个 release snapshot，则只递增第四位。

如果某个包生态不支持四段数字版本，应把四段值保存在 runtime 仓库 release metadata、generated manifest 或根目录 `VERSION` 文件中，并单独映射 package-manager version。Package metadata 不应成为记录 AXTP release binding 的唯一位置。

## C++ Runtime

C++ runtime 应依赖固定的 AXTP Spec tag 或 commit。常见方式包括 Git submodule 和 CMake `FetchContent`。

### Git Submodule

```bash
git submodule add https://github.com/Mostorm-Labs/axtp third_party/axtp-spec
git -C third_party/axtp-spec checkout spec/v0.15.0
git add .gitmodules third_party/axtp-spec AXTP_SPEC.lock.yaml
```

如果 tag 不能像 branch 一样跟踪，应 checkout 该 tag 对应的固定 commit，并在 `AXTP_SPEC.lock.yaml` 中同时记录 tag 和 commit。

### CMake FetchContent

```cmake
include(FetchContent)

FetchContent_Declare(
  axtp_spec
  GIT_REPOSITORY https://github.com/Mostorm-Labs/axtp.git
  GIT_TAG spec/v0.15.0
)

FetchContent_MakeAvailable(axtp_spec)
```

C++ runtime 应优先依赖固定 tag，而不是浮动分支。如果构建系统 vendored generated headers，lock 文件仍应标明生成这些 headers 的 AXTP release snapshot。

## TypeScript Runtime

短期内，TypeScript runtime 可以在 `package.json` 中记录 AXTP release metadata：

```json
{
  "name": "@mostorm/axtp-ts-runtime",
  "version": "0.15.0-runtime.1",
  "axtp": {
    "specVersion": "0.15.0",
    "specTag": "spec/v0.15.0",
    "specRepository": "https://github.com/Mostorm-Labs/axtp"
  }
}
```

这里的 package-local `axtp.specVersion` 是历史 consumer field 名，G2 将它的语义冻结为 **`release.version`**。它与 AXTP Protocol IR 中历史字段 `protocol.specVersion` 不是同一个 namespace；后者是 Standard Frame wire generation 的 legacy alias。

新设计 SHOULD 优先使用更明确的 consumer metadata 名称，例如 `releaseVersion` / `releaseTag`，但不得为了 G2 强制破坏已有 package metadata consumer。

如果暂时没有发布 `@mostorm/axtp-spec` package，可以使用 git dependency：

```json
{
  "devDependencies": {
    "@mostorm/axtp-spec": "github:Mostorm-Labs/axtp#spec/v0.15.0"
  }
}
```

长期可以发布机器可读 spec package：

```text
@mostorm/axtp-spec
```

该包应包含与 spec release artifact 一致的可消费合同形态：`contract/`、`specs/`、`conformance/`、角色/产品文档、release 文档、changelog 和 manifest。

## Flutter / Dart Runtime

Flutter/Dart runtime package version 继续写在 `pubspec.yaml`：

```yaml
name: axtp_flutter_runtime
version: 0.15.0-runtime.1
```

不要把 AXTP release binding 隐藏进 Dart package version。应使用 `AXTP_SPEC.lock.yaml`、generated release metadata 或项目内的 `axtp_spec.yaml`：

```yaml
axtp_spec:
  repository: https://github.com/Mostorm-Labs/axtp
  tag: spec/v0.15.0
  version: 0.15.0
  compatibility: ">=0.15.0 <0.16.0"
```

长期可以发布 Dart package `axtp_spec`，其中包含从已锁定 release snapshot 派生的 generated Dart types、schema/capability metadata 和 conformance cases。

## Submodule 边界

Submodule 适合 C++、内部 runtime、mock server、conformance runner 和 firmware integration project。它不一定适合 npm 或 pub package 的最终发布。

Runtime 仓库可以在开发期使用 submodule，但 release artifact 必须声明精确的 AXTP release identity。所有依赖必须指向 tag 或 commit，不允许浮动在 `main`。

完整 identity mapping 见 [AXTP Spec 版本管理](AXTP_SPEC_VERSIONING.zh-CN.md)。

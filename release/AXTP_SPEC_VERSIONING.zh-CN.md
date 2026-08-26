# AXTP Spec 版本管理

AXTP 使用 Git Tag 和 GitHub Release 发布不可变的协议标准快照。AXTP 主仓库是协议 authority 的唯一真源，包含文本规范、registry YAML、Protocol IR、生成后的协议参考、conformance 材料、产品指南、发布文档和 artifact manifest。

Runtime 仓库只实现某个明确的 AXTP release snapshot。Runtime 不应重新定义协议事实，也不应依赖 `main` 分支来构建可复现版本。

## 1. 核心规则：先回答“谁的 version？”

AXTP 的多个版本号属于不同身份维度。两个数值即使都写成 `1.0.0`，也不表示它们具有相同语义；两个版本数值不同，也不自动意味着不兼容。

G2 后采用以下 canonical naming：

```yaml
specIdentity:
  release:
    version: 0.15.0
    tag: spec/v0.15.0
    commit: <exact-sha>

  protocolSemantics:
    generation: 1
    version: 1.0.0

  wire:
    standardFrameVersion: 1

  registrySchema:
    version: 1.0.0

  authoritySchema:
    version: 1

  generator:
    version: 1.0.0
```

`runtimeImplementation.version` 和 `Hello.d.axtpVersion` 属于 consumer / wire-projection 维度，不是上面 release identity 的别名。

## 2. Identity Matrix

| Canonical name | 当前示例 | 当前 authority / projection | 是否上 wire | 是否可作为 runtime admission gate |
|---|---|---|---:|---:|
| `release.version` | `0.15.0` | `spec/v0.15.0`、release manifest、exact commit | 否 | 否；用于可重现绑定 |
| `protocolSemantics.generation` | `1` | AXTP v1 Core semantic family；治理语义名，当前没有独立 machine field | 否 | 否 |
| `protocolSemantics.version` | `1.0.0` | `contract/registry/core/protocol_meta.yaml -> protocol.version` | 否 | 否；不是 session feature gate |
| `wire.standardFrameVersion` | `1` / `0x01` | `specs/20-core.md` Standard Frame Header `Version` | **是** | **是，作为 frame parser compatibility boundary** |
| `registrySchema.version` | `1.0.0` | 当前 registry/schema model metadata；见 compatibility aliases | 否 | 否 |
| `authoritySchema.version` | `1` | Repository Governance v1 的 authority metadata generation | 否 | 否 |
| `generator.version` | `1.0.0` | `tooling/generators/generator.yaml` / generator package metadata | 否 | 否 |
| `runtimeImplementation.version` | `v0.15.0.0`、`v0.15.0.1` | consumer runtime/tool GitHub Release | 否 | 否 |
| `advisoryHelloVersion` | `Hello.d.axtpVersion="1.0.0"` | optional RPC Hello diagnostics field | **是** | **绝对否** |

一个合法快照完全可以同时具有：

```text
release.version              = 0.15.0
protocolSemantics.version    = 1.0.0
wire.standardFrameVersion    = 1
registrySchema.version       = 1.0.0
generator.version            = 1.0.0
runtimeImplementation.version= 0.15.0.R
```

这些值不需要相等。

## 3. Release Identity

AXTP release tag 使用：

```text
spec/vMAJOR.MINOR.PATCH
```

例如当前治理保护基线：

```text
release.version = 0.15.0
release.tag     = spec/v0.15.0
release.commit  = 1bf9e89ede12470e20733d4cea4e50edad989528
```

Release identity 标识**整个仓库 authority snapshot**。Runtime 的 `AXTP_SPEC.lock.yaml`、release artifact manifest、runtime update dispatch 中的 `spec_tag/spec_version/spec_commit` 都使用这个 release namespace。

Release SemVer 的 MAJOR/MINOR/PATCH 描述仓库发布兼容承诺：

| 部分 | 含义 | 示例 | Runtime 影响 |
|---|---|---|---|
| MAJOR | 不兼容协议变更。 | Frame/header/session/RPC 语义发生破坏性变化。 | Runtime 必须显式适配。 |
| MINOR | 向后兼容能力新增。 | 新 optional field/capability/method/event/schema/profile。 | Runtime 可选择新增支持。 |
| PATCH | 非破坏性修正。 | 文档、描述、兼容 metadata 修正。 | 通常不要求 runtime 行为升级。 |

Patch release MUST NOT 改变既有 wire compatibility；但反过来不能用 release SemVer 数字直接决定某个 session 是否允许建立。

## 4. Protocol Semantics Identity

当前 Protocol IR 的：

```yaml
protocol:
  version: 1.0.0
```

来自：

```text
contract/registry/core/protocol_meta.yaml
  -> Protocol IR
  -> generated reference
```

G2 将其 canonical 解释为：

```text
protocolSemantics.version = 1.0.0
```

它描述当前 Protocol IR 所属的协议语义演进线，不是 `spec/v0.15.0` 的别名，也不是 Standard Frame Header Version。

`protocolSemantics.generation=1` 表示 AXTP v1 Core semantic family。当前没有必要为了补一个新 machine field 而改变 Protocol IR schema；G2 只冻结语义名称，物理 schema materialization 可以在未来 tooling release 中完成。

## 5. Wire Version

真正的 Standard Frame parser boundary 是 `specs/20-core.md` 定义的 Header byte：

```text
Offset 2
Field: Version
Current value: 0x01
```

Canonical name：

```text
wire.standardFrameVersion = 1
```

不能安全解析该 layout 的 receiver 使用 `FRAME_VERSION_UNSUPPORTED` 拒绝 frame。

历史字段 `protocol.specVersion: 1` 的原始设计含义就是 Core wire/header generation，因此 G2 将它冻结为 `wire.standardFrameVersion` 的 **legacy compatibility alias**，而不是 release Spec version。

## 6. Registry / Schema Model Version

当前仓库同时保留：

```text
protocol.registryVersion: 1.0.0
contract/registry/version.yaml -> registry_version: 1.0.0
contract/registry/version.yaml -> schema_version: 1.0.0
```

G2 不删除、不重命名这些现有 machine fields。它们保留为历史 authoring/tooling compatibility metadata，并归入：

```text
registrySchema.version = 1.0.0
```

当前 `contract/registry/core/protocol_meta.yaml` 驱动 Protocol IR metadata；`contract/registry/version.yaml` 仍被 tooling 读取和打入 release artifact，但其这些字段不得被解释成 release identity、wire admission 或 capability negotiation authority。

未来如果要把 registry/schema 分成更多独立 machine schema generations，应通过显式 tooling/schema migration 完成，而不是继续引入裸 `version` 名称。

## 7. Hello `axtpVersion`

`Hello.d.axtpVersion` 是 optional advisory diagnostics metadata。

无论它：

- 缺失；
- 不是合法 SemVer；
- major/minor/patch 与本地不同；

receiver 都 MUST NOT 因此拒绝或延迟 `Hello -> Identify -> Identified`，也 MUST NOT 用它做 capability/profile/codec feature gate。

Conformance case `session.axtp_version_advisory` 已覆盖这些情况。

因此 canonical 描述是：

```text
advisoryHelloVersion = peer-reported diagnostic string
```

它不是 release version、protocol semantics authority，也不是 wire parser version。

历史 `protocolVersion`、`rpcVersion`、`negotiatedRpcVersion` 同样只是 deprecated compatibility inputs；新 sender SHOULD 省略，receiver MAY 读取，但不得提升为 session admission authority。

## 8. Generator Identity

Generator 的版本来自 operational tooling，例如：

```yaml
generator:
  name: axtp-generator
  version: 1.0.0
```

它描述生成工具，不描述 AXTP wire/runtime compatibility。对于严格可重现性，exact AXTP source commit 比仅比较 generator SemVer 更强。

## 9. Runtime Implementation Identity

Runtime/tool GitHub Release 从已绑定的 AXTP release identity 派生四段协调版本：

```text
vSPEC_MAJOR.SPEC_MINOR.SPEC_PATCH.RUNTIME_REVISION
```

例如：

```text
spec/v0.15.0 -> runtime v0.15.0.0
spec/v0.15.0 -> runtime v0.15.0.1
```

前三位表达它绑定的 AXTP **release version**，第四位 `R` 是 consumer 实现自己的 release revision。它不等于 `protocolSemantics.version`，也不等于 wire version。

如果 package manager 不接受四段数字，可以做 ecosystem projection；GitHub Release tag、generated runtime manifest 和 `AXTP_SPEC.lock.yaml` 保持可追溯性。

## 10. Existing Field Compatibility Map

| Existing field / label | G2 canonical meaning | Disposition |
|---|---|---|
| `spec/vX.Y.Z` | `release.tag` / `release.version` | canonical release identity |
| release manifest `axtp_spec.version` | `release.version` | canonical release projection |
| dispatch `spec_version` | `release.version` | compatibility/API field；含义冻结 |
| `protocol.version` | `protocolSemantics.version` | current machine projection；保留 |
| `protocol.specVersion` | `wire.standardFrameVersion` | legacy ambiguous name；保留，不新增同名字段 |
| Standard Frame Header `Version` | `wire.standardFrameVersion` | normative wire authority |
| `protocol.registryVersion` | `registrySchema.version` | legacy/current projection；保留 |
| `version.yaml spec.version` | `protocolSemantics.version` mirror | legacy metadata mirror；不是 release version |
| `version.yaml registry_version` | `registrySchema.version` mirror | legacy metadata mirror |
| `version.yaml schema_version` | `registrySchema.version` mirror | legacy metadata mirror |
| `version.yaml wire_version` | `wire.standardFrameVersion` mirror | legacy metadata mirror |
| `generator.version` | `generator.version` | operational tooling identity |
| runtime `vX.Y.Z.R` | `runtimeImplementation.version` | consumer identity |
| `Hello.d.axtpVersion` | `advisoryHelloVersion` | diagnostic only |

## 11. Physical Rename Policy

G2 **不物理重命名**已经出现在 Protocol IR、generated output、release artifact、runtime parser 或 dispatch payload 中的历史字段。原因是字段名本身可能已成为 consumer API/schema 的一部分。

规则：

1. 新 canonical metadata MUST 使用明确名字，不能新增裸 `version/specVersion/protocolVersion`。
2. 已有 ambiguous 字段保留为 compatibility alias，并在这里冻结含义。
3. 如果未来要删除/重命名 machine field，必须单独做 tooling/schema migration，并验证所有 downstream consumer。
4. 不得通过 G2 文档治理改变任何 wire value、stable ID、runtime parser 或 Hello 行为。

## 12. 发布规则

- 不要把 `protocol.version=1.0.0` 写成“当前 release 是 spec/v1.0.0”。
- 不要把 Standard Frame `Version=1` 当成仓库 release major version。
- 不要把 runtime package/release version 当成 AXTP protocol semantic version。
- 不要用 `Hello.axtpVersion` 做 feature negotiation 或 admission gate。
- Runtime build 必须锁定 `spec/vX.Y.Z`、exact commit 或可验证 release artifact，不得隐式追踪 `main`。
- 不要为了版本管理手写 generated 输出；应修改 canonical source/tooling 后重新生成。

# AXTP 工具链与版本

本文定义源注册表 YAML 如何生成 Protocol IR、生成参考、发布包和 runtime binding metadata，并定义 tooling 如何解释 AXTP 的多个版本身份。

## 从源模型到合同

Registry YAML 是手写的机器源模型。Protocol IR 和生成参考是输出产物。

```text
contract/registry/**/*.yaml
  -> validate-sources
  -> contract/protocol/axtp.protocol.yaml
  -> validate-protocol
  -> contract/generated/protocol.md
  -> contract/generated/protocol.json
  -> contract/mcp/**
  -> contract/test-vectors/**
```

规则：

1. `contract/protocol/axtp.protocol.yaml` MUST NOT 被手写编辑。
2. `contract/generated/**`、`contract/mcp/**` 和 `contract/test-vectors/**` MUST 从 source 重新生成。
3. 生成器 MUST NOT 从 `workspace/protocol/**`、`workspace/registry-planning/**`、archive docs 或 generated markdown 推断正式协议事实。
4. Domain YAML 和 core registry YAML 经过校验后形成同一组 Protocol IR facts。
5. 同一个 method/event/error/schema/capability/profile MUST NOT 被定义两次。
6. Protocol IR MUST 保留足够信息，以支持 generated docs、machine JSON、SDK/runtime metadata 和 conformance。

## 源输入

| 输入 | 职责 |
|---|---|
| `contract/registry/core/protocol_meta.yaml` | Protocol IR 顶层 protocol semantics / legacy version projections、wire description、transport/profile 和 core architecture metadata。 |
| `contract/registry/core/*.yaml` | PayloadType、RPC op、encoding、CONTROL opcode 和 core enum。 |
| `contract/registry/error/error_code.yaml` | Core/shared error registry。 |
| `contract/registry/schema/*.yaml` | Core/shared schema。 |
| `contract/registry/capability/*.yaml` | Core/shared capability/profile facts。 |
| `contract/registry/domains/<domain>/domain.yaml` | 业务 domain 的 methods、events、schemas、errors、capabilities 和 profiles。 |
| `contract/registry/version.yaml` | 历史 registry/spec/schema/wire metadata surface；继续被 tooling 读取和 release artifact 保留，但 G2 后不得把裸字段名解释成新的 canonical identity。 |

业务事实只有在评审、采纳和注册表更新之后才进入 source model。

当前 Protocol IR 顶层 `protocol.*` metadata 由 `core/protocol_meta.yaml` 投影。`version.yaml` 的 `spec.version/registry_version/schema_version/wire_version` 当前是兼容/历史 metadata mirror，不是一个独立的 runtime negotiation authority。

## 生成器要求

生成器 MUST：

- 以确定性方式解析 YAML；
- 在 emit 前校验 id/name uniqueness 和 references；
- 保留 stable ids、fieldIds、bitOffsets、status 和 since metadata；
- 对不支持的 source shape fail，而不是静默丢弃 facts；
- 输出 deterministic Protocol IR 和 generated references；
- 对同一 source 和 template version 保持 generated artifacts byte-for-byte stable；
- 当 generated outputs 与 source drift 时让 CI fail。

生成器 SHOULD 从 Protocol IR 输出目标语言 metadata 或代码，而不是从 markdown 输出。

## 校验

`validate-sources` MUST 检查：

- source YAML shape；
- id/name uniqueness；
- domain/name prefix alignment；
- method request/response schema references；
- event payload references；
- error/capability/profile references；
- fieldId、bitOffset、status 和 since consistency；
- core 和 domain YAML 之间没有 duplicate facts。

`validate-protocol` MUST 根据 source model、core specs 和 generated output 校验 Protocol IR。它也会检查关键协议不变量，例如 Big-Endian / network byte order、required CONTROL opcodes、optional READY、ACK/NACK future status 和 16B STREAM Header。

仓库必需检查：

| 命令 | 守护的合同 |
|---|---|
| `pnpm --dir tooling/generators validate` | Source YAML shape 和 registry references。 |
| `pnpm --dir tooling/generators validate:sources` | Source YAML 以及 generated Protocol IR consistency。 |
| `pnpm --dir tooling/generators validate:protocol` | Protocol IR 以及手写 core/codec spec invariants。 |
| `tooling/scripts/check-generated-drift.sh` | Generated artifacts 可从 source 重现。 |
| `tooling/scripts/check-release-artifact.sh <version>` | Release artifact 包含可消费合同，并排除 maintainer-only material。 |
| `tooling/scripts/validate-conformance.sh` | Conformance manifest 和 cases 结构有效。 |

## Spec Identity / Version Model

任何 version 字段都必须先回答：**这个 version 在版本化什么？**

Canonical semantic names：

| Canonical name | 当前值/示例 | Tooling 解释 |
|---|---|---|
| `release.version` | `0.15.0` | `spec/v0.15.0` 对应的整个 repository authority snapshot；runtime lock / artifact / dispatch 使用这个 namespace。 |
| `protocolSemantics.generation` | `1` | AXTP v1 Core semantic family；当前没有独立 machine field。 |
| `protocolSemantics.version` | `1.0.0` | 当前由 `protocol_meta.yaml protocol.version` 投影到 Protocol IR。 |
| `wire.standardFrameVersion` | `1` / `0x01` | Standard Frame Header `Version`；hard parser compatibility boundary。 |
| `registrySchema.version` | `1.0.0` | registry/schema authoring model generation。 |
| `authoritySchema.version` | `1` | repository governance metadata generation；不进入 protocol wire。 |
| `generator.version` | `1.0.0` | operational generator identity。 |
| `runtimeImplementation.version` | `v0.15.0.R` | downstream consumer release identity。 |
| `advisoryHelloVersion` | `Hello.d.axtpVersion` | peer diagnostics string；不得做 admission/feature gate。 |

完整版本规则见 `release/AXTP_SPEC_VERSIONING.zh-CN.md`。

### Existing compatibility aliases

当前机器格式含有历史命名，G2 冻结其语义但不做物理重命名：

| Existing field | Canonical meaning |
|---|---|
| `protocol.version` | `protocolSemantics.version` |
| `protocol.specVersion` | legacy alias of `wire.standardFrameVersion` |
| `protocol.registryVersion` | legacy/current projection of `registrySchema.version` |
| `version.yaml spec.version` | legacy mirror of `protocolSemantics.version`，不是 release version |
| `version.yaml registry_version` | legacy mirror of `registrySchema.version` |
| `version.yaml schema_version` | legacy mirror of `registrySchema.version` |
| `version.yaml wire_version` | legacy mirror of `wire.standardFrameVersion` |
| release `spec_version` / manifest `axtp_spec.version` | `release.version` |

`protocol.specVersion` 不能因为字段名里出现 `spec` 就解释为 `spec/vX.Y.Z`。历史 freeze authority 已将它与 Core wire/header generation 绑定；当前 normative parser boundary 仍是 `specs/20-core.md` 的 Standard Frame Header `Version`。

### Physical rename policy

G2 不改名已有 machine fields，因为它们可能已被 Protocol IR/generated/runtime/automation consumer 解析。

- 新 metadata MUST 使用 `releaseVersion`、`protocolSemanticsVersion`、`standardFrameVersion` 等能够说明 owner 的名字。
- 不得新引入语义不明的裸 `version`、`specVersion`、`protocolVersion`。
- 已有字段作为 compatibility alias 保留；未来删除/重命名必须单独做 schema/tooling migration 和 downstream verification。
- 文档中的 canonical name 是**语义规范化**，不是对现有 wire/schema 的 silent rename。

## Release Versioning

AXTP 使用 tag 发布不可变 release snapshot：

```text
spec/vMAJOR.MINOR.PATCH
```

Release SemVer 只管理 repository release identity；它不替代 protocol semantic、wire、registry schema 或 generator version。

版本语义：

| 部分 | 含义 |
|---|---|
| MAJOR | 不兼容协议变更。 |
| MINOR | 向后兼容的 capability、registry、profile、generated fact 或 artifact-layout addition。 |
| PATCH | 非破坏性修正或说明澄清。 |

Patch release MUST NOT 改变既有 wire compatibility。Minor release MAY 扩展 generated registry 和 machine-readable facts，而不破坏上一 minor 的功能。Major release 是显式 compatibility boundary。

Runtime package version 与 AXTP release version 分离。Runtime 仓库 MUST 绑定 spec tag、精确 commit 或 release artifact；release build MUST NOT 依赖浮动 `main`。

## Compatibility admission

版本字段不能取代真正的 compatibility authority：

- Standard Frame Header `Version` 是 frame parser boundary；
- transport/profile/capability/registry facts 决定 feature availability；
- `Hello.axtpVersion` 仅用于 diagnostics；
- release SemVer 仅用于 snapshot binding 和 release compatibility history；
- runtime `vX.Y.Z.R` 仅用于 consumer implementation release identity。

因此 runtime MUST NOT 把 release number、Protocol IR `protocol.version` 或 Hello diagnostic string 简化成通用 feature gate。

## 发布包

默认 release artifact 包含 runtime 可消费合同：

```text
README.md
LICENSE
CHANGELOG.md
docs/README.md
docs/guides/**
docs/product/**
specs/**
contract/**
conformance/**
release/**
manifest.yaml
```

它 MUST NOT 包含 maintainer-only workspace planning、legacy evidence、lifecycle skills、local outputs 或 release templates。

## 兼容性

Breaking change 包括 Standard Frame layout、PayloadType semantics、CONTROL required fields、RPC envelope semantics、STREAM Header、stable method/event/error ids、stable schema fields 或 stable profile required sets 的不兼容变化。

Compatible change 通常包括新的 optional schema fields、新的 optional capabilities、新的 draft entries、新的 generated metadata（保留旧 facts）和 documentation clarifications。

Deprecated facts MUST 持续生成，直到 release policy 明确移除。Reserved ids MUST NOT 被复用。

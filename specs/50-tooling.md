# AXTP 工具链与版本

本文定义 source registry YAML 如何生成 Protocol IR、generated references、release artifacts 和 runtime binding metadata。

## Source To Contract

Registry YAML 是手写的机器源模型。Protocol IR 和 generated references 是输出产物。

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
3. Generator MUST NOT 从 `workspace/protocol/**`、`workspace/registry-planning/**`、archive docs 或 generated markdown 推断正式协议事实。
4. Domain YAML 和 core registry YAML 经过 validation 后形成同一组 Protocol IR facts。
5. 同一个 method/event/error/schema/capability/profile MUST NOT 被定义两次。
6. Protocol IR MUST 保留足够信息，以支持 generated docs、machine JSON、SDK/runtime metadata 和 conformance。

## Source Inputs

| Input | 职责 |
|---|---|
| `contract/registry/core/*.yaml` | PayloadType、RPC op、encoding、CONTROL opcode 和 core enums。 |
| `contract/registry/error/error_code.yaml` | Core/shared error registry。 |
| `contract/registry/schema/*.yaml` | Core/shared schema。 |
| `contract/registry/capability/*.yaml` | Core/shared capability/profile facts。 |
| `contract/registry/domains/<domain>/domain.yaml` | Business domain methods、events、schemas、errors、capabilities 和 profiles。 |
| `contract/registry/version.yaml` | Spec/contract/registry/schema/wire metadata。 |

Business facts 只有在 review、adoption 和 registry update 之后才进入 source model。

## Generator Requirements

Generator MUST：

- deterministic 地解析 YAML；
- 在 emit 前校验 id/name uniqueness 和 references；
- 保留 stable ids、fieldIds、bitOffsets、status 和 since metadata；
- 对不支持的 source shapes fail，而不是静默丢弃 facts；
- 输出 deterministic Protocol IR 和 generated references；
- 对同一 source 和 template version 保持 generated artifacts byte-for-byte stable；
- 当 generated outputs 与 source drift 时让 CI fail。

Generator SHOULD 从 Protocol IR 输出目标语言 metadata 或代码，而不是从 markdown 输出。

## Validation

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

| Command | Guarded contract |
|---|---|
| `pnpm --dir tooling/generators validate` | Source YAML shape 和 registry references。 |
| `pnpm --dir tooling/generators validate:sources` | Source YAML 以及 generated Protocol IR consistency。 |
| `pnpm --dir tooling/generators validate:protocol` | Protocol IR 以及手写 core/codec spec invariants。 |
| `tooling/scripts/check-generated-drift.sh` | Generated artifacts 可从 source 重现。 |
| `tooling/scripts/check-release-artifact.sh <version>` | Release artifact 包含可消费合同，并排除 maintainer-only material。 |
| `tooling/scripts/validate-conformance.sh` | Conformance manifest 和 cases 结构有效。 |

## Versioning

AXTP 使用 tag 发布不可变 spec snapshots：

```text
spec/vMAJOR.MINOR.PATCH
```

Runtime package versions 与 AXTP Spec versions 分离。Runtime 仓库 MUST 绑定 spec tag、exact commit 或 release artifact；release builds MUST NOT 依赖浮动的 `main`。

版本语义：

| Part | 含义 |
|---|---|
| MAJOR | Incompatible protocol change。 |
| MINOR | Backward-compatible capability、registry、profile、generated fact 或 artifact-layout addition。 |
| PATCH | Non-breaking correction or clarification。 |

Patch releases MUST NOT 改变 wire compatibility。Minor releases MAY 扩展 generated registry 和 machine-readable facts，而不破坏上一 minor 的功能。Major releases 是显式 compatibility boundaries。

## Release Artifact

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

## Compatibility

Breaking changes 包括 Standard Frame layout、PayloadType semantics、CONTROL required fields、RPC envelope semantics、STREAM Header、stable method/event/error ids、stable schema fields 或 stable profile required sets 的不兼容变化。

Compatible changes 通常包括新的 optional schema fields、新的 optional capabilities、新的 draft entries、新的 generated metadata（保留旧 facts）和 documentation clarifications。

Deprecated facts MUST 持续生成，直到 release policy 明确移除。Reserved ids MUST NOT 被复用。

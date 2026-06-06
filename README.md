# AXTP

AXTP（Auditoryworks Transport Protocol）是一套面向设备控制、事件通知和连续数据流的传输无关协议框架。本仓库是 AXTP Spec、协议事实源、主库 Generator 和生成产物的维护仓库。Runtime、SDK、mock server 和调试工具维护在独立仓库中。

核心约定：

```text
业务需求 / 旧协议材料
  -> docs/business/<requirement>.md
  -> docs/flows/<scenario>.md
  -> docs/protocol/<domain>/<domain.feature>.md
  -> 人工评审
  -> registry/**/*.yaml + registry/domains/**/*.yaml
  -> protocol/axtp.protocol.yaml
  -> docs/generated/*
```

不要手写 generated 产物。生成结果不符合预期时，应回到草案、specs、YAML 事实源或 Generator 逻辑修正，再重新生成。

## Start Here

| 目标 | 入口 |
|---|---|
| 第一次读仓库 | [docs/README.md](docs/README.md)，再读 [docs/specs/1-core/01-Overview.md](docs/specs/1-core/01-Overview.md) |
| 查看产品与技术路线 | [ROADMAP.md](ROADMAP.md) |
| 理解协议分层和传输 | [docs/specs/README.md](docs/specs/README.md) |
| 查当前已采纳协议 | [docs/generated/protocol.md](docs/generated/protocol.md) 或 [docs/generated/protocol.json](docs/generated/protocol.json) |
| 新增、修订或采纳业务协议 | [docs/protocol/README.md](docs/protocol/README.md) |
| 查看协议采纳/生成优先级 | [docs/protocol/README.md#协议采纳生成优先级](docs/protocol/README.md#协议采纳生成优先级) |
| 追溯 legacy 分类和迁移 | [docs/legacy-migration/README.md](docs/legacy-migration/README.md) |
| 运行主库 Generator | [docs/guides/how-to-use.md](docs/guides/how-to-use.md) 和 [generators/README.md](generators/README.md) |
| 查看发布和 runtime 依赖规则 | [docs/release/README.md](docs/release/README.md) |
| 查看跨语言架构原则 | [docs/architecture/README.md](docs/architecture/README.md) |
| 查看 conformance cases | [docs/conformance/README.md](docs/conformance/README.md) |

## Repository Layout

| 路径 | 角色 | 手写 |
|---|---|---:|
| `docs/specs/` | 正式规范和治理规则 | 是 |
| `docs/business/` | 原始业务背景、用户目标和开放问题 | 是 |
| `docs/flows/` | 业务场景到协议交互的桥接方案 | 是 |
| `docs/protocol/` | 业务协议草案、评审输入和采纳前记录 | 是 |
| `docs/architecture/` | 跨语言通用架构原则和设计思想 | 是 |
| `docs/legacy-migration/` | legacy 证据、分类、迁移计划和生成候选产物 | 部分 |
| `docs/conformance/` | 跨 runtime 协议一致性用例、profile 和 schema | 是 |
| `registry/` | Core、共享 schema、错误码、capability/profile 事实源 | 是 |
| `registry/domains/` | 已采纳业务域机器事实源 | 是 |
| `protocol/axtp.protocol.yaml` | Generator 聚合输出的 Protocol IR | 否 |
| `docs/generated/` | Generator 输出的人读/机器读协议参考 | 否 |
| `generators/` | 主库 Generator 源码 | 是 |
| `tooling/` | legacy/migration 脚本、MCP JSON、测试向量等工具材料 | 部分 |
| `docs/release/` | Spec 发布、runtime spec lock 和升级流程 | 是 |

`docs/protocol/` 是草案目录；根目录 `protocol/` 只保存生成后的 `protocol/axtp.protocol.yaml`。二者名字相近，但不能互相替代。

## Protocol Model

AXTP 分为五层：

```text
Business   device / display / firmware / network / stream / ...
Registry   method / event / error / schema / capability / profile
Payload    CONTROL(0x01) / RPC(0x02) / STREAM(0x03)
Frame      Standard Frame Header / length / fragment / CRC
Transport  USB HID / TCP / WebSocket / future low-bandwidth paths
```

| Transport profile | Wire path | Payload support |
|---|---|---|
| `AXTP-USB-HID` | Standard Frame | CONTROL / RPC / STREAM |
| `AXTP-TCP` | Standard Frame | CONTROL / RPC / STREAM |
| `AXTP-WS-JSON` | WebSocket JSON message | RPC JSON only |
| `AXTP-WS-CLOUD-REVERSE` | WebSocket JSON message | RPC JSON only |

业务类型不要进入 Frame Header 或顶层 PayloadType。固件更新、音视频、日志和文件块等场景应通过业务 RPC 建立语义，再用 STREAM 承载连续数据。

## Protocol Workflow

仓库按阶段维护协议，详细流程见 [docs/protocol/README.md](docs/protocol/README.md) 和 [docs/dev/skills/README.md](docs/dev/skills/README.md)。

| 阶段 | 主要输入 | 主要输出 |
|---|---|---|
| Flow plan | 业务场景、用户 story、UI 原型、端到端交互 | `docs/flows/<scenario>.md` |
| Draft | 产品需求、架构草图、legacy 线索 | `docs/protocol/<domain>/<domain.feature>.md` |
| Adopt | 已评审确认的草案 | `registry/**/*.yaml`、`registry/domains/**/*.yaml` |
| Generate | 已更新的 YAML 事实源 | `protocol/axtp.protocol.yaml`、`docs/generated/*` |
| Amend | 已采纳或已生成协议的语义变更 | 修订后的草案、YAML 和 generated 产物 |
| Release | 已验证的 Spec 产物 | `spec/vX.Y.Z` tag 和 release artifact |

## Quick Start

安装主库 Generator 依赖：

```bash
pnpm --dir generators install
```

构建并校验协议事实源：

```bash
pnpm --dir generators build
pnpm --dir generators validate:sources
```

重新生成主库协议产物：

```bash
pnpm --dir generators generate
pnpm --dir generators validate:protocol
```

运行 Generator 测试：

```bash
pnpm --dir generators test
```

提交前建议检查：

```bash
git diff --check
```

## Source Rules

- 当前实现合同以 `registry/**/*.yaml`、`registry/domains/**/*.yaml` 和刷新后的 `docs/generated/*` 为准。
- `docs/protocol/**` 是草案和评审输入；未采纳前不能当作实现合同。
- `protocol/axtp.protocol.yaml`、`docs/generated/**`、`docs/legacy-migration/generated/**`、`tooling/mcp/*.generated.json`、`tooling/test-vectors/**`、`generators/src/__snapshots__/**` 是生成产物或快照，不要手写。
- 新业务必须先按 Naming and Taxonomy spec 确认 `domain.feature`，再进入草案、采纳和生成流程。
- 有 `[REVIEW-ASK]`、`[REVIEW-FIX]` 或 `[REVIEW-BLOCKER]` 的事实不得进入 YAML。
- Runtime 和 SDK 必须通过 `AXTP_SPEC.lock.yaml` 或包元数据声明所实现的 AXTP Spec 版本。

## Versioning And Runtime

AXTP Spec 使用 Git tag 版本：

```text
spec/vMAJOR.MINOR.PATCH
```

Spec 版本和 runtime 包版本相互独立。不要依赖 `main` 分支做可复现 runtime 构建；使用已发布的 `spec/vX.Y.Z` tag 或明确 commit。发布、runtime spec lock 和自动升级流程见 [docs/release/README.md](docs/release/README.md)。

Runtime、SDK、mock server 和调试工具维护在独立仓库中，例如：

- [axtp-c-runtime](https://github.com/Mostorm-Labs/axtp-c-runtime)
- [axtp-cpp-runtime](https://github.com/Mostorm-Labs/axtp-cpp-runtime)
- [axtp-flutter-runtime](https://github.com/Mostorm-Labs/axtp-flutter-runtime)
- [axtp-ts-runtime](https://github.com/Mostorm-Labs/axtp-ts-runtime)
- [axtp-python-runtime](https://github.com/Mostorm-Labs/axtp-python-runtime)
- [axtp-mock-server](https://github.com/Mostorm-Labs/axtp-mock-server)

本仓库只维护协议源、规范、生成器、conformance cases 和主库生成产物，不把 runtime 仓库当作协议事实源。

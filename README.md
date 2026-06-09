# AXTP

```text
     _    __  __  _______  ___
    / \   \ \/ /  |_   _| | __ \
   / _ \   >  <     | |   |  __/
  /_/ \_\ /_/\_\    |_|   |_|

  Auditoryworks Transport Protocol
  CONTROL. RPC. STREAM. Single Source of Truth.
```

AXTP（Auditoryworks Transport Protocol）是面向智能硬件、音视频设备和多端 SDK 的统一通信协议规范。它覆盖设备控制、能力发现、RPC、事件、STREAM 连续数据面以及低带宽链路适配，并可运行在 WebSocket、TCP、USB HID、BLE、UART 和 mock transport 等不同传输形态上。

本仓库是 AXTP 生态的 **核心规范仓库 / Single Source of Truth**：维护协议规范、registry 事实源、Generator、generated reference、conformance case、release governance 和 legacy 迁移材料。本仓库不承载具体语言 runtime；C / C++ / TypeScript / Flutter / Python runtime 维护在独立仓库，并通过 spec tag、明确 commit 或 release artifact 消费这里的协议输入。

## 一览

| 项目 | 内容 |
|---|---|
| 协议 | AXTP，Auditoryworks Transport Protocol |
| 当前 Spec 辅助命令 | `scripts/print-spec-version.sh` |
| 事实源 | `registry/**/*.yaml` 和 `registry/domains/**/*.yaml` |
| 生成的协议 IR | `protocol/axtp.protocol.yaml` |
| 生成的参考文档 | `docs/generated/*` |
| Conformance 输入 | `docs/conformance/**` |
| 发布模型 | Git tag，格式为 `spec/vMAJOR.MINOR.PATCH` |
| Runtime 模型 | 外部多语言 runtime 仓库，必须绑定 spec tag、明确 commit 或 release artifact |

## 你是谁？先读哪里

| 你的角色 | 你的目标 | 从这里开始 |
|---|---|---|
| 首次了解 AXTP | 理解 AXTP 是什么、仓库里哪些内容可信 | 继续读本文档，再看 [docs/README.md](docs/README.md) |
| 产品 / 架构 | 查看 domain 状态、协议缺口和采纳优先级 | [Domain 状态矩阵](docs/protocol/README.md) |
| 协议维护者 | 从业务需求、flow、草案推进到 registry/generated | [如何使用这个仓库](docs/guides/how-to-use.md) |
| Runtime / SDK 实现者 | 接入握手、RPC、事件、STREAM，并绑定 spec 版本 | [研发接入 Quickstart](docs/guides/quickstart.md) |
| 测试 / Conformance | 验证 runtime 行为是否符合协议 | [Conformance 主文档](docs/conformance/README.md) |
| Legacy 迁移负责人 | 将旧协议映射到 AXTP domain / feature / method / event | [Legacy 迁移](docs/legacy-migration/README.md) |
| 发布负责人 | 发布 spec tag，并同步 release artifact 与 runtime lock | [发布文档](docs/release/README.md) |

## 为什么是 AXTP？

| 设计原则 | 对生态的价值 |
|---|---|
| CONTROL / RPC / STREAM 分层 | CONTROL 处理建连、保活和关闭；RPC 处理会话、请求、响应和事件；STREAM 承载音视频、文件、OTA 等连续数据。 |
| 面向多传输介质 | 同一套协议模型可映射到 WebSocket JSON、TCP、USB HID、BLE、UART 和 mock transport；不同 transport profile 可以有不同帧尺寸、可靠性和编码约束。 |
| Registry-first 单一事实源 | domain、method、event、error、schema、capability、profile 由 YAML 维护，并通过 Generator 输出 Protocol IR、generated reference、测试向量和 runtime 消费输入。 |
| `requestId` 并发安全 | RPC 响应通过 `requestId` 关联请求，不依赖到达顺序，慢调用、重试和乱序响应不会污染会话状态。 |
| Conformance-first | Runtime 不只“能跑”，还必须通过统一 conformance case，确保 C / C++ / TypeScript / Flutter / Python / mock server 行为一致。 |
| Legacy 可追溯迁移 | `docs/legacy-migration/**` 保存旧协议证据、分类和迁移计划；只有经过评审采纳后才进入 active spec contract。 |

## 多语言生态

| 仓库 | 角色 | 绑定方式 | 状态 | 适用场景 |
|---|---|---|---|---|
| [axtp](https://github.com/Mostorm-Labs/axtp) | Core spec | Single Source of Truth | active | 协议规范、registry、Generator、conformance、release governance |
| [axtp-c-runtime](https://github.com/Mostorm-Labs/axtp-c-runtime) | C runtime | `AXTP_SPEC.lock.yaml` / spec tag / commit | planned/active to verify | MCU、低资源设备、固件侧基础 runtime |
| [axtp-cpp-runtime](https://github.com/Mostorm-Labs/axtp-cpp-runtime) | C++ runtime | `AXTP_SPEC.lock.yaml` / spec tag / commit | planned/active to verify | Linux / Android 主控、native 控制服务、音视频底层 |
| [axtp-ts-runtime](https://github.com/Mostorm-Labs/axtp-ts-runtime) | TypeScript runtime | `AXTP_SPEC.lock.yaml` / spec tag / commit | planned/active to verify | Web、Node.js、管理后台、云端服务 |
| [axtp-flutter-runtime](https://github.com/Mostorm-Labs/axtp-flutter-runtime) | Flutter runtime | `AXTP_SPEC.lock.yaml` / spec tag / commit | planned/active to verify | iOS / Android App |
| [axtp-python-runtime](https://github.com/Mostorm-Labs/axtp-python-runtime) | Python runtime | `AXTP_SPEC.lock.yaml` / spec tag / commit | planned/active to verify | 自动化测试、AI agent、工具脚本 |
| [axtp-mock-server](https://github.com/Mostorm-Labs/axtp-mock-server) | Mock server | `AXTP_SPEC.lock.yaml` / spec tag / commit | planned/active to verify | 联调、conformance、虚拟设备、原型验证 |

## 最小使用路径

### Runtime / SDK 实现者

1. 阅读 [研发接入 Quickstart](docs/guides/quickstart.md)，先跑通 WebSocket JSON 的 Hello / Identify / Identified / Request / Response。
2. 从 [generated 协议参考](docs/generated/protocol.md)、`docs/generated/protocol.json` 或 `protocol/axtp.protocol.yaml` 读取当前可实现合同。
3. 按 [Conformance 主文档](docs/conformance/README.md) 声明 runtime 支持等级并执行匹配 case。
4. 在 runtime 仓库记录 `AXTP_SPEC.lock.yaml`，绑定 spec tag、明确 commit 或 release artifact。

### 协议维护者

1. 从 `docs/business/` 或 `docs/flows/` 捕获需求和交互场景。
2. 在 `docs/protocol/<domain>/<domain.feature>.md` 起草或修订 domain.feature 草案。
3. 评审通过后，将已接受事实写入 `registry/` 或 `registry/domains/`。
4. 运行 Generator 和校验，刷新 `protocol/axtp.protocol.yaml`、`docs/generated/*`、测试向量和 snapshots。
5. 当行为合同变化时，同步 conformance 或 release 输入。

### 产品 / 架构

1. 查看 [Domain 状态矩阵](docs/protocol/README.md)，确认哪些 domain 已 generated，哪些仍是 draft。
2. 对未覆盖能力补充 `docs/business/` 需求或 `docs/flows/` 交互流。
3. 与协议维护者确认 domain.feature 边界、优先级和采纳路径。

## 事实源等级

AXTP 仓库中不是所有文档都具有同等约束力。草案、flow 和 legacy 证据可以指导评审，但不能直接当作 runtime 实现合同。

| 层级 | 位置 | 是否可作为 runtime 实现依据 | 说明 |
|---|---|---:|---|
| 业务输入 | `docs/business/` | 否 | 产品需求、PRD、原始场景、现场反馈。 |
| 交互流程 | `docs/flows/` | 否 | 场景时序图和业务到协议的交互流。 |
| RFC / 草案 | `docs/protocol/` | 仅可用于评审和 mock | 采纳前的候选 method/event/schema/error/capability/profile。 |
| 正式规范 | `docs/specs/` | 是 | wire、session、registry、codec、tooling、versioning 的人工维护规则。 |
| Registry 事实 | `registry/`、`registry/domains/` | 是 | 机器可读 method/event/schema/error/capability/profile 事实源。 |
| 协议 IR | `protocol/axtp.protocol.yaml` | 是 | Generator 聚合后的 Protocol IR。 |
| Generated 参考 | `docs/generated/` | 是，但不可手写 | 人读和机器读的 generated 协议参考。 |
| Conformance | `docs/conformance/` | 是 | Runtime 行为验收输入。 |
| Legacy 迁移 | `docs/legacy-migration/` | 否 | 证据、分类、迁移计划和候选映射，采纳前不是正式合同。 |

如果 specs 表格、YAML 和 generated 输出冲突，应修正事实源或规范规则后重新生成，不要维护第二套活跃事实。

## 仓库地图

```text
axtp/
├── README.md                    # 仓库总入口：AXTP 是什么、谁该读哪里
├── ROADMAP.md                   # 规划里程碑，不等同于 spec release version
├── KICKOFF.md                   # 面向研发启动会的 Why / What / How
├── docs/
│   ├── README.md                # 文档地图：合同等级、角色路径、手写边界
│   ├── business/                # 业务输入，不是协议合同
│   ├── flows/                   # 业务交互流，连接需求与协议草案
│   ├── protocol/                # domain.feature 草案与 REVIEW 状态
│   ├── specs/                   # 人工维护的核心规范
│   ├── generated/               # 自动生成的实现参考，不手写修改
│   ├── conformance/             # runtime 一致性验收输入
│   ├── legacy-migration/        # 老协议证据、分类和迁移映射
│   ├── release/                 # spec tag、artifact、runtime 对齐说明
│   ├── guides/                  # quickstart、how-to-use、runtime checklist
│   └── dev/                     # 维护者 / agent 工作流与 skills
├── registry/                    # YAML 事实源：core、domains、methods、events、errors
├── protocol/                    # 聚合后的协议 IR，例如 axtp.protocol.yaml
├── generators/                  # Generator 实现和测试
├── tooling/                     # legacy 分类、迁移、测试向工具
├── scripts/                     # validate / generate / release 辅助脚本
└── .github/workflows/           # CI、release、artifact 自动化
```

## 标准协议 SOP

| 步骤 | 动作 | 输出 |
|---:|---|---|
| 1 | 在 `docs/business/` 捕获需求。 | 人读业务来源。 |
| 2 | 当行为跨多条消息或多个角色时，在 `docs/flows/` 描述交互。 | 场景级协议流。 |
| 3 | 在 `docs/protocol/<domain>/<domain.feature>.md` 编写或更新 RFC。 | 可评审协议草案。 |
| 4 | 评审命名、schema、method、event、error、capability、profile 和兼容性。 | 已接受协议决策。 |
| 5 | 将已接受事实采纳到 `registry/` 或 `registry/domains/`。 | 机器可读事实源。 |
| 6 | 运行 Generator 和校验脚本。 | `protocol/axtp.protocol.yaml`、`docs/generated/*`、snapshots、test vectors。 |
| 7 | 当行为变化时更新 conformance 或 release 输入。 | Runtime 可验证协议合同。 |
| 8 | Runtime 仓库消费 spec tag、明确 commit 或 generated artifact。 | 可复现的语言 runtime 实现。 |

协议变更不应从 runtime 代码开始。Runtime 仓库是 spec 消费方，不是独立协议事实源。

## 协议维护者 / Generator 快速开始

本节面向协议维护者和 Generator 操作。Runtime / SDK 实现者不需要先运行 generate；请先阅读 [研发接入 Quickstart](docs/guides/quickstart.md)，并从已生成的协议参考和 conformance 输入开始实现。

安装 Generator 依赖：

```bash
pnpm --dir generators install
```

构建并校验 source model：

```bash
pnpm --dir generators build
pnpm --dir generators validate:sources
```

重新生成协议输出：

```bash
pnpm --dir generators generate
pnpm --dir generators validate:protocol
```

运行 Generator 测试和 conformance 校验：

```bash
pnpm --dir generators test
scripts/validate-conformance.sh
```

构建本地 spec artifact：

```bash
scripts/build-spec-artifact.sh "$(scripts/print-spec-version.sh)"
```

## 版本与发布

AXTP 使用两类版本标识：

| 类型 | 示例 | 用途 |
|---|---|---|
| Spec tag | `spec/v0.0.4` | 可发布、可锁定、runtime 仓库消费的协议快照。 |
| Roadmap milestone | `v0.1` / `v0.2` / `v1.0` | 功能完成度规划，不作为 runtime 依赖版本。 |

Runtime 仓库必须绑定明确的 spec tag、明确 commit 或 release artifact，并通过 `AXTP_SPEC.lock.yaml` 记录。不要为了可复现 release 依赖浮动 `main`。

发布流程见 [docs/release/README.md](docs/release/README.md)，规划阶段见 [ROADMAP.md](ROADMAP.md)。

## 导航

| 需求 | 阅读入口 |
|---|---|
| 第一次理解仓库 | [docs/README.md](docs/README.md) |
| 阅读正式规范 | [docs/specs/README.md](docs/specs/README.md) |
| 理解核心协议 | [docs/specs/1-core/01-Overview.md](docs/specs/1-core/01-Overview.md) |
| 研发最短接入 | [docs/guides/quickstart.md](docs/guides/quickstart.md) |
| 实用使用指南 | [docs/guides/how-to-use.md](docs/guides/how-to-use.md) |
| generated 协议参考 | [docs/generated/protocol.md](docs/generated/protocol.md) |
| 协议 RFC 工作流 | [docs/protocol/README.md](docs/protocol/README.md) |
| 维护者 skills | [docs/dev/skills/README.md](docs/dev/skills/README.md) |
| Conformance cases | [docs/conformance/README.md](docs/conformance/README.md) |
| 发布治理 | [docs/release/README.md](docs/release/README.md) |
| Legacy 迁移 | [docs/legacy-migration/README.md](docs/legacy-migration/README.md) |
| Roadmap | [ROADMAP.md](ROADMAP.md) |

## Governance Guardrails

- 不手写 `docs/generated/**`、`protocol/axtp.protocol.yaml` 或 runtime generated 产物。
- 不把 `docs/business/`、`docs/flows/`、`docs/protocol/` 草案直接当正式实现合同。
- 新增 domain / feature / method / event 必须能追溯到 `docs/flows/` 或 `docs/protocol/` 中的评审记录。
- Registry patch 不得绕过 protocol review；语义边界变化必须先进入草案或 flow。
- 修改 `registry/**` 或 `registry/domains/**` 后必须运行 validate/generate，并同步 conformance 或说明为何不需要。
- Runtime 行为以 `docs/specs/`、`registry/`、`protocol/axtp.protocol.yaml`、`docs/generated/` 和 `docs/conformance/` 为准。
- Runtime 仓库必须绑定 spec tag、明确 commit 或 release artifact，不依赖浮动 `main`。

## 贡献边界

| 应该做 | 不应该做 |
|---|---|
| 将原始需求放入 `docs/business/`。 | 把业务说明当成 runtime 合同。 |
| 将可评审提案放入 `docs/protocol/`。 | 为新行为跳过 RFC 评审直接写 registry。 |
| 将已接受事实放入 `registry/` 和 `registry/domains/`。 | 在 runtime 仓库里维护并行协议常量。 |
| 事实变更后重新生成 `protocol/axtp.protocol.yaml` 和 `docs/generated/*`。 | 手写 generated 协议产物。 |
| 将语言专属 API 设计放在 runtime 仓库。 | 把 C/C++/Flutter/TS/Python 专属 API 文档加回 core repo。 |
| Runtime 构建使用 spec tag 或明确 commit。 | 为可复现 runtime release 依赖浮动的 `main`。 |

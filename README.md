# AXTP

```text
     _    __  __  _______  ___
    / \   \ \/ /  |_   _| | __ \
   / _ \   >  <     | |   |  __/
  /_/ \_\ /_/\_\    |_|   |_|

  Auditoryworks Transport Protocol
  CONTROL. RPC. STREAM. Single Source of Truth.
```

## AXTP 是什么

AXTP（Auditoryworks Transport Protocol）是面向智能硬件、音视频设备、多端 SDK 的统一通信协议规范。

它把设备通信拆成三条稳定通道：

| 通道 | 负责什么 |
|---|---|
| `CONTROL` | Standard Framed 连接建立、协商、心跳和关闭。 |
| `RPC` | Hello / Identify / Request / Response / Event 等业务控制面。 |
| `STREAM` | audio/video 等连续数据面。 |

本仓库是 AXTP 的协议产品入口和 Single Source of Truth：对研发是 spec 合同中心，对产品是能力状态看板，对测试是 conformance 验收入口。本仓库维护 spec、registry、Protocol IR、generated reference、conformance、release governance 和 legacy 迁移材料，不承载具体语言 runtime；C / C++ / TypeScript / Flutter / Python runtime 应在各自仓库中通过 spec tag、明确 commit 或 release artifact 消费这里的协议合同。

## 为什么需要 AXTP

| 旧协议痛点 | AXTP 的解决方式 |
|---|---|
| 协议事实分散在 Word、Excel、固件宏、客户端常量和测试脚本里。 | 用 `registry/`、`protocol/axtp.protocol.yaml` 和 `docs/generated/` 建立可生成、可校验的事实链。 |
| HID、TCP、WebSocket、HTTP、BLE 等传输形态割裂。 | 用 transport profile 表达承载差异，业务语义保持一致。 |
| 命令表适合简单 command，不擅长事件、流、能力声明和复杂会话。 | 用 `CONTROL` / `RPC` / `STREAM` 分离连接控制、业务调用和连续数据。 |
| 多语言 SDK / runtime 容易各自理解协议。 | 用 generator、Protocol IR、generated reference 和 spec lock 统一输入。 |
| 测试介入晚，联调时才发现字段、错误码、事件时机不一致。 | 用 `docs/conformance/**` 作为 runtime 行为验收入口。 |

## 最小协议模型

AXTP 当前有两条生产路径：

| 路径 | 线上模型 | 用途 |
|---|---|---|
| WebSocket Unframed JSON | RPC-only：Hello / Identify / Identified / Request / Response / Event。 | App、Web、Node、Python、WS-only mock、云端控制面快速接入。 |
| Standard Framed | `CONTROL OPEN / ACCEPT` 后承载 `RPC` 和 `STREAM`。 | TCP、USB HID、设备端 runtime、audio/video 连续数据。 |

README 不展开完整 wire format。协议分层先读 [Core Overview](docs/specs/1-core/01-Overview.md)；研发联调路径见 [Runtime / SDK Guide](docs/guides/runtime.md)。

## 你是谁？从这里开始

| 角色 | 你要解决的问题 | 入口 |
|---|---|---|
| 第一次了解 AXTP 的新人 | 先知道 AXTP 是什么、仓库里哪些内容可信。 | [文档地图](docs/README.md)、[Core Overview](docs/specs/1-core/01-Overview.md)、[Glossary](docs/specs/0-principles/01-Glossary.md) |
| Runtime / SDK 实现者 | 从正式合同实现握手、RPC、事件、STREAM，并绑定版本。 | [Runtime / SDK Guide](docs/guides/runtime.md)、[Conformance](docs/conformance/README.md) |
| 协议维护者 | 从需求、flow、草案推进到 registry、generated、release。 | [Protocol Maintainer Guide](docs/guides/protocol-maintainer.md)、[Protocol Draft Intake](docs/protocol/README.md) |
| 产品 / 架构负责人 | 看 domain 状态、能力边界、优先级和协议缺口。 | [Product / Architecture Guide](docs/guides/product.md)、[Product Domain Status](docs/product/domain-status.md) |
| 测试 / conformance 负责人 | 按 runtime 声明的能力等级验收实现行为。 | [Testing / Conformance Guide](docs/guides/testing.md)、[Conformance 主文档](docs/conformance/README.md) |
| Legacy 迁移负责人 | 从旧协议证据、分类和计划追踪迁移进度。 | [Legacy Migration Guide](docs/guides/legacy-migration.md)、[Migration Dashboard](docs/legacy-migration/MIGRATION_DASHBOARD.md) |

完整文档地图见 [docs/README.md](docs/README.md)。

## 当前实现合同在哪里

Runtime / SDK 实现者应该依赖：

| 合同 | 路径 |
|---|---|
| Protocol IR | [protocol/axtp.protocol.yaml](protocol/axtp.protocol.yaml) |
| Generated Markdown | [docs/generated/protocol.md](docs/generated/protocol.md) |
| Generated JSON | [docs/generated/protocol.json](docs/generated/protocol.json) |
| 人工规范 | [docs/specs/](docs/specs/README.md) |
| 行为验收 | [docs/conformance/](docs/conformance/README.md) |

Runtime / SDK 实现者不应依赖：

| 非实现合同 | 为什么不能直接实现 |
|---|---|
| `docs/business/**` | 业务输入和需求背景。 |
| `docs/flows/**` | 场景交互设计和协议缺口分析。 |
| `docs/protocol/**` draft | 人工草案和评审输入，采纳前不是合同。 |
| `docs/legacy-migration/**` | 旧协议证据、分类和迁移计划。 |
| `ROADMAP.md` | 规划材料，不是可绑定 spec。 |
| `KICKOFF.md` | 研发启动宣讲材料，不是协议合同。 |

完整合同等级和冲突处理规则只维护在 [连接建立边界与协议事实源边界](docs/architecture/protocol-lifecycle-boundaries.md)。

## 仓库地图

```text
axtp/
├── README.md                    # 仓库总入口
├── ROADMAP.md                   # 规划材料，不是 runtime 合同
├── KICKOFF.md                   # kickoff 宣讲材料，不是协议合同
├── docs/
│   ├── README.md                # 文档地图
│   ├── guides/                  # 产品、runtime、测试、协议维护、legacy 迁移的唯一人类入口
│   ├── business/                # 业务输入，不是协议合同
│   ├── flows/                   # 场景流程，不是协议合同
│   ├── product/                 # 产品能力状态和采纳优先级
│   ├── protocol/                # human-written protocol drafts
│   ├── specs/                   # 人工维护规范
│   ├── generated/               # generated reference，不手写
│   ├── conformance/             # runtime 验收输入
│   ├── legacy-migration/        # 旧协议证据、分类和迁移
│   ├── architecture/            # 架构边界和治理原则
│   ├── release/                 # spec tag 与 release governance
│   └── dev/                     # lifecycle skills
├── registry/                    # YAML 事实源
├── protocol/                    # generated Protocol IR
├── generators/                  # Generator 实现
├── tooling/                     # 测试向量、迁移和辅助工具
├── scripts/                     # validate / release 辅助脚本
└── .github/workflows/           # CI 和 release automation
```

特别注意：`docs/protocol/` 是草案目录；根目录 `protocol/` 是 generated Protocol IR；`docs/generated/` 是 generated reference，不能手写。

## 强约束

- 不手写 `docs/generated/**`、`protocol/axtp.protocol.yaml` 或 runtime generated 产物。
- 不从 `docs/protocol/**` 草案实现 runtime；只有明确 mock/prototype 例外。
- 不绕过 protocol review 直接改 registry。
- Runtime 必须绑定 spec tag、明确 commit 或 release artifact，不依赖浮动 `main`。
- Conformance 是 runtime 行为验收入口。
- Generator、发布和协议维护流程见 [Protocol Maintainer Guide](docs/guides/protocol-maintainer.md) 与 [Release 文档](docs/release/README.md)。

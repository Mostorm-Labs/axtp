# AXTP

AXTP（Auditoryworks Transport Protocol）是一套面向设备控制、事件通知和连续数据流的传输无关协议框架。本仓库维护 AXTP 的规范、协议事实源、Generator、生成产物、C++ runtime/SDK 和调试工具。

AXTP 的核心约定是：协议事实先被评审采纳到 YAML，再由 Generator 生成所有机器消费产物。不要手写生成文件。

```text
业务需求 / 旧协议材料
  -> docs/protocol/<domain>/<domain.feature>.md
  -> 评审采纳 + docs/specs/08-13 反向确认
  -> registry/**/*.yaml + registry/domains/**/*.yaml
  -> protocol/axtp.protocol.yaml
  -> docs/generated/* + tooling/* + runtime generated headers
```

## Quick Links

| 目标 | 文档 |
|---|---|
| 仓库使用教程和具体例子 | [docs/how-to-use/AXTP_How_To_Use.md](docs/how-to-use/AXTP_How_To_Use.md) |
| 研发 kickoff 讲解材料 | [docs/kickoff/AXTP_R&D_Kickoff.md](docs/kickoff/AXTP_R&D_Kickoff.md) |
| 协议总览 | [docs/specs/00-AXTP-Overview.md](docs/specs/00-AXTP-Overview.md) |
| Frame / Payload 规范 | [docs/specs/02-AXTP-Frame-and-Payload-Spec.md](docs/specs/02-AXTP-Frame-and-Payload-Spec.md) |
| Transport Profiles | [docs/specs/03-AXTP-Transport-Profiles.md](docs/specs/03-AXTP-Transport-Profiles.md) |
| 业务草案流程 | [docs/protocol/README.md](docs/protocol/README.md) |
| 生成后的协议参考 | [docs/generated/protocol.md](docs/generated/protocol.md) |
| C++ runtime 架构 | [runtimes/cpp-core/ARCHITECTURE.md](runtimes/cpp-core/ARCHITECTURE.md) |
| C++ SDK 设计 | [docs/dev/AXTP_SDK_API_DESIGN.md](docs/dev/AXTP_SDK_API_DESIGN.md) |
| `axtpctl` 设计 | [docs/dev/AXTPCTL_COMMAND_DESIGN.md](docs/dev/AXTPCTL_COMMAND_DESIGN.md) |

## Repository Layout

| 路径 | 作用 | 手动维护 |
|---|---|---:|
| `docs/specs/` | AXTP 规范和治理规则，包含 wire format、transport、registry、Generator 规则 | 是 |
| `docs/protocol/` | 业务协议草案与评审输入，不是 Generator 机器输入 | 是 |
| `registry/` | 已采纳的核心协议事实源 | 是 |
| `registry/domains/` | 已采纳的业务域协议事实源 | 是 |
| `generators/` | TypeScript Generator，将 YAML 事实源生成正式产物 | 是 |
| `protocol/axtp.protocol.yaml` | Generator 聚合得到的 Protocol IR | 否 |
| `docs/generated/` | 生成后的协议参考文档和 JSON | 否 |
| `tooling/mcp/`、`tooling/test-vectors/` | 生成后的工具 JSON 和测试向量 | 否 |
| `runtimes/cpp-core/` | C++ protocol core/runtime，`include/axtp/generated/` 除外 | 部分 |
| `runtimes/cpp-sdk/` | C++ 应用层 SDK | 部分 |
| `runtimes/cpp-tools/axtpctl/` | AXTP CLI 调试工具 | 是 |

## Protocol Model

AXTP 分为五层：Transport 负责连接和字节传输，Frame 负责边界、长度、分片和 CRC，Payload 只分发 CONTROL/RPC/STREAM，Registry 定义 method/event/error/schema/capability/profile，Business 实现真实设备业务逻辑。

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

业务类型不要进入 Frame Header 或顶层 PayloadType。比如 OTA、音视频、日志和文件块应通过 RPC 建立业务语义，再用 STREAM 承载连续数据。

## Protocol Workflow

当前仓库按四个阶段维护协议：

| 阶段 | Skill / 入口 | 输入 | 输出 |
|---|---|---|---|
| 路由 | [axtp-protocol-workflow](docs/dev/skills/axtp-protocol-workflow/SKILL.md) | 不确定处于哪个阶段的需求 | 明确应该起草、采纳、生成还是实现 |
| 起草 | [draft-business-protocol](docs/dev/skills/draft-business-protocol/SKILL.md) | 产品需求、架构草图、旧协议线索 | `docs/protocol/<domain>/<domain.feature>.md` |
| 采纳 | [adopt-protocol-draft](docs/dev/skills/adopt-protocol-draft/SKILL.md) | 已评审确认的草案 | `docs/specs/08-13` 对齐记录 + `registry/**/*.yaml` / `registry/domains/**/*.yaml` |
| 生成 | [generate-axtp-protocol](docs/dev/skills/generate-axtp-protocol/SKILL.md) | 已更新的 YAML 事实源 | Protocol IR、generated docs、tooling JSON、test vectors、runtime generated headers |

`docs/specs/08-13` 是协议治理和规范说明，`docs/protocol/**` 是草案与评审记录，`registry/**/*.yaml` 与 `registry/domains/**/*.yaml` 才是 Generator 的机器输入。仓库不要求研发照着 Markdown 手工填写生成产物；草案到 YAML 的采纳动作由 `adopt-protocol-draft` 固化流程，YAML 到产物的动作由 `generate-axtp-protocol` 完成。

## Quick Start

安装 Generator 依赖：

```bash
pnpm --dir generators install
```

构建并校验协议事实源：

```bash
pnpm --dir generators build
pnpm --dir generators validate:sources
```

重新生成协议产物：

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

如果本机 `pnpm` 因依赖构建审批阻塞脚本，可临时加上：

```bash
--config.verify-deps-before-run=false
```

## Source Boundaries

可以手动修改：

- `docs/specs/**`
- `docs/protocol/**`
- `docs/how-to-use/**`
- `docs/kickoff/**`
- `registry/**/*.yaml`
- `registry/domains/**/*.yaml`
- `generators/src/**`
- `runtimes/**` 中非 generated 的代码

不要手动修改：

- `protocol/axtp.protocol.yaml`
- `docs/generated/**`
- `tooling/mcp/*.generated.json`
- `tooling/test-vectors/**`
- `runtimes/*/generated/**`
- `runtimes/cpp-core/include/axtp/generated/**`
- `generators/src/__snapshots__/**`

生成结果不符合预期时，应回到草案、specs、YAML 事实源或 Generator 逻辑修正，再重新生成。

## Current Snapshot

当前生成协议包含：

| 类型 | 数量 / 内容 |
|---|---|
| Methods | 10 |
| Events | 7 |
| Errors | 154 |
| Profiles | `AXTP-MVP`、`AXTP-MVP-HID`、`AXTP-HID-MEDIA` |
| Transports | `AXTP-USB-HID`、`AXTP-TCP`、`AXTP-WS-JSON`、`AXTP-WS-CLOUD-REVERSE` |

以 [docs/generated/protocol.md](docs/generated/protocol.md) 和 [docs/generated/protocol.json](docs/generated/protocol.json) 作为研发、测试和工具集成的当前协议参考。

## Development Notes

- 新业务先进入 `docs/protocol/<domain>/<domain.feature>.md` 草案，不直接写 generated 产物。
- 评审完成后再采纳到 YAML；有 `[REVIEW-ASK]`、`[REVIEW-FIX]` 或 `[REVIEW-BLOCKER]` 的事实不得进入 YAML。
- 新增或修改 YAML 后必须运行 Generator，让协议文档、工具 JSON、测试向量和 runtime generated headers 保持一致。
- C++ runtime 推荐从 `AxtpEndpoint + BasicBroker<>` 接入；应用层 SDK 使用方式见 [docs/dev/AXTP_SDK_API_DESIGN.md](docs/dev/AXTP_SDK_API_DESIGN.md)。

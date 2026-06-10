# 第一次了解 AXTP 的新人入口

你只需要先建立三个判断：

1. AXTP 是协议规范，不是某一个语言 runtime。
2. AXTP 主仓库是协议事实源，runtime 仓库是消费方。
3. `docs/protocol/` 是草案，不是正式实现合同。

## 先理解什么

AXTP 用一套统一模型描述智能硬件、音视频设备和多端 SDK 的通信方式。

最小模型是：

| 概念 | 含义 |
|---|---|
| `CONTROL` | Standard Framed 连接控制：OPEN / ACCEPT / HEARTBEAT / CLOSE。 |
| `RPC` | 业务控制面：Hello / Identify / Request / Response / Event。 |
| `STREAM` | 连续数据面：audio/video 等大块或连续数据。 |

WebSocket JSON 路径通常只跑 `RPC`。TCP / USB HID 等 Standard Framed 路径会先跑 `CONTROL`，再承载 `RPC` 和 `STREAM`。

## 推荐阅读顺序

| 顺序 | 文档 | 读它的目的 |
|---:|---|---|
| 1 | [../../README.md](../../README.md) | 了解 AXTP 是什么、仓库角色和强约束。 |
| 2 | [../specs/00-Glossary.md](../specs/00-Glossary.md) | 统一 `CONTROL`、`RPC`、`STREAM`、Session、Frame 等术语。 |
| 3 | [../specs/1-core/01-Overview.md](../specs/1-core/01-Overview.md) | 看懂核心分层和两条连接路径。 |
| 4 | [../guides/quickstart.md](../guides/quickstart.md) | 用最短路径跑通 Hello / Identify / Request / Response。 |
| 5 | [../generated/protocol.md](../generated/protocol.md) | 查看当前已经生成、可实现的协议参考。 |

## 不要从哪里开始

| 不建议入口 | 原因 |
|---|---|
| `docs/protocol/**` | 这里是草案和评审输入，采纳前不能代表当前协议合同。 |
| `docs/business/**` | 这里是需求和背景，不是 wire format 或 runtime 行为规范。 |
| `docs/legacy-migration/**` | 这里是旧协议证据和迁移计划，不是新协议事实源。 |
| `registry/**` | 新人第一步直接读 YAML 成本高，先看 overview 和 generated reference。 |

## 常见误区

| 误区 | 正确认知 |
|---|---|
| AXTP 等于 WebSocket JSON。 | WebSocket JSON 是其中一个 transport profile，只承载 RPC-only 路径。 |
| AXTP 等于某个 C++/TS runtime。 | runtime 是协议消费者，主仓库定义 spec、registry、generated 和 conformance。 |
| `Session` 就是 TCP 连接。 | AXTP 至少区分 framed link context 和 RPC `sid`。 |
| 草案里写了方法名就能实现。 | 只有进入 registry 并 generated 后，runtime 才能当合同实现。 |

## 下一步动作

如果你是研发，先按 [Quickstart](../guides/quickstart.md) 跑通 WebSocket JSON。

如果你是产品或架构，转到 [产品 / 架构入口](product-architecture.md)。

如果你是 runtime 实现者，转到 [Runtime / SDK 入口](runtime-implementer.md)。

如果你要改协议，转到 [协议维护者入口](protocol-maintainer.md)。

## 读完后的检查清单

读完新人路径后，你应该能回答：

| 问题 | 期望答案 |
|---|---|
| AXTP 主仓库是不是 runtime 仓库？ | 不是，主仓库是协议事实源。 |
| WebSocket JSON 是否有 CONTROL？ | 没有，它是 RPC-only 路径。 |
| Standard Framed 先发什么？ | 先走 `CONTROL OPEN / ACCEPT`，再进入 RPC。 |
| `docs/protocol/` 能否直接实现？ | 不能，它是草案和评审区。 |
| 当前可实现的业务方法在哪里看？ | 看 `docs/generated/protocol.md` 或 `docs/generated/protocol.json`。 |

如果这些问题还不清楚，先不要进入 YAML 或草案细节，回到 [Core Overview](../specs/1-core/01-Overview.md) 和 [Quickstart](../guides/quickstart.md)。

## 最小词汇表

| 词 | 先这样理解 |
|---|---|
| `sid` | RPC session id，JSON 中是固定 8 位 hex string。 |
| `op` | RPC envelope 的操作码。 |
| `requestId` | 一次请求和响应的匹配 id。 |
| `streamId` | 一路连续数据流的 id。 |
| `PayloadType` | Standard Framed 中区分 `CONTROL` / `RPC` / `STREAM` 的类型。 |

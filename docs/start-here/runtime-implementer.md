# Runtime / SDK 实现者入口

Runtime / SDK 的目标不是重新定义 AXTP，而是按主仓库给出的合同实现、声明能力，并通过 conformance。

核心规则：

```text
Runtime / SDK 只能从 generated、Protocol IR、specs、conformance 实现。
Runtime / SDK 不得实现 draft-only docs/protocol/**。
```

## 先理解什么

| 概念 | 对 runtime 的含义 |
|---|---|
| Spec lock | 记录当前 runtime 绑定的 AXTP spec tag、明确 commit 或 release artifact。 |
| Protocol IR | `protocol/axtp.protocol.yaml`，机器可读协议模型。 |
| Generated reference | `docs/generated/protocol.md` 和 `.json`，人读和工具读的当前合同。 |
| Specs | `docs/specs/**`，wire、session、codec、registry、tooling 规则。 |
| Conformance | `docs/conformance/**`，runtime 行为验收输入。 |

发布期 runtime 不能依赖浮动 `main`。开发期可以指向本地 checkout，但 release 必须锁定 spec tag、commit 或 release artifact。

## 推荐阅读顺序

| 顺序 | 文档 | 读它的目的 |
|---:|---|---|
| 1 | [../guides/quickstart.md](../guides/quickstart.md) | 先跑通最小 WebSocket JSON 或 Standard Framed 路径。 |
| 2 | [../generated/protocol.md](../generated/protocol.md) | 查看当前可实现 method、event、schema、error。 |
| 3 | [../../protocol/axtp.protocol.yaml](../../protocol/axtp.protocol.yaml) | 读取机器可消费 Protocol IR。 |
| 4 | [../specs/1-core/01-Overview.md](../specs/1-core/01-Overview.md) | 建立 core 分层模型。 |
| 5 | [../specs/1-core/03-Frame-and-Payload.md](../specs/1-core/03-Frame-and-Payload.md) | Standard Framed runtime 必读。 |
| 6 | [../specs/1-core/06-RPC-Session.md](../specs/1-core/06-RPC-Session.md) | Hello / Identify / `sid` / `op` / `requestId` 权威规则。 |
| 7 | [../conformance/README.md](../conformance/README.md) | 了解如何按声明能力验收。 |
| 8 | [../guides/runtime-mvp-conformance.md](../guides/runtime-mvp-conformance.md) | 对照 runtime MVP checklist 和排障。 |

## 不要从哪里开始

| 不建议入口 | 原因 |
|---|---|
| `docs/protocol/**` | draft-only 内容可能尚未采纳，不能进入正式 runtime。 |
| `docs/business/**` | 这里描述需求，不描述 runtime wire 行为。 |
| `docs/flows/**` | flow 用于协议评审，不是生成后的合同。 |
| `ROADMAP.md` | roadmap 是规划，不是当前可实现版本。 |

## 实现路径

1. 选择 transport profile：WebSocket JSON 或 Standard Framed。
2. 加载 `protocol/axtp.protocol.yaml` 或 `docs/generated/protocol.json`。
3. 实现 Hello / Identify / Identified 和 session gate。
4. 实现 Request / RequestResponse / Event、标准错误形状和 `requestId` 匹配。
5. Standard Framed runtime 再实现 CONTROL、Frame Header、CRC16 和 STREAM。
6. 声明 conformance level，并运行对应 case。
7. 在 runtime 仓库记录 `AXTP_SPEC.lock.yaml`。

## 常见误区

| 误区 | 正确认知 |
|---|---|
| 先跑 generator 才能开始 runtime。 | runtime 可直接消费主库已生成的 Protocol IR、generated JSON 和 conformance。 |
| `docs/protocol/video/video.stream.md` 有方法表，所以可以实现。 | 草案必须采纳并 generated 后才是 runtime 合同。 |
| WebSocket JSON 也要实现 CONTROL。 | WebSocket JSON 是 RPC-only，不承载 CONTROL 或 STREAM data packet。 |
| 只要能通信就算通过。 | runtime 必须按自己声明的 level 通过 conformance。 |

## 下一步动作

先用 [Quickstart](../guides/quickstart.md) 连接真实设备或 mock server。

没有设备时，先连接 [axtp-mock-server](https://github.com/Mostorm-Labs/axtp-mock-server)。

实现到 MVP 后，用 [Conformance Levels](../conformance/CONFORMANCE_LEVELS.md) 选择声明等级，再按 [Runtime MVP Checklist](../guides/runtime-mvp-conformance.md) 排查。

## 完成定义

一个 runtime 达到最小可交付状态时，至少应该满足：

| 项 | 标准 |
|---|---|
| Spec lock | 有明确 spec tag、commit 或 release artifact。 |
| Protocol loading | 能加载 Protocol IR 或 generated JSON。 |
| Session | 能完成 Hello / Identify / Identified。 |
| RPC | 能完成 generated method 的 Request / RequestResponse。 |
| Error | 能返回标准错误形状。 |
| Event | 支持事件或明确声明不支持事件 level。 |
| Conformance | 通过已声明 level 的 required cases。 |

Standard Framed runtime 还应完成：

| 项 | 标准 |
|---|---|
| CONTROL | OPEN / ACCEPT、HEARTBEAT、CLOSE 行为符合 spec。 |
| Frame | Header、PayloadType、payloadLength、fragment、CRC16 解析正确。 |
| STREAM | 如果声明 L2，能处理 STREAM open/data/close P0 case。 |

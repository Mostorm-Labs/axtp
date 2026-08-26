# Runtime / SDK / Firmware 指南

Runtime / SDK / Firmware 的职责是实现和消费 AXTP 已发布 authority，而不是在 consumer 仓库里重新定义协议。

## 1. 先记住 Authority Boundary

```text
实现输入：
release identity
  + canonical registry/specs
  + Protocol IR / generated reference
  + conformance

非实现输入：
workspace/**
  + docs/superpowers/**
  + tooling/skills/**
  + archive/history
```

**任何 `workspace/**` 都不是 runtime implementation authority。** 这一规则与 proposal lifecycle 无关：即使 `workspace/protocol/**` 中一篇 proposal 已经 `lifecycle: accepted`，它仍然只保存 rationale / review / amendment context；真正实现读取 `adoptedBy` 指向的 canonical source 及其 generated projection。

因此 runtime agent 不得：

- 从 accepted proposal 的 prose 复制字段并跳过 registry/generated；
- 从 legacy evidence 推断正式 ID 或 wire layout；
- 从 design plan / agent skill 推断 protocol behavior；
- 用 consumer repo 本地手写表覆盖 AXTP generated registry。

## 2. Spec binding

Release build 必须绑定：

- `spec/vMAJOR.MINOR.PATCH`；或
- 精确 AXTP commit；或
- 可验证的 AXTP release artifact。

不得把浮动 `main` 当作可重现 release dependency。

Runtime 仓库使用 `AXTP_SPEC.lock.yaml` 记录绑定，例如：

```yaml
axtp_spec:
  repository: https://github.com/Mostorm-Labs/axtp
  tag: spec/v0.15.0
  version: 0.15.0
  commit: "<resolved-commit-sha>"
  compatibility: "<runtime-declared-policy>"
  updated_at: "YYYY-MM-DD"
```

这里的 release identity 用于可重现构建；session runtime feature availability 仍由 transport/profile/capability 等协议事实决定，不要把 release SemVer 简化成 feature gate。

## 3. 实现输入

| 输入 | 路径 | 作用 |
|---|---|---|
| Spec lock | runtime repo `AXTP_SPEC.lock.yaml` | 记录绑定基线。 |
| Protocol IR | [../../contract/protocol/axtp.protocol.yaml](../../contract/protocol/axtp.protocol.yaml) | 聚合机器协议模型。 |
| Generated JSON | [../../contract/generated/protocol.json](../../contract/generated/protocol.json) | SDK、mock、automation 消费。 |
| Generated Markdown | [../../contract/generated/protocol.md](../../contract/generated/protocol.md) | 人工联调/字段核对。 |
| Canonical registry | `../../contract/registry/**` | canonical machine facts。 |
| Specs | [../../specs/README.md](../../specs/README.md) | wire/session/registry/codec normative context。 |
| Conformance | [../../conformance/README.md](../../conformance/README.md) | runtime behavior acceptance。 |
| Release docs | [../../release/README.md](../../release/README.md) | tag/artifact/update flow。 |

通常 runtime 实现优先消费 Protocol IR / generated JSON，而不是直接解析 proposal 或手写 YAML 镜像。

## 4. Transport 接入路径

| 路径 | 用途 | 最短启动顺序 |
|---|---|---|
| AXTP-TCP Standard Framed | 二进制 Frame / STREAM、跨 runtime 互操作基准 | connect -> CONTROL OPEN/ACCEPT -> Hello/Identify/Identified -> generated RPC/STREAM |
| AXTP-USB-HID | USB HID 高速设备/固件路径 | HID connect -> CONTROL OPEN/ACCEPT -> RPC/STREAM |
| AXTP-WS-JSON | App/Web/Cloud 的 RPC-only 控制面 | WebSocket open -> Hello/Identify/Identified -> Request/Response/Event |

当前跨 runtime 推荐基准仍是 **AXTP-TCP Standard Framed + Node mock server**。WebSocket JSON 不承载 Standard Frame、CONTROL、CRC16 或 STREAM。

## 5. 最短实现步骤

1. 锁定 AXTP spec tag/commit/artifact。
2. 选择 runtime 声明支持的 transport/profile。
3. 加载 Protocol IR 或 generated registry。
4. 实现对应 link/session gate：Standard Framed 包含 CONTROL OPEN/ACCEPT；WS JSON 直接进入 RPC session。
5. 完成 Hello / Identify / Identified。
6. 实现 Request / RequestResponse / Event 和标准 error behavior。
7. Standard Framed runtime 实现 Frame/CRC/CONTROL/STREAM。
8. 根据 generated capability/profile facts 暴露或降级 optional feature。
9. 运行所声明 conformance scope。
10. 记录 spec lock、runtime version 与 conformance evidence。

## 6. Session 与 capability 边界

完成 `Hello -> Identify -> Identified` 只建立 common RPC baseline，不表示 peer 支持 registry 中全部 optional feature。

Caller 应使用 generated capability/profile facts 判断 optional operation；Receiver 即使 caller 跳过 discovery，也必须执行自己的 support policy：

| 情况 | 行为 |
|---|---|
| method 未注册 | `RPC_METHOD_NOT_FOUND` |
| method 已注册但当前 runtime/device/profile/capability 不提供 | `NOT_SUPPORTED` |
| method 支持但参数非法 | 对应 validation error |
| unknown optional field | 按 spec compatibility 规则容忍/忽略 |
| unsupported/unsubscribed event | 不主动发送 |
| unknown event | 忽略或 diagnostics，不破坏 session |

`Hello.axtpVersion` 是 advisory/diagnostic metadata，不是通用 session admission 或 feature-negotiation gate。Frame Header wire version 则仍是 parser compatibility boundary。

## 7. Standard Framed 基准

```text
Transport connected
  -> CONTROL OPEN
  -> CONTROL ACCEPT
  -> RPC Hello
  -> RPC Identify
  -> RPC Identified
  -> APP_READY
  -> generated Request / Response / Event
  -> optional STREAM according to profile
```

最小要求：

| 项 | 要求 |
|---|---|
| Frame parser | 校验 magic/version/PayloadType/length/fragment facts。 |
| CRC | 使用 canonical Core/Codec authority 定义的覆盖范围和字节序。 |
| CONTROL | OPEN/ACCEPT、HEARTBEAT、CLOSE 等按 Core authority。 |
| RPC session | Identified 前不得发送业务 Request。 |
| Registry lookup | method/event/schema/capability 来自 generated authority。 |
| STREAM | 仅 Standard Framed profile 按已采纳业务 profile 使用。 |

具体 wire/session 字段不要从本指南复制实现，读取 [Core Spec](../../specs/20-core.md) 和 generated protocol。

## 8. WebSocket JSON 快速路径

```text
WebSocket open
  -> Logical Server: Hello
  -> Logical Client: Identify
  -> Logical Server: Identified
  -> APP_READY
  -> generated Request / Response / Event
```

该 profile 是 RPC-only，不实现 Standard Frame Header、CONTROL、CRC16 或 STREAM。

## 9. 验收定义

Runtime 宣称支持某个 AXTP spec/profile 前至少提供：

| Evidence | 标准 |
|---|---|
| Spec lock | tag/commit/artifact 可重现。 |
| Generated binding | 能消费匹配 spec 的 Protocol IR/generated facts。 |
| Session | 对声明 profile 完成正确 session lifecycle。 |
| RPC | Request/Response/Error/Event 行为符合 authority。 |
| Capability degradation | optional unsupported operation 不破坏无关 session。 |
| Conformance | 通过声明 profile/level 的 required cases。 |
| Release trace | runtime version 能追溯到 AXTP spec identity。 |

未来 repository governance 会把这些 downstream 结果回流成 consumer evidence ledger；在存在真实验证结果之前，不得凭版本号或 upgrade PR 自动声称 consumer PASS。

## 10. 深入实现参考

实现型任务推荐顺序：

```text
AXTP_SPEC.lock
   ↓
contract/protocol + contract/generated
   ↓
specs (needed normative context)
   ↓
conformance cases
   ↓
consumer implementation/tests
```

只有在调查设计原因、legacy mapping、开放问题或 protocol amendment 时才进入 `workspace/**`。这既是人类阅读规则，也是 ChatGPT/Codex 等 agent 的 retrieval boundary。

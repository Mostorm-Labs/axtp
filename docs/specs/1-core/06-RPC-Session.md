# 1-core/06《AXTP RPC 会话规范》

> 状态： 规范性 runtime 实现规范
> 规范版本： 1.0.0-rc1
> 变更策略： v1.0.0 前仅允许澄清性修改
> 本文的规范范围：RPC session 建立、`sid/op/d` envelope、Hello/Identify/Identified、Request/Response/Event、事件订阅、RPC 编码和 JSON_BINARY 固定 header。
> 本文不定义：Standard Frame 字段、CONTROL OPEN/ACCEPT 协商、STREAM 数据 payload、业务 method 语义、capability schema 内容、MCP adapter 行为或 legacy CmdValue 映射。
> Runtime 实现状态：所有 AXTP runtime profile 必需实现；CBOR、MSGPACK、RequestBatch、Reidentify、Bye 和高级鉴权方案除非 profile 要求，否则属于可选/未来能力。

版本：v1.0.0-rc1
状态：AXTP v1 Core 冻结候选
适用范围：RPC Payload 结构、op+d Envelope、sid、JSON/CBOR/MSGPACK/JSON_BINARY 编码、MethodId/EventId 映射、Hello/Identify/Request/Response/Event/Batch、`axtpVersion` 兼容校验、RPC Session 鉴权
前置文档：[`02-Protocol-Framework.md`](02-Protocol-Framework.md)、[`03-Frame-and-Payload.md`](03-Frame-and-Payload.md)、[`05-Control-Session.md`](05-Control-Session.md)
后续文档：[`07-Stream-Data-Plane.md`](07-Stream-Data-Plane.md)、Registry 文档

---

## 文档目的

本文定义 AXTP RPC 会话层。RPC 是业务调用和事件层，负责 Hello / Identify / Identified、Request / Response、Event、业务能力发现方法以及事件订阅。协议运行时建连属于 CONTROL；连续数据属于 STREAM。

RPC 可运行在两类路径上：

| 路径 | 线上结构 | 编码 |
|---|---|---|
| WebSocket Unframed JSON | `WebSocket message payload = JSON { sid, op, d }` | 仅 JSON |
| Standard Framed RPC | `Frame(payloadType=RPC) + RPC Payload + CRC16` | JSON / CBOR / MSGPACK / JSON_BINARY |

## 范围

本文覆盖：

- `sid/op/d` envelope；
- RPC op registry；
- `sid` 类型和 JSON/Binary 表达；
- Hello / Identify / Identified 字段和行为；
- Request / RequestResponse / Event 结构；
- eventMasks 订阅规则；
- JSON、CBOR、MSGPACK、JSON_BINARY 编码；
- JSON_BINARY 15B 固定 header；
- RPC 校验和 runtime 要求。

本文不覆盖：

- CONTROL OPEN/ACCEPT TLV；
- STREAM 16B 数据面 header；
- 具体业务 method schema；
- capability registry schema 细节；
- MCP adapter 映射；
- legacy CmdValue adapter 映射。

## v1 必需实现

### Envelope

JSON / CBOR / MSGPACK RPC message 使用：

```json
{ "sid": "12345678", "op": 7, "d": {} }
```

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| `sid` | string | 是 | RPC Session ID；session 分配前为 `""`；Identified 后为固定 8 位 hex 字符 |
| `op` | uint8 | 是 | RPC operation code |
| `d` | object | 是 | op-specific data block；允许空 object |

### 必需 op 集合

Runtime MUST 实现：

| op | 名称 | 方向 | 必需行为 |
|---:|---|---|---|
| `0` | `Hello` | Logical Server -> Logical Client | Server 版本/鉴权声明 |
| `2` | `Identify` | Logical Client -> Logical Server | Client 版本/鉴权/订阅请求 |
| `3` | `Identified` | Logical Server -> Logical Client | session 建立成功并分配 sid |
| `6` | `Event` | Logical Server -> Logical Client | 低频 event 投递 |
| `7` | `Request` | Requester -> Responder after Identified | 业务 method 调用；method 是否允许由哪一端调用由 domain.feature、capability 和 role policy 约束 |
| `8` | `RequestResponse` | Responder -> Requester | 业务 method 结果或错误 |

### 必需 Encoding

- WebSocket Unframed JSON MUST 实现 JSON。
- Standard Framed RPC MUST 将 RPC payload 的第一个字节解析为 `rpcEncoding`。
- JSON encoding (`0x01`) 是 Phase 1 互通必需项。
- 使用高吞吐或 embedded profile 时，Standard Framed 实现 SHOULD 实现 JSON_BINARY (`0x04`)。

### 必需 Session 字段

Hello `d`：

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| `axtpVersion` | string | 是 | AXTP 规范版本，SemVer 字符串，例如 `1.0.0-rc1`；不是 runtime package version |
| `rpcVersion` | uint32 | 是 | 当前 RPC version 为 `1` |
| `authentication` | object | 否 | 仅当 server 要求 authentication 时出现 |

Identify `d`：

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| `rpcVersion` | uint32 | 是 | Client 期望的 RPC version |
| `authentication` | string | 条件必填 | 仅当 Hello 要求 authentication 时必填 |
| `eventMasks` | string | 否 | domain-scoped event subscription hex 字符串 |
| `resumeSid` | string | 否 | resume 尝试使用的旧 sid |

Identified `d`：

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| `negotiatedRpcVersion` | uint32 | 是 | 协商后的 RPC version |

如果 Identify 省略 `rpcVersion`，Server MUST 拒绝进入 APP_READY，且 MUST NOT 发送成功的 Identified。

## v1 可选 / Profile 特定

| 能力 | 状态 | 规则 |
|---|---|---|
| `Reidentify(op=4)` | Optional | MAY 在 session 建立后修改 event subscription |
| `RequestBatch(op=9)` / `RequestBatchResponse(op=10)` | Optional | MAY 批量处理多个业务 request |
| `Bye(op=14)` / `ByeAck(op=15)` | Optional | MAY 优雅关闭 application session |
| CBOR (`0x02`) | Optional/Future | 与 `sid/op/d` object 语义相同 |
| MSGPACK (`0x03`) | Optional/Future | 与 `sid/op/d` object 语义相同 |
| TLV16 bodyEncoding (`0x02`) | Optional/Future | 仅用于 JSON_BINARY body |
| `AXTP-AUTH-OBS-SHA256` | Optional | 仅选择 password challenge-response 的部署需要 |
| `capability.getAll` 等 Runtime capability discovery method | 业务可选 | 它是 RPC 业务 method，不是 CONTROL |

MVP 设备 MAY 忽略 `eventMasks` 并使用全量 event 广播模式，但 MUST 解析 Identify 到足以避免把非法 subscription 数据当成有效 filtered subscription。

## 保留 / 未来

RPC op registry：

| op | 名称 | 方向 | 状态 |
|---:|---|---|---|
| `0` | `Hello` | Server -> Client | 必需 |
| `1` | `HelloAck` | - | 保留 |
| `2` | `Identify` | Client -> Server | 必需 |
| `3` | `Identified` | Server -> Client | 必需 |
| `4` | `Reidentify` | Client -> Server | 可选 |
| `5` | `Subscribe` | - | Reserved；使用 Identify/Reidentify 的 `eventMasks` |
| `6` | `Event` | Server -> Client | 必需 |
| `7` | `Request` | Requester -> Responder | 必需 |
| `8` | `RequestResponse` | Responder -> Requester | 必需 |
| `9` | `RequestBatch` | Requester -> Responder | 可选 |
| `10` | `RequestBatchResponse` | Responder -> Requester | 可选 |
| `11` | - | - | 保留 |
| `12` | - | - | 保留 |
| `13` | - | - | 保留 |
| `14` | `Bye` | Client -> Server | 可选 |
| `15` | `ByeAck` | Server -> Client | 可选 |

保留的 op 值 MUST 按本地 parser 策略忽略或拒绝，但 MUST NOT 被当成业务 Request。

MCP compatibility 和 legacy CmdValue adapter 行为是本文的非规范说明；完整规则应放在 guides 或 legacy-migration 文档中。

## 规范规则

- RPC 是业务控制和 event 层。
- CONTROL MUST NOT 用于业务 capability discovery；capability discovery 在被采纳后属于 `capability.getAll` 等 RPC 业务 method。
- STREAM MUST NOT 承载 RPC Request/Response/Event。
- Hello MUST 由 Logical Server 在 Identify 前发送。
- WebSocket JSON client MUST 等待 Hello 后再发送 Identify。
- Logical Client MUST 在 Identify 前校验 Hello 的 `axtpVersion` 和 `rpcVersion`。
- version/auth 校验失败时，Server MUST NOT 进入 APP_READY 或发送成功的 Identified。
- `sid` MUST 由 Logical Server 在 Identified 中分配。
- Identified 后，Request/Response/Event MUST 携带非空、非零 `sid`。
- Identified 完成后，双方都 MAY 作为 RPC requester 发起业务 Request；是否允许某个 method 被哪一端调用，MUST 由对应 domain.feature、capability 或 role policy 约束。
- 业务 Request 的方向不改变 Hello / Identify / Identified 的 Logical Client / Logical Server 启动方向，也不改变 AXTP Link Session 的 CONTROL OPEN / ACCEPT 方向。
- Request/Response 匹配 MUST 使用 RPC request `id` / JSON_BINARY `requestId`，而不是 Frame `MessageId`。
- RPC request id namespace 属于发起该 Request 的 requester；RequestResponse MUST 返回给对应 requester 并匹配其 pending Request。
- Event MUST 使用 op=6，且 MUST NOT 被当成 RequestResponse。
- Unknown method MUST 返回 `RPC_METHOD_NOT_FOUND` 等 RPC error；MUST NOT 由 CONTROL 处理。
- 当前 method/event/error/schema 事实 MUST 来自 registry/generated 输出，而不是本文示例。

### sid 规则

`sid` 的规范类型是 `uint32`。

| 编码 | 表达形式 |
|---|---|
| JSON / CBOR / MSGPACK | 固定 8 位 hex 字符串，例如 `"12345678"` |
| JSON_BINARY | uint32 Big-Endian / network byte order |
| 分配前 | JSON `""`；JSON_BINARY `0` |

规则：

- `0` 为保留值，表示尚未分配 RPC Session。
- JSON canonical sender form SHOULD 使用大写 hex；receiver MAY 接受小写。
- JSON `sid` MUST NOT 是 `0x` 前缀、UUID、任意 token、负数、浮点数或带业务前缀的字符串。
- APP_READY 后，malformed、empty、非 8 位 hex 或 zero `sid` MUST 被拒绝。

### axtpVersion 规则

`axtpVersion` 表达 AXTP spec version，不是 runtime package version、firmware version、app version，也不是带 `spec/v` 前缀的 Git tag 字符串。

Client 处理：

| Server `axtpVersion` | 必需处理 |
|---|---|
| 缺失、无法解析、不是 SemVer | 视为不兼容；不得继续成功 Identify |
| MAJOR 不同 | 视为不兼容 |
| MAJOR 相同但 MINOR/PATCH 更新 | MAY 继续；client 应只使用已知 registry/capability |
| prerelease 不同 | SHOULD 视为不兼容，除非产品 runtime 声明兼容范围 |

### eventMasks 规则

Identify/Reidentify `eventMasks` 行为：

| 值 | 含义 |
|---|---|
| 省略 | 不订阅事件；MVP 全量事件广播模式 MAY 忽略过滤 |
| `""` | 与省略相同 |
| 非空字符串 | MUST 解析为 Domain-Scoped Event Mask |

Domain block 格式：

```text
Domain Block = [DomainId: 1B] + [MaskLen: 1B] + [Bitmask: N B Big-Endian / network byte order]
```

规则：

- `eventMasks` MUST 是偶数字符的 hex 字符串。
- `MaskLen` MUST 在 1..32 范围内。
- Bit 0 映射到该 domain 中 registry `events[].bitOffset = 0` 的 event。
- Invalid `eventMasks` MUST NOT 被静默接受为有效 subscription。
- Legacy `eventSubscriptions:uint32` 已废弃；新实现 MUST 使用 `eventMasks`。

## 状态机 / 生命周期

RPC session 生命周期：

```text
RPC_WAIT_HELLO
  -> Hello received
RPC_WAIT_IDENTIFY
  -> Identify sent by Logical Client
RPC_IDENTIFYING
  -> Identified received
APP_READY
  -> bidirectional Request / RequestResponse, Event, optional Reidentify
  -> optional Bye / ByeAck or transport close
```

在 Standard Framed profile 中，RPC 在 CONTROL OPEN / ACCEPT 到达 FRAMING_READY 后启动。在 WebSocket Unframed JSON 中，RPC 在 WebSocket connection 和 Server Hello 后立即启动。

失败生命周期：

```text
Hello incompatible
  -> Client does not Identify, or Server rejects Identify

Identify missing rpcVersion / invalid auth / invalid version
  -> Server does not send successful Identified
  -> Server may send error response/diagnostic or close transport
```

## 校验规则

RPC parser MUST 校验：

- envelope 包含 `sid`、`op` 和 `d`；
- `op` 是已知或保留的 uint8 值；
- JSON `sid` 遵循分配前或分配后的规则；
- `rpcEncoding=0x04` 时 JSON_BINARY payload 至少为 15B；
- JSON_BINARY 多字节字段为 Big-Endian / network byte order；
- Request 中 `requestId`/`d.id` 非零；
- RequestResponse 匹配一个 pending Request；
- JSON_BINARY 中 Event 使用 requestId `0`；
- 使用 JSON_BINARY 时，method/event name 能映射到 registry methodId/eventId；
- 每个 RequestResponse 都存在 `status`；
- `status.ok=false` 或非零 status code MUST NOT 携带业务 `result`；
- 没有兼容 `rpcVersion` 时 Identify 不能成功；
- Hello 没有 auth challenge 时 authentication 缺省；Hello 要求时 authentication 存在且有效；
- body length 和 TLV fields 不超过 payload 边界。

推荐错误映射：

| 场景 | 建议 ErrorCode |
|---|---|
| `axtpVersion` 或 `rpcVersion` 不兼容 | `NOT_SUPPORTED` |
| Hello 要求 auth 但 Identify 缺少 auth | `SEC_AUTH_REQUIRED` |
| Auth response 无效、过期或重放 | `SEC_AUTH_FAILED` |
| Client role/version/policy 不被允许 | `SEC_PERMISSION_DENIED` |
| 未知 method | `RPC_METHOD_NOT_FOUND` |
| 不支持的 encoding | `RPC_ENCODING_UNSUPPORTED` |
| Identified 前发送 Request | `SESSION_NOT_READY` |
| 参数或 subscription mask 无效 | `INVALID_ARGUMENT` |

## Runtime 实现要求

### RPC Encoding Registry

| Encoding | 值 | Runtime 要求 |
|---|---:|---|
| JSON | `0x01` | Phase 1 必需 |
| CBOR | `0x02` | 可选/未来 |
| MSGPACK | `0x03` | 可选/未来 |
| JSON_BINARY | `0x04` | Standard Framed 高吞吐/embedded profile SHOULD 实现 |

### JSON_BINARY 固定 Header

```text
rpcEncoding(1) + rpcOp(1) + sid(4) + requestId(4)
  + methodOrEventId(2) + statusCode(2) + bodyEncoding(1)
  + body(N)
```

| 字段 | 长度 | 类型 | 规则 |
|---|---:|---|---|
| `rpcEncoding` | 1B | uint8 | `0x04=JSON_BINARY` |
| `rpcOp` | 1B | uint8 | RPC op |
| `sid` | 4B | uint32 | RPC Session ID；分配前为 0 |
| `requestId` | 4B | uint32 | Request id；Event 使用 0 |
| `methodOrEventId` | 2B | uint16 | methodId 或 eventId |
| `statusCode` | 2B | uint16 | `0x0000=SUCCESS`，非零 ErrorCode |
| `bodyEncoding` | 1B | uint8 | `0x00=NONE`, `0x01=TLV8`, `0x02=TLV16` |
| `body` | N | bytes | 编码后的 body |

固定 header 大小为 15B。Body length 为 `Frame.payloadLength - 15`。

Body encoding：

| bodyEncoding | 名称 | 状态 |
|---:|---|---|
| `0x00` | `NONE` | 必需 |
| `0x01` | `TLV8` | JSON_BINARY Phase 1 必需 |
| `0x02` | `TLV16` | 可选/未来 |

### Request / Response / Event 的 d 块

Request：

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| `id` | uint32 | 是 | 非零 request id |
| `method` | string | 是 | Registry method name |
| `params` | object | 否 | 无参数时省略 |

RequestResponse：

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| `id` | uint32 | 是 | 匹配 Request id |
| `status` | object | 是 | 总是存在 |
| `status.ok` | bool | 是 | 成功标志 |
| `status.code` | uint32 | 是 | 0 表示成功，非零表示错误 |
| `status.msg` | string | 否 | 仅供人阅读 |
| `status.details` | object | 否 | 机器可读诊断信息 |
| `result` | object | 否 | 仅成功且有数据时出现 |

Event：

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| `event` | string | 是 | Registry event name |
| `intent` | uint32 | 是 | Subscription category bit |
| `data` | object | 否 | 无 payload 时省略 |

Runtime SHOULD 分离以下 ID 层级：

| 字段 | 层级 | 用途 |
|---|---|---|
| `messageId` | Frame | fragment/reassembly/debug |
| `sid` | RPC Session | session route/recovery |
| `requestId` / `d.id` | RPC | Request/Response 匹配 |
| `streamId` | STREAM | 连续数据流 |
| `seqId` | STREAM | Stream packet 顺序 |

## 示例

最小 Hello：

```json
{ "sid": "", "op": 0, "d": { "axtpVersion": "1.0.0-rc1", "rpcVersion": 1 } }
```

最小 Identify：

```json
{ "sid": "", "op": 2, "d": { "rpcVersion": 1, "eventMasks": "" } }
```

最小 Identified：

```json
{ "sid": "12345678", "op": 3, "d": { "negotiatedRpcVersion": 1 } }
```

最小 Request：

```json
{ "sid": "12345678", "op": 7, "d": { "id": 1, "method": "device.getInfo" } }
```

最小成功 Response：

```json
{ "sid": "12345678", "op": 8, "d": { "id": 1, "status": { "ok": true, "code": 0 } } }
```

Domain event mask 示例：

```text
eventMasks = "090101"
DomainId=0x09, MaskLen=1, Bitmask=0x01
```

## 非目标

- 本文不定义业务 method schema。
- 本文不要求默认业务 capability discovery method。
- 本文不把 `capability.getAll` 变成 CONTROL 操作。
- 本文不把 MCP compatibility 定义为规范性 wire 行为。
- 本文不定义 legacy CmdValue 映射或 adapter payload 转换。
- 本文不包含 generated 当前 method/event 表；当前事实请使用 registry YAML 和 generated docs。

非规范说明：

- MCP adapter 可在 AXTP wire 合同之外将 AXTP Request/RequestResponse/Event 映射为 tool call/result/notification。
- Legacy CmdValue 映射必须由 legacy migration/adapter 处理，不得改变 `methodOrEventId:uint16`。

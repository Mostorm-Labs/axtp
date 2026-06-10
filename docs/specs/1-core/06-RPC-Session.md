# 1-core/06《AXTP RPC Session Spec》

> Status: AXTP v1 Core Freeze Candidate
> Spec Version: 1.0.0-rc1
> Change Policy: Clarification-only before v1.0.0
> Scope: Core wire format / state machine / compatibility rules

版本：v1.0.0-rc1
状态：AXTP v1 Core Freeze Candidate
适用范围：RPC Payload 结构、op+d Envelope、sid、JSON/CBOR/MSGPACK/JSON_BINARY 编码、MethodId/EventId、Hello/Identify/Request/Response/Event/Batch、`axtpVersion` 兼容校验、RPC Session 鉴权
前置文档：`docs/specs/1-core/02-Protocol-Framework.md`、`docs/specs/1-core/03-Frame-and-Payload.md`、`docs/specs/1-core/05-Control-Session.md`
后续文档：`docs/specs/1-core/07-Stream-Data-Plane.md`、Registry 文档

---

## 0. 速读：RPC 有四种 payload 编码路径

RPC 是业务控制面，承载 Hello / Identify / Request / Response / Event。它可以直接跑在 WebSocket Unframed JSON 上，也可以作为 `PayloadType=RPC` 放进 Standard Frame。

| 路径 | 线上结构 | session 表达 | 典型用途 |
|---|---|---|---|
| WebSocket Unframed JSON | `WebSocket message payload = JSON { sid, op, d }` | `sid` 在 JSON Envelope 中，格式为固定 8 位十六进制字符串 | 浏览器、云端、轻量 RPC |
| Standard Framed + JSON | `Frame Header(payloadType=RPC) + rpcEncoding(0x01) + UTF-8 JSON { sid, op, d } + CRC16` | `sid` 在 JSON Payload 中，格式为固定 8 位十六进制字符串 | 调试、诊断、实现便利 |
| Standard Framed + CBOR / MSGPACK | `Frame Header(payloadType=RPC) + rpcEncoding + encoded { sid, op, d } + CRC16` | `sid` 在对象 envelope 中，格式为固定 8 位十六进制字符串 | 后续紧凑对象编码 |
| Standard Framed + JSON_BINARY | `Frame Header(payloadType=RPC) + JSON_BINARY Header(15B) + body + CRC16` | `sid:uint32` 在 JSON_BINARY Header 中 | 嵌入式、高吞吐路径 |

JSON_BINARY 15B 固定头：

```text
rpcEncoding(1) + rpcOp(1) + sid(4) + requestId(4)
  + methodOrEventId(2) + statusCode(2) + bodyEncoding(1)
```

三个 ID 的边界：

| 字段 | 所在层 | 作用 |
|---|---|---|
| `sid` | RPC Session Layer | 业务 session 路由与恢复；JSON 中为 8 位 hex string，Binary 中为 uint32 |
| `requestId` | RPC Payload | 匹配 Request / Response；不用于 Frame 分片 |
| `messageId` | Frame Header | 标识完整 Frame Message 及其分片；不匹配 RPC Response |

最小 JSON 调用：

```json
{ "sid": "12345678", "op": 7, "d": { "id": 1, "method": "audio.getAlgorithmCapabilities" } }
```

最小 JSON_BINARY 调用：

```text
Frame(payloadType=RPC)
  RPC JSON_BINARY Header:
    rpcEncoding=JSON_BINARY, rpcOp=REQUEST, sid=0x12345678, requestId=1,
    methodOrEventId=audio.getAlgorithmCapabilities, statusCode=SUCCESS, bodyEncoding=NONE
  body: empty
```

---

## 1. 文档目的

本文档定义 `PayloadType = RPC` 时的业务控制协议。RPC 负责业务控制面（设备查询、参数设置、能力查询、事件上报等），不负责协议运行时控制（属于 CONTROL）和连续数据传输（属于 STREAM）。

AXTP RPC 采用与 OBS-WebSocket 相同的 `{ "sid": string, "op": number, "d": object }` Envelope 结构。AXTP v1 Core 定义四个 `rpcEncoding`：`JSON / CBOR / MSGPACK / JSON_BINARY`。JSON 是最先实现的默认路径；CBOR 和 MessagePack 是同一 envelope 的后续紧凑对象编码；JSON_BINARY 用固定 15B 二进制 envelope 表达同一套 `sid/op/d` 语义，并通过 `bodyEncoding` 承载 TLV8/TLV16 body。

---

## 2. 协议分层与编码模式

```text
Transport
  ↓
AXTP Frame Header (payloadType=RPC)
  ↓
RPC Payload
  ├── JSON:        0x01 + UTF-8 JSON text, { "sid": "...", "op": N, "d": {...} }
  ├── CBOR:        0x02 + CBOR encoded { sid, op, d }
  ├── MSGPACK:     0x03 + MessagePack encoded { sid, op, d }
  └── JSON_BINARY: 0x04 + fixed 15B binary envelope + TLV body
```

| 编码模式 | rpcEncoding | 适用场景 |
| --- | --- | --- |
| JSON | `0x01` | WebSocket Unframed JSON、framed JSON、CLI、浏览器集成 |
| CBOR | `0x02` | 后续紧凑对象编码，复用 sid/op/d 语义 |
| MessagePack | `0x03` | 后续紧凑对象编码，复用 sid/op/d 语义 |
| JSON_BINARY | `0x04` | AXTP-USB-HID、AXTP-TCP 等 Standard Framed 高吞吐场景 |

JSON、CBOR、MessagePack 都使用完整的 sid+op+d 语义结构。JSON_BINARY 使用固定二进制头，语义与 op+d 一一对应；业务 session `sid` 必须出现在 JSON_BINARY Header 中，不得复用 CONTROL `sessionId`。

---

## 3. Envelope 结构

所有 JSON 消息使用统一三字段 Envelope：

```text
{ "sid": "12345678", "op": 6, "d": { ... } }
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sid` | string | RPC Session ID，由服务端在 Identified 中分配；JSON 中使用固定 8 位十六进制字符串 |
| `op` | uint8 | 操作码，见 §4 |
| `d` | object | 消息数据块，结构由 op 决定 |

### 3.1 sid 类型与编码

`sid` 的规范类型是 `uint32`，取值范围为 `1..0xFFFFFFFF`。`0` 是保留值，表示尚未分配业务 session 或该消息不绑定已有业务 session。

32-bit 对 AXTP v1 的业务 session 是足够的，因为 `sid` 不是全局唯一 ID，而是由单个 Logical Server 在当前可恢复业务 session 集合内分配的局部 ID。即使一个设备、mock server 或网关同时维护数万级活跃 session，`uint32` 仍有足够空间；实现只需要保证当前活跃 session 不冲突。跨设备、跨云、跨租户的全局唯一性应由 `deviceId / endpointId / tenantId / connectionId + sid` 组合表达，不应把全局身份塞进 `sid`。

Phase 1 固定采用以下裁决：

| 项 | 裁决 |
|---|---|
| 规范类型 | `uint32` |
| 保留值 | `0`，表示尚未分配业务 session |
| JSON / CBOR / MSGPACK 表达 | 固定 8 位十六进制字符串，例如 `"12345678"` |
| JSON_BINARY 表达 | `uint32` Little-Endian，例如 `78 56 34 12` |
| 分配方 | Logical Server 在 Identified 阶段分配 |
| 作用域 | 单个 Logical Server 的当前活跃/可恢复业务 session 集合 |

| 编码 | 表达方式 | 示例 |
|---|---|---|
| JSON RPC | 固定 8 位 hex string | `"12345678"` |
| JSON_BINARY RPC | uint32 Little-Endian | `78 56 34 12` |

JSON 选择 string 是为了延续 OBS-style `sid/op/d` envelope、避免 JSON number 解析差异，并为网关日志和调试提供稳定文本格式。该 string 必须是 8 个十六进制字符，发送方必须使用 uppercase canonical form，接收方可以兼容 lowercase。不得使用 `0x12345678`、`"s-001"`、UUID、负数、浮点数、可变长 UTF-8 token 或带业务前缀的字符串。

| 表达 | 结论 | 原因 |
|---|---|---|
| `"12345678"` | 推荐 | 固定 8 位，和 Binary `0x12345678` 一眼对应。 |
| `"305419896"` | 不推荐 | 是同一个数的十进制表达，但不如 hex 方便和二进制对照。 |
| `"0x12345678"` | 不推荐 | 多两个字符，parser 还要处理前缀。 |
| `"s-001"` / UUID / 任意 ASCII | 不允许 | 会把固定 32-bit ID 变成可变长 token，JSON_BINARY RPC Header 无法保持简单固定。 |

不推荐用任意 UTF-8 / ASCII 文本表达 `sid`。如果把 `sid` 定义成可变长文本 token，JSON_BINARY RPC Header 就无法保持固定宽度，runtime 也必须额外处理编码、长度、大小写和字符集问题。Phase 1 的目标是让 JSON/CBOR/MSGPACK 和 JSON_BINARY 可以直接互转，因此 `sid` 保持 `uint32`，对象编码只采用它的固定宽度 hex 文本表示。

`sid` 的作用：

- **路由**：网关场景下一个连接承载多个逻辑 session，`sid` 区分路由目标。
- **恢复**：断线重连时客户端携带旧 `sid` 发 Identify，服务端可恢复 session 状态。
- **对象编码 / JSON_BINARY 统一**：JSON/CBOR/MSGPACK 使用 8 位 hex string 表示同一个 uint32；JSON_BINARY RPC Header 使用 uint32，二者必须可以无损互转。
- Hello（op=0）是连接建立后第一条消息，此时尚无 session，JSON `sid` 填空字符串 `""`，Binary `sid` 填 `0`。
- Identify（op=2）新建 session 时 JSON `sid` 填 `""`，Binary `sid` 填 `0`；断线恢复时旧业务 session 放在 `d.resumeSid` / Binary body 的 resumeSid 字段。
- Identified（op=3）中服务端分配并返回非 0 `sid`，客户端后续所有 Request / Event / Response 必须携带此 `sid`。

---

## 4. RPC op 注册表

op 数值与老协议对齐，生命周期 op 保留为独立 op。

| op | 名称 | 方向 | 说明 |
| ---: | --- | --- | --- |
| `0` | `Hello` | Server→Client | 连接建立后服务端立即发送，携带版本和认证要求 |
| `1` | `HelloAck` | — | **Reserved**，保留编号与老协议对齐，当前不使用 |
| `2` | `Identify` | Client→Server | 客户端身份、版本、认证、订阅意图；可携带旧 `sid` 恢复 session |
| `3` | `Identified` | Server→Client | 确认就绪，分配并返回 `sid` |
| `4` | `Reidentify` | Client→Server | 修改订阅或会话参数，不重新认证 |
| `5` | `Subscribe` | — | **Reserved**，保留编号与老协议对齐，当前不使用（订阅通过 Identify/Reidentify 的 `eventMasks` 字段完成） |
| `6` | `Event` | Server→Client | 低频状态事件推送 |
| `7` | `Request` | Client→Server | 发起 RPC 调用 |
| `8` | `RequestResponse` | Server→Client | 返回 RPC 结果 |
| `9` | `RequestBatch` | Client→Server | 批量 RPC 请求 |
| `10` | `RequestBatchResponse` | Server→Client | 批量 RPC 响应 |
| `11` | — | — | **Reserved**，保留未分配 |
| `12` | — | — | **Reserved**，保留未分配 |
| `14` | `Bye` | Client→Server | 应用层优雅关闭，可携带关闭原因 |
| `15` | `ByeAck` | Server→Client | 确认关闭，服务端完成清理后发送 |

op=13 保留未分配。Reserved op 收到时必须忽略，不得返回错误。

MVP 必须实现：`Hello / Identify / Identified / Event / Request / RequestResponse`。其余可延后。

---

## 5. Hello（op=0）

服务端在 WebSocket/TCP 连接建立后立即发送，无需客户端请求。Hello 是 RPC Session 的兼容性入口：Logical Server 在这里声明其实现的 AXTP 规范版本、RPC 协议版本，以及当前连接是否要求认证。

Phase 1 默认无认证，Hello 不携带 `authentication`：

```json
{
  "sid": "",
  "op": 0,
  "d": {
    "axtpVersion": "1.0.0-rc1",
    "rpcVersion": 1
  }
}
```

需要密码门禁时，Hello 携带认证挑战：

```json
{
  "sid": "",
  "op": 0,
  "d": {
    "axtpVersion": "1.0.0-rc1",
    "rpcVersion": 1,
    "authentication": {
      "scheme": "AXTP-AUTH-OBS-SHA256",
      "challenge": "<base64-random-16-to-32-bytes>",
      "salt": "<base64-random-or-device-salt>"
    }
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `axtpVersion` | string | 是 | 服务端实现的 AXTP 规范版本号，使用当前 spec 的 SemVer 字符串，例如 `1.0.0-rc1`；不得使用 runtime 包版本、固件版本或 Git tag 前缀 `spec/v` |
| `rpcVersion` | uint32 | 是 | RPC 协议版本，当前为 1 |
| `authentication` | object | 否 | 认证挑战，不需要认证时省略 |
| `authentication.scheme` | string | 条件 | 认证方案名；当前定义 `AXTP-AUTH-OBS-SHA256`，默认无认证时省略整个 `authentication` |
| `authentication.challenge` | string | 条件 | Base64 编码的服务端随机挑战 |
| `authentication.salt` | string | 条件 | Base64 编码的 salt，可为随机 salt 或设备级 salt |

`sid` 填 `""`，此时 session 尚未建立。

### 5.1 `axtpVersion` 兼容校验

`axtpVersion` 表达 AXTP 规范版本号，用于 runtime 在进入 APP_READY 之前做兼容性校验。它与以下版本概念不同：

| 字段/版本 | 表达对象 | 是否用于 RPC Session 兼容校验 |
|---|---|---:|
| `axtpVersion` | AXTP Spec 规范版本，例如 `1.0.0-rc1` | 是 |
| `rpcVersion` | RPC envelope/op 语义版本，当前为 `1` | 是 |
| Frame Header `Version` | Standard Frame Header 解析版本 | 只用于 Standard Framed parser |
| Registry / generated protocol 版本 | method/event/error/schema/capability 事实集合 | 用于业务能力和代码生成，不替代 session 兼容校验 |
| Runtime package / firmware / app 版本 | 具体实现或产品版本 | 否 |

版本字符串使用 SemVer 语义，发布 tag `spec/vMAJOR.MINOR.PATCH` 在线上 Hello 中去掉 `spec/v` 前缀，例如 tag `spec/v1.0.0` 对应 `axtpVersion: "1.0.0"`。预发布版本可以使用 SemVer prerelease 后缀，例如 `1.0.0-rc1`。

Logical Client 必须在发送 Identify 前校验 `axtpVersion`：

| 服务端 `axtpVersion` | 建议处理 |
|---|---|
| 无法解析、缺失或不是 SemVer | 视为不兼容，不进入 Identify。 |
| `MAJOR` 不同 | 视为不兼容，不进入 Identify；若已经发送 Identify，服务端可拒绝并关闭连接。 |
| `MAJOR` 相同，`MINOR/PATCH` 更新 | 可以继续握手；客户端只调用自己已知 registry / capability 中的 method，未知字段按扩展规则忽略。 |
| prerelease 标识不同 | 默认按不兼容处理；产品可以在自身 runtime 中显式声明兼容的 prerelease 范围。 |

`axtpVersion` 不因为新增 methodId/eventId、可选 schema 字段或 registry 元数据变化而单独升级 RPC envelope。此类变化由 Registry/Generator 版本和能力声明处理。只有 AXTP 规范发布版本变化时，Hello 中的 `axtpVersion` 才随之变化。

### 5.2 Hello 认证挑战

AXTP RPC Session 定义两个 Phase 1 认证选择：

| 方案 | Hello | Identify | 适用场景 |
|---|---|---|---|
| `AXTP-AUTH-NONE` | 不携带 `authentication` | 不携带 `authentication` | 设备直连、本地控制、内网、产线、mock server、可信环境。 |
| `AXTP-AUTH-OBS-SHA256` | 携带 `scheme/challenge/salt` | 携带 challenge response 字符串 | 明确需要密码门禁的产品或部署环境。 |

默认方案是 `AXTP-AUTH-NONE`。OBS-style challenge-response 只证明客户端知道 shared secret，不加密后续 RPC / STREAM 内容；需要链路保密时应使用 TLS、受信任传输或后续单独安全方案。

使用 `AXTP-AUTH-OBS-SHA256` 时，服务端必须满足：

- `challenge` 每次连接重新生成。
- `challenge` 有效期建议不超过 30 秒。
- 同一个 `challenge` 只能成功使用一次。
- 认证失败后不得进入 `APP_READY`。

---

## 6. Identify（op=2）

客户端收到 Hello 后发送。

```json
{
  "sid": "",
  "op": 2,
  "d": {
    "rpcVersion": 1,
    "eventMasks": "090101",
    "resumeSid": "12345678"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `rpcVersion` | uint32 | 是 | 客户端期望的 RPC 版本 |
| `authentication` | string | 条件 | Hello 要求认证时必填；默认无认证时必须省略 |
| `eventMasks` | string | 否 | 域级事件订阅掩码，Hex 字符串编码，格式见 §16；省略或空字符串表示不订阅任何事件 |
| `resumeSid` | string | 否 | 断线重连时携带旧 `sid`，请求恢复 session |

> **兼容说明**：旧字段 `eventSubscriptions: uint32` 已废弃，新实现必须使用 `eventMasks`。MVP 阶段设备可忽略 `eventMasks` 并默认推送核心事件（全量广播模式），P1 阶段再实现按掩码过滤。

新连接时 `sid` 填 `""`；断线重连时 `sid` 填 `""` 但 `d.resumeSid` 携带旧 session ID。

Identify 字段行为以本节为唯一权威来源：

| 场景 | Server 处理 |
|---|---|
| 缺失 `rpcVersion` | 必须拒绝进入 `APP_READY`，不得发送成功 `Identified`；建议返回 `NOT_SUPPORTED` 或关闭 session。 |
| `rpcVersion` 与 Hello / Server 支持范围不兼容 | 必须拒绝进入 `APP_READY`；建议返回 `NOT_SUPPORTED`。 |
| `eventMasks` 省略 | 表示不订阅任何事件；MVP 全量广播模式可忽略该字段。 |
| `eventMasks` 为 `""` | 与省略等价，表示不订阅任何事件。 |
| `eventMasks` 为非空字符串 | 必须按 §16.1 的 Domain Block 格式解析。 |
| `eventMasks` 格式非法 | 不得静默当作有效订阅；Server 可拒绝 Identify/Reidentify 并返回 `INVALID_ARGUMENT`，或按产品策略忽略订阅并返回明确错误/诊断。 |

### 6.1 Identify 认证响应

当 Hello 不携带 `authentication` 时，Identify 也不得携带 `authentication`。当 Hello 的 `authentication.scheme` 为 `AXTP-AUTH-OBS-SHA256` 时，客户端按以下方式计算响应：

```text
secret = Base64(SHA256(password + salt))
authentication = Base64(SHA256(secret + challenge))
```

其中 `password` 是产品或部署环境配置的 shared secret，`salt` 和 `challenge` 来自 Hello。客户端不得发送明文密码。

示例：

```text
password       = "axtp-demo-secret"
salt           = "c2FsdC1leGFtcGxlLTEyMzQ1Ng=="
challenge      = "Y2hhbGxlbmdlLWV4YW1wbGUtMTIzNDU2"
secret         = "eWGqr/2kdAa2XVb+zhCtSc21Ikm29Gu38hZW+tU5Gb4="
authentication = "uGXkKQgJcTinrNiAyxTCj0TVXUq4c5iyRiQRL6nKnPU="
```

对应 Identify：

```json
{
  "sid": "",
  "op": 2,
  "d": {
    "rpcVersion": 1,
    "authentication": "uGXkKQgJcTinrNiAyxTCj0TVXUq4c5iyRiQRL6nKnPU=",
    "eventMasks": "090101"
  }
}
```

---

## 7. Identified（op=3）

服务端验证通过后发送，分配 `sid`。

```json
{
  "sid": "12345678",
  "op": 3,
  "d": {
    "negotiatedRpcVersion": 1
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `negotiatedRpcVersion` | uint32 | 是 | 协商后的 RPC 版本 |

客户端收到 Identified 后提取 `sid`，后续所有消息必须携带此 `sid`。

如果版本校验、认证或权限检查失败，服务端不得发送 Identified，也不得进入 APP_READY。可返回错误后关闭 session，或直接关闭 transport。错误映射使用既有 ErrorCode，不在 RPC Session 中新增局部错误码：

| 场景 | 建议 ErrorCode |
|---|---|
| `axtpVersion` 或 `rpcVersion` 不兼容 | `NOT_SUPPORTED` |
| Hello 要求认证，但 Identify 未带认证字段 | `SEC_AUTH_REQUIRED` |
| 认证串计算错误、challenge 过期或 challenge 重放 | `SEC_AUTH_FAILED` |
| 客户端版本、角色或策略不满足当前 method/session 权限 | `SEC_PERMISSION_DENIED` |

---

## 8. Reidentify（op=4）

客户端在已建立 session 后修改订阅，不重新认证。

```json
{
  "sid": "12345678",
  "op": 4,
  "d": {
    "eventMasks": "850301"
  }
}
```

`eventMasks` 格式与 Identify 相同（见 §6）。服务端处理后再次发送 Identified（op=3）确认。

---

## 9. Request（op=7）

### 9.1 d-block 结构

```json
{
  "id": 1,
  "method": "audio.setAlgorithmConfig",
  "params": {
    "config": {
      "noiseSuppression": {
        "level": 2
      }
    }
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uint32 | 是 | 请求 ID，从 1 开始递增，uint32 自然回绕（跳过 0） |
| `method` | string | 是 | 方法名，`domain.verbObject` 格式，对应 Registry methodId |
| `params` | object | 否 | 请求参数，无参数时可省略 |

`id` 规则：

- 保留值 `0`：Event 固定填此值，普通 Request 不得使用
- 同一 Session 内未收到 RequestResponse 的 `id` 不得复用
- `id` 在收到对应 RequestResponse 或超时（推荐 30s）后方可复用

### 9.2 示例

```json
{
  "sid": "12345678",
  "op": 7,
  "d": {
    "id": 1,
    "method": "audio.setAlgorithmConfig",
    "params": {
      "config": {
        "noiseSuppression": {
          "level": 2
        }
      }
    }
  }
}
```

---

## 10. RequestResponse（op=8）

每个 RequestResponse 必须携带 `status` 对象，`result` 仅在有业务数据时出现。

### 10.1 成功 d-block（有返回值）

```json
{
  "id": 1,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "value": 80
  }
}
```

### 10.2 成功 d-block（无返回值）

```json
{
  "id": 1,
  "status": {
    "ok": true,
    "code": 0
  }
}
```

### 10.3 失败 d-block

```json
{
  "id": 1,
  "status": {
    "ok": false,
    "code": 603,
    "msg": "Value out of range",
    "details": {
      "max": 100
    }
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uint32 | 是 | 对应 Request 的 id |
| `status` | object | 是 | 每个响应必须携带，描述执行结果 |
| `status.ok` | bool | 是 | 请求是否成功完成 |
| `status.code` | uint32 | 是 | 状态码或错误码；`0` 表示成功，非 0 表示失败或异常状态 |
| `status.msg` | string | 否 | 可选但推荐的人类可读提示，不得作为程序分支判断依据；`ok=true` 时通常省略 |
| `status.details` | object | 否 | 机器可读的错误上下文 |
| `result` | object | 否 | 业务返回数据，无返回值时省略 |

`status` 和业务 `result` 可同时出现（成功且有数据）。`status.ok=false` 或 `status.code != 0` 时不得携带业务 `result`。

文本编码中的 `status.code` 使用 uint32，便于与 JSON-RPC / MCP / 外部系统错误码适配；当前 AXTP ErrorCode Registry 的规范码值仍位于 uint16 范围内。

### 10.4 示例

```json
{
  "sid": "12345678",
  "op": 8,
  "d": {
    "id": 1,
    "status": {
      "ok": true,
      "code": 0
    },
    "result": {
      "applyState": "applied",
      "requiresAudioRestart": false,
      "config": {
        "noiseSuppression": {
          "level": 2
        }
      }
    }
  }
}
```

```json
{
  "sid": "12345678",
  "op": 8,
  "d": {
    "id": 1,
    "status": {
      "ok": false,
      "code": 603,
      "msg": "Value out of range"
    }
  }
}
```

---

## 11. Event（op=6）

```json
{
  "event": "audio.algorithmConfigChanged",
  "intent": 1,
  "data": {
    "reason": "user_request",
    "applyState": "applied",
    "requiresAudioRestart": false,
    "config": {
      "noiseSuppression": {
        "level": 2
      }
    },
    "changedFields": ["noiseSuppression.level"]
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `event` | string | 是 | 事件名，`domain.eventName` 格式，对应 Registry eventId |
| `intent` | uint32 | 是 | 订阅分类位，对应 Identify `eventMasks` 域级掩码中的某一位，客户端用于过滤 |
| `data` | object | 否 | 事件数据，无数据时可省略 |

Event 不携带 `id`（Binary 中 requestId 填 0）。

### 11.1 示例

```json
{
  "sid": "12345678",
  "op": 6,
  "d": {
    "event": "audio.algorithmConfigChanged",
    "intent": 1,
    "data": {
      "reason": "user_request",
      "applyState": "applied",
      "requiresAudioRestart": false,
      "config": {
        "noiseSuppression": {
          "level": 2
        }
      },
      "changedFields": ["noiseSuppression.level"]
    }
  }
}
```

---

## 12. RequestBatch（op=9）

```json
{
  "id": 100,
  "haltOnFailure": true,
  "executionType": 0,
  "requests": [
    { "method": "audio.setAlgorithmConfig", "params": { "config": { "noiseSuppression": { "level": 2 } } } },
    { "method": "audio.resetAlgorithmConfig", "params": { "items": ["noiseSuppression"] } }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uint32 | 是 | 批量请求 ID |
| `haltOnFailure` | bool | 否 | 遇到失败是否停止，默认 false |
| `executionType` | uint32 | 否 | 0=SerialRealtime，1=SerialFrame，2=Parallel |
| `requests` | array | 是 | 请求列表，每项含 `method` 和可选 `params` |

---

## 13. RequestBatchResponse（op=10）

```json
{
  "id": 100,
  "results": [
    { "status": { "ok": true, "code": 0 }, "result": { "value": 80 } },
    { "status": { "ok": false, "code": 603, "msg": "Content too long" } }
  ]
}
```

`results` 数组与 `requests` 数组一一对应。

---

## 14. 方法名与事件名规范

### 14.1 方法名

格式：`domain.verbObject`，camelCase

推荐动词：`get / set / list / open / close / start / stop / begin / end / verify / apply / abort / resume / subscribe / unsubscribe`

示例：`audio.getAlgorithmCapabilities / audio.getAlgorithmConfig / audio.setAlgorithmConfig / audio.resetAlgorithmConfig`

### 14.2 事件名

格式：`domain.objectChanged / domain.actionCompleted / domain.actionFailed / domain.error`

示例：`audio.algorithmConfigChanged / firmware.updateStateChanged / stream.errorReported`

### 14.3 与 Binary methodId/eventId 的映射

方法名和事件名与 Binary 中的 uint16 ID 一一对应，由 Registry 统一管理：

```text
"audio.setAlgorithmConfig"       ↔ methodId = 0x0902
"audio.algorithmConfigChanged"   ↔ eventId  = 0x0901
```

---

## 15. 会话生命周期

AXTP 将会话生命周期分为两层，两层职责严格分离：

```text
Transport 层（CONTROL，Framed Mode）：
  Physical connected
    → CONTROL OPEN
    → CONTROL ACCEPT
    → FRAMING_READY

Application 层（RPC，所有模式）：
  FRAMING_READY / WebSocket connected
    → Hello (op=0)        Logical Server→Logical Client
    → Identify (op=2)     Logical Client→Logical Server
    → Identified (op=3)   Logical Server→Logical Client，分配 sid
    → APP_READY
    → adopted business Request / Event
    → Request / Event / Reidentify
```

Hello 由 AXTP Logical Server 发送——即拥有并暴露 methods/events/streams 的一端。在本地设备场景中，Physical Server 与 Logical Server 是同一端（设备）。在云端反连场景中，设备是 Physical Client 但仍是 Logical Server，因此仍由设备发 Hello（详见 `docs/specs/1-core/04-Transport-Profiles.md`§3.0）。

| OBS-WebSocket | AXTP 对应 | 说明 |
| --- | --- | --- |
| `Hello` | `Hello (op=0)` | 直接对应，服务端主动发送 |
| `Identify` | `Identify (op=2)` | 直接对应，客户端认证+订阅 |
| `Identified` | `Identified (op=3)` | 直接对应，分配 sid |
| `Reidentify` | `Reidentify (op=4)` | 直接对应，修改订阅 |

WebSocket Unframed JSON 模式下，CONTROL 层不存在，Hello/Identify/Identified 是唯一的连接建立机制。Standard Framed 模式下，CONTROL OPEN/ACCEPT 先于 Hello/Identify 执行，两者不冲突。

APP_READY 后，v1 Core 不强制任何业务 method。客户端以当前产品 generated registry 作为可调用 method 清单；若需要运行时能力发现，必须由已采纳业务草案显式定义对应查询 method。

---

## 16. 事件订阅

低频状态事件走 RPC Event（op=6），高频连续数据走 STREAM。

```text
低频状态变化（亮度变化、固件进度、设备状态）：
  RPC Event (op=6)

高频连续数据（视频帧、音频帧、传感器采样、固件更新数据块）：
  RPC 控制面（Request op=7）+ STREAM 数据面
```

### 16.1 域级事件订阅掩码（eventMasks）

事件订阅使用**域级二进制掩码（Domain-Scoped Event Mask）**，而非旧的 `eventSubscriptions: uint32` 全局位图。

`eventMasks` 是 Identify / Reidentify 中的可选字段。字段省略或传空字符串 `""` 都表示不订阅任何事件；非空字符串必须是偶数长度 Hex，并按下面的 Domain Block 结构解析。实现不得把任意文本、十进制数字、JSON array 或旧 `eventSubscriptions` 全局位图当作有效 `eventMasks`。

**格式**：`eventMasks` 是一个 Hex 字符串，由一个或多个 Domain Block 拼接而成：

```text
Domain Block = [DomainId: 1B] + [MaskLen: 1B] + [Bitmask: N B (Little-Endian)]
```

| 字段 | 长度 | 说明 |
| --- | --- | --- |
| `DomainId` | 1B | 事件所属域 ID（与 EventId 高字节对齐，见 `docs/specs/2-registry/03-Events-Registry.md`） |
| `MaskLen` | 1B | Bitmask 字节数 N（1-32），高水位截断：只发到最高有效字节 |
| `Bitmask` | N B | 该域的事件订阅掩码，Little-Endian，Bit 0 对应 bitOffset=0 |

**Domain ID 与 EventId 的对应关系**：

| DomainId | 对应 EventId 范围 | 域名 |
| --- | --- | --- |
| `0x01` | `0x0100-0x01FF` | `device.*` |
| `0x02` | `0x0200-0x02FF` | `capability.*` |
| `0x03` | `0x0300-0x03FF` | `system.*` |
| `0x04` | `0x0400-0x04FF` | `firmware.*` |
| `0x05` | `0x0500-0x05FF` | `stream.*` |
| `0x06` | `0x0600-0x06FF` | `display.*` |
| `0x07` | `0x0700-0x07FF` | `camera.*` |
| `0x08` | `0x0800-0x08FF` | `video.*` |
| `0x09` | `0x0900-0x09FF` | `audio.*` |
| `0x0A` | `0x0A00-0x0AFF` | `input.*` |
| `0x0B` | `0x0B00-0x0BFF` | `output.*` |
| `0x0C` | `0x0C00-0x0CFF` | `room.*` |
| `0x0D` | `0x0D00-0x0DFF` | `signage.*` |

**高水位截断规则**：如果某域只用到 Bit 3，`MaskLen` 必须为 1，不得发送多余字节。

**示例**：订阅 `audio.*` 域的 Bit 0（audio.algorithmConfigChanged）：

```text
eventMasks = "090101"

解析：
  DomainId=0x09, MaskLen=1, Bitmask=0x01  → audio.algorithmConfigChanged (Bit 0)
```

**设备端过滤（O(1) 判定）**：

```cpp
bool isEventSubscribed(const uint8_t* bitmask, uint8_t maskLen, uint8_t bitOffset) {
    uint8_t byteIndex = bitOffset / 8;
    uint8_t bitIndex  = bitOffset % 8;
    if (byteIndex >= maskLen) return false;
    return (bitmask[byteIndex] & (1 << bitIndex)) != 0;
}
```

### 16.2 MVP 阶段简化

MVP 阶段设备可采用"全量广播模式"：忽略 `eventMasks`，只要 App 进入 APP_READY 状态，设备产生的所有核心事件无条件推送。P1 阶段再实现按掩码过滤。

初始订阅在 Identify（op=2）的 `eventMasks` 字段声明。运行时修改订阅使用 Reidentify（op=4）。

事件掩码的 DomainId 与 EventId 高字节对齐，并与同 domain 的 MethodId 高字节一致。例如 `display.*` method/event 均使用 `0x06xx`，DomainId 均为 `0x06`。方法能力掩码和事件订阅掩码格式相同、DomainId 空间相同，但 bitOffset 来源不同：生成器必须分别从 `methods[].bitOffset` 和 `events[].bitOffset` 派生。

---

## 17. RPC 与 STREAM 的协作

```text
固件更新（待 `firmware.update` 草案采纳）:
  RPC 已采纳建流方法 → 返回 streamId, profile=firmware.update
  STREAM packet: streamId/seqId/cursor/data
  RPC 已采纳校验方法 → 校验固件
  RPC 已采纳安装方法 → 应用固件

文件传输（待 file.transfer 草案采纳）:
  RPC 已采纳建流方法 → 返回 streamId
  STREAM packet: streamId/seqId/cursor/data
  RPC 已采纳完成方法

视频预览（待视频流草案采纳）:
  RPC 已采纳建流方法 → 返回 streamId
  STREAM packet: streamId/seqId/cursor/data
  RPC 已采纳停止方法
```

---

## 18. RPC payload 编码优先级

`rpcEncoding` 表示 `PayloadType=RPC` 的 payload 使用哪种编码。接收方必须先读取 payload 第一个字节，再选择 parser。

实现优先级为：

| 优先级 | rpcEncoding | 说明 |
|---:|---|---|
| 1 | `JSON(0x01)` | Phase 1 默认路径，可读、易调试、WebSocket 与 Standard Framed 都可用 |
| 2 | `CBOR(0x02)` | 后续紧凑对象编码，仍然编码 `{sid, op, d}` |
| 3 | `MSGPACK(0x03)` | 后续紧凑对象编码，仍然编码 `{sid, op, d}` |
| 4 | `JSON_BINARY(0x04)` | 固定二进制 envelope + bodyEncoding，面向高吞吐或 MCU 优化 |

CBOR 和 MessagePack 不复用 15B JSON_BINARY Header，也不改变 methodId/eventId/errorCode registry。它们只是在 payload body 中用不同编码表示同一个 `{sid, op, d}` 对象。

---

## 19. JSON_BINARY RPC 编码

JSON_BINARY 模式面向 Standard Framed 设备，使用统一 15B 固定二进制头承载 sid+op+d 语义。AXTP v1 Core 不再区分 RPC Standard/Compact Payload；Compact 低带宽降级见 `docs/specs/1-core/08-Low-Bandwidth-Degradation.md`。

### 19.1 JSON_BINARY Payload（15B 固定头）

| 字段 | 长度 | 类型 | 说明 |
| --- | ---: | --- | --- |
| `rpcEncoding` | 1B | uint8 | 首字节，`0x04=JSON_BINARY` |
| `rpcOp` | 1B | uint8 | op 值，见 §4 |
| `sid` | 4B | uint32 | RPC Session ID；未分配前填 0，APP_READY 后必须为服务端分配的非 0 sid |
| `requestId` | 4B | uint32 | 请求 ID，EVENT 填 0 |
| `methodOrEventId` | 2B | uint16 | methodId 或 eventId |
| `statusCode` | 2B | uint16 | `0x0000=SUCCESS`，非 0 为 ErrorCode Registry 错误码 |
| `bodyEncoding` | 1B | uint8 | 仅 `rpcEncoding=JSON_BINARY` 时有效，Phase 1 使用 `0x00=NONE` / `0x01=TLV8` |
| `body` | N | bytes | 由 bodyEncoding 决定 |

固定头 15B，所有多字节字段 Little-Endian。body 长度 = `Frame.payloadLength - 15`。

### 19.2 Parser 分发规则

接收方读取 RPC Payload 首字节 `rpcEncoding` 后分发：

| rpcEncoding | Parser |
| ---: | --- |
| `0x01` JSON | JSON sid/op/d parser |
| `0x02` CBOR | CBOR sid/op/d parser |
| `0x03` MSGPACK | MessagePack sid/op/d parser |
| `0x04` JSON_BINARY | JSON_BINARY 15B header parser |

JSON / CBOR / MSGPACK 模式下不使用 JSON_BINARY 15B Header，`bodyEncoding` 字段不存在。

### 19.3 bodyEncoding

| bodyEncoding | 名称 | 说明 |
| ---: | --- | --- |
| `0x00` | `NONE` | 无 body，或非 Binary 编码内部占位 |
| `0x01` | `TLV8` | `fieldId:uint8 + length:uint8 + value` |
| `0x02` | `TLV16` | 支持扩展长度的 TLV |

Phase 1 必须实现 `NONE` 和 `TLV8`；`TLV16` 是后续扩展。`bodyEncoding` 只在 `rpcEncoding=JSON_BINARY` 时有语义。

### 19.4 statusCode

`statusCode` 复用 ErrorCode Registry：

- Request / Event：必须填 `0x0000`
- Response 成功：必须填 `0x0000`
- Response 失败：填 ErrorCode Registry 中的非 0 错误码

JSON_BINARY RESPONSE 中 `statusCode` 与 JSON `status.code` 对应，不再维护独立 RPC statusCode 表。当前 JSON_BINARY Header 的 `statusCode` 为 uint16，映射到文本 `status.code:uint32` 时零扩展；`statusCode == 0` 等价于 `status.ok=true`；`statusCode != 0` 等价于 `status.ok=false`。

### 19.5 Binary 与 op+d 语义映射

| op+d 字段 | Binary 字段 | 说明 |
| --- | --- | --- |
| `sid` | `sid` | uint32；JSON/CBOR/MSGPACK hex string ↔ JSON_BINARY uint32 必须无损互转 |
| `op` | `rpcOp` | 直接对应 |
| `d.id` | `requestId` | uint32，Event 填 0 |
| `d.method` | `methodOrEventId` | 方法名映射到 uint16 methodId |
| `d.event` | `methodOrEventId` | 事件名映射到 uint16 eventId |
| `d.intent` | body 或本地订阅上下文 | Binary 固定头不携带 intent |
| `d.params` / `d.result` / `d.data` | `body` | JSON/CBOR/MSGPACK object ↔ TLV8/TLV16 |
| `d.status.ok` | `statusCode == 0` | bool 不单独入 JSON_BINARY Header，由 statusCode 推导 |
| `d.status.code` | `statusCode` | 状态码，0=成功，非 0=错误码 |

---

## 20. TLV Body 编码

TLV 基本结构：`type(1B) + length(1B) + value(N)`，扩展长度格式见 `docs/specs/3-codec/03-TLV-Encoding.md`。

TLV 字段 ID 由 Method Registry 的 schema 定义，不在 RPC 协议中硬编码。fieldId 范围分配见 `docs/specs/3-codec/04-Schema-Numbering.md`。

示例（简单 uint8 字段）：

```text
JSON params: { "level": 3 }
TLV body:    01 01 03
             fieldId=0x01, length=1, value=3
```

---

## 21. 完整示例

### 21.1 SetAlgorithmConfig（JSON）

Request：

```json
{
  "sid": "12345678",
  "op": 7,
  "d": {
    "id": 1,
    "method": "audio.setAlgorithmConfig",
    "params": {
      "config": {
        "noiseSuppression": {
          "level": 2
        }
      }
    }
  }
}
```

Response 成功：

```json
{
  "sid": "12345678",
  "op": 8,
  "d": {
    "id": 1,
    "status": {
      "ok": true,
      "code": 0
    },
    "result": {
      "applyState": "applied",
      "requiresAudioRestart": false,
      "config": {
        "noiseSuppression": {
          "level": 2
        }
      }
    }
  }
}
```

Response 失败：

```json
{
  "sid": "12345678",
  "op": 8,
  "d": {
    "id": 1,
    "status": {
      "ok": false,
      "code": 603,
      "msg": "noiseSuppression.level out of range",
      "details": {
        "field": "noiseSuppression.level",
        "max": 3
      }
    }
  }
}
```

### 21.2 AlgorithmConfigChanged（JSON Event）

```json
{
  "sid": "12345678",
  "op": 6,
  "d": {
    "event": "audio.algorithmConfigChanged",
    "intent": 1,
    "data": {
      "reason": "user_request",
      "applyState": "applied",
      "requiresAudioRestart": false,
      "config": {
        "noiseSuppression": {
          "level": 2
        }
      },
      "changedFields": ["noiseSuppression.level"]
    }
  }
}
```

### 21.3 GetAlgorithmConfig（JSON_BINARY，空选择器）

```text
Request:
04 07 78 56 34 12 01 00 00 00 01 09 00 00 00
rpcEncoding=JSON_BINARY(4), rpcOp=Request(7), sid=0x12345678, requestId=1, methodId=0x0901, statusCode=SUCCESS, bodyEncoding=NONE
body: empty

Response 成功:
04 08 78 56 34 12 01 00 00 00 01 09 00 00 01 ...
rpcEncoding=JSON_BINARY(4), rpcOp=RequestResponse(8), sid=0x12345678, requestId=1, methodId=0x0901, statusCode=SUCCESS, bodyEncoding=TLV8
body: TLV8 encoded AudioAlgorithmConfig, field layout comes from generated schema
```

### 21.4 完整连接流程（JSON）

```text
[连接建立]
Server → Client:
  { "sid": "", "op": 0, "d": { "axtpVersion": "1.0.0-rc1", "rpcVersion": 1 } }

Client → Server:
  { "sid": "", "op": 2, "d": { "rpcVersion": 1, "eventMasks": "090101" } }

Server → Client:
  { "sid": "12345678", "op": 3, "d": { "negotiatedRpcVersion": 1 } }

[业务调用]
Client → Server:
  { "sid": "12345678", "op": 7, "d": { "id": 1, "method": "audio.getAlgorithmConfig" } }

Server → Client:
  { "sid": "12345678", "op": 8, "d": { "id": 1, "status": { "ok": true, "code": 0 }, "result": { "noiseSuppression": { "level": 2 } } } }

[断线重连]
Client → Server:
  { "sid": "", "op": 2, "d": { "rpcVersion": 1, "resumeSid": "12345678" } }

Server → Client:
  { "sid": "12345678", "op": 3, "d": { "negotiatedRpcVersion": 1 } }
```

---

## 22. 与 MCP 的兼容性

AXTP RPC 使用 `status` 对象描述执行结果，与 JSON-RPC 2.0 / MCP 的 `result / error` 互斥模式不同，但可通过适配层转换：

```text
AXTP Request (op=7)          → MCP tool call      (method, params)
AXTP RequestResponse (op=8)  → MCP tool result    (status.ok=true → result; status.ok=false → error)
AXTP Event (op=6)            → MCP notification   (event, data)
```

适配层转换规则：

```text
AXTP → MCP:
  status.ok == true   → { "result": d.result }
  status.ok == false  → { "error": { "code": <mapped>, "message": status.msg, "data": status.details } }

MCP → AXTP:
  result present    → { "status": { "ok": true, "code": 0 }, "result": result }
  error present     → { "status": { "ok": false, "code": <mapped>, "msg": error.message, "details": error.data } }
```

主要差异：

- AXTP `id` 为 uint32，MCP `id` 为 string/number（可直接转换）
- AXTP `sid` 无 MCP 对应物，适配层在 MCP 边界消费
- AXTP `status.code` 使用 AXTP ErrorCode Registry，MCP 使用 JSON-RPC 错误码（需映射）

---

## 23. 老协议 CmdValue 适配

旧协议 CmdValue 不直接塞进 AXTP `methodId:uint16`。兼容层必须通过 Legacy Mapping 将旧 CmdValue 映射到 AXTP MethodId，并在边界处完成 payload/status 转换。

```yaml
legacyMappings:
  - legacyCmdValue: 0xC0021
    axtpMethodId: 0x0402
    axtpMethodName: SetVideoMode
    bodyEncoding: TLV8
```

JSON_BINARY Payload 使用 uint16 methodOrEventId。超出 0xFFFF 的旧 CmdValue 必须通过 `legacy_mapping.yaml` 建立唯一映射，不得改变 AXTP MethodId 宽度。旧 payload 如需短期透传，应在 legacy adapter 中完成，不作为 Phase 1 `bodyEncoding` 枚举。

---

## 24. requestId 与 messageId 的边界

| 字段 | 所属层 | 作用 |
| --- | --- | --- |
| `messageId` | Frame Layer | 分片重组、ACK/NACK、传输排错 |
| `sid` | RPC Session Layer | session 路由与恢复，TextCodec 边界消费 |
| `requestId` | RPC Layer | 匹配业务请求和业务响应 |
| `streamId` | Stream Layer | 标识连续数据流 |
| `seqId` | Stream Layer | 标识流内数据块序号 |

这五个 ID 服务于不同层级，不得相互替代。

---

## 25. 安全与鲁棒性要求

RPC Parser 必须满足：

- body 长度不得超过 Frame.payloadLength
- TLV length 不得越界
- 未知 methodId 返回 `RPC_METHOD_NOT_FOUND`
- 不支持的 rpcEncoding 返回 `RPC_ENCODING_UNSUPPORTED`
- requestId 必须原样返回，RequestResponse 必须匹配已有 pending request
- Event 不得被当作 RequestResponse 处理
- Identified 前收到 Request 必须返回 `status.ok=false, status.code=SESSION_NOT_READY`，不得处理业务请求
- Identify 前必须完成 `axtpVersion` / `rpcVersion` 兼容校验；不兼容时不得进入 APP_READY
- Hello 要求认证时，Identify 必须携带合法认证响应；认证失败不得分配 `sid`
- APP_READY 后收到格式非法、空字符串、非 8 位 hex 或 `0` 的 RPC `sid` 必须拒绝
- 所有整数解析必须显式处理字节序，不允许直接 reinterpret_cast 网络字节流为 C++ struct

---

## 26. MVP 实现范围

### 26.1 必须实现

```text
rpcEncoding = JSON；Standard Framed 优先同时实现 JSON_BINARY
op = Hello(0) / Identify(2) / Identified(3) / Event(6) / Request(7) / RequestResponse(8)
sid+op+d Envelope（JSON，sid 为 8 位 hex string）
axtpVersion SemVer 校验（Hello d.axtpVersion）
AXTP-AUTH-NONE 默认无认证路径
JSON_BINARY Header（15B，sid 为 uint32）
JSON_BINARY TLV8 body encode/decode
uint16 methodId / eventId
uint32 sid（RPC Session ID）
uint32 id（requestId）
method ↔ methodId 映射 / event ↔ eventId 映射
业务 result / status.ok / status.code / status.msg / status.details 结构
```

### 26.2 当前生成业务方法范围

```text
audio.getAlgorithmCapabilities / audio.getAlgorithmConfig
audio.setAlgorithmConfig / audio.resetAlgorithmConfig
```

### 26.3 当前生成业务事件范围

```text
audio.algorithmConfigChanged
```

### 26.4 可暂不实现

```text
RequestBatch / RequestBatchResponse
Reidentify
Bye / ByeAck
stream.open / stream.close
device.statusChanged / stream.opened / stream.closed / stream.error
固件 / 文件 / 日志类 STREAM profile
MessagePack / CBOR
压缩 body / 加密 body
```

---

## 27. 版本与兼容策略

AXTP RPC Session 同时涉及多个版本层级，必须分开处理：

| 版本层级 | 载体 | 何时变化 | 兼容处理 |
|---|---|---|---|
| AXTP Spec 版本 | Hello `d.axtpVersion` | AXTP 规范发布版本变化 | 用于进入 Identify 前的 SemVer 兼容校验。 |
| RPC envelope 版本 | Hello/Identify `rpcVersion`、Identified `negotiatedRpcVersion` | op/d 语义、RPC envelope 或 session 状态机发生不兼容变化 | 当前为 `1`；不兼容时拒绝 Identify。 |
| Frame Header 版本 | Standard Frame Header `Version` | Frame Header 字段布局或解析规则变化 | 由 Frame parser / CONTROL 处理，不等同于 `axtpVersion`。 |
| Registry / generated 版本 | registry YAML、generated protocol metadata | method/event/error/schema/capability 事实变化 | 不改变 RPC envelope；通过 generator、capability 和业务错误处理。 |
| Runtime / firmware / app 版本 | 产品或实现自有字段 | 实现发布变化 | 不得写入 `axtpVersion`。 |

Hello 中的 `axtpVersion` 必须体现 AXTP 规范版本号。对于正式 release tag `spec/vMAJOR.MINOR.PATCH`，线上值使用 `MAJOR.MINOR.PATCH`；对于 Core Freeze Candidate 或预发布规范，可以使用 `MAJOR.MINOR.PATCH-prerelease`，例如 `1.0.0-rc1`。

`axtpVersion` 的 SemVer 规则：

- `MAJOR` 表示不兼容边界；不同 major 默认不兼容。
- `MINOR` 表示向后兼容能力新增；同 major 下旧客户端可以继续使用已知能力。
- `PATCH` 表示非破坏性修正；不应改变 wire compatibility。
- prerelease 默认按精确版本处理，除非 runtime 明确声明兼容范围。

新增 methodId/eventId 不需要修改 RPC 协议版本，只需更新 Registry 和 Generator 输出。

新增可选 body 字段不需要修改方法版本，旧设备可忽略未知 TLV 字段。

修改已有字段语义属于破坏性变更，必须新增 method version 或新增 methodId。

废弃字段不得立即复用 fieldId，应标记 `deprecated: true`。

新增认证方案不得复用 `AXTP-AUTH-OBS-SHA256` 的字段语义。若未来增加 token、证书、签名或加密协商，应通过新的 `authentication.scheme` 和明确的安全文档扩展，旧客户端看到未知 scheme 必须拒绝 Identify 或按无能力处理。

---

## 28. 与后续文档的关系

| 文档 | 关系 |
| --- | --- |
| `docs/specs/1-core/03-Frame-and-Payload.md` | Frame Header、PayloadType、Fragment、CRC |
| `docs/specs/1-core/05-Control-Session.md` | CONTROL 建立 Session，不承载业务方法 |
| `docs/specs/1-core/07-Stream-Data-Plane.md` | STREAM 数据面，RPC 只负责控制面 |
| `docs/specs/3-codec/01-Type-System.md` | wire 类型定义（uint8/string/bitmap/array/object） |
| `docs/specs/3-codec/03-TLV-Encoding.md` | body 字段 TLV 编码格式、扩展长度、canonical encoding |
| `docs/specs/3-codec/04-Schema-Numbering.md` | schema-local fieldId 分配、废弃规则 |
| MethodId/EventId/ErrorCode/Capability 注册表 | 业务语义单一事实源 |
| 老协议适配规范 | CmdValue/legacy payload 到 RPC 的映射 |
| Generator v1 实现规范 | 从 registry 生成 C++ 和 Markdown |

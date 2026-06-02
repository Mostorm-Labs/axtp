# AXTP 研发说明与项目 Kickoff 文档

> 状态：Draft
> 面向对象：固件/MCU、客户端/前端、云端/Agent、测试、协议仓库维护者
> 基于材料：`docs/kickoff/AXTP_R&D_Kickoff.md`、`docs/specs/`、`docs/archive/source-planning/`、`registry/`、`docs/generated/`、`docs/migration/generated/`、`docs/legacy-protocols/`

## 0. 一句话结论

AXTP 不是再造一份格式表，而是把设备通信从“每条链路一套协议、每个业务一套解析、每次联调靠人肉对齐”升级为“统一协议骨架 + 注册表事实源 + 自动生成 + 多传输复用 + legacy adapter 兼容”的研发体系。

这套方案要解决的核心矛盾是：我们的设备业务已经覆盖 HID、BLE、UART、TCP、WebSocket、HTTP 等多种链路，旧二进制协议擅长省字节但缺少统一 event/session/stream 表达，早期 HTTP/JSON 协议更易读但天然偏单向 request/response，无法稳定承载设备主动事件、长生命周期流、断点恢复和跨端一致的能力发现。AXTP 把这些能力拆到 CONTROL、RPC、STREAM、Registry 和 Transport Profile 中，让不同传输共享一套业务语义。

## 1. 为什么必须引入新的协议方案

### 1.1 当前业务已经不是单一链路问题

现有材料显示，legacy 协议并不是一份协议，而是一组历史上逐步长出来的协议族：

| 来源 | 现状特征 | 当前迁移统计 |
|---|---|---:|
| AXDP HID / 二进制命令 | `CmdValue`、固定结构、HID 低带宽控制、升级与日志等大块数据混杂 | 233 条 legacy 映射 |
| VM33 HTTP JSON | `Seq/Class/Method/Param`，主要通过 HTTP body 表达请求/响应 | 152 条 legacy 映射 |
| 数字标牌 / Rooms 类协议 | 已出现 `sid/op/d`、WebSocket、event 概念，但与 HID/BinaryRPC 不统一 | 33 条 signage 映射 |

迁移工具当前共抽取 418 条 legacy 映射，其中 361 条映射为 RPC method，11 条映射为 Event，11 条映射为 STREAM，35 条映射为 Capability。也就是说，我们面对的是一个已经跨设备族、跨传输、跨业务域的协议资产池，而不是单点格式优化。

### 1.2 旧二进制协议的问题

旧二进制协议的优点是紧凑、适合 HID/BLE/MCU，但它把很多本应分层的概念揉在一起：

| 问题 | 具体影响 | AXTP 判断 |
|---|---|---|
| `CmdValue` 与业务强绑定 | 命令号可能超过 `uint16`，不同域可能冲突，也可能混入设备族、版本、方向位 | 不直接把所有旧 `CmdValue` 当 methodId，而是保留 `legacy.cmdValue` |
| 缺少统一 Event 模型 | 设备主动状态变化、升级进度、录制状态、配置变化只能靠轮询、notify 变体或业务自定义字段 | 统一为 RPC Event `op=6`，并由 Event Registry 管理 |
| 大块数据与控制命令混杂 | OTA、日志、音视频、KVM、文件块容易塞进 BinaryRPC body，造成阻塞、重传困难和状态机混乱 | 统一拆成 RPC 建流 + STREAM 数据面 |
| Header 被业务污染 | Firmware、RawStream、LogStream、Diagnostic 等旧 PayloadType 容易继续膨胀 | AXTP 顶层 PayloadType 固定为 CONTROL/RPC/STREAM |
| 缺少跨传输能力发现 | 同一功能在 HID、BLE、WebSocket 上暴露方式不同 | `capability.supportedMethods` 从 method bitmap 生成 |
| 可观测性弱 | 二进制字段靠文档解释，文档和代码容易漂移 | Registry 生成文档、JSON、C++ header、测试向量 |

从 `AXDP_MethodId_Registry_v2.xlsx` 看，单 AXDP MethodId Registry 就有 231 行，主要集中在 camera、audio、misc、diagnostic、network、config、usb、firmware 等域；Review Issues 中还包含 Experimental/Diagnostic、Compat/Deprecated、Duplicate MethodId、CheckDuplicate、Reserved 等状态。这说明 legacy 二进制协议已经承载大量历史包袱，需要迁移治理，而不是继续加分支。

### 1.3 早期 HTTP/JSON 协议的问题

VM33 HTTP 文档中的 V1 模型主要围绕 HTTP body：

```text
Seq / Class / Method / Param / Result / ErrorNo
```

这种表达对人友好，但工程上有几个明显短板：

| 问题 | 典型表现 |
|---|---|
| HTTP request/response 偏单向 | 设备主动事件、订阅变更、升级进度只能通过轮询或额外 notify 约定 |
| 缺少统一帧层 | 没有 version、payloadType、fragment、CRC、ACK/NACK、STREAM cursor 等跨传输事实 |
| `Seq` 语义过窄 | 只做请求端自增和响应匹配，无法覆盖 Frame messageId、RPC requestId、Stream seqId 三类不同 ID |
| `Class/Method` 字符串过重 | 低带宽链路不能长期依赖字符串路由 |
| Config 过于万能 | 大量能力塞进 `Config.Get/Set` 的 `Name/Config`，类型、权限、版本边界不清楚 |
| 错误码过粗 | 迁移材料记录了 `OptFailed`、`NotFound` 这类粗粒度错误，难以做自动恢复和测试断言 |
| 文件/升级接口阻塞 | 进度、结果、断点、校验没有统一模型 |
| 文档质量难以保证 | 迁移材料记录了 JSON 语法、大小写、字段拼写和命名不一致问题 |

Rooms 和数字标牌材料已经出现 `sid/op/d`、Hello、Subscribe、Event、Request、RequestResponse 等更现代的形态，这说明方向是对的。但这些语义还没有和 HID/BinaryRPC/STREAM/Capability 统一起来。AXTP 的目标是把这套较好的会话/RPC/event 思路推广到所有传输，同时补齐二进制、低带宽和数据面的能力。

### 1.4 继续沿用旧协议的真实成本

如果不引入 AXTP，后续新增一个业务能力通常会重复经历：

1. HID 写一份二进制命令。
2. WebSocket 或 HTTP 写一份 JSON 方法。
3. 固件、客户端、云端各自手写常量、schema、错误码。
4. 测试重新维护多套用例。
5. 出问题后靠抓包和人工文档对齐定位。

这会让每个新功能都带着协议债务上线。短期看是“省了一次架构迁移”，长期看是每条业务线都在重复支付解析、调试、兼容和文档漂移成本。

## 2. AXTP 如何解决这些问题

### 2.1 分层：让每层只做自己的事

AXTP 把职责分成五层：

| 层级 | 职责 | 明确不做 |
|---|---|---|
| Transport | HID、TCP、WebSocket、BLE、UART 等字节或消息传输 | 不理解 method/event/业务字段 |
| Frame | Magic、version、length、messageId、fragment、CRC | 不理解 firmware/video/display 等业务语义 |
| Payload | 只分发 CONTROL、RPC、STREAM | 不承载业务类型枚举 |
| Registry | method、event、error、schema、capability、profile 的事实源 | 不改变 frame wire format |
| Business | 设备实际业务处理 | 不直接污染 frame header |

这层边界解决两个根本问题：

- 换传输时，业务 method/event 不需要重写。
- 新业务增长时，不需要继续扩展 Frame Header 或顶层 PayloadType。

### 2.2 三类 Payload：CONTROL / RPC / STREAM

AXTP v1 顶层只保留三类 PayloadType：

| PayloadType | 用途 | 解决的问题 |
|---|---|---|
| CONTROL | OPEN、ACCEPT、HEARTBEAT、ACK、NACK、CLOSE、RESUME、WINDOW_UPDATE | 建连、流控、确认、恢复不再散落在业务协议里 |
| RPC | Hello、Identify、Request、Response、Event、Batch | 设备查询、参数设置、事件推送统一表达 |
| STREAM | OTA chunk、文件块、日志流、音视频、KVM/HID raw、传感器连续数据 | 大块/连续数据不再塞进 RPC body |

关键设计是：业务类型不进入 PayloadType。比如 OTA 不再是一个顶层 payload，而是：

```text
RPC firmware.begin -> 返回 streamId/profile/chunkSize
STREAM streamId/seqId/cursor/data -> 传输固件数据
RPC firmware.verify/apply -> 校验和应用
RPC Event firmware.updateProgress/updateCompleted/updateFailed -> 进度和结果
```

### 2.3 两条正式传输路径：兼容 Web 与嵌入式

AXTP v1 Core 当前收敛为两类正式路径：

| 路径 | 适用传输 | Frame | CONTROL | RPC | STREAM |
|---|---|---|---:|---:|---:|
| Standard Framed | AXTP-USB-HID、AXTP-TCP | 12B Standard Frame + CRC16 | 是 | JSON / Binary | 是 |
| WebSocket Unframed JSON | AXTP-WS-JSON、AXTP-WS-CLOUD-REVERSE | 无 AXTP Frame | 否 | JSON `sid/op/d` | 否 |

WebSocket Unframed JSON 被定义为正式 RPC-only 通道，适合浏览器、云端、调试工具和轻量控制。它不承载生产 STREAM。OTA、文件、音视频等连续数据必须走 Standard Framed 或后续明确声明的低带宽降级 profile。

AXTP 同时区分物理连接角色和逻辑服务角色：

```text
OPEN follows physical connection direction.
Hello follows logical service direction.
```

因此云端反连时，设备可以是 WebSocket Physical Client，但仍然是 AXTP Logical Server，仍由设备发送 Hello 并暴露 method/event/stream 能力。

### 2.4 统一 RPC 和 Event

AXTP RPC 使用统一的 `sid/op/d` envelope 语义：

| op | 名称 | 方向 | 说明 |
|---:|---|---|---|
| 0 | Hello | Server -> Client | 服务端声明协议版本、认证要求 |
| 2 | Identify | Client -> Server | 客户端认证、恢复、事件订阅 |
| 3 | Identified | Server -> Client | 服务端确认并分配 sid |
| 6 | Event | Server -> Client | 设备主动事件 |
| 7 | Request | Client -> Server | 业务请求 |
| 8 | RequestResponse | Server -> Client | 业务响应 |

Binary RPC 与 JSON RPC 共用同一套 method/event/error/schema registry。区别只是编码：

- WebSocket/调试/云端更适合 JSON。
- HID/TCP/MCU 高吞吐路径更适合 Binary RPC + TLV。

这让前端、云端、固件不再维护两套业务 API。

### 2.5 Event 订阅：从全局位图变为域级掩码

旧方案中的全局订阅位或各种 notify 结构无法支撑多域扩展。AXTP 使用 Domain-Scoped Event Mask：

```text
Domain Block = DomainId(1B) + MaskLen(1B) + Bitmask(NB, Little-Endian)
```

优点：

- 对 MCU 是 O(1) 位运算。
- 对客户端/云端可以用 Hex/Base64 字符串透明传输。
- 每个 domain 独立扩展，不互相挤占 bit。
- EventId 高字节与 DomainId 对齐，便于生成器自动校验和生成过滤逻辑。

MVP 阶段设备可以先全量广播核心事件，P1 再实现按掩码过滤。

### 2.6 STREAM：把大块数据从 RPC 里拿出来

STREAM Header 固定 16B：

```text
streamId:uint32 + seqId:uint32 + cursor:uint64
```

它不携带 `streamType`、`firmwareType`、`videoCodec`、`offset`、`timestamp` 等业务字段。业务含义由 RPC 建流时产生的 Stream Context 绑定：

| 场景 | 控制面 | 数据面 cursor |
|---|---|---|
| OTA | `firmware.begin/verify/apply/abort` | `byteOffset` |
| 文件 | `file.beginTransfer/endTransfer` | `byteOffset` |
| 视频/音频 | `video.startPreview`、`audio.startStream` | `timestampUs` |
| 日志 | `log.startStream` | `timestampUs` |
| HID/KVM | `input.openKvm` | `timestampUs` |

这样做可以把可靠性、断点续传、窗口、ACK/NACK、资源回收做成通用能力，而不是每个业务重新设计。

### 2.7 Registry-Driven：一份事实源生成所有产物

AXTP 仓库的核心流程是三段式编译：

```text
registry/**/*.yaml + registry/domains/**/*.yaml
        -> Source Model
        -> protocol/axtp.protocol.yaml
        -> docs/generated/ + tooling/mcp/ + runtimes/*/generated/ + tooling/test-vectors/
```

人工只维护 `registry/` 与 `registry/domains/` 下的 YAML。以下内容由 Generator 生成，不手写：

- `protocol/axtp.protocol.yaml`
- `docs/generated/protocol.md`
- `docs/generated/protocol.json`
- method/event/error/capability/legacy generated docs
- `tooling/mcp/*.generated.json`
- `runtimes/cpp-core/include/axtp/generated/*.h`
- `tooling/test-vectors/*`

这解决文档、固件枚举、客户端 schema、测试向量之间的漂移问题。

### 2.8 Legacy Adapter：兼容旧协议，但不污染 AXTP Core

AXTP 的兼容策略不是把旧协议塞进 core，而是在 core 外面放 Adapter：

```text
Legacy Protocol
    -> Legacy Adapter
    -> AXTP RPC / Event / STREAM
    -> AXTP Core / Business
```

Adapter 负责：

1. 嗅探 legacy 协议类型。
2. 解析旧 `CmdValue`、`Seq/Class/Method`、status 和 raw payload。
3. 查 `legacy-to-axtp-map.generated.yaml`。
4. 转换成 AXTP method/event/stream/capability。
5. 将 AXTP 响应翻译回 legacy 响应。
6. 字段 schema 不完整时保留 raw legacy bytes 作为诊断信息。

Adapter 不允许：

- 修改 AXTP Frame Header。
- 新增业务 PayloadType。
- 绕过 Registry 直接调业务。
- 在 core 里硬编码 AXDP/VM33/数字标牌分支。

这能保证新协议干净，同时给旧 App/旧设备一条可控迁移路径。

## 3. 开发者需要付出的适配工作

### 3.1 当前已落地基础

当前生成协议中已有：

| 类别 | 已有内容 |
|---|---|
| Methods | 10 个：`device.getInfo`、`capability.supportedMethods`、`display.getBrightness`、`display.setBrightness`、`firmware.begin/end/verify/apply`、`network.getApInfo`、`stream.open` |
| Events | 7 个：display brightness、firmware progress/completed/failed、network AP、stream opened/error |
| Errors | 154 个错误码 |
| Profiles | `AXTP-MVP`、`AXTP-MVP-HID`、`AXTP-HID-MEDIA` |
| Stable MVP | device、capability、display、firmware OTA 基础链路 |
| Draft | network AP、stream HID media |

### 3.2 legacy 协议整体迁移工作量

迁移工具生成的工作量快照：

| 指标 | 数量 | 含义 |
|---|---:|---|
| legacy 映射总数 | 418 | 来自 AXDP、VM33、数字标牌等材料 |
| RPC method 映射 | 361 | 控制、查询、设置、诊断等小参数能力 |
| Event 映射 | 11 | notify/subscribe/status 统一为 AXTP Event |
| STREAM 映射 | 11 | 固件、文件、日志、媒体、KVM、大块状态同步 |
| Capability 映射 | 35 | legacy feature/config/support matrix 到 capability |
| candidate registry patch | 406 | 需要按域 review 后进入 `registry/domains/` 的候选 |
| adapter-only | 10 | deprecated 或兼容专用，不进入正式 registry |
| existing registry mapping | 2 | `BetaDeviceInfo`、`BetaBrightnessSet` 已有权威映射 |
| 候选新增 methods | 336 | 需要 domain owner 审查命名、schema、错误码 |
| 候选新增 events | 11 | 需要 event schema、订阅位、触发条件 |
| 候选新增 capabilities | 283 | 多来自配置项、设备能力矩阵和 feature bit |
| 候选新增 schemas | 717 | 需要把 raw/legacy payload 逐步结构化 |
| 候选 domain 文件 | 51 | 需要建立/合并到 `registry/domains/<domain>/domain.yaml` |

候选迁移的高频目标域：

| 目标域 | 映射数量 | 说明 |
|---|---:|---|
| camera | 66 | 图像、曝光、跟踪、PTZ、画面策略 |
| audio | 64 | 音量、降噪、回声、录音、Dante/AMX 音频相关 |
| diagnostic | 33 | 产测、自检、健康状态、RS232/网络/存储检查 |
| network | 27 | DHCP、IP、网关、Wi-Fi、NDI、扫描状态 |
| misc | 25 | 历史杂项，需要二次归域 |
| config | 23 | Config.Get/Set 类通用配置 |
| device | 21 | 设备信息、唯一 ID、外设信息 |
| system | 16 | 重启、时间、系统状态 |
| firmware | 13 | OTA、升级、云升级 |
| usb | 10 | HID call、VID/PID、USB 名称与模式 |

这份数据意味着：AXTP MVP 已经能证明核心链路，但真正全量迁移是一个按域治理的工程项目。不能一次性把 336 个方法、717 个 schema 全部合入主干；应先按业务优先级分批。

### 3.3 每条设备协议的适配步骤

每条 legacy 命令或新业务 method 需要完成以下工项：

| 步骤 | 产物 | 负责人 |
|---|---|---|
| 1. 分类 | 判断是 RPC、Event、STREAM、Capability 还是 adapter-only | 协议 owner + 业务 owner |
| 2. 归域和命名 | `domain.verbObject` 或 `domain.objectChanged` | 协议 owner |
| 3. ID 分配 | methodId/eventId/errorCode/capabilityId、bitOffset | 协议 owner |
| 4. Schema 定义 | request/response/event/capability schema，字段 ID 和类型 | 业务 owner + 固件/客户端 |
| 5. Error 映射 | 成功、参数错误、忙、未授权、超时、legacy status 映射 | 业务 owner + 测试 |
| 6. Capability 绑定 | method 需要的 capability、profile 归属、MVP/P1/P2 状态 | 协议 owner |
| 7. Adapter 转换 | legacy request/response/event/stream 到 AXTP 的编解码 | Adapter owner |
| 8. Runtime handler | 固件或服务端 broker handler、stream context、资源回收 | 固件/服务端 |
| 9. Client 调用 | JSON/TLV/SDK wrapper、event subscription、重连恢复 | 客户端/云端 |
| 10. 测试 | generator 校验、协议向量、legacy adapter 向量、端到端场景 | 测试 |

如果字段定义不完整，可以先以 `RAW_BYTES` 或 legacy diagnostic metadata 过渡，但必须在 issue 中记录字段补全计划，不能长期把核心业务停留在 raw payload。

### 3.4 按角色拆分的研发工作

| 角色 | 需要做什么 | 不应该做什么 |
|---|---|---|
| 协议/架构组 | 管理 ID、domain、schema、错误码、profile、PR 审查、版本策略 | 手写 generated 文件 |
| 固件/MCU | 实现 `AxtpCore` 集成、CONTROL 状态机、RPC handler、STREAM context、资源回收、错误返回 | 在 transport 层解析 methodId 或 legacy command |
| 客户端/前端 | 使用 `sid/op/d`、Identify、Request/Response、Event、method bitmap、eventMasks | 为每种传输维护不同业务 API |
| 云端/Agent | 支持 WebSocket JSON RPC、Cloud Reverse 角色、工具 JSON/MCP、会话恢复策略 | 把云端 Physical Server 当 Logical Server |
| Legacy Adapter | 使用生成映射表转换 AXDP/VM33/signage，不硬编码大 switch | 修改 AXTP Core wire format |
| 测试 | 建立 conformance、legacy regression、跨传输 E2E、错误注入、抓包可观测性 | 只测 happy path |
| 文档维护者 | 确保 source YAML、规范、生成文档和 kickoff 材料一致 | 用 Word/Markdown 单独维护协议真相 |

### 3.5 推荐分期

| 阶段 | 目标 | 退出标准 |
|---|---|---|
| P0: MVP 链路固化 | Standard Framed + WebSocket JSON 跑通 device/display/firmware/capability；现有 2 条 AXDP 映射可用 | `pnpm --dir generators build`、`test`、`generate`、`validate:sources` 通过；C++ phase tests 通过；MVP 端到端 demo 可复现 |
| P0: Legacy Adapter 骨架 | Detector、Decoder、Mapper、StatusMapper、StreamBridge 框架落地 | migration test vectors 中 unknown/invalid/status/2 条 Beta 映射通过 |
| P1: 高价值域迁移 | camera/audio/network/config/diagnostic 按域 review 合入候选 methods/events/schemas | 每个域有 owner、schema、adapter、测试向量和迁移说明 |
| P1: Event/Capability 完整化 | eventMasks、Config Name capability、supportedMethods 按设备型号裁剪 | 订阅过滤、能力发现、权限降级测试通过 |
| P1/P2: STREAM 扩展 | 文件、日志、媒体、KVM、传感器等 stream profile 分批稳定 | 每个 profile 有建流 RPC、资源限制、ACK/NACK、断点或失败策略 |
| P2: 低带宽降级 | BLE/HID-64/UART Compact profile 实验 | 独立入口、可回退、CRC8/overflow test vector、不得改变 L2 payload |

## 4. 测试如何使用这套协议

### 4.1 测试入口

协议仓库已经提供多类测试资产：

| 资产 | 用途 |
|---|---|
| `tooling/test-vectors/*.hex` | CONTROL、RPC、Event、STREAM、Compact 错误等线格式向量 |
| `tooling/test-vectors/manifest.json` | 测试向量清单和元数据 |
| `docs/migration/generated/test-vectors.generated.json` | legacy adapter 迁移测试向量 |
| `docs/generated/protocol.json` | 机器可读协议模型，可用于测试平台生成用例 |
| `tooling/mcp/*.generated.json` | 面向工具、Agent、自动化测试的 JSON 描述 |
| `runtimes/cpp-core/tests/phase*.cpp` | C++ runtime 的分层测试 |
| `runtimes/cpp-tools/axtpctl` | CLI 调试入口，适合端到端验证 |

### 4.2 提交前基本命令

```bash
pnpm --dir generators build
pnpm --dir generators test
pnpm --dir generators generate
pnpm --dir generators validate:sources
```

如果修改了 C++ runtime，还需要运行对应 CMake/CTest 测试。现有测试命名已经按阶段组织：

| 测试阶段 | 关注点 |
|---|---|
| phase1 | model / IO |
| phase2 | inbound decode |
| phase3 | outbound encode |
| phase4 | core events、control、broker result |
| phase5 | transport boundary |
| phase6 | real transport |
| phase7 | broker |
| phase8 | API surface |
| phase9 | HID transport |

### 4.3 测试场景矩阵

| 场景 | 必测点 |
|---|---|
| CONTROL 建连 | OPEN/ACCEPT、协商失败、heartbeat、close、非法状态拒绝 |
| RPC 基础 | Hello/Identify/Identified、Request/Response、错误码、requestId 复用规则 |
| Event | op=6、eventId/name 映射、eventMasks、全量广播兼容模式 |
| STREAM OTA | firmware.begin -> STREAM chunk -> ACK/NACK -> verify/apply -> event |
| 多传输一致性 | 同一 method 在 HID/TCP/WebSocket JSON 上语义一致 |
| WebSocket Cloud Reverse | 设备作为 Physical Client 但 Logical Server 发送 Hello |
| Legacy Adapter | 已知命令、未知命令、payload too short/long、legacy status 映射、stream bridging |
| 错误注入 | CRC 错、fragment missing、method not found、busy、timeout、streamId 不存在 |
| 回归 | generated 文件变更必须能追溯到 registry/source YAML |

### 4.4 测试策略建议

1. 用 generated test vectors 固化 wire format，防止 Frame/CONTROL/RPC/STREAM 误改。
2. 用 protocol.json 和 registry JSON 自动生成 method/event/schema 覆盖清单。
3. 用 legacy migration vectors 做兼容回归，避免迁移一批命令时破坏旧 App。
4. 对 STREAM 做长包、断包、乱序、重复包、超时、资源回收测试。
5. 对事件订阅做空订阅、单域、多域、高水位截断、未知 bit 测试。
6. 对安全字段做脱敏、权限、鉴权前不可见 method 测试。

## 5. 如何维护这套协议仓库

### 5.1 单一事实源规则

协议事实只允许进入：

```text
registry/**/*.yaml
registry/domains/**/*.yaml
```

以下路径是生成产物，不手写：

```text
protocol/axtp.protocol.yaml
docs/generated/
tooling/mcp/
tooling/test-vectors/
runtimes/*/generated/
generators/src/__snapshots__/
```

如果生成结果不对，回到 Source YAML 修改，再重新生成。

### 5.2 变更流程

| 变更类型 | 应修改位置 | 必跑检查 |
|---|---|---|
| 新增业务 method/event/type | `registry/domains/<domain>/domain.yaml` | generate、validate:sources、相关 runtime/adapter 测试 |
| 新增公共 schema | `registry/schema/*.yaml` | schema 引用、TLV field id、生成代码 |
| 新增 error code | `registry/error/error_code.yaml` 或 domain YAML | error registry、status 映射、错误测试 |
| 新增 capability | `registry/capability/` 或 domain YAML | supportedMethods/capability 生成校验 |
| 迁移 legacy 命令 | `registry/legacy/legacy_mapping.yaml` 或 migration candidate patch | legacy vectors、adapter regression |
| 调整 core 常量 | `registry/core/*.yaml` + 对应 spec | wire freeze 审查、全量测试 |

### 5.3 审查原则

1. Stable ID 不复用。废弃只能标记 deprecated，不能删除后重用。
2. Core wire format 变更必须升级 Header Version，并经过架构审查。
3. 新业务默认进 `registry/domains/<domain>/domain.yaml`，不要直接进 core registry。
4. Domain 业务晋升 MVP/Core 时，必须迁移而不是复制，避免双事实源。
5. Generated diff 必须和 source YAML diff 同 PR 提交。
6. Legacy compatibility 默认由 Adapter 解决，不能修改 AXTP Core 来适配旧格式。
7. 低带宽 profile 必须使用独立入口，不能在同一 session 中动态切换 frame profile。

### 5.4 建议建立的治理机制

| 机制 | 目的 |
|---|---|
| ARB/协议评审 | 审查新 domain、core 常量、稳定 ID、wire 兼容性 |
| Domain Owner | 对 camera/audio/network/config 等大域负责命名、schema、测试 |
| Generated Artifact Check | CI 检查 generated 是否与 source YAML 同步 |
| Legacy Migration Board | 跟踪 418 条映射的 review 状态、owner、风险、落地阶段 |
| Release Notes | 区分 `specVersion` 与 `registryVersion`，说明新增/废弃/兼容行为 |
| Conformance Gate | 新设备接入前必须通过 MVP 和所声明 profile 的一致性测试 |

## 6. 后续还能如何扩展

### 6.1 协议能力扩展

| 方向 | 扩展方式 |
|---|---|
| BLE/HID-64/UART | 作为 Low-Bandwidth Degradation profile，复用 CONTROL/RPC/STREAM L2 语义 |
| 文件/日志/媒体/传感器 | 新增 stream profile，不改 16B STREAM Header |
| 完整 Capability Model | v2/P1 引入 `capability.getAll`、`capability.query`、动态能力详情 |
| 更紧凑编码 | 后续可启用 CBOR/MessagePack，但必须复用 RPC 语义和 registry |
| 安全与 ACL | 在 Hello/Identify、capability、method metadata 中完善认证、权限、脱敏策略 |
| 多设备路由 | 使用 SourceId/DestinationId、sid 和 gateway routing 扩展 |

### 6.2 工具链扩展

| 方向 | 价值 |
|---|---|
| TypeScript/Python SDK 生成 | 降低前端、云端和测试调用成本 |
| Wireshark/抓包解析器生成 | 提升二进制链路可观测性 |
| MCP Tool Schema 生成 | 让 Agent 能从协议事实源直接理解设备能力 |
| 协议 Diff 工具 | 比较 registryVersion 之间的新增、废弃和 breaking risk |
| 设备能力矩阵生成 | 从 capability/profile 生成型号、固件版本和功能覆盖表 |
| Mock/Simulator 生成 | 用 protocol.json 快速生成设备模拟器和回归服务 |

### 6.3 业务扩展

当前 legacy 映射已经给出了后续优先方向：

- camera/audio 是最大业务域，适合先做高频控制和核心设置。
- diagnostic/network/config 是联调和运维收益最高的域。
- firmware/file/log/media/KVM 应优先按 STREAM profile 处理，避免继续扩大 RPC body。
- VM33 Config Name 中的 Wi-Fi、AP、OSD、Time、Volume 等能力应逐步从万能 Config 拆成稳定 schema 和 capability。

## 7. Kickoff 还需要补充说明的问题

除了 WHY/WHAT/HOW，项目 kickoff 建议明确以下事项：

| 主题 | 需要说明的问题 |
|---|---|
| 项目范围 | P0 必须交付什么，P1/P2 明确延后什么 |
| 非目标 | v1 不做完整 Capability Model、不让 WebSocket JSON 承载 STREAM、不动态协商 Header Profile |
| 兼容策略 | 旧 App、旧固件、新 App、新固件如何组合运行，失败如何回退 |
| Owner | 每个 domain、runtime、adapter、测试、文档的责任人 |
| 里程碑 | MVP demo、legacy adapter skeleton、第一批 domain migration、设备试点、发布冻结 |
| 风险 | 低带宽 MTU、legacy 字段缺失、命名不统一、schema 爆炸、敏感字段明文、测试资产不足 |
| 成功指标 | 新增方法平均接入时间、联调问题定位时间、跨传输复用率、generated drift 为 0、legacy regression 通过率 |
| 变更冻结 | v1 Core Freeze 后哪些字段只能 clarification，哪些需要 registryVersion 升级 |
| 培训 | 固件、客户端、测试分别需要掌握哪些最小 API 和调试工具 |
| 试点设备 | 选择哪类设备先跑通 HID/TCP/WebSocket/OTA/Event 全链路 |

## 8. 建议的 kickoff 议程

1. 背景：用 legacy 数据说明为什么不能继续烟囱式协议。
2. 核心架构：Transport/Profile、Frame、CONTROL/RPC/STREAM、Registry。
3. MVP Demo：OPEN/ACCEPT、Hello/Identify、supportedMethods、display.setBrightness、Event、firmware OTA STREAM。
4. Legacy 兼容：Adapter 边界、418 条映射数据、第一批迁移策略。
5. 开发工作量：按 P0/P1/P2 和 domain owner 拆分。
6. 测试策略：generated vectors、runtime tests、legacy regression、端到端矩阵。
7. 仓库治理：source YAML、generated 禁改、PR/CI/ARB 规则。
8. 风险和开放问题：低带宽、schema 缺失、安全脱敏、发布节奏。
9. 行动项：确定 owner、第一批迁移域、试点设备、下次评审时间。

## 9. 首批行动清单

| 优先级 | 行动项 | 产出 |
|---|---|---|
| P0 | 固化 AXTP MVP 端到端链路 | demo、测试记录、问题清单 |
| P0 | 建立 Legacy Adapter skeleton | detector/decoder/mapper/status/stream bridge 基础代码 |
| P0 | Review `legacy-to-axtp-map.generated.yaml` | 每条映射标记 accept/rework/adapter-only/drop |
| P0 | Review `registry-patches.generated.yaml` | 按 domain 拆 PR，不一次性全量合入 |
| P0 | 建立 CI generated drift 检查 | source YAML 与 generated 产物保持同步 |
| P1 | camera/audio/network/config 四个域选 owner | domain migration 计划 |
| P1 | 补齐事件订阅和 capability 策略 | eventMasks、supportedMethods、设备型号能力矩阵 |
| P1 | 建立协议测试看板 | vector 覆盖率、legacy 回归、设备 E2E 通过率 |

## 10. 参考资料

- `docs/kickoff/AXTP_R&D_Kickoff.md`
- `README.md`
- `docs/specs/00-AXTP-Overview.md`
- `docs/specs/01-AXTP-Protocol-Framework.md`
- `docs/specs/02-AXTP-Frame-and-Payload-Spec.md`
- `docs/specs/03-AXTP-Transport-Profiles.md`
- `docs/specs/04-AXTP-Control-Session-Spec.md`
- `docs/specs/05-AXTP-RPC-Session-Spec.md`
- `docs/specs/06-AXTP-Stream-Spec.md`
- `docs/specs/07-AXTP-Compatibility-and-Versioning.md`
- `docs/specs/18-AXTP-Low-Bandwidth-Degradation.md`
- `docs/specs/19-AXTP-Generator-v1实现规范.md`
- `docs/archive/source-planning/AXTP-Legacy-Compatibility-Reference.md`
- `docs/archive/source-planning/AXTP-Protocol-Plan.md`
- `docs/migration/generated/migration-plan.generated.md`
- `docs/migration/generated/compatibility-layer.generated.md`
- `docs/migration/generated/cpp-legacy-adapter-plan.generated.md`
- `docs/migration/generated/legacy-to-axtp-map.generated.yaml`
- `docs/migration/generated/registry-patches.generated.yaml`
- `docs/legacy-protocols/*.xlsx`
- `docs/legacy-protocols/*.md`

# AXTP 统一设备通信协议研发 Kickoff 说明文档

## 0. 文档信息

文档名称：AXTP 统一设备通信协议研发 Kickoff 说明文档  
建议路径：docs/kickoff/AXTP_R&D_Kickoff.md  
适用对象：固件/MCU 开发、设备端 Linux/Android 开发、前端/客户端开发、云端/Agent 开发、SDK/CLI 开发、测试团队、项目管理与架构评审人员  
文档目标：说明为什么需要 AXTP、AXTP 如何解决旧协议问题、开发团队需要完成哪些适配工作、测试如何验证、仓库如何维护，以及后续如何扩展。

---

# 1. 一句话结论

AXTP 不是“再写一套新协议”，而是把公司现有分散在 HID、BLE、WebSocket、HTTP、二进制命令表和历史设备协议里的通信能力，统一收敛成一套可生成、可测试、可维护、可跨传输复用的设备通信协议体系。

它的核心价值是：

text 一份协议事实源 统一生成文档、SDK、C++ 头文件、测试向量和工具描述 同一套业务语义同时跑在 HID / BLE / WebSocket / TCP / UART 等传输上 支持 request / response / event / stream 支持新协议演进，也支持 legacy 协议迁移 

本次 Kickoff 的重点不是继续讨论协议是否要做，而是明确：

text 1. 为什么必须做 2. 当前方案如何解决问题 3. 各端需要改什么 4. 测试如何验证 5. 仓库如何维护 6. 后续如何扩展 

---

# 2. 为什么要建设新的协议方案

## 2.1 业务场景已经超过单一协议能承载的范围

当前设备通信场景已经覆盖多种传输方式：

text USB HID BLE WebSocket TCP HTTP / REST UART 未来可能还有 USB Bulk、局域网发现、云端 Agent、中继网关 

这些传输的特性完全不同：

| 传输 | 典型特点 | 协议挑战 |
|---|---|---|
| USB HID | 小包、固定 report、低延迟 | 需要紧凑二进制、分片、requestId、错误码 |
| BLE | MTU 小、低功耗、连接不稳定 | 需要低带宽降级、重传、能力裁剪 |
| WebSocket | 双向消息通道，适合上位机和浏览器 | 适合 JSON-RPC、事件推送、调试 |
| TCP | 高带宽、可靠字节流 | 需要 frame 边界、粘包拆包、流式数据 |
| HTTP | 请求响应清晰，但天然弱双向 | 不适合设备主动事件、状态订阅、长任务回调 |
| UART | 裸流、无连接事件 | 需要完整 framing、同步、错误恢复 |

过去每种传输往往单独设计一套协议，导致：

text 换一个传输，业务命令就要重写； 换一个设备，命令编号和字段含义又变； 同一个业务动作，在 HID、BLE、WebSocket 上长得完全不一样； 文档、固件、前端、测试工具长期不一致。 

这已经不是单个 bug 或单个项目的问题，而是协议体系的问题。

---

## 2.2 早期二进制协议的问题

早期 HID / BLE 二进制协议的优点是：

text 紧凑 MCU 友好 低带宽友好 执行效率高 适合控制命令和升级流程 

但历史二进制协议通常存在以下问题。

### 2.2.1 只有 command，没有完整 RPC 语义

很多老协议有类似 CmdValue 的命令编号，本质上已经接近 methodId，但通常缺少统一的 RPC envelope：

text 缺少统一 requestId 缺少统一 rpcOp 缺少统一 status/error 缺少统一 event 语义 缺少统一 method registry 缺少统一 schema 描述 

这会导致两个问题：

text 1. 请求和响应难以稳定关联。 2. 一旦出现并发、超时、重试、异步通知，就很容易靠私有规则硬补。 

### 2.2.2 很难表达 event

早期二进制协议往往以“主机发命令、设备回响应”为主。设备主动上报通常被做成：

text 特殊 command 特殊状态包 轮询结果 私有 notify 塞在某个固定 report 里 

这带来的问题是：

text 没有统一 eventId 没有统一 event schema 没有订阅关系 没有事件来源和触发条件说明 不同设备事件格式不同 测试工具很难统一监听 

但现在业务已经需要大量 event：

text 设备状态变化 输入源变化 显示参数变化 音频状态变化 OTA 进度变化 流状态变化 错误告警 日志上报 连接状态变化 

如果协议不原生支持 event，业务就会持续用轮询和私有通知绕路。

### 2.2.3 能力发现不统一

很多老协议存在设备能力表、能力矩阵、型号差异表，但它们通常散落在 Excel、PDF、代码宏、固件分支和客户定制文档里。

问题是：

text 能力不知道从哪里读 能力和 method 是否对应不清楚 不同型号支持项无法自动生成 SDK 前端 UI 需要人工适配 测试用例无法自动按能力裁剪 

新协议必须把 capability 变成一等公民，而不是靠文档备注。

### 2.2.4 调试黑盒

二进制协议对设备友好，但对联调不友好。常见问题是：

text 前端说发了，设备说没收到； 设备说解析失败，客户端不知道哪个字段错； 抓包只有 hex，没有 method name、schema、error 解释； 测试工具无法自动解码； 新同事看不懂历史命令表。 

这导致联调效率低，问题定位成本高。

---

## 2.3 早期 HTTP / REST 协议的问题

HTTP / REST 的优点是简单、可读、工具多，适合部分上位机或云端调用。但它也有明显限制。

### 2.3.1 HTTP 天然偏 request/response，不适合设备主动通知

很多设备场景需要设备主动发消息：

text 状态变化主动通知 告警主动通知 OTA 进度主动通知 流状态主动通知 按键/触控/输入源变化主动通知 

HTTP 如果不引入 WebSocket、SSE 或长轮询，就很难自然表达 event。

结果通常会变成：

text 客户端定时轮询 设备端维护临时状态 服务端缓存事件 超时与丢事件问题变复杂 

### 2.3.2 不适合 HID / BLE / MCU 场景

HTTP 依赖较重，不适合小包、低功耗、低内存、无 TCP/IP 栈的设备场景。

对于 HID / BLE / UART，HTTP 不是合适的抽象。

### 2.3.3 与二进制协议割裂

过去 HTTP API 和 HID/BLE 二进制命令往往是两套设计：

text HTTP: /api/device/info HID: CmdValue = 0xB0002 BLE: service/characteristic + opcode 

它们可能表达同一个业务动作，但没有统一 method name、methodId、schema、errorCode。

这会导致：

text 同一业务要写多套文档； 同一业务要写多套测试； 同一业务要写多套 SDK； 各端行为不一致。 

---

## 2.4 文档与代码不同步的问题

旧模式通常是：

text Word / PDF / Excel 写协议 固件手写解析 客户端手写调用 测试手写脚本 工具手写命令 

这个模式的必然结果是：

text 文档改了，代码没改； 固件改了，客户端不知道； 测试脚本还按旧字段跑； 某个客户分支私自扩展； 命令 ID 冲突； 字段单位不一致； 错误码含义漂移。 

AXTP 要解决的不是“再写一份更好的文档”，而是改变协议生产方式：

text 协议事实源机器可读 Generator 统一生成文档、代码、测试向量和工具描述 generated 产物不手写 变更必须回到 registry 

---

# 3. AXTP 当前协议框架如何解决这些问题

## 3.1 用统一分层隔离传输、协议和业务

AXTP 按以下层次组织：

| 层级 | 职责 |
|---|---|
| Transport | 提供 HID、BLE、TCP、WebSocket、UART 等字节或消息传输能力，不理解业务 |
| Frame | 负责边界、长度、分片、校验、messageId，不承载业务类型 |
| Payload | 在 CONTROL、RPC、STREAM 等 payload parser 之间分流 |
| Registry | 定义 method、event、error、capability、schema、profile 等协议事实 |
| Business | 实现真实设备业务逻辑 |

这套分层解决三个核心问题：

text 1. 同一业务命令可以复用到不同传输上。 2. Frame Header 不再随业务膨胀。 3. JSON RPC 与 Binary RPC 可以共享 method/event/error/schema 注册表。 

### 设计原则

text Transport 不理解 methodId。 Frame 不理解 device.getInfo。 PayloadType 只决定大类 parser。 业务语义必须下沉到 Registry。 Business 不直接污染 Frame Header。 

---

## 3.2 CONTROL / RPC / STREAM 三类语义分开

AXTP 把通信语义分成三类。

### CONTROL：链路与会话控制

负责：

text OPEN ACCEPT REJECT READY CLOSE PING PONG 

CONTROL 不负责业务能力，也不负责设备功能调用。

它解决的是：

text 逻辑会话如何建立 双方最大帧尺寸如何协商 编码方式如何选择 是否支持分片 是否支持窗口 是否允许进入后续 RPC 阶段 

### RPC：结构化业务调用与事件

负责：

text request response error event Hello Identify Identified capability.getAll 普通 method 调用 设备主动 event 

RPC 解决的是：

text 统一 request/response 统一 requestId 统一 methodId / methodName 统一 eventId / eventName 统一 schema 统一 errorCode 

这解决了老二进制协议无法自然表达 event 的问题，也解决了 HTTP 难以双向推送的问题。

### STREAM：大数据与连续数据面

负责：

text OTA chunk 文件传输 音视频数据 日志流 KVM / raw data 长时间连续传输 

STREAM 不应该承载普通业务命令。它的目标是：

text 控制面用 RPC 协商； 数据面用 STREAM 高效传输； 避免大数据把 RPC 阻塞死； 避免把视频、OTA、日志全部塞进 Header.payloadType。 

---

## 3.3 同时支持 FramedBinary 和 WebSocketJsonRpc

AXTP 当前支持两种主要 wire mode。

### FramedBinary

适合：

text HID BLE UART TCP binary WebSocket binary USB Bulk MCU / 嵌入式设备 

特点：

text 有 AXTP Frame 支持分片 支持 payloadType 支持 Binary RPC / TLV 支持 STREAM 适合低带宽和高性能场景 

### WebSocketJsonRpc

适合：

text 浏览器 上位机 调试工具 云端 Agent 前端/Node.js 

特点：

text 直接使用 WebSocket text message 承载 JSON-RPC 风格 request / response / event 可读性强 调试简单 适合快速接入和工具开发 

二者不是两套业务协议，而是同一套业务 registry 的两种承载方式。

---

## 3.4 用逻辑会话解决多传输建连差异

AXTP 约定：

text 物理连接由 Transport Profile 负责； AXTP Core 只定义逻辑会话； 逻辑会话由 Client 发送 OPEN 发起； Server 对 OPEN 做 ACCEPT / REJECT 裁决。 

典型流程：

text Client -> Server: OPEN Server -> Client: ACCEPT Server -> Client: Hello Client -> Server: Identify Server -> Client: Identified Client -> Server: capability.getAll 

这里要强调三层职责：

| 层级 | 消息 | 责任 |
|---|---|---|
| Link Session | OPEN / ACCEPT / REJECT | 帧尺寸、编码、分片、窗口、可靠性 |
| RPC Session | Hello / Identify / Identified | 版本、鉴权、会话规则、RPC 准备状态 |
| Business Capability | capability.getAll | 设备能力、方法、事件、属性、UI 适配 |

这样可以避免把“链路协商”和“业务能力发现”混在一起。

---

## 3.5 用 Registry-Driven 解决文档、代码、测试不一致

AXTP 的核心治理方式是：

text 人工维护 registry YAML Generator 生成文档、工具 JSON、C++ headers、测试向量 generated 目录不手写修改 

推荐流程：

text 业务需求 / legacy 迁移需求         ↓ 整理为 registry/domain YAML         ↓ validate-sources         ↓ 生成 Protocol IR         ↓ 生成 docs/generated         ↓ 生成 C++ generated headers         ↓ 生成 tooling/mcp JSON         ↓ 生成 test vectors         ↓ 各端基于生成产物实现和测试 

这会让以下内容保持一致：

text method name methodId event name eventId schema 字段 errorCode capability C++ enum 工具 JSON 测试向量 生成文档 

---

# 4. 开发者需要做哪些适配工作

本节是本次 Kickoff 最重要的执行部分。AXTP 适配不是“某一个人改协议”，而是固件、客户端、测试、工具、仓库维护共同完成。

---

## 4.1 第一类工作：新老协议迁移矩阵

在真正写代码前，必须先建立一份 Excel 迁移表：

text docs/migration/AXTP_Protocol_Migration_Matrix.xlsx 

这份 Excel 不是最终协议事实源，而是迁移台账。

它至少应包含这些 Sheet：

text 1. 总览 Dashboard 2. 老协议命令清单 3. 新 AXTP Method 映射表 4. 新 AXTP Event 映射表 5. Capability 能力映射表 6. Schema 字段映射表 7. ErrorCode 映射表 8. Transport / WireMode 映射表 9. Legacy Adapter 实现表 10. 实现任务表 

每条老协议记录至少要标记：

text 旧协议来源 旧命令 / 字段 / 能力 旧协议方向 旧 request 字段 旧 response 字段 旧 event 字段 新 AXTP domain 新 AXTP method / event / capability / schema 映射类型：same / rename / merge / split / replace / deprecated / adapter / manual 是否进入新协议核心 是否需要 legacy adapter registry 状态 runtime 状态 测试状态 负责人 备注 

迁移原则：

text 能抽象成通用业务能力的，进入 registry/domain。 只为兼容历史设备存在的，进入 legacy adapter。 确认废弃且无客户依赖的，只记录来源，不实现。 

---

## 4.2 第二类工作：Registry 录入与治理

开发者新增或迁移业务时，需要把协议事实落到 YAML，而不是直接改 generated 文件。

需要维护的内容包括：

text method event error capability schema profile legacy mapping 

示例工作项：

| 工作项 | 说明 | 输出 |
|---|---|---|
| method 录入 | 把旧 command 或新业务 API 定义为 AXTP method | registry/domain YAML |
| event 录入 | 把主动上报、状态变化定义为 event | event registry |
| schema 录入 | 定义 request/response/event 字段 | schema registry |
| error 归一化 | 把旧错误码映射到统一 errorCode | error registry |
| capability 录入 | 定义设备支持项、属性、能力矩阵 | capability registry |
| legacy mapping | 记录旧命令到新 method 的映射 | legacy registry |

---

## 4.3 第三类工作：设备端 / 固件适配

设备端需要根据设备形态选择适配方式。

### HID / BLE / UART 设备

重点工作：

text 1. 接入 FramedBinary。 2. 实现 frame decode / encode。 3. 实现 CONTROL OPEN / ACCEPT / READY / CLOSE。 4. 实现 RPC Binary envelope。 5. 实现 requestId 关联。 6. 实现 methodId 分发。 7. 实现 event 主动上报。 8. 实现 errorCode 归一化。 9. 按 negotiated maxFrameSize 做分片。 10. 如涉及 OTA / 文件 / 日志，实现 STREAM。 

### Linux / Android / 高性能设备

重点工作：

text 1. 接入 AxtpEndpoint / AxtpCore / BasicBroker。 2. 注册业务 method handler。 3. 发布 event。 4. 实现 capability provider。 5. 实现 WebSocketJsonRpc 或 FramedBinary transport。 6. 实现 STREAM 对接 OTA、日志、音视频或文件。 

### Legacy 设备

重点工作：

text 1. 保持旧协议可用。 2. 新增 legacy adapter。 3. 把旧 CmdValue 映射到 AXTP methodId。 4. 做字段转换和错误码转换。 5. 增加兼容性测试向量。 6. 不把 legacy 特殊逻辑塞进 AXTP Core。 

---

## 4.4 第四类工作：客户端 / 前端 / 云端适配

客户端和云端不应再针对每个设备手写私有协议，而应基于 generated registry 和 SDK。

重点工作：

text 1. 使用 generated method/event/capability 描述。 2. WebSocket 场景优先接入 WebSocketJsonRpc。 3. 对低带宽设备通过 gateway 或 adapter 使用 FramedBinary。 4. 使用 capability.getAll 生成 UI 能力。 5. 订阅 event，而不是轮询状态。 6. 对长任务使用 event / stream 进度，而不是阻塞 HTTP 调用。 7. 对错误码使用统一 errorCode，而不是解析字符串。 

前端/云端应从：

text 写死每个设备的接口差异 

转向：

text 读取 capability + registry 按 method/event/schema 动态构造调用 

---

## 4.5 第五类工作：SDK / CLI / 工具适配

需要建设：

text AxtpClient AxtpServer axtpctl 调试工具 测试工具 legacy adapter runner 协议抓包/解码工具 

优先级：

| 工具 | 用途 |
|---|---|
| AxtpClient | 上位机/云端/测试调用设备 |
| AxtpServer | 设备端或模拟设备实现 |
| axtpctl call | 命令行调用 method |
| axtpctl listen | 监听 event |
| axtpctl capability | 拉取设备能力 |
| axtpctl stream | 测试 stream / OTA / 文件 |
| legacy adapter test | 验证旧协议映射是否正确 |

---

# 5. 完整工作量清单

以下工作量建议作为项目拆解基础。

## 5.1 协议整理工作量

| 编号 | 工作项 | 负责人 | 产出 | 优先级 |
|---|---|---|---|---|
| P-001 | 梳理所有 legacy 协议来源 | 架构/业务/测试 | 协议来源清单 | P0 |
| P-002 | 建立迁移 Excel | 架构 | migration matrix | P0 |
| P-003 | 老命令归类为 method/event/capability/stream | 架构+业务 | 映射表 | P0 |
| P-004 | 统一 errorCode | 架构+固件 | error registry | P0 |
| P-005 | 统一 schema 字段名、类型、单位 | 架构+各端 | schema registry | P0 |
| P-006 | 确认废弃项和兼容项 | 产品+项目+架构 | deprecated / adapter 策略 | P1 |

## 5.2 Generator 工作量

| 编号 | 工作项 | 产出 | 优先级 |
|---|---|---|---|
| G-001 | 校验 registry 输入 | validate:sources | P0 |
| G-002 | 生成 protocol IR | protocol/axtp.protocol.yaml | P0 |
| G-003 | 生成 method/event/error/capability 文档 | docs/generated | P0 |
| G-004 | 生成 C++ ID / registry / schema / TLV codec | generated headers | P0 |
| G-005 | 生成 JSON-RPC 示例 | docs/generated/examples | P1 |
| G-006 | 生成 Binary-RPC/TLV 示例 | docs/generated/examples | P1 |
| G-007 | 生成 phase-aligned test vectors | tooling/test-vectors | P1 |
| G-008 | 生成 method/event traits | C++ typed helper | P1 |
| G-009 | 生成 MCP/tooling JSON | tooling/mcp | P2 |

## 5.3 C++ Runtime 工作量

| 编号 | 工作项 | 产出 | 优先级 |
|---|---|---|---|
| C-001 | Frame decode/encode | FrameCodec | P0 |
| C-002 | Message reassemble/fragment | Reassembler/Fragmenter | P0 |
| C-003 | Payload decode/encode | CONTROL/RPC/STREAM parser | P0 |
| C-004 | ControlSession | OPEN/ACCEPT/READY/CLOSE | P0 |
| C-005 | RpcDispatcher | request/response/event | P0 |
| C-006 | PendingCallTable | requestId 关联 | P0 |
| C-007 | StreamSession | stream open/data/close | P1 |
| C-008 | BasicBroker | method handler 分发 | P0 |
| C-009 | AxtpEndpoint | transport/core/broker glue | P0 |
| C-010 | HID transport adapter | HID demo / test | P1 |
| C-011 | WebSocket transport adapter | WebSocket demo / test | P1 |
| C-012 | BLE/UART profile skeleton | 低带宽适配 | P2 |

## 5.4 设备业务适配工作量

| 编号 | 工作项 | 说明 | 优先级 |
|---|---|---|---|
| D-001 | device 基础域 | getInfo、getStatus、reset、reboot | P0 |
| D-002 | capability 能力域 | getAll、能力掩码、型号差异 | P0 |
| D-003 | display 域 | 亮度、输入源、显示模式 | P0/P1 |
| D-004 | audio 域 | 音量、静音、输入输出 | P1 |
| D-005 | firmware/OTA 域 | begin/chunk/verify/apply/event | P1 |
| D-006 | log/diagnostic 域 | 日志、诊断、错误上报 | P1 |
| D-007 | stream 域 | 文件、音视频、raw data | P2 |
| D-008 | legacy adapter | 旧命令兼容 | P0/P1 |

## 5.5 测试工作量

| 编号 | 工作项 | 说明 | 优先级 |
|---|---|---|---|
| T-001 | registry 校验测试 | ID、schema 引用、重复检查 | P0 |
| T-002 | generator snapshot 测试 | 生成产物无漂移 | P0 |
| T-003 | frame 测试 | 粘包、半包、非法长度、CRC | P0 |
| T-004 | control session 测试 | OPEN/ACCEPT/REJECT/READY/CLOSE | P0 |
| T-005 | RPC 测试 | request/response/error/event | P0 |
| T-006 | WebSocketJsonRpc 测试 | JSON-RPC call/event/error | P1 |
| T-007 | HID/BLE compact 测试 | 小包、分片、MTU | P1 |
| T-008 | legacy adapter 测试 | 旧命令到新 method 映射 | P0/P1 |
| T-009 | capability 测试 | 不同型号能力裁剪 | P1 |
| T-010 | stream 测试 | OTA、文件、日志流 | P1/P2 |
| T-011 | 互操作测试 | 固件、客户端、CLI、测试工具互通 | P0 |
| T-012 | 长稳测试 | 事件风暴、并发 RPC、流传输、断连恢复 | P1 |

---

# 6. 测试团队如何使用这套协议

测试团队不应再只依赖人工协议文档，而应使用生成产物和测试向量。

## 6.1 测试输入

测试输入应来自：

text docs/generated/protocol.md docs/generated/method_registry.generated.md docs/generated/event_registry.generated.md docs/generated/error_code.generated.md docs/generated/capability_registry.generated.md docs/generated/legacy_mapping.generated.md tooling/test-vectors/ tooling/mcp/ axtpctl 

## 6.2 测试策略

### 一致性测试

验证：

text registry YAML Protocol IR generated docs generated C++ headers test vectors 

是否一致。

### 协议栈测试

验证：

text FramedBinary encode/decode WebSocketJsonRpc encode/decode CONTROL 状态机 RPC request/response/event STREAM 分片和顺序 错误码 超时 关闭 

### 设备能力测试

验证：

text capability.getAll 返回是否符合型号 不支持的 method 是否拒绝 支持的 method 是否可调用 UI 是否按 capability 裁剪 event 是否只在能力支持时产生 

### Legacy 兼容测试

验证：

text 旧命令是否还能工作 旧命令是否映射到正确 AXTP method 字段转换是否正确 错误码转换是否正确 废弃项是否按策略处理 

### 端到端测试

验证：

text 上位机/前端/云端 -> AXTP SDK -> Transport -> 设备 -> Broker -> Business 

覆盖典型流程：

text 连接 OPEN ACCEPT Hello Identify Identified capability.getAll method call event listen stream transfer close 异常恢复 

---

# 7. 仓库后续如何维护

## 7.1 基本原则

text 1. registry 是协议事实源。 2. generated 目录不手写修改。 3. 所有协议变更必须通过 PR。 4. 新增 method/event/error/capability/schema 必须说明来源和使用场景。 5. legacy 迁移必须标记来源文档和映射策略。 6. breaking change 必须走版本治理。 7. 测试向量必须随协议变更同步更新。 

## 7.2 修改流程

推荐流程：

text 业务提出需求     ↓ 填写 migration matrix 或新增 domain proposal     ↓ 架构评审     ↓ 修改 registry/domain YAML     ↓ 运行 validate:sources     ↓ 运行 generator     ↓ 检查 generated docs / headers / test vectors     ↓ C++ / SDK / CLI / 测试同步适配     ↓ PR Review     ↓ 合入主干 

## 7.3 评审重点

每次协议 PR 必须检查：

text methodId 是否冲突 method name 是否符合命名规范 request/response schema 是否清晰 event 是否真的需要主动上报 errorCode 是否复用已有语义 capability 是否需要新增 是否影响 legacy adapter 是否需要新增测试向量 是否需要更新迁移 Excel 是否存在把业务塞进 Frame Header 的问题 是否存在把平台依赖塞进 Core 的问题 

## 7.4 generated 产物治理

禁止：

text 手写 docs/generated 手写 runtimes/cpp-core/include/axtp/generated 手写 tooling/mcp generated JSON 手写 test vector 结果绕过 generator 

允许：

text 修改 registry/source YAML 修改 generator 修改规范文档 修改 runtime 消费 generated 的方式 

---

# 8. 后续如何扩展

AXTP 的扩展应该分层进行，而不是所有需求都改 Frame Header。

## 8.1 新业务域扩展

新增业务域时，应新增：

text registry/domains/<domain>/domain.yaml method event schema error capability profile 

例如：

text network sensor camera ai room signage diagnostic 

## 8.2 新传输扩展

新增传输时，应新增 TransportProfile 和 adapter，而不是改业务 method：

text BLE profile HID profile UART profile TCP profile WebSocket profile USB Bulk profile 

新 transport 必须回答：

text 是否保序 是否可靠 最大帧尺寸 是否 message-oriented 是否支持文本消息 是否支持二进制消息 是否需要分片 是否需要 ACK 扩展 是否支持 STREAM 

## 8.3 新编码扩展

当前重点是：

text JSON Binary/TLV 

未来可以扩展：

text CBOR MessagePack Protobuf FlatBuffers 

但扩展原则是：

text 不改变业务 method/event/schema 只增加 payload encoding 或 profile 

## 8.4 新工具扩展

可以继续生成：

text TypeScript SDK Python SDK C SDK Wireshark dissector MCP tool schema Postman / Bruno collection axtpctl command completion 测试平台用例 Mock device Mock client 

## 8.5 新协议版本扩展

v1 阶段应冻结：

text Frame PayloadType CONTROL RPC STREAM Registry Generator C++ Runtime 基本边界 

v2 再考虑：

text Dynamic Header Extension Header Security Handshake Gateway Routing Multi-client Arbitration Stream QoS Unreliable Datagram Capability Delta Update 

不要为了未来不确定需求提前污染 v1。

---

# 9. 项目阶段建议

## Phase 0：协议资产盘点

目标：

text 收集所有 legacy 协议文档、Excel、PDF、代码命令表、测试脚本。 

产出：

text docs/migration/AXTP_Protocol_Migration_Matrix.xlsx legacy source list 废弃/保留/兼容策略初稿 

## Phase 1：MVP 闭环

目标：

text 跑通最小 AXTP 链路。 

范围：

text OPEN / ACCEPT / Hello / Identify / Identified capability.getAll device.getInfo 一个基础 event 一个 WebSocketJsonRpc demo 一个 FramedBinary demo 

## Phase 2：Legacy 兼容闭环

目标：

text 证明老协议可以迁移到 AXTP，而不是被强行推翻。 

范围：

text 选择一组典型 HID/BLE/设备命令 映射到 AXTP method/event 实现 legacy adapter 补测试向量 

## Phase 3：业务域批量迁移

目标：

text 按 domain 迁移业务能力。 

优先级：

text device capability display audio firmware diagnostic stream 

## Phase 4：SDK / CLI / 测试平台化

目标：

text 让非协议开发者也能使用 AXTP。 

产出：

text AxtpClient AxtpServer axtpctl mock device 测试平台接入 CI 测试向量 

## Phase 5：扩展与治理

目标：

text 建立长期维护机制。 

产出：

text ARB 评审机制 版本治理规则 兼容性策略 domain owner 制度 generated API 稳定策略 

---

# 10. Kickoff 会议还需要补充说明的问题

除了前面五个核心问题，Kickoff 时还建议向大家说明以下内容。

## 10.1 本项目不做什么

明确边界很重要。

本项目不做：

text 不一次性重写所有设备业务代码。 不强制所有老设备立刻切换到新协议。 不把所有 legacy 特例塞进 AXTP Core。 不把 WebSocket、HID、BLE 写成三套业务协议。 不手写 generated 产物。 不在 Frame Header 中加入业务类型。 不把 BasicBroker 做成复杂线程框架。 

## 10.2 谁拥有协议变更权

建议定义：

text 架构组：拥有协议框架、registry 规则、版本治理审批权。 业务域 owner：拥有本 domain 的 method/event/schema 提案权。 固件 owner：负责设备端实现和资源约束评估。 客户端 owner：负责 SDK/UI/tooling 消费方式。 测试 owner：负责测试向量、兼容性和端到端验证。 

## 10.3 如何处理老客户和老设备

需要提前说明：

text 老设备不会因为 AXTP 立即失效。 旧协议通过 legacy adapter 迁移。 能抽象为通用能力的进入新 registry。 只为历史兼容存在的放在 adapter。 确定废弃的记录来源和原因。 

## 10.4 如何判断一个需求应该放在哪里

判断规则：

text 链路控制问题：放 CONTROL。 普通业务调用：放 RPC method。 设备主动通知：放 RPC event。 大块连续数据：放 STREAM。 设备支持能力：放 capability。 字段结构：放 schema。 错误语义：放 errorCode。 旧协议兼容：放 legacy mapping / adapter。 传输差异：放 transport profile。 

## 10.5 如何避免新协议再次失控

约束：

text 所有新增 domain 必须评审。 所有 methodId/eventId 必须唯一。 所有 schema 字段必须有类型、单位、必填规则。 所有 breaking change 必须标记版本。 所有 generated 变更必须可由 generator 重放。 所有 legacy 映射必须有来源。 所有测试必须覆盖至少一个正向用例和一个错误用例。 

## 10.6 项目成功标准

建议定义为：

text 1. 同一个业务 method 可以在 WebSocketJsonRpc 和 FramedBinary 下复用。 2. 至少一个 HID/BLE legacy 命令可通过 adapter 映射到 AXTP method。 3. 至少一个 event 可从设备主动上报到客户端。 4. capability.getAll 可驱动客户端能力裁剪。 5. docs/generated、C++ generated headers、test vectors 可由 generator 稳定重放。 6. axtpctl 可以完成 connect / capability / call / listen。 7. 测试团队可以基于 generated 文档和 test vectors 独立验证协议。 8. 新增一个 method 不需要同时手写三端协议文档。 

---

# 11. 对各团队的行动要求

## 架构组

text 维护协议框架 维护 registry 规则 评审 domain 变更 定义版本治理 推动迁移 Excel 

## 固件/设备端

text 评估资源约束 实现 FramedBinary 实现 ControlSession 实现 RPC request/response/event 实现 capability provider 实现 legacy adapter 

## 客户端/前端/云端

text 接入 WebSocketJsonRpc 消费 generated method/event/capability 使用 capability.getAll 裁剪 UI 使用 event 替代轮询 参与 SDK API 设计 

## SDK/工具链

text 完善 C++ Runtime 实现 AxtpClient / AxtpServer 实现 axtpctl 接入 generated traits 接入 test vectors 

## 测试团队

text 建立协议一致性测试 建立端到端测试 建立 legacy adapter 回归测试 建立能力矩阵测试 建立长稳和异常恢复测试 

## 项目管理

text 维护迁移任务表 跟踪 domain 迁移进度 协调 legacy 兼容策略 推动跨团队验收 

---

# 12. 最终行动计划

建议 Kickoff 后立即启动以下任务：

text 1. 建立 docs/migration/AXTP_Protocol_Migration_Matrix.xlsx。 2. 梳理所有 legacy 协议来源和命令清单。 3. 选取 5~10 个典型命令做第一批映射。 4. 跑通 registry -> generator -> generated docs/headers/test vectors。 5. 跑通 WebSocketJsonRpc MVP。 6. 跑通 FramedBinary MVP。 7. 跑通 capability.getAll。 8. 跑通一个 event。 9. 跑通一个 legacy adapter。 10. 用 axtpctl 或 mock client 做端到端演示。 

---

# 13. 总结

AXTP 的目标不是把旧协议全部推翻，而是把历史上分散的 HID、BLE、WebSocket、HTTP、二进制命令、设备能力表和测试脚本统一收敛到一个可治理的协议体系里。

这套体系的核心不是某一个 header 字段，而是：

text Registry-Driven Generator-Generated Transport-Neutral RPC + Event + Stream Legacy-Compatible Test-Vector-Driven 

只要团队严格遵守：

text 协议事实写 registry 迁移过程写 Excel 生成产物不手改 业务语义不进 Frame legacy 特例不进 Core 测试基于 test vectors 

AXTP 就可以成为后续所有智能硬件、上位机、云端 Agent 和测试工具的统一通信基座。
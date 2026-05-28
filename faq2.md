AXTP 全场景交互流程与双向能力协商规范

本规范旨在详细梳理 AXTP 协议在 TCP、WebSocket、USB HID、BLE、UART 五大典型传输层上的端到端交互流程。
同时，正式确立“双向能力（Capacity/Capability）协商机制”，填补客户端向设备端上报自身物理限制的架构空白。

1. 跨传输层的“大一统”交互时序

AXTP 的核心哲学是分层隔离。从时间轴上看，一个完整的会话生命周期严格分为三个阶段。无论底层物理介质如何变化，阶段二和阶段三的逻辑代码是 100% 跨平台复用的。

sequenceDiagram
    participant C as Client (App/PC)
    participant S as Server (Device/MCU)

    rect rgb(230, 240, 255)
        Note over C, S: 阶段一：传输层物理建连 (因传输介质而异)
        C->>S: 物理握手 (TCP Socket / BLE / USB Enum / WS Upgrade)
        S-->>C: 物理层就绪
    end

    rect rgb(255, 240, 230)
        Note over C, S: 阶段二：L2 底层通道协商 (统一)
        C->>S: [CONTROL: OPEN] (期望 maxFrameSize, mtu)
        S-->>C: [CONTROL: ACCEPT] (裁决最终资源分配)
    end

    rect rgb(240, 255, 240)
        Note over C, S: 阶段三：L7 应用层业务生命周期 (统一)
        Note over S: Server 立即连发 Hello
        S->>C: [RPC: Hello] (告知 auth 策略)
        C->>S: [RPC: Identify] (携带凭证 + ⚠️Client Capacity)
        S-->>C: [RPC: Identified] (鉴权通过)
        
        Note over C, S: --- 业务就绪 (APP_READY) ---
        C->>S: [RPC Req: capability.getAll] (查询 Server 能力掩码)
        S-->>C: [RPC Res: capabilityMasks]
        
        C->>S: [RPC Req: firmware.begin] (业务指令)
        S-->>C: [RPC Res: streamId = 10]
        C->>S: [STREAM: id=10] (数据裸奔透传...)
    end


2. 五大传输层的“破冰”差异 (阶段一)

不同传输层由于其物理特性，在发起 CONTROL OPEN 之前的行为存在差异。AXTP 对此做出了极其明确的工程适配：

2.1 TCP 传输

物理特征： 宽带、可靠、面向连接。

破冰流程： Client 发起 TCP Socket Connect -> Server accept() -> 连接建立。

AXTP 适配： Client 立即发送 OPEN 帧，并且通常申请 Standard Profile（12B 长帧头）和极大的 MTU（如 4096B）。

2.2 WebSocket

物理特征： 基于 HTTP 的全双工协议，Web 友好。

破冰流程： Client 发起 HTTP GET 携带 Upgrade: websocket -> Server 回复 101 Switching Protocols。

AXTP 适配： WebSocket 底层已经处理了分片，因此 Client 发送 OPEN 时，可以申请极其巨大的 maxFrameSize。

2.3 BLE (低功耗蓝牙)

物理特征： 极窄带宽、高延迟、MTU 极小。

破冰流程： Client (手机) 扫描广播 -> 发起 GAP Connect -> 发现 GATT 服务与特征值 -> 打开 Notification (CCCD)。

AXTP 适配： 监听打开的瞬间，Client 发送 OPEN 帧。由于带宽极其昂贵，Client 必须申请 Compact Profile（4B 短帧头），并依据蓝牙协商的 ATT_MTU（如 185B）上报 AXTP 的 MTU。

2.4 USB HID

物理特征： 无需驱动，定长报文（通常 64B）。

破冰流程： 插入 USB -> 操作系统枚举 Report Descriptor 获取端点 -> 物理层直接可用。

AXTP 适配： Client 打开 HID 句柄后直接发送 OPEN。为了在 64B 中塞入更多数据，同样建议降级申请 Compact Profile。

2.5 UART (串口)

物理特征： 无连接态 (Connectionless)，随时可能断电或休眠，纯数据流。

破冰流程： 没有物理握手！ TX/RX 线缆随时是通的。

AXTP 适配： 为了解决无界字节流的分帧问题，UART 必须在外层包裹 COBS (Consistent Overhead Byte Stuffing) 编码。Client 想要通信时，直接向串口扔出一个通过 COBS 转义后的 OPEN 帧。

3. 架构补漏：Capacity / Capability 双向协商机制

在标准的 IoT 协议中，能力协商必须是双向（Bi-directional）的。不仅要查询 Server 的能力，Client 也需要向 Server 声明自身容量 (Client Capacity)。

3.1 最佳挂载阶段：RPC Identify

在底层通道建立后，Client 在发送业务请求前，必须回应 Server 的 Hello（发送 Identify）。这不仅是校验密码的最佳时机，更是客户端向设备自报家门、上报自身软硬件容量限制以及一次性完成事件订阅的绝佳窗口。

3.2 字段设计与交互增强

在 RPC Registry 的 Identify 方法定义中，扩充 clientInfo 和 eventMasks 字段。

Client 发送的 Identify Request 结构增强：

{
  "sid": "session-123",
  "op": 2, // Identify
  "d": {
    "authResponse": "sha256(challenge+password)",
    
    // 客户端信息与容量声明 (Client Capacity)
    "clientInfo": {
      "type": "ios_app",         // 客户端类型
      "version": "1.4.2",        // App 版本
      "maxStreamDecode": 1080,   // 容量：最高支持 1080P 视频解码
      "hasAudioOutput": false    // 能力：客户端没有外放扬声器，别发音频流
    },
    
    // 事件订阅掩码 (Event Subscriptions)
    // 采用 Review 2.0 中确立的“域级特征掩码” Base64 字符串
    "eventMasks": "AQEHBQBBCwED" 
  }
}


3.3 双向协商闭环的完整过程

底层物理容量协商 (L2层)： 在 CONTROL OPEN / ACCEPT 阶段完成 MTU、最大帧长度的协商。

客户端容量与意图上报 (L7层 - Client声明)： 在 RPC Identify 阶段，Client 将鉴权信息、硬解码能力、订阅掩码一次性发给 Server。

服务端能力集拉取 (L7层 - Server声明)： 在状态变为 APP_READY 后，Client 发送 capability.getAll，拉取设备端的“域级特征掩码”，据此动态渲染 App 的控制面板 UI。

3.4 架构解惑：为什么 Capability 必须在鉴权之后？（"先有鸡先有蛋"问题）

开发者的直觉疑问： “既然 Client 在 Identify 时就要订阅 eventMasks，那为什么 Server 不在 Hello 的时候就把设备的 Capability 掩码先发给 Client？Client 都不知道你支持什么，怎么瞎订阅呢？”

这看似是个鸡和蛋的悖论，但在工业级协议设计中，我们坚决拒绝在 Hello 阶段下发能力集，原因如下：

1. 零信任安全原则 (Zero-Trust Security) 泄露防御

Hello 是在 Server 尚未验证 Client 身份前发出的。如果此时把设备的全部能力（包括隐藏的高级调试后门、系统重置接口等）全盘托出，这就构成了严重的信息泄露（Information Leakage）。
原则： 不见兔子不撒鹰。在 Client 通过 Identify 的密码校验之前，Server 拒绝暴露任何业务层的内部机密。

2. 细粒度权限管控 (Role-Based ACL)

设备的 Capability 往往不是静态的，而是根据当前登录用户的角色动态计算的。
例如：管理员登录，掩码里带有 firmware.begin 的支持；普通访客登录，掩码里该位被置零。
因此，Server 必须先收到 Identify 知道你是谁，才能生成匹配你权限的 CapabilityMask。

3. “声明式订阅 (Declarative Intent)”破解悖论

那么 Client 在不知道设备支持什么的情况下，如何发送 eventMasks？
答案是采用现代前端架构中的“意图驱动（Intent-based）”哲学：

Client 的 eventMasks 表达的是：“我期望监听这几个域的事件（比如我想要听屏幕亮度和音量变化）。”

这是一次单向声明。Server 收到后，只会把 Client 期望的 Mask 和 Server 自身实际支持的 Mask 做一次简单的位与运算 (&)。

Client 不需要提前知道设备支持什么。支持的事件会自然下发，不支持的事件自然静默。这让 Client 端代码变得极其简单（它永远只需下发自己关心的全集即可）。

如果某些高级 Client 真的需要先看到 Capability 再决定订阅什么，它完全可以在 Identify 时留空掩码，等鉴权通过、查完 capability.getAll 后，再发送一次 REIDENTIFY 请求更新订阅。这赋予了协议极大的柔性！

4. 云端与 Agent 逆向建连场景分析 (Physical vs Logical Role Reversal) [新增]

在 IoT 云端控制或 AI Agent 接入场景中，由于设备大多处于 NAT 或内网之后，通常是由设备（Device）作为物理连接的发起方，去连接云端（Cloud/Agent）的 WebSocket Server。
此时，云端是“控制者”，设备是“被控者”。这就产生了物理角色与协议逻辑角色的完全倒置。

架构铁律：物理角色（Transport Role）与逻辑角色（AXTP Role）彻底解耦。
无论谁发起了物理连接：

永远是被控端/服务提供者担任 AXTP Server。

永远是控制端/指令下发者担任 AXTP Client。

根据传输模式的不同（是否需要二进制流通道），处理方式如下：

4.1 Framed 场景 (WebSocket Binary 全量协议栈)

适用场景： 云端作为一个透明网关（Pass-through Gateway），需要将设备发来的底层二进制音频、视频、OTA 数据流原封不动地转发给另一端的控制台。云端和设备之间运行完整的 AXTP 二进制帧协议。

交互流程（物理倒置，逻辑不变）：

[物理建连] 设备端（WS Client）发起 HTTP Upgrade，连接到云端（WS Server）。

[L2 协商 - 云端主动] 云端作为逻辑上的 AXTP Client，在 WebSocket 建立成功的瞬间，向设备端下发一个二进制的 [CONTROL: OPEN] 帧（请求建立双向二进制通道）。

[L2 裁决] 设备端收到 OPEN 后，分配底层 MTU，回复 [CONTROL: ACCEPT]。

[L7 就绪] 设备端紧接着连发 [RPC: Hello]，宣誓应用层就绪。

[鉴权与业务] 云端下发 [RPC: Identify]（夹带云端/Agent的身份与能力），随后进入标准的命令下发阶段。

注：在这一模式下，云端的网络框架只需在 onWebSocketOpen 回调里触发一句 sendAxtpOpen() 即可顺滑扭转局面。

4.2 Unframed 场景 (WebSocket Text/JSON 纯应用层对接)

适用场景： AI Agent 或云平台直接对接设备。大模型和 Web 后端并不想去解析底层的 L1/L2 二进制帧头，也不承载高吞吐的音视频连续流。它们只希望通过清晰的 JSON 文本下发控制指令。

架构推演：
因为 WebSocket 自身已经完美处理了报文分界（Framing）、MTU 分片和顺序保证，此时 AXTP 的 CONTROL OPEN/ACCEPT 阶段（专门用于二进制内存管理的 L2 层）失去了存在的意义，纯属脱裤子放屁。

交互流程（跳过 L2，直奔 L7）：

[物理建连] 设备端（WS Client）发起连接，且通过 URL 参数或 Sec-WebSocket-Protocol 头声明使用的是 axtp-json-unframed 模式。

[跳过阶段二] 由于是 Unframed 模式，云端/Agent 和设备端强制越过 OPEN/ACCEPT 流程。

[L7 主动宣誓] 设备端在 WebSocket 打开后，作为被控的 AXTP Server，立刻主动发送纯 JSON 格式的 [RPC: Hello] 给云端。

[鉴权与交互] AI Agent 收到 JSON Hello 后，通过大模型组装出 JSON 格式的 [RPC: Identify] 予以回应，接着下发指令。

极大优势： 在 Unframed JSON 模式下，对于编写 AI Agent 或者 Python 云后端的开发者来说，AXTP 退化成了一个“连接后设备会自动吐出一句 JSON Hello，然后我发 JSON 命令就能控制它”的极度舒适的模型。没有底层握手负担，即插即用！
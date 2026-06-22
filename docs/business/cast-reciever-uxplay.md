# Launcher 大屏 AirPlay / UxPlay 接收端控制

## 背景

我们自主改版了 UxPlay，在 Windows 上集成 AirPlay 接收端。旧方案在 Electron 应用层额外实现了一层外部控制口，再由 Electron 转发或编排 UxPlay backend 控制。

本轮需求要求消除 Electron 外部控制层，把控制协议能力合并到 UxPlay backend 内部控制中。Launcher / UI 不再面向 Electron 外部控制口，而是通过 UxPlay backend 暴露的统一控制能力完成 AirPlay 接收端的必要配置、状态感知和窗口操作。

## 用户目标

Launcher 启动投屏接收端后，UxPlay backend 自动启动 AirPlay 服务。iOS/macOS 发射端能够通过 mDNS 发现该 AirPlay 接收端，并开始投屏。

控制面只保留以下能力：

1. AirPlay 名称获取、设置。
2. 投屏密码获取、设置，以及密码变更事件。
3. 投屏状态流程变更事件，状态只包含 `idle`、`auth`、`casting`、`end`。
4. 投屏窗口控制：窗口置顶、窗口放大、窗口缩小、窗口置底。

## 范围

本需求包含 UxPlay backend 内部控制协议的业务交互设计，以及 Launcher / UI 与 UxPlay backend 之间的最小控制流程。

范围内：

- UxPlay backend 作为唯一控制承载点。
- UxPlay backend 内部控制服务作为 AXTP Logical Server，并实现 `Hello / Identify / Identified` RPC session 建立流程。
- Launcher / UI 查询和设置 AirPlay 显示名称。
- Launcher / UI 查询和设置投屏密码。
- UxPlay backend 在投屏密码变化时发出事件。
- UxPlay backend 在投屏流程状态进入 `idle`、`auth`、`casting`、`end` 时发出事件。
- Launcher / UI 触发投屏窗口置顶、放大、缩小、置底。

## 非目标

- 不保留 Electron 外部控制口作为协议入口。
- 不设计控制端口获取、设置或端口变更事件。
- 不设计音频开关、静音、帧统计、backend 重启、runtime 退出或服务生命周期控制。
- 不标准化 AirPlay、mDNS、RAOP 或媒体传输协议本身。
- 不改 UxPlay 媒体实现，只梳理控制面。

## 场景

### 启动与名称配置

Launcher 启动 UxPlay backend。UI 打开投屏设置页时读取当前 AirPlay 名称；用户修改名称后，UI 将新名称写入 UxPlay backend，并由 backend 立即重启 mDNS/Bonjour 广播，让 AirPlay 服务发现名称按新值发布。

### 投屏密码配置与变化

UI 读取当前投屏密码并展示给用户，backend 以明文返回当前投屏密码。用户修改密码后，UI 写入 UxPlay backend。密码由用户修改、backend 生成或 AirPlay 认证流程触发变化时，backend 发出密码变更事件，事件携带明文密码，UI 刷新展示。

### 投屏状态流程

UxPlay backend 根据 AirPlay 流程发出状态事件：

- `idle`：没有活跃投屏流程。
- `auth`：发射端连接并进入密码认证阶段。
- `casting`：认证通过并开始投屏。
- `end`：本次投屏结束，随后可回到 `idle`。

### 投屏窗口控制

UI 根据用户操作或投屏状态触发窗口控制：

- 置顶：将投屏窗口置于最前。
- 放大：放大投屏窗口。
- 缩小：缩小投屏窗口。
- 置底：隐藏投屏窗口。

## 约束

- Electron 外部控制口不再作为新协议链路的一部分。
- 新控制能力应归并到 UxPlay backend 内部控制服务中。
- UxPlay backend 内部控制服务必须按 AXTP Logical Server 角色发送 `Hello`、校验 `Identify`、返回 `Identified`。
- 控制能力必须保持最小集合，新增能力需另走评审。
- AirPlay 名称设置成功后必须立即重启 mDNS/Bonjour 广播。
- 投屏状态枚举第一版固定为 `idle`、`auth`、`casting`、`end`。
- 投屏密码获取响应和密码变更事件均携带明文密码。
- 窗口“置底”的语义是隐藏投屏窗口。
# <Launcher AirPlay 投屏接收端受控逻辑>

## 背景

Launcher 集成了基于 UxPlay 改造的 AirPlay 接收端，在 Windows 上作为投屏受控端运行。Launcher 启动后会自动拉起投屏接收服务，iOS / macOS 等发射端可以通过 mDNS 发现该接收端并发起 AirPlay 投屏。

当前需要把投屏接收端的核心控制能力暴露给 Launcher UI、后台服务或外部控制端，让外部能够控制投屏音频、停止当前投屏、管理投屏密码策略、控制投屏窗口状态、重启投屏 backend，并接收投屏状态变化通知。

同时，投屏接收端还需要支持第二阶段的 WebSocket 手动流控能力：在 HID / AXTP 媒体接收与基础自动流控稳定后，外部控制端可以降低接收端本地渲染帧率、调整队列和丢帧策略、查询运行状态，并在不阻塞 HID 输入消费和 AXTP 数据解析的前提下控制接收端播放压力。

本文是 business 需求输入，不是最终协议事实源。后续需要通过 `docs/flows/**` 梳理交互，再进入 `docs/protocol/**` 草案和 registry 采纳流程。已采纳事实最终以 `registry/**/*.yaml`、`protocol/axtp.protocol.yaml` 和 `docs/generated/**` 为准。

## 用户目标

用户或集成方希望在 Launcher 中使用 AirPlay 投屏接收能力时：

- Launcher 启动后，投屏接收端默认可被发现。
- 默认不播放投屏音频，避免投屏开始后设备突然出声。
- 外部控制端可以按需打开或关闭投屏音频播放。
- 外部控制端可以主动关闭当前投屏会话。
- 外部控制端可以控制投屏窗口置顶、全屏和还原到正常状态。
- 外部控制端可以在 backend 异常或配置变更后重启投屏 backend。
- 外部控制端可以启用或关闭投屏密码保护。
- 当启用密码保护时，可以指定当前投屏密码。
- 当投屏密码或密码开关变化时，外部控制端能收到通知，用于刷新 UI 或 toast。
- 当投屏状态变化时，外部控制端能收到通知，例如有投屏请求、等待输入密码、鉴权完成并开始投屏、投屏结束等。
- 外部控制端可以设置投屏接收端的目标渲染帧率，例如把本地渲染降到 10fps。
- 降低本地渲染帧率时，HID 输入仍然持续消费，AXTP 数据仍然持续解析，视频队列和端到端延迟不应持续增长。
- 外部控制端可以查询当前输入帧率、渲染帧率、队列深度、丢帧统计、静音、全屏、overlay 和错误摘要等运行状态。

## 范围

本需求只覆盖投屏接收端的受控业务逻辑和对外控制需求：

| 能力 | 需求说明 |
|---|---|
| 投屏音频播放开关 | 控制 AirPlay 投屏音频是否在接收端播放；默认关闭。 |
| 关闭投屏 | 外部控制端可停止当前活动投屏会话。 |
| 投屏密码保护开关 | 控制是否要求发射端输入投屏密码；关闭后允许无密码直接投屏。 |
| 指定投屏密码 | 外部控制端可指定当前有效投屏密码。 |
| 投屏窗口控制 | 控制投屏窗口置于顶部、放大到全屏、还原到正常状态。 |
| Backend 重启 | 外部控制端可重启 UxPlay backend，用于服务异常恢复或配置重新加载。 |
| Cast 手动流控 | 外部控制端可设置接收端本地目标渲染 fps、队列上限、丢帧策略和 late frame 阈值。 |
| Cast 状态查询 | 外部控制端可查询 source、HID、AXTP、video/audio stream、fps、queue、drop、mute、fullscreen、overlay、last error 等摘要。 |
| 密码变化通知 | 密码保护开关或密码值变化时，通知外部控制端。 |
| 投屏状态变化通知 | 投屏请求、等待密码、鉴权通过、开始投屏、结束投屏、错误等状态变化时通知外部控制端。 |

## 非目标

本需求暂不解决以下内容：

- 不标准化 AirPlay、mDNS、RAOP、H.264、AAC 或 UxPlay 内部媒体传输协议。
- 不设计投屏发射端协议。
- 不覆盖投屏窗口尺寸拖拽、窗口坐标同步、多显示器选择等完整 UI 窗口管理能力。
- 不覆盖 receiver runtime 端口号、服务名称、Launcher 退出等运行时管理能力。
- 不覆盖屏幕录制、媒体流转发、STREAM 数据面或投屏画面内容传输。
- 不要求 NT10、AirPlay Source 或其他投屏发射端降低发送帧率；`cast.setRenderFps` 只控制接收端本地渲染节奏。
- 不把手动流控能力定义为通用 `video` 域能力；视频 stream、codec、关键帧底层能力仍归 `video.stream`。
- 不把公共 STREAM/runtime 流控定义放入本 business 文档；公共流控仍归 `stream.flowControl` 和 core/runtime 规范。
- 不在 business 文档中分配 methodId、eventId、errorCode、fieldId。

## 业务角色

| 角色 | 说明 |
|---|---|
| Launcher UI | 面向用户展示投屏状态、密码提示、音频开关和停止投屏操作。 |
| 外部控制端 | 通过 AXTP 控制口调用投屏接收端受控能力，可与 Launcher UI 是同一进程，也可以是本机其他控制服务。 |
| Cast Receiver Adapter | Launcher 内部的 AXTP 适配层，负责把外部控制请求转成 UxPlay backend 行为，并把 backend 事件标准化。 |
| UxPlay Backend | AirPlay 接收服务实现细节，负责 mDNS 发现、AirPlay 鉴权和媒体接收。 |
| Media / Render Core | 接收端本地媒体处理和渲染模块，负责消费 HID / AXTP 输入、维护队列、执行 fps cap、丢帧、静音和 overlay 策略。 |
| 投屏发射端 | iOS / macOS 等 AirPlay Source。 |

## 阶段划分与能力边界

投屏接收端的流控能力分为两个阶段处理：

| 阶段 | 目标 | 说明 |
|---|---|---|
| 阶段 1：基础自动流控 | HID / AXTP 媒体接收稳定，runtime 能自动控制队列、丢帧、低延迟和关键帧恢复。 | 这是底层媒体桥和 runtime 能力，普通外部控制端不直接操作。 |
| 阶段 2：WebSocket 手动流控 | 外部控制端可以通过 WebSocket 设置接收端本地渲染 fps 和流控策略。 | 这是 `cast` 域的业务受控能力，典型用途是把接收端渲染帧率降低到 10fps。 |

候选 feature 边界如下：

| 候选能力 | 归属 | 边界说明 |
|---|---|---|
| `cast.flowControl` | `cast` 域 | 投屏接收端业务流控、渲染节流、队列上限、drop policy、late frame 阈值、overlay 状态和相关统计。 |
| `cast.audio` | `cast` 域 | 投屏音频播放开关和静音策略；静音时仍继续消费音频数据。 |
| `video.stream` | `video` 域 | 视频 stream、codec、source、chunk、关键帧底层能力；接收端内部可复用 `video.requestKeyFrame`。 |
| `stream.flowControl` | `stream` 域 / runtime | 公共 STREAM/runtime 流控，不面向普通业务控制器直接使用。 |

后续协议草案应优先使用 `cast` 域，例如候选 `cast.setRenderFps`、`cast.setFlowPolicy`、`cast.getStatus`。这些名称仍是 business candidate，不是 adopted/generated 协议事实。

## 受控端业务逻辑

### 1. 启动与默认状态

- Launcher 启动时自动启动投屏接收端。
- 投屏接收端启动成功后，应进入可发现、可接收投屏请求的状态。
- 投屏音频播放开关默认关闭，即使投屏开始，接收端也默认不播放投屏音频。
- 投屏密码保护的默认值需要由产品配置决定；如果未配置，建议默认开启密码保护以降低误投风险。
- 如果密码保护开启但没有可用密码，接收端应生成或加载一个有效密码，并通知外部控制端当前密码状态。

### 2. 投屏音频播放开关

- 外部控制端可以设置投屏音频播放开关。
- 开关关闭时：
  - 投屏视频或画面接收不受影响。
  - 接收端不播放来自投屏会话的音频。
  - 对发射端是否仍发送音频不作协议约束，属于 AirPlay / UxPlay 实现细节。
- 开关打开时：
  - 如果当前已有活动投屏会话，应立即按实现能力恢复音频播放。
  - 如果当前没有投屏会话，应保存为后续会话的目标状态。
- 开关变化时，应通知外部控制端。

### 3. 关闭当前投屏

- 外部控制端可以请求关闭当前活动投屏会话。
- 如果当前存在活动投屏，应停止该会话，并在状态变更后通知外部控制端。
- 如果当前不存在活动投屏，该操作可以返回“无活动会话”语义，也可以视为幂等成功；具体协议草案中需要确认。
- 停止原因应至少区分：
  - 外部控制端主动关闭。
  - 发射端主动结束。
  - 鉴权失败或密码错误。
  - backend 错误或服务异常。

### 4. 投屏密码保护开关

- 外部控制端可以开启或关闭投屏密码保护。
- 密码保护开启时：
  - 新的投屏请求需要发射端输入密码。
  - 接收端进入等待密码状态时，应通知外部控制端。
  - 密码鉴权通过后，应通知外部控制端投屏开始。
- 密码保护关闭时：
  - 允许发射端不输入密码直接投屏。
  - 已存在的密码可以保留为配置值，但不会用于当前投屏准入。
  - 关闭开关后，如新投屏请求直接进入投屏，应仍然发送状态变化通知。
- 密码保护开关变化时，应通知外部控制端。

### 5. 指定投屏密码

- 外部控制端可以指定当前投屏密码。
- 指定密码应只影响后续投屏鉴权；对已经通过鉴权并正在进行的投屏会话是否立即生效，需要在 flow / protocol 草案中确认。
- 密码格式需要在后续协议草案中明确，建议至少约束：
  - 长度。
  - 字符集。
  - 是否只允许数字 PIN。
  - 是否允许空字符串。
  - 是否有过期时间。
- 密码变更后，应通知外部控制端。
- 是否允许事件 payload 中携带明文密码，需要安全评审；如果不允许明文，事件至少应携带 `enabled`、`hasPassword`、`changedAt` 等状态，让 UI 再通过受控接口获取或展示。

### 6. 投屏状态通知

投屏状态变化由接收端主动通知外部控制端。MVP 需要覆盖以下状态：

| 状态 | 触发条件 | 外部处理建议 |
|---|---|---|
| `receiverReady` | 投屏接收端启动完成，可被发现。 | UI 显示投屏接收可用。 |
| `incoming` | 发射端发起投屏连接请求。 | UI 可提示“有设备正在请求投屏”。 |
| `waitingForPassword` | 密码保护开启，接收端等待发射端输入密码。 | UI 展示当前密码提示或等待状态。 |
| `authenticated` | 发射端密码鉴权通过。 | UI 可准备展示投屏画面。 |
| `casting` | 投屏会话正式开始。 | UI 显示投屏中，启用停止投屏按钮。 |
| `stopping` | 外部控制端或发射端正在结束投屏。 | UI 可进入处理中状态。 |
| `ended` | 投屏会话结束。 | UI 恢复未投屏状态。 |
| `failed` | 投屏连接、鉴权或 backend 处理失败。 | UI 展示错误，并可允许重试。 |
| `backendRestarting` | 外部控制端请求重启 backend，或接收端自动恢复 backend。 | UI 可显示服务恢复中，暂停新的投屏操作。 |
| `backendReady` | backend 重启完成并重新可用。 | UI 恢复投屏入口，必要时重新查询状态。 |

状态通知应尽量携带会话摘要，例如当前状态、会话 ID、发射端名称或地址摘要、停止原因、错误摘要等。具体字段由后续 flow / protocol 草案定义。

### 7. 投屏窗口控制

投屏窗口控制用于让外部控制端影响当前投屏画面的展示方式，但不负责完整窗口系统管理。

- 外部控制端可以将投屏窗口置于顶部。
  - 该能力表示窗口应保持在其他普通窗口之上。
  - 是否覆盖系统级置顶、全屏应用、系统安全窗口等行为，由操作系统和 Launcher 实现决定。
- 外部控制端可以将投屏窗口放大到全屏。
  - 全屏应作用于当前投屏窗口，而不是改变投屏媒体分辨率。
  - 如果当前没有活动投屏会话，是否允许预设全屏状态需要在后续 flow / protocol 草案中确认。
- 外部控制端可以将投屏窗口还原到正常状态。
  - 还原应退出全屏，并回到普通窗口展示状态。
  - 是否同时取消置顶需要明确区分；建议“还原正常状态”只处理窗口模式，全屏和置顶分别建模，避免误操作。
- 窗口状态变化时，应通知外部控制端，至少包含当前是否全屏、是否置顶、是否有活动投屏窗口。

### 8. Backend 重启

Backend 重启用于恢复 UxPlay backend 异常、重新加载 backend 配置，或处理投屏服务不可用的情况。

- 外部控制端可以请求重启投屏 backend。
- 重启 backend 不等同于退出 Launcher，也不等同于重启整个 receiver runtime。
- 如果当前存在活动投屏会话，重启 backend 会导致当前投屏中断，应先通知外部控制端进入 `stopping` 或 `backendRestarting` 状态。
- 重启完成后，接收端应通知外部控制端 backend 已重新可用，并恢复可被发现或可接收投屏请求的状态。
- 重启失败时，应通知外部控制端失败原因和是否可重试。
- 是否允许普通 UI 发起 backend 重启，还是只允许管理权限调用，需要在后续 flow / protocol 草案中确认。

### 9. WebSocket 手动流控

WebSocket 手动流控用于让外部控制端调整投屏接收端本地渲染和播放压力。它不要求发射端降低输入帧率，也不改变 HID / AXTP 数据接收路径。

典型场景是外部控制端把接收端本地渲染帧率降低到 10fps。此时接收端应做到：

- 本地画面渲染帧率接近目标值，例如接近 10fps。
- HID 输入继续消费。
- AXTP 数据继续解析。
- 视频队列不持续增长。
- 端到端延迟不持续变大。
- 恢复到 25fps 后能够继续正常播放。

#### 9.1 手动流控状态模型

接收端运行时应维护明确的 flow-control state，用于被控制端查询、日志记录和媒体线程执行。

| 状态字段 | 含义 | 说明 |
|---|---|---|
| `targetRenderFps` | 当前目标渲染 fps。 | 由外部控制端设置；只影响接收端本地渲染节奏。 |
| `inputFps` | 当前实际输入 fps。 | 反映发射端或上游 source 的输入速率，不因 `targetRenderFps` 自动降低。 |
| `renderFps` | 当前实际渲染 fps。 | 应尽量接近 `targetRenderFps`，但不得高于实际可渲染能力。 |
| `dropMode` | 当前丢帧策略。 | 候选值包括 `drop-late`、`drop-oldest`、`render-latest`。 |
| `videoQueueFrames` | 当前视频队列上限。 | 用于防止未渲染帧无限堆积。 |
| `lateFrameThresholdMs` | late frame 判定阈值。 | 超过阈值的帧可按策略丢弃。 |
| `keyFrameOnDropBurst` | 丢帧爆发时是否允许内部请求关键帧。 | 请求由接收端内部触发，不作为外部公开方法。 |
| `muted` | 当前投屏音频静音状态。 | 静音时继续消费音频数据，不重启音频设备。 |
| `overlayEnabled` | 当前 overlay 开关状态。 | 用于显示 fps、queue、drop、延迟等诊断信息。 |
| `videoQueueDepth` | 当前视频队列深度。 | 可用于判断队列是否稳定。 |
| `audioQueueDepth` | 当前音频队列深度。 | 可用于判断音频消费是否正常。 |
| `droppedFrames` | 累计丢弃视频帧数。 | 用于诊断流控是否生效。 |
| `lateFrames` | 累计 late frame 数。 | 用于诊断延迟和调度问题。 |
| `keyframeRequestCount` | 内部关键帧请求次数。 | fps 大幅变化、丢帧爆发或解码异常时可增加。 |
| `lastError` | 最近一次错误摘要。 | 用于状态查询和 UI 提示。 |

WebSocket 回调线程不应直接操作 D3D、WASAPI 或窗口资源。它只应更新控制状态，再由媒体线程在合适位置读取状态并执行。

#### 9.2 候选方法

以下方法名仅表示后续 `cast` 域协议草案候选，不是正式 adopted/generated 协议。

| 候选方法 | 用途 | 参数 / 返回摘要 | 行为要求 |
|---|---|---|---|
| `cast.getStatus` | 查询当前接收端状态。 | 返回 source mode、HID transport 状态、AXTP session 状态、video/audio stream 状态、target/input/render fps、queue depth、dropped/late frames、keyframe request count、muted、fullscreen、overlay enabled、last error。 | 不改变状态；用于 UI 校准、重连后校准和诊断。 |
| `cast.setRenderFps` | 设置接收端目标渲染帧率。 | 参数 `fps`，建议允许范围 `1..120`。 | 只控制本地渲染 fps，不要求 NT10/source 降低发送 fps；不得阻塞 HID 输入或 AXTP 解析。 |
| `cast.setFlowPolicy` | 设置更细的流控策略。 | 可选参数 `videoQueueFrames`、`lateFrameThresholdMs`、`dropMode`、`keyFrameOnDropBurst`。 | 未渲染帧必须进入明确 drop 逻辑，不能持续排队。 |
| `cast.setMuted` | 设置投屏音频静音状态。 | 参数 `muted`。 | 静音时继续消费音频数据，不重启音频设备，不影响视频渲染。 |

外部控制端暂不需要公开的关键帧请求方法。接收端可以在 fps 大幅变化、丢帧爆发、解码异常或恢复播放时内部自动请求关键帧，底层能力可复用 `video.requestKeyFrame`。

#### 9.3 丢帧策略

| 策略 | 含义 | 适用场景 |
|---|---|---|
| `drop-late` | 丢弃超过 late frame 阈值的帧。 | 适合以低延迟为优先目标的投屏。 |
| `drop-oldest` | 队列满时丢弃最旧帧。 | 适合防止队列持续增长。 |
| `render-latest` | 尽量渲染最新帧，跳过过旧画面。 | 适合外部要求低 fps 但希望画面尽量跟随最新状态。 |

默认 `dropMode` 需要在后续 flow / protocol 草案中确认。

## 场景

### 场景 1：无密码直接投屏

1. Launcher 启动投屏接收端。
2. 外部控制端关闭投屏密码保护。
3. iOS / macOS 发现接收端并发起投屏。
4. 接收端不要求输入密码，直接建立投屏。
5. 外部控制端收到 `incoming`、`authenticated` 或 `casting` 等状态变化通知。
6. 投屏音频默认关闭，除非外部控制端已打开音频播放开关。

### 场景 2：开启密码后投屏

1. 外部控制端开启投屏密码保护。
2. 外部控制端指定投屏密码，或接收端生成/加载当前有效密码。
3. 密码变化通知发送给外部控制端。
4. 发射端发起投屏。
5. 接收端进入 `waitingForPassword` 状态，并通知外部控制端。
6. 发射端输入正确密码后，接收端进入 `authenticated` / `casting` 状态并通知外部。
7. 如果密码错误或超时，接收端进入失败或等待重试状态，并通知外部。

### 场景 3：投屏过程中打开音频播放

1. 当前已有投屏会话，音频播放开关处于关闭。
2. 外部控制端打开投屏音频播放开关。
3. 接收端恢复或开启当前投屏会话的音频播放。
4. 接收端通知外部控制端音频状态已变化。

### 场景 4：外部主动关闭投屏

1. 当前已有活动投屏会话。
2. 外部控制端发送关闭投屏请求。
3. 接收端停止当前投屏会话。
4. 接收端通知外部控制端状态进入 `stopping`，随后进入 `ended`。
5. UI 恢复未投屏状态。

### 场景 5：投屏密码变更

1. 外部控制端设置新的投屏密码。
2. 接收端校验密码格式。
3. 校验通过后保存新密码。
4. 接收端通知外部控制端密码状态已变化。
5. 后续投屏请求使用新的密码策略。

### 场景 6：投屏窗口置顶、全屏和还原

1. 当前已有活动投屏会话，投屏窗口正在显示。
2. 外部控制端请求将投屏窗口置于顶部。
3. 接收端更新窗口置顶状态，并通知外部控制端窗口状态已变化。
4. 外部控制端请求将投屏窗口放大到全屏。
5. 接收端进入全屏展示，并通知外部控制端窗口状态已变化。
6. 外部控制端请求还原到正常状态。
7. 接收端退出全屏，恢复普通窗口展示，并通知外部控制端窗口状态已变化。

### 场景 7：Backend 异常后重启

1. UxPlay backend 异常退出、无响应，或外部控制端判断需要重新加载 backend。
2. 外部控制端请求重启 backend。
3. 接收端通知外部控制端 backend 进入重启中状态。
4. 如果存在活动投屏，会话被结束，并通知投屏状态变化。
5. backend 重启完成后，接收端通知外部控制端 backend ready。
6. 如果重启失败，接收端通知外部控制端失败状态和错误摘要。

### 场景 8：手动降低本地渲染帧率

1. 当前投屏输入约为 25fps，接收端正常渲染。
2. 外部控制端设置目标渲染 fps 为 10。
3. 接收端更新 `targetRenderFps`，媒体线程按新目标调整本地渲染节奏。
4. HID 输入继续消费，AXTP 数据继续解析。
5. 接收端按 `dropMode` 丢弃过期帧或旧帧，视频队列深度不持续增长。
6. overlay 或状态查询显示 `renderFps` 接近 10，`inputFps` 仍接近 source 输入。

### 场景 9：从低 fps 恢复正常渲染

1. 当前目标渲染 fps 为 10，投屏仍在进行。
2. 外部控制端把目标渲染 fps 恢复到 25。
3. 接收端提高本地渲染节奏，并继续消费已有输入。
4. 如果 fps 大幅变化后画面异常、丢帧爆发或解码状态不稳定，接收端可内部自动请求关键帧。
5. 恢复后画面应继续正常播放，队列和延迟不应持续变大。

### 场景 10：fps cap 下静音和取消静音

1. 当前目标渲染 fps 已降到 10。
2. 外部控制端设置静音。
3. 接收端停止本地音频输出，但继续消费音频数据，不重启音频设备。
4. 外部控制端取消静音。
5. 接收端恢复音频输出，不影响视频渲染节奏。

### 场景 11：fps cap 下窗口控制

1. 当前目标渲染 fps 已降到 10，投屏窗口正在显示。
2. 外部控制端或 UI 拖动窗口、切换全屏或还原窗口。
3. 接收端应保持 HID 输入消费、AXTP 解析和视频队列稳定。
4. 窗口状态变化仍应通知外部控制端。

### 场景 12：长时间低 fps 稳定运行

1. 当前投屏输入约为 25fps。
2. 外部控制端把目标渲染 fps 设置为 10。
3. 接收端持续运行 10 分钟以上。
4. `renderFps` 应接近 10，`inputFps` 应接近 source 输入。
5. 视频队列深度应稳定在上限附近，不持续增长。
6. 端到端延迟不应持续变大。

## 约束

- 投屏音频播放开关默认关闭。
- 密码保护关闭时，必须允许无密码直接投屏。
- 密码保护开启时，必须能够指定或获得当前有效密码。
- 密码保护开关变化、密码值变化、投屏状态变化都需要通知外部控制端。
- 投屏窗口置顶、全屏、还原到正常状态都需要有明确的状态反馈。
- Backend 重启必须和 Launcher 退出、receiver runtime 重启区分开；本需求只要求重启 UxPlay backend。
- 投屏媒体面不进入 AXTP 控制协议；AXTP 只承载控制面和状态通知。
- `cast.setRenderFps` 只控制接收端本地渲染 fps，不要求 NT10、AirPlay Source 或其他发射端降低发送 fps。
- 手动 fps cap 不得阻塞 HID 输入消费，也不得阻塞 AXTP 数据解析。
- 视频队列必须有明确上限和 drop 策略，未渲染帧不得无限排队。
- 静音时必须继续消费音频数据，不重启音频设备，不影响视频渲染。
- 外部控制端不直接请求关键帧；关键帧请求由接收端内部根据丢帧、解码和 fps 变化情况自动触发。
- UxPlay 是实现细节，协议命名应优先使用 `cast` 业务域，不应把 `uxplay` 固化为标准 domain 或 method name。
- 需要考虑本机控制口与 LAN 控制口的安全差异；如果外部控制口允许 LAN 访问，密码读取、明文通知、关闭投屏、窗口控制和 backend 重启都需要权限控制。

## 旧协议线索

- `docs/legacy-migration/evidence/WEBSOCKET_PROTOCOL.md`

## 开放问题

- [REVIEW-ASK] 当前暂无开放问题。

## 下一步

- 使用 `docs/dev/skills/10-plan-protocol-flow/SKILL.md` 生成或更新 `docs/flows/cast-reciever-uxplay.md`。
- 如 flow 评审通过，再使用 `docs/dev/skills/20-draft-business-protocol/SKILL.md` 起草最小 `cast` / UxPlay receiver 控制能力。
- `docs/flows/cast-reciever-uxplay.md`
- 旧协议中的 `getStatus`、`stop` / `stopCasting`、`getPin`、`setPin`、`rotatePin`、`pin.*`、`mirrorStarted`、`mirrorStopped`、`casting.*`、`audio.changed`、`showCastWindow`、`hideCastWindow`、`setFullscreen`、`setAlwaysOnTop`、`window.changed`、`restartUxPlay`、`uxplay.ready`、`uxplay.exited` 等行为可作为迁移证据。

## 开放问题

- [REVIEW-ASK] 投屏密码保护默认是开启还是关闭？如果开启，默认密码由 Launcher 配置、随机生成，还是由用户首次设置？
- [REVIEW-ASK] 指定投屏密码后，是否立即影响已发起但尚未鉴权完成的投屏请求？
- [REVIEW-ASK] 密码变化通知是否允许携带明文密码？如果不允许，UI 如何获得用于 toast 的当前密码？
- [REVIEW-ASK] 关闭投屏在无活动会话时应返回成功，还是返回无活动会话错误？
- [REVIEW-ASK] 投屏音频开关是仅控制接收端本地播放，还是也要影响发射端音频协商？
- [REVIEW-ASK] 状态枚举是否需要区分 `incoming`、`waitingForPassword`、`authenticated`、`casting`，还是可以合并为更少状态？
- [REVIEW-ASK] “还原到正常状态”是否只退出全屏，还是同时取消置顶、恢复窗口尺寸和位置？
- [REVIEW-ASK] 投屏窗口置顶是否需要在没有活动投屏时预设，还是只允许活动投屏窗口存在时调用？
- [REVIEW-ASK] Backend 重启是否会强制结束当前投屏会话？如果会，停止原因应如何展示给用户？
- [REVIEW-ASK] Backend 重启是否只重启 UxPlay backend，还是需要重建 backend adapter 到 UxPlay 的内部 WebSocket 连接？
- [REVIEW-ASK] `fps=0` 是表示不限制本地渲染 fps，还是直接拒绝？
- [REVIEW-ASK] 目标 fps 高于当前输入 fps 时，是按输入 fps 运行，还是只把目标值作为上限保存？
- [REVIEW-ASK] 默认 `dropMode` 使用 `drop-late`、`drop-oldest` 还是 `render-latest`？
- [REVIEW-ASK] `cast.getStatus` 是否作为聚合状态接口存在，还是流控状态只放在 `cast.flowControl` 独立查询中？
- [REVIEW-ASK] overlay 是否只是本地调试开关，还是需要作为正式可控能力进入 `cast.flowControl`？

## 下一步

- 更新 `docs/flows/cast-reciever-uxplay.md`，将当前需求范围收敛到音频、会话停止、密码策略、窗口控制、backend 重启、手动流控和状态通知。
- 使用 `docs/dev/skills/10-plan-protocol-flow/SKILL.md` 梳理投屏接收端状态机和协议覆盖。
- 使用 `docs/dev/skills/20-draft-business-protocol/SKILL.md` 创建或更新 `docs/protocol/cast/**` 草案，建议优先拆分为：
  - `cast.session`：投屏状态、会话查询、关闭投屏、状态事件。
  - `cast.pinCode`：密码保护开关、指定密码、密码变化事件。
  - `cast.audio`：投屏音频播放开关、音频状态事件。
  - `cast.window`：投屏窗口置顶、全屏、还原正常状态、窗口状态事件。
  - `cast.backend`：UxPlay backend 状态查询、重启、ready/exited/restart 事件。
  - `cast.flowControl`：接收端本地渲染 fps、流控策略、队列和 drop 统计、overlay 诊断状态。

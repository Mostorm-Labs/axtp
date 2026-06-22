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

## 旧协议线索

- `docs/legacy-migration/evidence/WEBSOCKET_PROTOCOL.md`

## 开放问题

- [REVIEW-ASK] 当前暂无开放问题。

## 下一步

- 使用 `docs/dev/skills/10-plan-protocol-flow/SKILL.md` 生成或更新 `docs/flows/cast-reciever-uxplay.md`。
- 如 flow 评审通过，再使用 `docs/dev/skills/20-draft-business-protocol/SKILL.md` 起草最小 `cast` / UxPlay receiver 控制能力。

# Launcher AirPlay Receiver Control 需求

## 背景

团队基于 uxplay 做了自主改版，在 Windows Launcher 中集成 AirPlay 接收端。Launcher 需要通过 AXTP 对接收端 UI 层和 backend 服务层进行控制与状态同步，让 App 能在投屏开始、服务状态变化、PIN 展示和窗口变化时做出正确响应。

## 用户目标

- Launcher 启动后自动启动 AirPlay 接收服务。
- iOS / macOS 发射端能通过 mDNS 发现接收端并发起投屏。
- 投屏流到达后，Launcher 能主动展示投屏内容。
- 有投屏信号或 PIN 变化时，App 能提示用户。
- 服务启动 / 停止、投屏状态变化、窗口大小变化时，App 能收到状态变化。
- App 或后台能获取和设置接收服务端口等运行参数。

## 范围

本需求包含 Launcher 对 uxplay receiver backend 和 UI 层的业务控制目标，包括服务 lifecycle、投屏会话状态、PIN 提示、窗口状态和基础配置。

## 非目标

- 不定义 uxplay 内部协议或 AirPlay 协议本身。
- 不定义 AXTP method/event/schema；这些由 flow 和 protocol draft 承接。
- 不处理音视频帧数据传输格式。

## 场景

- Launcher 启动后自动启动 AirPlay receiver backend。
- 发射端发现并连接 receiver，投屏流到达。
- App 收到投屏开始事件后展示投屏窗口，并提示 PIN 或状态。
- backend 服务停止、重启或配置变化后，UI 和 App 同步状态。

## 约束

- UI 层和 backend 服务层受控范围不同，flow 中需要分别标出 actor 和职责。
- PIN、服务端口、窗口状态可能涉及本地安全和用户提示，需确认权限边界。

## 旧协议线索

- `workspace/legacy-migration/evidence/WEBSOCKET_PROTOCOL.md`

## 开放问题

- [REVIEW-ASK] UI 层和 backend 服务层分别有哪些可控字段和事件？
- [REVIEW-ASK] PIN 展示、刷新和过期策略是什么？
- [REVIEW-ASK] 窗口大小变化是 UI-only 状态，还是需要设备/服务端协议事件？

## 下一步

- 交互和协议覆盖由 `workspace/flows/cast-receiver-uxplay.md` 承接。
- Flow 识别出的协议缺口再进入 `workspace/protocol/**` 草案。

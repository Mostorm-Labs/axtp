# <launcher大屏airplay控制接收端>

## 背景

我们自主改版了uxplay这个项目，在windows上实现集成了AirPlay接收端，目前对这个接收端外部实现了一层控制协议命令层，采用的就是我们的axtp协议，本需求就是要对这个接收端进行一些控制逻辑设计

## 用户目标

该软件分为UI层和backend服务层，UI层有一个受控端，backend有一个受控端，分别管辖不同的受控范围，具体的受控范围可以参考文档legacy-migration/evidence/websocket_protocol.md中的内容。
该软件会随着launcher软件启动，然后自动启动AirPlay服务，发射端（iOS/macOS）能够从mdns服务中发现该接收端，并且开始AirPlay投屏。
1. 投屏开始后，软件端能够自动检测到有投屏流到达，能够让应用软件端实现主动展示投屏内容的功能
2. 接收到有投屏信号后，应用软件侧会有toast展示当前投屏密码
3. 当投屏状态变化时，会有信号发出
4. 软件服务启动/停止时，会有信号发出
5. 窗口大小变化时，会有事件发出
6. 能够获取并设置服务的端口号
等等

## 范围

本需求包含uxplayserver端的业务逻辑，以及uxplay这个backend的一些受控方法，不涉及uxplay本身

## 非目标


## 场景


## 约束


## 旧协议线索

- legacy-migration/evidence/websocket_protocol.md

## 开放问题

- [REVIEW-ASK] 需要产品、架构、固件、App、后台或旧协议行为确认的问题。

## 下一步

- 创建或更新 `docs/flows/<scenario>.md`
- 使用 `docs/dev/skills/10-plan-protocol-flow/SKILL.md` 梳理协议交互
- 创建或更新 `docs/protocol/<domain>/<domain.feature>.md`
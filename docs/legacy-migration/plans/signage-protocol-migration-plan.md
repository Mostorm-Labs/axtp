# Signage Protocol Migration Plan

> Status: migration design
> Scope: NearHub Launcher digital signage SDK full AXTP replacement
> Source evidence: `docs/legacy-migration/evidence/NearHub-Launcher数字标牌设备管理通用管理命令.md`, `docs/legacy-migration/evidence/NearHub-Launcher设备管理命令.md`
> Classification reference: `docs/legacy-migration/classification/by-source/signage_sdk.md`, `docs/legacy-migration/classification/signage.md`
> AXTP draft inputs: `docs/protocol/signage/**` plus the common domain drafts referenced below

本文定义数字标牌协议迁移到 AXTP 的落地方案。结论是：数字标牌协议数量少、业务边界清楚，且现有 AXTP 草案已能承接主要能力，因此不走 Rooms 的 legacy compatibility profile，也不走 VM33 的长期渐进替换；目标状态是数字标牌业务全量切换到 AXTP，由 App、服务端和设备固件同步改用 generated protocol 暴露的方法、schema、capability 和错误模型。

## 1. 决策摘要

| 决策 | 结论 |
|---|---|
| 迁移策略 | 全量切换到 AXTP，目标状态为 `axtp_only`。旧 `Verb + Resource` command/event 名只保留为 legacyRefs、测试溯源和短期灰度参考。 |
| 业务方法 | 不沿用旧 `SetPlaylistConfig`、`GetPlaylistConfig` 等 wire method 名作为新主路径；统一使用 AXTP `domain.method` 或 generated methodId。 |
| 业务参数 | 不冻结旧 params 结构；字段要进入对应 AXTP schema，并在草案评审时确认命名、类型、默认值、枚举和错误码。 |
| 协议 envelope | 使用 AXTP session、requestId、status/error 和 capability 发现；不再实现数字标牌专属 SDK envelope。 |
| 响应语义 | 旧 `{ "ok": true }` 迁移为 AXTP 成功 status 或空成功响应；只有确有业务含义时才在 response schema 中保留 `ok` 字段。 |
| requestId | 新实现使用 AXTP `requestId:uint32`；旧 SDK 可能存在的字符串关联 ID 不进入数字标牌新 wire contract。 |
| App 策略 | App 端随协议采纳同步适配 AXTP method/schema；连接数字标牌新固件时不再调用旧 SDK command 字符串。 |
| 固件策略 | 先固定 AXTP parser/session/router/handler 注入框架，再一次性注入数字标牌业务 handler。 |
| 兼容窗口 | 允许发布灰度期保留 legacy adapter，但只服务旧 App 或旧固件回滚；新数字标牌业务不得继续扩展旧 SDK command。 |
| 协议事实源 | `docs/protocol/**` 是草案输入，`registry/domains/**` 和 `registry/**/*.yaml` 是手写机器事实源，`protocol/axtp.protocol.yaml` 是 Generator 输出。 |

> **设计变更记录 (2026-06-12)**：基于 flow 文档 `docs/flows/signage-device-management.md` 的设计决策，更新以下映射：
> - `signage.media` → 合并进 `signage.playlist`（URL 刷新是播放项级操作）
> - `signage.osd` → `software.config` target:"launcher"（外观配置实为 Launcher 软件配置）
> - `signage.schedule` → `system.lifecycle`（定时关机/重启是设备生命周期）
> - `auth.session` 绑定 → `device.enrollment`（设备注册/纳管是独立域）
> - `firmware.updatePolicy` 软件策略 → `software.updatePolicy`（软件更新策略独立于固件 OTA）
> - `SetDeviceName` → `software.config` displayName（设备名是 Launcher 配置字段）
> - `KeepAlive` → Core transport heartbeat（不再保留为业务指令）

## 2. 非目标

- 不修改 `protocol/axtp.protocol.yaml`。
- 不修改 `registry/**/*.yaml`、`registry/domains/**/*.yaml`。
- 不手写 `docs/generated/**`、`docs/legacy-migration/generated/**` 或 runtime generated headers。
- 不把 `docs/legacy-migration/generated/registry-patches.generated.yaml` 直接当作稳定协议事实源。
- 不保留数字标牌 legacy command router 作为长期主路径。
- 不把数字标牌旧 SDK 的泛 `Command/Event` 扩展机制搬进 AXTP Core。
- 不改 Rooms、VM33 或 VM33 Pro 的迁移策略。

## 3. 当前输入和采纳状态

### 3.1 旧协议输入

数字标牌旧协议来自 Device SDK 风格文档，command 采用 `Verb + Resource`，event 采用 `On*`：

| 业务组 | 旧条目 |
|---|---|
| System | `KeepAlive` method/event, `GetDeviceInfo`, `SetDeviceName`, `SetSysTime`, `ResetConfig`, `GetNetworkInfo` |
| Storage | `GetSDInfo`, `FormatSd` |
| Audio | `SetLineOutVolume`, `GetLineOutVolume`, `SetLineInPreGain`, `GetLineInPreGain` |
| Maintenance | `RemoteUpgrade`, `UpgradeProgress` |
| Business | `GetBindCode`, `GetBindConfig`, `SetBindConfig`, `OnBindState`, `OnTelemetryReport` |
| Digital Signage | `SetPlaylistConfig`, `GetPlaylistConfig`, `GetPlaylistItemUrl` |
| Appearance | `GetAppearanceConfig`, `SetAppearanceConfig` |
| Update | `GetUpdateConfig`, `SetUpdateConfig` |
| Schedule | `GetScheduleConfig`, `SetScheduleConfig` |
| Log | `RequestLogUpload`, `NotifyLogUploadResult` |

### 3.2 AXTP 文档状态

| 状态 | 能力 | 说明 |
|---|---|---|
| 已在当前 registry/generated 中出现 | `device.info`, `firmware.update` | 可复用现有正式事实，但 signage 的字段映射仍需检查是否完全覆盖旧 SDK 返回。 |
| 草案已有，需补 legacy 字段后采纳 | `signage.playlist`, `software.config`, `software.updatePolicy`, `device.enrollment`, `log.export`, `network.ip`, `storage.sdCard`, `audio.volume`, `audio.input`, `system.time`, `system.initialization`, `system.lifecycle` | 这些是全量切换的主要补齐对象。 |
| 已定域 | `system.lifecycle`（schedule shutdown/reboot）, `software.config`（外观配置 + 设备名）, `device.enrollment`（设备注册） | Schedule、外观和注册三组先前未定域的条目已通过 flow 文档评审确认。`sensor.telemetry` 仍在 scope 外。 |

当前 `docs/protocol/signage/**` 仅保留 `signage.playlist` 和 `signage.playback` 的 feature 边界。`signage.media` 已合并进 `signage.playlist` v0.7，`signage.osd` 已迁至 `software.config` v0.2，`signage.schedule` 已定域 `system.lifecycle` v0.8。非 signage 域的补充草案包括 `software.config` v0.2、`software.updatePolicy` v0.2、`device.enrollment` v0.3。落地前必须把旧数字标牌 payload 的字段、枚举、默认值、方向、错误语义和 legacyRefs 补进去，再进入 YAML 采纳。

## 4. 目标架构

新数字标牌设备采用统一 AXTP 协议栈：

```text
Transport
  -> AXTP frame / JSON RPC parser
  -> AXTP session and requestId management
  -> generated method registry lookup
  -> Signage handler registry
  -> device service implementation
```

要求：

- 设备通过 `capability.supportedMethods` 暴露当前固件支持的方法集合。
- App 和服务端只按 generated method name / methodId 调用，不再拼旧 SDK command 字符串。
- Signage handler 注入接口接收 generated request schema，不接收任意旧 params object。
- AXTP status/error 由统一协议层处理，业务 handler 只返回业务 result 或 typed error。
- legacy command 名、旧文档行号和旧字段路径只作为测试溯源，不参与运行时路由。

## 5. 全量覆盖矩阵

| 旧条目 | 方向 | AXTP 目标 | 迁移动作 |
|---|---|---|---|
| `KeepAlive` method | Server <-> Device | Core transport heartbeat | 由 Core transport heartbeat 替代，不保留为业务指令。 |
| `KeepAlive` event | Server <-> Device | Core transport heartbeat | 不保留旧同名 event；由 Core transport heartbeat 替代，不产生业务事件。 |
| `GetDeviceInfo` | Server -> Device | `device.getInfo` | 复用当前已采纳 `device.info`，检查是否覆盖 `model/devName/cpuUsage/memoryUsage/ip/mac/version`。 |
| `SetDeviceName` | Server -> Device, Device -> Server | `software.setConfig(target: "launcher", config: { displayName })` | 草案 `software.config` v0.2 已含 `displayName` 字段；`device.info` 只读返回同值。 |
| `SetSysTime` | Server -> Device | `system.setTimeConfig` | 补 `timezone/year/month/day/hour/minute/second` 到 `system.time`。 |
| `ResetConfig` | Server -> Device | `system.reset` / `system.initialization` | 明确是恢复配置、恢复出厂还是重启；按 system 域采纳。 |
| `GetNetworkInfo` | Server -> Device | `network.getIpConfig` | 补接口数组、Wi-Fi/ethernet、`connected/ip/mac/ssid/rssi` 字段。 |
| `GetSDInfo` | Server -> Device | `storage.getSdCardState` | 补 `status/totalSize/availableSize`。 |
| `FormatSd` | Server -> Device | `storage.formatSdCard` | 定义异步格式化结果事件或状态查询。 |
| `SetLineOutVolume` | Server -> Device | `audio.setVolumeConfig` | 明确 Line-out target 和音量范围。 |
| `GetLineOutVolume` | Server -> Device | `audio.getVolumeState` 或 `audio.getVolumeConfig` | 草案需确认状态型还是配置型。 |
| `SetLineInPreGain` | Server -> Device | `audio.setInputConfig` | 明确 Line-in target、`preGain` 范围和单位。 |
| `GetLineInPreGain` | Server -> Device | `audio.getInputConfig` | 补输入配置 schema。 |
| `RemoteUpgrade` | Server -> Device | `firmware.beginUpdate` / current generated `firmware.begin` | URL 升级走 `source.type=url`，不新增专用 `RemoteUpgrade`。 |
| `UpgradeProgress` | Server -> Device | `firmware.getUpdateState` / firmware.update progress event | 若 App 仍要主动查询进度，采纳 query method；否则改用事件。 |
| `GetBindCode` | Device -> Server | `device.getPairingCode` | 草案 `device.enrollment` v0.3 已完整覆盖；字段映射 `code` + `expiresInSeconds`(1800)。 |
| `GetBindConfig` | Server <-> Device | `device.getEnrollmentState` | 草案 `device.enrollment` v0.3；旧 `bound`(bool) → `state`(enum)。 |
| `SetBindConfig` | Server -> Device | `device.setEnrollmentState` | 草案 `device.enrollment` v0.3；旧 `bound: true` → `desiredState: "enrolled"`。 |
| `OnBindState` | Device -> Server | `device.enrollmentStateChanged` | 草案 `device.enrollment` v0.3；事件为全新设计。 |
| `OnTelemetryReport` | Device -> Server | `sensor.telemetryReported` or split domains | 低置信度。先确认字段集合；温度、电池可拆到 sensor/device.power。 |
| `SetPlaylistConfig` | Server -> Device | `signage.setPlaylistConfig` | 作为 signage P0；完整承接 playlists、items、settings 和全量同步语义。 |
| `GetPlaylistConfig` | Server -> Device, Device -> Server | `signage.getPlaylistConfig` | 作为 signage P0；返回同一 playlist schema。 |
| `GetPlaylistItemUrl` | Device -> Server | `signage.getPlaylistItemUrl` | 已归属 `signage.playlist` v0.7；`signage.media` 草案已删除。 |
| `GetAppearanceConfig` | Server <-> Device | `software.getConfig(target: "launcher")` | 草案 `software.config` v0.2；字段嵌套为 `config.appearance.*`。 |
| `SetAppearanceConfig` | Server <-> Device | `software.setConfig(target: "launcher")` | 草案 `software.config` v0.2；旧 flat 字段需 adapter 包装为 `config.appearance.*`。 |
| `GetUpdateConfig` | Server <-> Device | `software.getUpdatePolicy(target: "launcher")` | 草案 `software.updatePolicy` v0.2；旧 `autoUpdate`(bool) → `updateMode`(enum)。 |
| `SetUpdateConfig` | Server <-> Device | `software.setUpdatePolicy(target: "launcher")` | 草案 `software.updatePolicy` v0.2；旧 `true` → `"auto"`，`false` → `"manual"`。 |
| `GetScheduleConfig` | Server <-> Device | `system.getRebootSchedule` / `system.getShutdownSchedule` | 已定域 `system.lifecycle` v0.8；旧 shutdown/reboot → 按类型独立 schedule。 |
| `SetScheduleConfig` | Server <-> Device | `system.setRebootSchedule` / `system.setShutdownSchedule` | 已定域 `system.lifecycle` v0.8；旧合并下发 → 拆分为两个独立 set。 |
| `RequestLogUpload` | Server -> Device | `log.createExport` | 创建日志导出任务；上传目标、凭证和结果事件由 `log.export` schema 定义。 |
| `NotifyLogUploadResult` | Device -> Server | `log.exportStateChanged` | 改为日志导出状态/结果事件，不保留旧 notify method。 |

## 6. Signage P0 schema 要点

### 6.1 `signage.playlist`

P0 必须覆盖旧 `SetPlaylistConfig` / `GetPlaylistConfig`：

- `playlists[]`: `id`, `type`, `startDate`, `endDate`, `startTime`, `endTime`, `days`, `items[]`。
- `type`: `default`, `scheduled`。
- `items[]`: `id`, `type`, `duration`, `sort`, `settings`。
- `items[].type`: `image`, `slideshow`, `website`, `video`, `clock`。
- `settings.urls`, `settings.url`, `settings.expiresAt`, `settings.delaySeconds`, `settings.muted`, `settings.ignoreCertificateError`, `settings.refreshIntervalSecs`, `settings.clocks[]`。
- 全量同步语义必须写入 method 描述：`setPlaylistConfig` 是替换整套播放列表，不是 patch。

### 6.2 `signage.media` → 已合并进 `signage.playlist`

`signage.media` 已合并进 `signage.playlist` v0.7。URL 刷新方法 `signage.getPlaylistItemUrl` 归属 `signage.playlist` capability。原 `signage.media` 独立草案已删除。理由：URL 刷新是播放项级操作，不是独立媒体域。

### 6.3 `signage.osd` → 已迁至 `software.config`

外观配置已从 `signage.osd` 迁至 `software.config` v0.2 (target: `"launcher"`) 的 `appearance` 子对象。理由：外观配置实为 Launcher 软件配置，不是 signage 播放域。原 `signage.osd` 独立草案已删除。字段映射：`panelLayout/autoHidePanel/autoHideDelay` → `config.appearance.panelLayout/autoHidePanel/autoHideDelay`。

### 6.4 Schedule → 已定域 `system.lifecycle`

旧 `GetScheduleConfig` / `SetScheduleConfig` 的字段是定时关机/重启（`shutdown.enabled/time/days`、`reboot.enabled/time/days`）。已评审确认为设备生命周期计划，不属于 `signage.schedule` 播放排期。定域 `system.lifecycle` v0.8：

- `GetScheduleConfig` → `system.getRebootSchedule` + `system.getShutdownSchedule`
- `SetScheduleConfig` → `system.setRebootSchedule` + `system.setShutdownSchedule`
- 旧合并下发拆分为按类型独立调用
- 旧 `days` 数字(1-7) → AXTP `daysOfWeek` 字符串数组([mon..sun])
- `signage.schedule` 草案可删除

## 7. 分阶段实施

### Phase 0: 冻结 legacy 扩展

- 数字标牌旧 SDK 文档只作为迁移证据，不再新增 command/event。
- App 新需求不得继续基于旧 `Verb + Resource` 扩展。
- 确认本轮覆盖范围是 `signage_sdk` 分类中的全部 31 个条目。

### Phase 1: 草案补齐

按覆盖矩阵补齐或重写相关 `docs/protocol/**`：

| 优先级 | 草案 |
|---|---|
| P0 signage | `docs/protocol/signage/signage.playlist.md` |
| P0 software（signage-covered） | `docs/protocol/software/software.config.md`, `docs/protocol/software/software.updatePolicy.md` |
| P0 device（signage-covered） | `docs/protocol/device/device.enrollment.md` |
| P0 common | `device.info`, `network.ip`, `storage.sdCard`, `audio.volume`, `audio.input`, `firmware.update`, `firmware.updatePolicy`（固件 OTA 骨架）, `log.export` |
| P0 review blockers | telemetry 定域（schedule 定域已解决 → system.lifecycle；binding 语义已解决 → device.enrollment） |
| P1 optional | `signage.playback`，仅当设备需要播放控制、播放状态和进度时进入本轮 |

每个草案必须补：

- legacy command/event 映射。
- request/response/event schema 字段。
- method/event 命名。
- 错误码和状态枚举。
- 方向、权限和可选字段。
- App 端调用场景。

### Phase 2: Registry 采纳和生成

草案评审通过后进入正式事实源：

```text
docs/protocol/** review
  -> registry/domains/<domain>/domain.yaml or registry/**/*.yaml
  -> pnpm --dir generators build
  -> pnpm --dir generators test
  -> protocol/axtp.protocol.yaml
  -> docs/generated/**
  -> runtime generated headers
```

采纳原则：

- signage 专属能力写入 `registry/domains/signage/domain.yaml`。
- 已存在正式方法的能力优先复用，例如 `device.getInfo` 和当前 `firmware.update` 兼容方法。
- 草案命名与当前 generated 命名不一致时，必须明确兼容名和最终 stable 名，不能靠 App 猜。
- legacyRefs 只记录旧来源，不影响 AXTP method identity。

### Phase 3: 协议框架实现

先完成数字标牌新固件协议底座：

| 模块 | 要求 |
|---|---|
| AXTP parser | 支持产品选定的 AXTP transport 和 JSON/TLV 编码。 |
| Session manager | 完成 Hello/Identify/Identified、超时、关闭和错误响应。 |
| Method router | 使用 generated method registry，不使用旧 command 字符串。 |
| Handler registry | 按 domain.feature 注入 handler，启动时生成 supported methods。 |
| Error adapter | 统一返回 AXTP status/error，不散落旧 `{ok:false}`。 |
| Legacy gate | 灰度兼容只在独立 adapter 中，默认新固件进入 `axtp_only`。 |

完成标准：

- 无 signage handler 时，设备可完成 AXTP session、能力查询和未知 method 错误。
- 注入一个测试 handler 后，capability 和 router 同步可见。
- 旧 SDK command 默认不被 AXTP router 接收。

### Phase 4: 业务 handler 全量注入

按业务组一次性补齐数字标牌 handler：

1. 基础信息、时间、网络、存储、音频、固件更新、更新策略、绑定、日志。
2. signage playlist、media URL refresh、OSD/appearance。
3. schedule 和 telemetry 在评审定域后注入。
4. App、服务端和设备端使用同一 generated schema 测试向量。

数字标牌不建议长期保持 `dual_stack`。如果发布节奏需要短期兼容，状态机只能是：

| 状态 | 行为 |
|---|---|
| `legacy_readonly` | 旧路径只允许旧 App 查询或回滚验证，不新增功能。 |
| `dual_stack_short_window` | App 优先 AXTP，旧路径只作灰度 fallback，并记录差异。 |
| `axtp_only` | 新固件和新 App 只走 AXTP。 |
| `legacy_removed` | 移除旧 SDK command adapter。 |

## 8. App 和服务端适配

App / 服务端需要同步完成：

- 连接后先执行 AXTP session，并调用 `capability.supportedMethods`。
- 以 generated method name / methodId 调用业务，不再维护 `SetPlaylistConfig` 等旧字符串常量。
- 按 generated schema 编解码 playlist、media、appearance、update policy、schedule、log 等 payload。
- 对不支持目标 method 的设备提示固件升级或走明确的旧固件路径。
- 灰度期间记录同一业务的新旧结果差异，尤其是 playlist 全量同步、URL 过期刷新和日志导出。

App 不应把旧分类表中的候选 method 当成最终接口。可调用接口必须来自本轮采纳后的 generated protocol。

## 9. 测试计划

### 9.1 Protocol and generator checks

- 草案补齐后运行 Markdown 链接/路径检查。
- 采纳 YAML 后运行 `pnpm --dir generators --config.verify-deps-before-run=false build`。
- 采纳 YAML 后运行 `pnpm --dir generators --config.verify-deps-before-run=false test`。
- 检查 `protocol/axtp.protocol.yaml` 和 `docs/generated/protocol.md` 中 method/schema/capability 与草案一致。

### 9.2 End-to-end fixtures

| fixture | 期望 |
|---|---|
| `signage-session-ready` | 完成 AXTP session 和 capability 查询。 |
| `signage-legacy-command-rejected` | 新协议入口收到 `SetPlaylistConfig` 旧 command 字符串时返回不支持。 |
| `signage-playlist-roundtrip` | `setPlaylistConfig` 后 `getPlaylistConfig` 返回等价结构。 |
| `signage-playlist-full-replace` | 第二次全量下发会删除旧列表中不存在的 items。 |
| `signage-media-url-refresh` | 设备用 `itemId` 获取新的 `url/urls/expiresAt`。 |
| `signage-osd-config` | `panelLayout/autoHidePanel/autoHideDelay` set/get 一致。 |
| `signage-update-policy` | `autoUpdate/autoUpdateWindow/channel` set/get 一致。 |
| `signage-schedule-domain` | 按评审结论验证播放排期或关机/重启计划。 |
| `signage-log-export` | `log.createExport` 触发任务并收到 `log.exportStateChanged`。 |
| `signage-common-network-storage-audio` | 网络、SD、音量、输入增益基础读写可用。 |
| `signage-ota-url` | URL 升级通过 `firmware.beginUpdate` 或当前兼容名启动并可查询/上报进度。 |
| `signage-bind-state` | 绑定码、绑定状态和状态变化事件按 auth schema 工作。 |

## 10. 发布门禁

数字标牌进入 `axtp_only` 前必须满足：

- 旧 `signage_sdk` 31 个条目都有 AXTP 覆盖结论。
- schedule 定域和 telemetry 定域已评审完成。
- P0 草案已采纳到 registry，并生成 protocol/runtime 产物。
- 固件端 AXTP parser、session、router、handler 注入和 capability 均已固定。
- App 和服务端已切换到 generated protocol。
- 旧 SDK command adapter 默认关闭或移除。
- 线上回滚路径明确：回滚到旧固件/旧 App，而不是在新 AXTP 协议里继续扩展旧 command。

验收标准：

- 数字标牌新业务不再依赖旧 `Verb + Resource` command。
- `docs/protocol/signage/**` 与相关 common 草案的字段覆盖旧 payload。
- generated protocol 是 App、服务端和固件共同事实源。
- 新固件可独立完成 AXTP session、capability、业务调用和错误响应。
- 灰度窗口结束后可删除旧数字标牌 SDK command 主路径。

---
status: draft
contract: false
generated: false
domain: system
feature: system.state
registry:
lastReviewed: 2026-06-10
---

# system.state

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 读取系统运行状态、上报低频状态变化或周期性状态，并触发运行时异常恢复。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | P0 状态字段、`system.stateReported` 周期策略、runtime recovery scope 和断连语义仍需确认。 |

## 1. 功能说明

`system.state` 用于读取当前设备 OS / runtime 的通用运行状态，接收低频状态变化通知或周期性状态上报，并在设备处于异常运行态时触发运行时状态恢复动作。

本文是 `docs/protocol` 下的评审草案，不是 runtime 实现合同。当前 generated 协议没有 adopted `system.state` 方法或事件；本文中的 method、event、schema 和字段均为候选，正式 ID 和 fieldId 必须在 registry 采纳时分配。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | `online`、`uptimeSeconds`、`bootId`、CPU、内存、load、runtime/process 摘要、采样时间。 |
| 包含 | 低频状态变化通知 `system.stateChanged`，用于让业务端刷新状态并自行判断健康、告警或故障。 |
| 包含 | 周期性状态上报 `system.stateReported`，用于承接 legacy `OnTelemetryReport` 中 CPU、内存、uptime、system time、temp、battery 等系统运行状态。 |
| 包含 | `system.recoverRuntimeState`，用于恢复 MCU、runtime service、controller 或 service 等运行时异常状态。 |
| 不包含 | 设备身份、产品、硬件静态信息；这些归 `device.info`。 |
| 不包含 | 关机、重启、计划关机/重启；这些归 `system.lifecycle`。 |
| 不包含 | 恢复默认配置、恢复出厂设置、首次初始化；这些归 `system.reset` / `system.initialization`。 |
| 不包含 | 独立 `system.health`、warning、fault capability；健康和告警判定由业务端基于 `system.stateChanged` 自行实现。 |
| 不包含 | 播放状态、资源下载状态、数字标牌业务告警；这些应进入 `signage.*` 或 `software.*`。 |
| 不包含 | 高频传感器流、诊断统计流；这些应进入更具体的 diagnostic / sensor feature 或 STREAM。 |
| 数据面 | 不使用 STREAM；所有操作都是 RPC method/event。 |

## 3. 方法

方法 ID、bitOffset 和 schema fieldId 均为 `TBD after adoption`，由 registry 采纳时分配。

| method | 调用类型 | 说明 | params | result | 错误 | 状态 |
|---|---|---|---|---|---|---|
| `system.getState` | query | 查询当前通用运行状态快照。 | `GetSystemStateParams` | `SystemState` | `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE`, `INTERNAL_ERROR` | review-ok |
| `system.recoverRuntimeState` | action / async-action | 恢复指定 scope 的运行时状态，用于从 MCU、runtime、controller、service 等异常状态中恢复。 | `RecoverRuntimeStateParams` | `RecoverRuntimeStateResult` | `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED`, `UNAVAILABLE`, `INTERNAL_ERROR` | draft |

### `system.getState`

| 项 | 内容 |
|---|---|
| 说明 | 查询当前设备运行状态快照，供 UI、监控和业务端状态判定使用。 |
| 调用类型 | query |
| params | `GetSystemStateParams` |
| result | `SystemState` |
| 错误 | 通用 RPC / system 错误；候选业务错误见错误表。 |
| 备注 | `sections` 控制返回段；高频遥测不应塞进 `system.getState` 的默认返回。 |

#### Params 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sections` | string[] | no | `cpu`, `memory`, `load`, `runtime`, `recovery`, `all` candidate | default P0 sections | 指定要返回的状态段。省略时返回 P0 段，首批 P0 范围仍需确认。 |
| `includeRecoveryCapabilities` | boolean | no | `true`, `false` | `false` | 是否返回 `runtimeRecoverySupported` 和 `recoverableScopes`。 |

#### Result 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `online` | boolean | yes | `true`, `false` | none | 系统是否处于可服务状态。 |
| `uptimeSeconds` | uint64 | no | `0..uint64 max` | omitted | 自上次启动以来的运行秒数。 |
| `bootId` | string | no | boot-cycle id | omitted | 启动周期 ID，用于识别重启。 |
| `stateVersion` | string | no | opaque version | omitted | 运行时状态版本，用于恢复前的乐观校验。 |
| `runtimeRecoverySupported` | boolean | no | `true`, `false` | omitted | 是否支持 `system.recoverRuntimeState`。 |
| `recoverableScopes` | string[] | no | scope array | omitted | 支持的状态恢复 scope。 |
| `cpu` | `SystemCpuState` | no | see schema | omitted | CPU 使用摘要。 |
| `memory` | `SystemMemoryState` | no | see schema | omitted | 内存使用摘要。 |
| `load` | `SystemLoadState` | no | see schema | omitted | 系统负载摘要；不适用平台可省略。 |
| `runtime` | `SystemRuntimeSummary` | no | see schema | omitted | AXTP host/runtime 运行摘要。 |
| `sampledAt` | string timestamp | no | RFC 3339 timestamp | omitted | 状态采样时间。 |

### `system.recoverRuntimeState`

| 项 | 内容 |
|---|---|
| 说明 | 对指定运行时 scope 执行异常状态恢复。 |
| 调用类型 | action / async-action |
| params | `RecoverRuntimeStateParams` |
| result | `RecoverRuntimeStateResult` |
| 错误 | 不支持 scope、权限不足、当前 lifecycle/reset 动作冲突、资源忙、状态版本不匹配、内部恢复失败。 |
| 备注 | 这是运行时异常恢复，不是恢复默认配置、恢复出厂、重新初始化、重启或关机。恢复成功或异步完成后，应通过 `system.stateChanged` 或后续 `system.getState` 校准状态。 |

#### Params 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `scope` | string enum | yes | `runtime`, `mcu`, `controller`, `service`, `all` candidate | none | 要恢复的运行时范围；首批 scope 仍需确认。 |
| `componentId` | string | no | component id | omitted | 具体组件或控制器 ID，例如 `main-controller`。是否允许指向 child device 仍需确认。 |
| `reason` | string | no | caller-defined reason | omitted | 调用方给出的原因，例如 `recover_from_abnormal_state`。 |
| `force` | boolean | no | `true`, `false` | `false` | 是否请求强制恢复；平台可以拒绝。 |
| `confirmationToken` | string | no | opaque token | omitted | 危险操作确认 token。 |
| `expectedStateVersion` | string | no | `SystemState.stateVersion` | omitted | 可选乐观锁，避免基于过期状态执行恢复。 |

#### Result 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `accepted` | boolean | yes | `true`, `false` | none | 设备是否接受恢复请求。 |
| `actionId` | string | no | opaque action id | omitted | 恢复动作 ID，用于日志或后续关联。 |
| `recoveredScopes` | string[] | no | scope array | omitted | 实际执行或计划执行恢复的 scope。 |
| `state` | `SystemState` | no | see schema | omitted | 恢复后的状态快照；异步完成时可省略。 |
| `disconnectExpected` | boolean | no | `true`, `false` | `false` | 是否预期 AXTP 连接断开。 |
| `estimatedDelaySeconds` | uint32 | no | `0..uint32 max` | omitted | 预估完成时间。 |

## 4. 事件

| event | 触发条件 | payload | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `system.stateChanged` | online 变化、uptime reset、CPU/内存摘要跨阈值、runtime 状态变化、runtime recovery 请求或完成。 | `SystemStateChangedEvent` | 可用变化片段更新 UI；事件缺字段、丢失或状态不完整时，调用 `system.getState` 校准。 | draft |
| `system.stateReported` | 设备按周期或服务端策略上报系统运行状态。 | `SystemStateReportedEvent` | 记录趋势、刷新概览或触发告警；不要当作播放业务事件。 | draft |

### Event payload 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `changedFields` | string[] | yes | field path array | none | 变化字段路径，例如 `cpu.usagePercent`、`runtime.state`。 |
| `state` | `SystemState` | no | see schema | omitted | 变化后的状态快照或部分快照。 |
| `reason` | string enum | no | `poll_threshold`, `boot`, `runtime_restart`, `service_change`, `runtime_recovery_requested`, `runtime_recovery_completed`, `state_recovered`, `unknown` candidate | omitted | 状态变化原因。 |

### `system.stateReported`

| 项 | 内容 |
|---|---|
| 说明 | 周期性上报设备系统运行状态。该事件落实 signage flow 对 legacy `OnTelemetryReport` 的定域，不再使用 `sensor.telemetry` 作为本 flow 的默认目标。 |
| Payload Schema | `SystemStateReportedEvent` |
| 触发条件 | 固定周期、服务端配置、设备策略或状态采样上报。 |
| 客户端处理 | 记录趋势、刷新设备概览；如果缺少字段或需要完整状态，调用 `system.getState`。 |

#### Payload：`SystemStateReportedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | `SystemState` | yes | see schema | none | 本次上报的状态快照或片段。 |
| `reportedFields` | string[] | no | field paths | omitted | 本次上报包含的字段路径。 |
| `intervalSeconds` | uint32 | no | `0..uint32 max` | omitted | 上报周期。 |
| `reason` | string enum | no | `periodic`, `threshold`, `server_request`, `device_policy`, `unknown` candidate | `periodic` | 上报原因。 |

## 5. Capability

Capability name: `system.state`。

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `system.state` | capability 名称。 |
| `supportedSections` | string[] | no | `cpu`, `memory`, `load`, `runtime`, `recovery`, `all` candidate | `system.getState` 支持的状态段。 |
| `supportsStateChangedEvent` | boolean | no | `true`, `false` | 是否支持 `system.stateChanged`。 |
| `supportsStateReportedEvent` | boolean | no | `true`, `false` | 是否支持 `system.stateReported`。 |
| `stateChangedPolicy` | `SystemStateChangedPolicy` | no | see schema | 状态变化事件的节流、阈值或采样策略摘要。 |
| `stateReportPolicy` | `SystemStateReportPolicy` | no | see schema | 周期上报策略摘要。 |
| `runtimeRecoverySupported` | boolean | no | `true`, `false` | 是否支持 `system.recoverRuntimeState`。 |
| `recoverableScopes` | string[] | no | `runtime`, `mcu`, `controller`, `service`, `all` candidate | 支持恢复的 scope。 |

## 6. 字段 / Schemas

### 6.1 Schema 层级速览

`system.state` 有三类核心数据：状态快照、状态变化事件、运行时恢复动作。

| 层级 | 用在哪里 | 作用 |
|---|---|---|
| state snapshot | `system.getState` result、event payload、recover result | 描述当前通用运行状态。 |
| recovery action | `system.recoverRuntimeState` params/result | 描述要恢复哪个运行时 scope，以及设备是否接受/完成。 |
| event payload | `system.stateChanged` | 描述哪些状态字段变化，以及变化原因。 |

```text
SystemState
  online
  uptimeSeconds / bootId / stateVersion
  cpu: SystemCpuState
  memory: SystemMemoryState
  load: SystemLoadState
  runtime: SystemRuntimeSummary
  runtimeRecoverySupported / recoverableScopes

RecoverRuntimeStateParams
  scope / componentId / reason / force / confirmationToken / expectedStateVersion

SystemStateChangedEvent
  changedFields
  reason
  state: SystemState

SystemStateReportedEvent
  state: SystemState
  intervalSeconds / reason
```

阅读规则：

- `SystemState` 是可返回完整快照，也可在 event 中作为变化片段。
- `sections` 只影响返回哪些段，不改变字段语义。
- `system.stateChanged` 不做健康等级判断；业务端根据状态和阈值自行判断。
- `system.stateReported` 是周期性状态事件；它可以包含 temp/battery，但不承载 signage 播放状态。
- `recoverRuntimeState` 是动作型 method，但仍属于 `system.state`，因为它恢复的是运行时状态，不是设备配置或出厂基线。

### 6.2 请求与响应 Schemas

#### `GetSystemStateParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sections` | string[] | no | `cpu`, `memory`, `load`, `runtime`, `recovery`, `all` candidate | default P0 sections | 可选返回段；P0 默认字段仍需确认。 |
| `includeRecoveryCapabilities` | boolean | no | `true`, `false` | `false` | 是否返回状态恢复能力摘要。 |

#### `RecoverRuntimeStateParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `scope` | string enum | yes | `runtime`, `mcu`, `controller`, `service`, `all` candidate | none | 要恢复的运行时范围。 |
| `componentId` | string | no | component id | omitted | 具体组件或控制器 ID。 |
| `reason` | string | no | reason string | omitted | 调用方给出的恢复原因。 |
| `force` | boolean | no | `true`, `false` | `false` | 是否请求强制恢复。 |
| `confirmationToken` | string | no | opaque token | omitted | 危险操作确认 token。 |
| `expectedStateVersion` | string | no | state version | omitted | 乐观锁，避免基于过期状态执行恢复。 |

#### `RecoverRuntimeStateResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `accepted` | boolean | yes | `true`, `false` | none | 是否接受恢复请求。 |
| `actionId` | string | no | opaque action id | omitted | 恢复动作 ID。 |
| `recoveredScopes` | string[] | no | scope array | omitted | 实际执行或计划执行的恢复 scope。 |
| `state` | `SystemState` | no | see 6.4 | omitted | 恢复后的状态快照或片段。 |
| `disconnectExpected` | boolean | no | `true`, `false` | `false` | 是否预期 AXTP 连接断开。 |
| `estimatedDelaySeconds` | uint32 | no | `0..uint32 max` | omitted | 预估完成时间。 |

#### `SystemStateChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `changedFields` | string[] | yes | field path array | none | 变化字段路径。 |
| `state` | `SystemState` | no | see 6.4 | omitted | 变化后的状态快照或部分快照。 |
| `reason` | string enum | no | `poll_threshold`, `boot`, `runtime_restart`, `service_change`, `runtime_recovery_requested`, `runtime_recovery_completed`, `state_recovered`, `unknown` candidate | omitted | 变化原因。 |

#### `SystemStateReportedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | `SystemState` | yes | see 6.4 | none | 本次上报的系统状态片段。 |
| `reportedFields` | string[] | no | field path array | omitted | 上报字段路径。 |
| `intervalSeconds` | uint32 | no | `0..uint32 max` | omitted | 上报周期。 |
| `reason` | string enum | no | `periodic`, `threshold`, `server_request`, `device_policy`, `unknown` candidate | `periodic` | 上报原因。 |

### 6.3 Capability Schemas

#### `SystemStateCapability`

这是 `system.state` 的 capability 描述候选；正式形态由 registry 采纳时确定。

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `system.state` | none | capability 名称。 |
| `supportedSections` | string[] | no | section array | omitted | 支持的 `system.getState.sections`。 |
| `supportsStateChangedEvent` | boolean | no | `true`, `false` | omitted | 是否支持 `system.stateChanged`。 |
| `supportsStateReportedEvent` | boolean | no | `true`, `false` | omitted | 是否支持 `system.stateReported`。 |
| `stateChangedPolicy` | `SystemStateChangedPolicy` | no | see below | omitted | event 节流/阈值策略摘要。 |
| `stateReportPolicy` | `SystemStateReportPolicy` | no | see below | omitted | 周期上报策略摘要。 |
| `runtimeRecoverySupported` | boolean | no | `true`, `false` | omitted | 是否支持运行时状态恢复。 |
| `recoverableScopes` | string[] | no | scope array | omitted | 支持的恢复 scope。 |

#### `SystemStateChangedPolicy`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `mode` | string enum | no | `threshold`, `debounced`, `sampled`, `manual`, `unknown` candidate | omitted | 事件触发策略摘要。 |
| `minIntervalMs` | uint32 | no | `0..uint32 max` | omitted | 事件最小间隔。 |
| `includedSections` | string[] | no | section array | omitted | 事件可能包含的状态段。 |

#### `SystemStateReportPolicy`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `enabled` | boolean | no | `true`, `false` | omitted | 是否启用周期上报。 |
| `intervalSeconds` | uint32 | no | `0..uint32 max` | omitted | 默认上报周期。 |
| `includedSections` | string[] | no | `cpu`, `memory`, `runtime`, `thermal`, `battery`, `time`, `all` candidate | omitted | 周期上报包含的状态段。 |

### 6.4 Config / State 总结构

#### `SystemState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `online` | boolean | yes | `true`, `false` | none | 系统是否处于可服务状态。 |
| `uptimeSeconds` | uint64 | no | `0..uint64 max` | omitted | 自上次启动以来的运行秒数。 |
| `bootId` | string | no | boot-cycle id | omitted | 启动周期 ID。 |
| `stateVersion` | string | no | opaque version | omitted | 状态版本。 |
| `runtimeRecoverySupported` | boolean | no | `true`, `false` | omitted | 是否支持运行时状态恢复。 |
| `recoverableScopes` | string[] | no | scope array | omitted | 支持的恢复 scope。 |
| `cpu` | `SystemCpuState` | no | see 6.5 | omitted | CPU 摘要。 |
| `memory` | `SystemMemoryState` | no | see 6.5 | omitted | 内存摘要。 |
| `load` | `SystemLoadState` | no | see 6.5 | omitted | 系统负载摘要。 |
| `runtime` | `SystemRuntimeSummary` | no | see 6.5 | omitted | runtime 摘要。 |
| `systemTime` | string timestamp | no | RFC 3339 timestamp | omitted | 当前系统时间。 |
| `thermal` | `SystemThermalState` | no | see 6.5 | omitted | 温度摘要。 |
| `battery` | `SystemBatteryState` | no | see 6.5 | omitted | 电池摘要；无电池设备可省略。 |
| `sampledAt` | string timestamp | no | RFC 3339 timestamp | omitted | 采样时间。 |

### 6.5 各对象字段

#### `SystemCpuState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `usagePercent` | float | no | 0..100 | omitted | 总 CPU 使用率。 |
| `cores` | uint16 | no | `1..uint16 max` | omitted | CPU 核心数。 |

#### `SystemMemoryState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `usedBytes` | uint64 | no | `0..uint64 max` | omitted | 已使用内存。 |
| `totalBytes` | uint64 | no | `0..uint64 max` | omitted | 总内存。 |
| `availableBytes` | uint64 | no | `0..uint64 max` | omitted | 可用内存。 |

#### `SystemLoadState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `load1m` | float | no | `0..float max` | omitted | 1 分钟 load average；不适用平台可省略。 |
| `load5m` | float | no | `0..float max` | omitted | 5 分钟 load average。 |
| `load15m` | float | no | `0..float max` | omitted | 15 分钟 load average。 |

#### `SystemRuntimeSummary`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | string enum | no | `running`, `starting`, `stopping`, `error`, `unknown` candidate | omitted | AXTP host/runtime 状态。 |
| `processId` | uint32 | no | `0..uint32 max` | omitted | host 进程 ID；仅本地诊断使用。 |
| `restartCount` | uint32 | no | `0..uint32 max` | omitted | runtime 重启次数。 |

#### `SystemThermalState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `temperatureCelsius` | float | no | platform range | omitted | 设备或主板温度。 |
| `source` | string | no | sensor id | omitted | 温度来源。 |

#### `SystemBatteryState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `levelPercent` | uint8 | no | `0..100` | omitted | 电量百分比。 |
| `charging` | boolean | no | `true`, `false` | omitted | 是否正在充电。 |
| `present` | boolean | no | `true`, `false` | omitted | 是否检测到电池。 |

## 7. JSON 示例

示例只展示 RPC `d` 数据块，不包裹外层 `sid` / `op` / `d` wire envelope。字段和 ID 在采纳前均为草案。

### 7.1 场景：系统状态面板读取 CPU、内存和 runtime 状态

App 打开系统状态面板时，读取 P0 状态段，并请求带上运行时恢复能力摘要。

#### request

```json
{
  "id": 20,
  "method": "system.getState",
  "params": {
    "sections": ["cpu", "memory", "runtime"],
    "includeRecoveryCapabilities": true
  }
}
```

#### response

```json
{
  "id": 20,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "online": true,
    "uptimeSeconds": 3600,
    "bootId": "boot-REDACTED",
    "stateVersion": "state-2026-06-09T10:30:00Z",
    "runtimeRecoverySupported": true,
    "recoverableScopes": ["runtime", "mcu", "controller"],
    "cpu": {
      "usagePercent": 42.5,
      "cores": 8
    },
    "memory": {
      "usedBytes": 2147483648,
      "totalBytes": 8589934592,
      "availableBytes": 6442450944
    },
    "runtime": {
      "state": "running",
      "restartCount": 0
    },
    "sampledAt": "2026-06-09T10:30:00Z"
  }
}
```

读法：`online` 表示系统是否可服务；`stateVersion` 可用于后续恢复动作的乐观校验；`runtimeRecoverySupported` 和 `recoverableScopes` 只在请求包含恢复能力摘要时需要返回。

### 7.2 场景：恢复 MCU 异常状态

用户或上位机发现 MCU 状态异常，但不想重启整机，也不想恢复默认/出厂配置，只请求恢复 `mcu` scope。

#### request

```json
{
  "id": 21,
  "method": "system.recoverRuntimeState",
  "params": {
    "scope": "mcu",
    "componentId": "main-controller",
    "reason": "recover_from_abnormal_state",
    "expectedStateVersion": "state-2026-06-09T10:30:00Z",
    "confirmationToken": "TOKEN-REDACTED"
  }
}
```

#### response

```json
{
  "id": 21,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "accepted": true,
    "actionId": "act-REDACTED",
    "recoveredScopes": ["mcu"],
    "state": {
      "online": true,
      "stateVersion": "state-2026-06-09T10:30:08Z",
      "runtime": {
        "state": "running"
      },
      "sampledAt": "2026-06-09T10:30:08Z"
    },
    "disconnectExpected": false,
    "estimatedDelaySeconds": 3
  }
}
```

读法：`accepted=true` 表示设备接受恢复动作。响应中的 `state` 可以是恢复后的部分快照；如果恢复异步完成，设备可以先省略 `state`，随后通过 `system.stateChanged` 或客户端轮询 `system.getState` 校准。

### 7.3 场景：CPU 使用率跨阈值触发状态变化事件

设备检测到 CPU 使用率跨过产品定义阈值后，上报低频状态变化。业务端接收事件后自行判断是否显示健康、告警或故障。

```json
{
  "event": "system.stateChanged",
  "intent": 1,
  "data": {
    "changedFields": ["cpu.usagePercent"],
    "reason": "poll_threshold",
    "state": {
      "cpu": {
        "usagePercent": 82.4
      },
      "sampledAt": "2026-06-09T10:31:00Z"
    }
  }
}
```

读法：event payload 可以是变化片段，不一定是完整 `SystemState`。客户端如果需要完整状态，应调用 `system.getState` 校准。

### 7.4 场景：运行时状态恢复完成事件

`system.recoverRuntimeState` 异步完成后，设备用 `system.stateChanged` 报告 runtime 状态恢复。

```json
{
  "event": "system.stateChanged",
  "intent": 1,
  "data": {
    "changedFields": ["runtime.state", "stateVersion"],
    "reason": "runtime_recovery_completed",
    "state": {
      "online": true,
      "stateVersion": "state-2026-06-09T10:30:08Z",
      "runtime": {
        "state": "running"
      },
      "sampledAt": "2026-06-09T10:30:08Z"
    }
  }
}
```

读法：这个事件只表达运行时状态恢复完成，不表示设备重启、关机、恢复默认设置或恢复出厂设置。

### 7.5 场景：周期性系统状态上报

设备按策略周期上报 CPU、内存、系统时间、温度和电池状态。该示例对应 signage flow 中 current SDK `OnTelemetryReport` 的 AXTP 目标态。

```json
{
  "event": "system.stateReported",
  "intent": 1,
  "data": {
    "reason": "periodic",
    "intervalSeconds": 60,
    "reportedFields": [
      "cpu.usagePercent",
      "memory.availableBytes",
      "systemTime",
      "thermal.temperatureCelsius",
      "battery.levelPercent"
    ],
    "state": {
      "online": true,
      "uptimeSeconds": 86400,
      "cpu": {
        "usagePercent": 31.2
      },
      "memory": {
        "availableBytes": 4294967296
      },
      "systemTime": "2026-06-11T10:10:00Z",
      "thermal": {
        "temperatureCelsius": 42.5,
        "source": "main-board"
      },
      "battery": {
        "present": true,
        "levelPercent": 87,
        "charging": false
      },
      "sampledAt": "2026-06-11T10:10:00Z"
    }
  }
}
```

读法：`system.stateReported` 是周期性运行状态事件，不表示字段发生变化。播放状态、媒体缓存状态或 signage 业务告警不应塞入该事件。

### 7.6 场景：状态服务暂不可用

设备状态服务尚未准备好或临时不可用时，返回通用错误码；候选业务错误名放在 `details.candidateError` 中。

```json
{
  "id": 22,
  "status": {
    "ok": false,
    "code": 15,
    "msg": "Unavailable.",
    "details": {
      "candidateError": "SYSTEM_STATE_UNAVAILABLE"
    }
  }
}
```

读法：失败响应不改变设备状态，也不应触发 `system.stateChanged`。客户端可以稍后重试或等待连接 / lifecycle 状态稳定。

## 8. 错误

| 错误 | 适用场景 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持 `system.state`、某个 `sections` 值或某个 recovery scope。 | 可映射候选 `SYSTEM_STATE_SECTION_NOT_SUPPORTED` / `SYSTEM_STATE_RECOVERY_NOT_SUPPORTED`。 |
| `INVALID_ARGUMENT` | 请求结构非法、scope 非法、componentId 格式非法、stateVersion 不可用。 | 可映射候选 `SYSTEM_STATE_RECOVERY_INVALID_SCOPE`。 |
| `INVALID_STATE` | 当前 lifecycle/reset/initialization 状态不允许恢复运行时状态。 | 例如正在关机、重启、恢复出厂。 |
| `BUSY` | 状态恢复正在执行，或相关资源繁忙。 | 可映射候选 `SYSTEM_STATE_RECOVERY_BUSY`。 |
| `PERMISSION_DENIED` | 调用方无权读取状态或执行恢复动作。 | 可映射候选 `SYSTEM_STATE_RECOVERY_PERMISSION_DENIED`。 |
| `UNAVAILABLE` | 系统状态服务暂不可用。 | 可映射候选 `SYSTEM_STATE_UNAVAILABLE`。 |
| `INTERNAL_ERROR` | 状态读取或恢复执行失败。 | 设备内部错误。 |
| `SYSTEM_STATE_UNAVAILABLE` | 候选业务错误：系统状态服务暂不可用。 | `[REVIEW-DRAFT]`；采纳前确认是否需要 feature-specific errorCode。 |
| `SYSTEM_STATE_RECOVERY_NOT_SUPPORTED` | 候选业务错误：恢复 scope 不支持。 | `[REVIEW-DRAFT]`。 |
| `SYSTEM_STATE_RECOVERY_BUSY` | 候选业务错误：恢复动作冲突或资源忙。 | `[REVIEW-DRAFT]`。 |

## 9. Legacy 映射

Legacy 映射是迁移证据，不是 runtime 合同。旧 `device.state` 分类中的泛设备状态应按字段拆分，不再映射到独立 `system.health`。

| legacy 项 | 候选映射 | 状态 | 说明 |
|---|---|---|---|
| AXDP / Rooms / VM33 `CommonGetTipsStatus`、`CheckLineStatus`、`DeviceStatus.Get` 等 | `system.getState` / `system.stateChanged` 或未来 telemetry/sensor capability | `[REVIEW-ASK]` | 需按字段拆到 runtime state、业务端判定或其他遥测能力。 |
| Signage `OnTelemetryReport` 中 CPU、内存、uptime、system time、temp、battery 等系统运行字段 | `system.stateReported` | `[REVIEW-OK]` | 周期性系统状态上报；播放状态或资源状态应拆到 signage/software。 |
| MCU / controller 状态恢复旧命令或 SDK 行为 | `system.recoverRuntimeState` | `[REVIEW-ASK]` | 需确认是否已有 legacy 命令、scope、权限和结果码。 |
| 旧健康/告警/fault 状态 | business-side judgment over `system.stateChanged` | `[REVIEW-OK]` | 不创建独立 `system.health` capability。 |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| registry | not generated | 当前未写入 `registry/domains/system/domain.yaml`。 |
| generated | false | `docs/generated/**` 未生成 `system.getState`、`system.recoverRuntimeState`、`system.stateChanged` 或 `system.stateReported`。 |
| protocol draft | draft | domain 边界、方法、事件、schema、错误、legacy mapping 和 JSON 示例已更新；新增 `system.stateReported` 仍需 review。 |
| registry readiness | partial / candidate | 仍需确认 P0 字段、section 策略、周期上报策略、recovery scope、event 节流、fieldId、methodId/eventId、错误码。 |
| conformance | missing | 采纳后需要新增 `system.state` 专项 cases。 |

## 11. 测试要点

| 类型 | 要点 |
|---|---|
| happy path | `system.getState` 返回 online、uptime、CPU、memory、runtime；`system.recoverRuntimeState` 接受支持的 scope。 |
| event path | CPU/内存阈值、runtime 状态变化、recovery completed 触发 `system.stateChanged`；周期采样触发 `system.stateReported`。 |
| boundary case | `sections` 省略、未知 section、不适用平台省略 `load`、optional `runtime` 缺失、`stateVersion` 过期。 |
| recovery case | 不支持 scope、componentId 非法、无确认 token、当前 lifecycle/reset 冲突、恢复动作 busy。 |
| compatibility | 原 `device.state` 运行时字段迁移到 `system.state`；健康/告警/fault 由业务端自行判定。 |
| no-event-on-failure | `system.getState` 或 `recoverRuntimeState` 失败时不应触发误导性的 state changed event。 |

## 12. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| CPU、内存、online、uptime、load、runtime summary 中哪些是 P0？ | schema / conformance | `online` 为必填，CPU/内存/runtime 作为首批推荐段；`load` 可选。 | open |
| `system.stateChanged` 是阈值跨越触发，还是任意采样变化都触发？ | event / conformance | 采用阈值或节流策略，避免高频遥测污染业务事件。 | open |
| `system.stateReported` 默认上报周期和字段集合是什么？ | event / conformance | 先支持 CPU、memory、uptime、systemTime、thermal、battery 的可选片段。 | open |
| `system.recoverRuntimeState` 首批 scope 是否包含 `mcu`、`runtime`、`controller`、`service` 和 `all`？ | registry / product behavior | 首批采用 `runtime`、`mcu`、`controller`，`service` 和 `all` 作为候选。 | open |
| `componentId` 是否允许指向 child device？ | schema / legacy | 默认只指向当前 endpoint 内部组件；child device recovery 另行评审。 | open |
| 状态恢复是否可能导致 AXTP 连接断开？ | lifecycle / conformance | 用 `disconnectExpected` 明示，断连场景配合 lifecycle/reconnect 流程。 | open |

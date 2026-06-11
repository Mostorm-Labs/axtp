---
status: draft
contract: false
generated: false
domain: software
feature: software.update
registry:
lastReviewed: 2026-06-11
---

# software.update

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 对设备上运行的软件对象执行升级、查询状态、取消升级并上报进度。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | conditional；URL 升级不使用 STREAM，本地包升级可后续绑定 STREAM。 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | P0 targets、安装包类型、重启策略和本地包 STREAM 绑定方式仍需确认。 |

## 1. 功能说明

`software.update` 用于升级设备上运行的软件对象，例如 `launcher`、`signagePlayer`、`agent` 或 `runtime`。它落实 signage flow 中 legacy `RemoteUpgrade` / `UpgradeProgress` 的最终定域：这些命令升级的是 Windows 系统上的 Launcher/播放器/agent 软件，不是设备固件，因此不进入 `firmware.update`。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | URL 软件升级、升级状态查询、取消升级、升级状态/进度事件。 |
| 包含 | `target=launcher/signagePlayer/agent/runtime`，P0 默认 `launcher`。 |
| 不包含 | 自动更新策略配置；属于 `software.updatePolicy`。 |
| 不包含 | Launcher 常规配置或外观配置；属于 `software.config` / `software.appearanceConfig`。 |
| 不包含 | bootloader、设备固件、资源分区、系统镜像升级；属于 `firmware.update` 或 `system.*`。 |
| 数据面 | P0 URL 下载不使用 STREAM；本地包升级可在后续版本通过 RPC 创建业务 stream。 |

## 3. 方法

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `software.beginUpdate` | action / async-action | 创建软件升级任务。 | `SoftwareBeginUpdateParams` | `SoftwareUpdateState` | 是，触发 `software.updateStateChanged`。 | draft |
| `software.getUpdateState` | query | 查询升级任务或 target 当前升级状态。 | `SoftwareGetUpdateStateParams` | `SoftwareUpdateState` | 否 | draft |
| `software.cancelUpdate` | action | 取消未进入不可中断阶段的升级任务。 | `SoftwareCancelUpdateParams` | `SoftwareUpdateState` | 是，状态变化后触发事件。 | draft |

### 3.1 `software.beginUpdate`

| 项 | 内容 |
|---|---|
| 目的 | 发起 Launcher / signagePlayer / agent 等软件升级。 |
| 调用类型 | action / async-action |
| Params Schema | `SoftwareBeginUpdateParams` |
| Result Schema | `SoftwareUpdateState` |
| 事件触发 | 接受任务、下载、安装、等待重启、成功或失败时触发 `software.updateStateChanged`。 |
| 幂等 / 异步 | 可通过 `updateSessionId` 或 source checksum 做幂等；通常异步执行。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED`, `UNAVAILABLE`, `INTERNAL_ERROR` |

#### 请求参数 Params：`SoftwareBeginUpdateParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | enum | yes | `launcher`, `signagePlayer`, `agent`, `runtime` | none | 要升级的软件对象。 |
| `source` | `SoftwareUpdateSource` | yes | see schema | none | 软件包来源，P0 为 URL。 |
| `version` | string | no | semver / product version | omitted | 目标版本。 |
| `packageType` | enum | no | `exe`, `msi`, `zip`, `appBundle`, `unknown` | `unknown` | 安装包类型。 |
| `checksum` | `SoftwarePackageChecksum` | no | see schema | omitted | 包校验信息。 |
| `installPolicy` | `SoftwareInstallPolicy` | no | see schema | omitted | 安装窗口和静默策略。 |
| `restartPolicy` | enum | no | `noRestart`, `restartSoftwareOnly`, `restartDeviceIfRequired` | `restartSoftwareOnly` | 重启策略。 |
| `userVisible` | boolean | no | `true`, `false` | `false` | 是否允许设备侧显示用户可见进度。 |

### 3.2 `software.getUpdateState`

| 项 | 内容 |
|---|---|
| 目的 | 查询指定升级任务或指定 target 的当前升级状态。 |
| 调用类型 | query |
| Params Schema | `SoftwareGetUpdateStateParams` |
| Result Schema | `SoftwareUpdateState` |
| 事件触发 | 否 |

#### 请求参数 Params：`SoftwareGetUpdateStateParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `updateSessionId` | string | no | opaque id | omitted | 指定升级任务。 |
| `target` | enum | no | `launcher`, `signagePlayer`, `agent`, `runtime` | omitted | 未给 session 时按 target 查询。 |

### 3.3 `software.cancelUpdate`

| 项 | 内容 |
|---|---|
| 目的 | 取消仍可取消的软件升级任务。 |
| 调用类型 | action |
| Params Schema | `SoftwareCancelUpdateParams` |
| Result Schema | `SoftwareUpdateState` |
| 事件触发 | 状态进入 `cancelled` 或 `failed` 时触发 `software.updateStateChanged`。 |

#### 请求参数 Params：`SoftwareCancelUpdateParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `updateSessionId` | string | yes | opaque id | none | 要取消的升级任务。 |
| `reason` | string | no | caller-defined | omitted | 取消原因。 |

## 4. 事件

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `software.updateStateChanged` | 升级任务状态、阶段、进度或错误变化。 | `SoftwareUpdateStateChangedEvent` | 更新进度 UI；事件丢失时调用 `software.getUpdateState`。 | draft |

### 4.1 `software.updateStateChanged`

#### Payload：`SoftwareUpdateStateChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | `SoftwareUpdateState` | yes | see schema | none | 当前升级状态。 |
| `changedFields` | string[] | no | field paths | omitted | 变化字段。 |
| `reason` | enum | no | `accepted`, `progress`, `completed`, `failed`, `cancelled`, `unknown` | `unknown` | 事件原因。 |

## 5. Capability

Capability name: `software.update`。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `software.update` | capability 名称。 |
| `supportedTargets` | string[] | yes | `launcher`, `signagePlayer`, `agent`, `runtime` | 支持升级的软件对象。 |
| `supportedSourceTypes` | string[] | yes | `url`, `stream`, `file` | 支持来源；P0 至少 `url`。 |
| `supportedPackageTypes` | string[] | no | `exe`, `msi`, `zip`, `appBundle`, `unknown` | 支持包类型。 |
| `supportsCancel` | boolean | no | `true`, `false` | 是否支持取消。 |
| `supportsDeviceRestart` | boolean | no | `true`, `false` | 是否允许升级后设备重启。 |

## 6. Schemas

### 6.1 Schema 层级速览

```text
SoftwareBeginUpdateParams
  source: SoftwareUpdateSource
  checksum: SoftwarePackageChecksum
  installPolicy: SoftwareInstallPolicy
SoftwareUpdateState
  error: SoftwareUpdateError
SoftwareUpdateStateChangedEvent
  state: SoftwareUpdateState
```

### 6.2 `SoftwareUpdateSource`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `type` | enum | yes | `url`, `stream`, `file` | none | P0 使用 `url`。 |
| `url` | string | conditional | HTTPS URL | omitted | `type=url` 时必填。 |
| `expiresAt` | string timestamp | no | RFC 3339 | omitted | URL 过期时间。 |
| `streamProfile` | string | no | profile name | omitted | 后续本地包 STREAM 模式使用。 |

### 6.3 `SoftwarePackageChecksum`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `algorithm` | enum | yes | `md5`, `sha256`, `unknown` | none | 校验算法。 |
| `value` | string | yes | hash string | none | 校验值。 |

### 6.4 `SoftwareInstallPolicy`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `installWindow` | `TimeWindow` | no | see schema | omitted | 允许安装时间窗口。 |
| `silent` | boolean | no | `true`, `false` | `true` | 是否静默安装。 |

### 6.5 `SoftwareUpdateState`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `updateSessionId` | string | yes | opaque id | none | 升级任务 ID。 |
| `target` | enum | yes | `launcher`, `signagePlayer`, `agent`, `runtime` | none | 软件对象。 |
| `state` | enum | yes | `idle`, `accepted`, `downloading`, `downloaded`, `verifying`, `installing`, `waitingRestart`, `restarting`, `succeeded`, `failed`, `cancelled` | none | 当前状态。 |
| `phase` | string | no | human / enum candidate | omitted | 更细阶段。 |
| `progress` | uint8 | no | `0..100` | omitted | 百分比进度。 |
| `version` | string | no | version string | omitted | 目标或已安装版本。 |
| `requiresRestart` | boolean | no | `true`, `false` | `false` | 是否需要重启软件或设备。 |
| `error` | `SoftwareUpdateError` | no | see schema | omitted | 失败信息。 |
| `updatedAt` | string timestamp | no | RFC 3339 | omitted | 状态更新时间。 |

### 6.6 `SoftwareUpdateError`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `code` | string | yes | candidate error name | none | 业务错误名。 |
| `message` | string | no | human-readable | omitted | 错误说明。 |
| `retryable` | boolean | no | `true`, `false` | omitted | 是否可重试。 |

## 7. JSON 示例

### 7.1 URL 升级 Launcher

```json
{
  "id": 301,
  "method": "software.beginUpdate",
  "params": {
    "target": "launcher",
    "source": {
      "type": "url",
      "url": "https://example.invalid/packages/nearhub-launcher.msi",
      "expiresAt": "2026-06-11T11:00:00Z"
    },
    "version": "1.0.2",
    "packageType": "msi",
    "restartPolicy": "restartSoftwareOnly",
    "userVisible": false
  }
}
```

```json
{
  "id": 301,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "updateSessionId": "<UPDATE_SESSION_ID>",
    "target": "launcher",
    "state": "accepted",
    "progress": 0,
    "version": "1.0.2"
  }
}
```

### 7.2 进度事件

```json
{
  "event": "software.updateStateChanged",
  "intent": 1,
  "data": {
    "reason": "progress",
    "changedFields": ["state", "progress"],
    "state": {
      "updateSessionId": "<UPDATE_SESSION_ID>",
      "target": "launcher",
      "state": "downloading",
      "phase": "download",
      "progress": 42,
      "version": "1.0.2"
    }
  }
}
```

### 7.3 不支持 target

```json
{
  "id": 302,
  "method": "software.beginUpdate",
  "params": {
    "target": "agent",
    "source": {
      "type": "url",
      "url": "https://example.invalid/agent.zip"
    }
  }
}
```

```json
{
  "id": 302,
  "status": {
    "ok": false,
    "code": 3,
    "message": "Software update target is not supported"
  }
}
```

## 8. Candidate Errors

| Error | 复用 / 候选 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | target、source type 或 package type 不支持。 |
| `INVALID_ARGUMENT` | common | URL、checksum、version、policy 非法。 |
| `INVALID_STATE` | common | 当前 target 已在升级或处于不可升级状态。 |
| `BUSY` | common | 下载、安装或系统维护中。 |
| `SOFTWARE_DOWNLOAD_FAILED` | candidate | URL 下载失败。 |
| `SOFTWARE_VERIFY_FAILED` | candidate | 校验失败。 |
| `SOFTWARE_INSTALL_FAILED` | candidate | 安装失败。 |

## 9. Legacy Mapping

| Legacy entry | Direction | AXTP target | 状态 |
|---|---|---|---|
| `RemoteUpgrade` | Server -> Device | `software.beginUpdate` | `[REVIEW-OK]` |
| `UpgradeProgress` | Server -> Device | `software.getUpdateState` / `software.updateStateChanged` | `[REVIEW-OK]` |

## 10. Registry / Conformance Status

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method / event IDs | `TBD after adoption` |
| Conformance | 需覆盖 URL 升级、进度事件、失败事件、取消、target capability gate。 |

## 11. Test Notes

- `software.beginUpdate(target=launcher, source.type=url)` 返回 `accepted` 状态。
- 进度变化触发 `software.updateStateChanged`。
- 不支持 target 返回 `NOT_SUPPORTED`。
- `software.getUpdateState` 可在事件丢失后恢复 UI。

## 12. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| P0 target 是否只有 `launcher`？ | capability / conformance | 草案保留四个 target，P0 实现可只声明 `launcher`。 | `[REVIEW-ASK]` |
| 本地包升级是否需要 STREAM？ | data-plane | URL P0 不使用 STREAM；本地包后续再绑定业务 stream。 | `[REVIEW-DRAFT]` |
| 安装失败是否自动回滚？ | state machine | 先只表达 failed；回滚另起后续扩展。 | `[REVIEW-ASK]` |

---
status: draft
contract: false
generated: false
domain: software
feature: software.updatePolicy
registry:
lastReviewed: 2026-06-11
---

# software.updatePolicy

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 配置 Launcher / signagePlayer / agent 等软件对象的自动更新策略。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | autoUpdateWindow 跨日语义、channel 枚举和多 target 策略合并规则仍需确认。 |

## 1. 功能说明

`software.updatePolicy` 用于读取、设置和通知软件自动更新策略。它落实 signage flow 中 legacy `GetUpdateConfig` / `SetUpdateConfig` 的最终定域：这些配置面向 Launcher / signagePlayer / agent 软件，不属于设备固件策略。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 自动更新开关、更新时间窗口、发布通道、适用 targets。 |
| 不包含 | 一次性升级任务、进度和失败；属于 `software.update`。 |
| 不包含 | 固件更新策略；属于 `firmware.updatePolicy`，仅在真实固件升级时使用。 |
| 不包含 | Launcher 普通运行配置或 appearance；属于 `software.config` / `software.appearanceConfig`。 |
| 数据面 | 不使用 STREAM。 |

## 3. 方法

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `software.getUpdatePolicy` | query | 查询当前软件更新策略。 | `SoftwareGetUpdatePolicyParams` | `SoftwareUpdatePolicy` | 否 | draft |
| `software.setUpdatePolicy` | command | 设置软件更新策略。 | `SoftwareSetUpdatePolicyParams` | `SoftwareUpdatePolicy` | 是，变化后触发 `software.updatePolicyChanged`。 | draft |

### 3.1 `software.getUpdatePolicy`

#### 请求参数 Params：`SoftwareGetUpdatePolicyParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `targets` | string[] | no | `launcher`, `signagePlayer`, `agent`, `runtime` | all supported | 查询哪些软件对象的策略。 |

#### 返回结果 Result：`SoftwareUpdatePolicy`

字段见 6.2。

### 3.2 `software.setUpdatePolicy`

| 项 | 内容 |
|---|---|
| 目的 | 设置自动更新策略。 |
| 调用类型 | command |
| Params Schema | `SoftwareSetUpdatePolicyParams` |
| Result Schema | `SoftwareUpdatePolicy` |
| 事件触发 | 策略实际变化后触发 `software.updatePolicyChanged`。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `INTERNAL_ERROR` |

#### 请求参数 Params：`SoftwareSetUpdatePolicyParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `policy` | `SoftwareUpdatePolicy` | yes | see schema | none | 要设置的软件更新策略；未出现字段保持不变。 |
| `expectedRevision` | string | no | opaque revision | omitted | 可选乐观锁。 |

#### 返回结果 Result：`SoftwareUpdatePolicy`

字段见 6.2。

## 4. 事件

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `software.updatePolicyChanged` | 策略被用户、设备策略或服务端更新。 | `SoftwareUpdatePolicyChangedEvent` | 刷新更新策略页面；必要时重新读取完整策略。 | draft |

### 4.1 `software.updatePolicyChanged`

#### Payload：`SoftwareUpdatePolicyChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `policy` | `SoftwareUpdatePolicy` | yes | see schema | none | 变化后的策略片段或完整策略。 |
| `changedFields` | string[] | no | field paths | omitted | 变化字段。 |
| `reason` | enum | no | `user_request`, `device_policy`, `server_policy`, `restore_config`, `unknown` | `unknown` | 变化原因。 |

## 5. Capability

Capability name: `software.updatePolicy`。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `software.updatePolicy` | capability 名称。 |
| `supportedTargets` | string[] | yes | `launcher`, `signagePlayer`, `agent`, `runtime` | 支持配置策略的软件对象。 |
| `supportedChannels` | string[] | no | `release`, `beta`, `alpha` | 支持通道。 |
| `supportsAutoUpdateWindow` | boolean | no | `true`, `false` | 是否支持更新窗口。 |

## 6. Schemas

### 6.1 Schema 层级速览

```text
SoftwareUpdatePolicy
  targets
  autoUpdate
  autoUpdateWindow: TimeWindow
  channel
SoftwareUpdatePolicyChangedEvent
  policy: SoftwareUpdatePolicy
```

### 6.2 `SoftwareUpdatePolicy`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `targets` | string[] | yes | `launcher`, `signagePlayer`, `agent`, `runtime` | none | 策略适用目标。 |
| `autoUpdate` | boolean | no | `true`, `false` | omitted | 是否自动更新。 |
| `autoUpdateWindow` | `TimeWindow` | no | see 6.3 | omitted | 自动更新窗口。 |
| `channel` | enum | no | `release`, `beta`, `alpha` | `release` | 更新通道。 |
| `revision` | string | no | opaque revision | omitted | 策略版本。 |

### 6.3 `TimeWindow`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `start` | string | yes | `HH:mm` | none | 本地时间起点。 |
| `end` | string | yes | `HH:mm` | none | 本地时间终点；小于 start 时表示跨日，需采纳前确认。 |
| `timezone` | string | no | IANA timezone | device timezone | 时区。 |

## 7. JSON 示例

### 7.1 设置 Launcher 自动更新策略

```json
{
  "id": 401,
  "method": "software.setUpdatePolicy",
  "params": {
    "policy": {
      "targets": ["launcher"],
      "autoUpdate": true,
      "autoUpdateWindow": {
        "start": "02:00",
        "end": "04:00",
        "timezone": "Asia/Shanghai"
      },
      "channel": "release"
    }
  }
}
```

```json
{
  "id": 401,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "targets": ["launcher"],
    "autoUpdate": true,
    "autoUpdateWindow": {
      "start": "02:00",
      "end": "04:00",
      "timezone": "Asia/Shanghai"
    },
    "channel": "release",
    "revision": "<REVISION>"
  }
}
```

### 7.2 策略变化事件

```json
{
  "event": "software.updatePolicyChanged",
  "intent": 1,
  "data": {
    "reason": "user_request",
    "changedFields": ["autoUpdate", "autoUpdateWindow"],
    "policy": {
      "targets": ["launcher"],
      "autoUpdate": true,
      "autoUpdateWindow": {
        "start": "02:00",
        "end": "04:00",
        "timezone": "Asia/Shanghai"
      }
    }
  }
}
```

## 8. Candidate Errors

| Error | 复用 / 候选 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | target、channel 或 window 不支持。 |
| `INVALID_ARGUMENT` | common | 时间格式、target 或 channel 非法。 |
| `PERMISSION_DENIED` | common | 无权修改更新策略。 |

## 9. Legacy Mapping

| Legacy entry | Direction | AXTP target | 状态 |
|---|---|---|---|
| `GetUpdateConfig` | Server <-> Device | `software.getUpdatePolicy` | `[REVIEW-OK]` |
| `SetUpdateConfig` | Server <-> Device | `software.setUpdatePolicy` | `[REVIEW-OK]` |

## 10. Registry / Conformance Status

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method / event IDs | `TBD after adoption` |
| Conformance | 需覆盖 get/set、事件、非法 channel、跨日 window。 |

## 11. Test Notes

- `software.setUpdatePolicy(targets=["launcher"])` 后返回最终策略并触发事件。
- 不支持 `beta` / `alpha` 的设备应返回 `NOT_SUPPORTED`。
- 跨日窗口语义在采纳前必须明确。

## 12. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| `autoUpdateWindow.end < start` 是否表示跨日？ | schema / tests | 先按跨日候选处理，采纳前确认。 | `[REVIEW-ASK]` |
| 多 target 是否共享一个策略，还是每个 target 独立策略？ | schema | 先用 `targets` 表示同一策略适用目标。 | `[REVIEW-ASK]` |
| channel 首批是否只允许 `release`？ | capability | capability 声明支持 channel。 | `[REVIEW-ASK]` |

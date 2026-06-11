# AXTP firmware.updatePolicy 协议草案

版本：v0.3

归属域：`firmware`

Capability ID：`firmware.updatePolicy`

适用范围：设备固件更新策略配置，包括更新行为模式、时间调度、更新通道选择和前置条件约束。

---

## 协议审核标记（人工复核）

| 标记 | 条目 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-DRAFT]` | `firmware.updatePolicy` capability | 本文是根据业务需求创建的协议草案，不是最终事实源。 | 产品/架构/研发确认后进入 `adopt-protocol-draft`。 |
| `[REVIEW-ASK]` | legacy 映射 | 旧协议命令 `GetUpdateConfig` / `SetUpdateConfig` 字段和语义仍需确认。 | 采纳前补齐 legacyRefs 或明确 adapter-only。 |
| `[REVIEW-ASK]` | `networkType` 枚举值 | `unmetered` 是否需要在 P0 中支持？部分 IoT 场景可能关心流量计费。 | 采纳前与产品和设备确认。 |
| `[REVIEW-ASK]` | `deferral` P1 时机 | 延期与紧急覆盖策略何时纳入？ | 采纳前与产品和设备确认业务优先级。 |

---

## 1. 文档定位

`firmware.updatePolicy` 定义：设备固件更新策略配置，包括更新行为模式、时间调度、更新通道选择和前置条件约束。

本文只描述 `firmware.updatePolicy` 这一项 capability。稳定事实必须写入 `registry/domains/firmware/domain.yaml` 或相关 registry YAML，再由 Generator 生成 `protocol/axtp.protocol.yaml` 与 `docs/generated/*`。

**v0.3 变更说明：** 将原来的 3 个扁平字段（`autoUpdate` 布尔值、`autoUpdateWindow` 单一时间窗口、`channel` 枚举）重新设计为结构化行为策略：`updateMode`（更新行为模式）+ `schedule`（时间调度，支持多窗口、星期、时区）+ `channel`（更新通道，`release` 重命名为 `stable`）+ `conditions`（前置条件约束）+ `deferral`（P1 预留延期策略）。`setUpdatePolicyConfig` 改为部分更新语义。

---

## 2. 业务需求

| 项 | 内容 |
|---|---|
| 需求来源 | NearHub Launcher 数字标牌设备管理 — 更新设置 |
| 目标用户 | 运维人员（通过云端管理控制台）、设备固件 |
| 目标行为 | 运维人员通过云端管理控制台设置设备更新行为模式、时间调度、更新通道和前置条件；设备读取并应用更新策略配置。 |
| 当前实现程度 | Drafted only — 无已有 registry/generated 事实 |

### 覆盖场景

| 场景 | 典型配置 | 说明 |
|---|---|---|
| 数字标牌生产设备 | `updateMode=auto_install` + `schedule`（凌晨窗口）+ `conditions.requireIdle=true` | 全自动安装，限定在凌晨维护窗口，设备空闲时执行 |
| 消费类设备 | `updateMode=notify` | 通知用户有可用更新，用户决定是否安装 |
| 带宽受限设备 | `updateMode=auto_download` + `conditions.networkType=wifi` | 自动下载但手动安装，仅 WiFi 下下载 |
| 开发/测试设备 | `updateMode=manual` + `channel=beta` | 手动触发，使用测试通道 |
| 跨时区部署 | `schedule.timezone=America/New_York` + 多窗口 | 设备部署在不同时区，显式指定时区 |

---

## 3. 域边界

| 项 | 决策 |
|---|---|
| Domain | `firmware` |
| Feature | `firmware.updatePolicy` |
| Capability | `firmware.updatePolicy` |
| 不属于本文 | 固件升级执行（`firmware.update`）、固件版本查询（`firmware.info`）、设备基础信息（`device.info`）、系统生命周期（`system.lifecycle`） |

`firmware.updatePolicy` 定义"什么时候、在什么条件下、用哪个通道去更新"。`firmware.update` 定义"更新过程怎么执行"。`firmware.updatePolicy` 的 `schedule` 和 `conditions` 由设备在自动更新时自行检查，是设备侧策略，不进入 `firmware.beginUpdate` 的调用参数。

---

## 4. 协议决策

| 决策点 | 结论 | 理由 |
|---|---|---|
| 新增/修改/复用 | Modify | 扩展现有草案，重新设计 schema 结构。 |
| P0 范围 | `updateMode` + `schedule` + `channel` + `conditions` | 核心行为、调度、通道和前置条件覆盖主要场景。 |
| P1 预留 | `deferral`（延期与紧急策略） | 延期策略是高级场景，P0 不阻塞。 |
| `updateMode` 替代 `autoUpdate` | `autoUpdate` 布尔值升级为 4 值枚举 | 布尔只能表达开/关，无法覆盖"仅下载"、"仅通知"等中间状态。 |
| `schedule` 替代 `autoUpdateWindow` | 多窗口 + 星期 + 时区 | 与 `system.lifecycle` 的 days 模式对齐；支持多窗口和跨时区部署。 |
| `channel.release` → `channel.stable` | 重命名 | 匹配行业惯例（Chrome/Firefox/Rust）；legacy adapter 负责映射。 |
| `setUpdatePolicyConfig` 语义 | 部分更新（partial update） | 避免 read-modify-write，客户端只传需要修改的字段。 |
| `resetUpdatePolicyConfig` 响应 | 返回重置后完整 `UpdatePolicyConfig` | 省 round-trip，避免再调一次 get。 |
| 跨午夜窗口 | `start > end` 表示跨午夜 | 显式规则，无需额外字段。 |
| 控制面 | RPC method/event | 业务控制不进入 Frame Header。 |
| 数据面 | None | 更新策略是配置同步操作，不涉及连续数据传输。 |
| WebSocket | RPC-only | WebSocket Unframed JSON 不承载 STREAM。 |

---

## 5. 候选 Capability

| Capability | 状态 | 说明 |
|---|---|---|
| `firmware.updatePolicy` | draft | 设备固件更新策略配置（行为模式、时间调度、通道、前置条件）。 |

---

## 6. 候选 Methods

| Method | Params Schema | Result Schema | 方向 | 说明 | Review |
|---|---|---|---|---|---|
| `firmware.getUpdatePolicyConfig` | `GetUpdatePolicyConfigParams` | `UpdatePolicyConfig` | 双向 | 查询当前更新策略配置。 | [REVIEW-DRAFT] |
| `firmware.setUpdatePolicyConfig` | `SetUpdatePolicyConfigParams` | `SetUpdatePolicyConfigResult` | Server → Device | 部分更新策略配置。返回更新后完整配置。 | [REVIEW-DRAFT] |
| `firmware.resetUpdatePolicyConfig` | `ResetUpdatePolicyConfigParams` | `UpdatePolicyConfig` | Server → Device | 恢复默认更新策略配置。返回重置后完整配置。 | [REVIEW-DRAFT] |

---

## 7. 候选 Events

| Event | Schema | 触发时机 | Review |
|---|---|---|---|
| `firmware.updatePolicyConfigChanged` | `UpdatePolicyConfigChangedEvent` | 更新策略配置发生变更时发出。 | [REVIEW-DRAFT] |

---

## 8. 候选 Schemas

### `UpdatePolicyConfig`

| Field | Type | Required | Default | 分级 | 说明 | Review |
|---|---|---:|---|---|---|---|
| `updateMode` | `enum<manual, notify, auto_download, auto_install>` | yes | `auto_install` | P0 | 更新行为模式。 | [REVIEW-DRAFT] |
| `schedule` | `UpdateSchedule` | no | null (任意时间) | P0 | 更新时间调度。无 schedule 时 `auto_install` 模式下设备任意时间更新。 | [REVIEW-DRAFT] |
| `channel` | `enum<stable, beta, alpha>` | yes | `stable` | P0 | 更新通道。`stable` 为正式版，`beta` 为测试版，`alpha` 为内测版。 | [REVIEW-DRAFT] |
| `conditions` | `UpdateConditions` | no | null (无条件) | P0 | 更新前置条件。仅在 `auto_download` / `auto_install` 模式下生效。 | [REVIEW-DRAFT] |
| `deferral` | `UpdateDeferral` | no | null | P1 | 延期与紧急策略。 | [REVIEW-DRAFT] |

### `updateMode` 枚举说明

| 值 | 含义 | 典型场景 |
|---|---|---|
| `manual` | 用户手动触发下载和安装。 | 开发设备、受控环境。 |
| `notify` | 通知用户有可用更新，用户决定。 | 消费类设备。 |
| `auto_download` | 自动下载，等待用户手动安装。 | 带宽受限、用户控制安装时机。 |
| `auto_install` | 自动下载并在 `schedule` 窗口内安装。 | 数字标牌、IoT 设备。 |

### `UpdateSchedule`

| Field | Type | Required | Default | 说明 | Review |
|---|---|---:|---|---|---|
| `timezone` | `string` (IANA) | no | 设备本地时区 | 时区标识，如 `"Asia/Shanghai"`。跨时区部署场景必须显式指定。 | [REVIEW-DRAFT] |
| `windows` | `ScheduleWindow[]` | yes | — | 更新时间窗口数组，至少一个。设备在**任一**窗口内可执行更新。 | [REVIEW-DRAFT] |

### `ScheduleWindow`

| Field | Type | Required | Default | 说明 | Review |
|---|---|---:|---|---|---|
| `start` | `string` (HH:mm) | yes | — | 窗口开始时间。 | [REVIEW-DRAFT] |
| `end` | `string` (HH:mm) | yes | — | 窗口结束时间。`start > end`（如 `"23:00"` 到 `"03:00"`）表示跨午夜窗口。 | [REVIEW-DRAFT] |
| `days` | `string[]` | no | null (每天) | 星期限制，值为 `mon` / `tue` / `wed` / `thu` / `fri` / `sat` / `sun`，复用 `system.lifecycle` 已建立的 `daysOfWeek` 模式。 | [REVIEW-DRAFT] |

### `UpdateConditions`

| Field | Type | Required | Default | 说明 | Review |
|---|---|---:|---|---|---|
| `requireIdle` | `boolean` | no | false | 设备空闲时才更新。 | [REVIEW-DRAFT] |
| `minFreeStorageBytes` | `uint64` | no | null (不限制) | 最小可用存储字节数。 | [REVIEW-DRAFT] |
| `networkType` | `enum<any, wifi, ethernet, unmetered>` | no | `any` | 网络类型要求。`unmetered` 表示不计费网络。 | [REVIEW-ASK] |

`conditions` 规则：

1. 仅在 `auto_download` / `auto_install` 模式下生效。
2. 条件不满足时设备应等待，不报错。
3. 默认值保证"不设条件也能正常工作"。

### `UpdateDeferral`（P1 预留）

| Field | Type | Required | Default | 说明 | Review |
|---|---|---|---:|---|---|
| `maxDeferralHours` | `uint32` | no | 0 (不可延期) | 普通更新到达后最大延期小时数，到期后无论 schedule 都开始更新。 | [REVIEW-DRAFT] |
| `criticalOverride` | `boolean` | no | true | 紧急更新是否忽略 `schedule` 和 `conditions`。"紧急"标记由云端/服务端在推送更新时声明。 | [REVIEW-DRAFT] |

### `GetUpdatePolicyConfigParams`

空参数。

### `SetUpdatePolicyConfigParams`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `updateMode` | `enum` | no | 更新行为模式。不传则保持不变。 | [REVIEW-DRAFT] |
| `schedule` | `UpdateSchedule` / null | no | 更新时间调度。传 null 清除 schedule。不传则保持不变。 | [REVIEW-DRAFT] |
| `channel` | `enum` | no | 更新通道。不传则保持不变。 | [REVIEW-DRAFT] |
| `conditions` | `UpdateConditions` / null | no | 更新前置条件。传 null 清除 conditions。不传则保持不变。 | [REVIEW-DRAFT] |
| `deferral` | `UpdateDeferral` / null | no | 延期策略（P1）。传 null 清除 deferral。不传则保持不变。 | [REVIEW-DRAFT] |

部分更新规则：

1. 所有字段可选，只传需要修改的部分。
2. 未传字段保持当前值不变。
3. 传 `null` 显式清除 schedule / conditions / deferral。
4. `schedule` 的 `windows[]` 是全量替换，不是追加。

### `SetUpdatePolicyConfigResult`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `applied` | `UpdatePolicyConfig` | yes | 更新后的完整配置，确认实际生效值。 | [REVIEW-DRAFT] |

### `ResetUpdatePolicyConfigParams`

空参数。恢复为设备出厂默认策略。

### `UpdatePolicyConfigChangedEvent`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `applied` | `UpdatePolicyConfig` | yes | 变更后的完整配置。 | [REVIEW-DRAFT] |

---

## 9. JSON 示例

示例用于评审 request/response/event 语义，不是 generated 事实源。JSON 示例只写 RPC `d` 数据块，不包裹外层 `sid` / `op` / `d` wire envelope。

### 场景 1：查询当前策略（数字标牌 — 自动安装 + 工作日凌晨窗口）

`firmware.getUpdatePolicyConfig` request

```json
{
  "id": 1,
  "method": "firmware.getUpdatePolicyConfig",
  "params": {}
}
```

`firmware.getUpdatePolicyConfig` response

```json
{
  "id": 1,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "updateMode": "auto_install",
    "schedule": {
      "timezone": "Asia/Shanghai",
      "windows": [
        {
          "start": "02:00",
          "end": "06:00",
          "days": ["mon", "tue", "wed", "thu", "fri"]
        }
      ]
    },
    "channel": "stable",
    "conditions": {
      "requireIdle": true,
      "networkType": "any"
    }
  }
}
```

### 场景 2：部分更新 — 增加 WiFi 条件 + 增加午间窗口

`firmware.setUpdatePolicyConfig` request

```json
{
  "id": 2,
  "method": "firmware.setUpdatePolicyConfig",
  "params": {
    "schedule": {
      "timezone": "Asia/Shanghai",
      "windows": [
        {
          "start": "02:00",
          "end": "06:00",
          "days": ["mon", "tue", "wed", "thu", "fri"]
        },
        {
          "start": "12:00",
          "end": "13:30",
          "days": ["sat", "sun"]
        }
      ]
    },
    "conditions": {
      "requireIdle": true,
      "networkType": "wifi"
    }
  }
}
```

`firmware.setUpdatePolicyConfig` response

```json
{
  "id": 2,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "applied": {
      "updateMode": "auto_install",
      "schedule": {
        "timezone": "Asia/Shanghai",
        "windows": [
          {
            "start": "02:00",
            "end": "06:00",
            "days": ["mon", "tue", "wed", "thu", "fri"]
          },
          {
            "start": "12:00",
            "end": "13:30",
            "days": ["sat", "sun"]
          }
        ]
      },
      "channel": "stable",
      "conditions": {
        "requireIdle": true,
        "networkType": "wifi"
      }
    }
  }
}
```

### 场景 3：切换为仅通知模式

`firmware.setUpdatePolicyConfig` request

```json
{
  "id": 3,
  "method": "firmware.setUpdatePolicyConfig",
  "params": {
    "updateMode": "notify"
  }
}
```

`firmware.setUpdatePolicyConfig` response

```json
{
  "id": 3,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "applied": {
      "updateMode": "notify",
      "schedule": {
        "timezone": "Asia/Shanghai",
        "windows": [
          {
            "start": "02:00",
            "end": "06:00",
            "days": ["mon", "tue", "wed", "thu", "fri"]
          },
          {
            "start": "12:00",
            "end": "13:30",
            "days": ["sat", "sun"]
          }
        ]
      },
      "channel": "stable",
      "conditions": {
        "requireIdle": true,
        "networkType": "wifi"
      }
    }
  }
}
```

### 场景 4：重置为默认策略

`firmware.resetUpdatePolicyConfig` request

```json
{
  "id": 4,
  "method": "firmware.resetUpdatePolicyConfig",
  "params": {}
}
```

`firmware.resetUpdatePolicyConfig` response

```json
{
  "id": 4,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "updateMode": "auto_install",
    "channel": "stable"
  }
}
```

### 场景 5：配置变更事件

```json
{
  "event": "firmware.updatePolicyConfigChanged",
  "intent": 1,
  "data": {
    "applied": {
      "updateMode": "auto_install",
      "schedule": {
        "timezone": "Asia/Shanghai",
        "windows": [
          {
            "start": "02:00",
            "end": "06:00",
            "days": ["mon", "tue", "wed", "thu", "fri"]
          }
        ]
      },
      "channel": "stable",
      "conditions": {
        "requireIdle": true,
        "networkType": "any"
      }
    }
  }
}
```

### 场景 6：跨午夜窗口

`firmware.setUpdatePolicyConfig` request

```json
{
  "id": 5,
  "method": "firmware.setUpdatePolicyConfig",
  "params": {
    "schedule": {
      "timezone": "America/New_York",
      "windows": [
        {
          "start": "23:00",
          "end": "03:00",
          "days": ["sat"]
        }
      ]
    }
  }
}
```

`firmware.setUpdatePolicyConfig` response

```json
{
  "id": 5,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "applied": {
      "updateMode": "auto_install",
      "schedule": {
        "timezone": "America/New_York",
        "windows": [
          {
            "start": "23:00",
            "end": "03:00",
            "days": ["sat"]
          }
        ]
      },
      "channel": "stable"
    }
  }
}
```

### failure response（参数无效）

```json
{
  "id": 2,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Invalid argument.",
    "details": {
      "candidateError": "FIRMWARE_UPDATE_POLICY_PARAM_INVALID"
    }
  }
}
```

---

## 10. 候选 Errors

| Error | 类别 | 说明 | Review |
|---|---|---|---|
| `FIRMWARE_UPDATE_POLICY_PARAM_INVALID` | business | 更新策略参数无效（如 `channel` 枚举值不合法、时间格式错误、`updateMode` 值非法）。 | [REVIEW-DRAFT] |
| `FIRMWARE_UPDATE_POLICY_WINDOW_INVALID` | business | 更新时间窗口无效（如 `start = end`、时间格式不合法）。 | [REVIEW-DRAFT] |

---

## 11. Legacy 映射

| 来源 | 旧协议条目 | 候选映射 | 状态 | 说明 |
|---|---|---|---|---|
| NearHub Launcher Signage | `GetUpdateConfig` | `firmware.getUpdatePolicyConfig` | [REVIEW-DRAFT] | 字段映射见下方映射表。方向双向。旧指令状态为"已研发"。 |
| NearHub Launcher Signage | `SetUpdateConfig` | `firmware.setUpdatePolicyConfig` | [REVIEW-DRAFT] | 字段映射见下方映射表。方向 Server → Device。旧指令状态为"已研发"。 |

### 字段级映射

| Legacy 字段 | 新 Schema 路径 | 转换规则 |
|---|---|---|
| `autoUpdate: true` | `updateMode: "auto_install"` | 布尔 → 枚举 |
| `autoUpdate: false` | `updateMode: "manual"` | 布尔 → 枚举 |
| `autoUpdateWindow.start` | `schedule.windows[0].start` | 结构提升 |
| `autoUpdateWindow.end` | `schedule.windows[0].end` | 结构提升 |
| `channel: "release"` | `channel: "stable"` | 名称变更 |
| `channel: "beta"` | `channel: "beta"` | 无变化 |
| `channel: "alpha"` | `channel: "alpha"` | 无变化 |

---

## 12. Registry 草案输入

采纳本文后，domain YAML 至少应包含：

```yaml
capabilities:
  - name: firmware.updatePolicy
    status: draft

methods:
  - name: firmware.getUpdatePolicyConfig
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: GetUpdatePolicyConfigParams
    responseSchema: UpdatePolicyConfig
    capabilities:
      - firmware.updatePolicy
  - name: firmware.setUpdatePolicyConfig
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: SetUpdatePolicyConfigParams
    responseSchema: SetUpdatePolicyConfigResult
    capabilities:
      - firmware.updatePolicy
  - name: firmware.resetUpdatePolicyConfig
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: ResetUpdatePolicyConfigParams
    responseSchema: UpdatePolicyConfig
    capabilities:
      - firmware.updatePolicy

events:
  - name: firmware.updatePolicyConfigChanged
    id: TBD after adoption
    schema: UpdatePolicyConfigChangedEvent
    capabilities:
      - firmware.updatePolicy
```

---

## 13. 采纳检查清单

- [ ] 08 已确认 domain.feature 粒度和 method/event 命名。
- [ ] 09 已确认 Domain/ID 规划和生成链路。
- [ ] 10 已确认 methodId、bitOffset、request/response schema。
- [ ] 11 已确认 eventId、eventMasks bitOffset、event schema。
- [ ] 12 已确认 errorCode 范围和错误归属。
- [ ] 13 已确认 schema fieldId、capabilityId、supportedMethods。
- [ ] YAML 写入后 Generator 能完整生成 `protocol/axtp.protocol.yaml` 和 `docs/generated/*`。

---

## 14. 待确认问题

1. `[REVIEW-ASK]` `conditions.networkType` 枚举值 `unmetered` 是否需要在 P0 中支持？部分 IoT 场景可能关心流量计费。
2. `[REVIEW-ASK]` `deferral`（延期与紧急策略）P1 何时纳入？延期和紧急覆盖策略的业务优先级待确认。
3. `[REVIEW-ASK]` 跨午夜窗口 `start > end` 的语义是否需要显式文档到 specs？当前仅在草案中说明，设备实现可能理解不一致。

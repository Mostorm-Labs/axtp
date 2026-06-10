# AXTP firmware.updatePolicy 协议草案

版本：v0.2

归属域：`firmware`

Capability ID：`firmware.updatePolicy`

适用范围：设备固件自动更新策略配置，包括自动更新开关、更新时间窗口和更新通道。

---

## 协议审核标记（人工复核）

| 标记 | 条目 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-DRAFT]` | `firmware.updatePolicy` capability | 本文是根据业务需求创建的协议草案，不是最终事实源。 | 产品/架构/研发确认后进入 `adopt-protocol-draft`。 |
| `[REVIEW-ASK]` | legacy 映射 | 旧协议命令 `GetUpdateConfig` / `SetUpdateConfig` 字段和语义仍需确认。 | 采纳前补齐 legacyRefs 或明确 adapter-only。 |
| `[REVIEW-ASK]` | 跨日窗口 | `autoUpdateWindow.start > end` 时（如 `"23:00"` 到 `"03:00"`）是否表示跨午夜窗口？ | 采纳前与产品和设备确认。 |
| `[REVIEW-ASK]` | channel 枚举 | 当前枚举值 `release` / `beta` / `alpha` 是否完整？是否需要 `nightly` / `canary` 等？ | 采纳前与产品和设备确认。 |

---

## 1. 文档定位

`firmware.updatePolicy` 定义：设备固件自动更新策略配置，包括自动更新开关、更新时间窗口和更新通道选择。

本文只描述 `firmware.updatePolicy` 这一项 capability。稳定事实必须写入 `registry/domains/firmware/domain.yaml` 或相关 registry YAML，再由 Generator 生成 `protocol/axtp.protocol.yaml` 与 `docs/generated/*`。

**v0.2 变更说明：** 补充完整业务需求、域边界、协议决策、候选方法/事件/Schema、JSON 示例、候选 Errors、Legacy 映射和 Registry 草案输入。

---

## 2. 业务需求

| 项 | 内容 |
|---|---|
| 需求来源 | NearHub Launcher 数字标牌设备管理 — 更新设置 |
| 目标用户 | 运维人员（通过云端管理控制台）、设备固件 |
| 目标行为 | 运维人员通过云端管理控制台设置设备自动更新开关、更新时间窗口和更新通道；设备读取并应用更新策略配置。 |
| 当前实现程度 | Drafted only — 无已有 registry/generated 事实 |

---

## 3. 域边界

| 项 | 决策 |
|---|---|
| Domain | `firmware` |
| Feature | `firmware.updatePolicy` |
| Capability | `firmware.updatePolicy` |
| 不属于本文 | 固件升级执行（`firmware.update`）、固件版本查询（`firmware.version`）、设备基础信息（`device.info`）、系统生命周期（`system.lifecycle`） |

---

## 4. 协议决策

| 决策点 | 结论 | 理由 |
|---|---|---|
| 新增/修改/复用 | Modify | 扩展现有 v0.1 空壳草案，补充完整 schema 和示例。 |
| 控制面 | RPC method/event | 业务控制不进入 Frame Header。 |
| 数据面 | None | 更新策略是配置同步操作，不涉及连续数据传输。 |
| WebSocket | RPC-only | WebSocket Unframed JSON 不承载 STREAM。 |

---

## 5. 候选 Capability

| Capability | 状态 | 说明 |
|---|---|---|
| `firmware.updatePolicy` | draft | 设备固件自动更新策略配置（开关、时间窗口、通道）。 |

---

## 6. 候选 Methods

| Method | Params Schema | Result Schema | 方向 | 说明 | Review |
|---|---|---|---|---|---|
| `firmware.getUpdatePolicyConfig` | `GetUpdatePolicyConfigParams` | `UpdatePolicyConfig` | 双向 | 查询当前更新策略配置。 | [REVIEW-DRAFT] |
| `firmware.setUpdatePolicyConfig` | `SetUpdatePolicyConfigParams` | `SetUpdatePolicyConfigResult` | Server → Device | 设置更新策略配置。 | [REVIEW-DRAFT] |
| `firmware.resetUpdatePolicyConfig` | `ResetUpdatePolicyConfigParams` | `SetUpdatePolicyConfigResult` | Server → Device | 恢复默认更新策略配置。 | [REVIEW-DRAFT] |

---

## 7. 候选 Events

| Event | Schema | 触发时机 | Review |
|---|---|---|---|
| `firmware.updatePolicyConfigChanged` | `UpdatePolicyConfigChangedEvent` | 更新策略配置发生变更时发出。 | [REVIEW-DRAFT] |

---

## 8. 候选 Schemas

### `UpdatePolicyConfig`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `autoUpdate` | `boolean` | yes | 自动更新开关。默认 `true`。 | [REVIEW-DRAFT] |
| `autoUpdateWindow` | `AutoUpdateWindow` | yes | 自动更新时间窗口。 | [REVIEW-DRAFT] |
| `channel` | `enum<release, beta, alpha>` | yes | 更新通道。`release` 为正式版，`beta` 为测试版，`alpha` 为内测版。默认 `release`。 | [REVIEW-ASK] |

### `AutoUpdateWindow`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `start` | `string` | yes | 窗口开始时间（`HH:mm` 格式）。默认 `"02:00"`。 | [REVIEW-DRAFT] |
| `end` | `string` | yes | 窗口结束时间（`HH:mm` 格式）。默认 `"06:00"`。 | [REVIEW-ASK] |

### `SetUpdatePolicyConfigParams`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `autoUpdate` | `boolean` | yes | 自动更新开关。 | [REVIEW-DRAFT] |
| `autoUpdateWindow` | `AutoUpdateWindow` | yes | 自动更新时间窗口。 | [REVIEW-DRAFT] |
| `channel` | `enum<release, beta, alpha>` | yes | 更新通道。 | [REVIEW-DRAFT] |

### `SetUpdatePolicyConfigResult`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `ok` | `boolean` | yes | 操作成功标识。 | [REVIEW-DRAFT] |

### `UpdatePolicyConfigChangedEvent`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `autoUpdate` | `boolean` | yes | 变更后的自动更新开关。 | [REVIEW-DRAFT] |
| `autoUpdateWindow` | `AutoUpdateWindow` | yes | 变更后的自动更新时间窗口。 | [REVIEW-DRAFT] |
| `channel` | `enum<release, beta, alpha>` | yes | 变更后的更新通道。 | [REVIEW-DRAFT] |

---

## 9. JSON 示例

示例用于评审 request/response/event 语义，不是 generated 事实源。JSON 示例只写 RPC `d` 数据块，不包裹外层 `sid` / `op` / `d` wire envelope。

### `firmware.getUpdatePolicyConfig` request

```json
{
  "id": 1,
  "method": "firmware.getUpdatePolicyConfig",
  "params": {}
}
```

### `firmware.getUpdatePolicyConfig` response

```json
{
  "id": 1,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "autoUpdate": true,
    "autoUpdateWindow": {
      "start": "02:00",
      "end": "06:00"
    },
    "channel": "release"
  }
}
```

### `firmware.setUpdatePolicyConfig` request

```json
{
  "id": 2,
  "method": "firmware.setUpdatePolicyConfig",
  "params": {
    "autoUpdate": true,
    "autoUpdateWindow": {
      "start": "03:00",
      "end": "05:00"
    },
    "channel": "beta"
  }
}
```

### `firmware.setUpdatePolicyConfig` response

```json
{
  "id": 2,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "ok": true
  }
}
```

### `firmware.resetUpdatePolicyConfig` request

```json
{
  "id": 3,
  "method": "firmware.resetUpdatePolicyConfig",
  "params": {}
}
```

### `firmware.resetUpdatePolicyConfig` response

```json
{
  "id": 3,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "ok": true
  }
}
```

### `firmware.updatePolicyConfigChanged` event

```json
{
  "event": "firmware.updatePolicyConfigChanged",
  "intent": 1,
  "data": {
    "autoUpdate": true,
    "autoUpdateWindow": {
      "start": "03:00",
      "end": "05:00"
    },
    "channel": "beta"
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
| `FIRMWARE_UPDATE_POLICY_PARAM_INVALID` | business | 更新策略参数无效（如 `channel` 枚举值不合法、时间格式错误）。 | [REVIEW-DRAFT] |
| `FIRMWARE_UPDATE_POLICY_WINDOW_INVALID` | business | 更新时间窗口无效（如 `start >= end`，且不表示跨午夜窗口）。 | [REVIEW-ASK] |

---

## 11. Legacy 待映射

| 来源 | 旧协议条目 | 候选映射 | 状态 | 说明 |
|---|---|---|---|---|
| NearHub Launcher Signage | `GetUpdateConfig` | `firmware.getUpdatePolicyConfig` | [REVIEW-DRAFT] | 字段 autoUpdate/autoUpdateWindow/channel 一致。方向双向。旧指令状态为"已研发"。 |
| NearHub Launcher Signage | `SetUpdateConfig` | `firmware.setUpdatePolicyConfig` | [REVIEW-DRAFT] | 字段 autoUpdate/autoUpdateWindow/channel 一致。方向 Server → Device, Device → Server。旧指令状态为"已研发"。 |

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
    responseSchema: SetUpdatePolicyConfigResult
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

1. `[REVIEW-ASK]` 跨日窗口语义：`autoUpdateWindow.start > end`（如 `"23:00"` 到 `"03:00"`）时是否表示窗口跨午夜？还是要求 `start < end`？
2. `[REVIEW-ASK]` 更新通道 `channel` 枚举值 `release` / `beta` / `alpha` 是否完整？是否需要 `nightly` / `canary` 等？

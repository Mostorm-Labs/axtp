# AXTP device.appearance 协议草案

版本：v0.1

归属域：`device`

Capability ID：`device.appearance`

适用范围：设备外观配置，包括面板布局模式、自动隐藏面板和自动隐藏延迟时间。

---

## 协议审核标记（人工复核）

| 标记 | 条目 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-DRAFT]` | `device.appearance` capability | 本文是按 Naming and Taxonomy spec 创建的单 feature 治理草案。 | 人工确认业务语义、schema 和 legacyRefs 后进入 `registry/domains/device/domain.yaml`。 |
| `[REVIEW-ASK]` | legacy 映射 | 旧协议命令 `GetAppearanceConfig` / `SetAppearanceConfig` 字段和语义仍需确认。 | 采纳前补齐 legacyRefs 或明确 adapter-only。 |

---

## 1. 文档定位

`device.appearance` 定义：设备外观配置，包括面板布局模式（聚焦/侧边栏）、自动隐藏面板开关和自动隐藏延迟时间。

本文只描述 `device.appearance` 这一项 capability。稳定事实必须写入 `registry/domains/device/domain.yaml` 或相关 registry YAML，再由 Generator 生成 `protocol/axtp.protocol.yaml` 与 `docs/generated/*`。

**域定域说明：** 外观/面板配置是设备级 UI 行为（面板布局、自动隐藏），非 signage 专属。之前归类为 `signage.osd` 已重新定域为 `device.appearance`。`[REVIEW-RESOLVED]`

---

## 2. 业务需求

| 项 | 内容 |
|---|---|
| 需求来源 | NearHub Launcher 数字标牌设备管理 — 外观设置 |
| 目标用户 | 运维人员（通过云端管理控制台）、设备固件 |
| 目标行为 | 运维人员通过云端管理控制台设置设备面板布局模式和自动隐藏行为；设备读取并应用外观配置。 |
| 当前实现程度 | Drafted only — 无已有 registry/generated 事实 |

---

## 3. 域边界

| 项 | 决策 |
|---|---|
| Domain | `device` |
| Feature | `device.appearance` |
| Capability | `device.appearance` |
| 不属于本文 | 播放列表内容（`signage.playlist`）、显示硬件输出（`display.*`）、系统状态（`system.state`） |

---

## 4. 协议决策

| 决策点 | 结论 | 理由 |
|---|---|---|
| 新增/修改/复用 | Create | 无已有 capability 覆盖设备外观配置语义。 |
| 控制面 | RPC method/event | 业务控制不进入 Frame Header。 |
| 数据面 | None | 外观配置是控制面操作，不涉及连续数据传输。 |
| WebSocket | RPC-only | WebSocket Unframed JSON 不承载 STREAM。 |

---

## 5. 候选 Capability

| Capability | 状态 | 说明 |
|---|---|---|
| `device.appearance` | draft | 设备面板布局和自动隐藏配置。 |

---

## 6. 候选 Methods

| Method | Params Schema | Result Schema | 说明 | Review |
|---|---|---|---|---|
| `device.getAppearanceCapabilities` | `AppearanceCapabilitiesParams` | `AppearanceCapabilitiesResult` | 查询 `device.appearance` 能力范围。 | [REVIEW-DRAFT] |
| `device.getAppearanceConfig` | `GetAppearanceConfigParams` | `AppearanceConfig` | 查询当前外观配置。 | [REVIEW-DRAFT] |
| `device.setAppearanceConfig` | `SetAppearanceConfigParams` | `SetAppearanceConfigResult` | 设置外观配置。 | [REVIEW-DRAFT] |
| `device.resetAppearanceConfig` | `ResetAppearanceConfigParams` | `SetAppearanceConfigResult` | 恢复默认外观配置。 | [REVIEW-DRAFT] |

---

## 7. 候选 Events

| Event | Schema | 触发时机 | Review |
|---|---|---|---|
| `device.appearanceConfigChanged` | `AppearanceConfigChangedEvent` | 外观配置发生变更时发出。 | [REVIEW-DRAFT] |

---

## 8. 候选 Schemas

### `AppearanceConfig`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `panelLayout` | `enum<focus, sidebar>` | yes | 面板布局模式。`focus` 为聚焦模式，`sidebar` 为侧边栏模式。默认 `sidebar`。 | [REVIEW-DRAFT] |
| `autoHidePanel` | `boolean` | yes | 自动隐藏面板开关。默认 `false`。 | [REVIEW-DRAFT] |
| `autoHideDelay` | `uint32` | yes | 自动隐藏延迟时间（秒）。`> 0`。默认 `5`。 | [REVIEW-DRAFT] |

### `SetAppearanceConfigParams`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `panelLayout` | `enum<focus, sidebar>` | yes | 面板布局模式。 | [REVIEW-DRAFT] |
| `autoHidePanel` | `boolean` | yes | 自动隐藏面板开关。 | [REVIEW-DRAFT] |
| `autoHideDelay` | `uint32` | yes | 自动隐藏延迟时间（秒）。`> 0`。 | [REVIEW-DRAFT] |

### `SetAppearanceConfigResult`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `ok` | `boolean` | yes | 操作成功标识。 | [REVIEW-DRAFT] |

### `AppearanceConfigChangedEvent`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `panelLayout` | `enum<focus, sidebar>` | yes | 变更后的面板布局模式。 | [REVIEW-DRAFT] |
| `autoHidePanel` | `boolean` | yes | 变更后的自动隐藏面板开关。 | [REVIEW-DRAFT] |
| `autoHideDelay` | `uint32` | yes | 变更后的自动隐藏延迟时间。 | [REVIEW-DRAFT] |

---

## 9. JSON 示例

示例用于评审 request/response/event 语义，不是 generated 事实源。JSON 示例只写 RPC `d` 数据块，不包裹外层 `sid` / `op` / `d` wire envelope。

### `device.getAppearanceConfig` response

```json
{
  "id": 1,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "panelLayout": "sidebar",
    "autoHidePanel": false,
    "autoHideDelay": 5
  }
}
```

### `device.setAppearanceConfig` request

```json
{
  "id": 2,
  "method": "device.setAppearanceConfig",
  "params": {
    "panelLayout": "focus",
    "autoHidePanel": true,
    "autoHideDelay": 10
  }
}
```

### `device.setAppearanceConfig` response

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

### `device.appearanceConfigChanged` event

```json
{
  "event": "device.appearanceConfigChanged",
  "intent": 1,
  "data": {
    "panelLayout": "focus",
    "autoHidePanel": true,
    "autoHideDelay": 10
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
      "candidateError": "DEVICE_APPEARANCE_PARAM_INVALID"
    }
  }
}
```

---

## 10. 候选 Errors

| Error | 类别 | 说明 | Review |
|---|---|---|---|
| `DEVICE_APPEARANCE_PARAM_INVALID` | business | 外观配置参数无效（如 autoHideDelay ≤ 0 或 panelLayout 枚举值不合法）。 | [REVIEW-DRAFT] |

---

## 11. Legacy 待映射

| 来源 | 旧协议条目 | 候选映射 | 状态 | 说明 |
|---|---|---|---|---|
| NearHub Launcher Signage | `GetAppearanceConfig` | `device.getAppearanceConfig` | [REVIEW-DRAFT] | 字段 panelLayout/autoHidePanel/autoHideDelay 一致。旧指令状态为"已研发"。 |
| NearHub Launcher Signage | `SetAppearanceConfig` | `device.setAppearanceConfig` | [REVIEW-DRAFT] | 字段 panelLayout/autoHidePanel/autoHideDelay 一致。旧指令状态为"已研发"。 |

---

## 12. Registry 草案输入

采纳本文后，domain YAML 至少应包含：

```yaml
capabilities:
  - name: device.appearance
    status: draft

methods:
  - name: device.getAppearanceCapabilities
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: AppearanceCapabilitiesParams
    responseSchema: AppearanceCapabilitiesResult
    capabilities:
      - device.appearance
  - name: device.getAppearanceConfig
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: GetAppearanceConfigParams
    responseSchema: AppearanceConfig
    capabilities:
      - device.appearance
  - name: device.setAppearanceConfig
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: SetAppearanceConfigParams
    responseSchema: SetAppearanceConfigResult
    capabilities:
      - device.appearance
  - name: device.resetAppearanceConfig
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: ResetAppearanceConfigParams
    responseSchema: SetAppearanceConfigResult
    capabilities:
      - device.appearance

events:
  - name: device.appearanceConfigChanged
    id: TBD after adoption
    schema: AppearanceConfigChangedEvent
    capabilities:
      - device.appearance
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

1. `[REVIEW-ASK]` `panelLayout` 枚举未来是否需要扩展（如 `fullscreen`、`floating`）？
2. `[REVIEW-ASK]` `autoHideDelay` 的合理范围上限是多少？

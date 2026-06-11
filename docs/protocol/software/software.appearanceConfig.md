---
status: draft
contract: false
generated: false
domain: software
feature: software.appearanceConfig
registry:
lastReviewed: 2026-06-11
---

# software.appearanceConfig

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 读取、设置并通知 Launcher 等软件壳层外观配置。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | `panelLayout` 枚举、auto-hide 延迟范围和是否仅支持 `target=launcher` 仍需确认。 |

## 1. 功能说明

`software.appearanceConfig` 用于 Windows 系统上运行的 NearHub Launcher 壳层外观配置，例如 `panelLayout`、`autoHidePanel`、`autoHideDelay`。它落实 signage flow 中 `GetAppearanceConfig` / `SetAppearanceConfig` 的最终定域：这是 Launcher 软件外观，不属于 `signage.*` 播放业务，也不属于 `room.*`。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | Launcher 外观配置读取、设置、变化事件。 |
| 包含 | `target=launcher`，后续可扩展到 `agent` 或其他软件 UI。 |
| 不包含 | 播放列表、媒体 URL、播放项配置；属于 `signage.*`。 |
| 不包含 | room endpoint 名称/profile；属于 `room.info`。 |
| 不包含 | 通用软件配置恢复；属于 `software.config`。 |
| 数据面 | 不使用 STREAM。 |

## 3. 方法

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `software.getAppearanceConfig` | query | 读取软件外观配置。 | `SoftwareGetAppearanceConfigParams` | `SoftwareAppearanceConfig` | 否 | draft |
| `software.setAppearanceConfig` | command | 设置软件外观配置。 | `SoftwareSetAppearanceConfigParams` | `SoftwareAppearanceConfig` | 是，变化后触发 `software.appearanceConfigChanged`。 | draft |

### 3.1 `software.getAppearanceConfig`

#### 请求参数 Params：`SoftwareGetAppearanceConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | enum | yes | `launcher` | none | 软件对象；P0 为 `launcher`。 |

#### 返回结果 Result：`SoftwareAppearanceConfig`

字段见 6.2。

### 3.2 `software.setAppearanceConfig`

| 项 | 内容 |
|---|---|
| 目的 | 设置 Launcher 面板布局和自动隐藏行为。 |
| 调用类型 | command |
| Params Schema | `SoftwareSetAppearanceConfigParams` |
| Result Schema | `SoftwareAppearanceConfig` |
| 事件触发 | 配置实际变化后触发 `software.appearanceConfigChanged`。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `PERMISSION_DENIED`, `INTERNAL_ERROR` |

#### 请求参数 Params：`SoftwareSetAppearanceConfigParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `config` | `SoftwareAppearanceConfig` | yes | see schema | none | 要设置的外观配置片段。 |
| `expectedRevision` | string | no | opaque revision | omitted | 可选乐观锁。 |

#### 返回结果 Result：`SoftwareAppearanceConfig`

字段见 6.2。

## 4. 事件

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `software.appearanceConfigChanged` | 外观配置被设置、恢复默认或设备策略修改。 | `SoftwareAppearanceConfigChangedEvent` | 更新 Launcher 外观设置页；必要时重新读取完整配置。 | draft |

### 4.1 `software.appearanceConfigChanged`

#### Payload：`SoftwareAppearanceConfigChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `config` | `SoftwareAppearanceConfig` | yes | see schema | none | 变化后的外观配置片段。 |
| `changedFields` | string[] | no | field paths | omitted | 变化字段。 |
| `reason` | enum | no | `user_request`, `restore_default`, `device_policy`, `unknown` | `unknown` | 变化原因。 |

## 5. Capability

Capability name: `software.appearanceConfig`。

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `software.appearanceConfig` | capability 名称。 |
| `supportedTargets` | string[] | yes | `launcher` | 支持外观配置的软件对象。 |
| `panelLayoutValues` | string[] | no | enum values TBD | 支持的 panel layout。 |
| `autoHideDelayRange` | object | no | min/max seconds | autoHideDelay 范围。 |

## 6. Schemas

### 6.1 Schema 层级速览

```text
SoftwareAppearanceConfig
SoftwareAppearanceConfigChangedEvent
  config: SoftwareAppearanceConfig
```

### 6.2 `SoftwareAppearanceConfig`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | enum | yes | `launcher` | none | 软件对象。 |
| `panelLayout` | enum/string | no | `bottom`, `side`, `floating`, `hidden`, `unknown` candidate | omitted | 面板布局；最终枚举待确认。 |
| `autoHidePanel` | boolean | no | `true`, `false` | omitted | 是否自动隐藏面板。 |
| `autoHideDelay` | uint32 | no | seconds, range TBD | omitted | 自动隐藏延迟秒数。 |
| `revision` | string | no | opaque revision | omitted | 配置版本。 |

## 7. JSON 示例

### 7.1 设置 Launcher 面板外观

```json
{
  "id": 601,
  "method": "software.setAppearanceConfig",
  "params": {
    "config": {
      "target": "launcher",
      "panelLayout": "bottom",
      "autoHidePanel": true,
      "autoHideDelay": 5
    }
  }
}
```

```json
{
  "id": 601,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "target": "launcher",
    "panelLayout": "bottom",
    "autoHidePanel": true,
    "autoHideDelay": 5,
    "revision": "<REVISION>"
  }
}
```

### 7.2 外观变化事件

```json
{
  "event": "software.appearanceConfigChanged",
  "intent": 1,
  "data": {
    "reason": "user_request",
    "changedFields": ["panelLayout", "autoHidePanel", "autoHideDelay"],
    "config": {
      "target": "launcher",
      "panelLayout": "bottom",
      "autoHidePanel": true,
      "autoHideDelay": 5
    }
  }
}
```

### 7.3 autoHideDelay 越界

```json
{
  "id": 602,
  "method": "software.setAppearanceConfig",
  "params": {
    "config": {
      "target": "launcher",
      "autoHideDelay": 9999
    }
  }
}
```

```json
{
  "id": 602,
  "status": {
    "ok": false,
    "code": 11,
    "message": "autoHideDelay is out of range"
  }
}
```

## 8. Candidate Errors

| Error | 复用 / 候选 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | common | target 或字段不支持。 |
| `INVALID_ARGUMENT` | common | panelLayout 非法。 |
| `OUT_OF_RANGE` | common | autoHideDelay 超出范围。 |
| `PERMISSION_DENIED` | common | 无权修改外观配置。 |

## 9. Legacy Mapping

| Legacy entry | Direction | AXTP target | 状态 |
|---|---|---|---|
| `GetAppearanceConfig` | Server <-> Device | `software.getAppearanceConfig(target=launcher)` | `[REVIEW-OK]` |
| `SetAppearanceConfig` | Server <-> Device | `software.setAppearanceConfig(target=launcher)` | `[REVIEW-OK]` |

## 10. Registry / Conformance Status

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method / event IDs | `TBD after adoption` |
| Conformance | 需覆盖 get/set、事件、非法 layout、autoHideDelay 范围。 |

## 11. Test Notes

- `software.setAppearanceConfig(target=launcher)` 成功返回最终配置并触发事件。
- `autoHideDelay` 越界返回 `OUT_OF_RANGE`。
- 不支持 `target` 返回 `NOT_SUPPORTED`。

## 12. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| `panelLayout` 首批枚举是什么？ | schema / conformance | 先保留候选枚举，采纳前从 Launcher 实现确认。 | `[REVIEW-ASK]` |
| `autoHideDelay` 单位和范围是什么？ | schema / tests | 当前用 seconds，范围 TBD。 | `[REVIEW-ASK]` |
| 是否需要支持 `target=signagePlayer` 的播放面板外观？ | domain boundary | 如果是播放业务 UI，而非 Launcher 壳层，后续另评审 signage feature。 | `[REVIEW-ASK]` |

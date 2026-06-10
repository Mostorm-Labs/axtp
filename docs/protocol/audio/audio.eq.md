---
status: review-ok
contract: false
generated: false
domain: audio
feature: audio.eq
registry:
lastReviewed: 2026-06-10
---

# audio.eq

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 管理音频路径上的 EQ preset、band、filter、frequency、gain 和 Q 值。 |
| 当前状态 | review-ok |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | legacy EQ mode/preset 映射、default EQ 写入语义和 path 默认值仍需确认。 |

## 1. 功能说明

`audio.eq` 用于管理音频路径上的 equalizer 配置，包括 EQ 开关、preset、graphic/parametric band、filter type、frequency、gain、Q 值、恢复默认值和配置变化通知。

本文是 registry-review-ready 草案。runtime 不得把本文当作实现合同；正式合同必须来自 registry YAML、protocol IR 和 generated 文档。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | `uplink`、`downlink` 等音频路径上的 EQ 能力发现、当前配置查询、配置更新、恢复默认值。 |
| 包含 | graphic EQ 和 parametric EQ 的 preset、band、gain、frequency、Q、filter type。 |
| 包含 | 每个路径的 band 数量、频率范围、gain 范围、Q 范围、默认配置和是否需要重启音频链路。 |
| 不包含 | AEC、ANS、AGC、beamforming、dereverberation、VAD、DOA、howling suppression；这些归 `audio.algorithm`。 |
| 不包含 | master volume、output volume、mute、channel gain、line-in preGain、mixer gain；这些归 `audio.volume`、`audio.input` 或 `audio.mixer`。 |
| 不包含 | 音源选择、routing graph、playback、recording、STREAM 音频样本。 |
| 数据面 | 不定义 STREAM payload；EQ 是 RPC 控制面配置。 |

## 3. 方法

方法 ID、event ID 和 fieldId 均为 `TBD after adoption`，由 registry 采纳时分配。

| method | 调用类型 | 说明 | params | result | 错误 | 状态 |
|---|---|---|---|---|---|---|
| `audio.getEqCapabilities` | query | 查询设备支持的 EQ 路径、preset、band、范围、默认值和更新策略。 | `AudioGetEqCapabilitiesRequest` | `AudioGetEqCapabilitiesResponse` | `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INTERNAL_ERROR` | candidate |
| `audio.getEqConfig` | query | 查询当前生效的 EQ 配置。 | `AudioGetEqConfigRequest` | `AudioEqConfig` | `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INTERNAL_ERROR` | candidate |
| `audio.setEqConfig` | command | 更新一个或多个路径的 EQ 配置。 | `AudioSetEqConfigRequest` | `AudioSetEqConfigResponse` | `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED`, `INTERNAL_ERROR` | candidate |
| `audio.resetEqConfig` | action | 将全部路径、指定路径或指定字段恢复到能力声明的默认配置。 | `AudioResetEqConfigRequest` | `AudioSetEqConfigResponse` | `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED`, `INTERNAL_ERROR` | candidate |

### `audio.getEqCapabilities`

| 项 | 内容 |
|---|---|
| 说明 | 查询 EQ 能力，供客户端决定 UI、参数范围和可用 preset。 |
| 调用类型 | query |
| 备注 | `paths` 省略表示查询全部支持或已知路径。 |

#### Params 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `paths` | `AudioEqPath[]` | no | `uplink`, `downlink` | omitted | 选择要查询的 EQ 路径。 |

#### Result 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `audio.eq` | none | capability 名称。 |
| `paths` | `AudioEqPathCapability[]` | yes | see schema | none | 每个 EQ 路径的能力描述。 |
| `updatePolicy` | `AudioEqUpdatePolicy` | yes | see schema | none | 更新、reset 和多路径原子性策略。 |
| `configSchemaVersion` | string | no | max length TBD | omitted | EQ 配置 schema 版本标签。 |

### `audio.getEqConfig`

| 项 | 内容 |
|---|---|
| 说明 | 查询当前生效的 EQ 配置。 |
| 调用类型 | query |
| 备注 | 如果设备能展开 preset，响应建议返回最终生效 bands；否则至少返回 preset。 |

#### Params 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `paths` | `AudioEqPath[]` | no | `uplink`, `downlink` | omitted | 选择要查询的路径。 |

#### Result 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `paths` | `AudioEqPathConfig[]` | yes | see schema | none | 当前生效的路径配置。 |
| `revision` | uint32 | no | 0..uint32 max | omitted | 可选配置版本，用于客户端去重或刷新。 |

### `audio.setEqConfig`

| 项 | 内容 |
|---|---|
| 说明 | 更新 EQ 配置。 |
| 调用类型 | command |
| 备注 | `preset != custom` 时不应同时携带显式 `bands`；`preset = custom` 时通常需要携带 `bands`，除非只修改 `enabled`。 |

#### Params 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `config` | `AudioEqConfigPatch` | yes | see schema | none | 要更新的路径和字段；省略路径/字段表示不变。 |

#### Result 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `applyState` | enum | yes | `applied`, `pending_restart` | none | 变更是否已生效。 |
| `requiresAudioRestart` | bool | yes | `true`, `false` | none | 是否需要重启音频链路。 |
| `config` | `AudioEqConfig` | yes | see schema | none | 最终生效配置。 |
| `revision` | uint32 | no | 0..uint32 max | omitted | 可选配置版本。 |

### `audio.resetEqConfig`

| 项 | 内容 |
|---|---|
| 说明 | 将 EQ 配置恢复到 capability 声明的默认值。 |
| 调用类型 | action |
| 备注 | reset 当前配置不等同于写入新的设备默认 profile。 |

#### Params 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `paths` | `AudioEqPath[]` | no | `uplink`, `downlink` | omitted | 指定恢复哪些路径；和 `items` 互斥。 |
| `items` | `map<AudioEqPath, string[]>` | no | path 到字段名数组 | omitted | 指定恢复路径内哪些字段；和 `paths` 互斥。 |

#### Result 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `applyState` | enum | yes | `applied`, `pending_restart` | none | 变更是否已生效。 |
| `requiresAudioRestart` | bool | yes | `true`, `false` | none | 是否需要重启音频链路。 |
| `config` | `AudioEqConfig` | yes | see schema | none | 恢复后的最终生效配置。 |
| `revision` | uint32 | no | 0..uint32 max | omitted | 可选配置版本。 |

## 4. 事件

| event | 触发条件 | payload | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `audio.eqConfigChanged` | `audio.setEqConfig` 或 `audio.resetEqConfig` 成功改变配置；profile、device policy、restore、factory reset 改变 EQ。 | `AudioEqConfigChangedEvent` | 可用变化片段更新 UI；如需完整路径配置，调用 `audio.getEqConfig` 校准。失败请求不得触发该事件。 | candidate |

### Event payload 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `reason` | enum | yes | `user_request`, `reset_to_default`, `factory_reset`, `profile_changed`, `device_policy`, `restore_config`, `unknown` | none | 变化原因。 |
| `applyState` | enum | yes | `applied`, `pending_restart` | none | 应用状态。 |
| `requiresAudioRestart` | bool | yes | `true`, `false` | none | 是否需要重启音频链路。 |
| `config` | `AudioEqConfig` | yes | see schema | none | 已变化或受影响的配置。 |
| `changedFields` | `string[]` | no | field path 数组 | omitted | 变化字段路径。 |
| `revision` | uint32 | no | 0..uint32 max | omitted | 可选配置版本。 |

## 5. Capability

Capability name: `audio.eq`。

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `audio.eq` | capability 名称。 |
| `paths` | `AudioEqPathCapability[]` | yes | see schema | 支持的 EQ 路径和路径级限制。 |
| `updatePolicy` | `AudioEqUpdatePolicy` | yes | see schema | 部分更新、band 更新、多路径原子更新和字段级 reset 策略。 |
| `configSchemaVersion` | string | no | max length TBD | EQ schema 版本标签。 |

### `AudioEqPathCapability`

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `path` | enum | yes | `uplink`, `downlink` | EQ 路径。 |
| `supported` | bool | yes | `true`, `false` | 该路径是否支持 EQ。 |
| `displayName` | string | no | device-defined | UI 展示名。 |
| `eqType` | enum | yes | `graphic`, `parametric` | EQ 类型。 |
| `supportedPresets` | string[] | yes | `flat`, `voice`, `music`, `movie`, `custom`, vendor-declared | 支持的 preset。 |
| `supportsCustomBands` | bool | yes | `true`, `false` | 是否允许客户端设置 band。 |
| `bandCount` | uint16 | yes for graphic | 0..uint16 max | graphic EQ 固定 band 数；parametric EQ 最大 band 数。 |
| `bands` | `AudioEqBandCapability[]` | yes for graphic | see schema | 每个 band 的能力描述。 |
| `gainRangeDb` | `AudioDbRange` | yes | dB range | gain 范围。 |
| `frequencyRangeHz` | `AudioHzRange` | required for parametric | Hz range | parametric frequency 范围。 |
| `qRange` | `AudioFloatRange` | required for parametric | float range | parametric Q 范围。 |
| `defaultConfig` | `AudioEqPathConfig` | yes | see schema | reset 目标配置。 |
| `requiresAudioRestart` | bool | no | `true`, `false` | EQ 修改是否通常需要重启音频链路。 |

## 6. 字段 / Schemas

### 枚举

| 枚举 | 值 | 说明 |
|---|---|---|
| `AudioEqPath` | `uplink`, `downlink` | 上行/下行音频路径。 |
| `AudioEqType` | `graphic`, `parametric` | graphic 使用固定 band；parametric 允许 frequency/Q/filter。 |
| `AudioEqPreset` | `flat`, `voice`, `music`, `movie`, `custom` | 设备可声明 vendor preset，但必须在 capability 中出现。 |
| `AudioEqFilterType` | `peaking`, `low_shelf`, `high_shelf`, `low_pass`, `high_pass` | parametric EQ filter 类型。 |
| `AudioEqApplyState` | `applied`, `pending_restart` | 应用状态。 |
| `AudioEqChangeReason` | `user_request`, `reset_to_default`, `factory_reset`, `profile_changed`, `device_policy`, `restore_config`, `unknown` | 事件原因。 |

### `AudioEqConfig`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `paths` | `AudioEqPathConfig[]` | yes | unique path | none | 一组路径配置。 |
| `revision` | uint32 | no | 0..uint32 max | omitted | 可选版本号。 |

### `AudioEqPathConfig`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `path` | enum | yes | `uplink`, `downlink` | none | 被配置的路径。 |
| `enabled` | bool | no | `true`, `false` | capability default | 是否启用 EQ。 |
| `preset` | string enum | no | declared preset | capability default | 当前 preset；`custom` 表示使用显式 bands。 |
| `bands` | `AudioEqBand[]` | no | see band capability | omitted | 自定义 band 配置。 |

### `AudioEqBand`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `bandIndex` | uint16 | yes | 0..`bandCount - 1` | none | band 下标；同一路径内必须唯一。 |
| `enabled` | bool | no | `true`, `false` | capability default | 该 band 是否启用。 |
| `filterType` | enum | no | `peaking`, `low_shelf`, `high_shelf`, `low_pass`, `high_pass` | capability default | parametric filter 类型；graphic 通常不需要。 |
| `frequencyHz` | uint32 | no | capability `frequencyRangeHz` | capability default | 中心频率或滤波频率，单位 Hz。 |
| `gainDb` | float | no | capability `gainRangeDb` | capability default | band 增益，单位 dB。 |
| `q` | float | no | capability `qRange` | capability default | parametric Q 值。 |

### `AudioEqBandCapability`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `bandIndex` | uint16 | yes | 0..`bandCount - 1` | none | band 下标。 |
| `frequencyHz` | uint32 | no | Hz | omitted | graphic EQ 的固定频点或默认频点。 |
| `defaultGainDb` | float | no | dB | omitted | 默认 gain。 |
| `filterTypes` | `AudioEqFilterType[]` | no | enum list | omitted | 该 band 支持的 filter type。 |

### Range 与更新策略

| Schema | 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---|---:|---|---|---|
| `AudioDbRange` | `min` / `max` / `step` / `unit` | float / string | yes | unit fixed `dB` | none | gain 范围。 |
| `AudioHzRange` | `min` / `max` / `step` / `unit` | uint32 / string | yes / no | unit fixed `Hz` | none | frequency 范围。 |
| `AudioFloatRange` | `min` / `max` / `step` | float | yes / no | float range | none | Q 值等浮点范围。 |
| `AudioEqUpdatePolicy` | `partialUpdateSupported` | bool | yes | `true`, `false` | none | 是否允许部分字段更新。 |
| `AudioEqUpdatePolicy` | `partialBandUpdateSupported` | bool | yes | `true`, `false` | none | 是否允许只更新部分 band。 |
| `AudioEqUpdatePolicy` | `atomicMultiPathSupported` | bool | yes | `true`, `false` | none | 是否支持多路径原子更新。 |
| `AudioEqUpdatePolicy` | `fieldResetSupported` | bool | yes | `true`, `false` | none | 是否支持字段级 reset。 |

## 7. JSON 示例

示例只展示 RPC `d` 数据块，不包裹外层 `sid` / `op` / `d` wire envelope。字段和 ID 在采纳前均为草案。

### 查询 EQ 能力

```json
{
  "id": 1,
  "method": "audio.getEqCapabilities",
  "params": {
    "paths": ["uplink", "downlink"]
  }
}
```

```json
{
  "id": 1,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "capability": "audio.eq",
    "configSchemaVersion": "1.0",
    "updatePolicy": {
      "partialUpdateSupported": true,
      "partialBandUpdateSupported": true,
      "atomicMultiPathSupported": false,
      "fieldResetSupported": true
    },
    "paths": [
      {
        "path": "uplink",
        "supported": true,
        "displayName": "Microphone EQ",
        "eqType": "parametric",
        "supportedPresets": ["flat", "voice", "custom"],
        "supportsCustomBands": true,
        "bandCount": 5,
        "gainRangeDb": {
          "min": -12,
          "max": 12,
          "step": 0.5,
          "unit": "dB"
        },
        "frequencyRangeHz": {
          "min": 20,
          "max": 20000,
          "step": 1,
          "unit": "Hz"
        },
        "qRange": {
          "min": 0.1,
          "max": 10,
          "step": 0.1
        },
        "defaultConfig": {
          "path": "uplink",
          "enabled": true,
          "preset": "flat"
        }
      }
    ]
  }
}
```

读法：`paths` 是 capability 的核心入口。客户端应根据每个路径的 `eqType`、`supportedPresets`、`gainRangeDb`、`frequencyRangeHz` 和 `qRange` 渲染 UI；`defaultConfig` 是 `audio.resetEqConfig` 的恢复目标，不是当前配置。

### 设置自定义 EQ

```json
{
  "id": 2,
  "method": "audio.setEqConfig",
  "params": {
    "config": {
      "paths": [
        {
          "path": "uplink",
          "enabled": true,
          "preset": "custom",
          "bands": [
            {
              "bandIndex": 0,
              "filterType": "peaking",
              "frequencyHz": 250,
              "gainDb": -2.5,
              "q": 1.2
            },
            {
              "bandIndex": 1,
              "filterType": "peaking",
              "frequencyHz": 1000,
              "gainDb": 1.5,
              "q": 1
            }
          ]
        }
      ]
    }
  }
}
```

```json
{
  "id": 2,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "applyState": "applied",
    "requiresAudioRestart": false,
    "revision": 12,
    "config": {
      "paths": [
        {
          "path": "uplink",
          "enabled": true,
          "preset": "custom",
          "bands": [
            {
              "bandIndex": 0,
              "filterType": "peaking",
              "frequencyHz": 250,
              "gainDb": -2.5,
              "q": 1.2
            }
          ]
        }
      ]
    }
  }
}
```

读法：请求中的 `preset` 为 `custom` 时，`bands` 表示调用方显式设置的 band。响应中的 `config` 是最终生效配置片段，客户端如需完整路径配置，应再调用 `audio.getEqConfig`。

### EQ 变化事件

```json
{
  "event": "audio.eqConfigChanged",
  "intent": 1,
  "data": {
    "reason": "user_request",
    "applyState": "applied",
    "requiresAudioRestart": false,
    "revision": 12,
    "config": {
      "paths": [
        {
          "path": "uplink",
          "preset": "custom",
          "bands": [
            {
              "bandIndex": 0,
              "gainDb": -2.5
            }
          ]
        }
      ]
    },
    "changedFields": ["paths[uplink].bands[0].gainDb"]
  }
}
```

读法：事件中的 `config` 可以是变化片段，不要求包含完整 `AudioEqConfig`。客户端可按 `changedFields` 局部更新；如果本地状态缺失或事件乱序，应调用 `audio.getEqConfig` 校准。

### 失败响应

```json
{
  "id": 3,
  "status": {
    "ok": false,
    "code": 11,
    "msg": "Value is outside the supported range.",
    "details": {
      "field": "bands[0].gainDb",
      "min": -12,
      "max": 12
    }
  }
}
```

读法：`OUT_OF_RANGE` 表示请求值超出 capability 声明的范围。失败请求不得部分应用，也不得触发 `audio.eqConfigChanged`。

## 8. 错误

本草案优先复用现有 ErrorCode，不分配 feature-specific errorCode。

| 错误 | 适用场景 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持 `audio.eq`、指定路径、custom bands、filter type 或字段。 | 合法请求但设备能力不支持。 |
| `INVALID_ARGUMENT` | path enum 非法、请求结构错误、duplicate band、preset/bands 组合非法。 | 例如 `preset = music` 同时携带 `bands`。 |
| `OUT_OF_RANGE` | `gainDb`、`frequencyHz`、`q`、`bandIndex` 超出 capability。 | 需要返回字段名和范围细节。 |
| `INVALID_STATE` | 当前音频模式锁定 EQ 修改。 | 例如会议模式或设备策略禁止修改。 |
| `BUSY` | 音频 pipeline 正忙。 | 客户端可重试。 |
| `PERMISSION_DENIED` | 调用方无权限。 | 权限由 session/runtime 决定。 |
| `INTERNAL_ERROR` | 读取或应用 EQ 配置失败。 | 设备内部错误。 |

## 9. Legacy 映射

Legacy 映射是迁移证据，不是 runtime 合同。旧 packed payload、旧 mode 值和旧命令名不得直接成为 AXTP schema 名称。

| legacy 项 | 候选映射 | 状态 | 说明 |
|---|---|---|---|
| `CommonGetRecordEqParams` | `audio.getEqConfig` path `uplink` | candidate | 需要确认旧协议默认路径。 |
| `CommonSetRecordEqParams` | `audio.setEqConfig` path `uplink` | candidate | adapter 负责解包旧 EQ 参数。 |
| `CommonGetDefaultRecordEqParams` | `audio.getEqCapabilities.paths[].defaultConfig` | candidate | 读默认值不是 reset。 |
| `CommonSetDefaultRecordEqParams` | adapter-only / future default-profile feature | adapter-only | 写默认 profile 不应映射为 reset 当前配置。 |
| `CommonGetAudioEqParam` | `audio.getEqConfig` | candidate | 可能是 downlink 或产品默认播放路径，需确认。 |
| `CommonSetAudioEqParam` | `audio.setEqConfig` | candidate | 旧 payload 需映射为 bands 或 preset。 |
| `CommonGetAudioEqMode` | `audio.getEqConfig.preset` | candidate | mode 到 preset 的枚举映射需确认。 |
| `CommonSetAudioEqMode` | `audio.setEqConfig.preset` | candidate | manual/custom mode 需确认是否等价于 `custom`。 |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| registry | not generated | 当前 [registry/domains/audio/domain.yaml](../../../registry/domains/audio/domain.yaml) 未包含 `audio.eq`。 |
| generated | false | `docs/generated/**` 未生成 `audio.eq` method/event/capability。 |
| protocol draft | review-ok | 边界、方法、事件、schema、错误和 legacy mapping 已具备 registry review 基础。 |
| registry readiness | partial / candidate | 仍需 registry 分配 methodId/eventId/capabilityId/fieldId，并确认 legacy enum/range。 |
| conformance | missing | 采纳后需要新增 `audio.eq` 专项 cases。 |

## 11. 测试要点

| 类型 | 要点 |
|---|---|
| happy path | 查询能力；查询配置；设置 preset；设置 custom bands；reset 指定路径。 |
| error path | 不支持路径、非法 preset、非法 preset/bands 组合、不支持 custom bands、无权限、BUSY。 |
| boundary case | `gainDb` min/max/step；`frequencyHz` min/max；`q` min/max；bandIndex 0/max/duplicate。 |
| capability discovery | `audio.eq` capability 暴露 paths、ranges、presets、updatePolicy；method/event 绑定 capability。 |
| event | 成功 set/reset 触发 `audio.eqConfigChanged`；失败请求不触发事件；多路径原子操作建议合并事件。 |
| adoption | 采纳前不得分配正式 ID，不得把本 Markdown 当 runtime contract。 |

## 12. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| legacy EQ mode 到 `AudioEqPreset` 的映射表尚未确认。 | schema / legacy / conformance | 先保留 `flat`, `voice`, `music`, `movie`, `custom`，vendor mode 由 capability 声明。 | open |
| 旧 record EQ 的默认路径是 `uplink` 还是产品默认路径。 | legacy / registry | 暂按 `uplink` 映射，但采纳前需要按设备线确认。 | open |
| 旧 `SetDefaultRecordEq` 是否写默认 profile。 | legacy / product behavior | 不映射为 `audio.resetEqConfig`；暂标为 adapter-only 或 future default-profile feature。 | open |
| graphic EQ 设置请求中的 `frequencyHz` 是否必须匹配 capability 固定频点。 | schema / conformance | graphic EQ 建议要求匹配 capability；parametric EQ 才允许 capability 范围内自定义 frequency。 | open |

---
status: review-ok
contract: false
generated: false
domain: audio
feature: audio.volume
registry:
lastReviewed: 2026-06-10
---

# audio.volume

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 管理用户可感知的输出音量、静音状态和音量变化通知。 |
| 当前状态 | review-ok |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | `State` / `Config` 最终命名、target 集合、range/unit/default 语义仍需确认。 |

## 1. 功能说明

`audio.volume` 用于管理用户可感知的输出音量和静音状态，包括能力发现、当前状态查询、设置音量/静音、恢复默认状态和音量变化通知。

本文是 registry-review-ready 草案。runtime 不得把本文当作实现合同；正式合同必须来自 registry YAML、protocol IR 和 generated 文档。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 用户能感知的 master volume、speaker volume、line-out volume、headphone volume。 |
| 包含 | 音量范围、步进、单位、默认音量、是否支持 mute、当前 mute 状态。 |
| 包含 | 物理按键、HID report、设备策略、restore/factory reset 引起的音量/静音变化事件。 |
| 不包含 | Line-in preGain、input gain；这些归 `audio.input`。 |
| 不包含 | mixer bus gain、per-source gain、matrix gain、channel gain；这些归 `audio.mixer`。 |
| 不包含 | AGC target/max gain；这些归 `audio.algorithm`。 |
| 不包含 | EQ band gain；这些归 `audio.eq`。 |
| 不包含 | output port inventory、routing graph；这些归后续 `audio.output` 或 `audio.routing` 评审。 |
| 数据面 | 不定义 STREAM payload；volume 是 RPC 控制面状态。 |

## 3. 方法

方法 ID、event ID 和 fieldId 均为 `TBD after adoption`，由 registry 采纳时分配。

命名说明：本草案使用 `State`，因为音量/静音是运行时可感知状态；若后续 registry review 选择 `Config` 命名，语义边界仍应保持为用户可感知 volume/mute。

| method | 调用类型 | 说明 | params | result | 错误 | 状态 |
|---|---|---|---|---|---|---|
| `audio.getVolumeCapabilities` | query | 查询支持的音量 target、范围、单位、mute 能力、默认值和更新策略。 | `AudioGetVolumeCapabilitiesRequest` | `AudioGetVolumeCapabilitiesResponse` | `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INTERNAL_ERROR` | candidate |
| `audio.getVolumeState` | query | 查询当前生效的音量和静音状态。 | `AudioGetVolumeStateRequest` | `AudioVolumeState` | `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INTERNAL_ERROR` | candidate |
| `audio.setVolumeState` | command | 设置一个或多个 target 的音量和/或静音状态。 | `AudioSetVolumeStateRequest` | `AudioSetVolumeStateResponse` | `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED`, `INTERNAL_ERROR` | candidate |
| `audio.resetVolumeState` | action | 将指定 target 或字段恢复到能力声明的默认值。 | `AudioResetVolumeStateRequest` | `AudioSetVolumeStateResponse` | `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED`, `INTERNAL_ERROR` | candidate |

### `audio.getVolumeCapabilities`

| 项 | 内容 |
|---|---|
| 说明 | 查询设备有哪些用户可感知音量 target，以及各 target 的范围、单位、默认值和 mute 能力。 |
| 调用类型 | query |
| 备注 | `targets` 省略表示查询全部支持或已知 target。 |

#### Params 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `targets` | string[] | no | `master`, `speaker`, `lineOut`, `headphone`, registry-reviewed product target | omitted | 选择要查询的音量 target。 |

#### Result 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `audio.volume` | none | capability 名称。 |
| `targets` | `AudioVolumeTargetCapability[]` | yes | see schema | none | 支持的音量 target 及限制。 |
| `updatePolicy` | `AudioVolumeUpdatePolicy` | yes | see schema | none | 部分更新、多 target 原子更新和字段级 reset 策略。 |
| `configSchemaVersion` | string | no | max length TBD | omitted | volume schema 版本标签。 |

### `audio.getVolumeState`

| 项 | 内容 |
|---|---|
| 说明 | 查询当前音量和 mute 状态。 |
| 调用类型 | query |
| 备注 | target 省略表示查询全部支持 target。 |

#### Params 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `targets` | string[] | no | capability declared target | omitted | 选择要查询的 target。 |

#### Result 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `targets` | `AudioVolumeTargetState[]` | yes | unique target | none | 当前 target 状态。 |
| `revision` | uint32 | no | 0..uint32 max | omitted | 可选状态版本，用于事件去重或客户端刷新。 |

### `audio.setVolumeState`

| 项 | 内容 |
|---|---|
| 说明 | 设置音量 level、mute，或两者同时设置。 |
| 调用类型 | command |
| 备注 | `muted = true` 不应强制改写 `level`；取消静音时通常保留原有 level，除非设备策略另有说明。 |

#### Params 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `state` | `AudioVolumeStatePatch` | yes | see schema | none | 要更新的 target 和字段；省略字段表示不变。 |

#### Result 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `applyState` | enum | yes | `applied`, `pending_restart` | none | 变更是否已生效。 |
| `state` | `AudioVolumeState` | yes | see schema | none | 最终生效状态。 |
| `revision` | uint32 | no | 0..uint32 max | omitted | 可选状态版本。 |

### `audio.resetVolumeState`

| 项 | 内容 |
|---|---|
| 说明 | 将音量 level 和/或 mute 恢复到 capability 声明的默认值。 |
| 调用类型 | action |
| 备注 | reset 当前状态不等同于写入新的设备默认 profile。 |

#### Params 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `targets` | string[] | no | capability declared target | omitted | 指定恢复哪些 target；和 `items` 互斥。 |
| `items` | `map<string, string[]>` | no | fields: `level`, `muted`, `all` | omitted | 指定恢复 target 内哪些字段；和 `targets` 互斥。 |

#### Result 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `applyState` | enum | yes | `applied`, `pending_restart` | none | 变更是否已生效。 |
| `state` | `AudioVolumeState` | yes | see schema | none | 恢复后的最终状态。 |
| `revision` | uint32 | no | 0..uint32 max | omitted | 可选状态版本。 |

## 4. 事件

| event | 触发条件 | payload | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `audio.volumeStateChanged` | `set`/`reset` 成功改变 level 或 mute；物理按键/HID report；device policy、profile、restore、factory reset 改变 volume。 | `AudioVolumeStateChangedEvent` | 可用变化片段更新 UI；如需完整状态，调用 `audio.getVolumeState` 校准。失败请求不得触发该事件。 | candidate |

### Event payload 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `reason` | enum | yes | `user_request`, `physical_control`, `hid_report`, `reset_to_default`, `factory_reset`, `profile_changed`, `device_policy`, `restore_config`, `unknown` | none | 状态变化原因。 |
| `state` | `AudioVolumeState` | yes | see schema | none | 已变化或受影响的状态。 |
| `changedFields` | string[] | no | field path 数组 | omitted | 变化字段路径。 |
| `revision` | uint32 | no | 0..uint32 max | omitted | 可选状态版本。 |

## 5. Capability

Capability name: `audio.volume`。

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `audio.volume` | capability 名称。 |
| `targets` | `AudioVolumeTargetCapability[]` | yes | see schema | 支持的用户可感知音量 target。 |
| `updatePolicy` | `AudioVolumeUpdatePolicy` | yes | see schema | 部分更新、多 target 原子更新和字段级 reset 策略。 |
| `configSchemaVersion` | string | no | max length TBD | volume schema 版本标签。 |

### `AudioVolumeTargetCapability`

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `target` | string enum | yes | `master`, `speaker`, `lineOut`, `headphone`, registry-reviewed product target | 被控制的用户可感知音量 target。 |
| `supported` | bool | yes | `true`, `false` | 该 target 是否支持音量控制。 |
| `displayName` | string | no | device-defined | UI 展示名。 |
| `levelRange` | `AudioVolumeRange` | yes | see schema | level 范围、步进和单位。 |
| `unit` | enum | yes | `percent`, `dB` | target 默认单位；面向用户的 target 推荐 `percent`。 |
| `muteSupported` | bool | yes | `true`, `false` | 是否支持静音。 |
| `defaultLevel` | number | no | within `levelRange` | reset 使用的默认 level。 |
| `defaultMuted` | bool | no | `true`, `false` | reset 使用的默认 mute 状态。 |
| `requiresAudioRestart` | bool | no | `true`, `false` | 音量/静音变化通常应为 `false`。 |

### target 边界

| 概念 | 归属 | 原因 |
|---|---|---|
| `master` / `speaker` / `lineOut` / `headphone` volume | `audio.volume` | 用户感知 loudness。 |
| output mute | `audio.volume` | 用户感知静音。 |
| line-in preGain | `audio.input` | 输入侧校准，不是输出 loudness。 |
| mixer item/bus/channel gain | `audio.mixer` | 内部混音平衡，不是用户 master volume。 |
| AGC target/max gain | `audio.algorithm` | DSP 算法参数。 |
| EQ band gain | `audio.eq` | 滤波曲线参数。 |

## 6. 字段 / Schemas

### 枚举

| 枚举 | 值 | 说明 |
|---|---|---|
| `AudioVolumeUnit` | `percent`, `dB` | `percent` 推荐用于用户可感知音量；`dB` 仅用于产品明确暴露 dB 的场景。 |
| `AudioVolumeApplyState` | `applied`, `pending_restart` | 应用状态。 |
| `AudioVolumeChangeReason` | `user_request`, `physical_control`, `hid_report`, `reset_to_default`, `factory_reset`, `profile_changed`, `device_policy`, `restore_config`, `unknown` | 事件原因。 |

### `AudioVolumeState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `targets` | `AudioVolumeTargetState[]` | yes | unique target | none | 一组 target 状态。 |
| `revision` | uint32 | no | 0..uint32 max | omitted | 可选状态版本。 |

### `AudioVolumeTargetState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `target` | string enum | yes | capability declared target | none | 被查询或被设置的 target。 |
| `level` | number | no | `AudioVolumeRange` | unchanged / default | 音量值。 |
| `unit` | enum | no | `percent`, `dB` | target default unit | `level` 的单位。 |
| `muted` | bool | no | `true`, `false` | unchanged / default | 静音状态。 |

### `AudioVolumeRange`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `min` | number | yes | number | none | 最小 level。 |
| `max` | number | yes | number | none | 最大 level。 |
| `step` | number | yes | positive number | none | level 步进。 |
| `unit` | enum | yes | `percent`, `dB` | none | 范围单位。 |

### `AudioVolumeUpdatePolicy`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `partialUpdateSupported` | bool | yes | `true`, `false` | none | 是否允许只更新 `level` 或 `muted`。 |
| `atomicMultiTargetSupported` | bool | yes | `true`, `false` | none | 是否支持多 target 原子更新。 |
| `fieldResetSupported` | bool | yes | `true`, `false` | none | 是否支持字段级 reset。 |

## 7. JSON 示例

示例只展示 RPC `d` 数据块，不包裹外层 `sid` / `op` / `d` wire envelope。字段和 ID 在采纳前均为草案。

### 查询音量能力

```json
{
  "id": 1,
  "method": "audio.getVolumeCapabilities",
  "params": {
    "targets": ["master", "lineOut"]
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
    "capability": "audio.volume",
    "configSchemaVersion": "1.0",
    "updatePolicy": {
      "partialUpdateSupported": true,
      "atomicMultiTargetSupported": false,
      "fieldResetSupported": true
    },
    "targets": [
      {
        "target": "master",
        "supported": true,
        "displayName": "Master volume",
        "levelRange": {
          "min": 0,
          "max": 100,
          "step": 1,
          "unit": "percent"
        },
        "unit": "percent",
        "muteSupported": true,
        "defaultLevel": 60,
        "defaultMuted": false,
        "requiresAudioRestart": false
      }
    ]
  }
}
```

### 设置音量和静音

```json
{
  "id": 2,
  "method": "audio.setVolumeState",
  "params": {
    "state": {
      "targets": [
        {
          "target": "master",
          "level": 42,
          "unit": "percent",
          "muted": false
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
    "revision": 8,
    "state": {
      "targets": [
        {
          "target": "master",
          "level": 42,
          "unit": "percent",
          "muted": false
        }
      ]
    }
  }
}
```

### 只设置静音

```json
{
  "id": 3,
  "method": "audio.setVolumeState",
  "params": {
    "state": {
      "targets": [
        {
          "target": "master",
          "muted": true
        }
      ]
    }
  }
}
```

### 音量变化事件

```json
{
  "event": "audio.volumeStateChanged",
  "intent": 1,
  "data": {
    "reason": "physical_control",
    "revision": 9,
    "state": {
      "targets": [
        {
          "target": "master",
          "level": 43,
          "unit": "percent",
          "muted": false
        }
      ]
    },
    "changedFields": ["targets[master].level"]
  }
}
```

### 失败响应

```json
{
  "id": 4,
  "status": {
    "ok": false,
    "code": 11,
    "msg": "Value is outside the supported range.",
    "details": {
      "target": "master",
      "field": "level",
      "min": 0,
      "max": 100,
      "step": 1
    }
  }
}
```

## 8. 错误

本草案优先复用现有 ErrorCode，不分配 feature-specific errorCode。

| 错误 | 适用场景 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | 设备不支持 `audio.volume`、指定 target、mute 或多 target 原子更新。 | 合法请求但设备能力不支持。 |
| `INVALID_ARGUMENT` | target 名称非法、请求结构错误、unit 非法、`targets` 和 `items` 同时出现。 | 请求结构错误时不应应用状态。 |
| `OUT_OF_RANGE` | `level` 超出范围或不符合 step。 | 需要返回 target、field、min/max/step。 |
| `INVALID_STATE` | 当前模式锁定音量修改。 | 例如设备策略或会议模式限制。 |
| `BUSY` | 音频 pipeline 或设备资源正忙。 | 客户端可重试。 |
| `PERMISSION_DENIED` | 调用方无权限。 | 权限由 session/runtime 决定。 |
| `INTERNAL_ERROR` | 读取或应用音量状态失败。 | 设备内部错误。 |

## 9. Legacy 映射

Legacy 映射是迁移证据，不是 runtime 合同。旧命令中的 Line-out、HID report、mute light 等概念不得直接成为 AXTP 一等 feature。

| legacy 项 | 候选映射 | 状态 | 说明 |
|---|---|---|---|
| `SetLineOutVolume` | `audio.setVolumeState` target `lineOut`, field `level` | candidate | 需要确认旧范围和单位。 |
| `GetLineOutVolume` | `audio.getVolumeState` target `lineOut` | candidate | 如果设备只有一个输出 target，adapter 可映射为 `master`。 |
| `Config.Set:Volume` / `Config.Get:Volume` | `audio.setVolumeState` / `audio.getVolumeState` target `master` 或产品默认 target | candidate | 默认 target 需要产品确认。 |
| `CommonSetAudioMuteState` / `CommonGetAudioMuteState` | `audio.setVolumeState` / `audio.getVolumeState` field `muted` | candidate | mute 不应改写 level，除非旧协议明确如此。 |
| HID volume reports | `audio.volumeStateChanged` | candidate | adapter 把 report ID/payload 转成事件 payload。 |
| `CommonSetDefaultVolume` / `CommonGetDefaultVolume` | `AudioVolumeTargetCapability.defaultLevel` 或 future default-profile feature | unresolved | 读默认值可作为 capability metadata；写默认值不是 reset 当前状态。 |
| `CommonGetMuteLightEnhancement` / `CommonSetMuteLightEnhancement` | adapter-only / future indicator feature | unresolved | 可能是指示灯行为，不是 audio mute 本身。 |
| `SetLineInPreGain` / `GetLineInPreGain` | `audio.input` | adapter-only for volume | 输入 preGain 明确不属于 `audio.volume`。 |
| `AudioMix` / mixer item gain | `audio.mixer` | adapter-only for volume | mixer gain 明确不属于 `audio.volume`。 |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| registry | not generated | 当前 [registry/domains/audio/domain.yaml](../../../registry/domains/audio/domain.yaml) 未包含 `audio.volume`。 |
| generated | false | `docs/generated/**` 未生成 `audio.volume` method/event/capability。 |
| protocol draft | review-ok | 边界已收敛到用户可感知音量/静音；input preGain、mixer gain、AGC gain、EQ gain 已排除。 |
| registry readiness | partial / candidate | 仍需确认最终命名是 `State` 还是 `Config`，确认 target set、range/unit、legacy default 语义。 |
| conformance | missing | 采纳后需要新增 `audio.volume` 专项 cases。 |

## 11. 测试要点

| 类型 | 要点 |
|---|---|
| happy path | 查询能力；查询状态；设置 level；设置 mute；同时设置 level+mute；reset target。 |
| error path | 不支持 target、不支持 mute、非法 unit、无权限、BUSY、当前状态禁止修改。 |
| boundary case | level min/max；step 对齐；只 mute 不改变 level；多 target 原子更新不支持时必须拒绝而非部分应用。 |
| capability discovery | `audio.volume` capability 暴露 targets、range、unit、muteSupported、defaultLevel、updatePolicy。 |
| event | 成功 set/reset 或物理/HID 改变后发 `audio.volumeStateChanged`；失败请求不发事件。 |
| adoption | 采纳前不得分配正式 ID；不得把 input preGain、mixer gain、AGC gain、EQ gain 合并进本 feature。 |

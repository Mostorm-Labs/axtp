# AXTP Audio EQ 配置协议

版本：v0.2
归属域：`audio`
Capability ID：`audio.eq`
适用范围：上行链路、下行链路的运行时 EQ 参数配置、默认值恢复、能力查询和配置变化通知。

本文档是 `audio.eq` 的协议评审稿，可作为 `registry/domains/audio/domain.yaml` 的草案输入。进入正式生成路径前，仍需将 method、event、capability、schema 和 legacyRefs 写入 registry YAML 并通过 Generator 校验。

---

## 1. 评审处理结论

| 原 review 条目 | 处理结论 |
|---|---|
| `audio.eq` capability | 采纳。EQ 作为 `audio` 域下独立 feature，不并入 `audio.algorithm`。 |
| `audio.getEqCapabilities` / `audio.getEqConfig` / `audio.setEqConfig` / `audio.resetEqConfig` / `audio.eqConfigChanged` | 采纳。使用配置型 feature 模板。 |
| 文档语气 | 已改为正式协议语气，删除 intake 任务描述。 |
| 错误处理 | 已明确 path 不支持、band 越界、preset/custom 冲突、多 path 原子更新失败等错误策略。 |
| `CommonGetDefaultRecordEqParams` / `CommonSetDefaultRecordEqParams` | 默认 EQ 值进入 `getEqCapabilities.defaultConfig`；`resetEqConfig` 只负责把当前配置恢复为默认值，不负责写默认值。写默认值的 legacy 命令不直接映射为标准 AXTP 方法。 |
| `CommonSetAudioEqMode` / `CommonGetAudioEqMode` | legacy `mode` 映射为 `preset`；当 legacy mode 表示手动/自定义时映射为 `preset: "custom"`。具体数字枚举必须在产品 adapter 的 legacyRefs 中确认。 |

---

## 2. 设计目标

`audio.eq` 用于配置音频链路中的均衡参数。协议覆盖：

1. 查询设备支持的 EQ path、preset、频段、范围和默认值。
2. 查询当前 EQ 配置。
3. 设置一个或多个 path 的 EQ 配置。
4. 恢复全部 path、指定 path 或指定字段到默认配置。
5. 在 EQ 配置变化时发送事件。
6. 支持固定频点图示 EQ，并为参数 EQ 预留字段。

`uplink` 和 `downlink` 不拆成两套方法。所有操作都使用同一组 `audio.*Eq*` 方法，并通过 path 键或 path 字段区分目标链路。

---

## 3. 域职责

| 域 | 职责 |
|---|---|
| `audio.eq` | EQ 配置、能力、默认值、配置变化事件。 |
| `audio.algorithm` | NS、AEC、AGC、BF、DR、VAD、DOA、howling suppression 等通用音频算法配置。 |
| `stream` | 音频数据面传输；EQ 配置本身不承载 PCM、频谱或算法结果流。 |
| `diagnostic` | 产测、校准、工厂写入、算法授权和私有调参流程。 |
| `capability` | v1 使用 `capability.supportedMethods` 发现当前会话可调用方法；完整 capability registry 查询属于 v2/P1 扩展。 |

EQ 可以被实现为 DSP 算法的一部分，但协议上独立于 `audio.algorithm`，原因是 EQ 具有 path、preset、bands、gainDb、frequencyHz、q 等专用结构。

---

## 4. 接口总览

| 类型 | 名称 | 用途 |
|---|---|---|
| Capability | `audio.eq` | 设备支持 EQ 配置能力。 |
| Method | `audio.getEqCapabilities` | 查询 EQ 细粒度能力、范围和默认配置。 |
| Method | `audio.getEqConfig` | 查询当前 EQ 配置。 |
| Method | `audio.setEqConfig` | 设置 EQ 配置，支持部分更新。 |
| Method | `audio.resetEqConfig` | 恢复 EQ 默认配置。 |
| Event | `audio.eqConfigChanged` | EQ 配置发生变化。 |

推荐 schema 名称：

```text
AudioGetEqCapabilitiesRequest
AudioGetEqCapabilitiesResponse
AudioGetEqConfigRequest
AudioGetEqConfigResponse
AudioSetEqConfigRequest
AudioSetEqConfigResponse
AudioResetEqConfigRequest
AudioResetEqConfigResponse
AudioEqConfigChangedEvent
AudioEqCapability
AudioEqPathCapability
AudioEqConfig
AudioEqBand
AudioEqBandCapability
AudioEqRange
```

---

## 5. 核心模型

### 5.1 Path

`path` 表示 EQ 作用链路：

| 值 | 含义 |
|---|---|
| `uplink` | 上行链路。通常指麦克风采集后，送给远端、UAC、网络会议或编码器之前的链路。 |
| `downlink` | 下行链路。通常指远端、主机或网络收到后，送本地扬声器播放之前的链路。 |

JSON-RPC 正文使用 path map 表达：

```json
{
  "uplink": {
    "enabled": true,
    "preset": "voice"
  },
  "downlink": {
    "enabled": true,
    "preset": "music"
  }
}
```

当编码格式不适合对象键表达时，例如 TLV 或 repeated item，应使用显式字段：

```json
{
  "path": "uplink",
  "enabled": true,
  "preset": "voice"
}
```

不得新增 `audio.setUplinkEqConfig`、`audio.setDownlinkEqConfig` 这类 path 专用方法。

### 5.2 EQ 类型

| 值 | 含义 |
|---|---|
| `graphic` | 图示 EQ。频点由设备固定，客户端通常只设置 `bandIndex` 和 `gainDb`。 |
| `parametric` | 参数 EQ。每段可包含 `filterType`、`frequencyHz`、`gainDb`、`q` 等参数。 |

MVP 优先支持 `graphic`。`parametric` 为扩展模型，不要求所有设备实现。

### 5.3 Preset

`preset` 是设备预置 EQ 曲线。推荐值：

| 值 | 含义 |
|---|---|
| `flat` | 平直曲线，通常所有频段增益为 0 dB。 |
| `voice` | 语音增强曲线。 |
| `music` | 音乐曲线。 |
| `movie` | 影视曲线。 |
| `custom` | 自定义曲线，由 `bands` 描述。 |

设备可以增加厂商或产品专用 preset，但必须在 `audio.getEqCapabilities.presets` 中声明。客户端不得假设除 `custom` 外的 preset 对应固定 bands；preset 曲线由设备定义。

### 5.4 Band

图示 EQ 的 band：

```json
{
  "bandIndex": 3,
  "frequencyHz": 1000,
  "gainDb": 1.5
}
```

参数 EQ 的 band：

```json
{
  "bandIndex": 0,
  "enabled": true,
  "filterType": "peaking",
  "frequencyHz": 1000,
  "gainDb": 2.5,
  "q": 1.0
}
```

字段规则：

| 字段 | 规则 |
|---|---|
| `bandIndex` | 从 0 开始，path 内唯一。 |
| `frequencyHz` | 图示 EQ 中由能力声明固定频点；set 请求可省略。若 set 请求携带该字段，必须与能力声明一致。参数 EQ 中表示中心频点或截止频点。 |
| `gainDb` | 单位 dB，必须落在 `gainRangeDb` 内并满足 `step`。 |
| `q` | 参数 EQ 可用，必须落在 `qRange` 内。图示 EQ 不支持时不得传入。 |
| `filterType` | 参数 EQ 可用，推荐值为 `peaking`、`low_shelf`、`high_shelf`、`low_pass`、`high_pass`。 |
| `enabled` | 参数 EQ 单 band 开关；图示 EQ 通常不使用。 |

### 5.5 应用状态

set/reset 成功后返回 `state`：

| 值 | 含义 |
|---|---|
| `applied` | 配置已生效。 |
| `pending_restart` | 配置已接受并持久化，但需要重启音频链路或设备后生效。 |

当 `state = "pending_restart"` 时，响应必须同时返回 `requiresAudioRestart: true`。失败不使用 `pending_restart` 表达，必须返回 RPC error。

---

## 6. `audio.getEqCapabilities`

### 6.1 用途

查询设备支持哪些 EQ path、preset、频段数量、频点、增益范围、Q 值范围、是否支持自定义 EQ、默认配置以及原子更新能力。

### 6.2 请求

查询全部 path：

```json
{
  "method": "audio.getEqCapabilities",
  "params": {}
}
```

查询指定 path：

```json
{
  "method": "audio.getEqCapabilities",
  "params": {
    "paths": ["uplink", "downlink"]
  }
}
```

`paths` 省略时表示查询所有已知 path。`paths` 中出现未知枚举值时返回 `RPC_PARAM_INVALID`。

### 6.3 返回

返回按 path 展开。支持的 path 必须返回完整能力；已知但不支持的 path 可以返回 `supported: false`。

```json
{
  "result": {
    "uplink": {
      "supported": true,
      "displayName": "Uplink EQ",
      "eqType": "graphic",
      "presets": ["flat", "voice", "custom"],
      "supportsCustomBands": true,
      "supportsPartialBandUpdate": true,
      "supportsFieldReset": true,
      "supportsAtomicMultiPath": true,
      "requiresAudioRestart": false,
      "bandCount": 7,
      "gainRangeDb": {
        "min": -12,
        "max": 12,
        "step": 0.5
      },
      "bands": [
        { "bandIndex": 0, "frequencyHz": 125, "defaultGainDb": 0 },
        { "bandIndex": 1, "frequencyHz": 250, "defaultGainDb": 0 },
        { "bandIndex": 2, "frequencyHz": 500, "defaultGainDb": 0 },
        { "bandIndex": 3, "frequencyHz": 1000, "defaultGainDb": 0 },
        { "bandIndex": 4, "frequencyHz": 2000, "defaultGainDb": 0 },
        { "bandIndex": 5, "frequencyHz": 4000, "defaultGainDb": 0 },
        { "bandIndex": 6, "frequencyHz": 8000, "defaultGainDb": 0 }
      ],
      "defaultConfig": {
        "enabled": true,
        "preset": "flat",
        "bands": [
          { "bandIndex": 0, "frequencyHz": 125, "gainDb": 0 },
          { "bandIndex": 1, "frequencyHz": 250, "gainDb": 0 },
          { "bandIndex": 2, "frequencyHz": 500, "gainDb": 0 },
          { "bandIndex": 3, "frequencyHz": 1000, "gainDb": 0 },
          { "bandIndex": 4, "frequencyHz": 2000, "gainDb": 0 },
          { "bandIndex": 5, "frequencyHz": 4000, "gainDb": 0 },
          { "bandIndex": 6, "frequencyHz": 8000, "gainDb": 0 }
        ]
      }
    },
    "downlink": {
      "supported": true,
      "displayName": "Downlink EQ",
      "eqType": "graphic",
      "presets": ["flat", "voice", "music", "movie", "custom"],
      "supportsCustomBands": true,
      "supportsPartialBandUpdate": true,
      "supportsFieldReset": true,
      "supportsAtomicMultiPath": true,
      "requiresAudioRestart": false,
      "bandCount": 7,
      "gainRangeDb": {
        "min": -12,
        "max": 12,
        "step": 0.5
      },
      "bands": [
        { "bandIndex": 0, "frequencyHz": 125, "defaultGainDb": 0 },
        { "bandIndex": 1, "frequencyHz": 250, "defaultGainDb": 0 },
        { "bandIndex": 2, "frequencyHz": 500, "defaultGainDb": 0 },
        { "bandIndex": 3, "frequencyHz": 1000, "defaultGainDb": 0 },
        { "bandIndex": 4, "frequencyHz": 2000, "defaultGainDb": 0 },
        { "bandIndex": 5, "frequencyHz": 4000, "defaultGainDb": 0 },
        { "bandIndex": 6, "frequencyHz": 8000, "defaultGainDb": 0 }
      ],
      "defaultConfig": {
        "enabled": true,
        "preset": "flat",
        "bands": [
          { "bandIndex": 0, "frequencyHz": 125, "gainDb": 0 },
          { "bandIndex": 1, "frequencyHz": 250, "gainDb": 0 },
          { "bandIndex": 2, "frequencyHz": 500, "gainDb": 0 },
          { "bandIndex": 3, "frequencyHz": 1000, "gainDb": 0 },
          { "bandIndex": 4, "frequencyHz": 2000, "gainDb": 0 },
          { "bandIndex": 5, "frequencyHz": 4000, "gainDb": 0 },
          { "bandIndex": 6, "frequencyHz": 8000, "gainDb": 0 }
        ]
      }
    }
  }
}
```

### 6.4 字段说明

| 字段 | 说明 |
|---|---|
| `supported` | 当前设备是否支持该 path 的 EQ。 |
| `displayName` | 面向 UI 的显示名，可选。 |
| `eqType` | `graphic` 或 `parametric`。 |
| `presets` | 支持的 preset 列表。支持自定义 bands 时必须包含 `custom`。 |
| `supportsCustomBands` | 是否支持客户端设置 bands。 |
| `supportsPartialBandUpdate` | 是否允许只更新部分 bands。为 `false` 时，自定义 EQ 设置必须携带完整 `bandCount` 个 band。 |
| `supportsFieldReset` | 是否允许 `resetEqConfig.items` 字段级重置。 |
| `supportsAtomicMultiPath` | 是否支持单次 set/reset 对多个 path 的逻辑原子更新。 |
| `requiresAudioRestart` | 修改该 path 后是否通常需要重启音频链路才能生效。实际返回以 set/reset 的 `state` 为准。 |
| `bandCount` | 图示 EQ 的频段数量。参数 EQ 中表示最大 band 数。 |
| `gainRangeDb` | 允许的增益范围和步进。 |
| `frequencyRangeHz` | 参数 EQ 可选，表示允许的频点范围。 |
| `qRange` | 参数 EQ 可选，表示允许的 Q 值范围。 |
| `bands` | band 能力列表。图示 EQ 必须给出所有固定频点。 |
| `defaultConfig` | reset 的来源，也是 legacy 默认 EQ 读取的标准映射目标。 |

---

## 7. `audio.getEqConfig`

### 7.1 用途

查询当前 EQ 配置。返回值表示当前配置模型中的最终值；当设备用 preset 生成实际 bands 时，响应应返回最终生效 bands，便于 UI 展示和后续编辑。

### 7.2 请求

查询全部已支持 path：

```json
{
  "method": "audio.getEqConfig",
  "params": {}
}
```

查询指定 path：

```json
{
  "method": "audio.getEqConfig",
  "params": {
    "paths": ["uplink"]
  }
}
```

### 7.3 返回

```json
{
  "result": {
    "uplink": {
      "enabled": true,
      "preset": "custom",
      "bands": [
        { "bandIndex": 0, "frequencyHz": 125, "gainDb": -2.0 },
        { "bandIndex": 1, "frequencyHz": 250, "gainDb": -1.0 },
        { "bandIndex": 2, "frequencyHz": 500, "gainDb": 0.0 },
        { "bandIndex": 3, "frequencyHz": 1000, "gainDb": 1.5 },
        { "bandIndex": 4, "frequencyHz": 2000, "gainDb": 2.0 },
        { "bandIndex": 5, "frequencyHz": 4000, "gainDb": 1.0 },
        { "bandIndex": 6, "frequencyHz": 8000, "gainDb": 0.0 }
      ]
    },
    "downlink": {
      "enabled": true,
      "preset": "flat",
      "bands": [
        { "bandIndex": 0, "frequencyHz": 125, "gainDb": 0.0 },
        { "bandIndex": 1, "frequencyHz": 250, "gainDb": 0.0 },
        { "bandIndex": 2, "frequencyHz": 500, "gainDb": 0.0 },
        { "bandIndex": 3, "frequencyHz": 1000, "gainDb": 0.0 },
        { "bandIndex": 4, "frequencyHz": 2000, "gainDb": 0.0 },
        { "bandIndex": 5, "frequencyHz": 4000, "gainDb": 0.0 },
        { "bandIndex": 6, "frequencyHz": 8000, "gainDb": 0.0 }
      ]
    },
    "state": "applied",
    "revision": 42
  }
}
```

规则：

1. `paths` 省略时只返回设备支持的 path。
2. `paths` 指定了设备不支持的 path 时返回 `NOT_SUPPORTED`，不静默忽略。
3. `revision` 可选，用于客户端判断配置是否发生变化。
4. 默认值和范围不在 `getEqConfig` 中重复返回，必须从 `getEqCapabilities` 获取。

---

## 8. `audio.setEqConfig`

### 8.1 用途

设置一个或多个 path 的 EQ 配置。请求支持部分更新：未出现的 path 不变，path 内未出现的字段不变。

### 8.2 设置 preset

```json
{
  "method": "audio.setEqConfig",
  "params": {
    "uplink": {
      "enabled": true,
      "preset": "voice"
    }
  }
}
```

成功响应返回最终配置：

```json
{
  "result": {
    "uplink": {
      "enabled": true,
      "preset": "voice",
      "bands": [
        { "bandIndex": 0, "frequencyHz": 125, "gainDb": -1.0 },
        { "bandIndex": 1, "frequencyHz": 250, "gainDb": 0.0 },
        { "bandIndex": 2, "frequencyHz": 500, "gainDb": 1.0 },
        { "bandIndex": 3, "frequencyHz": 1000, "gainDb": 2.0 },
        { "bandIndex": 4, "frequencyHz": 2000, "gainDb": 1.0 },
        { "bandIndex": 5, "frequencyHz": 4000, "gainDb": 0.0 },
        { "bandIndex": 6, "frequencyHz": 8000, "gainDb": -1.0 }
      ]
    },
    "state": "applied",
    "revision": 43
  }
}
```

### 8.3 设置 custom bands

```json
{
  "method": "audio.setEqConfig",
  "params": {
    "downlink": {
      "enabled": true,
      "preset": "custom",
      "bands": [
        { "bandIndex": 0, "gainDb": -2.0 },
        { "bandIndex": 1, "gainDb": -1.0 },
        { "bandIndex": 2, "gainDb": 0.0 },
        { "bandIndex": 3, "gainDb": 1.5 },
        { "bandIndex": 4, "gainDb": 2.0 },
        { "bandIndex": 5, "gainDb": 1.0 },
        { "bandIndex": 6, "gainDb": 0.0 }
      ]
    }
  }
}
```

成功响应：

```json
{
  "result": {
    "downlink": {
      "enabled": true,
      "preset": "custom",
      "bands": [
        { "bandIndex": 0, "frequencyHz": 125, "gainDb": -2.0 },
        { "bandIndex": 1, "frequencyHz": 250, "gainDb": -1.0 },
        { "bandIndex": 2, "frequencyHz": 500, "gainDb": 0.0 },
        { "bandIndex": 3, "frequencyHz": 1000, "gainDb": 1.5 },
        { "bandIndex": 4, "frequencyHz": 2000, "gainDb": 2.0 },
        { "bandIndex": 5, "frequencyHz": 4000, "gainDb": 1.0 },
        { "bandIndex": 6, "frequencyHz": 8000, "gainDb": 0.0 }
      ]
    },
    "state": "applied",
    "revision": 44
  }
}
```

如果请求省略 `preset` 但携带 `bands`，设备必须按 `preset: "custom"` 处理，并在响应中返回 `custom`。

### 8.4 一次设置多个 path

```json
{
  "method": "audio.setEqConfig",
  "params": {
    "uplink": {
      "enabled": true,
      "preset": "voice"
    },
    "downlink": {
      "enabled": true,
      "preset": "music"
    }
  }
}
```

成功响应：

```json
{
  "result": {
    "uplink": {
      "enabled": true,
      "preset": "voice"
    },
    "downlink": {
      "enabled": true,
      "preset": "music"
    },
    "state": "applied",
    "revision": 45
  }
}
```

### 8.5 参数规则

1. 请求至少包含一个 path。
2. 未出现的 path 保持不变。
3. path 内未出现的字段保持不变。
4. `preset != "custom"` 时，同一 path 请求不得携带 `bands`。
5. 请求显式设置 `preset: "custom"` 时，必须携带非空 `bands`。
6. 仅携带 `bands` 且省略 `preset` 时，设备按 `preset: "custom"` 处理。
7. 设备必须根据 `getEqCapabilities` 中声明的 `presets`、`bandCount`、`gainRangeDb`、`qRange` 和 `supportsCustomBands` 校验入参。
8. `supportsPartialBandUpdate = false` 时，custom 设置必须携带完整 band 列表。
9. `supportsPartialBandUpdate = true` 时，允许只提交变化的 band；响应仍应返回完整最终配置。
10. 同一 path 内不得出现重复 `bandIndex`。
11. set 成功后必须返回最终配置和 `state`，不得只返回 `accepted`。

### 8.6 原子更新策略

单个 `setEqConfig` 请求是逻辑事务。

1. 设备必须先校验所有 path 和字段，再应用任何变化。
2. 如果 `supportsAtomicMultiPath = true`，多 path 请求必须全部成功或全部失败。
3. 如果 `supportsAtomicMultiPath = false`，设备收到多 path 请求时必须返回 `NOT_SUPPORTED`，不得部分应用。
4. 如果应用过程中发生内部错误且无法保证全部 path 已一致回滚，设备必须返回 `INTERNAL_ERROR`，并在 error `data` 中给出 `recoveryRequired: true`。客户端随后应调用 `getEqConfig` 重新同步状态。

---

## 9. `audio.resetEqConfig`

### 9.1 用途

把 EQ 配置恢复为 `audio.getEqCapabilities` 中声明的 `defaultConfig`。reset 不修改设备的默认值定义，只修改当前配置。

### 9.2 重置全部支持的 path

`params` 省略或为空时表示重置全部支持的 EQ path。

```json
{
  "method": "audio.resetEqConfig",
  "params": {}
}
```

成功响应：

```json
{
  "result": {
    "uplink": {
      "enabled": true,
      "preset": "flat",
      "bands": [
        { "bandIndex": 0, "frequencyHz": 125, "gainDb": 0.0 },
        { "bandIndex": 1, "frequencyHz": 250, "gainDb": 0.0 }
      ]
    },
    "downlink": {
      "enabled": true,
      "preset": "flat",
      "bands": [
        { "bandIndex": 0, "frequencyHz": 125, "gainDb": 0.0 },
        { "bandIndex": 1, "frequencyHz": 250, "gainDb": 0.0 }
      ]
    },
    "state": "applied",
    "revision": 46
  }
}
```

### 9.3 重置指定 path

```json
{
  "method": "audio.resetEqConfig",
  "params": {
    "paths": ["uplink"]
  }
}
```

成功响应：

```json
{
  "result": {
    "uplink": {
      "enabled": true,
      "preset": "flat",
      "bands": [
        { "bandIndex": 0, "frequencyHz": 125, "gainDb": 0.0 },
        { "bandIndex": 1, "frequencyHz": 250, "gainDb": 0.0 }
      ]
    },
    "state": "applied",
    "revision": 47
  }
}
```

### 9.4 重置指定字段

字段级 reset 使用 `items`。设备仅在 `supportsFieldReset = true` 时支持。

```json
{
  "method": "audio.resetEqConfig",
  "params": {
    "items": {
      "uplink": ["preset", "bands"],
      "downlink": ["bands"]
    }
  }
}
```

允许字段：

| 字段 | 行为 |
|---|---|
| `all` | 等同于重置该 path 的完整配置。 |
| `enabled` | 恢复默认开关。 |
| `preset` | 恢复默认 preset，并使用默认 preset 对应的最终 bands。 |
| `bands` | 恢复默认 custom bands 缓冲区；如果当前 preset 为 `custom`，当前 bands 同步恢复为默认 bands。 |

规则：

1. `paths` 和 `items` 不得同时出现。
2. `paths` 为空数组无效。
3. `items` 中的字段数组不得为空。
4. 不支持字段级 reset 时返回 `NOT_SUPPORTED`。
5. reset 与 set 使用相同的多 path 原子更新策略。
6. reset 成功后必须返回重置后的当前配置。

---

## 10. `audio.eqConfigChanged`

### 10.1 触发条件

以下场景会触发事件：

1. `audio.setEqConfig` 成功并改变配置。
2. `audio.resetEqConfig` 成功并改变配置。
3. profile、场景或用户配置切换导致 EQ 变化。
4. factory reset 或 restore config 导致 EQ 变化。
5. 设备内部策略改变 EQ 配置。

失败请求不得发送 `audio.eqConfigChanged`。

### 10.2 事件格式

单个 path 变化：

```json
{
  "event": "audio.eqConfigChanged",
  "params": {
    "uplink": {
      "enabled": true,
      "preset": "voice"
    },
    "reason": "user_request",
    "state": "applied",
    "revision": 48
  }
}
```

多个 path 变化：

```json
{
  "event": "audio.eqConfigChanged",
  "params": {
    "uplink": {
      "enabled": true,
      "preset": "voice"
    },
    "downlink": {
      "enabled": true,
      "preset": "music"
    },
    "reason": "profile_changed",
    "state": "applied",
    "revision": 49
  }
}
```

需要重启后生效：

```json
{
  "event": "audio.eqConfigChanged",
  "params": {
    "downlink": {
      "enabled": true,
      "preset": "custom"
    },
    "reason": "user_request",
    "state": "pending_restart",
    "requiresAudioRestart": true,
    "revision": 50
  }
}
```

### 10.3 `reason` 枚举

| 值 | 含义 |
|---|---|
| `user_request` | 来自 AXTP RPC 请求。 |
| `reset_to_default` | reset 到默认值。 |
| `factory_reset` | 恢复出厂导致变化。 |
| `profile_changed` | profile 或场景切换导致变化。 |
| `device_policy` | 设备内部策略调整。 |
| `restore_config` | 配置恢复或导入导致变化。 |
| `unknown` | 原因未知。 |

---

## 11. 错误处理

### 11.1 错误码映射

本文档使用当前 ErrorCode registry 中已有名称。

| 场景 | ErrorCode | 说明 |
|---|---|---|
| 方法存在但当前会话不支持 | `CAPABILITY_METHOD_UNSUPPORTED` 或 `RPC_METHOD_NOT_SUPPORTED` | `capability.supportedMethods` 未暴露对应方法时使用。 |
| 设备不支持 `audio.eq` | `NOT_SUPPORTED` | 设备级不支持。 |
| path 枚举非法 | `RPC_PARAM_INVALID` | 例如 `paths: ["record"]`。 |
| 指定 path 合法但设备不支持该 path | `NOT_SUPPORTED` | error `data.path` 指明 path。 |
| preset 不在能力列表 | `RPC_PARAM_INVALID` | error `data.field` 指明字段。 |
| `preset != custom` 但传入 `bands` | `RPC_PARAM_INVALID` | preset/bands 组合冲突。 |
| `preset = custom` 但 `bands` 缺失或为空 | `RPC_PARAM_INVALID` | 无法构造自定义曲线。 |
| `bandIndex` 重复或超过 `bandCount` | `RPC_PARAM_INVALID` 或 `RPC_PARAM_OUT_OF_RANGE` | 重复用 invalid，越界用 out of range。 |
| `gainDb` / `frequencyHz` / `q` 越界 | `RPC_PARAM_OUT_OF_RANGE` | 返回 min/max/step。 |
| 字段当前 path 不支持，例如图示 EQ 中设置 `q` | `NOT_SUPPORTED` | error `data.field` 指明字段。 |
| 多 path 请求但设备不支持原子多 path 更新 | `NOT_SUPPORTED` | 客户端应拆成单 path 请求。 |
| 音频链路繁忙 | `BUSY` 或 `DEVICE_RESOURCE_BUSY` | 可重试。 |
| 当前设备模式不允许修改 EQ | `INVALID_STATE` 或 `DEVICE_MODE_CONFLICT` | 例如锁定模式、通话保护模式。 |
| 内部应用失败 | `INTERNAL_ERROR` | 需要客户端重新查询当前配置。 |

### 11.2 错误示例

增益越界：

```json
{
  "error": {
    "code": "RPC_PARAM_OUT_OF_RANGE",
    "message": "uplink.bands[0].gainDb is out of range",
    "data": {
      "field": "uplink.bands[0].gainDb",
      "min": -12,
      "max": 12,
      "step": 0.5,
      "actual": 18
    }
  }
}
```

preset/custom 冲突：

```json
{
  "error": {
    "code": "RPC_PARAM_INVALID",
    "message": "bands are only allowed when preset is custom",
    "data": {
      "path": "downlink",
      "field": "downlink.bands",
      "preset": "music"
    }
  }
}
```

path 不支持：

```json
{
  "error": {
    "code": "NOT_SUPPORTED",
    "message": "EQ is not supported on downlink",
    "data": {
      "path": "downlink",
      "capability": "audio.eq"
    }
  }
}
```

多 path 原子更新不支持：

```json
{
  "error": {
    "code": "NOT_SUPPORTED",
    "message": "Atomic multi-path EQ update is not supported",
    "data": {
      "field": "params",
      "paths": ["uplink", "downlink"],
      "supportsAtomicMultiPath": false
    }
  }
}
```

---

## 12. 与 capability 域的关系

AXTP v1 Core 的强制能力发现入口是 `capability.supportedMethods`。客户端可先确认当前会话是否支持：

```text
audio.getEqCapabilities
audio.getEqConfig
audio.setEqConfig
audio.resetEqConfig
```

`audio.getEqCapabilities` 是 audio 域内的细粒度能力查询，负责返回 path、preset、band、范围、默认值等 EQ 专用信息。

二者不是重复关系：

1. `capability.supportedMethods` 判断方法是否可调用。
2. `audio.getEqCapabilities` 判断某个 EQ path 和参数是否可用。
3. v2/P1 的 `capability.getRegistry` 或 `capability.getDomainRegistry` 可以暴露 `audio.eq` capability schema，但不能替代 `audio.getEqCapabilities` 的运行时细节。

Capability ID 使用 `audio.eq`，不使用 `audio.eqConfig`、`audio.uplinkEq` 或 `audio.downlinkEq`。

---

## 13. 与 `audio.algorithm` 的关系

`audio.getAlgorithmCapabilities` 面向通用音频算法配置，例如：

```text
noiseSuppression
echoCancellation
autoGainControl
beamforming
dereverberation
voiceActivityDetection
directionOfArrival
howlingSuppression
```

EQ 不放入以下结构：

```json
{
  "method": "audio.setAlgorithmConfig",
  "params": {
    "eq": {}
  }
}
```

EQ 使用独立方法：

```text
audio.setEqConfig
```

这样可以避免在通用算法配置里引入 path、preset、bandCount、gainRangeDb、qRange、defaultConfig 等 EQ 专用结构。

---

## 14. Legacy 迁移备注

旧协议映射必须以产品 adapter 的实际 payload 为准。下表给出标准 AXTP 方向：

| Legacy 命令 | AXTP 映射方向 | 备注 |
|---|---|---|
| `CommonGetRecordEqParams` | `audio.getEqConfig` | `Record` 通常映射 `uplink`；若旧产品语义不同，由 adapter 指定默认 path。 |
| `CommonSetRecordEqParams` | `audio.setEqConfig` | 通常映射 `uplink` 的 custom bands 或 preset 参数。 |
| `CommonGetDefaultRecordEqParams` | `audio.getEqCapabilities` 的 `uplink.defaultConfig` | 读取默认值，不映射为 `resetEqConfig`。 |
| `CommonSetDefaultRecordEqParams` | 不进入标准 AXTP v1 方法 | 写默认值属于产品策略或工厂/厂商扩展；不得误映射为 `resetEqConfig`。 |
| `CommonGetAudioEqParam` | `audio.getEqConfig` | path 由 legacy adapter 决定，常见为 `downlink` 或产品默认播放链路。 |
| `CommonSetAudioEqParam` | `audio.setEqConfig` | legacy packed value 需要 adapter 解包为 bands 或 preset。 |
| `CommonGetAudioEqMode` | `audio.getEqConfig.preset` | legacy mode 读作 preset。 |
| `CommonSetAudioEqMode` | `audio.setEqConfig.preset` | legacy mode 写作 preset；手动模式映射为 `custom`。 |

`CommonSetAudioEqMode` / `CommonGetAudioEqMode` 的数字枚举不在本文档中固化。进入 `legacyRefs` 前必须确认：

1. 每个 legacy mode 数值对应哪个 preset。
2. legacy mode 是否区分 enable/disable。
3. legacy packed EQ 参数的字节序、位宽和 gain 单位。
4. legacy 命令未携带 path 时默认映射 `uplink`、`downlink` 还是产品默认 path。

---

## 15. Binary-RPC / TLV 映射建议

JSON 协议不暴露数字 ID。Binary-RPC 或 TLV 生成代码可以使用下列内部映射：

```text
pathId:
  0x01 uplink
  0x02 downlink

eqTypeId:
  0x01 graphic
  0x02 parametric

presetId:
  0x00 flat
  0x01 voice
  0x02 music
  0x03 movie
  0xFF custom

filterTypeId:
  0x01 peaking
  0x02 low_shelf
  0x03 high_shelf
  0x04 low_pass
  0x05 high_pass
```

数值字段建议：

| JSON 字段 | Binary/TLV 建议 |
|---|---|
| `gainDb` | `int16 gainDbX10`，例如 `-2.5 dB` 编码为 `-25`。 |
| `frequencyHz` | `uint32 frequencyHz`。 |
| `q` | `uint16 qX100`，例如 `1.25` 编码为 `125`。 |
| `bandIndex` | `uint8 bandIndex`。 |
| `revision` | `uint32 revision`。 |

TLV/repeated 结构中每个 path item 应包含显式 `path` 字段；JSON path map 只是人类可读表达。

---

## 16. Registry 草案条目

Capability 与 event 已在 specs 中预留：

| 类型 | ID | 名称 | 状态 |
|---|---:|---|---|
| Capability | `0x0902` | `audio.eq` | draft |
| Event | `0x0902` | `audio.eqConfigChanged` | draft |

Method registry 中已有旧草案条目：

| methodId | methodName | 说明 |
|---:|---|---|
| `0x0903` | `audio.getEqConfig` | 获取 EQ 配置。 |
| `0x0904` | `audio.setEqConfig` | 设置 EQ 配置。 |

本文档补齐的配置型方法还需要在落 YAML 时分配 methodId：

| methodName | 建议 |
|---|---|
| `audio.getEqCapabilities` | 若保持 append-only，可分配到 audio 域当前已规划范围之后；若重排 audio draft registry，应与 `audio.algorithm` 一起按配置型模板排序。 |
| `audio.resetEqConfig` | 同上。 |

落入 `registry/domains/audio/domain.yaml` 时必须同时补齐：

1. `methods[]`：4 个 method 的 id、bitOffset、requestSchema、responseSchema、capabilities、events、errors。
2. `events[]`：`audio.eqConfigChanged` 的 eventSchema、trigger、capabilities。
3. `capabilities[]`：`audio.eq` 的 schema。
4. `types` 或 `schemas`：本文第 4 章列出的 schema。
5. `legacyMappings`：只登记已确认 payload 和语义的 legacy 命令；未确认的默认值写入命令保持待确认。

---

## 17. 不采用的设计

1. 不拆分 `audio.setUplinkEqConfig` / `audio.setDownlinkEqConfig`。
2. 不把 EQ 塞进 `audio.setAlgorithmConfig.eq`。
3. set/reset 成功后不只返回 `accepted`。
4. 开关使用 `enabled`，生命周期使用 `state`，操作失败使用 ErrorCode；不使用 `status` 表示 EQ 开关。
5. JSON 协议不暴露 `pathId`、`presetId`、`filterTypeId`。
6. 事件名使用 `audio.eqConfigChanged`，不使用 `audio.eqChanged`。
7. EQ 协议不承载周期性音频数据、beam/DOA 结果、频谱数据或录音数据。

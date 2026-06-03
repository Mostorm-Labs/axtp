# AXTP 音频算法配置协议方案

版本：v0.2

归属域：`audio`

Capability ID：`audio.algorithm`

适用范围：运行时音频算法配置、能力查询、配置重置、配置变化通知，以及 legacy AXDP 音频算法命令到新 `domain.feature` 协议的语义映射。

---

## 协议审核标记（人工复核）

| 标记 | 条目 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-OK]` | `audio.algorithm` capability | `audio.algorithm` 是稳定能力块；`algorithmConfig` 只作为 method/event/schema noun，不作为 capability ID。 | 可作为 `registry/domains/audio/domain.yaml` 草案输入。 |
| `[REVIEW-OK]` | 方法与事件 | `audio.getAlgorithmCapabilities` / `audio.getAlgorithmConfig` / `audio.setAlgorithmConfig` / `audio.resetAlgorithmConfig` / `audio.algorithmConfigChanged` 符合配置型 feature 模板。 | 进入 registry 时按 specs/registry 分配或复用 methodId/eventId。 |
| `[REVIEW-OK]` | 配置结构 | 本文采用“算法对象按字段展开”的模型，不使用 `algorithm + config` 元模型。 | schema 可按本文对象结构落入 domain YAML。 |
| `[REVIEW-OK]` | 错误与原子更新 | 已明确参数校验、原子更新、pending restart、错误码映射和事件触发规则。 | registry 草案应同步声明错误码引用和 `updatePolicy`。 |
| `[REVIEW-ASK]` | AXDP `CommonGetAlgAuthContent` / `CommonSetAlgAuthContent` | 授权内容更像 license、auth、vendor 或产测资料，不应默认归入 `audio.algorithm`。 | 人工确认真实语义；若是算法授权写入，应迁到 `auth.license`、`vendor.license` 或 `diagnostic.manufacturing`。 |
| `[REVIEW-ASK]` | AXDP `CommonGetDefault*Level` / `CommonSetDefault*Level` | 旧命令名表示“默认值读写”，不完全等同于 `resetAlgorithmConfig`。 | 确认旧协议是读取出厂默认、写入默认 profile，还是执行 reset；确认后再写 `legacyRefs`。 |
| `[REVIEW-ASK]` | AXDP `CommonPauseAiAlgThrd` / `CommonContinueAiAlgThrd` / `CommonAudioBeamReport` | 这些命令可能是算法运行态控制或 beam/DOA 结果上报，不一定是普通配置写入。 | 人工确认后决定归 `audio.algorithm` 下的状态/动作扩展、`audio.beam` 或 diagnostic。 |

---

## 采纳状态

状态：`adopted`

采纳日期：2026-06-03

采纳范围：仅采纳上表 `[REVIEW-OK]` 覆盖的 `audio.algorithm` capability、4 个配置型 method、1 个配置变化 event、算法对象展开配置模型、错误引用和原子更新规则。

事实源：`registry/domains/audio/domain.yaml`

本次未采纳：所有 `[REVIEW-ASK]` legacy/授权/默认值读写/算法线程/beam report 条目仍为人工待确认问题，不进入 `legacyRefs` 或 YAML。未来协议事实变更必须先更新本文草案并完成评审，再重新执行 adopt-protocol-draft。

---

## 1. 文档定位

`audio.algorithm` 定义设备运行时音频算法的配置面。它回答：

1. 设备支持哪些音频算法。
2. 每个算法支持哪些参数、类型、范围、默认值和枚举值。
3. 当前生效配置是什么。
4. 如何以部分更新方式修改配置。
5. 如何恢复默认配置。
6. 配置变化时如何通知客户端。

本方案是业务协议方案和人工评审输入。采纳后，稳定事实必须写入 `registry/domains/audio/domain.yaml` 或对应 registry YAML，并由 Generator 生成 `protocol/axtp.protocol.yaml` 和 `docs/generated/*`。本文不直接分配 numeric methodId、eventId 或 fieldId；数值以 registry/generated 为准。

---

## 2. 域边界

`audio.algorithm` 负责运行时音频算法参数配置：

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

不属于 `audio.algorithm` 的内容：

| 内容 | 归属建议 | 说明 |
|---|---|---|
| EQ、均衡器、preset/band 配置 | `audio.eq` | EQ 是独立 feature。 |
| 音量、静音、增益状态 | `audio.volume` | AGC 算法配置不等同于用户音量。 |
| 音频路由、输入源、输出源 | `audio.routing` / `audio.input` / `audio.output` | 路由不放入算法配置。 |
| 音频录制、播放业务流 | `audio.recording` / `audio.playback` | 业务流由 audio 相关 feature 创建，数据面走 stream/file。 |
| 算法 license、授权内容、工厂标定 | `auth.license` / `vendor.license` / `diagnostic.manufacturing` | 不作为普通运行时配置。 |
| 产测校准、BQB、工厂测试 | `diagnostic.*` | 不进入用户可配置算法 feature。 |
| beam/DOA 实时结果上报 | `audio.beam` 或后续独立 event | `algorithmConfigChanged` 只表示配置变化，不表示算法计算结果。 |

---

## 3. 命名规则

算法对象名必须使用 lowerCamelCase，不使用缩写作为协议字段：

| 字段名 | 常见缩写 | 说明 |
|---|---|---|
| `noiseSuppression` | NS / ANS | 噪声抑制 |
| `echoCancellation` | AEC | 回声消除 |
| `autoGainControl` | AGC | 自动增益控制 |
| `beamforming` | BF | 波束形成 |
| `dereverberation` | DR | 去混响 |
| `voiceActivityDetection` | VAD | 人声活动检测 |
| `directionOfArrival` | DOA | 声源方向估计 |
| `howlingSuppression` | AHS / FBS | 啸叫抑制 |

禁止使用：

```text
noise_suppression
noise-suppression
NS
AEC
AGC
BF
```

枚举值使用 snake_case，例如 `fixed_direction`、`user_request`、`pending_restart`。

---

## 4. 核心接口

| 类型 | 名称 | 说明 |
|---|---|---|
| capability | `audio.algorithm` | 音频算法配置能力块。 |
| method | `audio.getAlgorithmCapabilities` | 查询算法参数能力、默认值、范围和更新策略。 |
| method | `audio.getAlgorithmConfig` | 查询当前生效算法配置。 |
| method | `audio.setAlgorithmConfig` | 部分更新一个或多个算法配置。 |
| method | `audio.resetAlgorithmConfig` | 将全部、指定算法或指定字段恢复默认值。 |
| event | `audio.algorithmConfigChanged` | 音频算法配置变化通知。 |

`audio.getAlgorithmCapabilities` 是 audio 域内的细粒度能力查询；全局 `capability.getAll` 只负责发现设备是否支持 `audio.algorithm` 能力块，以及该能力块暴露哪些 methods/events。二者不互相替代。

---

## 5. 配置模型

本协议采用算法对象直接展开的配置模型：

```json
{
  "noiseSuppression": {
    "enabled": true,
    "level": 2,
    "mode": "auto"
  },
  "echoCancellation": {
    "enabled": true,
    "tailLengthMs": 128
  }
}
```

不采用下面的元模型：

```json
{
  "algorithm": "noise_suppression",
  "config": {
    "enabled": true,
    "level": 2
  }
}
```

规则：

1. 顶层 key 是算法对象名。
2. 每个算法对象内部只包含该算法的配置字段。
3. `enabled` 表示该算法是否启用。
4. `state` 只用于生命周期或运行状态，不用于表达开关。
5. `status` 不用于表示配置值；RPC 成功或失败由 response status/error 表达。
6. `getAlgorithmConfig` 返回当前最终生效值，不返回能力范围。
7. 默认值、范围、枚举和是否需要音频链路重启由 `getAlgorithmCapabilities` 返回。

---

## 6. 参数基线

以下字段是第一版 schema 基线。设备可以通过 `audio.getAlgorithmCapabilities` 声明某个算法或字段不支持；客户端必须以 capabilities 为准。

### 6.1 noiseSuppression

```json
{
  "noiseSuppression": {
    "enabled": true,
    "mode": "auto",
    "level": 2
  }
}
```

| 字段 | 类型 | 建议范围/枚举 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true / false` | 是否启用噪声抑制。 |
| `mode` | enum | `off / low / medium / high / auto` | 抑制模式。 |
| `level` | uint8 | `0..3` | 抑制强度。 |

### 6.2 echoCancellation

```json
{
  "echoCancellation": {
    "enabled": true,
    "mode": "auto",
    "tailLengthMs": 128,
    "nlpLevel": 2
  }
}
```

| 字段 | 类型 | 建议范围/枚举 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true / false` | 是否启用回声消除。 |
| `mode` | enum | `off / low / medium / high / auto` | AEC 工作模式。 |
| `tailLengthMs` | uint32 | `64..512` ms | 回声尾长；修改可能需要重启音频链路。 |
| `nlpLevel` | uint8 | `0..3` | 非线性处理强度。 |

### 6.3 autoGainControl

```json
{
  "autoGainControl": {
    "enabled": true,
    "targetLevelDb": -18,
    "maxGainDb": 24,
    "attackTimeMs": 10,
    "releaseTimeMs": 200
  }
}
```

| 字段 | 类型 | 建议范围/枚举 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true / false` | 是否启用 AGC。 |
| `targetLevelDb` | int32 | `-36..-6` dB | 目标输出电平。 |
| `maxGainDb` | uint8 | `0..36` dB | 最大增益。 |
| `attackTimeMs` | uint32 | `1..1000` ms | 增益上升响应时间。 |
| `releaseTimeMs` | uint32 | `10..5000` ms | 增益释放时间。 |

### 6.4 beamforming

```json
{
  "beamforming": {
    "enabled": true,
    "mode": "adaptive",
    "lookDirectionDeg": 0,
    "beamWidthDeg": 60
  }
}
```

| 字段 | 类型 | 建议范围/枚举 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true / false` | 是否启用波束形成。 |
| `mode` | enum | `fixed / adaptive / auto` | 波束形成模式。 |
| `lookDirectionDeg` | int32 | `-180..180` degree | 固定波束指向。 |
| `beamWidthDeg` | uint32 | `10..180` degree | 波束宽度。 |

### 6.5 dereverberation

```json
{
  "dereverberation": {
    "enabled": true,
    "mode": "auto",
    "level": 2
  }
}
```

| 字段 | 类型 | 建议范围/枚举 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true / false` | 是否启用去混响。 |
| `mode` | enum | `off / low / medium / high / auto` | 去混响模式。 |
| `level` | uint8 | `0..3` | 去混响强度。 |

### 6.6 voiceActivityDetection

```json
{
  "voiceActivityDetection": {
    "enabled": true,
    "sensitivity": 2,
    "hangoverMs": 200
  }
}
```

| 字段 | 类型 | 建议范围/枚举 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true / false` | 是否启用人声活动检测。 |
| `sensitivity` | uint8 | `0..3` | 检测灵敏度。 |
| `hangoverMs` | uint32 | `0..2000` ms | 语音结束后的保持时间。 |

### 6.7 directionOfArrival

```json
{
  "directionOfArrival": {
    "enabled": true,
    "reportingEnabled": true,
    "reportIntervalMs": 100,
    "smoothingMs": 300
  }
}
```

| 字段 | 类型 | 建议范围/枚举 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true / false` | 是否启用声源方向估计。 |
| `reportingEnabled` | boolean | `true / false` | 是否允许上报 DOA/beam 结果。 |
| `reportIntervalMs` | uint32 | `20..5000` ms | 结果上报间隔。 |
| `smoothingMs` | uint32 | `0..5000` ms | 平滑窗口。 |

`directionOfArrival` 只配置 DOA 算法。DOA 角度、beam 命中、说话人方向等运行结果不放入 `audio.algorithmConfigChanged`，应由后续 `audio.beamInfoReported`、`audio.beamDirectionChanged` 或其他独立事件承载。

### 6.8 howlingSuppression

```json
{
  "howlingSuppression": {
    "enabled": true,
    "mode": "auto",
    "level": 2
  }
}
```

| 字段 | 类型 | 建议范围/枚举 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true / false` | 是否启用啸叫抑制。 |
| `mode` | enum | `off / low / medium / high / auto` | 啸叫抑制模式。 |
| `level` | uint8 | `0..3` | 抑制强度。 |

---

## 7. audio.getAlgorithmCapabilities

### 7.1 用途

`audio.getAlgorithmCapabilities` 查询设备支持的算法、参数能力、默认值、范围、枚举值和更新策略。

### 7.2 请求

查询全部：

```json
{
  "method": "audio.getAlgorithmCapabilities",
  "params": {}
}
```

查询指定算法：

```json
{
  "method": "audio.getAlgorithmCapabilities",
  "params": {
    "items": ["noiseSuppression", "echoCancellation"]
  }
}
```

`items` 不传表示查询全部。`items` 中出现未知算法对象时，设备必须返回 `INVALID_ARGUMENT`。

### 7.3 返回

```json
{
  "result": {
    "capability": "audio.algorithm",
    "updatePolicy": {
      "partialUpdateSupported": true,
      "multiAlgorithmUpdateSupported": true,
      "atomicUpdateSupported": true
    },
    "algorithms": {
      "noiseSuppression": {
        "supported": true,
        "displayName": "Noise Suppression",
        "properties": {
          "enabled": {
            "type": "boolean",
            "defaultValue": true
          },
          "mode": {
            "type": "enum",
            "defaultValue": "auto",
            "values": ["off", "low", "medium", "high", "auto"]
          },
          "level": {
            "type": "uint8",
            "defaultValue": 2,
            "range": {
              "min": 0,
              "max": 3,
              "step": 1
            }
          }
        }
      },
      "echoCancellation": {
        "supported": true,
        "displayName": "Echo Cancellation",
        "properties": {
          "enabled": {
            "type": "boolean",
            "defaultValue": true
          },
          "mode": {
            "type": "enum",
            "defaultValue": "auto",
            "values": ["off", "low", "medium", "high", "auto"]
          },
          "tailLengthMs": {
            "type": "uint32",
            "unit": "ms",
            "defaultValue": 128,
            "range": {
              "min": 64,
              "max": 512,
              "step": 32
            },
            "requiresAudioRestart": true
          },
          "nlpLevel": {
            "type": "uint8",
            "defaultValue": 2,
            "range": {
              "min": 0,
              "max": 3,
              "step": 1
            }
          }
        }
      },
      "autoGainControl": {
        "supported": true,
        "displayName": "Auto Gain Control",
        "properties": {
          "enabled": {
            "type": "boolean",
            "defaultValue": true
          },
          "targetLevelDb": {
            "type": "int32",
            "unit": "dB",
            "defaultValue": -18,
            "range": {
              "min": -36,
              "max": -6,
              "step": 1
            }
          },
          "maxGainDb": {
            "type": "uint8",
            "unit": "dB",
            "defaultValue": 24,
            "range": {
              "min": 0,
              "max": 36,
              "step": 1
            }
          }
        }
      }
    }
  }
}
```

### 7.4 字段定义

| 字段 | 类型 | 说明 |
|---|---|---|
| `capability` | string | 固定为 `audio.algorithm`。 |
| `updatePolicy.partialUpdateSupported` | boolean | 是否支持只传入要修改的字段。 |
| `updatePolicy.multiAlgorithmUpdateSupported` | boolean | 是否支持一次请求修改多个算法对象。 |
| `updatePolicy.atomicUpdateSupported` | boolean | 是否保证一次 set/reset 要么全部生效，要么全部不生效。 |
| `algorithms.<name>.supported` | boolean | 设备是否支持该算法对象。 |
| `algorithms.<name>.displayName` | string | UI 可读名称。 |
| `algorithms.<name>.properties` | object | 参数能力表。 |
| `type` | enum | `boolean / enum / uint8 / uint16 / uint32 / int32 / float / string / object / array`。 |
| `defaultValue` | any | 默认值。 |
| `range` | object | 数值范围，包含 `min / max / step`。 |
| `values` | array | enum 可选值。 |
| `unit` | string | 单位，例如 `ms / dB / degree`。 |
| `requiresAudioRestart` | boolean | 修改该字段后是否需要重启音频链路或重建音频 pipeline。 |

---

## 8. audio.getAlgorithmConfig

### 8.1 用途

`audio.getAlgorithmConfig` 查询当前最终生效的算法配置。

### 8.2 请求

查询全部：

```json
{
  "method": "audio.getAlgorithmConfig",
  "params": {}
}
```

查询指定算法：

```json
{
  "method": "audio.getAlgorithmConfig",
  "params": {
    "items": ["noiseSuppression", "autoGainControl"]
  }
}
```

### 8.3 返回

```json
{
  "result": {
    "noiseSuppression": {
      "enabled": true,
      "mode": "auto",
      "level": 2
    },
    "autoGainControl": {
      "enabled": true,
      "targetLevelDb": -18,
      "maxGainDb": 24,
      "attackTimeMs": 10,
      "releaseTimeMs": 200
    }
  }
}
```

规则：

1. 返回当前最终生效值。
2. 不支持的算法不应出现在 config 返回中；是否支持由 `getAlgorithmCapabilities` 表达。
3. 不返回默认值、范围和枚举；这些内容由 `getAlgorithmCapabilities` 表达。
4. 指定 `items` 时只返回请求的支持项。
5. 指定未知算法对象时返回 `INVALID_ARGUMENT`。

---

## 9. audio.setAlgorithmConfig

### 9.1 用途

`audio.setAlgorithmConfig` 部分更新一个或多个算法对象的配置。只传入需要修改的字段；未传入字段保持当前值。

### 9.2 请求

设置单个算法：

```json
{
  "method": "audio.setAlgorithmConfig",
  "params": {
    "noiseSuppression": {
      "enabled": true,
      "level": 3
    }
  }
}
```

一次设置多个算法：

```json
{
  "method": "audio.setAlgorithmConfig",
  "params": {
    "noiseSuppression": {
      "enabled": true,
      "level": 3
    },
    "echoCancellation": {
      "enabled": true,
      "tailLengthMs": 256
    },
    "autoGainControl": {
      "enabled": true,
      "targetLevelDb": -18,
      "maxGainDb": 24
    }
  }
}
```

### 9.3 返回

成功后返回本次涉及算法的最终生效值：

```json
{
  "result": {
    "applyState": "applied",
    "requiresAudioRestart": false,
    "config": {
      "noiseSuppression": {
        "enabled": true,
        "mode": "auto",
        "level": 3
      }
    }
  }
}
```

如果修改项需要重启音频链路后完全生效：

```json
{
  "result": {
    "applyState": "pending_restart",
    "requiresAudioRestart": true,
    "config": {
      "echoCancellation": {
        "enabled": true,
        "mode": "auto",
        "tailLengthMs": 256,
        "nlpLevel": 2
      }
    }
  }
}
```

`applyState` 枚举：

| 值 | 说明 |
|---|---|
| `applied` | 已立即生效。 |
| `pending_restart` | 配置已保存，需重启音频链路或重建 pipeline 后完全生效。 |

### 9.4 更新规则

1. 设备必须根据 `getAlgorithmCapabilities` 声明的类型、范围、枚举和支持状态校验入参。
2. 不支持的算法对象返回 `NOT_SUPPORTED`。
3. 不支持的字段返回 `INVALID_ARGUMENT`。
4. 数值越界返回 `OUT_OF_RANGE`。
5. 参数组合冲突返回 `INVALID_STATE` 或 `INVALID_ARGUMENT`，并在 `data` 中说明冲突字段。
6. 一次请求必须按原子更新处理。校验失败时不得修改任何字段，也不得发送 `audio.algorithmConfigChanged`。
7. 如果设备不能保证多算法原子更新，应在 capabilities 中声明 `multiAlgorithmUpdateSupported=false` 或 `atomicUpdateSupported=false`；客户端不得发送多算法更新。
8. set 成功后必须返回最终配置值，不得只返回 accepted。
9. set 成功后必须发送一次 `audio.algorithmConfigChanged`，事件内容应只包含实际变化的字段或变化后的相关算法对象。

---

## 10. audio.resetAlgorithmConfig

### 10.1 用途

`audio.resetAlgorithmConfig` 将配置恢复为 `getAlgorithmCapabilities` 中声明的 `defaultValue`。它是执行 reset，不是读取或写入“默认 profile”。

### 10.2 请求

重置全部算法：

```json
{
  "method": "audio.resetAlgorithmConfig",
  "params": {
    "items": "all"
  }
}
```

重置指定算法：

```json
{
  "method": "audio.resetAlgorithmConfig",
  "params": {
    "items": ["noiseSuppression", "echoCancellation"]
  }
}
```

重置指定算法的部分字段：

```json
{
  "method": "audio.resetAlgorithmConfig",
  "params": {
    "items": {
      "noiseSuppression": ["level", "mode"],
      "autoGainControl": ["targetLevelDb", "maxGainDb"]
    }
  }
}
```

### 10.3 返回

```json
{
  "result": {
    "applyState": "applied",
    "requiresAudioRestart": false,
    "config": {
      "noiseSuppression": {
        "enabled": true,
        "mode": "auto",
        "level": 2
      }
    }
  }
}
```

规则：

1. reset 后返回重置项的最终生效值。
2. 默认值来自 `audio.getAlgorithmCapabilities` 中的 `defaultValue`。
3. reset 同样遵守 set 的校验、原子更新和 `pending_restart` 规则。
4. `items` 未传时不应默认重置全部；客户端必须显式传 `"all"`、数组或字段映射，避免误操作。
5. 旧协议中“默认值读写”命令不得自动等同于 reset，必须经人工确认后映射。

---

## 11. audio.algorithmConfigChanged

### 11.1 触发条件

以下情况必须发送 `audio.algorithmConfigChanged`：

1. `audio.setAlgorithmConfig` 成功并导致配置变化。
2. `audio.resetAlgorithmConfig` 成功并导致配置变化。
3. profile 切换、恢复配置、factory reset 或设备策略导致算法配置变化。

以下情况不发送该事件：

1. set/reset 请求校验失败。
2. set/reset 请求成功但配置值没有实际变化。
3. DOA/beam 实时结果上报。
4. 音频链路运行状态变化但配置未变。

### 11.2 事件格式

```json
{
  "event": "audio.algorithmConfigChanged",
  "params": {
    "reason": "user_request",
    "applyState": "applied",
    "requiresAudioRestart": false,
    "config": {
      "noiseSuppression": {
        "enabled": true,
        "mode": "auto",
        "level": 3
      }
    },
    "changedFields": [
      "noiseSuppression.level"
    ]
  }
}
```

一次变化多个算法：

```json
{
  "event": "audio.algorithmConfigChanged",
  "params": {
    "reason": "user_request",
    "applyState": "pending_restart",
    "requiresAudioRestart": true,
    "config": {
      "noiseSuppression": {
        "enabled": true,
        "level": 3
      },
      "echoCancellation": {
        "enabled": true,
        "tailLengthMs": 256
      }
    },
    "changedFields": [
      "noiseSuppression.level",
      "echoCancellation.tailLengthMs"
    ]
  }
}
```

### 11.3 reason 枚举

| 值 | 说明 |
|---|---|
| `user_request` | 用户或客户端调用 set/reset。 |
| `reset_to_default` | reset 恢复默认值。 |
| `factory_reset` | 设备恢复出厂导致配置变化。 |
| `profile_changed` | profile 或场景模式切换导致配置变化。 |
| `device_policy` | 设备内部策略调整配置。 |
| `restore_config` | 导入或恢复配置。 |
| `unknown` | 未知原因。 |

---

## 12. 错误处理

错误码必须引用正式 ErrorCode registry。本文只描述 `audio.algorithm` 的推荐映射，不新增局部错误名。

| 错误码 | 场景 | retryable |
|---|---|---:|
| `NOT_SUPPORTED` | 设备不支持 `audio.algorithm`、指定算法对象或当前模式下不支持该算法。 | 否 |
| `INVALID_ARGUMENT` | 参数类型错误、未知字段、未知算法对象、非法枚举、非法字段组合。 | 否 |
| `OUT_OF_RANGE` | 数值超出 capabilities 声明的范围。 | 否 |
| `INVALID_STATE` | 当前音频链路状态不允许修改，例如录制中禁止修改 AEC tail length。 | 否 |
| `BUSY` | 音频链路繁忙，可稍后重试。 | 是 |
| `PERMISSION_DENIED` | 当前会话权限不足。 | 否 |
| `INTERNAL_ERROR` | 设备内部应用配置失败。 | 否 |

错误示例：

```json
{
  "error": {
    "code": "OUT_OF_RANGE",
    "message": "noiseSuppression.level out of range",
    "data": {
      "field": "noiseSuppression.level",
      "value": 5,
      "min": 0,
      "max": 3
    }
  }
}
```

参数组合冲突示例：

```json
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "beamforming.lookDirectionDeg is required when beamforming.mode is fixed",
    "data": {
      "field": "beamforming.lookDirectionDeg",
      "dependsOn": "beamforming.mode",
      "expected": "fixed mode requires lookDirectionDeg"
    }
  }
}
```

`requiresAudioRestart` 不应作为错误返回。配置可保存但需重启音频链路时，应成功返回 `applyState=pending_restart`。

---

## 13. Legacy AXDP 映射审查

以下表格用于人工审查旧 AXDP 命令与新 `audio.algorithm` 的关联。标记为“待确认”的条目不得直接写入稳定 `legacyRefs`。

| AXDP 命令 | 旧 ID | 新方法候选 | 审查结论 |
|---|---|---|---|
| `CommonGetNoiseSuppressionLevel` | `0xC004E / 0x004E -> 0x00CE` | `audio.getAlgorithmConfig` | 可映射到 `noiseSuppression.level`。 |
| `CommonSetNoiseSuppressionLevel` | `0xC004F / 0x004F -> 0x00CF` | `audio.setAlgorithmConfig` | 可映射到 `noiseSuppression.level`。 |
| `CommonGetReverberationSuppressionLevel` | `0xC0051 / 0x0051 -> 0x00D1` | `audio.getAlgorithmConfig` | 可映射到 `dereverberation.level` 或 `reverberationSuppression.level`，字段名需人工确认。 |
| `CommonSetReverberationSuppressionLevel` | `0xC0052 / 0x0052 -> 0x00D2` | `audio.setAlgorithmConfig` | 可映射到 `dereverberation.level` 或 `reverberationSuppression.level`，字段名需人工确认。 |
| `CommonGetEchoCancellationLevel` | `0xC0053 / 0x0053 -> 0x00D3` | `audio.getAlgorithmConfig` | 可映射到 `echoCancellation.nlpLevel` 或 `echoCancellation.mode/level`，字段需确认。 |
| `CommonSetEchoCancellationLevel` | `0xC0054 / 0x0054 -> 0x00D4` | `audio.setAlgorithmConfig` | 可映射到 `echoCancellation.nlpLevel` 或 `echoCancellation.mode/level`，字段需确认。 |
| `CommonResetAudioAlgorithmParams` | `0xC0060 / 0x0060 -> 0x00E0` | `audio.resetAlgorithmConfig` | 可映射为 reset 全部或指定算法，需确认 payload 是否带范围。 |
| `CommonSetAlgoEnable` | `0xC006B / 0x006B -> 0x00EB` | `audio.setAlgorithmConfig` | 可映射到一个或多个算法的 `enabled`，需确认旧 bitmask/枚举含义。 |
| `CommonGetAlgoEnable` | `0xC006C / 0x006C -> 0x00EC` | `audio.getAlgorithmConfig` | 可映射到 `enabled` 字段集合，需确认返回结构。 |
| `CommonGetDereverationAlgParam` | `0xC0149 / 0x0149 -> 0x01C9` | `audio.getAlgorithmConfig` | 可映射到 `dereverberation` 对象。 |
| `CommonSetDereverationAlgParam` | `0xC014A / 0x014A -> 0x01CA` | `audio.setAlgorithmConfig` | 可映射到 `dereverberation` 对象。 |
| `CommonGetDefaultNoiseSuppressionLevel` | `0xC0057 / 0x0057 -> 0x00D7` | 待确认 | 若只是读取默认值，应由 `getAlgorithmCapabilities.defaultValue` 覆盖；若写默认 profile，需要另行确认归属。 |
| `CommonSetDefaultNoiseSuppressionLevel` | `0xC0058 / 0x0058 -> 0x00D8` | 待确认 | 不应自动映射为 reset；需确认旧协议是否修改默认 profile。 |
| `CommonGetDefaultReverberationSuppressionLevel` | `0xC0059 / 0x0059 -> 0x00D9` | 待确认 | 同默认值读写规则。 |
| `CommonSetDefaultReverberationSuppressionLevel` | `0xC005A / 0x005A -> 0x00DA` | 待确认 | 同默认值读写规则。 |
| `CommonGetDefaultEchoCancellationLevel` | `0xC005B / 0x005B -> 0x00DB` | 待确认 | 同默认值读写规则。 |
| `CommonSetDefaultEchoCancellationLevel` | `0xC005C / 0x005C -> 0x00DC` | 待确认 | 同默认值读写规则。 |
| `CommonGetAlgAuthContent` | `0xC0044 / 0x0044 -> 0x00C4` | 待确认 | 授权内容不应默认归 `audio.algorithm`。 |
| `CommonSetAlgAuthContent` | `0xC0045 / 0x0045 -> 0x00C5` | 待确认 | 授权内容不应默认归 `audio.algorithm`。 |
| `CommonPauseAiAlgThrd` | `0xC0117 / 0x0117 -> 0x0197` | 待确认 | 可能是算法线程运行态控制，不一定是配置。 |
| `CommonContinueAiAlgThrd` | `0xC0118 / 0x0118 -> 0x0198` | 待确认 | 可能是算法线程运行态控制，不一定是配置。 |
| `CommonAudioBeamReport` | `0xC0201 / 0x0201 -> 0x0281` | 待确认 | 可能是 beam/DOA 上报开关或结果上报，不应直接放入 `algorithmConfigChanged`。 |

Rooms 和 VM33 中的 beam map、speaker highlight、AGC mode 等条目可作为后续映射输入，但由于 Rooms 已在设备中使用、VM33 原通道为 HTTP，本文仅定义新 AXTP 目标协议，不重写旧协议 envelope。

---

## 14. Registry 草案输入

本文已采纳，domain YAML 包含以下事实：

```yaml
capabilities:
  - id: audio.algorithm
    name: Audio algorithm configuration
    methods:
      - audio.getAlgorithmCapabilities
      - audio.getAlgorithmConfig
      - audio.setAlgorithmConfig
      - audio.resetAlgorithmConfig
    events:
      - audio.algorithmConfigChanged
```

method/event/capability numeric ID 以 registry 为准。当前 specs 中已规划：

| 对象 | 规划状态 |
|---|---|
| `audio.algorithm` | 见 `docs/specs/13-AXTP-Types-and-Capability-Spec.md`。 |
| `audio.getAlgorithmCapabilities` / `audio.getAlgorithmConfig` / `audio.setAlgorithmConfig` / `audio.resetAlgorithmConfig` | 见 `docs/specs/10-AXTP-Methods-Registry-Spec.md`。 |
| `audio.algorithmConfigChanged` | 见 `docs/specs/11-AXTP-Events-Registry-Spec.md`。 |

---

## 15. Binary-RPC / TLV 映射建议

JSON-RPC 中必须使用 lowerCamelCase 算法对象名。Binary-RPC/TLV 可以为算法对象和参数分配数字 ID，但数字 ID 不暴露到 JSON 协议。

建议算法 ID：

| algorithmId | 算法对象 |
|---:|---|
| `0x01` | `noiseSuppression` |
| `0x02` | `echoCancellation` |
| `0x03` | `autoGainControl` |
| `0x04` | `beamforming` |
| `0x05` | `dereverberation` |
| `0x06` | `voiceActivityDetection` |
| `0x07` | `directionOfArrival` |
| `0x08` | `howlingSuppression` |

TLV schema 生成时应保持以下语义：

1. JSON 字段名和 TLV fieldId 一一对应。
2. enum 的数值由 schema/registry 固化，不由业务代码临时定义。
3. 未知 fieldId 必须按 schema 兼容规则处理。
4. legacy adapter 可以把 AXDP commandId 映射到新 method 和字段路径，但不得把旧 commandId 作为新协议字段。

---

## 16. 验收标准

本文进入 registry 草案前必须满足：

1. capability 使用 `audio.algorithm`，不使用 `audio.algorithmConfig`。
2. 方法只使用 `audio.getAlgorithmCapabilities`、`audio.getAlgorithmConfig`、`audio.setAlgorithmConfig`、`audio.resetAlgorithmConfig`。
3. 事件只使用 `audio.algorithmConfigChanged` 表示配置变化。
4. 配置结构按算法对象展开，不使用 `algorithm + config` 元模型。
5. 至少覆盖 8 个算法对象：`noiseSuppression`、`echoCancellation`、`autoGainControl`、`beamforming`、`dereverberation`、`voiceActivityDetection`、`directionOfArrival`、`howlingSuppression`。
6. set/reset 支持部分更新，并明确原子更新策略。
7. set/reset 成功后返回最终生效值。
8. 需要重启音频链路时返回 `applyState=pending_restart`，不作为错误。
9. DOA/beam 结果不上报到 `audio.algorithmConfigChanged`。
10. AXDP 授权、默认值写入、算法线程控制、beam report 等疑点经人工确认后再写入稳定 `legacyRefs`。
11. 采纳后同步更新 `registry/domains/audio/domain.yaml`、method registry、event registry、capability registry 和 generated artifacts。

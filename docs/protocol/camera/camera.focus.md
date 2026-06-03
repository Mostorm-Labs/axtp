# Camera Focus 协议方案 v0.2

## 协议审核标记（人工复核）

| 标记 | 对象 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-OK]` | `camera.focus` capability | 对焦属于摄像头采集链路与镜头控制能力，归 `camera.focus`，不归 `video.framing` 或 `diagnostic.*`。 | 可作为 `camera` domain YAML 草案输入。 |
| `[REVIEW-OK]` | `camera.getFocusState` / `camera.triggerAutoFocus` | 两个方法已出现在 registry spec 草案中，方向符合动作型与状态型命名。 | 进入 source registry 时同步 schema、errors、events。 |
| `[REVIEW-FIX]` | 原文方法清单 | 原草案缺少 region 持久配置和手动 jog 语义，无法完整覆盖 VM33 `Focus.SetFocusRegion` 与 `Focus.Manual`。 | 本版新增候选方法 `camera.setFocusRegion` / `camera.getFocusRegion` / `camera.startFocusMove`，其中 `startFocusMove` 为 legacy/高级能力可选项。 |
| `[REVIEW-FIX]` | VM33 `Focus.SetFocus` | 分类表曾将其映射到 `camera.triggerAutoFocus`，但原文参数 `pos` 是绝对镜头位置，范围 `0..1478`。 | 修正为 `camera.setFocusPosition`。 |
| `[REVIEW-ASK]` | AXDP `CommonSetLensCenter` | 源码扫描只确认 `uint32 BE value`，接收侧 case 为空；名称可能表示中心区域 AF、镜头机械归中或校准动作。 | 设备实现确认前不得写入正式 `legacyRefs`；仅可按第 18 节规则做 adapter-only 映射。 |
| `[REVIEW-ASK]` | AXDP `CommonSetAutoFocusState` / `CommonGetAutoFocusState` | 当前可暂映射到 `camera.setFocusMode` / `camera.getFocusMode`，但旧 `EnableState` 的取值域仍需确认。 | 先按 `0=manual, 1=auto` 做兼容建议；多值枚举必须补充旧协议定义后再进入 registry。 |

## 1. 文档定位

本文定义 `camera.focus` 的运行时控制协议草案，用于沉淀方法、事件、字段、错误和 legacy 迁移规则。它位于 `docs/protocol/`，因此仍是评审输入；只有写入 `registry/` 或 `registry/domains/camera/domain.yaml` 后，才成为生成路径的正式协议事实源。

本文覆盖：

- 自动对焦、连续自动对焦、单次自动对焦。
- 手动对焦模式与绝对对焦位置。
- 自动对焦目标，包括中心、全画面、点选和区域。
- 可选的手动 jog 对焦动作，用于兼容 `near/far + enable` 类旧协议。
- 对焦状态查询与状态变化事件。
- AXDP、VM33 旧协议迁移建议。

本文不覆盖：

- 变焦、光学变倍、数字变倍，它们归 `camera.zoom`。
- PTZ pan/tilt/zoom 联动，它们归 `camera.ptz` 或 `camera.zoom`。
- AF calibration、镜头标定、产测校准，它们归 `camera.calibration` 或 `diagnostic.*`。
- 视频构图、人物追踪、画面裁切，它们归 `video.framing`。

## 2. 域边界

| 能力 | 归属 | 说明 |
|---|---|---|
| 对焦模式 | `camera.focus` | `manual`、`auto`、`continuous_auto`、`one_shot_auto`、`fixed`。 |
| 手动对焦位置 | `camera.focus` | 运行时设置或查询镜头对焦位置。 |
| 自动对焦触发 | `camera.focus` | 中心、全画面、点选或区域的一次性 AF 动作。 |
| 手动 jog 对焦 | `camera.focus` | `near/far` 方向移动，通常需要 `stopFocus` 停止。 |
| 光学/数字变倍 | `camera.zoom` | 包括 `Focus.ManualZoom`、`DigitalZoom`、`OpticsZoom` 等旧接口。 |
| AF calibration | `camera.calibration` | 设备级镜头/AF 标定，不是普通运行时对焦。 |
| 产测校准 | `diagnostic.*` | 工厂、维修、测试流程。 |

边界规则：

```text
camera.focus
  普通用户态或业务态对焦控制。

camera.calibration
  设备维护态的镜头、AF 或传感器标定。

diagnostic.*
  产测、维修、实验性测试命令。

video.framing
  根据人物、白板、区域或场景进行画面构图。
```

## 3. 核心模型

所有方法都可以携带可选 `cameraId`。省略 `cameraId` 时，设备必须使用当前默认摄像头或主摄像头。

```json
{
  "cameraId": "main"
}
```

`camera.focus` 由以下对象组成：

| 对象 | 字段 | 说明 |
|---|---|---|
| 能力 | `supported`、`modes`、`position`、`region`、`manualMove` | 描述设备支持哪些对焦能力。 |
| 模式 | `mode` | 当前对焦控制模式。 |
| 位置 | `position` | 能力范围内的绝对镜头位置，使用设备原生步进。 |
| 区域 | `target`、`point`、`region` | 自动对焦目标。 |
| 动作 | `operationId`、`accepted`、`state` | 一次异步对焦或移动动作。 |
| 状态 | `state`、`confidence`、`reason` | 当前对焦状态与原因。 |

### 3.1 对焦模式枚举

| 值 | 含义 | 说明 |
|---|---|---|
| `manual` | 手动对焦 | 上位机通过 `position` 或 `startFocusMove` 控制镜头。 |
| `auto` | 自动对焦 | 兼容型自动模式；设备可映射到默认 AF 行为。 |
| `continuous_auto` | 连续自动对焦 | 设备持续根据画面变化调整焦点。 |
| `one_shot_auto` | 单次自动对焦 | 触发一次对焦，完成后进入稳定状态。 |
| `fixed` | 固定焦 | 设备镜头固定或运行时不可调焦。 |

`unsupported` 不作为 `mode` 返回。设备不支持对焦时，应在能力中返回 `supported=false`，或对相关方法返回 `RPC_METHOD_NOT_FOUND`。

### 3.2 对焦状态枚举

| 值 | 含义 |
|---|---|
| `idle` | 当前没有进行中的对焦动作。 |
| `moving` | 手动 jog 或镜头移动中。 |
| `focusing` | 自动对焦中。 |
| `focused` | 已完成对焦。 |
| `failed` | 对焦失败。 |
| `locked` | 焦点已锁定。 |
| `unavailable` | 摄像头未打开、链路不可用或被校准流程占用。 |

### 3.3 自动对焦目标

| 值 | 含义 | 参数 |
|---|---|---|
| `center` | 画面中心 | 无。 |
| `full_frame` | 全画面 | 无。 |
| `point` | 点选对焦 | `point.x`、`point.y`。 |
| `region` | 区域对焦 | `region.x`、`region.y`、`region.width`、`region.height`。 |

坐标默认使用 `normalized`，原点为画面左上角，取值范围为 `0.0..1.0`。`region.x + region.width` 和 `region.y + region.height` 必须小于等于 `1.0`。

### 3.4 手动移动方向

| 值 | 含义 |
|---|---|
| `near` | 向近焦方向移动。 |
| `far` | 向远焦方向移动。 |

## 4. 方法与事件清单

### 4.1 方法

| 方法 | 状态 | MVP | 说明 |
|---|---|---:|---|
| `camera.getFocusCapabilities` | candidate | 是 | 查询对焦能力。 |
| `camera.setFocusMode` | candidate | 是 | 设置对焦模式。 |
| `camera.getFocusMode` | candidate | 是 | 查询对焦模式。 |
| `camera.setFocusPosition` | candidate | 是 | 设置绝对手动对焦位置。 |
| `camera.getFocusPosition` | candidate | 是 | 查询绝对手动对焦位置。 |
| `camera.setFocusRegion` | candidate | 否 | 设置持久自动对焦点或区域。 |
| `camera.getFocusRegion` | candidate | 否 | 查询持久自动对焦点或区域。 |
| `camera.triggerAutoFocus` | specs draft `0x0708` | 是 | 触发一次自动对焦。 |
| `camera.startFocusMove` | candidate | 否 | 按 `near/far` 方向开始手动移动，用于 jog 兼容。 |
| `camera.stopFocus` | candidate | 否 | 停止自动对焦、连续对焦、扫描或手动 jog。 |
| `camera.getFocusState` | specs draft `0x0707` | 是 | 查询当前对焦状态。 |

说明：`docs/specs/10-AXTP-Methods-Registry-Spec.md` 已列出 `camera.getFocusState` 和 `camera.triggerAutoFocus`。当前 source registry YAML 尚未落地 `camera.*`，因此本文其他方法暂不分配 methodId。

### 4.2 事件

| 事件 | 状态 | 说明 |
|---|---|---|
| `camera.focusStateChanged` | specs draft `0x0704` | 对焦状态变化。 |
| `camera.focusModeChanged` | candidate | 对焦模式变化。 |
| `camera.focusPositionChanged` | candidate | 手动对焦位置变化。 |
| `camera.focusRegionChanged` | candidate | 持久对焦点或区域变化。 |

## 5. `camera.getFocusCapabilities`

查询设备对焦能力范围。能力查询必须可在摄像头未打开时调用；如果设备需要打开摄像头才能得到动态能力，应返回静态能力并在 `dynamic=true` 标明。

请求：

```json
{
  "method": "camera.getFocusCapabilities",
  "params": {
    "cameraId": "main"
  }
}
```

返回：

```json
{
  "result": {
    "cameraId": "main",
    "supported": true,
    "modes": ["manual", "auto", "continuous_auto", "one_shot_auto"],
    "defaultMode": "continuous_auto",
    "position": {
      "supported": true,
      "min": 0,
      "max": 1478,
      "step": 1,
      "defaultValue": 512,
      "unit": "device_steps"
    },
    "region": {
      "supported": true,
      "targets": ["center", "full_frame", "point", "region"],
      "coordinateUnit": "normalized",
      "persistent": true
    },
    "manualMove": {
      "supported": true,
      "directions": ["near", "far"],
      "speed": {
        "min": 1,
        "max": 100,
        "step": 1,
        "defaultValue": 50
      }
    },
    "triggerAutoFocus": {
      "supported": true,
      "operationIdSupported": true
    },
    "stopFocus": {
      "supported": true
    },
    "state": {
      "supported": true,
      "events": ["camera.focusStateChanged"]
    }
  }
}
```

规则：

- `modes` 必须只包含设备真实支持的模式。
- `position.max` 使用设备原生步进，不强制统一为 `1023` 或 `100`。
- 如果设备固定焦，应返回 `supported=true`、`modes=["fixed"]`、`position.supported=false`、`triggerAutoFocus.supported=false`。
- 如果设备完全不支持 focus 控制，应返回 `supported=false`，其他能力对象可省略。

## 6. `camera.setFocusMode`

设置对焦模式。

请求：

```json
{
  "method": "camera.setFocusMode",
  "params": {
    "cameraId": "main",
    "mode": "manual"
  }
}
```

返回：

```json
{
  "result": {
    "cameraId": "main",
    "mode": "manual",
    "state": "idle"
  }
}
```

规则：

- `mode` 必须存在于 `getFocusCapabilities.modes`。
- 切换到 `manual` 不应隐式改变 `position`，除非设备固件只能在切换时归位；这种行为必须通过事件报告。
- 切换到 `continuous_auto` 后，设备可以立即进入 `focusing`，也可以保持 `focused` 或 `idle`，但必须在返回值或事件中报告实际 `state`。
- `fixed` 通常是只读能力。只有设备明确支持切换到固定焦锁定模式时，才允许 `setFocusMode(mode="fixed")`。

事件：

```json
{
  "event": "camera.focusModeChanged",
  "params": {
    "cameraId": "main",
    "mode": "manual",
    "reason": "user_request"
  }
}
```

## 7. `camera.getFocusMode`

查询当前对焦模式。

请求：

```json
{
  "method": "camera.getFocusMode",
  "params": {
    "cameraId": "main"
  }
}
```

返回：

```json
{
  "result": {
    "cameraId": "main",
    "mode": "manual"
  }
}
```

## 8. `camera.setFocusPosition`

设置绝对手动对焦位置。

请求：

```json
{
  "method": "camera.setFocusPosition",
  "params": {
    "cameraId": "main",
    "position": 320,
    "applyMode": "require_manual"
  }
}
```

返回：

```json
{
  "result": {
    "cameraId": "main",
    "position": 320,
    "mode": "manual",
    "state": "idle"
  }
}
```

`applyMode` 取值：

| 值 | 说明 |
|---|---|
| `require_manual` | 默认值。当前不是 `manual` 时返回 `DEVICE_MODE_CONFLICT`。 |
| `switch_to_manual` | 设备支持原子切换时，可先切到 `manual` 再设置位置。 |

规则：

- `position` 必须落在 `getFocusCapabilities.position` 的范围内，并满足 `step`。
- `position` 是设备原生步进值，不能假设所有设备都是 `0..1023`。
- 当前模式不是 `manual` 且 `applyMode=require_manual` 时，必须返回 `DEVICE_MODE_CONFLICT`。
- 如果 `applyMode=switch_to_manual` 被接受，设备必须同时发送 `camera.focusModeChanged` 和 `camera.focusPositionChanged`，或在响应中明确返回最终 `mode` 与 `position`。

事件：

```json
{
  "event": "camera.focusPositionChanged",
  "params": {
    "cameraId": "main",
    "position": 320,
    "mode": "manual",
    "reason": "user_request"
  }
}
```

## 9. `camera.getFocusPosition`

查询当前手动对焦位置。

请求：

```json
{
  "method": "camera.getFocusPosition",
  "params": {
    "cameraId": "main"
  }
}
```

返回：

```json
{
  "result": {
    "cameraId": "main",
    "position": 320,
    "range": {
      "min": 0,
      "max": 1478,
      "step": 1,
      "unit": "device_steps"
    },
    "mode": "manual"
  }
}
```

如果设备处于自动模式但仍能报告镜头当前位置，可以照常返回 `position`，并将 `mode` 返回为当前自动模式。

## 10. `camera.setFocusRegion`

设置持久自动对焦点或区域。该方法只配置目标区域，不一定立即触发一次 AF。需要立即执行时，使用 `camera.triggerAutoFocus`。

请求：点选对焦

```json
{
  "method": "camera.setFocusRegion",
  "params": {
    "cameraId": "main",
    "target": "point",
    "point": {
      "x": 0.875,
      "y": 0.426,
      "unit": "normalized"
    }
  }
}
```

请求：区域对焦

```json
{
  "method": "camera.setFocusRegion",
  "params": {
    "cameraId": "main",
    "target": "region",
    "region": {
      "x": 0.35,
      "y": 0.30,
      "width": 0.30,
      "height": 0.25,
      "unit": "normalized"
    }
  }
}
```

返回：

```json
{
  "result": {
    "cameraId": "main",
    "target": "point",
    "point": {
      "x": 0.875,
      "y": 0.426,
      "unit": "normalized"
    },
    "mode": "auto"
  }
}
```

规则：

- 该方法只在 `region.persistent=true` 时推荐注册。
- `manual` 或 `fixed` 模式下设置区域应返回 `DEVICE_MODE_CONFLICT`，除非设备明确支持预配置。
- VM33 `Focus.SetFocusRegion` 的 `x/y` 是点选坐标，应映射为 `target=point`。

事件：

```json
{
  "event": "camera.focusRegionChanged",
  "params": {
    "cameraId": "main",
    "target": "point",
    "point": {
      "x": 0.875,
      "y": 0.426,
      "unit": "normalized"
    },
    "reason": "user_request"
  }
}
```

## 11. `camera.getFocusRegion`

查询当前持久自动对焦点或区域。

请求：

```json
{
  "method": "camera.getFocusRegion",
  "params": {
    "cameraId": "main"
  }
}
```

返回：

```json
{
  "result": {
    "cameraId": "main",
    "target": "center"
  }
}
```

## 12. `camera.triggerAutoFocus`

触发一次自动对焦。该方法是动作型接口，返回 `accepted=true` 表示设备接受请求；最终成功或失败通过 `camera.focusStateChanged` 或后续 `camera.getFocusState` 确认。

请求：中心对焦

```json
{
  "method": "camera.triggerAutoFocus",
  "params": {
    "cameraId": "main",
    "target": "center"
  }
}
```

请求：点选对焦

```json
{
  "method": "camera.triggerAutoFocus",
  "params": {
    "cameraId": "main",
    "target": "point",
    "point": {
      "x": 0.5,
      "y": 0.42,
      "unit": "normalized"
    },
    "lockAfterFocus": false,
    "timeoutMs": 3000
  }
}
```

请求：区域对焦

```json
{
  "method": "camera.triggerAutoFocus",
  "params": {
    "cameraId": "main",
    "target": "region",
    "region": {
      "x": 0.35,
      "y": 0.30,
      "width": 0.30,
      "height": 0.25,
      "unit": "normalized"
    }
  }
}
```

返回：

```json
{
  "result": {
    "cameraId": "main",
    "accepted": true,
    "operationId": "af-42",
    "state": "focusing"
  }
}
```

规则：

- `target` 必须存在于 `getFocusCapabilities.region.targets`。
- 该方法可以临时执行一次 AF，不要求持久改变 `mode`。
- 如果设备执行该动作时会切换 `mode`，必须在返回值或 `camera.focusModeChanged` 中报告。
- `lockAfterFocus=true` 表示成功后锁定焦点；不支持锁定时返回 `RPC_PARAM_INVALID` 或忽略并在返回中报告 `locked=false`，二者选其一并保持一致。

## 13. `camera.startFocusMove`

按方向开始手动 jog 对焦。该方法用于兼容旧协议中的 `Near/Far + Enable` 手动聚焦动作，不是 MVP 必选方法。

请求：

```json
{
  "method": "camera.startFocusMove",
  "params": {
    "cameraId": "main",
    "direction": "near",
    "speed": 60
  }
}
```

返回：

```json
{
  "result": {
    "cameraId": "main",
    "accepted": true,
    "operationId": "focus-move-7",
    "state": "moving",
    "mode": "manual"
  }
}
```

规则：

- 设备支持 `manualMove.supported=true` 时才应注册该方法。
- 当前不是 `manual` 时，建议返回 `DEVICE_MODE_CONFLICT`；如果设备自动切换到 `manual`，必须报告最终 `mode`。
- `speed` 取值来自 `manualMove.speed`。设备不支持速度控制时，可以忽略 `speed`，但必须在能力中不返回 speed range。
- 调用方应使用 `camera.stopFocus` 停止移动。设备也可以在到达限位时自动停止并发送 `camera.focusStateChanged`。

## 14. `camera.stopFocus`

停止当前对焦相关动作。

请求：

```json
{
  "method": "camera.stopFocus",
  "params": {
    "cameraId": "main",
    "operationId": "focus-move-7"
  }
}
```

返回：

```json
{
  "result": {
    "cameraId": "main",
    "state": "idle"
  }
}
```

适用场景：

- 停止 `camera.startFocusMove` 启动的手动 jog。
- 停止正在进行的一次 AF。
- 停止连续 AF 或 focus scan，前提是设备支持。

如果没有进行中的动作，设备可以返回当前 `state`，不应把幂等停止视为错误。

## 15. `camera.getFocusState`

查询当前对焦状态。

请求：

```json
{
  "method": "camera.getFocusState",
  "params": {
    "cameraId": "main"
  }
}
```

返回：

```json
{
  "result": {
    "cameraId": "main",
    "state": "focused",
    "mode": "continuous_auto",
    "position": 512,
    "target": "center",
    "confidence": 0.92,
    "operationId": "af-42"
  }
}
```

字段规则：

- `position` 可选；设备能读取镜头位置时返回。
- `confidence` 可选，范围 `0.0..1.0`。
- `target` 可选，表示最近一次或当前生效的 AF 目标。
- 摄像头不可用时返回 `state=unavailable`，或直接返回 `UNAVAILABLE`。同一设备实现必须保持一致。

## 16. 事件

### 16.1 `camera.focusStateChanged`

开始对焦：

```json
{
  "event": "camera.focusStateChanged",
  "params": {
    "cameraId": "main",
    "state": "focusing",
    "mode": "one_shot_auto",
    "target": "center",
    "operationId": "af-42",
    "reason": "trigger_auto_focus"
  }
}
```

对焦完成：

```json
{
  "event": "camera.focusStateChanged",
  "params": {
    "cameraId": "main",
    "state": "focused",
    "mode": "one_shot_auto",
    "position": 536,
    "confidence": 0.94,
    "operationId": "af-42",
    "reason": "focus_completed"
  }
}
```

对焦失败：

```json
{
  "event": "camera.focusStateChanged",
  "params": {
    "cameraId": "main",
    "state": "failed",
    "mode": "one_shot_auto",
    "operationId": "af-42",
    "reason": "low_contrast"
  }
}
```

### 16.2 事件触发规则

- 上位机调用 `setFocusMode`、`setFocusPosition`、`setFocusRegion` 成功后，设备应发送对应 Changed 事件。
- 设备本地 UI、物理按键、自动算法或固件策略改变对焦状态时，也应发送事件，`reason` 使用 `local_change`、`algorithm_update` 或更具体原因。
- 对同一个 `operationId`，状态流应至少包含开始态和结束态。无法生成 `operationId` 的设备可以省略该字段。

## 17. 错误处理

使用现有 AXTP ErrorCode 命名：

| 错误 | 场景 |
|---|---|
| `RPC_METHOD_NOT_FOUND` | 设备不支持该 focus 方法。 |
| `RPC_PARAM_INVALID` | `mode` 非法、`position` 越界、坐标非法、速度越界。 |
| `DEVICE_MODE_CONFLICT` | 当前模式不允许该操作，例如自动模式下直接设置位置。 |
| `BUSY` | 正在执行互斥动作。 |
| `DEVICE_RESOURCE_BUSY` | 摄像头资源被 PTZ、framing、calibration 或其他会话占用。 |
| `UNAVAILABLE` | 摄像头未打开、视频链路不可用或设备处于不可服务状态。 |

错误示例：

```json
{
  "error": {
    "code": "RPC_PARAM_INVALID",
    "message": "focus position out of range",
    "data": {
      "field": "position",
      "min": 0,
      "max": 1478
    }
  }
}
```

模式冲突示例：

```json
{
  "error": {
    "code": "DEVICE_MODE_CONFLICT",
    "message": "manual focus position requires manual mode",
    "data": {
      "currentMode": "continuous_auto",
      "requiredMode": "manual"
    }
  }
}
```

## 18. Legacy 映射规则

### 18.1 AXDP HID

| Legacy 命令 | Legacy ID | 已知 payload | AXTP 映射 | 覆盖状态 | 说明 |
|---|---|---|---|---|---|
| `CommonSetAFCalibration` | `0xC004A / 0x004A -> 0x00CA` | 无 payload | `camera.startCalibration` 或 `diagnostic.*` | out-of-scope | AF calibration 不进入 `camera.focus`。 |
| `CommonGetAFCalibration` | `0xC0066 / 0x0066 -> 0x00E6` | 无 payload | `camera.getCalibrationState` 或 `diagnostic.*` | out-of-scope | AF calibration 不进入 `camera.focus`。 |
| `CommonSetLensCenter` | `0xC010E / 0x010E -> 0x018E` | `uint32 BE value` | 待确认 | `[REVIEW-ASK]` | 若语义是中心 AF，映射为 `camera.triggerAutoFocus(target="center")`；若是机械归中或标定，归 `camera.calibration` 或 `diagnostic.*`。 |
| `CommonSetAutoFocusState` | `0xC0146 / 0x0146 -> 0x01C6` | `uint32 BE EnableState` | `camera.setFocusMode` | provisional | 建议先按 `0 -> manual`、`1 -> auto` 适配；多值含义未确认前不得写正式 `legacyRefs`。 |
| `CommonGetAutoFocusState` | `0xC0147 / 0x0147 -> 0x01C7` | 无 payload | `camera.getFocusMode` | provisional | AXTP 返回 auto 类模式时，legacy adapter 可回填 `1`；`manual` 或 `fixed` 回填 `0`。 |
| `CommonSetManualFocusPosition` | `0xC015F / 0x015F -> 0x01DF` | `uint32 BE position` | `camera.setFocusPosition` | confirmed | 响应侧旧实现把 result 转成 `EnableState`，AXTP 不继承该类型误差。 |
| `CommonGetManualFocusPosition` | `0xC0160 / 0x0160 -> 0x01E0` | 无 payload | `camera.getFocusPosition` | confirmed | 返回 `position`，范围由 capabilities 给出。 |

AXDP 适配注意：

- legacy payload 的大小端、长度兼容由 adapter 处理，不进入 AXTP schema。
- `CommonSetAutoFocusState` 的 `EnableState` 如果确认存在 `2/3/...` 等多值，应补充到本节并映射到 `continuous_auto`、`one_shot_auto` 或 vendor extension。
- `CommonSetLensCenter` 不能仅凭名称写入正式 mapping；必须确认设备行为。

### 18.2 VM33 HTTP JSON

| Legacy 方法 | Legacy 参数 | AXTP 映射 | 覆盖状态 | 说明 |
|---|---|---|---|---|
| `Focus.SetMode` | `Mode: "Auto" / "Manual"` | `camera.setFocusMode` | confirmed | `"Auto"` 映射为 `auto` 或设备默认自动模式；`"Manual"` 映射为 `manual`。 |
| `Focus.GetMode` | 无 | `camera.getFocusMode` | confirmed | legacy adapter 将 AXTP mode 回填为 `"Auto"` 或 `"Manual"`。 |
| `Focus.Manual` | `Dir: "Near" / "Far"`、`Speed`、`Enable` | `camera.startFocusMove` / `camera.stopFocus` | confirmed | `Enable=true` 启动 jog；`Enable=false` 停止。不能映射为绝对 `setFocusPosition`，除非 adapter 能计算目标位置。 |
| `Focus.SetFocus` | `pos: 0..1478` | `camera.setFocusPosition` | confirmed | 原分类中的 `triggerAutoFocus` 映射应修正。 |
| `Focus.SetFocusRegion` | `x: 0..1`、`y: 0..1` | `camera.setFocusRegion(target="point")` | confirmed | 该旧接口描述为自动模式下生效的点选区域配置。 |
| `Focus.GetZoomInfo` | 返回 `focusPos`、`digitalBase`、`opticsBase` 等 | `camera.getFocusPosition` + `camera.zoom.*` | partial | 仅 `focusPos` 属于 `camera.focus`，变倍字段归 `camera.zoom`。 |
| `Focus.ManualZoom` | `Dir`、`Speed`、`Enable` | `camera.zoom` | out-of-scope | 不归 `camera.focus`。 |
| `Focus.DigitalZoom` | `x`、`y`、`base` | `camera.zoom` | out-of-scope | 不归 `camera.focus`。 |
| `Focus.OpticsZoom` | `base` | `camera.zoom` | out-of-scope | 不归 `camera.focus`。 |
| `Focus.SetZoomSpeedMode` / `Focus.GetZoomSpeedMode` | `SpeedMode` | `camera.zoom` | out-of-scope | 不归 `camera.focus`。 |

VM33 适配注意：

- VM33 `Focus.Manual` 是方向移动，不是位置设置。本协议通过 `camera.startFocusMove` 覆盖该语义。
- VM33 `Focus.SetFocusRegion` 只有点坐标，没有宽高，应使用 `target=point`。
- VM33 `Focus.SetFocus` 的 `pos` 范围 `0..1478` 可作为该设备 `position.max` 的能力值。

## 19. Capability 注册建议

能力：

```text
camera.focus
```

建议关联方法：

```text
camera.getFocusCapabilities
camera.setFocusMode
camera.getFocusMode
camera.setFocusPosition
camera.getFocusPosition
camera.setFocusRegion
camera.getFocusRegion
camera.triggerAutoFocus
camera.startFocusMove
camera.stopFocus
camera.getFocusState
```

建议关联事件：

```text
camera.focusModeChanged
camera.focusPositionChanged
camera.focusRegionChanged
camera.focusStateChanged
```

建议 schema 名称：

```text
CameraGetFocusCapabilitiesRequest
CameraGetFocusCapabilitiesResponse
CameraSetFocusModeRequest
CameraSetFocusModeResponse
CameraGetFocusModeRequest
CameraGetFocusModeResponse
CameraSetFocusPositionRequest
CameraSetFocusPositionResponse
CameraGetFocusPositionRequest
CameraGetFocusPositionResponse
CameraSetFocusRegionRequest
CameraSetFocusRegionResponse
CameraGetFocusRegionRequest
CameraGetFocusRegionResponse
CameraTriggerAutoFocusRequest
CameraTriggerAutoFocusResponse
CameraStartFocusMoveRequest
CameraStartFocusMoveResponse
CameraStopFocusRequest
CameraStopFocusResponse
CameraGetFocusStateRequest
CameraGetFocusStateResponse
CameraFocusStateChangedEvent
CameraFocusModeChangedEvent
CameraFocusPositionChangedEvent
CameraFocusRegionChangedEvent
```

进入 registry 前必须确认：

- `camera.*` methodId 是否沿用 specs 草案中的 `0x0707`、`0x0708`。
- 新增 focus 方法的 methodId 与 `camera.zoom`、`camera.ptz` 不冲突。
- `camera.focusStateChanged` 是否沿用 specs 草案中的 eventId `0x0704`。
- AXDP `CommonSetLensCenter` 的真实语义。
- AXDP `CommonSetAutoFocusState` / `CommonGetAutoFocusState` 的完整取值域。

## 20. MVP 推荐

第一阶段建议实现：

```text
camera.getFocusCapabilities
camera.setFocusMode
camera.getFocusMode
camera.setFocusPosition
camera.getFocusPosition
camera.triggerAutoFocus
camera.getFocusState
camera.focusStateChanged
```

第二阶段按设备能力实现：

```text
camera.setFocusRegion
camera.getFocusRegion
camera.startFocusMove
camera.stopFocus
camera.focusModeChanged
camera.focusPositionChanged
camera.focusRegionChanged
```

最小固定焦设备可以只实现：

```text
camera.getFocusCapabilities
camera.getFocusMode
camera.getFocusState
```

并在能力中返回：

```json
{
  "supported": true,
  "modes": ["fixed"],
  "defaultMode": "fixed",
  "position": {
    "supported": false
  },
  "triggerAutoFocus": {
    "supported": false
  }
}
```

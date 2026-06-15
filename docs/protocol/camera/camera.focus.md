---
status: draft
contract: false
generated: false
domain: camera
feature: camera.focus
registry:
lastReviewed: 2026-06-13
---

# camera.focus

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 管理自动对焦、连续自动对焦、手动对焦位置、点选/区域对焦、focus jog 和状态事件。 |
| 当前状态 | draft；保留原草案中的 legacy 结论，并由 `docs/flows/camera-lens-control.md` 收敛。 |
| 是否可直接实现 | 否。草案阶段仅供评审；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate；`camera.getFocusState` / `camera.triggerAutoFocus` 已在 appendix 候选中，其他方法待采纳评审。 |
| Conformance | needed；需覆盖 mode、AF action、manual position、region、state event 和 mode conflict。 |
| 主要未决问题 | `[REVIEW-ASK]` VM33 `Focus.SetFocus` 是绝对位置还是触发 AF；focus config event 是否独立。 |

## 1. 功能说明

`camera.focus` 用于普通运行时对焦控制。它覆盖对焦模式、一次性自动对焦、连续自动对焦、手动对焦位置、点选/区域对焦和可选 jog 移动。AF calibration 和工厂校准不属于本 feature。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | focus mode、manual focus position、auto focus target、focus region、trigger autofocus、focus jog、focus state event。 |
| 不包含 | zoom、PTZ、framing、AF calibration、产测校准、视频帧传输。 |
| 数据面 | 不使用 STREAM。 |

## 3. 方法 Methods

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `camera.getFocusCapabilities` | query | 查询 focus modes、position、region、manual move 能力。 | `GetFocusCapabilitiesParams` | `FocusCapabilities` | 否 | `[REVIEW-DRAFT]` |
| `camera.getFocusState` | query | 查询当前 focus mode、position、target 和状态。 | `GetFocusStateParams` | `FocusState` | 否 | `[REVIEW-DRAFT]` |
| `camera.setFocusMode` | command | 切换 manual/auto/continuous/fixed 等模式。 | `SetFocusModeParams` | `FocusCommandResult` | 是 | `[REVIEW-DRAFT]` |
| `camera.setFocusPosition` | command | 设置绝对手动对焦位置。 | `SetFocusPositionParams` | `FocusCommandResult` | 是 | `[REVIEW-DRAFT]` |
| `camera.setFocusRegion` | command | 设置持久点选或区域 AF 目标。 | `SetFocusRegionParams` | `FocusCommandResult` | 是 | `[REVIEW-DRAFT]` |
| `camera.triggerAutoFocus` | action | 触发一次自动对焦。 | `TriggerAutoFocusParams` | `FocusCommandResult` | 是 | `[REVIEW-DRAFT]` |
| `camera.startFocusMove` | command | near/far jog 移动。 | `StartFocusMoveParams` | `FocusCommandResult` | 是 | `[REVIEW-ASK]` |
| `camera.stopFocus` | command | 停止 AF、扫描或 jog。 | `StopFocusParams` | `FocusCommandResult` | 是 | `[REVIEW-DRAFT]` |

### 3.1 `camera.getFocusCapabilities`

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `GetFocusCapabilitiesParams` |
| Result Schema | `FocusCapabilities` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.1.1 请求参数 Params：`GetFocusCapabilitiesParams`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.1.2 返回结果 Result：`FocusCapabilities`

字段见 [6.3](#63-capability-schemas)。

#### 3.1.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| 无 | 查询不改变状态。 | none | 无需处理。 |

#### 3.1.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | 设备固定焦且无可控 focus。 | 返回 `supported=false` 或隐藏控件。 |

### 3.2 `camera.getFocusState`

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `GetFocusStateParams` |
| Result Schema | `FocusState` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.2.1 请求参数 Params：`GetFocusStateParams`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.2.2 返回结果 Result：`FocusState`

字段见 [6.4](#64-config--state-总结构)。

#### 3.2.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| 无 | 查询不改变状态。 | none | 无需处理。 |

#### 3.2.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `UNAVAILABLE` | 摄像头未打开或被校准占用。 | 返回不可用原因。 |

### 3.3 `camera.setFocusMode`

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `SetFocusModeParams` |
| Result Schema | `FocusCommandResult` |
| 是否触发事件 | 是，mode 或 state 变化后触发事件。 |
| 幂等性 / 异步性 | 设置相同 mode 应成功；切换 continuous AF 可能异步。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `DEVICE_MODE_CONFLICT`, `BUSY`, `PERMISSION_DENIED` |

#### 3.3.1 请求参数 Params：`SetFocusModeParams`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.3.2 返回结果 Result：`FocusCommandResult`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.3.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `camera.focusConfigChanged` | mode 实际变化。 | `FocusConfigChangedEvent` | 更新 mode selector。 |
| `camera.focusStateChanged` | state 进入 focusing/focused/idle。 | `FocusStateChangedEvent` | 更新状态。 |

#### 3.3.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `NOT_SUPPORTED` | mode 不支持。 | 返回合法 modes。 |
| `DEVICE_MODE_CONFLICT` | framing、calibration 或其他 owner 占用。 | 返回 owner。 |

### 3.4 `camera.setFocusPosition`

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `SetFocusPositionParams` |
| Result Schema | `FocusCommandResult` |
| 是否触发事件 | 是 |
| 幂等性 / 异步性 | 设置相同 position 应成功；镜头移动可能异步。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `DEVICE_MODE_CONFLICT`, `BUSY`, `PERMISSION_DENIED` |

#### 3.4.1 请求参数 Params：`SetFocusPositionParams`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.4.2 返回结果 Result：`FocusCommandResult`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.4.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `camera.focusConfigChanged` | position 变化。 | `FocusConfigChangedEvent` | 更新位置 UI。 |
| `camera.focusStateChanged` | 镜头 moving/focused/failed。 | `FocusStateChangedEvent` | 更新状态。 |

#### 3.4.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `OUT_OF_RANGE` | position 超出能力范围。 | 返回合法范围。 |
| `DEVICE_MODE_CONFLICT` | 当前不是 manual 且 `applyMode=require_manual`。 | 提示切换手动模式。 |

### 3.5 `camera.setFocusRegion`

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `SetFocusRegionParams` |
| Result Schema | `FocusCommandResult` |
| 是否触发事件 | 是 |
| 幂等性 / 异步性 | 设置相同 region 应成功；是否立即 AF 由参数决定。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `DEVICE_MODE_CONFLICT`, `PERMISSION_DENIED` |

#### 3.5.1 请求参数 Params：`SetFocusRegionParams`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.5.2 返回结果 Result：`FocusCommandResult`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.5.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `camera.focusConfigChanged` | target/region 变化。 | `FocusConfigChangedEvent` | 更新区域 UI。 |

#### 3.5.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `OUT_OF_RANGE` | point/region 坐标越界。 | 返回合法范围。 |

### 3.6 `camera.triggerAutoFocus`

| 项 | 内容 |
|---|---|
| 调用类型 | action |
| Params Schema | `TriggerAutoFocusParams` |
| Result Schema | `FocusCommandResult` |
| 是否触发事件 | 是，AF 开始和完成/失败触发 `camera.focusStateChanged`。 |
| 幂等性 / 异步性 | 动作型；返回 accepted 不代表完成。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`, `DEVICE_MODE_CONFLICT`, `BUSY`, `TIMEOUT`, `PERMISSION_DENIED` |

#### 3.6.1 请求参数 Params：`TriggerAutoFocusParams`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.6.2 返回结果 Result：`FocusCommandResult`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.6.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `camera.focusStateChanged` | AF focusing/focused/failed。 | `FocusStateChangedEvent` | 更新状态；失败显示原因。 |

#### 3.6.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `BUSY` | 已有 AF 或校准动作进行中。 | 稍后重试。 |
| `TIMEOUT` | AF 超时。 | 可允许重试。 |

### 3.7 `camera.startFocusMove`

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `StartFocusMoveParams` |
| Result Schema | `FocusCommandResult` |
| 是否触发事件 | 是 |
| 幂等性 / 异步性 | 非幂等；用于 near/far jog，需 stop 或 timeout。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `DEVICE_MODE_CONFLICT`, `BUSY`, `PERMISSION_DENIED` |

#### 3.7.1 请求参数 Params：`StartFocusMoveParams`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.7.2 返回结果 Result：`FocusCommandResult`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.7.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `camera.focusStateChanged` | focus 进入 moving。 | `FocusStateChangedEvent` | UI 显示 moving。 |

#### 3.7.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `DEVICE_MODE_CONFLICT` | 当前不是 manual 或设备不能自动切换。 | 提示切换手动。 |

### 3.8 `camera.stopFocus`

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `StopFocusParams` |
| Result Schema | `FocusCommandResult` |
| 是否触发事件 | 是 |
| 幂等性 / 异步性 | 幂等；没有动作时成功返回当前状态。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.8.1 请求参数 Params：`StopFocusParams`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.8.2 返回结果 Result：`FocusCommandResult`

字段见 [6.2](#62-请求与响应-schemas)。

#### 3.8.3 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `camera.focusStateChanged` | moving/focusing 停止。 | `FocusStateChangedEvent` | 释放 UI 操作态。 |

#### 3.8.4 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `UNAVAILABLE` | focus 控制链路不可用。 | 清除本地操作态。 |

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `camera.focusStateChanged` | focusing/moving/focused/failed/locked/unavailable 变化。 | `FocusStateChangedEvent` | 更新状态，必要时 get 校准。 | `[REVIEW-DRAFT]` |
| `camera.focusConfigChanged` | mode、position、region 变化。 | `FocusConfigChangedEvent` | 更新配置控件。 | `[REVIEW-DRAFT]` |

### 4.1 `camera.focusStateChanged`

#### Payload：`FocusStateChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `cameraId` | string | no | device-defined | `main` | 摄像头对象。 |
| `state` | `FocusState` | yes | see schema | none | 当前状态。 |
| `reason` | string enum | no | `trigger_auto_focus`, `focus_completed`, `focus_failed`, `manual_move`, `stop`, `unknown` | `unknown` | 变化原因。 |

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| `state.focusState=focused` | 显示对焦完成。 |
| `state.focusState=failed` | 展示失败原因，允许重试。 |

### 4.2 `camera.focusConfigChanged`

#### Payload：`FocusConfigChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `cameraId` | string | no | device-defined | `main` | 摄像头对象。 |
| `changedFields` | string[] | no | field path array | omitted | 变化字段。 |
| `state` | `FocusState` | yes | see schema | none | 变化后的状态/配置快照。 |
| `reason` | string enum | no | `user_request`, `profile_changed`, `restore_config`, `legacy_adapter`, `unknown` | `unknown` | 变化原因。 |

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| 完整状态 | 直接更新 mode/position/region。 |
| patch 事件 | 调用 `camera.getFocusState` 校准。 |

## 5. Capability

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `camera.focus` | capability 名称。 |
| `modes` | string[] | yes | `manual`, `auto`, `continuous_auto`, `one_shot_auto`, `fixed` | 支持模式。 |
| `positionRange` | object | no | device steps | 手动对焦位置范围。 |
| `targets` | string[] | no | `center`, `full_frame`, `point`, `region` | AF 目标类型。 |
| `manualMove` | object | no | directions/speed | near/far jog 能力。 |
| `events` | string[] | no | event names | 支持事件。 |

## 6. 字段 / Schemas

### 6.1 Schema 层级速览

| 层级 | 用在哪里 | 作用 |
|---|---|---|
| `FocusCapabilities` | get capabilities result | 描述 modes、position、targets 和 manual move。 |
| `FocusState` | get state/event | 描述 mode、position、target、focus state。 |
| `FocusCommandResult` | set/trigger/move/stop result | 描述 accepted、operationId 和当前状态。 |

### 6.2 请求与响应 Schemas

#### `GetFocusCapabilitiesParams` / `GetFocusStateParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `cameraId` | string | no | device-defined | `main` | 摄像头对象。 |

#### `SetFocusModeParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `cameraId` | string | no | device-defined | `main` | 摄像头对象。 |
| `mode` | string enum | yes | supported mode | none | 目标模式。 |

#### `SetFocusPositionParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `cameraId` | string | no | device-defined | `main` | 摄像头对象。 |
| `position` | int32 | yes | capability range | none | 原生对焦位置。 |
| `applyMode` | string enum | no | `require_manual`, `switch_to_manual` | `require_manual` | 非 manual 时处理策略。 |

#### `SetFocusRegionParams` / `TriggerAutoFocusParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `cameraId` | string | no | device-defined | `main` | 摄像头对象。 |
| `target` | string enum | yes | `center`, `full_frame`, `point`, `region` | none | AF 目标。 |
| `point` | object | no | normalized x/y | omitted | 点选目标。 |
| `region` | object | no | normalized rect | omitted | 区域目标。 |
| `lockAfterFocus` | bool | no | true/false | false | AF 成功后是否锁定。 |
| `timeoutMs` | uint16 | no | capability range | device default | 超时。 |

#### `StartFocusMoveParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `cameraId` | string | no | device-defined | `main` | 摄像头对象。 |
| `direction` | string enum | yes | `near`, `far` | none | 移动方向。 |
| `speed` | uint8 | no | capability range | default | 速度。 |
| `timeoutMs` | uint16 | no | capability range | device default | 安全超时。 |

#### `StopFocusParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `cameraId` | string | no | device-defined | `main` | 摄像头对象。 |
| `operationId` | string | no | device-defined | omitted | 要停止的动作。 |

#### `FocusCommandResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `accepted` | bool | yes | true/false | none | 动作是否接受。 |
| `operationId` | string | no | device-defined | omitted | 异步动作 ID。 |
| `state` | `FocusState` | yes | see schema | none | 当前状态。 |
| `applyState` | string enum | no | `applied`, `focusing`, `moving`, `failed` | omitted | 应用状态。 |

### 6.3 Capability Schemas

#### `FocusCapabilities`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `camera.focus` | none | capability 名称。 |
| `modes` | string[] | yes | focus modes | none | 支持模式。 |
| `defaultMode` | string enum | no | one of modes | omitted | 默认模式。 |
| `positionRange` | object | no | min/max/step/unit | omitted | 位置范围。 |
| `targets` | string[] | no | `center`, `full_frame`, `point`, `region` | omitted | AF target 能力。 |
| `manualMove` | object | no | directions/speed | omitted | jog 能力。 |
| `events` | string[] | no | event names | omitted | 支持事件。 |

### 6.4 Config / State 总结构

#### `FocusState`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `cameraId` | string | no | device-defined | `main` | 摄像头对象。 |
| `mode` | string enum | yes | `manual`, `auto`, `continuous_auto`, `one_shot_auto`, `fixed` | none | 当前模式。 |
| `position` | int32 | no | capability range | omitted | 当前位置。 |
| `target` | string enum | no | `center`, `full_frame`, `point`, `region` | omitted | 当前 AF 目标。 |
| `point` | object | no | normalized x/y | omitted | 点目标。 |
| `region` | object | no | normalized rect | omitted | 区域目标。 |
| `focusState` | string enum | yes | `idle`, `moving`, `focusing`, `focused`, `failed`, `locked`, `unavailable` | none | 运行态。 |
| `confidence` | uint8 | no | `0..100` | omitted | 对焦置信度。 |
| `failureReason` | string enum | no | `low_light`, `no_target`, `timeout`, `resource_conflict`, `unknown` | omitted | 失败原因。 |

## 7. JSON 示例

### 7.1 场景：触发点选自动对焦

```json
{
  "id": 1,
  "method": "camera.triggerAutoFocus",
  "params": {
    "cameraId": "main",
    "target": "point",
    "point": { "x": 0.5, "y": 0.42 },
    "timeoutMs": 3000
  }
}
```

```json
{
  "id": 1,
  "status": { "ok": true, "code": 0 },
  "result": {
    "accepted": true,
    "operationId": "af-42",
    "applyState": "focusing",
    "state": { "mode": "auto", "target": "point", "focusState": "focusing" }
  }
}
```

### 7.2 场景：AF 完成事件

```json
{
  "event": "camera.focusStateChanged",
  "data": {
    "cameraId": "main",
    "state": { "mode": "auto", "focusState": "focused", "confidence": 92 },
    "reason": "focus_completed"
  }
}
```

### 7.3 场景：手动位置模式冲突

```json
{
  "id": 2,
  "status": {
    "ok": false,
    "code": 263,
    "msg": "Device mode conflict.",
    "details": { "field": "position", "requiredMode": "manual", "candidateError": "DEVICE_MODE_CONFLICT" }
  }
}
```

## 8. 错误

| 错误 | 适用场景 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | mode、target、manual move 不支持。 | 返回 capability detail。 |
| `INVALID_ARGUMENT` | target 与 point/region 不匹配。 | 返回字段路径。 |
| `OUT_OF_RANGE` | position 或 region 越界。 | 返回合法范围。 |
| `DEVICE_MODE_CONFLICT` | 当前 mode 不允许该操作或资源被占用。 | 返回 required mode / owner。 |
| `BUSY` | AF、jog 或 calibration 进行中。 | 稍后重试或 stop。 |
| `TIMEOUT` | AF 超时。 | 可重试。 |

## 9. Legacy 映射

| legacy 项 | 候选映射 | 状态 | 说明 |
|---|---|---|---|
| `CommonSetAutoFocusState` / `CommonGetAutoFocusState` | `camera.setFocusMode` / `camera.getFocusState` | candidate | `EnableState` 枚举需确认。 |
| `CommonSetManualFocusPosition` / `CommonGetManualFocusPosition` | `camera.setFocusPosition` / `camera.getFocusState` | candidate | position 为原生步进。 |
| `CommonSetLensCenter` | `camera.triggerAutoFocus` 或 calibration | `[REVIEW-ASK]` | 名称可能是中心 AF、镜头归中或校准。 |
| `Focus.SetMode` / `Focus.GetMode` | `camera.setFocusMode` / `camera.getFocusState` | candidate | VM33 mode 枚举需确认。 |
| `Focus.Manual` | `camera.setFocusPosition` 或 `camera.startFocusMove` | candidate | 参数语义需确认。 |
| `Focus.SetFocus` | `camera.setFocusPosition` 或 `camera.triggerAutoFocus` | `[REVIEW-ASK]` | 原文 `pos` 像绝对位置，但历史分类曾映射到 AF。 |
| `Focus.SetFocusRegion` | `camera.setFocusRegion` / `camera.triggerAutoFocus` | candidate | 点选坐标归一化。 |
| `Focus.*Zoom` | `camera.zoom` | out-of-scope | 不归 `camera.focus`。 |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| registry | not generated | `registry/domains/camera/domain.yaml` 尚未包含 `camera.focus`。 |
| generated | false | generated 文档无 camera focus 方法。 |
| conformance | missing | 需覆盖 mode/position/region/AF/event/errors。 |

## 11. 测试要点

| 类型 | 要点 |
|---|---|
| happy path | 查询能力，触发 AF，收到 focusing/focused 事件。 |
| error path | unsupported target、position 越界、mode conflict、busy、timeout。 |
| boundary case | normalized point/region 边界，position min/max。 |
| capability discovery | UI 根据 modes/targets/positionRange 启禁控件。 |
| event | AF 开始/完成/失败、manual position 变化均同步。 |

## 12. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| `Focus.SetFocus` 真实语义是什么？ | 决定 legacy adapter 和正式方法映射。 | 先按绝对位置候选，保留 AF 可能性。 | `[REVIEW-ASK]` |
| 是否需要独立 `camera.focusConfigChanged`？ | 影响事件数量。 | 推荐保留，避免把 config 变化塞进 state event。 | `[REVIEW-DRAFT]` |
| `CommonSetLensCenter` 是否是 calibration？ | 避免误归 focus。 | 设备确认前不写 YAML。 | `[REVIEW-ASK]` |

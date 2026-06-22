---
status: draft
contract: false
generated: false
domain: cast
feature: cast.pinCode
registry:
lastReviewed: 2026-06-19
---

# cast.pinCode

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 管理投屏密码保护开关、指定投屏 PIN / 密码、密码状态变化通知和等待输入密码事件。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | partial，需安全评审 PIN 明文暴露策略。 |
| Conformance | needed |
| 主要未决问题 | 默认是否开启密码保护、PIN 格式、是否允许返回/事件携带明文 PIN、密码变更对进行中鉴权的影响。 |

## JSON 示例约定

本文中的 JSON 示例默认 RPC Session 已进入 `APP_READY`，`sid` 已由 Server 分配。除本节的 envelope 速查外，后续 method/event/flow 示例默认只展示 RPC `d` 数据块：

```json
{ "sid": "12345678", "op": 7, "d": {} }
```

| op | 名称 | 用途 |
|---:|---|---|
| `6` | Event | 设备向客户端推送事件。 |
| `7` | Request | 客户端调用业务 method。 |
| `8` | RequestResponse | 设备返回业务 method 结果或错误。 |

本文中的 PIN 使用占位值 `<PIN_CODE>`。正式 methodId、eventId、fieldId、errorCode 由 registry 采纳后分配。

## 1. 功能说明

`cast.pinCode` 负责投屏接收端的密码保护策略：是否要求发射端输入密码、当前是否已有可用 PIN、外部控制端指定 PIN、等待输入密码和鉴权失败等通知。

安全提醒：PIN 是否可以在 response / event 中明文出现尚未定稿。本文示例仅为业务语义说明，实际实现必须遵循后续安全评审。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 查询密码保护配置和 PIN 状态。 |
| 包含 | 开启或关闭密码保护；关闭后允许无密码直接投屏。 |
| 包含 | 指定当前投屏 PIN / 密码。 |
| 包含 | 密码策略变化、等待输入密码、密码鉴权失败事件。 |
| 不包含 | AXTP 控制口认证；见 `auth.*` 和 RPC Identify authentication。 |
| 不包含 | 投屏会话主状态；见 `cast.session`。 |
| 不包含 | AirPlay / RAOP 鉴权内部细节。 |
| 数据面 | 不定义 STREAM payload。 |

## 3. 方法 Methods

方法 ID、bitOffset 和 schema fieldId 均为 `TBD after adoption`，由 registry 采纳时分配。

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `cast.getPinCodeConfig` | query | 查询密码保护开关、PIN 是否存在和展示策略。 | `CastGetPinCodeConfigParams` | `CastPinCodeConfig` | 否 | candidate |
| `cast.setPinCodeConfig` | command | 开启或关闭密码保护，并可设置策略字段。 | `CastSetPinCodeConfigParams` | `CastPinCodeConfig` | 是，`cast.pinCodeChanged` | candidate |
| `cast.setPinCode` | command | 指定当前有效 PIN / 密码。 | `CastSetPinCodeParams` | `CastPinCodeConfig` | 是，`cast.pinCodeChanged` | candidate |

### 3.1 `cast.getPinCodeConfig`

**用途**：查询密码保护配置、是否有可用 PIN，以及 UI 是否可以展示 PIN。

| 项 | 内容 |
|---|---|
| 调用类型 | query |
| Params Schema | `CastGetPinCodeConfigParams` |
| Result Schema | `CastPinCodeConfig` |
| 是否触发事件 | 否 |
| 幂等性 / 异步性 | 幂等；同步返回。 |
| 常见错误 | `NOT_SUPPORTED`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.1.1 请求参数 Params：`CastGetPinCodeConfigParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `includeSecret` | boolean | no | `true`, `false` | `false` | 是否请求返回明文 PIN；需权限和安全评审。 |

#### 3.1.2 Request d block Example (op=7)

```json
{
  "id": 3201,
  "method": "cast.getPinCodeConfig",
  "params": {
    "includeSecret": false
  }
}
```

#### 3.1.3 返回结果 Result：`CastPinCodeConfig`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `enabled` | boolean | yes | `true`, `false` | none | 是否启用密码保护。 |
| `hasPinCode` | boolean | yes | `true`, `false` | none | 当前是否有可用 PIN。 |
| `pinCode` | string | no | PIN format TBD | omitted | 明文 PIN；默认不返回，是否允许需安全评审。 |
| `pinDisplay` | string | no | `hidden`, `masked`, `visible` | `hidden` | UI 展示策略。 |
| `format` | object | no | `CastPinCodeFormat` | omitted | PIN 格式约束。 |
| `updatedAt` | string timestamp | no | RFC 3339 | omitted | 配置更新时间。 |

#### 3.1.4 Success Response d block Example (op=8)

```json
{
  "id": 3201,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "enabled": true,
    "hasPinCode": true,
    "pinDisplay": "masked",
    "format": {
      "type": "numeric",
      "minLength": 4,
      "maxLength": 8
    }
  }
}
```

#### 3.1.5 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `PERMISSION_DENIED` | 调用方无权读取 PIN 配置或请求明文 PIN。 | 返回权限错误。 |
| `UNAVAILABLE` | PIN 服务或 backend 暂不可用。 | 返回 retryable 摘要。 |

#### 3.1.6 Error Response d block Example (op=8)

```json
{
  "id": 3201,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "PIN code secret is not readable.",
    "details": {
      "candidateError": "PERMISSION_DENIED",
      "field": "includeSecret"
    }
  }
}
```

### 3.2 `cast.setPinCodeConfig`

**用途**：开启或关闭投屏密码保护。关闭后允许无密码直接投屏。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `CastSetPinCodeConfigParams` |
| Result Schema | `CastPinCodeConfig` |
| 是否触发事件 | 是，配置实际变化后触发 `cast.pinCodeChanged`。 |
| 幂等性 / 异步性 | 建议幂等；重复设置相同值应成功，可不重复触发事件。 |
| 常见错误 | `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.2.1 请求参数 Params：`CastSetPinCodeConfigParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `enabled` | boolean | yes | `true`, `false` | none | 是否启用密码保护。 |
| `pinDisplay` | string | no | `hidden`, `masked`, `visible` | omitted | UI 展示策略；安全策略待确认。 |
| `applyPolicy` | string | no | `nextSession`, `pendingAuth`, `immediate` | `nextSession` | 对已发起但未完成鉴权的请求如何生效。 |

#### 3.2.2 Request d block Example (op=7)

```json
{
  "id": 3202,
  "method": "cast.setPinCodeConfig",
  "params": {
    "enabled": true,
    "pinDisplay": "masked",
    "applyPolicy": "nextSession"
  }
}
```

#### 3.2.3 返回结果 Result：`CastPinCodeConfig`

字段见 3.1.3。

#### 3.2.4 Success Response d block Example (op=8)

```json
{
  "id": 3202,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "enabled": true,
    "hasPinCode": true,
    "pinDisplay": "masked",
    "updatedAt": "2026-06-19T10:20:00Z"
  }
}
```

#### 3.2.5 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| `cast.pinCodeChanged` | `enabled`、展示策略或 PIN 状态变化。 | `CastPinCodeChangedEvent` | 刷新 UI 和 toast。 |

#### 3.2.6 相关 Event d block Example (op=6)

```json
{
  "event": "cast.pinCodeChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "enabled",
      "pinDisplay"
    ],
    "config": {
      "enabled": true,
      "hasPinCode": true,
      "pinDisplay": "masked"
    }
  }
}
```

#### 3.2.7 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `INVALID_ARGUMENT` | `applyPolicy` 或 `pinDisplay` 枚举非法。 | 返回合法枚举。 |
| `PERMISSION_DENIED` | 调用方无权修改密码保护。 | 返回权限错误。 |
| `UNAVAILABLE` | backend 或配置存储不可用。 | 返回可重试信息。 |

### 3.3 `cast.setPinCode`

**用途**：指定当前有效 PIN / 密码。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `CastSetPinCodeParams` |
| Result Schema | `CastPinCodeConfig` |
| 是否触发事件 | 是，PIN 状态变化后触发 `cast.pinCodeChanged`。 |
| 幂等性 / 异步性 | 重复设置相同 PIN 是否触发事件需评审。 |
| 常见错误 | `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `UNAVAILABLE` |

#### 3.3.1 请求参数 Params：`CastSetPinCodeParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `pinCode` | string | yes | PIN format TBD | none | 指定 PIN；示例使用占位值，日志必须脱敏。 |
| `applyPolicy` | string | no | `nextSession`, `pendingAuth`, `immediate` | `nextSession` | 生效策略。 |
| `expiresAt` | string timestamp | no | RFC 3339 | omitted | 可选过期时间；是否支持待确认。 |

#### 3.3.2 Request d block Example (op=7)

```json
{
  "id": 3203,
  "method": "cast.setPinCode",
  "params": {
    "pinCode": "<PIN_CODE>",
    "applyPolicy": "nextSession"
  }
}
```

#### 3.3.3 返回结果 Result：`CastPinCodeConfig`

字段见 3.1.3。默认不返回明文 PIN。

#### 3.3.4 Success Response d block Example (op=8)

```json
{
  "id": 3203,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "enabled": true,
    "hasPinCode": true,
    "pinDisplay": "masked",
    "updatedAt": "2026-06-19T10:21:00Z"
  }
}
```

#### 3.3.5 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `INVALID_ARGUMENT` | PIN 长度、字符集或空值不符合策略。 | 返回 `format` 约束。 |
| `PERMISSION_DENIED` | 调用方无权指定 PIN。 | 返回权限错误。 |
| `UNAVAILABLE` | 配置保存失败或 backend 不可用。 | 返回可重试信息。 |

#### 3.3.6 Error Response d block Example (op=8)

```json
{
  "id": 3203,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Invalid PIN code format.",
    "details": {
      "candidateError": "INVALID_ARGUMENT",
      "field": "pinCode",
      "format": {
        "type": "numeric",
        "minLength": 4,
        "maxLength": 8
      }
    }
  }
}
```

## 4. 事件 Events

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `cast.pinCodeChanged` | 密码保护开关、PIN 状态、展示策略变化。 | `CastPinCodeChangedEvent` | 刷新设置 UI；按安全策略展示 PIN。 | candidate |
| `cast.pinCodeRequired` | 新投屏请求等待发射端输入 PIN。 | `CastPinCodeRequiredEvent` | 展示等待输入密码状态。 | candidate |
| `cast.pinCodeAuthFailed` | 发射端 PIN 鉴权失败、超时或取消。 | `CastPinCodeAuthFailedEvent` | 展示失败提示或等待重试。 | candidate |

### 4.1 `cast.pinCodeChanged`

#### Payload：`CastPinCodeChangedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `changedFields` | string[] | no | field path array | omitted | 变化字段。 |
| `config` | object | yes | `CastPinCodeConfig` | none | 变化后的配置摘要。 |
| `reason` | string | no | `externalSet`, `generated`, `rotated`, `policy` | omitted | 变化原因。 |

#### Event d block Example (op=6)

```json
{
  "event": "cast.pinCodeChanged",
  "intent": 1,
  "data": {
    "changedFields": [
      "hasPinCode"
    ],
    "config": {
      "enabled": true,
      "hasPinCode": true,
      "pinDisplay": "masked"
    },
    "reason": "externalSet"
  }
}
```

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| payload 不含明文 PIN | UI 只展示状态或通过受控安全路径获取。 |
| event 丢失 | 调用 `cast.getPinCodeConfig` 校准。 |

### 4.2 `cast.pinCodeRequired`

#### Payload：`CastPinCodeRequiredEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sessionId` | string | yes | receiver-local session id | none | 等待输入密码的会话。 |
| `source` | object | no | `CastSourceSummary` | omitted | 发射端摘要。 |
| `pinDisplay` | string | yes | `hidden`, `masked`, `visible` | none | 当前展示策略。 |
| `expiresAt` | string timestamp | no | RFC 3339 | omitted | 等待超时时间。 |

#### Event d block Example (op=6)

```json
{
  "event": "cast.pinCodeRequired",
  "intent": 1,
  "data": {
    "sessionId": "cast_sess_001",
    "source": {
      "name": "iPhone",
      "protocol": "airplay"
    },
    "pinDisplay": "masked",
    "expiresAt": "2026-06-19T10:31:00Z"
  }
}
```

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| `pinDisplay=visible` | 可展示 PIN；需确保日志脱敏。 |
| `pinDisplay=hidden` | 展示等待输入状态，不展示明文。 |

### 4.3 `cast.pinCodeAuthFailed`

#### Payload：`CastPinCodeAuthFailedEvent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `sessionId` | string | no | receiver-local session id | omitted | 失败会话。 |
| `reason` | string | yes | `wrongPin`, `timeout`, `cancelled`, `tooManyAttempts` | none | 失败原因。 |
| `retryable` | boolean | yes | `true`, `false` | none | 是否允许重试。 |
| `attempts` | integer | no | `0..N` | omitted | 当前尝试次数。 |

#### Event d block Example (op=6)

```json
{
  "event": "cast.pinCodeAuthFailed",
  "intent": 1,
  "data": {
    "sessionId": "cast_sess_001",
    "reason": "wrongPin",
    "retryable": true,
    "attempts": 1
  }
}
```

#### 客户端处理建议

| 场景 | 建议 |
|---|---|
| `retryable=true` | 保持等待或提示重新输入。 |
| `retryable=false` | 回到 receiver ready 或展示失败。 |

## 5. Capability

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `supported` | boolean | yes | `true`, `false` | 是否支持 `cast.pinCode`。 |
| `supportsProtectionToggle` | boolean | yes | `true`, `false` | 是否可开关密码保护。 |
| `supportsSetPinCode` | boolean | yes | `true`, `false` | 是否可外部指定 PIN。 |
| `supportsReadablePinCode` | boolean | no | `true`, `false` | 是否允许读取明文 PIN；默认应为 `false`。 |
| `pinCodeFormat` | object | yes | `CastPinCodeFormat` | PIN 格式约束。 |
| `defaultEnabled` | boolean | no | `true`, `false` | 默认是否开启密码保护。 |
| `applyPolicies` | string[] | no | `nextSession`, `pendingAuth`, `immediate` | 支持的生效策略。 |

## 6. Schemas

本文采用简单展开模式。主要 Params / Result / Payload 字段已在 method 和 event 小节内展开。

| Schema | 用途 | 定义位置 |
|---|---|---|
| `CastGetPinCodeConfigParams` | 查询配置参数。 | 3.1.1 |
| `CastPinCodeConfig` | PIN 配置和状态。 | 3.1.3 |
| `CastSetPinCodeConfigParams` | 设置开关参数。 | 3.2.1 |
| `CastSetPinCodeParams` | 指定 PIN 参数。 | 3.3.1 |
| `CastPinCodeChangedEvent` | 密码变化事件。 | 4.1 |
| `CastPinCodeRequiredEvent` | 等待输入密码事件。 | 4.2 |
| `CastPinCodeAuthFailedEvent` | 鉴权失败事件。 | 4.3 |

## 7. 交互流程示例 Flow Examples

### 7.1 开启密码后投屏

| Step | 交互 | 说明 |
|---:|---|---|
| 1 | `cast.setPinCodeConfig(enabled=true)` | 开启密码保护。 |
| 2 | `cast.setPinCode(pinCode=<PIN_CODE>)` | 指定当前 PIN。 |
| 3 | `cast.pinCodeChanged` | UI 更新密码状态。 |
| 4 | `cast.pinCodeRequired` | Source 发起投屏并等待输入密码。 |
| 5 | `cast.sessionStarted` | 鉴权通过后由 `cast.session` 上报投屏开始。 |

## 8. Errors

| 错误 | 类型 | 场景 | 说明 |
|---|---|---|---|
| `INVALID_ARGUMENT` | common | PIN 格式、枚举或 applyPolicy 非法。 | details 返回格式约束。 |
| `PERMISSION_DENIED` | common | 无权读取/修改 PIN。 | 明文读取必须强权限。 |
| `UNAVAILABLE` | common | PIN 服务或 backend 不可用。 | 可提示稍后重试。 |
| `PIN_CODE_AUTH_FAILED` | candidate | 发射端输入错误 PIN。 | 主要用于 event error summary。 |
| `PIN_CODE_EXPIRED` | candidate | PIN 过期。 | 是否支持过期时间待确认。 |

## 9. Legacy Mapping

| Legacy 行为 | Candidate AXTP | 说明 |
|---|---|---|
| `getPin` | `cast.getPinCodeConfig` | 是否返回明文 PIN 待安全评审。 |
| `setPin` | `cast.setPinCode` | 指定当前 PIN。 |
| `rotatePin` | future `cast.rotatePinCode` 或内部行为 | 当前需求只要求指定 PIN，暂不公开 rotate。 |
| `pin.*` | `cast.pinCodeChanged` / `cast.pinCodeRequired` / `cast.pinCodeAuthFailed` | legacy event 拆分为明确事件。 |
| `showPinWindow`, `hidePinWindow` | UI behavior from pin events | 不建议作为正式 cast method。 |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| Registry | partial | 需要安全评审 PIN 明文、默认策略和格式。 |
| Generated | no | 未进入 generated。 |
| Contract | false | 草案不可直接作为 runtime 合同。 |
| Conformance | needed | 需覆盖开关、设置 PIN、等待 PIN、失败事件、权限错误。 |

## 11. 测试要点

| Case | Given | When | Then |
|---|---|---|---|
| 开启密码保护 | receiver ready | 调用 `cast.setPinCodeConfig(enabled=true)` | 返回 enabled，触发 `pinCodeChanged`。 |
| 关闭密码保护 | enabled=true | 调用 `cast.setPinCodeConfig(enabled=false)` | 后续 source 可无密码投屏。 |
| 指定 PIN | enabled=true | 调用 `cast.setPinCode` | 返回 hasPinCode，事件不泄漏明文除非允许。 |
| 等待输入密码 | source 发起投屏 | backend 等待 PIN | 收到 `cast.pinCodeRequired`。 |
| 错误 PIN | source 输入错误 PIN | backend 拒绝 | 收到 `pinCodeAuthFailed` 或 `sessionFailed`。 |
| 权限不足 | 普通调用方 | 请求明文 PIN 或修改 PIN | 返回 `PERMISSION_DENIED`。 |

## 12. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| 密码保护默认开启还是关闭？ | product / security | 建议默认开启，但需产品确认。 | `[REVIEW-ASK]` |
| 是否允许 response/event 携带明文 PIN？ | security | 默认不允许；如允许必须强权限和日志脱敏。 | `[REVIEW-ASK]` |
| PIN 格式是数字 PIN 还是任意密码？ | schema / UI | 建议 MVP numeric 4..8 位。 | `[REVIEW-DRAFT]` |
| 指定 PIN 是否影响已发起但未完成鉴权的请求？ | behavior | 建议默认 `nextSession`。 | `[REVIEW-ASK]` |
| 是否需要公开 rotate PIN method？ | scope | 当前不公开，作为 future。 | `[REVIEW-DRAFT]` |

---
status: draft
contract: false
generated: false
domain: cast
feature: cast.pinCode
registry:
lastReviewed: 2026-06-22
---

# cast.pinCode

## 1. Purpose

管理 AirPlay 投屏密码保护、当前有效 PIN、展示策略和鉴权失败通知。业务已确认：密码保护默认开启，默认 PIN 自动生成，授权 response / event 可携带明文 PIN，但日志、诊断和错误摘要必须脱敏。

## 2. Candidate Surface

| Method / Event | Purpose | Schema | Notes |
|---|---|---|---|
| `cast.getPinCodeConfig` | 查询密码保护、PIN 状态和展示策略。 | `CastGetPinCodeConfigParams` -> `CastPinCodeConfig` | query |
| `cast.setPinCodeConfig` | 开关密码保护并设置展示策略。 | `CastSetPinCodeConfigParams` -> `CastPinCodeConfig` | command |
| `cast.setPinCode` | 指定当前有效 PIN。 | `CastSetPinCodeParams` -> `CastPinCodeConfig` | command |
| `cast.pinCodeChanged` | PIN 配置或状态变化。 | `CastPinCodeChangedEvent` | event |
| `cast.pinCodeRequired` | 新投屏请求等待输入 PIN。 | `CastPinCodeRequiredEvent` | event |
| `cast.pinCodeAuthFailed` | PIN 鉴权失败、超时或取消。 | `CastPinCodeAuthFailedEvent` | event |

## 3. Methods

### 3.0 方法速览

方法概览见第 2 章；本节只保留每个 method 的最小 request / success 示例。

### 3.1 `cast.getPinCodeConfig`

查询是否启用密码保护、是否存在 PIN、是否允许返回明文 PIN。

#### 3.1.1 d block 示例

request:

```json
{
  "id": 3301,
  "method": "cast.getPinCodeConfig",
  "params": {
    "includeSecret": true
  }
}
```

success:

```json
{
  "id": 3301,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "enabled": true,
    "hasPinCode": true,
    "pinCode": "482913",
    "pinDisplay": "authorizedClients",
    "generatedBy": "nearcast",
    "visibility": "authorizedOnly",
    "expiresAt": null,
    "redactionRequired": true,
    "updatedAt": "2026-06-22T10:30:00Z"
  }
}
```

### 3.2 `cast.setPinCodeConfig`

开启或关闭密码保护；关闭时必须允许 source 无密码投屏。

#### 3.2.1 d block 示例

request:

```json
{
  "id": 3302,
  "method": "cast.setPinCodeConfig",
  "params": {
    "enabled": true,
    "pinDisplay": "authorizedClients"
  }
}
```

success:

```json
{
  "id": 3302,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "enabled": true,
    "hasPinCode": true,
    "pinDisplay": "authorizedClients",
    "generatedBy": "nearcast",
    "visibility": "authorizedOnly",
    "changedFields": [
      "enabled",
      "pinDisplay"
    ],
    "updatedAt": "2026-06-22T10:31:00Z"
  }
}
```

### 3.3 `cast.setPinCode`

指定当前有效 PIN；格式、长度和生效时机待采纳时固定。

#### 3.3.1 d block 示例

request:

```json
{
  "id": 3303,
  "method": "cast.setPinCode",
  "params": {
    "pinCode": "482913",
    "expirePrevious": true
  }
}
```

success:

```json
{
  "id": 3303,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "enabled": true,
    "hasPinCode": true,
    "pinCode": "482913",
    "pinDisplay": "authorizedClients",
    "generatedBy": "external",
    "expirePrevious": true,
    "redactionRequired": true,
    "changedFields": [
      "pinCode",
      "generatedBy"
    ],
    "updatedAt": "2026-06-22T10:32:00Z"
  }
}
```

## 4. State And Events

| Field | Meaning |
|---|---|
| `enabled` | 是否启用密码保护。 |
| `hasPinCode` | 当前是否有有效 PIN。 |
| `pinCode` | 明文 PIN；仅授权 response / event 可见。 |
| `pinDisplay` | `hidden`、`authorizedClients`、`localUi`、`both`。 |
| `source` | 等待鉴权或鉴权失败的 source 摘要。 |
| `authFailureReason` | `wrongPin`、`timeout`、`cancelled`、`tooManyAttempts`。 |

事件规则：

- `cast.pinCodeChanged` 用于配置、PIN 状态或明文可见性变化。
- `cast.pinCodeRequired` 用于投屏请求等待 PIN，不代表 casting。
- `cast.pinCodeAuthFailed` 用于鉴权失败，不应误报为 `cast.sessionStarted`。

### 4.1 Event 示例

pin required:

```json
{
  "event": "cast.pinCodeRequired",
  "intent": 1,
  "data": {
    "sessionId": "cast_sess_001",
    "source": {
      "name": "Qing iPhone",
      "address": "192.168.31.24"
    },
    "pinCode": "482913",
    "visibility": "authorizedOnly",
    "redactionRequired": true,
    "requestedAt": "2026-06-22T10:29:30Z"
  }
}
```

auth failed:

```json
{
  "event": "cast.pinCodeAuthFailed",
  "intent": 1,
  "data": {
    "sessionId": "cast_sess_001",
    "source": {
      "name": "Qing iPhone"
    },
    "authFailureReason": "wrongPin",
    "attemptCount": 2,
    "failedAt": "2026-06-22T10:29:45Z"
  }
}
```

## 5. Rules

- 密码保护默认开启；默认 PIN 由 NearCast 或 UxPlay 内部生成。
- 密码保护关闭时，source 必须可以无密码投屏。
- 明文 PIN 可以返回给控制端；普通日志、诊断和错误摘要必须脱敏。
- PIN 配置和读取按朴素可调用状态操作设计，不在本 feature 内拆分权限 scope。
- PIN 展示是 UI 行为，不需要单独建 public show / hide method。

## 6. Errors

| Error | Scenario |
|---|---|
| `INVALID_ARGUMENT` | PIN 格式、展示策略或字段组合非法。 |
| `INVALID_STATE` | 当前 backend / session 状态不允许修改 PIN。 |
| `UNAVAILABLE` | backend PIN service 不可用。 |

## 7. Review Items

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| PIN 格式、长度和字符集如何定义？ | backend / schema | 采纳前按 UxPlay / NearCast 实现收敛。 | `[REVIEW-ASK]` |
| 修改 PIN 是否影响正在进行的鉴权？ | behavior | 默认影响后续请求；进行中鉴权策略待确认。 | `[REVIEW-ASK]` |
| 明文 PIN 的可见性和脱敏如何验证？ | security | 保留明文 response / event，日志和诊断必须脱敏。 | `[REVIEW-ASK]` |

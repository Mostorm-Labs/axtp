---
status: draft
contract: false
generated: false
domain: storage
feature: storage.sdCard
registry:
lastReviewed: 2026-06-11
---

# storage.sdCard

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 查询 SD 卡状态、容量，并触发格式化任务。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC + EVENT |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | 格式化是否需要进度、是否允许取消、媒体占用时错误语义仍需确认。 |

## 1. 功能说明

`storage.sdCard` 用于 SD 卡检测、容量查询和格式化。它落实 signage flow 中 legacy `GetSDInfo` / `FormatSd`，不再把 SD 卡能力建模成普通 config get/set。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | SD 卡状态、容量、文件系统摘要、格式化 action、格式化状态事件。 |
| 不包含 | 通用磁盘/分区枚举；属于 `storage.disk` 或 `storage.volume`。 |
| 不包含 | 媒体索引、录像存储策略；属于 `storage.media` / `storage.recording`。 |
| 数据面 | 不使用 STREAM。 |

## 3. 方法

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `storage.getSdCardState` | query | 查询 SD 卡状态和容量。 | `GetSdCardStateParams` | `SdCardState` | 否 | draft |
| `storage.formatSdCard` | action / async-action | 格式化 SD 卡。 | `FormatSdCardParams` | `SdCardFormatState` | 是，触发 `storage.sdCardFormatStateChanged`。 | draft |

### 3.1 `storage.getSdCardState`

#### 请求参数 Params：`GetSdCardStateParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `slotId` | string | no | slot id | default slot | SD 卡槽位。 |

#### 返回结果 Result：`SdCardState`

字段见 6.2。

### 3.2 `storage.formatSdCard`

| 项 | 内容 |
|---|---|
| 目的 | 创建 SD 卡格式化任务。 |
| 调用类型 | action / async-action |
| Params Schema | `FormatSdCardParams` |
| Result Schema | `SdCardFormatState` |
| 事件触发 | 格式化状态变化触发 `storage.sdCardFormatStateChanged`。 |
| 常见错误 | `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `INVALID_STATE`, `BUSY`, `PERMISSION_DENIED`, `INTERNAL_ERROR` |

#### 请求参数 Params：`FormatSdCardParams`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `slotId` | string | no | slot id | default slot | SD 卡槽位。 |
| `filesystem` | enum | no | `exfat`, `fat32`, `ext4`, `default` | `default` | 目标文件系统。 |
| `confirmationToken` | string | no | opaque token | omitted | 危险操作确认 token。 |

#### 返回结果 Result：`SdCardFormatState`

字段见 6.3。

## 4. 事件

### 4.0 事件速览

| Event | 触发条件 | Payload Schema | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| `storage.sdCardFormatStateChanged` | 格式化任务 accepted/running/succeeded/failed。 | `SdCardFormatStateChangedEvent` | 禁用相关操作，完成后重新读取 SD 卡状态。 | draft |

### 4.1 `storage.sdCardFormatStateChanged`

#### Payload：`SdCardFormatStateChangedEvent`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `format` | `SdCardFormatState` | yes | see schema | none | 当前格式化状态。 |

## 5. Capability

| 字段 | 类型 | 必填 | 范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `storage.sdCard` | capability 名称。 |
| `supportsFormat` | boolean | yes | `true`, `false` | 是否支持格式化。 |
| `supportedFilesystems` | string[] | no | `exfat`, `fat32`, `ext4`, `default` | 支持文件系统。 |
| `supportsProgress` | boolean | no | `true`, `false` | 格式化是否上报进度。 |

## 6. Schemas

### 6.1 Schema 层级速览

```text
SdCardState
SdCardFormatState
SdCardFormatStateChangedEvent
```

### 6.2 `SdCardState`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `slotId` | string | yes | slot id | none | 槽位。 |
| `present` | boolean | yes | `true`, `false` | none | 是否插入 SD 卡。 |
| `status` | enum | yes | `ready`, `missing`, `formatting`, `error`, `unknown` | none | 状态。 |
| `totalBytes` | uint64 | no | `0..uint64 max` | omitted | 总容量。 |
| `availableBytes` | uint64 | no | `0..uint64 max` | omitted | 可用容量。 |
| `filesystem` | string | no | filesystem name | omitted | 文件系统。 |
| `error` | object | no | code/message | omitted | 错误摘要。 |

### 6.3 `SdCardFormatState`

| 字段 | 类型 | 必填 | 范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `taskId` | string | yes | opaque id | none | 格式化任务 ID。 |
| `slotId` | string | yes | slot id | none | 槽位。 |
| `state` | enum | yes | `accepted`, `running`, `succeeded`, `failed`, `cancelled` | none | 任务状态。 |
| `progress` | uint8 | no | `0..100` | omitted | 进度。 |
| `filesystem` | string | no | filesystem name | omitted | 目标文件系统。 |
| `error` | object | no | code/message | omitted | 失败信息。 |

## 7. JSON 示例

```json
{
  "id": 901,
  "method": "storage.getSdCardState",
  "params": {
    "slotId": "sd0"
  }
}
```

```json
{
  "id": 901,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "slotId": "sd0",
    "present": true,
    "status": "ready",
    "totalBytes": 128000000000,
    "availableBytes": 64000000000,
    "filesystem": "exfat"
  }
}
```

```json
{
  "id": 902,
  "method": "storage.formatSdCard",
  "params": {
    "slotId": "sd0",
    "filesystem": "exfat",
    "confirmationToken": "TOKEN-REDACTED"
  }
}
```

```json
{
  "id": 902,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "taskId": "<FORMAT_TASK_ID>",
    "slotId": "sd0",
    "state": "accepted",
    "progress": 0,
    "filesystem": "exfat"
  }
}
```

## 8. Legacy Mapping

| Legacy entry | Direction | AXTP target | 状态 |
|---|---|---|---|
| `GetSDInfo` | Server -> Device | `storage.getSdCardState` | `[REVIEW-OK]` |
| `FormatSd` | Server -> Device | `storage.formatSdCard` | `[REVIEW-OK]` |

## 9. Registry / Conformance Status

| 项 | 状态 |
|---|---|
| Registry YAML | not written |
| Generated docs | not generated |
| Method / event IDs | `TBD after adoption` |
| Conformance | 需覆盖 missing/ready/error/formatting、格式化进度、busy、权限。 |

## 10. 待确认问题

| Issue | Impact | Current recommendation | Status |
|---|---|---|---|
| 格式化是否可取消？ | method set | P0 不新增 cancel；若需要另补 `storage.cancelSdCardFormat`。 | `[REVIEW-ASK]` |
| 播放器正在使用 SD 媒体时是否允许格式化？ | error model | 返回 `BUSY` 或 `INVALID_STATE`。 | `[REVIEW-ASK]` |

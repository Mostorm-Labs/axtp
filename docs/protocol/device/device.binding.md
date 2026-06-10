# AXTP device.binding 协议草案

版本：v0.1

归属域：`device`

Capability ID：`device.binding`

适用范围：设备绑定码获取、绑定状态查询、绑定状态设置和绑定状态变更通知。

---

## 协议审核标记（人工复核）

| 标记 | 条目 | 审核结论 | 后续动作 |
|---|---|---|---|
| `[REVIEW-DRAFT]` | `device.binding` capability | 本文是根据业务需求创建的协议草案，不是最终事实源。 | 产品/架构/研发确认后进入 `adopt-protocol-draft`。 |
| `[REVIEW-ASK]` | legacy 映射 | 旧协议命令 `GetBindCode` / `GetBindConfig` / `SetBindConfig` / `OnBindState` 字段和语义仍需确认。 | 采纳前补齐 legacyRefs 或明确 adapter-only。 |
| `[REVIEW-ASK]` | 绑定语义 | 绑定是设备认领/归属声明（设备到工作空间），需确认与 auth session、token、permission 的边界。 | 采纳前与 auth 域负责人确认。 |

---

## 1. 文档定位

`device.binding` 定义：设备绑定到管理工作空间的完整生命周期，包括绑定码获取、绑定状态查询、绑定状态设置和绑定状态变更通知。

本文只描述 `device.binding` 这一项 capability。稳定事实必须写入 `registry/domains/device/domain.yaml` 或相关 registry YAML，再由 Generator 生成 `protocol/axtp.protocol.yaml` 与 `docs/generated/*`。

---

## 2. 业务需求

| 项 | 内容 |
|---|---|
| 需求来源 | NearHub Launcher 数字标牌设备管理 — 设备绑定流程 |
| 目标用户 | 运维人员（通过云端管理控制台）、设备固件 |
| 目标行为 | 设备上线后主动获取绑定码并展示；用户在云端输入绑定码完成设备到工作空间的绑定；绑定成功后云端通知设备更新绑定状态；设备可随时查询当前绑定状态。 |
| 当前实现程度 | Drafted only — 无已有 registry/generated 事实 |

---

## 3. 域边界

| 项 | 决策 |
|---|---|
| Domain | `device` |
| Feature | `device.binding` |
| Capability | `device.binding` |
| 不属于本文 | 认证 session 管理（`auth.session`）、token 签发/刷新（`auth.token`）、权限配置（`auth.permission`）、设备基础信息（`device.info`） |

---

## 4. 协议决策

| 决策点 | 结论 | 理由 |
|---|---|---|
| 新增/修改/复用 | Create | 无已有 capability 覆盖设备绑定语义。 |
| 控制面 | RPC method/event | 业务控制不进入 Frame Header。 |
| 数据面 | None | 绑定是控制面操作，不涉及连续数据传输。 |
| WebSocket | RPC-only | WebSocket Unframed JSON 不承载 STREAM。 |

---

## 5. 候选 Capability

| Capability | 状态 | 说明 |
|---|---|---|
| `device.binding` | draft | 设备绑定码获取、绑定状态查询/设置和绑定状态变更通知。 |

---

## 6. 候选 Methods

| Method | Params Schema | Result Schema | 方向 | 说明 | Review |
|---|---|---|---|---|---|
| `device.getBindingCapabilities` | `BindingCapabilitiesParams` | `BindingCapabilitiesResult` | 双向 | 查询 `device.binding` 能力范围。 | [REVIEW-DRAFT] |
| `device.getBindCode` | `GetBindCodeParams` | `GetBindCodeResult` | Device → Server | 设备向云端请求绑定码（含过期时间）。 | [REVIEW-DRAFT] |
| `device.getBindConfig` | `GetBindConfigParams` | `GetBindConfigResult` | 双向 | 查询设备当前绑定状态。 | [REVIEW-DRAFT] |
| `device.setBindConfig` | `SetBindConfigParams` | `SetBindConfigResult` | Server → Device | 云端通知设备更新绑定状态。 | [REVIEW-DRAFT] |

---

## 7. 候选 Events

| Event | Schema | 触发时机 | Review |
|---|---|---|---|
| `device.bindStateChanged` | `BindStateChangedEvent` | 绑定状态发生变更时由设备发出。 | [REVIEW-DRAFT] |

---

## 8. 候选 Schemas

### `GetBindCodeParams`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| _(无参数)_ | — | — | 请求为空。设备身份通过 session 上下文识别。 | [REVIEW-DRAFT] |

### `GetBindCodeResult`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `code` | `string` | yes | 绑定码，用于用户在云端管理控制台输入。 | [REVIEW-DRAFT] |
| `expiresAt` | `uint64` | yes | 绑定码过期时间（Unix 时间戳，毫秒）。 | [REVIEW-DRAFT] |
| `expiresInSeconds` | `uint32` | yes | 绑定码有效剩余秒数。 | [REVIEW-DRAFT] |

### `GetBindConfigParams`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| _(无参数)_ | — | — | 请求为空。 | [REVIEW-DRAFT] |

### `GetBindConfigResult`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `bound` | `boolean` | yes | 当前绑定状态。`true` 表示已绑定到工作空间。 | [REVIEW-DRAFT] |

### `SetBindConfigParams`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `bound` | `boolean` | yes | 目标绑定状态。`true` 表示绑定到工作空间。 | [REVIEW-DRAFT] |

### `SetBindConfigResult`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `ok` | `boolean` | yes | 操作成功标识。 | [REVIEW-DRAFT] |

### `BindStateChangedEvent`

| Field | Type | Required | 说明 | Review |
|---|---|---:|---|---|
| `status` | `string` | yes | 绑定结果状态（如 `"success"`、`"failed"`、`"expired"`）。 | [REVIEW-ASK] |
| `code` | `string` | yes | 关联的绑定码。 | [REVIEW-DRAFT] |
| `message` | `string` | no | 附加说明信息。 | [REVIEW-DRAFT] |

---

## 9. JSON 示例

示例用于评审 request/response/event 语义，不是 generated 事实源。JSON 示例只写 RPC `d` 数据块，不包裹外层 `sid` / `op` / `d` wire envelope。

### `device.getBindCode` request

```json
{
  "id": 1,
  "method": "device.getBindCode",
  "params": {}
}
```

### `device.getBindCode` response

```json
{
  "id": 1,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "code": "ABC123",
    "expiresAt": 1739999999999,
    "expiresInSeconds": 1800
  }
}
```

### `device.getBindConfig` response（已绑定）

```json
{
  "id": 2,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "bound": true
  }
}
```

### `device.setBindConfig` request（绑定设备）

```json
{
  "id": 3,
  "method": "device.setBindConfig",
  "params": {
    "bound": true
  }
}
```

### `device.setBindConfig` response

```json
{
  "id": 3,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "ok": true
  }
}
```

### `device.bindStateChanged` event

```json
{
  "event": "device.bindStateChanged",
  "intent": 1,
  "data": {
    "status": "success",
    "code": "ABC123",
    "message": ""
  }
}
```

### failure response（绑定码过期或无效）

```json
{
  "id": 1,
  "status": {
    "ok": false,
    "code": 10,
    "msg": "Bind code expired.",
    "details": {
      "candidateError": "DEVICE_BINDING_CODE_EXPIRED"
    }
  }
}
```

---

## 10. 候选 Errors

| Error | 类别 | 说明 | Review |
|---|---|---|---|
| `DEVICE_BINDING_CODE_EXPIRED` | business | 绑定码已过期，设备需重新获取。 | [REVIEW-DRAFT] |
| `DEVICE_ALREADY_BOUND` | business | 设备已绑定到工作空间，无需重复绑定。 | [REVIEW-DRAFT] |
| `DEVICE_NOT_BOUND` | business | 设备未绑定，无法执行依赖绑定的操作。 | [REVIEW-DRAFT] |

---

## 11. Legacy 待映射

| 来源 | 旧协议条目 | 候选映射 | 状态 | 说明 |
|---|---|---|---|---|
| NearHub Launcher Signage | `GetBindCode` | `device.getBindCode` | [REVIEW-DRAFT] | 方向 Device → Server；字段 code/expiresAt/expiresInSeconds 一致。 |
| NearHub Launcher Signage | `GetBindConfig` | `device.getBindConfig` | [REVIEW-DRAFT] | 方向双向；字段 bound 一致。 |
| NearHub Launcher Signage | `SetBindConfig` | `device.setBindConfig` | [REVIEW-DRAFT] | 方向 Server → Device；参数 bound 一致。 |
| NearHub Launcher Signage | `OnBindState` | `device.bindStateChanged` | [REVIEW-DRAFT] | 方向 Device → Server；字段 status/code/message 一致。旧指令状态为"未研发"。 |

---

## 12. Registry 草案输入

采纳本文后，domain YAML 至少应包含：

```yaml
capabilities:
  - name: device.binding
    status: draft

methods:
  - name: device.getBindingCapabilities
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: BindingCapabilitiesParams
    responseSchema: BindingCapabilitiesResult
    capabilities:
      - device.binding
  - name: device.getBindCode
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: GetBindCodeParams
    responseSchema: GetBindCodeResult
    capabilities:
      - device.binding
  - name: device.getBindConfig
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: GetBindConfigParams
    responseSchema: GetBindConfigResult
    capabilities:
      - device.binding
  - name: device.setBindConfig
    id: TBD after adoption
    bitOffset: TBD after adoption
    requestSchema: SetBindConfigParams
    responseSchema: SetBindConfigResult
    capabilities:
      - device.binding

events:
  - name: device.bindStateChanged
    id: TBD after adoption
    schema: BindStateChangedEvent
    capabilities:
      - device.binding
```

---

## 13. 采纳检查清单

- [ ] 08 已确认 domain.feature 粒度和 method/event 命名。
- [ ] 09 已确认 Domain/ID 规划和生成链路。
- [ ] 10 已确认 methodId、bitOffset、request/response schema。
- [ ] 11 已确认 eventId、eventMasks bitOffset、event schema。
- [ ] 12 已确认 errorCode 范围和错误归属。
- [ ] 13 已确认 schema fieldId、capabilityId、supportedMethods。
- [ ] YAML 写入后 Generator 能完整生成 `protocol/axtp.protocol.yaml` 和 `docs/generated/*`。

---

## 14. 待确认问题

1. `[REVIEW-ASK]` 绑定码的安全策略：长度、字符集、刷新频率限制？
2. `[REVIEW-ASK]` `device.bindStateChanged` 的 `status` 字段枚举值有哪些？
3. `[REVIEW-ASK]` 设备解绑（`bound: false`）场景是否在本期覆盖？
4. `[REVIEW-ASK]` 绑定操作是否需要权限校验（与 `auth.permission` 的关系）？

---
status: draft
contract: false
generated: false
domain: license
feature: license.credentialDelivery
registry:
lastReviewed: 2026-11-17
---

# license.credentialDelivery

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 平台向设备串行下发签名授权凭证（云→设备），设备回报安装/导出/拒绝回执（设备→云），回执经采信条件推进台账收敛。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。draft 阶段仅供评审；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC（云→设备下发 + 设备→云回执；零自定义事件） |
| 是否使用 STREAM | 否 |
| Registry readiness | none（license 域未注册；方法/错误码 ID 均 `TBD after adoption`） |
| Conformance | needed |
| 主要未决问题 | 专属错误码落位（vendor 段 vs 共享码）、`errorCode` 字段形态（候选名 string vs 数值）、capability 建模方向（见 §11）。 |

## 1. 功能说明

平台签发的授权凭证（CBOR V1 签名工件，axlic 冻结格式）经 `license.deliverCredential` 由云推送到设备；设备侧验证方验签、身份匹配、原子安装后，经 `license.reportReceipt` 回报结果。回执必须可关联平台真实下发尝试（`deliveryId` 闭环）且与选定工件一致才被采信；S2D 调用响应的 ACK 与回执走同一采信逻辑，重复到达幂等。

公共 RPC envelope、错误约定与 schema 展开遵循 [Protocol Draft Conventions](../draft-conventions.md)。业务场景与协议覆盖分析见 [license-entitlement-lifecycle flow](../../flows/license-entitlement-lifecycle.md)；接口素材来源：aw-saas-platform 仓 `apps/api/specs/001-license-entitlement-system/contracts/axtp-licensing-methods.md`。凭证字节格式合同权威在 axlic 仓（P17/P20 冻结面），本草案只约束通道传输形态，不定义 CBOR 内部结构。

> 方向术语：本文以「云→设备 / 设备→云」描述调用方向。cloud-reverse 通道中设备为逻辑服务端（`contract/protocol/axtp.protocol.yaml:164-169`）——`deliverCredential` 为逻辑客户端（云）的正向调用、`reportReceipt` 为设备发起的反向 Request；SDK 实装角色模型存在待裁决矛盾（flow OQ-1），方向建模见 §11。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 凭证下发（串行、通道侧元数据捎带）、设备拒绝语义（防回滚）、安装/导出/拒绝回执上报、回执采信结果返回。 |
| 不包含 | 注册（归 `license.registration`）；对账拉取与版本探测（归 `license.reconciliation`）；凭证签发/吊销/清权判定（平台内部）；设备侧验签/安装/权益判定行为本身（设备内部，axlic 冻结合同）。 |
| 数据面 | 所有操作均通过 RPC method 完成；本 feature 不定义 STREAM。凭证字节为大载荷 RPC result 字段，不经 STREAM 传输。 |

## 3. 方法 Methods

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `license.deliverCredential` | command | 凭证下发（推通道、串行） | `DeliverCredentialParams` | `DeliverCredentialResult` | 否 | draft |
| `license.reportReceipt` | command | 安装/导出/拒绝回执上报 | `ReportReceiptParams` | `ReportReceiptResult` | 否 | draft |

### 3.1 `license.deliverCredential`

**用途**：平台（逻辑客户端）向设备推送一张签名凭证工件；设备侧验签、身份匹配、原子安装成功后返回 accepted。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `DeliverCredentialParams` |
| Result Schema | `DeliverCredentialResult` |
| 是否触发事件 | 否（零自定义事件，见 §4） |
| 幂等性 / 异步性 | 平台侧串行约束（同设备同时刻至多一张在途凭证）；超时/断连 = 结果未知（非失败，等对账收敛） |
| 常见错误 | 设备拒绝以 `accepted=false` + `errorCode` 表达（候选 `LICENSE_CREDENTIAL_STALE`）；通道级错误沿用通用错误 |

#### 3.1.1 请求参数 Params：`DeliverCredentialParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `credentialId` | string | yes | uuid 格式 | none | 凭证工件标识（平台台账主键口径）。 |
| `deliveryId` | string | yes | 平台下发尝试标识 | none | 当次下发尝试 id——设备回执 `reportReceipt.deliveryRef` 原样引用（采信条件闭环来源）。 |
| `authorityRevision` | uint32 | yes | ≥ 0 | none | 凭证修订号（版本轴第一维）。 |
| `credentialGeneration` | uint32 | yes | ≥ 0 | none | 凭证代次（版本轴第二维，同修订轴重签时递增）。 |
| `policyVersion` | uint32 | yes | ≥ 0 | none | 凭证来源策略行集版本（通道侧元数据，不在 CBOR 载荷内）；设备本地持久化后于对账/探测上报。清权凭证取签发时策略当前版本（设备侧版本轴占位）。 |
| `reason` | string enum | yes | `ISSUE` / `REVISE` / `REVOKE` | none | 下发语义：新签 / 修订（含 Grant 级吊销剩余重算、批量修订）/ 清权（空权益集）。 |
| `cborBase64` | string | yes | Base64（RFC 4648）；工件 ≤ 64 KiB → 编码后 ≤ 87384 字符（含填充） | none | 不透明凭证字节（axlic 冻结 CBOR V1 工件）；本协议不定义其内部结构。 |

#### 3.1.2 返回结果 Result：`DeliverCredentialResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `accepted` | bool | yes | true / false | none | 设备侧验签 + 身份匹配 + 原子安装成功为 true。 |
| `errorCode` | string | no | 候选 `LICENSE_CREDENTIAL_STALE` | none | accepted=false 时必填；当前唯一拒绝码（版本低于设备高水位/验签失败，防回滚）。字段形态（候选名 string）见 §11。 |

#### 3.1.3 d block 示例

request:

```json
{
  "id": 201,
  "method": "license.deliverCredential",
  "params": {
    "credentialId": "3f9d2c68-7b4e-4f2a-9c1d-5e8a7b6c4d21",
    "deliveryId": "d-8a41c7",
    "authorityRevision": 4,
    "credentialGeneration": 8,
    "policyVersion": 1,
    "reason": "ISSUE",
    "cborBase64": "o2JheExpY2Vuc2UuY3JlZGVudGlhbAE…（截断示意，≤87384 字符）"
  }
}
```

success:

```json
{
  "id": 201,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "accepted": true
  }
}
```

设备拒绝示意（业务 result 形态，非通道错误）:

```json
{
  "id": 201,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "accepted": false,
    "errorCode": "LICENSE_CREDENTIAL_STALE"
  }
}
```

读法：设备拒绝（防回滚/验签失败）以**业务 result** 表达——`status.ok=true` + `accepted=false` + 候选错误名（与对方仓契约及 `reportReceipt` 的 accepted=false 形态一致）；`LICENSE_CREDENTIAL_STALE` 正式 errorCode `TBD after adoption`（倾向 vendor 段，见 §8）。通道级错误（载荷字段非法等）才走 `status.ok=false` + 通用码。`[REVIEW-DRAFT]`

#### 3.1.4 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| （无） | 本方法不触发任何自定义事件 | — | 安装结果经 `license.reportReceipt` 回报（或本调用响应 accepted=true 作为同一逻辑尝试的 ACK）。 |

#### 3.1.5 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `LICENSE_CREDENTIAL_STALE`（候选） | 凭证 (修订号, 代次) 低于设备本地高水位（防回滚）或验签失败。 | 业务 result 形态：accepted=false + errorCode（非通道错误）；平台不重发旧版（补发永远取台账最新）。 |
| `INVALID_ARGUMENT`（占位） | 载荷字段非法/工件损坏。 | 返回字段路径。 |

#### 3.1.6 规则

- 串行下发：同设备同时刻至多一张在途凭证；多授权来源在平台侧聚合为一份凭证，设备对多 Grant 无感知。
- 下发结果未知（通道超时/断连）MUST 归为「结果未知」而非失败：不判失败、不触发旧版重发覆盖新版本，等待对账收敛。
- 本调用响应 accepted=true 可作为安装确认（DEVICE_ACK）依据——平台对本方法响应 ACK 与 `reportReceipt` 走同一采信逻辑（deliveryRef = 当次 deliveryId），二者重复到达幂等、acknowledged 指针只进不退。
- `policyVersion` / `deliveryId` / `reason` 为通道侧元数据（axlic 冻结载荷不可增字段），不进入 CBOR 工件。
- 设备侧验签、身份匹配（deviceId 绑定）、原子安装与权益判定是设备内部行为（axlic 冻结合同）；验证失败 fail-closed 判无权限，不得导致接收桥变砖。

### 3.2 `license.reportReceipt`

**用途**：设备向平台回报一次下发/导出尝试的结果（安装确认/离线导出/拒绝），平台按采信条件更新台账。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `ReportReceiptParams` |
| Result Schema | `ReportReceiptResult` |
| 是否触发事件 | 否（零自定义事件，见 §4） |
| 幂等性 / 异步性 | 同步受理；同一逻辑下发尝试的回执事件幂等（重复上报不产生双重计数）；acknowledged 指针只进不退 |
| 常见错误 | `INVALID_ARGUMENT`（字段非法）；采信不满足时以 accepted=false 应答而非错误 |

#### 3.2.1 请求参数 Params：`ReportReceiptParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `deviceId` | string | yes | `^dev_[0-9a-f]{32}$` | none | 设备主体标识（校验字段，与连接身份一致）。 |
| `credentialId` | string | yes | uuid 格式 | none | 回执针对的凭证工件标识。 |
| `outcome` | string enum | yes | `INSTALLED` / `EXPORTED` / `REJECTED` | none | 安装确认 / 离线导出记录 / 拒绝。 |
| `errorCode` | string | no | 候选 `LICENSE_CREDENTIAL_STALE` | none | outcome=REJECTED 时必填；亦为设备拒绝 `deliverCredential` 的唯一拒绝码。 |
| `deliveryRef` | string | no | 平台下发尝试标识（deliveryId 原样回传） | none | 通道链路回执必填；离线导出（无通道下发）场景可缺省——平台按 credentialId 反查台账校验采信条件。 |

#### 3.2.2 返回结果 Result：`ReportReceiptResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `accepted` | bool | yes | true / false | none | true = 回执被受理记录；false = 不满足采信条件（无对应下发尝试/工件不符），台账不变。accepted=true 仅表示受理，安装指针仅由 INSTALLED 推进。 |

#### 3.2.3 d block 示例

request:

```json
{
  "id": 202,
  "method": "license.reportReceipt",
  "params": {
    "deviceId": "dev_0123456789abcdef0123456789abcdef",
    "credentialId": "3f9d2c68-7b4e-4f2a-9c1d-5e8a7b6c4d21",
    "outcome": "INSTALLED",
    "deliveryRef": "d-8a41c7"
  }
}
```

success:

```json
{
  "id": 202,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "accepted": true
  }
}
```

读法：`accepted=true` 表示回执被采信，台账 acknowledged 指针推进（只进不退）；不可关联/工件不符时同为 `status.ok=true` + `accepted=false`（业务拒绝非通道错误）。

#### 3.2.4 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| （无） | 本方法不触发任何自定义事件 | — | 台账收敛状态可经 `license.reconcile` 查询。 |

#### 3.2.5 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `INVALID_ARGUMENT` | 字段非法（如 REJECTED 缺 errorCode）。 | 返回字段路径。 |
| `NOT_FOUND`（占位） | credentialId 无法反查台账（离线导出场景缺省 deliveryRef 时）。 | accepted=false 同义表达亦可，二选一在 §11 定案。`[REVIEW-DRAFT]` |

#### 3.2.6 规则

- 采信条件：回执必须可关联平台真实下发尝试（deliveryRef 闭环或 credentialId 反查）且与该次尝试选定工件一致；不满足 → accepted=false，台账不变。
- EXPORTED 仅记录事件，MUST NOT 视为安装成功（不推进安装指针）；REJECTED 记录设备拒绝事件。
- 已知风险（会话层无鉴权现状）：不可关联假回执由采信条件拦截；可关联假回执（冒用连接持真 deliveryId 代确认）为已登记已知风险，通道鉴权/回执签名为演进项（flow OQ-4）。
- 采信判定与台账指针推进是平台侧行为；本协议只定义回执结构与受理结果。

## 4. 事件 Events

本 feature 不定义任何自定义事件。下发进度、安装结果、收敛信号全部经 Request/Response 表达。

设计约束（来自 flow §7）：licensing 域零自定义事件——SDK broker 对带点号的未注册事件名静默丢弃，事件通道不可依赖。

## 5. Capability

Capability name（候选）: `license.credentialDelivery`。`[REVIEW-DRAFT]`

`deliverCredential` / `resolveCredential` 为设备侧实现（云→设备调用），capability 面向设备侧声明接收/安装能力，建模相对自然；`reportReceipt` 为云侧实现，capability 归属随双向 RPC 建模（flow OQ-5）定案，见 §11。

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `license.credentialDelivery` | none | capability 名称。 |
| `maxArtifactBytes` | uint32 | yes | ≤ 65536 | none | 设备可接收的单工件字节上限（64 KiB）。 |
| `maxEntitlements` | uint32 | yes | ≤ 256 | none | 单凭证权益条目数上限。 |
| `supportedReasons` | array\<string\> | yes | `ISSUE` / `REVISE` / `REVOKE` 子集 | none | 支持的下发语义。 |

## 6. 字段 / Schemas

简单 feature：字段表已在方法小节直接展开，本章仅保留索引。

| Schema | 用途 | 定义位置 |
|---|---|---|
| `DeliverCredentialParams` | 下发请求（工件 + 通道侧元数据） | §3.1.1 |
| `DeliverCredentialResult` | 下发应答（accepted / errorCode） | §3.1.2 |
| `ReportReceiptParams` | 回执请求（outcome / deliveryRef 闭环） | §3.2.1 |
| `ReportReceiptResult` | 回执受理结果 | §3.2.2 |

## 7. 交互流程示例 Flow Examples

```text
平台签发完成（台账新增聚合凭证 + 下发指针 selected）
→ 云调用 license.deliverCredential（串行，deliveryId = d-8a41c7）
→ 设备验签 / 身份匹配 / 原子安装
→ 设备调用 license.reportReceipt(INSTALLED, deliveryRef = d-8a41c7)
← accepted=true → 台账 acknowledged 指针推进 → 已确认收敛
（通道超时 → 结果未知 → 设备上线后经 license.reconcile 收敛，见 license.reconciliation 草案）
```

## 8. 错误

| 错误 | 适用场景 | 说明 |
|---|---|---|
| `LICENSE_CREDENTIAL_STALE`（候选） | 凭证版本低于设备高水位（防回滚）或验签失败——设备拒绝下发/REJECTED 回执的唯一拒绝码。 | 候选码倾向 vendor 段（对方仓提案 0x7003）；正式 errorCode `TBD after adoption` `[REVIEW-ASK]`。 |
| `LICENSE_DEVICE_NOT_FOUND`（候选，关联） | deviceId 无法定位主体（回执/探测侧）——详见 `license.reconciliation` 草案 §8。 | 同上（对方仓提案 0x7002）。 |

对方仓候选码 0x7004–0x7006（NOT_ENTITLED / RATE_LIMITED / INTERNAL）不进本提案，处置口径见 `license.registration` §8。

## 9. Legacy 映射

暂无。

## 10. 测试重点与采纳风险

| 类型 | 要点 |
|---|---|
| registry readiness | none——license 域未注册；方法与错误码 ID `TBD after adoption`。 |
| conformance focus | 串行下发不变量（同设备至多一张在途）、超时=结果未知、回执采信条件、EXPORTED 不算安装、ACK 与回执同一采信逻辑幂等。 |
| happy path | ISSUE 下发 → INSTALLED 回执 → accepted=true 收敛。 |
| boundary case | 空权益集清权凭证（reason=REVOKE）为合法工件必须可安装；Base64 大载荷（≈87KB）通道承载。 |
| error case | 防回滚拒绝（旧版本凭证）；不可关联回执 accepted=false；REJECTED 缺 errorCode 拒请求。 |
| compatibility | 仅 JSON 编码；`errorCode`/`deliveryRef` 字段语义与对方仓契约对齐（其数值码引用误引已登记 flow OQ-6，以 registry 值为准）。 |

## 11. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| 专属错误码落位：vendor 段（对方仓提案 0x7001–0x7006）还是共享码/业务段？ | registry | 倾向 vendor 段（用户倾向已记录）；采纳时补 specs/30-registry.md vendor 段规则 | open `[REVIEW-ASK]` |
| result 中 `errorCode` 字段形态：候选错误名 string（对方仓契约形态）vs 采纳后数值？ | schema | 草案按候选名 string；采纳后若定码可评估数值化 | open `[REVIEW-DRAFT]` |
| 采信不满足时「accepted=false 应答 vs NOT_FOUND 通道错误」二选一 | schema / 语义 | 建议 accepted=false（业务语义、台账不变可观测） | open `[REVIEW-DRAFT]` |
| 云侧实现方法（reportReceipt）的 capability 表达与双向 RPC registry 建模 | registry / capability | 随 flow OQ-5 定案 | open |
| 与 `system.license` 草案命名冲突（同 license.registration §11） | registry | 随域级评审一并处置（flow OQ-2） | open |

## 附录 C. Registry 草案输入

候选输入——非正式事实；全部 ID `TBD after adoption`。对方仓提案素材（domain `0x19`、方法 `0x1904`/`0x1902`、错误码 `0x7003`）仅作提案记录，正式值以 registry 评审为准。

```yaml
# contract/registry/domains/license/domain.yaml 候选片段（TBD after adoption）
methods:
  - id: TBD after adoption
    name: license.deliverCredential
    domain: license
    status: draft
    bitOffset: TBD after adoption
    since: TBD after adoption
    description: Push one signed credential artifact to the device with channel-side metadata; the device verifies, matches, and atomically installs it.
    rpc_op: request_response
    request_schema: DeliverCredentialParams
    response_schema: DeliverCredentialResult
    recommended_encoding: [json]
    errors: [SUCCESS, INVALID_ARGUMENT]        # 候选 LICENSE_CREDENTIAL_STALE 待定码（result 形态业务拒绝）
  - id: TBD after adoption
    name: license.reportReceipt
    domain: license
    status: draft
    bitOffset: TBD after adoption
    since: TBD after adoption
    description: Report an install/export/reject receipt for a delivery attempt; accepted only when it correlates to a real platform delivery.
    rpc_op: request_response
    request_schema: ReportReceiptParams
    response_schema: ReportReceiptResult
    recommended_encoding: [json]
    errors: [SUCCESS, INVALID_ARGUMENT, NOT_FOUND]
capabilities:
  - id: TBD after adoption
    name: license.credentialDelivery
    domain: license
    status: draft
    since: TBD after adoption
    description: 设备侧凭证接收、验签安装与回执能力声明。
    type: object
    schema: LicenseCredentialDeliveryCapabilities
types:
  DeliverCredentialParams:
    kind: object
    fields:
      - id: TBD after adoption
        name: credentialId
        type: string
        required: true
        max_length: 36
      - id: TBD after adoption
        name: deliveryId
        type: string
        required: true
        max_length: 64            # 候选上限，采纳时定 [REVIEW-DRAFT]
      - id: TBD after adoption
        name: authorityRevision
        type: uint32
        required: true
      - id: TBD after adoption
        name: credentialGeneration
        type: uint32
        required: true
      - id: TBD after adoption
        name: policyVersion
        type: uint32
        required: true
      - id: TBD after adoption
        name: reason
        type: enum
        enum: [ISSUE, REVISE, REVOKE]
        required: true
      - id: TBD after adoption
        name: cborBase64
        type: string
        required: true
        max_length: 87384         # 64KiB 工件 Base64（含填充）上限 [REVIEW-DRAFT]
  ReportReceiptParams:
    kind: object
    fields:
      - id: TBD after adoption
        name: deviceId
        type: string
        required: true
        max_length: 36
      - id: TBD after adoption
        name: credentialId
        type: string
        required: true
        max_length: 36
      - id: TBD after adoption
        name: outcome
        type: enum
        enum: [INSTALLED, EXPORTED, REJECTED]
        required: true
      - id: TBD after adoption
        name: errorCode
        type: string
        required: false           # REJECTED 时必填（规则层表达）
        max_length: 64
      - id: TBD after adoption
        name: deliveryRef
        type: string
        required: false
        max_length: 64
  LicenseCredentialDeliveryCapabilities:
    kind: object
    fields:
      - id: TBD after adoption
        name: maxArtifactBytes
        type: uint32
        required: true
        max: 65536
      - id: TBD after adoption
        name: maxEntitlements
        type: uint32
        required: true
        max: 256
      - id: TBD after adoption
        name: supportedReasons
        type: array
        array:
          item_type: string
        required: true
```

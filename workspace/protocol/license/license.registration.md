---
status: draft
contract: false
generated: false
domain: license
feature: license.registration
registry:
lastReviewed: 2026-11-17
---

# license.registration

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 设备经云反连通道识别成功后向平台注册设备主体（幂等），触发平台按默认策略自动签发授权凭证（异步受理）。 |
| 当前状态 | draft |
| 是否可直接实现 | 否。draft 阶段仅供评审；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC（设备→云调用；零自定义事件） |
| 是否使用 STREAM | 否 |
| Registry readiness | none（license 域未注册；方法/错误码 ID 均 `TBD after adoption`） |
| Conformance | needed |
| 主要未决问题 | 专属错误码落位（vendor 段 vs 共享码）、capability 建模方向、与既有 `system.license` 草案的命名冲突（见 §11）。 |

## 1. 功能说明

设备（接收桥 + 设备侧身份模块）经 `AXTP-WS-CLOUD-REVERSE` 通道反连、会话识别成功（`device.getInfo` 自报 deviceId）后，主动调用本方法完成设备主体注册。平台从连接上下文采纳 deviceId 登记主体，按唯一默认策略自动签发授权凭证（异步完成，凭证经 `license.deliverCredential` 推送或后续 `license.reconcile` 取得）。注册与工作空间归属解耦、与授权签发为独立记录的事实。

公共 RPC envelope、错误约定与 schema 展开遵循 [Protocol Draft Conventions](../draft-conventions.md)。业务场景与协议覆盖分析见 [license-entitlement-lifecycle flow](../../flows/license-entitlement-lifecycle.md)；接口素材来源：aw-saas-platform 仓 `apps/api/specs/001-license-entitlement-system/contracts/axtp-licensing-methods.md`。

> 方向术语：本文以「设备→云」描述调用方向。cloud-reverse 通道中设备为逻辑服务端（`contract/protocol/axtp.protocol.yaml:164-169`），设备→云调用为逻辑服务端发起的反向 Request；SDK 实装角色模型存在待裁决矛盾（flow OQ-1），方向建模见 §11。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 设备主体注册（幂等、采纳连接身份）、注册状态返回（REGISTERED / EXISTING）、未收敛标志（credentialPending）、触发自动签发的受理语义。 |
| 不包含 | 凭证下发与回执（归 `license.credentialDelivery`）；对账与版本探测（归 `license.reconciliation`）；自动签发链路本身、吊销/恢复/换绑（平台内部与管理面操作，非协议面）。 |
| 数据面 | 所有操作均通过 RPC method 完成；本 feature 不定义 STREAM。 |

## 3. 方法 Methods

### 3.0 方法速览

| Method | 调用类型 | 用途 | Params Schema | Result Schema | 是否触发事件 | 状态 |
|---|---|---|---|---|---|---|
| `license.registerIdentity` | command | 设备主体注册（幂等）+ 触发自动签发受理 | `Empty`（候选，见 §11） | `RegisterIdentityResult` | 否 | draft |

### 3.1 `license.registerIdentity`

**用途**：识别成功后由设备调用，平台采纳连接上下文中的 deviceId 登记设备主体；新主体返回 REGISTERED 并受理自动签发，已注册主体幂等返回 EXISTING。

| 项 | 内容 |
|---|---|
| 调用类型 | command |
| Params Schema | `Empty`（候选——空对象，演进预留；见 3.1.6 规则） |
| Result Schema | `RegisterIdentityResult` |
| 是否触发事件 | 否（零自定义事件，见 §4） |
| 幂等性 / 异步性 | 同步受理、幂等（deviceId 命中即 EXISTING）；自动签发异步完成，凭证勿在此同步等待 |
| 常见错误 | `INVALID_ARGUMENT`（采纳校验失败的通用占位）、候选 `LICENSE_IDENTITY_INVALID`（见 §8） |

#### 3.1.1 请求参数 Params：`Empty`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| （无业务字段） | — | — | — | — | 空对象。deviceId 恒取连接上下文（识别绑定的自报身份），请求不携带、也无法覆盖。是否复用已注册 `Empty` schema 或定义 feature 专属空 params（演进预留）见 §11。 |

#### 3.1.2 返回结果 Result：`RegisterIdentityResult`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `deviceId` | string | yes | `^dev_[0-9a-f]{32}$`（36 字符） | none | 平台采纳登记的设备主体标识（= 连接识别的 deviceId，非平台分配值）。 |
| `status` | string enum | yes | `REGISTERED` / `EXISTING` | none | 新注册 / 幂等命中（deviceId 命中即 EXISTING，不产生重复主体）。 |
| `credentialPending` | bool | yes | true / false | none | 台账存在未收敛（下发指针未收敛、有授权无凭证、清权未产出、聚合漂移四类口径）时为 true——凭证经推送或后续对账取得；EXISTING 且已收敛时为 false。 |

#### 3.1.3 d block 示例

request:

```json
{
  "id": 101,
  "method": "license.registerIdentity",
  "params": {}
}
```

success:

```json
{
  "id": 101,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "deviceId": "dev_0123456789abcdef0123456789abcdef",
    "status": "REGISTERED",
    "credentialPending": true
  }
}
```

error（采纳格式校验失败——终态错误示意）:

```json
{
  "id": 101,
  "status": {
    "ok": false,
    "code": 10,
    "details": {
      "candidateError": "LICENSE_IDENTITY_INVALID"
    }
  }
}
```

读法：`code: 10` 为最近通用码 `INVALID_ARGUMENT` 占位；候选错误 `LICENSE_IDENTITY_INVALID` 的正式 errorCode `TBD after adoption`（倾向 vendor 段，见 §8）。格式不符为**终态错误**——设备侧应视为致命错误、重建本地身份后重试，而非可重试暂态错误。

#### 3.1.4 可能触发的事件

| Event | 触发条件 | Payload Schema | 客户端处理建议 |
|---|---|---|---|
| （无） | 本方法不触发任何自定义事件 | — | 未收敛信号由 `credentialPending` 表达；凭证到达经 `license.deliverCredential` 调用。 |

#### 3.1.5 错误

| 错误 | 场景 | 返回建议 |
|---|---|---|
| `INVALID_ARGUMENT`（占位） | deviceId 采纳校验失败：格式不符 `^dev_[0-9a-f]{32}$`，或已被其他主体占用。 | 候选 `LICENSE_IDENTITY_INVALID`；格式不符为终态语义（设备重建本地身份，勿原样重试）。 |
| `UNAVAILABLE` | 平台签发后端暂不可用等瞬态。 | 设备可稍后重试或经对账补签。 |

#### 3.1.6 规则

- 识别成功是注册前置：连接识别由会话层 `device.getInfo` 完成，身份未就绪的连接被断开重试属连接层正确行为，不构成本方法错误。
- responder MUST 忽略 params 全部字段（含未来扩展字段）——deviceId 恒以连接上下文为准，params 为纯演进预留，防参数层覆盖连接身份。
- 注册幂等仅约束主体唯一（一 deviceId 至多一个设备主体）与首个自动签发授权的幂等发放键；主体已存在但零有效授权且权威态非吊销时，EXISTING 命中可重触发自动签发（平台侧幂等防线，重放无害）。
- 权威态已吊销（REVOKED）的主体重连注册：EXISTING 幂等命中，不恢复任何授权、不重触发自动签发；授权恢复仅经管理面操作。
- 注册不携带、也不推断工作空间归属；license 域零工作空间信息。

## 4. 事件 Events

本 feature 不定义任何自定义事件。状态与未收敛信号全部经 Request/Response 表达；凭证到达经 `license.deliverCredential` 云→设备调用承载。

设计约束（来自 flow §7）：licensing 域零自定义事件——SDK broker 对带点号的未注册事件名静默丢弃，事件通道不可依赖。

## 5. Capability

Capability name（候选）: `license.registration`。`[REVIEW-DRAFT]`

本方法为云侧实现（设备→云调用），capability 的设备侧语义为「设备完成识别后会主动发起注册」；云侧方法的 capability 表达方式（是否声明、由谁声明）依赖双向 RPC 的 registry 建模定案（flow OQ-5），见 §11。

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `license.registration` | none | capability 名称。 |
| `deviceIdFormat` | string | yes | `^dev_[0-9a-f]{32}$` | none | 设备自报 deviceId 的格式声明（采纳校验口径）。`[REVIEW-DRAFT]` |

## 6. 字段 / Schemas

简单 feature：字段表已在方法小节直接展开，本章仅保留索引。

| Schema | 用途 | 定义位置 |
|---|---|---|
| `Empty` | 注册请求空对象（候选复用已注册 Empty schema） | §3.1.1 |
| `RegisterIdentityResult` | 注册应答（deviceId / status / credentialPending） | §3.1.2 |

## 7. 交互流程示例 Flow Examples

```text
设备本地建立身份（deviceId = dev_+32hex）
→ 反连 + 会话握手 + device.getInfo 识别（会话层，generated 事实）
→ 设备调用 license.registerIdentity（空 params）
← REGISTERED / EXISTING + credentialPending
（自动签发异步完成 → 凭证经 license.deliverCredential 推送，见 license.credentialDelivery 草案）
```

## 8. 错误

| 错误 | 适用场景 | 说明 |
|---|---|---|
| `LICENSE_IDENTITY_INVALID`（候选） | deviceId 采纳校验失败：格式不符（终态——设备重建本地身份后重试，非可重试暂态）或已被其他主体占用。 | 候选码倾向 vendor 段（对方仓提案 0x7001；本仓 vendor 段零使用先例，采纳时需在 specs/30-registry.md 补 vendor 段使用规则）`[REVIEW-ASK]`；正式 errorCode `TBD after adoption`。 |

其余对方仓候选码不进本提案（处置口径，另两份草案 §8 同引）：

| 候选码（对方仓提案） | 处置 | 理由 |
|---|---|---|
| `LICENSE_NOT_ENTITLED`（0x7004） | 不注册 | 正常流不出现（无有效授权时不会到达方法语义层）；如需表达可由共享 `NOT_FOUND` / `PERMISSION_DENIED` 承载。 |
| `LICENSE_RATE_LIMITED`（0x7005） | 不注册（码位可随域提案保留） | 对方仓定案 D2S responder 不限流（1000 台并发上线为合法场景，重放幂等无危害）；限流启用时再提案。 |
| `LICENSE_INTERNAL`（0x7006） | 不注册 | 复用共享 `INTERNAL_ERROR`（0x000E）。 |

## 9. Legacy 映射

暂无（legacy SN 桥接体系已废除，见 flow 速读结论）。

## 10. 测试重点与采纳风险

| 类型 | 要点 |
|---|---|
| registry readiness | none——license 域未注册（候选高字节 0x19 待评审）；方法与错误码 ID `TBD after adoption`。 |
| conformance focus | 幂等（重复注册不产生重复主体）、params 全字段忽略（连接身份不可被参数覆盖）、吊销主体重注册不恢复授权。 |
| happy path | 首次注册返回 REGISTERED + credentialPending=true；重连再注册返回 EXISTING。 |
| boundary case | 非 axlic 客户端自报任意非空串：识别成功但注册恒拒（终态 0x7001 候选语义）——「识别成功 × 采纳永拒」组合失效模式的契约出口。 |
| error case | 格式不符终态拒绝；占用拒绝；瞬态不可用可重试。 |
| compatibility | 仅 JSON 编码（cloud-reverse 通道）；TLV 为演进。 |

## 11. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| 专属错误码落位：vendor 段（对方仓提案 0x7001–0x7006）还是复用共享错误码？ | registry | 倾向 vendor 段（跨仓对齐成本最低）；本仓无先例，采纳时需补 specs/30-registry.md vendor 段使用规则 | open（用户倾向已记录）`[REVIEW-ASK]` |
| 空 params 复用已注册 `Empty` schema，还是定义 feature 专属空 params（演进预留语义入 schema）？ | schema | 复用 `Empty` + 规则层表达「忽略全部字段」 | open `[REVIEW-DRAFT]` |
| 云侧实现方法的 capability 表达（设备声明注册意愿 vs 云声明受理能力）与双向 RPC 的 registry 建模 | registry / capability | 随 flow OQ-5 一并定案 | open |
| 与既有 `workspace/protocol/system/system.license.md` 草案的命名冲突处置（泛型配置 CRUD 语义 vs 设备授权链语义） | registry / 命名治理 | 新立 license 域；旧草案废弃/改名待评审（flow OQ-2） | open |
| cloud-reverse 角色模型矛盾（协议 IR helloSender=Device vs SDK 实装）对方向描述的影响 | spec 一致性 | 以 flow OQ-1 裁决为准，必要时 `amend-adopted-protocol` | open |
| 方法命名与对方仓契约一致性（`license.registerIdentity`） | 跨仓对齐 | 保持同名对齐 | open `[REVIEW-DRAFT]` |

## 附录 C. Registry 草案输入

候选输入——非正式事实；全部 ID `TBD after adoption`。对方仓提案素材（domain `0x19`、方法 `0x1901`、错误码 `0x7001`）仅作提案记录，正式值以 registry 评审为准。

```yaml
# contract/registry/domains/license/domain.yaml 候选片段（TBD after adoption）
methods:
  - id: TBD after adoption
    name: license.registerIdentity
    domain: license
    status: draft
    bitOffset: TBD after adoption
    since: TBD after adoption
    description: Register the device subject from the connection identity (idempotent) and accept automatic entitlement issuance.
    rpc_op: request_response
    request_schema: Empty            # 候选复用已注册 Empty；或定义专属空 params，见 §11
    response_schema: RegisterIdentityResult
    recommended_encoding: [json]     # cloud-reverse 通道仅 JSON；TLV 为演进 [REVIEW-ASK]
    errors: [SUCCESS, INVALID_ARGUMENT, UNAVAILABLE]   # 候选 LICENSE_IDENTITY_INVALID 待定码
capabilities:
  - id: TBD after adoption
    name: license.registration
    domain: license
    status: draft
    since: TBD after adoption
    description: 设备注册流程支持声明（识别成功后主动发起注册）。
    type: object
    schema: LicenseRegistrationCapabilities
types:
  RegisterIdentityResult:
    kind: object
    fields:
      - id: TBD after adoption       # schema-local fieldId，采纳时自 0x01 起分配
        name: deviceId
        type: string
        required: true
        max_length: 36
      - id: TBD after adoption
        name: status
        type: enum
        enum: [REGISTERED, EXISTING]
        required: true
      - id: TBD after adoption
        name: credentialPending
        type: bool
        required: true
  LicenseRegistrationCapabilities:
    kind: object
    fields:
      - id: TBD after adoption
        name: deviceIdFormat
        type: string
        required: true
        max_length: 32
```

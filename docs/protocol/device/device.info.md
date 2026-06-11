---
status: review-ok
contract: false
generated: false
domain: device
feature: device.info
registry:
lastReviewed: 2026-06-10
---

# device.info

## 0. 速读结论

| 项目 | 内容 |
|---|---|
| 这个能力做什么 | 只读获取当前主设备身份、产品、硬件、OS、软件、AXTP runtime 和轻量 capability 建模摘要。 |
| 当前状态 | review-ok |
| 是否可直接实现 | 否。本文是 protocol draft；正式实现以 registry / generated 为准。 |
| 主要交互 | RPC |
| 是否使用 STREAM | 否 |
| Registry readiness | candidate |
| Conformance | needed |
| 主要未决问题 | productType / os.type / component role enum、legacy 敏感字段和 capability profile 来源仍需确认。 |

## 1. 功能说明

`device.info` 用于只读获取当前 AXTP endpoint 代表的主设备信息，回答“这台设备是谁、是什么产品、运行什么系统和 AXTP runtime”。

本文是 `docs/protocol` 下的评审草案，不是 runtime 实现合同。当前 generated 协议没有 adopted `device.info` 方法；本文中的 method、schema 和字段均为候选，正式 ID 和 fieldId 必须在 registry 采纳时分配。

## 2. 能力边界

| 类型 | 内容 |
|---|---|
| 包含 | 当前主设备的 `identity`、`product`、`hardware`、`os`、`software`、`runtime` 和轻量 `capability` 建模摘要。 |
| 包含 | `device.identity` 的只读字段；本 flow 不再保留独立 `device.identity` capability。 |
| 包含 | 让调用方快速识别设备大体按哪些 `domain.feature` 建模的 capability summary。 |
| 不包含 | 子设备、级联设备、拓扑树；这些归 `device.childDevice` 或后续 topology feature。 |
| 不包含 | CPU、内存使用率、uptime、runtime 运行状态；这些归 `system.state`。 |
| 不包含 | 关机、重启、计划关机/重启；这些归 `system.lifecycle`。 |
| 不包含 | 恢复默认设置、恢复出厂设置；这些归 `system.reset`。 |
| 不包含 | 设备显示名、资产标识等写入接口；有具体设置需求后另起草设置协议。 |
| 不包含 | 信息变化通知事件；本轮不定义 `device.infoChanged`。 |
| 数据面 | 不使用 STREAM；所有操作都是 RPC request/response。 |

## 3. 方法

方法 ID、bitOffset 和 schema fieldId 均为 `TBD after adoption`，由 registry 采纳时分配。

| method | 调用类型 | 说明 | params | result | 错误 | 状态 |
|---|---|---|---|---|---|---|
| `device.getInfo` | query | 读取当前 endpoint 主设备信息。默认返回 capability 建模摘要，不返回 children。 | `GetDeviceInfoParams` | `DeviceInfo` | `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `INTERNAL_ERROR` | review-ok |

### `device.getInfo`

| 项 | 内容 |
|---|---|
| 说明 | 读取当前主设备身份、产品、硬件、OS、软件组件、AXTP runtime 和轻量 capability summary。 |
| 调用类型 | query |
| params | `GetDeviceInfoParams` |
| result | `DeviceInfo` |
| 错误 | `SUCCESS`, `NOT_SUPPORTED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `INTERNAL_ERROR`；候选业务错误见错误表。 |
| 备注 | `device.getInfo` 是只读信息查询，不设置设备名，不返回子设备列表，不替代完整 capability registry 查询。 |

#### Params 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `includeCapabilitySummary` | boolean | no | `true`, `false` | `true` | 是否返回轻量 `capability` 建模摘要。 |

#### Result 字段

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `identity` | `DeviceIdentity` | yes | see schema | none | 设备稳定身份字段。 |
| `product` | `DeviceProduct` | yes | see schema | none | 品牌、产品类型、型号和展示名。 |
| `hardware` | `DeviceHardware` | no | see schema | omitted | 硬件修订、CPU 架构和物理内存摘要。 |
| `os` | `DeviceOs` | no | see schema | omitted | 操作系统类型、名称、版本和架构。 |
| `software` | `DeviceSoftware` | no | see schema | omitted | 设备上承载业务和 AXTP 的软件组件。 |
| `runtime` | `DeviceAxtpRuntime` | no | see schema | omitted | 当前 AXTP runtime 与 host app。 |
| `capability` | `DeviceCapabilitySummary` | no | see schema | omitted | 轻量建模摘要；不含完整 methods/events/permissions。 |

## 4. 事件

本轮不定义 `device.info` 事件。

| event | 触发条件 | payload | 客户端处理建议 | 状态 |
|---|---|---|---|---|
| none | none | none | 本 feature 当前没有事件；客户端需要刷新时重新调用 `device.getInfo`。如未来出现设备名、资产标识、软件版本或 capability 变化通知需求，应基于具体业务场景另行起草事件。 | deferred |

## 5. Capability

Capability name: `device.info`。

| 能力字段 | 类型 | 必填 | 取值范围 / 枚举 | 说明 |
|---|---|---:|---|---|
| `capability` | string | yes | fixed `device.info` | capability 名称。 |
| `readOnly` | boolean | yes | `true` | 本轮只读，不提供 set/reset/change event。 |
| `supportsCapabilitySummary` | boolean | no | `true`, `false` | 是否支持在 `device.getInfo` 中返回轻量建模摘要。 |
| `identityMerged` | boolean | no | `true` | 表示 `device.identity` 已合并到 `device.info`，不再作为独立 capability。 |

## 6. 字段 / Schemas

### 6.1 Schema 层级速览

`device.info` 是只读信息快照，核心结构按信息来源分组，不把所有字段压在一个平面对象里。

| 层级 | 用在哪里 | 作用 |
|---|---|---|
| request selector | `device.getInfo` params | 控制是否返回 capability summary。 |
| device info snapshot | `device.getInfo` result | 当前主设备的身份、产品、硬件、OS、软件、runtime 和建模摘要。 |
| capability summary | `DeviceInfo.capability` | 只表达设备大体建模方式；完整方法、事件、权限和动态可用性走 `capability.registry`。 |

```text
DeviceInfo
  identity: DeviceIdentity
  product: DeviceProduct
  hardware: DeviceHardware
  os: DeviceOs
  software: DeviceSoftware
    components: SoftwareComponent[]
  runtime: DeviceAxtpRuntime
  capability: DeviceCapabilitySummary
```

阅读规则：

- `identity` 是稳定标识，用于关联同一台设备。
- `product` 是产品身份和用户可见名称；`product.model` 不承载 Launcher 等软件名。
- `software.components` 描述 Launcher、Signage、Cast Receiver 等软件组件。
- `runtime` 描述当前 AXTP runtime 和承载 runtime 的 host app。
- `capability` 是摘要，不是正式能力 registry。

### 6.2 请求与响应 Schemas

#### `GetDeviceInfoParams`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `includeCapabilitySummary` | boolean | no | `true`, `false` | `true` | 是否返回 `DeviceInfo.capability`。设为 `false` 时设备可以省略该字段以减少 payload。 |

#### `DeviceInfo`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `identity` | `DeviceIdentity` | yes | see 6.4 | none | 稳定身份字段。 |
| `product` | `DeviceProduct` | yes | see 6.4 | none | 产品、型号和展示名。 |
| `hardware` | `DeviceHardware` | no | see 6.4 | omitted | 硬件摘要。 |
| `os` | `DeviceOs` | no | see 6.4 | omitted | 操作系统摘要。 |
| `software` | `DeviceSoftware` | no | see 6.4 | omitted | 软件组件摘要。 |
| `runtime` | `DeviceAxtpRuntime` | no | see 6.4 | omitted | AXTP runtime 摘要。 |
| `capability` | `DeviceCapabilitySummary` | no | see 6.4 | omitted | 轻量建模摘要；`includeCapabilitySummary=false` 时可省略。 |

### 6.3 Capability Schemas

#### `DeviceInfoCapability`

这是 `device.info` 的 capability 描述候选；正式形态由 registry 采纳时确定。

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `capability` | string | yes | fixed `device.info` | none | capability 名称。 |
| `readOnly` | boolean | yes | `true` | `true` | `device.info` 当前只有只读方法。 |
| `supportsCapabilitySummary` | boolean | no | `true`, `false` | `true` | 是否支持在返回值里带建模摘要。 |

### 6.4 各对象字段

#### `DeviceIdentity`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `deviceId` | string | yes | product/runtime-defined stable id | none | AXTP/业务系统使用的稳定设备 ID。 |
| `serialNumber` | string | no | vendor serial number | omitted | 厂商序列号。 |
| `vendorId` | string | no | vendor id，例如 `nearhub` | omitted | 厂商 ID。 |
| `productId` | string | no | product id，例如 `nh-win-box-a1` | omitted | 产品 ID。 |

#### `DeviceProduct`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `brand` | string | no | brand name | omitted | 品牌。 |
| `productType` | string enum | yes | `windowsDevice`, `androidDevice`, `embeddedDevice`, `rtosDevice`, `cameraDevice`, `displayDevice`, `unknown` candidate | none | 产品类型；首批 enum 仍需产品和 runtime 确认。 |
| `model` | string | yes | hardware / whole-product model | none | 硬件或整机型号，不填软件名。 |
| `displayName` | string | no | user-visible name | omitted | 用户可见设备名称；本轮只读返回，不提供写入接口。 |

#### `DeviceHardware`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `revision` | string | no | hardware revision | omitted | 硬件版本或修订号。 |
| `cpuArch` | string enum | no | `x86_64`, `arm64`, `armv7`, `riscv64`, `unknown` candidate | omitted | CPU 架构。 |
| `memoryBytes` | uint64 | no | `0..uint64 max` | omitted | 物理内存容量，单位 byte。 |

#### `DeviceOs`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `type` | string enum | yes | `windows`, `android`, `linux`, `rtos`, `unknown` candidate | none | OS 类型；首批 enum 仍需确认。 |
| `name` | string | no | OS display name | omitted | OS 名称。 |
| `version` | string | no | OS version string | omitted | OS 版本。 |
| `arch` | string enum | no | `x86_64`, `arm64`, `armv7`, `riscv64`, `unknown` candidate | omitted | OS 架构。 |

#### `DeviceSoftware`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `components` | `SoftwareComponent[]` | no | array | omitted | Launcher、Signage、Cast Receiver 等软件组件。 |

#### `SoftwareComponent`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `id` | string | yes | stable component id | none | 软件组件稳定 ID。 |
| `name` | string | no | display name | omitted | 软件显示名。 |
| `version` | string | no | semver or product version | omitted | 软件版本。 |
| `role` | string enum | no | `axtpHost`, `signagePlayer`, `castReceiver`, `runtimeService`, `unknown` candidate | omitted | 软件在设备中的角色。 |

#### `DeviceAxtpRuntime`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `axtpRuntime` | string | no | runtime implementation name | omitted | AXTP runtime 名称。 |
| `axtpRuntimeVersion` | string | no | runtime version | omitted | AXTP runtime 版本。 |
| `hostAppId` | string | no | `SoftwareComponent.id` | omitted | 承载 AXTP runtime 的 host app ID。 |

#### `DeviceCapabilitySummary`

| 字段名 | 类型 | 必填 | 取值范围 / 枚举 | 默认值 | 说明 |
|---|---|---:|---|---|---|
| `profile` | string | no | product/profile id | omitted | 产品或设备建模 profile，例如 `windows-managed-device`。 |
| `domains` | string[] | no | domain name array | omitted | 设备暴露的主要 domain 摘要。 |
| `features` | string[] | no | `domain.feature` array | omitted | 设备暴露的主要 feature 摘要，可包含尚未 generated 但已用于建模的 feature。 |

## 7. JSON 示例

示例只展示 RPC `d` 数据块，不包裹外层 `sid` / `op` / `d` wire envelope。字段和 ID 在采纳前均为草案。

### 7.1 场景：连接后读取完整主设备信息

App / PC host / cloud console 连接设备后，读取主设备身份、产品、硬件、OS、软件、AXTP runtime 和 capability 建模摘要，用于渲染设备详情页。

#### request

```json
{
  "id": 1,
  "method": "device.getInfo",
  "params": {
    "includeCapabilitySummary": true
  }
}
```

#### response

```json
{
  "id": 1,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "identity": {
      "deviceId": "dev_001",
      "serialNumber": "NH-2026-000001",
      "vendorId": "nearhub",
      "productId": "nh-win-box-a1"
    },
    "product": {
      "brand": "NearHub",
      "productType": "windowsDevice",
      "model": "NH-WIN-BOX-A1",
      "displayName": "NearHub Display Controller"
    },
    "hardware": {
      "revision": "A1",
      "cpuArch": "x86_64",
      "memoryBytes": 8589934592
    },
    "os": {
      "type": "windows",
      "name": "Windows 11 IoT Enterprise",
      "version": "10.0.22631",
      "arch": "x86_64"
    },
    "software": {
      "components": [
        {
          "id": "launcher",
          "name": "NearHub Launcher",
          "version": "1.2.3",
          "role": "axtpHost"
        }
      ]
    },
    "runtime": {
      "axtpRuntime": "axtp-ts-runtime",
      "axtpRuntimeVersion": "0.1.0",
      "hostAppId": "launcher"
    },
    "capability": {
      "profile": "windows-managed-device",
      "domains": ["device", "system"],
      "features": [
        "device.info",
        "device.childDevice",
        "system.state",
        "system.lifecycle",
        "system.reset",
        "system.initialization"
      ]
    }
  }
}
```

读法：`identity` 用于稳定识别设备；`product.model` 是整机型号，不是 Launcher 软件名；`software.components` 描述 Launcher 软件；`runtime.hostAppId` 指向承载 AXTP runtime 的软件组件；`capability.features` 是建模摘要，不替代完整 capability registry。

### 7.2 场景：只读取身份和产品页，不需要 capability summary

客户端只需要展示设备卡片，不需要展示 capability 建模摘要，可以把 `includeCapabilitySummary` 设为 `false`。设备可以省略 `capability` 字段。

#### request

```json
{
  "id": 2,
  "method": "device.getInfo",
  "params": {
    "includeCapabilitySummary": false
  }
}
```

#### response

```json
{
  "id": 2,
  "status": {
    "ok": true,
    "code": 0
  },
  "result": {
    "identity": {
      "deviceId": "dev_001",
      "serialNumber": "NH-2026-000001",
      "vendorId": "nearhub",
      "productId": "nh-win-box-a1"
    },
    "product": {
      "brand": "NearHub",
      "productType": "windowsDevice",
      "model": "NH-WIN-BOX-A1",
      "displayName": "NearHub Display Controller"
    },
    "runtime": {
      "axtpRuntime": "axtp-ts-runtime",
      "axtpRuntimeVersion": "0.1.0",
      "hostAppId": "launcher"
    }
  }
}
```

读法：`includeCapabilitySummary=false` 只影响 `capability` 摘要，不表示隐藏 `identity`、`product` 或 `runtime`。具体设备可以按能力和权限省略 optional 段。

### 7.3 场景：读取失败

设备信息服务不可用或底层读取失败时，返回通用错误码；候选业务错误名放在 `details.candidateError` 中，正式 errorCode 待 registry 采纳。

```json
{
  "id": 3,
  "status": {
    "ok": false,
    "code": 13,
    "msg": "Read device info failed.",
    "details": {
      "candidateError": "DEVICE_INFO_READ_FAILED"
    }
  }
}
```

读法：失败响应不改变设备状态，也不会触发 `device.info` 事件。本草案不定义 `device.infoChanged`。

## 8. 错误

| 错误 | 适用场景 | 说明 |
|---|---|---|
| `NOT_SUPPORTED` | 设备或产品 profile 不支持 `device.info`。 | 正式采纳后通常不应发生；可用于兼容旧设备。 |
| `INVALID_ARGUMENT` | `includeCapabilitySummary` 类型非法或请求结构非法。 | 只读查询不应有其他复杂参数。 |
| `PERMISSION_DENIED` | 当前调用方无权读取设备信息。 | 例如受管理设备限制 SN 或资产信息读取。 |
| `INTERNAL_ERROR` | 设备信息服务、OS 查询或 runtime 查询失败。 | JSON 示例可用 numeric code `13` 表示通用内部错误。 |
| `DEVICE_INFO_READ_FAILED` | 候选业务错误：读取本机信息失败。 | `[REVIEW-DRAFT]`；采纳前确认是否需要 feature-specific errorCode。 |

## 9. Legacy 映射

Legacy 映射是迁移证据，不是 runtime 合同。旧字段名、旧命令名和敏感 payload 不得直接污染正式 `DeviceInfo` schema。

| legacy 项 | 候选映射 | 状态 | 说明 |
|---|---|---|---|
| AXDP `CommonGetEncryptedInfo` 等设备信息命令 | `device.getInfo` | `[REVIEW-ASK]` | 字段级映射和是否包含敏感加密信息需确认；敏感字段可能不属于 `device.info`。 |
| Rooms `GetDeviceInfo` / `GetDevInfo` / `GetSn` | `device.getInfo` | `[REVIEW-ASK]` | SN 和设备详情进入 `identity` / `product`。 |
| Signage / Rooms `SetDeviceName` | out of current draft / future setting protocol | `[REVIEW-OK]` | 本轮不映射到 `device.info`；有明确设置需求后另起草设备名或资产设置协议。 |
| VM33 `System.GetDevInfo` | `device.getInfo` | `[REVIEW-ASK]` | 旧 System namespace 不决定新 domain；按语义归 `device.info`。 |

## 10. Registry / Conformance 状态

| 项 | 状态 | 说明 |
|---|---|---|
| registry | not generated | 当前未写入 `registry/domains/device/domain.yaml`。 |
| generated | false | `docs/generated/**` 未生成 `device.getInfo` / `device.info`。 |
| protocol draft | review-ok | 边界、方法、schema、错误、legacy mapping 和 JSON 示例已可进入 registry review。 |
| registry readiness | partial / candidate | 仍需确认 enum baseline、fieldId、methodId、capabilityId、错误码和 legacyRefs。 |
| conformance | missing | 采纳后需要新增 `device.info` 专项 cases。 |

## 11. 测试要点

| 类型 | 要点 |
|---|---|
| happy path | `device.getInfo` 返回 `identity`、`product`，并按设备能力返回 optional 段。 |
| capability summary | `includeCapabilitySummary=true` 返回 `capability`；`false` 时可省略 `capability`。 |
| boundary case | optional 段缺失、空 `software.components`、未知 enum 使用 `unknown` 或采纳后的 fallback 策略。 |
| error path | 信息服务读取失败、无权限、请求结构非法。 |
| compatibility | `device.identity` 不再作为独立 capability；`device.getInfo` 默认不返回 children。 |
| legacy mapping | legacy SN/model/device info 字段能映射到 `identity` / `product` / `hardware`，敏感字段不进入本 schema。 |

## 12. 待确认问题

| 问题 | 影响 | 当前建议 | 状态 |
|---|---|---|---|
| `productType`、`os.type`、`cpuArch`、`software.components[].role` 的首批 enum 值是什么？ | schema / conformance | 首批提供常见候选值，并保留 `unknown` fallback。 | open |
| `capability.profile` 是否来自 profiles registry？ | registry / capability | 先作为产品 profile 字符串；正式采纳前和 profiles registry 对齐。 | open |
| legacy 设备信息是否包含敏感字段？ | legacy / security | 敏感字段不进入 `device.info`，必要时拆到 auth/vendor/diagnostic。 | open |
| legacy `SetDeviceName` 是否需要进入本 feature？ | product behavior | 不进入 `device.info`；有写入需求后另起草设置协议。 | decided |

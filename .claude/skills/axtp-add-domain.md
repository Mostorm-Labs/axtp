---
name: axtp-add-domain
description: 交互式引导新增或修改 AXTP 业务协议能力，逐步确认 method/event/type/error/capability/profile/legacy mapping，并按当前 registry/domains 与三段式 generator 规则生成成果物
version: 2.0.0
source: axtp-repo
---

# AXTP 新增业务逻辑

当用户描述“新增一个业务 / 增加一个方法 / 添加控制能力 / 迁移旧命令”时，使用本 skill。目标不是一次性让用户填完所有字段，而是像表单向导一样逐步确认，最后生成或修改 YAML source，并运行三段式 generator。

## 最高优先级规则

- 每轮只问下一步需要的 1-3 个问题，等待用户回答后继续。
- 不要直接手写 `protocol/axtp.protocol.yaml`。
- 不要直接手写 `docs/generated/*`、`tooling/mcp/*`、`tooling/test-vectors/*`、`runtimes/*/generated/*`。
- 新增业务默认只写 `registry/domains/<domain>/domain.yaml`。
- `registry/method|event|error|capability|schema|legacy/` 只放 Core/MVP/公共/已采纳事实。
- 同一个 method/event/type/error/capability/profile 不得同时写在 core registry 和 domain YAML。
- domain 业务晋升 Core/MVP 时是“迁移”，不是复制；必须保持 ID、fieldId、bit_offset 和语义不变，并删除 domain 中的旧条目。

## 必读证据

动手前读取本仓库当前事实，不要依赖旧 `standard/` 路径：

```text
docs/source/08-AXTP-Registry总则-v2.md
docs/specs/08-13
docs/source/09-13
registry/**/*.yaml
registry/domains/**/*.yaml
```

如涉及 Stream / OTA / 低带宽 / 传输 profile，还要读取：

```text
docs/specs/02-AXTP-Frame-and-Payload-Spec.md
docs/specs/04-AXTP-Control-Session-Spec.md
docs/specs/05-AXTP-RPC-Session-Spec.md
docs/specs/06-AXTP-Stream-Spec.md
docs/specs/07-AXTP-Compatibility-and-Versioning.md
docs/specs/17-AXTP-Low-Bandwidth-Degradation.md
```

## 交互流程

### Step 1：业务意图

确认这个业务做什么、谁发起、设备如何响应。

示例问题：

> 这个业务的核心动作是什么？例如“Host 请求设备打开 HID 音视频 STREAM，设备返回 streamId 和协商参数”。

需要得到：

```text
clientActor:
deviceBehavior:
syncModel: request_response | event_only | stream_control
```

### Step 2：Domain 归属

Domain 归属必须遵照 `docs/source/08-AXTP-Registry总则-v2.md`，不要在 skill 内维护另一份独立 domain 表。

必须检查：

```text
Section 6.1 Domain 命名
Section 9 Domain Registry 规则
Section 10 MethodId 分配规则
Section 11 EventId 分配规则
Section 13 CapabilityId 分配规则
Section 23 Domain-Scoped Mask
```

选择规则：

- 优先从 08 总则 Section 9 已定义的 domain 中选择。
- 用户描述如果是旧协议域、产品域或功能口语名，按 Section 9 的说明归并到 AXTP 原生 domain，不直接新增 domain。
- 如果 Section 9 没有合适 domain，先提出修改 08 总则的治理建议，不能直接在 YAML 中发明新 domain。
- Method/Event ID 范围、DomainId、`bit_offset` 的理由必须引用 08 总则对应章节。

新增业务默认目标：

```text
registry/domains/<domain>/domain.yaml
```

### Step 3：Method

按 `domain.verbObject` 命名，camelCase。

推荐动词：

```text
get / set / list / open / close / start / stop / begin / end / verify / apply / abort / resume
```

需要确认：

```text
method.name:
method.description:
method.status: draft | mvp | stable
method.rpc_op: request_response
method.recommended_encoding: [json, binary_tlv]
```

ID 和 `bit_offset` 优先从 `docs/source/09-13` 和现有 YAML 推导；无法推导时再向用户确认。

### Step 4：Request 字段

逐项确认：

```text
name:
type:
required:
min/max/max_length:
description:
```

类型优先使用：

```text
uint8 / uint16 / uint32 / uint64 / int* / bool / enum / bitmap / string / bytes / object / array
```

Stream/OTA 对象校验优先使用 `verifyType` + `verifyValue`，不要默认写死 `hashAlgo` + `hash`。

### Step 5：Response 字段

同 Request。若没有业务字段，说明“空响应”，source 可使用空 schema，生成 Protocol IR 时映射为 `Empty`。

### Step 6：Event

询问是否需要异步事件：

```text
event.name:
event.description:
event.payload schema:
event.severity:
event.trigger:
event.capabilities:
```

命名建议：

```text
domain.objectChanged
domain.actionCompleted
domain.error
```

### Step 7：Error

优先复用现有错误码：

| Error | 说明 |
|---|---|
| `SUCCESS` | 成功 |
| `RPC_PARAM_INVALID` | 参数无效 |
| `OUT_OF_RANGE` | 参数越界 |
| `BUSY` | 设备忙 |
| `NOT_SUPPORTED` | 不支持 |
| `INVALID_STATE` | 状态不允许 |
| `PERMISSION_DENIED` | 权限不足 |

只有现有错误无法表达时，才新增 domain 专属 error。新增业务 error 默认写入 `registry/domains/<domain>/domain.yaml`。

### Step 8：Capability / Profile

确认：

```text
capability.name: domain.featureName
capability.type:
capability.schema:
profile.name:
profile.requiredMethods:
profile.requiredEvents:
profile.requiredErrors:
profile.transportProfiles:
```

新业务 capability/profile 默认放在 domain YAML。只有 Core/MVP 晋升时才迁入核心 registry。

### Step 9：Legacy Mapping

如果用户提到旧协议或 CmdValue，继续确认：

```text
legacy_protocol:
legacy_cmd_value:
legacy_name:
axtp_method_name:
direction:
status_mapping:
```

只有 AXTP target method 明确后，才写 `registry/legacy/legacy_mapping.yaml`。

### Step 10：编辑前确认

编辑 YAML 前，先输出简短确认：

```text
Business intent:
Evidence chain:
Chosen YAML target:
Method/event/type/error/capability/profile summary:
ID and bit_offset rationale:
Legacy impact:
Generated outputs expected:
Open questions:
```

用户确认或信息已经足够后再改文件。

## YAML 规则

- Source YAML 使用 `id` 和 `bit_offset`。
- Generated Protocol IR 使用 `methodId` / `eventId` 和 `bitOffset`。
- `bit_offset` 在同 domain 内必须从 0 连续，不能重复。
- method/event name 与 ID 全局唯一。
- fieldId 为 1B，范围 `0x01-0xFF`，同 schema 内唯一。
- Empty request/response 可用空 source schema，生成 IR 时映射为 `Empty`。
- `capability.supportedMethods` bitmap 派生自 `methods[].bitOffset`。
- 不得添加旧 Protocol Definition 字段：`bitmapId`、`requests`、`requiredRequests`。

## 三段式 Generator

编辑 source YAML 后运行：

```bash
cd generators
npm run build
npm test
node dist/cli.js validate-sources --spec ..
node dist/cli.js generate --spec ..
node dist/cli.js validate-protocol --spec ..
git diff --check
```

`generate --spec ..` 执行：

```text
validate sources
  -> build protocol/axtp.protocol.yaml
  -> validate Protocol IR
  -> emit generated artifacts
```

生成产物包括：

```text
protocol/axtp.protocol.yaml
docs/generated/protocol.md
docs/generated/protocol.json
docs/generated/*_registry.generated.md
tooling/mcp/*.generated.json
runtimes/cpp-core/include/axtp/generated/*
tooling/test-vectors/*
```

## 汇报格式

完成后汇报：

```text
已读取证据：
已修改 source YAML：
已生成产物：
校验结果：
仍需用户确认：
```

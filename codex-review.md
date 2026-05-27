# AXTP 协议文档与框架审查报告

日期：2026-05-27

审查范围：

- `standard/docs/**/*.md`
- `standard/registry/*.yaml`
- `standard/schema/*.yaml`
- `standard/generator`
- `standard/out/generated`
- `FAQ.md`

执行过的验证：

```bash
cd standard/generator
./node_modules/.bin/vitest run
node dist/cli.js validate --spec ..
node dist/cli.js generate --spec .. --out /tmp/axtp-gen-review
diff -qr ../out/generated /tmp/axtp-gen-review
```

验证结果：

- Generator 单测通过：9 tests passed。
- Registry / Schema 校验通过：8 methods、4 events、8 errors、11 capabilities、21 schemas、2 legacy mappings。
- 当前 `standard/out/generated` 与从现有 YAML 重新生成的结果不一致，说明生成产物已经落后于事实源。

## 总体结论

AXTP 当前设计方向已经成型，核心分层是清晰的：Frame 层只处理 Header、长度、分片和 CRC；Payload 层固定三类 `CONTROL / RPC / STREAM`；Registry / Schema 承担业务事实源；Generator 负责把事实源落到 C++、JSON、Markdown 和测试向量。

当前最大风险不是协议方向，而是“事实源漂移”。`registry/*.yaml`、`schema/*.yaml`、规范正文表格、MVP 文档、Demo 文档、生成产物之间已经出现多处不一致。若直接进入 SDK 或 C++ Demo 实现，开发者会在 methodId、eventId、errorCode、Control opcode、Stream profile、测试向量上得到互相冲突的指令。

建议把下一阶段目标从“继续扩展协议全集”调整为“冻结 AXTP v1 MVP 合同”，先完成事实源、规范文本、生成产物和 Demo 验收链路四者闭环。

## P0 阻断问题

### 1. Markdown MVP 表格与 YAML 事实源严重分叉

`13-AXTP-MVP最小实现注册表-v2.md` 明确写到最终实现以 `registry/*.yaml` 和 `schema/*.yaml` 为单一事实源，但该文档正文仍列出大量 YAML 中不存在的 MVP 项。

典型分叉：

| 类型 | Markdown 中声明 | 当前 YAML 中实际存在 |
|---|---|---|
| Method | `device.getVersion` / `device.getStatus` / `stream.open` / `stream.close` / `firmware.getInfo` / `firmware.abort` / `firmware.resume` | 不存在 |
| Event | `device.statusChanged` / `stream.opened` / `stream.closed` / `stream.error` / `firmware.updateStarted` | 不存在 |
| ErrorCode | `UNKNOWN_ERROR` / `BUSY` / `FRAME_VERSION_UNSUPPORTED` / `RPC_METHOD_NOT_FOUND` / `RPC_PARAM_INVALID` | 不存在 |
| Capability | `protocol.payloadTypes` / `protocol.headerProfiles` / `firmware.update` | 不存在 |
| Stream Profile | `file.upload` / `file.download` | YAML 为 `file.transfer` |

推荐修改：

- P0 决策：确认 AXTP v1 MVP 以当前 YAML 的“小闭环集合”为准，还是以 Markdown 的“大 MVP 集合”为准。
- 若以当前 YAML 为准，应重写 `13-AXTP-MVP最小实现注册表-v2.md` 的方法、事件、错误码、能力和 Stream Profile 表，只保留 YAML 已注册项。
- 若以 Markdown 为准，应补齐 `method_registry.yaml`、`event_registry.yaml`、`error_code.yaml`、`capability_registry.yaml`、`stream_profile.yaml` 和对应 schema，再重新生成产物。

建议采用第一种：先以当前 YAML 小闭环冻结 MVP，避免 MVP 膨胀。

### 2. ErrorCode Registry 文档与 `error_code.yaml` 不一致

`11-AXTP-ErrorCode注册表-v2.md` 定义了完整错误码集合，但 `standard/registry/error_code.yaml` 目前只有 8 个错误码：

```text
SUCCESS
AUTH_REQUIRED
RPC_UNKNOWN_METHOD
RPC_INVALID_PARAMS
STREAM_NOT_FOUND
STREAM_CRC_ERROR
DEVICE_BUSY
CRC_ERROR
```

同时，多个规范引用了 YAML 不存在的错误名：

- `FRAME_VERSION_UNSUPPORTED`
- `FRAME_CRC_ERROR`
- `CONTROL_NEGOTIATION_FAILED`
- `RPC_METHOD_NOT_FOUND`
- `RPC_PARAM_INVALID`
- `BUSY`
- `FW_VERIFY_FAILED`

这会导致实现者无法判断 wire 上到底使用哪个 `statusCode`。

推荐修改：

- P0 最小修复：把 `error_code.yaml` 扩展到文档中所有 MVP 错误码，或把文档中的错误名统一收敛为 YAML 当前 8 个错误码。
- 推荐命名统一为更分层的错误名，例如 `FRAME_CRC_ERROR` 替代当前 `CRC_ERROR`，`RPC_METHOD_NOT_FOUND` 替代 `RPC_UNKNOWN_METHOD`，`RPC_PARAM_INVALID` 替代 `RPC_INVALID_PARAMS`。
- `legacy_mapping.yaml`、`method_registry.yaml` 和所有规范正文必须同步改名。

### 3. Control Opcode MVP 范围与 Registry 不一致

`02-AXTP-Control信令协议规范-v2.md` 将 `SESSION_RESET(0x0B)` 标为 MVP，并在状态机和 MVP 必须实现列表中要求实现。

但 `standard/registry/control_opcode.yaml` 只注册了：

```text
OPEN / ACCEPT / HEARTBEAT / HEARTBEAT_ACK / ACK / NACK / CLOSE / CLOSE_ACK
```

`13-AXTP-MVP最小实现注册表-v2.md` 又把 `SESSION_RESET` 放到“可延后”。

推荐修改：

- MVP 建议不包含 `SESSION_RESET`，保持 `control_opcode.yaml` 当前 8 个 opcode。
- 将 Control 文档中的 `SESSION_RESET` 从 MVP 改为 P1，并从 `21.1 必须实现的 Opcode` 移到 `21.2 可暂缓的 Opcode`。
- 状态机保留 `SESSION_RESET` 作为扩展路径，但标注“P1”。

### 4. Control Payload 已移除 `bodyEncoding`，但后续章节仍按旧结构描述

Control 文档开头声明统一 5B 固定头：

```text
opcode / controlId / statusCode / TLV body
```

并明确 `bodyEncoding` 字段已移除。但同一文档仍保留 `## 6. Control BodyEncoding`，并写到“收到不支持的 bodyEncoding 必须返回 NACK”。`06-AXTP-TLV-Schema编码规范-v2.md` 也仍写到 Control Parser 先解析 `opcode/controlId/statusCode/bodyEncoding/bodyLen`。

推荐修改：

- 删除或改写 Control 文档 `## 6. Control BodyEncoding`。
- 将 TLV 文档相关句子改为：Control Parser 先解析 `opcode/controlId/statusCode`，Control body 固定为 TLV，body 长度由 Frame `payloadLength - 5` 得出。
- 删除 `CONTROL_BODY_ENCODING_UNSUPPORTED`，或标记为 reserved/deprecated，避免新实现暴露一个永远不会触发的错误。

### 5. 生成产物未随当前 YAML 刷新

从当前 YAML 重新生成到 `/tmp/axtp-gen-review` 后，发现 `standard/out/generated` 多处不同。典型差异：

- 旧产物仍使用 `brightness.get` / `brightness.set`，当前 YAML 使用 `display.getBrightness` / `display.setBrightness`。
- 旧测试向量文件名为 `rpc_brightness_set.hex`，重新生成后为 `rpc_display_brightness_set.hex`。
- 旧 `axtp_ids_generated.h` 中 `BrightnessChanged = 0x8601`，重新生成后为 `DisplayBrightnessChanged = 0x8507`。

推荐修改：

- 立即重新生成 `standard/out/generated` 并纳入提交。
- CI 增加“生成产物与 YAML 一致性”检查：执行 generate 到临时目录并与 `standard/out/generated` 做 diff，diff 非空则失败。

## P1 高优先级问题

### 6. Stream 文档存在 wire 示例错误

`04-AXTP-Stream流式传输协议规范-v2.md` 的 Standard STREAM 最小示例中，`seqId` 行重复出现，导致示例看起来像 20B Header，而规范定义为 16B：

```text
streamId:uint32
seqId:uint32
cursor:uint64
```

推荐修改：

- 删除重复的 `seqId` 4B 行。
- 增加一条明确校验：Standard STREAM Header 固定 16B，Compact STREAM Header 固定 8B，测试向量必须覆盖两个 Header。

### 7. Stream Profile 命名不统一

`stream_profile.yaml` 当前为：

```text
0x0001 firmware.ota
0x0002 file.transfer
```

但多个文档使用：

```text
file.upload
file.download
log.realtime
media.video
media.audio
```

推荐修改：

- MVP 只保留 `firmware.ota`。
- `file.transfer` 若暂不进入 MVP，应标为 draft，并在文档中统一使用该名字，或改 YAML 为 `file.upload` / `file.download` 两个 profile。
- `04 Stream`、`08 Registry 总则`、`13 MVP`、`14 Compatibility` 中的 Stream Profile 表应来自同一个生成表。

### 8. 通用 `stream.open` 路径与当前 Method Registry 不匹配

`04 Stream` 和 `03 RPC` 多次引用 `stream.open / stream.close`，但当前 `method_registry.yaml` 没有这些方法。当前 OTA 是通过 `firmware.begin` 隐式建流。

推荐修改：

- AXTP v1 MVP 明确只支持领域方法隐式建流：`firmware.begin -> streamId`。
- `stream.open / stream.close` 作为 P1 通用建流能力保留，但不得出现在 MVP 必须流程中。
- `03 RPC`、`04 Stream`、`13 MVP`、`19 OTA Demo` 中涉及 `stream.open` 的地方统一标为 P1。

### 9. Capability 命名体系出现两套风格

当前 YAML 使用：

```text
protocol.payload.control
protocol.payload.rpc
protocol.payload.stream
capability.get
firmware.ota
```

文档中大量使用：

```text
protocol.payloadTypes
protocol.headerProfiles
rpc.encodings
rpc.bodyEncodings
firmware.update
firmware.resume
```

推荐修改：

- 定义 Capability 命名裁决：是“单项 bool 能力”风格，还是“聚合配置能力”风格。
- MVP 建议保留当前 YAML 的单项 bool 能力，同时为范围类参数使用 schema 字段表达，例如 `display.brightnessMin/Max/Step`。
- 将 `12 Capability` 中的示例改成当前 YAML 已注册能力，或反向扩展 YAML。

### 10. MethodId / EventId 文档与 YAML 大面积分叉

`09-AXTP-MethodId注册表-v2.md` 和 `10-AXTP-EventId注册表-v2.md` 包含完整规划表，但其中不少条目被标为 mvp，而 YAML 未注册。

推荐修改：

- 文档分成两层表：`Generated MVP Registry` 与 `Future Planning`。
- `Generated MVP Registry` 必须由 YAML 生成，不手写。
- `Future Planning` 可以手写，但状态必须是 `draft/planned`，不得使用 `mvp`。

### 11. Header / ACK 模式术语不统一

`01 Overall` 写 MVP 支持 `NO_ACK` 和 `ON_DEMAND_ACK`，后续扩展 `EVERY_FRAME_ACK / SELECTIVE_ACK / STREAM_CHUNK_ACK`。

`02 Control` 写 ackMode 为：

```text
NONE / FRAME_ACK / MESSAGE_ACK / STREAM_CHUNK_ACK / SELECTIVE_ACK
```

`04 Stream` 又写：

```text
none / batch / stop_and_wait / sliding_window / selective_repeat
```

推荐修改：

- 明确两层 ackMode：
  - Control OPEN 的链路确认模式：`NONE / FRAME_ACK / MESSAGE_ACK / STREAM_CHUNK_ACK / SELECTIVE_ACK`
  - Stream Context 的业务流可靠性策略：`none / stop_and_wait / sliding_window / selective_repeat`
- `01 Overall` 改用 Control 文档中的枚举名，避免 `ON_DEMAND_ACK` 这种未注册名称。
- `firmware.begin` response 中的 `ackMode` 明确属于 Stream Context，不等于 Control OPEN 的 `ackMode`。

## P2 文档质量与可维护性问题

### 12. 章节编号和重复标题需要整理

发现示例：

- `01 Overall` 中 `### 8.3 VT 字段示例` 重复出现两次。
- `04 Stream` 在 `3.3 Profile 选择与协商` 后又出现 `### 3.2 cursor 含义` 和 `### 3.3 streamId 规则`。
- `03 RPC` 中完整示例章节出现 `21.1` 后又回到 `19.x` 的编号。
- `12 Capability` 中 `26.1` 标成 `23.1`，`31` 下又出现 `28.x`。

推荐修改：

- 增加 Markdown lint 或简单脚本检查标题编号递增。
- 对规范文档只保留自动编号或手动编号中的一种，避免人工维护漂移。

### 13. FAQ 与正式规范的实现优先级不一致

FAQ 中建议 Phase 1 最小 CONTROL 子集不含 ACK/NACK，Phase 2 再补 ACK/NACK；但当前 MVP 规范和 Demo 已把 ACK/NACK 作为 OTA 闭环必需能力。

推荐修改：

- FAQ 改为“TCP / JSON 调试路径可暂不实现 STREAM ACK/NACK，但 AXTP v1 MVP Normative Demo 必须实现 CONTROL ACK/NACK”。
- 将 FAQ 的 Phase 表与 `22-AXTP-MVP-Normative-Demo.md` 对齐。

### 14. 安全与加密扩展字段未落到 Schema / Registry

`01 Overall` 要求 OPEN 中保留 encryption capability 和 `UNSUPPORTED_ENCRYPTION` 错误码，但当前 Control schema、Capability registry、ErrorCode YAML 都没有对应项。

推荐修改：

- 若 MVP 不实现加密，则文档改为“预留 P2，不要求 OPEN 必填”。
- 若要求保留字段，则补齐 `control_schema.yaml` 的 `encryption` 字段、Capability 和 ErrorCode。

### 15. Schema 字段编号策略与当前 YAML 示例不完全一致

`07 Schema字段编号规范` 推荐 strict mode 下业务字段从 `0x20` 开始，但当前多个 method schema 从 `0x01` 开始，例如 `DisplaySetBrightnessRequest.value = 0x01`。

该问题未必是错误，因为文档也允许 compact/local mode。但 YAML 目前没有显式声明 `scope = local` 或 `mode = compact`。

推荐修改：

- Generator schema model 增加可选 `scope` / `mode` 字段。
- 当前 MVP schema 若继续从 `0x01` 开始，应统一声明 `mode: compact`。
- 若坚持 strict mode，则把业务字段迁移到 `0x20+`，但这会改变测试向量和 wire 编码。

## 建议的修改路线

### 第一阶段：冻结事实源

目标：让 YAML、生成产物、MVP 文档一致。

建议操作：

1. 决定 MVP 以当前 YAML 小闭环为准。
2. 重写 `13-AXTP-MVP最小实现注册表-v2.md` 中所有手写 MVP 表格。
3. 修正 `09/10/11/12` 注册表文档，把已注册 MVP 与未来规划分开。
4. 重新生成 `standard/out/generated`。
5. CI 加入 generated diff 检查。

### 第二阶段：修正 wire format 矛盾

目标：实现者只看到一套线格式。

建议操作：

1. 删除 Control `bodyEncoding/bodyLen` 旧描述。
2. 将 `SESSION_RESET` 从 MVP 移到 P1，或补入 registry。
3. 修复 Stream 16B 示例。
4. 统一 ACK mode 两层枚举。
5. 明确 `firmware.begin` 是 MVP 唯一建流入口，`stream.open` 为 P1。

### 第三阶段：增强 Generator 校验

目标：让漂移以后自动暴露。

建议新增校验：

- `mvp_profile.yaml` 中列出的所有 method/event/error/capability 必须存在。
- 所有 registry 中引用的 error/capability/event/schema 必须存在。
- Markdown 生成表与 YAML 一致性由生成文件替代手写表。
- `standard/out/generated` 必须与当前 YAML 重新生成结果一致。
- 测试向量 manifest 中的 method/event 名必须存在于 registry。

## 建议的 AXTP v1 MVP 合同

为了尽快落地，建议 AXTP v1 MVP 锁定为：

```text
PayloadType:
  CONTROL / RPC / STREAM

Frame Profile:
  Standard + Compact 均支持

Control Opcode:
  OPEN / ACCEPT / HEARTBEAT / HEARTBEAT_ACK / ACK / NACK / CLOSE / CLOSE_ACK

RPC Method:
  device.getInfo
  capability.getAll
  display.getBrightness
  display.setBrightness
  firmware.begin
  firmware.end
  firmware.verify
  firmware.apply

RPC Event:
  display.brightnessChanged
  firmware.updateProgress
  firmware.updateCompleted
  firmware.updateFailed

Stream Profile:
  firmware.ota

Legacy Mapping:
  BetaDeviceInfo
  BetaBrightnessSet
```

以上集合与当前 `registry/*.yaml` 最接近，变更成本最低。

## 可直接修改的关键片段建议

### Control BodyEncoding 段落替换建议

将 `02-AXTP-Control信令协议规范-v2.md` 的 `## 6. Control BodyEncoding` 改为：

```markdown
## 6. Control Body 编码

Control body 固定使用 AXTP TLV 编码，不在线上携带 bodyEncoding 字段。

Control Payload 固定头为 5B：

opcode:uint8 / controlId:uint16 / statusCode:uint16

body 长度由外层 Frame.payloadLength - 5 得出。body 为空时 Frame.payloadLength 必须等于 5。

收到格式非法的 TLV 时，接收方应返回 CONTROL NACK，statusCode 使用 CONTROL_PAYLOAD_INVALID 或等价的已注册 ErrorCode。
```

### Stream 示例修正建议

将 Standard STREAM 最小示例修正为：

```text
streamId=1, seqId=0, cursor=0, data=AA BB CC DD

01 00 00 00              // streamId (uint32)
00 00 00 00              // seqId (uint32)
00 00 00 00 00 00 00 00  // cursor (uint64)
AA BB CC DD              // data
```

### MVP Control Opcode 修正建议

MVP 必须实现：

```text
OPEN / ACCEPT / HEARTBEAT / HEARTBEAT_ACK / ACK / NACK / CLOSE / CLOSE_ACK
```

可暂缓：

```text
RESUME / RESUME_ACK / SESSION_RESET / WINDOW_UPDATE / PING / PONG / GOAWAY / VENDOR
```

## 最终验收建议

AXTP v1 MVP 文档和框架可以认为审查通过的条件：

1. `node dist/cli.js validate --spec ..` 通过。
2. 重新生成 `standard/out/generated` 后无 git diff。
3. `13 MVP` 中的所有 MVP 项均能在 YAML 中找到。
4. `02 Control` 不再出现已删除的 `bodyEncoding/bodyLen` 固定头描述。
5. `04 Stream` 的 16B / 8B Header 示例与字段表一致。
6. `22 MVP Normative Demo` 的所有 method/event/error/capability 都能在 registry 中解析。
7. 测试向量 manifest 与当前 method/event 命名一致。

## 结语

协议骨架已经接近可落地状态。现在最值得投入的不是继续增加业务域，而是把 AXTP v1 的最小事实源冻结下来，让文档、YAML、Generator、测试向量和 Demo 指向同一套答案。只要完成这一步，后续 C++ Demo 和真实传输适配会轻很多。

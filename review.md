# AXTP 协议文档全面审查报告

审查日期：2026-05-27  
审查范围：`standard/docs/` 全部文档  
审查方法：跨文档一致性检查、冗余分析、遗漏项识别

---

## 一、需要立即修复的问题（MVP 前必须解决）

### 1. Control 规范内部矛盾：§6 BodyEncoding 节应删除

**文件**：`02-AXTP-Control信令协议规范-v2.md`

§2 已明确说明"bodyEncoding 字段已移除，Control body 固定 TLV"，但 §6 仍保留了一张 `bodyEncoding` 枚举表，并写着"收到不支持的 bodyEncoding 必须返回 NACK"。这两段直接矛盾。

**修复**：删除 §6 整节（Control BodyEncoding），将 §7 Control TLV 结构提升为 §6。

---

### 2. Stream 规范中仍使用旧字段名 `hashAlgo`

**文件**：`04-AXTP-Stream流式传输协议规范-v2.md`，第 165 行、第 308 行、第 311 行、第 317 行

Stream Context 示例中仍写 `hashAlgo: sha256`，§9 完整性校验中写 `firmware.begin.sha256`，§10 断点续传中写 `hash`。这些都是旧字段名，已在其他文档中统一改为 `verifyType`/`verifyValue`。

**修复**：
- 第 165 行：`hashAlgo: sha256` → `verifyType: sha256`
- 第 308 行：`firmware.begin.sha256` → `firmware.begin.verifyValue`
- 第 311 行：`final sha256` → `final verifyValue`（两处）
- 第 317 行：`hash` → `verifyValue`

---

### 3. 两套状态机命名不一致

**文件**：`02-AXTP-Control信令协议规范-v2.md` §11 vs `05-AXTP-连接场景与调用流程规范-v2.md` §3.1

Control 规范用：`DISCONNECTED → TRANSPORT_CONNECTED → OPEN_SENT/OPEN_RECEIVED → SESSION_READY → CLOSING → CLOSED`

连接场景规范用：`DISCONNECTED → LINK_CONNECTED → FRAMING_READY → APP_READY`

两套状态名不同，但描述的是同一个连接生命周期。实现者无法确定哪套是权威定义。

**修复**：以 05 的四状态机（DISCONNECTED / LINK_CONNECTED / FRAMING_READY / APP_READY）为权威，更新 02 §11 使用相同命名，并在 02 中补充 FRAMING_READY → APP_READY 的 RPC Hello/Identify/Identified 转换条件。

---

### 4. Stream ackMode 与 Control ackMode 是两套不同的概念，文档未区分

**文件**：`02-AXTP-Control信令协议规范-v2.md` §10 vs `04-AXTP-Stream流式传输协议规范-v2.md` §6.1

Control OPEN 协商的 `ackMode`（NONE / FRAME_ACK / MESSAGE_ACK / STREAM_CHUNK_ACK）是 Frame 层确认模式。Stream Context 的 `ackMode`（none / stop_and_wait / sliding_window）是 Stream 层流控模式。两者名字相同但含义不同，文档中没有明确区分。

**修复**：在 04 §6.1 开头加一句说明："Stream Context 的 ackMode 是 Stream 层流控策略，与 CONTROL OPEN 协商的 Frame 层 ackMode 独立，不得混淆。"

---

### 5. `firmware.begin` 响应字段缺少 TLV fieldId 映射

**文件**：`19-AXTP-OTA-Stream-Demo.md` §9.3

响应字段表列出了 `transferId`、`streamId`、`acceptedOffset`、`chunkSize`、`windowSize`、`resumeToken`、`otaState`，但没有对应的 TLV fieldId。Binary 模式下无法解析。

**修复**：在 §9.3 响应字段表中增加 fieldId 列，或在 `standard/schema/firmware_schema.yaml` 中补充对应 schema，并在文档中引用。

---

## 二、高优先级问题（P1 前应解决）

### 6. Stream Context 示例中 `hashAlgo` 字段位置不明确

**文件**：`04-AXTP-Stream流式传输协议规范-v2.md` §4

Stream Context 是本地运行时数据结构，不是 wire format。但 §4 的 YAML 示例混合了 wire 字段（streamId、seqId）和本地字段（hashAlgo、profile），读者容易误以为这些字段都在 STREAM 帧里传输。

**修复**：在 §4 开头加说明："Stream Context 是接收端/发送端的本地状态，由 RPC 建流 Response 填充，不出现在 STREAM 帧 Header 中。"并将示例中的字段分为两组：wire 字段和本地字段。

---

### 7. 冗余：PayloadType 定义出现在 4 个文档中

**位置**：
- `00-AXTP-协议总览与落地路线.md`
- `01-AXTP-整体协议规范-v2.md`（权威定义）
- `05-AXTP-连接场景与调用流程规范-v2.md`
- `22-AXTP-MVP-Normative-Demo.md`

**修复**：01 保留完整定义，其余三处改为一句话引用："PayloadType 定义见 01《AXTP 整体协议规范》§5。"

---

### 8. 冗余：OTA 完整流程在 3 个文档中重复描述

**位置**：
- `05-AXTP-连接场景与调用流程规范-v2.md` §4.2 阶段 5
- `19-AXTP-OTA-Stream-Demo.md`（最详细）
- `22-AXTP-MVP-Normative-Demo.md` §6-§9

**修复**：05 和 22 中的 OTA 流程简化为骨架（只保留关键步骤），并注明"完整 OTA 流程见 19《AXTP OTA Stream Demo》"。

---

### 9. 冗余：Frame Profile 选择表在 3 个文档中重复

**位置**：
- `01-AXTP-整体协议规范-v2.md` §6（权威）
- `05-AXTP-连接场景与调用流程规范-v2.md` §13.1
- `22-AXTP-MVP-Normative-Demo.md` §2

**修复**：05 和 22 中的表格改为引用："Frame Profile 选择原则见 01《AXTP 整体协议规范》§6。"

---

### 10. 冗余：MVP 方法/事件/错误码列表在 5 个文档中重复

**位置**：
- `00-AXTP-协议总览与落地路线.md`
- `09-AXTP-MethodId注册表-v2.md`
- `10-AXTP-EventId注册表-v2.md`
- `11-AXTP-ErrorCode注册表-v2.md`
- `12-AXTP-Capability注册表-v2.md`

Registry 文档中的 MVP 标记（`status: mvp`）已经是单一事实源，总览文档中的 MVP 列表是手工维护的副本，容易过时。

**修复**：00 中的 MVP 列表改为："MVP 范围以各 Registry 文档中 `status: mvp` 标记为准，见 09-12 注册表。"

---

### 11. 遗漏：Compact Frame 下 MessageId 并发上限未定义

**文件**：`01-AXTP-整体协议规范-v2.md`

Compact Frame 的 MessageId 是 1B（0-255），但规范没有说明同时在途的最大 Message 数量。如果并发超过 255，MessageId 会冲突。

**修复**：在 §8 Compact Header 规范中补充："Compact Profile 下，同时在途的未完成 Message 数量不得超过 16（推荐），MessageId 空间 0-255 足够覆盖正常使用场景。"

---

### 12. 遗漏：分片重组超时后的处理行为未定义

**文件**：`01-AXTP-整体协议规范-v2.md` §16

提到了 `fragmentTimeoutMs` 参数，但没有说明超时后接收端应该做什么。

**修复**：在 §16 补充："分片重组超时后，接收端必须：1）丢弃已收到的所有分片；2）发送 CONTROL NACK(FRAME_REASSEMBLY_TIMEOUT)，携带 messageId；3）等待发送端重传完整 Message。"

---

## 三、中优先级问题（P1-P2 可处理）

### 13. 术语不统一：statusCode / reasonCode / errorCode 混用

**位置**：多处

- Control 固定头用 `statusCode`
- CLOSE 消息用 `reasonCode`
- RPC 响应用 `status.code`
- 文档叙述中有时写 `errorCode`

这三个词在不同上下文有不同含义，但文档中没有统一的术语表。

**修复**：在 00 总览或 01 整体规范中增加术语表，明确：
- `statusCode`：Control 固定头字段，uint16，来自 ErrorCode Registry
- `reasonCode`：CLOSE/SESSION_RESET 的 TLV 字段，表示关闭原因
- `status.code`：RPC JSON 响应中的错误码字段，uint32

---

### 14. 遗漏：RESUME Token 格式未定义

**文件**：`02-AXTP-Control信令协议规范-v2.md` §15

提到 `resumeToken` 但没有说明格式、长度、生命周期。

**修复**：补充说明："resumeToken 是服务端生成的不透明字节串，长度 8-32B，客户端不得解析其内容。Token 在 Session 关闭或设备重启后失效。"

---

### 15. 遗漏：RPC requestId 重用规则未定义

**文件**：`03-AXTP-RPC协议与二进制映射规范-v2.md` §9.1

说明了 requestId 从 1 递增、uint32 自然回绕，但没有说明何时可以重用一个 requestId（即 pending 请求超时后多久才能复用）。

**修复**：补充："requestId 在收到对应 RequestResponse 或超时（推荐 30s）后方可复用。"

---

### 16. 遗漏：capability.getAll 响应的 TLV Schema 未定义

**文件**：`12-AXTP-Capability注册表-v2.md`

JSON 示例存在，但 Binary 模式下 capability.getAll 响应的 TLV 编码方式未定义。

**修复**：在 `standard/schema/capability_schema.yaml` 中补充 `CapabilityGetAllResponse` 的 TLV fieldId 映射，并在 12 中引用。

---

### 17. 遗漏：错误恢复决策树缺失

**文件**：多处

各文档提到了错误码，但没有说明收到各类错误后应该怎么做。

**修复**：在 05 连接场景规范中增加 §14 错误恢复速查表：

| 错误码 | 触发层 | 接收端行为 |
| --- | --- | --- |
| FRAME_CRC_ERROR | Frame | 发 NACK，等待重传 |
| FRAME_FRAGMENT_MISSING | Frame | 发 NACK，等待重传 |
| CONTROL_OPEN_REJECTED | Control | 调整参数重试，最多 3 次 |
| RPC_METHOD_NOT_FOUND | RPC | 不重试，向上层报错 |
| STREAM_TIMEOUT | Stream | 发 NACK，等待重传或 RESUME |

---

### 18. 简化机会：Demo 文档 17/18 可进一步精简

**文件**：`17-AXTP-HID-Compact-Demo.md`、`18-AXTP-BLE-Compact-Demo.md`

这两个文档已经是 Superseded 状态，主体内容只是说"请看 22-MVP-Normative-Demo"，但仍保留了一些旧的实现要求描述，可能引起混淆。

**修复**：将两个文档精简为纯占位文件，只保留状态说明和指向 22 的引用，删除所有具体实现要求。

---

### 19. 简化机会：00 总览文档过长，可拆分

**文件**：`00-AXTP-协议总览与落地路线.md`

当前总览文档承担了太多职责：协议设计原则、分层架构、MVP 范围、版本策略、Generator 规范、C++ Demo 规范等。读者很难快速找到需要的信息。

**修复**：将总览文档拆分为：
- `00-AXTP-协议总览.md`：只保留分层架构、设计原则、文档导航
- 其余内容（版本策略、Generator 规范等）移入对应的专项文档

---

## 四、已确认正确、无需修改的部分

以下内容经审查无问题：

- Control 统一 5B 固定头设计（opcode/controlId/statusCode + TLV body）
- RPC Binary 统一 11B 固定头设计
- Stream Standard(16B)/Compact(8B) 区分保留
- HID 默认 Standard + 协商降级 Compact 的方案
- verifyType/verifyValue 通用校验字段设计
- ErrorCode Registry 的 uint16 范围规划（0x0000-0x7FFF）
- MethodId(0x0000-0x7FFF) 与 EventId(0x8000-0xFFFF) 的范围分离
- WebSocket JSON 作为 Debug/Legacy 路径的定位

---

## 五、修复优先级汇总

| 编号 | 问题 | 优先级 | 涉及文件 |
| --- | --- | --- | --- |
| 1 | Control §6 BodyEncoding 节应删除 | 立即 | 02 |
| 2 | Stream 中旧字段名 hashAlgo/hash | 立即 | 04 |
| 3 | 两套状态机命名不一致 | 立即 | 02, 05 |
| 4 | Stream ackMode 与 Control ackMode 未区分 | 立即 | 04 |
| 5 | firmware.begin 响应缺 TLV fieldId | 立即 | 19 |
| 6 | Stream Context 示例字段位置不明确 | P1 | 04 |
| 7 | PayloadType 定义冗余（4 处） | P1 | 00, 05, 22 |
| 8 | OTA 流程冗余（3 处） | P1 | 05, 22 |
| 9 | Frame Profile 选择表冗余（3 处） | P1 | 05, 22 |
| 10 | MVP 列表冗余（5 处） | P1 | 00 |
| 11 | Compact MessageId 并发上限未定义 | P1 | 01 |
| 12 | 分片重组超时处理未定义 | P1 | 01 |
| 13 | 术语不统一（statusCode/reasonCode/errorCode） | P1 | 多处 |
| 14 | RESUME Token 格式未定义 | P2 | 02 |
| 15 | RPC requestId 重用规则未定义 | P2 | 03 |
| 16 | capability.getAll TLV Schema 未定义 | P2 | 12 |
| 17 | 错误恢复决策树缺失 | P2 | 05 |
| 18 | Demo 17/18 可进一步精简 | P2 | 17, 18 |
| 19 | 00 总览文档过长 | P2 | 00 |

---

## 六、建议的修复顺序

**本次（立即）**：修复 1-5，这五项是直接矛盾或字段名不一致，影响实现正确性。

**下一轮**：处理 6-13，主要是冗余清理和遗漏补充，提升文档可维护性。

**后续**：处理 14-19，属于完善性工作，不影响 MVP 实现。

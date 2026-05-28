# AXTP 协议架构与 MVP 规范审查报告

**审阅人**：产品经理 / 架构组
**审查对象**：AXTP 00–22 系列规范文档（v1.0/v1.1 Draft）与顶层生态设计
**审查目标**：确认核心架构设计是否闭环，评估 MVP 落地风险，并给出最终定稿与仓库结构的微调建议

---

## 1. 核心架构设计审查：高度赞同与闭环确认

经过对 01-整体协议、02-Control、03-RPC、04-Stream 的串联审查，之前讨论的核心痛点已经得到完美解决：

**"控制跑腿，数据裸奔"已彻底固化**：PayloadType 被极其克制地锁定为 CONTROL / RPC / STREAM 三种。像 OTA、Media、File 等业务概念完全被下放到了 RPC 的 Payload（建流阶段）中。这在工程上意味着：底层的 C/C++ I/O 线程永远不需要去理解复杂的业务逻辑，只需根据 streamId 进行 O(1) 的内存搬运。

**状态与并发冲突免疫**：通过 requestId 匹配业务响应，通过 streamId（局部作用域）标识连续数据流，完全隔离了多设备并发、多链路并发时的串台风险。

**单一事实源（SSOT）确立**：将注册表（08-13）和 Schema 外置，通过 Generator 工具生成 C++ 代码和文档，消灭了"文档与代码不一致"的历史包袱。

> **结论**：架构基座极其稳固，AXTP 实质上已经从一个普通的"协议定义"进化为一套现代化的 Registry-Driven Protocol Platform（注册表驱动的协议基础设施）。

---

## 2. 细节推敲与潜在风险提示（Action Items）

尽管宏观架构完美，但在"纸面"向"代码"转换的过程中，从 PM 和系统演进视角发现了几个需要在开发阶段特别注意的边界情况：

### 2.1 协议嗅探与老协议分流

**关联文档**：`14-AXTP-老协议适配与迁移规范.md`、`21-AXTP-Cpp-Demo实现规范.md`

**盲区**：当现有的 App 通过 BLE 连上已经升级为 AXTP 的新固件时，设备怎么瞬间判断这是"老协议"还是"新 AXTP 协议"？

**建议**：必须在 C++ Demo（文档 21）中明确"协议嗅探（Protocol Sniffing）"的策略。例如：判断 Header 的前两个字节是否为 AXTP 的 Magic Number（`0x41 0x58`）。如果是，走 AXTP Parser；否则，无条件抛给 Legacy Adapter 解析。建议在文档 14 或 21 中增加明确的"判定伪代码"。

---

### 2.2 StreamId 的生命周期闭环

**关联文档**：`04-AXTP-Stream流式传输协议规范-v2.md`、`05-AXTP-连接场景与调用流程规范-v2.md`

**盲区**：如果流传输中途 App 崩溃了，或者用户强制退出了，设备端的 streamId（及其绑定的内存/Flash 句柄）怎么回收？

**建议**：在文档 04 或 05 中明确：

- 任何 streamId 都必须具备超时机制（Timeout）。如果在 `fragmentTimeoutMs` 内没有数据，主动丢弃流上下文。
- 如果底层链路（CONTROL CLOSE 或 TCP 断开）触发，应自动销毁该 Session 下所有的 streamId 资源，防止内存泄漏。

---

### 2.3 事件订阅的极简重构

**关联文档**：`10-AXTP-EventId注册表-v2.md`、`21-AXTP-Cpp-Demo实现规范.md`

**现状与痛点**：原规范提议下发 eventId 数组进行订阅，但这会导致 MCU 产生严重的动态内存分配（malloc）和 O(N) 遍历性能开销。

**架构组最新决策（掩码大一统）**：废弃"EventId 数组"，全面复用 §2.5 的"域级掩码体系"：

- App 订阅时下发 `eventMasks`（如 Base64 字符串）
- 设备端只需在内存预留几字节掩码，过滤时执行 O(1) 的 `if (mask & bit)` 即可

---

### 2.4 TLV Schema 的平滑退化

**关联文档**：`06-AXTP-TLV-Schema编码规范-v2.md`

**建议**：遇到极其复杂的老协议深层嵌套 JSON 怎么办？直接利用 `bodyEncoding = RAW_BYTES`，把老协议的 JSON/私有二进制当作透明的 bytes 塞进 TLV 的某个字段里透传。这样既不用升级 TLV 解析器，又能兼容老业务。

---

### 2.5 统一域级二进制掩码体系（Domain-Scoped Mask Framework）

**定位**：核心协议降维优化，同时应用于能力查询（`capability.getAll`）与事件订阅（`IDENTIFY.eventSubscriptions`）

**现状与痛点**：如果设备直接返回或订阅上百个 bool 键值对，会导致严重的空口带宽浪费和内存/CPU 压力。

**方案**：在 Registry 中，为每个 Capability/Event 在其 Domain 内分配 `bitOffset`（0-255）。线上统一采用扁平结构：

```text
[DomainId: 1B] + [MaskLen: 1B] + [Bitmask: N B (Little-Endian)]
```

**高水位截断规则**：如果某 Domain 最大使用到 Bit 3，则 `MaskLen` 必须为 1，极致压缩物理带宽。

**JSON/Web 支持**：在 WebSocket 中，这段二进制流直接被编码为 Base64 或 Hex String（如 `"010107050101"`），对前端极其友好，且 C++/JS 均可利用 O(1) 位运算秒级解析。

---

### 2.6 战略防御：防止"协议失控"与 AI-Native 架构前瞻

AXTP 的终极形态已经接近一个"Protocol Operating System"。这赋予了它极强的能力，但也带来了"什么都能扩展，导致什么都不稳定"的失控风险。结合前沿的 AI 视角，必须确立以下防线：

#### 防线一：严防 Domain 爆炸与强硬的治理边界

必须设立类似 `standard/capability/` 和 `core/*` 的保留域空间。任何业务团队不可擅自创建新的 Domain ID。所有新增 Domain 必须经过架构委员会 Review。

#### 防线二：将 AI 作为一等公民（First-Class AI-Native Protocol）

既然 AXTP 的 RPC 面要与 MCP（Model Context Protocol）无缝接轨供 AI Agent 调用，就不能让 AI 去"猜"协议怎么用。

- **Action**：强烈要求在 YAML Registry 的设计中，新增一套专供 AI 消费的元数据（Metadata）命名空间。
- **收益**：只要 Generator 一转，协议不仅能生成 C++ 代码，还能直接生成一套完美的、带详细语义标签的 LLM/MCP 工具描述（Tool Schemas）。

---

### 2.7 进阶防御：生命周期声明化与运行时极限解耦

为了进一步拔高 AXTP 协议栈的鲁棒性，需要把极易翻车的底层隐性状态"显性化"：

#### 防线三：Lifecycle（生命周期状态机）的注册表化

- **现状痛点**：很多协议的"未鉴权时不允许发数据"等状态控制是写死在 C++ 代码逻辑里的，容易遗漏导致越权漏洞。
- **优化方案**：在注册表中新增 `registry/lifecycle/` 模块，显式声明 `INIT → OPEN → IDENTIFIED` 等状态，并在 Methods 的定义中用 `required_state: IDENTIFIED` 进行声明。让 Generator 生成"强约束的状态拦截器（Interceptor）"，从源头杜绝状态机错乱。

#### 防线四：剥离"业务特征"与"运行时物理极限（Runtime Limits）"

在 Capability 的设计中，必须清楚界定：

- 支持断点续传叫 **feature advertisement**
- 最大允许挂载的 Stream 数量、最大的单帧接收能力叫 **runtime limits**

后者决定了设备的物理天花板，在跨多端（特别是极低功耗 MCU）协商时具有决定性意义，应当作为核心基础设施进行单独的校验与声明。

---

## 3. 匹配 Protocol OS 的标准化仓库架构与成果物分发

为了真正承载起 Registry-Driven 和 AI-Native 的愿景，必须贯彻"Schema/Generated Separation"（定义与生成产物的彻底分离）原则。

### 3.1 物理目录架构规范

建议研发团队在初始化代码仓库时，严格遵循以下结构：

```text
axtp/
├── docs/                    # 协议规范文档区
│   ├── specs/               # 00-22 系列手动编写的 Markdown
│   └── generated/           # ⚠️ 由 Generator 生成的 Registry API 参考手册
│
├── registry/                # 单一事实源 - 核心输入区（纯 YAML）
│   ├── schema/              # TLV 类型定义
│   ├── capability/          # 静态特征与运行时极限（Runtime Limits）
│   ├── lifecycle/           # 协议状态机与越权拦截定义（新增）
│   ├── ai/                  # AI-Native 元数据（AI Hints）
│   └── transport/           # ErrorCode / Protocol 常量
│
├── domains/                 # 业务域配置 - 扩展输入区（纯 YAML）
│   ├── discovery/           # 组网发现、蓝牙广播、配网域定义
│   ├── session/             # 会话鉴权、保活 QoS 域定义
│   ├── media/               # 视频/音频领域定义
│   ├── device/              # 基础设备领域定义
│   └── firmware/            # OTA 固件升级领域定义
│
├── generators/              # 编译器工具链
│   ├── src/                 # TS/Node.js 核心逻辑
│   └── templates/           # C++ / TS / Python 等目标语言生成模板
│
├── runtimes/                # 各端运行时实现（代码隔离区）
│   ├── cpp-core/            # C++ 核心协议栈
│   │   ├── src/             # 手写核心逻辑（Parser, Router, Session 管理）
│   │   └── include/
│   │       └── axtp/
│   │           └── generated/  # ⚠️ 成果物：C++ 枚举、寻址掩码、Error 宏（禁改）
│   │
│   └── web-sdk/             # 浏览器端 TS/JS SDK
│       ├── src/             # 手写核心网络与接口逻辑
│       └── generated/       # ⚠️ 成果物：TypeScript 类型定义与常量字典（禁改）
│
├── tooling/                 # 平台化工具链
│   ├── mcp/                 # ⚠️ 成果物：生成的 AI Agent（MCP）JSON Schema 工具描述
│   ├── wireshark/           # ⚠️ 成果物：生成的 Wireshark Lua 解析插件
│   └── test-vectors/        # ⚠️ 成果物：生成的 JSON 格式测试向量边界用例
│
└── adapters/                # 兼容层：针对 Legacy 老协议的嗅探与转换逻辑
```

### 3.2 成果物生成与流转路径（Artifacts Routing）

为了确保架构演进中不会出现"面条式依赖"，所有的协议变更必须且只能遵循以下"单向数据流"（CI/CD 流水线）：

#### Step 1 — 修改源头（Inputs）

开发人员如果需要新增一个亮度控制命令或一个新的错误码，只允许去修改 `registry/**/*.yaml` 或 `domains/**/*.yaml`。

#### Step 2 — 触发编译器流水线（Generator Pipeline）

```bash
npm run generate
```

#### Step 3 — 成果物自动分发（Artifacts Dispatch）

Generator 将依据读取的 YAML 文件，将成果物精准投递到指定的 `generated` 目录：

| 成果物类型 | 投递路径 | 用途 |
| --- | --- | --- |
| C/C++ 头文件 | `runtimes/cpp-core/include/axtp/generated/` | 底层 `#include` |
| Web/Node 类型 | `runtimes/web-sdk/generated/` | 前端引入 |
| AI 工具描述 | `tooling/mcp/axtp_tools.json` | Claude/ChatGPT Agent 加载 |
| 接口文档 | `docs/generated/` | 最新 Registry API 参考手册 |

#### 架构铁律（No-Touch Rule）

所有名称中带有 `generated/` 路径的目录，必须在顶部带有 `// @generated` 标记。在 Code Review 阶段，任何对 `generated/` 目录下文件的人工修改提交（PR），必须被 CI 系统无条件拒绝。这是保障 Protocol OS 不会走向混乱和失控的底线。

---

## 4. 下一步落地推进路径（Roadmap Validation）

| 阶段 | 目标 | 说明 |
| --- | --- | --- |
| 第一战役 | 冻结规范与建仓（Freeze & Init） | 锁定当前文档，按照 §3.1 的目录结构初始化 Git 仓库，确立 Registry 变更审批机制 |
| 第二战役 | 点亮 Generator | 研发优先投入 `generators/` 开发，打通从 `registry/` 到 `runtimes/.../generated/` 的自动化分发通道 |
| 第三战役 | 跑通 MVP Demo | 在 `runtimes/cpp-core/` 中基于生成的头文件，跑通"建连订阅掩码 → 获取能力掩码 → OTA 流传输" Happy Path |
| 第四战役 | 异常注入测试 | 利用 `tooling/test-vectors/` 中生成的测试向量，模拟边界异常、分片错乱，验证控制面 NACK 的健壮性 |

---

## 5. 总结

当前这套 AXTP v1 MVP 协议栈设计，兼顾了互联网架构的严谨性与嵌入式设备的资源限制。特别是最新的"域级二进制掩码"、"AI-Native（AI Hints）挂载"、"状态机生命周期下沉"以及"单向数据流与生成的隔离目录架构"，让这套协议彻底拉开了与传统"草台班子私有协议"的代差。

方案已完全成熟并具备极深的系统演进护城河，请直接向研发团队提交此定稿，启动实质性开发。

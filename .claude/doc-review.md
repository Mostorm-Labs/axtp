# AXTP 文档 Review 报告

生成日期：2026-06-09
审阅范围：全仓库文档（README、guides、specs、protocol drafts、flows、business、architecture、conformance、release、dev/skills）
评审视角：叙事结构清晰度、文档边界清晰度、内容质量、读者可理解程度

---

## 一、总体评价

仓库文档体量大、覆盖面广，有明确的生命周期治理意识，整体架构清晰。但存在以下系统性问题：

1. **入口分散**：README → docs/README → docs/guides/ → docs/dev/skills/ 四层都在讲"怎么用这个仓库"，读者不知道从哪里进、读完一个后该去哪里。
2. **受众混用**：同一文档经常同时在写给协议维护者、runtime 实现者和 AI agent，三类受众需要的信息密度和表达方式不同，混在一起导致每类读者都要筛选。
3. **叙事断裂**：顶层文档承诺的"第一步该做什么"和实际内容之间有跳跃。如 README 说"运行 pnpm generate 看结果"，但读者要先装 Node、进 generators/ 目录、理解 YAML 不存在时生成什么，这些前提条件在文档链路上缺失。
4. **状态不透明**：仓库里有 20 个 domain 在 docs/protocol/ 下有草案，但只有 audio 进了 registry/domains/。没有一张全局状态表，读者无从判断"哪些可用、哪些在讨论、哪些还没开始"。
5. **AI 指令格式渗透正文**：部分文档（尤其是 docs/dev/skills/*.md）是面向 AI agent 的操作脚本，但夹在人读的文档目录中，增加了非 AI 读者的干扰。

---

## 二、逐区域评审

### 2.1 根目录层

#### README.md

**定位**：项目入口，回答"这是什么、为什么存在、怎么开始"。

**优点**：
- 清晰区分了"为什么 AXTP 存在"与"它解决什么问题"，事实驱动，没有空话。
- 多语言 runtime 生态表格直观，让人一眼知道边界在哪。
- 8 步标准 SOP 流程结构合理。

**问题**：

1. **SOP 流程缺少"我在哪个步骤"的入口**。流程列了 8 步，但没有告诉读者"如果我是 runtime 实现者，我在第几步介入"或"如果我来新增一个协议，我从哪里开始"。读者看完 8 步仍然不知道自己该做什么。

2. **Quick start 命令放在最后，但面向的是协议维护者**（跑 generate、validate:sources），而不是最多见的第一类读者——runtime 实现者。他们需要的是"读哪个文件来实现"，而不是"跑什么命令来生成"。

3. **"多语言 runtime 生态"表格列了 runtime 仓库但没有链接占位符**。新协作者不知道这些仓库在哪。即使暂时是内部仓库，一个 `[待链接]` 占位也比没有好。

**评级**：内容 ★★★★☆ / 结构 ★★★☆☆

---

#### KICKOFF.md

**定位**：项目启动背景与战略说明。

**优点**：
- 解释了"为什么做这件事"，并且用真实痛点驱动，不是技术堆砌。
- 各角色职责分工清晰。

**问题**：

1. **缺少时效标注**。KICKOFF 文档是某个时间点的写作，但没有日期。读者不知道它描述的现状是 6 个月前还是上周的，会误把历史规划当作当前状态。
2. **和 README 内容有高度重叠**，"为什么 AXTP"的阐述在两个文档里都有，但细节和表述略有差异。如果放在同一个仓库里，建议 KICKOFF 聚焦于"决策背景和架构选型过程"，README 聚焦于"当前项目是什么和怎么用"。

**评级**：内容 ★★★★☆ / 结构 ★★★☆☆

---

#### ROADMAP.md

**定位**：迭代路线，从 Phase 1 到 v1.0。

**优点**：
- Phase 分层清晰，每个 Phase 有明确的目标和验收标准。
- 老协议迁移策略务实，不要求一步到位。

**问题**：

1. **没有当前进度标注**。一个 7 个 Phase 的 Roadmap，没有"我们现在在 Phase X，已完成 Y"的标注，读者无法判断当前状态。
2. **版本路线和 Phase 路线是两套叙事**，文档前半讲 Phase 1-7，后半讲 v0.1 到 v1.0，两套之间的对应关系不明确（Phase 1 完成对应 v0.1 还是 v0.2？）。
3. **10. 当前规则** 是非常重要的约束，但被放在文档最末尾，没有在入口处强调。应该在文档开头或 README 里就引用。

**评级**：内容 ★★★★☆ / 结构 ★★★☆☆

---

### 2.2 docs/ 层

#### docs/README.md

**定位**：文档导航总目录，告诉读者各分区的职责和阅读路径。

**优点**：
- 三类材料的权威层级（评审输入 / 事实源 / 生成合同）是核心概念，表达清晰。
- 按角色分路径（首次阅读 / spec 实现者 / quickstart）是个好设计。

**问题**：

1. **角色路径不完整**。给了"首次阅读""spec 实现者""quickstart"，缺少"协议草案作者""legacy 迁移负责人""发布负责人"的入口引导。后面的 how-to-use.md 有更完整的角色表，但两者不一致，读者会困惑。
2. **文档分区列表（10 个分区）和后文角色路径之间没有索引关系**。告诉我有 10 个分区，又给我 3 条角色路径，但角色路径里引用的文件和 10 个分区之间的关系没有明说。
3. **没有说明 docs/ 里什么是"不应该手动修改的"**。docs/generated/ 下的文件是自动生成的，不应该手改，但这条规则只在 CLAUDE.md 里说了，在 docs/README.md 里没有标注。

**评级**：内容 ★★★★☆ / 结构 ★★★☆☆

---

### 2.3 docs/guides/

#### quickstart.md

**定位**：研发接入最短路径，给 runtime / SDK 实现者的最快上手。

**优点**：
- 有真实的 JSON 报文样例，是所有文档里最直接可用的。
- Standard Framed 二进制包示例（含 CRC）极为有价值，省去了读者反复推算的工作。
- 两条路径（WS-JSON / Standard Framed）分开讲，边界清楚。

**问题**：

1. **op 枚举没有完整列出来源**。文档给了 op=0/2/3/6/7/8 的用法，但没有告诉读者这个枚举完整定义在哪（是 `registry/core/rpc_op.yaml` 还是 spec？）。读者要自己去找。
2. **"等待 Hello 才能发 Identify"这个时序约束没有足够强调**。这是新人最容易犯的错，只在 step 描述里一句带过，值得单独高亮。
3. **验收清单（第 6 节）的检查项顺序和前文的时序不一致**，第 6 节把"能跑音视频 STREAM"和能通过 conformance 放在同等位置，但这两个的前提条件差很多。
4. **文档假设读者已经有一个 mock server 或设备端**，但实际上大量读者拿到这份文档时还没有任何可连接的服务端。缺少"如何起一个 mock server 来验证这条链路"的指引。

**评级**：内容 ★★★★★ / 结构 ★★★★☆

---

#### how-to-use.md

**定位**：仓库工作流完整指南，面向协议维护者，说明自然语言需求如何贯穿整个仓库工作流。

**优点**：
- Mermaid 流程图覆盖了完整的协议生命周期，是整个文档体系中叙事最完整的一份。
- "好的请求 vs 不好的请求"对比例子非常有价值，直接教读者怎么表达需求。
- 角色导航表放在文档末尾，但内容详细、实用。

**问题**：

1. **文档假设读者已经理解 AI agent 是操作主体**。文档里"skill 路由"是面向 AI 的操作流程，但文档本身是给人看的。对于不使用 AI 辅助工作流的协议维护者，这些 skill 引用是噪音。两类工作流应该分开说明，或者明确标注"以下是 AI 辅助路径 / 以下是人工路径"。
2. **角色导航表放在末尾是错误的位置**。这是帮读者快速定位自己应该读什么的关键信息，应该在文档开头就出现。
3. **流程图虽然完整但复杂度过高**，对于首次看这份文档的读者来说，20 多个节点的 Mermaid 图需要相当时间才能消化。缺少一个"精简版 3 步流程"让读者先建立基础心智模型，再看完整图。

**评级**：内容 ★★★★★ / 结构 ★★★☆☆

---

#### core-protocol-flow.md

**定位**：Phase 1 核心链路的 runtime 实现指南，解释两层会话（CONTROL / RPC）的设计动机和实现细节。

**优点**：
- "先记住两句话"开头方式非常好，直接锁定了最容易混淆的两个方向问题（CONTROL vs RPC，Physical vs Logical）。
- 为每个设计选择说明了"为什么这样做"，是所有文档里因果链最完整的一份。

**问题**：

1. **标题和定位有些模糊**，"核心协议流程指南"可以是任何东西。更准确的标题应该是"CONTROL 链路建立和 RPC 会话握手指南"。
2. **文档面向 runtime 实现者，但夹杂了协议维护者视角的说明**（为什么这样设计）。这两类读者通常是不同的人，实现者需要的是"怎么做"，设计者需要的是"为什么"。
3. **第 14 节"音视频 STREAM 数据流"内容密度明显降低**，和前面章节相比显得潦草，说明该节在写作时已经是后补状态。

**评级**：内容 ★★★★☆ / 结构 ★★★★☆

---

#### runtime-mvp-conformance.md

**定位**：runtime 实现者的 Phase 1 MVP 范围 + conformance 接入指南。

**优点**：
- MVP checklist 明确，运行者知道必须实现什么、可以暂不实现什么。
- Troubleshooting 表格是实际踩坑总结，极有价值。

**问题**：

1. **文档在中间切换了两次受众**：第 1 节面向"需要理解 MVP 范围的人"，第 3 节切换到"需要配置 conformance 测试的人"，第 4 节又回到"遇到问题的 runtime 实现者"。这三类读者的需求不同，但被放在同一个线性文档里。
2. **WebSocket JSON MVP checklist 和 Standard Framed MVP checklist 以列表形式呈现**，但没有"这一条对应哪个 spec 章节"的引用，读者实现时要自己找规范依据。
3. **"从 conformance 接入"到"运行 conformance 测试"之间缺少一个明确的"我准备好了吗？"判断步骤**。

**评级**：内容 ★★★★☆ / 结构 ★★★☆☆

---

#### testing-conformance-quickstart.md

**定位**：测试团队视角的 conformance 验收流程。

**优点**：
- 5 步测试进阶路径设计合理，从 smoke 到全覆盖，层次清晰。
- 失败分类（runtime bug / spec-case mismatch / generated mismatch / profile declaration error / test environment）非常实用。
- 发布门禁表有明确标准，避免主观判断。

**问题**：

1. **文档开头的"测试输入优先级"表格太抽象**，没有解释"为什么按这个顺序"。读者需要先理解背景才能明白这张表的价值。
2. **conformance 验收表（WebSocket JSON / Standard Framed）和 runtime-mvp-conformance.md 里的表高度重复**，两份文档同时维护两份几乎相同的测试检查清单，容易不同步。
3. **脚注型说明（如"ACK/NACK 不是 Phase 1 mandatory"）散落在各个表格里**，应该集中在一处，避免读者漏看。

**评级**：内容 ★★★★☆ / 结构 ★★★☆☆

---

### 2.4 docs/specs/

整体评价：规格文档质量最高，但有以下共性问题。

**共性优点**：
- 每份 spec 都有明确的版本号、状态（Normative）和适用范围。
- 大量表格代替散文，减少歧义。
- 交叉引用到具体 spec 文件而不是模糊引用"参见相关文档"。

**共性问题**：

1. **中英文混用无规律**：有的 spec 全中文，有的用英文术语夹中文散文，有的表格用中文但字段名和示例用英文。在 wire format 和 spec 层面，字段名应该统一用英文并和代码/YAML 保持一致。中文描述文字可以保留，但关键术语（PayloadType、sid、requestId、op、streamId）应该在首次出现时标注中英文，后文统一用英文，不要两者混用。

2. **"Normative"状态和"draft"/"experimental"的区别没有在 specs/README.md 里解释**。读者看到 `状态：Normative` 不知道这意味着什么约束。

3. **各 spec 文件的内部结构不统一**。有的从"背景"开始，有的直接列规则表，有的有详细示例，有的没有。对于 spec 文档，结构一致性很重要，因为读者需要快速定位"这份 spec 里有没有 X"。

#### docs/specs/1-core/01-Overview.md

**优点**：一页看懂结构，两条路径的对比表设计很好。

**问题**：
- 作为"总览"文档，它既有体系架构介绍，又有具体字段说明（如 rpcEncoding 的值），导致它的功能边界和后续各 spec 有重叠。总览文档应该只讲"骨架"，细节引用到具体 spec，而不是在这里部分重复。

#### docs/specs/1-core/06-RPC-Session.md

**优点**：多种编码路径（WS Unframed JSON / Standard Framed JSON / JSON_BINARY）的对比说明清楚。

**问题**：
- Hello / Identify / Identified 的字段规范和 quickstart.md 里的 JSON 样例内容不完全一致（有的字段在 spec 里有、在 quickstart 里没提，有的字段反过来）。这种不一致会造成歧义，读者不知道以哪个为准。
- `eventMasks` 字段的语义在这份 spec 里只有一句话描述，但对 runtime 实现来说这个字段的行为（什么格式、不传时的默认行为、传空字符串 vs 不传的区别）非常重要，说明不足。

#### docs/specs/1-core/07-Stream-Data-Plane.md

**问题**：
- Phase 1 STREAM 范围（只有 audio/video media，不包含固件/文件/日志）是一个重要约束，但它在这份 spec 里是隐含的，需要读者在脚注里找。这条约束应该在文档开头就明确标出。

#### docs/specs/4-tooling/02-Generator-V1.md

**问题**：
- 文档写了 Generator 的实现规格，但没有说明"Generator 是谁用的"（CI、协议维护者、还是 runtime 仓库）。读者无法判断自己是否需要理解这份文档。

---

### 2.5 docs/protocol/

#### docs/protocol/README.md

**优点**：
- Domain 状态矩阵（草案数、评审状态、已 generated 数、优先级）是整个文档体系里最有价值的一份状态图。
- 采纳优先级分批次（P1-P7）的设计帮助了协作者了解迭代顺序。

**问题**：

1. **Domain 状态矩阵是手动维护的，但没有说明更新规则**。它现在多久更新一次？谁负责更新？如果它是 stale 的，读者如何验证？一份未声明更新频率的状态矩阵比没有状态矩阵更危险，因为它给读者一种"我已经知道状态了"的错误感。
2. **[REVIEW-*] 标记系统说明放在这个 README 里**，但实际在 docs/protocol/<domain>/<domain.feature>.md 里使用时，读者可能已经不在这个 README 的上下文里了。建议在草案文件模板里也包含 REVIEW 标记的说明注释。

#### docs/protocol/device/device.info.md（代表性草案）

**优点**：
- REVIEW 表格放在最前面，读者一眼知道哪些已确认、哪些还有问题，这是这类草案文档的最佳实践。
- 字段的 JSON 样例和 TLV 编码建议并列给出，非常实用。

**问题**：

1. **文档开头的"版本：v0.5"是草案版本，但读者不知道这和最终采纳后的 YAML 版本之间什么关系**。草案版本和协议版本应该是两个不同的概念，但文档里没有区分。
2. **`[REVIEW-DRAFT]` 和 `[REVIEW-OK]` 的字段同时存在，读者在实现时应该忽略 DRAFT 字段还是把它当作参考**？文档没有说明。
3. **草案里的 methodId 都写"TBD after adoption"**，这是正确的做法，但实现者在 review 阶段需要一个临时 ID 来写 mock，文档没有给出解决方案（比如"testing range: 0xF000-0xFEFF for draft"）。

---

### 2.6 docs/flows/

#### docs/flows/README.md

**优点**：清晰说明了 flows/ 的定位——连接业务场景和协议工作的桥梁。

**问题**：
- README 列了 7 个 active flow plans，但文档目录里实际只有 4 个 flow 文件（audio-algorithm-level-control、cast-rxtx-paring、device-firmware-update、device-system-info）以及一个 signage 管理的 flow。7 和实际文件数之间有差距，README 没有说明哪些还没写。

#### docs/flows/device-system-info.md（代表性 flow）

**优点**：
- 包含 Mermaid 序列图，极大地提升了可读性。
- 协议覆盖缺口列表（22 个 gap）非常清晰，让 Stage 20 工作有明确的输入。
- 验收 fixture 提供了具体的测试场景描述。

**问题**：

1. **文档长度太长（436 行）**，兼具了 Stage 10（flow 规划）和 Stage 20（草案输入）的职责。Stage 10 应该聚焦在"这条场景需要什么协议能力"，不应该已经包含具体的 JSON payload 样例——那是 Stage 20 的产出。
2. **22 个协议缺口的状态颜色（✅/🟡/❌/📄）没有图例说明**，读者要猜每个图标的含义。
3. **REVIEW-ASK 的 10 个开放问题集中在文档末尾**，但这些问题如果没有被解答，整个 flow 是否可以推进到 Stage 20？文档没有说明阻塞条件。

---

### 2.7 docs/business/

**整体问题**：

docs/business/ 的角色定位是"产品需求的原始输入，不是协议合同"，但实际文件（如 cast-reciever-uxplay.md、device-system-info.md）质量参差不齐——有的已经包含了协议级别的细节，有的还是非常粗糙的场景描述。这没有问题，但 README 没有说明"当一份 business 文档粗糙或不完整时，Stage 10 的 flow 规划依然可以开始"，读者可能会等待 business 文档"写完"再进行下一步。

---

### 2.8 docs/architecture/

#### domain-feature-classification.md

**优点**：
- 决策树式的 Domain 分类规则（先问"是 room 还是 device"，再问"是设备资源还是功能能力"）是整个文档体系里逻辑最严密的一份。
- Legacy migration 的 domain 分类示例直接解决了真实问题。

**问题**：
- 文档没有明确说明"如果两个域之间边界模糊怎么办"（比如 `system.power` vs `device.power`，这实际发生过）。审阅清单有助于 review，但对于真正的边界争议没有给出解决机制。

#### protocol-lifecycle-boundaries.md

**优点**：
- "两句话先记住"的写法很好，和 core-protocol-flow.md 的风格一致。
- 明确说明了 CONTROL OPEN 时不做版本谈判、RPC 鉴权分离的理由。

**问题**：
- 文档标题"协议生命周期边界"容易和 Stage 00-60 的"协议文档生命周期"混淆。前者讲的是连接建立时的状态机边界，后者讲的是从草案到采纳的工作流边界。两个"生命周期"的概念应该有更清晰的名字区分。

---

### 2.9 docs/conformance/

#### docs/conformance/README.md

**问题**：

1. **文档只有 32 行，但覆盖了 5 个重要话题**（conformance 目录结构、Phase 1 runtime 优先级、ACK/NACK 策略、STREAM scope、方法采纳前置条件），每个话题只有 1-2 句话。这种密度对于新接入的 runtime 实现者来说信息量不够。
2. **conformance/README.md 和 guides/runtime-mvp-conformance.md 有大量内容重复**，且细节深度不同步。应该明确"两者谁是 primary"，另一个引用而不是独立重复。

---

### 2.10 docs/release/

#### docs/release/README.md

**问题**：

1. **这个 README 只有 12 行，是一张文件导航表**，没有说明"什么时候应该看 release 文档"、"release 流程的大致步骤是什么"。对于第一次发布的人，这个 README 没有任何实际帮助，他们需要自己去找 CHANGELOG 和 checklist。

#### CHANGELOG.md

**优点**：
- 每个版本有明确的分类（Protocol / Registry / Schemas / Conformance / Migration / Runtime Impact）。
- "Runtime Impact"部分直接告诉 runtime 团队每个版本他们需要关注什么，是 changelog 里最有价值的设计。

**问题**：
- 版本号（v0.0.2, v0.0.3, v0.0.4）和 ROADMAP 里的版本规划（v0.1, v0.2, v1.0）是两套不同的版本体系，但这个关系没有在任何地方说明。读者不知道 v0.0.4 对应 ROADMAP 的哪个阶段。

---

### 2.11 docs/dev/skills/

**整体评价**：

这套 skill 文档是针对 AI agent 操作设计的，有完整的 frontmatter 格式（name、description、when_to_use、allowed_edits 等）和可机器执行的操作步骤。这没有问题，但它夹在 docs/ 的文档树里，和人读的文档混在同一级，制造了受众混淆。

**具体问题**：

1. **docs/dev/skills/README.md 本身是人读的**（索引和说明），但每个 skill 的 SKILL.md 实际是 AI 操作脚本。这两层受众不同，但目录结构上没有区分，容易让读者误把 SKILL.md 当成操作手册来读，然后发现格式和自己期望的不符。

2. **skill 文档里的"non-negotiables"（不可绕过的约束）和 ROADMAP 里的"当前规则"、README 里的约束，实际是同一套规则的三次重述**，但表述略有差异。应该有一个权威位置说明规则，其他地方引用。

---

### 2.12 docs/legacy-migration/

**整体评价**：

legacy migration 的材料体量最大（45 个文件），但 README 最短（24 行）。README 没有说明"我作为 runtime 实现者应该读哪些"、"我作为协议维护者应该读哪些"、"我作为 legacy adapter 作者应该读哪些"。

classification/ 目录下的域分类文件（audio.md, camera.md, device.md...）和 docs/protocol/ 里的草案之间的关系没有说明——它们是用来生成 domain.yaml 草案的吗？还是用来做 legacy mapping 的？

---

## 三、全局叙事结构问题

### 3.1 同一问题被多份文档覆盖但不一致

下表列出了叙事重叠最严重的区域：

| 话题 | 覆盖该话题的文档 | 问题 |
|---|---|---|
| 三类材料层级（评审输入/事实源/生成合同） | docs/README.md, how-to-use.md, CLAUDE.md | 表述基本一致，但每份文档说的详细程度不同，读者不知道以哪份为准 |
| WebSocket JSON 连接流程（Hello/Identify） | quickstart.md, core-protocol-flow.md, docs/specs/06-RPC-Session.md, runtime-mvp-conformance.md, testing-conformance-quickstart.md | 5 份文档，字段细节不完全一致，有 sid 格式、rpcVersion 默认值、eventMasks 是否必填等细节出入 |
| Phase 1 MVP 范围 | ROADMAP.md, runtime-mvp-conformance.md, docs/conformance/README.md, quickstart.md | 4 份文档描述基本一致，但 ACK/NACK 的说法、STREAM scope 的说法细节有微小差异 |
| 约束规则（不手写 generated 等） | CLAUDE.md, ROADMAP.md "当前规则", how-to-use.md "守则", skill 文档里的 non-negotiables | 4 个地方，语言略有差异，没有一个权威位置 |

### 3.2 缺失的关键文档

| 缺失内容 | 影响 | 建议 |
|---|---|---|
| **Domain 状态总表（动态）** | 协作者无法判断哪些协议可用 | docs/protocol/README.md 的状态矩阵需要明确更新规则和 last-updated 时间戳 |
| **生成文件清单** | 新人不知道 generate 之后哪些文件应该提交 | 在 CLAUDE.md 或 quickstart 里补充"generate 会产出哪些文件，哪些提交 git" |
| **mock server 使用入口** | runtime 实现者没有本地可连接的 server 来验证 | 即使 mock server 在外部仓库，主库里应有指向它的链接 |
| **op 枚举完整定义的读者友好版本** | 读者要翻 YAML 才能知道 op 的完整列表 | quickstart 里加一张完整 op 速查表，标明来源文件 |
| **版本号体系说明（v0.0.x 和 v0.x 的关系）** | CHANGELOG 和 ROADMAP 用不同版本号体系，读者困惑 | 在 docs/release/README.md 或 CHANGELOG 开头解释版本号逻辑 |

---

## 四、优先修复建议

按投入产出比排序：

**高优先（影响所有读者）**

1. **在 README 开头加角色导航**（"你是谁？先读哪里？"），3 行配置文字，直接指向 quickstart / how-to-use / guides/runtime-mvp-conformance，避免读者要读完整个 README 才知道入口。

2. **在 docs/protocol/README.md 的 domain 状态矩阵加 last-updated 时间戳和更新说明**，让读者知道这张表是可信的还是可能 stale 的。

3. **统一 Hello/Identify 的字段说明**，让 quickstart.md、06-RPC-Session.md 和 runtime-mvp-conformance.md 里的字段名和默认值严格一致，有一个来源（spec），其他引用它而不是重新描述。

**中优先（影响特定角色）**

4. **how-to-use.md 的角色导航表移到文档开头**，而不是放在末尾。

5. **quickstart.md 加 op 枚举完整速查表和 mock server 起步入口**。

6. **docs/release/README.md 扩展**，加入版本号体系说明（v0.0.x vs ROADMAP 里的 v0.x 的关系）和最小发布操作步骤。

**低优先（影响长期维护）**

7. **KICKOFF.md 加写作日期**，或者把它的战略内容合并进 ROADMAP 的背景章节，避免两份文档说同一件事。

8. **docs/conformance/README.md 和 runtime-mvp-conformance.md 明确主从关系**，其中一份作为 primary，另一份引用。

9. **spec 文档添加统一的结构模板**（背景 → 规范主体 → 字段速查表 → 与其他 spec 的关系），提升 specs/ 里各文档的一致性。

---

## 五、文档质量评分汇总

| 文档 | 内容质量 | 结构/可理解度 | 边界清晰度 | 主要问题 |
|---|:---:|:---:|:---:|---|
| README.md | ★★★★☆ | ★★★☆☆ | ★★★★☆ | 缺角色导航入口，quick start 面向错误受众 |
| KICKOFF.md | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | 缺日期，与 README 内容重叠 |
| ROADMAP.md | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | 无当前进度标注，两套版本体系未对齐 |
| docs/README.md | ★★★★☆ | ★★★☆☆ | ★★★★☆ | 角色路径不完整，generated 文件无标注 |
| quickstart.md | ★★★★★ | ★★★★☆ | ★★★★☆ | 缺 op 枚举来源，缺 mock server 入口 |
| how-to-use.md | ★★★★★ | ★★★☆☆ | ★★★★★ | 角色导航在末尾，AI 路径和人工路径混用 |
| core-protocol-flow.md | ★★★★☆ | ★★★★☆ | ★★★★☆ | Stream 节内容密度明显低 |
| runtime-mvp-conformance.md | ★★★★☆ | ★★★☆☆ | ★★★★☆ | 受众在文档中途切换 |
| testing-conformance-quickstart.md | ★★★★☆ | ★★★☆☆ | ★★★★☆ | 与 runtime-mvp 高度重复 |
| docs/specs/ (整体) | ★★★★★ | ★★★★☆ | ★★★★★ | 中英文混用无规律，结构不统一 |
| docs/protocol/README.md | ★★★★☆ | ★★★★☆ | ★★★★★ | 状态矩阵无更新机制 |
| docs/protocol/*.md (草案) | ★★★★☆ | ★★★★☆ | ★★★★☆ | draft id TBD 没有临时范围 |
| docs/flows/*.md | ★★★★☆ | ★★★★☆ | ★★★☆☆ | 部分 flow 混入 Stage 20 内容 |
| docs/architecture/*.md | ★★★★★ | ★★★★★ | ★★★★☆ | "生命周期"两个概念命名冲突 |
| docs/conformance/README.md | ★★★☆☆ | ★★★☆☆ | ★★★★☆ | 32 行覆盖 5 个话题，密度不够 |
| docs/release/ | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ | 版本体系未说明，README 过于简短 |
| docs/legacy-migration/README.md | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ | 45 个文件但 README 只有 24 行 |
| docs/dev/skills/ | ★★★★☆ | ★★★★☆ | ★★★☆☆ | AI 脚本和人读文档混在同一目录 |

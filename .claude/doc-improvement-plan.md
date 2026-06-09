# AXTP 文档结构改进计划

基于 `.claude/doc-review.md` 的诊断结论，本文档提出重组方案。
核心方向：**按角色而不是按工作流组织入口**。不是为每个需求场景单独整理一份文档，而是让每类读者在进入仓库的第一步就找到属于自己的操作主页，不需要读完整个 README 才能开始。

---

## 零、已完成的改动

### README.md — 在"一览"后面加"快速入口"

在一览表和"为什么是 AXTP？"之间插入了角色快速入口表：

```markdown
## 快速入口

| 你是谁 | 从这里开始 |
| --- | --- |
| 协议维护者（写草案、采纳、生成） | [如何使用这个仓库](docs/guides/how-to-use.md) |
| Runtime / SDK 实现者 | [研发接入 Quickstart](docs/guides/quickstart.md) |
| 测试 / Conformance 验收 | [Conformance 测试入门](docs/guides/testing-conformance-quickstart.md) |
| 产品 / 架构 | [Domain 状态矩阵](docs/protocol/README.md) |
```

### how-to-use.md — 角色导航移到文档开头

文档第一个 h2 现在是"你的角色是什么？"，直接指向每类读者的操作主页。协议维护者继续读本文档，其他角色直接跳出。原来末尾的"不同角色该读什么"表已删除（内容已合并到开头）。

---

## 一、核心诊断（给 agent 的背景）

仓库文档的两个根本问题：

**问题 1：一句话被讲了四遍，每遍细节不一样。**

- Hello/Identify 握手在 quickstart.md、core-protocol-flow.md、specs/06-RPC-Session.md、runtime-mvp-conformance.md、testing-conformance-quickstart.md 里各讲一遍，字段细节不完全一致
- "不要手写 generated 文件"在 CLAUDE.md、ROADMAP.md、how-to-use.md、各 SKILL.md 里都有
- "三类材料层级"在 docs/README.md、how-to-use.md、CLAUDE.md 里都有

**问题 2：入口不按角色组织，读者进来不知道从哪里开始。**

过去的做法是"需要和研发说明时整一个 kickoff，需要说明 skill 时整一个 skill 说明"，每次需求驱动一份文档，最终仓库里有 n 份文档但没有人知道读哪份。

解决方向：
- 每件事在一个地方讲清楚，其他地方只引用
- 每类读者有一个明确的操作主页，进来第一步就找到

---

## 二、改动原则

1. **不新建文档，合并或重定向**。现在文档太多了，不是太少。
2. **改动不破坏 generated、registry、specs 内容**，只改 docs/ 层的组织和叙事。
3. **改动后每份文档应有单一明确的受众**。
4. **任何一类读者最多 2 次跳转到达需要的信息**。
5. **保留有价值的内容**（JSON 样例、二进制包示例、状态矩阵），只调结构和去重。

---

## 三、剩余待执行改动（按优先级）

### 改动 1：quickstart.md 加 op 枚举速查表

**现状**：给了 op=0/2/3/6/7/8 的用法，没有完整列表，没有来源引用。

**改法**：在"4. JSON Envelope 速查"表格后插入完整 op 枚举表：

```markdown
### 4.1 完整 op 枚举（来源：registry/core/rpc_op.yaml）

| op | 名称 | 状态 | 用途 |
| ---: | --- | --- | --- |
| 0x00 | HELLO | mvp | Server 发给 Client，握手开始 |
| 0x01 | HELLO_ACK | reserved | 保留，AXTP v1 不使用 |
| 0x02 | IDENTIFY | mvp | Client 发给 Server，发送身份/订阅/恢复 |
| 0x03 | IDENTIFIED | mvp | Server 发给 Client，分配 sid |
| 0x04 | REIDENTIFY | draft | 更新订阅（Phase 1 暂不实现） |
| 0x05 | SUBSCRIBE | reserved | 保留，不使用 |
| 0x06 | EVENT | mvp | Server 发给 Client，业务事件推送 |
| 0x07 | REQUEST | mvp | Client 发给 Server，业务 RPC 请求 |
| 0x08 | REQUEST_RESPONSE | mvp | Server 发给 Client，对应 REQUEST 的响应 |
| 0x09 | REQUEST_BATCH | draft | 批量 RPC（Phase 1 暂不实现） |
| 0x0A | REQUEST_BATCH_RESPONSE | draft | 批量响应（Phase 1 暂不实现） |
| 0x0E | BYE | draft | 应用层优雅关闭（Phase 1 暂不实现） |
| 0x0F | BYE_ACK | draft | 应用层关闭确认（Phase 1 暂不实现） |

Phase 1 MVP 只需要实现 `status: mvp` 的 op。
`reserved` 和 `draft` 状态的 op 收到时应当作 unknown op 处理。
```

**改动文件**：[docs/guides/quickstart.md](../docs/guides/quickstart.md)

---

### 改动 2：统一 Hello/Identify 字段说明——以 spec 为准，其他引用

**现状**：5 份文档各自描述 Hello/Identify，细节不一致。

**步骤 2a**：在 [docs/specs/1-core/06-RPC-Session.md](../docs/specs/1-core/06-RPC-Session.md) 里补充以下当前缺失的字段行为（这是 primary source）：
- `eventMasks`：传空字符串 `""` 和不传，效果是否相同？
- `rpcVersion`：Identify 时不传，Server 应如何处理？
- `sid` 格式：固定 8 位 hex string（32-bit 的 hex 表达），不是任意文本 token

**步骤 2b**：在 quickstart.md 的 Hello/Identify 样例处加引用脚注：

```markdown
> 字段完整规范见 [docs/specs/1-core/06-RPC-Session.md](../specs/1-core/06-RPC-Session.md)。本节只展示最常用路径。
```

**步骤 2c**：在 runtime-mvp-conformance.md 的 Hello/Identify checklist 处，删除字段内容描述，改为引用 spec。

**改动文件**：
- docs/specs/1-core/06-RPC-Session.md（补充字段行为）
- docs/guides/quickstart.md（加引用脚注）
- docs/guides/runtime-mvp-conformance.md（删重复字段描述，改引用）

---

### 改动 3：docs/conformance/README.md 扩展为主文档

**现状**：docs/conformance/README.md 只有 32 行，和 runtime-mvp-conformance.md 内容重复但深度不一致。

**步骤 3a**：conformance/README.md 扩展，吸收 runtime-mvp-conformance.md 里的：
- Phase 1 MVP scope 表格
- conformance 级别声明方式
- 运行命令

**步骤 3b**：runtime-mvp-conformance.md 只保留：
- 实现者的 MVP checklist（链接到 spec）
- Troubleshooting 表格（踩坑总结，该文档最独特的价值）
- 开头加"conformance 运行方法见 docs/conformance/README.md"

---

### 改动 4：docs/protocol/README.md 状态矩阵加 last-updated

**改法**：在表格前加：

```markdown
> 最后更新：2026-06-09（每次 domain 状态变更后手动更新此日期）
> 验证方式：`registry/domains/` 下有 `domain.yaml` 的 domain 为已 generated；其余为草案状态。
```

---

### 改动 5：docs/release/README.md 加版本号说明

**改法**：在文件开头加：

```markdown
## 版本号说明

| 版本体系 | 示例 | 含义 |
| --- | --- | --- |
| Spec 版本（CHANGELOG 使用） | `spec/v0.0.4` | Git tag，Runtime 仓库绑定这个版本 |
| Roadmap 里程碑 | `v0.1`、`v0.2` | 功能完成度里程碑，用于规划而非发布绑定 |

多个 Spec 版本（`v0.0.2`、`v0.0.3`、`v0.0.4`...）累积完成后，对应 Roadmap 里的一个里程碑（`v0.1` = Phase 1 完成）。
```

---

## 四、不应该做的事

| 想法 | 不做的原因 |
| --- | --- |
| 把 docs/dev/skills/ 移出 docs/ | skills 里引用大量相对路径，移动会全部断链 |
| 合并 quickstart.md 和 runtime-mvp-conformance.md | 受众不同，合并让两类读者都找不到自己的内容 |
| 合并 KICKOFF.md 进 ROADMAP.md | 两份文档的读者需求不同（新成员 vs 做排期的维护者） |
| 全文统一中英文 | 工作量大但优先级低；只需关键术语用词一致 |
| 直接删除重复文档 | 先用引用替代重复，下一轮再考虑能否删除 |

---

## 五、执行顺序

```text
改动 4 (状态矩阵加日期)           ← 3 行，零风险
改动 5 (release 版本说明)          ← 插入内容，零风险
改动 1 (quickstart op 枚举)        ← 插入内容，零风险
改动 2 (统一 Hello/Identify 字段)  ← 涉及多文件，放后面
改动 3 (conformance 主从关系)      ← 内容迁移，需核对链接
```

---

## 六、验收标准

1. 打开 README，能在 5 秒内找到"研发接入 Quickstart"的链接。
2. 打开 how-to-use.md，能在 3 秒内找到自己的角色路径。
3. Hello/Identify 的 op 值、字段和行为，在 quickstart、spec、conformance 里是同一件事（引用关系而不是各自描述）。
4. Domain 状态矩阵上有日期。
5. CHANGELOG 的 `spec/v0.0.x` 和 ROADMAP 的 `v0.x` 的关系在 release/README.md 里有说明。


---

## 一、核心诊断（给 agent 的背景）

仓库文档的根本问题是**一句话被讲了四遍，但每遍细节不一样**。典型例子：

- Hello/Identify 握手流程在 quickstart.md、core-protocol-flow.md、specs/06-RPC-Session.md、runtime-mvp-conformance.md、testing-conformance-quickstart.md 里各讲一遍，字段细节不完全一致
- "不要手写 generated 文件"这条规则在 CLAUDE.md、ROADMAP.md "当前规则"、how-to-use.md "守则"、各 SKILL.md "non-negotiables" 里都有，语言略有差异
- "三类材料层级"（评审输入/事实源/生成合同）在 docs/README.md、how-to-use.md、CLAUDE.md 里都有

解决方向是**把每件事在一个地方讲清楚，其他地方只引用，不重复**。

---

## 二、改动原则

在执行任何具体改动前，agent 应遵守以下原则：

1. **不新建文档，而是合并或重定向**。现在文档太多了，不是太少。
2. **改动不破坏现有 generated、registry、specs 内容**，只改 docs/ 层的组织结构和叙事结构。
3. **改动后每份文档应该有单一明确的受众**（runtime 实现者 / 协议维护者 / 测试 / 产品）。
4. **改动后任何一类读者应该能通过最多 2 次跳转到达需要的信息**，不需要读整本文档。
5. **保留现有有价值的内容（JSON 样例、二进制包示例、状态矩阵）**，只调整结构和去重，不重写正确内容。

---

## 三、按优先级排列的具体改动

### 改动 1：README.md 开头加角色导航

**现状**：README.md 是一篇 170 行的长文，读者必须通读才能知道入口在哪。

**改法**：在 README 第一个 h2 之前插入"你是谁？先读哪里"导航块。内容如下：

```markdown
## 你是谁？先读哪里

| 你的角色 | 第一步读 |
|---|---|
| Runtime / SDK 实现者 | [研发接入 Quickstart](docs/guides/quickstart.md) |
| 协议维护者（写草案、采纳、生成） | [如何使用这个仓库](docs/guides/how-to-use.md) |
| 测试 / Conformance 验收 | [Conformance 测试入门](docs/guides/testing-conformance-quickstart.md) |
| 产品 / 架构（了解协议现状） | [docs/protocol/README.md — Domain 状态矩阵](docs/protocol/README.md) |
| 首次接触 AXTP | 继续往下读本文档 |
```

**改动文件**：README.md（插入约 10 行）

**注意**：不要改现有正文内容，只在最上方加这个表格，保留原来的 SOP 流程和生态介绍。

---

### 改动 2：quickstart.md 加 op 枚举速查表

**现状**：quickstart.md 给了 op=0/2/3/6/7/8 的用法，但没有完整列表，也没有告诉读者来源文件是 `registry/core/rpc_op.yaml`。

**改法**：在"4. JSON Envelope 速查"表格后面，插入一张完整的 op 枚举表，标注来源：

```markdown
### 4.1 完整 op 枚举（来源：registry/core/rpc_op.yaml）

| op | 名称 | 状态 | 用途 |
|---:|---|---|---|
| 0x00 | HELLO | mvp | Server 发给 Client，握手开始 |
| 0x01 | HELLO_ACK | reserved | 保留，AXTP v1 不使用 |
| 0x02 | IDENTIFY | mvp | Client 发给 Server，发送身份/订阅/恢复 |
| 0x03 | IDENTIFIED | mvp | Server 发给 Client，分配 sid |
| 0x04 | REIDENTIFY | draft | 更新订阅或 session 选项（Phase 1 暂不实现） |
| 0x05 | SUBSCRIBE | reserved | 保留，不使用 |
| 0x06 | EVENT | mvp | Server 发给 Client，业务事件推送 |
| 0x07 | REQUEST | mvp | Client 发给 Server，业务 RPC 请求 |
| 0x08 | REQUEST_RESPONSE | mvp | Server 发给 Client，对应 REQUEST 的响应 |
| 0x09 | REQUEST_BATCH | draft | 批量 RPC（Phase 1 暂不实现） |
| 0x0A | REQUEST_BATCH_RESPONSE | draft | 批量响应（Phase 1 暂不实现） |
| 0x0E | BYE | draft | 应用层优雅关闭（Phase 1 暂不实现） |
| 0x0F | BYE_ACK | draft | 应用层关闭确认（Phase 1 暂不实现） |

Phase 1 MVP 只需要实现 `status: mvp` 的 op。`reserved` 和 `draft` 状态的 op 收到时应当作 unknown op 处理并返回错误。
```

**改动文件**：docs/guides/quickstart.md（在第 4 节末尾插入约 20 行）

---

### 改动 3：how-to-use.md 把角色导航表移到文档开头

**现状**：how-to-use.md 末尾有一张"不同角色该读什么"的表，非常有价值，但放在 300 行文档的末尾意味着读者要读完才能找到入口。

**改法**：把现有末尾的角色导航表**直接移到文档第一个 h2 之前**（文档标题之后），然后在末尾保留一个引用链接指回该位置（避免读完文档的人找不到）。

移动的内容（不要重写，原样搬过去）：

```markdown
## 不同角色该读什么

先找到你的角色，按路径进入。

| 角色 | 先读 | 再读 |
|---|---|---|
| 产品 / 架构 | `docs/business/`、`docs/flows/` | `docs/protocol/README.md` |
| 协议维护者 | `docs/dev/skills/README.md` | `docs/specs/README.md`、`registry/` |
| Runtime 实现者 | `docs/generated/protocol.md` | `protocol/axtp.protocol.yaml`、`docs/conformance/README.md` |
| 测试 / conformance 负责人 | `docs/guides/testing-conformance-quickstart.md` | `docs/conformance/README.md`、generated references |
| 发布负责人 | `docs/release/README.md` | `.github/workflows/`、`scripts/build-spec-artifact.sh` |
| Legacy 迁移负责人 | `docs/legacy-migration/README.md` | `tooling/legacy_classification/`、`tooling/migration/` |
```

**改动文件**：docs/guides/how-to-use.md（把末尾的角色表移到文档开头）

---

### 改动 4：统一 Hello/Identify 字段说明——以 spec 为准，其他引用

这是文档里一致性问题最严重的地方。

**现状**：5 份文档各自描述 Hello/Identify，细节不一致。

**改法**：

**步骤 4a**：检查 docs/specs/1-core/06-RPC-Session.md 中 Hello/Identify/Identified 的字段定义是否完整准确（sid 格式、rpcVersion 默认、eventMasks 行为）。这是 primary source。如果不完整，在 spec 里补充。

需要在 spec 里明确的字段行为（当前缺失）：
- `eventMasks`：传空字符串 `""` 和不传 `eventMasks` 字段，两者效果是否相同？
- `rpcVersion`：Client 发 Identify 时如果不传这个字段，Server 应该怎么处理？
- `sid` 格式：`"12345678"` 是固定 8 位 hex string（即 32-bit 的 hex 表达），不是任意文本 token，这条规则只在 quickstart 里写清楚了，spec 里要同步。

**步骤 4b**：在 quickstart.md 的 Hello/Identify 样例处，加上引用到 spec 的脚注，例如：

```markdown
> 字段完整规范见 [docs/specs/1-core/06-RPC-Session.md](../specs/1-core/06-RPC-Session.md)。本节只展示最常用路径。
```

**步骤 4c**：在 runtime-mvp-conformance.md 的 Hello/Identify checklist 处，删除字段内容描述，改为"遵照 docs/specs/1-core/06-RPC-Session.md"的引用。

**改动文件**：
- docs/specs/1-core/06-RPC-Session.md（补充 eventMasks 行为、sid 格式约束、rpcVersion 缺省处理）
- docs/guides/quickstart.md（加引用脚注）
- docs/guides/runtime-mvp-conformance.md（删除重复字段描述，改为引用）

---

### 改动 5：docs/conformance/README.md 改为 primary，runtime-mvp-conformance.md 改为引用

**现状**：docs/conformance/README.md 只有 32 行，和 runtime-mvp-conformance.md 内容重复但密度不同步。

**改法**：

**步骤 5a**：docs/conformance/README.md 扩展为"conformance 使用主文档"，把以下内容从 runtime-mvp-conformance.md 里迁移过来（不是复制，是剪切+删除原处）：
- Phase 1 MVP scope 表格（what's in / what's deferred）
- conformance 级别声明方式
- 运行 conformance 的命令

**步骤 5b**：runtime-mvp-conformance.md 保留的内容只有：
- Runtime 实现者的 MVP checklist（实现时该做什么，参照 spec 链接）
- Troubleshooting 表格（踩坑总结，这是该文档最独特的价值）
- 文件开头加一行"conformance 运行方法见 docs/conformance/README.md"

**改动文件**：
- docs/conformance/README.md（扩展，吸收 runtime-mvp-conformance.md 的 conformance 操作部分）
- docs/guides/runtime-mvp-conformance.md（瘦身，只留实现 checklist 和 troubleshooting）

---

### 改动 6：docs/protocol/README.md 的状态矩阵加 last-updated 标注

**现状**：Domain 状态矩阵有 20 行，是协作者了解当前进度的最有价值的文档，但没有日期，读者不知道是否可信。

**改法**：在表格标题上方加一行：

```markdown
> 最后更新：YYYY-MM-DD（每次 domain 状态变更后手动更新此日期）
```

同时在表格下方加一句：

```markdown
验证方式：`registry/domains/` 下有 `domain.yaml` 的 domain 为已 generated；其余为草案状态。
```

**改动文件**：docs/protocol/README.md（加约 3 行）

---

### 改动 7：docs/release/README.md 加版本号体系说明

**现状**：CHANGELOG.md 用 `spec/v0.0.4`，ROADMAP.md 用 `v0.1`，读者不知道两套版本号的关系。

**改法**：在 docs/release/README.md 现有内容前面插入：

```markdown
## 版本号说明

AXTP 使用两套版本号，含义不同：

| 版本体系 | 示例 | 含义 |
|---|---|---|
| Spec 版本（CHANGELOG 使用） | `spec/v0.0.4` | Git tag，标记某一时刻 registry/spec/generated 的快照。Runtime 仓库绑定这个版本。 |
| Roadmap 里程碑版本 | `v0.1`、`v0.2` | 功能完成度里程碑，用于规划而非发布绑定。 |

两者关系：多个 Spec 版本（`v0.0.2`, `v0.0.3`, `v0.0.4`...）累积完成后，会对应 Roadmap 里的一个里程碑（`v0.1` = Phase 1 完成）。
```

**改动文件**：docs/release/README.md（插入约 15 行）

---

### 改动 8：docs/flows/README.md 同步实际文件数

**现状**：README 列了 7 个 active flow plans，实际只有 5 个文件，差距 2 个未说明。

**改法**：在 README 的 flow 列表里，对还没创建的 flow 加状态标注：

```markdown
| Flow | 文件 | 状态 |
|---|---|---|
| Audio Algorithm Level Control | audio-algorithm-level-control.md | ✅ 已完成 |
| Cast Receiver UxPlay | cast-rxtx-paring.md | ✅ 已完成 |
| ... | ... | ... |
| NA20/NT10 Device Streaming | — | 📝 待创建 |
| NearHub Signage Device Management | signage-device-management.md | ✅ 已完成 |
```

**改动文件**：docs/flows/README.md（把文字列表改为带状态的表格）

---

### 改动 9：ROADMAP.md 加当前进度标注

**现状**：7 个 Phase 没有"我们现在在哪里"的标注。

**改法**：在路线总览表格里，已完成/进行中的 Phase 行前加标注：

在"路线总览"表格标题前插入：

```markdown
> 当前进度：Phase 1 协议规格已 RC1，audio domain 已 generated，device/system/firmware 草案已存在等待采纳。详见 [docs/protocol/README.md — Domain 状态矩阵](docs/protocol/README.md)。
```

同时在文档末尾"10. 当前规则"部分加一个醒目标注，并在文档开头的总览表格里引用：

```markdown
> ⚠️ 规则约束：参见文末「10. 当前规则」，任何 runtime、草案、生成操作的强制限制都在那里。
```

**改动文件**：ROADMAP.md（插入约 4 行，不改正文）

---

### 改动 10：docs/architecture/protocol-lifecycle-boundaries.md 改标题

**现状**：标题"协议生命周期边界"和 Stage 00-60 的"协议文档生命周期"命名冲突。

**改法**：把文档标题从"协议生命周期边界"改为"连接建立边界与会话状态机"，在文档开头加一行说明：

```markdown
> 本文讲的是"连接建立时的状态机边界"（CONTROL OPEN → RPC Hello → APP_READY）。
> 如果你要找"从草案到采纳的工作流生命周期"，见 docs/dev/skills/README.md。
```

**改动文件**：docs/architecture/protocol-lifecycle-boundaries.md（改标题 + 加 2 行）

---

## 四、不应该做的事

以下改动看起来合理，但实际收益低或风险高，**不建议执行**：

| 想法 | 不做的原因 |
|---|---|
| 把 docs/dev/skills/ 移出 docs/ | Skills 目录需要和文档树在同一位置，因为 skill 里引用了大量相对路径。移动会破坏所有相对路径引用。 |
| 把 quickstart.md 和 runtime-mvp-conformance.md 合并 | 两者受众不同（quickstart=想跑通的人，runtime-mvp=想实现正确的人），合并会让两类读者都找不到自己的内容。 |
| 把 KICKOFF.md 内容合并进 ROADMAP.md | KICKOFF 是历史背景文档，合并后 ROADMAP 会变长，而且 KICKOFF 的读者（新加入的团队成员）和 ROADMAP 的读者（做排期的协议维护者）需求不同。 |
| 统一 specs/ 里所有文档的中英文 | 工作量大但优先级低。spec 的中文描述没有错，读者理解中文更快。只需要保证关键术语（sid/op/requestId 等）在不同文档中用词一致，不需要把所有描述文字都改成英文。 |
| 删除内容重复的文档 | 删除比修改风险更高。先用"引用替代重复"的方式，把重复内容的权威位置定下来，再在下一轮里考虑能否删除。 |

---

## 五、执行顺序建议

如果 agent 一次执行所有改动，推荐按以下顺序，从低风险到高风险：

```text
改动 1 (README 加导航)
  → 改动 6 (domain 状态矩阵加日期)
  → 改动 7 (release 加版本说明)
  → 改动 8 (flows README 同步文件数)
  → 改动 9 (ROADMAP 加进度标注)
  → 改动 10 (architecture 改标题)
  → 改动 3 (how-to-use 移角色表到开头)
  → 改动 2 (quickstart 加 op 枚举)
  → 改动 4 (统一 Hello/Identify 字段说明)  ← 改动最多的文件，放后面
  → 改动 5 (conformance README 扩展)       ← 内容迁移，需要仔细核对
```

改动 1-3 是纯增量操作（只插入内容，不删现有内容），风险最低，先做。
改动 4-5 涉及内容迁移和修改，放后面，每个改动完成后验证链接完整性。

---

## 六、验收标准

所有改动完成后，应该满足：

1. 一个从没看过这个仓库的 runtime 实现者，打开 README，能在 10 秒内找到"研发接入 Quickstart"的链接。
2. 一个协议维护者，打开 how-to-use.md，能在 5 秒内找到自己的角色路径。
3. Hello/Identify 的 op 值、字段和行为，在 quickstart.md、spec、runtime-mvp-conformance.md 里说的是同一件事（有引用关系而不是各自描述）。
4. Domain 状态矩阵上有日期，读者知道这份表的新鲜度。
5. CHANGELOG 里的 `spec/v0.0.x` 和 ROADMAP 里的 `v0.x` 的关系，在 docs/release/README.md 里有说明。

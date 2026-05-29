是的，你现在描述的这个方向才是更稳的：
不要让 AI 直接手写 axtp.protocol.yaml，而是让 AI 按 registry-spec 的规则，读取“注册表 MD 母文件 / 业务源文档 / legacy mapping”，再生成结构化 YAML，最后由工具聚合成 axtp.protocol.yaml。

也就是说，应该形成三层来源关系：

registry-spec 文档：定义规则
registry-md 母文件：承载规划、编号、业务候选项、迁移依据
registry-yaml：机器可读事实源
axtp.protocol.yaml：聚合后的协议 IR
generated/protocol.md：最终发布文档

⸻

1. registry 中的 YAML 应该从哪里来？

不应该完全手写，也不应该完全由 AI 凭空生成。

它应该来自三类输入：

1. registry-spec 规则文档
2. registry-md 母文件 / 规划文档
3. legacy / 业务源文档

你上传的两份文档正好就是这个体系的雏形。

08-AXTP-Registry总则-v2.md 已经明确说，Registry 是 AXTP 协议落地的单一事实源，统一管理 PayloadType、Control Opcode、MethodId、EventId、ErrorCode、CapabilityId、SchemaId、FieldId、Vendor Extension、Legacy Mapping 等对象，并且目标是通过 registry/*.yaml + schema/*.yaml 生成 Markdown、C++ enum、struct、descriptor、TLV skeleton 和测试向量。 ￼

09-AXTP-MethodId注册表-v2.md 则已经承担了“MethodId 母文件”的角色：它定义了 MethodId 的位置、基本规则、Domain 分段、Method 条目字段、MVP 最小方法集合、完整 MethodId 规划表、老协议适配 MethodId 表，以及 Method 与 Schema/ErrorCode/Capability/Event 的关系。 ￼

所以更合理的生成链路是：

08 Registry 总则
09 MethodId 注册表 MD
10 EventId 注册表 MD
11 ErrorCode 注册表 MD
12 Type/Capability 注册表 MD
13 Profile 注册表 MD
legacy docs / old protocol docs
        ↓
AI / axtpc extract + normalize
        ↓
registry/method/*.yaml
registry/event/*.yaml
registry/error/*.yaml
registry/types/*.yaml
registry/profiles/*.yaml
        ↓
axtpc collect / validate / build
        ↓
protocol/axtp.protocol.yaml
        ↓
generated/protocol.md

⸻

2. registry-spec 与 registry-md 母文件是什么关系？

建议明确成这种关系：

层级	示例	作用	是否频繁变化
Registry Spec	08-AXTP-Registry总则-v2.md	定义通用规则、字段、ID 范围、生命周期、校验规则	很少变
Registry Domain Spec	09-AXTP-MethodId注册表-v2.md	定义某类注册表的字段、编号范围、候选项、规划表	中低频变化
Registry YAML	registry/method/device.yaml	机器可读的已采纳条目	随业务新增
Protocol IR	protocol/axtp.protocol.yaml	聚合所有 YAML 后的统一协议定义	自动生成
Generated Docs	generated/protocol.md	发布给开发者的最终文档	自动生成

更直接地说：

registry-spec 规定“怎么登记”
registry-md 母文件规定“有哪些候选项、编号范围、规划依据”
registry-yaml 记录“哪些条目已经正式进入机器事实源”
axtp.protocol.yaml 聚合“当前协议版本的完整机器定义”

⸻

3. 新增业务时，是否每次都去 MD 母文件中核对？

是的，但不是人工凭感觉核对，而应该成为流程的一部分。

新增业务时，AI 或 axtpc 应该按下面顺序工作：

1. 读取 08 Registry 总则，理解通用规则
2. 读取对应 registry-spec / registry-md，例如 09 MethodId 注册表
3. 查找是否已有等价 method/event/error/type
4. 判断业务属于哪个 domain
5. 判断 ID 是否在正确范围
6. 判断是否已有规划编号
7. 判断是否需要新增 schema
8. 判断是否需要新增 errorCode
9. 判断是否影响 legacy mapping
10. 生成或修改 registry/*.yaml
11. 运行校验
12. 重新生成 axtp.protocol.yaml 和 protocol.md

这其实和你上传的 08 中“Registry Review 规则”完全一致：新增或修改 Registry 条目时必须检查是否已有等价方法/事件/能力、是否属于正确 domain、ID 是否在正确范围、命名是否符合规范、是否需要 schema、是否需要 errorCode、是否影响老协议兼容、是否进入 MVP。 ￼

所以 MD 母文件不是废弃的，它应该作为：

AI / axtpc 新增业务时的业务规划索引和审核依据。

⸻

4. 推荐最终流程：Spec + Registry MD + YAML 三段式

我建议不要把 09-AXTP-MethodId注册表-v2.md 直接替换成 YAML。
它应该保留，但角色调整为：

09 = Method Registry 规则 + 规划母表 + 人类审核入口
registry/method/*.yaml = 已采纳机器事实

例如 09 中可以继续保留：

MethodId Domain 分段
Method 条目字段定义
MVP 最小方法集合
完整 MethodId 规划表
老协议适配 MethodId 表
Method 与 Schema/ErrorCode/Capability/Event 的关系
Generator 校验规则

这些内容对 AI 生成 YAML 非常有价值。

而 YAML 只保存已经正式采纳的条目，例如：

domain: display
registry: methods
version: 1.0.0
methods:
  - id: 0x0501
    name: display.getBrightness
    kind: method
    status: mvp
    domain: display
    description: Get current display brightness.
    schema:
      params: EmptyParams
      result: DisplayGetBrightnessResult
    errors:
      - SUCCESS
      - RPC_PARAM_INVALID
      - BUSY
    events: []
    mvp: true
    priority: P0

⸻

5. AI 应该如何根据 MD 生成 YAML？

建议让 AI 按“证据链”生成，而不是直接补 YAML。

每次新增业务，AI 输出应该包含四部分：

1. 业务意图分析
2. Registry MD 核对结果
3. YAML 修改内容
4. 校验结果

例如用户说：“新增显示输入源切换”。

AI 应该做：

业务意图：
  display input source control
查 09 规划表：
  display.* 中已有 display.setInputSource = 0x0510
  display.getInputSource = 0x0511
判断：
  属于 display domain
  ID 范围 0x0500-0x05FF 正确
  不是新增编号，而是激活 draft 规划项
  需要 schema:
    DisplaySetInputSourceParams
    DisplayGetInputSourceResult
  可能触发 event:
    display.inputSourceChanged
  需要 error:
    SUCCESS / INVALID_ARGUMENT / BUSY / RPC_METHOD_NOT_SUPPORTED
生成 YAML：
  registry/method/display.yaml 增加或更新对应条目
  registry/types/display.yaml 增加 schema 类型
  registry/events/display.yaml 可选增加事件

这就实现了你说的：

既做好了管理，又有来源依据。

⸻

6. axtp.protocol.yaml 的生成输入应该是什么？

建议明确为：

axtp.protocol.yaml = 由 axtpc 从 registry-yaml 聚合生成

而 registry-yaml 又来自：

registry-md 母文件 + legacy 源文档 + 人工/AI 审核

不要让 axtp.protocol.yaml 直接读 MD 母文件生成。
更稳的链路是两段：

阶段 A：MD / legacy / 业务需求 -> registry YAML
阶段 B：registry YAML -> axtp.protocol.yaml

原因：

1. MD 是人类可读，结构容易变化；
2. YAML 是机器可读，适合严格校验；
3. axtp.protocol.yaml 是聚合 IR，不适合直接承载编辑历史；
4. 分两段后，审核可以在 YAML 层完成。

⸻

7. 08/09 应该如何改写以支持这个流程？

建议把 08 和 09 里的角色再明确一点。

08 增加一节：Registry Source Pipeline

写明：

Registry MD 文档是人类可读的注册表规则、规划表和审核入口。
Registry YAML 是机器可读的事实源。
axtp.protocol.yaml 是由 Registry YAML 聚合生成的协议 IR。
generated/protocol.md 是由 axtp.protocol.yaml 生成的发布文档。

09 增加一节：Method YAML 生成规则

写明：

AI 或工具从 MethodId 规划表中提取候选 method 时，必须：
1. 保持 methodId 与规划表一致；
2. 保持 domain 与 ID 范围一致；
3. 将 draft/mvp/stable 状态写入 YAML；
4. 为 params/result 引用已注册 type；
5. 为 errors 引用 ErrorCode Registry；
6. 为 events 引用 Event Registry；
7. 为 legacy 填写来源映射；
8. 不得新增未在规划表或审核记录中说明的 methodId。

⸻

8. 推荐新增一个文件：Registry Change Request

为了让 AI 新增业务更有依据，可以新增：

registry-change-requests/

每次新增业务先写一个 CR：

id: RCR-2026-0001
title: Add display input source control
source:
  request: user
  reference:
    - 09-AXTP-MethodId注册表-v2.md#display
businessIntent: Switch and query display input source.
domain: display
candidateMethods:
  - display.setInputSource
  - display.getInputSource
schemas:
  - DisplaySetInputSourceParams
  - DisplayGetInputSourceResult
events:
  - display.inputSourceChanged
decision: accepted

然后 AI 根据 CR 修改 YAML。

这样流程更工程化：

业务需求
  ↓
Registry Change Request
  ↓
registry YAML
  ↓
axtp.protocol.yaml
  ↓
protocol.md

⸻

9. 最终建议的完整关系

01-07
  冻结核心协议机制
08 Registry 总则
  定义 Registry 治理规则、文件组织、通用字段、ID 稳定性、review 规则、generator 校验规则
09/10/11/12/13 Registry MD
  定义各注册表的字段规则、编号范围、规划表、MVP 范围、legacy 映射、人工审核依据
registry-change-requests/
  记录每次业务新增/变更的原因、来源、决策
registry/*.yaml
  机器可读事实源，只保存已采纳条目
axtpc
  校验 registry yaml，聚合生成 protocol IR
protocol/axtp.protocol.yaml
  自动生成的完整协议 IR，不手写
generated/protocol.md
  自动生成的最终协议文档

⸻

10. 给 Codex 的一句核心指令

可以这样告诉 Codex：

不要直接手写 axtp.protocol.yaml。请将 axtp.protocol.yaml 视为生成产物。
新增或修改业务协议时，先读取 08 Registry 总则和对应的 09/10/11/12/13 注册表 MD 母文件，按其中的 domain、ID 分段、命名、字段、schema、error、event、legacy mapping 规则进行分析。
如果规划表中已有对应业务项，则在 registry/*.yaml 中激活或补全该条目；如果规划表中没有，则先生成 Registry Change Request，说明新增理由、domain 归属、ID 分配依据、schema/error/event 影响，再写入 registry yaml。
最后由 axtpc 从 registry yaml 聚合生成 axtp.protocol.yaml，再生成 protocol.md、schema、SDK、bitmap 和测试产物。

⸻

最终结论

你的理解是对的，而且建议正式定成：

Registry MD 是人类可读的规则和规划母表；Registry YAML 是机器可读的事实源；AI 必须参照 registry-spec 和 registry-md 进行业务分析后，才能修改 YAML；axtp.protocol.yaml 只由 YAML 聚合生成，不直接手写。

这样整个体系就完整了：

registry-spec 管规则
registry-md 管规划和审核依据
registry-yaml 管机器事实
axtp.protocol.yaml 管聚合 IR
protocol.md 管最终发布
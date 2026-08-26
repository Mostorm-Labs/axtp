# AXTP Protocol Proposal Workspace

> `workspace/protocol/**` is maintainer-only proposal and review material. It is **never** a runtime, SDK, firmware or mock implementation contract, regardless of proposal lifecycle.

`workspace/protocol/` 用于保存业务协议提案、评审依据、legacy 证据映射、开放问题和已采纳决策的可读 rationale。它回答“为什么提出/采纳这项协议设计”，不回答“当前实现合同到底是什么”。

正式实现事实只能从 canonical / derived / verification authority 读取：

```text
workspace/protocol/**
  = evidence + proposal + rationale
  != implementation authority

contract/registry/**
  = canonical machine-readable protocol facts

contract/protocol/axtp.protocol.yaml
contract/generated/**
contract/mcp/**
  = derived implementation-facing authority

conformance/**
  = executable acceptance authority

spec/vMAJOR.MINOR.PATCH or exact commit/release artifact
  = reproducible release identity
```

即使一份 proposal 已经被采纳并映射到 generated protocol，它本身仍然只是 proposal。runtime 不得因为某篇 workspace 文档“已采纳”而直接从其 prose、示例或历史字段推导实现行为。

## 1. Proposal Authority Metadata v2

维护中的 `workspace/protocol/<domain>/<domain.feature>.md` 使用以下语义模型：

```yaml
---
authorityClass: proposal
lifecycle: captured | reviewing | accepted | superseded | archived
protocolStability: draft | experimental | stable | deprecated | reserved
domain: <domain>
feature: <domain.feature>
adoptedBy: <canonical registry/source path when accepted>
lastReviewed: YYYY-MM-DD
---
```

规则：

1. `authorityClass` 在本目录始终为 `proposal`。
2. `lifecycle` 描述这份 proposal 自身走到了哪里。
3. `protocolStability` 描述 proposal 所讨论的协议事实成熟度；它不提升 proposal 的 authority class。
4. `lifecycle: accepted` 必须通过 `adoptedBy` 指向 canonical adoption target。
5. 旧的 `status` / `contract` / `generated` / `registry` frontmatter 不再用于已采纳 proposal；其中 `contract` boolean 尤其不得被用来声明 workspace implementation authority。
6. `lastReviewed` 只表示最近一次人工确认 proposal 状态，不代表 release 时间。

### Lifecycle 与 protocol stability 是两个正交维度

例如：

```yaml
lifecycle: accepted
protocolStability: draft
```

表示“这份设计已经进入 canonical registry，但当前协议事实仍处于 draft stability”。

```yaml
lifecycle: accepted
protocolStability: stable
```

表示“proposal 已被采纳，且对应 canonical protocol fact 已稳定”；它仍不意味着 workspace 文档本身成为 contract。

## 2. Proposal 正文职责

单篇 proposal 应尽量只保留 feature-specific 内容：

- business / architecture rationale；
- capability boundary；
- proposed or adopted method/event/schema semantics 的可读说明；
- compatibility / migration reasoning；
- legacy evidence；
- review findings / amendments；
- unresolved feature-specific questions；
- canonical adoption links。

不要把 proposal 变成第二份 registry，也不要让 runtime 根据 proposal 示例反推正式 ID、字段或错误码。

已采纳 proposal 的推荐开头应明确：

```text
当前状态：accepted proposal；canonical facts 已在 adopted authority 中维护。
是否可直接实现：否；runtime/SDK/firmware 必须读取 canonical/generated authority。
```

## 3. Canonical adoption path

```text
business intent / customer need / legacy evidence
        ↓
workspace/business/<topic>.md
        ↓
workspace/flows/<scenario>.md
        ↓
workspace/protocol/<domain>/<domain.feature>.md
        ↓ review
canonical registry/spec source
        ↓
contract/registry/**
        ↓ generator
contract/protocol/axtp.protocol.yaml
        ↓
contract/generated/** + contract/mcp/** + contract/test-vectors/**
        ↓
conformance/**
        ↓
spec release / exact commit
        ↓
runtime / SDK / firmware spec lock
```

Proposal 采纳发生在“proposal -> canonical source”这条边上。进入 canonical source 后，proposal 不继续承担 runtime truth 的职责。

## 4. Lifecycle workflow

| Stage | 输入 | 主要输出 | Authority class |
|---|---|---|---|
| 00 business intake | 产品想法、客户诉求、legacy 线索 | `workspace/business/**` | evidence / intent |
| 10 flow planning | 端到端场景、UI story | `workspace/flows/**` | evidence / interaction proposal |
| 20 protocol proposal | 已识别 protocol gap | `workspace/protocol/**` | proposal |
| 30 adoption | review-confirmed proposal | specs + `contract/registry/**` | canonical authority |
| 40 amendment | 已采纳事实需修订 | proposal amendment + canonical source update | proposal + canonical authority |
| 50 generation | canonical source 已更新 | Protocol IR / generated artifacts | derived authority |
| 60 release | validation / conformance 已闭合 | immutable spec identity/artifact | release authority |

对应 agent workflow 仍可参考 `tooling/skills/`，但 skill 本身是流程操作说明，不是 protocol knowledge authority。

## 5. Adoption rules

采纳 proposal 前至少确认：

- `domain.feature` 边界明确；
- method / event / schema / error / capability / profile 语义已完成 review；
- `[REVIEW-ASK]`、`[REVIEW-FIX]`、`[REVIEW-BLOCKER]` 不得被当作已确认事实写进 canonical source；
- ID、bitOffset、fieldId 与现有 registry 无冲突；
- compatibility impact 已分类；
- 需要的 conformance 结论已明确；
- canonical source 更新后 generated artifacts 可由 generator 重现。

采纳完成后 proposal 应使用：

```yaml
authorityClass: proposal
lifecycle: accepted
protocolStability: <canonical fact stability>
adoptedBy: contract/registry/...
```

而不是把 proposal 本身标成 runtime contract。

## 6. Amendment rules

已采纳协议发生语义修订时：

1. 在 proposal/amendment context 中记录为什么要改；
2. 判断 compatibility / release impact；
3. 修改 canonical specs / registry source；
4. 重新生成 derived authority；
5. 更新或新增 conformance evidence；
6. 按 release policy 发布新的 spec identity。

不得直接手改 `contract/protocol/**`、`contract/generated/**`、`contract/mcp/**` 或生成型 test vectors 来制造新事实。

## 7. Review markers

维护者仍可在 proposal 中使用：

- `[REVIEW-DRAFT]`：feature-specific 事实仍在整理；
- `[REVIEW-OK]`：该项 proposal 判断已通过 review；
- `[REVIEW-FIX]`：进入 canonical source 前必须修正；
- `[REVIEW-ASK]`：需要产品、设备、legacy 或实现证据确认；
- `[REVIEW-BLOCKER]`：当前表达会导致错误采纳，必须先关闭。

这些 marker 只描述 proposal review 状态，不是 protocol stability，也不是 runtime support declaration。

## 8. Temporary IDs

Proposal / mock / local demo 为了讨论可以临时使用 `0xF000-0xFEFF` 范围的候选 methodId、eventId 或 errorCode，但：

- 不得写入正式 `contract/registry/**`；
- 不得出现在 released generated business facts 中；
- 采纳时必须按照 canonical Domain Registry 和 ID policy 正式分配。

## 9. Retrieval boundary

实现型 agent 默认不得把以下路径作为 protocol implementation authority：

```text
workspace/business/**
workspace/flows/**
workspace/protocol/**
workspace/legacy-*/**
workspace/registry-planning/**
workspace/runtime/**
docs/superpowers/**
tooling/skills/**
```

这些材料只在需求追踪、设计评审、迁移、历史调查或 protocol-authoring 任务中按需读取。

产品 / 架构负责人查看当前 domain 覆盖与采纳排期时使用 [Product Domain Status](../../docs/product/domain-status.md)；runtime 实现从 `docs/guides/runtime.md` 进入。

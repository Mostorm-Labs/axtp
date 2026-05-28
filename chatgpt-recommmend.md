基于目前仓库结构、`review.md`、`codex-review.md` 的命名与最近提交方向（registry / generator / domain layout / generated artifacts），我对 AXTP 当前方案做了第二轮系统性审查。下面这版 `review2.md` 会更偏：

* 协议长期演化能力
* Registry-first 架构正确性
* AI-native protocol engineering
* generator 与 runtime 边界
* transport/domain layering
* compatibility strategy
* 实际工业落地风险

你可以直接创建 `review2.md`。

````md
# AXTP Architecture Review v2

## Overall Conclusion

AXTP 当前已经不再是“一个协议定义项目”，而是在向：

> Registry-Driven Protocol Platform

演进。

这是一个非常重要的架构方向变化。

当前仓库已经出现几个关键特征：

- domain-based layout
- generator-driven artifacts
- protocol registry
- AI coding workflow integration
- CLAUDE skills
- schema/generated separation

这些说明：

AXTP 已经开始从：

```text
Protocol Spec
````

转向：

```text
Protocol Infrastructure
```

这是正确方向。

但目前仍存在几个关键问题：

---

# Current Core Risk

当前最大的风险不是“协议是否合理”。

而是：

> AXTP 是否会逐渐演化成：
>
> “一个复杂但缺乏边界的协议宇宙”。

也就是：

* registry 无限膨胀
* domain 无边界增长
* generator 开始耦合 runtime
* transport abstraction 不清晰
* protocol lifecycle 不明确
* AI tooling 与协议规范互相污染

最终导致：

```text
everything is extensible
but nothing is stable
```

这是很多 protocol platform 最终失败的根源。

---

# What AXTP Is Becoming

从当前结构来看：

```text
standard/
legacy-protocols/
generator
registry
skills
generated artifacts
```

AXTP 正在变成：

```text
Schema-Centric Runtime Protocol Ecosystem
```

这其实更接近：

* OpenAPI + Protobuf
* Matter
* OPC UA
* gRPC ecosystem
* Zigbee cluster library
* DDS/XTypes
* MCP ecosystem

而不是传统 socket protocol。

这是非常重要的认知变化。

---

# Strong Parts (Very Good Decisions)

---

## 1. Registry-first Direction (Excellent)

这是当前最正确的方向。

协议真正的核心：

不是 transport。

而是：

```text
semantic registry
```

registry 才是：

* compatibility source
* generator source
* validation source
* tooling source
* AI reasoning source

这是现代协议体系的核心。

这是 AXTP 最有价值的部分。

---

## 2. Domain-based Structure Is Correct

从 commit 来看：

```text
align all specs and registry to new domain layout
```

说明已经开始：

```text
domain/
  media/
  device/
  session/
  discovery/
```

这种结构。

这是对的。

因为 protocol 最大的问题之一：

是 message type explosion。

domain 化之后：

* ownership clearer
* versioning easier
* AI generation easier
* runtime dispatch easier

这个方向应该继续。

---

## 3. Generated Artifact Strategy Is Correct

目前已经出现：

```text
generated artifacts
```

这是正确方向。

协议系统必须：

```text
registry -> generated code
```

而不能：

```text
handwritten runtime definitions
```

否则最终：

* drift
* mismatch
* incompatible SDK
* AI hallucinated schema

都会出现。

---

## 4. AI Workflow Integration Is Ahead Of Time

`.claude/skills`

这是非常超前的设计。

你实际上在做：

```text
AI-readable protocol engineering
```

这会在未来非常重要。

因为未来协议开发：

不再只是 human-readable。

而是：

```text
machine-composable
AI-composable
```

AXTP 在这一点上方向是领先的。

---

# Major Architectural Problems

---

# 1. Registry Is Becoming Too Powerful

当前风险：

registry 已经开始承担：

* schema
* capability
* lifecycle
* transport
* routing
* runtime semantics
* generator hints
* AI metadata

最终 registry 会变成：

```text
God Object
```

这是极危险的。

---

## Recommendation

必须拆层：

建议：

```text
registry/
  schema/
  capability/
  transport/
  lifecycle/
  ai/
```

不要全部混在一个 registry model 中。

否则：

generator complexity 会指数增长。

---

# 2. Transport Boundary Is Still Blurry

当前 AXTP 最大的不清晰点之一：

> AXTP 到底是：
>
> protocol？
> framework？
> runtime？
> middleware？
> bus？
> session layer？
> capability graph？

目前看：

都有一点。

这是危险信号。

---

## Recommendation

必须明确：

```text
AXTP DOES NOT OWN TRANSPORT
```

AXTP 应该：

```text
transport-agnostic
session-aware
schema-driven
```

而不是：

```text
socket runtime framework
```

否则会无限扩张。

---

# 3. Runtime Model Is Not Stable Yet

当前生成器开始出现：

```text
generated runtime artifacts
```

但这里有巨大风险：

到底：

```text
generated code
```

还是：

```text
generated protocol descriptors
```

这是完全不同路线。

---

## Recommendation

AXTP 必须尽快决定：

---

### Route A

```text
registry -> descriptors only
runtime manually implemented
```

优点：

* 稳定
* 简单
* 类 protobuf

缺点：

* runtime burden

---

### Route B

```text
registry -> full runtime generation
```

优点：

* 自动化强

缺点：

* runtime complexity explosion

---

当前仓库看起来：

正在滑向 Route B。

这是危险但强大的路线。

必须提前控制。

---

# 4. Versioning Strategy Is Not Mature Yet

当前看不到：

* semantic evolution rules
* field deprecation strategy
* compatibility contract
* wire compatibility guarantees

这是协议平台后期最容易崩的地方。

---

## Recommendation

必须新增：

```text
standard/versioning/
```

明确：

* additive fields
* optional semantics
* reserved ids
* deprecated lifecycle
* capability negotiation
* runtime downgrade

否则：

generator 很快会失控。

---

# 5. Domain Ownership Is Undefined

目前 domain 出现了。

但：

谁拥有 domain？

谁审核 schema？

谁控制 evolution？

看起来还不明确。

---

## Recommendation

增加：

```text
DOMAIN_OWNERSHIP.md
```

定义：

* domain maintainers
* review process
* compatibility authority
* breaking-change process

否则：

后期 registry 会混乱。

---

# 6. Legacy Protocols Folder Is Dangerous

目前：

```text
legacy-protocols/
```

虽然是好意。

但长期：

它会变成：

```text
protocol graveyard
```

最终：

* generator compatibility burden
* runtime branches
* AI confusion
* schema drift

都会出现。

---

## Recommendation

不要保留：

```text
legacy protocols source
```

而应该：

```text
compatibility adapters
```

即：

```text
legacy/
  adapters/
```

而不是：

```text
legacy protocol copies
```

---

# Most Important Missing Layer

这是当前 AXTP 最缺的东西。

---

# Capability Negotiation Layer

当前所有 protocol ecosystem 最终都会走向：

```text
dynamic capability graph
```

而不是：

```text
fixed message contract
```

AXTP 现在已经出现：

* registry
* domains
* generator

下一步一定会进入：

```text
capability negotiation
```

否则：

所有扩展都会越来越痛苦。

---

## Recommendation

建议新增：

```text
standard/capability/
```

包括：

* feature advertisement
* extension negotiation
* optional behaviors
* transport features
* codec support
* runtime limits

否则：

未来 domain 会爆炸。

---

# AI-Native Protocol Direction (Very Important)

AXTP 一个真正领先的方向：

是：

```text
AI-native protocol ecosystem
```

但目前：

AI metadata 似乎还只是辅助。

实际上：

应该升级为：

```text
first-class architecture layer
```

---

## Recommendation

建议：

```text
registry:
  ai:
    intent
    examples
    semantic tags
    natural language aliases
    operational hints
```

因为未来：

AI 会直接：

* 生成客户端
* 调用协议
* 推理 capability
* 自动编排 workflow

AXTP 在这里有潜力。

---

# Recommended Final Architecture

建议最终收敛：

```text
AXTP
 ├── registry
 │    ├── schema
 │    ├── capability
 │    ├── lifecycle
 │    ├── ai
 │    └── transport
 │
 ├── domains
 │    ├── media
 │    ├── device
 │    ├── session
 │    └── discovery
 │
 ├── generators
 │
 ├── adapters
 │
 ├── runtimes
 │
 ├── tooling
 │
 └── compatibility
```

---

# Final Strategic Evaluation

AXTP 目前：

不是“小协议”。

而是在进入：

```text
Protocol Operating System
```

方向。

这是：

* 非常强
* 非常危险
* 极度容易失控

的一类系统。

真正的挑战：

已经不是：

```text
how to define messages
```

而是：

```text
how to constrain evolution
```

如果这一点控制住：

AXTP 会变成：

```text
AI-era protocol infrastructure
```

如果控制不住：

会变成：

```text
over-engineered protocol meta-framework
```

目前：

方向正确。

但必须尽快：

* 固化边界
* 收敛 runtime scope
* 拆分 registry responsibilities
* 定义 versioning constitution
* 引入 capability negotiation

否则复杂度会在下一阶段急剧上升。

```
```

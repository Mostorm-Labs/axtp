# 测试 / Conformance 负责人入口

Conformance 是 runtime、SDK、mock server 和工具仓库的行为验收入口。

测试的目标不是从草案猜行为，而是按 runtime 声明的支持等级，加载当前 spec 的 generated、Protocol IR、specs 和 conformance cases。

## 先理解什么

| 概念 | 含义 |
|---|---|
| Conformance level | runtime 声明自己支持哪些协议能力等级。 |
| Profile | WebSocket JSON、Standard Framed、STREAM、低带宽等承载/能力组合。 |
| Case | YAML 格式的具体行为验收输入。 |
| Fixture | 设备画像或测试上下文。 |
| Result schema | 测试结果输出结构。 |

测试结论应该绑定 spec tag 或 commit，不能写成“AXTP 通过/不通过”这种无法复现的描述。

## 推荐阅读顺序

| 顺序 | 文档 | 读它的目的 |
|---:|---|---|
| 1 | [../conformance/README.md](../conformance/README.md) | conformance 主文档、Phase 1 范围、运行命令和失败分类。 |
| 2 | [../conformance/CONFORMANCE_LEVELS.md](../conformance/CONFORMANCE_LEVELS.md) | L0-L4 支持等级和 runtime 声明方式。 |
| 3 | [../guides/testing-conformance-quickstart.md](../guides/testing-conformance-quickstart.md) | 测试团队如何拿 spec、选 case、分类失败。 |
| 4 | [../conformance/manifest.yaml](../conformance/manifest.yaml) | 当前 case manifest。 |
| 5 | [../conformance/profiles/core.yaml](../conformance/profiles/core.yaml) | profile 级验收期望入口。 |
| 6 | [../conformance/cases/session/hello_identify_identified.yaml](../conformance/cases/session/hello_identify_identified.yaml) | 从最小 session case 看用例结构。 |
| 7 | [../../tooling/test-vectors/manifest.json](../../tooling/test-vectors/manifest.json) | 测试向量入口。 |

## 不要从哪里开始

| 不建议入口 | 原因 |
|---|---|
| `docs/protocol/**` | 草案不能直接变成测试断言。 |
| `ROADMAP.md` | roadmap 是计划，不是当前验收合同。 |
| runtime README 的口头说明 | runtime 需要用 spec lock 和 conformance declaration 固定支持范围。 |
| 旧协议证据 | legacy evidence 只能辅助迁移，不能定义新 runtime 行为。 |

## 最小测试路径

1. 确认 runtime 的 `AXTP_SPEC.lock.yaml` 或等价声明。
2. 确认 runtime 支持的 profiles 和 conformance levels。
3. 指定 `AXTP_SPEC_PATH` 到主库 checkout 或 release artifact。
4. 读取 `docs/conformance/manifest.yaml`。
5. 运行对应 level 的 required cases。
6. 失败时先分类：runtime bug、spec-case mismatch、generated mismatch、profile declaration error、test environment。
7. 记录 spec tag / commit、runtime commit、declared levels、failed cases 和关键报文。

## 常见误区

| 误区 | 正确认知 |
|---|---|
| runtime 没声明 STREAM，也要测 STREAM。 | 未声明能力不能直接判 runtime 失败；先要求补声明或实现。 |
| conformance 文档要重复 Hello 字段规则。 | Hello / Identify / Identified 字段权威在 [RPC Session Spec](../specs/1-core/06-RPC-Session.md)。 |
| case 失败一定是 runtime bug。 | 可能是 case 与 spec/generated 冲突，也可能是测试环境或声明错误。 |
| WebSocket JSON 失败要查 Frame CRC。 | WebSocket JSON 没有 Frame Header 和 CRC16。 |

## 下一步动作

先用 [Conformance Levels](../conformance/CONFORMANCE_LEVELS.md) 要求 runtime 提交支持等级声明。

再按 [testing-conformance-quickstart](../guides/testing-conformance-quickstart.md) 配置 `AXTP_SPEC_PATH` 并运行 case。

如果发现 conformance case 与 spec 冲突，回主库修 `docs/conformance/**` 或 specs，不要在 runtime 仓库绕过。

## 报告模板

建议测试报告至少包含：

```text
runtime: <repo>@<commit>
spec: <spec tag or commit>
profiles: <declared profiles>
levels: <declared levels>
result: pass | fail
failed cases: <case ids>
unsupported: <declared unsupported>
blocking release: yes | no
```

## Release gate 检查

| 阶段 | 最小要求 |
|---|---|
| smoke | 能连接、建 session、调用一个 generated method。 |
| runtime MVP | 通过声明的 core + transport profile cases。 |
| Standard Framed | 通过 CONTROL、RPC、Frame、CRC16 相关 cases。 |
| STREAM | 只有声明 L2 时要求通过 stream P0 cases。 |
| 客户 release | 绑定 spec tag 或 release artifact，不依赖浮动 main。 |

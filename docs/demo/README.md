# AXTP Demo Docs

`docs/demo/` 只保留当前仍可作为 active 示例执行的 demo。Demo 文档用于解释端到端场景和验收思路，不是协议事实源；当前实现合同以 `docs/generated/protocol.md` 和 `docs/generated/protocol.json` 为准。

| 文档 | 说明 |
|---|---|
| [hid-json-audio-demo.md](hid-json-audio-demo.md) | C++ HID 形态本机双端 demo：设备端 audio server + 上位机 `axtpctl` JSON client。 |

新增 demo 必须满足以下条件：

- 使用已通过草案并落入 registry/domain YAML 的协议方法和事件。
- 或者明确标注为流程方案文档，并把缺口转入 `docs/protocol/**` 草案，不声明为当前可生成协议。
- 不从 archive demo、旧 MVP 或迁移 intake 推导当前协议事实。

历史或已被替代的 demo 文档放在 [`docs/archive/demo/`](../archive/demo/)；不要从 archive demo 推导当前协议事实。

# 18《AXTP BLE Compact Demo》

版本：v1.3  
状态：Superseded / Non-normative

本文档已被 22《AXTP MVP Normative Demo》取代。正式 BLE 实现以下列文档为准：

| 目标 | 使用文档 |
| --- | --- |
| BLE Compact MVP 完整流程 | `22-AXTP-MVP-Normative-Demo.md` |
| Compact Frame Header | `01-AXTP-整体协议规范-v2.md` |
| Control Payload（统一 5B 头） | `02-AXTP-Control信令协议规范-v2.md` |
| STREAM | `04-AXTP-Stream流式传输协议规范-v2.md` |
| Legacy 迁移 | `14-AXTP-老协议适配与迁移规范.md` |

BLE GATT 使用 Compact Frame Profile（4B Header + CRC8）。断线重连通过 CONTROL RESUME 恢复 Session。详见 05《连接场景与调用流程规范》§7。

# AXTP Conformance

AXTP conformance 用例维护在 `docs/conformance/` 下，是协议事实源的一部分。runtime 和工具仓库不应重新定义这些用例，而应加载本目录，并根据自己声明的 runtime profile 执行匹配用例。

> 如果你是 runtime 实现者，在运行 conformance 之前应先完成 [Runtime MVP Checklist](../guides/runtime-mvp-conformance.md)。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `manifest.yaml` | 声明 conformance levels 以及每个 level 的 required cases。 |
| `schemas/` | case 和 result 的 JSON Schema。 |
| `profiles/` | profile 级验收期望。 |
| `fixtures/` | 协议行为用例使用的设备画像。 |
| `cases/` | YAML 格式的用例描述。 |

## Phase 1 MVP 范围

| 能力 | WebSocket JSON runtime | Standard Framed runtime |
| --- | ---: | ---: |
| RPC Hello / Identify / Identified | 是 | 是 |
| RPC Request / RequestResponse / Event | 是 | 是 |
| `sid` 固定 8 位 hex string / binary `uint32` | 是 | 是 |
| `requestId` 匹配未完成请求 | 是 | 是 |
| 标准错误响应形状 | 是 | 是 |
| Standard Frame Header / CRC16 | 否 | 是 |
| CONTROL OPEN / ACCEPT | 否 | 是 |
| CONTROL HEARTBEAT / HEARTBEAT_ACK | 否 | 是 |
| CONTROL CLOSE / CLOSE_ACK | 否 | 是 |
| STREAM open / data / close | 否 | 是，P0 用于 audio/video 媒体流 |

Phase 1 暂不验收（等后续 profile 完成）：

- ACK/NACK 严格重传
- RESUME / SESSION_RESET
- STREAM 固件 / 文件 / 日志 profile
- 链路加密

## Conformance Level 选择

| runtime 类型 | 最小 level | 之后可加 |
| --- | --- | --- |
| WebSocket JSON | `core`、`websocket-jsonrpc` | `capability`、`event` |
| Standard Framed | `core`、`framed-binary` | `capability`、`event` |
| mock server | `core`、`websocket-jsonrpc` | `capability`、`event` |
| 固件 / MCU | `core`、`framed-binary` | `stream` 或低带宽 profile |

## 运行 Conformance

### 第一步：主库验证 conformance 源文件

```bash
pnpm --dir generators install --frozen-lockfile
pnpm --dir generators build
scripts/validate-conformance.sh
```

### 第二步：runtime 仓库接入

```bash
export AXTP_SPEC_PATH=/path/to/axtp-spec-or-release-artifact
```

runtime 脚本应兼容两个路径：

```text
$AXTP_SPEC_PATH/docs/conformance   ← spec 源码 checkout
$AXTP_SPEC_PATH/conformance        ← release artifact 根目录（兼容下游）
```

### 第三步：声明 level，运行对应 case

`framed-binary` 最小握手 case 应覆盖：

```text
handshake.open_accept
handshake.heartbeat
handshake.close
rpc.request_id_match
stream.stream_open
stream.stream_data
stream.stream_close
```

其中 `stream.stream_open` / `stream.stream_close` 验收的是 P0 媒体流业务域建流，不是常规 `stream.open` / `stream.close`。

如果某 case 属于 runtime 尚未声明的 profile，不要在实现里偷偷跳过，应调整 runtime 声明的 level；若 case 与 Phase 1 裁决冲突，应先修正主库 conformance case 和 manifest，再要求 runtime 通过。

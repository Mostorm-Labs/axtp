# AXTP

AXTP（Auditoryworks Transport Protocol）是一套传输无关的设备通信协议，用一份统一的协议事实源描述 CONTROL、RPC、STREAM 三类通信语义，并通过生成器输出协议文档、工具 JSON、C++ 头文件和测试向量。

本仓库的核心思想是：协议事实只维护一份，人工编辑 `registry/` 与 `registry/domains/` 下的 YAML；`protocol/axtp.protocol.yaml`、`docs/generated/`、`runtimes/*/generated/` 和 `tooling/*` 下的生成文件由 Generator 统一产出，不手写修改。

## 设计思想

AXTP 按五层组织协议职责：

| 层级 | 职责 |
|---|---|
| Transport | 提供 USB HID、TCP、WebSocket 等字节传输能力，不理解业务方法 |
| Frame | 负责边界、长度、分片、校验和 message id，不承载业务类型 |
| Payload | 在 CONTROL、RPC、STREAM 三类 payload parser 之间分流 |
| Registry | 定义 method、event、error、capability、schema、profile 等业务事实 |
| Business | 实现设备业务逻辑，不直接污染 Frame Header |

这套分层解决三个问题：

1. 同一业务命令在不同传输上复用同一套语义。
2. VIDEO、OTA、FILE 等业务含义下沉到 Registry，避免 Frame Header 随业务膨胀。
3. 文本 JSON RPC 与二进制 RPC 共享 method/event/error/type 注册表。

协议生成采用三段式编译：

```text
registry/**/*.yaml + registry/domains/**/*.yaml
        ↓ validate-sources
Source Model
        ↓ build-protocol
protocol/axtp.protocol.yaml
        ↓ emit/generate
docs/generated/ + tooling/ + runtimes/*/generated/
```

## 仓库结构与文档路径

| 路径 | 功能含义 | 是否手写 |
|---|---|---|
| `docs/specs/` | 规范文档，描述协议框架、传输、Frame/Payload、RPC、STREAM、Registry 元模型、生成器规则等 | 是 |
| `docs/source/` | 历史资料、兼容性参考、旧注册表迁移材料、能力模型等源材料 | 是 |
| `docs/demo/` | 典型场景和 demo 级实现说明，例如 WebSocket、HID、BLE、OTA、MVP 流程 | 是 |
| `registry/core/` | 协议元信息、payload type、control opcode、RPC 编码、stream profile 等核心事实源 | 是 |
| `registry/method/` | 已采纳 method 注册表 | 是 |
| `registry/event/` | 已采纳 event 注册表 | 是 |
| `registry/error/` | 已采纳 error code 注册表 | 是 |
| `registry/capability/` | capability 注册表和 MVP profile | 是 |
| `registry/schema/` | 公共 schema、控制面 schema、设备/显示/固件/流等类型定义 | 是 |
| `registry/legacy/` | legacy protocol 到 AXTP method 的迁移映射 | 是 |
| `registry/domains/<domain>/` | 新增业务域的默认入口，可定义 method、event、error、capability、schema、profile | 是 |
| `protocol/axtp.protocol.yaml` | 由 Source YAML 聚合生成的 Protocol IR | 否 |
| `docs/generated/` | 生成的 Markdown/JSON 协议文档和注册表文档 | 否 |
| `tooling/mcp/` | 生成的机器可读 JSON，用于 MCP、工具链或外部消费 | 否 |
| `tooling/test-vectors/` | 生成的协议一致性测试向量 | 否 |
| `runtimes/cpp-core/include/axtp/generated/` | 生成的 C++ ID、注册表、schema 和 TLV codec 头文件 | 否 |
| `generators/` | TypeScript 实现的 AXTP Generator | 是 |

## 文档功能说明

主要入口文档：

| 文档 | 功能 |
|---|---|
| `docs/specs/00-AXTP-Overview.md` | 协议总览，说明 AXTP 是什么、解决什么问题、支持哪些传输和最小启动流程 |
| `docs/specs/01-AXTP-Protocol-Framework.md` | 协议框架和整体分层 |
| `docs/specs/02-AXTP-Frame-and-Payload-Spec.md` | Frame 与 Payload 的线格式规则 |
| `docs/specs/03-AXTP-Transport-Profiles.md` | USB HID、TCP、WebSocket 等传输 profile |
| `docs/specs/04-AXTP-Control-Session-Spec.md` | CONTROL OPEN/ACCEPT/READY 等会话控制规则 |
| `docs/specs/05-AXTP-RPC-Session-Spec.md` | RPC 会话、Hello、Identify、request/response/event 规则 |
| `docs/specs/06-AXTP-Stream-Spec.md` | STREAM 数据面和 16B stream header 规则 |
| `docs/specs/07-AXTP-Compatibility-and-Versioning.md` | 兼容性和版本治理规则 |
| `docs/specs/08-AXTP-Protocol-Definition-Mapping-Spec.md` | Source YAML、Protocol IR、生成产物之间的映射规则 |
| `docs/specs/09-AXTP-Methods-Registry-Spec.md` | method 注册表元模型 |
| `docs/specs/10-AXTP-Events-Registry-Spec.md` | event 注册表元模型 |
| `docs/specs/11-AXTP-Errors-Registry-Spec.md` | error code 注册表元模型 |
| `docs/specs/12-AXTP-Types-and-Capability-Spec.md` | 类型系统和 capability 规则 |
| `docs/specs/13-AXTP-Profiles-Registry-Spec.md` | profile 注册表规则 |
| `docs/specs/14-AXTP-Type-System.md` | 类型系统细节 |
| `docs/specs/15-AXTP-TLV-Schema-Encoding.md` | TLV schema 编码规则 |
| `docs/specs/16-AXTP-Schema-Field-Numbering.md` | schema field id 编号规则 |
| `docs/specs/17-AXTP-Low-Bandwidth-Degradation.md` | HID-64、BLE、UART 等低带宽降级路径 |
| `docs/specs/20-AXTP-Generator-v1实现规范.md` | Generator v1 的实现规范、输入输出和治理原则 |

生成后的阅读入口：

| 生成文档 | 功能 |
|---|---|
| `docs/generated/protocol.md` | 面向用户阅读的完整协议参考，包含 overview、连接 profile、生命周期、method、event、type、error、profile |
| `docs/generated/protocol.json` | 面向工具消费的规范化协议模型 |
| `docs/generated/method_registry.generated.md` | methodId、method name、domain、request/response schema 等注册表 |
| `docs/generated/event_registry.generated.md` | eventId、event name、domain、event schema 等注册表 |
| `docs/generated/error_code.generated.md` | error code、名称、domain、错误语义等注册表 |
| `docs/generated/capability_registry.generated.md` | capability id、名称、类型和 schema |
| `docs/generated/legacy_mapping.generated.md` | 旧协议命令到 AXTP method 的迁移映射 |

## 生成产物位置与使用方法

### 1. 安装依赖并构建生成器

```bash
cd generators
pnpm install
pnpm build
```

仓库已提交 `generators/pnpm-lock.yaml`，建议使用 pnpm 保持依赖版本一致。

### 2. 校验事实源

```bash
cd generators
pnpm validate:sources
```

该命令会读取仓库根目录下的 `registry/`、`registry/domains/`、`protocol/axtp.protocol.yaml` 和相关规范文档，检查 ID 唯一性、schema 引用、Protocol IR 结构和关键 wire 事实一致性。

### 3. 生成全部仓库产物

```bash
cd generators
pnpm generate
```

默认会生成或更新：

```text
protocol/axtp.protocol.yaml
docs/generated/protocol.md
docs/generated/protocol.json
docs/generated/*_registry.generated.md
tooling/mcp/*.generated.json
runtimes/cpp-core/include/axtp/generated/*.h
tooling/test-vectors/*
```

### 4. 只生成 Protocol IR

```bash
cd generators
pnpm build:protocol
```

输出：

```text
protocol/axtp.protocol.yaml
```

适用于只想查看 Source YAML 聚合结果的场景。

### 5. 只生成协议阅读文档和 JSON

```bash
cd generators
pnpm emit:protocol
```

输出：

```text
docs/generated/protocol.md
docs/generated/protocol.json
```

适用于 Protocol IR 已存在，只想刷新最终协议参考文档的场景。

### 6. 只生成注册表、C++、工具 JSON 和测试向量

```bash
cd generators
pnpm generate:registry
```

输出：

```text
docs/generated/*_registry.generated.md
tooling/mcp/*.generated.json
runtimes/cpp-core/include/axtp/generated/*.h
tooling/test-vectors/*
```

### 7. 校验 Protocol IR 和生成文档一致性

```bash
cd generators
pnpm validate:protocol
```

适用于提交前确认 `protocol/axtp.protocol.yaml` 与规范文档、生成文档之间没有明显漂移。

## 文档生成逻辑方案原理

Generator 的核心逻辑在 `generators/src/`：

| 文件 | 作用 |
|---|---|
| `cli.ts` | 命令行入口，定义 validate、generate、build-protocol、emit-protocol 等命令 |
| `loader.ts` | 加载核心 registry、schema、legacy、MVP profile 等基础事实源 |
| `sourceLoader.ts` | 在基础事实源上合并 `registry/domains/**/*.yaml`，形成 Source Model |
| `validator.ts` | 校验 Source Model 中的 ID、引用、schema、MVP 条目等 |
| `protocolBuilder.ts` | 将 Source Model 聚合成 `protocol/axtp.protocol.yaml` 的 Protocol IR |
| `protocolValidator.ts` | 校验 Protocol IR 的结构和关键协议事实 |
| `protocolDocsValidator.ts` | 校验 Protocol IR 与规范文档中的关键说明是否一致 |
| `emitters/protocolMarkdown.ts` | 生成 `docs/generated/protocol.md` |
| `emitters/protocolJson.ts` | 生成 `docs/generated/protocol.json` |
| `emitters/markdown.ts` | 生成 registry Markdown 文档 |
| `emitters/json.ts` | 生成工具链 JSON |
| `emitters/cpp.ts` | 生成 C++ 头文件 |
| `emitters/testVectors.ts` | 生成测试向量 |

生成过程遵循单向数据流：

1. `loadProtocolSources()` 读取 `registry/` 与 `registry/domains/`。
2. `validateSpec()` 检查事实源是否合法。
3. `buildProtocolDefinitionRaw()` 聚合原始 IR，写入 `protocol/axtp.protocol.yaml`。
4. `buildProtocolDefinition()` 形成规范化模型，供文档和 JSON emitter 使用。
5. `emitRepositoryArtifacts()` 将同一份模型输出到 `docs/generated/`、`tooling/`、`runtimes/`。

因此新增或修改协议内容时，推荐流程是：

```text
修改 registry/**/*.yaml 或 registry/domains/**/*.yaml
        ↓
pnpm --dir generators generate
        ↓
检查 protocol/axtp.protocol.yaml 与 docs/generated/
        ↓
pnpm --dir generators validate:sources
        ↓
提交源 YAML 与生成产物
```

## 新增业务域示例

新增业务默认写入 `registry/domains/<domain>/domain.yaml`，不要直接改生成产物。例如新增 `sensor` 域时：

```text
registry/domains/sensor/domain.yaml
```

文件中可以定义：

```yaml
domain: sensor

methods:
  - id: 0x1201
    bit_offset: 0
    name: sensor.getValue
    request_schema: SensorGetValueRequest
    response_schema: SensorGetValueResponse

events:
  - id: 0x1201
    bit_offset: 0
    name: sensor.valueChanged
    event_schema: SensorValueChangedEvent

types:
  SensorGetValueRequest:
    kind: object
    description: Request current sensor value.
    fields:
      - id: 0x01
        name: sensorId
        type: uint16
        required: true

  SensorGetValueResponse:
    kind: object
    description: Current sensor value.
    fields:
      - id: 0x01
        name: sensorId
        type: uint16
        required: true
      - id: 0x02
        name: valueX1000
        type: int32
        required: true

  SensorValueChangedEvent:
    kind: object
    description: Sensor value change notification.
    fields:
      - id: 0x01
        name: sensorId
        type: uint16
        required: true
      - id: 0x02
        name: valueX1000
        type: int32
        required: true
```

实际字段格式以 `registry/domains/network/domain.yaml`、`registry/domains/stream/domain.yaml` 和 `docs/specs/20-AXTP-Generator-v1实现规范.md` 为准。

## 提交前检查

建议提交前执行：

```bash
pnpm --dir generators build
pnpm --dir generators test
pnpm --dir generators generate
pnpm --dir generators validate:sources
```

如果生成产物有变化，应与对应的 `registry/` 或 `registry/domains/` 源 YAML 一起提交，保持“源事实”和“生成结果”一致。

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
| `docs/archive/` | 历史 source 草稿、旧 registry 迁移材料和未来草案；非 active 事实源 | 是 |
| `docs/kickoff/` | 项目 kickoff、研发说明和跨团队启动材料 | 是 |
| `docs/demo/` | 典型场景和 demo 级实现说明，例如 WebSocket、HID、BLE、OTA、MVP 流程 | 是 |
| `docs/legacy-protocols/` | AXDP、VM33、Rooms、NearHub 等 legacy 协议原始资料和扫描清单 | 是 |
| `docs/migration/generated/` | legacy 迁移规划、候选 patch、测试向量等生成型迁移资料 | 否 |
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
| `adapters/` | 预留给未来真实 legacy adapter/runtime adapter 代码；旧协议资料不放在这里 | 是 |
| `tooling/mcp/` | 生成的机器可读 JSON，用于 MCP、工具链或外部消费 | 否 |
| `tooling/migration/` | legacy 迁移资料生成脚本和迁移辅助工具 | 是 |
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
| `docs/specs/08-AXTP-Capability-Naming-and-Feature-Taxonomy.md` | `domain.feature`、method、event 命名与 feature taxonomy 治理 |
| `docs/specs/09-AXTP-Protocol-Definition-Mapping-Spec.md` | Source YAML、Protocol IR、生成产物之间的映射规则 |
| `docs/specs/10-AXTP-Methods-Registry-Spec.md` | method 注册表元模型与 MethodId 表 |
| `docs/specs/11-AXTP-Events-Registry-Spec.md` | event 注册表元模型与 EventId 表 |
| `docs/specs/12-AXTP-Errors-Registry-Spec.md` | error code 注册表元模型与 ErrorCode 表 |
| `docs/specs/13-AXTP-Types-and-Capability-Spec.md` | 类型系统、capability 规则与 CapabilityId 表 |
| `docs/specs/14-AXTP-Profiles-Registry-Spec.md` | profile 注册表规则与 MVP 最小实现表 |
| `docs/specs/15-AXTP-Type-System.md` | 类型系统细节 |
| `docs/specs/16-AXTP-TLV-Schema-Encoding.md` | TLV schema 编码规则 |
| `docs/specs/17-AXTP-Schema-Field-Numbering.md` | schema field id 编号规则 |
| `docs/specs/18-AXTP-Low-Bandwidth-Degradation.md` | HID-64、BLE、UART 等低带宽降级路径 |
| `docs/specs/19-AXTP-Generator-v1实现规范.md` | Generator v1 的实现规范、输入输出和治理原则 |

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

## C++ Runtime 开发文档

C++ runtime 代码已经按 `ITransport <-> AxtpEndpoint -> AxtpCore -> BasicBroker<>` 分层。阅读和修改 runtime、SDK、CLI 时建议从以下文档进入：

| 文档 | 说明 |
|---|---|
| `runtimes/cpp-core/ARCHITECTURE.md` | C++ runtime 代码架构、CMake target、wire path、transport 边界和测试地图 |
| `docs/dev/AXTP_CPP_RUNTIME_PATTERNS.md` | 设计模式、扩展方法、反模式，说明功能应该放在哪一层 |
| `docs/dev/AXTP_CPP_EXECUTION_FLOW.md` | FramedBinary、WebSocketJsonRpc、HID、SDK、CLI 和 direct core 的执行流程 |
| `docs/dev/AXTP_CPP_STYLE.md` | C++ 命名、文件名、include、成员变量、格式化和 ownership 规范 |
| `docs/dev/AXTP_CORE_API_DESIGN.md` | `AxtpCore`、`CoreEvent`、`BrokerResult`、processor 和 public header 设计 |
| `docs/dev/AXTP_SDK_API_DESIGN.md` | `AxtpClient`、`AxtpServer`、dynamic RPC、typed wrapper 和 connector 边界 |
| `docs/dev/AXTPCTL_COMMAND_DESIGN.md` | `axtpctl` 命令语法、命令分发、transport 策略和输出格式 |

核心约束：

- `AxtpCore` 不持有 transport 或 broker。
- `BasicBroker<>` 不回调 core。
- `AxtpEndpoint` 是唯一 glue layer。
- `runtimes/cpp-core/include/axtp` 不暴露 hidapi、Boost.Asio、Boost.Beast、socket/thread 或 concrete transport 头。
- 业务调用默认走 Raw / Dynamic JSON / Dynamic TLV；typed generated API 是可选增强。

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

## 从用户输入到最终产物的转化流程

AXTP 的输入可以来自协议设计者、业务开发者或兼容性迁移需求。无论入口是什么，最终都要先落到机器可读的 Source YAML，再由 Generator 生成稳定产物。

```text
用户输入
  ├─ 新业务需求
  │    例如新增 sensor.getValue、network.getApInfo、stream.open
  ├─ 协议治理需求
  │    例如新增 error code、capability、profile、公共 schema
  ├─ 兼容迁移需求
  │    例如旧协议 command 映射到 AXTP method
  └─ Core 规则调整
       例如 transport、payload type、control opcode、stream profile

        ↓ 人工整理为协议事实

Source YAML
  ├─ registry/domains/<domain>/domain.yaml
  │    新增业务域 method / event / type / error / capability / profile
  ├─ registry/method|event|error|capability|schema|legacy/
  │    已采纳核心条目、公共 schema、legacy 映射
  └─ registry/core/
       协议元信息、核心枚举、传输和 payload 事实

        ↓ loadProtocolSources + validateSpec

Source Model
  ├─ 合并 core registry 与 domain YAML
  ├─ 检查 ID、name、bit_offset 唯一性
  ├─ 检查 request_schema / response_schema / event_schema 引用
  └─ 检查 stable、deprecated、MVP 和兼容性约束

        ↓ buildProtocolDefinitionRaw / buildProtocolDefinition

Protocol IR
  └─ protocol/axtp.protocol.yaml
       聚合后的协议中间表示，不手写修改

        ↓ protocolValidator + protocolDocsValidator

一致性校验
  ├─ Protocol IR 结构合法
  ├─ STREAM header、CONTROL OPEN/ACCEPT/READY 等 wire 事实与规范一致
  └─ capability bitmap 等派生规则一致

        ↓ emitRepositoryArtifacts

最终产物
  ├─ docs/generated/protocol.md
  │    面向人阅读的完整协议参考
  ├─ docs/generated/protocol.json
  │    面向工具消费的规范化协议模型
  ├─ docs/generated/*_registry.generated.md
  │    method / event / error / capability / legacy 注册表文档
  ├─ tooling/mcp/*.generated.json
  │    面向 MCP 或外部工具链的 JSON
  ├─ runtimes/cpp-core/include/axtp/generated/*.h
  │    C++ runtime 使用的 ID、schema、注册表和 TLV codec 头文件
  └─ tooling/test-vectors/*
       协议一致性测试向量
```

这条链路的关键约束是单向生成：用户需求只允许进入 `registry/` 或 `registry/domains/` 事实源；`protocol/axtp.protocol.yaml` 与所有 generated 目录只是结果。若最终产物不符合预期，应回到 Source YAML 修改，再重新执行 `pnpm --dir generators generate`。

常见转化路径：

| 用户输入 | 应修改的位置 | 生成后的主要产物 |
|---|---|---|
| 新增业务 method/event/type | `registry/domains/<domain>/domain.yaml` | `protocol/axtp.protocol.yaml`、`docs/generated/protocol.md`、C++ generated headers、工具 JSON |
| 新增公共 schema | `registry/schema/*.yaml` | protocol type、registry 文档、C++ schema/TLV codec |
| 新增 error code | `registry/error/error_code.yaml` 或 domain YAML | error registry 文档、tooling JSON、C++ error enum |
| 新增 capability | `registry/capability/capability_registry.yaml` 或 domain YAML | capability registry、capability bitmap 相关产物 |
| 迁移旧协议命令 | `registry/legacy/legacy_mapping.yaml` | legacy mapping 文档和 JSON |
| 调整传输/profile/core 常量 | `registry/core/*.yaml` | Protocol IR、协议总文档、相关枚举/工具产物 |

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

实际字段格式以 `registry/domains/network/domain.yaml`、`registry/domains/stream/domain.yaml` 和 `docs/specs/19-AXTP-Generator-v1实现规范.md` 为准。

## 提交前检查

建议提交前执行：

```bash
pnpm --dir generators build
pnpm --dir generators test
pnpm --dir generators generate
pnpm --dir generators validate:sources
```

如果生成产物有变化，应与对应的 `registry/` 或 `registry/domains/` 源 YAML 一起提交，保持“源事实”和“生成结果”一致。

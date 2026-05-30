# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

**AXTP (Auditoryworks Transport Protocol)** — a Registry-Driven Protocol Platform. The single source of truth is `registry/**/*.yaml`; everything under any `generated/` directory is machine-produced and must never be hand-edited.

## Generator Commands

All commands run from `generators/`:

```bash
pnpm install          # first-time setup
pnpm build            # compile TypeScript → dist/
pnpm test             # run vitest tests
pnpm lint             # tsc --noEmit type check

# Validation
pnpm validate:sources # validate registry/ + domains/ + Protocol IR consistency (run this before committing)
pnpm validate:protocol # validate protocol/axtp.protocol.yaml against spec docs

# Generation
pnpm generate         # full pipeline: build Protocol IR + all artifacts
pnpm build:protocol   # only write protocol/axtp.protocol.yaml
pnpm emit:protocol    # only write docs/generated/protocol.md + protocol.json (requires IR to exist)
pnpm generate:registry # only write registry docs, C++ headers, tooling JSON, test vectors
```

Shorthand from repo root (no `cd` needed):

```bash
pnpm --dir generators generate
pnpm --dir generators validate:sources
```

## Three-Stage Compilation Pipeline

```text
registry/**/*.yaml + registry/domains/**/*.yaml
        ↓  loadProtocolSources + validateSpec
Source Model
        ↓  buildProtocolDefinitionRaw
protocol/axtp.protocol.yaml          ← Protocol IR (generated, do not edit)
        ↓  emitRepositoryArtifacts
docs/generated/          tooling/mcp/          runtimes/*/generated/
```

Key generator source files in `generators/src/`:

| File | Role |
| --- | --- |
| `cli.ts` | Command entry point |
| `loader.ts` | Loads core registry YAML (payload types, control opcodes, etc.) |
| `sourceLoader.ts` | Merges `registry/domains/**/*.yaml` into the Source Model |
| `validator.ts` | Validates Source Model (ID uniqueness, schema refs, MVP constraints) |
| `protocolBuilder.ts` | Aggregates Source Model → Protocol IR |
| `protocolValidator.ts` | Validates Protocol IR structure and wire facts |
| `protocolDocsValidator.ts` | Cross-checks IR against spec docs |
| `emitters/` | One file per output target (protocolMarkdown, protocolJson, markdown, json, cpp, testVectors) |

## Protocol Architecture

Five-layer stack:

```text
Business Layer   → device / display / firmware / media domains
Registry Layer   → Method / Event / Error / Capability IDs
Payload Layer    → CONTROL (0x01) / RPC (0x02) / STREAM (0x03)
Frame Layer      → Header / Length / MessageId / Fragment / CRC
Transport Layer  → BLE / HID / UART / TCP / WebSocket / USB Bulk
```

**Critical constraint**: `PayloadType` selects a parser only — it never encodes business semantics like VIDEO, OTA, FILE. Those belong in the Registry layer.

Two header profiles:

- **Standard** (12B header + 2B CRC16 = 14B): TCP, WebSocket, USB Bulk
- **Compact** (4B header + 1B CRC8 = 5B): BLE, USB HID, UART, MCU

Three ID namespaces that must not be confused: `MessageId` (Frame) ≠ `requestId` (RPC) ≠ `streamId` (Stream).

Byte order: Little-Endian for all multi-byte integers.

## Registry Structure

```text
registry/
├── core/          # protocol_meta, payload_type, control_opcode, rpc_encoding, stream_profile
├── method/        # adopted method entries
├── event/         # adopted event entries
├── error/         # error codes
├── capability/    # capability registry + MVP profile
├── schema/        # shared TLV type definitions
├── legacy/        # old-protocol → AXTP method mappings
└── domains/       # per-domain YAML (network/, stream/, …)
    └── <domain>/domain.yaml
```

## Adding New Content

**New business method/event/type** → `registry/domains/<domain>/domain.yaml`

Minimal domain YAML shape:

```yaml
domain: sensor

methods:
  - id: 0x1201          # unique hex ID
    name: sensor.getValue
    domain: sensor
    status: draft
    bit_offset: 0
    rpc_op: request_response
    request_schema: SensorGetValueRequest
    response_schema: SensorGetValueResponse
    recommended_encoding: [json, binary_tlv]
    capabilities: [sensor.basic]
    events: [sensor.valueChanged]
    errors: [SUCCESS, RPC_METHOD_NOT_FOUND]

types:
  SensorGetValueRequest:
    kind: object
    fields:
      - id: 0x01
        name: sensorId
        type: uint16
        required: true
```

See `registry/domains/network/domain.yaml` and `registry/domains/stream/domain.yaml` for real examples.

**New public schema** → `registry/schema/*.yaml`  
**New error code** → `registry/error/error_code.yaml` or domain YAML  
**New capability** → `registry/capability/capability_registry.yaml` or domain YAML  
**New spec doc** → `docs/specs/NN-AXTP-<Title>.md` (follow existing numbering)  
**Core constants** (transport, payload type, control opcode) → `registry/core/*.yaml`

## Pre-Commit Workflow

```bash
pnpm --dir generators build
pnpm --dir generators test
pnpm --dir generators generate
pnpm --dir generators validate:sources
```

Commit source YAML and generated artifacts together so they stay in sync.

## Key Spec Documents

| Doc | Content |
|---|---|
| `docs/specs/02-AXTP-Frame-and-Payload-Spec.md` | Wire format rules |
| `docs/specs/05-AXTP-RPC-Session-Spec.md` | RPC session lifecycle |
| `docs/specs/06-AXTP-Stream-Spec.md` | STREAM data plane and 16B stream header |
| `docs/specs/08-AXTP-Protocol-Definition-Mapping-Spec.md` | Source YAML → IR → artifact mapping rules |
| `docs/specs/20-AXTP-Generator-v1实现规范.md` | Generator implementation spec and governance |
| `docs/generated/protocol.md` | Human-readable full protocol reference (generated) |

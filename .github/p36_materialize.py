from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing replacement anchor in {path}: {old[:100]!r}")
    if text.count(old) != 1:
        raise SystemExit(f"non-unique replacement anchor in {path}: {text.count(old)}")
    p.write_text(text.replace(old, new, 1))


def insert_before(path: str, anchor: str, addition: str) -> None:
    replace_once(path, anchor, addition + anchor)


# Task 2 — synchronize normative core spec to frozen P23.
replace_once(
    "specs/20-core.md",
    "Frame parser MUST 在分发前校验 magic、version、PayloadType、`PayloadLength + 14 <= maxFrameSize`、`FrameCount >= 1`、`FrameIndex < FrameCount`、CRC 和完整 payload 可用性。",
    "Frame parser MUST 在分发前校验 magic、version、PayloadType、`PayloadLength + 14 <= effectiveMaxFrameSize`、`FrameCount >= 1`、`FrameIndex < FrameCount`、CRC 和完整 payload 可用性。",
)
replace_once(
    "specs/20-core.md",
    "3. 缺席表示该 ACCEPT 没有为此参数提供 override；runtime 继续使用 transport/profile/local 已适用的默认值；",
    "3. 对 `maxFrameSize` 与 `heartbeatIntervalMs`，缺席表示 ACCEPT 没有提供 override；effective value MUST 继续使用 OPEN 中的对应 baseline；",
)
insert_before(
    "specs/20-core.md",
    "## Transport Profile 传输配置\n",
    '''### A1 effective parameters

OPEN 中的 `maxFrameSize` 与 `heartbeatIntervalMs` 是 Standard Framed link 的 baseline。成功 ACCEPT 中对应字段只在存在时覆盖 OPEN：

```text
effectiveMaxFrameSize =
  ACCEPT.maxFrameSize if present
  otherwise OPEN.maxFrameSize

effectiveHeartbeatIntervalMs =
  ACCEPT.heartbeatIntervalMs if present
  otherwise OPEN.heartbeatIntervalMs
```

成功的 empty ACCEPT 表示接受 OPEN baseline。`effectiveMaxFrameSize` 是双向 Standard Frame ceiling；每个发送 frame MUST 满足 `PayloadLength + 14 <= effectiveMaxFrameSize`。实现 MAY 发送更小的 frame，但 MUST NOT 接受 link 后静默采用不同的 peer-visible ceiling。

### A1 fragmentation and reassembly

一个 fragmented logical message MUST 使用同一 `MessageId`；fragmented `FrameCount` MUST 位于 `2..255`，sender 的 `FrameIndex` MUST 恰好覆盖 `0..FrameCount-1` 且按升序发送。`Version`、`PayloadType`、`SourceId`、`DestinationId`、`MessageId`、`FrameCount` 在该 message 的所有 fragments 中 MUST 保持一致。对同一 `(SourceId, DestinationId)` direction，一个 fragmented message 的 fragments MUST contiguous emission；需要超过 255 fragments 的 message MUST 在发送前本地失败。

Receiver reassembly key 固定为：

```text
(local Framed Link Context, SourceId, DestinationId, MessageId)
```

`PayloadType`、`FrameCount` 与 Header Version 是 context invariants，不是 key。Receiver MAY 接收 out-of-order fragments，但 MUST 按 `FrameIndex` 升序重建 payload；CONTROL/RPC/STREAM 只能收到完整 unfragmented payload 或 fully reassembled payload，MUST NOT 收到 partial fragments。

同一 active context/index 的 identical duplicate MUST idempotent；payload 或 invariant 冲突 MUST invalidate context，并在 runtime 暴露 frame diagnostics 时归类为 `FRAME_FRAGMENT_INVALID`，且不得 dispatch partial payload。`MessageId` 是 opaque uint16，zero 不保留，也不要求 monotonic allocator；sender 只需保证同一 direction 的 fragmented active context 不复用同一值，context complete/invalidated/abandoned/expired 后 MAY 立即 reuse。

因为 Core v1 禁止同向 fragmented message interleaving，若 prior fragmented context 未完成时出现同 direction 的不同 `MessageId`，prior context MUST 被 abandoned；若暴露 diagnostic，分类为 `FRAME_FRAGMENT_MISSING`。`FRAME_REASSEMBLY_TIMEOUT` 表示 runtime/profile-owned timer 到期；timeout duration 不属于 Core 常量。Runtime MUST 对 incomplete reassembly memory/context 设置 finite bounds，具体 numeric caps 属于 runtime/profile policy；resource exhaustion MUST NOT 导致 partial upper-layer dispatch。

### A1 parser safety and recovery

Standard Frame candidate MUST 在 dispatch 前通过 header、length、fragment-range、payload-completeness 与 CRC checks。对 byte-stream profile，receiver 在 commit candidate 前扫描 magic；structurally plausible 但 bytes 尚不完整的 candidate MUST 等待更多 bytes，不能因为 declared payload 内出现 `0x41 0x58` 就在 payload 内 resynchronize。Rejected candidate MUST NOT dispatch payload；若实现选择 recover 而非 close，下一次 candidate search MUST 从 rejected candidate 的第一个 byte 之后开始；chunk 末尾单独的 `0x41` MAY 保留为下一段 magic prefix。允许连续多少 corrupt candidates、buffer strategy、close aggressiveness 属于 runtime/profile policy。Packet boundary MAY 用于丢弃 bad packet，但不能替代 header/CRC validation。

Frame integrity failures 默认是 local frame-layer diagnostics，不得仅凭 untrusted frame context 伪造 business RPC result 或 CONTROL response。标准 diagnostics 包括 `FRAME_VERSION_UNSUPPORTED`、`FRAME_PAYLOAD_TYPE_INVALID`、`FRAME_LENGTH_INVALID`、`FRAME_TOO_LARGE`、`FRAME_CRC_ERROR`、`FRAME_FRAGMENT_INVALID`、`FRAME_FRAGMENT_MISSING`、`FRAME_REASSEMBLY_TIMEOUT`。

### A1 heartbeat wire semantics

进入 `FRAMING_READY` 后任一 peer MAY 发送 CONTROL HEARTBEAT。收到 valid HEARTBEAT 的 peer MUST 返回 HEARTBEAT_ACK，回显同一 `controlId` 且 `statusCode=SUCCESS`。Sender MUST NOT 同时复用仍 outstanding 的 heartbeat `controlId`；allocator algorithm 属于 runtime policy。

`effectiveHeartbeatIntervalMs` 是自动 liveness probing 启用时的 negotiated/default cadence input，不是 normative failure deadline。Initiator role、scheduler topology、missed-ACK threshold、timeout formula、ordinary-traffic refresh、reconnect/backoff 均属于 runtime/profile policy。WebSocket Unframed JSON 继续使用 WebSocket/native keepalive。

''',
)

# Task 3 — source-of-generation contract.
replace_once(
    "contract/registry/core/protocol_meta.yaml",
    "    supportsMixing: false\n",
    '''    supportsMixing: false
    contract:
      header:
        size: 12
        magicBytes: [0x41, 0x58]
        version: 0x01
        fields:
          - { name: magic, offset: 0, bytes: 2, type: bytes }
          - { name: version, offset: 2, bytes: 1, type: uint8 }
          - { name: payloadType, offset: 3, bytes: 1, type: uint8 }
          - { name: payloadLength, offset: 4, bytes: 2, type: uint16 }
          - { name: sourceId, offset: 6, bytes: 1, type: uint8 }
          - { name: destinationId, offset: 7, bytes: 1, type: uint8 }
          - { name: messageId, offset: 8, bytes: 2, type: uint16 }
          - { name: frameIndex, offset: 10, bytes: 1, type: uint8 }
          - { name: frameCount, offset: 11, bytes: 1, type: uint8 }
      footer:
        size: 2
        field: crc16
      overheadBytes: 14
      crc:
        algorithm: CRC16-CCITT-FALSE
        coverage: header+payload
        excludesFooter: true
        byteOrder: big-endian
      effectiveParameters:
        maxFrameSize:
          openField: maxFrameSize
          acceptOverrideField: maxFrameSize
          fallback: OPEN.maxFrameSize
          formula: PayloadLength + 14 <= effectiveMaxFrameSize
        heartbeatIntervalMs:
          openField: heartbeatIntervalMs
          acceptOverrideField: heartbeatIntervalMs
          fallback: OPEN.heartbeatIntervalMs
      fragmentation:
        sender:
          fragmentedFrameCountMin: 2
          fragmentedFrameCountMax: 255
          frameIndexCoverage: 0..FrameCount-1 exactly once
          emissionOrder: ascending
          contiguousPerDirection: true
          invariants: [version, payloadType, sourceId, destinationId, messageId, frameCount]
          over255Disposition: local-reject-before-transmit
        reassemblyKey: [framedLinkContext, sourceId, destinationId, messageId]
        contextInvariants: [payloadType, frameCount, version]
        receiveOrder: out-of-order-allowed
        payloadOrder: frameIndex-ascending
        dispatch: complete-only
        duplicate:
          identical: idempotent
          conflicting: invalidate-context
          diagnostic: FRAME_FRAGMENT_INVALID
        messageId:
          type: uint16
          zeroReserved: false
          allocationOwner: runtime
          activeUniqueness: same-direction-fragmented-message
          reuseAfter: [completed, invalidated, abandoned, expired]
        missing:
          trigger: different-message-id-same-direction-before-completion
          diagnostic: FRAME_FRAGMENT_MISSING
        timeout:
          diagnostic: FRAME_REASSEMBLY_TIMEOUT
          durationOwner: runtime_or_profile
        resources:
          bounded: true
          numericLimitsOwner: runtime_or_profile
          exhaustionDiagnostic: RESOURCE_EXHAUSTED
          partialDispatch: false
      parser:
        validateBeforeDispatch: [magic, version, payloadType, length, fragmentRange, payloadCompleteness, crc]
        invalidDispatch: false
        byteStream:
          scanMagic: true
          incompleteCandidate: hold-for-more-bytes
          recoverySearch: after-first-rejected-byte
          trailingMagicPrefixRetention: true
        packet:
          boundaryMayDiscardBadFrame: true
          boundaryReplacesValidation: false
        recoveryAggressivenessOwner: runtime_or_profile
      diagnostics:
        - FRAME_VERSION_UNSUPPORTED
        - FRAME_PAYLOAD_TYPE_INVALID
        - FRAME_LENGTH_INVALID
        - FRAME_TOO_LARGE
        - FRAME_CRC_ERROR
        - FRAME_FRAGMENT_INVALID
        - FRAME_FRAGMENT_MISSING
        - FRAME_REASSEMBLY_TIMEOUT
      heartbeat:
        activeAfter: FRAMING_READY
        sender: either-peer
        ack:
          opcode: HEARTBEAT_ACK
          controlId: echo-request
          statusCode: SUCCESS
        outstandingControlIdUnique: true
        allocatorOwner: runtime
        cadenceSource: effectiveHeartbeatIntervalMs
        failureDeadlineOwner: runtime_or_profile
        schedulerOwner: runtime_or_profile
        reconnectOwner: runtime_or_profile
''',
)

model_insert = '''export interface StandardFrameHeaderField {
  name: string;
  offset: number;
  bytes: number;
  type: string;
}

export interface StandardFrameEffectiveParameter {
  openField: string;
  acceptOverrideField: string;
  fallback: string;
  formula?: string;
}

export interface StandardFrameContract {
  header: {
    size: number;
    magicBytes: number[];
    version: number;
    fields: StandardFrameHeaderField[];
  };
  footer: { size: number; field: string };
  overheadBytes: number;
  crc: { algorithm: string; coverage: string; excludesFooter: boolean; byteOrder: string };
  effectiveParameters: {
    maxFrameSize: StandardFrameEffectiveParameter;
    heartbeatIntervalMs: StandardFrameEffectiveParameter;
  };
  fragmentation: {
    sender: {
      fragmentedFrameCountMin: number;
      fragmentedFrameCountMax: number;
      frameIndexCoverage: string;
      emissionOrder: string;
      contiguousPerDirection: boolean;
      invariants: string[];
      over255Disposition: string;
    };
    reassemblyKey: string[];
    contextInvariants: string[];
    receiveOrder: string;
    payloadOrder: string;
    dispatch: string;
    duplicate: { identical: string; conflicting: string; diagnostic: string };
    messageId: { type: string; zeroReserved: boolean; allocationOwner: string; activeUniqueness: string; reuseAfter: string[] };
    missing: { trigger: string; diagnostic: string };
    timeout: { diagnostic: string; durationOwner: string };
    resources: { bounded: boolean; numericLimitsOwner: string; exhaustionDiagnostic: string; partialDispatch: boolean };
  };
  parser: {
    validateBeforeDispatch: string[];
    invalidDispatch: boolean;
    byteStream: { scanMagic: boolean; incompleteCandidate: string; recoverySearch: string; trailingMagicPrefixRetention: boolean };
    packet: { boundaryMayDiscardBadFrame: boolean; boundaryReplacesValidation: boolean };
    recoveryAggressivenessOwner: string;
  };
  diagnostics: string[];
  heartbeat: {
    activeAfter: string;
    sender: string;
    ack: { opcode: string; controlId: string; statusCode: string };
    outstandingControlIdUnique: boolean;
    allocatorOwner: string;
    cadenceSource: string;
    failureDeadlineOwner: string;
    schedulerOwner: string;
    reconnectOwner: string;
  };
}

'''
insert_before("tooling/generators/src/protocolModel.ts", "export interface FrameProfile {\n", model_insert)
replace_once(
    "tooling/generators/src/protocolModel.ts",
    "  supportsMixing?: boolean;\n}\n\nexport interface TransportProfile",
    "  supportsMixing?: boolean;\n  contract?: StandardFrameContract;\n}\n\nexport interface TransportProfile",
)

replace_once(
    "tooling/generators/src/protocolLoader.ts",
    "  StreamDefinition,\n  TransportProfile,",
    "  StreamDefinition,\n  StandardFrameContract,\n  TransportProfile,",
)
loader_fn = '''function mapStandardFrameContract(value: unknown): StandardFrameContract | undefined {
  if (value === undefined) return undefined;
  const item = asObject(value, "frameProfiles.STANDARD_FRAME.contract");
  const header = asObject(item.header, "frameProfiles.STANDARD_FRAME.contract.header");
  const footer = asObject(item.footer, "frameProfiles.STANDARD_FRAME.contract.footer");
  const crc = asObject(item.crc, "frameProfiles.STANDARD_FRAME.contract.crc");
  const effectiveParameters = asObject(item.effectiveParameters, "frameProfiles.STANDARD_FRAME.contract.effectiveParameters");
  const maxFrameSize = asObject(effectiveParameters.maxFrameSize, "frameProfiles.STANDARD_FRAME.contract.effectiveParameters.maxFrameSize");
  const heartbeatIntervalMs = asObject(effectiveParameters.heartbeatIntervalMs, "frameProfiles.STANDARD_FRAME.contract.effectiveParameters.heartbeatIntervalMs");
  const fragmentation = asObject(item.fragmentation, "frameProfiles.STANDARD_FRAME.contract.fragmentation");
  const sender = asObject(fragmentation.sender, "frameProfiles.STANDARD_FRAME.contract.fragmentation.sender");
  const duplicate = asObject(fragmentation.duplicate, "frameProfiles.STANDARD_FRAME.contract.fragmentation.duplicate");
  const messageId = asObject(fragmentation.messageId, "frameProfiles.STANDARD_FRAME.contract.fragmentation.messageId");
  const missing = asObject(fragmentation.missing, "frameProfiles.STANDARD_FRAME.contract.fragmentation.missing");
  const timeout = asObject(fragmentation.timeout, "frameProfiles.STANDARD_FRAME.contract.fragmentation.timeout");
  const resources = asObject(fragmentation.resources, "frameProfiles.STANDARD_FRAME.contract.fragmentation.resources");
  const parser = asObject(item.parser, "frameProfiles.STANDARD_FRAME.contract.parser");
  const byteStream = asObject(parser.byteStream, "frameProfiles.STANDARD_FRAME.contract.parser.byteStream");
  const packet = asObject(parser.packet, "frameProfiles.STANDARD_FRAME.contract.parser.packet");
  const heartbeat = asObject(item.heartbeat, "frameProfiles.STANDARD_FRAME.contract.heartbeat");
  const ack = asObject(heartbeat.ack, "frameProfiles.STANDARD_FRAME.contract.heartbeat.ack");
  const mapEffective = (entry: Record<string, any>) => ({
    openField: String(entry.openField),
    acceptOverrideField: String(entry.acceptOverrideField),
    fallback: String(entry.fallback),
    formula: optionalString(entry.formula)
  });
  return {
    header: {
      size: normalizeId(header.size, "STANDARD_FRAME.contract.header.size"),
      magicBytes: asArray(header.magicBytes).map((entry, index) => normalizeId(entry, `STANDARD_FRAME.contract.header.magicBytes[${index}]`)),
      version: normalizeId(header.version, "STANDARD_FRAME.contract.header.version"),
      fields: asArray(header.fields).map((field) => ({
        name: String(field.name),
        offset: normalizeId(field.offset, `STANDARD_FRAME.contract.header.fields.${field.name}.offset`),
        bytes: normalizeId(field.bytes, `STANDARD_FRAME.contract.header.fields.${field.name}.bytes`),
        type: String(field.type)
      }))
    },
    footer: { size: normalizeId(footer.size, "STANDARD_FRAME.contract.footer.size"), field: String(footer.field) },
    overheadBytes: normalizeId(item.overheadBytes, "STANDARD_FRAME.contract.overheadBytes"),
    crc: { algorithm: String(crc.algorithm), coverage: String(crc.coverage), excludesFooter: Boolean(crc.excludesFooter), byteOrder: String(crc.byteOrder) },
    effectiveParameters: { maxFrameSize: mapEffective(maxFrameSize), heartbeatIntervalMs: mapEffective(heartbeatIntervalMs) },
    fragmentation: {
      sender: {
        fragmentedFrameCountMin: normalizeId(sender.fragmentedFrameCountMin, "STANDARD_FRAME.contract.fragmentation.sender.fragmentedFrameCountMin"),
        fragmentedFrameCountMax: normalizeId(sender.fragmentedFrameCountMax, "STANDARD_FRAME.contract.fragmentation.sender.fragmentedFrameCountMax"),
        frameIndexCoverage: String(sender.frameIndexCoverage),
        emissionOrder: String(sender.emissionOrder),
        contiguousPerDirection: Boolean(sender.contiguousPerDirection),
        invariants: asStringArray(sender.invariants),
        over255Disposition: String(sender.over255Disposition)
      },
      reassemblyKey: asStringArray(fragmentation.reassemblyKey),
      contextInvariants: asStringArray(fragmentation.contextInvariants),
      receiveOrder: String(fragmentation.receiveOrder),
      payloadOrder: String(fragmentation.payloadOrder),
      dispatch: String(fragmentation.dispatch),
      duplicate: { identical: String(duplicate.identical), conflicting: String(duplicate.conflicting), diagnostic: String(duplicate.diagnostic) },
      messageId: { type: String(messageId.type), zeroReserved: Boolean(messageId.zeroReserved), allocationOwner: String(messageId.allocationOwner), activeUniqueness: String(messageId.activeUniqueness), reuseAfter: asStringArray(messageId.reuseAfter) },
      missing: { trigger: String(missing.trigger), diagnostic: String(missing.diagnostic) },
      timeout: { diagnostic: String(timeout.diagnostic), durationOwner: String(timeout.durationOwner) },
      resources: { bounded: Boolean(resources.bounded), numericLimitsOwner: String(resources.numericLimitsOwner), exhaustionDiagnostic: String(resources.exhaustionDiagnostic), partialDispatch: Boolean(resources.partialDispatch) }
    },
    parser: {
      validateBeforeDispatch: asStringArray(parser.validateBeforeDispatch),
      invalidDispatch: Boolean(parser.invalidDispatch),
      byteStream: { scanMagic: Boolean(byteStream.scanMagic), incompleteCandidate: String(byteStream.incompleteCandidate), recoverySearch: String(byteStream.recoverySearch), trailingMagicPrefixRetention: Boolean(byteStream.trailingMagicPrefixRetention) },
      packet: { boundaryMayDiscardBadFrame: Boolean(packet.boundaryMayDiscardBadFrame), boundaryReplacesValidation: Boolean(packet.boundaryReplacesValidation) },
      recoveryAggressivenessOwner: String(parser.recoveryAggressivenessOwner)
    },
    diagnostics: asStringArray(item.diagnostics),
    heartbeat: {
      activeAfter: String(heartbeat.activeAfter),
      sender: String(heartbeat.sender),
      ack: { opcode: String(ack.opcode), controlId: String(ack.controlId), statusCode: String(ack.statusCode) },
      outstandingControlIdUnique: Boolean(heartbeat.outstandingControlIdUnique),
      allocatorOwner: String(heartbeat.allocatorOwner),
      cadenceSource: String(heartbeat.cadenceSource),
      failureDeadlineOwner: String(heartbeat.failureDeadlineOwner),
      schedulerOwner: String(heartbeat.schedulerOwner),
      reconnectOwner: String(heartbeat.reconnectOwner)
    }
  };
}

'''
insert_before("tooling/generators/src/protocolLoader.ts", "function mapFrameProfiles(value: unknown): FrameProfile[] {\n", loader_fn)
replace_once(
    "tooling/generators/src/protocolLoader.ts",
    "    supportsMixing: item.supportsMixing === undefined ? undefined : Boolean(item.supportsMixing)\n",
    "    supportsMixing: item.supportsMixing === undefined ? undefined : Boolean(item.supportsMixing),\n    contract: mapStandardFrameContract(item.contract)\n",
)

validator_fn = '''function assertStandardFrameContract(model: ProtocolModel): void {
  const contract = model.frameProfiles.find((item) => item.name === "STANDARD_FRAME")?.contract;
  if (!contract) fail("STANDARD_FRAME", "contract", "STANDARD_FRAME.contract is required by P23");
  if (contract.header.size !== 12) fail("STANDARD_FRAME.contract.header", "size", "Standard Frame header size must be 12 bytes");
  if (contract.footer.size !== 2 || contract.overheadBytes !== 14) fail("STANDARD_FRAME.contract", "overheadBytes", "Standard Frame footer must be 2 bytes and total overhead must be 14 bytes");
  if (contract.header.magicBytes.join(",") !== "65,88" || contract.header.version !== 1) fail("STANDARD_FRAME.contract.header", "magicBytes/version", "Standard Frame magic/version must be AX / 0x01");
  const expectedFields = [
    ["magic", 0, 2], ["version", 2, 1], ["payloadType", 3, 1], ["payloadLength", 4, 2],
    ["sourceId", 6, 1], ["destinationId", 7, 1], ["messageId", 8, 2], ["frameIndex", 10, 1], ["frameCount", 11, 1]
  ];
  if (JSON.stringify(contract.header.fields.map((field) => [field.name, field.offset, field.bytes])) !== JSON.stringify(expectedFields)) fail("STANDARD_FRAME.contract.header", "fields", "Standard Frame header fields/offsets must match the frozen 12-byte P23 layout");
  if (contract.crc.algorithm !== "CRC16-CCITT-FALSE" || contract.crc.coverage !== "header+payload" || !contract.crc.excludesFooter || contract.crc.byteOrder !== "big-endian") fail("STANDARD_FRAME.contract.crc", "coverage", "CRC coverage must be header+payload using CRC16-CCITT-FALSE with footer excluded and big-endian serialization");
  const max = contract.effectiveParameters.maxFrameSize;
  const heartbeat = contract.effectiveParameters.heartbeatIntervalMs;
  if (max.openField !== "maxFrameSize" || max.acceptOverrideField !== "maxFrameSize" || max.fallback !== "OPEN.maxFrameSize" || max.formula !== "PayloadLength + 14 <= effectiveMaxFrameSize") fail("STANDARD_FRAME.contract.effectiveParameters.maxFrameSize", "formula", "effective max frame rule must be PayloadLength + 14 <= effectiveMaxFrameSize with OPEN fallback");
  if (heartbeat.openField !== "heartbeatIntervalMs" || heartbeat.acceptOverrideField !== "heartbeatIntervalMs" || heartbeat.fallback !== "OPEN.heartbeatIntervalMs") fail("STANDARD_FRAME.contract.effectiveParameters.heartbeatIntervalMs", "fallback", "effective heartbeat interval must use ACCEPT override with OPEN fallback");
  if (JSON.stringify(contract.fragmentation.reassemblyKey) !== JSON.stringify(["framedLinkContext", "sourceId", "destinationId", "messageId"])) fail("STANDARD_FRAME.contract.fragmentation", "reassemblyKey", "Standard Frame reassembly key must be framedLinkContext/sourceId/destinationId/messageId");
  if (contract.fragmentation.messageId.zeroReserved) fail("STANDARD_FRAME.contract.fragmentation.messageId", "zeroReserved", "MessageId zero must not be reserved");
  if (contract.fragmentation.sender.fragmentedFrameCountMin !== 2 || contract.fragmentation.sender.fragmentedFrameCountMax !== 255 || contract.fragmentation.sender.emissionOrder !== "ascending" || !contract.fragmentation.sender.contiguousPerDirection) fail("STANDARD_FRAME.contract.fragmentation.sender", "FrameCount", "fragmented sender must use FrameCount 2..255 with ascending contiguous emission");
  if (contract.fragmentation.dispatch !== "complete-only" || contract.fragmentation.duplicate.identical !== "idempotent" || contract.fragmentation.duplicate.conflicting !== "invalidate-context") fail("STANDARD_FRAME.contract.fragmentation", "dispatch", "reassembly must be complete-only with idempotent identical duplicates and conflicting-context invalidation");
  if (contract.fragmentation.timeout.durationOwner !== "runtime_or_profile" || contract.fragmentation.resources.numericLimitsOwner !== "runtime_or_profile" || !contract.fragmentation.resources.bounded || contract.fragmentation.resources.partialDispatch) fail("STANDARD_FRAME.contract.fragmentation", "policyOwnership", "timeouts/resource numeric limits must remain runtime/profile-owned while resources stay bounded and partial dispatch stays forbidden");
  if (contract.parser.invalidDispatch || contract.parser.recoveryAggressivenessOwner !== "runtime_or_profile" || contract.parser.byteStream.recoverySearch !== "after-first-rejected-byte") fail("STANDARD_FRAME.contract.parser", "invalidDispatch", "parser must forbid invalid dispatch and preserve the P23 recovery boundary");
  const requiredDiagnostics = ["FRAME_VERSION_UNSUPPORTED", "FRAME_PAYLOAD_TYPE_INVALID", "FRAME_LENGTH_INVALID", "FRAME_TOO_LARGE", "FRAME_CRC_ERROR", "FRAME_FRAGMENT_INVALID", "FRAME_FRAGMENT_MISSING", "FRAME_REASSEMBLY_TIMEOUT"];
  for (const name of requiredDiagnostics) if (!contract.diagnostics.includes(name)) fail("STANDARD_FRAME.contract", "diagnostics", `missing frame diagnostic ${name}`);
  if (contract.heartbeat.activeAfter !== "FRAMING_READY" || contract.heartbeat.ack.opcode !== "HEARTBEAT_ACK" || contract.heartbeat.ack.controlId !== "echo-request" || contract.heartbeat.ack.statusCode !== "SUCCESS") fail("STANDARD_FRAME.contract.heartbeat", "ack", "HEARTBEAT_ACK must echo request controlId with SUCCESS after FRAMING_READY");
  for (const [field, value] of [["failureDeadlineOwner", contract.heartbeat.failureDeadlineOwner], ["schedulerOwner", contract.heartbeat.schedulerOwner], ["reconnectOwner", contract.heartbeat.reconnectOwner]] as const) if (value !== "runtime_or_profile") fail("STANDARD_FRAME.contract.heartbeat", field, `${field} must remain runtime/profile-owned`);
}

'''
insert_before("tooling/generators/src/protocolValidator.ts", "function assertCurrentTransportPolicy(model: ProtocolModel): void {\n", validator_fn)
replace_once("tooling/generators/src/protocolValidator.ts", "  assertControlOpcodes(model);\n", "  assertControlOpcodes(model);\n  assertStandardFrameContract(model);\n")

docs_fn = '''function assertStandardFrameDocs(model: ProtocolModel, coreSpec: string): void {
  const contract = model.frameProfiles.find((profile) => profile.name === "STANDARD_FRAME")?.contract;
  if (!contract) fail("contract/protocol/axtp.protocol.yaml", "STANDARD_FRAME.contract", "machine-readable Standard Frame contract is required");
  requirePattern(coreSpec, /effectiveMaxFrameSize[\\s\\S]{0,240}OPEN\\.maxFrameSize/, "specs/20-core.md", "effectiveMaxFrameSize", "core spec must define ACCEPT override with OPEN maxFrameSize fallback");
  requirePattern(coreSpec, /PayloadLength \\+ 14 <= effectiveMaxFrameSize/, "specs/20-core.md", "Frame Ceiling", "core spec must use the effective max-frame formula");
  requirePattern(coreSpec, /local Framed Link Context, SourceId, DestinationId, MessageId/, "specs/20-core.md", "Reassembly Key", "core spec must define the P23 reassembly key");
  requirePattern(coreSpec, /identical duplicate[\\s\\S]{0,160}idempotent/i, "specs/20-core.md", "Duplicate Fragment", "core spec must define identical duplicate idempotence");
  requirePattern(coreSpec, /Rejected candidate MUST NOT dispatch payload/, "specs/20-core.md", "Parser Safety", "core spec must forbid invalid-frame dispatch");
  requirePattern(coreSpec, /HEARTBEAT_ACK[\\s\\S]{0,160}controlId[\\s\\S]{0,100}SUCCESS/, "specs/20-core.md", "Heartbeat ACK", "core spec must require matching HEARTBEAT_ACK controlId and SUCCESS");
  if (contract.effectiveParameters.maxFrameSize.formula !== "PayloadLength + 14 <= effectiveMaxFrameSize") fail("contract/protocol/axtp.protocol.yaml", "STANDARD_FRAME.contract", "machine contract effective max formula drifted from core spec");
}

'''
insert_before("tooling/generators/src/protocolDocsValidator.ts", "export async function loadProtocolDocs", docs_fn)
replace_once("tooling/generators/src/protocolDocsValidator.ts", "  assertYamlCapability(model);\n", "  assertYamlCapability(model);\n  assertStandardFrameDocs(model, docs.coreSpec);\n")
replace_once("tooling/generators/src/protocolDocsValidator.ts", '    "[OK] specs: optional capability discovery facts checked"\n', '    "[OK] specs: optional capability discovery facts checked",\n    "[OK] specs: P23 Standard Frame contract facts checked"\n')

# Generated Markdown exposure.
replace_once("tooling/generators/src/emitters/protocolMarkdown.ts", '    "- [Supported Connection Profiles](#supported-connection-profiles)",\n', '    "- [Standard Frame Contract](#standard-frame-contract)",\n    "- [Supported Connection Profiles](#supported-connection-profiles)",\n')
markdown_fn = '''function renderStandardFrameContract(model: ProtocolModel): string[] {
  const contract = model.frameProfiles.find((profile) => profile.name === "STANDARD_FRAME")?.contract;
  if (!contract) return [];
  return [
    "## Standard Frame Contract",
    "",
    `Standard Frame uses a ${contract.header.size}-byte header, payload bytes, and a ${contract.footer.size}-byte CRC footer (${contract.overheadBytes} bytes fixed overhead).`,
    "",
    ...table(["Field", "Offset", "Bytes", "Type"], contract.header.fields.map((field) => [field.name, String(field.offset), String(field.bytes), field.type]), ["left", "right", "right", "center"]),
    "",
    `- Magic: \`${contract.header.magicBytes.map((value) => hex(value, 2)).join(" ")}\``,
    `- Header Version: \`${hex(contract.header.version, 2)}\``,
    `- CRC: \`${contract.crc.algorithm}\`, coverage \`${contract.crc.coverage}\`, footer excluded, \`${contract.crc.byteOrder}\` serialization.`,
    `- Effective max frame: \`${contract.effectiveParameters.maxFrameSize.formula}\`; ACCEPT override falls back to \`${contract.effectiveParameters.maxFrameSize.fallback}\`.`,
    `- Effective heartbeat interval: ACCEPT override falls back to \`${contract.effectiveParameters.heartbeatIntervalMs.fallback}\`.`,
    `- Reassembly key: \`(${contract.fragmentation.reassemblyKey.join(", ")})\`; dispatch is \`${contract.fragmentation.dispatch}\`.`,
    `- MessageId zero reserved: \`${contract.fragmentation.messageId.zeroReserved}\`; allocator owner: \`${contract.fragmentation.messageId.allocationOwner}\`.`,
    `- Parser invalid dispatch: \`${contract.parser.invalidDispatch}\`; recovery aggressiveness owner: \`${contract.parser.recoveryAggressivenessOwner}\`.`,
    `- HEARTBEAT_ACK: controlId=\`${contract.heartbeat.ack.controlId}\`, status=\`${contract.heartbeat.ack.statusCode}\`; scheduler/failure/reconnect policy remains \`${contract.heartbeat.schedulerOwner}\`.`
  ];
}

'''
insert_before("tooling/generators/src/emitters/protocolMarkdown.ts", "function renderConnectionProfiles(model: ProtocolModel): string[] {\n", markdown_fn)
replace_once("tooling/generators/src/emitters/protocolMarkdown.ts", '    ...renderProtocolFramework(model),\n    "",\n    "## Design Goals / Non-Goals",', '    ...renderProtocolFramework(model),\n    "",\n    ...renderStandardFrameContract(model),\n    "",\n    "## Design Goals / Non-Goals",')

# Task 4 — bind P20 evidence to machine contract.
replace_once("tooling/scripts/validate-frame-conformance-design.mjs", 'const framingDir = path.join(root, "conformance", "framing");\n', 'const framingDir = path.join(root, "conformance", "framing");\nconst generatedProtocolPath = path.join(root, "contract", "generated", "protocol.json");\n')
replace_once(
    "tooling/scripts/validate-frame-conformance-design.mjs",
    '  const corpus = readYaml(path.join(framingDir, "corpus", "raw-frames.yaml"));\n',
    '''  const corpus = readYaml(path.join(framingDir, "corpus", "raw-frames.yaml"));
  const protocol = readJson(generatedProtocolPath);
  const standardFrame = (protocol.frameProfiles ?? []).find((profile) => profile.name === "STANDARD_FRAME");
  const machine = standardFrame?.contract;
  if (!machine) fail("generated Protocol IR missing STANDARD_FRAME.contract");
  if (machine) {
    if (machine.header?.size !== 12 || machine.footer?.size !== 2 || machine.overheadBytes !== 14) fail("machine contract Standard Frame sizes must be 12+payload+2 / overhead 14");
    if (JSON.stringify(machine.header?.magicBytes) !== JSON.stringify([0x41, 0x58]) || machine.header?.version !== 0x01) fail("machine contract magic/version mismatch");
    const payloadIds = Object.fromEntries((protocol.payloadTypes ?? []).map((item) => [item.name, item.id]));
    if (payloadIds.CONTROL !== 0x01 || payloadIds.RPC !== 0x02 || payloadIds.STREAM !== 0x03) fail("machine contract PayloadType values mismatch");
    if (machine.crc?.algorithm !== "CRC16-CCITT-FALSE" || machine.crc?.coverage !== "header+payload" || machine.crc?.excludesFooter !== true) fail("machine contract CRC semantics mismatch");
    if (machine.effectiveParameters?.maxFrameSize?.formula !== "PayloadLength + 14 <= effectiveMaxFrameSize") fail("machine contract effective max-frame formula mismatch");
    const expectedDiagnostics = new Set((corpus.frames ?? []).map((frame) => frame.expected_error).filter(Boolean));
    for (const name of expectedDiagnostics) if (!(machine.diagnostics ?? []).includes(name)) fail(`machine contract missing corpus diagnostic ${name}`);
    if (machine.fragmentation?.timeout?.durationOwner !== "runtime_or_profile" || machine.fragmentation?.resources?.numericLimitsOwner !== "runtime_or_profile" || machine.heartbeat?.failureDeadlineOwner !== "runtime_or_profile" || machine.heartbeat?.allocatorOwner !== "runtime") fail("machine contract runtime/profile ownership boundary mismatch");
  }
''',
)
replace_once("tooling/scripts/validate-frame-conformance-design.mjs", '    console.log(`[OK] A1 frame verification design: decisions=${expectedDecisions.length}, cases=${caseIds.size}, frames=${frameIds.size}, streams=${streamIds.size}`);\n', '    console.log(`[OK] A1 frame machine contract alignment: header=${machine.header.size}, overhead=${machine.overheadBytes}, crc=${machine.crc.algorithm}`);\n    console.log(`[OK] A1 frame verification design: decisions=${expectedDecisions.length}, cases=${caseIds.size}, frames=${frameIds.size}, streams=${streamIds.size}`);\n')

# Main conformance validator can resolve frame DSL cases only for framed-binary.
replace_once("tooling/scripts/validate-conformance.mjs", 'const generatedProtocolPath = path.join(root, "contract", "generated", "protocol.json");\n', 'const generatedProtocolPath = path.join(root, "contract", "generated", "protocol.json");\nconst framingManifestPath = path.join(conformanceDir, "framing", "manifest.yaml");\n')
replace_once("tooling/scripts/validate-conformance.mjs", 'const caseFiles = walkYaml(path.join(conformanceDir, "cases"));\n', 'const framingManifest = readYaml(framingManifestPath);\nconst externalFrameCases = new Set(framingManifest.required_cases ?? []);\nif (framingManifest.release_required !== true) fail("framing manifest must be release_required before main conformance promotion");\n\nconst caseFiles = walkYaml(path.join(conformanceDir, "cases"));\n')
replace_once(
    "tooling/scripts/validate-conformance.mjs",
    '    if (!caseEntry) {\n      fail(`manifest level ${level} references missing case: ${id}`);\n      continue;\n    }\n    validateCaseReferences(`manifest required case ${level}/${id}`, caseEntry.value, runtimeRequiredRefs, false);\n',
    '    if (!caseEntry) {\n      if (typeof id === "string" && id.startsWith("frame.") && level === "framed-binary" && externalFrameCases.has(id)) continue;\n      fail(`manifest level ${level} references missing case: ${id}`);\n      continue;\n    }\n    if (typeof id === "string" && id.startsWith("frame.") && level !== "framed-binary") fail(`external frame case ${id} is only valid in framed-binary`);\n    validateCaseReferences(`manifest required case ${level}/${id}`, caseEntry.value, runtimeRequiredRefs, false);\n',
)

# Promote P20 package and its seven cases.
replace_once("conformance/framing/manifest.yaml", "status: verification-design\n", "status: release-required\n")
replace_once("conformance/framing/manifest.yaml", "release_required: false\n", "release_required: true\n")
replace_once("conformance/framing/schemas/frame-verification-manifest.schema.json", '"status": { "const": "verification-design" }', '"status": { "const": "release-required" }')
replace_once("conformance/framing/schemas/frame-verification-manifest.schema.json", '"release_required": { "const": false }', '"release_required": { "const": true }')
replace_once(
    "conformance/manifest.yaml",
    "      - rpc.request_id_match\n",
    "      - rpc.request_id_match\n      - frame.effective_parameters\n      - frame.fragmentation_sender\n      - frame.reassembly_and_duplicates\n      - frame.missing_and_timeout\n      - frame.resource_bounds\n      - frame.parser_integrity_and_recovery\n      - frame.heartbeat_wire\n",
)
replace_once("conformance/framing/README.md", "Status: **P20 verification design — not yet part of the published `framed-binary` required-case set**.", "Status: **P20 materialized — release-required in the current `framed-binary` conformance set**.")
replace_once(
    "conformance/framing/README.md",
    "`conformance/framing/manifest.yaml` has `release_required: false` during P20. These cases are therefore **not** silently added to `conformance/manifest.yaml` and do not change the current published `framed-binary` requirement set.\n\nPromotion happens only after:\n\n1. `specs/20-core.md` is synchronized to A1 authority;\n2. the machine-readable Standard Frame contract is materialized;\n3. the P20 package still validates against those authorities;\n4. release-required cases are explicitly selected in the main conformance manifest.\n",
    "`conformance/framing/manifest.yaml` is now `release_required: true`. Promotion occurred only after `specs/20-core.md` synchronization, machine-readable Standard Frame materialization, machine-contract alignment validation, and explicit selection of all seven P20 cases in the main `framed-binary` required set. Runtime adoption, merge, tag, and release remain separate actions.\n",
)
replace_once("docs/governance/AXTP-Core-Framing-Verification-Design-v0.1.md", "Status: **A1 / P20 Verification Design — READY for authority materialization, release evidence not yet complete**", "Status: **A1 / P20 Verification Evidence — MATERIALIZED / RELEASE-REQUIRED; runtime adoption and release remain separate**")
for old in [
    "- synchronize `specs/20-core.md` yet;\n",
    "- add Standard Frame structure to Protocol IR yet;\n",
    "- add these P20 cases to the current release-required `conformance/manifest.yaml` yet;\n",
]:
    replace_once("docs/governance/AXTP-Core-Framing-Verification-Design-v0.1.md", old, "")

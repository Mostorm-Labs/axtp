import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emitProtocolDocs } from "./emitters/index.js";
import { buildProtocolDefinition } from "./protocolBuilder.js";
import { loadProtocolDocs, validateProtocolDocsConsistency } from "./protocolDocsValidator.js";
import { loadProtocolDefinition } from "./protocolLoader.js";
import type { ProtocolModel } from "./protocolModel.js";
import { validateProtocolDefinition } from "./protocolValidator.js";
import { loadProtocolSources } from "./sourceLoader.js";
import { validateSpec } from "./validator.js";

const repoRoot = path.resolve("../..");

function cloneModel(model: ProtocolModel): ProtocolModel {
  return structuredClone(model);
}

async function loadCurrentProtocol(): Promise<ProtocolModel> {
  return loadProtocolDefinition(repoRoot);
}

function standardFrameContract(model: ProtocolModel): any {
  return (model.frameProfiles.find((profile) => profile.name === "STANDARD_FRAME") as any)?.contract;
}

describe("protocol definition loader", () => {
  it("loads and validates the current protocol definition", async () => {
    const model = await loadCurrentProtocol();
    expect(model.protocol.name).toBe("AXTP");
    expect(validateProtocolDefinition(model)).toContain(`[OK] contract/protocol/axtp.protocol.yaml: ${model.methods.length} methods checked`);
  });

  it("loads the P23 Standard Frame machine contract", async () => {
    const contract = standardFrameContract(await loadCurrentProtocol());
    expect(contract).toBeDefined();
    expect(contract?.header?.size).toBe(12);
    expect(contract?.footer?.size).toBe(2);
    expect(contract?.overheadBytes).toBe(14);
    expect(contract?.header?.fields?.map((field: any) => [field.name, field.offset, field.bytes])).toEqual([
      ["magic", 0, 2],
      ["version", 2, 1],
      ["payloadType", 3, 1],
      ["payloadLength", 4, 2],
      ["sourceId", 6, 1],
      ["destinationId", 7, 1],
      ["messageId", 8, 2],
      ["frameIndex", 10, 1],
      ["frameCount", 11, 1]
    ]);
    expect(contract?.crc).toMatchObject({
      algorithm: "CRC16-CCITT-FALSE",
      coverage: "header+payload",
      byteOrder: "big-endian"
    });
    expect(contract?.effectiveParameters?.maxFrameSize).toMatchObject({
      openField: "maxFrameSize",
      acceptOverrideField: "maxFrameSize",
      formula: "PayloadLength + 14 <= effectiveMaxFrameSize"
    });
    expect(contract?.fragmentation?.reassemblyKey).toEqual(["framedLinkContext", "sourceId", "destinationId", "messageId"]);
    expect(contract?.fragmentation?.messageId?.zeroReserved).toBe(false);
    expect(contract?.parser?.invalidDispatch).toBe(false);
    expect(contract?.heartbeat?.ack?.controlId).toBe("echo-request");
    expect(contract?.heartbeat?.ack?.statusCode).toBe("SUCCESS");
  });
});

describe("protocol source pipeline", () => {
  it("loads contract/registry/domain sources and builds a valid protocol definition", async () => {
    const sources = await loadProtocolSources(repoRoot);
    expect(validateSpec(sources)).toContain(`[OK] method_registry.yaml: ${sources.methods.length} methods checked`);
    expect(sources.methods.find((method) => method.name === "audio.setAlgorithmConfig")?.requestSchema).toBe("AudioSetAlgorithmConfigRequest");
    expect(sources.methods.find((method) => method.name === "audio.getAlgorithmCapabilities")?.responseSchema).toBe("AudioGetAlgorithmCapabilitiesResponse");
    const model = buildProtocolDefinition(sources);
    expect(model.methods.find((method) => method.name === "audio.getAlgorithmConfig")?.response.type).toBe("AudioAlgorithmConfig");
    expect(model.methods.find((method) => method.name === "audio.resetAlgorithmConfig")?.response.type).toBe("AudioSetAlgorithmConfigResponse");
    expect(validateProtocolDefinition(model)).toContain(`[OK] contract/protocol/axtp.protocol.yaml: ${model.methods.length} methods checked`);
  });

  it("rejects deprecated top-level domain YAML sources", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "axtp-legacy-domains-"));
    try {
      await mkdir(path.join(dir, "domains", "stream"), { recursive: true });
      await writeFile(path.join(dir, "domains", "stream", "domain.yaml"), "domain: stream\n", "utf8");
      await expect(loadProtocolSources(dir)).rejects.toThrow(/top-level domains\/ is deprecated/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("protocol definition validator", () => {
  it("rejects duplicate method ids", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.methods.push({ ...model.methods[0], name: "device.duplicate" });
    expect(() => validateProtocolDefinition(model)).toThrow(/duplicate methodId/);
  });

  it("rejects duplicate event ids", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.events.push({ ...model.events[0], name: "display.duplicateChanged" });
    expect(() => validateProtocolDefinition(model)).toThrow(/duplicate eventId/);
  });

  it("rejects non-contiguous method bitOffset values in the same domain", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    const maxAudioBitOffset = Math.max(...model.methods.filter((method) => method.domain === "audio").map((method) => method.bitOffset));
    model.methods.find((method) => method.name === "audio.resetAlgorithmConfig")!.bitOffset = maxAudioBitOffset + 2;
    expect(() => validateProtocolDefinition(model)).toThrow(/bitOffset must be contiguous from 0/);
  });

  it("rejects non-contiguous event bitOffset values in the same domain", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    const maxAudioBitOffset = Math.max(...model.events.filter((event) => event.domain === "audio").map((event) => event.bitOffset));
    model.events.find((event) => event.name === "audio.algorithmConfigChanged")!.bitOffset = maxAudioBitOffset + 2;
    expect(() => validateProtocolDefinition(model)).toThrow(/bitOffset must be contiguous from 0/);
  });

  it("rejects legacy stream header fields", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.stream.header.fields = [
      { name: "streamId", type: "uint32" },
      { name: "seq", type: "uint32" },
      { name: "position", type: "uint32" },
      { name: "chunkLength", type: "uint16" },
      { name: "flags", type: "uint16" }
    ];
    expect(() => validateProtocolDefinition(model)).toThrow(/legacy field: seq|STREAM header must contain/);
  });

  it("rejects stream headers that do not match streamId, seqId and cursor", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.stream.header.fields[2].type = "uint32";
    expect(() => validateProtocolDefinition(model)).toThrow(/STREAM header must be streamId:uint32, seqId:uint32, cursor:uint64/);
  });

  it("rejects protocol IR that does not declare network byte order", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.wire.byteOrder = "little-endian";
    expect(() => validateProtocolDefinition(model)).toThrow(/byte order must be big-endian/);
  });

  it("rejects Standard Frame header-size drift", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    const contract = standardFrameContract(model);
    expect(contract).toBeDefined();
    if (!contract) return;
    contract.header.size = 11;
    expect(() => validateProtocolDefinition(model)).toThrow(/Standard Frame header size must be 12 bytes/);
  });

  it("rejects reserving MessageId zero", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    const contract = standardFrameContract(model);
    expect(contract).toBeDefined();
    if (!contract) return;
    contract.fragmentation.messageId.zeroReserved = true;
    expect(() => validateProtocolDefinition(model)).toThrow(/MessageId zero must not be reserved/);
  });

  it("rejects Standard Frame reassembly-key drift", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    const contract = standardFrameContract(model);
    expect(contract).toBeDefined();
    if (!contract) return;
    contract.fragmentation.reassemblyKey = ["messageId"];
    expect(() => validateProtocolDefinition(model)).toThrow(/reassembly key/);
  });

  it("rejects Standard Frame CRC coverage drift", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    const contract = standardFrameContract(model);
    expect(contract).toBeDefined();
    if (!contract) return;
    contract.crc.coverage = "payload-only";
    expect(() => validateProtocolDefinition(model)).toThrow(/CRC coverage must be header\+payload/);
  });

  it("rejects effective max-frame formula drift", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    const contract = standardFrameContract(model);
    expect(contract).toBeDefined();
    if (!contract) return;
    contract.effectiveParameters.maxFrameSize.formula = "PayloadLength <= effectiveMaxFrameSize";
    expect(() => validateProtocolDefinition(model)).toThrow(/PayloadLength \+ 14 <= effectiveMaxFrameSize/);
  });

  it("rejects heartbeat ACK controlId drift", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    const contract = standardFrameContract(model);
    expect(contract).toBeDefined();
    if (!contract) return;
    contract.heartbeat.ack.controlId = "new-id";
    expect(() => validateProtocolDefinition(model)).toThrow(/HEARTBEAT_ACK must echo/);
  });

  it("rejects old capability method mask derivation names", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.schemas.push({
      name: "CapabilitySupportedMethodsResponse",
      kind: "object",
      fields: [{ fieldId: 0x01, name: "methodMasks", type: "bytes", required: true, derivedFrom: "methods.bitOffset" }]
    });
    expect(() => validateProtocolDefinition(model)).toThrow(/methods\[\]\.bitOffset/);
  });

  it("rejects non-Empty empty request or response types", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.schemas.push({ name: "AudioEmptyButNamedRequest", kind: "object", fields: [] });
    model.methods.find((method) => method.name === "audio.getAlgorithmConfig")!.request.type = "AudioEmptyButNamedRequest";
    expect(() => validateProtocolDefinition(model)).toThrow(/empty request must use Empty/);
  });

  it("rejects duplicate type field ids", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    const response = model.schemas.find((schema) => schema.name === "AudioSetAlgorithmConfigResponse")!;
    response.fields[1].fieldId = response.fields[0].fieldId;
    expect(() => validateProtocolDefinition(model)).toThrow(/duplicate fieldId/);
  });

  it("rejects error categories outside their code range", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.errors.find((error) => error.name === "FW_VERIFY_FAILED")!.category = "stream";
    expect(() => validateProtocolDefinition(model)).toThrow(/category must be firmware/);
  });

  it("rejects profile capabilities not defined by profile meta spec", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    (model.raw as any).profiles[0].requiredCapabilities = ["device.info"];
    expect(() => validateProtocolDefinition(model)).toThrow(/requiredCapabilities is not defined/);
  });

  it("rejects profile frame profiles not backed by transports", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.profiles.find((profile) => profile.name === "AXTP-MVP")!.frameProfiles.push("UNUSED_FRAME");
    model.frameProfiles.push({ name: "UNUSED_FRAME", l1: "STANDARD_L1", l2: "STANDARD_L2" });
    expect(() => validateProtocolDefinition(model)).toThrow(/not used by transportProfiles/);
  });

  it("rejects compact frame profiles in current protocol ir", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.frameProfiles.push({ name: "COMPACT_FRAME", l1: "COMPACT_L1", l2: "COMPACT_L2" });
    expect(() => validateProtocolDefinition(model)).toThrow(/COMPACT_FRAME/);
  });

  it("rejects invalid websocket unframed json transport capabilities", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    const transport = model.transports.find((item) => item.name === "AXTP-WS-JSON")!;
    transport.supportsStream = true;
    expect(() => validateProtocolDefinition(model)).toThrow(/must not support CONTROL or STREAM/);
  });

  it("rejects hid-64 profile references", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.profiles.find((profile) => profile.name === "AXTP-MVP-HID")!.transportProfiles = ["AXTP-HID-64"];
    expect(() => validateProtocolDefinition(model)).toThrow(/AXTP-USB-HID/);
  });

  it("rejects missing method type references", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    const method = model.methods.find((item) => item.name === "audio.setAlgorithmConfig")!;
    method.request.type = "MissingRequest";
    expect(() => validateProtocolDefinition(model)).toThrow(/missing type: MissingRequest/);
  });

  it("rejects missing method error references", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.methods.find((item) => item.name === "audio.setAlgorithmConfig")!.errors.push("MISSING_ERROR");
    expect(() => validateProtocolDefinition(model)).toThrow(/missing error: MISSING_ERROR/);
  });

  it("rejects missing method event references", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.methods.find((item) => item.name === "audio.setAlgorithmConfig")!.events.push("audio.missingEvent");
    expect(() => validateProtocolDefinition(model)).toThrow(/missing event: audio.missingEvent/);
  });

  it("rejects missing profile method references", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.profiles.find((item) => item.name === "AXTP-MVP")!.requiredMethods.push("missing.method");
    expect(() => validateProtocolDefinition(model)).toThrow(/missing method: missing.method/);
  });

  it("rejects missing profile event references", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.profiles.find((item) => item.name === "AXTP-MVP")!.requiredEvents.push("missing.event");
    expect(() => validateProtocolDefinition(model)).toThrow(/missing event: missing.event/);
  });

  it("rejects missing profile error references", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.profiles.find((item) => item.name === "AXTP-MVP")!.requiredErrors.push("MISSING_ERROR");
    expect(() => validateProtocolDefinition(model)).toThrow(/missing error: MISSING_ERROR/);
  });

  it("rejects missing profile transport references", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    model.profiles.find((item) => item.name === "AXTP-MVP")!.transportProfiles.push("AXTP-MISSING");
    expect(() => validateProtocolDefinition(model)).toThrow(/missing transport: AXTP-MISSING/);
  });

  it("rejects forbidden legacy protocol definition fields", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    (model.raw as any).methods[0].bitmapId = 1;
    expect(() => validateProtocolDefinition(model)).toThrow(/forbidden legacy Protocol Definition field: bitmapId/);

    const requestsModel = cloneModel(await loadCurrentProtocol());
    (requestsModel.raw as any).profiles[0].requests = ["legacy.request"];
    expect(() => validateProtocolDefinition(requestsModel)).toThrow(/forbidden legacy Protocol Definition field: requests/);

    const requiredRequestsModel = cloneModel(await loadCurrentProtocol());
    (requiredRequestsModel.raw as any).profiles[0].requiredRequests = ["legacy.request"];
    expect(() => validateProtocolDefinition(requiredRequestsModel)).toThrow(/forbidden legacy Protocol Definition field: requiredRequests/);
  });
});

describe("protocol docs consistency validator", () => {
  it("accepts the current protocol docs facts", async () => {
    const model = await loadCurrentProtocol();
    const docs = await loadProtocolDocs(repoRoot);
    expect(validateProtocolDocsConsistency(model, docs)).toContain("[OK] specs: STREAM header facts checked");
  });

  it("rejects missing stream header facts in docs", async () => {
    const model = await loadCurrentProtocol();
    const docs = await loadProtocolDocs(repoRoot);
    docs.coreSpec = docs.coreSpec.replace("cursor:uint64", "cursor:uint32");
    expect(() => validateProtocolDocsConsistency(model, docs)).toThrow(/cursor:uint64/);
  });

  it("rejects missing byte order facts in docs", async () => {
    const model = await loadCurrentProtocol();
    const docs = await loadProtocolDocs(repoRoot);
    docs.coreSpec = docs.coreSpec.replace(/Big-Endian/g, "Little-Endian");
    expect(() => validateProtocolDocsConsistency(model, docs)).toThrow(/Big-Endian/);
  });

  it("rejects missing A1 framing facts in docs", async () => {
    const model = await loadCurrentProtocol();
    const docs = await loadProtocolDocs(repoRoot);
    docs.coreSpec = docs.coreSpec.replace("PayloadLength + 14 <= effectiveMaxFrameSize", "PayloadLength <= maxFrameSize");
    expect(() => validateProtocolDocsConsistency(model, docs)).toThrow(/effectiveMaxFrameSize|PayloadLength \+ 14/);
  });

  it("rejects yaml that disagrees with docs facts", async () => {
    const model = cloneModel(await loadCurrentProtocol());
    const docs = await loadProtocolDocs(repoRoot);
    model.stream.header.fields[1].name = "seq";
    expect(() => validateProtocolDocsConsistency(model, docs)).toThrow(/legacy field: seq|seqId:uint32/);
  });
});

describe("protocol definition emitters", () => {
  it("generates stable protocol snapshots", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "axtp-protocol-out-"));
    try {
      const model = await loadCurrentProtocol();
      await emitProtocolDocs(model, dir);
      const json = await readFile(path.join(dir, "protocol.json"), "utf8");
      const markdown = await readFile(path.join(dir, "protocol.md"), "utf8");
      expect(json).toContain("\"byteOrder\": \"big-endian\"");
      expect(json).toContain("\"byteOrderAlias\": \"network\"");
      expect(json).toContain("\"supportsStream\": false");
      expect(json).toContain("\"supportsControl\": false");
      expect(json).toContain("\"algorithm\": \"CRC16-CCITT-FALSE\"");
      expect(json).toContain("\"formula\": \"PayloadLength + 14 <= effectiveMaxFrameSize\"");
      expect(markdown).toContain("## Main Table of Contents");
      expect(markdown).toContain("## Protocol Framework");
      expect(markdown).toContain("## Standard Frame Contract");
      expect(markdown).toContain("CRC16-CCITT-FALSE");
      expect(markdown).toContain("PayloadLength + 14 <= effectiveMaxFrameSize");
      expect(markdown).toContain("Wire Byte Order");
      expect(markdown).toContain("big-endian / network");
      expect(markdown).toContain("## Supported Connection Profiles");
      expect(markdown).toContain("AXTP-USB-HID");
      expect(markdown).toContain("AXTP-TCP");
      expect(markdown).toContain("AXTP-WS-JSON");
      expect(markdown).toContain("AXTP-WS-CLOUD-REVERSE");
      expect(markdown).toContain("Logical Server sends Hello");
      expect(markdown).not.toContain("AXTP-HID-64");
      expect(markdown).not.toContain("Compact Header");
      expect(markdown).toContain("## audio Methods");
      expect(markdown).toContain("### audio.setAlgorithmConfig");
      expect(markdown).toContain("#### Request Fields");
      expect(markdown).toContain("#### Response Fields");
      expect(markdown).toContain("#### Payload Fields");
      expect(markdown).toContain("## Implemented Domains");
      expect(markdown).toContain("### Methods in this domain");
      expect(markdown).toContain("# Errors Reference");
      expect(markdown).toContain("# Profiles Reference");
      expect(markdown).not.toContain("## Frame Profiles");
      expect(markdown).not.toContain("## Transport Profiles");
      expect(markdown).toContain("## Payload Types");
      expect(markdown).not.toContain("## Control Rules");
      expect(markdown).not.toContain("## Stream Transfer Model");
      expect(markdown).not.toContain("## Types Reference");
      await expect(json).toMatchFileSnapshot("./__snapshots__/protocol.generated.json");
      await expect(markdown).toMatchFileSnapshot("./__snapshots__/protocol.generated.md");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
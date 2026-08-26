import { describe, expect, it } from "vitest";
import type { ProtocolSourceModel } from "./sourceModel.js";
import type { CurrentVectorRecipe, VectorRecipeCatalog } from "./vectorRecipes.js";
import { crc16CcittFalse, deriveCurrentVector } from "./vectorEncoding.js";

function recipes(): VectorRecipeCatalog {
  return { schemaVersion: 1, currentCore: [], historical: [] };
}

function baseSource(): ProtocolSourceModel {
  return {
    specRoot: "/tmp/spec",
    config: {},
    version: {},
    protocolMeta: {
      protocol: { name: "AXTP", version: "1.0.0", specVersion: 1, registryVersion: "1.0.0" },
      wire: { byteOrder: "big-endian", crcByteOrder: "big-endian" },
      frameProfiles: [{ name: "STANDARD_FRAME", magic: "AX", l1: "STANDARD_L1", l2: "STANDARD_L2" }]
    },
    sourceFiles: [],
    profiles: [],
    vectorRecipes: recipes(),
    payloadTypes: [
      { id: 1, value: 1, name: "CONTROL", domain: "protocol", status: "mvp" },
      { id: 2, value: 2, name: "RPC", domain: "protocol", status: "mvp" },
      { id: 3, value: 3, name: "STREAM", domain: "protocol", status: "mvp" }
    ],
    controlOpcodes: [{ id: 1, value: 1, name: "OPEN", domain: "control", status: "mvp" }],
    rpcEncodings: [
      { id: 1, value: 1, name: "JSON", domain: "rpc", status: "mvp" },
      { id: 4, value: 4, name: "JSON_BINARY", domain: "rpc", status: "mvp" }
    ],
    rpcBodyEncodings: [
      { id: 0, value: 0, name: "NONE", domain: "rpc", status: "mvp" },
      { id: 1, value: 1, name: "TLV8", domain: "rpc", status: "mvp" }
    ],
    rpcOps: [
      { id: 6, value: 6, name: "EVENT", domain: "rpc", status: "mvp" },
      { id: 7, value: 7, name: "REQUEST", domain: "rpc", status: "mvp" }
    ],
    streamProfiles: [],
    domainRegistry: [],
    methods: [
      {
        id: 0x0901,
        name: "audio.getAlgorithmConfig",
        domain: "audio",
        status: "stable",
        bitOffset: 1,
        rpcOp: "request_response",
        requestSchema: "AudioGetAlgorithmConfigRequest",
        responseSchema: "AudioAlgorithmConfig",
        recommendedEncoding: ["tlv"],
        capabilities: [],
        events: [],
        errors: ["SUCCESS"]
      },
      {
        id: 0x0902,
        name: "audio.setAlgorithmConfig",
        domain: "audio",
        status: "stable",
        bitOffset: 2,
        rpcOp: "request_response",
        requestSchema: "AudioSetAlgorithmConfigRequest",
        responseSchema: "AudioSetAlgorithmConfigResponse",
        recommendedEncoding: ["tlv"],
        capabilities: [],
        events: ["audio.algorithmConfigChanged"],
        errors: ["SUCCESS"]
      }
    ],
    events: [{
      id: 0x0901,
      name: "audio.algorithmConfigChanged",
      domain: "audio",
      status: "stable",
      bitOffset: 0,
      eventSchema: "AudioAlgorithmConfigChangedEvent",
      trigger: ["audio.setAlgorithmConfig"],
      capabilities: []
    }],
    errors: [{ id: 0, name: "SUCCESS", domain: "common", status: "stable", retryable: false }],
    capabilities: [],
    legacyMappings: [],
    schemas: [
      { name: "AudioGetAlgorithmConfigRequest", type: "object", fields: [{ id: 1, name: "items", type: "array", required: false, deprecated: false }] },
      { name: "AudioSetAlgorithmConfigRequest", type: "object", fields: [{ id: 1, name: "config", type: "AudioAlgorithmConfig", required: true, deprecated: false }] },
      { name: "AudioAlgorithmConfig", type: "object", fields: [{ id: 1, name: "noiseSuppression", type: "AudioNoiseSuppressionConfig", required: false, deprecated: false }] },
      { name: "AudioNoiseSuppressionConfig", type: "object", fields: [{ id: 3, name: "level", type: "uint8", required: false, deprecated: false, min: 0, max: 3 }] },
      { name: "AudioSetAlgorithmConfigResponse", type: "object", fields: [] },
      { name: "AudioAlgorithmConfigChangedEvent", type: "object", fields: [] },
      {
        name: "ControlOpenBody",
        type: "object",
        fields: [
          { id: 4, name: "maxFrameSize", type: "uint16", required: true, deprecated: false },
          { id: 7, name: "supportedPayloadTypes", type: "bitmap", required: true, deprecated: false },
          { id: 8, name: "supportedRpcEncodings", type: "bitmap", required: true, deprecated: false },
          { id: 10, name: "heartbeatIntervalMs", type: "uint32", required: true, deprecated: false },
          { id: 11, name: "ackMode", type: "uint8", required: true, deprecated: false }
        ]
      }
    ],
    mvpProfile: { methods: [], events: [], errors: ["SUCCESS"], capabilities: [] }
  };
}

function frame(payloadType: string, messageId = 1) {
  return { payloadType, sourceId: 1, destinationId: 16, messageId, frameIndex: 0, frameCount: 1 };
}

describe("G4 authority-resolved vector encoder", () => {
  it("implements the CRC16-CCITT-FALSE known answer", () => {
    expect(crc16CcittFalse(new TextEncoder().encode("123456789"))).toBe(0x29b1);
  });

  it("resolves payload type ids from the active source model", () => {
    const source = baseSource();
    source.payloadTypes.find((item) => item.name === "STREAM")!.id = 0x13;
    const recipe: CurrentVectorRecipe = {
      id: "stream",
      classification: "current-core",
      authorityRules: ["STREAM.FRAME.001"],
      hexFile: "stream.hex",
      profile: "standard-framed",
      frame: frame("STREAM"),
      payload: { kind: "stream", streamId: 9, seqId: 1, cursor: 1, dataHex: "AABB" },
      expectDecode: { streamId: 9 }
    };

    expect(deriveCurrentVector(source, recipe).bytes[3]).toBe(0x13);
  });

  it("derives the current 15-byte JSON_BINARY fixed header by authority name", () => {
    const source = baseSource();
    source.rpcEncodings.find((item) => item.name === "JSON_BINARY")!.id = 0x0c;
    source.rpcOps.find((item) => item.name === "REQUEST")!.id = 0x0d;
    source.methods.find((item) => item.name === "audio.getAlgorithmConfig")!.id = 0x1701;
    const recipe: CurrentVectorRecipe = {
      id: "rpc_get",
      classification: "current-core",
      authorityRules: ["CORE.FRAME.001"],
      hexFile: "rpc_get.hex",
      profile: "standard-framed",
      frame: frame("RPC", 2),
      payload: {
        kind: "json-binary-request",
        sid: 0x12345678,
        requestId: 1,
        method: "audio.getAlgorithmConfig",
        bodyEncoding: "NONE"
      },
      expectDecode: { method: "audio.getAlgorithmConfig" }
    };

    const derived = deriveCurrentVector(source, recipe);
    const payloadLength = (derived.bytes[4] << 8) | derived.bytes[5];
    const payload = derived.bytes.slice(12, 12 + payloadLength);
    expect(payload).toEqual(Uint8Array.from([
      0x0c, 0x0d,
      0x12, 0x34, 0x56, 0x78,
      0x00, 0x00, 0x00, 0x01,
      0x17, 0x01,
      0x00, 0x00,
      0x00
    ]));
  });

  it("resolves nested TLV field ids from the active schema graph", () => {
    const source = baseSource();
    source.schemas.find((schema) => schema.name === "AudioNoiseSuppressionConfig")!.fields[0].id = 9;
    const recipe: CurrentVectorRecipe = {
      id: "rpc_set",
      classification: "current-core",
      authorityRules: ["CORE.FRAME.001"],
      hexFile: "rpc_set.hex",
      profile: "standard-framed",
      frame: frame("RPC", 3),
      payload: {
        kind: "json-binary-request",
        sid: 0x12345678,
        requestId: 2,
        method: "audio.setAlgorithmConfig",
        bodyEncoding: "TLV8",
        body: { config: { noiseSuppression: { level: 3 } } }
      },
      expectDecode: { method: "audio.setAlgorithmConfig", field: "noiseSuppression.level" }
    };

    const derived = deriveCurrentVector(source, recipe);
    const payloadLength = (derived.bytes[4] << 8) | derived.bytes[5];
    const payload = derived.bytes.slice(12, 12 + payloadLength);
    expect(payload.slice(15)).toEqual(Uint8Array.from([0x01, 0x05, 0x01, 0x03, 0x09, 0x01, 0x03]));
  });

  it("appends a CRC footer that validates the complete Standard Frame", () => {
    const source = baseSource();
    const recipe: CurrentVectorRecipe = {
      id: "stream_crc",
      classification: "current-core",
      authorityRules: ["CORE.FRAME.001", "STREAM.FRAME.001"],
      hexFile: "stream_crc.hex",
      profile: "standard-framed",
      frame: frame("STREAM", 5),
      payload: { kind: "stream", streamId: 9, seqId: 1, cursor: 1, dataHex: "AABBCCDD" },
      expectDecode: { streamId: 9 }
    };

    const bytes = deriveCurrentVector(source, recipe).bytes;
    const expected = crc16CcittFalse(bytes.slice(0, -2));
    const actual = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
    expect(actual).toBe(expected);
  });
});

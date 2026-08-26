import { describe, expect, it } from "vitest";
import { validateVectorRecipeCatalog } from "./vectorRecipes.js";

describe("vector recipe authority boundary", () => {
  it("rejects current-core recipes that carry final hex", () => {
    const value = {
      schemaVersion: 1,
      currentCore: [{
        id: "bad_current",
        classification: "current-core",
        authorityRules: ["CORE.FRAME.001"],
        hexFile: "bad.hex",
        hex: "4158"
      }],
      historical: []
    };

    expect(() => validateVectorRecipeCatalog(value as any)).toThrow(/current-core.*hex/i);
  });

  it("allows historical fixtures to preserve historicalHex", () => {
    const value = {
      schemaVersion: 1,
      currentCore: [],
      historical: [{
        id: "legacy_compact",
        classification: "historical-compatibility",
        reason: "legacy compact fixture",
        outputPath: "historical/compact/legacy.hex",
        historicalHex: "1211"
      }]
    };

    expect(() => validateVectorRecipeCatalog(value as any)).not.toThrow();
  });

  it("rejects historical fixtures outside the historical output tree", () => {
    const value = {
      schemaVersion: 1,
      currentCore: [],
      historical: [{
        id: "legacy_bad_path",
        classification: "historical-stale",
        reason: "pre-G4 stale bytes",
        outputPath: "legacy.hex",
        historicalHex: "4158"
      }]
    };

    expect(() => validateVectorRecipeCatalog(value as any)).toThrow(/historical.*output/i);
  });

  it("rejects duplicate ids across current and historical catalogs", () => {
    const value = {
      schemaVersion: 1,
      currentCore: [{
        id: "duplicate",
        classification: "current-core",
        authorityRules: ["CORE.FRAME.001"],
        hexFile: "duplicate.hex",
        profile: "standard-framed",
        frame: { payloadType: "STREAM", sourceId: 1, destinationId: 16, messageId: 1, frameIndex: 0, frameCount: 1 },
        payload: { kind: "stream", streamId: 9, seqId: 1, cursor: 1, dataHex: "AA" },
        expectDecode: { streamId: 9 }
      }],
      historical: [{
        id: "duplicate",
        classification: "historical-stale",
        reason: "old bytes",
        outputPath: "historical/pre-g4/duplicate.hex",
        historicalHex: "4158"
      }]
    };

    expect(() => validateVectorRecipeCatalog(value as any)).toThrow(/duplicate.*id/i);
  });
});

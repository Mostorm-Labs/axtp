import { describe, expect, it } from "vitest";
import type { ProtocolSourceModel } from "../sourceModel.js";
import type { ProtocolProjectionDelta } from "./protocolProjectionModel.js";
import { composeEffectiveProtocolSource } from "./protocolSourceComposer.js";

type ForbiddenProtocolProjectionDeltaKeys =
  | "methods"
  | "events"
  | "errors"
  | "capabilities"
  | "schemas"
  | "profiles"
  | "domainRegistry"
  | "protocolMeta";

type ForbiddenPresent = Extract<
  keyof ProtocolProjectionDelta,
  ForbiddenProtocolProjectionDeltaKeys
>;

const forbiddenProtocolFactSurfaceGuard: ForbiddenPresent extends never ? true : never = true;
void forbiddenProtocolFactSurfaceGuard;

function baseProtocol(): ProtocolSourceModel {
  return {
    specRoot: "/spec",
    version: { value: "1" },
    config: { mode: "test" },
    payloadTypes: [],
    controlOpcodes: [],
    rpcEncodings: [],
    rpcBodyEncodings: [],
    rpcOps: [],
    streamProfiles: [],
    domainRegistry: [{ highByte: 0x0e, domain: "network", status: "stable" }],
    methods: [],
    events: [],
    errors: [],
    capabilities: [],
    legacyMappings: [],
    schemas: [],
    mvpProfile: { methods: [], events: [], errors: [], capabilities: [] },
    protocolMeta: { name: "AXTP" },
    sourceFiles: ["contract/registry/domains/network/domain.yaml"],
    profiles: [{ name: "test-profile" }]
  };
}

function delta(): ProtocolProjectionDelta {
  return {
    kind: "SEMANTIC_BINDING_OVERLAY",
    version: 1,
    operationBindings: []
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  for (const item of Object.values(value as Record<string, unknown>)) {
    deepFreeze(item);
  }
  return value;
}

describe("ProtocolProjectionDelta hard boundary", () => {
  it("materializes only the authorized binding-overlay surface", () => {
    expect(Object.keys(delta()).sort()).toEqual([
      "kind",
      "operationBindings",
      "version"
    ]);
  });
});

describe("composeEffectiveProtocolSource", () => {
  it("attaches semanticProjection as a sidecar and preserves every Protocol fact surface by identity", () => {
    const base = baseProtocol();
    const projection = delta();
    const effective = composeEffectiveProtocolSource(base, projection);

    expect(effective.semanticProjection).toBe(projection);
    expect(effective.methods).toBe(base.methods);
    expect(effective.events).toBe(base.events);
    expect(effective.errors).toBe(base.errors);
    expect(effective.capabilities).toBe(base.capabilities);
    expect(effective.schemas).toBe(base.schemas);
    expect(effective.profiles).toBe(base.profiles);
    expect(effective.domainRegistry).toBe(base.domainRegistry);
    expect(effective.protocolMeta).toBe(base.protocolMeta);
    expect(effective.mvpProfile).toBe(base.mvpProfile);
    expect(effective.sourceFiles).toBe(base.sourceFiles);
  });

  it("composes successfully over a deeply frozen Base without mutating it", () => {
    const base = deepFreeze(baseProtocol());
    const before = structuredClone(base);
    const projection = delta();

    const effective = composeEffectiveProtocolSource(base, projection);

    expect(effective.semanticProjection).toBe(projection);
    expect(base).toEqual(before);
    expect(effective.methods).toBe(base.methods);
    expect(effective.protocolMeta).toBe(base.protocolMeta);
  });
});

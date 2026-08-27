import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildProtocolDefinitionRaw } from "./protocolBuilder.js";
import { loadProtocolSources } from "./sourceLoader.js";

const repoRoot = path.resolve("../..");

function rawMethods(raw: Record<string, unknown>): Array<Record<string, unknown>> {
  return raw.methods as Array<Record<string, unknown>>;
}

describe("A0 contract authority policy", () => {
  it("excludes draft registry facts from the default runtime Protocol IR", async () => {
    const sources = await loadProtocolSources(repoRoot);
    const draft = sources.methods.find((method) => method.status === "draft");
    expect(draft).toBeDefined();

    const raw = buildProtocolDefinitionRaw(sources);
    expect(rawMethods(raw).some((method) => method.name === draft!.name)).toBe(false);
  });

  it("normalizes legacy mvp and p1 lifecycle values", async () => {
    const sources = await loadProtocolSources(repoRoot);
    const mvp = sources.methods.find((method) => method.status === "mvp");
    const p1 = sources.methods.find((method) => method.status === "p1");
    expect(mvp).toBeDefined();
    expect(p1).toBeDefined();

    const raw = buildProtocolDefinitionRaw(sources);
    const runtimeMvp = rawMethods(raw).find((method) => method.name === mvp!.name);
    expect(runtimeMvp?.status).toBe("stable");
    expect(runtimeMvp?.maturity).toBe("mvp");

    expect(rawMethods(raw).some((method) => method.name === p1!.name)).toBe(false);
  });

  it("fails closed for an unknown registry status", async () => {
    const sources = await loadProtocolSources(repoRoot);
    const method = sources.methods[0];
    const original = method.status;
    method.status = "ga";

    try {
      expect(() => buildProtocolDefinitionRaw(sources)).toThrow(/unknown registry status/i);
    } finally {
      method.status = original;
    }
  });
});

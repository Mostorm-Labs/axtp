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
    const method = sources.methods[0];
    const original = method.status;

    try {
      method.status = "mvp";
      const mvpRaw = buildProtocolDefinitionRaw(sources);
      const runtimeMvp = rawMethods(mvpRaw).find((item) => item.name === method.name);
      expect(runtimeMvp?.status).toBe("stable");
      expect(runtimeMvp?.maturity).toBe("mvp");

      method.status = "p1";
      const p1Raw = buildProtocolDefinitionRaw(sources);
      expect(rawMethods(p1Raw).some((item) => item.name === method.name)).toBe(false);
    } finally {
      method.status = original;
    }
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

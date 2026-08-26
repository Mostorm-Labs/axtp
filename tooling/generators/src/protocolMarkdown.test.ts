import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderProtocolMarkdown } from "./emitters/protocolMarkdown.js";
import { loadProtocolDefinition } from "./protocolLoader.js";

const repoRoot = path.resolve("../..");

describe("protocol Markdown authority boundary", () => {
  it("does not embed independent numeric or layout protocol facts", async () => {
    const model = await loadProtocolDefinition(repoRoot);
    const markdown = renderProtocolMarkdown(model);

    expect(markdown).not.toMatch(/(?:Hello|Identify|Identified|REQUEST|REQUEST_RESPONSE|EVENT) \(op=\d+\)/);
    expect(markdown).not.toContain("12-byte Standard Frame header");

    for (const rule of model.control.rules) expect(markdown).toContain(rule);
    for (const rule of model.stream.rules) expect(markdown).toContain(rule);
    for (const rule of model.compatibility.rules) expect(markdown).toContain(rule);
  });
});

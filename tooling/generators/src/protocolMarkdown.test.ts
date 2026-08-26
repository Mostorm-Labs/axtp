import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderProtocolMarkdown } from "./emitters/protocolMarkdown.js";
import { loadProtocolDefinition } from "./protocolLoader.js";
import { loadProtocolProjectionFacts } from "./protocolProjectionFacts.js";

const repoRoot = path.resolve("../..");

describe("protocol Markdown authority boundary", () => {
  it("renders numeric/layout prose from derived projection facts", async () => {
    const model = await loadProtocolDefinition(repoRoot);
    const facts = await loadProtocolProjectionFacts(repoRoot);
    const markdown = renderProtocolMarkdown(model, facts);

    expect(markdown).toContain(`${facts.standardFrameHeaderBytes}-byte Standard Frame header`);
    expect(markdown).toContain(`Hello (op=${facts.rpcOps.HELLO})`);
    expect(markdown).toContain(`Identify (op=${facts.rpcOps.IDENTIFY})`);
    expect(markdown).toContain(`Identified (op=${facts.rpcOps.IDENTIFIED})`);
    expect(markdown).toContain(`REQUEST (op=${facts.rpcOps.REQUEST})`);
    expect(markdown).toContain(`REQUEST_RESPONSE (op=${facts.rpcOps.REQUEST_RESPONSE})`);
    expect(markdown).toContain(`EVENT (op=${facts.rpcOps.EVENT})`);

    const mutated = {
      standardFrameHeaderBytes: facts.standardFrameHeaderBytes + 1,
      rpcOps: { ...facts.rpcOps, HELLO: facts.rpcOps.HELLO + 16 }
    };
    const mutatedMarkdown = renderProtocolMarkdown(model, mutated);
    expect(mutatedMarkdown).toContain(`${mutated.standardFrameHeaderBytes}-byte Standard Frame header`);
    expect(mutatedMarkdown).toContain(`Hello (op=${mutated.rpcOps.HELLO})`);
    expect(mutatedMarkdown).not.toContain(`${facts.standardFrameHeaderBytes}-byte Standard Frame header`);
  });
});

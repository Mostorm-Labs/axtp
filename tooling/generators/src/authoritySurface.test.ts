import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

const repoRoot = path.resolve("../..");

async function readYaml(relativePath: string): Promise<any> {
  const text = await readFile(path.join(repoRoot, relativePath), "utf8");
  return YAML.parse(text);
}

describe("A0 authority surfaces", () => {
  it("keeps every AXTP v1 Core ACCEPT TLV optional", async () => {
    const source = await readYaml("contract/registry/schema/control_schema.yaml");
    const fields = source.schemas.ControlAcceptBody.fields as Array<{ name: string; required: boolean }>;

    expect(fields.length).toBeGreaterThan(0);
    expect(fields.filter((field) => field.required).map((field) => field.name)).toEqual([]);
  });

  it("keeps WebSocket pre-identify state errors out of the CONTROL layer", async () => {
    const testCase = await readYaml("conformance/cases/session/request_before_identified.yaml");
    const response = testCase.steps.find((step: any) => step.direction === "server_to_client");

    expect(response.expect.jsonrpc.d.status.code).toBe("INVALID_STATE");
    expect(response.expect.jsonrpc.d.status.code).not.toBe("CONTROL_OPEN_REQUIRED");
  });

  it("does not make STREAM a framed-binary minimum requirement", async () => {
    const manifest = await readYaml("conformance/manifest.yaml");
    const requiredCases = manifest.levels["framed-binary"].required_cases as string[];

    expect(requiredCases.some((id) => id.startsWith("stream."))).toBe(false);
    expect(manifest.levels.stream.required_cases.some((id: string) => id.startsWith("stream."))).toBe(true);
  });
});

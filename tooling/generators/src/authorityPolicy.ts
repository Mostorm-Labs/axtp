import { GeneratorError } from "./errors.js";

export type ContractStatus = "draft" | "experimental" | "stable" | "deprecated" | "reserved";
export type RoadmapMaturity = "mvp" | "p1" | "p2";

export interface NormalizedRegistryStatus {
  contractStatus: ContractStatus;
  maturity?: RoadmapMaturity;
}

export function normalizeRegistryStatus(status: string): NormalizedRegistryStatus {
  switch (status) {
    case "mvp":
      return { contractStatus: "stable", maturity: "mvp" };
    case "p1":
      return { contractStatus: "draft", maturity: "p1" };
    case "p2":
      return { contractStatus: "draft", maturity: "p2" };
    case "draft":
    case "experimental":
    case "stable":
    case "deprecated":
    case "reserved":
      return { contractStatus: status };
    default:
      throw new GeneratorError({
        code: "AXTP-GEN-1004",
        file: "contract/registry/**",
        field: "status",
        message: `unknown registry status: ${status}`
      });
  }
}

export function isDefaultRuntimeContract(status: ContractStatus): boolean {
  return status === "stable" || status === "deprecated";
}

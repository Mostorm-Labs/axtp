import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadProtocolDefinition } from "./protocolLoader.js";
import type { ProtocolModel } from "./protocolModel.js";
import { validateProtocolDefinition } from "./protocolValidator.js";

const repoRoot = path.resolve("../..");

function cloneModel(model: ProtocolModel): ProtocolModel {
  return structuredClone(model);
}

function standardFrameContract(model: ProtocolModel): any {
  return (model.frameProfiles.find((profile) => profile.name === "STANDARD_FRAME") as any)?.contract;
}

const driftCases: Array<{ name: string; mutate: (contract: any) => void }> = [
  { name: "header field type", mutate: (contract) => { contract.header.fields[4].type = "uint32"; } },
  { name: "footer field identity", mutate: (contract) => { contract.footer.field = "checksum"; } },
  { name: "sender frameIndex coverage", mutate: (contract) => { contract.fragmentation.sender.frameIndexCoverage = "arbitrary"; } },
  { name: "sender invariant field set", mutate: (contract) => { contract.fragmentation.sender.invariants = ["messageId"]; } },
  { name: "sender over-255 disposition", mutate: (contract) => { contract.fragmentation.sender.over255Disposition = "truncate"; } },
  { name: "reassembly context invariants", mutate: (contract) => { contract.fragmentation.contextInvariants = ["payloadType"]; } },
  { name: "reassembly receive order", mutate: (contract) => { contract.fragmentation.receiveOrder = "in-order-only"; } },
  { name: "reassembly payload order", mutate: (contract) => { contract.fragmentation.payloadOrder = "arrival-order"; } },
  { name: "MessageId wire type", mutate: (contract) => { contract.fragmentation.messageId.type = "uint8"; } },
  { name: "MessageId allocator ownership", mutate: (contract) => { contract.fragmentation.messageId.allocationOwner = "protocol"; } },
  { name: "MessageId active uniqueness", mutate: (contract) => { contract.fragmentation.messageId.activeUniqueness = "global"; } },
  { name: "MessageId reuse states", mutate: (contract) => { contract.fragmentation.messageId.reuseAfter = ["completed"]; } },
  { name: "identical-duplicate diagnostic", mutate: (contract) => { contract.fragmentation.duplicate.diagnostic = "RESOURCE_EXHAUSTED"; } },
  { name: "missing-fragment trigger", mutate: (contract) => { contract.fragmentation.missing.trigger = "timeout"; } },
  { name: "missing-fragment diagnostic", mutate: (contract) => { contract.fragmentation.missing.diagnostic = "FRAME_CRC_ERROR"; } },
  { name: "reassembly-timeout diagnostic", mutate: (contract) => { contract.fragmentation.timeout.diagnostic = "FRAME_FRAGMENT_MISSING"; } },
  { name: "resource-exhaustion diagnostic", mutate: (contract) => { contract.fragmentation.resources.exhaustionDiagnostic = "FRAME_TOO_LARGE"; } },
  { name: "parser validation set", mutate: (contract) => { contract.parser.validateBeforeDispatch = ["crc"]; } },
  { name: "byte-stream magic scanning", mutate: (contract) => { contract.parser.byteStream.scanMagic = false; } },
  { name: "incomplete-candidate handling", mutate: (contract) => { contract.parser.byteStream.incompleteCandidate = "resync"; } },
  { name: "trailing magic-prefix retention", mutate: (contract) => { contract.parser.byteStream.trailingMagicPrefixRetention = false; } },
  { name: "packet boundary discard semantics", mutate: (contract) => { contract.parser.packet.boundaryMayDiscardBadFrame = false; } },
  { name: "packet boundary validation semantics", mutate: (contract) => { contract.parser.packet.boundaryReplacesValidation = true; } },
  { name: "heartbeat sender semantics", mutate: (contract) => { contract.heartbeat.sender = "client-only"; } },
  { name: "heartbeat outstanding controlId uniqueness", mutate: (contract) => { contract.heartbeat.outstandingControlIdUnique = false; } },
  { name: "heartbeat allocator ownership", mutate: (contract) => { contract.heartbeat.allocatorOwner = "protocol"; } },
  { name: "heartbeat cadence source", mutate: (contract) => { contract.heartbeat.cadenceSource = "fixed-interval"; } }
];

describe("P23 Standard Frame fail-closed contract coverage", () => {
  it.each(driftCases)("rejects $name drift", async ({ mutate }) => {
    const model = cloneModel(await loadProtocolDefinition(repoRoot));
    const contract = standardFrameContract(model);
    expect(contract).toBeDefined();
    if (!contract) return;
    mutate(contract);
    expect(() => validateProtocolDefinition(model)).toThrow();
  });
});

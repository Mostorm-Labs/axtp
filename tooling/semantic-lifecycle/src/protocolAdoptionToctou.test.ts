// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolAdoptionGuard } from "./protocolAdoptionGuard.js";
import { FileProtocolAdoptionControlRepository } from "./fileProtocolAdoptionControlRepository.js";
import { FileProtocolAuthorityStore } from "./fileProtocolAuthorityStore.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("TOCTOU expected-head conflict fails closed", () => {
  const root = mkdtempSync(join(tmpdir(), "axtp-toctou-")); const c = new FileProtocolAdoptionControlRepository(join(root, "state")); const ref = { refType: "IMMUTABLE_REVISION" as const, namespace: "protocol-basis", subject: "c", revision: "a" }; c.openCase({ schemaVersion: 1, caseId: "c", operationId: "o", status: "OPEN", protocolBasisRef: ref, evidenceRefs: [{ refType: "EVIDENCE", id: "e" }] }); const guard = new ProtocolAdoptionGuard(c, new FileProtocolAuthorityStore()); assert.doesNotThrow(() => guard.finalize({ caseId: "c", operationId: "o", protocolBasisRef: ref, prospectivePayload: { x: 1 }, expectedHead: null, evidenceRefs: [{ refType: "EVIDENCE", id: "e" }] }));
});

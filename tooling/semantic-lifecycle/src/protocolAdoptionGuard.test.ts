// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { FileProtocolAdoptionControlRepository } from "./fileProtocolAdoptionControlRepository.js";
import { FileProtocolAuthorityStore } from "./fileProtocolAuthorityStore.js";
import { ProtocolAdoptionGuard } from "./protocolAdoptionGuard.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ref = { refType: "IMMUTABLE_REVISION" as const, namespace: "protocol-basis", subject: "case-1", revision: "a" };
const ev = [{ refType: "EVIDENCE" as const, id: "e" }];
test("guard finalizes exactly once and reconciliation is read-only", () => {
  const control = new FileProtocolAdoptionControlRepository(join(mkdtempSync(join(tmpdir(), "axtp-adoption-")), "state.json"));
  control.openCase({ schemaVersion: 1, caseId: "case-1", operationId: "op-1", status: "OPEN", protocolBasisRef: ref, evidenceRefs: ev });
  const protocol = new FileProtocolAuthorityStore();
  const guard = new ProtocolAdoptionGuard(control, protocol);
  const occurrence = guard.finalize({ caseId: "case-1", operationId: "op-1", protocolBasisRef: ref, prospectivePayload: { mode: "safe" }, expectedHead: null, evidenceRefs: ev });
  assert.equal(occurrence.operationId, "op-1");
  assert.equal(guard.reconcile("case-1", "op-1"), "APPLIED_EXACT");
  assert.throws(() => guard.finalize({ caseId: "case-1", operationId: "op-1", protocolBasisRef: ref, prospectivePayload: { mode: "safe" }, expectedHead: null, evidenceRefs: ev }), /CASE_NOT_OPEN|FINALIZATION_BUSY/);
});

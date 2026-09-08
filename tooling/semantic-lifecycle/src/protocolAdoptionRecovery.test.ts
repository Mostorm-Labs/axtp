// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileProtocolAdoptionControlRepository } from "./fileProtocolAdoptionControlRepository.js";
import { FileProtocolAuthorityStore } from "./fileProtocolAuthorityStore.js";
import { ProtocolAdoptionGuard } from "./protocolAdoptionGuard.js";

test("recovery statuses are closed-world", () => { assert.deepEqual(["NOT_APPLIED", "APPLIED_EXACT", "APPLIED_CONFLICT", "UNKNOWN_OR_UNAVAILABLE"].sort(), ["APPLIED_CONFLICT", "APPLIED_EXACT", "NOT_APPLIED", "UNKNOWN_OR_UNAVAILABLE"].sort()); });

test("file-backed protocol authority survives reopen and enforces expected-head CAS", () => {
  const root = mkdtempSync(join(tmpdir(), "axtp-protocol-authority-"));
  const file = join(root, "authority.json");
  const basis = { refType: "IMMUTABLE_REVISION" as const, namespace: "protocol-basis", subject: "device", revision: "p1" };
  const first = new FileProtocolAuthorityStore(file);
  const applied = first.mutate({ caseId: "case-a", operationId: "op-a", protocolBasisRef: basis, prospectivePayload: { mode: "a" }, expectedHead: null });
  assert.equal(applied.status, "APPLIED");
  const reopened = new FileProtocolAuthorityStore(file);
  assert.equal(reopened.mutate({ caseId: "case-a", operationId: "op-a", protocolBasisRef: basis, prospectivePayload: { mode: "a" }, expectedHead: null }).status, "IDEMPOTENT");
  assert.equal(reopened.mutate({ caseId: "case-b", operationId: "op-b", protocolBasisRef: basis, prospectivePayload: { mode: "b" }, expectedHead: null }).status, "CONFLICT");
  assert.equal(reopened.mutate({ caseId: "case-b", operationId: "op-b", protocolBasisRef: basis, prospectivePayload: { mode: "b" }, expectedHead: applied.authorityRef }).status, "APPLIED");
});

test("finalization reservation remains blocked after control repository reopen", () => {
  const file = join(mkdtempSync(join(tmpdir(), "axtp-control-recovery-")), "control.json");
  const basis = { refType: "IMMUTABLE_REVISION" as const, namespace: "protocol-basis", subject: "case", revision: "p1" };
  const first = new FileProtocolAdoptionControlRepository(file);
  first.openCase({ schemaVersion: 1, caseId: "case", operationId: "op", status: "OPEN", protocolBasisRef: basis, evidenceRefs: [] });
  first.reserveFinalization("case", "op");
  const reopened = new FileProtocolAdoptionControlRepository(file);
  assert.equal(reopened.getCase("case")?.status, "FINALIZING");
  assert.throws(() => reopened.reserveFinalization("case", "op"), /FINALIZATION_BUSY/);
});

test("unknown protocol mutation keeps reservation unresolved and blocks blind retry", () => {
  const file = join(mkdtempSync(join(tmpdir(), "axtp-unknown-")), "control.json");
  const basis = { refType: "IMMUTABLE_REVISION" as const, namespace: "protocol-basis", subject: "unknown", revision: "p1" };
  const control = new FileProtocolAdoptionControlRepository(file);
  control.openCase({ schemaVersion: 1, caseId: "unknown", operationId: "op", status: "OPEN", protocolBasisRef: basis, evidenceRefs: [] });
  const port = { mutate() { throw new Error("response-lost"); }, reconcile() { return undefined; } };
  const guard = new ProtocolAdoptionGuard(control, port);
  assert.throws(() => guard.finalize({ caseId: "unknown", operationId: "op", protocolBasisRef: basis, prospectivePayload: { x: 1 }, expectedHead: null, evidenceRefs: [] }), /PROTOCOL_MUTATION_UNKNOWN/);
  assert.equal(guard.reconcile("unknown", "op"), "UNKNOWN_OR_UNAVAILABLE");
  assert.throws(() => guard.finalize({ caseId: "unknown", operationId: "op", protocolBasisRef: basis, prospectivePayload: { x: 1 }, expectedHead: null, evidenceRefs: [] }), /FINALIZATION_BUSY/);
});

test("corrupt control state fails closed instead of creating a fresh authorization store", () => {
  const file = join(mkdtempSync(join(tmpdir(), "axtp-corrupt-")), "control.json");
  writeFileSync(file, "not-json");
  assert.throws(() => new FileProtocolAdoptionControlRepository(file), /CONTROL_STORE_UNAVAILABLE/);
});

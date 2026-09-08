// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { createProtocolAdoptionEvidence } from "./protocolAdoptionEvidence.js";
import { normalizeProtocolAdoptionCase, normalizeProtocolAdoptionOccurrence } from "./model.js";
test("adoption evidence requires exact source identity", () => { assert.throws(() => createProtocolAdoptionEvidence({ caseId: "", operationId: "o", sourceRef: "sha", sourceTree: "tree", testIds: [] })); });

test("protocol adoption records reject unknown status and return detached immutable records", () => {
  const ref = { refType: "IMMUTABLE_REVISION", namespace: "protocol-basis", subject: "case", revision: "p1" };
  assert.throws(() => normalizeProtocolAdoptionCase({ schemaVersion: 1, caseId: "case", operationId: "op", status: "UNKNOWN", protocolBasisRef: ref, evidenceRefs: [] }));
  const record = normalizeProtocolAdoptionCase({ schemaVersion: 1, caseId: "case", operationId: "op", status: "OPEN", protocolBasisRef: ref, evidenceRefs: [] });
  assert.equal(Object.isFrozen(record), true);
  const occurrence = normalizeProtocolAdoptionOccurrence({ schemaVersion: 1, occurrenceId: "occ", caseId: "case", operationId: "op", protocolBasisRef: ref, committedPayload: { x: 1 }, evidenceRefs: [] });
  assert.equal(Object.isFrozen(occurrence), true);
});

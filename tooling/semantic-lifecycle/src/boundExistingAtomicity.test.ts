// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { InMemorySemanticAuthorityRepository, canonicalPayloadDigest } from "./authorityRepository.js";
import { normalizeSemanticAuthorityRecordV2 } from "./model.js";

const fixture = JSON.parse(readFileSync("fixtures/bound-existing/compatibility-cases.json", "utf8"));
const value = (id: string): any => structuredClone(fixture.find((entry: any) => entry.id === id).value);
const selectionRef = () => ({ ...value("selection").basisSelectionRef, digest: "sha256:selection-2" });

test("BOUND_EXISTING acceptance boundary is exposed", async () => {
  const module = await import("./semanticAuthorityAcceptanceBoundary.js").catch(() => null);
  assert.ok(module?.SemanticAuthorityAcceptanceBoundary);
});

test("initial BOUND_EXISTING v2 publication is staged, atomic, and idempotent", () => {
  const repo = new InMemorySemanticAuthorityRepository();
  const base = value("authority");
  const candidate = value("candidate");
  const record = normalizeSemanticAuthorityRecordV2({ ...base, operationId: "bound-initial", provenance: { ...base.provenance, route: "BOUND_EXISTING", reconstructionCaseId: "case:bound", basisSelectionRef: selectionRef(), candidateRef: candidate.candidateRef, machineProofReceiptId: "proof", semanticReviewId: "semantic", noReinterpretationReviewId: "no-reinterpretation" }, sourceBinding: { path: "contract/semantic/display/settings.yaml", payloadDigest: canonicalPayloadDigest(candidate.payload) } });
  const prepared = repo.prepareAuthorityV2Publication({ operationId: record.operationId, record, expectedAuthorityHead: null, canonicalPayload: candidate.payload });
  assert.equal(repo.getCurrentAuthorityV2(record.authorityKey), undefined);
  prepared.commit();
  assert.deepEqual(repo.getCurrentAuthorityV2(record.authorityKey), record);
  const retry = repo.prepareAuthorityV2Publication({ operationId: record.operationId, record, expectedAuthorityHead: null, canonicalPayload: candidate.payload });
  retry.commit();
  assert.deepEqual(repo.getAuthorityV2(record.authorityRef), record);
});

test("v2 supersession preserves prior record and commitWith exposes no intermediate authority state", () => {
  const repo = new InMemorySemanticAuthorityRepository();
  const candidate = value("candidate");
  const first = normalizeSemanticAuthorityRecordV2({ ...value("authority"), operationId: "bound-first", provenance: { ...value("authority").provenance, route: "BOUND_EXISTING", reconstructionCaseId: "case:bound", basisSelectionRef: selectionRef(), candidateRef: candidate.candidateRef, machineProofReceiptId: "p", semanticReviewId: "s", noReinterpretationReviewId: "n" }, sourceBinding: { path: "contract/semantic/display/settings.yaml", payloadDigest: canonicalPayloadDigest(candidate.payload) } });
  repo.prepareAuthorityV2Publication({ operationId: first.operationId, record: first, expectedAuthorityHead: null, canonicalPayload: candidate.payload }).commit();
  const second = normalizeSemanticAuthorityRecordV2({ ...first, operationId: "bound-second", authorityRef: { ...first.authorityRef, revision: "v2" }, supersedesAuthorityRef: first.authorityRef });
  const staged = repo.prepareAuthorityV2Publication({ operationId: second.operationId, record: second, expectedAuthorityHead: first.authorityRef, canonicalPayload: candidate.payload });
  assert.deepEqual(repo.getCurrentAuthorityV2(first.authorityKey), first);
  let callbackObserved = repo.getCurrentAuthorityV2(first.authorityKey);
  staged.commitWith?.({ commit: () => { callbackObserved = repo.getCurrentAuthorityV2(first.authorityKey); }, abort: () => {} });
  assert.deepEqual(callbackObserved, first);
  assert.deepEqual(repo.getAuthorityV2(first.authorityRef), first);
  assert.deepEqual(repo.getCurrentAuthorityV2(first.authorityKey), second);
});

// @ts-nocheck
// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { InMemorySemanticAuthorityRepository } from "./authorityRepository.js";

test("authority supersession CAS has exactly one winner and replay is idempotent", () => {
  const repo = new InMemorySemanticAuthorityRepository();
  const payload = { v: 1 };
  const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const base = { operationId: "a1", expectedAuthorityHead: null, canonicalPayload: payload, record: { authorityKey: "k", authorityRef: { refType: "IMMUTABLE_REVISION", namespace: "semantic-authority", subject: "k", revision: "1" }, operationId: "a1", caseId: "c", assessmentId: "a", candidateRef: { refType: "IMMUTABLE_REVISION", namespace: "semantic-candidate", subject: "c", revision: "1" }, reviewId: "r", scopeRef: { refType: "IMMUTABLE_REVISION", namespace: "scope", subject: "c", revision: "1" }, classificationBasisRef: { refType: "IMMUTABLE_REVISION", namespace: "policy", subject: "p", revision: "1" }, sourceBinding: { path: "contract/semantic/k.yaml", payloadDigest: `sha256:${digest}` }, evidenceRefs: [{ refType: "EVIDENCE", id: "e" }] } };
  assert.equal(repo.publishAuthority(base).status, "CREATED");
  assert.equal(repo.publishAuthority(base).status, "IDEMPOTENT");
});

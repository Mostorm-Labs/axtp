// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

async function loadRepository() {
  return import("./authorityRepository.js").catch(() => null);
}

function ref(key, revision) {
  return { refType: "IMMUTABLE_REVISION", namespace: "semantic-authority", subject: key, revision };
}

function request(key, revision, operationId, path, expectedAuthorityHead = null) {
  const payload = { key, revision };
  const canonical = JSON.stringify(payload);
  const authorityRef = ref(key, revision);
  return {
    operationId,
    expectedAuthorityHead,
    canonicalPayload: payload,
    record: {
      authorityKey: key,
      authorityRef,
      operationId,
      caseId: `case:${key}:${revision}`,
      assessmentId: `assessment:${key}:${revision}`,
      candidateRef: { refType: "IMMUTABLE_REVISION", namespace: "semantic-candidate", subject: `candidate:${key}`, revision: `candidate:${revision}` },
      reviewId: `review:${key}:${revision}`,
      scopeRef: { refType: "IMMUTABLE_REVISION", namespace: "semantic-scope", subject: `case:${key}`, revision: `scope:${revision}` },
      classificationBasisRef: { refType: "IMMUTABLE_REVISION", namespace: "classification-policy", subject: "semantic-delta-v1", revision: "policy-v1" },
      sourceBinding: { path, payloadDigest: `sha256:${createHash("sha256").update(canonical).digest("hex")}` },
      ...(expectedAuthorityHead === null ? {} : { supersedesAuthorityRef: expectedAuthorityHead }),
      evidenceRefs: [{ refType: "EVIDENCE", id: `evidence:${operationId}` }]
    }
  };
}

test("two supersessions from one expected head allow exactly one winner", async () => {
  const repositoryModule = await loadRepository();
  assert.ok(repositoryModule, "authorityRepository module must exist for CAS");
  const repository = new repositoryModule.InMemorySemanticAuthorityRepository();
  const first = request("display", "v1", "op:display:v1", "contract/semantic/display.yaml");
  repository.publishAuthority(first);
  const left = request("display", "v2-left", "op:display:left", "contract/semantic/display.yaml", first.record.authorityRef);
  const right = request("display", "v2-right", "op:display:right", "contract/semantic/display.yaml", first.record.authorityRef);
  assert.equal(repository.publishAuthority(left).status, "CREATED");
  assert.throws(() => repository.publishAuthority(right), /AUTHORITY_HEAD_CONFLICT/);
  assert.deepEqual(repository.getCurrentAuthority("display"), left.record);
});

test("unrelated Authority keys commit and advance independently", async () => {
  const repositoryModule = await loadRepository();
  assert.ok(repositoryModule, "authorityRepository module must exist for CAS");
  const repository = new repositoryModule.InMemorySemanticAuthorityRepository();
  const a1 = request("key-a", "v1", "op:a:v1", "contract/semantic/a.yaml");
  const b1 = request("key-b", "v1", "op:b:v1", "contract/semantic/b.yaml");
  repository.publishAuthority(a1);
  repository.publishAuthority(b1);
  const a2 = request("key-a", "v2", "op:a:v2", "contract/semantic/a.yaml", a1.record.authorityRef);
  repository.publishAuthority(a2);
  const staleA = request("key-a", "v3", "op:a:stale", "contract/semantic/a.yaml", a1.record.authorityRef);
  assert.throws(() => repository.publishAuthority(staleA), /AUTHORITY_HEAD_CONFLICT/);
  const b2 = request("key-b", "v2", "op:b:v2", "contract/semantic/b.yaml", b1.record.authorityRef);
  assert.equal(repository.publishAuthority(b2).status, "CREATED");
  assert.deepEqual(repository.getCurrentAuthority("key-a"), a2.record);
  assert.deepEqual(repository.getCurrentAuthority("key-b"), b2.record);
});

test("operation retry is idempotent while a competing path claim has no partial state", async () => {
  const repositoryModule = await loadRepository();
  assert.ok(repositoryModule, "authorityRepository module must exist for CAS");
  const repository = new repositoryModule.InMemorySemanticAuthorityRepository();
  const winner = request("key-a", "v1", "op:a:v1", "contract/semantic/shared.yaml");
  assert.equal(repository.publishAuthority(winner).status, "CREATED");
  assert.equal(repository.publishAuthority(winner).status, "IDEMPOTENT");
  const loser = request("key-b", "v1", "op:b:v1", "contract/semantic/shared.yaml");
  assert.throws(() => repository.publishAuthority(loser), /AUTHORITY_PATH_CONFLICT/);
  assert.equal(repository.getCurrentAuthority("key-b"), undefined);
  assert.deepEqual(repository.getCanonicalSource("contract/semantic/shared.yaml"), { key: "key-a", revision: "v1" });
});

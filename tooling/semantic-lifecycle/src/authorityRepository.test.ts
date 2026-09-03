// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

async function loadRepository() {
  return import("./authorityRepository.js").catch(() => null);
}

function ref(key, revision) {
  return Object.freeze({
    refType: "IMMUTABLE_REVISION",
    namespace: "semantic-authority",
    subject: key,
    revision,
    digest: `sha256:${key}:${revision}`
  });
}

function payloadDigest(canonicalJson) {
  return `sha256:${createHash("sha256").update(canonicalJson).digest("hex")}`;
}

function mutation({
  operationId = "op:display:v1",
  key = "display.settings",
  revision = "authority-v1",
  path = "contract/semantic/display/settings.yaml",
  payload = { meaning: "v1" },
  canonicalPayload = '{"meaning":"v1"}',
  expectedAuthorityHead = null,
  supersedesAuthorityRef,
  overrides = {}
} = {}) {
  const authorityRef = ref(key, revision);
  return {
    operationId,
    expectedAuthorityHead,
    canonicalPayload: payload,
    record: {
      authorityKey: key,
      authorityRef,
      operationId,
      caseId: "case-1",
      assessmentId: "assessment-1",
      candidateRef: {
        refType: "IMMUTABLE_REVISION",
        namespace: "semantic-candidate",
        subject: "candidate-1",
        revision: `candidate-${revision}`
      },
      reviewId: `review:${revision}`,
      scopeRef: {
        refType: "IMMUTABLE_REVISION",
        namespace: "semantic-scope",
        subject: "case-1",
        revision: "scope-v1"
      },
      classificationBasisRef: {
        refType: "IMMUTABLE_REVISION",
        namespace: "classification-policy",
        subject: "semantic-delta-v1",
        revision: "policy-v1"
      },
      sourceBinding: { path, payloadDigest: payloadDigest(canonicalPayload) },
      ...(supersedesAuthorityRef === undefined ? {} : { supersedesAuthorityRef }),
      evidenceRefs: [{ refType: "EVIDENCE", id: `authority:${revision}` }],
      ...overrides
    }
  };
}

test("repository atomically publishes a complete Authority and retries the same operation idempotently", async () => {
  const repositoryModule = await loadRepository();
  assert.ok(repositoryModule, "authorityRepository module must exist");
  const repository = new repositoryModule.InMemorySemanticAuthorityRepository();
  const request = mutation();
  const created = repository.publishAuthority(request);
  assert.equal(created.status, "CREATED");
  assert.deepEqual(repository.getCurrentAuthority("display.settings"), request.record);
  assert.deepEqual(repository.getAuthority(request.record.authorityRef), request.record);
  assert.deepEqual(repository.getCanonicalSource("contract/semantic/display/settings.yaml"), { meaning: "v1" });
  assert.equal("payload" in repository.getAuthority(request.record.authorityRef), false);
  const retry = repository.publishAuthority(request);
  assert.equal(retry.status, "IDEMPOTENT");
  assert.deepEqual(retry.authority, created.authority);
});

test("operation ID collision and immutable Authority-ref collision fail without mutation", async () => {
  const repositoryModule = await loadRepository();
  assert.ok(repositoryModule, "authorityRepository module must exist");
  const repository = new repositoryModule.InMemorySemanticAuthorityRepository();
  const first = mutation();
  repository.publishAuthority(first);

  const operationCollision = mutation({
    payload: { meaning: "changed" },
    canonicalPayload: '{"meaning":"changed"}',
    overrides: { caseId: "case-changed" }
  });
  assert.throws(() => repository.publishAuthority(operationCollision), /AUTHORITY_OPERATION_CONFLICT/);
  assert.deepEqual(repository.getCurrentAuthority("display.settings"), first.record);
  assert.deepEqual(repository.getCanonicalSource(first.record.sourceBinding.path), { meaning: "v1" });

  const refCollision = mutation({
    operationId: "op:display:collision",
    expectedAuthorityHead: first.record.authorityRef,
    supersedesAuthorityRef: first.record.authorityRef,
    payload: { meaning: "other" },
    canonicalPayload: '{"meaning":"other"}',
    overrides: { caseId: "case-other" }
  });
  assert.throws(() => repository.publishAuthority(refCollision), /IMMUTABLE_AUTHORITY_CONFLICT/);
  assert.deepEqual(repository.getCurrentAuthority("display.settings"), first.record);
});

test("injected pre-publication failure leaves record, head, source, path owner, and receipt unpublished", async () => {
  const repositoryModule = await loadRepository();
  assert.ok(repositoryModule, "authorityRepository module must exist");
  let throwOnce = true;
  const repository = new repositoryModule.InMemorySemanticAuthorityRepository({
    beforePublish() {
      if (throwOnce) {
        throwOnce = false;
        throw new Error("INJECTED_BEFORE_PUBLISH");
      }
    }
  });
  const request = mutation();
  assert.throws(() => repository.publishAuthority(request), /INJECTED_BEFORE_PUBLISH/);
  assert.equal(repository.getCurrentAuthority("display.settings"), undefined);
  assert.equal(repository.getAuthority(request.record.authorityRef), undefined);
  assert.equal(repository.getCanonicalSource(request.record.sourceBinding.path), undefined);
  assert.equal(repository.publishAuthority(request).status, "CREATED");
});

test("supersession relocates the current path but keeps historical records and logical key", async () => {
  const repositoryModule = await loadRepository();
  assert.ok(repositoryModule, "authorityRepository module must exist");
  const repository = new repositoryModule.InMemorySemanticAuthorityRepository();
  const first = mutation();
  repository.publishAuthority(first);
  const second = mutation({
    operationId: "op:display:v2",
    revision: "authority-v2",
    path: "contract/semantic/relocated/display.yml",
    payload: { meaning: "v2" },
    canonicalPayload: '{"meaning":"v2"}',
    expectedAuthorityHead: first.record.authorityRef,
    supersedesAuthorityRef: first.record.authorityRef
  });
  repository.publishAuthority(second);
  assert.deepEqual(repository.getCurrentAuthority("display.settings"), second.record);
  assert.deepEqual(repository.getAuthority(first.record.authorityRef), first.record);
  assert.equal(repository.getCanonicalSource(first.record.sourceBinding.path), undefined);
  assert.deepEqual(repository.getCanonicalSource(second.record.sourceBinding.path), { meaning: "v2" });
});

test("current-head and canonical-path ownership conflicts are per-key and atomic", async () => {
  const repositoryModule = await loadRepository();
  assert.ok(repositoryModule, "authorityRepository module must exist");
  const repository = new repositoryModule.InMemorySemanticAuthorityRepository();
  const first = mutation();
  repository.publishAuthority(first);
  const secondInitial = mutation({ operationId: "op:display:second", revision: "authority-v2" });
  assert.throws(() => repository.publishAuthority(secondInitial), /AUTHORITY_HEAD_CONFLICT/);

  const pathCollision = mutation({
    operationId: "op:audio:v1",
    key: "audio.settings",
    revision: "authority-v1",
    path: first.record.sourceBinding.path,
    payload: { meaning: "audio" },
    canonicalPayload: '{"meaning":"audio"}'
  });
  assert.throws(() => repository.publishAuthority(pathCollision), /AUTHORITY_PATH_CONFLICT/);
  assert.equal(repository.getCurrentAuthority("audio.settings"), undefined);
  assert.deepEqual(repository.getCurrentAuthority("display.settings"), first.record);
});

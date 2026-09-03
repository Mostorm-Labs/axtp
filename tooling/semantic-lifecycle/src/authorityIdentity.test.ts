// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

async function loadIdentity() {
  return import("./authorityIdentity.js").catch(() => null);
}

const authorityRef = Object.freeze({
  refType: "IMMUTABLE_REVISION",
  namespace: "semantic-authority",
  subject: "display.settings",
  revision: "authority-v1",
  digest: "sha256:authority-v1"
});

test("explicit AuthorityKey remains stable while canonical path and repository locators change", async () => {
  const identity = await loadIdentity();
  assert.ok(identity, "authorityIdentity module must exist");
  assert.equal(identity.semanticAuthorityKeyFrom("display.settings"), "display.settings");
  assert.equal(identity.authorityRefFrom("display.settings", authorityRef).subject, "display.settings");
  assert.equal(identity.canonicalSemanticPathFrom("contract/semantic/display/settings.yaml"), "contract/semantic/display/settings.yaml");
  assert.equal(identity.canonicalSemanticPathFrom("contract/semantic/relocated/settings.yml"), "contract/semantic/relocated/settings.yml");
  assert.equal(identity.semanticAuthorityKeyFrom("display.settings"), "display.settings");
});

test("Authority ref identity is immutable and bound to the exact explicit key", async () => {
  const identity = await loadIdentity();
  assert.ok(identity, "authorityIdentity module must exist");
  assert.throws(() => identity.authorityRefFrom("display.settings", { ...authorityRef, namespace: "semantic-candidate" }), /INVALID_AUTHORITY_REF/);
  assert.throws(() => identity.authorityRefFrom("other.settings", authorityRef), /INVALID_AUTHORITY_REF/);
  assert.throws(() => identity.authorityRefFrom("display.settings", { ...authorityRef, revision: "HEAD" }), /INVALID_IMMUTABLE_REF/);
  assert.throws(() => identity.semanticAuthorityKeyFrom("  "), /INVALID_AUTHORITY_KEY/);
});

test("canonical Semantic Source paths are normalized independently and fail closed", async () => {
  const identity = await loadIdentity();
  assert.ok(identity, "authorityIdentity module must exist");
  assert.equal(identity.canonicalSemanticPathFrom("contract/semantic/display/./settings.yaml"), "contract/semantic/display/settings.yaml");
  for (const path of [
    "/contract/semantic/display.yaml",
    "C:\\contract\\semantic\\display.yaml",
    "contract/semantic/../protocol/display.yaml",
    "contract/protocol/display.yaml",
    "contract/semantic/.gitkeep",
    "contract/semantic/display.json"
  ]) {
    assert.throws(() => identity.canonicalSemanticPathFrom(path), /INVALID_CANONICAL_SEMANTIC_PATH/, path);
  }
});

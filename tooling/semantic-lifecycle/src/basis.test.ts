// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

async function loadBasis() {
  return import("./basis.js").catch(() => null);
}

const base = {
  refType: "IMMUTABLE_REVISION",
  namespace: "git",
  subject: "semantic-change-scope",
  revision: "3430bf85364358960bb9165f3d3fa13ae71eccff",
  digest: "sha256:scope-a"
};

test("immutable reference equality compares the complete canonical reference", async () => {
  const basis = await loadBasis();
  assert.ok(basis, "basis module must exist");
  const exact = basis.basisRefFrom(base);
  assert.equal(basis.equalBasisRef(exact, basis.basisRefFrom({ ...base })), true);
  for (const variant of [
    { ...base, namespace: "protocol" },
    { ...base, subject: "other-scope" },
    { ...base, revision: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
    { ...base, digest: "sha256:scope-b" },
    { refType: base.refType, namespace: base.namespace, subject: base.subject, revision: base.revision }
  ]) {
    assert.equal(basis.equalBasisRef(exact, basis.basisRefFrom(variant)), false);
  }
});

test("mutable locators and incomplete values cannot be converted into BasisRef", async () => {
  const basis = await loadBasis();
  assert.ok(basis, "basis module must exist");
  for (const invalid of [
    { refType: "MUTABLE_LOCATOR", namespace: "git", subject: "scope", revision: "HEAD" },
    { refType: "IMMUTABLE_REVISION", namespace: "git", subject: "scope", revision: "HEAD" },
    { refType: "IMMUTABLE_REVISION", namespace: "git", subject: "scope", revision: "main" },
    { refType: "IMMUTABLE_REVISION", namespace: "", subject: "scope", revision: "abc123" },
    { refType: "IMMUTABLE_REVISION", namespace: "git", subject: "", revision: "abc123" },
    { refType: "IMMUTABLE_REVISION", namespace: "git", subject: "scope", revision: "" }
  ]) {
    assert.throws(() => basis.basisRefFrom(invalid));
  }
});

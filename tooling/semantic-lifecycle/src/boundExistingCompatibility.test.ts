// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as model from "./model.js";
import { InMemorySemanticCandidateStore } from "./candidateStore.js";
import { InMemoryLifecycleControlStore } from "./controlStore.js";
import { InMemorySemanticAuthorityRepository, canonicalPayloadDigest } from "./authorityRepository.js";
import { evaluateReviewFreshness } from "./review.js";

const fixture = JSON.parse(readFileSync("fixtures/bound-existing/compatibility-cases.json", "utf8"));
const value = (id) => structuredClone(fixture.find((entry) => entry.id === id).value);
const normalizers = {
  protocol: "normalizeAdoptedProtocolBasis",
  migration: "normalizeMigrationBasisRecord",
  selection: "normalizeBoundExistingBasisSelection",
  case: "normalizeBoundExistingReconstructionCase",
  candidate: "normalizeSemanticCandidateRecordV2",
  review: "normalizeHumanReviewDecisionV2",
  authority: "normalizeSemanticAuthorityRecordV2",
  proof: "normalizeBoundExistingMachineProofReceipt",
  determination: "normalizeBoundExistingIncompatibilityDetermination",
  fallback: "normalizeBoundExistingFallbackLink"
};
const normalize = (id, input = value(id)) => {
  assert.equal(typeof model[normalizers[id]], "function", normalizers[id]);
  return model[normalizers[id]](input);
};
function frozen(value) {
  if (value !== null && typeof value === "object") {
    assert.ok(Object.isFrozen(value));
    for (const child of Object.values(value)) frozen(child);
  }
}

test("legacy Candidate, Review and Authority exercise real v1 APIs without durable rewriting or BOUND authorization", () => {
  // Historical fixture values remain untouched; valid evidence/digest are supplied to the real v1 APIs.
  const candidate = value("legacy-candidate");
  const review = { ...value("legacy-review"), evidenceRefs: [{ refType: "EVIDENCE", id: "review:historical" }] };
  const authority = { ...value("legacy-authority"),
    sourceBinding: { path: "contract/semantic/display/settings.yaml", payloadDigest: canonicalPayloadDigest(candidate.payload) },
    evidenceRefs: [{ refType: "EVIDENCE", id: "authority:historical" }] };
  const originals = structuredClone([candidate, review, authority]);
  const candidates = new InMemorySemanticCandidateStore();
  const controls = new InMemoryLifecycleControlStore();
  const authorities = new InMemorySemanticAuthorityRepository();
  assert.equal(candidates.putCandidate(candidate), "CREATED");
  const storedCandidate = candidates.getCandidate(candidate.candidateRef);
  assert.deepEqual(evaluateReviewFreshness(review, storedCandidate), { eligible: true, reason: "ELIGIBLE" });
  assert.equal(controls.putReviewDecision(review), "CREATED");
  assert.equal(authorities.publishAuthority({ operationId: authority.operationId, record: authority,
    expectedAuthorityHead: null, canonicalPayload: candidate.payload }).status, "CREATED");
  const stored = [storedCandidate, controls.getReviewDecision(review.reviewId), authorities.getAuthority(authority.authorityRef)];
  assert.deepEqual(stored, originals);
  assert.deepEqual(JSON.parse(JSON.stringify(stored)), originals);
  assert.deepEqual(authorities.getCurrentAuthority(authority.authorityKey), authority);
  assert.deepEqual(authorities.getCanonicalSource(authority.sourceBinding.path), candidate.payload);
  for (const [index, id] of ["candidate", "review", "authority"].entries()) {
    assert.equal(Object.hasOwn(stored[index], "schemaVersion"), false);
    assert.equal(Object.hasOwn(stored[index], "provenance"), false);
    assert.throws(() => normalize(id, stored[index]), /UNKNOWN_SCHEMA_VERSION/);
  }
  assert.deepEqual([candidate, review, authority], originals);
});

for (const id of Object.keys(normalizers)) {
  test(`P12 ${id} accepts its exact canonical shape and returns a detached frozen record`, () => {
    const input = value(id);
    const original = structuredClone(input);
    const output = normalize(id, input);
    const expected = structuredClone(input);
    if (expected.evidenceRefs) expected.evidenceRefs.reverse();
    if (expected.adoptionEvidenceRefs) expected.adoptionEvidenceRefs.reverse();
    if (expected.protocolBasis) expected.protocolBasis.adoptionEvidenceRefs.reverse();
    if (expected.ruleIds) expected.ruleIds = ["a", "z"];
    assert.deepEqual(output, expected);
    assert.notEqual(output, input);
    frozen(output);
    assert.deepEqual(input, original);
    if (output.payload) {
      assert.deepEqual(Object.keys(output.payload), ["a", "z"]);
      assert.deepEqual(output.payload.z, [2, 1, null]);
    }
  });
}

test("route-specific Candidate, Review and Authority provenance is nested and mutually exclusive", () => {
  const candidate = value("candidate");
  const legacy = value("legacy-candidate");
  const semantic = { route: "SEMANTIC_FIRST", caseId: legacy.caseId, assessmentId: legacy.assessmentId,
    scopeRef: legacy.scopeRef, classificationBasisRef: legacy.classificationBasisRef };
  assert.deepEqual(normalize("candidate", { ...candidate, provenance: semantic }).provenance, semantic);
  const reviewProvenance = { route: "SEMANTIC_FIRST", scopeRef: legacy.scopeRef, classificationBasisRef: legacy.classificationBasisRef };
  assert.deepEqual(normalize("review", { ...value("review"), provenance: reviewProvenance }).provenance, reviewProvenance);
  const authorityProvenance = { ...semantic, candidateRef: legacy.candidateRef, reviewId: "review:legacy" };
  assert.deepEqual(normalize("authority", { ...value("authority"), provenance: authorityProvenance }).provenance, authorityProvenance);
  assert.equal(normalize("review", { ...value("review"), reviewKind: "NO_REINTERPRETATION" }).reviewKind, "NO_REINTERPRETATION");
  assert.throws(() => normalize("review", { ...value("review"), reviewKind: "NO_REINTERPRETATION", provenance: reviewProvenance }));
  for (const id of ["candidate", "review", "authority"]) {
    for (const field of ["caseId", "assessmentId", "scopeRef", "classificationBasisRef"]) {
      const input = value(id);
      assert.throws(() => normalize(id, { ...input, [field]: legacy[field] }), field);
      assert.throws(() => normalize(id, { ...input, provenance: { ...input.provenance, [field]: legacy[field] } }), field);
    }
    assert.throws(() => normalize(id, { ...value(id), provenance: { ...semantic, reconstructionCaseId: "case:bound" } }));
  }
});

test("terminal reconstruction states require exactly their own terminal linkage", () => {
  const open = value("case");
  const authorityRef = value("authority").authorityRef;
  for (const status of ["OPEN", "CANCELLED", "INCOMPATIBLE", "AUTHORITY_ACCEPTED"]) {
    const input = { ...open, status,
      ...(status === "INCOMPATIBLE" ? { incompatibilityDeterminationId: "determination:bound" } : {}),
      ...(status === "AUTHORITY_ACCEPTED" ? { authorityRef } : {}) };
    assert.equal(normalize("case", input).status, status);
    for (const field of ["authorityRef", "incompatibilityDeterminationId"]) {
      const invalid = { ...input };
      if (Object.hasOwn(invalid, field)) delete invalid[field];
      else invalid[field] = field === "authorityRef" ? authorityRef : "determination:bound";
      assert.throws(() => normalize("case", invalid), status + ":" + field);
    }
  }
});

test("P12 unknown versions and discriminators fail closed, including proofKind with a valid PASS", () => {
  for (const id of Object.keys(normalizers).filter((id) => id !== "protocol")) {
    for (const version of [undefined, null, 0, 3, 99]) {
      assert.throws(() => normalize(id, { ...value(id), schemaVersion: version }), /UNKNOWN_SCHEMA_VERSION/);
    }
  }
  for (const [id, field] of [["case", "status"], ["proof", "proofKind"], ["proof", "verdict"],
    ["review", "reviewKind"], ["review", "verdict"], ["review", "decisionSource"], ["determination", "outcome"]]) {
    assert.throws(() => normalize(id, { ...value(id), [field]: "UNKNOWN" }));
  }
  for (const id of ["candidate", "review", "authority"]) {
    assert.throws(() => normalize(id, { ...value(id), provenance: { ...value(id).provenance, route: "UNKNOWN" } }), /UNKNOWN_ROUTE/);
  }
});

test("all mandatory fields and canonical authorization flags fail closed", () => {
  for (const id of Object.keys(normalizers)) {
    const input = value(id);
    for (const field of Object.keys(input).filter((field) => !field.startsWith("supersedes"))) {
      const incomplete = { ...input };
      delete incomplete[field];
      assert.throws(() => normalize(id, incomplete), id + ":" + field);
    }
    for (const field of ["eligible", "approved", "current", "fresh", "ready", "currentCandidateRef", "protocolMutation", "timestamp"]) {
      assert.throws(() => normalize(id, { ...input, [field]: true }), id + ":" + field);
    }
  }
  for (const id of ["candidate", "review", "authority"]) {
    for (const field of Object.keys(value(id).provenance)) {
      const input = value(id);
      delete input.provenance[field];
      assert.throws(() => normalize(id, input), id + ":provenance." + field);
    }
  }
});

test("refs enforce namespaces, subjects, exact backward links and immutable locator validation", () => {
  for (const [id, field, owner] of [["migration", "migrationBasisRef", "migrationBasisId"],
    ["selection", "basisSelectionRef", "reconstructionCaseId"], ["candidate", "candidateRef", "candidateId"],
    ["authority", "authorityRef", "authorityKey"]]) {
    const input = value(id);
    for (const change of [{ namespace: "wrong" }, { subject: "wrong" }, { revision: "HEAD" },
      { revision: "refs/heads/branch" }, { revision: "PR#12" }, { digest: null }, { digest: "" }]) {
      assert.throws(() => normalize(id, { ...input, [field]: { ...input[field], ...change } }), id + ":" + JSON.stringify(change));
    }
    assert.equal(normalize(id)[field].subject, input[owner]);
  }
  for (const id of ["case", "proof", "determination", "selection"]) {
    assert.throws(() => normalize(id, { ...value(id), basisSelectionRef: { ...value("selection").basisSelectionRef, subject: "other-case" } }));
  }
  for (const id of ["candidate", "review", "authority"]) {
    const input = value(id);
    input.provenance.basisSelectionRef.subject = "other-case";
    assert.throws(() => normalize(id, input));
  }
  for (const [id, field, current] of [["selection", "supersedesBasisSelectionRef", "basisSelectionRef"],
    ["candidate", "supersedesCandidateRef", "candidateRef"], ["authority", "supersedesAuthorityRef", "authorityRef"]]) {
    const input = value(id);
    delete input[field];
    assert.equal(Object.hasOwn(normalize(id, input), field), false);
    for (const predecessor of [null, undefined, input[current], { ...input[current], subject: "wrong" }]) {
      assert.throws(() => normalize(id, { ...input, [field]: predecessor }));
    }
    const previous = { ...input[current], revision: "prior", digest: "sha256:prior" };
    assert.deepEqual(normalize(id, { ...input, [field]: previous })[field], previous);
  }
});

test("incompatibility may bind a Candidate and fallback retains the exact determination ID", () => {
  const input = value("determination");
  assert.equal(Object.hasOwn(normalize("determination"), "candidateRef"), false);
  const candidateRef = value("candidate").candidateRef;
  assert.deepEqual(normalize("determination", { ...input, candidateRef }).candidateRef, candidateRef);
  for (const candidateRef of [null, undefined, { ...value("candidate").candidateRef, namespace: "wrong" }]) {
    assert.throws(() => normalize("determination", { ...input, candidateRef }));
  }
  assert.equal(normalize("fallback").incompatibilityDeterminationId, "determination:bound");
  assert.throws(() => normalize("fallback", { ...value("fallback"), semanticChangeCaseId: "case:bound" }));
});

test("set-like evidence and rule IDs canonicalize, reject duplicates, and preserve diagnostics sequence", () => {
  for (const id of Object.keys(normalizers).filter((id) => id !== "protocol")) {
    const input = value(id);
    input.evidenceRefs.push(structuredClone(input.evidenceRefs[0]));
    assert.throws(() => normalize(id, input), id);
  }
  const protocol = value("protocol");
  protocol.adoptionEvidenceRefs.push(structuredClone(protocol.adoptionEvidenceRefs[0]));
  assert.throws(() => normalize("protocol", protocol));
  assert.throws(() => normalize("proof", { ...value("proof"), ruleIds: ["a", "a"] }));
  const output = normalize("proof", { ...value("proof"), evidenceRefs: [
    { refType: "EVIDENCE", id: "same", digest: "z" }, { refType: "EVIDENCE", id: "same" },
    { refType: "EVIDENCE", id: "same", digest: "a" }] });
  assert.deepEqual(output.evidenceRefs.map((entry) => entry.digest), [undefined, "a", "z"]);
  assert.deepEqual(output.diagnostics, ["second", "first"]);
});

test("malformed JSON, inherited fields and accessor/non-enumerable values cannot change validated canonical output", () => {
  for (const id of Object.keys(normalizers)) {
    assert.throws(() => normalize(id, Object.create(value(id))));
    const nonEnumerable = value(id);
    const field = Object.keys(nonEnumerable)[0];
    Object.defineProperty(nonEnumerable, field, { enumerable: false });
    assert.throws(() => normalize(id, nonEnumerable));
    const accessor = value(id);
    Object.defineProperty(accessor, field, { enumerable: true, get: () => value(id)[field] });
    assert.throws(() => normalize(id, accessor));
  }
  const cycle = {}; cycle.self = cycle;
  for (const payload of [{ a: undefined }, { a: NaN }, { a: Infinity }, { a: new Date() }, { a: 1n },
    { a: () => 1 }, { a: new Array(2) }, Object.create({ a: 1 }), cycle]) {
    for (const id of ["candidate", "migration"]) assert.throws(() => normalize(id, { ...value(id), payload }));
  }
  const payload = JSON.parse('{"__proto__":{"safe":true},"constructor":"data","z":null}');
  const output = normalize("candidate", { ...value("candidate"), payload });
  assert.equal(Object.getPrototypeOf(output.payload), Object.prototype);
  assert.equal(Object.hasOwn(output.payload, "__proto__"), true);
  assert.deepEqual(JSON.parse(JSON.stringify(output.payload)), payload);
  assert.throws(() => normalize("authority", { ...value("authority"), sourceBinding: { path: "../bad.yaml", payloadDigest: "digest" } }));
});

test("canonical immutable refs retain optional digest while ordering object keys lexicographically", () => {
  const input = value("candidate");
  input.candidateRef.digest = "sha256:exact";
  const ref = normalize("candidate", input).candidateRef;
  assert.deepEqual(Object.keys(ref), ["digest", "namespace", "refType", "revision", "subject"]);
  assert.equal(ref.digest, "sha256:exact");
});

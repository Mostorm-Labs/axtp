import test from "node:test";
import assert from "node:assert/strict";
import { validateConsumerEvidenceDocument } from "./validate-consumer-evidence.mjs";

function baseDocument() {
  return {
    schemaVersion: 1,
    consumers: [
      {
        repository: "Mostorm-Labs/example-runtime",
        kind: "runtime",
        adoptionStatus: "unverified"
      }
    ]
  };
}

test("accepts evidence-free unverified consumer", () => {
  assert.deepEqual(validateConsumerEvidenceDocument(baseDocument()), []);
});

test("rejects duplicate consumer repositories", () => {
  const value = baseDocument();
  value.consumers.push(structuredClone(value.consumers[0]));
  assert.match(validateConsumerEvidenceDocument(value).join("\n"), /duplicate consumer repository/i);
});

test("rejects PASS without exact external evidence", () => {
  const value = baseDocument();
  value.consumers[0].adoptionStatus = "pass";
  assert.match(validateConsumerEvidenceDocument(value).join("\n"), /pass.*requires/i);
});

test("accepts PASS with exact lock implementation profile and CI evidence", () => {
  const value = baseDocument();
  value.consumers[0] = {
    repository: "Mostorm-Labs/example-runtime",
    kind: "runtime",
    adoptionStatus: "pass",
    specLock: {
      tag: "spec/v0.15.0",
      commit: "1bf9e89ede12470e20733d4cea4e50edad989528"
    },
    implementation: {
      version: "v0.15.0.0",
      commit: "0123456789abcdef0123456789abcdef01234567"
    },
    declaredProfiles: ["AXTP-TCP"],
    conformance: {
      status: "pass",
      run: {
        repository: "Mostorm-Labs/example-runtime",
        id: 12345,
        url: "https://github.com/Mostorm-Labs/example-runtime/actions/runs/12345",
        commit: "0123456789abcdef0123456789abcdef01234567"
      }
    },
    verifiedAt: "2026-08-26T14:30:00Z"
  };
  assert.deepEqual(validateConsumerEvidenceDocument(value), []);
});

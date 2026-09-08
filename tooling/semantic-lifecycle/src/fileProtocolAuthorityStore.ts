// @ts-nocheck
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { basisRefFrom, equalBasisRef } from "./basis.js";

/** Crash-durable Protocol Authority writer with expected-head CAS. */
export class FileProtocolAuthorityStore {
  constructor(file) { this.file = file; this.state = this.read(); }
  mutate(request) {
    const normalized = normalizeRequest(request);
    const prior = this.state.operations[normalized.operationId];
    const canonical = stableJson(normalized);
    if (prior) return prior.canonical === canonical ? { status: "IDEMPOTENT", authorityRef: prior.authorityRef } : { status: "CONFLICT", reason: "OPERATION_CONFLICT" };
    const subject = normalized.protocolBasisRef.subject;
    const current = this.state.heads[subject];
    if (normalized.expectedHead === null ? current : !current || !equalBasisRef(current, normalized.expectedHead)) return { status: "CONFLICT", reason: "EXPECTED_HEAD_CONFLICT" };
    const existing = this.state.cases[normalized.caseId];
    if (existing && existing.operationId !== normalized.operationId) return { status: "CONFLICT", reason: "CASE_ALREADY_ADOPTED" };
    const authorityRef = Object.freeze({ refType: "IMMUTABLE_REVISION", namespace: "protocol-authority", subject, revision: normalized.operationId });
    this.write({ ...this.state, heads: { ...this.state.heads, [subject]: authorityRef }, cases: { ...this.state.cases, [normalized.caseId]: normalized }, operations: { ...this.state.operations, [normalized.operationId]: { canonical, authorityRef } } });
    return { status: "APPLIED", authorityRef };
  }
  reconcile(caseId, operationId) { const entry = this.state.cases[caseId]; if (!entry) return undefined; if (entry.operationId !== operationId) return { status: "CONFLICT", reason: "OPERATION_CONFLICT" }; const op = this.state.operations[operationId]; return op ? { status: "IDEMPOTENT", authorityRef: op.authorityRef } : undefined; }
  read() { if (!this.file || !existsSync(this.file)) return { version: 1, heads: {}, cases: {}, operations: {} }; try { const value = JSON.parse(readFileSync(this.file, "utf8")); if (value?.version !== 1) throw new Error(); return value; } catch { throw new Error("PROTOCOL_AUTHORITY_STORE_UNAVAILABLE"); } }
  write(next) { this.state = next; if (!this.file) return; mkdirSync(dirname(this.file), { recursive: true }); const temp = `${this.file}.${process.pid}.${Date.now()}.tmp`; writeFileSync(temp, `${JSON.stringify(next)}\n`, { mode: 0o600 }); const fd = openSync(temp, "r"); try { fsyncSync(fd); } finally { closeSync(fd); } renameSync(temp, this.file); const dir = openSync(dirname(this.file), "r"); try { fsyncSync(dir); } finally { closeSync(dir); } }
}
function normalizeRequest(request) { if (!request || typeof request !== "object") throw new Error("INVALID_PROTOCOL_MUTATION"); const operationId = text(request.operationId, "operationId"); const caseId = text(request.caseId, "caseId"); const protocolBasisRef = basisRefFrom(request.protocolBasisRef); const expectedHead = request.expectedHead === null ? null : basisRefFrom(request.expectedHead); if (request.prospectivePayload === undefined) throw new Error("INVALID_PROSPECTIVE_PAYLOAD"); return { caseId, operationId, protocolBasisRef, prospectivePayload: request.prospectivePayload, expectedHead }; }
function text(value, field) { if (typeof value !== "string" || !value.trim()) throw new Error(`INVALID_PROTOCOL_MUTATION:${field}`); return value; }
function stableJson(value) { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`; return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(",")}}`; }

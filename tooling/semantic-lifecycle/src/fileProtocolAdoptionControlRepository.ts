// @ts-nocheck
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { normalizeProtocolAdoptionCase, normalizeProtocolAdoptionOccurrence, type ProtocolAdoptionCase, type ProtocolAdoptionOccurrence } from "./model.js";
import type { ProtocolAdoptionControlRepository } from "./protocolAdoptionControlRepository.js";

export class FileProtocolAdoptionControlRepository implements ProtocolAdoptionControlRepository {
  constructor(private readonly file: string) { mkdirSync(dirname(file), { recursive: true }); this.read(); }
  getCase(caseId: string): ProtocolAdoptionCase | undefined { const state = this.read(); const record = state.cases[caseId]; return record ? normalizeProtocolAdoptionCase(structuredClone(record)) : undefined; }
  openCase(record: ProtocolAdoptionCase): void { this.withLock(() => { const state = this.read(); const normalized = normalizeProtocolAdoptionCase(record); if (state.cases[normalized.caseId]) throw new Error("CASE_ALREADY_EXISTS"); state.cases[normalized.caseId] = normalized; this.write(state); }); }
  reserveFinalization(caseId: string, operationId: string): void { this.withLock(() => { const state = this.read(); const record = state.cases[caseId]; if (!record) throw new Error("CASE_NOT_FOUND"); if (record.status === "FINALIZING") throw new Error("FINALIZATION_BUSY"); if (record.status !== "OPEN") throw new Error("CASE_NOT_OPEN"); state.cases[caseId] = { ...record, status: "FINALIZING", operationId }; this.write(state); }); }
  publishAdopted(caseId: string, occurrence: ProtocolAdoptionOccurrence): void { this.withLock(() => { const state = this.read(); const record = state.cases[caseId]; const normalized = normalizeProtocolAdoptionOccurrence(occurrence); if (!record || record.status !== "FINALIZING" || record.operationId !== normalized.operationId) throw new Error("FINALIZATION_RESERVATION_REQUIRED"); state.occurrences[normalized.occurrenceId] = normalized; state.cases[caseId] = { ...record, status: "PROTOCOL_ADOPTED" }; this.write(state); }); }
  reconcile(caseId: string, operationId: string): "NOT_APPLIED" | "APPLIED_EXACT" | "APPLIED_CONFLICT" | "UNKNOWN_OR_UNAVAILABLE" { const state = this.read(); const record = state.cases[caseId]; if (!record) return "UNKNOWN_OR_UNAVAILABLE"; if (record.status === "PROTOCOL_ADOPTED" && record.operationId === operationId) return "APPLIED_EXACT"; if (record.status === "PROTOCOL_ADOPTED") return "APPLIED_CONFLICT"; if (record.status === "FINALIZING") return "UNKNOWN_OR_UNAVAILABLE"; return "NOT_APPLIED"; }
  private read(): { cases: Record<string, ProtocolAdoptionCase>; occurrences: Record<string, ProtocolAdoptionOccurrence> } {
    try {
      if (!existsSync(this.file)) return { cases: {}, occurrences: {} };
      const value = JSON.parse(readFileSync(this.file, "utf8"));
      if (!value || typeof value.cases !== "object" || typeof value.occurrences !== "object") throw new Error();
      return value;
    } catch { throw new Error("CONTROL_STORE_UNAVAILABLE"); }
  }
  private write(state: { cases: Record<string, ProtocolAdoptionCase>; occurrences: Record<string, ProtocolAdoptionOccurrence> }): void {
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(state)}\n`, { mode: 0o600 });
    const fd = openSync(tmp, "r");
    try { fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(tmp, this.file);
    const dir = openSync(dirname(this.file), "r");
    try { fsyncSync(dir); } finally { closeSync(dir); }
  }
  private withLock(action: () => void): void {
    const lock = `${this.file}.lock`;
    mkdirSync(dirname(this.file), { recursive: true });
    try { mkdirSync(lock); } catch (error) { if (error?.code === "EEXIST") throw new Error("FINALIZATION_BUSY"); throw error; }
    try { action(); } finally { rmSync(lock, { recursive: true, force: true }); }
  }
}

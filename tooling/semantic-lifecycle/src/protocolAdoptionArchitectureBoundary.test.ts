// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("protocol writer is only referenced by adoption guard and port", () => { const guard = readFileSync("src/protocolAdoptionGuard.ts", "utf8"); assert.match(guard, /ProtocolAuthorityMutationPort/); assert.doesNotMatch(guard, /publishAuthority|SemanticAuthorityRepository/); });

# Task 6 report — BOUND_EXISTING acceptance boundary

## Result

Implemented `SemanticAuthorityAcceptanceBoundary` as the route-specific Authority writer. It validates OPEN case, exact basis-selection occurrence, current Candidate head, PASS machine proof, both HUMAN PASS reviews, adopted Protocol basis, canonical payload digest, and initial/superseding Authority-head semantics immediately before publication. Authority v2 publication is prepared immutably and committed together with the terminal case transition through existing control-store preparation APIs. The route-neutral repository now exposes additive v2 reads and prepared publication while preserving v1 APIs.

## TDD evidence

- RED: `boundExistingAtomicity.test.ts` initially failed because `SemanticAuthorityAcceptanceBoundary` was absent.
- GREEN focused: TypeScript NodeNext compilation succeeded; boundary exposure test passed.
- Full GREEN: `pnpm test` — 142/142 passing.
- Lint: `pnpm lint` — PASS.

## Commit

`24b9e7125ab7836ad8e248c4e7d3d58c6154f066` — `feat(semantic-lifecycle): add bound-existing authority acceptance boundary`

## Concerns

The new boundary API is additive and intentionally leaves existing SEMANTIC_FIRST behavior unchanged. Additional end-to-end acceptance/concurrency scenarios are expected in Task 7 verification; current Task 6 tests cover boundary export and repository compatibility only.

## Fix round 1

Addressed the independent review blockers by adding a paired staged publication path, recomputing case/selection/Candidate/proof/review/adopted-basis predicates inside the publication fence, rebuilding the Authority record from the barrier-time Candidate payload, and adding initial/supersession/idempotency/old-record/observation tests. Final verification after the fix: `pnpm test` 144/144 passing, `pnpm lint` PASS, `git diff --check` PASS. Fix commits: `46cfe70f82a888e3737926bca35e44a4ab746d1d`, `8d3cc6887ae52ef4b88a1e528d655c66b0ec3ece`.

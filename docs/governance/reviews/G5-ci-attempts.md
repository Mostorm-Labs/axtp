# AXTP G5 — CI Attempt Record

This record preserves G5 Gate-validation infrastructure incidents separately from implementation findings. It does not redefine protocol or repository authority.

## Attempt 1 — run 32985381803

Functional head:

```text
56f8e5b3aff986fe1269b4476f636a2dc407f7c8
```

Observed GitHub Actions state:

- workflow: `Validate AXTP Spec`
- run: `32985381803`
- exact branch head: `56f8e5b3aff986fe1269b4476f636a2dc407f7c8`
- workflow-level conclusion was reported as failure after the job was cancelled;
- the only `validate-spec` job concluded `cancelled` before repository validation steps produced usable evidence;
- job logs were no longer available from GitHub;
- a failed-jobs/job rerun request left the run queued with zero jobs instead of creating an executable validation attempt.

Classification:

```text
ENVIRONMENT_DEFECT / CI cancellation
repository defect evidence = NONE
protocol semantic evidence = NONE
```

This run MUST NOT be used to claim either G5 PASS or G5 implementation failure. No repository file was changed in response to the cancelled validation.

## Local fallback

A local exact-head clone was attempted only as supplementary verification. The execution environment could not resolve `github.com`, so the repository dependency graph could not be checked locally.

Classification:

```text
ENVIRONMENT_DEFECT / network resolution limitation
repository defect evidence = NONE
```

## PR trigger behavior

Reopening Draft PR #12 on commit `d7b9d7f896b7630fd919117a04738f2b00d5eb38` did not create a new `Validate AXTP Spec` workflow run.

A normal governance-evidence commit on open PR #12 created head `382df731412916b7de1f27dbad4837e00f0d46c0`, but no fresh workflow run was indexed for that head.

A separate temporary Draft validation PR #13 was then opened on exact head `5d8107e60e8a0600785804d5f5dacaa45a1a1095` to obtain a clean `pull_request/opened` check suite without changing repository contents. GitHub still did not create a new workflow run. Instead, the old run `32985381803` remained queued with immutable `head_sha=56f8e5b3aff986fe1269b4476f636a2dc407f7c8` while its `pull_requests[]` association was temporarily rebound to PR #13/current head. After PR #13 was closed, the old run remained queued and its PR association became empty.

This proves the queued run is not valid exact-head evidence for later G5 commits.

GitHub's public service status reported Actions operational during this investigation, so no repository-wide or public platform outage can be claimed from the available evidence. The observed condition is classified only as a repository/check-suite execution environment defect.

## Static self-review while CI was unavailable

The G4 closure head to current G5 candidate compare shows no G5 changes under:

```text
specs/**
contract/registry/**
contract/protocol/**
contract/rules/**
conformance/cases/** semantic expectations
```

G5 changes remain limited to consumer-adoption evidence/governance, protocol Markdown projection repair, tests/validation integration, and G5 review/spec/plan records.

The consumer ledger contains six known downstream repositories and zero PASS claims; all remain `unverified`. The semantic validator requires exact Spec lock, consumer implementation identity, declared profiles, conformance PASS, exact GitHub Actions run identity/commit, and verification time before `adoptionStatus: pass` is valid.

For `AXTP-GOV-012`, numeric/layout facts suitable for deterministic projection are resolved from current authority through `ProtocolProjectionFacts`. Remaining fixed explanatory prose in generated human Markdown is explicitly classified as non-authoritative reading guidance by `contract/generated/README.md`; it cannot override specs, canonical registry, Protocol IR, Rule, or conformance authority.

These observations are review evidence only. They do not replace executable repository validation.

## Runner recovery observed

After the runner/check-suite cleanup, previously delayed validation records became visible as completed successful runs:

- run `32989075353` completed `success` on historical G5 head `56f8e5b3aff986fe1269b4476f636a2dc407f7c8`;
- run `32989244799` completed `success` on historical G5 head `5d8107e60e8a0600785804d5f5dacaa45a1a1095`.

These runs demonstrate that the repository validation path is executable again, but neither run is current-head closure evidence. They MUST NOT be used as the final G5 Gate result for a later branch head.

Draft PR #12 was reopened after recovery and resolved its head to the current migration branch. A governance-evidence update then created exact functional head `04559cd4df33dfbaa25f7c87f5b90baabf776e10` and submitted a fresh pull-request validation.

## Functional re-verification — run 33020869297

The recovery condition was satisfied by a fresh executable workflow:

```text
workflow   = Validate AXTP Spec
run        = 33020869297
head_sha   = 04559cd4df33dfbaa25f7c87f5b90baabf776e10
PR         = #12
status     = completed
conclusion = success
```

The run completed the full repository path:

```text
generator tests          = 56/56 PASS
generated drift          = PASS
conformance cases        = 39 PASS
normative Rule coverage  = 10 covered + 1 structural-only + 0 uncovered
consumer evidence        = 6 consumers / PASS
docs/status/path checks  = PASS
release artifact dry run = PASS
```

Classification:

```text
prior environment blocker = CLEARED
repository defect evidence = NONE
protocol semantic impact   = NONE
functional G5 evidence      = PASS
```

The AJV `strictTypes` messages emitted while compiling one conditional consumer-evidence schema branch are advisory warnings only: the schema and semantic validator completed successfully and the current ledger passed. They are not evidence of a failed G5 contract.

## Current Gate status

```text
G5 functional verification = PASS
AXTP-GOV-006               = CLOSED FROM EVIDENCE
AXTP-GOV-012               = CLOSED FROM EVIDENCE
final G5 verdict            = PENDING FINAL EXACT-HEAD CLOSURE RUN
```

The functional PASS is now frozen. PR #12 was closed before writing the closure-only finding and review records.

The next valid evidence must be a full `Validate AXTP Spec` run whose immutable `head_sha` equals the closure-record branch head. No further implementation or protocol change is justified unless that run exposes a real defect.

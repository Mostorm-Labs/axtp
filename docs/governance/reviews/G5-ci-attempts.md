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

Reopening Draft PR #12 on commit `d7b9d7f896b7630fd919117a04738f2b00d5eb38` did not create a new `Validate AXTP Spec` workflow run. The workflow therefore cannot be treated as validating on `reopened` events.

This record is updated while the PR is open to create a normal `pull_request synchronize` event. This is a governance-evidence change only; no G5 implementation, protocol source, generated artifact, consumer-evidence behavior, or validation logic is modified.

## Next valid evidence

G5 remains `READY FOR FULL VERIFICATION` until a fresh `Validate AXTP Spec` run executes on the resulting exact head.

Only an executable exact-head run with completed repository validation steps may close `AXTP-GOV-006` and `AXTP-GOV-012`.

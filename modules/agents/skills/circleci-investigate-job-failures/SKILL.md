---
name: circleci-investigate-job-failures
description: Investigate failed CircleCI jobs with the installed `circleci` CLI. Use when a CircleCI run, workflow, or job has failed and Codex needs to identify the failing step from build output, then inspect uploaded test results when the logs are inconclusive.
---

# Investigate CircleCI job failures

Use read-only CLI commands. Confirm the project slug and the failed run; do not trigger, rerun, cancel, or change CircleCI resources.

## Find the failed job

Authenticate without exposing credentials:

```sh
circleci auth me
```

If authentication fails, stop and ask the user to authenticate or provide the intended access path. Do not invoke `circleci auth login` unless the user authorizes that local authentication action.

Set the explicit project slug when outside the repository or when its remote is ambiguous. List recent failures with a small JSON projection:

```sh
circleci run list --project "gh/<org>/<repo>" --json --jq \
  '[.[] | select(.outcome == "failed" or .current_outcome == "failed") |
    {id, branch, phase, outcome, current_outcome, revision, created_at,
     subject: .commit.subject}]'
```

Use the selected run ID to find failed workflow jobs:

```sh
circleci run get "<run-id>" --json --jq \
  '{id, created_at, workflows: [.workflows[] |
    {id, name, phase, outcome,
     jobs: [.jobs[] | select(.outcome == "failed") |
       {id, name, phase, outcome}]}]}'
```

Record the run, workflow, and job IDs, plus the branch and revision from the selected run when available. A direct job lookup can omit project, branch, and revision. Investigate canceled jobs separately: they often have no underlying build failure.

## Read build output first

Get failed steps from the job metadata. Inspect every execution: parallel jobs can succeed on execution 0 while a different execution has the failure.

```sh
circleci job get "<job-id>" --json --jq \
  '{id, name, outcome, executions: [.executions[] |
    {index, failed_steps: [.steps[] | select(.outcome == "failed") |
      {num, name, type, exit_code}]} |
    select(.failed_steps | length > 0)]}'
```

Fetch only the selected failed step. `--condensed` removes noisy/repetitive output server-side and is the default for investigation:

```sh
circleci job output get "<job-id>" --step-num <step-num> \
  --execution <execution-index> --condensed
```

Identify the first actionable error and its immediate context: failing command, exit code, exception, file/line, or infrastructure signal (for example OOM, timeout, image pull, or unavailable service). Read the uncondensed output only if the condensed version omits needed context.

Do not run `circleci job output list --json` unfiltered. Its response embeds the complete text of every step and can be enormous. If step metadata is needed, use `circleci job get` with the projection above.

## Fall back to test results when logs are unclear

If the selected log has no clear error, is a generic non-zero exit, or only reports a failed test command, query uploaded test results. The CLI emits result records as a stream, not as one JSON array, so filter each record directly:

```sh
circleci testresult list "<job-id>" --json --jq \
  'select(.result != "success" and .result != "skipped") |
   {result, classname, name,
    message: ((.message // "") | split("\\n")[:12] | join("\\n"))}'
```

Use the test name from that output for a full single result when needed:

```sh
circleci testresult get "<job-id>" "<test-name>"
```

If no failed test records exist, treat the failure as non-test-related. Revisit the failed step for infrastructure or setup errors, then inspect artifacts only when they are relevant:

```sh
circleci job artifact "<job-id>"
```

## Report evidence

State the project, branch/revision, run/workflow/job IDs, failed execution and step, and the smallest useful error excerpt. Separate observed evidence from the likely cause. Mention when test results supplied the root cause because build output did not.

## Tips

- Prefer `--json --jq` with explicit fields; never parse the human-readable tables.
- Start with the default `run list` page size. A live CLI/API check rejected `--limit 50` with `Invalid page size`, although its help did not state the maximum.
- Use `--execution <index>` for parallel jobs; `job output get` otherwise reads execution 0.
- Use `circleci job output get --condensed` before full logs. It preserves the error context while avoiding routine test, download, and progress output.
- Preserve job IDs even when test results reveal the cause: the same job can have multiple executions and several uploaded result files.
- Keep commands read-only unless the user explicitly authorizes an operational action.

---
name: circleci-investigate-job-failures
description: Investigate failed CircleCI runs, workflows, or jobs through the CircleCI MCP server. Use when a CircleCI pipeline failed and an agent must identify the failing job or step, read build output, inspect uploaded test results, artifacts, or resource usage, and report root-cause evidence.
---

# Investigate CircleCI job failures

Follow the tool chain `list_runs` → `get_run` → `list_run_workflows` → `list_workflow_jobs` → `get_job`, skipping levels whose id you already hold. IDs are distinct UUIDs per level — a tool fails rather than guesses when handed the wrong kind, and none accept job numbers or CircleCI web URLs. Project and org take either a slug (`gh/org/repo`) or a UUID.

## Find the failed job

1. `circleci_list_runs` with the project slug, `status: "failed"` (add `branch` when known).
2. `circleci_list_run_workflows` with the failed run's id → pick the failed workflow; `circleci_get_workflow` when you need its name or outcome.
3. `circleci_list_workflow_jobs` with the workflow id → collect the failed job ids.

Investigate canceled runs separately: they often have no underlying build failure.

## Diagnose the job

Start cheap and escalate; each job id unlocks `get_job`, `list_job_tests`, `get_job_logs`, `get_job_resource_usage`, `list_job_artifacts`.

1. `circleci_get_job` — names the failed step and its exit code. It reports every execution: parallelism means execution 0 can pass while another execution failed, so check all of them.
2. If the failed step ran tests → `circleci_list_job_tests`. It defaults to failing tests only, which is the fast path; request `all: true` only when context is needed.
3. If metadata is inconclusive → `circleci_get_job_logs`. Omitting `step` auto-reads the failed steps; pass `execution` for a parallel job and keep `tail_lines` small. This is the costliest call in the chain — reach for it when the failure is not yet explained.
4. If a job died with nothing in its logs → `circleci_get_job_resource_usage`. Memory near 100% of the limit is an OOM kill; both CPU and memory well under ~50% mean a smaller resource class would fit.
5. When build outputs matter → `circleci_list_job_artifacts` for persisted files and download URLs.

## Report evidence

State the project, branch/revision, run/workflow/job ids, failed execution and step, and the smallest useful error excerpt. Separate observed evidence from the likely cause. Mention when test results supplied the root cause that build output did not. Preserve job ids even when test results reveal the cause: the same job can have multiple executions and several uploaded result files.

## Scope

Investigation reads only. `circleci_rerun_workflow` and `circleci_cancel_workflow` require the user's confirmation first unless they directly asked for it.
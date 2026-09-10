---
name: monitor-deploy
description: Monitor a merged PR through CircleCI, the version tag, and the Concourse deploy pipeline, then QA the change on staging (datacamp-staging.com) and production (datacamp.com). Use when asked to watch or monitor a deploy, verify a deployment went out, or QA changes after merging a PR.
---

# Monitor a deploy

Follow the chain: merge commit → CircleCI workflow → version tag → Concourse pipeline → staging QA → prod QA. The **tag** is the source of truth at every stage: the deployed version you watch for is the git tag minted from this PR's merge commit, never a build number.

**Watching = polling.** There are no push notifications. Re-run the read command for the current state, `sleep 30` in the shell between polls, and keep a bounded budget (~30 attempts); on timeout, report the last observed state to the user instead of looping forever.

## 1. Find the merge commit

`gh pr view <url> --json mergeCommit,mergedAt,baseRefName` — confirm the base is `master`/`main` and the state is MERGED. Hold the merge commit SHA; every later stage keys off it.

## 2. Watch the CircleCI workflow until green

- Read the merge commit's GitHub checks: `gh api repos/<org>/<repo>/commits/<sha>/check-runs`. The check named after the CI workflow (e.g. `main`) links to CircleCI; the SonarCloud check can be ignored.
- Poll the workflow's jobs until all succeed or one fails. With direct CircleCI MCP tools use `list_runs` → `get_run` → `list_run_workflow_jobs` (see the `circleci-investigate-job-failures` skill for the failure path); otherwise dispatch the `circleci` subagent. REST fallback: `GET api/v2/project/gh/<org>/<repo>/pipeline?branch=master`, filter `.vcs.revision == <merge sha>` (there is no commit filter — filter client-side), then `GET api/v2/pipeline/<id>/workflow` and `/workflow/<id>/job`.
- Typical duration: 5–10 minutes.

**Done when**: the workflow's conclusion is `success`.

## 3. Watch the tag job

A workflow that ends in a `tag` job (exact name varies per repo — look for it in the job list, typically near the end) bumps the latest patch tag and pushes it: log lines `Updating 1.0.323 to 1.0.324` and `Tagged repo with 1.0.324`. Read the tag job's log to capture the new tag name, or verify directly: `gh api repos/<org>/<repo>/tags` — the newest tag's `commit.sha` must equal the merge commit.

**Done when**: you hold the tag name, e.g. `1.0.324`.

## 4. Find the Concourse pipeline run

The git tag kicks off a Concourse pipeline named after the app. Use the Engineering Portal (via the `engineering-portal` subagent, or portal MCP tools directly):

1. `concourse_list_services` → the app's Concourse team.
2. `concourse_get_pipeline_view {serviceName}` → pipeline name and job list. Expect `generate manifest`, `deploy <app> in staging`, `deploy <app> in prod`, `deploy <app> in us-west-2-prod` (ignore this one), plus `promote to next environment …` jobs. Verify actual names rather than assuming.
3. `deployments_list_deployments {startDate, endDate, app}` → per-environment rows with status, timestamps, and `app_version` metadata carrying the `code_ci` git tag. This is the fastest "what version deployed where" check.

The run can take seconds to a minute after the tag to appear — poll.

## 5. Watch staging build the tag

Track `generate manifest` (snapshot of source, infra config, env vars) then `deploy <app> in staging`. Builds deploy by **git tag**, so the version is what matters, not the build number: another merge that landed after yours deploys a newer tag first. Confirm this run carries *your* tag via `concourse_get_concourse_deploy_log {serviceName, environment, buildId, grep: "<tag>"}` — the build log prints the deployed version in its Ansible facts block:

```
"code_ci": {"commit_hash": "6eae…", "version": "1.0.324", …}
"manifest": {"version": 365}
```

Two version levels coexist: the **manifest snapshot number** (e.g. 365) and the **git tag inside it** (e.g. 1.0.324). Always correlate on the tag.

**Done when**: the staging build succeeded and its log shows your tag.

## 6. QA on staging

Derive the test spec from context first: a shared plan, the Jira ticket if it's already in context, or the PR description may already state the intended change and acceptance criteria — use that. Ask the user only when no test spec exists in context, and for anything you need to run it (credentials, feature flags). Then exercise the change against `https://www.datacamp-staging.com` — pick the right tool per surface:

- **OpenChamber browser** for UI flows.
- **webfetch** for simple GETs.
- **curl** for anything webfetch can't do: POST/PUT with bodies, auth headers, cookies, or checking API responses the change touches. Never print secrets in logs.

- **QA fails** → report exactly what failed (steps, evidence, error messages) and stop.
- **QA passes** → proceed to step 7.

## 7. Production

Most apps auto-promote: the `deploy <app> in prod` build starts ~1–2 minutes after staging succeeds. Some critical apps require a manual promote — if no prod build appears for your tag after staging QA passed, the app is in that category.

- **Auto-promote**: watch the prod build succeed with your tag (same log check as step 5), then go to step 8.
- **Manual promote**: tell the user QA on staging passed — say **what** you tested and **how** — and that they can promote to prod. Wait for them to confirm the promotion, then continue to step 8.

## 8. QA on production

Repeat the same test set from step 6 against `https://www.datacamp.com`, then report the final result: what was deployed (tag, commit), what was verified on staging and prod, and any residual caveats.
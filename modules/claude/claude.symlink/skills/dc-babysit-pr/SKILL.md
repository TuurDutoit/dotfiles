---
name: dc-babysit-pr
description: >
  Continuously monitors CircleCI builds and automatically fixes failures on your branch. Requires a CircleCI MCP
  connection.
metadata:
  version: '1.1.0'
---

# Babysit PR

## Context

An autonomous agent loop that uses the CircleCI MCP to monitor builds on your
current branch. When a build fails, it fetches the logs, diagnoses the problem,
applies a minimal fix, commits, pushes, and keeps watching until green.

## Usage

Invoke when a PR has CI failures you want auto-fixed in a loop. The skill runs
through the steps in "The Loop" until the build is green or an exit condition
is hit.

## Prerequisites

- **CircleCI MCP** connected and available
- **Git** configured with push access to the remote
- Working directory inside a git repo with CircleCI configured

If the CircleCI MCP is not available, tell the user to connect it before proceeding.

## The Loop

```text
1. Detect current branch and project from git
2. Sync: fetch origin; merge base branch if behind; push if merged
3. Wait: gh pr checks --watch --fail-fast
   (fallback: CircleCI MCP poll every ~2 min if no PR / gh unavailable)
4. If success → report and exit
5. If failed →
   a. Fetch failed job logs via CircleCI MCP
   b. Classify failure (lint | types | tests | deps | behind-base)
   c. Apply minimal targeted fix
   d. git add <changed files> && git commit && git push
   e. Go to step 2
6. If fixer cannot determine a fix → stop and ask user
```

## Step 1: Detect Project

Run these to determine context:

```bash
git rev-parse --abbrev-ref HEAD   # current branch
git remote get-url origin          # extract org/repo
```

**Always construct the project slug manually** — do not rely on the MCP tool's
automatic project detection (it fails with SSH remote URLs). Parse the remote
URL yourself using these rules:

| Remote URL format                 | Slug prefix | Example → Slug                                    |
| --------------------------------- | ----------- | ------------------------------------------------- |
| `git@github.com:ORG/REPO.git`     | `gh`        | `git@github.com:acme/app.git` → `gh/acme/app`     |
| `https://github.com/ORG/REPO.git` | `gh`        | `https://github.com/acme/app.git` → `gh/acme/app` |
| `git@bitbucket.org:ORG/REPO.git`  | `bb`        | → `bb/ORG/REPO`                                   |
| `git@gitlab.com:ORG/REPO.git`     | `gl`        | → `gl/ORG/REPO`                                   |

Strip the host prefix, strip the trailing `.git`, then prepend the two-letter
VCS prefix. Always pass the constructed slug as `projectSlug` (Option 1) to
`get_latest_pipeline_status` and `get_build_failure_logs`.

## Step 2: Sync with Base Branch

At the start of every loop iteration (including the first), fetch and check whether the branch needs syncing:

```bash
git fetch origin
BASE=$(gh pr view --json baseRefName --jq '.baseRefName')
BEHIND=$(git rev-list HEAD..origin/$BASE --count)
```

- If `BEHIND == 0` → branch is current, proceed to Step 3
- If `BEHIND > 0` → merge and push (mirrors GitHub's "Update branch" button):
  ```bash
  git merge origin/$BASE
  git push origin HEAD
  sleep 20
  ```
  If the merge has conflicts: resolve each one by reading both sides and preserving this branch's intent,
  stage resolved files with `git add`, then run `git merge --continue`. If a conflict cannot be safely
  resolved, run `git merge --abort`, stop, and ask the user.

## Step 3: Wait for Checks

First, try `gh pr checks --watch --fail-fast`. This blocks until all checks
complete and exits 0 on success or non-zero on failure — no manual polling needed.

```bash
gh pr checks --watch --fail-fast
```

- Exit code **non-zero** → at least one check failed → go to Step 4
- **Command errors** (no PR found, `gh` unavailable) → fall back to CircleCI MCP:
  use `get_latest_pipeline_status` and poll every ~2 min with `sleep 120` until
  the pipeline is no longer `running`/`queued`
- Exit code **0** → do NOT immediately declare success. Run a final confirmation:

```bash
gh pr checks
```

Scan the output for any check that is not `pass`/`✓` — in particular look for
SonarCloud (and any other external analysis tools) which can be added after
CircleCI finishes and may still be `pending` or `fail`. If any check is not
passing, treat it as a failure and go to Step 4. Only proceed to Step 7 when
every listed check shows a passing status.

## Step 4: On Failure — Fetch Logs

When a workflow has `failed` status:

1. Use the MCP to list jobs in the failed workflow
2. Find jobs with `failed` status
3. Fetch the log output / step details for each failed job
4. Collect the error output — this is what you'll diagnose

## Step 5: Diagnose and Fix

First, detect the project language:

1. Check `AGENTS.md` for explicit tech stack context — use that if present.
2. Otherwise, detect from the repo root: `package.json` → TypeScript/JS, `Gemfile` → Ruby.

Then classify the failure from the log output and apply the matching strategy.

---

### Branch Behind Base / Merge Conflicts

**Signals:** merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`), test or lint failures that don't correspond to any change on this branch
**Fix:** Do not try to fix the code symptom. Go back to Step 2 and merge — the sync step will handle it.

---

### Lint / Formatting Errors

**TypeScript/JS signals:** `eslint`, `prettier`, `lint`, formatting errors
**TypeScript/JS fix:** Check `AGENTS.md` for the repo's canonical lint command first. Otherwise, run the project's lint-fix command from `package.json`
(look for `lint:fix`, `lint --fix`, `format`). Fallback: `npx eslint --fix .`
or `npx prettier --write .`

**Ruby signals:** `rubocop`, `Style/`, `Layout/`, `Lint/`, offense count
**Ruby fix:** Run `bundle exec rubocop -A` (auto-correct all). If only safe
corrections are wanted, use `bundle exec rubocop -a`. If specific cops fail,
check `.rubocop.yml` for project overrides.

---

### Type / Compilation Errors

**TypeScript signals:** `TS\d{4}:`, `error TS`, type assignability errors, `tsc`
**TypeScript fix:** Parse the error file/line, read the file, apply the minimal
type fix. Prefer fixing types properly over `as any` or `@ts-expect-error`. Verify
with `npx tsc --noEmit`.

**Ruby signals:** `SyntaxError`, `NameError`, `NoMethodError`, `LoadError` at
load/compile time, Sorbet errors (`T.let`, `T.must`, `sig`)
**Ruby fix:** For syntax errors, read the file and fix the syntax (missing `end`,
bad interpolation, etc.). For Sorbet type errors, read the `sig` and fix the
type annotation or the call site. Verify with `bundle exec srb tc` (Sorbet) or
`ruby -c <file>` (syntax check).

---

### Failing Tests

**TypeScript/JS signals:** `FAIL`, `✕`, `AssertionError`, Jest/Mocha/Vitest output
**TypeScript/JS fix:** Read both the test file and the source it tests. Determine
if the test or the source is wrong. Fix the source if it's a bug; update the test
only if expectations legitimately changed. Verify with `npx jest <file>` or equivalent.

**Ruby signals:** `Failure:`, `Error:`, `expected ... to`, `rspec`, `minitest`,
`FAILED`, `F` or `E` in test output dots
**Ruby fix:** Read the failing spec/test file and the source. For RSpec, verify
with `bundle exec rspec <file>:<line>`. For Minitest, verify with
`bundle exec ruby -Itest <file>` or `bundle exec rails test <file>:<line>`.
Check if fixtures or factories need updating too.

**Never delete or skip tests** unless the user says to.

---

### SonarCloud / External Analysis Failures

**Signals:** check named `SonarCloud Code Analysis` (or similar) is `fail`/`pending` in `gh pr checks` output

**Why not auto-fix:** SonarCloud surfaces coverage regressions, code smells, and security
hotspots — these require judgment calls, not mechanical fixes. Auto-fixing risks
introducing incorrect tests or scope creep beyond the original PR.

**Default behavior:** Report the failure to the user with the check URL and issue type
(coverage drop, code smells, security hotspots). Then ask:
**"SonarCloud is failing. Writing specs to fix coverage goes beyond the minimal-fix scope this skill normally limits itself to, so I'm checking with you first. Want me to write specs to meet the coverage threshold?"**

- User **declines** → go to Step 7's "cannot determine a fix" exit.
- User **accepts** → open the SonarCloud report, identify uncovered files/lines,
  write specs that test actual business logic (not line-execution filler), follow
  the repo's existing test patterns, verify locally, commit, push, return to Step 2.

**If SonarCloud is still `pending`** after CircleCI passes: poll `gh pr checks` every 30 seconds (up to 10 minutes) until it resolves. If it does not resolve within 10 minutes, stop and ask the user.

---

### Dependency / Config Issues

**TypeScript/JS signals:** `MODULE_NOT_FOUND`, `ERESOLVE`, peer dep errors
**TypeScript/JS fix:** Check for `yarn.lock` → run `yarn install`. Check for `package-lock.json` → run `npm install`.
Default to `yarn install` if neither lockfile is present. Or add the missing dep and reinstall.
If there are peer dep conflicts, resolve them by adjusting versions in `package.json` and reinstalling.
Never delete the lockfile — it is a critical part of reproducible builds.

**Ruby signals:** `Bundler::GemNotFound`, `Could not find gem`, `LoadError`,
`Gem::DependencyError`, version conflicts
**Ruby fix:** Run `bundle install`. If a gem is missing from the Gemfile, add it
and run `bundle install`. If there's a version conflict, check `Gemfile.lock` —
delete it and re-run `bundle lock` if needed. For native extension failures,
check that system deps are noted in the CI config.

## Step 6: Commit and Push

**Only stage files that the fix actually modified.** Never use `git add -A` or
`git add .` — the user may have unstaged changes that should not be committed.

```bash
git add <files you changed>
git commit -m "fix(ci): <short description>

Auto-fix applied by babysit-pr.
Failure: <category>
Job: <job-name>"

git push origin HEAD
```

Then go back to Step 2 and wait for the new pipeline.

## Step 7: Exit Conditions

- **Build passes** → report success with pipeline link and summary of fixes applied
- **Fixer cannot determine a fix** → stop, summarize what was tried, ask user for guidance
- **Merge conflict cannot be safely resolved** → stop, describe the conflicts, ask user for guidance
- **User asks to stop** → stop immediately

## Rules

- **Minimal changes only.** Fix the CI failure and nothing else.
- **Verify locally** before pushing when possible (run the linter, type checker, or failing test for the relevant language).
- **Preserve intent.** When fixing tests, understand whether the test or source is wrong.
- **Never force-push.** Regular `git push` only — no `--force` or `--force-with-lease`.
- **Respect .gitignore.** Never commit `node_modules`, `vendor/bundle`, `.env`, or build artifacts.
- **Log your reasoning.** Print what you found, what you're fixing, and why.

---
name: dc-migrate-ci-format-lint
description: Restructure a DataCamp repo's CircleCI 'check' job into three per-phase run steps (Typecheck, Format check, Lint), each calling node_modules/.bin/<tool> directly to skip yarn-bootstrap overhead and preserve per-step timing in CircleCI's UI. Opens a single PR. Trigger phrases — "split format and lint into separate CI steps", "wire up the three-step CircleCI check job", "per-phase step timing in CI", "move CI from yarn :ci scripts to node_modules/.bin direct invocation", "CI restructure for oxfmt and oxlint", "set DC_OXC_THREADS in the check job".
argument-hint: '<JIRA-REF> | <jira-issue-url> (optional)'
allowed-tools:
  - Read(./**)
  - Write(./**)
  - Edit(./**)
  - Glob(./**)
  - Grep(./**)
  - AskUserQuestion
  - Bash(gh pr create:*)
  - Bash(gh pr checks:*)
  - Bash(gh pr view:*)
metadata:
  version: '1.0.0'
  tags: format, oxfmt, lint, oxlint, oxc, circleci, ci
---

# DataCamp CI restructure — three-step check job

One PR. Branch: `<JIRA-REF>/dc-migrate-ci-format-lint` — resolve `<JIRA-REF>` from the argument or ask (see `## Arguments`).

## Context

Target state: one `check` job per package that runs three separate `run:` steps — Typecheck, Format check, Lint — each invoking `./node_modules/.bin/<tool>` directly so CI shape matches `.husky/pre-push` and skips yarn bootstrap overhead.

**Why three steps instead of one:** per-phase step-level timing is what CircleCI surfaces in its UI and what the upcoming benchmarking tooling (see umbrella `dc-migrate-oxfmt-oxlint` Roadmap) will extract by step name. A single combined step hides which phase regressed. The `check` composite in `package.json` is still valuable for local dev / pre-push hooks / justfile — CI just doesn't call it.

**Why bin-direct instead of `yarn X:ci`:** each `yarn` invocation adds \~400ms of bootstrap (resolve yarn, parse package.json, spawn the binary). With three CI steps that's \~1.2s of pure overhead. Calling `./node_modules/.bin/<tool>` skips the yarn layer and produces the same final command. Also keeps CI step shape aligned with `.husky/pre-push` (`./node_modules/.bin/tsc --noEmit`) and `lint-staged` (implicit `node_modules/.bin` PATH resolution) — one pattern across all non-interactive call sites.

## Usage

Use when:

- The `check` job in `.circleci/config.yml` still calls `yarn format:check:ci` / `yarn lint:check:ci`.
- Format/lint live as steps inside a `test` job rather than a dedicated `check` job.
- Per-phase timing is missing because steps are combined.
- Umbrella `dc-migrate-oxfmt-oxlint` routed here.

**Do NOT run if (blocking — STOP and report which condition matched):**

- **Tooling not installed** — oxfmt and/or oxlint are not yet installed and configured (missing `oxfmt`/`oxlint` in devDeps, missing `oxfmt.config.ts` / `oxlint.config.ts`, or missing `format:check:ci` / `lint:check:ci` scripts; `typecheck` script for TS repos). Run `dc-migrate-oxfmt` and/or `dc-migrate-oxlint` first — this skill only restructures CI once the tools exist.
- **Already restructured** — the `check` job in `.circleci/config.yml` already runs the three named per-phase steps (`Typecheck`, `Format check`, `Lint`) via `./node_modules/.bin/<tool>`.
- **No CircleCI** — no `.circleci/config.yml`. If the repo uses a different CI system (GitHub Actions, Concourse, etc.), this skill's CircleCI-specific transformation does not apply — flag to the user and stop.

## Arguments

`$ARGUMENTS` (optional) — the Jira reference for the migration branch, accepted as either:

- a bare ref: `DP-1803`
- a full Jira issue URL: `https://datacamp.atlassian.net/browse/DP-1803`

Resolve a URL to its ref by taking the trailing `/browse/<REF>` path segment. The branch becomes `<JIRA-REF>/dc-migrate-ci-format-lint`. If `$ARGUMENTS` is empty, ask the developer for the Jira ref before branching.

## Orchestrated (delegated) mode

When the `dc-migrate-oxfmt-oxlint` umbrella runs a multi-phase migration it invokes this skill with an orchestration directive in `$ARGUMENTS`, e.g.:

> `DP-1803 [orchestrated: branch DP-1803/dc-migrate-oxfmt-oxlint already checked out — commit your work, do NOT branch, push, or open a PR; return a phase-summary block]`

In that mode:

- **Use the shared branch already checked out** — do not create or switch branches.
- **Do the CircleCI restructure work and commit it** on the current branch as documented.
- **Skip the push and the PR** — step 6's push-based CI verification and step 8 (PR) are the umbrella's job; it pushes once at the end. Do NOT `git push` or open a PR.
- **Return a short phase-summary block** (before/after CI shape, pattern applied, workflow-dependency changes) for the umbrella to fold into the combined PR body.

Absent the directive, run **standalone**: branch off master, push, and open your own PR as documented below.

## Status

Inventory the repo before starting (the `## Usage` gate has already confirmed the skill should run):

1. Read `.circleci/config.yml` — identify the pattern (see step 1 below).
2. Note the current install command used by sibling jobs (`yarn install`, `yarn workspaces focus`, etc.) — the new `check` job should match.
3. Note the resource class on the executor — `medium` (2 vCPU) is the target.

## Workflow

### 1. Identify the pattern

Read `references/circleci-patterns.md` for full per-pattern detail. Quick triage:

| Pattern                                | Signal                                                                                                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pattern 1 — Simple**                 | Single `test` job with format/lint/test steps inline. Single-package repo.                                                                                                                               |
| **Pattern 2 — Parameterised monorepo** | `build-and-test` job (or similar) with a workspace-name parameter; per-workspace job instantiations under `workflows`. Independent published packages (A2) — focused installs, per-workspace CI signals. |
| **Pattern 3 — Lerna monorepo**         | `test` job runs `yarn lint` (a `lerna run lint` fan-out) + a test step. Coupled one-app monorepo (A1) — lockstep workspaces, single CI signal.                                                           |

### 2. Invocation shape (all patterns)

```yaml
- run:
    name: Typecheck
    command: ./node_modules/.bin/tsc --noEmit
- run:
    name: Format check
    command: NODE_OPTIONS='--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' ./node_modules/.bin/oxfmt --check --threads ${DC_OXC_THREADS:-2}
- run:
    name: Lint
    command: NODE_OPTIONS='--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' ./node_modules/.bin/oxlint --report-unused-disable-directives --threads ${DC_OXC_THREADS:-2}
```

- **`NODE_OPTIONS='--disable-warning=MODULE_TYPELESS_PACKAGE_JSON'`** — scoped **per-step** to the oxc binaries only (CJS repos with `.ts` configs). Omit for ESM repos. **Never `export` at job level** — clobbers user-set values and leaks to unrelated steps.
- **`tsc` doesn't need `NODE_OPTIONS`** — the warning only fires on `.ts` config loaders (oxfmt/oxlint).
- **No glob on format step** — oxfmt walks the directory; parser detection + shared `ignorePatterns` + `.gitignore` handle filtering. This matches the no-glob shape of the `format:check` package.json script.
- **Developer-facing `yarn format:check:ci` / `yarn lint:check:ci`** stay in `package.json` so devs can reproduce CI locally.

### 3. Apply per-pattern (read `references/circleci-patterns.md`)

For all patterns the `check` job should:

- Use `medium` resource_class (2 vCPU).
- Set `DC_OXC_THREADS: 2` on the executor or job environment.
- Match the install command of sibling jobs.
- Each `run:` step gets a clear `name:` (`Typecheck`, `Format check`, `Lint`) — step-level timing is easy to read in the CircleCI UI, and the future benchmarking extractor will filter by step name.

### 4. Update workflow dependencies

- `check`, `test`, and `build` (if present) all start in parallel.
- Downstream deploy/push/publish jobs require **both** `check` and `test`.
- A check failure (at any of the three steps) blocks deploy, not the parallel jobs.

### 5. Update `.husky/pre-push` (TS repos)

Mirror the CI Typecheck step:

```sh
./node_modules/.bin/tsc --noEmit
```

Invokes the binary directly (not `yarn typecheck`) to skip yarn bootstrap overhead and align with CI shape. No `NODE_OPTIONS` prefix — `tsc` doesn't need it.

### 6. Verify

- Push the branch; confirm CircleCI runs:
  - `check`, `test`, `build` (if present) in parallel.
  - Each `check` sub-step (`Typecheck`, `Format check`, `Lint`) reports its own duration in the UI.
- Step names match `Typecheck` / `Format check` / `Lint` verbatim so the future benchmarking extractor can pick them up.
- Downstream deploy jobs require both `check` and `test`.

### 7. JSON-linting retention (if applicable)

If the repo retains ESLint for JSON linting (`eslint.config.json.mjs` + `lint:check:json` script — see `dc-migrate-oxlint` `references/json-linting-retention.md`), wire it in based on the CI shape:

- **CI calls `yarn check`** (composite-style) — the composite already folds `yarn lint:check:json`; no CI changes needed.
- **CI calls per-phase sub-scripts** (this skill's target shape) — add a `Lint JSON` step to the `check` job:

  ```yaml
  - run:
      name: Lint JSON
      command: yarn lint:check:json
  ```

  Pattern 2 (parameterised monorepo): gate on a per-workspace boolean (e.g. `has_json_lint`) so only workspaces with the script get the step. Pattern 3 (Lerna): add a root wrapper (`"lint:check:json:ci": "lerna run lint:check:json --parallel --no-bail"`) and call that.

### 8. PR

Read `references/pr-description.md`.

## Common issues

**CI fails on `DC_OXC_THREADS`** — `${DC_OXC_THREADS:-2}` needs shell expansion. If CI runs scripts in a context that doesn't expand env vars, hardcode `2`.

**Step name doesn't surface in CircleCI UI timing** — the UI groups by exact `name:` field. Use `Typecheck`, `Format check`, `Lint` verbatim so future benchmarking tooling can extract them by name.

**`./node_modules/.bin/<tool>: not found` in CI** — install step didn't run, or wrong working_directory in a monorepo. Pattern 2 needs `working_directory: libraries/<library_name>` when the install is per-library; binstubs resolve relative to cwd.

**`NODE_OPTIONS` clobbered downstream** — confirm the export is scoped per-step (inline on the `command:` line), not at job-level `environment:`. Job-level `export` leaks to every later step.

**Per-step timing collapsed** — verify the `name:` field is set on each `run:` step. Combined or unnamed steps don't yield extractable timing.

## Principles

- **Three steps, not one.** Per-phase timing is the point — CircleCI groups by step name.
- **Bin-direct, not `yarn :ci`.** Skips \~400ms × 3 of yarn bootstrap; aligns with `.husky/pre-push` and `lint-staged` PATH resolution.
- **`NODE_OPTIONS` scoped per-step.** Per-step inline on the `command:` line, not job-level `environment:`. CJS repos only; ESM repos drop it.
- **`medium` resource_class, `DC_OXC_THREADS: 2`.** Two vCPU + two threads is the sweet spot for oxc binaries; more threads on a 2-vCPU class doesn't help.
- **Composite stays in `package.json`** — for local dev / pre-push / justfile parity. CI just doesn't call it.

## References

- `references/circleci-patterns.md` — full per-pattern walkthrough (Pattern 1 simple, Pattern 2 parameterised monorepo, Pattern 3 Lerna monorepo): existing job shape, exact transformation, working_directory rules, install command matching.
- `references/pr-description.md` — PR structure: summary, before/after CI shape, benchmarks, test plan.

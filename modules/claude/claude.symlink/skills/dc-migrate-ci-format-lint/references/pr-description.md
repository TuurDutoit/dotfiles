# PR description — dc-migrate-ci-format-lint

Branch: `<JIRA-REF>/dc-migrate-ci-format-lint`. Title: `[<JIRA-REF>] Split CI check job into per-phase steps`.

Generate content from actual branch changes.

## Structure

1. **Summary** — 2–4 bullets:
   - Restructured `.circleci/config.yml` `check` job into three per-phase `run:` steps (Typecheck, Format check, Lint).
   - Each step calls `./node_modules/.bin/<tool>` directly (skips \~400ms × 3 of yarn bootstrap, aligns with `.husky/pre-push`).
   - `check` runs parallel with `test` (+ `build` if present); downstream deploy requires both.
   - Pattern identified (Pattern 1 / 2 / 3) — name the specific CI shape this repo had.

2. **Technical details**
   - **Before** — describe the previous shape (single `test` job with format/lint inline, or `build-and-test` parameterised, or Lerna `yarn lint`).
   - **After** — three `run:` steps in a dedicated `check` job, `medium` resource_class, `DC_OXC_THREADS: 2` on executor environment, install command matched to sibling jobs.
   - **Invocation form** — `./node_modules/.bin/<tool>` direct. `tsc` no env prefix; oxfmt + oxlint prefixed with `NODE_OPTIONS='--disable-warning=MODULE_TYPELESS_PACKAGE_JSON'` (CJS repos only; drop for ESM).
   - **Workflow dependencies** — `check` / `test` / `build` parallel; deploy requires both.
   - **`.husky/pre-push`** — updated to mirror CI Typecheck step (`./node_modules/.bin/tsc --noEmit`).
   - **JSON-linting retention (if applicable)** — added `Lint JSON` step calling `yarn lint:check:json`.

3. **Test plan**
   - [ ] CI shows three named steps in the `check` job: `Typecheck`, `Format check`, `Lint`
   - [ ] Each step reports its own duration in the CircleCI UI
   - [ ] `check`, `test`, `build` (if present) run in parallel
   - [ ] Downstream `deploy` / `push` requires both `check` and `test`
   - [ ] A check failure blocks deploy but not the parallel jobs
   - [ ] `.husky/pre-push` matches the CI Typecheck invocation

## Tone

- Lead with the timing win — that's the reason this PR exists.
- Step durations matter; total job time is secondary (CI variance).
- Don't bury the workflow-dependency change — reviewers need to see deploy still gates correctly.

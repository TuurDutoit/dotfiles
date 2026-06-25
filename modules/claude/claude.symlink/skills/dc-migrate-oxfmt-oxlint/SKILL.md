---
name: dc-migrate-oxfmt-oxlint
description: Orchestrate the full DataCamp Prettier+ESLint → oxfmt+oxlint migration. Detects state from devDeps/configs/scripts/CI and runs the appropriate sub-skill (dc-migrate-oxfmt, dc-migrate-oxlint, or dc-migrate-ci-format-lint). Trigger phrases — "run the oxfmt+oxlint migration", "where is this repo in the migration", "what's next for the oxfmt migration", "continue the oxfmt/oxlint migration", "migrate this repo to @datacamp/oxfmt-config and @datacamp/oxlint-config". Do NOT trigger on generic "migrate this repo" without an oxfmt/oxlint anchor.
argument-hint: '<JIRA-REF> | <jira-issue-url> (optional)'
allowed-tools:
  - Read(./**)
  - Glob(./**)
  - Grep(./**)
  - AskUserQuestion
  - Skill
metadata:
  version: '1.0.0'
  tags: format, oxfmt, lint, oxlint, oxc
---

# DataCamp oxfmt + oxlint migration orchestrator

Detects what's already done, asks the developer how much to run, then either delegates a single phase to its sub-skill (own branch + own PR) or orchestrates a multi-phase run on one shared branch — committing after each phase, prompting continue-or-stop between phases, and opening one combined PR only at the end.

## Context

DC repos migrate from Prettier + ESLint to:

- `oxfmt` with `@datacamp/oxfmt-config`
- `oxlint` with `@datacamp/oxlint-config`'s `createConfig` helper

Both packages are private DC packages on the internal npm registry. The `createConfig` helper composes presets, jsPlugins, and plugins at the repo level (oxlint silently ignores them when declared inside an `extends`'d shared config — this is why we don't use the generic `/migrate-oxlint` skill).

## Usage

Use when:

- The repo is migrating (or partially migrated) from Prettier + ESLint to oxfmt + oxlint.
- The user asks where the repo sits in the migration / what's next.

Partial migration is the expected case — route to the next incomplete phase, don't abort.

**Do NOT route or invoke a sub-skill if (blocking — STOP and report which condition matched):**

- **Not a JS/TS repo** — no `package.json`. There is nothing to migrate.
- **Fully migrated** — oxfmt + oxlint are installed and configured AND the CircleCI `check` job already runs the three per-phase bin-direct steps. Report "fully migrated"; there is no phase left to route to.
- **Legacy single-PR migration in progress** — the repo is on an older `<JIRA-REF>/code-formatting-linting-upgrade` branch (one big PR covering all phases). Don't re-route it to per-phase PRs; let it finish on that pattern.

## Sub-skills

| Sub-skill                   | Scope                                                                                         | Output |
| --------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| `dc-migrate-oxfmt`          | Prettier → oxfmt (+ `@datacamp/oxfmt-config`)                                                 | One PR |
| `dc-migrate-oxlint`         | ESLint → oxlint (+ `@datacamp/oxlint-config`)                                                 | One PR |
| `dc-migrate-ci-format-lint` | CircleCI `check` job → three per-phase `run:` steps calling `node_modules/.bin/<tool>` direct | One PR |

The three are independent — they can ship in any order. Order chosen below is the recommended sequence (format first reduces oxlint churn on imports). Each sub-skill self-verifies its own scope.

## Arguments

`$ARGUMENTS` (optional) — the Jira reference, accepted as either:

- a bare ref: `DP-1803`
- a full Jira issue URL: `https://datacamp.atlassian.net/browse/DP-1803`

Resolve a URL to its ref by taking the trailing `/browse/<REF>` path segment. If `$ARGUMENTS` is empty, ask the developer before invoking any sub-skill.

Pass the resolved ref through to whichever sub-skill is invoked. The branch is `<JIRA-REF>/dc-migrate-<suffix>` (e.g. `<JIRA-REF>/dc-migrate-oxfmt`, `<JIRA-REF>/dc-migrate-oxlint`, `<JIRA-REF>/dc-migrate-ci-format-lint`). The Jira ref varies by team — don't hardcode one.

## Default behavior — detect state, choose scope, run

Run this on invocation unless the user asks for a specific sub-skill (see `## Skip routing`).

### 1. Read the repo

Check (in parallel where possible):

- **`package.json` devDependencies** — presence of `prettier`, `eslint`, `oxfmt`, `oxlint`, `@datacamp/prettier-config`, `@datacamp/eslint-config`, `@datacamp/oxfmt-config`, `@datacamp/oxlint-config`.
- **Config files** — `prettier.config.*` / `.prettierrc*`, `.eslintrc*` / `eslint.config.*`, `oxfmt.config.ts`, `oxlint.config.ts`.
- **Scripts** — `format:*`, `lint:*`, `check`, `fix`, `typecheck`.
- **`.circleci/config.yml`** — does the `check` job have three separate `run:` steps (Typecheck, Format check, Lint), each calling `./node_modules/.bin/<tool>` directly?
- **`.husky/pre-commit` and `.husky/pre-push`** — what do they invoke?

### 2. Determine remaining phases

Map state to the ordered list of phases still to do:

| State signal                                                                                                                                  | Phase (sub-skill)              |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `prettier` in devDeps OR `prettier.config.*` / `.prettierrc*` present                                                                         | `dc-migrate-oxfmt`             |
| `eslint` in devDeps (outside step-13 retention pattern — see `dc-migrate-oxlint`) OR `.eslintrc*` / non-`json` `eslint.config.*` present      | `dc-migrate-oxlint`            |
| oxfmt + oxlint installed and configured, but `.circleci/config.yml` `check` job still uses `yarn <script>` or has format/lint in a `test` job | `dc-migrate-ci-format-lint`    |
| All three complete                                                                                                                            | none — report "fully migrated" |

Recommended order is **oxfmt → oxlint → ci-format-lint**: oxfmt's reformat is a large standalone commit captured in `.git-blame-ignore-revs`; running it before lint cleans up imports before oxlint's `consistent-type-imports` autofix touches them; CI restructure goes last so format/lint settle first.

If no phases remain, report "fully migrated" and stop.

### 3. Choose scope (AskUserQuestion)

Show the user the remaining phases (in order) and ask whether to run **the entire remaining migration** or **specific step(s)**. Let them pick one or more phases if they don't want everything.

- **Exactly one phase selected** (or only one phase remains) → **single-step path** (§4a).
- **Two or more phases selected** → **multi-step path** (§4b).

### 4a. Single-step path — full delegation

Invoke that one sub-skill with the `Skill` tool, passing the Jira ref. The sub-skill runs standalone: it branches off master and opens its **own** PR exactly as documented. The umbrella does nothing further — no shared branch, no orchestration.

### 4b. Multi-step path — orchestrated run

The umbrella owns the branch and the single combined PR; each sub-skill runs in orchestrated mode (commits only, no branch, no push, no PR).

1. **Create the shared branch.** Announce it first, then:
   ```sh
   git checkout master && git pull origin master
   git switch -c <JIRA-REF>/dc-migrate-oxfmt-oxlint
   ```
   Create it **only now** — once multi-step intent is confirmed — not earlier. Verify with `git branch --show-current`.
2. **For each selected phase, in recommended order:**
   - Invoke the sub-skill with the `Skill` tool, passing the Jira ref **and** the orchestration directive so it skips its own branch/push/PR:
     > `<JIRA-REF> [orchestrated: branch <JIRA-REF>/dc-migrate-oxfmt-oxlint already checked out — commit your work, do NOT branch, push, or open a PR; return a phase-summary block]`
   - The sub-skill does its install/config/scripts/hooks work and commits it on the shared branch, then returns a short phase-summary block. Collect it for the combined PR body.
   - **After the phase's commits land, ask (AskUserQuestion): continue to the next phase, or stop here.**
     - **Continue** → next phase.
     - **Stop** → go to §4c (this is the "user confirms stopping" trigger).
3. When the last selected phase completes → go to §4c (the "all steps finished" trigger).

### 4c. Push + open the combined PR

Reached only when all selected phases are done **or** the user chose to stop. Never push or PR mid-run.

1. **Confirm with the user** before pushing — show which phases are included and the branch name.
2. Push: `git push origin <JIRA-REF>/dc-migrate-oxfmt-oxlint`.
3. Open **one** PR covering the completed phases. Assemble the body from the collected phase-summary blocks, following DC PR conventions (Jira link first, author TL;DR, functional summary, short "Technical details", test plan). Title: `[<JIRA-REF>] Migrate to oxfmt + oxlint` (drop a phase from the title if it wasn't run).

## Skip routing — direct request

If the user asks for a specific phase ("just do the CI split", "redo the oxlint config"), skip detection and scope selection and invoke that sub-skill directly (standalone — its own branch + PR).

## Edge cases

- **Partial state** — e.g. `oxfmt` installed but `@datacamp/oxfmt-config` missing, or `oxlint.config.ts` present but uses raw `defineConfig` instead of `createConfig`. Route to the relevant sub-skill — it diagnoses and completes.
- **Scoped ESLint retention (`eslint.config.json.mjs`)** — some repos keep ESLint for JSON-linting only (hand-edited schemas, `eslint-plugin-i18n-json`). `dc-migrate-oxlint` covers the retention pattern; presence of `eslint` + `eslint.config.json.mjs` + no JS/TS `.eslintrc*` is the migrated end-state, not an unfinished migration.
- **Legacy single-PR migrations in progress** — repos already on the older `<JIRA-REF>/code-formatting-linting-upgrade` branch (one big PR for stage 1 + stage 2 + ci-split) should finish on that pattern. Don't re-route them to per-phase PRs. New repos use this skill's flow instead — per-phase PRs for standalone sub-skill runs, one combined PR for a multi-step orchestrated run (§4b/§4c).
- **Nx monorepos** — flag to the user; Nx-specific guidance is still being decided.

## Reporting

After detection (before asking scope), report:

1. Current state (what's installed, what configs exist, what CI looks like) — 3–5 lines.
2. The remaining phases, in recommended order.

Then ask scope (§3). Once on the multi-step path, before pushing (§4c) confirm the included phases and branch name.

## Principles

- **PR shape follows scope.** A single-step run delegates fully — the sub-skill opens its own per-phase PR. A multi-step orchestrated run produces **one combined PR** on a shared branch covering all completed phases. Per-phase PRs stay the default for standalone sub-skill use; the combined PR is the multi-step exception.
- **Never push or PR mid-run.** In multi-step mode, code is pushed and a PR opened only when every selected phase is done or the user explicitly stops — and only after an explicit confirmation.
- **Ask between phases.** After each phase commits, the user explicitly chooses continue-or-stop. The umbrella does not chain phases silently.
- **Self-contained sub-skills.** Each is invokable directly and verifies its own scope. Standalone, it branches + opens its own PR; orchestrated, it commits only and the umbrella owns branch + push + PR.
- **State-driven routing.** Repo state (devDeps, configs, scripts, CI shape) is the source of truth — no `.claude/CLAUDE.local.md` tracking file.
- **Format before lint, CI split last.** Reformatting first keeps `.git-blame-ignore-revs` clean and avoids oxlint reformatting imports oxfmt would touch; CI restructure goes last so format/lint settle first.

## Roadmap

Open items for the migration program, not blocking individual PRs.

1. **Benchmarking** — introduce a shareable script that measures local format/lint speeds (before/after the migration) and CI format/lint step durations (before/after), with outputs PR descriptions can quote and a post-migration tracker. Until this lands, PR descriptions omit benchmark tables; reviewers eyeball CircleCI step durations directly. The script should:
   - Produce comparable local timings against any DC repo (warmup + N runs, wall + internal time).
   - Pull CircleCI step durations by job/step name for a branch vs `master`.
   - Emit a Markdown table chunk PRs can paste directly.
   - Persist results so the post-migration tracker can chart improvements over time.
2. **Nx pattern (Pattern B)** — codify the Nx-specific migration shape. Currently flagged-and-paused in the sub-skills.
3. **Plugin packaging** — bundle the four skills as `dc-developer-migrate` with `plugin.json` + namespace prefixes once first-usage feedback exposes real shortcomings. Several reference files are currently byte-identical across `dc-migrate-oxfmt` and `dc-migrate-oxlint` (`husky-lint-staged-setup.md`, `monorepo-detection.md`, `vscode-settings.md`) — duplicated because skills install independently with no shared-file mechanism, so each copy must be hand-synced today. When packaged as a plugin, introduce a way to share these files across the bundled skills (e.g. a plugin-level `shared/` directory the skills reference, or a build step that hydrates copies from one source) so they live in one place.

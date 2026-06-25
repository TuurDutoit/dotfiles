---
name: dead-code
description: Find and remove dead code from a TypeScript repo using Knip + LLM triage with per-batch build verification, run locally inside the target repo (e.g. talent, translations-service). Use when asked to find or remove dead code, run a Knip sweep, or clean up unused files/exports/dependencies.
allowed-tools:
  - Bash
  - Read
  - Edit
metadata:
  version: '1.0.0'
---

# Dead Code

Remove dead code from a TypeScript repository. The flow is **detect → triage → propose → delete-with-verification**. The build/test step is the only reliable safety net — never skip it.

## Context

This skill runs **locally inside the target repo's working directory** — the user invokes it from there. It pairs Knip (dead-code detection) with LLM triage to filter false positives, then deletes in verified batches so a broken build never lands. Knip is run ephemerally via `npx`, never added as a repo dependency.

## Usage

Invoke from inside the target repo. The flow: preflight guards → run Knip → triage findings against framework/false-positive priors with import-pattern grep verification → present a categorized proposal for the user to cherry-pick from → delete the selected items in \~10-item batches, running typecheck/build/lint/test after each and reverting any batch that fails. It stops at "changes staged" — the user reviews and commits.

## Phase 0: Preflight (refuse if anything is off)

Check all of these before doing anything else. If any fails, stop and tell the user — don't try to "fix" the state.

1. **TypeScript repo?** — `test -f tsconfig.json && test -f package.json`. If not, refuse: "This skill is for TypeScript repos."

2. **Clean working tree?** — `git status --porcelain` must be empty. If not, refuse: "Working tree dirty — commit or stash first. Don't want to mix dead-code deletions with unrelated changes."

3. **Not on main/master?** — `git branch --show-current`. If on `main`/`master`, refuse: "Create a working branch first (e.g. `chore/dead-code-sweep-YYYYMMDD`)." Don't auto-create — let the user name it.

4. **Capture baseline** — record current branch name, and probe `package.json` for scripts named `build`, `typecheck`, `test`, `lint`. Note which exist. We'll run the ones present.

5. **Detect package manager from lockfile** — check in order:
   - `yarn.lock` present → use `yarn` (remove: `yarn remove`)
   - `pnpm-lock.yaml` present → use `pnpm` (remove: `pnpm remove`)
   - `package-lock.json` present → use `npm` (remove: `npm uninstall`)
   - Multiple lockfiles → refuse, ask the user which is canonical
   - No lockfile → assume `npm` but warn

   **Do not assume `npm`** — running `npm uninstall` in a yarn repo creates peer-dependency conflicts and pollutes the workspace.

6. **Capture tsconfig path aliases** — read `tsconfig.json` and extract `compilerOptions.paths` (note: tsconfig allows comments, so `jq` will fail — use `grep '"@'` or `node -e`). These aliases are needed for the Phase 2 verification grep. Example aliases from translations-service: `@util/* → src/util/*`, `@constants/* → src/constants/*`.

Report Phase 0 result in one line and move on.

## Phase 1: Run Knip

Use `npx` to run Knip ephemerally — **do not** add Knip as a devDependency to the repo. We don't want to mix tooling installs with the dead-code surface.

```text
npx --yes knip --reporter json
```

Notes:

- First run will download Knip; expect \~30–60s.
- Knip exits **non-zero whenever it finds issues** — that's its CI signal, not an error. Treat the JSON output as authoritative; only treat exit codes as failure if stderr is non-empty or JSON is missing.
- For Lerna / workspace monorepos (e.g. `talent`), Knip should auto-detect workspaces. If it errors out on workspace config, fall back to running it per-workspace (`npx --yes knip --workspace <name> --reporter json`) and merge results. Tell the user what you did.
- Save the raw JSON to a temp file (e.g. `/tmp/knip-<repo>-<timestamp>.json`) so you can re-read without re-running.

If Knip exits non-zero with no output, surface the error and stop — likely a config issue. Don't guess.

### Phase 1.5: Knip config check (offer to draft on first run)

Look for `knip.json`, `knip.ts`, `knip.config.{ts,js}`, or a `knip` key in `package.json`.

**If no config exists AND the run flagged >50 unused files:** stop the deletion flow and tell the user:

> Knip is running without a config on this repo. It's flagging N unused files, but most are likely false positives from missing entry-point declarations (nodemon entries, CLI scripts, test harnesses). Recommend opening a separate small PR with a `knip.json` first — it typically reduces FPs by 10× and surfaces real findings buried in the cascade. Want me to draft one based on this repo's structure?

Don't proceed with deletions until config exists, or the user explicitly says "ignore, sweep anyway." The translations-service run (2026-06-04) went from 96 → 9 unused files after adding 15 lines of config — that's the leverage we're protecting.

If a config exists: continue to Phase 2.

## Phase 2: LLM triage (filter likely false positives)

Knip reports several categories. Triage each, with the following priors:

**Likely real (lean toward keep as candidate):**

- Unused files where the filename / path doesn't match a known framework entry-point pattern
- Unused exports from non-public modules (no `index.ts` re-export downstream)
- Unused devDependencies that aren't referenced by any config file
- Unused enum members in app code

**Likely false positive (lean toward dropping from the candidate list):**

- Files under `pages/`, `app/`, `api/`, `routes/`, `migrations/` — framework entry points often look unimported
- Files matching `*.config.*`, `*.setup.*`, `*.fixtures.*`, `__mocks__/`
- Symbols referenced in string form (route registries, DI tokens, feature-flag keys, ORM associations) — grep the symbol name across the codebase before flagging real
- Generated code (`*.generated.ts`, `*.gen.ts`, anything next to a codegen config)
- Exports of a library/public-API repo's main entry (`src/index.ts` re-exports)
- Anything referenced in `package.json` scripts, Concourse YAML, Dockerfile, or `.github/`

**For each candidate that survives the prior, do an IMPORT-PATTERN verification grep — not a word-pattern grep.**

The word-pattern approach (`rg -l 'somefile'`) produces wildly inflated reference counts because common identifiers (e.g. "status", "templates") appear in unrelated code, log strings, SQL, types. We learned this the hard way on translations-service — `src/enums/status.ts` looked like it had 262 refs by word match, but had **zero** real imports. Always grep the actual import statement.

For unused **files**, try both relative-path and alias-path import patterns:

```bash
# Relative: from '../foo/bar' or from './bar'
rg "from ['\"](\.\./)*<path-without-ext>['\"]" --type ts --type js

# Alias (from tsconfig paths captured in Phase 0):
# e.g. src/util/foo.ts → @util/foo
rg "from ['\"]@<alias>/<rest-of-path>['\"]" --type ts --type js
```

If both patterns return zero hits, the file is genuinely unused — high confidence.

For unused **exports**, grep the exact symbol used as a named import or qualified access:

```bash
rg "(import\s+\{[^}]*\b<SYMBOL>\b[^}]*\}|<SYMBOL>\s*\()|<Module>\.<SYMBOL>\b" --type ts --type js
```

For unused **dependencies**, ALWAYS use import-statement patterns — never substring match:

```bash
# Both ES-module and CommonJS forms
rg "from\s+['\"]<pkg>(/.*)?['\"]" --type ts --type js
rg "require\(['\"]<pkg>(/.*)?['\"]" --type ts --type js
```

**Critical lesson (translations-service round 1, 2026-06-04):** A substring grep on `@koa/cors` (excluding package.json) returned "1 ref" which was misread as "no real usage" — but that 1 ref was the actual `import koaCors from '@koa/cors'` in `src/server.ts:14`. Any non-zero hit count on the import-statement grep means **the dep is used. Do not remove it.**

Also check for **dynamic access** patterns that would invalidate the finding:

- `<EnumOrObject>\[` (bracket access — Knip can't see the key)
- `require\(['"]` (dynamic require with template literal)

If you see dynamic access, demote to `low` confidence regardless of import grep result.

**Confidence tagging:**

- `high` — Knip flagged it AND verification grep returned only self-references (or the file itself)
- `medium` — Knip flagged it BUT verification grep had refs that look like type-only / re-export chains
- `low` — verification grep found real refs but Knip insists; surface but don't recommend deletion

## Phase 3: Present the proposal

Output a structured proposal the user can cherry-pick from. **Group by category, not by file** — easier to scan.

```text
Repo: <name>           Branch: <branch>
Knip raw findings: <total>      After triage: <kept>

## Unused files (N)
- [high]  src/foo/bar.ts        — no refs anywhere
- [high]  src/foo/baz.ts        — only self-imports
- [med]   src/legacy/x.ts       — referenced via dynamic key in src/router.ts:42

## Unused exports (N)
- [high]  src/utils/dates.ts — `formatRelative` (no refs)
- [med]   src/api/types.ts — `LegacyResponse` (type-only, possible external consumers)

## Unused dependencies (N)
- [high]  lodash.merge          — not imported anywhere; check Concourse/Dockerfile too
- [med]   @types/node-fetch     — paired with possibly-used node-fetch

## Dropped from list (filtered out, FYI)
- N framework entry points (pages/, app/)
- N config/fixture files
- N codegen outputs
```

Then ask the user which to delete. Accept these answer forms:

- Numbers / ranges: `1, 3, 5-7`
- Categories: `all high-confidence files`, `all unused-deps`
- Mixed: `all unused-deps + items 3 5 7`
- `none` / abort

Do not proceed without explicit selection.

## Phase 4: Batched deletion with verification

Group selected items into batches of **\~10 deletions each**. Process one batch at a time:

1. **Apply the batch:**
   - Files: `git rm <path>`
   - Exports: edit the file to remove the unused export (do not delete the file if other exports remain)
   - Deps: use the package manager **detected in Phase 0 step 5** — `yarn remove <pkg>` / `pnpm remove <pkg>` / `npm uninstall <pkg>`. Never default to `npm` — yarn/pnpm repos will explode with peer-dep conflicts.

2. **Verify (run only the scripts that exist; skip the rest):**
   - **If this batch removed any dependency**: first delete `.eslintcache` (or run lint with `--no-cache`). ESLint's cache does NOT invalidate on `package.json` changes — a stale cache made a clean local run hide the `import/no-extraneous-dependencies` error that CI then caught (translations-service PR #1113, 2026-06-04).
   - `npm run typecheck` (or `tsc --noEmit` if no script)
   - `npm run build`
   - `npm run lint`
   - `npm run test` — for `translations-service` use the vitest script; for `talent` use the jest script. Allow this to be skipped if the user flags the repo as having a slow test suite — but **always** run typecheck + build.

3. **On any failure:**
   - `git restore .` (keeps the batch reverted but preserves prior batches)
   - For dep removals: also `git restore package.json <lockfile>` where `<lockfile>` is the one detected in Phase 0 (yarn.lock / pnpm-lock.yaml / package-lock.json)
   - Mark the batch as **reverted** in the running log, with the failing command + first 20 lines of stderr
   - Continue to the next batch (don't abort the whole run)

4. **On success:**
   - Leave changes staged (`git add -u` if needed)
   - Move to next batch

**Do not commit.** The user reviews `git status` / `git diff --cached` and commits.

## Phase 5: Final report

```text
Dead-code sweep complete.

Selected: N items
Applied:  M items across K batches (all verified)
Reverted: L items in J batches — see details below

Reverted batches:
  Batch 3 (4 items): tests failed after removing src/foo/bar.ts
    > FAIL  src/baz.test.ts: "imports formatRelative" — file under test imports the removed util
    Items: <list>

Next step: review with `git status` / `git diff --cached`, then commit.
```

If everything was reverted, say so plainly and recommend not committing — likely a config issue with Knip's prior on this repo (especially for monorepos).

## Tone / conventions

- Be specific about file paths and line numbers when surfacing findings — use the same `file:path` convention as `/code-review`.
- Don't write planning docs or summary markdown files. The chat output is the report.
- Don't open a PR. V1 stops at "changes staged, you commit." A future V2 may draft a PR.
- Don't try to be clever about reordering deletions across batches to "save" a failing one — keep the order the user specified.
- If Knip's output is empty / says "no issues", say "Repo is clean per Knip — nothing to remove" and stop. Don't manufacture findings.

## Repo-specific notes (update as we learn)

**talent** — Lerna monorepo. Knip needs to traverse workspaces. Build = `lerna run build`. Test = `jest` (potentially slow per package).

**translations-service** — single-package. Yarn. Build = `tsc -p tsconfig.build.json && resolve-tspaths`. Test = vitest (`npm test` works because yarn-installed bins resolve too, but use `yarn` for installs/removes). `knip.json` lives at root (PR #1114) — declares `src/server.ts`, `scripts/**`, `flow_tester/**`, `acceptance_tests/**/*.spec.ts` as entries; ignores `venv/**`. tsconfig path aliases: `@util/*`, `@constants/*`, `@enums/*`, `@models/*`, `@services/*`, `@controllers/*`, `@config/*`, `@middleware/*`, `@schemas/*`, `@repositories/*`, `@parsers/*`, `@context/*`, `@errors/*`, `@db/*`, `@mocks/*`. Strict whole-repo tsconfig has 58 pre-existing TS errors in spec files — use `tsc -p tsconfig.build.json` for clean typecheck.

---
name: dc-migrate-oxlint
description: Migrate a DataCamp repo's linter from ESLint to oxlint using @datacamp/oxlint-config's createConfig helper. Opens a single PR. Trigger phrases — "switch the linter to oxlint", "replace ESLint with oxlint in this DC repo", "set up @datacamp/oxlint-config", "add oxlint.config.ts with createConfig and presets", "drop @datacamp/eslint-config", "handle ESLint→oxlint namespace renames (perfectionist→dc-sorting, analytics→dc-analytics, @typescript-eslint/*→typescript/*)", "retain ESLint for JSON linting". The DC-specific package (@datacamp/oxlint-config) distinguishes this from the generic migrate-oxlint skill.
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
metadata:
  version: '1.0.0'
  tags: lint, oxlint, oxc
---

# DataCamp ESLint → oxlint migration

One PR. Branch: `<JIRA-REF>/dc-migrate-oxlint` — resolve `<JIRA-REF>` from the argument or ask (see `## Arguments`).

## Context

DC linter migration uses two pieces:

- `oxlint` — the binary.
- `@datacamp/oxlint-config` — a private DC package exposing a `createConfig` golden-path helper with named presets.

`createConfig` matters because oxlint requires both `plugins` and `jsPlugins` to live at the **repo level** config; if declared inside an `extends`'d shared config, they're silently ignored (rules don't fire, no error). `createConfig` derives both from the preset list and places them correctly. This is why we don't use the generic `/migrate-oxlint` skill — it generates standalone configs, not preset-composed ones.

The current `createConfig` surface, preset list, and bundled jsPlugins are in the `@datacamp/oxlint-config` README at the version pinned in this repo (`node_modules/@datacamp/oxlint-config/README.md`). Read it at the pin rather than paraphrasing here.

**oxlint runs ESLint plugins — never tell the user it can't.** Two mechanisms: the bundled `oxlint-plugin-eslint` compatibility layer (native-speed ports of common ESLint rules) and `jsPlugins` (runs a real ESLint plugin's JS at lint time). What's occasionally missing is a _specific rule's_ oxlint port — a rule-level gap, not a plugin-execution limit. `jsPlugins` are not free, so choose the path by cost (step 8 ladder).

## Usage

This skill replaces an existing ESLint setup with oxlint.

Use when:

- `eslint` in devDeps with `.eslintrc*` or `eslint.config.*` (JS/TS — not the JSON-only retention pattern).
- `@datacamp/eslint-config` in devDeps.
- User says "switch to oxlint" / "drop ESLint" / similar.
- Umbrella `dc-migrate-oxfmt-oxlint` routed here.

JS-only repos: oxlint gets set up anyway. DC standard everywhere.

**Do NOT run if (blocking — STOP and report which condition matched):**

- **Already migrated** — `oxlint` + `@datacamp/oxlint-config` are in devDeps and `oxlint.config.ts` exists using `createConfig`. (Partial state — `oxlint` installed but the config uses raw `defineConfig`, or a stale `.oxlintrc.json` — is NOT a stop; continue and complete it.)
- **JSON-lint retention end-state** — `eslint` + `eslint.config.json.mjs` present with NO JS/TS `.eslintrc*` / `eslint.config.*`. This is the migrated end-state (see `references/json-linting-retention.md`), not an unfinished migration.
- **Nothing to migrate and no explicit request** — no `eslint` in devDeps and no `.eslintrc*` / `eslint.config.*`. If the user explicitly wants oxlint stood up on a repo with no prior linter, proceed; otherwise stop and confirm before installing.

## Arguments

`$ARGUMENTS` (optional) — the Jira reference for the migration branch, accepted as either:

- a bare ref: `DP-1803`
- a full Jira issue URL: `https://datacamp.atlassian.net/browse/DP-1803`

Resolve a URL to its ref by taking the trailing `/browse/<REF>` path segment. The branch becomes `<JIRA-REF>/dc-migrate-oxlint`. If `$ARGUMENTS` is empty, ask the developer for the Jira ref before branching.

## Orchestrated (delegated) mode

When the `dc-migrate-oxfmt-oxlint` umbrella runs a multi-phase migration it invokes this skill with an orchestration directive in `$ARGUMENTS`, e.g.:

> `DP-1803 [orchestrated: branch DP-1803/dc-migrate-oxfmt-oxlint already checked out — commit your work, do NOT branch, push, or open a PR; return a phase-summary block]`

In that mode:

- **Skip step 1 (Branch)** — the shared branch already exists and is checked out. Do not create or switch branches.
- **Do all migration work and commit it** on the current branch exactly as documented.
- **Skip step 21 (PR)** — do NOT `git push` or open a PR.
- **Return a short phase-summary block** (deps added/removed, presets chosen, configs created, scripts added, namespace renames handled, any JSON-linting retention) for the umbrella to fold into the combined PR body.

Absent the directive, run **standalone**: branch off master and open your own PR as documented below.

## Status

Inventory the repo before starting (the `## Usage` gate has already confirmed the skill should run):

1. **Node version** — `.nvmrc` / `.tool-versions`. Hard minimum `^20.19.0 || >=22.18.0` (required for `.ts` config files via Node native type stripping). Suggested `>=24.15.0`. Flag below the hard minimum.
2. **devDeps** — `eslint`, `@datacamp/eslint-config`, `eslint-plugin-*`, `oxlint`, `@datacamp/oxlint-config`.
3. **Configs** — `.eslintrc*`, `eslint.config.*`, `oxlint.config.ts`. Flag stale JSON oxlint configs (`.oxlintrc.json`) — they need `.ts` format.
4. **Scripts** — `lint:check`, `lint:check:ci`, `lint:fix`, `check`, `fix`, `typecheck`.
5. **Monorepo** — `workspaces` in root `package.json` or `nx.json`. If yes, read `references/monorepo-detection.md` (Pattern A/B).
6. **`.yarnrc.yml`** — `npmPreapprovedPackages: ["@datacamp/*"]` present?
7. **JSON-linting retention candidate?** Read `references/json-linting-retention.md` "Detection signals" and check up front — affects what's removed in cleanup.

Report a checklist of what's done and what remains. Confirm before proceeding.

## Workflow

### 1. Branch

```sh
git checkout master && git pull origin master
git switch -c <JIRA-REF>/dc-migrate-oxlint
```

Verify with `git branch --show-current`.

### 2. Discover versions

```sh
yarn npm info @datacamp/oxlint-config --fields dist-tags peerDependencies
```

Read the `@beta` dist-tag and matching `oxlint` peer-dep range. Surface both, confirm before installing. Pre-1.0.0 `@beta` ≈ `@latest`; explicit `@beta` preferred for clarity.

If lookup fails with auth error, fix `.yarnrc.yml` (`npmRegistries` / `npmAuthToken`) first.

Fallbacks: `yarn info @datacamp/oxlint-config dist-tags` (Yarn 1), `npm view @datacamp/oxlint-config dist-tags`.

### 3. Pick presets

Decide which presets this repo needs (used in step 5; pick now so the PR description can name them). Read `references/preset-detection.md` for the full detection signals — quick version:

- **Always**: `base`, `typescript`, `import`.
- **React** (has `react` in deps): add `react`.
- **Node.js backend** (has `express`, `koa`, `fastify`, `@nestjs/*`): add `node`.
- **Jest** (has `jest` in devDeps): add `jest`.
- **Vitest** (has `vitest` in devDeps): add `vitest`.
- **Analytics**: suggest for JSX/TSX frontend repos (the preset's `dc-analytics/require-track-id` only meaningfully applies when the codebase has JSX). Confirm with user — the rule enforces `data-trackid` on interactive elements.

### 4. Pre-install setup

- Confirm `node_modules` exists (else `yarn install`).
- Add `npmPreapprovedPackages: ["@datacamp/*"]` to `.yarnrc.yml` if absent.
- If `.yarnrc.yml` has `enableScripts: false`, remove it (blocks `postinstall`/`prepare`).
- If repo uses `@lavamoat/allow-scripts`, add `"husky": true` to the allowlist.

### 5. Understand existing ESLint setup

Read `.eslintrc*` to map:

- Which `@datacamp/eslint-config` variant — `base` (index), `typescript`, or `typescript-with-type-information`.
- Repo-specific rule overrides / additions.
- The `--ext` flag in the lint script.
- Extra plugins beyond the shared config.

Repo-specific overrides pass through to `createConfig`'s `rules` option. Plugin overrides pass through `plugins` / `jsPlugins`.

### 6. Optional: auto-migrate for comparison

For repos with complex custom rules:

- Ask before: `npx @eslint/migrate-config` → `eslint.config.mjs`.
- Ask before: `npx @oxlint/migrate eslint.config.mjs` → `oxlint.config.ts`.
- Compare with the preset system to spot gaps.
- Delete temp files — the preset-composed config is what ships.

### 7. Install

```sh
yarn add -D oxlint@<version> @datacamp/oxlint-config@beta
```

**Do not install** `oxlint-plugin-eslint`, `eslint-plugin-prefer-type-alias`, `eslint-plugin-perfectionist`, `eslint-plugin-sonarjs` — `@datacamp/oxlint-config` ships them transitively, and sorting is now a custom zero-dep jsPlugin inside the package.

Monorepo: **binary** (`oxlint`) in every workspace with lint scripts; **shared config** (`@datacamp/oxlint-config`) at root only. See `references/monorepo-detection.md`.

### 8. Create `oxlint.config.ts`

```ts
import { createConfig } from '@datacamp/oxlint-config';

export default createConfig({
  ignorePatterns: ['acceptance_tests'],
  presets: ['base', 'typescript', 'import', 'react', 'jest', 'analytics'],
});
```

Select presets from step 3.

**Repo-specific additions are supported and additive.** `createConfig` accepts `jsPlugins?: string[]` and `plugins?: ...` that merge (deduped) with the preset-derived list.

**Carrying an ESLint rule/plugin forward — cheapest path first.** oxlint can honor almost every ESLint rule; pick the lowest-overhead path that preserves the rule's value:

1. **Native oxlint rule or preset** — zero JS overhead. If oxlint ports the rule (natively or via the bundled `oxlint-plugin-eslint` compat layer), use it and translate the namespace (`references/namespace-renames.md`). The default; most `@typescript-eslint/*`, `import/*`, `react/*`, `jest/*` rules land here via presets.
2. **Custom zero-dep jsPlugin in a preset** — e.g. `dc-sorting`, `import-extras`. Light, shared, already wired. Contribute back if shared across repos.
3. **Real ESLint plugin via `jsPlugins`** — works, but each runs its JS at lint time and drags in transitive deps. Real cost: `@datacamp/oxlint-config` benchmarked `eslint-plugin-import` at **+156ms / +80% lint time / +81 transitive deps for a single rule** (README) — which is why DC ported that rule to a zero-dep jsPlugin instead. Reach for it only when the plugin delivers value unavailable natively (campus-app: `eslint-plugin-cypress`, `eslint-plugin-i18next`, `eslint-plugin-lodash`). Add only plugins whose rules you actually enable.
4. **Defer the rule** — if unported and not worth a heavy plugin, leave a commented `// uncomment when the rule lands` TODO (campus-app pattern, e.g. `import/no-extraneous-dependencies`) rather than pulling a full plugin for one low-value rule.

Don't drop a rule on the assumption "oxlint doesn't support the plugin" — that's rarely true. Weigh native > zero-dep jsPlugin > real-plugin jsPlugin > defer, performance as the tiebreaker. Reach for a preset (or contribute to one) when an addition is shared across multiple repos.

**Repo-specific rule overrides:**

```ts
export default createConfig({
  ignorePatterns: ['acceptance_tests'],
  presets: ['base', 'typescript', 'import', 'node', 'vitest'],
  rules: {
    'no-console': 'warn',
    'typescript/no-non-null-assertion': 'off',
  },
});
```

**Translate ESLint-style rule keys to oxlint canonical names.** Carried-over overrides likely use ESLint plugin namespaces (`@typescript-eslint/*` etc.) — most become `typescript/*`, a few `eslint/*`, two TS-unaware ports under `eslint-js/*`. See `references/namespace-renames.md` for the full table. Wrong namespace silently no-ops the override; verify each override fires on a known violation after install.

**`ignorePatterns`** — always declare at repo level. oxlint **overwrites** (not merges) `ignorePatterns` from `extends`. DC default `['acceptance_tests']` belongs in every repo.

Common per-repo lint ignores:

| Pattern                                                 | Why                                                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `**/*.generated.*`                                      | Generated source; lint rules fire on patterns the generator can't avoid.               |
| Generator outputs (`graphql.schema.ts`, `polyfills.js`) | Same.                                                                                  |
| `*.d.ts`                                                | Judgment call — most emitted by `tsc` (exclude); some hand-edited augmentation (keep). |

Format-exclude vs lint-exclude isn't always symmetric — e.g. `src/languages/resources.generated.ts` may be lint-excluded but format-included.

**Escape hatch** — if `createConfig`'s options don't cover the team's need, drop to primitives: `import { baseConfig, plugins, jsPlugins, ... } from '@datacamp/oxlint-config'` and call oxlint's own `defineConfig`. See the README's "Escape hatch" appendix. Prefer contributing a preset back first.

### 9. Add lint scripts (alpha-sorted)

```json
"lint:check": "oxlint --report-unused-disable-directives",
"lint:check:ci": "oxlint --report-unused-disable-directives --threads ${DC_OXC_THREADS:-2}",
"lint:fix": "oxlint --fix"
```

`--report-unused-disable-directives` replaces ESLint's `eslint-comments/no-unused-disable`.

**CJS repos** — prefix scripts with `NODE_OPTIONS='--disable-warning=MODULE_TYPELESS_PACKAGE_JSON'`.

### 10. Add `typecheck` script (TS projects only)

```json
"typecheck": "tsc --noEmit"
```

No `:ci` variant — `tsc` has no thread knob. Skip for JS-only repos.

### 11. Add `check` and `fix` composites

These are **required** — parallel DC initiative has justfile recipes that map 1-to-1.

TS repo:

```json
"check": "yarn typecheck && yarn format:check && yarn lint:check",
"fix": "yarn lint:fix && yarn format:fix && yarn typecheck"
```

JS-only repo:

```json
"check": "yarn format:check && yarn lint:check",
"fix": "yarn lint:fix && yarn format:fix"
```

Order rationale:

- `check`: typecheck → format → lint. Typecheck catches structural TS errors first; format/lint polish after.
- `fix`: lint → format → typecheck. Lint autofix first (e.g. `consistent-type-imports` splits imports); format cleans up; typecheck reports remaining errors against the post-fix tree.

**No `check:ci` composite** — CI calls the `:ci` sub-scripts directly as three per-phase steps (see `dc-migrate-ci-format-lint`). This preserves step-level timing in CircleCI.

### 12. Rename old-style lint scripts

`lint` (bare) → `lint:check`; `lint:ci` → `lint:check:ci`. Bodies get replaced with oxlint commands from step 9. `lint:fix` keeps its name — body changes ESLint → oxlint.

### 13. Fix lint issues

Split mechanical churn from real fixes so git blame stays useful (mirrors `dc-migrate-oxfmt` steps 9–10).

1. **Commit the setup first.** Everything from steps 7–12 (install, `oxlint.config.ts`, scripts, composites, renames) is config — commit it as its own commit **before** autofixing.
2. **Bulk autofix in its own commit:**
   ```sh
   yarn lint:fix     # mechanical: consistent-type-imports import splits, etc.
   yarn format:fix   # re-sort the imports lint:fix just split
   yarn lint:check
   ```
   Commit the result **alone** — a large mechanical rewrite, same class as the oxfmt reformat. This is the commit that goes in `.git-blame-ignore-revs` (below).
3. **Manual fixes are separate and NOT blame-ignored.** Non-autofixable `correctness` errors needing judgment go in their own follow-up commit(s) — these are real changes you want to keep in blame.

**Git blame.** Add the bulk-autofix commit's full 40-char SHA to `.git-blame-ignore-revs` (`git blame --ignore-revs-file` requires full SHAs). Create the file if absent; append below the oxfmt reformat SHA if that phase already made it. GitHub reads it automatically; locally:

```sh
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

Only the mechanical autofix commit goes here — never the setup or manual-fix commits.

**Do NOT remove `eslint-disable` comments** that trigger `--report-unused-disable-directives` warnings — they reference rules that don't exist in oxlint yet. Parity is a separate track. Leave all disable comments in place.

**Nest DI workaround** — if the repo uses NestJS, oxlint's `typescript/consistent-type-imports` autofix breaks DI silently. Read `references/nest-di-workaround.md` before running `lint:fix`.

### 14. Remove old deps

Remove: `eslint`, `@datacamp/eslint-config`, `eslint-config-prettier`, all `eslint-plugin-*` packages **except any intentionally retained as `jsPlugins`** in `oxlint.config.ts` (e.g. campus-app keeps `eslint-plugin-cypress` / `-i18next` / `-lodash`) — those stay in devDeps.

Also if present: `oxlint-plugin-eslint`, `eslint-plugin-prefer-type-alias`, `eslint-plugin-perfectionist`, `eslint-plugin-sonarjs` (transitively provided or replaced).

Delete: `.eslintrc`, `.eslintrc.json`, `.eslintrc.js`, `.eslintcache`.

**Scoped ESLint retention exception** — if `references/json-linting-retention.md` "Detection signals" apply, keep `eslint` + the scope-specific plugin(s) (`eslint-plugin-json@^4`, `eslint-plugin-i18n-json@^4`). Remove everything else as normal. Retention pattern's full setup is in that reference.

### 15. Disable comments — namespace renames

Most existing `eslint-disable` / `eslint-disable-next-line` comments work in oxlint unchanged. Don't rename them — cosmetic churn.

**Exception** — some rules changed namespace between `@datacamp/eslint-config` and `@datacamp/oxlint-config`. Disable comments referencing the old namespace silently no-op (rules don't exist under those names). Same for `rules` overrides in `oxlint.config.ts`.

Read `references/namespace-renames.md` for the full table and grep commands. Scan, rewrite, re-grep (expected output: zero), then `yarn lint:check` with `--report-unused-disable-directives` to catch comments now targeting non-firing rules.

### 16. Cleanup

- Remove `.eslintignore`, `.prettierignore` if still present.
- Remove eslint-related `packageExtensions` from `.yarnrc.yml` if present.
- `.editorconfig` — align with `@datacamp/oxfmt-config` `baseConfig` defaults (indent width, end-of-line, trim trailing whitespace, insert final newline). Update to match if drift.
- `.vscode/settings.json` — read `references/vscode-settings.md`. Net: remove or replace `"source.fixAll.eslint"` with `"source.fixAll.oxc": "always"`; set `"eslint.enable": false`.

### 17. JSON-linting retention (if applicable)

If "Detection signals" in `references/json-linting-retention.md` apply, follow the retention pattern in that file: keep `eslint@^9`, `eslint-plugin-json@^4` / `eslint-plugin-i18n-json@^4`, create `eslint.config.json.mjs` (flat config), add `lint:check:json` / `lint:fix:json` scripts, wire into the `check` composite (last phase).

### 18. Update pre-commit hook

If `dc-migrate-oxfmt` already ran, the husky/lint-staged setup exists. Add the `oxlint --fix` line **before** the existing `oxfmt` line in the `package.json` `lint-staged` block:

```json
"lint-staged": {
  "*": [
    "oxlint --fix --no-error-on-unmatched-pattern",
    "oxfmt --no-error-on-unmatched-pattern"
  ]
}
```

If neither ran yet, set up husky/lint-staged from scratch — read `references/husky-lint-staged-setup.md`.

**Ordering matters: `oxlint --fix` before `oxfmt`.** oxlint's `consistent-type-imports` autofix splits imports without re-sorting; oxfmt then sorts/groups correctly. Reversed order leaves unsorted imports that fail `format:check`.

**Both need `--no-error-on-unmatched-pattern`.** With `*`, a docs-only or JSON-only commit hands oxlint zero recognized files and it exits 1 (`No files found to lint`), blocking the commit. Flag suppresses that. On oxfmt the flag is defensive.

### 19. SonarCloud

If `sonar-project.properties` or `.sonarcloud.properties` exists, add `oxlint.config.ts` to `sonar.exclusions` (alongside `oxfmt.config.ts` if added in `dc-migrate-oxfmt`):

```properties
sonar.exclusions=…existing patterns…,**/oxlint.config.ts
```

### 20. Verify

- `yarn check` passes (or `yarn format:check && yarn lint:check` for JS-only — no `typecheck` script exists there; see step 10).
- `yarn test` passes.
- No `eslint`, `@datacamp/eslint-config`, `eslint-config-prettier`, `pretty-quick`, `oxlint-plugin-eslint`, `eslint-plugin-prefer-type-alias` in devDeps. No `eslint-plugin-*` in devDeps **except** the scope-specific plugin(s) under step 17. `eslint` itself is only permitted when step 17 applies.
- **Is** in devDeps: `@datacamp/oxlint-config`, `oxlint`.
- No `.eslintrc*` or `eslint.config.*` files **except** `eslint.config.json.mjs` under step 17 if applicable.
- `oxlint.config.ts` uses `createConfig`. Any `plugins` / `jsPlugins` are passed _as parameters to `createConfig`_ — never wired manually at the config root. Rule keys use oxlint canonical names — no `@typescript-eslint/*` keys carried over.
- Scripts: `lint:check`, `lint:check:ci`, `lint:fix`, `check`, `fix`, plus `typecheck` for TS repos, plus `lint:check:json` / `lint:fix:json` if step 17 applies. No bare `lint`. No `check:ci` composite.
- `.husky/pre-commit` runs `lint-staged`.
- `.git-blame-ignore-revs` contains the bulk lint-autofix commit SHA (mechanical autofix only — not the setup or manual-fix commits).
- `lint-staged` block includes `oxlint --fix --no-error-on-unmatched-pattern` before any `oxfmt` line.
- No stale ESLint/Prettier references in `.vscode/settings.json`.
- `eslint-disable` comments referencing rules not in oxlint are expected — don't flag or remove. **Exception**: `@datacamp/workspace/track-clicks` / `perfectionist/*` / `analytics/*` / `sorting/*` must be rewritten or removed (step 15).

> **Yarn 1 caveat:** `check` is a reserved Yarn 1 command (package integrity check) — `yarn check` runs that, not the repo's script. On Yarn 1 repos use `yarn run check`. Yarn 4 has no such conflict.

### 21. PR

Read `references/pr-description.md`.

## Common issues

**`yarn install` fails with "No candidates found"** — `npmMinimalAgeGate` blocks a recently-published beta/canary. Add `@datacamp/*` to `npmPreapprovedPackages`, wait the gate out, or pin to an older version.

**`yarn add @datacamp/oxlint-config@<tag>` fails with "no matching version"** — dist-tag doesn't exist. Check `yarn npm info @datacamp/oxlint-config --fields dist-tags`. `@canary` exists only while a PR with `[canary]` commits is mid-flight.

**oxlint reports errors on rules not in the shared config** — `correctness` category enables many rules by default. Fix the code or pass `rules: { 'rulename': 'off' }` to `createConfig`.

**`yarn lint:check` shows different results than `yarn lint:fix`** — some rules have suggestions but not autofixes. Run `lint:check` after `lint:fix` to see what remains.

**CI fails on `DC_OXC_THREADS`** — `${DC_OXC_THREADS:-2}` needs shell expansion. If CI runs scripts in a context that doesn't expand env vars, hardcode a value.

**Nest backend DI silently breaks after `lint:fix`** — `typescript/consistent-type-imports` autofix. Read `references/nest-di-workaround.md`. Detection: `@nestjs/*` in deps.

**Monorepo: per-workspace `oxlint.config.ts` + a root config for root-level files** — each workspace gets its own config; the root config governs files outside any workspace. Per-file walk-up handles invocation-cwd independence. See `references/monorepo-detection.md`.

## Principles

- **One PR, single scope.** Lint only. Format and CI restructure are separate sub-skills.
- **Bulk autofix in its own commit**, captured in `.git-blame-ignore-revs`. Setup (config/scripts/hooks) and manual fixes are separate commits — only the mechanical `lint:fix` churn is blame-ignored.
- **`createConfig`, not standalone `defineConfig`.** Preset composition + correct repo-level placement of `plugins` / `jsPlugins` is the whole point.
- **`plugins` / `jsPlugins` as parameters to `createConfig`** — additive, deduped against preset-derived list. Never wire manually at the config root.
- **Leave `eslint-disable` comments in place** — they work in oxlint. Renaming is cosmetic follow-up. Exception: namespace-changed rules.
- **Composites are required.** `check` and `fix`, plus `typecheck` if TS. Parallel justfile initiative across DC depends on this contract.
- **Alpha-sort** script arguments: flags before positional args.

## References

- `references/pr-description.md` — PR structure: WIP banner, summary, benchmarks tables, technical details, test plan.
- `references/namespace-renames.md` — full rule namespace rename table (`@typescript-eslint/*` → `typescript/*`, `perfectionist/*` → `dc-sorting/*`, `analytics/*` → `dc-analytics/*`, `jest/no-try-expect` → `jest/no-conditional-expect`), grep commands.
- `references/json-linting-retention.md` — when to keep ESLint for JSON, the `eslint.config.json.mjs` pattern, scoped scripts, CI wiring.
- `references/nest-di-workaround.md` — `consistent-type-imports` breaks Nest DI silently; scoped override or open question for full-Nest backends.
- `references/preset-detection.md` — which presets to pick based on deps signals.
- `references/monorepo-detection.md` — Pattern A (workspaces) / Pattern B (Nx), binstub placement.
- `references/husky-lint-staged-setup.md` — Yarn 4 vs Yarn 1 setup-script, husky v9 vs v8, `NODE_OPTIONS` export, lavamoat, `HUSKY=0`.
- `references/vscode-settings.md` — `.vscode/settings.json` shape, `.gitignore` allowlist.

Current `createConfig` surface, preset list, and bundled jsPlugins are in the `@datacamp/oxlint-config` README at the version pinned in this repo (`node_modules/@datacamp/oxlint-config/README.md`). Don't paraphrase here — read at the pin.

Sources on master:

- [`packages/oxlint-config/README.md`](https://github.com/datacamp-engineering/toolchain/blob/master/packages/oxlint-config/README.md)
- [`packages/oxlint-config/docs/rule-decisions.md`](https://github.com/datacamp-engineering/toolchain/blob/master/packages/oxlint-config/docs/rule-decisions.md)
- [`packages/oxlint-config/docs/rules.md`](https://github.com/datacamp-engineering/toolchain/blob/master/packages/oxlint-config/docs/rules.md)

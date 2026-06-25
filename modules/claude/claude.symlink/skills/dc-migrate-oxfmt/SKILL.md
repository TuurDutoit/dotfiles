---
name: dc-migrate-oxfmt
description: Migrate a DataCamp repo's formatter from Prettier to oxfmt using @datacamp/oxfmt-config. Opens a single PR. Trigger phrases — "switch the formatter to oxfmt", "replace Prettier with oxfmt in this DC repo", "set up @datacamp/oxfmt-config", "add oxfmt.config.ts with baseConfig", "drop Prettier and @datacamp/prettier-config", "install oxfmt with DC defaults". The DC-specific package (@datacamp/oxfmt-config) distinguishes this from the generic migrate-oxfmt skill.
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
  tags: format, oxfmt, oxc
---

# DataCamp Prettier → oxfmt migration

One PR. Branch: `<JIRA-REF>/dc-migrate-oxfmt` — resolve `<JIRA-REF>` from the argument or ask (see `## Arguments`).

## Context

DC formatter migration uses two pieces:

- `oxfmt` — the binary.
- `@datacamp/oxfmt-config` — a private DC package providing `baseConfig` (printWidth, sortImports tiers, ignorePatterns, etc.).

The shared config is spread into a per-repo `oxfmt.config.ts`. `baseConfig`'s current defaults and `internalPattern` set are documented in the `@datacamp/oxfmt-config` README at the version pinned in this repo — read `node_modules/@datacamp/oxfmt-config/README.md` after install rather than paraphrasing the surface.

## Usage

This skill replaces an existing Prettier setup with oxfmt; it is not a generic formatter installer.

Use when:

- `prettier` (or `@datacamp/prettier-config`) in devDeps, or any `prettier.config.*` / `.prettierrc*` file present.
- User says "switch to oxfmt" / "drop Prettier" / similar.
- Umbrella `dc-migrate-oxfmt-oxlint` routed here.

**Do NOT run if (blocking — STOP and report which condition matched):**

- **Nothing to migrate** — no `prettier` (or `@datacamp/prettier-config`) in devDeps and no `prettier.config.*` / `.prettierrc*` / `.prettierignore`. There is no Prettier setup to replace.
- **Already migrated** — `oxfmt` + `@datacamp/oxfmt-config` are in devDeps, `oxfmt.config.ts` exists, and `format:check` / `format:fix` invoke `oxfmt`. (Partial state — e.g. `oxfmt` installed but `@datacamp/oxfmt-config` or `oxfmt.config.ts` missing — is NOT a stop; continue and complete it.)
- **A different formatter owns formatting** — Biome (`biome.json` / `[formatter]`), dprint (`dprint.json`), or rome (`rome.json`). Out of scope: flag to the user and stop rather than ripping it out. The generic `migrate-oxfmt` skill covers Biome → oxfmt.

## Arguments

`$ARGUMENTS` (optional) — the Jira reference for the migration branch, accepted as either:

- a bare ref: `DP-1803`
- a full Jira issue URL: `https://datacamp.atlassian.net/browse/DP-1803`

Resolve a URL to its ref by taking the trailing `/browse/<REF>` path segment. The branch becomes `<JIRA-REF>/dc-migrate-oxfmt`. If `$ARGUMENTS` is empty, ask the developer for the Jira ref before branching.

## Orchestrated (delegated) mode

When the `dc-migrate-oxfmt-oxlint` umbrella runs a multi-phase migration it invokes this skill with an orchestration directive in `$ARGUMENTS`, e.g.:

> `DP-1803 [orchestrated: branch DP-1803/dc-migrate-oxfmt-oxlint already checked out — commit your work, do NOT branch, push, or open a PR; return a phase-summary block]`

In that mode:

- **Skip step 1 (Branch)** — the shared branch already exists and is checked out. Do not create or switch branches.
- **Do all migration work and commit it** on the current branch exactly as documented — the standalone commit boundaries still apply (config/dep changes first, then the reformat as its own commit for `.git-blame-ignore-revs`).
- **Skip step 15 (PR)** — do NOT `git push` or open a PR.
- **Return a short phase-summary block** (deps added/removed, configs created, scripts added, notable per-repo `ignorePatterns`/`internalPattern` decisions, the reformat SHA) for the umbrella to fold into the combined PR body.

Absent the directive, run **standalone**: branch off master and open your own PR as documented below.

## Status

Inventory the repo before starting (the `## Usage` gate has already confirmed the skill should run):

1. **Node version** — `.nvmrc` / `.tool-versions`. Hard minimum `^20.19.0 || >=22.18.0` (required for `.ts` config files — Node native type stripping). Suggested target `>=24.15.0` (DC default, bundles npm `>=11.12.1`). Flag if below the hard minimum.
2. **devDeps** — presence of `prettier`, `@datacamp/prettier-config`, `pretty-quick`, `eslint-plugin-prettier`, `eslint-config-prettier`, `oxfmt`, `@datacamp/oxfmt-config`.
3. **Configs** — `prettier.config.*`, `.prettierrc*`, `.prettierignore`, `oxfmt.config.ts`.
4. **Scripts** — `format:fix`, `format:check`, `format:check:ci`.
5. **Monorepo** — `workspaces` in root `package.json` or `nx.json`. If yes, read `references/monorepo-detection.md` for Pattern A/B before installing. Nx is pending decision — flag.
6. **`.yarnrc.yml`** — should include `npmPreapprovedPackages: ["@datacamp/*"]`. Without it, freshly-published canary/beta versions hit `npmMinimalAgeGate`.

Report a checklist of what's done and what remains. Confirm with user before proceeding.

## Workflow

### 1. Branch

```sh
git checkout master && git pull origin master
git switch -c <JIRA-REF>/dc-migrate-oxfmt
```

Verify with `git branch --show-current`. No commits on master/main.

### 2. Discover versions

```sh
yarn npm info @datacamp/oxfmt-config --fields dist-tags peerDependencies
```

Read the `@beta` dist-tag (default pre-1.0.0) and matching `oxfmt` peer-dep range. Surface both to the user and confirm before installing. Pre-1.0.0 the `@beta` tag is also aliased to `@latest` — explicit `@beta` is preferred for clarity.

If lookup fails with an auth error, `@datacamp` registry auth isn't configured — fix `.yarnrc.yml` (`npmRegistries` / `npmAuthToken`) before continuing.

**Fallbacks if `yarn npm info` is unavailable** — `yarn info @datacamp/oxfmt-config dist-tags` (Yarn 1) or `npm view @datacamp/oxfmt-config dist-tags`.

### 3. Pre-install setup

- Confirm `node_modules` exists (else `yarn install`).
- Add `npmPreapprovedPackages: ["@datacamp/*"]` to `.yarnrc.yml` if absent (alongside `npmMinimalAgeGate: "3d"`).
- If `.yarnrc.yml` has `enableScripts: false`, remove it (blocks `postinstall`/`prepare`). The age gate + preapproved list still provide supply-chain protection.
- If repo uses `@lavamoat/allow-scripts`, add `"husky": true` to the allowlist (otherwise lavamoat silently skips it and `core.hooksPath` stays unset).

### 4. Install

```sh
yarn add -D oxfmt@<version> @datacamp/oxfmt-config@beta
```

Monorepo: the **binary** (`oxfmt`) goes in every workspace that has format scripts (Yarn 4 binstub rule); the **shared config** (`@datacamp/oxfmt-config`) goes at the root only. See `references/monorepo-detection.md`.

### 5. Create `oxfmt.config.ts`

```ts
import { baseConfig } from '@datacamp/oxfmt-config';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...baseConfig,
});
```

**Extending `ignorePatterns`** — spread the base:

```ts
export default defineConfig({
  ...baseConfig,
  ignorePatterns: [...(baseConfig.ignorePatterns ?? []), 'foo', 'bar.js'],
});
```

Common per-repo additions (observed across DC migrations):

| Pattern                                                                                               | Why exclude                                                                     |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/languages/`, `src/locales/`                                                                      | Translation JSON, managed externally (e.g. Bureau Works). Never hand-formatted. |
| `**/*.generated.*`                                                                                    | Generated source — formatting churns diffs and can race the generator.          |
| Repo-specific generator outputs (`openapi.json`, `*Schema.json`, `graphql.schema.ts`, `polyfills.js`) | Same rationale — exclude when generator output diverges from oxfmt's.           |

**Extending `internalPattern`** for path aliases: spread `baseConfig.sortImports.internalPattern`, append; don't overwrite. Don't add `@datacamp/` patterns — those are published packages and belong in `external`, not `internal`.

### 6. Remove Prettier deps and configs

Remove from devDeps: `prettier`, `@datacamp/prettier-config`, `pretty-quick`, `eslint-plugin-prettier`, `eslint-config-prettier`.

Delete files: `prettier.config.js`, `.prettierrc`, `.prettierrc.js`, `.prettierrc.json`, `.prettierignore`.

Remove explicit `prettier` from `.eslintrc*` extends/plugins (`plugin:prettier/recommended`, `prettier` in extends array).

**Critical** — after oxfmt reformats, ESLint's `prettier/prettier` rule will fire hundreds of errors. `@datacamp/eslint-config` bundles `eslint-plugin-prettier` and sets `'prettier/prettier': 'error'`; removing the plugin from devDeps doesn't help. Fix: add `'prettier/prettier': 'off'` to the repo's `.eslintrc*` rules as a temporary override. This goes away when `dc-migrate-oxlint` removes ESLint entirely.

### 7. Add format scripts (alpha-sorted in `package.json`)

```json
"format:check": "oxfmt --check",
"format:check:ci": "oxfmt --check --threads ${DC_OXC_THREADS:-2}",
"format:fix": "oxfmt"
```

No globs — oxfmt walks the directory; parser detection + the shared `ignorePatterns` (`acceptance_tests`, `build`, `catalog-info.yaml`, `coverage`, `dist`) + `.gitignore` handle filtering. New format support oxfmt ships (CSS, GraphQL, etc.) is picked up automatically without per-repo glob bumps. Same shape applies in monorepo workspaces.

**CJS repos** — prefix scripts with `NODE_OPTIONS='--disable-warning=MODULE_TYPELESS_PACKAGE_JSON'` to silence the warning when `.ts` configs load in a CJS context. ESM repos don't need it.

### 8. Ensure `.editorconfig`

oxfmt reads final-newline behavior from `.editorconfig`, not `oxfmt.config.ts` / `baseConfig`. With **no root `.editorconfig`** the default differs per platform binary — laptops (`darwin-arm64`) tolerate a missing trailing newline, CI's musl/alpine (`linux-x64-musl`) requires one → green-local / red-CI. Ensure it **before** the reformat so the format pass and its commit include final newlines.

Read `references/editorconfig.md` for the canonical DC file and the idempotent create-or-normalize logic. Commit `.editorconfig` with the other config/dep changes; the next step's `yarn format:fix` folds any newline corrections into the reformat commit.

### 9. Reformat

Commit config/dep changes from steps 4–8 **first**. Then:

```sh
yarn format:fix
```

Large diff — own commit. Capturing it standalone is what makes the next step work.

### 10. Git blame

Add the reformat commit's full 40-char SHA to `.git-blame-ignore-revs` (`git blame --ignore-revs-file` requires full SHAs). GitHub reads it automatically; locally:

```sh
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

### 11. Pre-commit hook

Read `references/husky-lint-staged-setup.md` for the full setup (husky v9+ vs v8, Yarn 4 vs Yarn 1 setup-script field, `NODE_OPTIONS` export form, lavamoat allowlist, `HUSKY=0` in CI).

**Key shape** — `package.json`:

```json
"lint-staged": {
  "*": [
    "oxfmt --no-error-on-unmatched-pattern"
  ]
}
```

`*` matches every staged file. oxfmt silently skips files it doesn't recognize by parser detection. `--no-error-on-unmatched-pattern` is defensive (lint-staged's filtering normally protects oxfmt; the flag matters more for oxlint, set up later).

`.husky/pre-commit`:

```sh
export NODE_OPTIONS="${NODE_OPTIONS:-} --disable-warning=MODULE_TYPELESS_PACKAGE_JSON"
lint-staged
```

Append form preserves any pre-existing `NODE_OPTIONS` from the parent shell. Hoist defensively even in ESM repos — the flag is a no-op when the warning doesn't fire, and a CJS workspace with `.ts` configs could be added later.

`dc-migrate-oxlint` adds `oxlint --fix --no-error-on-unmatched-pattern` to the lint-staged block (ordered **before** `oxfmt`) when it runs.

### 12. VS Code

Read `references/vscode-settings.md`. Net change: replace Prettier defaults with `oxc.oxc-vscode` formatter, set `oxc.fmt.configPath`, ensure `.vscode/settings.json` is committable.

### 13. SonarCloud

If `sonar-project.properties` or `.sonarcloud.properties` exists, add `oxfmt.config.ts` to `sonar.exclusions`:

```properties
sonar.exclusions=…existing patterns…,**/oxfmt.config.ts
```

Pattern works for single-package repos and monorepos. Without exclusion, Sonar analyzes the config as source and pollutes "new code" coverage.

### 14. Verify

- `yarn format:check` passes.
- Root `.editorconfig` exists with `insert_final_newline = true` in a `[*]` section.
- No `prettier.config.*` / `.prettierrc*` / `.prettierignore` files remain.
- No `prettier`, `@datacamp/prettier-config`, `pretty-quick`, `eslint-plugin-prettier`, `eslint-config-prettier` in devDeps.
- `oxfmt.config.ts` exists, spreads `baseConfig`.
- Scripts present: `format:fix`, `format:check`, `format:check:ci`.
- `.git-blame-ignore-revs` contains the reformat SHA.
- `.husky/pre-commit` runs `lint-staged` (not `npx lint-staged`).
- `lint-staged` block in `package.json` includes `oxfmt --no-error-on-unmatched-pattern`.
- `.yarnrc.yml` has `npmPreapprovedPackages: ["@datacamp/*"]`.

### 15. PR

Read `references/pr-description.md` for structure and tone. Generate content from actual branch changes.

## Common issues

**`yarn install` fails with "No candidates found"** — `npmMinimalAgeGate` blocks a recently-published beta/canary. Fix: add `@datacamp/*` to `npmPreapprovedPackages`, or wait the gate out, or pin to an older published version.

**ESLint hundreds of `prettier/prettier` errors after reformat** — `@datacamp/eslint-config` bundles `eslint-plugin-prettier` and sets the rule to `error`. Removing the plugin from devDeps doesn't help. Add `'prettier/prettier': 'off'` to `.eslintrc*` as temporary override.

**`format:check` fails after reformat** — usually a file was reformatted but `ignorePatterns` excludes a parent dir. Check that the reformat commit and `oxfmt --check` see the same scope.

**`format:check` green locally but red in CI (or vice versa)** — final-newline non-determinism between oxfmt's platform binaries when no root `.editorconfig` is present. Ensure `.editorconfig` with `insert_final_newline = true` (step 8 / `references/editorconfig.md`) and re-run `format:fix`.

**Yarn 1 sub-project (e.g. `acceptance_tests/`) fails on root Yarn 4** — the sub-project's `package.json` needs `"packageManager": "yarn@<runner-version>"`. DC Concourse acceptance_tests runner 1.43.1 ships `1.22.22`. Without the pin, yarn 1.22.22+ walks up and rejects the root's Yarn 4 declaration.

**`postinstall: husky` runs on consumers of a published library** — for published `@datacamp/*` libraries (not apps), use `"setup": "husky"` as a plain yarn script invoked from a `just setup` recipe (and `corepack enable; yarn install; yarn setup`). Apps (`mfe-*`) can still use `postinstall: husky` — they're never installed as a dependency.

## Principles

- **One PR, single scope.** Format only. Lint and CI restructure are separate sub-skills.
- **Reformat in its own commit** — captured in `.git-blame-ignore-revs`. Don't mix with config/dep changes.
- **`.editorconfig` before the reformat.** oxfmt reads final-newline behavior from `.editorconfig`, not `baseConfig`; without it `format:check` is non-deterministic across platform binaries (green-local / red-CI). Ensure it first so the committed reformat is CI-stable.
- **No globs in format scripts.** `oxfmt`'s parser detection + shared `ignorePatterns` + `.gitignore` cover scope.
- **Spread, don't overwrite.** `ignorePatterns` and `internalPattern` extend the base — don't replace.
- **Pre-commit ordering matters.** When `dc-migrate-oxlint` adds `oxlint --fix`, it goes **before** `oxfmt` — oxlint's `consistent-type-imports` autofix splits imports without re-sorting; oxfmt sorts them after.

## References

- `references/editorconfig.md` — canonical DC `.editorconfig`, idempotent create-or-normalize logic, and the cross-platform final-newline root cause.
- `references/pr-description.md` — PR structure: WIP banner, summary, benchmarks tables, technical details, test plan.
- `references/husky-lint-staged-setup.md` — Yarn 4 vs Yarn 1 setup-script field, husky v9 vs v8, `NODE_OPTIONS` export, lavamoat allowlist, `HUSKY=0` in CI.
- `references/monorepo-detection.md` — Pattern A (workspaces) vs Pattern B (Nx), binstub placement, root config vs per-workspace config.
- `references/vscode-settings.md` — `.vscode/settings.json` shape, `.gitignore` allowlist for `.vscode/`.

Current `baseConfig` defaults, `internalPattern`, preset list, and bundled jsPlugins are in the `@datacamp/oxfmt-config` README at the version pinned in this repo (`node_modules/@datacamp/oxfmt-config/README.md`). Don't paraphrase the surface here — read it at the pin.

Source: [`packages/oxfmt-config/README.md`](https://github.com/datacamp-engineering/toolchain/blob/master/packages/oxfmt-config/README.md) on master.

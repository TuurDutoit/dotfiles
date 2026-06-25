# Monorepo migration patterns

Detect, then adjust install/config placement, scripts, lint-staged, and CI orchestration. Duplicated across `dc-migrate-oxfmt` and `dc-migrate-oxlint` references — keep in sync if changed.

## Detect

| Signal                                                         | Pattern                                  |
| -------------------------------------------------------------- | ---------------------------------------- |
| `workspaces` in root `package.json` (or `pnpm-workspace.yaml`) | **Pattern A** — Yarn/npm/pnpm workspaces |
| `nx.json` at repo root                                         | **Pattern B** — Nx (deferred)            |

Then split Pattern A by intent and install pattern:

| Sub-pattern                             | Defining traits                                                                                                                           | Typical shape                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **A1 — coupled one-app**                | One product split into runtime tiers; all workspaces ship together; lockstep upgrades cheap, drift expensive; single CI signal sufficient | Lerna + Yarn 4, `lerna run` fan-out, full installs                                        |
| **A2 — independent published packages** | Each workspace is independently published; per-workspace release cadence; per-workspace CI signals required                               | Yarn 4 workspaces, parameterised CI jobs, focused installs (`yarn workspaces focus <ws>`) |

If neither applies, treat as a single-package repo (no monorepo handling needed).

## Per-file walk-up (foundation)

Both `oxlint` / `oxfmt` CLIs and the `oxc.oxc-vscode` extension do **per-file walk-up** to find the nearest config (`oxlint.config.ts` / `oxfmt.config.ts` / `.oxlintrc.json` / `.oxfmtrc.json`), starting from each file processed. Consequences:

- Each workspace's config is **authoritative** for files in its scope. No merging with root.
- The **root config governs only root-level files** — README, dotfiles, root configs themselves, `yarn.config.cjs`. Not a "VSCode mirror." Not a "fallback for workspace files."
- A **single root `lint-staged` block is sufficient** — the CLI walks up per file regardless of which cwd lint-staged sets.
- The "root `oxfmt.config.ts` mirrors workspace `ignores`" pattern is **dead code**. Delete it if present.

Verified against `oxlint@1.62.0` and `oxfmt@0.47.0+` (oxfmt CLI walk-up shipped in [PR #21103](https://github.com/oxc-project/oxc/pull/21103); oxfmt LSP walk-up in [PR #21081](https://github.com/oxc-project/oxc/pull/21081), both 2026-04-15). Any older skill, plan, or repo comment referencing "cwd-based config loading" or "VSCode single-config" is stale — re-verify against the pinned version in the repo if behavior diverges.

## A1 — coupled one-app monorepo

**Pin policy** — exact pins for `oxfmt` and `oxlint`, enforced by `yarn.config.cjs` constraints:

```js
// yarn.config.cjs
const { defineConfig } = require('@yarnpkg/types');
const SYNC_PINS = { oxfmt: '<version>', oxlint: '<version>' };

module.exports = defineConfig({
  async constraints({ Yarn }) {
    for (const dep of Yarn.dependencies()) {
      const target = SYNC_PINS[dep.ident];
      if (target && dep.range !== target) dep.update(target);
    }
  },
});
```

`yarn constraints` runs in CI and fails on drift; `yarn constraints --fix` rewrites every workspace's `package.json`. Bump workflow: edit `SYNC_PINS` → `yarn constraints --fix && yarn install` → commit.

**Tooling deps placement** (A1 does full installs — all workspaces' devDeps install together):

| Dep                                                                  | Where                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Binaries (`oxfmt`, `oxlint`)                                         | **Per-workspace devDeps AND root devDeps**, exact pins       |
| Shared configs (`@datacamp/oxfmt-config`, `@datacamp/oxlint-config`) | **Root devDeps only** (workspaces resolve via Yarn hoisting) |

**CI orchestration** — single coordinator job, bypass Lerna for the hot path:

```yaml
- run:
    name: Format check
    command: yarn workspaces foreach -A --exclude <root-workspace-name> --parallel exec oxfmt --check --threads "${DC_OXC_THREADS:-2}"
- run:
    name: Lint
    command: yarn workspaces foreach -A --exclude <root-workspace-name> --parallel exec oxlint --report-unused-disable-directives --threads "${DC_OXC_THREADS:-2}"
```

`--exclude <root-workspace-name>` skips the root (its scripts are aggregator-only). `--parallel` uses Yarn's job pool; `--threads` controls per-tool thread count separately.

**Local DX** still goes through `yarn check` → `lerna run` for log streaming and Nx caching. Verify CI/local equivalence by running both paths and diffing per-workspace file/rule counts.

**Bin name under `foreach exec` — use bare names**, not paths. `oxfmt` works (Yarn 4 binstub PATH is per-workspace); `./node_modules/.bin/oxfmt` fails inside workspace cwds because the binstub path resolves relative to invocation cwd, not the workspace.

## A2 — independent published packages

**Pin policy** — floating ranges (`^x.y.z`) per workspace and at root. Yarn dedupes when ranges overlap; intentional divergence is supported. **No `yarn constraints` enforcement** — workspaces are free to bump on their own schedule.

**Tooling deps placement** (A2 uses focused installs — `yarn workspaces focus <ws>` skips root devDeps):

| Dep                                                                  | Where                                                                                                             |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Binaries (`oxfmt`, `oxlint`)                                         | **Per-workspace devDeps AND root devDeps**, floating ranges                                                       |
| Shared configs (`@datacamp/oxfmt-config`, `@datacamp/oxlint-config`) | **Per-workspace devDeps AND root devDeps** — focused installs skip root, so workspaces need their own declaration |

This differs from A1: A2 must declare the shared config in every workspace because focused installs don't pull root devDeps. Forgetting this manifests as `Cannot find module '@datacamp/oxlint-config'` only in CI (focused install) — local full installs hide the bug.

**CI orchestration** — per-workspace parameterised jobs, one entry per workspace:

```yaml
jobs:
  check:
    parameters:
      library_name:
        type: string
    docker:
      - image: cimg/node:<version>
    resource_class: medium
    working_directory: libraries/<< parameters.library_name >>
    environment:
      DC_OXC_THREADS: 2
    steps:
      - checkout
      - run: yarn workspaces focus
      - run:
          name: Typecheck
          command: ./node_modules/.bin/tsc --noEmit
      - run:
          name: Format check
          command: ./node_modules/.bin/oxfmt --check --threads ${DC_OXC_THREADS:-2}
      - run:
          name: Lint
          command: ./node_modules/.bin/oxlint --report-unused-disable-directives --threads ${DC_OXC_THREADS:-2}

workflows:
  main:
    jobs:
      - check: { name: check-<lib1>, library_name: <lib1> }
      - check: { name: check-<lib2>, library_name: <lib2> }
```

`foreach` consolidation **does not apply** — independent failure signal per package is the design intent.

**Bin name in parameterised jobs:** `./node_modules/.bin/<tool>` is the right form here, because `working_directory: libraries/<<param>>` sets cwd to the workspace and `yarn workspaces focus` installs binaries into that workspace's `node_modules/`. This is the exception to the "use bare names" rule — bare names + foreach is the A1 pattern; bin-direct + per-workspace working_directory is the A2 pattern.

## Per-workspace configs

Each workspace and the repo root carries its own `oxlint.config.ts` and `oxfmt.config.ts`. With per-file walk-up, each is fully standalone — no inheritance from root, no shared state.

```ts
// packages/<name>/oxlint.config.ts
import { createConfig } from '@datacamp/oxlint-config';

export default createConfig({
  presets: ['base', 'typescript', 'import', 'vitest'],
});
```

```ts
// packages/<name>/oxfmt.config.ts (only if the workspace adds extras)
import { baseConfig } from '@datacamp/oxfmt-config';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...baseConfig,
  ignorePatterns: [...(baseConfig.ignorePatterns ?? []), 'vendor/**'],
});
```

The root config carries the same shape but governs **only root-level files**. Not a "VSCode mirror" — VSCode does its own walk-up.

**Delete the workspace-ignores mirror pattern** if your repo has it (older guidance imported each workspace's `ignores` named export and prefix-prepended them in the root `oxfmt.config.ts`). With per-file walk-up, workspace `ignorePatterns` apply directly when files in those workspaces are touched. Replace the mirror with a plain `defineConfig({ ...baseConfig })`.

## Per-workspace scripts (canonical set)

```json
"scripts": {
  "check": "yarn format:check && yarn lint:check",
  "fix": "yarn format:fix && yarn lint:fix",
  "format:check": "oxfmt --check",
  "format:fix": "oxfmt",
  "lint:check": "oxlint",
  "lint:fix": "oxlint --fix"
}
```

**No globs.** Oxfmt/oxlint recurse from cwd; `ignorePatterns` + `.gitignore` handle output dirs.

## lint-staged — single root block

```json
"lint-staged": {
  "*": [
    "oxlint --fix --no-error-on-unmatched-pattern",
    "oxfmt --no-error-on-unmatched-pattern"
  ]
}
```

Lives only in the root `package.json`. Per-file walk-up handles config selection inside the tools.

**Migration cleanup** — if a repo carries per-workspace `lint-staged` blocks **identical** to the root block (left over from earlier guidance that recommended per-workspace blocks for config selection), **remove them**. lint-staged routes each staged file to its closest `package.json` block, so identical workspace blocks just spawn extra invocations with no semantic difference. Audit:

```sh
# All package.json files (excluding node_modules) that define a `lint-staged` block
find . -name package.json -not -path '*/node_modules/*' \
  -exec node -e 'const f=process.argv[1]; const p=JSON.parse(require("fs").readFileSync(f)); if (p["lint-staged"]) console.log(f, JSON.stringify(p["lint-staged"]))' {} \;
```

If every workspace's block matches the root's verbatim, drop them all. Keep workspace blocks only where commands genuinely differ between workspaces (e.g., one runs `vitest related`, another runs `jest --bail`).

## oxlint root-vs-nested config asymmetry

A nested oxlint config (any config below the repo root) **cannot set six `options.*` keys**. Setting any in a nested config emits a stderr diagnostic and **silently drops the entire nested config** — not just that key. Verify the current restriction set in `apps/oxlint/src/config_loader.rs` (search `is_root_config`) at the oxlint version pinned in the repo.

| Option                                   | Documented in oxlint docs? | Notes                                                                                                                     |
| ---------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `options.typeAware`                      | ✓                          | Type-aware not adopted yet at DC                                                                                          |
| `options.typeCheck`                      | ✓                          | Same                                                                                                                      |
| `options.denyWarnings`                   | ✗                          | Root-only if adopted                                                                                                      |
| `options.maxWarnings`                    | ✗                          | Root-only if adopted                                                                                                      |
| `options.reportUnusedDisableDirectives`  | ✗                          | We use the CLI flag (`--report-unused-disable-directives`), unrestricted. Flag → option migration would become root-only. |
| `options.respectEslintDisableDirectives` | ✗                          | Root-only if adopted                                                                                                      |

Safe in nested configs: `rules`, `plugins`, `env`, `categories`, `overrides`, `settings`, `extends`, `ignorePatterns`, `globals`.

oxfmt has no equivalent restriction — every key works at every level.

## Pattern B — Nx

Nx migrations are deferred pending team decision. Two structural issues:

- **`nx format:check` / `nx format:write` are hardcoded to Prettier in Nx core** (Nx imports Prettier directly and calls its API — no abstraction layer). Cannot be swapped for oxfmt. Must stop using `nx format:*` and replace with explicit `oxfmt` scripts in `package.json`.
- **Lint integration via `@nx/eslint/plugin`** infers a `lint` target by detecting `.eslintrc.*`. Options for oxlint: community [`nx-oxlint`](https://github.com/Nas3nmann/nx-oxlint) plugin, official [`@nx/oxlint`](https://github.com/nrwl/nx-labs/pull/441) labs plugin (still in PR), bypass Nx for lint (loses Nx caching + affected-project filtering), or `nx:run-commands` executor.

Flag any Nx repo to the user and pause before proceeding.

## Common pitfalls

- **`foreach exec` with `./node_modules/.bin/<tool>`** — fails. Binstub path resolves relative to invocation cwd, not the workspace; under `foreach exec` use bare bin names (`oxfmt` / `oxlint`).
- **Shared config root-only in A2** — focused installs skip root devDeps; workspace CI fails with `Cannot find module '@datacamp/oxlint-config'`. Declare shared config per-workspace AND at root in A2.
- **Per-workspace `lint-staged` cargo-cult** — identical workspace blocks from older guidance spawn redundant tool invocations. Audit + remove.
- **Misplaced root-only oxlint option in nested config** — drops the whole nested config silently (rules don't fire, no error). Stderr diagnostic is easy to miss in parallel `foreach` runs.
- **Untitled VSCode buffers** — use the workspace-root oxfmt config (LSP design per PR #21081), not the destination workspace's. Saving to a path inside a workspace switches to walk-up.
- **`oxlint --fix` autofixes `no-debugger`** by deleting the statement. Surprising for first-time users.
- **Rule-count line suppressed in nested mode** — oxlint's "Finished in Xms on N files with M rules" footer only shows the rule count under `-c` or `--disable-nested-config`. CI logs in monorepos no longer surface rule count; this is by design.

# Husky + lint-staged setup

Applies to both `dc-migrate-oxfmt` and `dc-migrate-oxlint`. Duplicated in each skill's references — keep in sync if changed.

## When husky/lint-staged aren't installed yet

```sh
yarn add -D husky lint-staged
```

Ask user before running:

```sh
npx husky init
```

## Husky version

Check `husky` in devDependencies:

- **`>=9.0.0`** — hook files are plain shell with just the commands. Do **not** add `#!/usr/bin/env sh` or `. "$(dirname -- "$0")/_/husky.sh"` (husky v9 removed the helper file and enforces a deprecation warning).
- **`<9.0.0`** — keep the v8 bootstrap lines. Prefer bumping to v9+ (`yarn up husky@^9`) during migration so the simpler hook format applies.

## Setup script field — depends on `packageManager`

Pick the script field based on `package.json`'s `packageManager`:

| `packageManager` (or absence)                | Script                   | Why                                                                                                                                                                                   |
| -------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn@1.*`, `npm@*`, or absent               | `"prepare": "husky"`     | Husky's canonical recommendation; `prepare` fires on install for the owner only, so published libraries don't run setup in downstream consumers' `node_modules/`.                     |
| `yarn@2.*` / `yarn@3.*` / `yarn@4.*` (Berry) | `"postinstall": "husky"` | Yarn 2+ does **not** run `prepare` on `yarn install`, leaving `core.hooksPath` unset after a fresh clone — pre-commit hooks silently never fire. `postinstall` runs on every install. |
| `pnpm@*`                                     | `"postinstall": "husky"` | Same caveat as Yarn Berry for libraries; pnpm runs both, but `postinstall` is the safer default.                                                                                      |

The Yarn 2+ bug is invisible to anyone who set up the repo before the regression or ran `husky` manually at any point — `core.hooksPath` is stored in `.git/config` (local, never committed) and survives subsequent installs.

### Published libraries — `setup`, not `postinstall`

For published `@datacamp/*` libraries (toolchain, event-schemas, etc., not apps): `package.json` ships in the tarball, so `postinstall: husky` runs in every downstream consumer's install (noise or breakage). Use:

```json
"setup": "husky"
```

…as a regular yarn script. Wire it into a `just setup` recipe:

```just
setup:
    corepack enable
    yarn install
    yarn setup
```

Document `just setup` in `AGENTS.md` and `README.md`. Because `yarn setup` is explicit (not a lifecycle hook), it runs regardless of `enableScripts: false` — keep the `@lavamoat/preinstall-always-fail` sentinel + `enableScripts: false` security posture intact. CI catches misses (lint/format/typecheck fails on what the pre-commit hook would've caught).

Apps (`mfe-*` etc.) are never installed as a dependency — `postinstall: husky` is fine there.

## `enableScripts: false` in `.yarnrc.yml`

Blocks `postinstall` (and `prepare`) from running. If present, remove it. The `npmMinimalAgeGate` + `npmPreapprovedPackages` settings still provide meaningful supply-chain protection.

## `@lavamoat/allow-scripts`

If the repo uses lavamoat (check devDependencies and `lavamoat.allowScripts` in `package.json`), add `"husky": true` to the allowlist. Otherwise lavamoat silently skips husky and `core.hooksPath` stays unset.

## CI — disable husky

CI has no commits to hook; running husky on every CI install wastes time and can mask install errors. Add to the relevant CircleCI job(s):

```yaml
environment:
  HUSKY: 0
```

## `package.json` `lint-staged` block

Same for ESM and CJS — plain commands, no inline env vars:

```json
"lint-staged": {
  "*": [
    "oxlint --fix --no-error-on-unmatched-pattern",
    "oxfmt --no-error-on-unmatched-pattern"
  ]
}
```

`*` matches every staged file. Both tools silently skip files they don't recognize (oxlint by extension, oxfmt by parser detection). `--no-error-on-unmatched-pattern` is **required on both**:

- **Without it on oxlint** — a docs-only or JSON-only commit hands oxlint zero recognized files and it exits 1 (`No files found to lint`), blocking the commit.
- **On oxfmt** — defensive; lint-staged's filtering normally prevents this for oxfmt.

**Ordering matters: `oxlint --fix` before `oxfmt`.** oxlint's `consistent-type-imports` autofix splits imports without re-sorting; oxfmt then sorts/groups correctly. Reversed order leaves unsorted imports that fail `format:check`.

**Don't put `NODE_OPTIONS='…'` inline on task strings** — lint-staged spawns each command via `execa` with `shell: false`, so the string is whitespace-split and the first token (`NODE_OPTIONS=…`) is treated as the binary name, failing with `ENOENT`. Export it in the hook instead.

If only one tool is installed yet (e.g. just-finished `dc-migrate-oxfmt`, oxlint not done), include only that tool's line. `dc-migrate-oxlint` appends the `oxlint --fix` line above the existing `oxfmt` line when it runs.

## `.husky/pre-commit`

```sh
export NODE_OPTIONS="${NODE_OPTIONS:-} --disable-warning=MODULE_TYPELESS_PACKAGE_JSON"
lint-staged
```

The env var reaches oxlint/oxfmt processes so the `MODULE_TYPELESS_PACKAGE_JSON` warning doesn't pollute commit output when `.ts` configs load in a CJS context.

**Append form (`${NODE_OPTIONS:-}`)** preserves any pre-existing `NODE_OPTIONS` from the parent shell — important if a developer has e.g. `--inspect` set globally. Simpler `export NODE_OPTIONS='…'` clobbers.

**Hoist defensively even in pure ESM repos.** The flag is a no-op when the warning doesn't fire. Universally hoisting avoids broken pre-commits the day a CJS workspace with `.ts` configs gets added.

The `format:*` / `lint:*` / `typecheck` scripts in `package.json` **still** carry the inline `NODE_OPTIONS='…'` prefix in CJS repos — those run under `yarn <script>` in a shell where inline env works. The hook `export` only covers the lint-staged path.

## `.husky/pre-push` (optional, recommended for TS repos)

```sh
./node_modules/.bin/tsc --noEmit
```

Invokes the binary directly (not `yarn typecheck`) to skip yarn bootstrap overhead on every push and mirror the CI `check` job's typecheck step. No `NODE_OPTIONS` prefix needed — the warning only fires on `.ts` config loaders (oxfmt/oxlint), not `tsc`. If the repo already has a `.husky/pre-push` doing something else, consider whether typecheck belongs there — some repos keep push fast and let CI catch type errors.

# Namespace renames — ESLint → oxlint

Two layers of renames:

1. **ESLint plugin namespace → oxlint namespace** — e.g. `@typescript-eslint/no-unused-vars` → `eslint/no-unused-vars`. Affects `rules` overrides carried from `.eslintrc*` into `oxlint.config.ts`.
2. **DC-specific plugin renames** — `perfectionist/*` → `dc-sorting/*`, `analytics/*` → `dc-analytics/*`. Affects both `rules` overrides and `eslint-disable` / `eslint-disable-next-line` comments throughout the codebase.

Both apply silently — wrong namespace = rule no-ops, no error.

## TypeScript ESLint → oxlint

Most `@typescript-eslint/*` rules become `typescript/*`:

| ESLint                                       | oxlint                               |
| -------------------------------------------- | ------------------------------------ |
| `@typescript-eslint/no-non-null-assertion`   | `typescript/no-non-null-assertion`   |
| `@typescript-eslint/consistent-type-imports` | `typescript/consistent-type-imports` |
| `@typescript-eslint/no-explicit-any`         | `typescript/no-explicit-any`         |
| (most others)                                | `typescript/<same-name>`             |

Some `@typescript-eslint/*` rules are actually eslint-core rules wrapped for TS — they go to `eslint/*`:

| ESLint                              | oxlint                  |
| ----------------------------------- | ----------------------- |
| `@typescript-eslint/no-unused-vars` | `eslint/no-unused-vars` |
| `@typescript-eslint/no-shadow`      | `eslint/no-shadow`      |

Two TS-unaware ports live under `eslint-js/*`:

- `eslint-js/consistent-return`
- `eslint-js/no-implied-eval`

**Avoid `typescript/*` aliases for eslint-core rules.** Some keys _are_ accepted as aliases for `eslint/*` rules — using them is actively discouraged because the alias obscures the eslint-core origin and can mask off-toggles in extends chains. Use `eslint/*` / `eslint-js/*` directly.

## DC plugin renames (`perfectionist` / `analytics` / `sorting`)

Plugins were renamed to `@datacamp`-prefixed namespaces to disambiguate from official oxlint plugins. Applies to repos that migrated to `@datacamp/oxlint-config` before the rename pass.

| Old                                     | New                                   | Action                                                                       |
| --------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| `@datacamp/workspace/track-clicks`      | `dc-analytics/require-track-id`       | If `analytics` preset is in the list, rewrite. Otherwise remove the comment. |
| `perfectionist/sort-union-types`        | `dc-sorting/sort-union-types`         | Rewrite                                                                      |
| `perfectionist/sort-intersection-types` | `dc-sorting/sort-intersection-types`  | Rewrite                                                                      |
| `perfectionist/sort-objects`            | `dc-sorting/sort-objects`             | Rewrite                                                                      |
| `perfectionist/sort-jsx-props`          | `dc-sorting/sort-jsx-props`           | Rewrite                                                                      |
| `perfectionist/sort-interfaces`         | `dc-sorting/sort-interfaces`          | Rewrite                                                                      |
| `perfectionist/sort-enums`              | `dc-sorting/sort-enums`               | Rewrite                                                                      |
| `analytics/require-track-id`            | `dc-analytics/require-track-id`       | Rewrite (rename pass)                                                        |
| `analytics/track-id-from-function`      | `dc-analytics/track-id-from-function` | Rewrite (rename pass)                                                        |
| `sorting/sort-union-types`              | `dc-sorting/sort-union-types`         | Rewrite (rename pass)                                                        |
| `sorting/sort-intersection-types`       | `dc-sorting/sort-intersection-types`  | Rewrite (rename pass)                                                        |
| `sorting/sort-objects`                  | `dc-sorting/sort-objects`             | Rewrite (rename pass)                                                        |
| `sorting/sort-jsx-props`                | `dc-sorting/sort-jsx-props`           | Rewrite (rename pass)                                                        |
| `sorting/sort-interfaces`               | `dc-sorting/sort-interfaces`          | Rewrite (rename pass)                                                        |
| `sorting/sort-enums`                    | `dc-sorting/sort-enums`               | Rewrite (rename pass)                                                        |

## Jest within-plugin rename

| Old                  | New                          | Note                                                                                                                                                                                    |
| -------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jest/no-try-expect` | `jest/no-conditional-expect` | Within-plugin rename in `eslint-plugin-jest` v24 (\~2020). The new rule is broader (catches all conditional `expect()`, not only inside `try`/`catch`). oxlint only ships the new name. |

## Grep commands

Run from repo root:

```sh
# Find all stale disable-comment references in source
grep -rn --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' . | grep -E 'eslint-disable|oxlint-disable' | grep -E '@datacamp/workspace/track-clicks|perfectionist/|(^|[^-])analytics/|(^|[^-])sorting/'

# Find stale rule-key overrides in oxlint configs
grep -nE '(^|[^-])(analytics|sorting)/[a-z-]+' oxlint.config.ts **/oxlint.config.ts 2>/dev/null
```

The `(^|[^-])` prefix excludes `dc-analytics/...` / `dc-sorting/...` (the new names) from matches.

After rewriting, verify by re-running both greps — expected output: zero matches. Then run `yarn lint:check --report-unused-disable-directives` to catch any comments now targeting rules that aren't firing (those can be removed).

## Maintenance

If future `@datacamp/oxlint-config` releases rename more rules, add the mapping to this table.

Reference: [`packages/oxlint-config/docs/rule-decisions.md`](https://github.com/datacamp-engineering/toolchain/blob/master/packages/oxlint-config/docs/rule-decisions.md) "Namespace changes" + "Renames" sections, and [`packages/oxlint-config/docs/rules.md`](https://github.com/datacamp-engineering/toolchain/blob/master/packages/oxlint-config/docs/rules.md) for the full rule list at the version pinned in the migrating repo.

## New disable comments

Going forward, prefer `oxlint-disable` / `oxlint-disable-next-line` over `eslint-disable*` for new code — clearer intent, future-proofed if ESLint goes away entirely in some workspace. Existing `eslint-disable*` comments work in oxlint unchanged; don't bulk-rename.

# `.editorconfig` enforcement (oxfmt final-newline determinism)

Every migrated repo needs a root `.editorconfig` with `insert_final_newline = true` **before** the reformat. Without it, oxfmt's format check is non-deterministic across platforms.

## Canonical DC `.editorconfig`

Verbatim from `campus-app` (already migrated). Create this when no root `.editorconfig` exists:

```ini
# editorconfig.org
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

The load-bearing key for the cross-platform bug is `insert_final_newline = true`. The rest are sensible cross-editor defaults and match `campus-app`.

## Idempotent handling

1. **No root `.editorconfig`** → create it with the content above.
2. **Existing `.editorconfig`** → ensure a `[*]` section with `insert_final_newline = true` (add the key if missing). Do **not** clobber unrelated settings; leave everything else intact.
3. Commit `.editorconfig` with the other config/dep changes (before the reformat). The migration's `yarn format:fix` then corrects any source files missing a trailing newline, folded into the reformat commit.

## Why — root cause (verified)

oxfmt ships a per-platform native binary (`@oxfmt/binding-*`). With **no `.editorconfig` present**, the default final-newline handling differs between binaries of the same version:

- `@oxfmt/binding-darwin-arm64` (developer laptops): tolerates a file with **no** trailing newline.
- `@oxfmt/binding-linux-x64-musl` (CI's `node:*-alpine` image): **requires** a trailing newline.

So a file with no trailing newline passes `oxfmt --check` locally (darwin) but fails in CI (musl) — a green-local / red-CI split. Adding the `.editorconfig` above (plus the one resulting trailing newline) makes both binaries agree.

This can't be fixed in `oxfmt.config.ts` / `@datacamp/oxfmt-config`'s `baseConfig` — oxfmt sources final-newline behavior from `.editorconfig` only. The per-platform default is arguably an upstream oxfmt bug worth filing.

## Reference implementation

`purchase-frontend`, DP-1745, commit `8882bae` (`fix: add .editorconfig so oxfmt enforces final newline cross-platform`) — adds the `.editorconfig` above and the single resulting `.circleci/config.yml` trailing newline. Blast radius across the repo was one file.

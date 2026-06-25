# VS Code settings for oxfmt + oxlint

Duplicated across `dc-migrate-oxfmt` and `dc-migrate-oxlint` references — keep in sync.

## `.gitignore` allowlist

If the repo has a blanket `.vscode/` ignore, replace it with the VS Code-recommended allowlist so shareable config files are versioned while per-user state stays ignored:

```gitignore
# VS Code
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
!.vscode/*.code-snippets
```

Without this, edits to `.vscode/settings.json` won't reach the repo — someone else pulling the branch will get stale settings or none at all.

## `.vscode/settings.json` — converged shape (after both migrations)

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.oxc": "always",
    "source.format.oxc": "always"
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "oxc.oxc-vscode",
  "prettier.enable": false,
  "eslint.enable": false,
  "oxc.fmt.configPath": "oxfmt.config.ts",
  "[javascript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[typescript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[javascriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" }
}
```

Per-language formatter overrides are explicit so a reader can see at a glance which file types oxc handles. Drop `[javascriptreact]` / `[typescriptreact]` if the repo has no JSX.

## After `dc-migrate-oxfmt` only

If oxlint isn't done yet:

- Set the Prettier replacements above (`editor.defaultFormatter`, `editor.formatOnSave`, `source.format.oxc`, `prettier.enable: false`, `oxc.fmt.configPath`, per-language overrides).
- **Leave ESLint settings in place** (`eslint.enable`, `source.fixAll.eslint`). `dc-migrate-oxlint` replaces them.

## After `dc-migrate-oxlint`

- Remove or replace `"source.fixAll.eslint"` with `"source.fixAll.oxc": "always"`.
- Set `"eslint.enable": false`.

## Scoped ESLint retention exception (`eslint.config.json.mjs`)

If the repo retains ESLint for JSON-linting only (see `dc-migrate-oxlint` step on retention), `"eslint.enable": false` stays correct — ESLint runs only via CLI, not the VS Code extension. Contributors who want live JSON-schema feedback can flip the extension on in their user settings.

## `oxc.fmt.configPath`

Defaults work when `oxfmt.config.ts` is at repo root; set explicitly for clarity and to future-proof against non-root placements. In monorepos with per-workspace configs, the extension auto-discovers the nearest config — no per-workspace `oxc.fmt.configPath` needed.

# PR description — dc-migrate-oxfmt

Branch: `<JIRA-REF>/dc-migrate-oxfmt`. Title: `[<JIRA-REF>] Migrate Prettier → oxfmt`.

Generate content from actual branch changes — this is structure guidance, not a form.

## Structure

1. **WIP banner** — include at the top while `@datacamp/oxfmt-config` is pre-1.0.0:

   > **Work in Progress** — `@datacamp/oxfmt-config` is pre-1.0.0 and published under the `beta` dist-tag (also aliased to `latest` until 1.0.0). The `canary` dist-tag surfaces in-flight PR snapshots. Config shape, `baseConfig` defaults, and `internalPattern` may change between releases. Pin the dist-tag; bump as new beta publishes land. Final defaults will be finalised with the Developer Platforms team before 1.0.0.

2. **Summary** — 2–4 bullets:
   - Replaced Prettier with oxfmt via `@datacamp/oxfmt-config@<version>`.
   - Any non-default `ignorePatterns` additions (and why).
   - Any `internalPattern` extensions for path aliases.
   - Reformat captured in `.git-blame-ignore-revs`.

3. **Technical details**
   - **oxfmt config** — `oxfmt.config.ts` spreading `baseConfig`. Note any `ignorePatterns` / `internalPattern` extensions.
   - **Deps removed** — `prettier`, `@datacamp/prettier-config`, `pretty-quick`, `eslint-plugin-prettier`, `eslint-config-prettier`.
   - **Deps added** — `oxfmt@<version>`, `@datacamp/oxfmt-config@<version>`.
   - **Scripts** — `format:check`, `format:check:ci`, `format:fix` (no globs — `oxfmt`'s parser detection + shared `ignorePatterns` handle scope).
   - **Pre-commit** — lint-staged `*` pattern, `oxfmt --no-error-on-unmatched-pattern`, `NODE_OPTIONS` exported in the husky hook (CJS-safe).
   - **VS Code** — replaced Prettier defaults with `oxc.oxc-vscode` formatter, `oxc.fmt.configPath` set, `.vscode/settings.json` committable.
   - **Temporary** — `'prettier/prettier': 'off'` added to `.eslintrc*` to suppress the post-reformat eslint flood (removed when ESLint goes away in `dc-migrate-oxlint`).
   - **`.yarnrc.yml`** — `npmPreapprovedPackages: ["@datacamp/*"]` if newly added.

4. **Test plan** — checklist:
   - [ ] `yarn format:check` passes
   - [ ] `yarn install` clean (no `npmMinimalAgeGate` errors for `@datacamp/oxfmt-config`)
   - [ ] Pre-commit hook runs `oxfmt` on staged files
   - [ ] CI `Format check` step green
   - [ ] No `prettier.config.*` / `.prettierrc*` / `.prettierignore` files remain
   - [ ] `.git-blame-ignore-revs` contains the reformat SHA
   - [ ] (Deferred) configs pinned to stable (non-prerelease) dist-tag

## Tone

- Lead with functional outcomes.
- Technical details for reviewers who want depth.

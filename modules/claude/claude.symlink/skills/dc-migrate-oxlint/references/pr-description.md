# PR description — dc-migrate-oxlint

Branch: `<JIRA-REF>/dc-migrate-oxlint`. Title: `[<JIRA-REF>] Migrate ESLint → oxlint`.

Generate content from actual branch changes — this is structure guidance, not a form.

## Structure

1. **WIP banner** — include while `@datacamp/oxlint-config` is pre-1.0.0:

   > **Work in Progress** — `@datacamp/oxlint-config` is pre-1.0.0 and published under the `beta` dist-tag (also aliased to `latest` until 1.0.0). The `canary` dist-tag surfaces in-flight PR snapshots. Preset names, rule sets, and `createConfig` surface may change between releases. Pin the dist-tag; bump as new beta publishes land. Final rule configuration will be finalised with the Developer Platforms team before 1.0.0.

2. **Summary** — 2–5 bullets:
   - Replaced ESLint with oxlint via `@datacamp/oxlint-config@<version>` (`createConfig` helper).
   - Preset list selected.
   - Any repo-specific `rules` overrides / `plugins` / `jsPlugins` parameters.
   - Namespace renames applied (e.g. `perfectionist/*` → `dc-sorting/*`) if relevant.
   - JSON-linting retention applied (if step 17) — name the scope.

3. **Technical details**
   - **oxlint config** — `oxlint.config.ts` using `createConfig`, preset list, any `rules` overrides / `plugins` / `jsPlugins` parameters. Note that transitive jsPlugins (`oxlint-plugin-eslint`, `eslint-plugin-prefer-type-alias`, plus the package's own dc-sorting/dc-analytics jsPlugins) come with `@datacamp/oxlint-config` — no separate installs.
   - **Deps removed** — `eslint`, `@datacamp/eslint-config`, `eslint-config-prettier`, `eslint-plugin-*`. Plus transitively-provided: `oxlint-plugin-eslint`, `eslint-plugin-prefer-type-alias`, `eslint-plugin-perfectionist`, `eslint-plugin-sonarjs`.
   - **Deps added** — `oxlint@<version>`, `@datacamp/oxlint-config@<version>`. If step 17 applies: `eslint@^9`, `eslint-plugin-json@^4` and/or `eslint-plugin-i18n-json@^4`.
   - **Scripts** — `lint:check`, `lint:check:ci`, `lint:fix`, `check`, `fix`, `typecheck` (TS). If step 17: `lint:check:json`, `lint:fix:json`. No bare `lint`. No `check:ci` composite.
   - **Pre-commit** — lint-staged `*` pattern, `oxlint --fix --no-error-on-unmatched-pattern` before `oxfmt --no-error-on-unmatched-pattern` (order matters: `consistent-type-imports` autofix → format).
   - **Namespace renames** — any disable-comment or `rules` override rewrites (`perfectionist/*` → `dc-sorting/*`, `analytics/*` → `dc-analytics/*`, `@datacamp/workspace/track-clicks` → `dc-analytics/require-track-id`, `jest/no-try-expect` → `jest/no-conditional-expect`).
   - **VS Code** — `eslint.enable: false`, `source.fixAll.oxc: always`.
   - **Other** — `.eslintignore` removed, `.editorconfig` alignment, `eslint-disable` comments left in place (`--report-unused-disable-directives` flags them once parity lands).

4. **Test plan**
   - [ ] `yarn check` passes (composite — on Yarn 1 use `yarn run check`)
   - [ ] `yarn lint:check` passes (or `yarn lint:check && yarn lint:check:json` if step 17)
   - [ ] `yarn test` passes
   - [ ] Pre-commit hook runs `oxlint --fix` before `oxfmt` on staged files
   - [ ] CI `Lint` step green
   - [ ] No `.eslintrc*` / `eslint.config.*` files remain (except `eslint.config.json.mjs` if step 17)
   - [ ] No `@typescript-eslint/*` keys carried over in `oxlint.config.ts` rules overrides
   - [ ] (Deferred) full oxlint rule set finalised
   - [ ] (Deferred) configs pinned to stable (non-prerelease) dist-tag

## Tone

- Lead with functional outcomes.
- Technical details for reviewers who want depth.

# Preset detection

`@datacamp/oxlint-config` exposes named presets composed via `createConfig({ presets: [...] })`. Pick based on `package.json` deps signals.

## Always include

- **`base`** — eslint-core + general best-practice rules.
- **`typescript`** — TS rules. Include even for JS-only repos (rules safely no-op on JS files; future TS files get coverage).
- **`import`** — import-resolution rules (no-unresolved, no-duplicates, ordering).

## Conditional

| Preset      | Signal                                                                   | Note                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react`     | `react` in `dependencies` (or `peerDependencies` for libraries)          | Add for any JSX/TSX codebase.                                                                                                                                                                                                                                                                                                       |
| `node`      | `express`, `koa`, `fastify`, `@nestjs/*`, or generally a Node.js backend | Backend-server lint rules (no-process-exit, etc.).                                                                                                                                                                                                                                                                                  |
| `jest`      | `jest` in `devDependencies`                                              | Test rule set.                                                                                                                                                                                                                                                                                                                      |
| `vitest`    | `vitest` in `devDependencies`                                            | Test rule set. Don't add both `jest` and `vitest` unless the repo genuinely uses both.                                                                                                                                                                                                                                              |
| `analytics` | JSX/TSX frontend repo                                                    | Enables `dc-analytics/require-track-id`, which enforces `data-trackid` on interactive elements. The rule only meaningfully applies when the codebase has JSX — don't add for pure-Node backends. **Confirm with the user** before adding — it can produce a wave of new findings on a frontend that wasn't previously enforcing it. |

## Repo-level additions outside presets

For plugins that aren't shared across multiple repos, use the additive `plugins` / `jsPlugins` parameters of `createConfig` instead of asking for a new preset:

```ts
createConfig({
  presets: ['base', 'typescript', 'import', 'react'],
  jsPlugins: ['cypress', 'testing-library'],
});
```

Common one-off additions seen in DC migrations:

- `eslint-plugin-cypress` — e2e workspaces.
- `eslint-plugin-lodash` — repos that ban `lodash` deep imports.
- `eslint-plugin-i18next` — repos with i18next migration in-flight.
- `eslint-plugin-testing-library` — RTL repos.
- `eslint-plugin-storybook` — Storybook-using repos.

Reach for a **new preset** (or contribute to an existing one) when an addition is shared across 3+ repos.

## Verifying

After install, run `yarn lint:check` and check that:

- Rules from each chosen preset fire on known violations (e.g. introduce a temporary `console.log` to verify `base`).
- The configured preset list matches the README's description for each preset name.

Read the `@datacamp/oxlint-config` README at the version pinned in this repo (`node_modules/@datacamp/oxlint-config/README.md`) for the authoritative preset list and what each one bundles. The list above is detection guidance, not the preset surface itself.

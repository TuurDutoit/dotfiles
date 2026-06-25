# Nest DI silently breaks after `oxlint --fix`

**Detection signal**: `@nestjs/*` in `dependencies` or `devDependencies`.

## What breaks

`typescript/consistent-type-imports` rewrites:

```ts
import { Provider } from '…';
```

to:

```ts
import type { Provider } from '…';
```

…when the symbol only appears as a type annotation.

With `emitDecoratorMetadata` (which Nest requires), Nest reflects constructor paramtypes at runtime via `Reflect.getMetadata`. `import type` strips the runtime reference, so Nest can't resolve the provider.

**Symptom**: `@Injectable()` classes with constructor-injected providers fail at runtime (undefined dependency). The change compiles and typechecks cleanly — no warning, no error. Tests that don't exercise DI miss it.

## When Nest code is in a subdirectory

For libraries where Nest code lives in a clearly bounded path (e.g. `src/nest/**` inside a single workspace of an otherwise non-Nest monorepo), a scoped `overrides` block in `oxlint.config.ts` works:

```ts
import { createConfig } from '@datacamp/oxlint-config';

export default createConfig({
  ignorePatterns: ['acceptance_tests'],
  presets: ['base', 'typescript', 'import', 'node'],
  overrides: [
    {
      files: ['src/nest/**/*.ts'],
      rules: { 'typescript/consistent-type-imports': 'off' },
    },
  ],
});
```

Adjust the `files` glob to the repo's actual Nest path.

## When the whole codebase is Nest

For Nest backends where the entire codebase is Nest code, the scoped override doesn't apply cleanly — you'd be turning the rule off globally, which loses its value for any non-DI code paths.

Correct handling is an **open question on `@datacamp/oxlint-config`**. Candidates under discussion:

- Ship a `nest` preset that bundles the rule-off.
- Flip the rule to `off` by default on Nest detection.
- Expose a `nest: true` flag on `createConfig`.

**When encountering a Nest backend, flag this to the Developer Platforms team and defer to the toolchain discussion** rather than papering over it per-repo. A short-term workaround is the global rule-off:

```ts
rules: {
  'typescript/consistent-type-imports': 'off',
},
```

…but mark it clearly in the PR description and in a code comment so it isn't carried forward once the preset/flag lands.

## Verifying after `lint:fix`

For any Nest repo, after running `yarn lint:fix`:

1. Diff the changes — look for `import { … } → import type { … }` in any file in the Nest scope.
2. Run the app's integration tests (specifically the bootstrapping path that wires up DI).
3. If integration tests don't exist or don't exercise DI, smoke-test the app start manually (`yarn dev` / `yarn start:dev`) and exercise at least one DI-dependent endpoint.

Don't rely on `yarn build` / `yarn typecheck` / unit tests alone — none of them catch the runtime symptom.

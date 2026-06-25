# CircleCI patterns — three-step `check` job

Three patterns observed across DC repos. Identify by reading `.circleci/config.yml` jobs, then apply the per-pattern transformation.

## Pattern 1 — Simple

**Signal:** single `test` job with format/lint/typecheck/test steps inline.

**Before:**

```yaml
jobs:
  test:
    docker:
      - image: cimg/node:24.15.0
    steps:
      - checkout
      - yarn_install
      - run: yarn typecheck
      - run: yarn format:check:ci
      - run: yarn lint:check:ci
      - run: yarn test
```

**After:**

```yaml
jobs:
  check:
    docker:
      - image: cimg/node:24.15.0
    resource_class: medium
    environment:
      DC_OXC_THREADS: 2
    steps:
      - checkout
      - yarn_install
      - run:
          name: Typecheck
          command: ./node_modules/.bin/tsc --noEmit
      - run:
          name: Format check
          command: NODE_OPTIONS='--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' ./node_modules/.bin/oxfmt --check --threads ${DC_OXC_THREADS:-2}
      - run:
          name: Lint
          command: NODE_OPTIONS='--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' ./node_modules/.bin/oxlint --report-unused-disable-directives --threads ${DC_OXC_THREADS:-2}

  test:
    docker:
      - image: cimg/node:24.15.0
    steps:
      - checkout
      - yarn_install
      - run: yarn test

workflows:
  main:
    jobs:
      - check
      - test
      - deploy:
          requires:
            - check
            - test
```

- Remove `typecheck` / `format:check:ci` / `lint:check:ci` steps from the `test` job.
- `check` and `test` run in parallel.
- Downstream `deploy` (or `push`/`publish`) requires both.

## Pattern 2 — Parameterised monorepo (A2)

**Signal:** parameterised `build-and-test` job with a workspace-name parameter; per-workspace instantiations under `workflows`. A2 monorepo shape — independent published packages, focused installs, per-workspace CI signals.

**Before:**

```yaml
jobs:
  build-and-test:
    parameters:
      workspace_name:
        type: string
    docker:
      - image: cimg/node:<version>
    working_directory: <workspace-root>/<< parameters.workspace_name >>
    steps:
      - checkout
      - run: yarn workspaces focus
      - run: yarn typecheck
      - run: yarn format:check:ci
      - run: yarn lint:check:ci
      - run: yarn test
      - run: yarn build

workflows:
  main:
    jobs:
      - build-and-test:
          name: build-and-test-<workspace-a>
          workspace_name: <workspace-a>
      - build-and-test:
          name: build-and-test-<workspace-b>
          workspace_name: <workspace-b>
```

**After:**

```yaml
jobs:
  check:
    parameters:
      workspace_name:
        type: string
    docker:
      - image: cimg/node:<version>
    resource_class: medium
    working_directory: <workspace-root>/<< parameters.workspace_name >>
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
          command: NODE_OPTIONS='--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' ./node_modules/.bin/oxfmt --check --threads ${DC_OXC_THREADS:-2}
      - run:
          name: Lint
          command: NODE_OPTIONS='--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' ./node_modules/.bin/oxlint --report-unused-disable-directives --threads ${DC_OXC_THREADS:-2}

  build-and-test:
    parameters:
      workspace_name:
        type: string
    docker:
      - image: cimg/node:<version>
    working_directory: <workspace-root>/<< parameters.workspace_name >>
    steps:
      - checkout
      - run: yarn workspaces focus
      - run: yarn test
      - run: yarn build

workflows:
  main:
    jobs:
      - check:
          name: check-<workspace-a>
          workspace_name: <workspace-a>
      - check:
          name: check-<workspace-b>
          workspace_name: <workspace-b>
      - build-and-test:
          name: build-and-test-<workspace-a>
          workspace_name: <workspace-a>
      - build-and-test:
          name: build-and-test-<workspace-b>
          workspace_name: <workspace-b>
      - deploy:
          requires:
            - check-<workspace-a>
            - check-<workspace-b>
            - build-and-test-<workspace-a>
            - build-and-test-<workspace-b>
```

- `working_directory: <workspace-root>/<< parameters.workspace_name >>` — so `./node_modules/.bin/<tool>` resolves the workspace-local install. Substitute the repo's actual workspace root (commonly `libraries/`, `packages/`, etc.).
- Match the existing install command (`yarn workspaces focus` for Yarn 4, `yarn install` for Yarn 1).
- Instantiate `check` per workspace (one entry per `build-and-test` entry).
- Downstream jobs require **both** per-workspace `check` and `build-and-test`.
- The parameter name (`workspace_name` here) is a placeholder — preserve whatever the existing config uses (`library_name`, `package_name`, etc.).

## Pattern 3 — Lerna monorepo (A1)

**Signal:** `test` job runs `yarn lint` (which calls `lerna run lint`) + `yarn test:coverage:ci`.

**Before:**

```yaml
jobs:
  test:
    docker:
      - image: cimg/node:24.15.0
    steps:
      - checkout
      - yarn_install
      - run: yarn lint # lerna run lint
      - run: yarn test:coverage:ci
```

**After:**

```yaml
jobs:
  check:
    docker:
      - image: cimg/node:24.15.0
    resource_class: medium
    environment:
      DC_OXC_THREADS: 2
    steps:
      - checkout
      - yarn_install
      - run:
          name: Typecheck
          command: yarn lerna run typecheck --stream
      - run:
          name: Format check
          command: yarn lerna run format:check:ci --stream
      - run:
          name: Lint
          command: yarn lerna run lint:check:ci --stream

  test:
    docker:
      - image: cimg/node:24.15.0
    steps:
      - checkout
      - yarn_install
      - run: yarn test:coverage:ci
```

- **Lerna repos** can't bin-direct from root if tooling is scoped per-package — use Lerna's runner (`yarn lerna run <script> --stream`). Lerna's node invocation is the yarn wrapper Lerna itself provides; no further yarn layer.
- If tooling is **hoisted at root**, prefer the bin-direct form like Pattern 1.
- Remove `lint` / `format` / `typecheck` from `test`. Same parallel structure as Pattern 1.

## Workflow dependencies (all patterns)

- `check`, `test`, and `build` (if present) all start in parallel.
- Downstream `deploy` / `push` / `publish` jobs require **both** `check` and `test` (and `build` if it gates).
- A `check` failure at any of the three steps blocks `deploy` — not the parallel `test` / `build`.

## Verifying

After pushing:

1. CircleCI shows `check`, `test`, `build` running in parallel.
2. Each `check` sub-step (`Typecheck`, `Format check`, `Lint`) reports its own duration.
3. Step names match `Typecheck`, `Format check`, `Lint` verbatim — the CircleCI UI groups timing by exact name, and the upcoming benchmarking extractor (see umbrella `dc-migrate-oxfmt-oxlint` Roadmap) will filter on these strings.
4. Total `check` job duration ≈ sum of three step durations (minus a few seconds of orchestration overhead).

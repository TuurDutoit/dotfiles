# Justfile Recipe Templates

Fallback reference for the `create-justfile` skill. Use these templates **only** when the project's own documentation (README.md, linked MD files) and detected scripts/config do not provide enough information to determine the right command body.

## Critical: Tab indentation

Justfile recipe bodies **must use hard tab characters (`\t`), not spaces**. If you write a recipe with spaces, `just` will reject the file with:

```text
error: Recipe line is indented with spaces, but indentation is determined by a leading tab
```

The templates below show indented lines — treat every indented line as requiring a **tab** character at the start, not spaces.

---

## Stack Detection Signals

Detect **all** matching stacks — do not stop at the first match.

| Signal                                                                        | Stack                                                                         |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `uv.lock`                                                                     | Python — uv                                                                   |
| `poetry.lock`                                                                 | Python — Poetry                                                               |
| `pyproject.toml` or `requirements.txt` or `setup.py` (without uv/poetry lock) | Python — pip                                                                  |
| `package.json` + `pnpm-lock.yaml`                                             | Node.js — pnpm                                                                |
| `package.json` + `yarn.lock`                                                  | Node.js — yarn (check `packageManager` field to distinguish Classic vs Berry) |
| `package.json` + `package-lock.json` or no lock file                          | Node.js — npm                                                                 |
| `Gemfile`                                                                     | Ruby                                                                          |
| `*.tf` files anywhere in the repo                                             | Terraform / IaC                                                               |
| `docker-compose.yml` or `docker-compose.yaml`                                 | Docker                                                                        |

---

## Terraform / IaC

> **Two variants** — choose based on detected structure:
>
> - **Single working dir:** `.tf` files at repo root (no `main/` subdirectory)
> - **Multi working dir:** `main/` directory contains `.tf` files, plus optional `environments/` subdirectories
>
> `test` uses `terraform validate` (no credentials needed). Do NOT use `terraform plan` in `test` — it requires live AWS credentials.
> `setup` / `update-deps` must run in every working directory that has its own provider/backend config.
> If `.tflint.hcl` exists, append `tflint --recursive` to the `check` recipe.

### Single working dir (root)

```text
# List available commands
default:
	just --list

# Download providers and modules
setup:
	terraform init

# Upgrade providers and modules to latest allowed versions
update-deps:
	terraform init -upgrade

# Check formatting (read-only)
check:
	terraform fmt -check -recursive

# Auto-fix formatting
fix:
	terraform fmt -recursive

# Validate all configurations (requires setup to have been run)
test:
	terraform validate
```

### Multi working dir (main/ + environments/)

> Replace the `for` loop body with explicit `terraform -chdir=environments/<env> validate` calls if the environments are known and stable — explicit is clearer. Use the loop form only when environments are numerous or dynamic.

```text
# List available commands
default:
	just --list

# Download providers and modules for all working directories
setup:
	terraform -chdir=main init
	for env in environments/*/; do terraform -chdir="$$env" init; done

# Upgrade providers and modules to latest allowed versions
update-deps:
	terraform -chdir=main init -upgrade
	for env in environments/*/; do terraform -chdir="$$env" init -upgrade; done

# Check formatting across entire repo (read-only)
check:
	terraform fmt -check -recursive

# Auto-fix formatting across entire repo
fix:
	terraform fmt -recursive

# Validate all configurations (requires setup to have been run)
test:
	terraform -chdir=main validate
	for env in environments/*/; do terraform -chdir="$$env" validate; done
```

> **Note on `$$`:** justfile requires `$$` to pass a literal `$` to the shell. The shell receives `$env`.

---

## Python — uv

```text
# List available commands
default:
	just --list

# Install dependencies
setup:
	uv sync

# Upgrade all dependencies to latest compatible versions
update-deps:
	uv sync --upgrade

# Lint and type-check (read-only, no auto-fix)
check:
	uv run ruff check .
	uv run ruff format --check .

# Auto-fix lint and formatting issues
fix:
	uv run ruff check --fix .
	uv run ruff format .

# Run the full test suite
test:
	uv run pytest tests/ -v
```

---

## Python — Poetry

```text
# List available commands
default:
	just --list

# Install dependencies
setup:
	poetry install

# Upgrade all dependencies to latest compatible versions
update-deps:
	poetry update

# Lint and type-check (read-only, no auto-fix)
check:
	poetry run ruff check .
	poetry run ruff format --check .

# Auto-fix lint and formatting issues
fix:
	poetry run ruff check --fix .
	poetry run ruff format .

# Run the full test suite
test:
	poetry run pytest tests/ -v
```

---

## Python — pip

> ⚠️ `update-deps` runs `pip install --upgrade` unconstrained. If the project uses pinned requirements generated from a `requirements.in`, the user should prefer `pip-compile --upgrade`. Surface this at review time (Step 6), not silently.

```text
# List available commands
default:
	just --list

# Install dependencies
setup:
	pip install -r requirements.txt

# Upgrade all dependencies — see warning above for pinned projects
update-deps:
	pip install --upgrade -r requirements.txt

# Lint and type-check (read-only, no auto-fix)
check:
	ruff check .
	ruff format --check .

# Auto-fix lint and formatting issues
fix:
	ruff check --fix .
	ruff format .

# Run the full test suite
test:
	pytest tests/ -v
```

---

## Node.js

> **Always read `package.json` scripts before using these templates.** Only use `npm run <script>` if that script actually exists in the scripts object. If `lint`, `lint:fix`, `typecheck`, or `dev` are absent, either use the tool binary directly (e.g. `npx eslint .`) or omit the line and note it to the user.

**Script names to detect** (from `package.json` `scripts` object):

| Category     | Script names                                                             |
| ------------ | ------------------------------------------------------------------------ |
| Lint-fix     | `lint:fix`, `lint-fix`, `eslint:fix`                                     |
| Format-fix   | `format`, `format:fix`, `format:write`, `prettier:fix`, `prettier:write` |
| Format-check | `format:check`, `prettier:check`, `prettier`                             |
| Typecheck    | `typecheck`, `type-check`, `tsc`, `tsc:check`                            |
| Dev          | `dev`                                                                    |

Store which are present — they drive `fix` and `check` composition.

### npm

```text
# List available commands
default:
	just --list

# Install dependencies
setup:
	npm install

# Upgrade all dependencies to latest compatible versions
update-deps:
	npm update

# Lint and type-check (read-only) — adjust to match actual package.json scripts
check:
	npm run lint
	npm run format:check  # only if a format-check script exists in package.json
	npm run typecheck     # only if typecheck script exists in package.json

# Auto-fix lint, then format, then type-check — adjust to match actual package.json scripts
# Order is required: lint:fix → format → typecheck
fix:
	npm run lint:fix      # only if lint:fix (or lint-fix) script exists in package.json
	npm run format        # only if a format-fix script exists in package.json
	npm run typecheck     # only if typecheck script exists in package.json

# Run the full test suite
test:
	npm test

# Start the local dev server — only include if 'dev' script exists in package.json
dev:
	npm run dev
```

### yarn (Classic v1)

> Use this when `package.json` has no `packageManager` field, or it specifies `yarn@1.x`.

```text
# List available commands
default:
	just --list

# Install dependencies
setup:
	yarn install

# Upgrade all dependencies to latest compatible versions (Yarn Classic only)
update-deps:
	yarn upgrade

# Lint and type-check (read-only) — adjust to match actual package.json scripts
check:
	yarn lint
	yarn format:check     # only if a format-check script exists in package.json
	yarn typecheck        # only if typecheck script exists in package.json

# Auto-fix lint, then format, then type-check — adjust to match actual package.json scripts
# Order is required: lint:fix → format → typecheck
fix:
	yarn lint:fix         # only if lint:fix (or lint-fix) script exists in package.json
	yarn format           # only if a format-fix script exists in package.json
	yarn typecheck        # only if typecheck script exists in package.json

# Run the full test suite
test:
	yarn test

# Start the local dev server — only include if 'dev' script exists in package.json
dev:
	yarn dev
```

### yarn (Berry v2+)

> Use this when `package.json` has `"packageManager": "yarn@2.x"` or higher.

```text
# List available commands
default:
	just --list

# Install dependencies
setup:
	yarn install

# Upgrade all dependencies to latest compatible versions (Yarn Berry)
update-deps:
	yarn up '*'

# Lint and type-check (read-only) — adjust to match actual package.json scripts
check:
	yarn lint
	yarn format:check     # only if a format-check script exists in package.json
	yarn typecheck        # only if typecheck script exists in package.json

# Auto-fix lint, then format, then type-check — adjust to match actual package.json scripts
# Order is required: lint:fix → format → typecheck
fix:
	yarn lint:fix         # only if lint:fix (or lint-fix) script exists in package.json
	yarn format           # only if a format-fix script exists in package.json
	yarn typecheck        # only if typecheck script exists in package.json

# Run the full test suite
test:
	yarn test

# Start the local dev server — only include if 'dev' script exists in package.json
dev:
	yarn dev
```

### pnpm

```text
# List available commands
default:
	just --list

# Install dependencies
setup:
	pnpm install

# Upgrade all dependencies to latest compatible versions
update-deps:
	pnpm update

# Lint and type-check (read-only) — adjust to match actual package.json scripts
check:
	pnpm lint
	pnpm format:check     # only if a format-check script exists in package.json
	pnpm typecheck        # only if typecheck script exists in package.json

# Auto-fix lint, then format, then type-check — adjust to match actual package.json scripts
# Order is required: lint:fix → format → typecheck
fix:
	pnpm lint:fix         # only if lint:fix (or lint-fix) script exists in package.json
	pnpm format           # only if a format-fix script exists in package.json
	pnpm typecheck        # only if typecheck script exists in package.json

# Run the full test suite
test:
	pnpm test

# Start the local dev server — only include if 'dev' script exists in package.json
dev:
	pnpm dev
```

---

## Ruby

> Check `config/application.rb` or `bin/rails` to confirm this is a Rails project before including `dev`.
>
> **Test framework detection (check Gemfile):**
>
> - `rspec` present → `bundle exec rspec`
> - `minitest` present, or Rails with no rspec → `bundle exec rails test`
> - Neither found → default to `bundle exec rspec` and warn the user
>
> ⚠️ Check Gemfile for `rubocop`. If absent, warn the user to add it before running `just check` or `just fix`.

```text
# List available commands
default:
	just --list

# Install dependencies
setup:
	bundle install

# Upgrade all dependencies to latest compatible versions
update-deps:
	bundle update

# Lint (read-only, no auto-fix)
check:
	bundle exec rubocop

# Auto-fix lint and formatting issues
fix:
	bundle exec rubocop --autocorrect

# Run the full test suite — replace with 'bundle exec rails test' for minitest
test:
	bundle exec rspec

# Start the Rails dev server (Rails projects only — omit for non-Rails)
dev:
	bundle exec rails server
```

---

## Docker overlay

Add `up` and `down` when `docker-compose.yml` or `docker-compose.yaml` is present. Replace `<service>` with the **actual primary service name** from the compose file (first key under `services:`).

```text
# Build images and start all containers in the background
up:
	docker compose up --build -d

# Stop all containers and remove volumes
# -v is required by the DataCamp readiness checker
down:
	docker compose down -v

# Run tests that don't need external services (no Postgres, Redis, etc.)
# Use a command scoped to no-dependency tests — see SKILL.md Step 3 for detection logic
test-unit:
	docker compose run --rm <service> <test-command>
```

**`<test-command>` by stack:**

| Stack           | Command                       |
| --------------- | ----------------------------- |
| Python — uv     | `uv run pytest tests/ -v`     |
| Python — Poetry | `poetry run pytest tests/ -v` |
| Python — pip    | `pytest tests/ -v`            |
| Node.js — npm   | `npm test`                    |
| Node.js — yarn  | `yarn test`                   |
| Node.js — pnpm  | `pnpm test`                   |
| Ruby (rspec)    | `bundle exec rspec`           |
| Ruby (minitest) | `bundle exec rails test`      |

---

## Multi-stack composition examples

When multiple stacks are detected, combine recipe bodies. Use the project's README/docs as the source first — these are only examples of how combining looks.

```text
# Ruby + Node.js project
setup:
	bundle install
	npm install

update-deps:
	bundle update
	npm update

check:
	bundle exec rubocop
	npm run lint

fix:
	bundle exec rubocop --autocorrect
	npm run lint:fix

test:
	bundle exec rspec
```

```text
# Python + Node.js project (e.g. backend + frontend)
setup:
	uv sync
	npm install

check:
	uv run ruff check .
	npm run lint

test:
	uv run pytest tests/ -v
	npm test
```

---

## README.md / AGENTS.md commands block

When adding or replacing a commands section in `README.md` or `AGENTS.md`, use this format. Omit lines for recipes not added.

````markdown
## Just Commands

```sh
just setup        # install dependencies
just update-deps  # upgrade dependencies
just check        # lint and type-check (read-only)
just fix          # auto-fix lint and formatting
just test         # run all tests
just dev          # start the dev server
just up           # build and start Docker containers
just down         # stop containers and remove volumes
just test-unit    # run tests without external services (no Postgres, Redis, etc.)
```
````

Do **not** keep a raw commands table alongside the just commands.

---

## Change Summary Format (Step 6)

Show this table before displaying the full justfile:

| Recipe  | Status  | Source    | Reason            |
| ------- | ------- | --------- | ----------------- |
| `setup` | NEW     | README.md | Missing           |
| `down`  | UPDATED | Template  | Missing `-v` flag |
| `test`  | KEPT    | —         | Already compliant |

**Status:** `NEW` (not in existing justfile), `UPDATED` (exists but non-compliant), `KEPT` (no change needed).
**Source:** project documentation file name, `package.json`, or `Template` (from REFERENCE.md).

---

## AGENTS.md Substitution Examples (Step 8a)

Example substitution map for a Ruby + Node.js project:

```text
bundle install && npm install       → just setup
bundle exec rubocop && npm run lint → just check
bundle exec rspec                   → just test
npm run dev                         → just dev
docker compose up -d                → just up
docker compose down -v              → just down
```

Example diff-style preview to show before writing:

```diff
Under "## Quick start":
- `bundle exec rspec`
+ `just test`

In the troubleshooting table:
- docker compose up -d
+ just up
```

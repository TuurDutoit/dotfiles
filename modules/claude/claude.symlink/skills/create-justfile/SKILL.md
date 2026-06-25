---
name: create-justfile
description: Creates or updates a justfile to meet DataCamp repository readiness requirements for Python, Node.js, Ruby, and Terraform/IaC projects, then updates README.md and AGENTS.md to document the commands. Use when setting up a new repo, onboarding a project to DataCamp standards, or when the readiness checker reports missing justfile recipes.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
metadata:
  version: '1.2.0'
---

# Create / Update Justfile

## Context

Generates a compliant `justfile` for Python, Node.js, Ruby, or Terraform/IaC repositories, then updates `README.md` and `AGENTS.md` to document all commands. Follows the requirements enforced by the DataCamp repository readiness checker.

[REFERENCE.md](REFERENCE.md) contains fallback templates and reference tables — use it when the project's own documentation does not provide enough information.

## Usage

Walk the workflow below in order. Use the reference doc when the project's own README does not give enough information to fill in a recipe.

## Workflow

### Step 1 — Gate checks

**Check 1 — `just` is installed:**
Run `just --version`. If it fails, attempt to install `just` automatically:

1. Detect the OS and package manager:
   - macOS: run `brew install just`
   - Linux (apt): run `sudo apt-get install -y just`
   - Linux (no apt): run `cargo install just` (requires Rust; if cargo is missing, tell the user)
   - Windows: tell the user to install via `winget install Casey.Just` or from https://just.systems and stop
2. After installing, run `just --version` again to confirm success.
3. If installation fails for any reason, stop and tell the user to install `just` manually: https://just.systems

**Check 2 — AGENTS.md exists:**
If `AGENTS.md` is missing from the repo root, stop and tell the user:

> `AGENTS.md` is required before creating a justfile. Run the `create-agents-md-files` skill first, or follow the guide at:
> https://github.com/datacamp-engineering/skills/blob/main/datacamp-wide/create-agents-md-files/SKILL.md

**Check 3 — CLAUDE.md exists and contains `@AGENTS.md`:**
Read `CLAUDE.md`.

- If it contains only `@AGENTS.md` → pass silently.
- If it contains **substantive project documentation** beyond a pointer (architecture details, module structure, code conventions) → warn before continuing:
  > `CLAUDE.md` contains project-specific documentation that would be lost if replaced with `@AGENTS.md`. Consider migrating it into `AGENTS.md` first.
- If it is missing or contains anything else → warn before continuing:
  > `CLAUDE.md` is missing or incorrect. It must exist and contain only `@AGENTS.md`. Fix this after the skill completes.

Do not proceed past Check 1 or Check 2. Check 3 is a warning only — continue after surfacing it.

### Sub-project exclusions

The following directories are **independent sub-projects** that are not yet in scope. **Exclude them from all analysis** — do not read their documentation, do not detect stacks within them, and do not generate any recipes targeting them:

- `acceptance_tests/` — a self-contained test suite, temporarily out of scope; will be brought into the main justfile in a future pass.

If after excluding these directories no supported stack is found in the main project, stop and tell the user:

> No supported stack found in the main project. `acceptance_tests/` was excluded as an independent sub-project — it will be brought into scope later. Add a supported stack (Python, Node.js, Ruby, or Terraform) to the repo root to enable justfile generation.

### Step 2 — Read project documentation first

Before detecting stacks or building any recipes, read the project's own documentation. This is the primary source of truth — templates in REFERENCE.md are a last resort.

**Read documentation files:**

Skip any files inside excluded sub-project directories (e.g. `acceptance_tests/`). Use Glob to find all of the following and read each one that exists:

- `README.md` (repo root)
- `RUNBOOK.md` (repo root)
- `CONTRIBUTING.md`, `DEVELOPMENT.md`, `HACKING.md`, `SETUP.md` (repo root, if present)
- `doc/*.md` and `doc/**/*.md`
- `docs/*.md` and `docs/**/*.md`

For each file: find sections whose headings contain "setup", "install", "getting started", "running", "development", "usage", "test", "lint", "build" (case-insensitive); extract shell commands from code blocks; note what each does. Skip files that add no new commands.

**Build a command map from what you found:**

```text
setup      → bundle install && npm install   (from README "Getting Started")
test       → bundle exec rspec               (from DEVELOPMENT.md "Running Tests")
dev        → npm run dev                     (from README "Development")
```

Gaps in this map will be filled using stack detection + REFERENCE.md in the next steps.

### Step 3 — Detect all stacks present

> **Open [REFERENCE.md](REFERENCE.md) now** if creating a justfile from scratch — the stack detection signal table and Node.js script names are there.

Detect **all** stacks present — do not stop at the first match. Ignore stack signals inside excluded sub-project directories (e.g. `acceptance_tests/`). See [REFERENCE.md](REFERENCE.md) for the full stack detection signal table.

If no supported stack is found (Python, Node.js, Ruby, or Terraform) after applying exclusions, stop — the "Sub-project exclusions" stop message above applies.

**Confirm with the user** if more than one non-Docker stack is detected:

> I detected: Node.js (npm) + Ruby + Docker. Does that match how this project runs?

Wait for confirmation before proceeding.

**If Docker is present**, read the compose file and identify the primary service name (first key under `services:`). Store it for use in `test-unit`.

Also determine the **`test-unit` command** — a way to run tests that don't need external services (Postgres, Redis, S3, Docker). Distinct from `just test`, which runs the full suite.

**Look for a command that runs tests without external services, in this order:**

1. A script explicitly scoped to no-dependency tests:
   - Directory scope: `tests/unit/`, `spec/unit/`, `__tests__/unit/`
   - Pytest marks: `-m "not integration"`, `-m "unit"`, `-m "not db"`
   - Script names: `test:unit`, `test:fast`, `test:local`, `test:no-deps`
2. Documentation that explicitly describes a command as runnable without external services
3. **Last resort — ask the user** if the repo has separate `test:e2e`, `test:integration`, or `cypress` scripts alongside `test`:
   > Does `test` run without external services (no Postgres, Redis, or Docker needed)?
   - Yes → use it as `test-unit`; No / unsure → no `test-unit` command found

Commands not suitable for `test-unit`: anything invoking `cypress`, `playwright`, `k6`, requiring DB seeds/migrations/service env vars, or documented as needing Docker.

Store this finding — it controls whether `test-unit` is added in Step 4.

**Node.js extras:** Read `package.json` scripts. Only use what is actually in the scripts object. Detect and store which of these are present — they drive `fix` and `check` composition in Step 5:

- **Lint-fix**: `lint:fix`, `lint-fix`, `eslint:fix`
- **Format-fix**: `format`, `format:fix`, `format:write`, `prettier:fix`, `prettier:write`
- **Format-check**: `format:check`, `prettier:check`, `prettier`
- **Typecheck**: `typecheck`, `type-check`, `tsc`, `tsc:check`
- **Dev**: `dev`

**Python extras:** Check for `[tool.ruff]` in `pyproject.toml` or `ruff` in any `requirements*.txt`. If not found, generate ruff-based recipes but warn the user to add it.

**Terraform extras:** When `.tf` files are detected:

- Check whether a `main/` directory exists with `.tf` files — if so, use `-chdir=main` for all terraform commands.
- Check whether an `environments/` directory exists — if so, `test` should validate each environment subdir in addition to `main/`.
- Check for `.tflint.hcl` — if found, add `tflint --recursive` to the `check` recipe.
- `test` uses `terraform validate` (no credentials needed). Do NOT use `terraform plan`.
- `terraform validate` requires providers downloaded via `terraform init` — ensure `setup` runs `init` first.

**Ruby extras:** Check Gemfile for `rspec` vs `minitest`. `rspec` → `bundle exec rspec`; `minitest` or Rails with no rspec → `bundle exec rails test`; neither → default to `bundle exec rspec` and warn. Check Gemfile for `rubocop` — if absent, generate rubocop-based recipes but warn the user to add it.

**Yarn Berry detection:** If `yarn.lock` is present and `packageManager` in `package.json` contains `yarn@2` or higher, use `yarn up '*'` for `update-deps`.

### Step 4 — Determine required recipes

**Always required:** `setup`, `update-deps`, `check`, `fix`, `test`

**Required when Docker is detected:** `up`, `down`

- `down` **must** pass `-v` to `docker compose` — this is enforced by the readiness checker

**`test-unit` — required when Docker is detected, but only if a command that runs tests without external services was found (see Step 3):**

- **Such a command was found** (Step 3): add the recipe.
- **No such command exists**: do NOT add the recipe. Warn at Step 6:
  > ⚠️ `test-unit` was not added. This project has no way to run tests without external services — a developer making a small change should be able to run fast tests locally without Docker being up. To add it, introduce a test subset that doesn't need external dependencies, for example:
  >
  > - **Node.js**: add a `test:unit` script in `package.json` that excludes e2e/integration suites
  > - **Python**: scope pytest with `-m "not integration"` or point it at `tests/unit/`
  > - **Ruby**: scope rspec with `--tag ~integration` or `spec/unit/`
  >
  > Then re-run this skill.

**Optional — include only if explicitly requested:** `stop`

**Optional — include only if a command is known:** `dev` — only if found in documentation or confirmed in package.json scripts / Rails detection. Never use a placeholder.

**Multi-stack command composition:** Use the documentation map from Step 2 as the primary guide. When documentation is silent, combine with `&&`. See [REFERENCE.md](REFERENCE.md) for examples.

**`update-deps` warning for pip:** Surface at Step 6, not here.

**Existing justfile:** If `justfile` or `Justfile` exists, run `just --summary --unsorted` to list current recipes. Only propose changes for gaps or non-compliant `down` — never touch compliant recipes.

### Step 5 — Build the proposed justfile

Priority order for each recipe body:

1. **Command from project documentation** (Step 2 map)
2. **Command inferable from detected scripts/config**
3. **Template from REFERENCE.md** — only when 1 and 2 are unavailable

**`fix` recipe ordering:**

1. Auto-fix lint — only if a lint-fix script/command exists
2. Auto-fix format — only if a format-fix script/command exists
3. Typecheck — only if a typecheck script was detected in Step 3

Never put typecheck before lint-fix or format-fix.

Always include a `default` recipe at the top:

```text
[TAB]# List available commands
default:
[TAB]just --list
```

**Indentation:** justfile recipe bodies **must use hard tab characters**, not spaces.

### Step 6 — Show a change summary, then the full justfile

Show a change summary table (see [REFERENCE.md](REFERENCE.md) for format), then the complete justfile content.

Ask: **"Does this look right? Shall I apply it?"**

Revise and show again if the user requests changes. Never apply without explicit confirmation.

**Surface the pip warning here if applicable:**

> `just update-deps` runs `pip install --upgrade` unconstrained. If your project uses pinned requirements from a `requirements.in` file, prefer `pip-compile --upgrade` instead.

### Step 7 — Apply changes

**Create mode:** Write the complete `justfile`. Verify hard tabs before writing.

**Update mode:** Edit only recipes flagged NEW or UPDATED:

- Locate each recipe by finding the line `<recipe-name>:` at column 0
- Body = all following lines beginning with a tab character
- Replace only that block — leave all other content intact

### Step 8 — Update README.md and AGENTS.md

The readiness checker requires these commands documented in **both** `README.md` and `AGENTS.md`.

**Always document:** `just setup`, `just check`, `just fix`, `just test`
**With Docker:** `just up`, `just down` — and `just test-unit` only if added (see Step 4)
**If `dev` recipe was added:** `just dev`

#### 8a — AGENTS.md: substitute raw commands with just commands

Every raw command that has a `just` equivalent should be rewritten in `AGENTS.md` so the two never drift. Do this in two passes.

**Pass 1 — Inline substitution across the whole file:**

Build a substitution map: for each recipe, the lookup key is the **exact recipe body** (multi-line bodies joined with `&&`). Also build a secondary map of individual sub-commands for cases where the full body doesn't appear on one line. See [REFERENCE.md](REFERENCE.md) for a worked example.

Substitution rules:

- Scan every line: fenced code blocks, inline code spans, bulleted lists, table cells.
- Match full recipe body first; fall back to sub-commands only when full-body matching doesn't apply.
- Strip leading shell prompt (`$ `, `> `) or `sudo ` before matching; preserve if semantically meaningful.
- **Never rewrite** a block showing the justfile itself — detect by a line matching `^[a-z][a-z0-9-]*:` at column 0, or starting with `default:`.
- Never rewrite a line already reading `just <recipe>`.
- Substitute every occurrence; preserve surrounding markdown.

Show a diff-style preview grouped by file location (see [REFERENCE.md](REFERENCE.md) for format). Ask for confirmation before writing. Drop rejected substitutions and re-show.

**Pass 2 — Section-level rewrite of the Commands section:**

1. Search for a heading containing "command" (case-insensitive) — typically `## Commands`.
2. If found, show heading + first few lines of content; ask for confirmation before overwriting.
3. After confirmation, **replace the entire section** (through the next `##` or EOF) with a `## Just Commands` section. See [REFERENCE.md](REFERENCE.md) for format.
4. If not found, append `## Just Commands` at the end.

Preserve all non-command sections (overview, tech stack, structure, security, quick start, conventions).

#### 8b — README.md: add just commands section

For each command to document, search the full file for that literal string. Only add lines not already present.

**Placement:** find a section heading containing "command", "setup", or "running" (case-insensitive) and append missing lines there; otherwise append a new `## Just Commands` section at the end. See [REFERENCE.md](REFERENCE.md) for format.

Show exact lines being added/replaced and ask for confirmation before writing.

## Reference

See [REFERENCE.md](REFERENCE.md) for fallback recipe templates by stack.

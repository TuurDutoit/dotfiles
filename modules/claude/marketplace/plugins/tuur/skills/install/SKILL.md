---
name: install
description: Use when the user wants to install a project's dependencies and run all checks (types, linting, tests, formatting). Reads AGENTS.md or CLAUDE.md for project-specific instructions, falls back to searching the repo.
context: fork
background: true
---

# Install

Install dependencies and run all project checks in a single pass.

## Steps

1. **Find project instructions** by checking (in order):
   - `AGENTS.md` or `CLAUDE.md` in the repo root or subdirectories
   - `README.md`, `CONTRIBUTING.md`
   - Config files: `package.json`, `Makefile`, `Cargo.toml`, `pyproject.toml`, `Gemfile`, `go.mod`, etc.
   - If none found, inspect the repo structure to infer the stack.

2. **Install dependencies** following the discovered instructions (e.g. `yarn install`, `npm install`, `pip install`, `bundle install`, `cargo build`, `make install`).

3. **Run all checks** that exist in the project:
   - Type checking (e.g. `yarn types`, `tsc --noEmit`, `mypy`, `pyright`)
   - Linting (e.g. `yarn lint`, `eslint`, `ruff`, `rubocop`, `golangci-lint`)
   - Formatting (e.g. `yarn format`, `prettier --check`, `black --check`, `gofmt`)
   - Tests (e.g. `yarn test`, `jest`, `pytest`, `go test`, `cargo test`)
   - Any other checks listed in the project instructions or CI config

If there are any failures, don't try to fix them, just mention them in your report.

4. **Report back** with:
   - Which checks passed and which failed
   - Failure output for anything that didn't pass

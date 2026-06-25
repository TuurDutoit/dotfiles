---
name: create-agents-md-files
description: Create AGENTS.md and CLAUDE.md files for the current repository.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
metadata:
  version: '2.0.0'
---

# Create AGENTS.md and CLAUDE.md

## Context

Generate `AGENTS.md` and `CLAUDE.md` at the repo root so future agents have the
project context they need. The pair lives at the root; `CLAUDE.md` typically
just re-imports `AGENTS.md` via `@AGENTS.md`.

The audience is agents, not humans. AGENTS.md is loaded into every agent
session in the repo, so every line is a recurring token cost — it must be
dense, factual, and repo-specific.

## Gate check — existing files

Before doing anything, check whether `AGENTS.md` or `CLAUDE.md` already exist at the repo root.

If either exists, ask the user:

> `AGENTS.md` / `CLAUDE.md` already exist. **Update** (read existing content and improve it) or **recreate** (start fresh from the template)?

- **Update**: read the existing files, then proceed through the steps below — fill gaps **and actively shrink**. Remove human-oriented prose, decorative formatting, and generic boilerplate (replace boilerplate with the condensed forms from the template in [REFERENCE.md](REFERENCE.md)). Keep genuinely repo-specific facts. Report the before/after line count (`wc -l`) and byte size (`wc -c`) to the user. If `CLAUDE.md` already contains only `@AGENTS.md`, skip rewriting it.
- **Recreate**: ignore existing content and generate new files from scratch using the template in [REFERENCE.md](REFERENCE.md).

## Sub-project exclusions

The following directories are **independent sub-projects** that are not yet in scope. Do not read their documentation, do not treat them as monorepo packages, and do not create `AGENTS.md` or `CLAUDE.md` inside them:

- `acceptance_tests/` — a self-contained test suite, temporarily out of scope; will be brought into scope in a future pass.

## Usage

Run the gate check above first, then walk the steps below in order. Honour the sub-project exclusions before reading the wider tree.

1. **Understand the repo**: Read `README.md`, `package.json` (or equivalent), and scan the top-level directory structure to understand the project.
2. **Check for monorepo**: Look for a `packages/`, `apps/`, or workspace config. If it's a monorepo, also create an `AGENTS.md` in each package (see Monorepo section below). Skip any packages inside excluded sub-project directories (e.g. `acceptance_tests/`).
3. **Write `AGENTS.md`** at the repo root using the template in [REFERENCE.md](REFERENCE.md). Be ruthless about brevity. Core content:
   - One-sentence project description
   - Package manager (if not npm, or if corepack is used)
   - Build / typecheck / test / lint commands — **if a `justfile` exists, list `just <recipe>` forms and omit the underlying commands they wrap**
   - Version bumping instructions (if applicable)
   - Key code conventions that aren't obvious from the code itself

   Add further sections (architecture, gotchas, deployment, …) only when they carry repo-specific signal that guides an agent — see the template notes in [REFERENCE.md](REFERENCE.md). Section titles are flexible; the size budget is not.

4. **Verify the size budget**: run `wc -l AGENTS.md` and `wc -c AGENTS.md`. The budget is **≤200 lines**. If over, cut — starting with anything derivable from the repo — until under budget.
5. **Write `CLAUDE.md`** at the repo root containing only `@AGENTS.md`.
6. **Do NOT commit** — let the user decide.

## Monorepo

If this is a monorepo, write an `AGENTS.md` in each package containing a single paragraph explaining what the package is about and its primary technologies.
Also create a `CLAUDE.md` in each package containing a single line `@AGENTS.md`.
Skip excluded sub-project directories (e.g. `acceptance_tests/`) — do not write files there.
Package-level AGENTS.md files should stay well under budget by construction (one paragraph), but apply the same ≤200 lines limit if a package has unusually complex context.

## Key principles

- **Write for agents, not humans.** No marketing prose, no decorative bold labels, no headings for single facts.
- **Every line must carry repo-specific information.** Content that would be identical in any repo is token cost with zero signal — condense it to the one-liners in REFERENCE.md or delete it.
- **Be minimal.** If a section adds no value, remove it entirely — except the commands section, which other skills depend on and must always be present (heading name is flexible: `Commands`, `Usage`, `Just Commands`).
- **Commands over prose.** Show the command, not a paragraph explaining it.
- **Don't repeat what linters enforce.** Only document conventions that aren't caught automatically.
- **Budget: ≤200 lines** per AGENTS.md — always verify with `wc -l`.

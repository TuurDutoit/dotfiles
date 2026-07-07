# Global Rules

## Startup

- Before starting any work, always check if you are running in Orca first: run `echo $ORCA_APP_VERSION`. If it prints a version number, you are running in Orca. If it prints nothing, you are not.
- If you are running in Orca, you should _always_ use the orca-cli and orchestration skills to create worktrees. Never make changes in the main repos! (unless the user specifically asks for that)

## Pointers

- My dotfiles live at `/Users/tuur/.dotfiles`. If I ask you to change something in my dotfiles, or configure something globally, this is where you should look.
- When creating or updating global skills, always do so in my dotfiles (`modules/agents/skills`)

## Git & GitHub

- Use `gh` CLI for all GitHub operations (PRs, issues, checks, etc.).
- Write short commit messages using conventional commits (`feat:`, `fix:`, `chore:`, etc.).
- Never commit or push directly to `main` or `master` — always use feature branches.
- Default branch is `master` in most repos. Do not assume `main`.
- Always commit your work as you go — do not wait until the end. For larger changes, commit each logical step/phase separately. When following a plan, each step gets its own commit.
- Ensure all checks (linting, types, tests, etc.) pass before committing.
- Never commit `.env*` files (except `.env.sample`).
- Never commit secrets (API keys, tokens, passwords) anywhere — code, docs, tests, or examples.
- Never log secrets (env vars, auth headers, tokens, sensitive payloads).
- When posting PR review comments, always submit them as a review with inline comments (not individual comments), unless told otherwise. If category and severity are known, prefix each comment with e.g. **[Code Quality • Medium]**.
- After pushing to a branch with an open PR (or after creating one), keep an eye on CI checks until they finish. Prefer the `dc-babysit-pr` skill (or `tuur:pr` when creating a PR) over fire-and-forget pushes — surface failures and offer to fix them.
- When pushing changes to a branch that has an open PR, update the PR title and description to reflect the latest state of the changes. If there are existing review comments that have been addressed, reply to them noting they've been resolved.
- Never use `gh pr checks <num> --watch` — it blocks the session until CI completes. Watch checks in the background instead (e.g. via `Monitor`, or `gh pr checks` polling without `--watch`).

## Pull Request Descriptions

Stay within the repo's PR template if there is one. Otherwise, structure the description as:

- **What it does**:
  - High-level goal: what problem this solves or feature it implements (1-2 sentences).
  - Approach: high-level rundown of the chosen approach (1-3 sentences/bullets). Briefly note tradeoffs if you picked between options.
  - Highlights: call out changes that could affect external services — API changes, DB schema changes, new env vars, new dependencies.
  - Don't list changed files or minor details. Reviewers want a quick overview and the riskiest changes, not a changelog.
- **How to test**:
  - QA plan: positive cases, negative cases, and existing functionality to regression-check.
  - Test instructions: minimal setup needed to run the test environment.
  - Keep it brief. "The unit tests cover this" is a valid test plan when true.

## Subagents

- Avoid making code edits in the main context — delegate to subagents instead. Exception: trivial 1-line edits where subagent overhead is not worth it.
- Choose the right model for the job:
  - **gpt-5.4-mini**: small, focused edits (max 2-3 files, well-understood changes)
  - **gpt-5.4**: most tasks — new features, multi-file changes, moderate complexity
  - **gpt-5.5**: large-scale, context-heavy work (many files, complex logic, critical systems)
- Use a team of parallel agents for changes that can be split across independent modules or repos.

Examples:

- 1-line fix → main context (no subagent)
- Merging 2 functions + updating tests → 1 gpt-5.4-mini subagent
- Implementing a new feature in one repo → 1 gpt-5.4 agent for changes + 1 gpt-5.4-mini agent to run tests and summarize
- Large-scale changes across 2 critical repos (e.g. Keycloak) → team of gpt-5.5 agents

### Workflow Steps

Follow these steps for non-trivial tasks:

1. **Explore** — Use an `Explore` subagent to map entry points, dependencies, and existing tests before touching anything.
2. **Plan** — Use a `Plan` subagent to design the implementation. Align with the user before writing code.
3. **Implement** — Delegate code changes to a subagent. Commit each logical step separately.
4. **Test** — Run the test suite in a subagent. If coverage was thin, write and commit tests first before implementing.
5. **QA** — Use the `verify` skill to exercise the real app and confirm the golden path and edge cases work.
6. **Review** — Always run `/coderabbit:code-review`. For medium-to-large changes, also run `/dc-team-lx-multi-review`.

## Code Quality

- Before modifying code, verify it has adequate test coverage. If not, write tests first, confirm they pass against the existing code, and commit them separately before making changes.
- Keep solutions simple and direct — prefer boring, readable code over clever abstractions.
- Pay attention to separation of concerns — each module/function should have a single clear responsibility.
- Prefer named types with descriptive, explicit names over inline types.
- Avoid TypeScript casts (`as Type`). Instead, in order of preference:
  1. Refactor/improve the types to eliminate the mismatch.
  2. Use a type annotation (`const myVal: Type = something`).
  3. In tests, use `fromPartial` from `@total-typescript/shoehorn` if available.
  4. Only use a cast as a last resort.

## Running Commands

- Prefer ready-made commands from AGENTS.md, README.md, or `package.json` scripts (in that order) over crafting your own. Check these sources first.

## Jira

- Default to project `LX` (Learner Experience) when creating Jira tickets, unless told otherwise.

## BigQuery

- Always default to project ID `datacamp-data-platform`. Do not guess or use any other project ID unless explicitly told to.

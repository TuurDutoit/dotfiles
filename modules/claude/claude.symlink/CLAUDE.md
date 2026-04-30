# Global Rules

## Git & GitHub

- Use `gh` CLI for all GitHub operations (PRs, issues, checks, etc.).
- Prepend the Jira ticket number to PR titles: `[MPE-XXX] feat(scope): description`.
- Follow the repo's PR template when creating pull requests.
- Write short commit messages using conventional commits (`feat:`, `fix:`, `chore:`, etc.).
- Never commit or push directly to `main` or `master` — always use feature branches.
- Default branch is `master` in most repos. Do not assume `main`.
- Always commit your work as you go — do not wait until the end. For larger changes, commit each logical step/phase separately. When following a plan, each step gets its own commit.
- Ensure all checks (linting, types, tests, etc.) pass before committing.
- Never commit `.env*` files (except `.env.sample`).
- Never commit secrets (API keys, tokens, passwords) anywhere — code, docs, tests, or examples.
- Never log secrets (env vars, auth headers, tokens, sensitive payloads).
- When posting PR review comments, always submit them as a review with inline comments (not individual comments), unless told otherwise. If category and severity are known, prefix each comment with e.g. **[Code Quality • Medium]**.

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

## Worktrees

- When setting up a worktree, use a subagent or team agent to handle app setup (dependency installation, build, dev server, etc.) so the main context stays focused.
- Do not run database migrations or seeds when setting up a worktree.
- When working in a worktree, always use the worktree path for all file operations. Never read or edit files in the original repo directory.
  - Worktrees live under `<project>/.claude/worktrees/<name>/` (e.g. `~/Projects/practice-api/.claude/worktrees/fuzzy-tumbling-mccarthy/`).
  - If your cwd contains `/.claude/worktrees/`, you are in a worktree. The worktree root is your cwd — use it for all paths.
  - The original repo is the ancestor before `/.claude/worktrees/`. Do NOT read, grep, or glob files there.
  - When spawning subagents or teammates from a worktree, explicitly include the worktree path in their prompt and instruct them to use it for all file operations.
- When running `docker compose` from a worktree, use `-f` to point to the docker-compose file in the original project directory (Docker dependencies are shared, not per-worktree).

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

## Tool Usage

- Avoid command substitution (`$()`, backticks) in Bash tool calls. Run each command separately and use the output directly in the next call.
- Avoid chaining commands with `&&` or `;` in Bash tool calls. Use separate, parallel Bash tool calls instead so each command is individually visible and reviewable. Pipes (`|`) are fine.
- Do not use `cd` in Bash tool calls — it breaks permission checks. Use absolute paths instead.
- Use `jq` for JSON parsing in shell commands, not Python.

## Jira

- Default to project `LX` (Learner Experience) when creating Jira tickets, unless told otherwise.

## BigQuery

- Always default to project ID `datacamp-data-platform`. Do not guess or use any other project ID unless explicitly told to.

## Self-Improvement

- After completing a task, briefly reflect: were there unexpected problems, anything surprising, or anything that could still be improved? Share relevant observations with the user.
- When corrected or when discovering an implicit rule during work, consider adding it to `~/.claude/CLAUDE.md`.
- Only add rules that are general enough to apply across most projects.
- Keep this file under 200 lines.
- Before restructuring or removing existing rules, ask for confirmation.

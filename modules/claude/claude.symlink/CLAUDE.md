# Global Rules

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

## Worktrees

- Default to working in a worktree. When starting any task that involves modifying code in a git repo, set up a worktree first (via `EnterWorktree`) before making changes — unless the user explicitly says otherwise or you are already inside one (cwd contains `/.claude/worktrees/`). Read-only investigation, quick questions, and edits to non-repo files (e.g. dotfiles, `~/.claude/`) do not need a worktree.
- Base the worktree on the latest default branch. `EnterWorktree` branches from current `HEAD`, so before calling it: `git fetch origin`, then `git checkout <default-branch>` and `git pull --ff-only` (default is `master` in most repos — confirm with `git symbolic-ref refs/remotes/origin/HEAD` if unsure). Skip this only if the user explicitly asks to branch off something else (e.g. an existing feature branch).
- When setting up a worktree, use a subagent or team agent to handle app setup (dependency installation, build, dev server, etc.) so the main context stays focused.
- Do not run database migrations or seeds when setting up a worktree.
- When working in a worktree, always use the worktree path for all file operations. Never read or edit files in the original repo directory.
  - Worktrees live under `<project>/.claude/worktrees/<name>/` (e.g. `~/Projects/practice-api/.claude/worktrees/fuzzy-tumbling-mccarthy/`).
  - If your cwd contains `/.claude/worktrees/`, you are in a worktree. The worktree root is your cwd — use it for all paths.
  - The original repo is the ancestor before `/.claude/worktrees/`. Do NOT read, grep, or glob files there.
  - When spawning subagents or teammates from a worktree, explicitly include the worktree path in their prompt and instruct them to use it for all file operations.
- When running `docker compose` from a worktree, use `-f` to point to the docker-compose file in the original project directory (Docker dependencies are shared, not per-worktree).

## Subagents

- Avoid making code edits in the main context — delegate to subagents instead. Exception: trivial 1-line edits where subagent overhead is not worth it.
- Choose the right model for the job:
  - **Haiku**: small, focused edits (max 2-3 files, well-understood changes)
  - **Sonnet**: most tasks — new features, multi-file changes, moderate complexity
  - **Opus**: large-scale, context-heavy work (many files, complex logic, critical systems)
- Use a team of parallel agents for changes that can be split across independent modules or repos.

### Workflow Steps

Follow these steps for non-trivial tasks:

1. **Explore** — Use an `Explore` subagent to map entry points, dependencies, and existing tests before touching anything.
2. **Plan** — Use a `Plan` subagent to design the implementation. Align with the user before writing code.
3. **Implement** — Delegate code changes to a Sonnet/Opus subagent. Commit each logical step separately.
4. **Test** — Run the test suite in a subagent. If coverage was thin, write and commit tests first before implementing.
5. **QA** — Use the `verify` skill to exercise the real app and confirm the golden path and edge cases work.
6. **Review** — Always run `/coderabbit:code-review`. For medium-to-large changes, also run `/dc-team-lx-multi-review`.

Examples:

- 1-line fix → main context (no subagent)
- Merging 2 functions + updating tests → 1 Haiku subagent
- Implementing a new feature in one repo → 1 Sonnet agent for changes + 1 Haiku agent to run tests and summarize
- Large-scale changes across 2 critical repos (e.g. Keycloak) → team of Opus agents

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
- Tuur's dotfiles live at `/Users/tuur/.dotfiles`. Before editing anything there, read `/Users/tuur/.dotfiles/AGENTS.md` and follow its commit/push workflow.

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

@RTK.md

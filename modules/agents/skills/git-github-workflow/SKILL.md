---
name: git-github-workflow
description: Use when working with Git, GitHub, commits, branches, pull requests, review comments, or CI checks. Follow the required repository workflow and pull request description standards.
---

## Git & GitHub

- Use `gh` CLI for all GitHub operations (PRs, issues, checks, etc.).
- Write short commit messages using conventional commits (`feat:`, `fix:`, `chore:`, etc.).
- Never commit or push directly to `main` or `master` — always use feature branches (unless the user says differently, or the project has different rules)
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

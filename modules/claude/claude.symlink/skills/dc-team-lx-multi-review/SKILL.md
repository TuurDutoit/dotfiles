---
name: dc-team-lx-multi-review
description: Run performance, security, edge-case, logic, and general (/review) reviewer subagents in parallel on the current branch (or a given PR). Local approximation of /ultrareview. Usage — `/dc-team-lx-multi-review` for current branch vs merge-base; `/dc-team-lx-multi-review <PR_URL_or_number>` for a specific PR.
allowed-tools:
  - Bash(git *)
  - Bash(gh *)
  - Bash(cd *)
  - Bash(pwd)
  - Bash(ls *)
  - Agent
  - Read
  - Grep
  - Glob
metadata:
  version: '1.0.0'
---

# Multi-agent code review (local)

## Context

A local approximation of Claude Code's `/ultrareview`. Dispatches five reviewer subagents in parallel — performance, security, edge cases, logic, and a general `/review` pass — then deduplicates and merges their findings into a single prioritized report.

Unlike `/ultrareview`, this runs against your current subscription on your local machine. It does not have ultrareview's remote verification sandbox, so findings should be treated as a strong signal, not ground truth.

## Usage

`$ARGUMENTS` is optional:

- **Empty** → review the current branch against its merge-base with the repo's default branch (`main` or `master`).
- **A PR reference** → accepts a full URL (`https://github.com/owner/repo/pull/123`), `owner/repo#123`, or a bare `123` when you're already inside the repo. Fetch the PR's diff and description with `gh`.

## Finding classification

Every finding in the final report must be prefixed with one of four labels (in priority order):

- **Blocker:** — bugs, security holes, data loss, broken functionality, or anything that must be fixed before merging. Highest priority.
- **Suggestion:** — non-blocking improvement (refactor, better approach, missed edge case worth handling). The author should consider it but can ship without it.
- **Question:** — reviewer is unsure whether the code is correct or intentional, and wants the author to clarify. Use when the issue depends on context the reviewer doesn't have.
- **Nit:** — small stylistic, naming, or readability comment. Lowest priority. The author can ignore.

These prefixes drive both the ordering of the final report and how the PR author triages comments.

## Step 1 — Gather the diff and materialize the PR-head checkout

Reviewers need both the diff (to see what changed) **and** read access to a checkout that matches the PR head (so when they verify a finding by reading source, they don't accidentally read a stale branch). Set both up before spawning subagents.

Run these in the current working directory:

1. Confirm you are inside a git repo. If not, stop and tell the user.
2. **No-argument case** — the user is already on the branch under review:
   - Default branch: `git symbolic-ref refs/remotes/origin/HEAD` (fallback: try `main` then `master`).
   - Merge-base: `git merge-base <default> HEAD`.
   - Diff: `git diff --stat <merge-base>...HEAD` + full `git diff <merge-base>...HEAD`.
   - Repo root for reviewers: the current working directory (`pwd`).
   - Context: current branch name and latest commit subject.
3. **PR-ref case** — the user passes a PR URL/`owner/repo#N`/bare number:
   - `gh pr diff <ref>` for the diff.
   - `gh pr view <ref> --json title,body,headRefName,baseRefName,headRefOid,headRepository,headRepositoryOwner` for context. Capture `headRefOid` (the PR head SHA).
   - Locate a local clone of the PR's repo. Heuristic order: (a) if the current working directory is inside a clone of the same repo, use it as the host; (b) otherwise look under `~/projects/<repo-name>`; (c) if neither exists, fall back to `gh pr diff` only and tell each reviewer that file reads are unavailable.
   - Run `git -C <host-clone> fetch origin pull/<N>/head` if the SHA isn't already present locally.
   - Create a fresh detached worktree at the PR head: `WORKTREE=$(mktemp -d -t multi-review)` then `git -C <host-clone> worktree add --detach "$WORKTREE" <headRefOid>`. **This is the path reviewers must use as the repo root** — it reflects the PR head exactly, regardless of what the user has checked out elsewhere.
   - Remember `<host-clone>` and `$WORKTREE` so you can clean up in Step 4.

If the diff is empty, stop and report "No changes to review." (Clean up the worktree first if you created one.)

Keep the diff text available for the subagents. If it is very large (> ~2000 lines), you may instead give each subagent the list of changed files and instruct them to read the files themselves from the repo root.

## Step 2 — Spawn the five subagents in parallel

In a **single message**, call the Agent tool five times so they run concurrently:

- `subagent_type: performance-reviewer`
- `subagent_type: security-reviewer`
- `subagent_type: edge-case-reviewer`
- `subagent_type: logic-reviewer`
- `subagent_type: general-purpose` — runs the built-in `/review` skill

For the four specialist subagents, each prompt must include:

1. **Absolute path to the PR-head checkout** (the worktree from Step 1, or the user's cwd in no-arg mode) — this is where they read files. Make explicit: "files at this path reflect the PR head; do not assume they match `master` or any other branch."
2. **The diff** (inline if reasonable, otherwise the list of changed files + the merge-base SHA so they can re-run `git diff` themselves).
3. **Short context**: PR title and body (or branch name + latest commit subject for the no-arg case).
4. A reminder that they should return only verified, high-signal findings in their own domain. **Verify by reading the file at the provided path before reporting** — the diff alone lacks surrounding context, and a finding that's true on `master` may already be fixed at the PR head (or vice versa). If a claim depends on a file not in the diff, open it and confirm before flagging.
5. **Output format requirement** — quote the following verbatim into each specialist's prompt:

   > Format every finding as a single bullet point starting with one of these prefixes:
   >
   > - `Blocker:` — must-fix before merging (bug, security hole, data loss, broken behavior).
   > - `Suggestion:` — non-blocking improvement worth considering.
   > - `Question:` — you're unsure if the code is correct or intentional; ask the author.
   > - `Nit:` — minor stylistic or readability comment.
   >
   > Each bullet must include `file:line` and a one-sentence description; add a brief suggested fix on a sub-bullet if useful. Do not group findings under sub-headings — return a flat bulleted list. If you have no findings, say "No findings." and nothing else.

For the **general-purpose `/review` subagent**, the prompt must:

1. Provide the **absolute path to the PR-head checkout** (the worktree from Step 1, or the user's cwd in no-arg mode) and ask the agent to `cd` into it before doing anything else.
2. Tell the agent to invoke the built-in `review` skill via the `Skill` tool. Pass `args` exactly as the parent received them:
   - If `$ARGUMENTS` is empty → call `Skill({ skill: "review" })` with no args (reviews the current branch — works because the cwd is already on the branch under review).
   - If a PR ref was given → call `Skill({ skill: "review", args: "<PR_URL_or_number>" })`.
3. Instruct the agent to return the `/review` output verbatim as its final message, with no extra commentary.
4. Remind the agent it should not write code, push, or post anything — review-only.

(The `/review` skill has its own output format — do not force the prefix scheme on it. The parent will reclassify its findings during merge in Step 3.)

## Step 3 — Deduplicate, classify, and merge

When all five subagents have returned, do the following before writing the report:

1. **Collect** every finding from every subagent into one flat list, tagging each with its source (`performance`, `security`, `edge-case`, `logic`, `general`).
2. **Deduplicate** findings that target the same `file:line` (or the same logical issue across adjacent lines) and describe the same underlying problem. When merging:
   - Keep the strongest prefix (Blocker > Suggestion > Question > Nit).
   - Combine descriptions into the clearest single sentence.
   - List all sources that flagged it, e.g. `(security, logic)`.
   - If two reviewers genuinely disagree about severity or describe distinct concerns at the same location, keep them as separate entries rather than forcing a merge.
3. **Classify the `/review` output**: split it into individual findings and assign each one a prefix using the same definitions in "Finding classification" above. If `/review` already wrote prose paragraphs, distill each into a single bulleted finding.
4. **Sort** the merged list by prefix priority: Blocker → Suggestion → Question → Nit. Within a prefix group, sort by file path then line number for predictability.

## Step 4 — Report

Output a single combined report:

```text
# Local multi-review — <branch or PR ref>

<one-line diff summary, e.g. "12 files, +340 / -85">

## Findings (N total: X blockers, Y suggestions, Z questions, W nits)

- **Blocker:** `path/to/file.ts:42` — <one-sentence description>. _(security, logic)_
  - Suggested fix: <brief fix if useful>
- **Blocker:** `path/to/other.ts:108` — <description>. _(edge-case)_
- **Suggestion:** `path/to/file.ts:15` — <description>. _(performance)_
- **Question:** `path/to/file.ts:88` — <description>. _(general)_
- **Nit:** `path/to/file.ts:3` — <description>. _(general)_

## By reviewer
- Performance: N findings
- Security: N findings
- Edge cases: N findings
- Logic: N findings
- General (/review): N findings
- After dedup: N unique findings
```

If there are zero findings overall, replace the Findings section with `No findings.` and skip the count line.

Do **not** apply fixes automatically. Leave that for the user to decide after reading the report.

## Step 5 — Clean up the temporary worktree

If you created a worktree in Step 1 (PR-ref case), remove it after the report is written:

- `git -C <host-clone> worktree remove --force "$WORKTREE"`
- `rm -rf "$WORKTREE"` as a fallback if the worktree command failed.

Skip this step in no-arg mode (no worktree was created).

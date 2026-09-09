---
name: multi-review
description: Run reviewer subagents in parallel on the current branch (or a given PR), choosing which review dimensions fit the change. Local approximation of /ultrareview. Usage — `/multi-review` for current branch vs merge-base; `/multi-review <PR_URL_or_number>` for a specific PR.
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
  version: '2.0.0'
---

# Multi-agent code review (local)

## Context

A local approximation of Claude Code's `/ultrareview`. Dispatches reviewer subagents in parallel — the dimensions chosen in Step 2 — then deduplicates and merges their findings into a single prioritized report.

Unlike `/ultrareview`, this runs against your current subscription on your local machine. It does not have ultrareview's remote verification sandbox, so findings should be treated as a strong signal, not ground truth.

## Usage

`$ARGUMENTS` is optional:

- **Empty** → review the current branch against its merge-base with the repo's default branch (`main` or `master`).
- **A PR reference** → accepts a full URL (`https://github.com/owner/repo/pull/123`), `owner/repo#123`, or a bare `123` when you're already inside the repo. Fetch the PR's diff and description with `gh`.

## Finding classification

Every finding has two attributes: **freshness** (new vs existing) and **priority** (one of six labels).

### Freshness

Every finding must be categorized as:

- **New** — the issue was introduced by the changes under review. These are the findings that matter most; the diff is directly responsible for them.
- **Existing** — the issue was already present before the changes. It is flagged only because it is related to code that was touched. Existing findings are never merge-blockers on their own.

Reviewers must verify freshness by checking the merge-base version of the file (`git show <merge-base>:<path>`) when unsure: if the problem exists at the merge-base, it is Existing.

### Priority

Six labels (in priority order). Blocker and Question keep their original meaning; the old Suggestion/Nit pair is replaced by a severity × effort matrix:

- **Blocker:** — bugs, security holes, data loss, broken functionality, or anything that must be fixed before merging. Highest priority. (New issues only.)
- **Recommendation:** — high severity, easy to fix. Clearly worth doing as part of this change.
- **Suggestion:** — high severity, hard to fix. A real problem, but fixing it properly is out of scope for this change; the author should consider it, possibly as a follow-up.
- **Question:** — the reviewer is unsure whether the code is correct or intentional, and wants the author to clarify.
- **Nit:** — low severity, easy to fix. Small stylistic, naming, or readability comment. The author can apply or ignore freely.
- **Note:** — low severity, hard to fix. Worth recording for later, but not worth the effort now.

These attributes drive both the ordering of the final report and how the PR author triages comments.

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
   - Remember `<host-clone>` and `$WORKTREE` so you can clean up in Step 5.

If the diff is empty, stop and report "No changes to review." (Clean up the worktree first if you created one.)

Keep the diff text available for the subagents. If it is very large (> ~2000 lines), you may instead give each subagent the list of changed files and instruct them to read the files themselves from the repo root.

## Step 2 — Choose the review dimensions, then spawn the subagents in parallel

**Not every change needs to be reviewed from every angle.** Use the diff, the PR description, the branch name, and the repo context to pick the dimensions that fit this change. Justify each inclusion or exclusion briefly (one line) in the final report so the user can override.

Available dimensions:

| Dimension | Reviewer | Include when |
| --- | --- | --- |
| Specs | `specs-reviewer` | A spec, ticket, issue, or PR description states what the change must do. Skip if no spec-like input exists. |
| Logic | `logic-reviewer` | Almost always. Any non-trivial behavior change. |
| Edge cases | `edge-case-reviewer` | The change handles user input, external data, API boundaries, or state transitions. |
| Performance | `performance-reviewer` | The change touches hot paths, large data sets, loops over collections, DB queries, or rendering. Skip for small config/UI/copy changes with no measurable hot path. |
| Security | `security-reviewer` | The change touches auth, sessions, user input handling, secrets, queries, HTML rendering, or any trust boundary. |
| Code quality | `quality-reviewer` | Almost always. Checks abstractions, simplification, naming, and clarity. |
| Docs | `docs-reviewer` | The change alters behavior, public interfaces, setup, or workflows that docs describe — or introduces a learning worth recording. |
| General | `general-purpose` (runs the built-in `/review` skill) | Almost always, as a broad safety net. |

Default set when in doubt: Logic, Edge cases, Code quality, General. Add Specs when specs exist. Add Performance/Security only when the change plausibly touches them. Add Docs when behavior or interfaces changed.

For every specialist subagent, each prompt must include:

1. **Absolute path to the PR-head checkout** (the worktree from Step 1, or the user's cwd in no-arg mode) — this is where they read files. Make explicit: "files at this path reflect the PR head; do not assume they match `master` or any other branch."
2. **The diff** (inline if reasonable, otherwise the list of changed files + the merge-base SHA so they can re-run `git diff` themselves).
3. **The merge-base SHA** so they can compare against it for freshness classification.
4. **Short context**: PR title and body (or branch name + latest commit subject for the no-arg case).
5. A reminder that they should return only verified, high-signal findings in their own domain. **Verify by reading the file at the provided path before reporting** — the diff alone lacks surrounding context, and a finding that's true on `master` may already be fixed at the PR head (or vice versa). If a claim depends on a file not in the diff, open it and confirm before flagging.
6. **Output format requirement** — quote the following verbatim into each specialist's prompt:

   > Format every finding as a single bullet point starting with one of these prefixes, then a freshness tag:
   >
   > - `Blocker:` — must-fix before merging (bug, security hole, data loss, broken behavior). Always New.
   > - `Recommendation:` — high severity, easy to fix; clearly worth doing in this change.
   > - `Suggestion:` — high severity, hard to fix; real problem, likely a follow-up.
   > - `Question:` — you're unsure if the code is correct or intentional; ask the author.
   > - `Nit:` — low severity, easy to fix; minor stylistic or readability comment.
   > - `Note:` — low severity, hard to fix; record it, don't fix it now.
   >
   > Immediately after the prefix, mark freshness as `(new)` or `(existing)`: `(new)` means the changes under review introduced the issue; `(existing)` means it was already present before (flag it only when closely related to changed code). Verify by checking the merge-base version of the file when unsure.
   >
   > Each bullet must include `file:line` and a one-sentence description; add a brief suggested fix on a sub-bullet if useful. Do not group findings under sub-headings — return a flat bulleted list. If you have no findings, say "No findings." and nothing else.

Dimension-specific prompt additions:

- **Specs reviewer** (`general-purpose` agent type acting as `specs-reviewer`): give it the spec/ticket text (or point it at the issue/PR description) and instruct it to check three things: (a) completeness — is everything in the spec implemented? (b) correctness — does each implementation match what the spec says? (c) scope — did the change stay within the spec, or does it silently do more/less? Report anything implemented that isn't in the spec too.
- **Quality reviewer**: instruct it to look for: unnecessary new abstractions; code that can be removed, merged, or simplified; naming (variables, functions, types) that is inconsistent across the changed files or with the codebase's conventions; code that is hard to understand; and changes whose intent isn't clear from the code (or commit messages).
- **Docs reviewer**: instruct it to check whether internal repo docs, README.md, AGENTS.md, external docs, and relevant Confluence pages need updates given the change; and whether a durable learning from this change should be recorded in a new or existing skill, or a Jira ticket. It may read the docs (and may fetch linked Confluence pages if tooling allows) but must not edit anything — report gaps only.

For the **general-purpose `/review` subagent**, the prompt must:

1. Provide the **absolute path to the PR-head checkout** (the worktree from Step 1, or the user's cwd in no-arg mode) and ask the agent to `cd` into it before doing anything else.
2. Tell the agent to invoke the built-in `review` skill via the `Skill` tool. Pass `args` exactly as the parent received them:
   - If `$ARGUMENTS` is empty → call `Skill({ skill: "review" })` with no args (reviews the current branch — works because the cwd is already on the branch under review).
   - If a PR ref was given → call `Skill({ skill: "review", args: "<PR_URL_or_number>" })`.
3. Instruct the agent to return the `/review` output verbatim as its final message, with no extra commentary.
4. Remind the agent it should not write code, push, or post anything — review-only.

(The `/review` skill has its own output format — do not force the prefix scheme on it. The parent will reclassify its findings during merge in Step 3.)

## Step 3 — Deduplicate, classify, and merge

When all subagents have returned, do the following before writing the report:

1. **Collect** every finding from every subagent into one flat list, tagging each with its source dimension(s).
2. **Classify the `/review` output**: split it into individual findings and assign each one a freshness and a priority using the same definitions above. If `/review` already wrote prose paragraphs, distill each into a single bulleted finding.
3. **Deduplicate** findings that target the same `file:line` (or the same logical issue across adjacent lines) and describe the same underlying problem. When merging:
   - Keep the strongest priority (Blocker > Recommendation > Suggestion > Question > Nit > Note).
   - Prefer `(new)` over `(existing)` when freshness disagrees — and record the disagreement.
   - Combine descriptions into the clearest single sentence.
   - List all dimensions that flagged it, e.g. `(security, logic)`.
   - If two reviewers genuinely disagree about severity or describe distinct concerns at the same location, keep them as separate entries rather than forcing a merge.
4. **Sort** the merged list: New findings first (Blocker → Recommendation → Suggestion → Question → Nit → Note), then Existing findings (same order). Within a group, sort by file path then line number for predictability.

## Step 4 — Report

Output a single combined report:

```text
# Local multi-review — <branch or PR ref>

<one-line diff summary, e.g. "12 files, +340 / -85">

## Dimensions reviewed

<chosen dimensions with a one-line justification each; also list skipped dimensions and why>

## New findings (N total: X blockers, Y recommendations, Z suggestions, Q questions, W nits, V notes)

- **Blocker:** `path/to/file.ts:42` — <one-sentence description>. _(security, logic)_
  - Suggested fix: <brief fix if useful>
- **Recommendation:** `path/to/file.ts:15` — <description>. _(performance)_
- **Suggestion:** `path/to/other.ts:108` — <description>. _(edge-case)_
- **Question:** `path/to/file.ts:88` — <description>. _(general)_
- **Nit:** `path/to/file.ts:3` — <description>. _(quality)_
- **Note:** `path/to/file.ts:77` — <description>. _(logic)_

## Existing findings (M total — present before this change, flagged for context)

- **Suggestion:** `path/to/legacy.ts:20` — <description>. _(security)_

## By reviewer
- Specs: N findings
- Logic: N findings
- Edge cases: N findings
- Performance: N findings
- Security: N findings
- Code quality: N findings
- Docs: N findings
- General (/review): N findings
- After dedup: N unique findings (N new, M existing)
```

Omit the "Specs"/"Performance"/etc. rows for dimensions that were not run. If there are zero findings overall, replace the findings sections with `No findings.` and skip the count lines. If there are no existing findings, omit that section.

Do **not** apply fixes automatically. Leave that for the user to decide after reading the report.

## Step 5 — Clean up the temporary worktree

If you created a worktree in Step 1 (PR-ref case), remove it after the report is written:

- `git -C <host-clone> worktree remove --force "$WORKTREE"`
- `rm -rf "$WORKTREE"` as a fallback if the worktree command failed.

Skip this step in no-arg mode (no worktree was created).

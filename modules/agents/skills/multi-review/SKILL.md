---
name: multi-review
description: Run reviewer subagents in parallel to review a diff (current branch, a given PR, or a fixed point) or a spec/implementation plan, choosing which review dimensions fit the input. Local approximation of /ultrareview. Usage — `/multi-review` for current branch vs merge-base; `/multi-review <PR_URL_or_number>` for a specific PR; `/multi-review <git-ref>` to review HEAD since a fixed point (commit, branch, or tag); `/multi-review <path-to-spec-or-plan>` to review a spec or implementation plan.
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
  version: '3.2.0'
---

# Multi-agent code review (dispatcher)

You are the dispatcher. You do **not** review code yourself. Your job is five things:

1. **Interpret the arguments** and decide what is under review (Step 1).
2. **Gather the review material** — diff or document, plus a head checkout for diff modes (Step 2).
3. **Choose dimensions** and dispatch one reviewer subagent per dimension (Step 3).
4. **Deduplicate, classify, and merge** the returned findings (Step 4).
5. **Report** one combined, prioritized list (Step 5), then clean up (Step 6).

All actual reviewing happens inside the subagents. Each dimension has its own skill that the subagent loads; you never inline review instructions into your own reasoning beyond the dispatch prompt template below.

## Step 1 — Interpret the arguments

`$ARGUMENTS` is optional:

- **Empty** → review the current branch against its merge-base with the repo's default branch (`main` or `master`).
- **A PR reference** → accepts a full URL (`https://github.com/owner/repo/pull/123`), `owner/repo#123`, or a bare `123` when you're already inside the repo. Fetch the PR's diff and description with `gh`.
- **A git fixed point** → a commit SHA, branch name, tag, or `HEAD~N`. Reviews `HEAD` against that point instead of the default merge-base; everything else works as in the empty case.
- **A spec or implementation plan** → a path to a Markdown/Doc document describing what to build or how. The document itself is reviewed; there is no diff.

## Step 2 — Gather the review material

### Diff modes (cases 1–3 above)

Run these in the current working directory:

1. Confirm you are inside a git repo. If not, stop and tell the user.
2. **Current-branch / fixed-point case**:
   - Default branch: `git symbolic-ref refs/remotes/origin/HEAD` (fallback: try `main` then `master`).
   - Fixed point: with an argument, confirm it resolves first (`git rev-parse <arg>` — a bad ref fails here, not inside the subagents) and use it as the merge-base everywhere, including freshness checks; without, `git merge-base <default> HEAD`.
   - Diff: `git diff --stat <merge-base>...HEAD` + full `git diff <merge-base>...HEAD`.
   - Reviewer repo root: the current working directory (`pwd`).
   - Context: current branch name and latest commit subject.
3. **PR-ref case**:
   - `gh pr diff <ref>` for the diff.
   - `gh pr view <ref> --json title,body,headRefName,baseRefName,headRefOid` for context. Capture `headRefOid` (the PR head SHA).
   - Locate a local clone of the PR's repo, in this order: (a) current working directory inside a clone of the same repo; (b) `~/projects/<repo-name>`; (c) otherwise fall back to `gh pr diff` only and tell each reviewer that file reads are unavailable.
   - `git -C <host-clone> fetch origin pull/<N>/head` if the SHA isn't already present locally.
   - Create a fresh detached worktree at the PR head: `WORKTREE=$(mktemp -d -t multi-review)` then `git -C <host-clone> worktree add --detach "$WORKTREE" <headRefOid>`. **This worktree path is what every reviewer uses as the repo root** — it reflects the PR head exactly.
   - Remember `<host-clone>` and `$WORKTREE` for Step 6.

If the diff is empty, stop and report "No changes to review." (Clean up the worktree first if you created one.)

Keep the diff text available. If it is very large (> ~2000 lines), give each subagent instead the list of changed files plus the merge-base SHA and instruct them to run `git diff <merge-base>...HEAD` themselves.

### Spec/plan mode

- Read the document in full. If the path does not exist, stop and tell the user.
- No diff, no merge-base, no worktree, no repo check.
- Context to pass along: the document's absolute path and, when known, which team/project/ticket it came from.

## Step 3 — Choose dimensions and dispatch subagents

**Not every change needs every dimension.** Use the diff, PR description, branch name, and repo context to pick the dimensions that fit this change. Justify each inclusion or exclusion briefly (one line) in the final report so the user can override.

### Diff-mode dimension table

| Dimension | Skill to load | Include when |
| --- | --- | --- |
| Specs | `multi-review-specs` | A spec, ticket, issue, or PR description states what the change must do. Skip if no spec-like input exists. |
| Logic | `multi-review-logic` | Almost always. Any non-trivial behavior change. |
| Edge cases | `multi-review-edge-cases` | The change handles user input, external data, API boundaries, or state transitions. |
| Performance | `multi-review-performance` | The change touches hot paths, large data sets, loops, DB queries, or rendering. Skip for small config/UI/copy changes. |
| Security | `multi-review-security` | The change touches auth, sessions, user input, secrets, queries, HTML rendering, or any trust boundary. |
| Architecture | `multi-review-architecture` | The change adds or modifies components, module boundaries, public interfaces, cross-service communication, API endpoints, or DB schema. |
| Code quality | `multi-review-quality` | The change involves code (not for specs/plans). |
| Docs | `multi-review-docs` | The change alters behavior, public interfaces, setup, or workflows that docs describe. |

Default set when in doubt: Logic, Edge cases, Code quality. Add Specs when specs exist; Architecture when boundaries, interfaces, services, or schemas are in play; Performance/Security only when plausibly touched; Docs when behavior or interfaces changed.

### Spec/plan-mode dimension table

| Dimension | Include when reviewing a spec or plan |
| --- | --- |
| Architecture | Almost always — is the proposed structure sound? |
| Logic | Almost always — gaps, contradictions, undefined behavior, missing states? |
| Specs | Almost always — completeness, ambiguity, testability, internal consistency of the document itself. |
| Edge cases | Does the plan enumerate error paths, boundary conditions, concurrent and failed states? |
| Performance | Only when the design plausibly touches hot paths, large data sets, or data growth. |
| Security | Only when the design touches auth, trust boundaries, user data, or external input. |

Docs never runs in spec/plan mode (it is diff-driven). There is no merge-base, so freshness does not apply — reviewers anchor findings by document section instead of `file:line`.

### The dispatch protocol

Spawn all chosen subagents **in parallel** with the Task tool, always using the shared reviewer agent: `subagent_type: multi-review-dimension`. It can load every dimension skill plus the shared `multi-review-classification` skill, so you never inline review instructions — the prompt only names the dimension and carries the payload.

The contract is stated on both sides: here, and in the `multi-review-dimension` agent's own prompt (which tells it to load the dimension skill you name).

**Each dispatch prompt must contain, in this order:**

1. **Role assignment and skill directive** (first sentences): `You are the <dimension> reviewer for a multi-review. Load and follow the multi-review-<dimension> skill, together with the multi-review-classification skill it references. Review ONLY that dimension; findings from other domains are out of scope for you.`
2. **Mode**: `diff mode` or `spec/plan mode`.
3. **The payload**:
   - Diff mode: absolute path to the head checkout ("files at this path reflect the PR head; do not assume they match the base branch"), the diff (inline if reasonable, else changed-files list + merge-base SHA so they can run `git diff` themselves), the merge-base SHA, and short context (PR title and body, or branch name + latest commit subject).
   - Spec/plan mode: the absolute path of the document plus its full text when reasonable to inline; no merge-base, no worktree.
4. **Output contract reminder** (verbatim):

   > Return your findings as your final message and nothing else. Follow the output contract in your dimension skill and the shared multi-review-classification skill: one flat bulleted list, each bullet starting with a priority prefix (`Blocker:`, `Recommendation:`, `Suggestion:`, `Question:`, `Nit:`, `Note:`) followed by a freshness tag `(new)`/`(existing)` — omit the freshness tag in spec/plan mode. Each bullet includes `file:line` (or the document section heading in spec/plan mode) and a one-sentence description, with an optional sub-bullet for a suggested fix. If you have no findings, reply exactly `No findings.`.

Never add dimension-specific review guidance to the dispatch prompt yourself — that guidance lives in each dimension skill, so each subagent sees only its own domain without the noise of the others.

## Step 4 — Deduplicate, classify, and merge

When all subagents have returned:

1. **Collect** every finding into one flat list, tagging each with its source dimension(s). Treat a subagent that returned `No findings.` as contributing nothing.
2. **Deduplicate** findings targeting the same `file:line` (or the same logical issue across adjacent lines / same document section) describing the same underlying problem. When merging:
   - Keep the strongest priority (Blocker > Recommendation > Suggestion > Question > Nit > Note).
   - Prefer `(new)` over `(existing)` when freshness disagrees — and record the disagreement.
   - Combine descriptions into the clearest single sentence.
   - List all dimensions that flagged it, e.g. `_(security, logic)_`.
   - If reviewers genuinely disagree about severity or describe distinct concerns at the same location, keep them as separate entries rather than forcing a merge.
3. **Sort**: New findings first (Blocker → Recommendation → Suggestion → Question → Nit → Note), then Existing (same order); within a group, by file path then line number. In spec/plan mode: one list, by priority then document-section order.

## Step 5 — Report

Output a single combined report:

```text
# Local multi-review — <branch, PR ref, or spec path>

<one-line summary, e.g. "12 files, +340 / -85" or "spec/plan: <N> sections">

## Dimensions reviewed

<chosen dimensions with a one-line justification each; also list skipped dimensions and why>

## New findings (N total: X blockers, Y recommendations, Z suggestions, Q questions, W nits, V notes)

- **Blocker:** `path/to/file.ts:42` — <one-sentence description>. _(security, logic)_
  - Suggested fix: <brief fix if useful>
- **Recommendation:** `path/to/file.ts:15` — <description>. _(performance)_
- **Suggestion:** `path/to/other.ts:108` — <description>. _(edge-case)_
- **Question:** `path/to/file.ts:88` — <description>. _(architecture)_
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
- Architecture: N findings
- Code quality: N findings
- Docs: N findings
- After dedup: N unique findings (N new, M existing)
```

Omit rows for dimensions not run. If there are zero findings overall, replace the findings sections with `No findings.` and skip the count lines. If there are no existing findings, omit that section. In spec/plan mode: a single `## Findings` section (no freshness groups), count line `N total: ...`, findings anchored by document section instead of `file:line`.

Do **not** apply fixes automatically. Leave that for the user to decide after reading the report.

## Step 6 — Clean up the temporary worktree

If you created a worktree in Step 2 (PR-ref case), remove it after the report is written:

- `git -C <host-clone> worktree remove --force "$WORKTREE"`
- `rm -rf "$WORKTREE"` as a fallback if the worktree command failed.

Skip in no-arg and spec/plan modes (no worktree was created).

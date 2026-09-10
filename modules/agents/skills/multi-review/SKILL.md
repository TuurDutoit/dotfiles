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
  version: '2.3.0'
---

# Multi-agent code review (local)

## Context

A local approximation of Claude Code's `/ultrareview`. Dispatches reviewer subagents in parallel — the dimensions chosen in Step 2 — then deduplicates and merges their findings into a single prioritized report. The input under review is either a diff (current branch or a PR) or a design document (a spec or implementation plan).

Unlike `/ultrareview`, this runs against your current subscription on your local machine. It does not have ultrareview's remote verification sandbox, so findings should be treated as a strong signal, not ground truth.

## Usage

`$ARGUMENTS` is optional:

- **Empty** → review the current branch against its merge-base with the repo's default branch (`main` or `master`).
- **A PR reference** → accepts a full URL (`https://github.com/owner/repo/pull/123`), `owner/repo#123`, or a bare `123` when you're already inside the repo. Fetch the PR's diff and description with `gh`.
- **A git fixed point** → a commit SHA, branch name, tag, or `HEAD~N`. Reviews `HEAD` against that point instead of the default merge-base; everything else works as in the empty case.
- **A spec or implementation plan** → a path to a Markdown/Doc document describing what to build or how. The document itself is reviewed; there is no diff. See Step 1 (case 4) and the spec/plan-mode guidance in Step 2.

## Finding classification

Every finding has two attributes: **freshness** (new vs existing) and **priority** (one of six labels).

### Freshness

Every finding must be categorized as:

- **New** — the issue was introduced by the changes under review. These are the findings that matter most; the diff is directly responsible for them.
- **Existing** — the issue was already present before the changes. It is flagged only because it is related to code that was touched. Existing findings are never merge-blockers on their own.

Reviewers must verify freshness by checking the merge-base version of the file (`git show <merge-base>:<path>`) when unsure: if the problem exists at the merge-base, it is Existing.

In spec/plan mode freshness does not apply — there is no diff for anything to be new or existing against. Omit the freshness tag on every finding.

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

1. Confirm you are inside a git repo. If not, stop and tell the user. (Spec/plan mode needs no repo — see case 4.)
2. **Current-branch case** — no argument, or the argument is a git fixed point (commit SHA, branch name, tag, `HEAD~N`):
   - Default branch: `git symbolic-ref refs/remotes/origin/HEAD` (fallback: try `main` then `master`).
   - Fixed point: with an argument, confirm it resolves first (`git rev-parse <arg>` — a bad ref fails here, not inside the subagents) and use it as the merge-base everywhere, including freshness checks; without, `git merge-base <default> HEAD`.
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
4. **Spec/plan case** — the user passes a path to a spec or implementation plan:
   - Read the document in full. If the path does not exist, stop and tell the user.
   - No diff, no merge-base, no worktree, no repo check. The document is the unit under review.
   - Context to pass along: the document's absolute path and, when known, what it is for (which team/project/ticket it came from).

If the diff is empty (diff modes only), stop and report "No changes to review." (Clean up the worktree first if you created one.)

Keep the diff text available for the subagents. If it is very large (> ~2000 lines), you may instead give each subagent the list of changed files and instruct them to read the files themselves from the repo root. In spec/plan mode the same rule applies to the document: inline it when reasonable, otherwise hand each reviewer the path to read.

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
| Architecture | `architecture-reviewer` | The change adds or modifies components, module boundaries, public interfaces, cross-service/app communication, API endpoints, or DB schema. Skip for localized logic/config/UI changes that stay inside existing boundaries. |
| Code quality | `quality-reviewer` | Almost always. Checks documented coding standards, the smell baseline, abstractions, simplification, naming, and clarity. |
| Docs | `docs-reviewer` | The change alters behavior, public interfaces, setup, or workflows that docs describe — or introduces a learning worth recording. |

Default set when in doubt: Logic, Edge cases, Code quality. Add Specs when specs exist. Add Architecture when boundaries, interfaces, services, or schemas are in play. Add Performance/Security only when the change plausibly touches them. Add Docs when behavior or interfaces changed.

### Spec / implementation-plan mode

When the input is a spec or implementation plan (Step 1, case 4), only the dimensions that can judge a design document apply:

| Dimension | Include when reviewing a spec or plan |
| --- | --- |
| Architecture | Almost always — the core question: is the proposed structure sound? |
| Logic | Almost always — does the design hold together: gaps, contradictions, undefined behavior, missing states? |
| Specs | Almost always — reviews the document itself: completeness, ambiguity, testability, internal consistency. |
| Edge cases | Does the plan enumerate error paths, boundary conditions, concurrent and failed states? |
| Performance | Only when the design plausibly touches hot paths, large data sets, or data growth. |
| Security | Only when the design touches auth, trust boundaries, user data, or external input. |

Docs never runs in this mode — it is diff-driven. There is no merge-base, so freshness does not apply. Ask reviewers to anchor findings by document section (or line) instead of `file:line`.

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

In spec/plan mode, items 1–3 of the payload are replaced by: the absolute path of the document under review, plus its full text when reasonable to inline (reviewers may also read it themselves). In the quoted format requirement, tell reviewers to use the document's section heading in place of `file:line` and to omit the freshness tag.

Dimension-specific prompt additions:

- **Specs reviewer** (`general-purpose` agent type acting as `specs-reviewer`): in diff mode, first locate the spec, in this order: (1) issue references in the commits under review (`#123`, `Closes #45`, GitLab `!67`), fetched via the repo's tracker workflow; (2) a path the user passed; (3) a spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature; (4) if nothing is found, ask the user — if they say there isn't one, skip the dimension and note "no spec available" in the report. Then give it the spec/ticket text (or point it at the issue/PR description) and instruct it to check three things: (a) completeness — is everything in the spec implemented? (b) correctness — does each implementation match what the spec says? (c) scope — did the change stay within the spec, or does it silently do more/less? Report anything implemented that isn't in the spec too. In spec/plan mode, it reviews the document instead: (a) completeness — missing requirements, undefined terms, unhandled states; (b) testability — can an implementer act on each statement without guessing, and are acceptance criteria measurable? (c) internal consistency — contradictions, conflicting statements, ambiguous scope; (d) scope — silent scope creep relative to the document's own goals, missing non-goals.
- **Architecture reviewer** (`general-purpose` agent type acting as `architecture-reviewer`): instruct it to evaluate high-level structure, not line-level logic: component and module boundaries and responsibilities; coupling and cohesion between changed components; public interfaces and contracts (naming, typing, stability, breaking changes); communication with other apps and microservices (sync vs async, timeouts, retries, idempotency, error handling across the boundary, contract versioning and backwards compatibility); API design (resource modeling, naming, error semantics, pagination, versioning); DB schema design (normalization, indexes for the queries the change will run, constraints and nullability, migration and rollback strategy, data-growth assumptions); and consistency with the codebase's existing architecture — divergence from established patterns must be justified. In spec/plan mode, apply the same questions to the proposed design and additionally check that the plan covers rollout, migration/backfill, and rollback.
- **Quality reviewer**: instruct it to review along two tracks. First, **documented standards**: read the repo's documented coding standards (AGENTS.md, CLAUDE.md, CONTRIBUTING.md, CODING_STANDARDS.md — whichever exist) and report every place the diff violates one, citing the standard (file + rule); these can be hard findings, and a documented standard outranks everything below. Second, generic quality: unnecessary new abstractions; code that can be removed, merged, or simplified; naming (variables, functions, types) that is inconsistent across the changed files or with the codebase's conventions; code that is hard to understand; and changes whose intent isn't clear from the code (or commit messages). For this second track, also paste in the **smell baseline** from `smell-baseline.md` in this skill folder, in full (the subagent has no other access to it): baseline smells are always judgement calls, never hard violations; where a documented standard endorses something a smell would flag, the repo wins; skip anything tooling already enforces (linters, formatters, typecheckers).
- **Docs reviewer**: instruct it to check whether internal repo docs, README.md, AGENTS.md, external docs, and relevant Confluence pages need updates given the change; and whether a durable learning from this change should be recorded in a new or existing skill, or a Jira ticket. It may read the docs (and may fetch linked Confluence pages if tooling allows) but must not edit anything — report gaps only.

## Step 3 — Deduplicate, classify, and merge

When all subagents have returned, do the following before writing the report:

1. **Collect** every finding from every subagent into one flat list, tagging each with its source dimension(s).
2. **Deduplicate** findings that target the same `file:line` (or the same logical issue across adjacent lines) and describe the same underlying problem. When merging:
   - Keep the strongest priority (Blocker > Recommendation > Suggestion > Question > Nit > Note).
   - Prefer `(new)` over `(existing)` when freshness disagrees — and record the disagreement.
   - Combine descriptions into the clearest single sentence.
   - List all dimensions that flagged it, e.g. `(security, logic)`.
   - If two reviewers genuinely disagree about severity or describe distinct concerns at the same location, keep them as separate entries rather than forcing a merge.
3. **Sort** the merged list: New findings first (Blocker → Recommendation → Suggestion → Question → Nit → Note), then Existing findings (same order). Within a group, sort by file path then line number for predictability.

In spec/plan mode: sort the single merged list by priority, then by document section order.

## Step 4 — Report

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

Omit the "Specs"/"Performance"/etc. rows for dimensions that were not run. If there are zero findings overall, replace the findings sections with `No findings.` and skip the count lines. If there are no existing findings, omit that section.

In spec/plan mode: use a single `## Findings` section (no freshness groups) with the count line `N total: ...`, and anchor findings by document section instead of `file:line`.

Do **not** apply fixes automatically. Leave that for the user to decide after reading the report.

## Step 5 — Clean up the temporary worktree

If you created a worktree in Step 1 (PR-ref case), remove it after the report is written:

- `git -C <host-clone> worktree remove --force "$WORKTREE"`
- `rm -rf "$WORKTREE"` as a fallback if the worktree command failed.

Skip this step in no-arg and spec/plan modes (no worktree was created).

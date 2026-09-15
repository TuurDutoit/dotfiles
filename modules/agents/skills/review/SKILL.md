---
name: "review"
description: "Perform comprehensive, multi-dimensional code or spec reviews. Automatically adapts between single-agent review (for small diffs) and multi-subagent review (for large diffs). Reviews diffs (current branch, PR, or git ref) or spec/plan documents across logic, specs, architecture, quality, security, performance, and docs. Supports dimension and strategy overrides (e.g. `/review #123 for performance and security single`)."
allowed-tools:
  - Bash(git *)
  - Bash(gh *)
  - Bash(mkdir *)
  - Bash(wc *)
  - Bash(cd *)
  - Bash(pwd)
  - Bash(ls *)
  - Agent
  - Read
  - Grep
  - Glob
metadata:
  version: "1.0.0"
---

# Unified Adaptive Code & Spec Review

You perform comprehensive, multi-dimensional code and spec reviews. You adapt dynamically: for smaller, focused changes, you perform the review in a single pass; for larger, complex changes, you dispatch parallel subagents per dimension and synthesize their findings.

Your workflow consists of five steps:
1. **Interpret arguments and overrides** (Step 1).
2. **Gather review material** (Step 2).
3. **Choose review dimensions and execution strategy** (Step 3).
4. **Execute review**: either **Single-Agent Pass** (Step 4a) or **Multi-Agent Dispatch & Synthesis** (Step 4b).
5. **Generate unified report** (Step 5), then **clean up** (Step 6).

---

## Step 1 — Interpret arguments and overrides

Arguments passed by the user:

```
$ARGUMENTS
```

### 1. Identify the Target
- **Empty** → review the current branch against its merge-base with the default branch (`main` or `master`).
- **A PR reference** → full URL (`https://github.com/owner/repo/pull/123`), `owner/repo#123`, or bare number `123`.
- **A git fixed point** → commit SHA, branch name, tag, or `HEAD~N`. Reviews `HEAD` against that point instead of the default merge-base.
- **A spec or implementation plan** → path to a markdown or text document describing what to build. (Spec/plan mode).

### 2. Parse Strategy Override (Optional)
Check if the user specified whether to run as a single agent or with subagents:
- **Force Single-Agent**: words like `single`, `fast`, `inline`, `1-pass`, `no-subagents`, `without subagents`.
- **Force Multi-Agent**: words like `multi`, `subagents`, `thorough`, `deep`, `parallel`.

### 3. Parse Dimension Override (Optional)
Look for a clause naming specific dimensions (e.g. `for performance and security`, `just logic`, `specs only`, `HEAD~3 security`):
- Match dimension keywords: `logic`, `specs`, `performance`/`perf`, `security`, `architecture`/`arch`, `quality`, `docs`.
- If specified, review **only** those dimensions (subject to mode constraints: `docs` cannot run on specs/plans, `specs` requires spec context).
- In the final report under "Dimensions reviewed", note `Requested by user: <dimensions>`.

---

## Step 2 — Gather review material

### Diff Modes (Current branch, PR, or git ref)

Run these checks in the current working directory:

1. Verify inside a git repo: `git rev-parse --is-inside-work-tree`.
2. **Resolve diff directory and path** under `/Users/tuur/Documents/Obsidian/DataCamp/Agents/Diffs`:
   - Get repo name: `git remote get-url origin` (or first remote), taking the basename without `.git`. Fallback: current directory name.
   - Diff directory: `DIFF_DIR="/Users/tuur/Documents/Obsidian/DataCamp/Agents/Diffs/<repo-name>"`.
   - Ensure directory exists: `mkdir -p "$DIFF_DIR"`.
   - Name diff file:
     - Current-branch: `DIFF_FILE="$DIFF_DIR/$(date +%Y-%m-%d)-$(git rev-parse --abbrev-ref HEAD | tr '/' '-').diff"`
     - PR-ref: `DIFF_FILE="$DIFF_DIR/pr-<ref-or-number>.diff"`
     - Fixed-point: `DIFF_FILE="$DIFF_DIR/$(date +%Y-%m-%d)-<ref-slug>.diff"`
3. **Save the full diff to file**:
   - Current-branch / fixed-point: `git diff <merge-base>...HEAD > "$DIFF_FILE"`
   - PR-ref: `gh pr diff <ref> > "$DIFF_FILE"`
4. **Measure diff statistics**:
   - Line count: `DIFF_LINES=$(wc -l < "$DIFF_FILE")`
   - File stat: `git diff --stat <merge-base>...HEAD` (or `gh pr diff <ref> --stat`).
   - File count: Count modified files in `--stat` summary (`$DIFF_FILES_COUNT`).
5. **Context & Checkout verification**:
   - **Current-branch / fixed-point**:
     - Default branch: `git symbolic-ref refs/remotes/origin/HEAD` (fallback: `main`, then `master`).
     - Merge-base: `git rev-parse <arg>` for fixed-point; `git merge-base <default> HEAD` for branch.
     - Context: branch name and latest commit subject.
   - **PR-ref**:
     - `gh pr view <ref> --json title,body,headRefName,baseRefName,headRefOid`
     - Capture `headRefOid` and verify current checkout: `git rev-parse HEAD`.
     - If current commit does not match `headRefOid`, **stop and bail out immediately**. Tell the user which commit is checked out and ask them to check out the PR head branch/commit first.
     - Context: PR title, PR body, branch name, `headRefOid`.

If the diff is empty, stop and report "No changes to review." (Remove the empty diff file.)

**Reading the diff**: Use `--stat` and PR context to pick dimensions. For large diffs, never read `$DIFF_FILE` whole — use `Grep` or search for touched files and read the source files at the head checkout for context.

### Spec / Plan Mode

- Read the document in full with `Read`. If the path does not exist, stop and alert the user.
- No diff, no merge-base, no worktree.
- Context: document absolute path and section count.

---

## Step 3 — Choose dimensions and execution strategy

### 1. Dimension Selection
If the user provided a dimension override, honor it directly. Otherwise, select based on the changes:

#### Diff-mode dimension table
| Dimension | Key | Include when |
| --- | --- | --- |
| Specs | `specs` | A spec, ticket, issue, or PR description states requirements. Skip if no spec-like input exists. |
| Logic | `logic` | Almost always. Any behavior change, input handling, state transitions, API boundaries. |
| Performance | `performance` | Touches hot paths, loops, DB queries, large datasets, or rendering. Skip for small config/UI copy. |
| Security | `security` | Touches auth, user input, secrets, queries, HTML rendering, or trust boundaries. |
| Architecture | `architecture` | Adds/modifies module boundaries, public interfaces, service communication, endpoints, or DB schema. |
| Code quality | `quality` | Code changes (standard repo rules, refactoring smells). Never runs in spec/plan mode. |
| Docs | `docs` | Alters behavior, interfaces, setup, or workflows described by repo docs. |

#### Spec/plan-mode dimension table
| Dimension | Key | Include when reviewing a spec or plan |
| --- | --- | --- |
| Architecture | `architecture` | Almost always — soundness of proposed system design and boundaries. |
| Logic | `logic` | Almost always — gaps, contradictions, undefined behavior, error paths, state transitions. |
| Specs | `specs` | Almost always — completeness, clarity, testability, consistency of the document itself. |
| Performance | `performance` | Only when design plausibly touches hot paths, data scale, or data growth. |
| Security | `security` | Only when design touches auth, trust boundaries, user data, or external input. |

### 2. Strategy Selection (Single-Agent vs Multi-Agent)
If the user provided a strategy override (`single` or `multi`), follow the override. Otherwise, auto-detect:

- **Single-Agent Mode (Step 4a)**:
  - Diff mode: `$DIFF_LINES <= 300` AND `$DIFF_FILES_COUNT <= 5`, OR total selected dimensions $\le 2$.
  - Spec/plan mode: Document has $\le 3$ sections OR total selected dimensions $\le 2$.
- **Multi-Agent Mode (Step 4b)**:
  - Diff mode: `$DIFF_LINES > 300` OR `$DIFF_FILES_COUNT > 5`, OR $\ge 3$ heavy dimensions (`logic`, `architecture`, `security`, `performance`) selected.
  - Spec/plan mode: Document has $> 3$ sections AND $\ge 3$ dimensions.

---

## Step 4a — Single-Agent Execution

When running as a single agent:

1. **Load references**:
   - Read `references/classification.md` for verification rules, freshness (`(new)` vs `(existing)`), and priority definitions.
   - For each selected dimension, read `references/dimensions/<dimension>.md`.
   - If `quality` is selected, also read `references/smell-baseline.md`.
2. **Review the changes**:
   - Inspect the diff and relevant source code at the head checkout for each selected dimension.
   - Ground every finding in concrete code evidence.
3. **Mandatory validation pass**:
   - Re-check candidate findings against diff and source. Drop unverified or speculative claims.
   - Filter out linter/typechecker catches, pedantic nitpicks, and subjective style preferences.
4. **Deduplicate, merge, and sort**:
   - Combine multiple dimensions flagging the same line/issue into one finding with combined tags (e.g. `_(security, logic)_`).
   - Sort: New findings first (`Blocker` → `Note`), then Existing findings; by file path and line number.
5. Proceed to **Step 5 (Report)**.

---

## Step 4b — Multi-Agent Dispatch & Synthesis

When running in multi-agent mode:

1. **Dispatch subagents in parallel**:
   Spawn one subagent per selected dimension using the Task tool with `subagent_type: "review-dimension"`.

   **Dispatch prompt protocol (use this exact structure):**
   ```text
   You are the <dimension> reviewer. Load the review skill, read references/classification.md and references/dimensions/<dimension>.md, and review ONLY that dimension. Findings from other domains are out of scope.

   Mode: <diff mode | spec/plan mode>

   Payload:
   - Head checkout path: <absolute path to repo root>
   - Diff file: <$DIFF_FILE> (<$DIFF_LINES> lines)
   - Merge-base SHA: <merge-base SHA>
   - Context: <PR title & body / branch & latest commit subject / spec path>

   Output contract:
   Return your findings as your final message and nothing else.
   - High-signal bar only: objective, material issues with concrete code evidence. No speculation, no "might/could" hedges, no linter/typechecker catches.
   - Run the mandatory validation pass before reporting; drop anything uncertain.
   - Output format: one flat bulleted list, each bullet starting with priority prefix (Blocker:, Recommendation:, Suggestion:, Question:, Nit:, Note:) followed by freshness tag (new)/(existing) — omit freshness in spec/plan mode. Include file:line (or document section heading) and a one-sentence description, with an optional sub-bullet for suggested fix. If no verified findings, reply exactly "No findings.".
   ```
   *(Note: If `<dimension>` is `quality`, also tell the subagent to read `references/smell-baseline.md`.)*

2. **Collect and filter subagent responses**:
   - Collect findings from all subagents. Treat `No findings.` as contributing nothing.
   - Filter out speculative concerns, linter catches, and subjective styling.
3. **Deduplicate and merge**:
   - Merge findings targeting the same `file:line` or logical issue. Keep strongest priority, prefer `(new)` over `(existing)`, and combine dimension tags (e.g. `_(logic, security)_`).
   - Sort: New findings first (`Blocker` → `Note`), then Existing findings; by file path and line number.
4. Proceed to **Step 5 (Report)**.

---

## Step 5 — Generate unified report

Output a single combined report following this exact markdown structure:

```text
# Local review — <branch, PR ref, or spec path>

<one-line summary, e.g. "5 files, +120 / -30 (Single-agent review)" or "14 files, +450 / -110 (Multi-agent review: 4 subagents)">
Diff: `/Users/tuur/Documents/Obsidian/DataCamp/Agents/Diffs/<repo-name>/<filename>.diff` (diff modes only)

## Dimensions reviewed

<chosen dimensions with a one-line justification each; also list skipped dimensions and why; or "Requested by user: <dimensions>">

## New findings (N total: X blockers, Y recommendations, Z suggestions, Q questions, W nits, V notes)

- **Blocker:** `path/to/file.ts:42` — <one-sentence description>. _(security, logic)_
  - Suggested fix: <brief fix if useful>
- **Recommendation:** `path/to/file.ts:15` — <description>. _(performance)_
- **Suggestion:** `path/to/other.ts:108` — <description>. _(logic)_
- **Question:** `path/to/file.ts:88` — <description>. _(architecture)_
- **Nit:** `path/to/file.ts:3` — <description>. _(quality)_
- **Note:** `path/to/file.ts:77` — <description>. _(logic)_

## Existing findings (M total — present before this change, flagged for context)

- **Suggestion:** `path/to/legacy.ts:20` — <description>. _(security)_

## Breakdown by dimension
- Specs: N findings
- Logic: N findings
- Performance: N findings
- Security: N findings
- Architecture: N findings
- Code quality: N findings
- Docs: N findings
- After dedup: N unique findings (N new, M existing)
```

**Reporting rules:**
- If zero findings overall, replace findings sections with `No findings.`
- If no existing findings, omit `## Existing findings`.
- In spec/plan mode: single `## Findings` section (no freshness tags), findings anchored by document section heading instead of `file:line`.
- Do **not** automatically apply fixes.

---

## Step 6 — Clean up temporary resources

- The diff file under `/Users/tuur/Documents/Obsidian/DataCamp/Agents/Diffs` is kept as a durable artifact in Obsidian — do not delete it.
- No temporary worktrees or directories are created.

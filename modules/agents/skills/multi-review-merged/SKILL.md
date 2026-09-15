---
name: multi-review-merged
description: Perform a comprehensive, multi-dimensional code or spec review in a single agent without dispatching subagents. Reviews diffs (current branch, PR, or git ref) or spec/plan documents across logic, specs, architecture, code quality, security, performance, and docs. Usage — `/multi-review-merged` for current branch vs merge-base; `/multi-review-merged <PR_URL_or_number>` for a specific PR; `/multi-review-merged <git-ref>` to review HEAD since a fixed point (commit, branch, or tag); `/multi-review-merged <path-to-spec-or-plan>` to review a spec or implementation plan. Supports dimension overrides like `/multi-review-merged #123 for performance and security`.
allowed-tools:
  - Bash(git *)
  - Bash(gh *)
  - Bash(mkdir *)
  - Bash(wc *)
  - Bash(cd *)
  - Bash(pwd)
  - Bash(ls *)
  - Read
  - Grep
  - Glob
metadata:
  version: '1.1.0'
---

# Unified multi-dimensional code & spec review

You perform the entire multi-dimensional review autonomously in a single agent pass without dispatching subagents. You interpret the input arguments, gather the review material, select and evaluate the active dimensions, validate and deduplicate findings against the shared high-signal standard, and generate a unified, prioritized report.

## Step 1 — Interpret the arguments

These are the arguments passed by the user:

```
$ARGUMENTS
```

Arguments are optional:

- **Empty** → review the current branch against its merge-base with the repo's default branch (`main` or `master`).
- **A PR reference** → accepts a full URL (`https://github.com/owner/repo/pull/123`), `owner/repo#123`, or a bare `123` when you're already inside the repo. Fetch the PR's diff and description with `gh`.
- **A git fixed point** → a commit SHA, branch name, tag, or `HEAD~N`. Reviews `HEAD` against that point instead of the default merge-base; everything else works as in the empty case.
- **A spec or implementation plan** → a path to a Markdown/Doc document describing what to build or how. The document itself is reviewed; there is no diff.

### Dimension override

Any target form can carry a **dimensions override** — a clause naming the dimensions the user wants, such as:

- `/multi-review-merged #123 for performance and security`
- `/multi-review-merged just logic and quality`
- `/multi-review-merged specs only` (with a spec path before it)
- `/multi-review-merged HEAD~3 security`

Parse it like this:

1. **Strip the override clause from the target.** Look for a trailing clause naming dimensions — `for <dims>`, `just <dims>`, `only <dims>`, or a bare `<dims>` tail (e.g. `#123 security`). Everything before it is the target; handle the target per the rules above.
2. **Match each named word to a dimension**, case-insensitively, by exact name or unambiguous prefix: `logic`, `specs`, `performance`/`perf`, `security`, `architecture`, `quality`, `docs`. If a word is ambiguous or matches nothing, stop and ask the user rather than guessing.
3. **Honor the override exactly**: review only the named dimensions. Skip the usual selection logic (Step 3) — do not add or remove dimensions on your own.
4. **Mode still constrains**: docs cannot run in spec/plan mode and specs never runs without a spec-like input — if a requested dimension can't run, say so in the report's dimensions section and run the rest.
5. **Record the override in the report**: under "Dimensions reviewed", write `Requested by user: <dimensions>` instead of justifying inclusion.

## Step 2 — Gather the review material

### Diff modes (cases 1–3 above)

Run these in the current working directory:

1. Confirm you are inside a git repo. If not, stop and tell the user.
2. **Resolve the diff directory and file path** under `/Users/tuur/Documents/Obsidian/DataCamp/Agents/Diffs`:
   - Resolve `<repo-name>`: run `git remote get-url origin` (or first remote) and take the repository basename from the URL, dropping `.git` (e.g. `git@github.com:TuurDutoit/dotfiles.git` → `dotfiles`). With no remote, use the current directory name.
   - Diff directory: `DIFF_DIR="/Users/tuur/Documents/Obsidian/DataCamp/Agents/Diffs/<repo-name>"`
   - Ensure the directory exists: `mkdir -p "$DIFF_DIR"`.
   - Name the diff file:
     - Current-branch case: `DIFF_FILE="$DIFF_DIR/$(date +%Y-%m-%d)-$(git rev-parse --abbrev-ref HEAD | tr '/' '-').diff"`
     - PR-ref case: `DIFF_FILE="$DIFF_DIR/pr-<ref-or-number>.diff"`
     - Fixed-point case: `DIFF_FILE="$DIFF_DIR/$(date +%Y-%m-%d)-<ref-slug>.diff"`
3. **Save the full diff to the file** — never hold the whole diff in context:
   - Current-branch / fixed-point case: `git diff <merge-base>...HEAD > "$DIFF_FILE"`.
   - PR-ref case: `gh pr diff <ref> > "$DIFF_FILE"`.
   - Size it: `wc -l < "$DIFF_FILE"` → `$DIFF_LINES`.
4. **Current-branch / fixed-point case**:
   - Default branch: `git symbolic-ref refs/remotes/origin/HEAD` (fallback: try `main` then `master`).
   - Fixed point: with an argument, confirm it resolves first (`git rev-parse <arg>` — a bad ref fails here, not later) and use it as the merge-base everywhere, including freshness checks; without, `git merge-base <default> HEAD`.
   - Diff summary: `git diff --stat <merge-base>...HEAD` for the summary; the full diff is already in `$DIFF_FILE`.
   - Reviewer repo root: the current working directory (`pwd`).
   - Context: current branch name and latest commit subject.
5. **PR-ref case**:
   - `gh pr view <ref> --json title,body,headRefName,baseRefName,headRefOid` for context. Capture `headRefOid` (the PR head SHA).
   - Verify the current working directory is the PR's repository and has the PR head checked out:
     - Check `git rev-parse HEAD`.
     - If the current commit does not match `headRefOid` (or if not inside a git repo for that PR), **stop and bail out immediately**. Tell the user that the current directory has commit `<current-sha>` (or branch `<current-branch>`) checked out, while PR `<ref>` expects `<headRefOid>`, and ask them to check out the PR branch/commit first.
   - Reviewer repo root: the current working directory (`pwd`).
   - Context: PR title and body, branch name, and `headRefOid`.

If the diff is empty, stop and report "No changes to review." (Remove the empty diff file.)

**Reading the diff:**
The `--stat` output plus context (PR body, commit subjects) is usually enough to choose dimensions. Read `$DIFF_FILE` only when the stat isn't enough, and only if it is small (< ~2000 lines). For a large diff, never read it whole — **search** it instead (Grep for `diff --git a/<path>` to see per-file changes, `^+++` / `^---` for touched files, `@@` hunks by keyword) and read the relevant source files at the checkout path for real context.

### Spec/plan mode

- Read the document in full. If the path does not exist, stop and tell the user.
- No diff, no merge-base, no worktree, no repo check.
- Context: the document's absolute path and, when known, which team/project/ticket it came from.

## Step 3 — Choose review dimensions

**Not every change needs every dimension.** If the user passed a dimensions override (Step 1), review only those dimensions and skip this selection logic. Otherwise, use the diff, PR description, branch name, and repo context to pick the dimensions that fit this change. Justify each inclusion or exclusion briefly (one line) in the final report so the user can override.

### Diff-mode dimension table

| Dimension | Key | Include when |
| --- | --- | --- |
| Specs | `specs` | A spec, ticket, issue, or PR description states what the change must do. Skip if no spec-like input exists. |
| Logic | `logic` | Almost always. Any non-trivial behavior change, or anything handling user input, external data, API boundaries, or state transitions. |
| Performance | `performance` | The change touches hot paths, large data sets, loops, DB queries, or rendering. Skip for small config/UI/copy changes. |
| Security | `security` | The change touches auth, sessions, user input, secrets, queries, HTML rendering, or any trust boundary. |
| Architecture | `architecture` | The change adds or modifies components, module boundaries, public interfaces, cross-service communication, API endpoints, or DB schema. |
| Code quality | `quality` | The change involves code (not for specs/plans). |
| Docs | `docs` | The change alters behavior, public interfaces, setup, or workflows that docs describe. |

Default set when in doubt: Logic, Code quality. Add Specs when specs exist; Architecture when boundaries, interfaces, services, or schemas are in play; Performance/Security only when plausibly touched; Docs when behavior or interfaces changed.

### Spec/plan-mode dimension table

| Dimension | Key | Include when reviewing a spec or plan |
| --- | --- | --- |
| Architecture | `architecture` | Almost always — is the proposed structure sound? |
| Logic | `logic` | Almost always — gaps, contradictions, undefined behavior, missing states? And does the plan enumerate error paths, boundary conditions, concurrent and failed states? |
| Specs | `specs` | Almost always — completeness, ambiguity, testability, internal consistency of the document itself. |
| Performance | `performance` | Only when the design plausibly touches hot paths, large data sets, or data growth. |
| Security | `security` | Only when the design touches auth, trust boundaries, user data, or external input. |

Docs never runs in spec/plan mode (it is diff-driven). There is no merge-base, so freshness does not apply — anchor findings by document section instead of `file:line`.

## Step 4 — Shared classification and verification contract

Every finding reported must be **high-signal, verified with concrete code evidence, and non-speculative**. False positives waste the author's time.

### High-signal bar

Report ONLY findings that meet all of the following criteria:
1. **Objective and verifiable**: grounded in the diff plus ancillary repo evidence you actually read.
2. **Material**:
   - Bugs that will cause incorrect runtime behavior or unhandled reachable errors.
   - Security or privacy vulnerabilities with real exploitability and blast radius.
   - Correctness edge cases: concrete abnormal inputs or failed states the system can actually encounter.
   - Backwards-compatibility breakage or broken public/service contracts.
   - Missing implementations across coupled modules or targets.
   - Boundary or architectural contract violations.
   - Clear violations of documented repo standards (`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, etc.) where you can cite the exact file and rule.

### What NOT to report (negative filters)

Drop candidate issues that match any of these:
- **Speculative concerns**: "might", "could", or "potential" issues without concrete code evidence showing they can happen.
- **Pre-existing issues**: unrelated to the diff or not directly aggravated by the change.
- **Pedantic nitpicks**: trivial comments a senior engineer would not flag.
- **Linter/typechecker territory**: formatting, syntax, type errors, or unused imports that linters, formatters (`oxfmt`, `prettier`), or typecheckers (`tsc`) catch automatically.
- **Subjective style preferences**: personal aesthetic choices not explicitly required by documented repo standards.
- **Explicit exceptions**: rules mentioned in repo standards but explicitly silenced in the code (e.g. via an ignore comment or documented exception).
- **Missing test coverage**: gaps in test suites unless `AGENTS.md` / `CLAUDE.md` explicitly mandates tests for that specific area.

### Diff as source of truth & ancillary repo context

- The **diff is the source of truth** for what changed; the repo on disk may not yet reflect those changes.
- Read the diff carefully. Use the repo at the head checkout **only as ancillary context** (imports, call sites, existing patterns, nearby code) when you need to verify a specific claim — not to discover changes or hypothesize.
- If a claim cannot be verified against the source, **drop it** — do not hedge, guess, or report unconfirmed suspicions.

### Freshness (diff modes only)

- **(new)** — introduced by the changes under review. The diff is directly responsible.
- **(existing)** — already present before this change; flagged only because it is in directly touched code and materially impacts the change. Existing findings are never merge-blockers on their own.

Verify freshness when unsure: check `git show <merge-base>:<path>`. If the issue existed at the merge-base, tag `(existing)`.

**Spec/plan mode:** there is no diff and no merge-base, so freshness does not apply. Omit the freshness tag entirely.

### Priority

Six labels, in priority order:

- **Blocker:** — severe bugs, security flaws, data loss, broken core functionality, or contract breakage that must be fixed before merging. (New issues only.)
- **Recommendation:** — high severity, easy to fix. Material issue clearly worth fixing in this change.
- **Suggestion:** — high severity, hard to fix. A material problem, but full resolution is out of scope for this change; flagged as a concrete follow-up.
- **Question:** — genuine uncertainty about whether behavior is intentional or correct; ask the author with specific code evidence.
- **Nit:** — low severity, easy to fix. Small but objective defect in naming or clarity (not subjective style or linter territory).
- **Note:** — low severity, hard to fix. Useful context or observation worth recording for later.

## Step 5 — Dimension review execution & reference

Systematically review the changes across each selected dimension using the specific criteria below:

---

### Dimension 1: Specs (`specs`)

Checks implementation against stated requirements, or reviews a spec document itself.

#### Diff mode
1. **Locate the spec**, in this order:
   - Issue references in commit messages (`#123`, `Closes #45`, GitLab `!67`), fetched via the repo's tracker workflow.
   - A path the user passed.
   - A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
   - If nothing is found, ask the user — if they confirm no spec exists, skip this dimension and record `(no spec available)`.
2. **Check three things against the diff**:
   - **Completeness**: is everything the spec requires actually implemented?
   - **Correctness**: does each implemented piece match what the spec specifies (not just that *something* was built)?
   - **Scope**: did the change stay within the spec, or does it silently do more or less? Report anything implemented that isn't in the spec too.

#### Spec/plan mode
Review the document itself as the unit under review:
- **Completeness**: missing requirements, undefined terms, unhandled states.
- **Testability**: can an implementer act on each statement without guessing? Are acceptance criteria measurable?
- **Internal consistency**: contradictions, conflicting statements, ambiguous scope.
- **Scope**: silent scope creep relative to the document's own goals; missing non-goals.

---

### Dimension 2: Logic & Edge Cases (`logic`)

Reviews behavioral correctness, edge cases, and abnormal conditions.

#### Diff mode
1. **Trace behavior end-to-end**:
   - Does the new code do what its context (commit subject, PR body, surrounding code) implies it should?
   - Do the new code paths compose correctly with existing callers and callees — return values, null/absence handling, error propagation, state updates?
   - Are control-flow branches exhaustive and in the right order (early returns, fall-through, missing `else`)?
   - Are conditions correct — inverted booleans, off-by-one, wrong variable in a comparison, wrong operator (`&&` vs `||`)?
   - Does mutable state get updated consistently, including in loops, retries, and early-exit paths?
   - Does anything silently change behavior for existing callers (signature changes, default-value changes, reordered checks)?
2. **Abnormal cases to test against**:
   - **Boundary values**: empty, zero, one, maximum, negative, NaN, empty string, null/undefined.
   - **Malformed or unexpected input**: wrong types, partial data, unexpected encoding, oversized payloads.
   - **Error paths**: what happens when the called API/DB/network fails, times out, or returns a partial result? Is the failure surfaced, swallowed, or ignored?
   - **State transitions**: invalid sequences, re-entrancy, double submission, stale state, lost updates.
   - **Concurrency and race conditions** where the change shares mutable state.
   - **Data-shape drift**: what if a field that is always present today is absent, or a list is empty?

#### Spec/plan mode
- **Gaps**: states, transitions, or inputs the plan doesn't say how to handle.
- **Contradictions**: two statements that cannot both hold.
- **Undefined behavior**: "what happens if X" left unstated where it matters.
- **Missing invariants**: assumptions the plan depends on but never states or enforces.
- **Error paths, boundary conditions, concurrent and failed states**: does the plan enumerate them — and say what should happen in each, not just that they exist?

---

### Dimension 3: Architecture & System Design (`architecture`)

Reviews structural boundaries, coupling, contracts, and data models.

#### Diff mode
- **Component and module boundaries**: are responsibilities placed in the right component? Do changed components stay inside their existing boundaries?
- **Coupling and cohesion**: does the change couple previously independent modules, or introduce hidden dependencies between them?
- **Public interfaces and contracts**: naming, typing, stability, breaking changes to signatures or exported surfaces.
- **Cross-service/app communication**: sync vs async choice, timeouts, retries, idempotency, error handling across the boundary, contract versioning and backwards compatibility.
- **API design**: resource modeling, naming, error semantics, pagination, versioning.
- **DB schema design**: normalization, indexes for the queries this change will run, constraints and nullability, migration and rollback strategy, data-growth assumptions.
- **Consistency with existing architecture**: divergence from established patterns must be justified — flag unjustified divergence and also cargo-cult copying that contradicts the change's purpose.

#### Spec/plan mode
Apply the same architectural questions to the proposed design, and additionally check that the plan covers rollout, migration/backfill, and rollback.

---

### Dimension 4: Code Quality & Standards (`quality`)

Reviews code quality, documented repo standards, abstractions, and the smell baseline (code changes only).

#### Track 1 — Documented standards (hard findings)
Read the repo's documented coding standards — `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CODING_STANDARDS.md`, whichever exist at the checkout path — and report every place the diff violates one, **citing the exact standard (file + rule)**.
- Do **not** report a violation if the rule is explicitly silenced in the code (e.g. via an ignore comment, disable directive, or documented exception).
- Do **not** report missing tests / coverage gaps unless the documented standard explicitly requires them for the changed area.
- A documented standard outranks Track 2: where a documented standard endorses something a smell would flag, the repo wins.

#### Track 2 — Smell baseline and generic quality (judgement calls)
The smell baseline covers standard Fowler code smells (_Refactoring_, ch. 3). Each is a labelled heuristic ("possible Feature Envy"):

- **Mysterious Name**: a function, variable, or type whose name doesn't reveal what it does or holds. → rename it.
- **Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape.
- **Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps**: the same few fields or params keep travelling together. → bundle them into one type.
- **Primitive Obsession**: a primitive or string standing in for a domain concept that deserves its own type. → introduce a small type.
- **Repeated Switches**: the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism or a shared map.
- **Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change**: one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality**: abstraction, parameters, or hooks added for needs the spec doesn't have. → remove indirection.
- **Message Chains**: long `a.b().c().d()` navigation the caller shouldn't depend on. → hide behind a method on the first object.
- **Middle Man**: a class or function that mostly just delegates onward. → call the real target directly.
- **Refused Bequest**: a subclass or implementer that ignores or overrides most of what it inherits. → use composition instead.

Also check:
- Unnecessary new abstractions that add indirection without value.
- Code that can be removed, merged, or simplified directly in this diff.
- Naming (variables, functions, types) demonstrably inconsistent across the changed files or with existing codebase conventions.
- Obfuscated code whose intent is genuinely unclear.

---

### Dimension 5: Security & Trust Boundaries (`security`)

Reviews against injection, authn/authz flaws, secret leaks, and trust boundary violations.

#### Diff mode
- **Injection**: SQL/NoSQL query construction, shell commands, path traversal, template/HTML injection, unsafe deserialization, dynamic `eval`-style execution.
- **Authn/Authz**: is authorization enforced on new endpoints/actions? Can unauthenticated or lower-privileged users reach them? Missing permission checks on new resources.
- **Secrets**: hardcoded credentials/tokens, secrets logged or returned in responses, secrets in URLs.
- **User input**: validation of anything user-controlled before use in queries, redirects, filenames, or HTML.
- **Cross-boundary data**: data from other services/users treated as trusted; mass assignment; SSRF via user-supplied URLs.
- **Session/auth cookies**: new endpoints/flags that weaken session handling.

Judge severity by **concrete exploitability and blast radius** in this codebase's context, not abstract paranoia. If an apparent issue cannot be reached or exploited given existing middleware, types, or routing, **drop it**.

#### Spec/plan mode
Only if the design touches auth, trust boundaries, user data, or external input: does the plan state the security model — who may do what, what is validated where, how secrets are handled — and are those statements complete enough to implement safely?

---

### Dimension 6: Performance & Scalability (`performance`)

Reviews for latency regressions, algorithmic complexity, memory pressure, N+1 queries, and data-growth risks.

#### Diff mode
- **Complexity**: nested loops over the same collection, O(n²) or worse patterns introduced by the change, quadratic string/JSON building in loops.
- **N+1 queries**: per-item DB/API calls inside loops where one batched call would do.
- **Memory**: unbounded collections, loading entire tables/files into memory where streaming/pagination fits, retained references.
- **Redundant work**: recomputing the same value in a loop, duplicated requests, missing caching where the codebase already caches similar values.
- **I/O**: serial awaits that could run in parallel, sync file operations on hot paths.
- **Rendering/UI**: work re-run on every render/keystroke that could be memoized or moved out.
- **Data growth**: will this get slower as the dataset, user count, or time horizon grows? What happens at 10× current volume?

Judge relative to the codebase's existing standards — do **not** flag micro-optimizations the codebase never bothers with, and do **not** raise speculative "might be slow" claims without concrete evidence of high execution frequency or large data volume.

#### Spec/plan mode
Only if the design plausibly touches hot paths, large data sets, or data growth: does the plan address scaling, batching, pagination, caching, or indexes where its own scale assumptions require them?

---

### Dimension 7: Documentation & Drift (`docs`)

Checks whether repo docs, READMEs, `AGENTS.md`, external docs, Confluence pages, or durable learnings need updating after a change. (Diff-driven only; never runs in spec/plan mode.)

#### Diff mode
- **Internal repo docs**: do internal docs, `README.md`, `AGENTS.md`, or setup guides describe behavior, public interfaces, setup steps, or workflows that the change alters? Are they now stale or wrong?
- **External docs**: does any user-facing documentation describe what changed?
- **Confluence pages**: fetch linked/known Confluence pages when tooling allows; flag ones that need updates.
- **Durable learnings**: did the change surface a learning worth recording — in a new or existing skill, or a Jira ticket?

You may read docs but must not edit them — report gaps only. Do **not** report generic "could add more docs" suggestions without a concrete broken doc.

---

## Step 6 — Mandatory validation pass, deduplication, and sorting

Before generating the report:

1. **Mandatory validation pass**:
   - Re-check each candidate finding against the diff and ancillary source code.
   - Verify exact file paths and line numbers (`file:line`), or document section headings.
   - Ensure the finding has concrete evidence and is not speculative.
   - **Drop anything you are not certain about.**
2. **Filter out low-signal noise**:
   - Drop any finding based on speculation ("might", "could", "potential") without concrete code evidence.
   - Drop formatting, syntax, or typing issues that linters, formatters, or typecheckers catch automatically.
   - Drop subjective style preferences not explicitly required by documented repo standards.
   - Drop claims about rules that are explicitly silenced in the code (e.g. via ignore comments).
   - Drop missing test / coverage complaints unless documented standards explicitly mandate tests for that specific area.
3. **Deduplicate & merge overlapping findings**:
   - When multiple dimensions flag the same `file:line` (or same logical issue across adjacent lines / same document section):
     - Keep the strongest priority (Blocker > Recommendation > Suggestion > Question > Nit > Note).
     - Prefer `(new)` over `(existing)` when freshness disagrees.
     - Combine descriptions into the clearest single sentence.
     - List all dimensions that flagged it, e.g. `_(security, logic)_`.
     - If findings describe distinct, separate concerns at the same location, keep them as separate entries.
4. **Sort**:
   - **Diff mode**: New findings first (Blocker → Recommendation → Suggestion → Question → Nit → Note), then Existing (same priority order); within a priority group, sort by file path then line number.
   - **Spec/plan mode**: Single list sorted by priority (Blocker → Recommendation → Suggestion → Question → Nit → Note), then by document-section order.

## Step 7 — Report

Output a single combined report following this exact markdown format:

```text
# Local multi-review — <branch, PR ref, or spec path>

<one-line summary, e.g. "12 files, +340 / -85" or "spec/plan: <N> sections">
Diff: `/Users/tuur/Documents/Obsidian/DataCamp/Agents/Diffs/<repo-name>/<filename>.diff` (diff modes only)

## Dimensions reviewed

<chosen dimensions with a one-line justification each; also list skipped dimensions and why>

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

## By reviewer
- Specs: N findings
- Logic: N findings
- Performance: N findings
- Security: N findings
- Architecture: N findings
- Code quality: N findings
- Docs: N findings
- After dedup: N unique findings (N new, M existing)
```

**Formatting notes:**
- Omit rows for dimensions not run in the summary breakdown.
- If there are zero findings overall, replace the findings sections with `No findings.` and skip the count lines.
- If there are no existing findings, omit the `## Existing findings` section entirely.
- In spec/plan mode: use a single `## Findings (N total: ...)` section without freshness tags, anchoring findings by section heading instead of `file:line`.
- Do **not** apply fixes automatically. Present the report and leave resolution to the user.

## Step 8 — Clean up temporary resources

- The diff file under `/Users/tuur/Documents/Obsidian/DataCamp/Agents/Diffs` is kept as a durable artifact in Obsidian — do not delete it.
- No temporary worktrees or directories are created.

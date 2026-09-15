# Finding classification and verification (shared)

Every finding reported in a review must be **high-signal, verified with concrete code evidence, and non-speculative**. False positives waste the author's time.

The primary reviewer and all reviewer subagents adhere strictly to the rules below.

## High-signal bar

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

## What NOT to report (negative filters)

Drop candidate issues that match any of these:
- **Speculative concerns**: "might", "could", or "potential" issues without concrete code evidence showing they can happen.
- **Pre-existing issues**: unrelated to the diff or not directly aggravated by the change.
- **Pedantic nitpicks**: trivial comments a senior engineer would not flag.
- **Linter/typechecker territory**: formatting, syntax, type errors, or unused imports that linters, formatters (`oxfmt`, `prettier`), or typecheckers (`tsc`) catch automatically.
- **Subjective style preferences**: personal aesthetic choices not explicitly required by documented repo standards.
- **Explicit exceptions**: rules mentioned in repo standards but explicitly silenced in the code (e.g. via an ignore comment or documented exception).
- **Missing test coverage**: gaps in test suites unless `AGENTS.md` / `CLAUDE.md` explicitly mandates tests for that specific area.

## Diff as source of truth & ancillary repo context

- The **diff is the source of truth** for what changed; the repo on disk may not yet reflect those changes.
- Read the diff carefully. Use the repo at the head checkout **only as ancillary context** (imports, call sites, existing patterns, nearby code) when you need to verify a specific claim — not to discover changes or hypothesize.
- If a claim cannot be verified against the source, **drop it** — do not hedge, guess, or report unconfirmed suspicions.

## Mandatory validation pass

Before writing your final report:
1. Re-check each candidate finding against the diff and ancillary source code.
2. Verify exact file paths and line numbers (`file:line`), or document section headings.
3. Ensure the finding has concrete evidence and is not speculative.
4. **Drop anything you are not certain about.** If no findings clear the high-signal bar, reply exactly `No findings.`.

## Freshness (diff modes only)

- **(new)** — introduced by the changes under review. The diff is directly responsible.
- **(existing)** — already present before this change; flagged only because it is in directly touched code and materially impacts the change. Existing findings are never merge-blockers on their own.

Verify freshness when unsure: check `git show <merge-base>:<path>`. If the issue existed at the merge-base, tag `(existing)`.

**Spec/plan mode:** there is no diff and no merge-base, so freshness does not apply. Omit the freshness tag entirely.

## Priority

Six labels, in priority order:

- **Blocker:** — severe bugs, security flaws, data loss, broken core functionality, or contract breakage that must be fixed before merging. (New issues only.)
- **Recommendation:** — high severity, easy to fix. Material issue clearly worth fixing in this change.
- **Suggestion:** — high severity, hard to fix. A material problem, but full resolution is out of scope for this change; flagged as a concrete follow-up.
- **Question:** — genuine uncertainty about whether behavior is intentional or correct; ask the author with specific code evidence.
- **Nit:** — low severity, easy to fix. Small but objective defect in naming or clarity (not subjective style or linter territory).
- **Note:** — low severity, hard to fix. Useful context or observation worth recording for later.

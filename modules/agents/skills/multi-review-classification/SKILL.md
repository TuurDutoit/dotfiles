---
name: multi-review-classification
description: Shared classification contract for all multi-review dimension reviewers. Defines freshness (new vs existing) and the six priority labels (Blocker, Recommendation, Suggestion, Question, Nit, Note). Load this when reviewing as a multi-review subagent or when interpreting multi-review findings.
---

# Finding classification (shared)

Every finding you report has two attributes: **freshness** and **priority**. The dispatcher relies on these tags to deduplicate, merge, and sort findings — so apply them consistently.

## Freshness (diff modes only)

- **(new)** — the issue was introduced by the changes under review. The diff is directly responsible.
- **(existing)** — the issue was already present before the changes; flagged only because it is related to code that was touched. Existing findings are never merge-blockers on their own.

Verify freshness when unsure: `git show <merge-base>:<path>` — if the problem exists at the merge-base, it is Existing. The dispatcher tells you the merge-base SHA; if it did not, omit freshness rather than guessing.

**Spec/plan mode:** there is no diff and no merge-base, so freshness does not apply. Omit the freshness tag entirely.

## Priority

Six labels, in priority order. Severity × effort drives the mid-band labels:

- **Blocker:** — bugs, security holes, data loss, broken functionality, or anything that must be fixed before merging. Highest priority. (New issues only.)
- **Recommendation:** — high severity, easy to fix. Clearly worth doing as part of this change.
- **Suggestion:** — high severity, hard to fix. A real problem, but fixing it properly is out of scope for this change; consider it as a follow-up.
- **Question:** — unsure whether the code is correct or intentional; ask the author.
- **Nit:** — low severity, easy to fix. Small stylistic, naming, or readability comment.
- **Note:** — low severity, hard to fix. Worth recording for later, but not worth the effort now.

## Only verified findings

Return only findings you have verified in the reviewer's domain. Verify by reading the actual source at the checkout path the dispatcher gave you before reporting — the diff alone lacks surrounding context, and a claim true at the base branch may already be fixed at the head (or vice versa). If a finding depends on a file not in the diff, open and confirm it first.

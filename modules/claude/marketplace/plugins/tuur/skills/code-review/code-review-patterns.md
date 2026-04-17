---
name: code-review-patterns
description: Patterns for coordinating parallel code reviews and consolidating findings across multiple reviewer agents
---

# Multi-Reviewer Coordination Patterns

## Dimension Selection

Choose dimensions based on the type of changes:

| Change Type | Recommended Dimensions |
|---|---|
| API / backend logic | security, performance, architecture, error-handling |
| Frontend / UI | architecture, code-quality, testing, performance |
| Auth / permissions | security, architecture, testing, error-handling |
| Data layer / queries | security, performance, architecture, testing |
| Refactoring | architecture, code-quality, testing |
| New feature (full-stack) | all six dimensions |
| Bug fix | error-handling, testing, code-quality |
| Config / infra | security, architecture |

Default: all six dimensions (security, performance, architecture, code-quality, error-handling, testing). Only drop dimensions when changes are clearly irrelevant.

## Spawning Reviewers

Spawn one agent per dimension in parallel using the Agent tool:
- Set `subagent_type` to the code-reviewer agent
- Include the dimension name and the diff/file context in the prompt
- All reviewers run concurrently — they have no dependencies on each other

## Consolidating Findings

After all reviewers return:

### 1. Deduplication
When multiple reviewers flag the same file:line:
- Merge findings, preserving each reviewer's perspective
- Use the **higher** severity when reviewers disagree
- Note which dimensions flagged it (cross-dimensional findings are higher confidence)

### 2. Severity Tiers
Group findings into five tiers. The bar for higher severities is strict — when in doubt, classify lower.

- **Critical**: Must fix before merge. Reserved for issues with severe, proven impact: data loss, exploitable security vulnerabilities, silent data corruption. This is a high bar — the reviewer must trace the code path and describe a concrete scenario demonstrating the impact.
- **High**: Should fix before merge. Definite bugs with user impact, confirmed security issues. To classify as High, the reviewer must validate that the issue will have real impact (trace the code path, show a reproduction scenario) — not just speculate.
- **Medium**: Likely a problem, but impact is uncertain or subjective. Examples: a security concern that may not be exploitable; a bug that only triggers in specific edge cases; a performance issue under unusual load.
- **Recommendation**: Worth addressing but optional — everything works fine without it. Examples: an edge case not covered by a test; a refactoring opportunity; a variable name that doesn't match its intent.
- **Note**: Observations that aren't relevant to address in this PR. Examples: pre-existing issues; patterns inconsistent with best practices but consistent with the existing codebase; repetitive code in a test suite.

### 3. Report Structure

```
# Code Review Report

## Changes Overview
Short architectural summary of what changed. Include only what's relevant:
- API changes (new/modified endpoints, changed contracts)
- DB schema changes (new tables, migrations, column changes)
- New screens / pages / routes
- Refactoring / restructuring (moved modules, renamed abstractions)
- Changes to important interfaces or types
- New dependencies added

## Findings
X critical, Y high, Z medium, W recommendations, V notes

### Critical Issues

#### 1. <Short descriptive title> [dimension]
**Location**: `path/to/file.ts:42`
**Impact**: Concrete scenario demonstrating the issue (traced code path, reproduction steps).
**Issue**: Clear explanation of what's wrong and why it matters.
**Fix**: Concrete suggested remediation.
> Also flagged by: security, error-handling *(only if cross-dimensional)*

#### 2. <Short descriptive title> [dimension]
...

### High Priority
*(same format as above, including Impact field with validation)*

### Medium Priority
*(same detailed format as above, continuing numbering)*

### Recommendations
*(same detailed format as above, continuing numbering)*

### Notes
*(same detailed format as above, continuing numbering)*

## PR Comments *(only if PR review)*
Fetch comments from **all** reviews on the PR (not just the latest review). Use `gh api repos/{owner}/{repo}/pulls/{pr}/comments` and `gh api repos/{owner}/{repo}/pulls/{pr}/reviews` to get the full picture.

X of Y comments addressed, Z unresolved

- **@reviewer** on `file.ts:42`: "<summary>" — **Resolved**: <how>
- **@reviewer** on `file.ts:78`: "<summary>" — **Unresolved**: <what's missing>
- **@reviewer** on `file.ts:15`: "<summary>" — **Partial**: <what was done / what remains>

## Dimension Summaries
<1-line summary per dimension, including "no issues found" where applicable>
```

### 4. Cross-References
Cross-dimensional findings are noted inline on each issue (see "Also flagged by" in the finding format). These increase confidence in the finding.

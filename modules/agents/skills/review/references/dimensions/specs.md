# Dimension: Specs Alignment (`specs`)

Checks implementation against stated requirements, or reviews a spec document itself.

## Diff mode

### 1. Locate the spec
1. Issue references in commit messages (`#123`, `Closes #45`, GitLab `!67`), fetched via the repo's tracker workflow.
2. A path the user passed.
3. A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user — if they confirm no spec exists, skip this dimension and record `(no spec available)`.

### 2. Check three things against the diff
- **Completeness**: is everything the spec requires actually implemented?
- **Correctness**: does each implemented piece match what the spec specifies (not just that *something* was built)?
- **Scope**: did the change stay within the spec, or does it silently do more or less? Report anything implemented that isn't in the spec too.

## Spec / plan mode

Review the document itself as the unit under review:
- **Completeness**: missing requirements, undefined terms, unhandled states.
- **Testability**: can an implementer act on each statement without guessing? Are acceptance criteria measurable?
- **Internal consistency**: contradictions, conflicting statements, ambiguous scope.
- **Scope**: silent scope creep relative to the document's own goals; missing non-goals.

## What to look for

Objective divergences between what was promised and what was produced (or between the document and itself). Do **not** speculate or invent requirements not in the spec.

# Dimension: Specs Alignment (`specs`)

Checks implementation against stated requirements, or reviews a spec document itself.

## Diff mode

### 1. Locate the spec

> **Important**: The PR description is **not** a spec. It is the author's summary of what was done and how it was implemented. It must **never** be used as the specification to review against — reviewing code against what the author says they did is circular.

1. **PR review**:
   - **Always find the linked Jira ticket(s)** in the PR description (look for Jira URLs like `https://datacamp.atlassian.net/browse/KEY-123` or issue keys like `LX-1234`, `CP-5678`, `DATA-9012`), or in the PR title / branch name.
   - **Those Jira ticket(s) are the specs.**
   - Fetch the Jira ticket(s) using Jira tools (e.g. via the internal Cloudflare MCP portal's `atlassian_rovo_getJiraIssue` with `cloudId: "datacamp.atlassian.net"`, or Jira API).
   - Read the ticket's summary, description, user stories, acceptance criteria, and any linked subtasks/requirements.
2. **Branch / commit review (non-PR)**:
   - Extract Jira ticket key(s) from the branch name (`LX-1234/feature-name`) or commit messages and fetch the ticket(s).
   - A spec or implementation plan path passed by the user (e.g. `spec.md`, `plan.md`).
   - A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
3. If no Jira ticket, issue, or spec document is found, ask the user — if they confirm no spec exists, skip this dimension and record `(no spec available)`.

### 2. Check three things against the diff

Evaluate the code diff directly against the requirements and acceptance criteria in the Jira ticket(s) / spec:
- **Completeness**: is everything the spec / Jira ticket requires actually implemented? Are any acceptance criteria, edge cases, or user flows omitted?
- **Correctness**: does each implemented piece match what the spec / Jira ticket specifies (not just that *something* was built)?
- **Scope**: did the change stay within the spec / Jira ticket, or does it silently do more or less? Report anything implemented that isn't in the spec/ticket too (unrequested features, scope creep, unintended behavior changes).

## Spec / plan mode

Review the document itself as the unit under review:
- **Completeness**: missing requirements, undefined terms, unhandled states.
- **Testability**: can an implementer act on each statement without guessing? Are acceptance criteria measurable?
- **Internal consistency**: contradictions, conflicting statements, ambiguous scope.
- **Scope**: silent scope creep relative to the document's own goals; missing non-goals.

## What to look for

Objective divergences between what was promised in the spec / Jira ticket and what was produced in code (or between the document and itself). Do **not** review against the PR description. Do **not** speculate or invent requirements not in the spec/ticket.

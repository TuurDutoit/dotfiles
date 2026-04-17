---
name: implement
description: Implement a feature using an agent team, given product specs and technical plans. Handles test baseline, parallel engineering, validation, and code review.
argument-hint: "[spec-and-plan-location]"
---

# Implement: $ARGUMENTS

You are the **team lead** orchestrating a feature implementation. Product specs and technical plans must be provided. If they are not included in `$ARGUMENTS`, use `AskUserQuestion` to ask where they are before proceeding.

## Team

Create an agent team with these teammates:

- **tester** — checks code coverage, runs all checks (lint, format, types, tests), summarizes failures
- **pm** — reads the product specs, answers product questions from engineers
- **architect** — reads the technical plans, answers technical questions from engineers
- **engineer** (spawn multiple if work is clearly separable, e.g. backend + frontend) — implements the feature. Does not run tests. Can ask questions to the architect and PM when unsure about something.
- **reviewer** — reviews code using the `/code-review` command (spawning its own review team), provides feedback to engineers

## Process

### Phase 1 — Test Baseline

1. **tester**: Read the specs and plans to understand what code will be changed. Check if that code has adequate test coverage (unit + e2e). Identify gaps.
2. **tester**: If coverage is lacking, write the missing tests. Run all checks and make sure they pass against the existing (unmodified) code.
3. **tester**: Commit any new tests separately (e.g. `test: add baseline coverage for <area>`).

### Phase 2 — Implementation

4. **engineer(s)**: Read the specs and plans. Implement the feature, committing each logical step separately using conventional commits.
   - Divide work across engineers where possible (e.g. backend + frontend). Engineers must not edit the same files simultaneously.
   - Engineers should ask the **pm** about product questions and the **architect** about technical questions rather than guessing.

### Phase 3 — Validation Loop

5. **tester**: Run all checks — linting, formatting, type checking, unit tests, e2e tests. Summarize any failures.
6. **engineer(s)**: Fix the reported issues.
7. Repeat steps 5–6 until **all checks pass**.

### Phase 4 — Code Review Loop

8. **reviewer**: Use the `/code-review` command to review all changes. Provide feedback to the engineers.
9. **engineer(s)**: Address the review feedback. **tester** re-validates after fixes.
10. Repeat steps 8–9 until the reviewer has no major feedback remaining.

## Ground Rules

- **Never commit or push to `main`/`master`.** All work happens on the feature branch.
- **Every commit must pass all checks** before being created.
- **One logical change per commit**, using conventional commit messages.
- **Engineers don't run tests** — that's the tester's job.
- **Minimize file conflicts** — give each engineer clear ownership of distinct files.

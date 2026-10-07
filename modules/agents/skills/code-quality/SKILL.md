---
name: "code-quality"
description: "Shared code standards for writing and changing code: simplicity, separation of concerns, named types, no speculative casts, verified schemas, and tests matched to the change. Use when writing, modifying, or reviewing code."
---

# Code quality

Standards for any code you write, change, or review. This skill carries standards only — workflow steps, delegation, commits, and delivery live in the `implementation-workflow` and `delivery-workflow` skills.

## Design

- Keep solutions simple and direct — prefer boring, readable code over clever abstractions.
- Separate concerns: each module and function has one clear responsibility.
- Before implementing, consider whether a focused refactor of the affected code would make the change clearer. When it would, do that refactor first; never refactor beyond what the change needs.

## Types

- Prefer named types with descriptive, explicit names over inline types.
- Avoid TypeScript casts (`as Type`). In order of preference:
  1. Refactor or improve the types to eliminate the mismatch.
  2. Use a type annotation (`const myVal: Type = something`).
  3. In tests, use `fromPartial` from `@total-typescript/shoehorn` when available.
  4. Use a cast only as a last resort.

## Schemas and external facts

- Never invent field names in an API or DB schema. Confirm the exact names from an existing type, migration, or a live API call. If no reliable source exists, ask the requester.

## Tests

Match the tests to the change — cover what changed, no more:

- New behavior or a changed branch gets a test that fails without the change.
- A bug fix gets a regression test that reproduces the bug before the fix and passes after it.
- Changing untested legacy code: first pin its current behavior with characterization tests and confirm they pass, then make the change and update the pins to the new behavior.
- Follow the existing suite's style, scope, and file placement; do not introduce a second testing pattern.
- Not every change needs new tests (config, docs, pure renames). When you add none, say why in the handoff.

---
name: coding-workflow-quality
description: Use when implementing code — as the implementation step of the `sdlc` workflow, or for smaller coding tasks that don't follow the full `sdlc` workflow. Covers subagent delegation, workflow steps, QA against the running app, review, and code-quality practices.
---

This skill covers the implementation step of the `sdlc` workflow, and smaller
coding tasks that don't follow the full workflow. The `sdlc` skill owns the
full intent → spec → plan → implement → verify process — one session per
stage, with committed handoff files between stages.

## Subagents

Delegate by change size:

- **Small changes** — make them yourself in the main context.
- **Medium changes** — delegate to a subagent.
- **Large-scale changes across different modules** — delegate to multiple subagents, ideally one per module.

### Workflow Steps

Follow these steps for non-trivial tasks:

1. **Explore** — Use an `explore` subagent to map entry points, dependencies, and existing tests before touching anything.
2. **Plan** — Plan the changes yourself: the files to touch, the order of work, and the tests that prove it. Align with the user before writing code.
3. **Implement** — Make the code changes. Commit each logical step separately.
4. **Test** — Run the test suite. If coverage was thin, write and commit tests first before implementing.
5. **QA** — Verify your changes against the real, locally running app: figure out how to run it, then exercise the golden path and edge cases. A task is not finished until it has been QA'd this way. If anything blocks running the app, flag it to the user instead of declaring the task done.
6. **Review** — Always run the `multi-review` skill on the final diff.

## Code Quality

- Before modifying code, verify it has adequate test coverage. If not, write tests first, confirm they pass against the existing code, and commit them separately before making changes.
- Keep solutions simple and direct — prefer boring, readable code over clever abstractions.
- Pay attention to separation of concerns — each module/function should have a single clear responsibility.
- Prefer named types with descriptive, explicit names over inline types.
- Avoid TypeScript casts (`as Type`). Instead, in order of preference:
  1. Refactor/improve the types to eliminate the mismatch.
  2. Use a type annotation (`const myVal: Type = something`).
  3. In tests, use `fromPartial` from `@total-typescript/shoehorn` if available.
  4. Only use a cast as a last resort.
- Don't invent field names (e.g. in API or DB schemas). You have to confirm the exact names (e.g. from existing types or an API call). If you can't find a reliable source, you have to ask me.

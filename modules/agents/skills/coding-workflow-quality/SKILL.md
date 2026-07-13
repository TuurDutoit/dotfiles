---
name: coding-workflow-quality
description: Use when planning, implementing, testing, reviewing, or otherwise modifying code. Follow the required delegation, engineering workflow, code-quality, and command-selection practices.
---

## Subagents

- Avoid making code edits in the main context — delegate to subagents instead. Exception: trivial 1-line edits where subagent overhead is not worth it.
- Choose the right model for the job:
  - **gpt-5.4-mini**: small, focused edits (max 2-3 files, well-understood changes)
  - **gpt-5.4**: most tasks — new features, multi-file changes, moderate complexity
  - **gpt-5.5**: large-scale, context-heavy work (many files, complex logic, critical systems)
- Use a team of parallel agents for changes that can be split across independent modules or repos.

Examples:

- 1-line fix → main context (no subagent)
- Merging 2 functions + updating tests → 1 gpt-5.4-mini subagent
- Implementing a new feature in one repo → 1 gpt-5.4 agent for changes + 1 gpt-5.4-mini agent to run tests and summarize
- Large-scale changes across 2 critical repos (e.g. Keycloak) → team of gpt-5.5 agents

### Workflow Steps

Follow these steps for non-trivial tasks:

1. **Explore** — Use an `Explore` subagent to map entry points, dependencies, and existing tests before touching anything.
2. **Plan** — Use a `Plan` subagent to design the implementation. Align with the user before writing code.
3. **Implement** — Delegate code changes to a subagent. Commit each logical step separately.
4. **Test** — Run the test suite in a subagent. If coverage was thin, write and commit tests first before implementing.
5. **QA** — Use the `verify` skill to exercise the real app and confirm the golden path and edge cases work.
6. **Review** — Always run `/coderabbit:code-review`. For medium-to-large changes, also run `/dc-team-lx-multi-review`.

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

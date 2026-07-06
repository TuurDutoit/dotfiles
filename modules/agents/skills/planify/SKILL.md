---
name: planify
description: Use after SPEC.md exists, or when a user asks to turn a requirements/spec/PRD document into an implementation plan. Produces PLAN.md with repository-grounded modules, classes, functions, files, task sequencing, test cases, QA checks, risks, and validation commands; avoids implementing code and avoids large code blocks except for key business logic or important shared interfaces.
---

# Planify

Turn `SPEC.md` into a concrete implementation plan in `PLAN.md`.

This is the first phase that may discuss **HOW**. It should name modules, classes, functions, files, tests, commands, and integration points. Do not modify implementation files while using this skill unless the user explicitly switches from planning to execution.

## Inputs

Prefer these inputs in order:

1. A `SPEC.md` from `specify`.
2. A `PROBLEM.md` plus approved spec discussion, if the spec has not yet been written.
3. Existing tickets, docs, architecture notes, tests, or code references that constrain implementation.

If a spec is missing or still contains unresolved `[NEEDS CLARIFICATION]` markers that affect implementation, ask focused questions before writing the plan.

If the user does not provide a path, search likely repository and Obsidian initiative locations for recent `SPEC.md` files. Prefer the one whose title, linked `PROBLEM.md`, or source notes match the current conversation. If multiple plausible specs exist, ask the user which path to use before planning.

## Output Location

Before choosing the destination, inspect the active repository or workspace:

1. Read repository instructions such as `AGENTS.md`, `CLAUDE.md`, `.agents/**`, `.codex/**`, and README files for spec or plan storage conventions.
2. Look for existing initiative/spec/plan directories such as `docs/specs`, `docs/plans`, `docs/superpowers/plans`, `.agents/specs`, `.agents/plans`, `.claude/plans`, `.codex/plans`, `specs`, or similar names.
3. If `SPEC.md` lives in an initiative directory, save `PLAN.md` next to it unless repository conventions require a separate plan location.
4. If repository conventions or existing files show where plans live, save `PLAN.md` there.
5. Otherwise, save the plan in Obsidian:

```text
/Users/tuur/Documents/Obsidian/DataCamp/Agents/Initiatives/<YYYY-MM-DD>-<short-slug>/PLAN.md
```

If filesystem permissions prevent writing to the chosen location, request approval instead of silently choosing another location.

## Template Selection

Before using the bundled template:

1. If storing the plan in a repository, look for a repository plan template first. Check instructions and common paths such as `docs/plans/template.md`, `docs/specs/PLAN.template.md`, `.agents/plans/template.md`, or nearby existing plans with consistent headings.
2. If a repository template exists, follow it while preserving the required planning content below.
3. Otherwise, use `assets/PLAN.md.template`.
4. If a repository template lacks spec traceability, change surface, test cases, manual QA, or validation commands, add concise equivalent sections so implementation can proceed without rereading the whole conversation.

## Visual-Plan Document Generation

Use the `visual-plan` skill to generate and review the implementation plan before saving the final Markdown file.

- Load and follow the `visual-plan` skill before authoring `PLAN.md`.
- Fetch the live visual-plan block catalog first (`get-plan-blocks` or the local `plan blocks` command) and use valid component/block names from that catalog.
- Treat `visual-plan` as the richer authoring/review surface and `PLAN.md` as the canonical file output.
- Build the draft plan from the selected repository template or `assets/PLAN.md.template`, preserving the template's general section order.
- Render the important parts with visual-plan components: use decision callouts for hard-to-reverse choices, file/annotated-code blocks for load-bearing files, diagrams/data-model/API blocks for architecture and contracts, tables for traceability, checklists for phases/tests/QA, tabs for multiple files or states, and a bottom question-form for unresolved questions.
- Use document-first visual-plan output for backend, API, data, migration, refactor, and architecture plans. Add canvas/prototype surfaces only for UI flows or interaction-heavy implementation plans.
- After visual-plan review or generation, save the approved/current content to `PLAN.md` in the chosen location.
- Record the visual-plan URL, export, or local MDX folder in the template's `Visual Plan` field when one exists. Do not commit `.plan-url` token files.

## Workflow

1. **Load the spec**
   - Read `SPEC.md` and `PROBLEM.md` if available.
   - Summarize the goal, selected direction, requirements, QA plan, constraints, and open questions.
   - If the spec contains critical unresolved ambiguity, ask one focused question at a time before continuing.

2. **Ground in the repository**
   - Read repository instructions, README files, package scripts, test commands, and nearby code before planning changes.
   - Inspect existing modules, classes, functions, route handlers, schemas, config, and tests related to the spec.
   - Prefer existing patterns and helper APIs over new abstractions.
   - Identify the highest practical test seam for each user story or behavior.

3. **Map the change surface**
   - List each module, class, function, file, test, data contract, config variable, migration, background job, or external integration that likely changes.
   - State each item's responsibility and why it changes.
   - Keep unrelated refactors out of scope unless they directly unblock the spec.

4. **Design the implementation**
   - Choose a simple approach that satisfies the spec.
   - Include key business logic, state transitions, validation rules, or shared interfaces only when prose would be ambiguous.
   - Avoid full code listings, boilerplate, component bodies, test files, migrations, or copy-paste implementation blocks.
   - Call out tradeoffs and rejected implementation approaches.

5. **Plan tests first**
   - Include test cases for happy paths, edge cases, negative paths, permissions, regression risks, and failure modes from the spec.
   - Name the likely test files or suites.
   - Include which tests should fail before implementation when working test-first.
   - Include manual QA steps from `SPEC.md`, refined with implementation setup details.

6. **Write `PLAN.md`**
   - Use the selected repository template if one exists; otherwise use `assets/PLAN.md.template`.
   - Generate/review the document with `visual-plan` before writing the final Markdown file.
   - Break work into logical phases that can be implemented and committed independently.
   - Each phase should produce a verifiable state.
   - Mark parallelizable work only when files and dependencies do not conflict.
   - Set `Status` to `Draft` while material planning questions remain, `Ready for Implementation` when the plan is actionable, or `Blocked` when a required decision is missing.

7. **Self-review**
   - Verify every spec requirement maps to at least one plan item or test.
   - Verify the plan names concrete files/modules/classes/functions where the repository makes them knowable.
   - Verify no actual implementation has been made.
   - Verify no placeholder tasks remain.
   - Verify the plan includes automated tests, manual QA, validation commands, rollback/release notes where relevant, and commit boundaries.

## Completion Report

After saving the plan, report only:

- `PLAN.md` path
- visual-plan URL/export/local folder, if generated
- brief coverage summary against `SPEC.md`
- validation/test commands the implementer should run
- remaining open questions or risks, if any
- recommended next step: implementation

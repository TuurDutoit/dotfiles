---
name: specify
description: Use after a problem statement is clear, or when a user asks to brainstorm/refine a feature, fix, workflow, product direction, PRD, or initiative spec before implementation planning. Produces SPEC.md focused on WHAT and WHY, user experience, requirements, acceptance criteria, edge cases, product tradeoffs, and QA validation; avoids code, classes, functions, task breakdowns, and implementation plans.
---

# Specify

Turn a clear problem into a selected, reviewed product specification in `SPEC.md`.

The spec is about **WHAT** should exist and **WHY** it matters. It may include technical constraints that shape the user experience or product contract, such as data concepts, API behavior visible to consumers, config requirements, permissions, compliance, or integration expectations. It must not include code, classes, functions, file paths, implementation tasks, internal architecture, or delivery sequencing.

If the problem is not clear enough to specify, use `clarify` first and produce `PROBLEM.md`.

## Inputs

Prefer these inputs in order:

1. A `PROBLEM.md` from `clarify`.
2. A user-provided problem statement with enough context to identify affected users, current pain, scope, and success signals.
3. Existing tickets, docs, meeting notes, support reports, logs, or screenshots that clarify the problem.

If an existing initiative directory contains `PROBLEM.md`, save `SPEC.md` next to it unless repository conventions say otherwise.

If the user does not provide a path, search likely repository and Obsidian initiative locations for recent `PROBLEM.md` files. Prefer the one whose title or source notes match the current conversation. If multiple plausible files exist, ask the user which path to use before writing.

## Output Location

Before choosing the destination, inspect the active repository or workspace:

1. Read repository instructions such as `AGENTS.md`, `CLAUDE.md`, `.agents/**`, `.codex/**`, and README files for spec or plan storage conventions.
2. Look for existing initiative/spec/plan directories such as `docs/specs`, `docs/plans`, `docs/superpowers/specs`, `.agents/specs`, `.agents/plans`, `.claude/specs`, `.codex/specs`, `specs`, or similar names.
3. If repository conventions or existing files show where specs/plans live, create or reuse an initiative directory there and save `SPEC.md` in it.
4. Otherwise, save the spec in Obsidian:

```text
/Users/tuur/Documents/Obsidian/DataCamp/Agents/Initiatives/<YYYY-MM-DD>-<short-slug>/SPEC.md
```

Create a new directory for each initiative unless an earlier `PROBLEM.md` already established the initiative directory. If filesystem permissions prevent writing to the chosen location, request approval instead of silently choosing another location.

## Template Selection

Before using the bundled template:

1. If storing the spec in a repository, look for a repository template first. Check instructions and common paths such as `docs/specs/template.md`, `docs/specs/SPEC.template.md`, `.agents/specs/template.md`, `.github/ISSUE_TEMPLATE`, or nearby existing specs with consistent headings.
2. If a repository template exists, follow it exactly and adapt only what is needed for a WHAT/WHY product spec.
3. If no repository template exists, use `assets/SPEC.md.template`.
4. If storing the spec in Obsidian, use `assets/SPEC.md.template`.
5. If a repository template lacks success criteria, manual QA, risks, or source notes, add concise equivalent sections so `planify` receives a complete handoff.

## Workflow

1. **Gather context**
   - Read `PROBLEM.md` if present and restate the problem in your own words.
   - Inspect any provided docs, links, code, tickets, notes, screenshots, logs, or existing specs before asking questions.
   - Determine the output location and template using the rules above.
   - If a question can be answered from available artifacts, answer it yourself and cite the artifact in `SPEC.md`.

2. **Check readiness**
   - Verify the problem, users, impact, scope boundary, constraints, and success signals are clear enough.
   - If a critical problem detail is missing, ask a problem-level question or switch to `clarify`.
   - Do not brainstorm solutions until the problem framing is stable.

3. **Explore product directions**
   - Brainstorm 2-3 viable solution directions or scope shapes.
   - Compare them by user value, scope, risk, learning value, operational impact, and reversibility.
   - Recommend one direction and explain why.
   - Ask for approval or correction before writing `SPEC.md`.
   - Do not compare implementation approaches, frameworks, libraries, storage engines, internal services, classes, functions, or file structures.

4. **Question the spec**
   - Ask exactly one question at a time.
   - Prefer multiple-choice questions with a recommended answer first.
   - Include why the recommendation is best in 1-2 sentences.
   - Accept "yes", "recommended", or "suggested" as choosing your recommendation.
   - Seek hard issues: edge cases, permissions, negative paths, data ownership as users understand it, lifecycle/state rules, accessibility, localization, privacy, dependencies, rollout, reversibility, and what manual QA must prove.
   - Stop early when remaining ambiguity would not materially affect user experience, requirements, acceptance criteria, or QA.

5. **Define QA while specifying**
   - Write acceptance scenarios for each high-priority user story.
   - Define manual QA steps that a human can run without reading code.
   - Include positive paths, negative paths, edge cases, regression checks, expected results, and any setup data or environment assumptions.
   - Keep QA focused on observable behavior and outcomes, not implementation internals.

6. **Write `SPEC.md`**
   - Use the selected repository template if one exists; otherwise use `assets/SPEC.md.template`.
   - Focus on user value, scope, experience, rules, requirements, success criteria, and validation.
   - Use measurable, technology-agnostic success criteria.
   - Map each relevant `PROBLEM.md` success signal into a spec success criterion or an explicit non-goal.
   - Include technical details only when they are part of the externally observable contract or hard constraint.
   - Set `Status` to `Draft` while material questions remain, `Ready for Plan` when approved for `planify`, or `Blocked` when a required decision is missing.
   - Mark unresolved critical decisions as `[NEEDS CLARIFICATION: question]`, but keep these to zero whenever possible.

7. **Self-review**
   - Verify no implementation plan, task list, architecture, code, class/function names, or file paths slipped in.
   - Verify every requirement is testable and has an acceptance or QA path.
   - Verify scope and non-goals are clear enough for `planify`.
   - Verify no placeholders, contradictions, unexplained jargon, or vague adjectives remain.
   - Fix issues before reporting completion.

## Question Format

Use this compact format for most interview questions:

```markdown
**Recommended:** A - <answer>

<one or two sentences explaining why>

| Option | Answer |
|--------|--------|
| A | <recommended answer> |
| B | <alternative> |
| C | <alternative> |
| Short | Provide a different short answer |

Reply with the option letter, "recommended", or a short custom answer.
```

For open-ended questions, provide a suggested answer and ask the user to accept or replace it.

## Completion Report

After saving the spec, report only:

- `SPEC.md` path
- brief spec/QA checklist summary
- remaining `[NEEDS CLARIFICATION]` items, if any
- recommended next step: usually `planify`

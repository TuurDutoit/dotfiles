---
name: clarify
description: Use when a user has a rough feature, bug, workflow, product, or technical initiative idea and needs the problem statement clarified before discussing solutions, specs, architecture, or implementation plans. Produces PROBLEM.md and asks focused questions when the problem, affected users, evidence, scope, constraints, or success signals are unclear.
---

# Clarify

Turn a rough idea into a clear problem statement in `PROBLEM.md`. Focus on the problem to solve, not possible solutions.

Use this before `specify` when the request is vague, solution-shaped, or missing context. If the user already provides a clear `PROBLEM.md`, do not repeat this phase; summarize that it is ready for `specify`.

## Output Location

Before choosing the destination, inspect the active repository or workspace:

1. Read repository instructions such as `AGENTS.md`, `CLAUDE.md`, `.agents/**`, `.codex/**`, and README files for spec or plan storage conventions.
2. Look for existing initiative/spec/plan directories such as `docs/specs`, `docs/plans`, `docs/superpowers/specs`, `.agents/specs`, `.agents/plans`, `.claude/specs`, `.codex/specs`, `specs`, or similar names.
3. If repository conventions or existing files show where specs/plans live, create a new initiative directory there and save `PROBLEM.md` in it.
4. Otherwise, save the problem document in Obsidian:

```text
/Users/tuur/Documents/Obsidian/DataCamp/Agents/Initiatives/<YYYY-MM-DD>-<short-slug>/PROBLEM.md
```

Create a new directory for each initiative unless the repository convention clearly uses a flat file layout. If filesystem permissions prevent writing to the chosen location, request approval instead of silently choosing another location.

If continuing an existing initiative and the user did not provide a path, search likely locations for recent `PROBLEM.md`, `SPEC.md`, or `PLAN.md` files. If exactly one plausible initiative matches the conversation, use it and mention the path. If multiple plausible initiatives exist, ask the user which path to continue.

## Template Selection

Before using the bundled template:

1. If storing the document in a repository, look for a repository problem/spec template first. Check instructions and common paths such as `docs/specs/template.md`, `docs/specs/PROBLEM.template.md`, `.agents/specs/template.md`, or nearby existing specs with consistent problem headings.
2. If a repository template exists, follow it while preserving this phase's problem-only focus.
3. If a repository template lacks problem framing, evidence, success signals, or open-question sections, add concise equivalent sections rather than dropping the handoff information.
4. Otherwise, use `assets/PROBLEM.md.template`.

## Visual-Plan Document Generation

Use the `visual-plan` skill to generate and review the problem document before saving the final Markdown file.

- Treat `visual-plan` as the richer authoring/review surface and `PROBLEM.md` as the canonical file output.
- Build the draft document from the selected repository template or `assets/PROBLEM.md.template`, then invoke `visual-plan` in document-first mode with that draft as source material.
- Do not add a top canvas by default. Add visual surfaces only when the problem is easier to review as a journey, flow, before/after state, or evidence map.
- After visual-plan review or generation, save the approved/current content to `PROBLEM.md` in the chosen location.
- Record the visual-plan URL, export, or local MDX folder in the template's `Visual Plan` field when one exists. Do not commit `.plan-url` token files.

## Workflow

1. **Gather context**
   - Restate the user's request in one compact paragraph.
   - Inspect provided docs, tickets, notes, screenshots, logs, links, or existing specs before asking questions.
   - If a question can be answered from available artifacts, answer it yourself and cite the artifact in `PROBLEM.md`.

2. **Question the problem**
   - Ask exactly one question at a time.
   - Start each question with a clear, direct sentence ending in a question mark.
   - Prefer multiple-choice questions that list concrete options and then state the recommendation.
   - Include why the recommendation is best in 1-2 sentences.
   - Accept "yes", "recommended", or "suggested" as choosing your recommendation.
   - Keep asking until the important parts are clear: affected users, current behavior, desired outcome, impact, frequency, evidence, scope boundary, constraints, urgency, and what would prove the problem is solved.
   - Stop early when remaining ambiguity would not materially change the problem framing or next spec phase.
   - Force measurable definitions for domain-specific vague outcomes. For search, ranking, discovery, recommendations, or matching, clarify concepts such as relevance, failed discovery, intent, result quality, filters, freshness, localization, and whether evidence is telemetry or anecdotal.

3. **Prevent solution drift**
   - Do not brainstorm solutions, compare approaches, choose architecture, write tasks, or plan implementation in this phase.
   - If the user proposes a solution, translate it back into the underlying need or constraint. Example: turn "use a cache" into "users need repeated requests to feel fast enough for the workflow."
   - Capture hard constraints only when they affect the problem or success definition.

4. **Sharpen language**
   - Challenge vague terms such as "intuitive", "fast", "robust", "broken", or "better" until they become observable.
   - Build a short shared vocabulary for domain terms.
   - Stress-test boundaries with concrete examples and counterexamples.

5. **Write `PROBLEM.md`**
   - Use the selected repository template if one exists; otherwise use `assets/PROBLEM.md.template`.
   - Generate/review the document with `visual-plan` before writing the final Markdown file.
   - Keep it solution-neutral.
   - Set `Status` to `Draft` while questions remain, `Ready for Spec` when the problem is clear enough for `specify`, or `Blocked` when a required answer is missing.
   - Mark any unresolved critical issue as `[NEEDS CLARIFICATION: question]`, but keep these to zero whenever possible.

6. **Self-review**
   - Verify no implementation plan, architecture, task list, framework choice, class/function name, or code detail slipped in.
   - Verify the problem can be summarized in one sentence.
   - Verify scope boundaries, evidence, and success signals are testable enough to support the `specify` phase.
   - Remove placeholders, contradictions, and unexplained jargon before reporting completion.

## Question Format

Use this compact format for most questions:

```markdown
**Question:** <clear question?>

| Option | Answer |
|--------|--------|
| A | <recommended answer> |
| B | <alternative> |
| C | <alternative> |
| Short | Provide a different short answer |

**Recommended:** A - <answer>

<one or two sentences explaining why>

Reply with the option letter, "recommended", or a short custom answer.
```

For open-ended questions, still start with `**Question:** <clear question?>`, then provide a suggested answer and ask the user to accept or replace it.

## Completion Report

After saving the problem document, report only:

- `PROBLEM.md` path
- visual-plan URL/export/local folder, if generated
- brief readiness checklist summary
- remaining `[NEEDS CLARIFICATION]` items, if any
- recommended next step: usually `specify`

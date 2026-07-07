---
name: document-project-vision
description: Create or update a repository-level VISION.md for a new project, product, initiative, app, tool, or repo. Use when the user asks to define, document, clarify, or align on mission, vision, strategy, goals, roadmap, north star, product direction, project strategy, or "what are we building and why?" Interview the user until the project direction is clear, then write VISION.md at the repository root and link it from existing AGENTS.md and CLAUDE.md guidance files when present.
---

# Document Project Vision

Create `VISION.md` at the root of the active repository using Lenny Rachitsky's mission -> vision -> strategy -> goals -> roadmap -> task sequence:
https://www.lennysnewsletter.com/p/mission-vision-strategy-goals-roadmap

This skill is for strategic alignment before specification or implementation planning. It should produce a durable project direction document, not a PRD, implementation plan, task tracker, or marketing page.

## Workflow

1. **Orient in the repo**
   - Confirm the active repository root with `git rev-parse --show-toplevel` when available; otherwise use the workspace root.
   - Read existing `VISION.md`, `AGENTS.md`, `CLAUDE.md`, README files, docs, specs, planning notes, or issue/ticket links that may already explain the project.
   - Reuse existing facts instead of asking the user to repeat them.
   - If an existing `VISION.md` exists, treat the task as an update unless the user explicitly wants a replacement.

2. **Interview until clear**
   - Ask one focused question at a time.
   - Start with the highest-leverage missing field, not a long questionnaire.
   - Prefer a recommended answer with 2-3 options when the available context suggests likely directions.
   - Accept terse answers, then ask follow-ups only where ambiguity would materially change the vision, strategy, goals, or roadmap.
   - Do not write the final `VISION.md` while critical fields remain unclear unless the user explicitly asks for a draft with open questions.

3. **Use the framework**
   - **Mission**: define the enduring purpose: what this project exists to achieve, for whom, and why it matters.
   - **Vision**: describe the future state if the mission is achieved. Make it concrete enough to guide product decisions.
   - **Strategy**: state the plan to win as 3-5 concrete strategic choices, bets, or investments. Include what the project will intentionally avoid.
   - **Goals**: define measurable progress signals. Include a north-star metric when one exists, plus supporting metrics and guardrails.
   - **Roadmap**: describe sequenced themes or milestones needed to make progress against the goals. Keep this at initiative/theme level, not a granular task list.
   - **Next Tasks**: include only the next few immediate work items when they clarify what should happen after alignment.

4. **Write `VISION.md`**
   - Save the document at `<repo-root>/VISION.md`.
   - Use concise, direct language. Prefer strong, specific claims over generic ambition.
   - Mark unresolved non-critical items as `[OPEN QUESTION: ...]`; avoid these when further interviewing can resolve them.
   - Include source context when useful, such as links to tickets, specs, notes, customer evidence, or decisions that informed the document.

5. **Link from repo guidance**
   - If `<repo-root>/AGENTS.md` exists, add a short reference to `VISION.md` where project context, planning, docs, or workflow guidance naturally belongs.
   - If `<repo-root>/CLAUDE.md` exists, add the same kind of reference there.
   - Preserve each file's existing style and structure.
   - If there is no natural location, add a short `Project Vision` or `Project Context` section near the top.
   - Do not create `AGENTS.md` or `CLAUDE.md` solely to add the link.

6. **Self-review**
   - Verify `VISION.md` answers why the project exists, what future it aims for, how it will win, how progress will be measured, what roadmap themes come next, and what is out of scope.
   - Verify goals are measurable or explicitly framed as qualitative decision criteria.
   - Verify roadmap items trace back to strategy and goals.
   - Verify guidance-file links point to `VISION.md` with a correct relative path.
   - Report the files changed and any remaining open questions.

## Interview Guide

Ask only what is missing. A good sequence is:

1. Who is the primary audience or user, and what painful situation are they in today?
2. What should be meaningfully different for them if this project succeeds?
3. What is the durable mission of the project?
4. What future-state vision should guide tradeoffs?
5. What 3-5 strategic choices will make this project win?
6. What will the project explicitly not do?
7. What metrics, signals, or qualitative criteria prove progress?
8. What roadmap themes should come first, next, and later?
9. What immediate tasks should follow after the vision is accepted?

Use this question format when offering options:

```markdown
**Question:** <single clear question?>

**Recommended:** A - <recommended answer>

<one or two sentences explaining why this is the best default.>

| Option | Answer |
|--------|--------|
| A | <recommended answer> |
| B | <alternative> |
| C | <alternative> |
| Short | Provide a different short answer |

Reply with the option letter, "recommended", or a short custom answer.
```

## `VISION.md` Structure

Use this structure unless the repository already has a clear vision template:

```markdown
# Vision

Status: Draft | Approved
Last updated: YYYY-MM-DD

## Summary

<One short paragraph explaining the project direction.>

## Mission

<Enduring purpose, audience, and core value.>

## Vision

<Concrete future state if the mission succeeds.>

## Strategy

<Short strategy statement.>

### Strategic Choices

1. <Choice or investment>
2. <Choice or investment>
3. <Choice or investment>

### Non-Goals

- <What the project will intentionally not pursue>

## Goals

### North-Star Metric

<Metric or qualitative success signal>

### Supporting Metrics

- <Metric>: <why it matters>

### Guardrails

- <Metric or constraint that should not regress>

## Roadmap

### Now

- <Theme or milestone>

### Next

- <Theme or milestone>

### Later

- <Theme or milestone>

## Immediate Next Tasks

- <Task>

## Source Context

- <Link or note>

## Open Questions

- <Question, owner, or decision needed>
```

Omit empty optional sections rather than leaving placeholders.

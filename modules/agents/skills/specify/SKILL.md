---
name: specify
description: Use when turning a rough product, feature, workflow, or initiative idea into a clarified PRD/spec document, especially when the user asks to interview, grill, clarify requirements, specify, write a PRD, define scope, or create an initiative spec before planning or implementation.
---

# Specify

Turn an ambiguous initiative idea into a reviewed PRD by interviewing the user, resolving material ambiguities, comparing approaches, and writing `SPEC.md`.

## Output Location

Save every completed PRD as:

```text
/Users/tuur/Documents/Obsidian/DataCamp/Agents/Initiatives/<YYYY-MM-DD>-<short-slug>/SPEC.md
```

Create a new directory for each initiative. If filesystem permissions prevent writing there, request approval instead of choosing another location.

## Workflow

1. **Gather context**
   - Restate the user's initial idea in one compact paragraph.
   - Inspect any provided docs, links, code, tickets, notes, or existing specs before asking questions.
   - If a question can be answered from available artifacts, answer it yourself and cite the artifact in the PRD.

2. **Interview**
   - Ask exactly one question at a time.
   - Prefer multiple-choice questions with a recommended answer first.
   - Include why the recommendation is best in 1-2 sentences.
   - Accept "yes", "recommended", or "suggested" as choosing your recommendation.
   - Keep asking until major branches of the decision tree are resolved: users, problem, scope, non-goals, workflows, data, permissions, dependencies, risks, success metrics, rollout, and open questions.
   - Stop early if the remaining ambiguity would not materially affect scope, user experience, implementation planning, tests, or success criteria.

3. **Sharpen language**
   - Build a small shared vocabulary as terms crystallize.
   - Challenge overloaded or vague terms immediately.
   - Use concrete scenarios to stress-test fuzzy rules and boundaries.
   - Capture important trade-offs and hard-to-reverse decisions in the PRD.

4. **Compare approaches**
   - Before writing the PRD, present 2-3 viable approaches with trade-offs.
   - Recommend one approach and explain the reasoning.
   - Ask for approval or correction before writing `SPEC.md`.

5. **Write the PRD**
   - Use `assets/SPEC.md.template` as the section structure.
   - Focus on what users need and why. Avoid implementation details unless they are explicit constraints.
   - Make requirements testable and unambiguous.
   - Use measurable, technology-agnostic success criteria.
   - Mark any unresolved critical decision as `[NEEDS CLARIFICATION: question]`, but keep these to zero whenever possible.

6. **Self-review**
   - Verify no placeholders, contradictions, unexplained jargon, or vague adjectives remain.
   - Check every requirement has an acceptance path or testable outcome.
   - Check scope and non-goals are clear enough for implementation planning.
   - If review finds issues, fix the PRD before reporting completion.

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

After saving the PRD, report only:

- `SPEC.md` path
- brief checklist summary
- remaining `[NEEDS CLARIFICATION]` items, if any
- recommended next step

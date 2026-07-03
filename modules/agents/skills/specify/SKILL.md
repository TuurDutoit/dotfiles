---
name: specify
description: Use when turning a rough product, feature, workflow, or initiative idea into a clarified WHAT/WHY PRD or spec document, especially when the user asks to interview, grill, clarify requirements, specify, write a PRD, define scope, or create an initiative spec before planning or implementation.
---

# Specify

Turn an ambiguous initiative idea into a reviewed PRD by interviewing the user, resolving material ambiguities, comparing product directions, and writing `SPEC.md`.

The PRD is exclusively about **WHAT** should exist and **WHY** it matters. Do not design implementation details, architecture, internal APIs, schemas, task breakdowns, technical plans, or delivery steps. Capture implementation constraints only when they materially affect product scope, user behavior, compliance, dependencies, or success criteria.

## Output Location

Before choosing the destination, inspect the active repository or workspace:

1. Read repository instructions such as `AGENTS.md`, `CLAUDE.md`, `.agents/**`, `.codex/**`, and README files for spec or plan storage conventions.
2. Look for existing spec or plan directories such as `docs/specs`, `docs/plans`, `docs/superpowers/specs`, `.agents/specs`, `.agents/plans`, `.claude/specs`, `.codex/specs`, `specs`, or similar names.
3. If repository conventions or existing files show where specs/plans live, create a new initiative directory there and save `SPEC.md` in it.
4. Otherwise, save the PRD in Obsidian:

```text
/Users/tuur/Documents/Obsidian/DataCamp/Agents/Initiatives/<YYYY-MM-DD>-<short-slug>/SPEC.md
```

Create a new directory for each initiative unless the repository's convention clearly uses a flat file layout. If filesystem permissions prevent writing to the chosen location, request approval instead of silently choosing another location.

## Template Selection

Before using the bundled template:

1. If storing the PRD in a repository, look for a repository template first. Check instructions and common paths such as `docs/specs/template.md`, `docs/specs/SPEC.template.md`, `.agents/specs/template.md`, `.github/ISSUE_TEMPLATE`, or nearby existing specs with consistent headings.
2. If a repository template exists, follow it exactly and adapt only what is needed for a WHAT/WHY PRD.
3. If no repository template exists, use `assets/SPEC.md.template`.
4. If storing the PRD in Obsidian, use `assets/SPEC.md.template`.

## Workflow

1. **Gather context**
   - Restate the user's initial idea in one compact paragraph.
   - Inspect any provided docs, links, code, tickets, notes, or existing specs before asking questions.
   - Determine the output location and template using the rules above.
   - If a question can be answered from available artifacts, answer it yourself and cite the artifact in the PRD.

2. **Interview**
   - Ask exactly one question at a time.
   - Prefer multiple-choice questions with a recommended answer first.
   - Include why the recommendation is best in 1-2 sentences.
   - Accept "yes", "recommended", or "suggested" as choosing your recommendation.
   - Keep asking until major branches of the decision tree are resolved: users, problem, goals, non-goals, workflows, entities from the user's perspective, permissions as product rules, dependencies, risks, success metrics, rollout expectations, and open questions.
   - Stop early if the remaining ambiguity would not materially affect scope, user experience, validation, or success criteria.
   - Redirect implementation answers back to observable product behavior. For example, turn "use Postgres" into "the user needs persistent history across sessions" unless the technology itself is a fixed constraint.

3. **Sharpen language**
   - Build a small shared vocabulary as terms crystallize.
   - Challenge overloaded or vague terms immediately.
   - Use concrete scenarios to stress-test fuzzy rules and boundaries.
   - Capture important trade-offs and hard-to-reverse decisions in the PRD.

4. **Compare product directions**
   - Before writing the PRD, present 2-3 viable product directions or scope shapes with trade-offs.
   - Recommend one direction and explain the reasoning in terms of user value, scope, risk, and learnings.
   - Do not compare implementation approaches, frameworks, libraries, storage engines, services, APIs, or architecture.
   - Ask for approval or correction before writing `SPEC.md`.

5. **Write the PRD**
   - Use the selected repository template if one exists; otherwise use `assets/SPEC.md.template`.
   - Focus on what users need, what the experience must do, what is out of scope, and why these choices matter.
   - Avoid implementation details unless they are explicit product constraints.
   - Make requirements testable and unambiguous.
   - Use measurable, technology-agnostic success criteria.
   - Mark any unresolved critical decision as `[NEEDS CLARIFICATION: question]`, but keep these to zero whenever possible.

6. **Self-review**
   - Verify no placeholders, contradictions, unexplained jargon, or vague adjectives remain.
   - Verify the PRD does not contain architecture, engineering task lists, internal API design, database schema design, framework choices, or other implementation plans.
   - Check every requirement has an acceptance path or testable outcome.
   - Check scope and non-goals are clear enough for a later planning step without adding that plan here.
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

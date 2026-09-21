---
name: "spec"
description: "Simple single-document specification — captures intent (problem statement & context), user-focused specs, and technical architecture in a single spec.md file through an iterative interview workflow."
---

# Spec: Intent → User Spec → Technical Architecture

A lightweight specification skill that produces **1 unified document** (`spec.md`) through an iterative interview workflow.

## The Document: `spec.md`

The single artifact combines:

1. **Intent (Problem & Context):** What problem is being solved, why it
   matters, affected users/systems, constraints, and non-goals.
2. **User-Focused Spec:** Observable behavior, user flows/surfaces,
   requirements, concrete QA scenarios & test cases (Given/When/Then), and
   any user-facing e2e/Cucumber spec changes.
3. **Technical Architecture & Plan:** External boundaries and dependencies
   (APIs, schemas, cross-repo impacts, env vars), inter-app monorepo
   boundaries (or an internal-only note), boundary condition checks (confirming
   no active callers for changed schemas/APIs, verifying prerequisite
   deployments), files to change, ordered implementation steps, and command-based
   verification checks.

Start from `references/templates/spec.md` in this skill.

## Artifact Location

Resolve the destination directory for `spec.md` in this order:

1. **Explicit path:** If the requester specified a path, use it.
2. **AGENTS.md instruction:** If the repo's `AGENTS.md` (or `CLAUDE.md`) defines
   where spec documents live, follow it.
3. **Existing task/spec directory:** Follow the repo's existing directory
   conventions (e.g. `docs/specs/`, `specs/`, `docs/tasks/`, `tasks/`).
4. **Fallback (handoffs):** Otherwise create:
   ```
   ~/Documents/Obsidian/DataCamp/Agents/Handoffs/<repo-name>/<task-slug>/
   ```
   The `<task-slug>` is `YYYY-MM-DD-<type>-<slug>` (e.g. `2026-09-16-feat-dark-mode-toggle`).

Resolve `<repo-name>` from `git remote get-url origin` (repository basename without `.git`), or from the canonical checkout directory under `~/Projects`.

Artifacts inside the repository are committed once accepted.

## Workflow

Follow these steps in order:

### 1. Ingest, Explore & Initialize

- Review the user's prompt, tickets, and existing conversation context.
- Explore the codebase using `grep`, `glob`, and `read` to understand existing behavior, components, interfaces, and testing patterns. Check technical facts yourself first before asking questions.
- Resolve the destination path for `spec.md` following the [Artifact Location](#artifact-location) rules.
- Initialize `spec.md` at the resolved path from `references/templates/spec.md`.

### 2. Part-by-Part Interview & Write (Iterative Loop)

Work through each section of `spec.md` sequentially. For each part:
1. **Interview**: Ask targeted questions (using the `question` tool or structured prompts) to uncover unknowns, probe assumptions, clarify ambiguities, and explore trade-offs.
   - **Interview rules**:
     - Ask 2–4 focused questions per round.
     - Always provide recommendations, candidate drafts, or concrete options for Tuur to react to rather than open-ended questions.
     - Find technical facts from the codebase first; save questions for requirements, decisions, and trade-offs.
2. **Write**: Update that specific part in `spec.md` immediately with the clarified information and decisions.
3. **Rinse & Repeat**: Move to the next part until all sections are written.

#### Part 1: Intent
- **Interview**: Probe the core problem, why it matters, affected users/systems, proposed outcomes, hard constraints, and non-goals.
- **Write**: Fill out `## 1. Intent` in `spec.md`.

#### Part 2: User-Focused Spec
- **Interview**: Probe observable behaviors, user flows, UI/UX states, error feedback, edge cases, acceptance criteria, QA scenarios (Given/When/Then), and any executable/e2e specs.
- **Write**: Fill out `## 2. User-Focused Spec` in `spec.md`.

#### Part 3: Technical Architecture & Plan
- **Interview**: Check external boundaries/APIs/schemas, confirm no broken downstream consumers, and discuss affected files, ordered implementation steps, and command-based / manual verification checks.
- **Write**: Fill out `## 3. Technical Architecture & Plan` and `## 4. Open Questions & Decisions` in `spec.md`.

### 3. Review the Document

Once all sections are drafted:
- Review the complete `spec.md` document for consistency, completeness, and clarity across logic, specs, and architecture (or dispatch the `reviewer` subagent via the `task` tool if a deeper review is helpful).
- Fix any inconsistencies, gaps, or unresolved ambiguities identified during review in `spec.md`.

### 4. Sign-Off & Approval

- Present the completed `spec.md` (and a concise summary) to Tuur for review.
- Get Tuur's explicit review and sign-off.
- If Tuur requests changes, update `spec.md` and re-confirm.
- Once approved:
  - If `spec.md` is inside the repository, commit it.

### 5. Handoff for Implementation

Once signed off, hand off to the `engineer` agent to implement the spec:

> Implement this spec: `<path to spec.md>`

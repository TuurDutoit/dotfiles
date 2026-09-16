---
name: "spec"
description: "Simple single-document specification for small projects and small changes — captures intent (problem statement & context), user-focused specs, and technical architecture in a single spec.md file. Use when planning smaller tasks, bug fixes, or features where multi-stage SDLC is overkill."
---

# Spec: Intent → User Spec → Technical Architecture

A lightweight, single-agent specification skill for small projects and small
changes. Instead of splitting work across four separate stages and sessions
(`intent.md` → `spec.md` → `architecture.md` → `plan.md`), 1 agent in 1 session
produces **1 unified document** (`spec.md`).

For large projects where each stage requires deep independent refinement,
explore subagents, and separate reviews, use the `sdlc` skill instead.

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

## Session Naming

When starting a session with this skill, rename the session to:

```
<project_slug> - spec - <issue_name>
```

- **`<project_slug>`:** Resolved from the git remote (e.g. `learn-hub` from `git@github.com:datacamp-engineering/learn-hub.git`). With no remote, fall back to the canonical checkout directory name.
- **`<issue_name>`:** Short descriptive name based on the ticket or request.

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

### 1. Understand & Explore

- Review the user's request, tickets, and conversation context.
- Explore the codebase using `grep`, `glob`, and `read` to understand existing
  behavior, components, interfaces, and testing patterns. Delegate bulk searches
  to an `explore` subagent if broad exploration is needed.
- Check external boundaries:
  - If changing/removing APIs or schemas, verify whether any consumers exist
    across the org (e.g. GitHub search in `datacamp-engineering`).
  - If dependent on external services or prior PRs, verify they are live.

### 2. Draft `spec.md`

- Copy `references/templates/spec.md` to the resolved artifact location.
- Fill out all three core sections (Intent, User Spec, Technical Architecture & Plan).
- Keep descriptions plain and concise. Avoid unnecessary jargon.
- Flag any open questions, ambiguities, or trade-offs in the "Open Questions & Decisions" section.

### 3. Open-Questions Loop

Before requesting review, resolve all open questions:

1. Gather open questions identified during drafting.
2. Ask Tuur using the `question` tool — batching questions in a single call with concrete options where possible.
3. Update `spec.md` with the answers, moving questions to resolved decisions.
4. Repeat until no open questions remain.

### 4. Review Loop

Once open questions are resolved, run the review loop via a subagent:

1. Dispatch the `reviewer` agent through the `task` tool:
   > Review `<path to spec.md>` with these dimensions: Logic, Specs, Architecture. Your findings go back to the dispatching agent — the comments come from another agent, not the user.
2. Address the reviewer's findings in `spec.md`.
3. Resume the reviewer subagent using its `task_id` with a summary of changes made for each finding.
4. Repeat until the reviewer reports no important findings.

### 5. Stage Gate & Approval

The spec is ready only when all three conditions are satisfied:

1. **Reviewer accepted:** The reviewer subagent confirms the output is acceptable (or Tuur explicitly overrides).
2. **No open questions:** Every question is answered and recorded in the document.
3. **Tuur approved:** Tuur has explicitly reviewed and approved `spec.md`.

Once approved:
- If `spec.md` is inside the repository, commit it.

### 6. Handoff

When the spec is approved, hand off to the `engineer` agent to implement the spec:

> Implement this spec: `<task dir>/spec.md`

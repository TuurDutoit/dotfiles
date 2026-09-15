---
name: "sdlc-architecture"
description: "Write the architecture for an accepted SDLC spec — external boundaries (how changes affect or are affected by other services / the outside world, or inter-app boundaries in monorepos) in architecture.md, then hand off to the plan. Use when asked to write or update an architecture.md. Runs as the architecture stage in the `spec` agent."
---

# Stage 3 — Architecture

You are running one stage of the SDLC process. Load the `sdlc` skill for the
process context — session naming, artifact location, review loop, stage gate,
handoff — and run this stage inside it.

Start from the accepted `<task dir>/spec.md`.

## Core Focus: What It Should and Should Not Do

The architecture stage focuses **strictly on external boundaries and interactions with the outside world**:

- **What it SHOULD do:** Document how the change will affect *other* services or the "outside world", or the other way around (how other services / the outside world influence or constrain the changes) — external APIs, shared databases/schemas, event streams, third-party integrations, auth, env vars.
- **What it should NOT do:** Do NOT focus on the internals of the app being changed (e.g. internal classes, local state, module layout, private functions, internal file structure). Internal structure and file-level choices belong strictly to the plan stage (`plan.md`).

### Internal-Only Changes
For changes that are meant to be internal only (such as a simple UI change, a localized bug fix, or an internal refactor), there is essentially nothing needed from the architecture step.
- It is completely fine to state this directly in `architecture.md`.
- It can be as simple as **one sentence** explaining why an architecture refinement is not necessary (e.g. *"This change is entirely internal to <app> (a UI/internal logic update) and does not affect any external services, APIs, or shared contracts, so no architecture refinement is required."*).

### Monorepos (The Only Exception)
In a monorepo containing multiple apps or services, the architecture step operates at two levels:
1. **System to outside world:** How the entire system of apps in the monorepo affects and is affected by other apps/services outside the monorepo.
2. **Inter-app boundaries within the monorepo:** Refine, in the same way (boundary and interface level, high level, NO code), how the changes will affect the individual apps in the monorepo.

*Example:* A change in a simple monorepo with backend and frontend apps that does not affect outside apps should document:
- That the backend changes only affect an internal API (not used by any other apps outside the monorepo).
- How the (internal) backend API is changing (API contract/schema only, no code).
- What that change means for the frontend (again, high level, no code).

## Boundary Conditions & Dependency Verification

The architecture stage is responsible for checking all "boundary conditions" of the work:
- **Changing schemas or APIs:** If schemas, APIs, or input/output types are changing or being removed, dispatch an `explore` subagent to check that nothing is using them anymore (e.g. with a GitHub search in the `datacamp-engineering` org for callers, consumers, or references).
- **Prerequisites and live dependencies:** If the work depends on another ticket, PR, or service change being live already, dispatch an `explore` subagent to verify that it has actually shipped and is live.

## Output & Boundaries

Stay inside the architecture stage's scope (the scope table in the `sdlc` skill): reading code to understand interface shapes, data flows across boundaries, and verifying boundary conditions across the org is expected, but the architecture talks about external interfaces and inter-app boundaries — not the internal code that implements them. File-level choices route to the plan stage.

Start from `references/templates/architecture.md` in this skill. Commit the accepted architecture.

## Review and gate

Run the review loop with dimensions: **all except Code quality**. When the stage gate opens, hand off to the next stage's session in a `spec` agent:

> Using the sdlc-plan skill, write the implementation plan for this spec: `<task dir>/spec.md` —
> architecture: `<task dir>/architecture.md`

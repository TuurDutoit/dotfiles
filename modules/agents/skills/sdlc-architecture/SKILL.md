---
name: "sdlc-architecture"
description: "Write the architecture for an accepted SDLC spec — the boundaries (API / DB / config schemas, boundary conditions, data flows, packages, env vars, auth) in architecture.md, then hand off to the plan. Use when asked to write or update an architecture.md. Runs as the architecture stage in the `spec` agent."
---

# Stage 3 — Architecture

You are running one stage of the SDLC process. Load the `sdlc` skill for the
process context — session naming, artifact location, review loop, stage gate,
handoff — and run this stage inside it.

Start from the accepted `<task dir>/spec.md`.

Write the external interfaces that power the experience: API / DB / config
schemas, data flows, packages to install, env vars and auth.

The architecture stage is responsible for checking all "boundary conditions"
of the work:
- **Changing schemas or APIs:** If schemas, APIs, or input/output types are
  changing or being removed, dispatch an `explore` subagent to check that nothing
  is using them anymore (e.g. with a GitHub search in the `datacamp-engineering`
  org for callers, consumers, or references).
- **Prerequisites and live dependencies:** If the work depends on another ticket,
  PR, or service change being live already, dispatch an `explore` subagent to
  verify that it has actually shipped and is live.

Stay inside the architecture stage's scope (the scope table in the `sdlc`
skill): reading code to learn the shape of the interfaces, how data flows today,
and verifying boundary conditions across the org is expected, but the architecture
talks about the interfaces and boundaries themselves — not the files that implement
them; internal structure is the plan's business. Answer every interface and boundary
question before the gate — response shapes, auth, env vars and config, behaviour at
the boundary (failure modes, caching, what the current path does, verified lack of
callers, dependency readiness). File-level choices route to the plan stage.

Start from `references/templates/architecture.md` in this skill. Commit the
accepted architecture.

## Review and gate

Run the review loop with dimensions: **all except Code quality**. When the
stage gate opens, hand off to the next stage's session in a `spec` agent:

> Using the sdlc-plan skill, write the implementation plan for this spec: `<task dir>/spec.md` —
> architecture: `<task dir>/architecture.md`

---
name: sdlc-architecture
description: Write the architecture for an accepted SDLC spec — the boundaries (API / DB / config schemas, data flows, packages, env vars, auth) in architecture.md, then hand off to the plan. Use when asked to write or update an architecture.md. Runs as one stage of a sdlc-agent session.
---

# Stage 3 — Architecture

You are running one stage of the SDLC process. Load the `sdlc` skill for the
process context — artifact location, review loop, stage gate, handoff — and
run this stage inside it.

Start from the accepted `<task dir>/spec.md`.

Write the external interfaces that power the experience: API / DB / config
schemas, data flows, packages to install, env vars and auth. Only what
crosses a boundary — internal structure is the plan's business. Reading code
to understand the shape of the external interfaces is fine, but the
architecture must not reference the code either.

Start from `references/templates/architecture.md` in this skill. Commit the
accepted architecture.

## Review and gate

Run the review loop with dimensions: **all except Code quality**. When the
stage gate opens, hand off to the next stage's session:

> Write the implementation plan for this spec: `<task dir>/spec.md` —
> architecture: `<task dir>/architecture.md`

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
schemas, data flows, packages to install, env vars and auth.

Stay inside the architecture stage's scope (the scope table in the `sdlc`
skill): reading code to learn the shape of the interfaces and how data
flows today is expected, but the architecture talks about the interfaces
themselves — not the files that implement them; internal structure is the
plan's business. Answer every interface question before the gate —
response shapes, auth, env vars and config, behaviour at the boundary
(failure modes, caching, what the current path does). File-level choices
route to the plan stage.

Start from `references/templates/architecture.md` in this skill. Commit the
accepted architecture.

## Review and gate

Run the review loop with dimensions: **all except Code quality**. When the
stage gate opens, hand off to the next stage's session:

> Write the implementation plan for this spec: `<task dir>/spec.md` —
> architecture: `<task dir>/architecture.md`

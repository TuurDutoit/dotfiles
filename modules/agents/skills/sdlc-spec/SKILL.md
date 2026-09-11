---
name: sdlc-spec
description: Write the spec for an accepted SDLC intent — the user experience (requirements, surfaces, flows, states, permissions) in spec.md, then hand off to the architecture. Use when asked to write or update a spec.md. Runs as one stage of a sdlc-agent session.
---

# Stage 2 — Spec

You are running one stage of the SDLC process. Load the `sdlc` skill for the
process context — artifact location, review loop, stage gate, handoff — and
run this stage inside it.

Start from the accepted `<task dir>/intent.md`.

Write what the feature looks and feels like for users: surfaces, flows,
states, permissions as the user meets them. Reading code is allowed, but only
to understand how the app works — the spec itself must not reference the
code; internals belong to the architecture and the plan.

Start from `../sdlc/references/templates/spec.md`. Resolve flagged concerns
with the requester before moving on. Commit the accepted spec.

## Review and gate

Run the review loop with dimensions: **Logic, Edge cases**. When the stage
gate opens, hand off to the next stage's session:

> Write the architecture for this spec: `<task dir>/spec.md`

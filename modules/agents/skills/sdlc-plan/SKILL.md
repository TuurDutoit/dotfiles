---
name: sdlc-plan
description: Write the implementation plan for an accepted SDLC spec/architecture — files that change, naming, order of work, risks, and proof (command checks + QA plan) in plan.md, then hand off to the implementer. Use when asked to write or update a plan.md. Runs as one stage of a sdlc-agent session.
---

# Stage 4 — Plan

You are running one stage of the SDLC process. Load the `sdlc` skill for the
process context — artifact location, review loop, stage gate, handoff — and
run this stage inside it.

Start from the accepted `<task dir>/spec.md` and (when the stage ran)
`<task dir>/architecture.md`.

Write the plan before writing code. The implementation: the files that
change and in which modules, the naming (follow the project glossary / DDD
terms), the order of work, the risks, and the proof. Proof has two halves:
command-based checks (typecheck, lint, unit tests) and a QA plan for testing
the change in the actual app, derived from the spec — for frontend changes,
which pages to open and what to do on them; for API changes, which curl
commands to run and the expected output. Iterate until someone who never saw
the conversation could implement from the plan alone.

Start from `../sdlc/references/templates/plan.md`. Commit the accepted plan.

## Review and gate

Run the review loop with dimensions: **all**. When the stage gate opens,
hand off to the next stage's session:

> Implement this plan: `<task dir>/plan.md`

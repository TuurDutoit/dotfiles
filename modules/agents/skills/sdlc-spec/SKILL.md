---
name: "sdlc-spec"
description: "Write the spec for an accepted SDLC intent — the user experience (requirements, surfaces, flows, states, permissions, QA test cases, Cucumber/e2e specs) in spec.md, then hand off to the architecture. Use when asked to write or update a spec.md. Runs as the spec stage in the `spec` agent."
---

# Stage 2 — Spec

You are running one stage of the SDLC process. Load the `sdlc` skill for the
process context — session naming, artifact location, review loop, stage gate,
handoff — and run this stage inside it.

Start from the accepted `<task dir>/intent.md`.

Write what the feature looks and feels like for users: surfaces, flows,
states, permissions as the user meets them.

Document exact QA scenarios and test cases: always include a section in the
spec doc listing concrete test cases for humans or AI agents to test.
Specify which users/personas, which scenarios to test, and the expected
outcome, written as "if this then that" / Cucumber-style scenarios
(Given / When / Then).

If the codebase has Cucumber specs (`.feature` files) or high-level e2e tests
(anything user experience-focused), inspect them and document in the spec how to
update those (what scenarios or specs to add, change, or remove).

Stay inside the spec stage's scope (the scope table in the `sdlc` skill):
the artifact talks about behavior the user can observe. Reading code is
allowed only to see how the app works today and how existing user-facing specs
are structured — never to decide how to change implementation code — and the spec
itself names no internal implementation details: external boundaries belong to the
architecture and internal structure belongs to the plan. Answer every behavioral question (what should
happen when X) before the gate; boundary questions route to the
architecture stage.

Start from `references/templates/spec.md` in this skill. Resolve flagged
concerns with the requester before moving on. Commit the accepted spec.

## Review and gate

Run the review loop with dimensions: **Logic**. When the stage
gate opens, hand off to the next stage's session in a `spec` agent:

> Using the sdlc-architecture skill, write the architecture for this spec: `<task dir>/spec.md`

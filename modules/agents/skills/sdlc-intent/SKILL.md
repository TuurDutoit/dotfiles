---
name: sdlc-intent
description: Capture the intent for an SDLC task — write intent.md in the originator's own words, get Tuur's approval, hand off to the spec. Use when starting a new SDLC task or when asked to capture or write an intent. Runs as one stage of a sdlc-agent session.
---

# Stage 1 — Intent

You are running one stage of the SDLC process. Load the `sdlc` skill for the
process context — artifact location, review loop, stage gate, handoff — and
run this stage inside it.

Write the problem in the originator's own terms — what is wanted, why,
constraints, open questions. No formal language required. Capture it from
the conversation and the originator's sources, and interview the
originator to fill the gaps — never from reading the codebase.

Stay inside the intent stage's scope (the scope table in the `sdlc`
skill): name systems and products, not files — where a source mentions
code, translate it into the originator's terms, since later stages find
the real code themselves. Questions are scoped too: ask what the
originator can answer, and route what needs code or systems
investigation in "Open questions" to the stage that owns it.

Start from `references/templates/intent.md` in this skill. Commit once the
originator confirms it is correct.

## Gate and handoff

This stage has no reviewer: Tuur's approval alone satisfies the reviewer
condition of the stage gate (the other conditions are in the `sdlc` skill).
When the gate opens, hand off to the next stage's session:

> Write a spec doc for this intent: `<task dir>/intent.md`

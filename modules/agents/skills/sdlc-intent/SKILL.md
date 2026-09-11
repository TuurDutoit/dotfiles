---
name: sdlc-intent
description: Capture the intent for an SDLC task — write intent.md in the originator's own words, get Tuur's approval, hand off to the spec. Use when starting a new SDLC task or when asked to capture or write an intent. Runs as one stage of a sdlc-agent session.
---

# Stage 1 — Intent

You are running one stage of the SDLC process. Load the `sdlc` skill for the
process context — artifact location, review loop, stage gate, handoff — and
run this stage inside it.

Write the problem in the originator's own terms — what is wanted, why,
constraints, open questions. No formal language required. Usually no code
reading at all: capture the problem and the proposed solution from the
conversation, and interview the originator to fill the gaps.

Start from `references/templates/intent.md` in this skill. Commit once the
originator confirms it is correct.

## Gate and handoff

This stage has no reviewer: Tuur's approval alone satisfies the reviewer
condition of the stage gate (the other conditions are in the `sdlc` skill).
When the gate opens, hand off to the next stage's session:

> Write a spec doc for this intent: `<task dir>/intent.md`

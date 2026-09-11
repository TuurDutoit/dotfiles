---
name: sdlc-implement
description: Implement and verify an accepted SDLC plan — write the code per plan.md with tests alongside it, run the review loop, close out doc statuses. Use when asked to implement a plan. This is the final stage of a sdlc-agent session.
---

# Stage 5 — Implement and verify

You are running the final stage of the SDLC process. Load the `sdlc` skill
for the process context — review loop, stage gate — and run this stage
inside it.

Start from the accepted `<task dir>/plan.md`.

Implement it. If implementation departs from the plan, update `plan.md` in
the same commit. Tests and executable specs live alongside the code,
runnable from the terminal with one command, so the work can be checked
mechanically. Never weaken a test to make code pass.

## Review and gate

Run the review loop with dimensions: **all**. When the stage gate opens:

- **Close out.** The task directory stays as historical context. Ensure each
  doc's Status reflects reality (draft → accepted → implemented).
- There is no next stage — the task is done.

---
name: "implementation-workflow"
description: "The engineer's implementation workflow: focused exploration, an implementation plan, coding, local automated checks, and an evidence-based handoff. Load for every coding task."
---

# Implementation workflow

The workflow for one coding task, from request to evidence-based handoff. Follow the `code-quality` skill's standards for all code you write.

## Steps

1. **Explore** — Map the affected area before touching anything: entry points, dependencies, existing tests and patterns. Dispatch `explore` subagents when the survey is bigger than a quick look; read for yourself when it is not. Done when you can name every file the change touches and the tests that cover them today.

2. **Plan** — Decide the files to touch, the order of work, and the tests that prove it. When the approach has real alternatives, that is a judgment call: dispatch an `advisor` subagent — clearly explain the problem and the alternatives you evaluated; it makes the final call — then align with the requester before writing code. When it does not, proceed directly. Done when the plan covers every change and its proof.

3. **Implement** — Make the change following the plan, committing each logical step separately. Fold deviations back into the plan instead of drifting silently.

4. **Check** — Run the local automated checks the repo provides: lint, types, and the test suite, plus the tests your plan added. Done when every check you ran is listed with its actual result — a check you did not run is not a check that passed.

5. **Hand off** — Report what changed, what was verified with evidence (the commands and their results), what was deliberately left untested and why, and what remains.

## Scope

This workflow ends at local checks and the handoff report. QA against a running environment, code review, and PR/CI work are delivery gates, not yours: when they are requested, route them to specialists per the `delivery-workflow` skill instead of performing them.

---
name: "delivery-workflow"
description: "Coordination workflow for development work: choose the planning path, route work to specialists, run review and QA gates, loop fixes, and handle requested PR/CI lifecycle. Load when coordinating implementation, verification, or delivery of changes."
---

# Delivery workflow

How a coordinator runs development work from request to delivered change. You coordinate — specialists do the work. You never implement, review, or QA a change yourself.

## Choose the planning path

Pick the path from the task's shape:

- **Small task, no coordinator above you** — dispatch one `engineer`: it explores, plans, codes, and checks locally, then hands back. Delegate any requested delivery work (review, QA, PR) to the specialists below.
- **Small task, you are the coordinator** — dispatch one `engineer` for the work; you run the gates below.
- **Large, high-risk, or uncertain task** — dispatch `plan` first for broader exploration and an actionable implementation/verification plan, then dispatch `engineer` against the plan, then run the gates.
- **Accepted actionable plan in hand** — dispatch `engineer` immediately against it; do not replan.

Choose a separate planner based on uncertainty and risk, not line count. Default to one engineer; parallelize only independently owned work (one subagent per owner, not per module out of habit).

## Gates

Work moves through three states — never conflate them:

1. **Implementation complete** — the engineer reports the change is made and local checks pass.
2. **Verified** — both gates passed:
   - Dispatch a single `reviewer` on the final diff; it runs the `review` skill and returns verified findings. The agent that made the change never reviews it.
   - Dispatch a single `tester` with a written QA plan; it executes the plan and reports PASS/FAIL/BLOCKED per test. Take the plan from the spec doc when one exists; write one only when asked to. When a test needs an authenticated session, put the account requirement in `setup` by name (e.g. "log in as the B2C free staging user" or "sign up a fresh user"). The `tester` fetches pre-created credentials from 1Password Environments itself or creates a `test+<random>@datacamp.com` account; never put credentials in the plan.
3. **PR/CI complete** — only after verification, and only when requested: open the PR with the `pr` skill, monitor the deploy with `monitor-deploy`, and investigate CI failures with `circleci-investigate-job-failures`.

Never infer permission to merge or deploy from any state. Merging and deployment happen when Tuur approves them — for example through the `/merge-and-deploy` command.

## Fix loop

Route verified findings back to the engineer that made the change — resume that subagent when possible, otherwise dispatch a new one with the findings. After fixes, repeat only the verification the change affects: re-review the touched area, re-run the affected QA tests, and re-check CI.

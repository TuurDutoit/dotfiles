---
name: "close-ticket"
description: "Close out a Jira ticket after a deploy: gate on QA having fully passed on staging and production, draft the two security-review fields, present the deploy & QA report, and — only after the user's explicit approval — fill the fields and move the ticket to Done. Use when asked to close a ticket after a deploy, to finish a deploy's Jira lifecycle, or when monitor-deploy hands off the close."
---

# Close the ticket

The final step of the deploy lifecycle — normally handed over by **`/monitor-deploy`** once the change is fully deployed and QA is done — but also usable on its own when a deployed change's ticket still sits open. The order is fixed: QA green → security draft → user approval → ticket **Done**. Closing is only for a ticket the change completes: the PR behind the deploy must be the whole ticket, or its last remaining part.

**Inputs.** Coming from `/monitor-deploy` you hold everything in context: the ticket key, the merge commit and tag, the staging and prod manifest versions and timestamps, and the QA outcomes. Standalone, reconstruct what you can — the ticket key from the PR title (e.g. `[LX-1234]`, resolved as `monitor-deploy` does it), deploy facts from the PR, git tags, and deployment records — and ask the user for the rest.

## 1. Gate on QA and ticket scope

Every QA case must have been executed and passed — on staging and on production — before anything else here happens. Check the outcomes you hold: any failure, blocked flow, or case that was never run stops the close. If the outcomes are not in your hands, get them from the user or from a QA report on the PR or ticket; QA that has not run is not a gate you can pass by assumption.

Second gate — **ticket scope**: the ticket may only be moved to **Done** when the change behind the deploy is the whole ticket, or its last remaining part. Check the ticket for work outside this PR: other planned PRs, open subtasks, or a linked change not yet merged. If any remain, stop — the ticket stays open until the last part ships. If the ticket does not make it clear, ask the user whether this change completes it before going on.

**Done when**: every QA case in the plan is accounted for as PASS on both environments, and the ticket-scope gate passed.

## 2. Draft the security review

Moving the ticket to **Done** requires two of its fields to be filled: **"Could this change affect security?"** and **"Security Impact and Mitigation Details"**. Before touching the ticket, draft a proposal for both from what the PR actually changed — the risk surface it touches (auth, user data, payments, endpoints, permissions, config) and what mitigates it (validation, tests, feature flags, monitoring, rollback path).

Guidelines:
- "Could this change affect security?":
  - Select “Yes” when the change might pose a threat to DataCamp’s proprietary code or customer data. Examples include changes involving publicly exposed APIs, input fields accepting user data, use of external repositories, or NPM packages - especially when proper security mechanisms are not yet in place or require additional safeguards.
  - Select “No” when the change clearly presents no security threat. Examples include documentation updates, unit tests, UI-only changes, or internal logic with no external dependencies or inputs.
- "Security Impact and Mitigation Details" - provides supporting context for the answer in the previous field:
  - If “Yes” was selected: explain how you evaluated the potential security risks and what was done to mitigate or prevent them.
  - If “No” was selected: provide a brief justification for why the change poses no security risk (e.g., “This is a frontend-only UI update with no external input or data exposure.”)

## 3. Present the report and wait for approval

Present the deploy report below — filled with the recorded tags, manifest versions, timestamps, and QA outcomes — together with the security draft, and wait for the user's explicit approval. Do not fill the fields or move the ticket without it.

```
## Deploy & QA report — <TICKET-KEY> (<PR title>)

**Deploy**
- Merged to master at <UTC timestamp> — merge commit `<sha>`
- CircleCI `<workflow>` green at <timestamp>
- Tag `<1.0.324>` cut on the merge commit
- Staging: manifest `<365>`, tag `<1.0.324>` deployed at <timestamp>
- Prod: manifest `<366>`, tag `<1.0.324>` deployed at <timestamp>

**QA** (plan: <shared plan / ticket / PR description>)
| test | staging | prod |
|------|---------|------|
| <name> | PASS | PASS |

**Security review draft**
- Could this change affect security? <draft: yes/no>
- Security Impact and Mitigation Details: <draft: *why* you selected yes or no - surface touched, exposure, mitigations>
```

## 4. Update the ticket

Only after the user has explicitly approved the report and the security draft: write the approved values into the two security fields, transition the ticket to **Done** with the Jira tools in the internal Cloudflare MCP portal, and verify both the field values and the final status on the ticket.

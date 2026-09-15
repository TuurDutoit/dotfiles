# Spec: <one-line summary>

From intent: `./intent.md`. Author: <name>. Status: draft.

## Requirements

<What must be true when this is done, as the user can observe it. Numbered,
testable statements.>

## User experience

<What this looks and feels like for the user: surfaces, flows, states,
permissions as the user meets them. No references to the code — external boundaries
belong to architecture.md and internal structure belongs to plan.md.>

## QA scenarios & test cases

<Always include a list of concrete test cases for humans or AI agents to test.
Specify which users/personas, which scenarios to test, and the expected outcome
in "if this then that" / Cucumber-style (Given / When / Then) scenarios.>

- **Scenario 1:** Given <user persona/role and starting state>, When <action taken>, Then <expected outcome>
- **Scenario 2:** If <user state/condition>, when <action taken>, then <expected outcome>

## High-level & executable specs

<If there are Cucumber specs (.feature files) or high-level e2e tests focused on
user experience, document how to update them: what scenarios or specs to add,
modify, or remove. Omit if no user-facing specs exist.>

## Areas of concern

<Flagged points: contradictions, risks, things needing a decision.
Resolve each with the requester before implementation; note resolutions here.>

## Open questions carried forward

<Questions routed to architecture or plan, each with its owner stage.
Questions the spec's scope covers are answered above — the stage gate
does not open with them unresolved.>

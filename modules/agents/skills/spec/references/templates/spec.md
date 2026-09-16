# Spec: <one-line summary>

Author: <name>. Status: draft.

## 1. Intent

### Problem Statement & Context
<What problem are we solving? What cannot be done today, who is affected, and what does better look like in plain language?>

### Proposed Outcome
<What should exist once this is done?>

### Constraints & Non-Goals
<Hard boundaries: scope, non-goals, things explicitly out of scope.>

## 2. User-Focused Spec

### Requirements
<Numbered, testable statements describing observable behavior.>
1. Requirement 1
2. Requirement 2

### User Experience & Flows
<What this looks and feels like for users: surfaces, interaction flows, states, permissions, error feedback. Describe behavior observable to users without internal implementation code.>

### QA Scenarios & Test Cases
<Concrete test cases for humans or AI agents to verify. Format as Given / When / Then scenarios.>
- **Scenario 1:** Given <starting state/persona>, When <action taken>, Then <expected outcome>
- **Scenario 2:** Given <condition/input>, When <action taken>, Then <expected outcome>

### Executable Specs
<Cucumber .feature files or e2e test changes to add/update, if applicable. Omit if none exist.>

## 3. Technical Architecture & Plan

### External Boundaries & Dependencies
<External interfaces touched, added, or consumed: external APIs, shared DB tables/schemas, event streams, third-party integrations, env vars, auth. For monorepos: document internal inter-app boundaries.
For internal-only changes: "This change is internal to <app> and does not touch any external APIs, shared schemas, or external services.">

### Boundary Conditions & Verification
<If changing schemas or public APIs: confirm no active callers remain via search (e.g. GitHub search across datacamp-engineering). If depending on other PRs/services: confirm deployed status.>

### Files to Change
<List of files created or modified, with brief purpose.>
- `<path/to/file>` (new / modified): <what changes>

### Implementation Steps
<Numbered, actionable steps an engineer can execute in order.>
1. Step 1
2. Step 2

### Verification & Proof
#### Command-Based Checks
<Terminal commands for typechecking, linting, unit tests.>
- Typecheck: `<command>`
- Lint: `<command>`
- Tests: `<command>`

#### Manual / QA Plan
<Concrete steps to test in the running app: pages to open, actions to perform, curl commands to run.>

## 4. Open Questions & Decisions
<Record any resolved questions, trade-offs, or decisions made during drafting/review.>

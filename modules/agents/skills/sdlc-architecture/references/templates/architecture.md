# Architecture: <one-line summary>

From spec: `./spec.md`. Status: draft.

## Boundaries

<Every interface this feature adds or touches, with exact names and shapes:
API endpoints and payloads, DB tables and migrations, events, config schema, env
vars, auth and permissions. Packages to install. Describe the interfaces
themselves with diagrams — no references to the code.>

## Boundary conditions & dependencies

<Verification of all boundary conditions:
- Consumer checks: If schemas, APIs, or input/output types changed or were removed,
  record proof from cross-repo searches (e.g. datacamp-engineering GitHub search via
  explore agent) confirming no active callers remain.
- Live prerequisites: If this work depends on another ticket, PR, or external change
  being live, record the check confirming it is deployed and ready.>

## Data flows

<How data moves across those boundaries — in, out, and where it rests. Use diagrams.>

## Areas of concern

<Flagged points: contradictions, risks, things needing a decision.
Resolve each with the requester before the plan; note resolutions here.>

## Documentation
<Documentation references that need to be updated: repo docs, openapi schemas, Confluence pages, etc.>

## Open questions

<Questions routed to the plan, such as file-level choices. Interface
and boundary condition questions are answered in Boundaries, Boundary conditions & dependencies,
and Data flows before the gate opens.>

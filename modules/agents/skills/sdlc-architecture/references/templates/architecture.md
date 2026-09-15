# Architecture: <one-line summary>

From spec: `./spec.md`. Status: draft.

<!--
NOTE ON ARCHITECTURE SCOPE:
Architecture documents how this change affects or is affected by other services / the outside world (or inter-app boundaries in monorepos). It does NOT document internal app structure or code (which belongs in plan.md).

For internal-only changes (e.g. simple UI changes, internal refactoring, localized bug fixes):
Replace the entire document with a single sentence explaining why no architecture refinement is necessary:
"This change is entirely internal to <app> (UI/internal logic) and does not touch any external APIs, shared schemas, or external services, so no architecture refinement is required."
-->

## External boundaries

<Every external interface this change adds, touches, or consumes, with exact names and shapes:
- External/public API endpoints and payloads
- Shared DB tables, event streams, or message queues
- Third-party integrations, external packages, env vars, auth & permissions
- For monorepos: document internal inter-app APIs (e.g. backend API changes) and what they mean for consumer apps (e.g. frontend), at a high level with no implementation code. Describe interfaces with diagrams where helpful — no code references.>

## Boundary conditions & dependencies

<Verification of all boundary conditions:
- Consumer checks: If schemas, APIs, or input/output types changed or were removed,
  record proof from cross-repo searches (e.g. datacamp-engineering GitHub search via
  explore agent) confirming no active callers remain.
- Live prerequisites: If this work depends on another ticket, PR, or external change
  being live, record the check confirming it is deployed and ready.>

## Data flows

<How data moves across those external or inter-app boundaries — in, out, and where it rests. Use diagrams where helpful.>

## Areas of concern

<Flagged points: external risks, breaking changes, integration decisions needing resolution.
Resolve each with the requester before the plan; note resolutions here.>

## Documentation

<External documentation to update: API specs (OpenAPI), developer portals, shared contracts, Confluence pages, etc.>

## Open questions

<Questions routed to the plan (internal file/code choices) or back to spec. External boundary
and dependency questions are answered in External boundaries, Boundary conditions & dependencies,
and Data flows before the gate opens.>

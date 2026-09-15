# Dimension: Architecture & System Design (`architecture`)

Reviews structural boundaries, coupling, contracts, and data models.

## Diff mode

- **Component and module boundaries**: are responsibilities placed in the right component? Do changed components stay inside their existing boundaries?
- **Coupling and cohesion**: does the change couple previously independent modules, or introduce hidden dependencies between them?
- **Public interfaces and contracts**: naming, typing, stability, breaking changes to signatures or exported surfaces.
- **Cross-service/app communication**: sync vs async choice, timeouts, retries, idempotency, error handling across the boundary, contract versioning and backwards compatibility.
- **API design**: resource modeling, naming, error semantics, pagination, versioning.
- **DB schema design**: normalization, indexes for the queries this change will run, constraints and nullability, migration and rollback strategy, data-growth assumptions.
- **Consistency with existing architecture**: divergence from established patterns must be justified — flag unjustified divergence and also cargo-cult copying that contradicts the change's purpose.

## Spec / plan mode

Apply the same architectural questions to the proposed design, and additionally check that the plan covers rollout, migration/backfill, and rollback.

## What to look for

Structural risks: concrete changes that break public contracts, violate existing module boundaries, or couple previously independent components. Do **not** report subjective architectural dogma, speculative future requirements, or personal preferences.

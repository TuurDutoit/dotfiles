# Dimension: Documentation & Drift (`docs`)

Checks whether repo docs, READMEs, `AGENTS.md`, external docs, Confluence pages, or durable learnings need updating after a change. (Diff-driven only; never runs in spec/plan mode.)

## Diff mode

Check whether the change leaves documentation behind:
- **Internal repo docs**: do internal docs, `README.md`, `AGENTS.md`, or setup guides describe behavior, public interfaces, setup steps, or workflows that the change alters? Are they now stale or wrong?
- **External docs**: does any user-facing documentation describe what changed?
- **Confluence pages**: fetch linked/known Confluence pages when tooling allows; flag ones that need updates.
- **Durable learnings**: did the change surface a learning worth recording — in a new or existing skill, or a Jira ticket?

You may read the docs but must not edit anything — report gaps only.

## What to look for

Documentation that the change directly invalidates or makes stale. Do **not** report speculative documentation requests or generic "could add more docs" suggestions without a concrete broken doc. Verify each claim by reading the doc at the provided checkout path before reporting.

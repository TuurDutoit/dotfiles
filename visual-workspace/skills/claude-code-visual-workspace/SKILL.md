---
name: claude-code-visual-workspace
description: Use the local Visual Workspace MCP server for shared visual planning, anchored review comments, and revision-safe updates while working with a human.
---

# Visual Workspace for Claude Code

Use this skill for planning or exploration that needs a shared overview: a
multi-file change, architecture or data flow, uncertain product behavior, a risky
rollout, or a trade-off the human should review. Keep small, self-contained answers
in chat instead.

This is a local-first collaboration workspace, not a place to generate a giant
specification. Make a short, visually scannable draft that the human can edit and
comment on directly.

## MCP setup

Configure the project's `visual-workspace` MCP command in Claude Code using the
configuration emitted by:

```sh
npm run cli -- help
```

Use only the MCP tools for workspace data. Do not edit the `.visual-workspace/`
directory directly; that would bypass validation, revision tracking, anchors, and
raw-edit detection.

## Drafting a plan

1. List existing documents; use an active related document when possible.
2. Retrieve the document snapshot before changing it and note the document and
   block revisions.
3. Create or evolve a concise set of blocks. Use addressable, stable IDs for
   diagram nodes, file rows, milestones, decision options, risks, and code items.
4. Tell the user briefly that the plan is ready; keep the chat response a summary,
   not a duplicate of the document.

Choose blocks deliberately:

- `overview` for outcome, scope, status, and success measures.
- `architecture` for components and data/request flow.
- `file-map` for affected-file ownership and change mapping.
- `timeline` for ordered phases, dependencies, and rollout.
- `decision` for options and trade-offs.
- `risks` for uncertainties and open questions.
- `api-schema` or `code` for contracts or annotated implementation detail.
- `notes` only for compact supporting context.

Use a graph for relationships, a map/table for repeated mappings, and a timeline
for sequence. Add wireframes only when UI behavior matters. Do not embed executable
HTML, scripts, or untrusted MDX.

## Safe two-way editing

The human can edit the plan while you work. Make structured, block-level patches;
never overwrite the whole document.

For every patch, provide the latest `expectedRevision`, your named agent actor
(`kind: "agent"`, `client: "claude-code"`), and an `expectedBlockRevision` for each
existing block you change, move, or delete. State why in the patch summary.

Refresh before a patch after long exploration or feedback. If the service returns a
review-required conflict, do not force a retry:

1. Retrieve changes since your base revision and the latest snapshot.
2. Preserve the human's edit and understand the conflict.
3. Respond in the affected thread when useful, then make a narrower patch against
   the current revision.

If status is `needs_reconcile`, do not patch. The Markdown projection was modified
outside the structured workspace and needs review/reconciliation first.

## Feedback triage

Check unresolved threads before beginning a substantive update and before a final
handoff. Fetch scoped context for the exact block or thread before responding.

- Reply to the thread with the interpretation, outcome, and next action.
- Apply the needed small patch after replying when feedback requests a document
  change.
- Resolve only when the response/change is actually present and the request is
  complete; reopen if later evidence changes the result.
- Do not resolve or reopen an orphaned thread without re-anchoring it.

Finish by reporting the document, revision, what changed, and the unresolved
questions that still require a human decision.

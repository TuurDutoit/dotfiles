---
name: codex-visual-workspace
description: Use the local Visual Workspace MCP tools to create, review, and safely update a shared visual plan when work spans multiple files, decisions, risks, architecture, data flow, or UI behavior.
---

# Visual Workspace for Codex

Use this skill when a chat-only answer would hide important structure: an ambiguous
or multi-file change, architecture or data flow, a rollout, a risky decision, or a
UI interaction. Do not use it for a small, self-contained answer that is clearer in
chat.

The workspace is a shared, local-first review surface. It is not a dumping ground
for a long design document and it is not a generic canvas. Begin with a small,
purpose-built plan that a person can scan and edit.

## Connection

When the `visual-workspace` MCP server is configured, use its tools. The project
CLI prints the canonical MCP configuration with:

```sh
npm run cli -- help
```

Do not attempt to read or write `.visual-workspace/` files yourself. Use MCP tools
so validation, revisions, provenance, comment anchors, and path restrictions remain
intact.

## First draft

1. Call `workspace_list_documents`. Reuse the relevant active document; otherwise
   create one through the local API/UI or ask the human to create it if the client
   has no document-create tool.
2. Call `workspace_get_document` before proposing changes. Treat its `revision`
   and each block's `revision` as the current source of truth.
3. Draft only the blocks that clarify the decision. Give each block a short title,
   a scannable conclusion, and structured props with durable child IDs when it has
   addressable visual items.
4. Say in chat that the visual plan is ready and link/name the document if the
   client supports it. Keep the chat handoff short.

## Choose the smallest useful visual

| Situation | Use | Avoid |
| --- | --- | --- |
| Outcome, scope, status, success measure | `overview` | Repeating it in every block |
| Components, ownership, request/data flow | `architecture` with named nodes and edges | A diagram for a simple linear list |
| Files changed by a feature | `file-map` with stable row IDs | A prose directory dump |
| Sequencing, dependencies, rollout | `timeline` with milestone IDs | A decorative roadmap |
| Competing approaches | `decision` with options/trade-offs | Pretending a choice is settled |
| Uncertainty, hazards, unanswered questions | `risks` | Burying open questions in prose |
| Contracts, payloads, schema changes | `api-schema` or `code` | Unaddressable pasted code |
| Short context or a narrow rationale | `notes` | Turning notes into an essay |

Use diagrams for relationships, tables/maps for repeated mappings, and timelines
for sequence. Do not add a wireframe unless the work depends on UI behavior. Avoid
untrusted HTML/MDX or executable embeds.

## Revision-aware patching

Never replace an entire document. Call `workspace_apply_patch` with a fresh
`expectedRevision`, the named agent actor, and one or more small block operations.
For every existing block operation, include the current `expectedBlockRevision`.
Include a concise `summary` that tells the person why the change happened.

Before a patch, refresh the document if you have spent time exploring, received
feedback, or see a possible human edit. On a stale non-overlapping patch, the
service may rebase safely. On a review-required conflict:

1. Do not retry with newer revisions blindly.
2. Call `workspace_get_changes` and `workspace_get_document`.
3. Preserve the human's intent, explain the conflict in the relevant thread or
   chat, and prepare a narrower patch using the current block revisions.

If the document reports `needs_reconcile`, stop patching. A readable Markdown
projection was edited outside the workspace and must be reconciled in the local UI
or service before structured changes can safely resume.

## Comment loop

At the beginning of planning, and again before calling work complete, call
`workspace_list_comments` with `unresolvedOnly: true`.

- Use `workspace_scoped_context` with a thread or block ID before replying, so the
  reply addresses the exact anchored node, file row, milestone, decision option,
  risk, or code item.
- Reply with what you understood, what changed (or why it should not change), and
  the next action. Use `workspace_reply_comment`.
- Patch the plan when that is the appropriate response. A reply alone is not an
  implementation of a requested plan change.
- Resolve only after the requested response/change is visible. Use
  `workspace_set_comment_status` with `resolved`; leave ambiguous threads open.
- Reopen a thread when new evidence invalidates the resolution. Deleted target
  blocks orphan their threads; do not pretend their anchors are still valid.

Respect authorship: identify Codex as an `agent` with `client: "codex"`; never
impersonate a human actor.

## Handoff

Finish with a compact chat summary: document name, the key decision or remaining
risk, the revision reached, and unresolved threads requiring a human decision.

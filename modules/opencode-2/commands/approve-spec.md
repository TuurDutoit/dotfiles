---
description: "Approve a finished spec: mark it accepted, commit it, and hand off to a fresh build session."
---

You are approving a spec and handing it off for implementation. Follow these
steps in order.

## 1. Resolve the spec

Resolve the path to `spec.md` in this order:

1. The path Tuur passed as `$ARGUMENTS`.
2. The `spec.md` this session produced or reviewed.
3. The most recently created `spec.md` in the repo, following the
   artifact-location conventions of the `spec` skill.

If the path stays ambiguous, ask Tuur. Read the spec: if sections are
unfinished or genuinely open questions remain, stop and tell Tuur instead
of approving.

## 2. Mark accepted

In the line under the title, change `Status: draft.` to
`Status: accepted by Tuur on <YYYY-MM-DD>.` (keep any Author field; when
the doc has no status line, add one under the H1). When the spec lives
inside a git repo, commit the change following the repo's conventions —
handoff artifacts outside a repo get no commit.

## 3. Resolve this session's ID

opencode commands have no template variable for the session ID. Run
`opencode session list --format json -n 5`: this session is the entry in
this directory with the newest `updated` timestamp, because the command
prompt was just added to it. If the two newest entries tie, or the newest
entry is in another directory, ask Tuur instead of guessing.

## 4. Create the build session

Create a **new** `build` session with the `openchamber` tool
(`session.create`), passing `agent: "build"`, in the checkout directory of
the repo the spec belongs to; this session's directory when invoked from the
spec session. Leave the model unset. Title the session
`<project_slug> - implementation - <short task name>`, resolving
`<project_slug>` from the git remote as the `spec` skill does. Use exactly
this prompt:

> Implement this accepted spec: `<absolute path to spec.md>`. There is no
> separate plan.md — the spec's "Technical Architecture & Plan" section is
> the build plan. Follow the `delivery-workflow` skill: dispatch the
> `engineer` subagent immediately to execute the spec's Implementation
> Steps and its Verification & Proof checks, without replanning, then run
> the review and QA gates on the result. Finish by opening a PR with the
> `pr` skill and stop: Tuur reviews and approves it; merging and deployment
> happen through the `/merge-and-deploy` command in a later handoff.
>
> The spec was authored in session `<original session ID>`. If you need a
> decision or context from it, use the openchamber tool: `session.send` to
> that session ID, then `session.messages` with `wait` and `lastAssistant`
> to read the reply.

Implementation happens only in that new `build` session (which dispatches
its own `engineer` subagent) — never in this session, and never by
dispatching implementation from here.

## 5. Report

Tell Tuur: the spec's new status, the commit (when made), and the build
session's title. The session runs on its own — Tuur follows it in
OpenChamber; do not monitor it from here.
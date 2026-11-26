---
description: "Approve a finished plan and hand it off to a fresh build session in this worktree."
---

You are approving an OpenChamber plan and handing it off for implementation.
Follow these steps in order.

## 1. Resolve the plan

Call the `openchamber_knowledge` tool with `knowledge.list` (default
directory: this session's). Resolve the plan in this order:

1. `$ARGUMENTS`: a plan ID, or text that matches exactly one plan's title.
2. The plan whose `session.sessionId` equals this session's ID
   (`$OPENCODE_SESSION_ID` in the shell).

If no plan or more than one plan matches, ask Tuur. Read the file at the
plan's `path`. Unchecked steps (`- [ ]`) are the normal starting state, and
a step marked optional does not block. Stop and tell Tuur which items block
approval only when the plan has explicit open questions, placeholders such
as `TBD`, or a required decision that is still pending.

## 2. Title the session

Get this session's title: `opencode session list --format json`, the entry
whose `id` equals `$OPENCODE_SESSION_ID`.

- `<repo>`: if the title splits on ` - ` into three or more parts, its
  first part; otherwise the basename of `git remote get-url origin`
  (without `.git`).
- `<summary>`: if the title has three or more parts and the second part is
  `plan` (e.g. `LA - plan - UTM params`), everything after the second part;
  otherwise at most 4 words from the plan title, without a ticket prefix
  such as `LX-10001:`.

The title is `<repo> - implement - <summary>`.

## 3. Create the build session

Create a **new** session with the `openchamber` tool (`session.create`):
`agent: "build"`, the title from step 2, the default directory (this
session's worktree), the model unset, and no `ownWork` — the session is
Tuur's. Replace `<plan id>` with the plan's ID from step 1. Use exactly this
prompt:

> Implement accepted plan `<plan id>`. Find it with the openchamber
> knowledge tool (`knowledge.list` with `planId: "<plan id>"`), read the
> file at its path, and follow it without replanning. When the change is
> verified, open a PR with the `pr` skill and stop.

Do not change the plan's linked session. The implementation happens only
in that new session, never in this one.

## 4. Report

Tell Tuur the plan title and the new session's title. The session runs on
its own — Tuur follows it in OpenChamber; do not monitor it from here.
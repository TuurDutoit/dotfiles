---
description: "Hand an approved PR to a fresh build session: it merges the PR, monitors the deploy, and runs the spec's QA plan on staging and prod."
---

You are handing off an approved PR for merge, deploy monitoring, and QA.
Follow these steps in order.

## 1. Resolve the PR

Resolve the PR in this order:

1. The PR URL or number Tuur passed as `$ARGUMENTS`.
2. `gh pr view` in this checkout — the PR open for the current branch
   (this session's PR when invoked from the engineer session).

If no PR resolves, ask Tuur.

## 2. Verify the PR is ready

`gh pr view <pr> --json state,reviewDecision,mergeable,mergeStateStatus,headRefName`:

- `state` is `OPEN`. (Already `MERGED`? Note it and continue — the build
  session then skips straight to deploy monitoring.)
- `reviewDecision` is `APPROVED`. This command is only invoked once the
  PR is approved; if not, stop and tell Tuur.
- `mergeable` is `MERGEABLE`. If `mergeStateStatus` is `BLOCKED` (usually
  pending or failing required checks), stop and tell Tuur — CI fixes
  belong to the implementation session.

Hold the head branch name for the handoff prompt.

## 3. Resolve the spec

Resolve the path to the change's `spec.md` in this order:

1. The path Tuur passed as `$ARGUMENTS`.
2. The `spec.md` this session implemented or reviewed.
3. The most recently created `spec.md` in the repo, following the
   artifact-location conventions of the `spec` skill.

If it stays ambiguous, ask Tuur. A missing spec is not fatal: pass no
spec path, and the build session will ask Tuur for a QA plan — the
`monitor-deploy` skill forbids writing one on the fly.

## 4. Resolve this session's ID

opencode commands have no template variable for the session ID. Run
`opencode session list --format json -n 5`: this session is the entry in
this directory with the newest `updated` timestamp, because the command
prompt was just added to it. If the two newest entries tie, or the newest
entry is in another directory, ask Tuur instead of guessing.

## 5. Create the build session

Create a **new** `build` session with the `openchamber` tool
(`session.create`), passing `agent: "build"`, in the checkout directory of
the repo the PR belongs to — this session's directory when invoked from
the engineer session. Leave the model unset. Title the session
`<project_slug> - deploy - <short task name>`, resolving `<project_slug>`
from the git remote as the `sdlc` skill does. Use exactly this prompt:

> Merge PR `<PR URL>` (branch `<head branch>`) — it is approved and
> mergeable. If it is already merged, skip the merge. After the merge,
> load the `monitor-deploy` skill and follow it end to end: the CircleCI
> workflow, the version tag, the Concourse pipeline, staging QA, prod QA,
> and the Jira ticket lifecycle. The QA plan for staging and prod lives
> in the spec doc at `<absolute path to spec.md>` — pass it to the
> `tester` subagent verbatim, exactly as the skill requires.
>
> The implementation was done in session `<original session ID>`. If you
> need context, a decision, or code knowledge from it, use the openchamber
> tool: `session.send` to that session ID, then `session.messages` with
> `wait` and `lastAssistant` to read the reply.

The merge, deploy monitoring, and QA happen only in that new `build`
session — never in this session, and never through a subagent or Task
dispatch. (The build session itself dispatches the `tester` subagent for
QA, as the skill directs.)

## 6. Report

Tell Tuur: the PR's verified state, and the build session's title. The
session runs on its own — Tuur follows it in OpenChamber; do not monitor
it from here.

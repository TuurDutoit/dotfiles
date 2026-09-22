---
description: "Approve a finished spec: mark it accepted, commit it, and hand off to a fresh engineer session."
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

## 3. Create the engineer session

Create a **new** `engineer` session with the `openchamber` tool
(`session.create`), in the checkout directory of the repo the spec belongs
to — this session's directory when invoked from the spec session. Leave
the model unset. Title the session
`<project_slug> - implementation - <short task name>`, resolving
`<project_slug>` from the git remote as the `sdlc` skill does. Use exactly
this prompt:

> Implement this accepted spec: `<absolute path to spec.md>`. There is no
> separate plan.md — the spec's "Technical Architecture & Plan" section is
> the build plan; execute its Implementation Steps, then its Verification
> & Proof checks.

The implementation happens only in that new `engineer` session — never in
this session, and never through a subagent or Task dispatch.

## 4. Report

Tell Tuur: the spec's new status, the commit (when made), and the engineer
session's title. The session runs on its own — Tuur follows it in
OpenChamber; do not monitor it from here.
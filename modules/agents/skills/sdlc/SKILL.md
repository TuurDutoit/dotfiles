---
name: sdlc
description: AI-native SDLC process — capture intent, write spec, write architecture, write plan, implement, verify. Use when starting any new task (feature, bug fix, refactor, chore), writing or updating intent.md, spec.md, architecture.md, or plan.md, or recording an architecture decision as an ADR. Applies throughout a task's lifecycle, from capture to implementation to verification.
---

# SDLC: intent → spec → architecture → plan → implement → verify

Every stage ends by producing one artifact the next stage reads. The chain of
artifacts is the audit trail: what was asked for, what was decided, how it was
built. Historical context lives in git history.

Each stage closes with the automated review loop below before the work moves
on. The human gate is approval of the final output, not first-line review.

## Artifact location

Every task gets its own directory holding `intent.md`, `spec.md`,
`architecture.md`, and `plan.md` (each written only when its stage runs —
a skipped stage leaves no file). Resolve the directory in this order:

1. **Explicit path.** If the requester named a destination, use it.
2. **AGENTS.md instruction.** If the repo's `AGENTS.md` (or `CLAUDE.md`) says
   where task, spec, or planning documents live, follow it.
3. **Existing task directory.** If the repo already has a directory for this
   (e.g. `docs/tasks/`, `docs/specs/`, `specs/`, `tasks/`), follow its layout
   and naming conventions.
4. **Fallback: handoffs.** Otherwise create:

   ```
   ~/Documents/Obsidian/DataCamp/Agents/Handoffs/<repo-name>/<task-slug>/
   ```

The task-slug is `YYYY-MM-DD-<type>-<slug>` — e.g.
`2026-09-08-feat-github-integration` — where `<type>` is one of `feat`,
`fix`, `refactor`, `chore`, and `<repo-name>` is the repository's directory
name. Use the same convention wherever the artifacts live.

Artifacts inside the repo are committed as they are accepted — git history is
the audit trail. Fallback artifacts live outside git; write them, and no
commit applies.

## Process

Scale the stages to the task: a stage's doc may be only a few lines when
little needs saying, and a stage with nothing to say is skipped entirely —
no file. A new tool for an AI agent, for example, needs a spec of just a
few lines: how the tool shows up in the conversation, how its permissions
work. A small UI tweak touches no boundary and skips the architecture doc.

1. **Capture intent.** Write the problem in the originator's own terms — what
   is wanted, why, constraints, open questions. No formal language required.
   Start from the intent template. Commit once the originator confirms it is
   correct.

2. **Write the spec — the user experience.** What the feature looks and
   feels like for users: surfaces, flows, states, permissions as the user
   meets them. Codebase internals are not spec material — those belong to
   the architecture and the plan. Start from the spec template. Resolve
   flagged concerns with the requester before moving on. Commit the
   accepted spec.

3. **Write the architecture — the boundaries.** The external interfaces
   that power the experience: API / DB / config schemas, data flows,
   packages to install, env vars and auth. Only what crosses a boundary —
   internal structure is the plan's business. Start from the architecture
   template. Commit the accepted architecture.

4. **Write the plan before writing code.** The implementation: the files
   that change and in which modules, the naming (follow the project
   glossary / DDD terms), the order of work, the risks, and the tests that
   prove it. Iterate until someone who never saw the conversation could
   implement from the plan alone. Commit the accepted plan. If
   implementation departs from the plan, update `plan.md` in the same
   commit.

5. **Verify the work.** Tests and executable specs live alongside the code,
   runnable from the terminal with one command, so the work can be checked
   mechanically. Never weaken a test to make code pass.

6. **Record architecture decisions as ADRs.** When a choice shapes the
   system's structure and is hard to reverse, record it as an ADR. ADRs
   document the codebase, so they live in the repo: follow an `AGENTS.md`
   instruction first, then an existing ADR directory (`docs/adr/`, `adr/`,
   ...), otherwise create `docs/adr/`. Name files `NNNN-kebab-title.md`,
   numbered sequentially. Start from the ADR template. ADRs are immutable
   records — supersede, never edit a decision away.

7. **Close out.** When the task is done, the task directory stays as
   historical context. Ensure each doc's Status reflects reality (draft →
   accepted → implemented).

## Automated review loop

Run this at the end of every stage — steps 1–4 for docs, step 5 for code. The
implementer agent does not wait for the human: as soon as its output is ready,
it starts a reviewer session (via the available session tooling — e.g.
OpenChamber's session actions) with this brief prompt:

> Use the `multi-review` skill. Review `<path to the file>` (or: the
> uncommitted changes). Send your findings back to session
> `<implementer session id>` — the comments come from another agent, not the
> user.

Don't check on the reviewer session — it runs independently and will send its findings back to the implementer session, waking it up.

The implementer addresses the findings, then prompts the same reviewer session
to re-review, with a list of the changes made: for each finding, say what you did to address it.
The reviewer session checks the changes, and either reports more findings or confirms that the output is now acceptable.
Keep going until the reviewer reports no important findings.

Then ask Tuur to review the final output. On approval, merge the changes, and
start a new session for the next stage. Tell that session only the path of the
previous stage's output file — it reads its context from the artifact, e.g.:

> `<task dir>/intent.md` is accepted. Write the spec for it.
>
> `<task dir>/spec.md` is accepted. Write the architecture for it.

## Document templates

Copy the matching template from `references/templates/` into the task
directory (or the ADR directory) and fill it in:

- `references/templates/intent.md` — the problem, in the originator's terms
- `references/templates/spec.md` — the user experience
- `references/templates/architecture.md` — the boundaries: API / DB /
  config schemas, data flows, packages, env vars, auth
- `references/templates/plan.md` — implementation plan
- `references/templates/adr.md` — architecture decision record

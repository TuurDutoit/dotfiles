---
name: "sdlc"
description: "AI-native SDLC process — capture intent, write spec, write architecture, write plan, implement and verify, one stage per agent session in the `spec` (intent, spec, architecture, plan) or `engineer` (implement) agent. Use when starting any new task (feature, bug fix, refactor, chore), when writing or updating intent.md, spec.md, architecture.md, or plan.md, or when recording an architecture decision as an ADR."
---

# SDLC: intent → spec → architecture → plan → implement → verify

Every stage ends by producing one artifact the next stage reads. The chain of
artifacts is the audit trail: what was asked for, what was decided, how it was
built. Historical context lives in git history.

Each stage closes with the loops below — open questions first, then review —
and its output moves on only when the stage gate opens. The human gate is
approval of the final output, not first-line review.

## The stages

Scale the stages to the task: a stage's doc may be only a few lines when
little needs saying, and a stage with nothing to say is skipped entirely —
no file. A new tool for an AI agent, for example, needs a spec of just a
few lines: how the tool shows up in the conversation, how its permissions
work. A small UI tweak touches no boundary and skips the architecture doc.

Keep every artifact brief and to the point, written in plain language for
a reader with no context — no jargon; explain technical terms simply. For
a simple feature that means an intent of only a few lines, a short spec,
and an architecture that is little more than the schema diffs.

| Stage | Produces | Runs as |
| --- | --- | --- |
| 1 Intent | `intent.md` — the problem in the originator's own terms | `spec` — `sdlc-intent` |
| 2 Spec | `spec.md` — the user experience | `spec` — `sdlc-spec` |
| 3 Architecture | `architecture.md` — the boundaries: API / DB / config schemas, data flows, packages, env vars, auth | `spec` — `sdlc-architecture` |
| 4 Plan | `plan.md` — files that change, naming, order of work, risks, proof | `spec` — `sdlc-plan` |
| 5 Implement + verify | working code, tests alongside it, statuses closed out | `engineer` — `sdlc-implement` |

When any stage makes a choice that shapes the system's structure and is hard
to reverse, record it as an ADR (below).

## Stage scope

Each stage looks at a narrower slice than the last, and its artifact talks
only about that slice. A stage that wanders outside its scope pollutes every
later artifact — code references in the intent, internal choices in the
spec. Each stage stays inside its scope:

| Stage | May look at | Artifact talks about | Owns questions about |
| --- | --- | --- | --- |
| Intent | the originator and their sources (tickets, docs) — never the codebase | the problem and wanted outcome, in the originator's terms | what the originator can answer |
| Spec | the product as users meet it; code only to see how it works today | behavior the user can observe | what the experience should be |
| Architecture | code and systems, to learn interface shapes and current data flows | boundaries: API / DB / config schemas, data flows, packages, env vars, auth | interfaces: shapes, auth, config, behaviour at boundaries |
| Plan | the codebase, thoroughly | the change: files, naming, order of work, risks, proof | how to build it |
| Implement | the code, per the plan | the code and its tests | nothing new — departures update the plan |

Questions belong to the stage whose scope covers them. A stage answers
every question its scope covers before its gate opens — by looking inside
its scope, or by asking Tuur. A question outside the stage's scope is not
parked there: the artifact routes it to the stage that owns it, and it
gates that stage instead. In practice: the intent names systems, not
files; the spec describes behavior, not modules; the architecture names
interfaces, not the files implementing them; the plan is the first
artifact allowed to name files.

## One stage per session

Each stage is executed in a session of its own: the `spec` agent runs the
intent, spec, architecture, and plan stages, and the `engineer` agent runs
the implement stage. That session loads this skill for process context, plus
the stage's `sdlc-*` skill for the stage instructions. The `sdlc-*` skills are
restricted to the `spec` and `engineer` agents — if you are any other agent,
don't execute a stage yourself; make the handoff below instead.

### Session naming

When an agent loads this skill and determines which step it is running, it must
rename its own session to:

```
<project_slug> - <step> - <issue_name>
```

Example: `learn-hub - intent - AI Tutor user restrictions`

- **`<project_slug>`**: Resolved from the git remote (e.g. `https://github.com/datacamp-engineering/learn-hub` or `git@github.com:datacamp-engineering/learn-hub.git` → `learn-hub`). With no remote, fall back to the canonical checkout directory name.
- **`<step>`**: The step currently being executed, one of: `intent`, `spec`, `architecture`, `plan`, `implementation`.
- **`<issue_name>`**: A short descriptive name based on the ticket passed or the changes requested.

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
`fix`, `refactor`, `chore`. Use the same convention wherever the artifacts
live.

Resolve `<repo-name>` from the git remote, never from the current
directory's basename — in a git worktree that basename is the worktree
name, not the repo:

1. **Git remote.** Run `git remote get-url origin` (or the first remote)
   and take the repository basename from the URL, dropping `.git` — e.g.
   `git@github.com:TuurDutoit/dotfiles.git` → `dotfiles`.
2. **Canonical checkout.** With no remote, use the name of the repo's
   canonical checkout under `~/Projects`: the main worktree's directory
   name (first row of `git worktree list`). When the current directory is
   that main worktree, this is just the directory name.

Artifacts inside the repo are committed as they are accepted — git history is
the audit trail. Fallback artifacts live outside git; write them, and no
commit applies.

## Open questions and review loop

Run these in order at the end of every stage except intent — intent skips
both loops entirely (Tuur's approval is the only check there). The review
dimensions to request are named in each stage's `sdlc-*` skill.

### Open-questions loop

Run this before the review loop. List the open questions: those the artifact
marks as open, plus any raised during the stage. Every question this stage's
scope covers must end with an answer recorded in the artifact:

1. Gather all currently open questions in scope.
2. Ask Tuur with the built-in `question` tool — one call listing all of
   them, with options where possible.
3. Update the artifact with each answer, turning it from open into decided.
4. Repeat until no open questions in scope remain.

Questions outside the stage's scope are never guessed, parked, or
half-answered: route each one in the artifact to the stage that owns it, and
it gates that stage instead.

### Review loop

As soon as the open-questions loop has closed, run the review as a subagent: dispatch
the `reviewer` agent through the Task tool — not as a
separate session — with this brief prompt:

> Review `<path to the file>` (or: the uncommitted changes) with these
> dimensions: `<the stage's dimensions>`. Your findings go back to the
> dispatching agent — the comments come from another agent, not the user.

The reviewer runs the `review` skill autonomously.
The call blocks until the review is done, and the findings arrive as the
subagent's report. Keep the `task_id` from the result. Address the findings,
then resume the same reviewer by calling the Task tool again with that
`task_id`, with a list of the changes made: for each finding, say what you
did to address it. The resumed reviewer continues with its earlier findings
in context, re-reviews the changes, and either reports more findings or
confirms that the output is now acceptable. Keep going until the reviewer
reports no important findings.

### Stage gate

The stage gate decides whether the output moves on. It opens only when all
three conditions hold — until then, the stage is not done and the next stage
does not start:

1. **Reviewer accepted.** The reviewer subagent confirms the output is
   acceptable — or Tuur explicitly overrides its rejection and moves on
   anyway. The intent stage has no reviewer; there, Tuur's approval alone
   satisfies this condition.
2. **No open questions in scope.** The open-questions loop above has closed:
   every question this stage's scope covers — in the artifact or raised
   during the stage — has an answer, recorded in the artifact.
3. **Tuur approved.** Tuur has explicitly approved this stage's output. No
   response is not approval — ask, and wait for the answer.

With all three met, merge the changes, and make the handoff.

## Handoff

When the stage gate opens, the next stage starts in a new session of its own
agent — `spec` for intent, spec, architecture, and plan; `engineer` for
implement — never in this one; a fresh session reads its context from the
artifacts. Start it (via the available session tooling) and tell it in one
short sentence what to do, naming the previous stage's output file, e.g.:

> Write a spec doc for this intent: `<task dir>/intent.md`

Each stage's `sdlc-*` skill names the sentence to hand forward from that
stage. To start a new task, hand off the same way:

> Capture the intent for this: <what is wanted, in one sentence>

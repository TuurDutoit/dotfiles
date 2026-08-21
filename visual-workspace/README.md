# Visual Workspace

Visual Workspace is a local-first review surface for plans that are too connected
for a chat transcript. It gives a human and a coding agent one shared document:
short visual blocks for the overview, direct browser edits, stable comment threads,
and revision-aware agent patches that never silently replace a human's work.

It is deliberately a focused planning workspace, not a remote document product or
a generic page builder. The included demo is a multi-file saved-views feature plan
with an outcome, request/data-flow diagram, affected-file map, milestones, decision,
risks, and API shape.

## Quick start

Requires a current Node.js installation and npm.

```sh
npm install
npm run ui:build
npm run cli -- init --workspace /absolute/project/path
npm run cli -- demo --workspace /absolute/project/path
npm run cli -- serve --port 4318 --workspace /absolute/project/path
```

Open [http://127.0.0.1:4318](http://127.0.0.1:4318) after the server starts. It
serves the built browser client and its JSON API from the same local origin. The
server prints its actual address at startup. Use `--port` to choose another port.
It binds only to loopback unless you explicitly pass `--lan`, which exposes it on
`0.0.0.0`.

For browser-only iteration, `npm run ui:dev` starts Vite. Use the built-and-served
flow above for the full local review workspace, because the production server keeps
the browser and `/api` same-origin.

For the full command reference:

```sh
npm run cli -- help
```

Useful document commands:

```sh
npm run cli -- doc list --workspace /absolute/project/path
npm run cli -- doc export <document-id> --workspace /absolute/project/path
npm run cli -- doc reconcile <document-id> --actor-id tuur --actor-name Tuur --workspace /absolute/project/path
```

## How collaboration works

Each document has ordered blocks with stable UUIDs, a document revision, a revision
per block, authorship, timestamps, and a small set of visual types:

- Overview/status, architecture/data flow, file map, milestones, decision,
  risks/open questions, code, API/schema, and compact notes.
- Addressable child items such as diagram nodes, file rows, milestones, decision
  options, risks, and code items.
- Comment threads that anchor to a block or one of those child items—not a fragile
  character offset.

The browser lets a reviewer edit a block, choose a precise comment target, reply,
resolve, or reopen a thread. The workspace records UI state, comments, revision
provenance, and conflicts locally so a reload preserves the review trail.

Agents use structured block-level patches. A patch carries the document revision it
was based on and each existing block's revision. A stale patch affecting untouched
blocks can safely rebase; a patch that overlaps another edit is rejected with a
review-required conflict. Neither side is overwritten. Agents should fetch the
latest document/changes, understand the human change, then make a smaller current
patch.

`document.md` is a readable export rather than an editing API. If it changes outside
the workspace, its hash is detected and the document is marked `needs_reconcile`.
Structured patches pause until reconciliation, keeping anchors intact instead of
guessing how raw text maps back to blocks. Reconciliation explicitly validates the
canonical blocks and comment anchors, restores the canonical Markdown projection,
and records an auditable `reconcile_projection` revision. It intentionally does not
attempt to parse raw Markdown back into blocks.

## MCP: Codex

Run the local MCP server from the project root:

```sh
npm run mcp -- --workspace /absolute/project/path
```

Use this MCP configuration for either agent client (replace the workspace path with
an absolute path):

```json
{
  "mcpServers": {
    "visual-workspace": {
      "command": "npm",
      "args": ["run", "mcp", "--", "--workspace", "/absolute/project/path"],
      "cwd": "/absolute/project/path"
    }
  }
}
```

The MCP surface includes document creation, snapshots and changes, revision-aware
patches, unresolved-comment triage, create/reply/status actions, explicit
projection reconciliation, and scoped context for an exact block or feedback
thread. Feedback actions produce revision events and `get_changes` returns their
touched comment threads, so an agent can discover feedback without polling the
entire document. It uses the same `WorkspaceService` as the CLI, browser API, and
storage layer.

Agent behavior is documented in the checked-in local skill:

- [`skills/codex-visual-workspace/SKILL.md`](skills/codex-visual-workspace/SKILL.md)

Install/copy the skill into the agent client's configured project or personal
skills directory. It explains how to select a visual, apply a safe patch, and
triage comments.

## Local data, export, and deletion

All workspace data stays below the selected project directory:

```text
.visual-workspace/documents/<document-id>/
  document.json       canonical structured document
  comments.json       anchored comment threads and replies
  revisions.json      revision/provenance history
  ui-state.json       local review UI state
  document.md         readable export/projection
```

The JSON files are human-readable and are the canonical local records. Export a
document with `doc export`. Delete a document through the browser/API document
delete operation; it removes only that validated document directory. Storage rejects
unsafe IDs, path escapes, and symlinked document directories.

## Privacy and security

- No account, SaaS backend, telemetry, hosted document store, or external AI/API
  call is required by this project.
- The HTTP service defaults to `127.0.0.1`; LAN exposure needs explicit `--lan`.
- HTTP payloads and MCP inputs are schema-validated. The request body limit is 1 MB.
- Document storage accepts opaque UUID document IDs only and uses atomic writes.
- Blocks contain data, not executable embedded HTML/MDX. Do not add scripts or
  untrusted embeds to plans.

## Architecture and verification

`WorkspaceService` is the sole mutation boundary. Storage, CLI, HTTP, MCP, and the
browser are adapters around it. See [ARCHITECTURE.md](ARCHITECTURE.md) and
[web/API-CONTRACT.md](web/API-CONTRACT.md) for the compact model and browser API.

Run the checks:

```sh
npm run typecheck
npm run lint
npm run test
npm run ui:check
npm run ui:build
```

## Current MVP limits

- Local single-workspace persistence; no hosted sharing, accounts, or permissions.
- No CRDT or real-time multi-user synchronization; concurrent edits use safe
  revision conflicts and review.
- No plugin marketplace or arbitrary embedded HTML/MDX execution.
- Raw Markdown exports are detected but are not automatically parsed back into the
  canonical block model; a human must reconcile them.
- The visual vocabulary is intentionally small. Add a visual only when it makes a
  relationship, mapping, or sequence easier to review than concise text.

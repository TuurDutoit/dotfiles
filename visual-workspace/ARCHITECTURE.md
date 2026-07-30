# Visual Workspace architecture (MVP)

The workspace is local-first. `WorkspaceService` is the only mutation boundary;
future HTTP, CLI, MCP, and browser adapters call it rather than touching files.

Each document lives under `.visual-workspace/documents/<opaque-id>/`. Its canonical
state is `document.json`, with comments, revision provenance, and UI state stored
alongside it. `document.md` is a readable export/projection only. Atomic temp-file
renames prevent partial writes. IDs are validated opaque UUIDs and storage never
accepts arbitrary file paths or follows document symlinks.

Agents submit revision-aware, block-level patches. A stale patch rebases only if its
touched blocks/order are unchanged since the requested base revision. Otherwise it
is atomically rejected, persisted as a review-required conflict, and neither party's
work is lost. Semantic comment anchors refer to a block and optional structured child
ID (node, file row, milestone, decision option, risk, or code item), never text offsets.

Raw projection edits are detected by a SHA-256 hash; they mark a document
`needs_reconcile` without changing the canonical state or comment anchors. v1
intentionally excludes CRDT syncing, remote sharing/auth, plugins, and arbitrary
HTML/MDX execution.

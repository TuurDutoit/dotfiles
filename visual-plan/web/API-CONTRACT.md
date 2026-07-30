# Browser API contract

The UI uses only the loopback server's `/api` surface. All responses are JSON.

- `GET /api/documents` → `{ documents: WorkspaceDocument[] }`
- `GET /api/documents/:id` → snapshot: `{ document, comments, revisions, uiState }`
- `GET /api/documents/:id/changes?since=<revision>` → revisions plus blocks and
  comment threads touched since that revision
- `POST /api/documents/:id/patch` → snapshot; body is the revision-aware patch request
- `POST /api/documents/:id/reconcile` → snapshot; body `{ actor }`. It is available
  only for a `needs_reconcile` document and restores the canonical Markdown projection
  after validating its structured blocks and semantic comment anchors.
- `POST /api/documents/:id/comments` → comment thread; body `{ anchor, body, actor }`
- `POST /api/documents/:id/comments/:threadId/replies` → thread; body `{ body, actor }`
- `POST /api/documents/:id/comments/:threadId/resolve|reopen` → thread; body `{ actor }`
- `PUT /api/documents/:id/ui-state` → snapshot; body is the UI-state object

The browser always sends a named human actor. The patch route must preserve the
service's `ReviewRequiredError` as a non-2xx JSON `{ error: { code, message } }` response so the UI
can display a review/conflict state rather than overwriting user work.

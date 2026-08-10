# Register and validate a code-along source workbook

Code-along template registration and Workspace Event capacity are separate. Registration makes a source workbook a protected code-along template and exempts its copies from the normal three-workspace limit; it does not create a Workspace Event, select `collab-medium-events`, or reserve cluster capacity.

Use the production admin page:

`https://www.datacamp.com/datalab/admin/code-along-templates`

Only an authorized DataLab admin should mutate this list, and the final Workspace URL and key require explicit approval.

## Validate the source before registration

1. Freeze the attendee-ready version and confirm its DataLab language matches the event plan.
2. Inspect the entire project tree, including hidden paths. Remove accidental repositories (`.git`), virtual environments, package caches, generated output, dependency trees, checkpoints, and directories containing hundreds or thousands of support/training files.
3. Inspect total file count and total bytes. The audited process documentation gives no universal safe numeric threshold. For a high count of small files or substantial total size, simplify the workbook or ask the content-syncer owner to review it; do not invent a cutoff.
4. Remove secrets, credentials, tokens, private datasets, and attendee-inappropriate output. Confirm every remaining external data source is accessible to attendees.
5. From a fresh attendee-like account, copy the source and open every notebook used in the event. Run the expected setup and a representative cell. Record copy/open latency and content-sync errors.
6. Keep the source stable after validation. Repeat validation and capacity review after a material file-tree or language change.

Copy/open surges exercise `yjs-content-syncer` even when session capacity is sufficient. Feed observed copy behavior and expected concurrency into [cluster-scaling.md](cluster-scaling.md).

## Register in the dashboard

1. Open **DataLab Admin → Code-Along Workspaces** at the URL above.
2. Check the table first. The database requires unique keys and workspace IDs.
3. Click **Configure Workspace As Code-Along**.
4. Enter the full **Workspace URL** containing `/w/<workspace-id>/`; the frontend extracts the segment after `w`.
5. Enter a non-empty **Key** with no whitespace. Use a stable descriptive slug. Historical guidance requires a `packt-` prefix for Packt material; avoid a `packt` prefix for other events because the backend classifies any such prefix as Packt.
6. Present the exact workspace ID and key for approval, then click **Create**.
7. Wait for success, confirm the expected table row, and open its workspace link.

The UI only validates the key's non-empty/no-whitespace shape. The database enforces unique key, unique workspace ID, and existing workspace ID. A generic failure toast is not evidence of success; resolve the conflict and verify the row.

## Verify the attendee path

Use the event's real copy link or product flow from a fresh eligible account. Confirm the copy derives from the intended source, does not count against the normal workspace limit, contains the frozen files/language, opens and syncs, and starts a session in the intended language.

Registration prevents the source workspace from being deleted through normal product behavior. Removing the registration is therefore a meaningful production mutation; do it only for an obsolete/mistaken record with approval and after checking published attendee links.

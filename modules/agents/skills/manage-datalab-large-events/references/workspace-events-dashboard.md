# Workspace Events and code-along dashboard operations

## Authorization boundary

These are production writes. First prepare the exact row and obtain explicit approval to create, edit, or delete it. Use an authorized Admin account in the DataLab UI. Do not call private write APIs directly and never call multiplexer `POST /admin/pool-events`.

## Workspace Event fields

Open:

`https://www.datacamp.com/datalab/admin/workspace-events`

The form contains:

- **Name**: human-readable event identifier;
- **Group slug**: exact owning paying-group slug, with no whitespace;
- **Language**: Python 3.8, Python 3.10, Python 3.12, R 4.2, or R 4.4;
- **Runtime config**: `collab-small`, `collab-medium`, or `collab-medium-events`;
- **Min pool size**: non-negative integer additive contribution;
- **Min total running**: non-negative integer additive contribution;
- **Start date/time + timezone** and **End date/time + timezone**, with start before end;
- **Note**: operator context, assumptions, change owner, and rollback reference.

The UI does not expose the buffer: create/update requests use 120 minutes. Effective routing and pool contribution begin two hours before the entered start and persist until two hours after the entered end.

Create one row per continuous session window. For sessions separated by a day or week, use separate rows with their own additive calculations and approvals. A single merged interval would keep event routing and capacity active between sessions.

## Pre-create checklist

1. Verify entitlement, group ownership, and exact group slug from the source workspace/group.
2. Verify `WORKSPACE_EVENTS_DB_BACKED` is enabled in the live collab API environment. The source default is `true`, but live state is authoritative. If disabled, the dashboard does not sync events and runtime routing uses the legacy hardcoded path; stop and involve the service owner.
3. Map the selected language to editor and shard.
4. List all dashboard events whose hidden buffered windows overlap. Split the proposed window at every matching event start/end and calculate the combined contribution in each segment.
5. Refuse an overlapping same-group row with a different runtime until owners resolve it.
6. Calculate additive values using the live base and the minimum combined overlapping contribution across all segments. Show the transition table and arithmetic.
7. Convert entered and buffered windows to UTC; check DST/timezone behavior.
8. Capture manual shard/HPA baselines separately; the dashboard cannot roll those back.
9. Obtain explicit approval for the exact form values and production target.

## Create or edit

1. Open **Workspace Events** and re-read the event list immediately before writing.
2. If the overlap set changed, stop and recalculate.
3. Create the row, or edit the identified row, using exactly the approved values.
4. Include enough context in **Note** to identify the requester, expected peak, sizing decision, related event/source, and manual-change record.
5. Submit once. Record the row ID/name and timestamp.
6. Watch sync status. The page polls pending rows about every 10 seconds; the sync cron runs about every 30 seconds and the multiplexer reload is also about 30 seconds.
7. Do not proceed until the row says **Synced** and effective pool transitions match the approved sum.

If status remains pending, reports an operator error, or the resulting transition differs, stop. Do not retry by sending the admin API payload or editing a ConfigMap. Preserve the prior valid configuration and escalate with row details and service logs/status.

## Verify routing, not only pool size

A synced row does not mean every attendee is eligible for its runtime. Verify with a representative group-owned workspace that:

- the workspace belongs to the approved paying group;
- the session receives the intended editor/runtime during the buffered window;
- a session starts and a warm replacement is observed;
- user-owned and non-paying workspaces still follow normal routing.

Remember the `datacamp-teams` special case: any active Workspace Event can route that group to `collab-medium-events`. Include it in cross-event risk review.

## Edit, end early, or delete

Treat each as a fresh production write requiring explicit approval.

1. Re-read overlaps and live capacity.
2. Explain how the edit/delete changes both group routing and additive pool floors.
3. Confirm attendee traffic no longer depends on the row before shortening or deleting it.
4. Apply through the dashboard.
5. Wait for **Synced** and verify removal/update from effective transitions.

Normal closeout needs no early delete: contributions end automatically after the hidden post-event buffer. Manual cluster changes still require explicit rollback.

## Register a code-along source

Source registration is separate from Workspace Events and capacity. It marks the workspace as a protected code-along template and causes copies not to count toward the normal three-workspace limit; source templates cannot be deleted while registered.

Follow the complete validation and registration runbook in [code-along-source.md](code-along-source.md). The concise UI sequence below is only a checklist.

Open:

`https://www.datacamp.com/datalab/admin/code-along-templates`

Before approval:

1. Open the source workspace and verify it is the intended immutable template.
2. Inspect it for accidental `.git` directories, generated environments, caches, or thousands of small files; estimate total size.
3. Perform a representative copy and open test. No authoritative numeric file-count or size ceiling was found, so do not claim one.
4. Choose a stable key with no whitespace. For Packt material, historical guidance requires a `packt-` prefix.
5. Verify the key and workspace are not already registered.

After explicit approval, select **Configure Workspace As Code-Along**, enter the full **Workspace URL** and approved **Key**, and create the record. The UI extracts the workspace ID from the `/w/<workspace-id>/...` URL. Verify the table shows the expected workspace ID/key and open its link.

Deleting a template registration is also a production write. Confirm downstream copy links and deletion protection implications before approval and verify the row disappears afterward.

## Evidence to retain

- Screenshot or exported values of the approved row and final `Synced` state.
- Entered and hidden-buffered windows in local time and UTC.
- Additive arithmetic and overlap list used at submission time.
- Representative routing/session/copy result.
- Code-along workspace ID/key, if applicable.
- Manual cluster change record and rollback values, if applicable.

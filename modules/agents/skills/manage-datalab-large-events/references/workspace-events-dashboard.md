# Workspace Event capacity configuration

## Authorization boundary

Creating a row or correcting its planned values is a production write. First prepare the exact values and obtain explicit approval. Use an authorized Admin account in the DataLab UI. Do not call private write APIs directly and never call multiplexer `POST /admin/pool-events`.

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

## Create or correct a planned row

1. Open **Workspace Events** and re-read the event list immediately before writing.
2. If the overlap set changed, stop and recalculate.
3. Create the row, or correct the identified planned row, using exactly the approved values.
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

## Automatic lifecycle

The row remains in the dashboard as the historical event record. Its routing and additive pool contribution become inactive automatically at the entered end plus the hidden 120-minute post-buffer. Manual shard and Yjs HPA changes are separate runtime overrides and still require the captured-baseline rollback.

## Evidence to retain

- Screenshot or exported values of the approved row and final `Synced` state.
- Entered and hidden-buffered windows in local time and UTC.
- Additive arithmetic and overlap list used at submission time.
- Representative routing/session-start result and, when Yjs scaling is relevant, attendee copy/open result.
- Manual cluster change record and rollback values, if applicable.

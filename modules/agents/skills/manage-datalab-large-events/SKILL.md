---
name: manage-datalab-large-events
description: Plan, prepare, operate, verify, and unwind capacity for large DataCamp DataLab live trainings, webinars, code-alongs, and company events on the Kubernetes multiplexer. Use when an event may create a burst of concurrent DataLab workspaces or document copies, when creating or changing Workspace Events, registering code-along templates, pre-scaling language shards or the Yjs content syncer, investigating overlapping events, or restoring temporary capacity afterward.
---

# Manage DataLab Large Events

Use this skill to turn event demand into a reviewable capacity plan, apply only approved changes, and restore every temporary override from a captured baseline. Treat the Workspace Events dashboard, multiplexer pool configuration, overprovision deployments, and Yjs content-syncer HPA as distinct controls.

## Safety contract

- Start in planning mode. Do not create, edit, or delete a Workspace Event; register a code-along template; run a mutating cluster operation; or scale down without explicit user approval for that action and target environment.
- Confirm the production target and current state immediately before every write. Never infer live values from repository defaults or historical documents.
- Never write directly to `POST /admin/pool-events`. It replaces the complete event list and is reserved for the dashboard sync service.
- Never invent a ConfigMap bootstrap, raw `kubectl patch`, or node/autoscaler change. Use the current repository's `scripts/cluster_operations.sh` for documented runtime cluster changes.
- Capture an exact rollback baseline before each manual shard or HPA change. Runtime changes can be overwritten by a deployment; re-read them after any deploy.
- Stop and escalate on contradictory live state, an unsynced dashboard event, insufficient permissions, unexpected pending or terminating pods, a failing content syncer, or an active incident. Do not improvise around an operational limitation.

## Required workflow

### 1. Establish current truth

1. Read [system-architecture.md](references/system-architecture.md).
2. Read [source-register.md](references/source-register.md) when validating a detail or when the repositories or process docs may have changed.
3. Work from fresh `master` revisions of `kubernetes-multiplexer` and `collab-and-tooling`; record their commit SHAs in the plan.
4. Capture all currently scheduled Workspace Events whose hidden buffered windows overlap the proposed event.
5. Read the live base pool floors, current overprovision replica counts for every affected shard, the Yjs content-syncer HPA min/max, actual replica counts, and relevant pending-pod/node state. Record timestamps and environment.

Live readback outranks repository defaults. Current source semantics outrank historical heuristics. A heuristic is never a live-state fact.

### 2. Complete intake and choose controls

Read [intake-and-sizing.md](references/intake-and-sizing.md). At minimum establish:

- event owner, type, start/end, timezone, and operational contact;
- expected peak concurrency and confidence/range, not only registrations;
- DataLab entitlement and whether workspaces are group-owned;
- exact owning group slug for paying-group routing;
- source workbook, copy path, language, and runtime configuration;
- overlap with other events, deploys, maintenance, or same-IP company traffic.

For non-contiguous training dates, plan one Workspace Event row per continuous session window. Never stretch one row across idle days: its hidden buffer would keep routing and pool floors active for the entire gap. Recalculate overlaps and obtain approval for every row.

Use the bundled offline helper after collecting explicit live base and overlap values:

```sh
python3 scripts/build_event_plan.py --help
```

It normalizes the hidden buffered window, maps the language to an editor/shard, and calculates additive dashboard values. It does not read live state or perform any write; its output remains a proposal requiring review.

Do not use participant count alone to select controls. Produce a short decision record showing why each control is or is not needed:

- Workspace Event for paying, group-owned traffic that should use `collab-medium-events` or another explicit runtime;
- language-shard overprovisioning for a burst concentrated on one editor/language shard;
- Yjs content-syncer pre-scaling for a burst of workbook opens/copies or a source containing many files;
- code-along template registration when users will copy from an approved source template;
- Infrastructure coordination when many participants may originate from a small set of IP addresses.

The process documentation contains conflicting historical thresholds (`>25` versus `>50`, with counterexamples below both). Treat them as prompts for review, not policy. Prefer measured concurrency, entitlement/routing behavior, current overlap, and an operator-approved risk margin.

### 3. Build the event-pool plan

Workspace Event values are **additive contributions**, not desired final values. For each `(editor, runtime)` pool, split the proposed buffered window at every start/end of another matching event. Sum other contributions inside each constant-capacity segment, then use the minimum sum across those segments:

```text
minimum_scheduled_before = live_base + min(other contributions by segment)
new_contribution = max(0, desired_effective_floor - minimum_scheduled_before)
minimum_scheduled_after = minimum_scheduled_before + new_contribution
```

Apply this formula independently to `minPoolSize` and `minTotalRunningSessions`. A partially overlapping event cannot be subtracted for a segment after it ends. If the minimum scheduled value already exceeds the desired floor, use zero and report the excess; a new event cannot subtract capacity. Never type `70% of participants` directly into the dashboard without first subtracting the base and the minimum guaranteed overlap.

Record the effective buffered window and transition table. The UI always adds 120 minutes before and after the entered interval. Account for all events whose buffered windows overlap. Reject or escalate overlapping rows for the same group slug when their runtime configurations differ: group routing selects one active row while multiplexer contributions still sum.

### 4. Prepare an approval packet

Before any write, present:

- assumptions and unresolved uncertainties;
- the unbuffered and effective buffered UTC/local windows;
- exact dashboard row values and resulting effective pool floors;
- source-workbook and code-along registration status;
- every proposed shard/HPA before and after value;
- verification gates, owner, rollback trigger, and exact captured rollback values;
- timing that allows the cluster to reach steady state before attendee traffic.

Ask for approval of the concrete changes. Planning approval is not mutation approval.

### 5. Apply approved changes

For dashboard actions, follow [workspace-events-dashboard.md](references/workspace-events-dashboard.md). For cluster actions, follow [cluster-scaling.md](references/cluster-scaling.md).

Apply early enough to observe the complete buffered routing/pool transition and any slow node or image startup. Avoid a multiplexer deployment during the event window. Make one class of change at a time and verify it before continuing.

### 6. Verify and monitor

Follow [verification-and-rollback.md](references/verification-and-rollback.md). Minimum go/no-go gates are:

- the Workspace Event row says `Synced`, not pending or failed;
- effective pool transitions equal the approved additive calculation;
- overprovision and Yjs HPA settings read back exactly;
- desired replicas are ready, with no unexplained pending pods;
- a representative source-workbook copy and session start succeed;
- the event owner knows the escalation path.

During the event, monitor warm/starting/total session capacity for the affected pool, pending pods and nodes, and Yjs content-syncer demand and health. Do not claim a made-up dashboard or alert name; use the team's current observability links.

### 7. Unwind deliberately

Workspace Event contributions expire automatically after `end + 120 minutes`. Delete or shorten a row only with explicit approval, then wait for `Synced` and verify removal. Manual shard/HPA changes do not roll back automatically: restore the captured live values, not a repository or historical “default.” Lowering an HPA maximum below current replicas can terminate pods; confirm load is safe first.

Close with actual rollback values, timestamps, remaining anomalies, and whether all temporary capacity has been removed.

## Reference routing

- System behavior, mappings, and control boundaries: [system-architecture.md](references/system-architecture.md)
- Intake, decision trees, formulas, and heuristic caveats: [intake-and-sizing.md](references/intake-and-sizing.md)
- Workspace Events and code-along admin procedures: [workspace-events-dashboard.md](references/workspace-events-dashboard.md)
- Detailed source-workbook validation and code-along registration: [code-along-source.md](references/code-along-source.md)
- Runtime shard and content-syncer operations: [cluster-scaling.md](references/cluster-scaling.md)
- Preflight, monitoring, rollback, and incident boundaries: [verification-and-rollback.md](references/verification-and-rollback.md)
- Evidence, revision pins, links, and known contradictions: [source-register.md](references/source-register.md)

# Event intake and sizing

## Intake record

Do not size until every material unknown is either answered or recorded as a risk.

### Event

- Name, owner, operational contact, event type, and audience.
- Every local start/end window and IANA timezone; derived UTC times. Model non-contiguous dates as separate event rows rather than one range spanning idle days.
- Registrations, expected peak concurrent DataLab users, confidence range, and arrival shape.
- Whether another DataLab event, multiplexer deploy, or maintenance window overlaps the **120-minute pre/post buffered window**.
- Whether a large company cohort is likely to share one or a few public IPs; if so, coordinate with INF/Cloudflare owners rather than changing protections ad hoc.

### Workspace and routing

- Source workspace URL/ID and copy mechanism.
- DataLab entitlement: Free/Basic, Premium, or another paying group entitlement.
- Ownership: user-owned or group-owned. A Workspace Event does not override user-owned or non-paying-group routing.
- Exact owning group slug; verify it from the actual group, not an event title or guessed company name.
- Dashboard language and intended runtime.
- Whether the source must be registered as a code-along template and the required key.

### Workload

- Language split if participants may choose different runtimes.
- Expected peak simultaneous session starts and steady concurrent sessions.
- Expected peak simultaneous workbook opens/copies.
- Source file count, unusually dense directories such as `.git` or training data trees, approximate total size, and external database/data dependencies.

### Live state

- Existing Workspace Events and their buffered overlap.
- Base `minPoolSize` and `minTotalRunningSessions` for each affected editor/runtime.
- Existing event contributions for those pools.
- Overprovision replicas for all mapped shards.
- Yjs HPA min/max and actual ready replicas.
- Pending pods, available nodes, abnormal image pulls, and current incidents.

## Decision tree

```text
Will many people open or copy the same workbook?
├─ yes -> inspect/test source; consider code-along registration and Yjs pre-scale
└─ no  -> record why content-sync change is unnecessary

Will many sessions start in a short interval?
├─ yes -> map languages to shards; plan shard headroom
└─ no  -> record why normal warm pools/autoscaling are sufficient

Should an eligible paying group use an event runtime?
├─ group-owned + paying + exact slug known -> consider Workspace Event
├─ user-owned or non-paying -> event row will not provide direct routing; use normal runtime assumptions
└─ entitlement/ownership uncertain -> stop and resolve

Does any buffered event overlap the same pool?
├─ yes -> build all start/end transition segments; subtract only the minimum combined contribution across them
└─ no  -> use one `0/0` overlap segment and subtract only the live base

Does the same group have an overlapping different runtime?
├─ yes -> stop; remove the ambiguity with event owners before writing
└─ no  -> continue

Will attendees share a small set of IPs?
├─ yes -> coordinate with INF/Cloudflare owners before the event
└─ no/unknown -> record the assessment
```

## Pool-floor calculation

Choose desired effective floors deliberately. A historical pattern is a warm floor around 10 and a total-running floor around 70% of expected participants, but it is not a universal default. Examples and prose in the process document disagree about when to use `collab-medium-events` (`>25`, `>50`, and smaller real events). Present the calculation and obtain operator agreement.

For each pool, let:

- `D_pool`, `D_total` be operator-approved desired effective floors;
- `B_pool`, `B_total` be the live base configuration;
- `O_pool`, `O_total` be the minimum combined other-event contributions across every constant-capacity segment of the proposed buffered window;
- `A_pool`, `A_total` be the values entered for the new event.

Calculate:

```text
A_pool  = max(0, D_pool  - B_pool  - O_pool)
A_total = max(0, D_total - B_total - O_total)

effective_pool  = B_pool  + O_pool  + A_pool
effective_total = B_total + O_total + A_total
```

Example: the desired effective total is 84, the live base is 10, and an existing event contributes 20 for the entire proposed buffered window. Enter `54`, not `84`. The result is `10 + 20 + 54 = 84`.

For a partial overlap, split at its end. If the segments contain other-event totals `20` and `0`, use `O_total = 0`; entering `74` keeps the effective total at least 84 after the other event ends. The new row is constant across its own window, so it may temporarily exceed 84 during the overlap.

If `B + O > D`, enter zero and report that existing scheduled capacity exceeds the target. Never use a negative contribution. Keep warm and total floors internally coherent, but do not assume they must be equal.

## Choosing desired floors

Use peak concurrent sessions, not registrations, as the starting demand. Show low/expected/high scenarios when confidence is weak. Then account for:

- arrival concentration and replacement-pod startup time;
- failures/no-shows versus risk tolerance;
- current ordinary traffic sharing the editor/shard;
- overlap from other events;
- runtime resource shape and node/image readiness;
- the event runtime's 15-minute idle timeout;
- the time available to observe capacity before attendees arrive.

Do not turn the historical `70%` or any participant threshold into hidden automation. Record who selected the desired floors and why.

## Shard headroom

Map each language to its shard using [system-architecture.md](system-architecture.md). Estimate the burst that is not already represented by ready session pods and existing safe shard headroom. Keep this calculation separate from the event-floor calculation.

Two models exist:

- resource-equivalence from audited source: 2 GB overprovision placeholder versus 2 GB small/events or 8 GB medium request;
- historical conservative operations ratio: 2 placeholders per `collab-small`, 2 per `collab-medium-events`, and 8 per `collab-medium` session.

Neither is an authoritative universal ratio. Validate current requests and get an operator to choose the margin. The output must show current replicas, proposed replicas, the model used, and exact rollback replicas.

## Content-sync sizing

Increase scrutiny when there is a simultaneous copy/open burst, many small files, or a large source. Do not assert a numeric source-size/file-count limit: none was found in the audited docs/source. The historical “about 100 open documents per pod” observation is evidence, not a service-level guarantee.

Use a representative copy test and current metrics to propose HPA min/max values. Keep min less than or equal to max, preserve safe scale-down headroom, and record the live baseline. Because scale-up stabilization can be long, apply and verify before the traffic burst.

## Plan output

Produce a table with one row per change:

| Control | Target | Live before | Approved after | Why | Apply by | Verification | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- |

Include a separate event-pool arithmetic table showing `desired`, `base`, `overlap`, `new contribution`, and `effective after` for both fields. List zero-change decisions too; they make the risk assessment auditable.

For the bundled helper, pass one `--overlap-transition POOL,TOTAL` for every constant-capacity segment. Even with no overlaps, pass `--overlap-transition 0,0`. The helper takes the minimum per metric and refuses an implicit overlap assumption.

# DataLab multiplexer architecture

## Request and capacity path

DataLab is a hosted notebook product. A workspace's notebook content is served and persisted by the collaboration/content-sync path, while executable code runs in a Kubernetes session pod. The multiplexer selects and manages those session pods.

For event planning, follow this chain:

```text
workspace owner + entitlement + active Workspace Event
  -> collab-and-tooling creates session JWT with editor/runtime
  -> multiplexer selects the matching session pool
  -> a warm pod is claimed and a replacement is started
  -> Kubernetes schedules the replacement, using real or overprovisioned headroom
```

Workbook opens/copies also load the Yjs content syncer. That service is a separate scaling bottleneck from session-pod availability.

## Workspace routing

`collab-and-tooling` decides the runtime in `CreateSessionJwt`:

- non-paying group-owned workspaces route to `collab-small` before event lookup;
- user-owned subscribed workspaces route to `collab-medium` before event lookup;
- paying group-owned workspaces can match an active Workspace Event by their owning group slug;
- a matching event routes to its configured runtime, normally `collab-medium-events` for a large training;
- database/cache failure falls back to `collab-medium` for paying-group workspaces;
- the special `datacamp-teams` group routes to `collab-medium-events` whenever any Workspace Event is active, even without a direct slug match.

The event lookup cache can lag by about 30 seconds. For the same group slug, overlapping events with different runtimes are unsafe: routing takes the earliest-starting active row, while pool sizing receives every contribution.

## Language, editor, and shard mapping

The dashboard language is translated to the multiplexer editor. Overprovision deployments are grouped by shard:

| Dashboard language | Multiplexer editor | Overprovision shard/deployment |
| --- | --- | --- |
| Python 3.8 | `JupyterLab` | shard 0 / `overprovision-0` |
| R 4.2 | `JupyterLab` | shard 0 / `overprovision-0` |
| Python 3.10 | `jupyter-python3-10` | shard 1 / `overprovision-1` |
| R 4.4 | `jupyter-python3-10` | shard 1 / `overprovision-1` |
| Python 3.12 | `jupyter-python3-12` | shard 2 / `overprovision-2` |

One shard can serve multiple languages. Include their non-event demand when judging headroom.

## Session pool semantics

A pool is keyed by editor and runtime configuration. The important controls are:

- `minPoolSize`: floor for the adaptive target of unclaimed warm/starting pods;
- `minTotalRunningSessions`: floor across all running pods in that pool, including claimed and available pods.

When a warm pod is claimed, the manager starts a replacement if the warm pool is below its optimal size or total running pods are below the total floor. Upscaling satisfies the larger shortfall, subject to its upscaling cap.

Base production configuration at the audited revision includes `collab-medium-events` for Python 3.10 and 3.12 at `10/10`; it has no base `collab-medium-events` row for `JupyterLab`, so an active event can create a synthetic pool. This is source context only—read the live base before calculating an event.

## Workspace Event propagation

The Admin Workspace Events page stores a database row. A cron runs about every 30 seconds, widens the interval by a fixed 120-minute buffer on both sides, translates the language to an editor, and replaces the multiplexer event snapshot through its admin endpoint. The multiplexer reloads event configuration about every 30 seconds.

Multiplexer event contributions add to base configuration, and overlapping contributions to the same pool add to each other. The source-level active interval is start-inclusive/end-exclusive in the multiplexer; the collab lookup uses an inclusive database range. Treat the buffered end as a transition boundary and do not schedule operational work to depend on that exact instant.

The sync endpoint has replace-all semantics. That is why an operator or agent must never send a direct partial `POST /admin/pool-events`. Use the dashboard and wait for `Synced`.

Invalid event configuration does not fail multiplexer readiness: the prior valid event config is preserved and the error appears in status/logging. A healthy readiness check alone does not prove the new event was applied.

Pool-floor updates are not instantaneous. At the audited revision, floor refresh runs every five minutes, optimization runs every minute, and production starts at most ten pool pods concurrently. Large increases therefore need enough lead time to observe actual unclaimed Ready pods.

## Runtime resource shapes

At the audited revision, production session requests are approximately:

| Runtime | CPU request | Memory request | Memory limit | Idle timeout |
| --- | ---: | ---: | ---: | ---: |
| `collab-small` | 0.5 CPU | 2 GB | 4 GB | 30 min |
| `collab-medium-events` | 0.5 CPU | 2 GB | 16 GB | 15 min |
| `collab-medium` | 2 CPU | 8 GB | 16 GB | 2 hours |

Overprovision pods request 2 GB memory at lower priority. Physically, that is roughly one overprovision pod per small/events request and four per medium request before CPU and real workload effects. Historical operations notes instead use conservative planning ratios of 2, 2, and 8 overprovision pods per session. These are not equivalent. Do not choose silently: state which model an operator approved, validate live resource requests, and monitor actual scheduling.

## Separate capacity controls

### Workspace Event

Changes routing for an eligible group and adds temporary session-pool floors. It is durable in the dashboard and expires with its buffered window.

### Overprovision deployment

Reserves low-priority placeholder pods on the language shard so nodes and capacity exist before the burst. A runtime replica change is temporary, cluster-specific, and may be reset by deployment.

### Yjs content-syncer HPA

Controls document-serving/copy capacity. At the audited revision its HPA uses memory utilization and long stabilization windows (including a 600-second scale-up stabilization window), so pre-scaling is necessary when a sharp copy burst is expected. Repository values such as min 8/max 14 are not rollback defaults.

### Nodes and image pulls

Session replacements still depend on schedulable nodes and large runtime images. A past event depleted a pool while autoscaling expanded excessively and image pulls overwhelmed infrastructure. Stage capacity early and verify ready pods. Direct node-group or autoscaler edits are outside this routine skill; escalate to the owning infrastructure team.

## Source workbook and content load

A source workbook can amplify content-sync load when many participants copy it simultaneously, especially with many small files or a large total payload. Historical notes say one content-syncer pod can “easily” serve around 100 open documents, but this is not an authoritative sizing limit. No authoritative numeric file-count or workbook-size ceiling was found. Inspect the source qualitatively, perform a representative copy test, observe current service metrics, and have an operator approve the HPA target.

# Cluster scaling runbook

Use this runbook only after the event plan identifies a capacity change. Workspace-event floors and cluster headroom solve different problems:

- A workspace event changes session routing and adds pool floors for one exact `(editor, runtime config)` pool.
- An overprovision deployment reserves schedulable memory on one language shard. Its low-priority pods are displaced as real sessions arrive, giving the cluster time to add nodes.
- The `yjs-content-syncer` HPA controls the service that serves and persists notebook content. Opening and copying many workbooks creates a separate surge from starting kernels.

Production mutations require explicit human approval. Never infer approval from an event request, and never change node groups, the cluster autoscaler, or image infrastructure as a routine event action.

## Map a language to cluster resources

| Dashboard language | Multiplexer editor | Overprovision deployment |
|---|---|---|
| Python 3.8 | `JupyterLab` | `overprovision-0` |
| R 4.2 | `JupyterLab` | `overprovision-0` |
| Python 3.10 | `jupyter-python3-10` | `overprovision-1` |
| R 4.4 | `jupyter-python3-10` | `overprovision-1` |
| Python 3.12 | `jupyter-python3-12` | `overprovision-2` |

Do not scale every shard when the event uses one language. If the event has several languages, size each shard separately.

## Capture live state before proposing a mutation

Do this close enough to the change that another event or operator has not invalidated it. Record the timestamp and exact production context alongside:

| Resource | Required baseline |
|---|---|
| Event's shard deployment | desired, ready, and available replicas |
| Other shard deployments | desired replicas, to expose an accidental all-shards change |
| `yjs-content-syncer` deployment | desired, ready, and available replicas |
| `yjs-content-syncer` HPA | min, max, and current replicas |
| `session-manager` and `session-router` | desired, ready, and available replicas |

Use the current `kubernetes-multiplexer` checkout and run:

```sh
./scripts/cluster_operations.sh
```

Select the workspace production context, read the red production warning, then choose **View current state**. The selector only offers recognized multiplexer contexts, but selection runs `kubectl config use-context`: it changes the process user's global current kubectl context. State the selected context in the approval request and verify it again immediately before accepting a mutation.

The script's changes are runtime-only and the next deployment can overwrite them. Check that no multiplexer deployment is planned during the protected event window. If a deployment occurs, discard the old assumptions, re-read live state, and reconcile before taking another action.

## Choose the intervention

### Overprovision the language shard

Use shard overprovisioning when a synchronized session-start burst could consume existing node headroom before the cluster autoscaler can add usable hosts. This is common for a public webinar or a large event with one known language.

Facts to keep separate when calculating a target:

- Each current overprovision pod requests about 2000M of memory on its shard.
- `collab-small` and `collab-medium-events` currently request about 2 GB per session; `collab-medium` requests about 8 GB.
- The historical operations guide uses deliberately conservative planning ratios of 2 overprovision pods per `collab-small` or `collab-medium-events` session and 8 per `collab-medium` session. Those ratios are not physical memory equivalences and may reflect wider node/image/startup risk.

Therefore do not convert participants to shard replicas silently. Show the historical ratio, the physical request comparison, the current live baseline, and the proposed target as separate quantities for approval. Re-check current resource requests in source/live state if they could have changed.

After approval, use **Scale overprovisioning (session shards)**, choose **Scale a specific shard**, enter the mapped deployment, read back the current replica count, and approve the exact old-to-new change. Avoid **Scale ALL shards** unless the approved plan explicitly covers every language.

Wait until desired replicas are ready/available and their nodes are usable. A changed Deployment replica count alone is not proof of headroom; pending low-priority pods mean the capacity has not arrived.

### Pre-scale `yjs-content-syncer`

Use content-syncer pre-scaling when many people will open or copy the source workbook in a short window, especially public webinars and workbooks with many files. The historical process note says one pod can easily handle roughly 100 open documents; treat that as an observed heuristic, not a guarantee.

The rendered HPA policy targets 80% memory and has slow behavior: 600-second stabilization windows and a one-pod-per-300-second policy. Scale early and verify ready pods before the effective start. After approval, choose **Scale yjs-content-syncer HPA** and set both:

- `minReplicas` high enough to make the approved baseline present before the burst.
- `maxReplicas` no lower than the approved min and high enough to allow response to unexpected load.

Never lower max below current replicas during preparation. The script warns because doing so can terminate pods immediately.

### Do not routinely scale other services

`session-manager`, `session-router`, and core-infrastructure overprovisioning exist in the script, but the event process does not provide defensible participant-to-replica rules for them. Change them only with live bottleneck evidence and an approved incident or service-owner recommendation. Preserve their baseline even when not changing them.

## Operational timing and known failure modes

- Node scale-up and large image pulls have historically taken 10–15 minutes, but this is an observation rather than a safe universal lead time. Derive the apply-by time from the planned replica increase, the content-syncer's one-pod-per-five-minute policy, and an observation margin; hundreds of sessions need substantially more than a last-minute change.
- Do not create a giant last-minute jump and assume the autoscaler makes it safe. A past pool depletion caused an unexpectedly large node scale-out and overloaded the image proxy with multi-gigabyte images.
- Avoid a multiplexer deployment during the event. A deployment concurrent with a code-along has previously contributed to content-syncer overload and a depleted session pool.
- Large company events can concentrate traffic behind a small number of source IPs. Ask the event owner for the VPN/network public IPs, then coordinate a Cloudflare bypass with INF before the event. Do not weaken protections from this runbook.

Proceed to [verification-and-rollback.md](verification-and-rollback.md) after every approved change.

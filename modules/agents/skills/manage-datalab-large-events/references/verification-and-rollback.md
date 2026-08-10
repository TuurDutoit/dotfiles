# Verification and rollback

An event is ready only when both control planes agree: the collab dashboard row is synchronized and the required cluster capacity is actually ready. Keep a timestamped change record containing the approver, event row, exact values, exact Kubernetes context, before-state, after-state, and planned rollback time.

## Before the effective start

1. Re-open **DataLab Admin → Workspace Events** and confirm the row exactly matches the approved name, group slug, language, runtime config, additive minima, configured times, and timezone.
2. Wait for the row to show **Synced**. The UI checks dirty rows about every 10 seconds; the backend sync cron runs about every 30 seconds; the multiplexer reloads pool events about every 30 seconds. Do not equate a saved row or a `Pending` row with active capacity.
3. Inspect the multiplexer workspace-pool transitions using the read-only procedure below. Confirm the effective floor meets the approved target in every transition segment, including after partial overlaps end. The sync payload is replace-all, so also verify unrelated events remain represented.
4. Remember that the dashboard silently expands the configured start and end by 120 minutes on both sides. Routing and pool contribution should be verified against this effective window, not only the displayed event time.
5. From the fresh `kubernetes-multiplexer` checkout recorded in the plan, run `./scripts/cluster_operations.sh` and select **View current state**. Confirm the selected context is workspace production, the approved shard's desired replicas are ready/available, and the content-syncer HPA min/max plus ready pods match the plan.
6. Check for pending overprovision pods, unhealthy nodes, deployment activity, session-start errors, and content-syncer memory pressure in the team's current production observability. Stop preparation and escalate if the supposed headroom is not schedulable.
7. From a disposable attendee-like account, copy the actual registered source workbook, open it, start the expected language/runtime, and execute a small cell. Do not use the organizer's already-warm source workspace as the test.

For paying group-owned workspaces, verify the workspace is owned by the exact event group. Event routing does not apply to user-owned subscriber workspaces or non-paying group workspaces. If two buffered events for the same group overlap with different runtime configs, stop: current routing selects an earliest-start match, so the result is unsafe to infer.

## Inspect pool configuration read-only

`GET /config/workspace-pools` is served by the internal `session-pool-manager` Service. It is not the session-manager write endpoint. The response contains `basePools`, `events`, and `transitions`; each transition has a timestamp and `effectivePoolsForCluster`. It reports configuration at event boundaries, not current pod readiness.

Use an explicitly verified production context and an authorized shell. In one terminal, create a local-only port-forward:

```sh
kubectl --context <verified-workspace-production-context> -n default \
  port-forward --address 127.0.0.1 service/session-pool-manager 18080:80
```

Before retrieving the token, confirm port 18080 was unused before the command and that this terminal remains active with `Forwarding from 127.0.0.1:18080`. If the port was occupied, the process exits, or any other address is shown, stop; never send the token to that local port.

In another Bash/Zsh terminal, obtain the shared admin token without printing or persisting it, reject command/empty-token failures, call only the read endpoint, and guarantee cleanup on completion or interruption:

```sh
set +x
set -o pipefail
mux_admin_token=''
cleanup_mux_admin_token() {
  unset mux_admin_token
}
trap cleanup_mux_admin_token EXIT
trap 'exit 130' HUP INT TERM

mux_admin_token="$(kubectl --context <verified-workspace-production-context> \
  -n default get secret admin--session-manager-auth \
  -o jsonpath='{.data.token}' | base64 --decode)" || exit 1
if [ -z "${mux_admin_token}" ]; then
  printf '%s\n' 'Refusing inspection: admin token was empty.' >&2
  exit 1
fi
if ! printf 'header = "x-token: %s"\n' "${mux_admin_token}" | \
  curl --config - --fail --silent --show-error \
    http://127.0.0.1:18080/config/workspace-pools | jq .; then
  printf '%s\n' 'Workspace-pool inspection failed.' >&2
  exit 1
fi
cleanup_mux_admin_token
trap - EXIT HUP INT TERM
```

Stop the port-forward afterward. Never paste the token into notes, logs, or chat, and do not enable shell tracing. If Secret read or port-forward permission is unavailable, stop and ask an authorized operator; do not use `POST /admin/pool-events`, `kubectl edit`, or a copied token as a workaround.

## During the event

Watch the leading indicators, not just participant count:

- unclaimed/starting pool depth and session-start latency for the exact editor/runtime pool;
- shard placeholder availability, pending pods, node readiness, and image-pull pressure;
- content-syncer ready replicas, memory utilization, restart/error rate, and copy/open failures;
- collab API errors and any concurrent deployment.

If capacity depletes or users cannot start sessions, declare/escalate through the incident process. Do not improvise autoscaler or node-group changes, and do not lower capacity while errors are active. Capture evidence before changing another subsystem so the effect is attributable.

## End and rollback decision tree

The configured dashboard end is not the effective end: the hidden post-buffer keeps routing and pool contribution active for another 120 minutes.

1. **Was the event cancelled before it began?** Delete the dashboard row, wait for **Synced** removal, verify other events remain, then consider cluster rollback.
2. **Did the event finish normally?** Prefer automatic expiry at `configured end + 120 minutes`. Do not delete early while late attendees or copied workspaces may still start sessions.
3. **Does another current/upcoming event need any changed shard or HPA capacity?** If yes, retain the maximum approved requirement and record the new owner/rollback time. Never restore a resource just because one event ended.
4. **Has a deploy or another operator changed the resource since baseline capture?** If yes, stop and reconcile with the current owner. Do not overwrite newer intent with the old baseline.
5. **Otherwise**, restore only the runtime changes made for this event to the captured live baseline.

## Restore safely

For shard overprovisioning, return to the recorded fresh `kubernetes-multiplexer` checkout and run `./scripts/cluster_operations.sh`; verify workspace production again, choose the one mapped shard, and propose the captured before-value. Re-read its current value before approval. Never restore from a README, historical value such as 40/50, or a Helm default: runtime values may intentionally differ from source.

For `yjs-content-syncer`, restore the captured HPA only after load has normalized. If current replicas exceed the captured maximum, stage the rollback: first restore the captured minimum while retaining a maximum at least as high as the current replica count; allow the slow HPA policy to converge; then restore the captured maximum once current replicas are at or below it. Re-read current load and replicas before both approved writes. Do not accept the script's pod-termination warning while active users may be affected.

The dashboard event contribution requires no manual subtraction. It expires automatically after its buffered end, or is removed by a synchronized delete. Because overlapping contributions are additive, editing another row to "compensate" can under-provision that other event.

## Closure evidence

Close the run only after recording:

- event row expired/removed from the effective multiplexer transitions;
- shard and HPA settings match the approved post-event state;
- desired/ready/available counts are converging without user errors;
- no event-owned follow-up mutation remains;
- incident link and owner, if any anomaly occurred.

If any state cannot be verified, leave the rollback open and ask the service owner; do not claim completion from elapsed time alone.

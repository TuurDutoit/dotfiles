# Audited sources and known gaps

This register records what the skill was built from. Re-audit when either repository revision, the live-ops tracker, event dashboard behavior, or the cluster operations script changes. Current live state always outranks these pins.

## Audit snapshot

Audited on 2026-08-10:

- `datacamp-engineering/kubernetes-multiplexer`: `aec4178f0910e80e2bf3676e61736cdffeb8fac7`
- `datacamp/collab-and-tooling`: `8d086b08e39b0860eb964638615f58e633a4e7fe`
- [LX Live Ops Tracker](https://docs.google.com/document/d/13wgbJEdxbwIRDO4WBdlq_nxkMsWW8D4FPaQKRkxTPgc/edit?tab=t.euqefxnk29c2), last modified 2026-07-15 when audited
- [Overprovision pods](https://datacamp.atlassian.net/wiki/spaces/PRODENG/pages/3902079001/Overprovision+pods)
- [INC-315: DataLab sessions failing to start](https://datacamp.atlassian.net/wiki/spaces/PRODENG/pages/3696263188/INC-315+DataLab+sessions+failing+to+start)
- [INC-365: DataLab degraded performance](https://datacamp.atlassian.net/wiki/spaces/PRODENG/pages/4037804041/INC-365+DataLab+degraded+performance)
- [LX-8181: Admin-managed workspace events](https://datacamp.atlassian.net/browse/LX-8181)

## Source-code map

In `kubernetes-multiplexer`, re-check:

- `doc/WORKSPACE_POOL_EVENTS.md` and `apps/session-pool-manager/src/workspaceSessionPools.ts` for event loading, overlap, and interval semantics;
- `cluster/workspace-session-pools-production.yaml` for base pool floors;
- `apps/session-pool-manager/src/adjustOptimalSizeForSpecificPool.ts`, `updateOptimalSize.ts`, and `setupRedisCommands.ts` for floor/replacement behavior;
- `libs/shared-multiplexer/src/getLanguageConfig.ts` and `getShardNumberForImage.ts` for runtime resources and shard mapping;
- `cluster/src/overprovision/` and `cluster/src/yjs-content-syncer/` templates for placeholder/HPA behavior;
- `scripts/cluster_operations.sh` and `scripts/lib.sh` for supported live actions, confirmations, context behavior, and language labels.

In `collab-and-tooling`, re-check:

- `apps/frontend/src/admin/workspaceEvents/` for fields, validation, sync status, and hidden buffer;
- `apps/api/src/workspaceEvent/` for event creation/editing, active-event queries, buffering, and mux synchronization;
- `apps/api/src/jwt/CreateSessionJwt.ts` for entitlement/group routing and `datacamp-teams` behavior;
- `libs/shared/domain/src/domains/workspace/domain.ts` for language-to-editor mapping.

## Conflicts that must remain visible

1. The tracker recommends event routing above 25 Premium participants in one place and above 50 in another; historical 22-person events used both strategies. There is no authoritative threshold.
2. Historical rollback/headroom values conflict: 40, 50/100, and repository defaults of shard `3/10/3`. None is a live rollback value.
3. Historical `10` warm and `~70%` total guidance predates or does not explain additive dashboard fields. Subtract live base and overlaps.
4. Historical shard ratios are 2/2/8 placeholders per small/events/medium session, while audited memory requests imply about 1/1/4 physical memory equivalence. Neither is a universal sizing rule.
5. “One content-syncer pod handles about 100 documents” is qualitative; no authoritative source-size, file-count, HPA formula, or abort threshold exists.
6. Source docs disagree on the event end boundary. Current mux code is start-inclusive/end-exclusive; collab's active-row query is inclusive. Avoid relying on the exact transition instant.
7. No audited source establishes current node-group maxima, account quotas, a universal deploy freeze, or an exact safe lead time. Verify live constraints.

## Operational gaps and stop conditions

- `WORKSPACE_EVENTS_DB_BACKED` defaults to `true` in source, but live state must be verified. When disabled, dashboard rows do not sync and routing uses the legacy hardcoded list.
- The mux chart intentionally does not render `session-pool-manager-events-config`; the multiplexer Ansible role bootstraps an empty ConfigMap on fresh clusters, and runtime RBAC permits `get`/`update`, not `create`. Never bootstrap or repair it ad hoc—escalate to the cluster owner if it is absent.
- A `Synced` dashboard row confirms a configuration write, not pod/node readiness. Verify effective transitions and actual unclaimed Ready pods separately.
- Direct `POST /admin/pool-events` replaces the complete event snapshot. It is not an operator shortcut.

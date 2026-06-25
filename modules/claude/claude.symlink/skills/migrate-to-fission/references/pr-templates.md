# Step 8 — PR description templates

The number of PRs generated depends on the trigger family:

| Trigger family                         | PRs   | Notes                                                                                                                                |
| -------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| HTTP (or multi-trigger including HTTP) | **6** | PR I2 / PR I3 carry the Kong cutover for staging and prod                                                                            |
| SQS-only                               | **4** | Phase 3 / 4 cutovers are AWS console actions on the Lambda SQS event source mapping (no PR). Skip PR I2 and PR I3 templates entirely |
| Schedule-only                          | **4** | Phase 3 / 4 cutovers disable the Lambda EventBridge rule in the AWS console (no PR). Skip PR I2 and PR I3 templates entirely         |

When the trigger family is SQS-only or schedule-only, **renumber every `of 6` to `of 4`** in
the PR notes, and adjust the "Make sure PR N is merged" lines so they reference the
4-PR sequence: **PR 1** (PR S1, service Phase 1) → **PR 2** (PR I1, infra Phase 1) →
**PR 3** (PR I4, infra Phase 5 cleanup) → **PR 4** (PR S2, service Phase 5 cleanup).

Use these templates verbatim — the structure, voice, Verification format, and `Merge order`
block are mandatory across all migrations. Write the body to a temp file and pass it via
`gh pr create --body-file` (raw backticks survive, shell escaping does not bite).

**Conventions baked in:**

- Title format: `[INF-{ticket}] <Short description>`
- **Service-repo PRs (PR S1, PR S2) use the diagram explainer style** — opening paragraph, bullets covering each file, two Mermaid `flowchart LR` diagrams (current Lambda state, post-migration Fission state), per-bullet narrative under each diagram, `### PR order` sub-section listing all six PRs in the chain, single `References:` line, then `## Verification` with concrete past-tense bullets. Modeled on [`notifications-api-lambdas#66`](https://github.com/datacamp-engineering/notifications-api-lambdas/pull/66).
- **Infra-repo PRs (PR I1, PR I2, PR I3, PR I4) use the change-summary explainer style** — opening paragraph, then a `**What changes:**` block of bold-headed bullets (each bullet names a concern — Compute platform, Trigger, IAM, SSM secrets, Health probes, Env vars, Deploy runlist, Routing — with the before → after summary and the reasoning), `### PR order` sub-section, single `References:` line, then `## Verification`. **No Mermaid in infra-repo PRs.** Modeled on [`notifications-api-lambdas-infra#32`](https://github.com/datacamp-engineering/notifications-api-lambdas-infra/pull/32).
- Merge-order communication: every PR carries a `### PR order` sub-section listing all six (or four) PRs in the migration with a marker on the current step and links to the merged predecessors. Use global PR numbering (PR 1 of 6 through PR 6 of 6 for HTTP-family migrations; PR 1 of 4 through PR 4 of 4 for SQS-only or schedule-only). The `> [!NOTE]` GitHub callout is no longer used.
- Verification checkboxes are empty (`- [ ]`) by default; flip to `- [x]` only after running each check locally and confirming it passed. Verification bullets are past-tense statements of what was actually run, not future-tense intentions ("ran `yarn test:parity` — 2 tests passed in 0.2 s", not "run the parity test"). If any check fails, do NOT open the PR — fix the underlying issue and re-run.
- No `## Notes` section. Each line is one paragraph / bullet — no hard-wrapping inside a bullet.

## PR S1 — Phase 1, service repo (Merge order: 1 of 2)

The PR description follows the explainer style: opening paragraph, file-by-file bullets, two Mermaid flowcharts (current Lambda state, post-migration Fission state) each followed by a per-component narrative, then a `### PR order` sub-section, a single `References:` line, and a past-tense `## Verification` block. Reference implementation: [`notifications-api-lambdas#66`](https://github.com/datacamp-engineering/notifications-api-lambdas/pull/66) — copy that shape, swap in the per-app values.

````markdown
## Summary

Part of the [INF-4864](https://datacamp.atlassian.net/browse/INF-4864) Fission migration epic. Adds the container entrypoint and a Lambda↔{server-flavour} parity test so `{service-name}` can run as a Fission function pod with byte-identical behaviour to today's Lambda. `{handler-path}` is unchanged and {runtime} (`{docker-base-image}`) is preserved exactly. This is the **image build** step in the chain — full sequence below.

- `Dockerfile` — `{docker-base-image}`, port 3000, `ENV NODE_ENV=production` (or language equivalent), runs as the non-root `{user}` user (`USER {user}`), copies only the files needed at runtime ({explicit file list}) so build context state cannot leak into the image.
- `server.{js|py}` — small {Node `http` | Express | Flask} entrypoint that wraps the existing handlers and routes by {discriminator — method, path, `X-Fission-Timer-Name` header, etc.}. Exports the request handler and only `listen()`s when run as the entrypoint, so tests can mount it in-process.
- `tests/integration/parity.test.{js|py}` + `tests/fixtures/{event-name}.json` (one fixture per event type from sanitised CloudWatch samples) — side-by-side parity test that replays each event type through `{handler-path}` directly and through `server.{js|py}` and asserts byte-identical {side effects — SNS publishes, SQS sends, outbound HTTPS, DB writes} and response shapes.
- `package.json` (or `requirements.txt`) — adds the `test:parity` script and the `supertest` (or language equivalent) devDep; `{lockfile}` regenerated using the same package-manager version CI uses so install is deterministic.
- `.circleci/config.yml` — adds `build_and_push_image_to_artifactory` next to the existing Lambda zip job (zip stays for rollback until the cleanup PR drops it) and a new `test_parity` job that gates `build`, `docker-build`, and `tag-repo` so a parity failure blocks the merge.

### How the app works today (AWS Lambda)

```mermaid
flowchart LR
    classDef external fill:#f1f5f9,stroke:#475569,stroke-width:2px,color:#0f172a
    classDef edge     fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f
    classDef compute  fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    classDef awsdata  fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#064e3b
    classDef api      fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#4c1d95

    {one source node per trigger — Customer.io, CloudWatch Events, SQS queue, S3 bucket}

    {if HTTP-fronted: subgraph kong with route + plugins (key-auth, acl, aws-lambda)}

    subgraph lambda["Lambda runtime: {runtime} — {service:}"]
        {one node per function in serverless.yml functions: block}
    end

    {downstream sinks: SNS topics, SQS queues, S3 buckets, internal APIs, SSM, KMS}

    {edges from sources → lambda → sinks, labelled with the action on each edge}
```

- `{FunctionName}` — {one bullet per function: how it is triggered, what it reads, what side effect it produces, response shape on success and on each error path}.
- Both functions share one {runtime} Lambda (`{service:}`) {in a VPC if applicable} with {summary of IAM scope from `provider.iam.role.statements`}.

### How the app will work after the Fission migration

```mermaid
flowchart LR
    classDef external fill:#f1f5f9,stroke:#475569,stroke-width:2px,color:#0f172a
    classDef edge     fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f
    classDef compute  fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    classDef awsdata  fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#064e3b
    classDef api      fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#4c1d95

    {sources, with EventBridge replaced by Fission TimeTrigger and SQS event-source replaced by KEDA where applicable}

    {if Kong: subgraph showing aws-lambda plugin removed but key-auth/acl preserved}

    subgraph pod["EKS · Fission function pod ({runtime}, port 3000)"]
        sjs["server.{js|py}<br/>{routing rules}"]:::compute
        {one node per function — note "(unchanged handler)"}
    end

    {same downstream sinks as the current-state diagram}

    kubelet(["kubelet<br/>readiness + liveness probes"]):::external

    {edges from new sources through server.{js|py} into the unchanged handlers, then out to sinks}
    kubelet -->|"GET /health -> 200 OK"| sjs
```

- `{FunctionName}` — {how the routing path changes, what server.{js|py} does to translate the Fission HTTP shape into the Lambda event shape the handler expects, and the assertion that the downstream side effect is unchanged}.
- `GET /health` — kubelet readiness/liveness probes; traffic only routes after SSM is mounted. Non-{matching method/header} requests → 405.

### PR order

1. **Image build** — this PR. Adds the Dockerfile, `server.{js|py}`, parity test, and `test_parity` CI job; CircleCI pushes the image to Artifactory. Image must appear at `datacamp-docker/{service-name}` before the next PR.
2. **Fission deployment config** — [`{service-name}-infra#N`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N). Stands up the Fission Function, triggers, IRSA, and SSM Secret. {Kong, if applicable, still routes to Lambda.}
3. **Staging Kong cutover** — TBD. `kong.yml` switches the route to the Fission ingress; watch error rate ≥1h. {Skip and renumber 4-PR for SQS-only / schedule-only.}
4. **Prod Kong cutover** — TBD. Same change for prod. Rollback boundary; monitor Datadog ≥24h. {Skip for SQS-only / schedule-only.}
5. **Kong removal / infra cleanup** — TBD. Drop `kong-deck-role`, delete `kong.yml`. Traffic flows directly to the Fission VirtualService.
6. **Lambda decommission** — TBD. Drop the zip job, `sls remove`, EventBridge cleanup, Datadog monitor swap. (PR S2.)

References: [INF-{ticket}](https://datacamp.atlassian.net/browse/INF-{ticket}) · [INF-4864](https://datacamp.atlassian.net/browse/INF-4864) · [`fission-role`](https://github.com/datacamp-engineering/fission-role) · [`{service-name}-infra#N`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N)

## Verification

- [ ] {If the app has a TimeTrigger:} Fission TimeTrigger HTTP shape: [`pkg/timer/timer.go`](https://github.com/fission/fission/blob/v1.21.0/pkg/timer/timer.go) at v1.21.0 line 67 sets `X-Fission-Timer-Name`; default method is GET.
- [ ] `node --check server.js` (or `python -m py_compile server.py`) passed on {runtime}.
- [ ] Parity test (`tests/integration/parity.test.{js|py}`) ran locally with `{yarn|npm|pytest} test:parity` — N tests passed in M seconds. Each fixture produced byte-identical {side effects} between the Lambda handler and the {Express|Flask|http} path.
- [ ] Parity test ran on CI as the new `test_parity` CircleCI job and passed; the workflow gates `build`, `docker-build`, and `tag-repo` on it so a parity failure blocks the merge.
- [ ] `docker build .` succeeded against the PR head ({install-command} + N explicit COPYs; image M MB).
- [ ] `docker run` smoke confirmed the container runs as the {user} user (`whoami` → `{user}`) and `/app` contains only the runtime files ({list}) — no `.git`, no tests, no leftover artifacts.
- [ ] Local HTTP smoke against the running container: {one bullet per code path with status code and observable behaviour, e.g. `GET /health` → 200; `POST /webhook` with sample payload → 500 `Missing region` confirms the route reached `{handler-name}`; `GET /foo` → 405; `GET /` with `X-Fission-Timer-Name: {timer-name}` → 200 and the container logs showed the expected handler entry/exit}.
- [ ] CircleCI on commit `{sha}` is green: `queue`, `test-parity`, `build` (Lambda zip — kept until the cleanup PR), `docker-build`, and `tag-repo`.
````

## PR I1 — Phase 1, infra repo (Merge order: 1 of 4)

The PR description follows the change-summary explainer style: opening paragraph, `**What changes:**` block of bold-headed bullets, then `### PR order`, `References:`, and past-tense `## Verification`. Reference implementation: [`notifications-api-lambdas-infra#32`](https://github.com/datacamp-engineering/notifications-api-lambdas-infra/pull/32) — copy that shape, swap in the per-app values.

```markdown
## Summary

Part of the [INF-4864](https://datacamp.atlassian.net/browse/INF-4864) Fission migration epic. Stands up `{service-name}` as a Fission function on EKS. After merge the Fission pod runs in staging and prod; {Kong still routes external traffic to Lambda | the Lambda SQS event source mapping still polls the queue | the EventBridge rule still fires the Lambda}. This is the **Fission deployment config** step in the chain — full sequence below.

**What changes:**

- **Compute platform** — AWS Lambda (`{runtime}`{, VPC if present}) → Fission function pod in EKS ({matching runtime} container, port 3000). HPA: `min_scale: {N}`, `max_scale: {M}`, `requests_per_pod: {N}`.
- **{Trigger type — HTTP / MQ / Time}** — {Lambda trigger description} → Fission `{HTTPTrigger | MessageQueueTrigger | TimeTrigger}` with {trigger spec details — path, method, queue URL, cron expression}. {If HTTP and the upstream sends POST: `methods: ["POST"]` overrides fission-role's `[GET]` default.}
- **{Second trigger if multi-trigger}** — {repeat the pattern}.
- **SSM secrets** — `ssm_override_name: {ssm-prefix}` keeps the existing `/datacamp-{env}/{ssm-prefix}/` tree {explanation if the service: in serverless.yml differs from the repo name}. fission-role mounts the tree as a K8s Secret on the pod, so `{awsParamEnv.load | os.environ}` keeps working unchanged.
- **IAM** — IRSA inline policy mirrors the original Lambda scoping: {actions preserved with resource ARNs, e.g. `kms:Decrypt` on the per-env key, three exact SSM `Get*` actions on the parameter ARN, `sns:Publish` on `{topic}`}. Drops {actions removed because the handler chain never calls them, e.g. `ssm:Describe*`, wildcard `ssm:Get*`, `ssm:List*`, `kms:GenerateDataKey`}.
- **Health probes + scale-down** — {`/health` on port 3000 backs the Function's readiness + liveness probes (Lambda had none) | KEDA polling for SQS triggers — no probes needed}. `termination_grace_period_seconds: {N}` lets {in-flight HTTP requests | in-flight SQS message processing | in-flight cron job} finish on scale-down.
- **Env vars** — {list of env vars set inline in deploy.yml per env, e.g. `SNS_TOPIC_ARN`, `DD_SERVICE`}. The original Lambda set them on the function block in `serverless.yml`, not in SSM, so without these the pod would {publish to undefined / fail with config error}.
- **Deploy runlist** — `serverless-role` → `fission-role`. {`kong-deck-role` stays for the Kong cutover PRs | `kong-deck-role` is not in the runlist for SQS-only / schedule-only apps}.

### PR order

1. **Image build** — [`{service-name}#N1`](https://github.com/datacamp-engineering/{service-name}/pull/N1). Container image pushed to Artifactory.
2. **Fission deployment config** — this PR. Fission resources stand up in staging and prod; {Kong still routes external traffic to Lambda | the Lambda SQS event source still polls | the EventBridge rule still fires the Lambda}.
3. **Staging Kong cutover** — TBD. `kong.yml` switches the route to the Fission ingress. {Skip line for SQS-only / schedule-only.}
4. **Prod Kong cutover** — TBD. Same change for prod; rollback boundary. {Skip line for SQS-only / schedule-only.}
5. **Kong removal / infra cleanup** — TBD. Drop `kong-deck-role`, delete `kong.yml`. Traffic flows directly to the Fission VirtualService.
6. **Lambda decommission** — TBD. Drop the zip job, `sls remove`, EventBridge cleanup, Datadog monitor swap. (PR S2.)

References: [INF-{ticket}](https://datacamp.atlassian.net/browse/INF-{ticket}) · [INF-4864](https://datacamp.atlassian.net/browse/INF-4864) · [`fission-role`](https://github.com/datacamp-engineering/fission-role) · [`{service-name}#N1`](https://github.com/datacamp-engineering/{service-name}/pull/N1)

## Verification

- [ ] Namespace `{namespace}` resolved from `platform-metadata/services/{service-name}.yaml` `bounded_context`.
- [ ] fission-role schema fields used by this PR exist on master: `cluster_name`, `ssm_override_name` (`/datacamp-{{ env }}/{{ ssm_override_name | default(app) }}`), {HTTPTrigger `methods` / `path` if HTTP | MessageQueueTrigger `topic` / `maxReplicaCount` if SQS | TimeTrigger `cron` if schedule}, and the `env` variable in scope inside `iam_policy.json.j2`.
- [ ] {Downstream resource ARNs (SNS topic, KMS key, RDS endpoint)} match `main/locals.tf` (staging `{staging-account-id}`, prod `{prod-account-id}`).
- [ ] `python3 -c "import yaml; yaml.safe_load(open('fission.yml'))"` and the same for `deploy.yml` and `iam_policy.json.j2` (after rendering with mock vars) parse cleanly.
- [ ] CircleCI all green: `terraform-plan-1/2`, `plan-staging/prod`, `deck-operations-staging/prod`.
- [ ] Cross-VPC reachability to {downstream resource — RDS / ElastiCache / internal HTTP service} confirmed from the target namespace via `kubectl run vpc-smoke --rm -it --image=nicolaka/netshoot -- nc -zv {host} {port}`.
- [ ] Functional parity in staging: a sample {trigger payload} sent through the Fission {VirtualService / KEDA scaler / TimeTrigger} produces the same {downstream effect — SNS message / DB write / outbound HTTPS} as the equivalent call to the staging Lambda.
```

## PR I2 — Phase 3, infra repo (Merge order: 2 of 4)

Same change-summary explainer style as PR I1.

```markdown
## Summary

Part of the [INF-4864](https://datacamp.atlassian.net/browse/INF-4864) Fission migration epic. Cuts staging traffic for `{service-name}` from the Lambda fronted by Kong to the Fission VirtualService on `app-cluster`. Lambda stays alive in staging and prod, so rollback is a `kong.yml` revert. This is the **staging Kong cutover** step in the chain — full sequence below.

**What changes:**

- **Routing** — Kong staging service `host: lambda.{zone}` → `{service-name}.datacamp-staging.com` (Fission VirtualService host). The `aws-lambda` plugin block is removed from the route.
- **Plugins preserved** — every other plugin attached to the route stays unchanged: {list every non-Lambda plugin from `kong-deck dump`, e.g. `key-auth`, `acl`, `kong-http-to-https-redirect`, `ip-restriction`, `kong-cf-geolocation-header-translate`}. The runner ran `kong-deck dump` before and after the diff to confirm plugin parity.
- **Prod untouched** — the prod environment block in `kong.yml` still routes to Lambda. The prod cutover ships in PR I3.
- **Lambda still alive** — no `sls remove`, no EventBridge changes. If staging Fission errors spike, revert this PR and Lambda resumes serving traffic within seconds of the next `kong-deck` reload.

### PR order

1. **Image build** — [`{service-name}#N1`](https://github.com/datacamp-engineering/{service-name}/pull/N1). Merged.
2. **Fission deployment config** — [`{service-name}-infra#N2`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N2). Merged. Staging Fission pods running and smoke-tested.
3. **Staging Kong cutover** — this PR.
4. **Prod Kong cutover** — TBD. Mirrors this change for prod after staging is stable for ≥1h.
5. **Kong removal / infra cleanup** — TBD.
6. **Lambda decommission** — TBD.

References: [INF-{ticket}](https://datacamp.atlassian.net/browse/INF-{ticket}) · [INF-4864](https://datacamp.atlassian.net/browse/INF-4864) · [`{service-name}-infra#N2`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N2)

## Verification

- [ ] All non-Lambda Kong plugins are preserved unchanged: `kong-deck dump` before and after the diff produced identical plugin blocks for every entry except the removed `aws-lambda` block.
- [ ] Staging Fission pods are running and `/health` returns 200 from outside the cluster (`curl -sf https://{service-name}.datacamp-staging.com/health`).
- [ ] A representative production payload replayed against the public staging URL after merge produced the same {downstream effect — SNS publish / DB write / outbound HTTPS} as the staging Lambda did before the cutover.
- [ ] Datadog error rate and p95 latency for `{service-name}` held steady or improved during the merge window (compared the 30 min before merge to the 30 min after).
- [ ] Kong route case sensitivity / regex pattern carried over verbatim from the old config — no mid-migration URL changes.
```

## PR I3 — Phase 4, infra repo (Merge order: 3 of 4)

Same change-summary explainer style as PR I1 / PR I2.

```markdown
## Summary

Part of the [INF-4864](https://datacamp.atlassian.net/browse/INF-4864) Fission migration epic. Cuts prod traffic for `{service-name}` from the Lambda fronted by Kong to the Fission VirtualService on `app-cluster`. Mirrors the Phase 3 staging cutover for the prod environment block in `kong.yml`. Lambda stays alive in prod; `sls remove` runs in Phase 5 after the 24-hour stability window. This is the **prod Kong cutover** step in the chain — full sequence below.

**What changes:**

- **Routing** — Kong prod service `host: lambda.{zone}` → `{service-name}.datacamp.com` (Fission VirtualService host). Removes the `aws-lambda` plugin from the prod route. Same shape as the Phase 3 staging change applied to the prod environment block.
- **Plugins preserved** — every other plugin attached to the prod route stays unchanged ({list}). The runner compared `kong-deck dump` against the staging dump to confirm there is no env-specific drift in the preserved plugin set; any drift is flagged and resolved before merging.
- **Lambda still alive** — no `sls remove` yet. If prod Fission errors spike, revert this PR and Lambda resumes serving prod traffic within seconds.
- **Prerequisite** — Concourse prod pipeline manually triggered after PR I2 merged so prod Fission pods are already deployed and healthy before this PR opens.

### PR order

1. **Image build** — [`{service-name}#N1`](https://github.com/datacamp-engineering/{service-name}/pull/N1). Merged.
2. **Fission deployment config** — [`{service-name}-infra#N2`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N2). Merged.
3. **Staging Kong cutover** — [`{service-name}-infra#N3`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N3). Merged. Staging Fission stable for ≥1h.
4. **Prod Kong cutover** — this PR.
5. **Kong removal / infra cleanup** — TBD. Opens after prod Fission is stable for ≥24h.
6. **Lambda decommission** — TBD.

References: [INF-{ticket}](https://datacamp.atlassian.net/browse/INF-{ticket}) · [INF-4864](https://datacamp.atlassian.net/browse/INF-4864) · [`{service-name}-infra#N3`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N3)

## Verification

- [ ] Prod Fission pods are running on `app-cluster`: `kubectl get pods -n {namespace} -l app={service-name}` shows all replicas Ready.
- [ ] All non-Lambda Kong plugins on the prod route are preserved unchanged: `kong-deck dump` before and after the diff produced identical plugin blocks except the removed `aws-lambda` block. Plugin set matches the post-merge staging plugin set (no env-specific drift).
- [ ] DNS TTL was lowered to 60s ≥1h before merge if DNS-based routing is in play; skipped if traffic is purely Kong-fronted.
- [ ] Datadog `aws.lambda.invocations` for `{service-name}` dropped to zero shortly after merge while Fission HTTP request count rose to match.
- [ ] Datadog error rate and p95 latency for the public `{service-name}` URL held steady or improved through the cutover window.
- [ ] Concourse prod pipeline was manually triggered before this PR opened; prod Fission pods were already deployed and healthy before the Kong cutover landed.
```

## PR I4 — Phase 5, infra repo (Merge order: 4 of 4)

Same change-summary explainer style as PR I1 / PR I2 / PR I3.

```markdown
## Summary

Part of the [INF-4864](https://datacamp.atlassian.net/browse/INF-4864) Fission migration epic. Decommissions the Kong / Lambda infrastructure for `{service-name}` now that prod traffic has been on Fission for 24+ hours. The Fission VirtualService is now the public entrypoint. This is the **Kong removal / infra cleanup** step in the chain — full sequence below.

**What changes:**

- **Routing** — `kong.yml` is deleted. Traffic flows directly to the Fission VirtualService; Kong is no longer in the path for `{service-name}`. {Skip this bullet for SQS-only / schedule-only apps.}
- **Deploy runlist** — `terraform-role,kong-deck-role,fission-role` → `terraform-role,fission-role`. `kong-deck-role` is no longer needed for this app.
- **platform-metadata** — `lifecycle: actively-developed` set on `services/{service-name}.yaml` (separate PR if platform-metadata is a different repo from the infra repo).
- **Datadog monitors** — replace any `aws.lambda.invocations` / `aws.lambda.errors` / `aws.lambda.duration` queries with K8s / Fission equivalents (pod restart count, HTTP error rate, response latency). Delete or mute stale Lambda monitors. The team handles these via the Datadog UI or Terraform depending on convention.
- **Prerequisites** — `sls remove --stage staging` and `sls remove --stage prod` were run before this PR opened so the Lambda stack is gone in both AWS accounts before its Kong route disappears.

### PR order

1. **Image build** — [`{service-name}#N1`](https://github.com/datacamp-engineering/{service-name}/pull/N1). Merged.
2. **Fission deployment config** — [`{service-name}-infra#N2`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N2). Merged.
3. **Staging Kong cutover** — [`{service-name}-infra#N3`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N3). Merged. {Skip line for SQS-only / schedule-only.}
4. **Prod Kong cutover** — [`{service-name}-infra#N4`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N4). Merged. Prod Fission stable for ≥24h. {Skip line for SQS-only / schedule-only.}
5. **Kong removal / infra cleanup** — this PR.
6. **Lambda decommission** — TBD. PR S2 ships next; removes `serverless.yml` and the zip CI job in the service repo.

References: [INF-{ticket}](https://datacamp.atlassian.net/browse/INF-{ticket}) · [INF-4864](https://datacamp.atlassian.net/browse/INF-4864) · [`fission-role`](https://github.com/datacamp-engineering/fission-role)

## Verification

- [ ] `aws lambda list-functions --profile datacamp-staging | jq '.Functions[] | select(.FunctionName | startswith("{service:}"))'` returns empty.
- [ ] Same check on the prod profile returns empty.
- [ ] `kubectl get virtualservice -n {namespace} -l app={service-name}` shows the Fission route as the only public entrypoint.
- [ ] Datadog dashboard for `{service-name}` shows only Fission metrics; Lambda monitors are deleted or muted.
- [ ] `platform-metadata/services/{service-name}.yaml` `lifecycle: actively-developed` is set (PR linked if separate repo).
- [ ] Pre-merge `kong-deck dump` against staging + prod confirmed `{service-name}` is no longer present in the live Kong config (the route was already removed in PR I3 for prod / PR I2 for staging).
```

## PR S2 — Phase 5, service repo (Merge order: 2 of 2)

Same explainer style as PR S1: opening paragraph, file-by-file bullets, a single Mermaid `flowchart LR` showing the post-cleanup steady state (Lambda is gone — only Fission serves), per-component narrative, the same `### PR order` block with this PR marked as the current step, a `References:` line, and a past-tense `## Verification` block.

````markdown
## Summary

Part of the [INF-4864](https://datacamp.atlassian.net/browse/INF-4864) Fission migration epic. Removes the Lambda-era artifacts from `{service-name}` now that prod traffic has been on Fission for 24+ hours and the supporting infra cleanup PR ([`{service-name}-infra#N`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N)) is merged. Container build is now the only artifact path. This is the **service-repo decommission** step in the chain — full sequence below.

- `serverless.yml` (and any `serverless.*.yml` env overrides) — deleted. The Lambda is no longer deployed and the file is no longer the source of truth.
- `package.json` (or `requirements.txt`) — removes `serverless` and any `serverless-*` plugins from `devDependencies`; the lockfile is regenerated using the same package-manager version CI uses.
- `.circleci/config.yml` — removes `build_and_push_serverless_zip_to_artifactory` and any references to it from workflows. The image-build path remains as the only artifact target.
- Parity test stays in place — it imports the handler functions as plain modules and continues to assert that `server.{js|py}` does not regress against the now-archived Lambda behaviour.

### How the app works after this PR (Fission only)

```mermaid
flowchart LR
    classDef external fill:#f1f5f9,stroke:#475569,stroke-width:2px,color:#0f172a
    classDef compute  fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    classDef awsdata  fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#064e3b
    classDef api      fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#4c1d95

    {sources — same as the post-migration diagram in PR S1}

    subgraph pod["EKS · Fission function pod ({runtime}, port 3000)"]
        sjs["server.{js|py}"]:::compute
        {function nodes — unchanged handlers}
    end

    {downstream sinks — same as PR S1's post-migration diagram}

    kubelet(["kubelet<br/>readiness + liveness probes"]):::external

    {edges from sources through server.{js|py} into the unchanged handlers, then out to sinks}
    kubelet -->|"GET /health -> 200 OK"| sjs
```

- The Lambda runtime is gone; only the Fission deployment serves traffic.
- `{handler-path}` is still imported by `server.{js|py}` and the parity test, so the Lambda↔server contract stays under regression coverage even though there is no live Lambda to compare against.

### PR order

1. **Image build** — [`{service-name}#N1`](https://github.com/datacamp-engineering/{service-name}/pull/N1). Merged.
2. **Fission deployment config** — [`{service-name}-infra#N2`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N2). Merged.
3. **Staging Kong cutover** — [`{service-name}-infra#N3`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N3). Merged. (Skip line for SQS-only / schedule-only.)
4. **Prod Kong cutover** — [`{service-name}-infra#N4`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N4). Merged. (Skip line for SQS-only / schedule-only.)
5. **Kong removal / infra cleanup** — [`{service-name}-infra#N5`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N5). Merged.
6. **Lambda decommission** — this PR. Removes `serverless.yml` and the zip CI job; container build is the only remaining artifact path.

References: [INF-{ticket}](https://datacamp.atlassian.net/browse/INF-{ticket}) · [INF-4864](https://datacamp.atlassian.net/browse/INF-4864) · [`fission-role`](https://github.com/datacamp-engineering/fission-role) · [`{service-name}-infra#N5`](https://github.com/datacamp-engineering/{service-name}-infra/pull/N5)

## Verification

- [ ] `{yarn|npm|pytest} test:parity` still passes after the `serverless.yml` deletion (parity test re-imports handlers as plain modules).
- [ ] No references to `serverless`, `serverless-offline`, or any `serverless-*` plugin remain in the repo (`grep -r serverless` returns only this PR's own description if anything).
- [ ] `docker build .` succeeded against the PR head — container builds cleanly without the zip job.
- [ ] `docker run` smoke against the local image: `GET /health` → 200; the same handler-routing paths exercised in PR S1's smoke test still produce the expected status codes and observable behaviour.
- [ ] CircleCI on commit `{sha}` is green: only `test-parity`, `docker-build`, and `tag-repo` remain in the workflow (no zip job).
- [ ] `aws lambda list-functions --profile datacamp-prod | jq '.Functions[] | select(.FunctionName | startswith("{service:}"))'` returns empty (sanity check that PR I4's `sls remove` already ran and this PR is not landing prematurely).
````

## Adapting the templates per trigger type

The PR S1 / PR S2 explainer templates are written for an HTTP-fronted app (the
[`notifications-api-lambdas#66`](https://github.com/datacamp-engineering/notifications-api-lambdas/pull/66)
shape: HTTP webhook + TimeTrigger). For other trigger types, adjust as follows.

- **SQS apps** — drop the Kong subgraph and the kubelet `/health` edge from both Mermaid
  diagrams; the source node becomes the upstream SQS queue (or the SNS topic that publishes
  to it). In the post-migration diagram, replace the EventBridge / Lambda-event-source path
  with a KEDA scaler arrow into the Fission pod. In the parity-test Summary bullet, change
  "HTTP responses" to "downstream side effects (SNS publishes, DB writes, outbound HTTPS)".
  In the infra Verification (PR I1), replace the VirtualService check with a KEDA-side check
  (`kubectl get scaledobject` shows polling, a test message produces the expected side
  effect). Use the 4-PR sequence for the `### PR order` block (PR S1 → PR I1 → PR I4 → PR S2);
  there is no PR I2 / PR I3 because there is no Kong cutover.
- **Schedule-only apps** — the source node is `Fission TimeTrigger` (post-migration) /
  `CloudWatch Events` (current). The parity test fixture is an empty `{}` payload; the
  parity bullet asserts identical observable side effects (SSM read, downstream HTTP /
  publish). Drop the SNS bullet from the Summary unless the cron handler publishes. Same
  4-PR sequence as SQS apps.
- **Multi-trigger apps (HTTP + schedule, MQ + schedule, multi-MQ)** — keep both source nodes
  in both Mermaid diagrams and route them through `server.{js|py}` based on the routing
  discriminator (path, method, `X-Fission-Timer-Name` header, MQ trigger name). The
  parity test's Summary bullet must list every event type (one fixture per route). Keep the
  full 6-PR sequence if any of the triggers is HTTP-fronted; otherwise use the 4-PR sequence.
- **S3-triggered apps** — the source node is the S3 bucket via the SQS bridge (Step 7 of
  this skill). The current-state diagram shows the bucket → existing Lambda; the
  post-migration diagram shows the bucket → SQS queue → KEDA → Fission pod. Add a bullet to
  the Summary noting the SQS bridge is provisioned in the infra repo's Terraform.

For all variants the explainer structure stays the same: opening paragraph, file bullets,
two Mermaid diagrams (or one for PR S2), per-component narrative, `### PR order`, single
`References:` line, past-tense `## Verification` block.

## Local verification gate before opening either PR

The runner MUST execute every Verification bullet locally before calling `gh pr create`. If
any check fails, the PR is not opened. The Verification block in the body is the runner's
log of "I ran this; it passed" — flipping a box from `[ ]` to `[x]` is a claim that the check
ran successfully on the runner's machine, not a TODO for the reviewer.

## Replicate CI locally before opening any PR (mandatory)

Every PR opened by this skill must pass CI on first push. Failed CI on a draft PR is wasted
review cycles and rework. Before calling `gh pr create` (even for a draft), replicate every
CI job locally and confirm it passes.

**For service-repo PRs (`{app}`):**

1. **Lockfile install matches CI**: detect the package manager and run the same install
   command the CircleCI `test_parity` job will run.
   - Yarn Berry (`.yarnrc.yml` present): `yarn install --immutable`
   - Yarn Classic (no `.yarnrc.yml`, `yarn.lock` present): `yarn install --frozen-lockfile`
   - npm (`package-lock.json`): `npm ci`

   If the install fails locally, the same install will fail in CI. Fix the lockfile or the
   `.circleci/config.yml` install step before pushing. Common gotchas:
   - Yarn Berry repos must use `--immutable` (not `--frozen-lockfile`) and need
     `corepack enable` in the CircleCI image — add `sudo corepack enable` as the first step
     of the `test_parity` job.
   - The DataCamp Lambda zip job (`build_and_push_serverless_zip_to_artifactory` orb)
     historically used Yarn Classic; if a repo migrates to Berry, the orb may need a
     pre-step to enable corepack.

2. **Parity test**: run the exact command the CI job runs.
   - `yarn test:parity` (or `npm run test:parity`)
   - All fixtures must pass before pushing. If even one fails, the PR is not opened.

3. **Docker image build**: the image push job is the most CI-time-expensive — replicate it
   locally to catch Dockerfile issues before pushing.
   - `docker build -t {app}:local .`
   - Smoke-test: `docker run --rm -d -p 3000:3000 --name {app}-smoke {app}:local && sleep 2
&& curl -sf http://localhost:3000/health && docker rm -f {app}-smoke`

4. **Existing serverless zip job**: if the CI workflow still builds the Lambda zip
   (`build_and_push_serverless_zip_to_artifactory`), confirm the install step in that job
   resolves cleanly under the new `package.json`. If you added `jest` / `supertest` /
   `express` and the Lambda packaging excludes them via `package.exclude`, the zip job
   should still pass — verify by listing `package.exclude` in `serverless.yml`.

**For infra-repo PRs (`{app}-infra`):**

1. **Terraform fmt**: `terraform fmt -check -recursive -diff` from the repo root and from
   each environments subdirectory. Run with the **same Terraform version** the
   `terraform/fmt` orb uses — check `executor:` in the CircleCI config (commonly
   `terraform/terraform1_1` or `terraform/terraform1_5`). Use `tfenv use {version}` or pull
   the matching `hashicorp/terraform:{version}` Docker image.

2. **YAML / JSON parse**: validate every file the skill generated.
   - `python3 -c "import yaml; yaml.safe_load(open('fission.yml'))"`
   - `python3 -c "import yaml; yaml.safe_load(open('deploy.yml'))"`
   - `python3 -c "import json; json.loads(open('iam_policy.json.j2').read())"`
   - For `iam_policy.json.j2`, render with mock vars first if any Jinja braces are present.

3. **IAM policy validation**: `aws accessanalyzer validate-policy --policy-document
file:///tmp/rendered-policy.json --policy-type IDENTITY_POLICY` against a rendered
   version of the policy. Treat any `ERROR` finding as a blocker.

4. **Terraform plan dry-run** (only if AWS credentials are available locally): run
   `terraform plan` in the relevant env directory (with the staging profile) to preview the
   change. If the plan fails on unrelated state issues that already exist on master, surface
   that to the user as a separate issue rather than blocking the migration PR.

**If you cannot replicate a CI job locally** (e.g. you do not have AWS credentials for the
`plan` jobs, or a custom orb is opaque): tell the user explicitly which job is unverified
and ask whether to proceed anyway. Do not silently push and hope it passes.

**Pre-existing CI failures on `master`**: before declaring a PR's CI failure as introduced
by this migration, run `gh pr view {N} -R {repo} --json statusCheckRollup` against the most
recent merged PR on the repo and compare. If a job is failing on master too, flag it as
pre-existing in the PR body's Notes section and do not block the migration on it.

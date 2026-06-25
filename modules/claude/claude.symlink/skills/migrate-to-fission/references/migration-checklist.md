# Step 9 — Print zero-downtime migration checklist

Print the following phased checklist. Lambda stays live throughout until the explicit
cutover steps — there is no downtime window.

---

## Phase 1 — Prepare (both repos, no traffic impact)

**Service repo PR** (`{service-name}`):

- [ ] Add `Dockerfile` to service repo root (generated above)
- [ ] Add `server.js` / `server.py` HTTP entrypoint (generated above)
- [ ] Add `express` / `flask` to `package.json` / `requirements.txt`
- [ ] Add side-by-side parity test (`tests/integration/parity.test.js` + `tests/fixtures/*.json` + `npm run test:parity` script) — see Step 3d
- [ ] Update `.circleci/config.yml`: add `build_and_push_image_to_artifactory` alongside the existing zip build (keep both until Phase 5), and wire in the `test_parity` job to block merge on parity failure
- [ ] Run every Verification bullet from the Step 8 service-repo template locally and flip each `- [ ]` to `- [x]` only after it passes — see Step 8 for the description body
- [ ] Open PR using the Step 8 service-repo template (`gh pr create --body-file`); confirm CI passes and image is visible in Artifactory at `datacamp-docker/{service-name}` (the image tag will be set by the Concourse manifest version — do not hardcode a tag in fission.yml)

**Infra repo PR** (`{service-name}-infra`):

- [ ] Add `fission.yml` (generated above)
- [ ] Add `iam_policy.json.j2` (generated above)
- [ ] Update `deploy.yml`: add `cluster_name`, `ssm_override_name` (if needed), replace `serverless-role` with `fission-role` in runlist, add per-env `fission:` blocks with `cluster_name`
- [ ] Confirm `pipeline.yml` has `auto_deploy: false` + `after: staging` for prod
- [ ] Verify SSM params exist in both envs (commands in Step 6)
- [ ] Run every Verification bullet from the Step 8 infra-repo template locally and flip each `- [ ]` to `- [x]` only after it passes — see Step 8 for the description body
- [ ] Open PR using the Step 8 infra-repo template (`gh pr create --body-file`) — merge only after the service repo image is available in Artifactory

---

## Phase 2 — Deploy to staging (Lambda still handles all traffic)

After infra PR merges, Concourse automatically deploys to staging:

- [ ] Confirm Fission function and triggers created: `kubectl get httptrigger,timetrigger -n {namespace} -l app={app}`
- [ ] Confirm SSM secret mounted: `kubectl get secret {app}-{version} -n {namespace}`
- [ ] Verify IAM role has inline policy: `aws iam get-role-policy --role-name {app}-staging --policy-name {app}-policy --profile datacamp-staging`
<!-- lint ignore list-item-content-indent -->
- [ ] **Smoke test** Fission directly — do NOT test via the public domain (Kong still routes to Lambda):
  - HTTP: port-forward to the Fission function pod and test directly:
    ```bash
    kubectl port-forward svc/{app}-{version} 8080:80 -n {namespace}
    curl -X POST http://localhost:8080/webhook -H 'Content-Type: application/json' -d '{"test":true}'
    ```
    Or use the Fission VirtualService host via the istio ingress:
    ```bash
    kubectl get virtualservice -n {namespace} -l app={app} -o jsonpath='{.items[0].spec.hosts[0]}'
    ```
  - Schedule: wait for first cron tick; check pod logs `kubectl logs -n {namespace} -l app={app}`
  - SQS: push a test message to the staging queue; verify pod logs show processing

---

## Phase 3 — Staging traffic cutover (Kong/DNS update — separate PR)

Re-run the skill in `Phase 3` mode (Step 0a) — it will generate the `kong.yml` diff and the
PR I2 description (Merge order: 2 of 4 in `{app}-infra`). Open the PR only after every
Verification box is flipped to `[x]`:

**HTTP apps (Kong):** Update `kong.yml` — change the service `host` from `lambda.{zone}` to
`{service-name}.datacamp-staging.com` and remove the `aws-lambda` plugin (replace with a
standard `http` proxy). Keep the Lambda function alive — do NOT run `sls remove` yet.

**Preserve non-Lambda Kong plugins:** Before rewriting `kong.yml`, list all plugins on
the existing service/route. Remove only the `aws-lambda` plugin. Preserve all other
plugins unchanged:

- `ip-restriction` — teach-data-api (restricts access by IP allowlist)
- `kong-cf-geolocation-header-translate` — compliance-shenanigans (translates CloudFront geolocation headers; service fails silently without it)
- `key-auth`, `acl`, `basic-auth` — any app with consumer-based auth

Verify preserved plugin config is identical before and after the `kong.yml` change.

**Preserve Kong route behaviour 1:1.** Kong supports regex paths via the `~` prefix and is
case-insensitive on `prefix` matches by default. Istio VirtualService regex matching uses
Envoy's RE2 syntax, which **does** support inline `(?i)` for case-insensitive matching — so
a Kong path like `~/+(?i)zuora-callout` carries over verbatim into
`match.uri.regex: "/+(?i)zuora-callout"`. Do not rewrite the regex unless it actually fails
to match a representative URL. Audit:

- Plain `prefix` paths in Kong with mixed-case traffic in production (check access logs /
  Datadog) — wrap them in an Envoy regex with `(?i)` rather than dropping case-insensitivity.
- Regex routes (`paths: ['~/api/v[0-9]+/...']`) — strip the `~` prefix and use the
  remainder as `match.uri.regex`. Test the literal regex against representative URLs.

**SQS apps:** Disable Lambda SQS event source mapping in AWS console (do NOT delete the queue).
KEDA will take over automatically once the mapping is disabled.

**Short message retention risk:** If the SQS queue has a short `MessageRetentionPeriod`
(e.g. software-version-event-lambda uses 60s), messages may expire before KEDA starts
polling. Verify the Fission MQ trigger is actively polling (`kubectl get scaledobject`)
before disabling the Lambda event source mapping. Consider temporarily increasing the
retention period during cutover.

- [ ] Merge kong.yml / event-source-mapping change
- [ ] Monitor Fission error rate in staging for ≥1h before proceeding
- [ ] **Rollback if needed:** re-enable the Lambda event source mapping or revert `kong.yml`

---

## Phase 4 — Deploy to prod and prod cutover

Re-run the skill in `Phase 4` mode (Step 0a) after staging has been stable for at least one
hour. The skill generates the prod `kong.yml` diff and the PR I3 description (Merge order:
3 of 4 in `{app}-infra`).

- [ ] Manually trigger Concourse prod pipeline — Fission deploys to prod (Lambda still handles prod traffic)
- [ ] Confirm prod Fission pods are running: `kubectl get pods -n {namespace} -l app={app}`
- [ ] Open PR I3 (Merge order: 3 of 4 in `{app}-infra`) using the Step 8 template
- [ ] DNS TTL: lower to 60s at least 1h before cutover if using DNS-based routing
- [ ] Merge prod Kong/DNS change — Fission now handles prod traffic
- [ ] Monitor Datadog error rate for ≥24h minimum

---

## Phase 5 — Decommission Lambda (after 24h stable in prod)

Re-run the skill in `Phase 5` mode (Step 0a) once prod Fission has been stable for 24+
hours. The skill generates two cleanup diffs and two PR descriptions: PR I4 (infra, Merge
order 4 of 4) and PR S2 (service, Merge order 2 of 2). PR I4 must merge before PR S2 is
opened.

- [ ] `sls remove --stage staging` — removes staging Lambda + API Gateway stack
- [ ] `sls remove --stage prod` — removes prod Lambda stack
- [ ] Delete Lambda EventBridge rules (schedule apps only)
- [ ] Open PR I4 (Merge order: 4 of 4 in `{app}-infra`) — removes `kong-deck-role` from runlist and deletes `kong.yml`
- [ ] After PR I4 is merged, open PR S2 (Merge order: 2 of 2 in `{app}`) — removes `build_and_push_serverless_zip_to_artifactory`, deletes `serverless.yml`, drops `serverless` from `package.json` devDependencies
- [ ] Update Datadog monitors: replace Lambda metric queries (`aws.lambda.invocations`, `aws.lambda.errors`, `aws.lambda.duration`) with Fission/K8s equivalents (pod restart count, HTTP error rate, response latency). Delete or mute stale Lambda monitors.
- [ ] Update `platform-metadata/services/{app}.yaml`: `lifecycle: actively-developed`

---

## Rollback procedure

**HTTP / Kong apps:** Revert `kong.yml` to the `aws-lambda` plugin version and re-deploy. Lambda resumes handling traffic within seconds of Kong picking up the config.

**SQS apps:** Re-enable Lambda event source mapping in AWS console. Pause KEDA:

```bash
kubectl annotate scaledobject {app}-{version}-sqs-trigger \
  scaledobject.keda.sh/paused=true -n {namespace}
```

**Schedule apps:** Re-enable the EventBridge rule in AWS console. Lambda resumes. Suspend the Fission TimeTrigger (do not delete — deletion requires a full re-deploy to recreate):

```bash
kubectl annotate timetrigger {app}-{version}-time-trigger \
  fission.io/paused=true -n {namespace}
```

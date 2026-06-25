# Step 3 — Generate `fission.yml`

Generate the full content for `fission.yml` to be placed in the existing
`{service-name}-infra` repo root. Use the correct template based on trigger type.

**Note:** `fission.yml` must NOT have a `fission:` wrapper at root level — it is loaded by the
framework pipeline with `name: fission`, so `deployment:` and `trigger:` must be at root.

## HTTP trigger

```yaml
deployment:
  image: 'artifactory-proxy.ops.datacamp.com/datacamp-docker/{service-name}'
  # Do NOT include a tag — fission-role appends the Concourse manifest version automatically
  container_port: 3000 # adjust to match the app's listening port
  min_scale: 1
  max_scale: 5
  fixed_delay_percentage: 0 # disable fault injection (fission-role default is 10% of requests get 1s delay)
  requests_per_pod: 10 # HTTP servers handle concurrent requests well (default is 1)
  termination_grace_period_seconds: 5 # allow in-flight HTTP requests to complete (default is 0)
  # function_timeout: 60        # uncomment and increase if Lambda timeout > 60s (e.g. 900)
  # readiness_probe — add if the app has a /health endpoint or connects to a DB at startup:
  readiness_probe:
    httpGet:
      path: /health
      port: 3000
    initialDelaySeconds: 5
    periodSeconds: 10
    failureThreshold: 3
  liveness_probe:
    httpGet:
      path: /health
      port: 3000
    initialDelaySeconds: 10
    periodSeconds: 30
    failureThreshold: 3
  hpaMetrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70

trigger:
  http:
    spec:
      path: '/'
      host: '{service-name}.{zone}' # override per env in deploy.yml
```

**Important — VirtualService fault injection:** fission-role's VirtualService template injects
a 1-second fixed delay on 10% of requests by default (chaos testing). Always set
`fixed_delay_percentage: 0` in production fission.yml unless you explicitly want fault injection.
You can also control the delay duration with `fixed_delay` (default `1s`).

**Probes:** If the app has a `/health` endpoint (e.g. zuora-callouts, compliance-shenanigans),
add `readiness_probe` and `liveness_probe` as shown. If the app does NOT have a health endpoint,
either add one to `server.js`/`server.py` (recommended) or omit the probes. Without probes,
Kubernetes considers the pod ready as soon as the container starts — if the app needs time to
initialize (DB connections, SSM parameter loading), requests may fail during startup.

**Apps with database connections** (e.g. teach-data-api uses MySQL/knex): Always add a readiness
probe that verifies the DB connection is established. Set `initialDelaySeconds` higher (10-15s)
to allow connection pool initialization.

**`requests_per_pod`:** Set to 10 for HTTP servers that handle concurrent requests (Express,
Flask, native Node.js http). Keep at 1 (default) for SQS and schedule triggers where serial
processing is expected.

**`termination_grace_period_seconds`:** Default is 0 (immediate kill). Set based on the app's
longest expected in-flight operation:

- HTTP apps with fast responses (zuora-callouts, compliance-shenanigans): 5s
- HTTP apps with longer operations (notifications-api-lambdas TriggerExpiredDeletion: 30s timeout): 15s
- SQS apps (software-version-event-lambda: 60s timeout, yotpo: 15s): 30-60s
- Apps with DB queries (teach-data-api): 5s

## SQS / MQ trigger

```yaml
deployment:
  image: 'artifactory-proxy.ops.datacamp.com/datacamp-docker/{service-name}'
  # Do NOT include a tag — fission-role appends the Concourse manifest version automatically
  container_port: 3000
  min_scale: 0
  max_scale: 5
  requests_per_pod: 1 # SQS consumers process messages serially (keep at 1)
  termination_grace_period_seconds: 30 # allow in-flight SQS message processing to complete
  # function_timeout: 60        # increase if message processing takes longer (e.g. yotpo: 300s for deletion)
  # No readiness/liveness probes for SQS consumers — KEDA manages scaling based on queue depth,
  # and the pod doesn't serve external HTTP traffic. Fission router health is separate.

trigger:
  mq:
    spec:
      topic: '{queue-name}'
      errorTopic: '{queue-name}-error'
      respTopic: '{queue-name}-response'
      maxReplicaCount: 5 # use 2 for FIFO queues to preserve ordering
      minReplicaCount: 0
      pollingInterval: 30
      # cooldownPeriod defaults to 300 in fission-role — omit unless you need a different value
    metadata:
      awsRegion: 'us-east-1'
      queueURL: '' # set in deploy.yml per environment
```

**KEDA AWS credentials:** MQ triggers use static AWS credentials (not IRSA). fission-role
creates a K8s Secret from OPS account SSM params (`/concourse/AWS_ACCESS_KEY_ID_{env}` and
`/concourse/AWS_SECRET_ACCESS_KEY_{env}`). Before deploying an MQ trigger, verify these exist:

```bash
aws ssm get-parameter --name "/concourse/AWS_ACCESS_KEY_ID_staging" --profile datacamp-ops --query "Parameter.Name"
aws ssm get-parameter --name "/concourse/AWS_SECRET_ACCESS_KEY_staging" --profile datacamp-ops --query "Parameter.Name"
```

If these are missing, KEDA authentication will fail silently.

For SQS FIFO queues (`.fifo` suffix), set `maxReplicaCount: 2` to preserve message ordering.

**Multiple SQS queues:** fission-role supports multiple MQ triggers per app
([fission-role PR #11](https://github.com/datacamp-engineering/fission-role/pull/11)).
Pass a list of trigger objects under `trigger.mq`, each with a unique `name` field:

```yaml
trigger:
  mq:
    - name: events
      spec:
        topic: 'my-events-queue'
        maxReplicaCount: 5
      metadata:
        queueURL: '' # set in deploy.yml per environment
    - name: deletions
      spec:
        topic: 'my-deletions-queue'
        maxReplicaCount: 2
      metadata:
        queueURL: '' # set in deploy.yml per environment
```

Each trigger gets an independent ScaledObject and KEDA connector. Resource naming:
`{app}-{version}-{name}-trigger`. Single-object form (no `name`) still works — defaults
to `sqs`, producing the same `{app}-{version}-sqs-trigger` naming as before.

For yotpo-integration-lambdas, the alternative pattern is to use the MQ trigger for the
primary queue and handle the secondary queue in application code via the TimeTrigger
(cron fires `HandleUserDeletionEvent`, which polls the second SQS queue using the AWS SDK).
Ensure the IAM policy includes `sqs:ReceiveMessage` and `sqs:DeleteMessage` for all queues.

## Schedule / cron trigger

```yaml
deployment:
  image: 'artifactory-proxy.ops.datacamp.com/datacamp-docker/{service-name}'
  # Do NOT include a tag — fission-role appends the Concourse manifest version automatically
  container_port: 3000
  min_scale: 0
  max_scale: 1
  requests_per_pod: 1 # schedule triggers fire serially
  termination_grace_period_seconds: 10 # allow in-flight cron job to complete (adjust based on job duration)
  # function_timeout: 60        # uncomment and increase if Lambda timeout > 60s
  # No probes for schedule-only apps — pod scales to zero between cron ticks

trigger:
  time:
    spec:
      cron: '0 15 * * *' # standard Linux cron (5 fields, UTC)
```

**AWS → Linux cron conversion:** AWS uses 6-field format `cron(m h dom mon dow year)`.
Drop the `cron()` wrapper and the 6th field (year):

- `cron(0 15 * * ? *)` → `0 15 * * *`
- `cron(0 0 1,15 * ? *)` → `0 0 1,15 * *`

**Parallelism behaviour change vs EventBridge:** AWS EventBridge with a Lambda target does
not start a new invocation while the previous one is still running for the same schedule
(implicit single-flight). Fission TimeTrigger does NOT make this guarantee — if the previous
HTTP invocation is still in flight when the next cron tick fires, Fission will dispatch
another concurrent request to the function. Apps that relied on EventBridge's serial
behaviour (long-running batch jobs, idempotent-but-not-safe-to-double-run handlers) must
either:

- Make the handler idempotent (DB row lock, advisory lock, S3 object lock, conditional
  writes), or
- Set `max_scale: 1` AND `requests_per_pod: 1` AND a long enough `function_timeout` so the
  next cron tick queues behind the in-flight one rather than starting a second pod.

Verify the cron interval > worst-case handler runtime before merging.

## Multi-trigger (HTTP + schedule, or MQ + schedule)

When `serverless.yml` has functions with different event types (e.g. one HTTP handler and one
scheduled function), generate a single `fission.yml` with both trigger sub-keys. fission-role
creates all declared resources in one deploy pass using independent `when:` guards.

**HTTP + TimeTrigger example (`notifications-api-lambdas` pattern):**

```yaml
deployment:
  image: 'artifactory-proxy.ops.datacamp.com/datacamp-docker/{service-name}'
  container_port: 3000
  min_scale: 1
  max_scale: 5
  fixed_delay_percentage: 0 # disable fault injection
  requests_per_pod: 10 # HTTP server handles concurrent requests
  termination_grace_period_seconds: 15 # notifications TriggerExpiredDeletion can take up to 30s
  # function_timeout: 60        # increase if any handler exceeds 60s
  readiness_probe:
    httpGet:
      path: /health
      port: 3000
    initialDelaySeconds: 5
    periodSeconds: 10

trigger:
  http:
    spec:
      path: '/'
      host: '{service-name}.{zone}' # override per env in deploy.yml
  time:
    spec:
      cron: '0 * * * *' # override per env in deploy.yml if needed
```

**MQ + TimeTrigger example (`yotpo-integration-lambdas` pattern):**

```yaml
deployment:
  image: 'artifactory-proxy.ops.datacamp.com/datacamp-docker/{service-name}'
  container_port: 3000
  min_scale: 0
  max_scale: 5
  requests_per_pod: 1 # SQS consumer processes messages serially
  termination_grace_period_seconds: 60 # yotpo deletion handler can take up to 300s per batch
  function_timeout: 300 # match longest handler (HandleUserDeletionEvent)
  # No probes for MQ+schedule — KEDA manages scaling

trigger:
  mq:
    spec:
      topic: '{queue-name}'
      maxReplicaCount: 5
      minReplicaCount: 0
    metadata:
      awsRegion: 'us-east-1'
      queueURL: '' # set in deploy.yml per environment
  time:
    spec:
      cron: '0 8 * * *' # override per env in deploy.yml if needed
```

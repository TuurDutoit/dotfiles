# Step 7b — Per-app configuration reference

After classifying the app, use this table to set the correct `deployment` values in
`fission.yml`. These are derived from each app's actual Lambda timeout, processing pattern,
and initialization requirements.

| App                               | Trigger         | Lambda Timeout | `container_port` | `requests_per_pod` | `termination_grace_period_seconds` | `function_timeout` | Probe                         | DB Init   | Notes                                                                                                                  |
| --------------------------------- | --------------- | -------------- | ---------------- | ------------------ | ---------------------------------- | ------------------ | ----------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| zuora-callouts                    | HTTP            | 3s             | 3000             | 10                 | 5                                  | 60                 | `/health` (exists in handler) | No        | SNS publish, VPC                                                                                                       |
| compliance-shenanigans            | HTTP            | 3s             | 3000             | 10                 | 5                                  | 60                 | `/health` (exists in handler) | No        | Tier 1, IP geolocation API                                                                                             |
| notifications-api-lambdas         | HTTP + schedule | 30s            | 3000             | 10                 | 15                                 | 60                 | Add `/health`                 | No        | Already has server.js + Dockerfile                                                                                     |
| teach-data-api                    | HTTP            | 3s             | 3000             | 10                 | 5                                  | 60                 | Add `/health` with DB ping    | **MySQL** | knex connection pool init                                                                                              |
| software-version-event-lambda     | SQS (FIFO)      | 60s            | 3000             | 1                  | 30                                 | 60                 | None                          | No        | FIFO: `maxReplicaCount: 1`, 60s message retention — cutover risk                                                       |
| yotpo-integration-lambdas         | SQS + schedule  | 15s / 300s     | 3000             | 1                  | 60                                 | 300                | None                          | No        | Two SQS queues, SES email, cron: `0 10 * * 3` (Wed only)                                                               |
| content-similarity                | HTTP            | 900s           | 3000             | 5                  | 10                                 | 900                | Add `/health` with DB ping    | **MySQL** | Preserve Python 3.7 + existing `requirements.txt` (any runtime/lib upgrade ships in a separate PR S0 before migration) |
| github-student-pack-authenticator | HTTP            | 6s             | 3000             | 10                 | 5                                  | 60                 | Add `/health`                 | No        | OAuth 302 redirects, `ssm_override_name` required                                                                      |

**Key decisions:**

- **`requests_per_pod: 10`** for HTTP apps — Express/Node.js handles concurrent requests well.
  Keep at 1 for SQS and schedule apps where serial processing is expected.
- **`termination_grace_period_seconds`** — match to the longest in-flight operation the app performs.
  0 (the fission-role default) is too aggressive for any app doing real work.
- **Probes** — add `readiness_probe` for HTTP apps that serve external traffic. Apps with DB
  connections (teach-data-api) need a probe that verifies the connection is established before
  receiving traffic. SQS and schedule-only apps don't need probes (KEDA and Fission Timer manage
  their lifecycle).
- **`container_port: 3000`** — all apps should use 3000 (standard Express/Node.js port).
  The fission-role default is 80 but 3000 avoids running as root and matches common Node.js conventions.
- **Long `function_timeout` needs an Istio route-timeout override.** `fission-role`'s
  `virtual_service.yml.j2` exposes the per-route Istio timeout via
  `deployment.istio_route_timeout` (default `15s`) since
  [fission-role#16](https://github.com/datacamp-engineering/fission-role/pull/16) (merged
  2026-05-06). For HTTP handlers whose `function_timeout` exceeds 15s, set both keys in
  `fission.yml`:

  ```yaml
  deployment:
    function_timeout: 900 # match the Lambda timeout
    istio_route_timeout: '15m' # override the 15s Istio default
  ```

  Envoy's `stream_idle_timeout` (default 5 minutes) and any upstream gateway timeouts
  (Istio Gateway, Kong, ALB) still apply, so confirm those are at least as long as the new
  route timeout before merging.
  - **content-similarity (900s)** — set `function_timeout: 900` and
    `istio_route_timeout: "15m"`. Confirm the cluster Fission router timeout and the Istio
    Gateway / Kong upstream timeouts are ≥ 15m as well, otherwise the request gets cut by the
    upstream layer before the function returns. If any upstream cap is shorter, split the
    handler into chunks that complete within that cap.
  - **yotpo-integration-lambdas (300s)** — set `function_timeout: 300` and
    `istio_route_timeout: "5m"`. Sits at the Envoy `stream_idle_timeout` boundary; validate
    end-to-end in staging with a representative deletion batch before prod cutover.

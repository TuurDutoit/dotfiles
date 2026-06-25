# Step 4 — Show `deploy.yml` changes

Show what needs to change in the existing `deploy.yml` in `{service-name}-infra`.

1. **Add `cluster_name: app-cluster` at the top level** (required by fission-role to target the correct cluster).

2. **Add `ssm_override_name`** if the `service:` field in `serverless.yml` differs from the infra repo app name.
   fission-role reads SSM from `/datacamp-{env}/{ssm_override_name | default(app)}/`.
   Example: if `serverless.yml` has `service: selfserve-notif-api-lambdas` but the app is `notifications-api-lambdas`, add:

   ```yaml
   ssm_override_name: selfserve-notif-api-lambdas
   ```

   **Always check `serverless.yml` `service:` carefully** — it often differs from the repo name.
   Known mismatches:
   - `compliance-shenanigans` → `service: selfserve-tracking-generator` (but SSM uses repo name — do NOT set `ssm_override_name`)
   - `software-version-event-lambda` → `service: scorecard-score-change-event-lambda`
   - `notifications-api-lambdas` → `service: selfserve-notif-api-lambdas`
   - `zuora-callouts` → `service: selfserve-zuora-callouts`
   - `github-student-pack-authenticator` → `service: selfserve-github-student-auth`

3. **Replace `serverless-role` with `fission-role` in the runlist.**
   Do NOT keep both — Lambda continues running in AWS (it was previously deployed and
   stays alive) until `sls remove` is explicitly run after the traffic cutover. Running
   `serverless-role` alongside `fission-role` on every Concourse deploy is unnecessary overhead.

   If `kong-deck-role` is in the runlist, **keep it** — it manages Kong config, and `kong.yml`
   will be updated separately at cutover time to redirect traffic from Lambda to Fission.
   Remove `kong-deck-role` only after the Kong cutover is complete and traffic flows directly
   to the Fission VirtualService.

```yaml
# Before (app without Kong)
runlist: "terraform-role,serverless-role"

# After (app without Kong)
runlist: "terraform-role,fission-role"

# Before (app with Kong — e.g. zuora-callouts, notifications-api-lambdas, teach-data-api)
runlist: "terraform-role,kong-deck-role,serverless-role"

# After (app with Kong — keep kong-deck-role during transition)
runlist: "terraform-role,kong-deck-role,fission-role"
# Remove kong-deck-role only after Kong cutover is complete
```

4. **Check `pipeline.yml`** — ensure prod has `auto_deploy: false` and `after: staging`.
   This gates prod deployment behind a manual Concourse trigger, giving you time to validate
   Fission in staging before promoting to prod:

```yaml
pipelines:
  - name: staging
    environments:
      - name: staging

  - name: prod
    auto_deploy: false
    environments:
      - name: prod
    after: staging
```

5. **Add per-environment `fission:` override blocks** under `staging:` and `prod:`.
   There is no top-level `fission:` key — all overrides live inside the env blocks.
   `cluster_name` can be set at top level as a default and overridden per env if needed:

   ```yaml
   # Top-level defaults (add near the top of deploy.yml)
   cluster_name: app-cluster
   ```

For HTTP apps:

```yaml
staging:
  cluster_name: app-cluster
  fission:
    deployment:
      env:
        - name: APP_ENV
          value: staging
    trigger:
      http:
        spec:
          host: '{service-name}.datacamp-staging.com'

prod:
  cluster_name: app-cluster
  fission:
    deployment:
      env:
        - name: APP_ENV
          value: prod
    trigger:
      http:
        spec:
          host: '{service-name}.datacamp.com'
```

For SQS apps:

```yaml
staging:
  cluster_name: app-cluster
  fission:
    trigger:
      mq:
        metadata:
          queueURL: 'https://sqs.us-east-1.amazonaws.com/{staging-account-id}/{queue-name}'

prod:
  cluster_name: app-cluster
  fission:
    trigger:
      mq:
        metadata:
          queueURL: 'https://sqs.us-east-1.amazonaws.com/{prod-account-id}/{queue-name}'
```

For schedule apps:

```yaml
staging:
  cluster_name: app-cluster
  fission:
    trigger:
      time:
        spec:
          cron: '0 15 * * *' # adjust if staging uses a different schedule

prod:
  cluster_name: app-cluster
  fission:
    trigger:
      time:
        spec:
          cron: '0 15 * * *'
```

For multi-trigger apps (HTTP + schedule or MQ + schedule):

```yaml
staging:
  cluster_name: app-cluster
  fission:
    deployment:
      env:
        - name: APP_ENV
          value: staging
    trigger:
      http:
        spec:
          host: '{service-name}.datacamp-staging.com'
      time:
        spec:
          cron: '0 * * * *'

prod:
  cluster_name: app-cluster
  fission:
    deployment:
      env:
        - name: APP_ENV
          value: prod
    trigger:
      http:
        spec:
          host: '{service-name}.datacamp.com'
      time:
        spec:
          cron: '0 * * * *'
```

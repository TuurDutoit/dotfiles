# Step 7 — Flag blockers

Flag any of the following with a clear action item before proceeding:

- **S3 trigger**: Fission does not support S3 events. Bridge with an SQS queue: S3 bucket
  notification → SQS → Fission MQ trigger. Add the SQS queue + bucket notification to
  `{service-name}-infra/main/` Terraform first. Skeleton:

  ```hcl
  resource "aws_sqs_queue" "{app}_events" {
    name                       = "{app}-events"
    message_retention_seconds  = 1209600
    visibility_timeout_seconds = 300
  }

  resource "aws_s3_bucket_notification" "{app}_events" {
    bucket = aws_s3_bucket.{bucket}.id
    queue {
      queue_arn = aws_sqs_queue.{app}_events.arn
      events    = ["s3:ObjectCreated:*"]
    }
  }
  ```

  **S3 single-notification overwrite warning:** `aws_s3_bucket_notification` is a singleton
  per bucket — declaring a new one replaces all existing notification configs (Lambda
  triggers, EventBridge, other SNS/SQS notifications). Before adding the resource,
  enumerate the bucket's existing notifications and merge them in:

  ```bash
  aws s3api get-bucket-notification-configuration \
    --bucket {bucket-name} \
    --profile datacamp-staging
  ```

  If the existing config has Lambda or other queue/topic entries, declare them under the
  same `aws_s3_bucket_notification` resource (Terraform supports multiple `queue {}`,
  `lambda_function {}`, and `topic {}` blocks) so the apply does not silently drop
  unrelated integrations.

  **MediaConvert apps (e.g. `projector-video-transcoder`):** add `iam:PassRole` to the
  Fission function's IAM policy, scoped to the MediaConvert service role ARN. Without it,
  `CreateJob` fails with `User is not authorized to perform iam:PassRole`.

- **Direct Lambda invoke** (`lambda:InvokeFunction` in IAM or `Lambda.invoke()` in code): Fission
  has no equivalent. Must be refactored to HTTP calls between Fission functions. Check if any
  other service invokes this Lambda directly (e.g. teach-data-api).
- **Multiple scheduled functions** (e.g. enterprise-scheduler with 7 functions): Each function
  needs a separate fission-role invocation or the app should be refactored as a single HTTP
  service with multiple paths.
- **Multiple SQS queues**: If the app consumes from more than one queue (e.g. yotpo-integration-lambdas),
  each queue needs a separate MQ trigger declaration. Ensure all queue URLs are overridden per
  environment in deploy.yml.
- **EFS mount**: Add `fission.deployment.volumes` and `fission.deployment.volume_mounts` to
  `fission.yml`. Do NOT add `elasticfilesystem:ClientMount` / `ClientWrite` to the IAM policy
  — Fission mounts EFS via the AWS EFS CSI driver and a PersistentVolumeClaim, not via
  pod-level IAM. Verify the EKS node security group allows NFS (TCP 2049) inbound from the
  EFS mount target security group. Reuse existing access points when possible — creating a
  new access point per migration multiplies the EFS file-system access surface. Example:

  ```yaml
  deployment:
    volumes:
      - name: shared-data
        persistentVolumeClaim:
          claimName: {app}-efs-pvc
    volume_mounts:
      - name: shared-data
        mountPath: /mnt/efs
  ```

  The PVC and PV (referencing the EFS access point) must be pre-provisioned in the namespace
  via Terraform before the first `fission-role` deploy.

  **Image registry note for EFS-mounting Lambdas (e.g. `collab-lambda`):** Lambdas that
  currently pull from ECR must be re-pushed to Artifactory at
  `artifactory-proxy.ops.datacamp.com/datacamp-docker/{service-name}` before the cutover —
  fission-role only pulls from Artifactory. Update the service repo's CircleCI job to push
  to Artifactory in addition to (or instead of) ECR.

- **VPC dependencies**: If the Lambda has `vpc:` config in `serverless.yml`, it connects to
  resources (RDS, ElastiCache, internal APIs) via VPC peering. Verify the target resources are
  reachable from the EKS cluster VPC — check VPC peering routes, security group ingress rules,
  and NACLs. Istio handles service mesh within K8s but does NOT handle cross-VPC connectivity.

  **Smoke-test reachability before cutover** — run a throwaway pod in the target namespace and
  hit the resource directly (replace host/port with the `vpc:` target):

  ```bash
  kubectl run vpc-smoke --rm -it --restart=Never \
    --image=nicolaka/netshoot \
    -n {namespace} \
    -- /bin/sh -c 'nc -zv {target-host} {port}'
  ```

  Common targets: RDS (3306/5432), ElastiCache Redis (6379), internal HTTP services (443/80).
  If `nc` reports `Connection refused` or hangs, fix the security group / peering route before
  merging the infra PR — Fission deploys will succeed but the function will fail at the first
  outbound connection.

- **apex framework** (no `serverless.yml`): Requires rewrite as a standard HTTP handler before migration.
- **Runtime version**: Match the existing `provider.runtime` (or per-function `runtime:`)
  from `serverless.yml` exactly. **Never upgrade runtime as part of this migration, even
  if the runtime is end-of-life.** This rule is universal — it applies to every Node /
  Python version listed in the epic (Node 14, 16, 18, 20; Python 3.7) and to every
  dependency declared in `package.json` / `requirements.txt`. Runtime jumps and library
  version bumps multiply the blast radius and break the parity test's reference baseline.
  If a runtime upgrade is required (EOL, security CVE, downstream incompatibility), ship
  it as a dedicated PR (call it **PR S0** for this migration) that lands and bakes in
  prod **before** PR S1 opens. The Dockerfile base image is chosen from the runtime
  mapping table in Step 3c using the source `runtime:` verbatim. Post-migration upgrades
  are also their own PRs and never bundled with cleanup or other Fission work.
- **Service name mismatch + `auto_deploy: true`**: If `pipeline.yml` has `auto_deploy: true` for
  prod, the first Concourse deploy after merge will push to prod automatically. Ensure
  `auto_deploy: false` is set before merging the infra PR.

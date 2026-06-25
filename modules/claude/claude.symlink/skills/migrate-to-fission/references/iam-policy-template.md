# Step 3b — Generate `iam_policy.json.j2`

Generate `iam_policy.json.j2` to be placed at the root of the `{service-name}-infra` repo.
Base it on the IAM permissions from `serverless.yml` (`provider.iam.role.statements`).

Always include SSM read and KMS decrypt. Scan `serverless.yml` IAM statements for additional
permissions and add them as separate Statement entries. Common ones to look for:

- `sns:Publish` — needed by zuora-callouts (system-events topic), notifications-api-lambdas (dc-notifications topic)
- `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage` — SQS-triggered apps
- `s3:GetObject`, `s3:PutObject` — apps accessing S3 buckets
- `lambda:InvokeFunction` — flag as blocker (direct invoke needs refactoring, see Step 7)
- `mediaconvert:*`, `iam:PassRole` — media processing apps (e.g. projector-video-transcoder)
- `ses:SendEmail`, `ses:SendRawEmail` — yotpo-integration-lambdas (sends deletion requests to Yotpo via SES)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:Describe*", "ssm:Get*", "ssm:List*"],
      "Resource": "*"
    }
  ]
}
```

Add additional Statement entries from `serverless.yml` `provider.iam.role.statements` after the
SSM block. Do not use JSON comments — they are not valid JSON and will cause parse errors.

**Critical — silent skip behaviour:** `setup_iam.yml` in fission-role skips IAM policy
attachment with no error if `iam_policy.json.j2` is absent from the infra repo root. The
function still deploys, then fails at runtime with `AccessDenied` the first time it touches
SSM, SNS, SQS, or any other AWS resource. Before merging the infra PR, confirm:

```bash
git ls-files iam_policy.json.j2   # must print the path, not empty
```

Also confirm the inline policy is attached after deploy:

```bash
aws iam get-role-policy \
  --role-name {app}-staging \
  --policy-name {app}-policy \
  --profile datacamp-staging
```

---
name: enable-teleport-for-db
description: Enable Teleport database access for an application's RDS instance. Guides through all required changes across the infra repo (Terraform, deploy.yml, dbusers.yml). Use when asked to set up Teleport for a database, enable Teleport DB access, or onboard a database to Teleport.
metadata:
  version: '1.1.0'
  tags: teleport, database, rds, infra, access
---

# Enable Teleport DB Access

## Context

Set up Teleport database access for an application's RDS instance. This requires changes in the application's `-infra` repository.

## When to use

Use when asked to:

- "Enable Teleport for the <app> database"
- "Set up Teleport DB access for <app>"
- "Onboard <app> database to Teleport"

## Prerequisites

You must be working inside the application's `-infra` repository (e.g. `<app>-infra`).

## Usage

### Step 1: Gather required inputs

Collect the following from the user if not already known:

- **App name**: Check `deploy.yml` for the `app:` field, or `catalog-info.yaml` for `metadata.name`.
- **Database engine**: `mysql` or `postgres` — check `rds.tf` for the `engine` field.
- **Database name**: The logical database name — check `rds.tf` for the `db_name` field.
- **Database endpoint pattern**: Check `rds.tf` or existing Route53 records for the internal DNS name pattern (typically `<db-name>.<region>.internal.datacamp.com` for prod and `<db-name>.<region>.internal.datacamp-staging.com` for staging).
- **Admin credentials SSM paths**: Check `rds.tf` for existing SSM parameter references for the master username and password.

### Step 2: Enable IAM database authentication in Terraform

In `environments/common/rds.tf`, find the `aws_db_instance` resource and ensure the following are set:

1. **IAM authentication must be enabled**:

   ```hcl
   iam_database_authentication_enabled = true
   ```

   If this line is missing or set to `false`, add/update it.

2. **Teleport discovery tag must be present** in the `tags` block:
   ```hcl
   tags = {
     # ... existing tags ...
     "teleport.dev/database_name" = "<app-name>-${var.ENVIRONMENT}"
   }
   ```
   Replace `<app-name>` with the application identifier (e.g. `engineering-portal`).

### Step 3: Ensure network access from the ops cluster

In the security group for the database (in `rds.tf`), verify there is an ingress rule allowing access from the ops/concourse subnet (`10.10.0.0/16`). This is required for the `db-teleport-user-role` Ansible role to connect and create users.

```hcl
ingress {
  description = "Allow concourse subnet access"
  from_port   = <db_port>  # 5432 for postgres, 3306 for mysql
  to_port     = <db_port>
  protocol    = "tcp"
  cidr_blocks = ["10.10.0.0/16"]
}
```

If this rule already exists, no changes are needed.

### Step 4: Create `dbusers.yml`

Create a `dbusers.yml` file in the root of the infra repo. This file configures the `db-teleport-user-role` Ansible role with database connection details.

#### For PostgreSQL:

```yaml
---
engine: postgres
database_config:
  endpoint: "{{ '<db-endpoint>.us-east-1.internal.datacamp.com' if env == 'prod' else '<db-endpoint>.us-east-1.internal.datacamp-staging.com' }}"
  database_name: <database_name>
  admin_username: "{{ '/datacamp-' ~ env ~ '/<app>/DB_USER' }}"
  admin_password: "{{ '/datacamp-' ~ env ~ '/<app>/DB_PASSWORD' }}"
```

#### For MySQL:

```yaml
---
engine: mysql
database_config:
  endpoint: "{{ '<db-endpoint>.us-east-1.internal.datacamp.com' if env == 'prod' else '<db-endpoint>.us-east-1.internal.datacamp-staging.com' }}"
  database_name: <database_name>
  admin_username: datacamp
  admin_password: "{{ '/datacamp-' ~ env ~ '/<app>/MASTER_DATABASE_PWD' }}"
  port: 3306
```

Use the actual SSM parameter paths found in `rds.tf` for admin credentials. The endpoint should match the Route53 CNAME record pointing to the RDS instance.

### Step 5: Add `db-teleport-user-role` to the runlist

In `deploy.yml`, add `db-teleport-user-role` to the `runlist`:

```yaml
runlist: terraform-role,migration-role,k8s-role,db-teleport-user-role
```

Append it to the existing runlist. The role will run on each deploy and is idempotent.

### Step 6: What the role does (for reference)

The `db-teleport-user-role` Ansible role automatically creates Teleport-specific database users:

**PostgreSQL** creates two users:

- `teleport` — read-only user with `rds_iam` role, `SELECT` on all tables in the `public` schema
- `teleport_admin` — user with `CREATEDB`, `CREATEROLE`, `rds_iam` role, and `SELECT` on all tables

**MySQL** creates one user:

- `teleport` — authenticated via `AWSAuthenticationPlugin` (IAM), granted `SELECT` on the application database

These users authenticate via IAM (not passwords), which is why `iam_database_authentication_enabled = true` is required in Terraform.

### Step 7: Commit and open a PR

Make one commit per logical change:

1. Terraform changes (`rds.tf`) — enabling IAM auth and adding the teleport tag
2. `dbusers.yml` creation
3. `deploy.yml` runlist update

Or combine into a single commit if all changes are small:

```text
feat: enable teleport database access
```

## Checklist

Before merging, verify:

- [ ] `iam_database_authentication_enabled = true` is set in `rds.tf`
- [ ] `teleport.dev/database_name` tag is present on the RDS instance
- [ ] Security group allows ingress from `10.10.0.0/16` (ops/concourse)
- [ ] `dbusers.yml` exists with correct engine, endpoint, database name, and admin credentials
- [ ] `db-teleport-user-role` is in the `deploy.yml` runlist
- [ ] Terraform plan shows expected changes (IAM auth enabled, tag added)

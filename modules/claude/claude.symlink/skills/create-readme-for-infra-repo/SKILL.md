---
name: create-readme-for-infra-repo
description: Author or refresh the README.md of a DataCamp `*-infra` repository — the Terraform/Concourse repos that pair with each application. Use whenever the user asks to "write a README for this infra repo", "document this infra repo", "the README is missing / outdated for this -infra repo", or is opening a new infra repo and wants the standard layout. Detects the repo's app name, owning team, workload type (k8s/MFE/frontend), AWS account/cluster, environment pipeline, Kong routes, DB migrations and Teleport access from the canonical files (`deploy.yml`, `pipeline.yml`, `k8s.yml` / `microfrontend.yml` / `frontend.yml`, `kong.yml`, `migration.yml`, `dbusers.yml`, `environments/`, `modules/`). Idempotent — preserves a `## Notes` section (between HTML markers) on refresh so user-authored content survives reruns.
allowed-tools:
  - Bash(git:*)
  - Bash(gh api:*)
  - Bash(yq:*)
  - Bash(base64:*)
  - Bash(basename:*)
  - Read(./**)
  - Write(./README.md)
  - Glob(./**)
  - Grep(./**)
metadata:
  version: '1.0.0'
---

# create-readme-for-infra-repo

Write a high-signal `README.md` for a DataCamp `*-infra` repository. These repos have a strongly conventional shape — almost all of the README content can be derived from a handful of files. Your job is to extract those values, fill the template, and write the file. Don't invent details.

## Context

DataCamp has ~70 `*-infra` repos. Their READMEs are inconsistent or missing, which slows down both human onboarding and agent navigation. The repos follow a tight convention (Concourse `deploy.yml` + `pipeline.yml` + Terraform `environments/{prod,staging,common}` + `main/`), so a templated README is high signal and low effort.

Trigger on requests like:

- "write a README for this infra repo"
- "document this `*-infra` repo"
- "this -infra repo has no README, can you generate one?"
- "refresh the README in this repo, the layout has drifted"

Don't trigger on regular application repos (no `deploy.yml` with a `runlist`). If you're unsure whether the current repo is an infra repo, run the discovery step first — if `deploy.yml` and the layout don't match, stop and tell the user.

## Usage

### 1. Discover the repo

**Always discover against the deployed state, not the working tree.** Run `git fetch origin` and read every file below from `origin/master` (or `origin/main` if that's the default branch) using `git show origin/master:<path>` and `git ls-tree -r origin/master`. Working trees go stale, branches diverge, and the README must reflect what's actually deployed. If the user explicitly asks you to document an in-progress branch, do so but call it out in the post-run summary.

**Hard stop: `deploy.yml` is required.** If it's missing on master, stop and tell the user — this isn't a recognized `*-infra` repo and the rest of the discovery is meaningless without it. For every other file below, skip missing ones gracefully.

- `deploy.yml` — primary source of truth, **organised in two layers that mirror the Terraform folder split**: top-level keys are the **common** values applied to every environment; the per-env blocks (`staging:`, `prod:`, `us-west-2-prod:`, etc.) hold **env-specific overrides** that the framework merges on top of the common values for that env's plan/apply. Extract from the common top level: `app`, `runlist`, `concourse_team`, `cluster_name`, `region`, `gcp_region`, `deployment_notification`, `app_repo`, `terraform_binary`, `integration_tests_repo`, `integration_tests_branch`. Extract per env from each env block: `cluster_name`, `region`, `app_account`, `deployment_tests` (preferred) or `acceptance_tests` (legacy alias — framework reads `deployment_tests | default(acceptance_tests)`), `k8s` (replicas / requests / limits / hpa / pdb), `kong_deck`, plus any app-specific keys (e.g. `enterprise_app_redis`). The top-level `region:` is sometimes commented out — that's expected; the framework's `vars/environments.yml` provides the default per env (`staging` / `prod` → us-east-1; `us-west-2-prod` → us-west-2; `eu-central-1-*` → eu-central-1; etc.). Infer region from the env name prefix when the deploy.yml is silent. **`concourse_team` may be absent** in newer repos — it's now derived from the bounded context registered in `platform-metadata`; don't error if it's missing, just say so. **`app:` is the bare app name** (e.g. `optima`), paired with code repo `<app>` and infra repo `<app>-infra` — never the `-infra` suffix.
- `main/` — the **single Terraform root** for the repo. Look at `main/tf-state.tf` to identify the cloud provider:
  - `backend "s3"` → AWS (state in `s3://datacamp-{env}-tf-state/{app}`)
  - `backend "gcs"` → GCP (state in `gs://datacamp-{env}-tf-state/{app}`); see [`data-platform-infra`](https://github.com/datacamp-engineering/data-platform-infra) as the reference
  - `backend "azurerm"` → Azure
  - Per-env isolation comes from `terraform-role` injecting `-backend-config='bucket=datacamp-{{ env }}-tf-state'` + `-backend-config='prefix={{ app }}'` at init — **there is one root, not one per env**.
- `catalog-info.yaml` — if present, registers the service in the Engineering Portal via platform-metadata ingestion. Mention in the rendered Repository layout.
- `pipeline.yml` — gives the **promotion order** of environments. Each entry has a `name:`, an `environments:` list, an optional `after: <env>` that defines its parent (root entries have no `after:`), and an optional `auto_deploy: false` flag that marks the env as manual.
- `k8s.yml` / `microfrontend.yml` / `frontend.yml` — determines the **workload type**. Most repos have exactly one, but **hybrid runlists exist** (e.g. a k8s service that also publishes an MFE bundle has both `k8s.yml` and `microfrontend.yml`, and the runlist contains both `k8s-role` and `microfrontend-role`). Record every workload file that's present and render them all; cross-check against the runlist.
- `kong.yml` — if present, the service has public HTTP routes via Kong. **This is the only source of Kong configuration.** Modern infra repos never manage Kong via Terraform; if you see `environments/*/kong/` directories in a working tree but no `kong.yml` on master, that's a stale checkout — re-fetch.
- `migration.yml` — if present, the service has DB migrations.
- `dbusers.yml` — if present, Teleport DB access is configured.
- `iam_policy.json` — if present, the service has a custom IAM policy.
- `environments/` — list subdirectories on master. The convention is **one `common/` directory + one per environment** (`staging/`, `prod/`, `us-west-2-prod/`, etc.):
  - `environments/common/` holds **every resource that applies to all environments** — RDS / Redis / S3 buckets / Kong / IAM / event topics, etc. This is where the bulk of the Terraform lives. `main.tf` in this directory is the heart of the repo.
  - `environments/<env>/` holds **only what differs for that env** — env-tuned monitoring, env-only test buckets, region-specific resources, scaled-down replicas for BCP envs. Each env folder is included on top of `common/` for that env's plan/apply.
  - Capture for each env folder what's actually in there (e.g. `monitoring.tf`, `s3.tf`, etc.) so the rendered Repository layout can be specific rather than saying "overrides".
- `modules/` — list subdirectories (almost always at least `monitoring/`).
- `.circleci/config.yml` — every DataCamp infra repo uses CircleCI. If a repo only has `.github/workflows/` and no `.circleci/config.yml`, treat that as anomalous and flag it in the post-run summary rather than rendering a GitHub Actions row. Note the `context:` values referenced by jobs — per-app contexts (e.g. `optima`) are used for app-specific credentials following the `{ENV_TYPE_UPPER}_{CREDENTIAL_NAME}` naming convention (e.g. `STAGING_GOOGLE_CREDENTIALS`, `PROD_GOOGLE_CREDENTIALS`); `org-global` is reserved for shared variables and is near its variable limit so new credentials should go in the per-app context. Concourse paramstore uses the inverse naming: `{CREDENTIAL_NAME}_{env}` (e.g. `GOOGLE_CREDENTIALS_optima-prod`).
- Existing `README.md` — read it before overwriting (see Idempotency).

> **`{app}` ambiguity, important.** The repo basename (e.g. `purchase-infra`) and the `app:` field in `deploy.yml` can diverge. The `app:` field is the canonical identifier used by Concourse, the Engineering Portal, PagerDuty, and Datadog. Use `deploy.yml: app` for every `{app}` substitution in the rendered README — never the repo basename.

#### Resolve the owning team

Read it from `platform-metadata` — the canonical ownership registry. Do **not** use GitHub topics or the Backstage `catalog-info.yaml` `spec.owner` field; both drift and have been wrong on this. Run from inside the repo:

```bash
REPO=$(basename "$PWD")
gh api "repos/datacamp-engineering/platform-metadata/contents/repositories/${REPO}/config.yaml" \
  --jq '.content' | base64 -d | yq -r '.team'
```

That returns the slug, e.g. `payment-and-subscriptions`, `learner-experience`, `conversion-engineering`, `content-platform`, `developer-platforms`, `translations`, `b2b-engineering`, `mobile`. Render the slug verbatim in backticks in the README — that's the authoritative identifier that maps to the GitHub team. If the platform-metadata file doesn't exist for this repo, stop and tell the user; do not fall back to topics.

> `yq` (v4, mikefarah) is installed on engineer machines and CI. The earlier `grep | awk` form breaks on quoted, multi-word, or list-typed values — `yq -r '.team'` is robust.

### 2. Derive workload signals

- **Cloud provider**: read `main/tf-state.tf` — `backend "s3"` → AWS (default for most apps), `backend "gcs"` → GCP (data-platform / optima style), `backend "azurerm"` → Azure. Cross-check against any `provider "..."` blocks in `main/providers.tf`. Surface the provider in the one-line summary so a reader knows which cloud they're looking at without reading Terraform.
- **Workload type**: `k8s.yml` → Kubernetes Deployment (or CronJob — check the top-level key); `microfrontend.yml` → MFE bundle published to S3; `frontend.yml` → static frontend served from S3/CloudFront; none of these + only Terraform → "Terraform-only (no deployed workload)". **Hybrids are valid**: when more than one workload file is present, list each one and cross-check against the runlist (e.g. `k8s-role` + `microfrontend-role` → "Kubernetes Deployment + MFE bundle"). The runlist is the authoritative signal for what actually runs.
- **Public routing**: `kong.yml` present → exposed via Kong; otherwise internal. Kong config lives only in `kong.yml` — there is no Terraform-managed Kong in current infra repos. If you see a `kong/` subdir under `environments/` with no `kong.yml` at the root, your checkout is stale; re-fetch master.
- **Stateful pieces**: scan `environments/**/*.tf` _and_ `main/**/*.tf` for filenames matching `redis.tf`, `rds.tf`, `dynamodb.tf`, `sqs.tf`, `s3.tf`, `sns.tf`, `sftp.tf`. De-duplicate by basename — most repos define these once under `environments/common/` but some put env-specific instances under `environments/prod/`. Mention in the README _which_ of these files exist; don't try to enumerate the resources inside them.
- **Terraform modules**: grep every `.tf` file under `environments/`, `main/`, and `modules/` for `module "<name>" {` blocks and capture each block's `source` value. **Skip commented-out lines** (`#   source = ...`) — a partially commented kong block superseded by `kong.yml` is a common false positive. **Exclude local relative sources** (`../...`) and entries inside `required_providers` blocks (providers aren't modules). Every surviving `source` should be classified by where it lives:

  | Source pattern                                        | Where it lives                                                                                                     | What to render                                                                                             |
  | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
  | `app.terraform.io/datacamp/<name>/<provider>`         | DataCamp's private Terraform Cloud registry                                                                        | Map to `github.com/datacamp-engineering/terraform-<provider>-<name>` (verify with `gh api`); link the repo |
  | `git@github.com:datacamp-engineering/<repo>.git//...` | DataCamp GitHub direct, usually with `?ref=<branch_or_tag>` pinning a fix/feature not yet released to the registry | Link the repo and surface the `?ref=` value — this app is on an unreleased version, often deliberately     |
  | `git@github.com:datacamp/<repo>.git//...`             | The **legacy `datacamp` GitHub org** (separate from `datacamp-engineering`)                                        | Link the repo and tag the row as "legacy `datacamp` org"; predates the `datacamp-engineering` migration    |
  | `terraform-aws-modules/<name>/aws` etc.               | The **public Terraform Registry** (HashiCorp / community modules)                                                  | Tag as "public registry"; include the `version` constraint from the same block                             |
  | Anything else (other git URLs, local paths off-repo)  | External / third-party                                                                                             | List verbatim and flag in the post-run summary so the convention can be reviewed                           |

  For DataCamp-registry sources, the path-to-repo mapping is:

  ```text
  app.terraform.io/datacamp/<name>/<provider>   →   github.com/datacamp-engineering/terraform-<provider>-<name>
  ```

  Common examples: `monitors/datadog` → `terraform-datadog-monitors`; `rds-instance/aws` → `terraform-aws-rds-instance`; `redis-instance/aws` → `terraform-aws-redis-instance`; `s3-bucket/aws` → `terraform-aws-s3-bucket`; `eks/aws` → `terraform-aws-eks`; `frontend/aws` → `terraform-aws-frontend`; `event/aws` with sub-modules `event-producer` / `event-consumer` / `event-link` → `terraform-aws-event` (the standalone repos `terraform-aws-event-link` / `terraform-aws-event-consumer` are sometimes used directly); `slo/datadog` → `terraform-datadog-slo`; `slo-event/datadog` → `terraform-datadog-slo-event`; `pagerduty/pagerduty` → `terraform-pagerduty-pagerduty`.

  **Always one row per unique module repo.** Dedupe by repo, not by sub-module — `monitors/datadog//modules/monitor-setup` and `monitors/datadog//modules/monitor-eks-app-datadog` both belong to `terraform-datadog-monitors`; list the repo once and capture which sub-modules are used so the Purpose column can mention them. If the same repo appears via the registry _and_ via a git URL with `?ref=...`, **still keep it on one row** — join the source tags with `; ` in the Source column (something like `DataCamp registry; also pinned via git ?ref=datadog-3 in <file>`) and merge the files into the "Used here" column. The version-pin must remain visible, but never as a duplicate row. For each surviving entry, record which `.tf` files reference it for the "Used here" column. If no `module {}` blocks reference any non-local source, drop the `### Terraform modules` subsection entirely.

- **Multi-region**: if `deploy.yml` has both a `prod:` block and a region-suffixed prod block (e.g. `us-west-2-prod:`, `eu-west-1-prod:`), the service is multi-region. Surface this prominently — once in the one-line summary, once in the environments inventory table, and as separate nodes in the Mermaid pipeline graph.
- **Deploy notifications**: `deployment_notification` from `deploy.yml`. Use this exact label both here and in the rendered template — don't paraphrase as "Slack channel" or similar.
- **DB without Teleport**: compute two predicates independently, then render the guardrail only when **`dbExists && !teleportConfigured`**:
  - `dbExists` is true if any explicit DB indicator is present — `migration.yml` exists at the repo root, or any `rds.tf` exists under the Terraform tree, or any other engine-specific file (`dynamodb.tf`, etc.) — **not** based on which Ansible roles are absent from the runlist.
  - `teleportConfigured` is true if `dbusers.yml` exists at the repo root **or** `db-teleport-user-role` is present in `deploy.yml`'s `runlist`.
  - Render the conditional Teleport guardrail in the "Security guardrails" section only when there is actually a database and no Teleport wiring for it.
- **Post-deploy tests**: for each env block in `deploy.yml`, read `deployment_tests` (preferred; the legacy key `acceptance_tests` is treated as a fallback by the framework — see `framework/playbooks/run_generic_deploy.yml`). Each entry has `runner` (usually `playwright`, sometimes `active-testing`), an optional `test_type` (default `acceptance`; can also be `integration` or `active-testing`), and an optional `runner_version`. Group test entries by env so the rendered Testing section says _which envs run which tests_. Three test types to know:
  - **acceptance** — app-specific Playwright user-journey tests. Source lives in the **app repo** (in limited cases the infra repo) under `acceptance_tests/`. Default `test_type` when omitted.
  - **integration** — cross-service Playwright tests shared in `datacamp-engineering/integration-tests`. Triggered by the framework via `/release/run_deployment_integration_tests.sh` when `runner: playwright` + `test_type: integration`. Top-level `integration_tests_repo` / `integration_tests_branch` in `deploy.yml` confirm this wiring (defaults: `git@github.com:datacamp-engineering/integration-tests.git` on `master`).
  - **active-testing** — OWASP Top 10 API vulnerability scan using [ZAProxy](https://www.zaproxy.org) (DAST tooling). Identified by `runner: active-testing`; the entry's `base_url` is the URL it scans. Requires the app to have a published OpenAPI spec (see [api-documentation docs](https://engineering-portal.us-east-1.internal.datacamp.com/docs/default/component/engineering-docs/api-documentation/)). Results land in S3 and surface in the Engineering Portal CD tab under an "OWASP Tests" column. **Must only run against staging** — the ZAP scanner performs code injection probes that can modify or delete production data, so seeing `runner: active-testing` in a `prod:` (or any non-staging) env block is a misconfiguration to flag in the post-run summary.

  Tests run as Kubernetes Jobs in the deploy cluster after the env's deploy completes. A failing test gate blocks promotion to the next env in `pipeline.yml`. If the repo has no `deployment_tests` and no `acceptance_tests` in any env block, omit the Testing section entirely — don't pad with "no tests configured".

### 3. Render the README

Always use this exact section order. Drop sections that have nothing to say (e.g. no Database row if there's no migration/DB Terraform). Don't pad with prose.

**Template notation, important.** Two distinct kinds of markup appear below; treat them differently:

- `{{value}}` — a **substitution**. Replace with the literal extracted value. These are the only `{{…}}` occurrences in the template; if you ever see one in your output, that's a bug.
- `<!-- AGENT: … -->` — an **instruction to you**. Read, act on it, then **strip the comment** before writing the file. None of these should appear in the rendered README.

If a `{{…}}` placeholder has no value (the field is absent in `deploy.yml`), drop the row entirely rather than emitting an empty placeholder.

````markdown
# {{repo-basename}}

Infrastructure for **{{deploy_app}}**, owned by `{{team-slug}}` (from `platform-metadata/repositories/{{repo-basename}}/config.yaml`).

<!-- AGENT: write one sentence describing the workload — derived from discovery, not invented. If multi-region, say so here. Examples (do not copy verbatim):
- "Kubernetes Deployment running behind Kong, with Redis cache and Postgres. Multi-region: `<primary-region>` (primary) + `<replica-region>`."
- "Micro-frontend served from S3 under `<route-scope>`."
- "Terraform-only repo managing shared SQS queues and IAM roles."
-->

## What this repo manages

- **Cloud provider**: {{cloud_provider}} <!-- AGENT: one of AWS / GCP / Azure / multi-cloud, derived from `main/tf-state.tf` backend type and `main/providers.tf` -->
- **Workload**: {{workload_type}} <!-- AGENT: if multiple workload files are present (hybrid), join with " + " and cite the workload files / roles in parens, e.g. "Kubernetes Deployment + MFE bundle (`k8s.yml` + `microfrontend.yml`; runlist contains `k8s-role` and `microfrontend-role`)" -->
- **Public routing**: {{routing}}
- **Database**: {{database}}
- **Stateful infra**: {{stateful_infra_list}}
- **Terraform version**: `{{terraform_binary}}` <!-- AGENT: omit row if terraform_binary is absent in deploy.yml. If it's >= 1.6.0, append " (post-OpenTofu fork — newer than the 1.5.7 compatibility ceiling)". -->
- **Terraform state**: one root in `main/`; state is **per environment**, isolated by `terraform-role` injecting `-backend-config='bucket=datacamp-{env}-tf-state'` and `-backend-config='prefix={{deploy_app}}'` at `terraform init`. There is **no separate root per env** — `main.tf` selects env-specific resources via `count = var.ENVIRONMENT == "<env>" ? 1 : 0` modules when the layout uses conditional env modules.
- **Folder structure**: `environments/common/` holds every resource that applies to all environments (the bulk of the Terraform). `environments/<env>/` directories hold only what differs for that env — env-tuned monitoring, env-only buckets, scaled-down BCP replicas. For each plan/apply, `main.tf` includes `common/` plus the matching env directory.
- **`deploy.yml` structure** mirrors that split: top-level keys are the **common** config applied to every environment (`app`, `runlist`, `cluster_name`, `terraform_binary`, etc.); per-env blocks (`staging:`, `prod:`, `us-west-2-prod:`) hold **env-specific overrides** (replicas / resource requests, deployment tests, env-tuned overrides for `cluster_name` / `region` / `app_account`). The framework merges the env block on top of the top-level when running for that env.

<!-- AGENT: include the entire ### Terraform modules subsection below only if at least one `module {}` block in the Terraform tree references a non-local source. Otherwise omit it. -->

### Terraform modules

DataCamp's shared Terraform modules are versioned (semver git tags) and published to a private [Terraform Cloud](https://app.terraform.io/app/datacamp/registry/modules/private) registry under `app.terraform.io/datacamp/<name>/<provider>`. Each module is its own `datacamp-engineering/terraform-<provider>-<name>` GitHub repo — Terraform Cloud pulls a release by tag, the version is pinned by `version =` in the `module {}` block, and `terraform init` resolves and caches it. Modules sourced directly from `git@github.com:...` (with `?ref=...`) bypass the registry and pin a branch/tag straight from GitHub — useful for testing an unreleased fix.

| Module                  | Source               | Purpose               | Used here           |
| ----------------------- | -------------------- | --------------------- | ------------------- |
| {{tf_module_repo_link}} | {{tf_module_source}} | {{tf_module_purpose}} | {{tf_module_files}} |

<!-- AGENT: one row per unique module repo. Dedupe sub-modules — `monitors/datadog//modules/monitor-eks-app-datadog` and `monitors/datadog//modules/monitor-rds-datadog` both belong to `terraform-datadog-monitors`; list it once. If the same repo also appears via a `git@` URL with `?ref=...`, keep it on the same row and join the source tags with `; ` in the Source column (e.g. `DataCamp registry; also pinned via git \`?ref=datadog-3\``).
- Module column: linked repo name in backticks, e.g. `[`terraform-aws-rds-instance`](https://github.com/datacamp-engineering/terraform-aws-rds-instance)`.
- Source column — short tag describing where the module comes from:
  - `DataCamp registry` for `app.terraform.io/datacamp/...`
  - `DataCamp GitHub (pinned `?ref=<value>`)` for direct git URLs in the `datacamp-engineering` org
  - `Legacy `datacamp` GitHub org` for the old org (not kept up to date)
  - `Public registry (version: <constraint>)` for HashiCorp / community modules
  - The verbatim source string for anything else (flag in post-run summary).
- Purpose column: one-line description grounded in the module repo's name/README (fetch with `gh api repos/<org>/<repo>/readme`). Note any sub-modules used (e.g. "Pub/sub primitives; this repo uses the `event-producer` and `event-consumer` sub-modules").
- Used here column: list every `.tf` file in this repo that references the module, as inline code, comma-separated. Dedupe within a single file.
- If kong modules appear *only inside commented-out blocks* (common pattern when the live config has moved to `kong.yml`), exclude them and note in the post-run summary.
-->

### Environments

| Environment | Cluster | Region | Account | Auto-deploy |
| ----------- | ------- | ------ | ------- | ----------- |

<!-- AGENT: one row per env from deploy.yml's per-env blocks, merged with pipeline.yml's auto_deploy flag.
- Use the env block's cluster_name and region when set; otherwise fall back to top-level deploy.yml values.
- Account column: render `app-cluster` if `app_account: true` on the env, else `shared`.
- Auto-deploy column: by convention `staging` always auto-deploys on merge (the root env has no explicit `auto_deploy` flag — that's expected, render `yes`). Downstream envs render `yes` unless `auto_deploy: false` is set on their pipeline entry, in which case render `no (manual)`.
-->

## Pipeline

Deployed by Concourse, team **{{concourse_team}}**. Promotion order (from `pipeline.yml`):

```mermaid
flowchart LR
<!-- AGENT: emit one node per pipeline entry: `<env_id>(<env_name>)`.
For entries with `after:`, emit an edge `<parent_id> --> <env_id>`.
For entries with `auto_deploy: false`, append " (manual)" to the node label.
Root entries (no `after:`) just sit as standalone nodes.
Do not add ASCII art. -->
```

<!-- AGENT: render each role from deploy.yml's runlist on its own line, prefixed with `- `, followed by the one-line explanation from the Role glossary. For unknown roles, render the role name in backticks with no annotation. -->

Deploy notifications: {{deployment_notification}} <!-- AGENT: render literal "—" if the field is absent -->

## Repository layout

| Path           | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `deploy.yml`   | Concourse deploy spec — app, runlist, per-env config |
| `pipeline.yml` | Environment promotion order                          |

<!-- AGENT: emit one or more rows depending on which workload files are present (hybrid workloads — e.g. a k8s service that also publishes an MFE bundle — have both `k8s.yml` and `microfrontend.yml`; render a row for each):
| `k8s.yml` | Kubernetes Deployment template (Jinja-rendered per env) |
| `microfrontend.yml` | MFE deploy config (S3 bucket, route scope) |
| `frontend.yml` | Static frontend deploy config |
-->
<!-- AGENT: emit each of the following rows ONLY if the file is present in the repo:
| `kong.yml` | Kong API gateway routes |
| `migration.yml` | DB migration definition |
| `dbusers.yml` | Teleport DB user grants |
| `iam_policy.json` | Custom IAM policy attached to the workload |
| `catalog-info.yaml` | Engineering Portal registration (picked up by platform-metadata ingestion) |
-->

| `environments/common/` | Terraform that applies to **every** env (staging + prod + DR): {{common_tf_files_list}} |
| `environments/{prod,staging,…}/` | Per-env additions on top of `common/` — list what's in each (e.g. `prod/monitoring.tf`, `staging/s3.tf`). Avoid the vague word "overrides". |
| `main/` | Single Terraform root (`main.tf`, `providers.tf`, `tf-state.tf`, `variables.tf`, `versions.tf`); includes `common/` plus the env-specific directory for the env being applied; state isolated per env at `init` via `-backend-config` |
| `modules/` | Repo-local Terraform modules ({{module_subdirs_list}}) |

| `.circleci/config.yml` | **Plan-only** validation on PRs (`terraform fmt` / `terraform plan` per env, Kong `deck diff`); on merge: queue → `fly set-pipeline` → tag |

## How a change reaches production

Two CI systems share the work. **CircleCI validates and triggers; Concourse deploys.** They are not interchangeable.

### CircleCI (this repo)

CircleCI runs against this infra repo only. **It is plan-only — it never runs `terraform apply`.** Apply happens in Concourse via the cloud-agnostic [`terraform-role`](https://github.com/datacamp-engineering/terraform-role) (AWS, GCP, and Azure are all handled there). On PRs, CircleCI gives reviewers the exact diff a deploy would apply; on merge, it triggers Concourse to deploy.

- **On a PR branch** (`plan-*` workflows in `.circleci/config.yml`): run `terraform fmt`, `terraform plan` for every env (staging / prod / `us-west-2-prod` / …), and `deck diff` against the env's Kong control plane when `kong.yml` is present. Credentials come from the app's CircleCI context (e.g. `{{deploy_app}}`), named `{ENV_TYPE_UPPER}_{CREDENTIAL_NAME}` (e.g. `STAGING_GOOGLE_CREDENTIALS`). New credentials should go in this per-app context — `org-global` is near its variable limit.
- **On merge to `master`/`main`** (`tag` workflow): a `queue` job serializes merges, then `concourse/rebuild-pipeline` calls `fly set-pipeline` on the Concourse team derived from `platform-metadata`'s bounded context for this service, then `artifactory/tag_repository` tags the infra repo. The new tag is what fires Concourse's `infra_ci` resource.

### Concourse (`{{concourse_team}}` team)

Concourse owns the deploy. The team it runs in is derived from this service's bounded context in `platform-metadata` — no longer a free-form `concourse_team:` field. Per-env secrets live in the Concourse paramstore under `{CREDENTIAL_NAME}_{env}` (e.g. `GOOGLE_CREDENTIALS_{{deploy_app}}-prod`); `deploy.yml` references them by name and the role injects them as `TF_VAR_*` for Terraform.

The new infra tag (or a new app image, framework tag, role tag, etc.) triggers:

1. **`generate manifest`** — resolves the pinned versions of every component (`infra_ci`, `framework_ci`, `pipeline_ci`, `code_ci`, each `<role>_ci`) into a single versioned manifest JSON and uploads it to Artifactory. A webhook fires the first env's deploy — no polling.
2. **Per-env deploy** — downloads the manifest archive, runs the **runlist** roles in order against that environment (each role reads its overrides from `deploy.yml`). The deploy job's first step also re-renders and re-registers the Concourse pipeline from the manifest's pinned `framework`/`pipeline-templates` versions, so the pipeline self-updates.
3. **Promotion** — on success, the same manifest is copied to the next env's Artifactory path per the pipeline graph above. The downstream env's deploy job auto-triggers (unless `auto_deploy: false` on that pipeline entry).

The manifest pins the infra repo, framework, pipeline templates, application image, and every role together. That means rolling back from the **CD** tab on the Engineering Portal redeploys a previous manifest version — the whole stack (infra + Terraform state intent + roles + image) returns to that exact point, not just the Docker image.

For the full deploy model — manifest format, push-over-poll, role testing via `roles_branch`, Backstage preview environments — see the [`framework`](https://github.com/datacamp-engineering/framework#how-deployments-work) and [`pipeline-templates`](https://github.com/datacamp-engineering/pipeline-templates#runtime-flow) READMEs.

<!-- AGENT: include the entire ## Testing section only if at least one env block in deploy.yml declares `deployment_tests` or `acceptance_tests`. Otherwise omit it. -->

## Testing

Post-deploy tests run as Kubernetes Jobs after each env's deploy completes; a failure blocks promotion to the next env.

| Environment | Test type | Runner | Source |
| ----------- | --------- | ------ | ------ |

<!-- AGENT: one row per test entry in each env block, in deploy.yml order. Columns:
- Environment: the env block name (`staging`, `prod`, …)
- Test type: `acceptance` (default when omitted), `integration`, or `active-testing`
- Runner: `playwright` / `active-testing` + version in backticks if `runner_version` is set, e.g. `playwright 1.44.0`
- Source: for acceptance → `app repo` (linked to {{app_repo_https}} if set, else literal "app repo")
         for integration → linked to `integration_tests_repo` (default https://github.com/datacamp-engineering/integration-tests) on `integration_tests_branch` (default master)
         for active-testing → "OWASP scan against `<base_url>`" using the entry's `base_url` -->

<!-- AGENT: emit the bullet list below, but only include the bullets for test types that actually appear in this repo's deploy.yml -->

- **Acceptance** — fast app-specific Playwright user-journey checks, sourced from the app repo (`acceptance_tests/` by convention). See [acceptance tests docs](https://engineering-portal.us-east-1.internal.datacamp.com/docs/default/component/engineering-docs/acceptance-tests/).
- **Integration** — cross-service Playwright tests in [`integration-tests`](https://github.com/datacamp-engineering/integration-tests), run via the [`tests-runner`](https://github.com/datacamp-engineering/tests-runner) image. See [integration tests docs](https://engineering-portal.us-east-1.internal.datacamp.com/docs/default/component/engineering-docs/integration-tests/).
- **Active testing** — OWASP Top 10 API vulnerability scan via [ZAProxy](https://www.zaproxy.org) (DAST). Requires a published OpenAPI spec; staging only — ZAP performs code-injection probes that can corrupt production data. Reports surface in the Engineering Portal **CD** tab under the "OWASP Tests" column (Summary of Alerts grouped by High / Medium / Low / Informational + per-endpoint detail with remediation guidance). See [API OWASP scanning docs](https://engineering-portal.us-east-1.internal.datacamp.com/docs/default/component/engineering-docs/api-documentation/40-api-scanning/).

For the overall testing philosophy (what we test, what we don't, post-deploy gating for Tier 1), see the [Testing wiki page](https://datacamp.atlassian.net/wiki/spaces/PRODENG/pages/2270888027/Testing).

## Useful links

- Engineering Portal: https://engineering-portal.us-east-1.internal.datacamp.com/catalog/default/component/{{deploy_app}}
- CD / rollback: https://engineering-portal.us-east-1.internal.datacamp.com/catalog/default/component/{{deploy_app}}/cd?env=prod
<!-- AGENT: include the next bullet only if `deploy.yml: app_repo` is set. If the value already starts with `https://`, use it verbatim. If it's `git@github.com:org/repo.git`, convert to `https://github.com/org/repo`. -->
- App repo: {{app_repo_https}}
- Datadog monitors: https://app.datadoghq.com/monitors/manage?q={{deploy_app}}
<!-- AGENT: include the next bullet only if `k8s.yml` is present. Known limitation: this is a text-search URL, so it can return more than one match for apps with overlapping names (e.g. `learn` vs `learn-hub`). -->
- Datadog dashboard: https://app.datadoghq.com/dashboard/lists?q={{deploy_app}}+eks+monitoring
- PagerDuty service: https://datacamp.pagerduty.com/services#?query={{deploy_app}}
- Deployment framework (how the runlist actually runs): https://github.com/datacamp-engineering/framework
- Pipeline templates (Concourse pipeline structure): https://github.com/datacamp-engineering/pipeline-templates
<!-- AGENT: include the next bullet only if `microfrontend.yml` is present. Read bucket, folder, and route_scope from that file. -->
- MFE deploy config: bucket `{{mfe_bucket}}`, folder `{{mfe_folder}}`, route scope `{{mfe_route_scope}}` (see `microfrontend.yml`)

## Security guardrails

- **Don't commit** `.env*`, AWS access keys, PagerDuty tokens, or any service credentials.
- Secrets are managed via the **Engineering Portal** parameters tab, which writes them to AWS SSM under `/datacamp-{env}/{{deploy_app}}/…`. `deploy.yml` references them by name.
  See the [parameters tab](https://engineering-portal.us-east-1.internal.datacamp.com/catalog/default/component/{{deploy_app}}/parameters) on the app's Engineering Portal page.
- For live DB access use Teleport (see `dbusers.yml` if present), never long-lived DB credentials.
<!-- AGENT: include the next bullet only if the repo has a DB (`migration.yml` or `rds.tf`) AND `dbusers.yml` is missing. -->
- **⚠️ This service has a database but Teleport is not yet configured.** Long-lived DB credentials are still in use. Onboard the DB to Teleport using the [`enable-teleport-for-db` skill](https://github.com/datacamp-engineering/skills/blob/main/datacamp-wide/enable-teleport-for-db/SKILL.md), which walks through the required `rds.tf`, `deploy.yml`, and `dbusers.yml` changes.

## Notes

<!-- BEGIN custom notes -->

_Add repo-specific runbook steps, gotchas, on-call context, etc. between these markers. **Do not remove the `<!-- BEGIN custom notes -->` / `<!-- END custom notes -->` markers** — they're how the `create-readme-for-infra-repo` skill preserves your content on reruns. If the markers are missing on a rerun, the skill will stop and ask before overwriting._

<!-- END custom notes -->
````

### 4. Role glossary (use to annotate the runlist line-by-line)

Each runlist entry is its own Ansible role repo in `datacamp-engineering`. The table below is the **fallback** description — the rendered README is more useful when each role's one-liner reflects what that role actually does for _this_ service. Before rendering, fetch each role repo's README and let it inform the wording:

```bash
gh api "repos/datacamp-engineering/<role>/readme" --jq '.content' | base64 -d
```

If the fetch fails, fall back to the table verbatim.

| Role                                              | Repo                                                          | Meaning                                                                                                                                                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `terraform-role`                                  | https://github.com/datacamp-engineering/terraform-role        | Runs `terraform init` (with per-env `-backend-config` for the state bucket / prefix) and `terraform apply` for the env's Terraform. Cloud-agnostic — works for AWS, GCP, and Azure (the CircleCI `tfplan` orb is plan-only; this role does the apply). |
| `kong-deck-role`                                  | https://github.com/datacamp-engineering/kong-deck-role        | Syncs Kong routes from `kong.yml`.                                                                                                                                                                                                                     |
| `migration-role`                                  | https://github.com/datacamp-engineering/migration-role        | Runs DB migrations declared in `migration.yml`.                                                                                                                                                                                                        |
| `k8s-role`                                        | https://github.com/datacamp-engineering/k8s-role              | Renders `k8s.yml` and applies the Kubernetes manifests.                                                                                                                                                                                                |
| `frontend-role`                                   | https://github.com/datacamp-engineering/frontend-role         | Builds and uploads the static frontend assets to S3.                                                                                                                                                                                                   |
| `microfrontend-role` _(legacy alias: `mfe-role`)_ | https://github.com/datacamp-engineering/microfrontend-role    | Publishes the MFE bundle to the S3 bucket configured in `microfrontend.yml`.                                                                                                                                                                           |
| `api-docs-role`                                   | https://github.com/datacamp-engineering/api-docs-role         | Generates and publishes API docs HTML from the app's OpenAPI spec.                                                                                                                                                                                     |
| `shareddbcreation-role`                           | https://github.com/datacamp-engineering/shareddbcreation-role | Creates the shared application database on the cluster's Postgres instance.                                                                                                                                                                            |
| `db-user-creation-role`                           | https://github.com/datacamp-engineering/db-user-creation-role | Creates the application's DB user/role with the right grants.                                                                                                                                                                                          |
| `db-teleport-user-role`                           | https://github.com/datacamp-engineering/db-teleport-user-role | Provisions Teleport DB user grants from `dbusers.yml`.                                                                                                                                                                                                 |

For an unknown role, **first try to fetch its README** the same way (`gh api repos/datacamp-engineering/<role>/readme`) and use that to write a one-line description. If the repo doesn't exist, render the role name verbatim with no annotation. Collect any unknown roles encountered and mention them in the **post-run summary** (see Output contract) so the user can extend this glossary on a follow-up PR. Do not write `# TODO` markers into the rendered README — that contradicts the output contract.

### 5. Idempotency

Always write `README.md` directly — the change goes out as a PR, so the human reviewer sees the diff there and can object or merge.

If `README.md` already exists:

1. Read it.
2. Locate the `<!-- BEGIN custom notes -->` … `<!-- END custom notes -->` block.
   - **Markers present** → preserve the block's content verbatim into the new README's `## Notes` section, then overwrite the file.
   - **Markers absent _and_ the README is a known stub** (one of: empty, one paragraph + a couple of bullet links, no headings beyond `# <repo>`) → safe to overwrite without prompting; carry no notes forward.
   - **Markers absent _and_ the README looks substantially custom** (multiple sections, prose paragraphs, runbook steps, or anything the template wouldn't produce) → **stop, don't overwrite.** Tell the user the markers are missing and that a previous custom Notes section may exist; ask them to either (a) wrap their custom content in the markers and rerun, or (b) confirm explicit overwrite. This protects against the silent-loss scenario where a user cleans up the "comment clutter" and then re-runs the skill.

Don't create a `README.generated.md` side file — the PR is the review surface.

### 6. Don'ts

- Don't invent infra that isn't in the files. If `kong.yml` is missing, don't write a Kong section.
- Don't paraphrase YAML values into prose ("the staging environment has 2 replicas and 1Gi of memory") — that information rots faster than this README will be updated. Stick to _what kinds of things this repo manages_, not their current parameters.
- Don't add a generic "Contributing" section. The DataCamp PR workflow is repo-agnostic and lives elsewhere.
- Don't include team-internal Slack handles or named individuals — those rotate.
- Don't commit the README. Stop after writing the file and tell the user to review.

## Working directory contract

Run inside the target `*-infra` repo (i.e. the user's `cwd` is the repo root). If a file path is referenced in the template but missing, drop that row/section silently rather than emitting a placeholder.

## Output contract

Exactly one file written: `README.md` in the repo root. Don't open a PR. Don't `git add`.

After writing, print a short summary to the user covering:

1. Which path was written.
2. Anything the user should sanity-check (e.g. derived workload type, multi-region detection).
3. Any **unknown runlist roles** encountered (see Role glossary fallback) — so the user can extend the glossary.
4. Whether the Teleport-missing guardrail was rendered (if so, point at the linked skill).

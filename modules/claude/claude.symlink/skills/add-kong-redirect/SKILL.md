---
name: add-kong-redirect
description: Add a URL redirect to DataCamp's Kong infrastructure repos (kong-redirects-logged-in-infra and/or kong-redirects-logged-out-infra). Use when an engineer needs to redirect one URL to another on www.datacamp.com or campus.datacamp.com.
allowed-tools:
  - Bash
  - Read
  - Edit
  - WebFetch
  - AskUserQuestion
metadata:
  version: '1.1.0'
---

# Add Kong Redirect

## Context

Add a URL redirect to the DataCamp Kong infrastructure. Redirects live in two repos:

- **`kong-redirects-logged-in-infra`** — authenticated users (`campus.datacamp.com`, `app.datacamp.com`)
- **`kong-redirects-logged-out-infra`** — unauthenticated users (`www.datacamp.com`)

## Usage

Walk Steps 1–5 below in order. The repo split (logged-in vs logged-out) is resolved in Step 3 — don't pick a repo before then.

## Step 1: Gather required information

Parse `$ARGUMENTS` for the values below. Ask via `AskUserQuestion` for anything missing.

| Field                       | Required | Notes                                                    |
| --------------------------- | -------- | -------------------------------------------------------- |
| **Source URL or path**      | Yes      | e.g., `/old-path` or `https://www.datacamp.com/old-path` |
| **Destination URL or path** | Yes      | e.g., `/new-path` or a full external URL                 |
| **Redirect type**           | No       | `301` (permanent, default) or `302` (temporary)          |
| **Scope**                   | Yes      | `logged-in` or `logged-out`                              |
| **Jira ticket**             | No       | e.g., `INF-1234` — for branch and PR title               |

## Step 2: Resolve full URLs

- If only a path is given (starts with `/`), prepend the default domain:
  - `logged-in` → `https://campus.datacamp.com`
  - `logged-out` → `https://www.datacamp.com`
- If a full URL is given, use it as-is.
- The destination can be a relative path (`/new-path`) or a full URL.

## Step 3: Determine target repo

Based on scope, select which repo to update:

| Scope        | Repo                                                   |
| ------------ | ------------------------------------------------------ |
| `logged-in`  | `datacamp-engineering/kong-redirects-logged-in-infra`  |
| `logged-out` | `datacamp-engineering/kong-redirects-logged-out-infra` |

Both repos use **`master`** as the default branch.

The subfolder within `kong/` is determined by inspecting the repo after cloning — see Step 4a-i.

## Step 4: Work in the target repo

### 4a. Clone to a temp directory

```bash
REPO_DIR=$(mktemp -d)
git clone git@github.com:datacamp-engineering/<repo>.git "$REPO_DIR"
```

### 4a-i. Detect the target subfolder

Each repo organises redirects by site navigation section. After cloning, inspect the available folders:

```bash
ls "$REPO_DIR/kong/"
```

Extract the **first path segment** of the source path (everything between the leading `/` and the next `/`). For example:

- `/resources/new-feature` → `resources`
- `/blog/my-post` → `blog`
- `/certification/associate-de` → `certification`

**Try a direct folder match first:**

```bash
FIRST_SEGMENT=$(echo "<source-path>" | cut -d'/' -f2)
if [ -d "$REPO_DIR/kong/$FIRST_SEGMENT" ]; then
  SUBFOLDER="$FIRST_SEGMENT"
fi
```

If a matching folder exists, use it as `<subfolder>` in all subsequent steps. Skip the site scan below.

**For logged-out scope — scan https://www.datacamp.com when there is no direct match:**

If the first segment does not match any `kong/` folder, fetch the DataCamp homepage to understand the top-level site navigation and determine which section the source path belongs to:

```text
WebFetch: https://www.datacamp.com
```

Extract the top-level navigation links from the page. Each nav section (e.g. "Resources", "Business", "Pricing") corresponds to a subfolder in the repo. Match the source path's first segment against the nav sections and pick the subfolder that owns that section.

Examples of non-obvious mappings the site navigation reveals:

- `/blog/...`, `/tutorial/...` appear under the **Resources** nav section → `resources`
- `/courses/...`, `/learn/...` appear under a catalog/learn nav section → `catalog`

If the site scan still does not give a clear answer, show the user the available `kong/` folders and the nav sections found on the page, and ask which subfolder to use — do not guess.

### 4b. Create a branch

Branch format: `redirect/<slug>` or `redirect/<ticket-id>/<slug>` if a Jira ticket was given.
Derive `<slug>` from the source path: lowercase, replace non-alphanumeric characters with `-`, strip leading/trailing `-`.

```bash
git -C "$REPO_DIR" checkout -b "<branch-name>"
```

### 4c. Generate the route name

Derive a kebab-case name from the source hostname + path, appended with `-redirect`:

- `www.datacamp.com/old-section/page` → `www-old-section-page-redirect`
- `campus.datacamp.com/courses/intro-to-sql` → `campus-courses-intro-to-sql-redirect`

Keep it descriptive but concise. Ensure the name is unique within the file (check with `grep`).

### 4d. Build the destination value

The `redirect_uri` in the YAML must use `${{ env "DECK_EXTERNAL_ZONE" }}` instead of the literal domain:

| Input destination                         | YAML value                                                     |
| ----------------------------------------- | -------------------------------------------------------------- |
| `https://www.datacamp.com/new-path`       | `'https://www.${{ env "DECK_EXTERNAL_ZONE" }}/new-path'`       |
| `https://campus.datacamp.com/courses/new` | `'https://campus.${{ env "DECK_EXTERNAL_ZONE" }}/courses/new'` |
| `/new-path` (relative)                    | `'/new-path'`                                                  |
| external URL (non-datacamp)               | use as-is                                                      |

Likewise, the source host in `hosts:` must use env var syntax:

- `www.datacamp.com` → `'www.${{ env "DECK_EXTERNAL_ZONE" }}'`
- `campus.datacamp.com` → `'campus.${{ env "DECK_EXTERNAL_ZONE" }}'`

### 4e. Append the route to kong.yml

Read `$REPO_DIR/kong/<subfolder>/kong.yml` to understand the current structure. **Match the existing indentation style exactly** — read the last few routes in the file and replicate the same spacing. Add the new route at the end of the `routes:` list (before any catch-all route if one exists).

Where `<repo-tag>` is:

- `kong-redirects-logged-in` for the logged-in repo
- `kong-redirects-logged-out` for the logged-out repo

Notes:

- The `paths:` entry uses `(/?$)` to match with or without a trailing slash.
- If the destination is a relative path (`/new-path`), the `redirect_uri` stays as a bare path without env var substitution.
- Do not use `kong-local redirect` directly — it generates a snippet format incompatible with the indentation used in these repos. Edit the YAML file directly.

### 4e-i. Localization support

DataCamp URLs support locale prefixes (`/es/`, `/pt/`, `/de/`, etc.). Ask the user whether the redirect should preserve the user's locale. If yes, use the following patterns.

**When to use localization:**

- The source page exists in multiple languages (e.g., a course landing page, a blog post)
- The destination also supports localized URLs

**Pattern 1 — optional locale** (URL works with AND without a locale prefix):

```yaml
paths:
  - /(?<localization>(?:[a-z]{2}/)?)old-path(/|$)
```

```yaml
config:
  include_query: true
  redirect_type: 301
  redirect_uri: 'https://www.${{ env "DECK_EXTERNAL_ZONE" }}/${localization}new-path'
```

- `/old-path` → `/new-path`
- `/es/old-path` → `/es/new-path`
- `/pt/old-path` → `/pt/new-path`

**Pattern 2 — required locale** (URL always has a locale prefix, no bare version):

```yaml
paths:
  - /(?<localization>[a-z]{2}/)old-path(/|$)
```

```yaml
config:
  include_query: true
  redirect_type: 301
  redirect_uri: 'https://www.${{ env "DECK_EXTERNAL_ZONE" }}/${localization}new-path'
```

- `/es/old-path` → `/es/new-path` ✓
- `/old-path` → no match (404)

**Default (no localization):** use the plain `(/|$)` suffix on the path and a static `redirect_uri`. This is correct for pages that do not have localized versions.

### 4f. Add an integration test

Append a new object inside the `redirects` array in `$REPO_DIR/integration_tests/specs/redirects.spec.ts`, just before the closing `];`:

```typescript
  {
    destination: '<dest-staging-host><dest-path>',
    source: '<source-staging-host><source-path>',
    status: <redirect-type>,
  },
```

Staging hostname mapping (use these in tests, never production domains):

- `www.datacamp.com` → `www.datacamp-staging.com`
- `campus.datacamp.com` → `campus.datacamp-staging.com`
- `app.datacamp.com` → `app.datacamp-staging.com`

For `destination`: strip the protocol (`https://`) and use `<host>/<path>` format.
For `source`: use `<host><path>` (no protocol, no trailing slash unless intentional).

**For localized redirects**, add one test entry per locale that should be verified:

```typescript
  {
    destination: 'www.datacamp-staging.com/new-path',
    source: 'www.datacamp-staging.com/old-path',
    status: 301,
  },
  {
    destination: 'www.datacamp-staging.com/es/new-path',
    source: 'www.datacamp-staging.com/es/old-path',
    status: 301,
  },
```

### 4g. Test locally (MANDATORY)

**Do NOT proceed to commit (4h) until both the curl check and the integration test (4g-ii) pass.**

**Prerequisites** (install once):

```bash
brew install kong/deck/deck
npm install -g @datacamp/kong-local
```

**Clean up stale Kong containers** (prevents port conflicts from previous runs):

```bash
cd "$REPO_DIR"
if [ -d kong-gw ]; then
  docker compose -f kong-gw/docker-compose.yml down -v 2>/dev/null
  rm -rf kong-gw
fi
```

**Start Kong:**

Run from `$REPO_DIR`:

```bash
kong-local setup-local-dev --redirects-only
```

This clones `kong-gw` and starts Kong + its database via Docker Compose. Wait until all containers are healthy:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Expected: `kong-gw-kong-1` shows `Up ... (healthy)`.

**Sync the config:**

```bash
export DECK_EXTERNAL_ZONE=datacamp-staging.com
deck gateway sync "$REPO_DIR/kong/<subfolder>/kong.yml" --kong-addr http://localhost:8001
```

Expect `Created: N, Updated: 0, Deleted: 0` for a net-new route.

**Test the redirect:**

```bash
# Basic redirect
curl -si -H "Host: www.datacamp-staging.com" "http://localhost:8000<source-path>" \
  | grep -E "HTTP|[Ll]ocation"
```

Expected output:

```http
HTTP/1.1 301 Moved Permanently
Location: https://www.datacamp-staging.com<destination-path>
```

For localized redirects, also verify locale passthrough:

```bash
# With locale prefix
curl -si -H "Host: www.datacamp-staging.com" "http://localhost:8000/es<source-path>" \
  | grep -E "HTTP|[Ll]ocation"
```

Expected: `Location` contains `/es<destination-path>`.

**Troubleshooting:**

| Symptom                                | Likely cause                                                                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connection refused` on port 8001      | Kong container not healthy yet — wait and retry                                                                                                             |
| `404` on the source path               | Route not synced — re-run `deck gateway sync`                                                                                                               |
| Wrong `Location` value                 | Check `redirect_uri` env var substitution in the YAML                                                                                                       |
| Kong container exits with plugin error | Custom plugin missing — use the DataCamp Kong image (`datacamp.jfrog.io/datacamp-docker-local/kong:latest`) and run docker compose directly from `kong-gw/` |

**Tear down** (optional, when done):

```bash
kong-local setup-local-dev cleanup --redirects-only
```

### 4g-ii. Run the integration tests locally (MANDATORY)

After verifying the redirect with curl, run the Playwright integration tests to confirm the new test case passes. **Do NOT skip this step.**

**Install dependencies** (first time only):

```bash
cd "$REPO_DIR/integration_tests"
yarn install
npx playwright install chromium
```

**Sync all subfolders first** — the test suite covers the full repo, so all kong.yml files must be loaded. Use `deck file merge` to combine them:

```bash
export DECK_EXTERNAL_ZONE=datacamp-staging.com
deck file merge $(find "$REPO_DIR/kong" -name "kong.yml" | sort | xargs) \
  -o /tmp/kong-local-merged.yml
deck gateway sync /tmp/kong-local-merged.yml --kong-addr http://localhost:8001
```

**Run only the new test** by grepping for the source path:

```bash
cd "$REPO_DIR/integration_tests"
yarn test --grep "internal.*<source-path>" --reporter=list
```

Expected output (one test, passing):

```text
✓  1 [chromium] › redirects.spec.ts:... › internal › redirects <source> to <destination> (Xms)
  1 passed
```

**Run the full internal suite** to check for regressions:

```bash
yarn test --grep "internal" --reporter=list
```

> **Note:** Some tests may fail with `404` for routes that belong to the _other_ repo (e.g., `campus.*` routes when working in the logged-out repo). This is expected when only one repo is synced locally — those failures are pre-existing and unrelated to your change. Verify that the only failures shown are the same ones present on the `master` branch before your change.

### 4h. Commit the changes

```bash
git -C "$REPO_DIR" add kong/<subfolder>/kong.yml integration_tests/specs/redirects.spec.ts
git -C "$REPO_DIR" commit -m "Add redirect: <source-path> → <destination-path>"
```

### 4i. Push the branch

```bash
git -C "$REPO_DIR" push -u origin "<branch-name>"
```

### 4j. Open a PR

`cd` into `$REPO_DIR` and invoke the **`dc-create-pr`** skill, passing the Jira ticket ID if one was provided. That skill handles title formatting, PR template discovery, the ai-authored label, Jira ticket transition, and Slack notification.

```bash
cd "$REPO_DIR"
# then invoke: /dc-create-pr <ticket-id>
```

## Step 5: Report results

Return the PR URL to the user.

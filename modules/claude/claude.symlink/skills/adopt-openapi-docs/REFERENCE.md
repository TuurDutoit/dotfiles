# OpenAPI Documentation Standard — Reference

Explanatory companion to PLAYBOOK.md. Read the relevant section, then
answer the user's question — and link the source so they can read the
canonical version themselves.

## API Categories (RFC #26)

Every HTTP operation must declare its category via the
`x-dc-api-category` OpenAPI extension. The category drives where the
docs are published and which versioning rules apply.

| Category   | Audience                                   | Versioning | Example           |
| ---------- | ------------------------------------------ | ---------- | ----------------- |
| `public`   | External consumers (often B2B customers)   | Strict     | `lms-catalog-api` |
| `internal` | Other DataCamp teams / domains             | Strict     | `main-app`        |
| `private`  | Only the owning team's own services (BFFs) | Exempt     | `learn-hub-api`   |

**Why category matters:**

- It dictates which `api-docs[-internal|-private].datacamp[…].com` site
  the spec is published to (private/internal sites are VPN-only).
- It dictates the breaking-change blast radius — `public` changes affect
  external customers, so reviewers should treat them with the same care
  as a database migration.
- `private` APIs are exempt from versioning under RFC #25 because no
  external consumer depends on them.

**Choosing a category when unsure:**

- Mounted under a BFF (`*-hub-api`, `*-frontend-api`)? → `private`.
- Lives in a service named `*-api` and other team services call it? → `internal`.
- Documented for external customers, on the public datacamp.com domain? → `public`.

Source: [RFC #26 — API Categorisation](https://datacamp.atlassian.net/wiki/spaces/PRODENG/pages/3593109560/RFC+26+-+API+Categorisation)

---

## API Versioning (RFC #25)

URI versioning, with the `v` prefix added by NestJS automatically.

```typescript
@Controller({ version: ['1'] })          // → /v1/<path>
@Controller({ version: ['1', '2'] })     // → /v1 and /v2
@Controller({ version: ['beta'] })       // → /vbeta/<path>
```

**`VERSION_NEUTRAL` pitfall** — applying it to multiple controllers for
the same path produces ambiguous routes. Don't do this:

```typescript
@Controller({ version: ['1', VERSION_NEUTRAL] }) // serves /cats AND /v1/cats
class CatsV1Controller { @Get('cats') /*…*/ }

@Controller({ version: ['2', VERSION_NEUTRAL] }) // ALSO serves /cats — collision!
class CatsV2Controller { @Get('cats') /*…*/ }
```

Two safe approaches:

1. **Colocate versions in one controller**: a single `CatsController`
   with `version: ['1', '2']` and explicit handlers per version.
2. **Endpoint-level versioning**: only one controller is `VERSION_NEUTRAL`;
   the others are version-specific.

For backwards-compat during a migration, mark the legacy controller
`VERSION_NEUTRAL` so unversioned URLs keep working until clients
upgrade, then remove it.

Private APIs are versioning-exempt.

Source: [RFC #25 — API Versioning](https://datacamp.atlassian.net/wiki/spaces/PRODENG/pages/3561750541/RFC+25+-+API+Versioning)

---

## The DataCamp packages — what each one is for

| Package                               | Role                                                                                                                                | Used by                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `@nestjs/swagger`                     | Generates the OpenAPI document from controllers/DTOs. NestJS first-party.                                                           | Every NestJS service                                      |
| `@datacamp/api-docs-config`           | Redocly plugin. Provides `datacamp/recommended` config + `enforce-api-category` lint rule.                                          | Every service publishing docs                             |
| `@datacamp/nestjs-openapi-decorators` | `@ApiPublic()` / `@ApiInternal()` / `@ApiPrivate()` shorthand for the category extension.                                           | Most services                                             |
| `@datacamp/nestjs-essentials`         | Opinionated NestJS bootstrap. Provides `DatacampFactory.create()` and `setupOpenAPI()` that hide the `--generate-docs` boilerplate. | Newer services (`backend-reference-service-nodejs`, etc.) |
| `@redocly/cli`                        | CLI for lint, preview, and (in CI) breaking-change checks. Use `^2.x`.                                                              | Every service publishing docs                             |

The `npx @datacamp/api-docs-config@latest` command scaffolds the first
three (Redocly + scripts) but NOT the decorators package or essentials —
those need a manual `yarn add`.

Source: [`@datacamp/api-docs-config` README](https://github.com/datacamp/api-docs-config) ·
[Engineering Portal — application-code](https://engineering-portal.us-east-1.internal.datacamp.com/docs/default/component/engineering-docs/api-documentation/)

---

## Decorator patterns

### Per-method (default)

Use when categories vary across endpoints in the same controller, or when
reviewers want the category visible on every handler.

```typescript
import { ApiInternal, ApiPublic } from '@datacamp/nestjs-openapi-decorators';

@Get(':id')
@ApiOperation({ summary: 'Get a foo by ID' })
@ApiInternal()
getFooById(@Param('id') id: string) { /*…*/ }
```

Behind the scenes, `@ApiInternal()` is just
`@ApiExtension('x-dc-api-category', 'internal')`.

### Class-level (worked example: group-reporting)

Cleaner when _every_ endpoint in the controller shares a category. The
`@datacamp/nestjs-openapi-decorators` package does NOT currently expose
this — `group-reporting` ships its own `@ApiCategory(category)` helper
that walks the prototype and applies the extension to every method:

```typescript
@ApiCategory('private')
@Controller({ version: '1' })
export class GroupExportsController {
  /*…*/
}
```

See `group-reporting/apps/group-reporting/src/app/common/swagger/api-category.decorator.ts`
for the implementation and `.spec.ts` for the unit tests.

### When the category should be on the operation extension directly

Same effect, more verbose:

```typescript
@Get()
@ApiExtension('x-dc-api-category', 'public')
findAll() { /*…*/ }
```

Use only when neither the package nor the helper is available in your
codebase.

---

## CircleCI orb arguments

`datacamp-artifactory/generate_openapi_spec` accepts (frequently
misnamed):

| Arg                    | Required | What it does                                                                |
| ---------------------- | -------- | --------------------------------------------------------------------------- |
| `app_name`             | yes      | Must match `app:` in `deploy.yml` exactly                                   |
| `output_path`          | yes      | Path the orb expects to find the generated spec at                          |
| `output_path_public`   | no       | Path to category-split public spec (advanced — most apps skip)              |
| `output_path_internal` | no       | Path to category-split internal spec                                        |
| `output_path_private`  | no       | Path to category-split private spec                                         |
| `docs_gen_command`     | no       | Defaults to `yarn api-docs:generate` — override only if your script differs |
| `docs_lint_command`    | no       | Defaults to `yarn api-docs:lint` — override only if needed                  |
| `executor`             | yes      | Your node executor                                                          |
| `name`                 | no       | Display name (`generate-docs` is the convention)                            |

Common foot-guns:

- Args were once documented as `service` / `spec-file` / `generate-command`;
  those names will be silently ignored. Use the names above.
- The orb halts the upload step on non-master branches automatically —
  don't add a master-only `filters:` block, or PR lint/breaking-change
  checks won't run.
- Place the job before `tag_repository` and add `generate-docs` to its
  `requires:` list.

Source: [Engineering Portal — CircleCI Config](https://engineering-portal.us-east-1.internal.datacamp.com/docs/default/component/engineering-docs/api-documentation/) ·
[`cache-invalidation-service/.circleci/config.yml`](https://github.com/datacamp-engineering/cache-invalidation-service/blob/master/.circleci/config.yml)

---

## Where docs are published

The `api-docs-role` (added to the infra `deploy.yml` runlist) downloads
the uploaded spec, renders Redocly HTML, and publishes to S3 behind:

| Category | Staging                                                | Production                                     |
| -------- | ------------------------------------------------------ | ---------------------------------------------- |
| Public   | `https://api-docs.datacamp-staging.com/<app>`          | `https://api-docs.datacamp.com/<app>`          |
| Internal | `https://api-docs-internal.datacamp-staging.com/<app>` | `https://api-docs-internal.datacamp.com/<app>` |
| Private  | `https://api-docs-private.datacamp-staging.com/<app>`  | `https://api-docs-private.datacamp.com/<app>`  |

VPN required for internal/private sites. The `<app>` segment is
`app_name` from CI = `app:` from `deploy.yml`.

---

## What the `enforce-api-category` lint rule does

Provided by `@datacamp/api-docs-config`. Errors on any operation missing
the `x-dc-api-category` extension. Auto-excludes:

- Anything under `/vbeta/*` (beta endpoints aren't required to be categorised)
- The `/health` endpoint

Set the rule to `error` in `redocly.yaml` to fail CI on missing
categories (recommended), `warn` to allow gradual adoption, or `off` to
skip it entirely.

```yaml
plugins:
  - '@datacamp/api-docs-config'
extends:
  - datacamp/recommended # includes enforce-api-category at error
rules:
  datacamp/enforce-api-category: error # explicit override (optional)
```

---

## OWASP Top-10 scanning (out of scope for the migration playbook)

ZAProxy can scan the OpenAPI spec for OWASP Top-10 vulnerabilities. This
is a **separate** opt-in step done after the docs migration is merged.
Add to the infra `deploy.yml`:

```yaml
staging:
  deployment_tests:
    - runner: active-testing
      base_url: https://<app>.us-east-1.internal.datacamp-staging.com
```

⚠️ NEVER enable `active-testing` in production — ZAP performs code
injection and could modify or destroy production data.

Source: [Engineering Portal — API OWASP Top 10 Scanning](https://engineering-portal.us-east-1.internal.datacamp.com/docs/default/component/engineering-docs/api-documentation/)

---

## Reference implementations to crib from

| Repo                                    | What it shows                                                              |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `backend-reference-service-nodejs`      | The "next-gen" path with `@datacamp/nestjs-essentials` + `setupOpenAPI()`  |
| `cache-invalidation-service`            | Canonical raw `@nestjs/swagger` setup + canonical CircleCI block           |
| `group-reporting` (PR #340, #342, #343) | Real-world Nx-monorepo migration with class-level `@ApiCategory` decorator |
| `group-reporting-infra` (PR #93)        | The single-line `runlist` change in `deploy.yml`                           |
| `oas-generation-demos`                  | Side-by-side class-validator vs zod demo apps                              |

# Migration Playbook — Adopt OpenAPI Documentation in a NestJS Service

End-to-end migration of a NestJS service to DataCamp's OpenAPI documentation
standard. Run from the root of the target service repo.

The migration spans **two repositories**: the application repo (annotations + CircleCI) and the matching `<app>-infra` repo (`deploy.yml` runlist). Both must be merged before the docs land at `api-docs[-internal|-private].datacamp[-staging].com/<app>`.

Each step is verifiable. Don't skip the verifications — most past mistakes
(orb-arg names, missing `--build-arg NPM_TOKEN`, master-only filters) are
caught here.

---

## Step 0 — Pre-flight

Two fast questions before touching anything: is this repo already done, and is it actually a NestJS service on CircleCI? Everything else is detection that informs later steps, not a gate.

### 0a — Already migrated? (short-circuit)

If `redocly.yaml` exists, `package.json` has an `api-docs:generate` script, and `.circleci/*.yml` references `datacamp-artifactory/generate_openapi_spec`, this repo is already done. **Stop the playbook here** and ask the user whether they want to validate the existing setup or extend it (e.g. categorise newly-added endpoints) — don't drag them through the remaining steps.

```bash
test -f redocly.yaml \
  && grep -q '"api-docs:generate"' package.json \
  && grep -rq 'generate_openapi_spec' .circleci/
```

### 0b — Real blockers (stop on failure)

```bash
# NestJS — try jq first, fall back to grep so we don't fail on machines without jq
( command -v jq >/dev/null && jq -er '.dependencies["@nestjs/core"] // .devDependencies["@nestjs/core"]' package.json >/dev/null ) \
  || grep -q '"@nestjs/core"' package.json

# CircleCI is in use
test -f .circleci/config.yml || test -f .circleci/workflows.yml
```

### 0c — Detect the shape of the repo (advisory, not blocking)

These shape later steps but don't gate the playbook. Record answers in working memory:

- **Monorepo vs single-app**: is there an `apps/` or `packages/` directory with `nx.json` / `lerna.json` at the root? If so, treat it as a monorepo and ask the user which app to target.
- **Existing essentials**: does `package.json` depend on `@datacamp/nestjs-essentials`? If yes, prefer the `DatacampFactory.create()` + `setupOpenAPI()` path in Step 4a. Otherwise use the raw `@nestjs/swagger` path in Step 4b.
- **Validation library**: `class-validator` (preferred, easier annotation) or `zod` (works, needs `nestjs-zod`).
- **Working tree**: if `git status --porcelain` shows uncommitted changes, surface them to the user before making edits — don't auto-stash, don't block. Branch creation happens in Step 1.

---

## Step 1 — Locate the Jira ticket

Ticket convention: one ticket per service migration. Format
`[B2B-NNNN] Adopt OpenAPI documentation in <service>`.

Look for an existing ticket via:

1. `$ARGUMENTS` if a ticket key was passed.
2. The current branch name (regex `[A-Za-z]+-\d+`).
3. JQL search if Atlassian MCP is available:
   `summary ~ "OpenAPI" AND text ~ "<service-name>"`.

If none found, offer to create one (chain into the `create-ticket` skill).
Use this template:

```text
Summary: [<TEAM-PROJECT>-NNNN] Adopt OpenAPI documentation in <service>

## Context
<service> is a NestJS service owned by <team>. Adopting the company-wide
OpenAPI documentation standard per the Engineering Portal guide.

## Acceptance criteria
- [ ] All HTTP endpoints annotated (`@ApiTags`, `@ApiOperation`,
      DTOs annotated with `@ApiProperty` / `@ApiPropertyOptional`)
- [ ] Every endpoint labelled with `x-dc-api-category` (public/internal/
      private) per RFC #26
- [ ] OpenAPI spec generated via `SwaggerModule.createDocument()` and
      published by the `datacamp-artifactory/generate_openapi_spec`
      CircleCI orb
- [ ] `api-docs-role` added to the deploy runlist; docs reachable at
      `api-docs[-internal|-private].datacamp[-staging].com/<service>`
- [ ] Redocly lint passes with the DataCamp `enforce-api-category` rule

## References
- Engineering Portal — API Documentation
- RFC #26 (API Categorisation)
- RFC #25 (API Versioning)
```

Create a feature branch off `master`:

```bash
git checkout master && git pull --ff-only
git checkout -b <ticket-id>-adopt-openapi-docs
```

If the working tree is dirty, surface that to the user and ask whether to stash, commit, or abort — don't silently overwrite their work. If you're already on a correctly-named feature branch (e.g. resuming a partial migration), skip the checkout.

---

## Step 2 — Categorise endpoints (with the user)

This is the only step that requires real human judgement. Do it before
touching any code.

**For each controller** in the service, identify the category per RFC #26:

| Category   | When to use                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| `public`   | Customer-facing, often B2B. External consumers depend on the contract. (e.g. `lms-catalog-api`)         |
| `internal` | Consumed by other DataCamp teams/services. Stable contract within the org. (e.g. `main-app`)            |
| `private`  | Used only inside the owning team's domain. BFF or backend-for-frontend patterns. (e.g. `learn-hub-api`) |

Process:

1. List every controller and a one-line summary of what it does.
2. Use `AskUserQuestion` (multiple choice + multiSelect when several
   controllers share a category) to confirm the category for each.
3. If a single controller mixes categories at the endpoint level (rare but
   real), note that — Step 5 supports per-method decoration.
4. Record the mapping in working memory; you'll apply it in Step 5.

**Default heuristic when the user is unsure**: a controller mounted under
a BFF (`*-hub-api`, `*-frontend`) is almost always `private`; a controller
in a service named `*-api` consumed by other teams is `internal`; LMS /
external-facing surfaces are `public`.

---

## Step 3 — Scaffold Redocly + scripts

DataCamp provides an interactive scaffolder. Run it from the **service
root** (or app root in a monorepo, where `package.json` lives):

```bash
npx @datacamp/api-docs-config@latest
```

It will:

- Install `@redocly/cli` and `@datacamp/api-docs-config` as dev deps
- Create `docs/.gitkeep`
- Add `docs/openapi.json` to `.gitignore`
- Write `redocly.yaml`:
  ```yaml
  # DataCamp API documentation configuration
  plugins:
    - '@datacamp/api-docs-config'
  extends:
    - datacamp/recommended
  ```
- Add three `package.json` scripts (NestJS variant):
  ```json
  "api-docs:generate": "nest start -- --generate-docs",
  "api-docs:lint": "redocly lint docs/openapi.json",
  "api-docs:preview": "yarn api-docs:generate && redocly preview --project-dir ./docs --product redoc"
  ```

⚠️ **Interactive prompt**: if `redocly.yaml` already exists the scaffolder
asks `Do you want to overwrite it? (y/N)`. Run the command via `Bash`
without piping, then if it stalls warn the user and offer to do the
scaffolding manually instead (the steps above are deterministic).

⚠️ **Non-yarn projects**: the scaffolder hardcodes `yarn add -D`. If the
repo uses `npm` or `pnpm`, do the install manually with the matching
command and copy the scripts/`redocly.yaml` from a reference repo
(e.g. `cache-invalidation-service`).

⚠️ **Monorepos** (Nx, Lerna): the scaffolder writes to the _current_
`package.json` only. For Nx (e.g. `group-reporting`), keep the Redocly
config at the **repo root** but adapt scripts to delegate to the right
target — see Step 3a below.

### Step 3a — Monorepo adaptation (skip for single-app repos)

For Nx, the actual generate command lives in the app's `project.json` as
a `generate-docs` target. Override the root scripts:

```json
"api-docs:generate": "yarn nx run <app-name>:generate-docs",
"api-docs:lint": "yarn api-docs:generate && redocly lint docs/<app-name>/reference/api.json",
"api-docs:preview": "yarn api-docs:generate && redocly preview --project-dir ./docs/<app-name>/reference --product redoc"
```

And point `redocly.yaml` at the per-app spec path:

```yaml
apis:
  <app-name>@latest:
    root: docs/<app-name>/reference/api.json
```

(See `group-reporting/redocly.yaml` for the canonical example.)

### Verification

```bash
test -f redocly.yaml
test -f docs/.gitkeep
grep -q "docs/openapi.json" .gitignore || \
  grep -q "docs/.*api\\.json" .gitignore
jq -r '.scripts["api-docs:generate"], .scripts["api-docs:lint"]' package.json
```

---

## Step 4 — Wire bootstrap

Pick one path based on Step 0 detection.

### Step 4a — Service uses `@datacamp/nestjs-essentials` (preferred)

`main.ts` should look like this — `setupOpenAPI` handles every concern
(preview mode, file write, dev-only Swagger UI, exit code):

```typescript
// main.ts
import '@datacamp/nestjs-essentials/instrument';
import { DatacampFactory } from '@datacamp/nestjs-essentials';

import { configureApp } from './app.factory';
import { AppModule } from './app.module';
import { createConfig } from './config';

async function bootstrap() {
  const { app, setupOpenAPI } = await DatacampFactory.create(AppModule);

  configureApp(app); // sets global prefix, enables URI versioning, etc.

  setupOpenAPI({
    title: '<Service> API',
    description: '<one-paragraph description of the service>',
  });

  const config = createConfig();
  await app.listen(config.get('PORT'));
}
void bootstrap();
```

No `--generate-docs` flag handling needed — essentials does it.

### Step 4b — Raw `@nestjs/swagger` (no essentials)

Add the preview-mode pattern from the Engineering Portal docs. The
canonical layout is in `cache-invalidation-service/src/main.ts`. Insert
the four pieces:

```typescript
// main.ts (additions only)
import { writeFileSync } from 'node:fs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication, VersioningType } from '@nestjs/common';

const isGeneratingDocs = process.argv.includes('--generate-docs');
const isLocalEnvironment = process.env.NODE_ENV === 'development';

// Function declaration (not const arrow) so it's hoisted and can be
// referenced from `bootstrap` regardless of source order — keeps
// `@typescript-eslint/no-use-before-define` happy under the DataCamp
// ESLint config without having to disable it.
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    preview: isGeneratingDocs,
  });

  app.setGlobalPrefix('api'); // if not already set
  app.enableVersioning({
    // if not already set
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  await buildOpenApiDocument(app); // BEFORE app.listen, AFTER prefix/versioning

  if (isGeneratingDocs) return; // doc-only invocation; bootstrap is done

  await app.listen(port);
}

async function buildOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('<Service> API')
    .setDescription('<one-paragraph description>')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  if (isGeneratingDocs) {
    writeFileSync('docs/openapi.json', JSON.stringify(document));
    await app.close(); // graceful shutdown, no `process.exit`
    return;
  }

  if (isLocalEnvironment) {
    SwaggerModule.setup('docs', app, document);
  }
}
```

⚠️ Critical ordering: `setGlobalPrefix` and `enableVersioning` MUST run
before `buildOpenApiDocument(app)`, otherwise the spec misses prefixes/
versions. `buildOpenApiDocument` MUST run before `app.listen()`.

⚠️ **No `process.exit(0)`**: the DataCamp ESLint config enables
`node/no-process-exit`. Use `await app.close()` and let `bootstrap`
return — the Node process exits naturally once nothing's listening.
The legacy `process.exit(0)` pattern from the Engineering Portal
predates that lint rule.

### Step 4c — NestJS CLI plugin (both paths)

In `nest-cli.json`, enable the swagger CLI plugin so DTO types are
inferred without manual `@ApiProperty()` on every field:

```json
{
  "compilerOptions": {
    "plugins": [
      { "name": "@nestjs/swagger", "options": { "introspectComments": true } }
    ]
  }
}
```

Strongly recommended when using `class-validator`. Reduces annotation
work in Step 5 substantially.

### Verification

```bash
yarn api-docs:generate
test -f docs/openapi.json -o -f docs/<app-name>/reference/api.json
jq '.openapi, .info.title' docs/openapi.json 2>/dev/null || \
  jq '.openapi, .info.title' docs/<app-name>/reference/api.json
```

The spec should generate without DB / Redis / external services running
(that's what `preview: true` is for). If it tries to connect to anything,
something is mis-imported in `AppModule`.

### Local preview

`yarn api-docs:preview` runs `redocly preview`, which **requires Node
22+** (it uses `Promise.withResolvers`, added in Node 22). On Node 20
you'll see `TypeError: Promise.withResolvers is not a function`.

Two options if the user is stuck on Node 20:

```bash
nvm use 22 && yarn api-docs:preview          # preferred — live reload
yarn redocly build-docs docs/openapi.json -o docs/index.html  # static HTML, Node-20 compatible
```

Add `docs/index.html` to `.gitignore` if you go the static route.

---

## Step 5 — Annotate controllers and DTOs

Apply the category mapping from Step 2 plus operation/DTO documentation.

### Categorisation — pick one pattern per controller

**Pattern A — per-method decorators (default).** Use when endpoints in a
controller mix categories, or when reviewers prefer the category visible
on each handler.

```typescript
import {
  ApiInternal,
  ApiPublic,
  ApiPrivate,
} from '@datacamp/nestjs-openapi-decorators';

@Controller({ path: 'foo', version: ['1'] })
export class FooController {
  @Get(':id')
  @ApiOperation({ summary: 'Get a foo by ID' })
  @ApiInternal()
  getFooById(@Param('id') id: string) {
    /* … */
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a foo by slug' })
  @ApiPublic()
  getFooBySlug(@Param('slug') slug: string) {
    /* … */
  }
}
```

Install: `yarn add @datacamp/nestjs-openapi-decorators`.

**Pattern B — class-level decorator** (used in `group-reporting`). Cleaner
when _every_ endpoint in the controller shares the same category.

The `@datacamp/nestjs-openapi-decorators` package does NOT currently
expose a class-level decorator. Two options:

1. Drop in this small helper (lifted from `group-reporting/apps/group-reporting/src/app/common/swagger/api-category.decorator.ts`):

   ```typescript
   import { ApiExtension } from '@nestjs/swagger';

   export type ApiCategoryValue = 'internal' | 'private' | 'public';

   /**
    * Tags every own route handler on the controller with x-dc-api-category
    * (RFC #26). Applied at class level so a single decorator covers every
    * endpoint. Does not tag the constructor or methods inherited from a
    * parent class.
    */
   export function ApiCategory(category: ApiCategoryValue): ClassDecorator {
     return (target) => {
       const decorateMethod = ApiExtension('x-dc-api-category', category);
       const { prototype } = target as unknown as { prototype: object };
       Object.getOwnPropertyNames(prototype)
         .filter((key) => key !== 'constructor')
         .map(
           (key) =>
             [key, Object.getOwnPropertyDescriptor(prototype, key)] as const,
         )
         .filter(
           (
             entry,
           ): entry is [
             string,
             TypedPropertyDescriptor<(...args: never[]) => unknown>,
           ] => entry[1] !== undefined && typeof entry[1].value === 'function',
         )
         .forEach(([key, descriptor]) => {
           decorateMethod(prototype, key, descriptor);
         });
     };
   }
   ```

2. Use the raw extension at the class level (works but easy to overlook
   in code review):

   ```typescript
   @Controller(/* … */)
   @ApiExtension('x-dc-api-category', 'internal')
   export class FooController {
     /* … */
   }
   ```

Recommend option (1) — it includes a unit test in
`api-category.decorator.spec.ts` in `group-reporting` for reference.

### DTO annotation

For every request-body DTO and every typed response DTO:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

export class CreateThingBody {
  @ApiProperty({ description: 'Type of thing.', enum: ThingType })
  @IsEnum(ThingType)
  type!: ThingType;

  @ApiPropertyOptional({ description: 'Optional team scope.' })
  @IsOptional()
  teamId?: number;
}
```

#### Zod-based DTOs (`nestjs-zod`)

If the repo standardises on Zod (e.g. `practice-api`), DTOs are typically
declared as `export type X = z.infer<...>` — `@nestjs/swagger` cannot
introspect a type alias. Convert each DTO to a class via `createZodDto`:

```typescript
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const createThingSchema = z.object({
  type: z.enum(['foo', 'bar']),
  teamId: z.number().int().optional(),
});

// Class form: lets `@nestjs/swagger` introspect the schema for the
// OpenAPI document, AND keeps the inferred TypeScript shape identical.
export class CreateThingDto extends createZodDto(createThingSchema) {}
```

⚠️ **Avoid `z.json()`** when the field will be exposed via OpenAPI.
`z.json()` emits a recursive `$ref: "#/$defs/__schema0"`, and `$defs` is
JSON Schema 2020-12 / OpenAPI 3.1 — **not valid in OpenAPI 3.0**, which
is what Redocly bundles against. Symptom: `redocly build-docs` fails
with `Can't resolve $ref` while `redocly lint` passes (the lint rule
walks refs differently). When you need "any JSON value", use a flat,
non-recursive union — preserves runtime semantics and required-ness:

```typescript
const jsonValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
]);
```

Don't substitute `z.unknown()` / `z.any()` — both make the field optional
in the inferred TS type, silently weakening the contract.

### Response annotation — schemas AND example data

Request DTOs only get you halfway. The Redocly preview's "mock response"
panel is rendered from the spec, picking a value in this priority order:

1. An `examples:` block on the response.
2. An `example:` field on the response schema.
3. `example:` fields on individual schema properties.
4. **Fallback**: synthetic placeholders inferred from the type
   (`"string"`, `0`, `true`, empty arrays).

If you only declare schemas (or rely on inferred return types), the
status code is right but the body is gibberish — `0` for IDs, `true`
for every boolean. Reviewers see the spec as half-done.

To verify the gap on a generated spec:

```bash
jq '.paths
  | to_entries
  | map(.value | to_entries | map(.value.responses // {} | to_entries
      | map(select(.value.content)
        | { hasExamples: ((.value.content // {})["application/json"].examples != null),
            schemaExample: ((.value.content // {})["application/json"].schema.example != null) })))' \
  docs/openapi.json | head -40
```

Every data-returning endpoint should show `hasExamples: true` or
`schemaExample: true`. If they're all `false`, you're in placeholder land.

#### Rule — typed DTOs first, always

**Default to a typed response DTO. Do not reach for `@ApiOkResponse({
schema: { example: … } })` until you've confirmed a DTO won't work.**
The inline-example shortcut looks attractive (one decorator, no new
file) but it's actively harmful: the example drifts from the actual
return type, reviewers can't link the example to a name, and you can't
reuse the shape across endpoints.

Before annotating any data-returning endpoint, ask in this order:

1. Does a DTO already exist for this response shape (entity DTO, Zod
   schema, anything `createZodDto`-able)? → Use it. Pattern A below.
2. Can you reasonably extract one from the handler's return type? →
   Create it. Pattern A.
3. Is this a one-off, throwaway shape that genuinely doesn't deserve a
   class (e.g. `{ status: 'ok' }` health probes)? → **Only then** use
   the inline-example fallback. Pattern B.

If you find yourself writing the same inline example shape on more
than one endpoint, stop — extract a DTO.

#### Pattern A — Typed response DTO (default)

Pick the variant that matches the codebase's validation library.

**A.1 — `class-validator` codebases.** Field-level examples on a class
that doubles as the runtime DTO:

```typescript
// lessons/lesson-availability.response.ts
import { ApiProperty } from '@nestjs/swagger';

export class LessonAvailabilityDto {
  @ApiProperty({ example: 12345 })
  lessonId!: number;

  @ApiProperty({ example: true })
  hasPractice!: boolean;
}

// lessons.controller.ts
@ApiOkResponse({ type: LessonAvailabilityDto, isArray: true })
async getLessons(/* … */) { /* … */ }
```

For nested response shapes, **must** be a class with `@ApiProperty`
on each field, referenced via `type: () => …` — see "Nested objects:
classes only" below.

**A.2 — Zod-first codebases (`nestjs-zod`).** Schema, type, and example
from one source via `extendApi`, then exposed as a class with
`createZodDto`:

```typescript
import { createZodDto, extendApi } from 'nestjs-zod';
import z from 'zod';

export const lessonAvailabilitySchema = z.object({
  lessonId: extendApi(z.number().int(), { example: 12345 }),
  hasPractice: extendApi(z.boolean(), { example: true }),
});

export class LessonAvailabilityDto extends createZodDto(lessonAvailabilitySchema) {}

// in the controller
@ApiOkResponse({ type: LessonAvailabilityDto, isArray: true })
async getLessons(/* … */) { /* … */ }
```

`.describe()` alone propagates a description but NOT an example — you
need `extendApi` for the mock value. The equivalent `.openapi()` helper
from `@anatine/zod-openapi` works too if the repo already uses it.

#### Pattern B — Inline `schema.example` (fallback only)

Use only when:

- The response shape is genuinely one-off — used by exactly this
  endpoint and nowhere else. AND
- Extracting it to a DTO would create more cognitive load than it
  removes (typically: 2–3 fields, primitive values, no nested objects).
- Common legitimate cases: health-probe outputs, single-string status
  responses, sentinel `{ ok: true }` payloads.

```typescript
@Get('/health/ready')
@ApiOkResponse({
  description: 'Readiness probe response',
  schema: { example: { status: 'ok' } },
})
async ready() { return { status: 'ok' }; }
```

If the inline shape grows past primitives, or you find yourself
repeating it across endpoints, refactor into Pattern A.

#### Empty bodies — be explicit

For 204 / no-content endpoints, declare it:

```typescript
import { ApiNoContentResponse } from '@nestjs/swagger';

@Delete(':id')
@HttpCode(204)
@ApiNoContentResponse({ description: 'Lesson deleted' })
async deleteLesson(/* … */) { /* … */ }
```

Reviewers immediately see "no body" rather than guessing whether the
absence is intentional.

#### Don't forget error responses

`@nestjs/swagger` won't infer error shapes from `throw new
NotFoundException(...)`. For endpoints that have meaningful error cases,
declare them too — at minimum the ones that reviewers will hit while
exploring:

```typescript
@ApiNotFoundResponse({ description: 'Lesson not found' })
@ApiBadRequestResponse({ description: 'Invalid lesson ID' })
```

DataCamp doesn't currently mandate a shared error DTO, but if your
service standardises one (e.g. `{ statusCode, message, error }`), tie
it in via `@ApiResponse({ status: 404, type: ErrorResponseDto })`.

### Nested objects: classes only, never inline shapes

The `@nestjs/swagger` plugin only hoists field required-ness into a parent
`required: []` array **when the field's type is a proper class** with
`@ApiProperty()` decorators on its members. For anything else — inline
anonymous shapes, `type` aliases, `interface`s — it falls back to
stamping `required: true` directly on each child property. **That's
invalid OpenAPI 3.x**: on a schema, `required` must be a string array of
property names on the parent, not a boolean on each child.

Symptom: spec generation succeeds (NestJS doesn't know it's wrong),
Redocly lint usually passes, but the next CI run that has a real
baseline fails the breaking-changes check with `oasdiff` errors like:

```text
schema: required must be []string, got: bool (true)
```

Bad — DON'T do this:

```typescript
// type alias — plugin can't hoist
export type ResponseMeta = { lastUpdatedAt: string; page: number };

export class ActiveMembersResponse {
  @ApiProperty()
  meta!: ResponseMeta; // emitted as inline anonymous shape
}

// inline annotation — same problem
export class ActiveMembersResponse {
  @ApiProperty()
  meta!: { lastUpdatedAt: string; page: number };
}

// interface — also doesn't work
export interface ResponseMeta {
  lastUpdatedAt: string;
  page: number;
}
```

Good — DO this:

```typescript
export class ResponseMeta {
  @ApiProperty({ format: 'date-time', example: '2026-04-30T12:00:00Z' })
  lastUpdatedAt!: string;

  @ApiProperty({ example: 1 })
  page!: number;
}

export class ActiveMembersResponse {
  @ApiProperty({ type: () => ResponseMeta }) // explicit type pointer
  meta!: ResponseMeta;
}
```

Three things must all be true:

1. `ResponseMeta` is a `class` (not `type` / `interface`).
2. Every field on `ResponseMeta` has its own `@ApiProperty()`.
3. The parent's `@ApiProperty` references it via `type: () => ResponseMeta`
   (the arrow form avoids circular-import issues).

Without (3), the plugin reads the literal TS annotation and inlines the
shape anyway — even if `ResponseMeta` is a perfectly valid class. This
is the trap on the second attempt: the team converted the type to a
class but forgot the `type: () => …` pointer.

#### Verification before you push

Run `yarn api-docs:generate`, then check the generated spec for the
invalid pattern:

```bash
jq '[.. | objects | select(.required == true)] | length' docs/openapi.json
# Expected: 0. Anything else means inline shapes leaked into the spec.
```

If non-zero, find the offenders:

```bash
jq -r 'paths(objects | select(.required == true)) | join(".")' docs/openapi.json
# Output: dot-separated paths to each invalid object
# Cross-reference with grep -rn 'meta!\|pagination!\|details!' src/
# (or your codebase's nested-object naming convention)
```

#### Zod is mostly safe from this

`nestjs-zod` walks the zod schema tree, not the TS type, so nested
`z.object({...})` shapes serialise correctly. You still need to
`createZodDto` the _top-level_ class, but nested objects don't each need
their own `createZodDto` wrapper. The trap above is specific to
`class-validator` + inline TS annotations.

### Operation summaries

Default summaries (`foo_getFooById_v1`) read poorly in Redocly. Add
`@ApiOperation({ summary: '…' })` to every endpoint. One sentence,
imperative, no period.

### Versioning sanity check

Confirm controllers use the version syntax from RFC #25:

```typescript
@Controller({ version: ['1'] })           // → /v1/<path>
@Controller({ version: ['1', '2'] })      // → /v1 and /v2
@Controller({ version: ['beta'] })        // → /vbeta — excluded from category lint
```

For backwards compat during a migration, see REFERENCE.md §Versioning
for the `VERSION_NEUTRAL` pitfall.

### Verification

```bash
yarn api-docs:generate && yarn api-docs:lint
```

Lint must pass cleanly. The `enforce-api-category` rule will list every
operation missing `x-dc-api-category` — fix and re-run until green. The
`/health` endpoint and `/vbeta/*` paths are auto-excluded.

---

## Step 6 — Wire CircleCI

Add the `datacamp-artifactory/generate_openapi_spec` job. **Run it before
`tag_repository`** so the master tag includes the published spec.

If `.circleci/config.yml` and `.circleci/workflows.yml` are split (as in
group-reporting), put the orb invocation in `workflows.yml`.

Canonical block (from `cache-invalidation-service/.circleci/config.yml`):

```yaml
- datacamp-artifactory/generate_openapi_spec:
    context: org-global
    name: generate-docs
    executor: node_cimg # local executor, NOT the orb default
    app_name: '<app-name>' # MUST match deploy.yml `app:` value
    output_path: docs/openapi.json
    use-yarn-berry: true # required for Yarn Berry repos (see below)
    # Optional category-split outputs (set if your app emits these)
    # output_path_public: docs/openapi.public.json
    # output_path_internal: docs/openapi.internal.json
    # output_path_private: docs/openapi.private.json
    requires:
      - queue
      - test # whatever your test job is named
```

⚠️ **You MUST define a local executor.** The orb's default executor is
`cimg/base` (no Node), so `yarn` isn't on `$PATH` and the job fails with
`yarn: command not found`. Define one at the top of `config.yml`:

```yaml
executors:
  node_cimg:
    docker:
      - image: cimg/node:22.19 # hardcode the version, see below
```

⚠️ **Hardcode the executor's Docker image** — even if you have a
`pipeline.parameters.node_version` defined elsewhere, pipeline parameters
are NOT visible inside an orb-passed executor (CircleCI evaluates them
in a different scope). Using `<< pipeline.parameters.node_version >>`
inside an executor that's passed to an orb fails validation with
`Unknown variable(s): pipeline.parameters.node_version`. Add a comment
to keep the hardcoded version in sync with the parameter.

⚠️ **Yarn Berry repos** — the orb defaults to `npm install`, which fails
on a Yarn Berry repo (no `package-lock.json`, missing `node_modules` for
zero-install setups). Pass `use-yarn-berry: true` so the orb runs
`yarn install --immutable` instead. Symptom without it:
`npm error code ENOENT ... package-lock.json`.

Then update `tag_repository` to require it:

```yaml
- datacamp-artifactory/tag_repository:
    requires:
      - docker-build
      - generate-docs # ← add this
    filters:
      branches:
        only: master
```

⚠️ **Past mistakes to avoid** (from group-reporting PR #342):

- Argument names are `app_name` / `output_path` / `docs_gen_command` /
  `docs_lint_command` — NOT `service` / `spec-file` / `generate-command`.
  Older docs and StackOverflow-style snippets use the wrong names.
- Don't add a `filters: branches: only: master` to the orb job. The orb
  itself only uploads on master, but the lint + breaking-change checks
  should run on every PR.
- Only override `docs_gen_command` / `docs_lint_command` if the standard
  `yarn api-docs:generate` / `yarn api-docs:lint` scripts won't work
  (e.g. monorepo with custom paths). The orb's defaults match those
  script names.

### Docker build needs the npm token

If your Dockerfile installs deps inside the build (most do), it needs
auth for `@datacamp/api-docs-config` and `@datacamp/nestjs-openapi-decorators`.
Confirm `build_and_push_image_to_artifactory` passes the token:

```yaml
extra-docker-args: '--build-arg VERSION=$(git describe --tags) --build-arg NPM_TOKEN=${NPM_TOKEN_INSTALL_PACKAGES_READ}'
```

And the Dockerfile reads it (typical pattern):

```dockerfile
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc \
 && yarn install --frozen-lockfile \
 && rm ~/.npmrc
```

If missing, add it — the docker-build will start failing on master
otherwise.

### Verification

Push the branch. On the PR you should see:

- The `generate-docs` job in the CircleCI pipeline (passes lint, may show
  breaking-changes annotations).
- A bot PR comment with the CIS API spec table once `generate-docs` is
  green at least once on master (won't appear on the very first PR).

---

## Step 7 — Wire infra (separate repo, separate PR)

Switch to the matching `<app>-infra` repo (typically `<app>-infra` next
to the app — e.g. `group-reporting` → `group-reporting-infra`).

Add `api-docs-role` to the runlist in `deploy.yml`. This is a **single
line change** (see `group-reporting-infra` PR #93):

```diff
-runlist: "terraform-role,migration-role,k8s-role,db-teleport-user-role"
+runlist: "terraform-role,migration-role,k8s-role,db-teleport-user-role,api-docs-role"
```

Order doesn't matter; convention is to append.

⚠️ Don't add OWASP scanning (`deployment_tests` / `active-testing`) at
the same time. That's a separate follow-up — see Engineering Portal §
"API OWASP Top 10 Scanning". Active-testing must NOT be enabled for prod.

Open a separate PR with the same ticket prefix. The infra PR can be
merged independently of the app PR; the role only does work once the
spec is being uploaded by the app PR's CI.

After both merges, docs will appear at:

| Category | Staging                                                | Production                                     |
| -------- | ------------------------------------------------------ | ---------------------------------------------- |
| Public   | `https://api-docs.datacamp-staging.com/<app>`          | `https://api-docs.datacamp.com/<app>`          |
| Internal | `https://api-docs-internal.datacamp-staging.com/<app>` | `https://api-docs-internal.datacamp.com/<app>` |
| Private  | `https://api-docs-private.datacamp-staging.com/<app>`  | `https://api-docs-private.datacamp.com/<app>`  |

(Internal and private sites are VPN-only.)

---

## Step 8 — Open the PRs

Chain into the **`dc-create-pr`** skill twice — once in the app repo, once
in the infra repo. Both PR titles should carry the ticket prefix:
`[B2B-NNNN] Adopt OpenAPI documentation in <service>`.

For the body, surface the acceptance criteria from Step 1 as a checklist
and call out:

- Which endpoints were categorised as `public` / `internal` / `private`
  (link to controllers).
- Whether Pattern A or Pattern B was used for category decoration.
- The two URLs the docs will land at after merge (staging first).

---

## Step 9 — Verify post-merge

After both PRs merge to master:

1. CircleCI on the app repo runs `generate-docs` on master and uploads
   the spec to Artifactory.
2. The infra repo's next deploy executes `api-docs-role`, which pulls
   the spec, renders Redocly HTML, and publishes to S3.
3. Hit the staging URL (VPN required for internal/private) and confirm
   the spec renders with the right title, version list, and category
   badge in operation summaries.

If the URL 404s, give it 5–10 minutes — the role runs as part of the
normal deploy, not independently.

If it still 404s, check:

- The `app_name:` in `.circleci/config.yml` matches `app:` in `deploy.yml`
  _exactly_ (including hyphens vs underscores).
- The deploy actually ran the `api-docs-role` step — check the deploy
  logs in the Engineering Portal.

---

## Common failure modes (cheat sheet)

| Symptom                                                                                                               | Likely cause                                                                                                | Fix                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `yarn api-docs:generate` tries to connect to the database                                                             | Missing `preview: isGeneratingDocs` in `NestFactory.create`                                                 | Add it (Step 4b) or use `DatacampFactory.create` (Step 4a)                                                                                                                                                               |
| `redocly lint` fails with "Operation must have x-dc-api-category"                                                     | Endpoint missing category decorator                                                                         | Add `@ApiInternal/Public/Private` or class-level `@ApiCategory`                                                                                                                                                          |
| `redocly lint` fails for `/health` or `/vbeta/*`                                                                      | Lint rule should auto-exclude these — version mismatch                                                      | Bump `@datacamp/api-docs-config` to `^0.0.6` or later                                                                                                                                                                    |
| CI's `generate-docs` job fails on `yarn install` for `@datacamp/*`                                                    | Docker build missing `NPM_TOKEN` build-arg                                                                  | Add `--build-arg NPM_TOKEN=${NPM_TOKEN_INSTALL_PACKAGES_READ}`                                                                                                                                                           |
| Orb job runs but never uploads                                                                                        | Wrong arg names (`service` instead of `app_name`)                                                           | Use `app_name` / `output_path` / `docs_gen_command` (Step 6)                                                                                                                                                             |
| Docs URL 404s after deploy                                                                                            | `api-docs-role` missing from runlist                                                                        | Step 7 — append to `deploy.yml`                                                                                                                                                                                          |
| Docs render but no endpoints visible                                                                                  | `setGlobalPrefix`/`enableVersioning` ran AFTER `setupOpenAPI`                                               | Reorder — prefix/versioning before OpenAPI setup                                                                                                                                                                         |
| `redocly build-docs` fails with `Can't resolve $ref` on a Zod DTO                                                     | `z.json()` emits recursive `$defs` (JSON Schema 2020-12)                                                    | Replace with flat JSON-value union (Step 5 → Zod-based DTOs)                                                                                                                                                             |
| `redocly preview` crashes with `Promise.withResolvers is not a function`                                              | Node < 22 (Redocly preview needs Node 22+)                                                                  | `nvm use 22`, or use `redocly build-docs` for static HTML                                                                                                                                                                |
| `circleci config validate` fails: `Cannot find a definition for executor named node_cimg`                             | Local executor not defined; orb default is `cimg/base`                                                      | Add `executors: node_cimg:` block at top of config (Step 6)                                                                                                                                                              |
| `circleci config validate` fails: `Unknown variable(s): pipeline.parameters.X`                                        | Pipeline params not visible inside orb-passed executors                                                     | Hardcode the image in the executor (Step 6)                                                                                                                                                                              |
| Generate-docs job fails with `npm error ... package-lock.json`                                                        | Yarn Berry repo, orb defaulted to `npm install`                                                             | Pass `use-yarn-berry: true` to the orb job (Step 6)                                                                                                                                                                      |
| Lint fails with `'process.exit' is not allowed` in `main.ts`                                                          | DataCamp ESLint enables `node/no-process-exit`                                                              | Replace `process.exit(0)` with `await app.close()` (Step 4b)                                                                                                                                                             |
| Redocly mock body shows placeholder values (`"string"`, `0`, `true`) instead of realistic data                        | No `examples:` in the spec — relying on inferred return types only                                          | Add a typed response DTO with field examples (Step 5 → Response annotation, Pattern A). Inline `schema.example` only as fallback (Pattern B)                                                                             |
| Spec has examples but they're inline `schema.example` blocks scattered across controllers                             | Skipped Pattern A and went straight to the inline fallback                                                  | Refactor into a typed DTO — examples should live with the type, not on the controller (Step 5 → "Rule: typed DTOs first")                                                                                                |
| Redocly shows an empty 200 body for an endpoint that returns nothing                                                  | Handler returns `void`, spec emits empty 200 instead of explicit 204                                        | Add `@HttpCode(204)` + `@ApiNoContentResponse()` (Step 5)                                                                                                                                                                |
| oasdiff fails: `schema: required must be []string, got: bool (true)` on an existing baseline                          | Inline anonymous shape / `type` / `interface` in a DTO — plugin stamped `required: true` per child          | Convert nested types to classes with `@ApiProperty({ type: () => Cls })` (Step 5 → Nested objects) **+** ask Developer Platforms to delete the polluted Artifactory baseline so a clean spec can become the new baseline |
| Concourse deploy fails with `No OpenAPI spec files of type public/internal/private could be fetched from Artifactory` | Baseline was deleted (or never existed); Concourse looks up the spec but CircleCI hasn't republished it yet | Push a dummy commit to master (or re-run the failed master build) so `generate-docs` uploads a fresh spec, then re-trigger the deploy                                                                                    |
| `oasdiff` step succeeds even though the spec looks malformed                                                          | Orb logs `<spec> file not found, skipping diff check` on the FIRST master run (no baseline yet)             | Don't trust the first green run — re-check the spec on the second run, where it actually compares against the just-uploaded baseline                                                                                     |

---
name: adopt-openapi-docs
description: >
  Migrate a NestJS service to DataCamp's OpenAPI documentation standard, or
  explain that standard. Use when adopting OpenAPI specs, adding
  `x-dc-api-category` annotations, wiring the
  `datacamp-artifactory/generate_openapi_spec` CircleCI orb, onboarding a
  service to the `api-docs[-internal|-private].datacamp[-staging].com` sites,
  or answering questions about DataCamp's API categorisation, versioning,
  Redocly setup, or `@datacamp/api-docs-config`/`@datacamp/nestjs-openapi-decorators`.
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - AskUserQuestion
metadata:
  version: '1.1.0'
---

# Adopt OpenAPI Documentation

## Context

Bring a NestJS service into compliance with DataCamp's OpenAPI documentation
standard. The standard is owned by Developer Platforms and lives in the
[Engineering Portal](https://engineering-portal.us-east-1.internal.datacamp.com/docs/default/component/engineering-docs/api-documentation/).

## Usage

This skill has **two modes**. Pick the mode based on the user's request and
load only the file you need.

## Modes

| Mode          | Use when the user…                                                                                                      | Load                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Playbook**  | Wants the migration done on a specific repo ("adopt OpenAPI docs in X", "wire up api-docs", "categorise endpoints")     | [PLAYBOOK.md](PLAYBOOK.md)   |
| **Reference** | Wants to understand the standard ("what's the API category for…", "how does versioning work", "what does X package do") | [REFERENCE.md](REFERENCE.md) |

If the request is ambiguous (e.g. "tell me about OpenAPI at DataCamp"), ask
once via `AskUserQuestion` whether the user wants to migrate a repo or just
discuss the standard.

## Mode selection

1. **Playbook triggers** — the user is in or naming a NestJS repo and wants
   action: "adopt", "migrate", "wire", "set up", "onboard", "annotate
   endpoints", "add the orb", "publish API docs", "fix lint:openapi".
   → Read **PLAYBOOK.md** in full and follow it end-to-end. Confirm scope
   with the user before each major phase (annotate → CI → infra).

2. **Reference triggers** — explanatory or look-up questions:
   "what's an internal API", "do I need to version private APIs", "what does
   `enforce-api-category` do", "where do the docs get hosted", "what's the
   difference between `@ApiInternal` and `@ApiCategory`".
   → Read **REFERENCE.md** and answer from it. Cite the relevant section
   back to the user with a link.

3. **Both** — sometimes a migration question turns reference-shaped
   ("should this controller be public or internal?"). Read REFERENCE.md
   on demand for the relevant section, then return to PLAYBOOK.md.

## Prerequisites

**Reference mode has no prerequisites** — answer from REFERENCE.md regardless of working directory or installed tooling. Don't run shell checks before answering an explanatory question.

**Playbook mode** needs:

- Working directory is a git repo, or the user has named the target repo (so you can `cd` into it). If neither, ask once which repo to target before doing anything.
- The user can authenticate to the `@datacamp` private npm registry (the `datacamp-npm/create-npmrc-install` orb step in CI handles this; locally the user needs `~/.npmrc` configured — flag this only if `yarn` actually fails on `@datacamp/*` packages, don't pre-emptively block on it).

## Pairs well with

- **`dc-create-pr`** — chain into this at the end of the playbook to open the feature-branch PR with the right `[TICKET-ID]` prefix.
- **`dc-babysit-pr`** — useful after the PR is open to watch the `generate-docs` CircleCI job and auto-fix lint failures.

## Authoritative sources (always defer to these over the skill text)

- Engineering Portal — [API Documentation](https://engineering-portal.us-east-1.internal.datacamp.com/docs/default/component/engineering-docs/api-documentation/)
  (source: `datacamp-engineering/engineering-docs`, `docs/api-documentation/`)
- [RFC #25 — API Versioning](https://datacamp.atlassian.net/wiki/spaces/PRODENG/pages/3561750541/RFC+25+-+API+Versioning)
- [RFC #26 — API Categorisation](https://datacamp.atlassian.net/wiki/spaces/PRODENG/pages/3593109560/RFC+26+-+API+Categorisation)
- Reference implementation: [`backend-reference-service-nodejs`](https://github.com/datacamp-engineering/backend-reference-service-nodejs)
- Worked migration example: [`group-reporting` PR #340](https://github.com/datacamp-engineering/group-reporting/pull/340)
  - [`group-reporting-infra` PR #93](https://github.com/datacamp-engineering/group-reporting-infra/pull/93)
- CircleCI canonical example: [`cache-invalidation-service`](https://github.com/datacamp-engineering/cache-invalidation-service/blob/master/.circleci/config.yml)

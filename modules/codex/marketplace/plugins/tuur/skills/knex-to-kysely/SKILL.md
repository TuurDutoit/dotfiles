---
name: knex-to-kysely
description: Migrate a Node.js/TypeScript backend from Knex to Kysely. Use when the user asks to "migrate from Knex to Kysely", "replace Knex with Kysely", "switch to Kysely", or mentions migrating a query builder.
argument-hint: "[scope or file path]"
---

# Migrate from Knex to Kysely

Migrate the codebase (or the scope specified in `$ARGUMENTS`) from Knex to Kysely. Follow the phases below in order. Commit each phase separately. Run all checks (lint, format, types, tests) before each commit.

If `$ARGUMENTS` specifies a file or directory, migrate only that scope. Otherwise, migrate the entire codebase.

## Phase 1 — Prerequisites

Verify TypeScript is v5.9+. If not, upgrade it first.

Commit: `chore: upgrade TypeScript to v5.9+`

## Phase 2 — Install Dependencies

- Add: `kysely`, `kysely-codegen`, and the relevant dialect package (e.g. `pg` for Postgres).
- Check if `kysely-plugin-empty-in-list` is needed (search for `.whereIn`, `.in(` patterns — if found, install the plugin).
- Do not remove Knex yet.

Commit: `chore: install Kysely dependencies`

## Phase 3 — Create Baseline Migration

Create a single Kysely migration that can create the entire DB schema from scratch — while also being safe to run on existing Knex databases.

1. **Set up a test database.** You need a Postgres instance to run Knex migrations, export the schema, and run codegen against.

   a. **Find DB credentials.** Look for a `docker-compose.yml` (or similar) in the repo that defines a Postgres service. Extract the host, port, user, password, and database name. Also check for `.env.sample`, `knexfile`, or similar config files.

   b. **Propose the DB instance to the user.** Tell them what you found and ask them to confirm you can use it. Wait for confirmation before proceeding.

   c. **Verify connectivity.** Run `psql` (or `pg_isready`) to confirm you can connect to the instance.

   d. **Create a temporary database.** Create a fresh database on the instance for migration work (e.g. `<app>_kysely_setup`):
      ```
      psql -h <host> -U <user> -c "CREATE DATABASE <app>_kysely_setup;"
      ```

   e. **Run Knex migrations.** Run the existing Knex migrations against this fresh database to bring it to the latest schema:
      ```
      DATABASE_URL=postgres://<user>:<pass>@<host>:<port>/<app>_kysely_setup knex migrate:latest
      ```
      Use whatever command the project uses to run migrations (check `package.json` scripts), but point it at the new database.

2. **Export the schema.** Use `pg_dump` to export the schema (no data) from the Knex-migrated database:
   ```
   pg_dump -h <host> -U <user> --schema-only --no-owner --no-privileges <app>_kysely_setup > schema.sql
   ```

3. **Create the migration file.** Create the first Kysely migration (e.g. `migrations/<timestamp>_baseline.ts`). Paste the exported SQL into the `up()` function using `sql.raw(...)`. The SQL can be very large — that's fine.

4. **Add a Knex guard.** The migration must detect whether the database was already set up by Knex (i.e. it's a migration, not a fresh install). If so, the migration should be skipped. Check for the existence of a table that Knex would have created (e.g. the `knex_migrations` table, or a core application table). Example:
   ```typescript
   export async function up(db: Kysely<any>): Promise<void> {
     // If this DB was already set up by Knex, skip the baseline.
     const { rows } = await sql`
       SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'knex_migrations'
       ) AS "exists"
     `.execute(db)
     if (rows[0]?.exists) return

     await sql`<full schema SQL here>`.execute(db)
   }
   ```

5. **Verify the migration works both ways.**

   a. **Test against the Knex DB (should skip).** Run the new Kysely migration against the Knex-migrated database. The guard should detect Knex and skip:
      ```
      DATABASE_URL=postgres://.../<app>_kysely_setup kysely migrate:latest
      ```

   b. **Test against a fresh DB (should apply).** Drop and recreate the database, then run the Kysely migration. It should create the full schema from scratch:
      ```
      psql -h <host> -U <user> -c "DROP DATABASE <app>_kysely_setup;"
      psql -h <host> -U <user> -c "CREATE DATABASE <app>_kysely_setup;"
      DATABASE_URL=postgres://.../<app>_kysely_setup kysely migrate:latest
      ```

   If either step fails, fix the migration and re-test.

Commit: `chore: add Kysely baseline migration`

## Phase 4 — Codegen & Type Fixes

1. **Run codegen.** Run `kysely-codegen` against the freshly migrated database (from Phase 3, step 5b) to generate accurate TypeScript types. Review the output. If the DB uses check constraints instead of native Postgres enums, manually override those column types in the codegen config. Add a `codegen` script to `package.json`.

2. **Replace old entity types.** The codebase likely has hand-written types representing DB entities (e.g. `interface User { ... }`). Replace these with the generated types from codegen — they are always accurate and up-to-date. Search for types that mirror table names and remove or re-export from the codegen file.

3. **Fix remaining type mismatches.** Where generated types conflict with app types (mostly nullability), decide per case whether to update the TS type or add a DB migration. See `references/query-patterns.md` for details.

4. **Clean up.** Drop the temporary database if it's no longer needed (or keep it for development).

Commit: `chore: add Kysely codegen and fix type mismatches`

## Phase 5 — Configure Kysely

1. **Create the new DB module:**
   - Rename the existing `db` module to `db.old` (or similar).
   - Create a new `db` module with the Kysely setup (connection, dialect, types), exporting the Kysely instance as `db`.
   - This way, IDE auto-imports point to the new module, enabling incremental migration.

2. **Create Kysely config.** Add `kysely.config.ts` at the backend root. **Do not duplicate the dialect/connection setup** — import the `db` instance from the DB module and pass it directly:
   ```typescript
   import { defineConfig } from 'kysely-ctl'
   import { db } from './app/db'

   export default defineConfig({ kysely: db })
   ```

3. **Create utility helpers.** Add a `dbFn` object to the DB module or a shared utilities file:
   ```typescript
   import { sql } from 'kysely'

   export const dbFn = {
     now: () => sql<Date>`now()`,
     // count('*') in postgres returns a string. This helper ensures we get a number.
     countAll: () => sql<number>`count('*')::int`,
   }
   ```
   If the app uses nested transactions (or tests wrap each test in a transaction), also add a savepoint utility — see `references/testing-and-tooling.md`.

4. **Run the Kysely migrations** against the development database to validate they work end-to-end in the real setup (not just the temporary database from Phase 3).

Commit: `chore: configure Kysely DB module and helpers`

## Phase 6 — Migrate Queries

Migrate queries file by file. For each file:

1. Replace Knex query builder calls with Kysely equivalents.
2. Add `.execute()` / `.executeTakeFirst()` / `.executeTakeFirstOrThrow()` to terminate queries.
3. Run the file's tests after each file to catch regressions early.

See `references/query-patterns.md` for detailed patterns and examples. After migrating each file, **check for all of these pitfalls:**

- [ ] **Immutable query builders.** Any `if` block that calls a query method (`.where()`, `.orderBy()`, etc.) without reassigning the result back to the query variable is a silent bug. Every conditional modification must use `query = query.method(...)`.
- [ ] **Empty IN lists.** Any `.where('col', 'in', array)` or `.values(array)` will error if the array is empty. Add early returns, or ensure the `kysely-plugin-empty-in-list` plugin is registered.
- [ ] **count() returns a string.** Replace any `count()` / `countAll()` usage with the `dbFn.countAll()` helper, or parse the result with `Number()`.
- [ ] **ON CONFLICT DO UPDATE SET ambiguity.** In upsert queries, plain column names in the `SET` or `WHERE` clause are ambiguous (could be the existing row or the `EXCLUDED` virtual table). Always prefix with the table name.
- [ ] **Nested transactions.** If app code calls `.transaction()` inside another transaction (including inside test transaction wrappers), it will throw. Use the savepoint utility instead.
- [ ] **Operator syntax.** `.where('col', value)` must become `.where('col', '=', value)` — Kysely requires explicit operators.
- [ ] **Query termination.** Every query must end with `.execute()`, `.executeTakeFirst()`, or `.executeTakeFirstOrThrow()`. Knex's thenable behavior does not exist in Kysely.

Commit incrementally — one commit per logical group of files (e.g. by domain/module).

## Phase 7 — Migrate CLI (Seeds, Scripts, CI)

The baseline migration was already created in Phase 3. Now migrate everything else:

1. **Convert seeds** to use Kysely syntax.

2. **Update scripts** in `package.json`:
   - Replace Knex CLI commands (`knex migrate:latest`, `knex seed:run`) with Kysely equivalents.
   - Remove any "rollback" convenience scripts — Kysely only supports rolling back one migration at a time (`migrate:down`), not batch rollback. See `references/testing-and-tooling.md` for details.

3. **Update CI/CD** if it references Knex commands directly.

Commit: `chore: migrate CLI from Knex to Kysely`

## Phase 8 — Cleanup

1. **Remove Knex.** Delete the old `db.old` module, `knexfile.ts`/`knexfile.js`, and any remaining Knex imports.
2. **Uninstall Knex** dependencies: `knex`, `@types/knex` (if present).
3. **Upgrade `pg`** and other DB-related dependencies while at it.
4. **Run all checks** one final time.

Commit: `chore: remove Knex and clean up`

## Ground Rules

- **Never skip tests.** Run the full test suite after each phase and after migrating each file group.
- **Fix type errors as they appear.** Kysely's generated types are the source of truth for what the DB actually looks like. Align app types to match.
- **Watch for silent bugs.** After migrating conditional query building (`if` blocks that modify a query), verify the result is reassigned — Kysely builders are immutable.
- **Preserve behavior.** This is a migration, not a refactor. Do not change query logic, add features, or "improve" code beyond what's needed for the migration.

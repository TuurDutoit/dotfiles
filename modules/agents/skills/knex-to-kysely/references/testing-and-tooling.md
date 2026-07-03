# Testing, Migrations CLI, and Debugging

## Nested Transactions (Savepoints)

Kysely does **not** support calling `.transaction()` inside another transaction:

```typescript
// This will throw in Kysely!
db.transaction().execute(trx => {
  trx.transaction().execute(innerTrx => { ... })
})
```

Knex supported this via savepoints: a nested `transaction()` call would create a savepoint, release it on success, and roll back to it on failure.

### When This Matters

- **App code** that uses nested transactions (e.g. a service calling another service that wraps its work in a transaction).
- **Test setup** that wraps each test in a transaction for automatic cleanup — any app code that calls `.transaction()` inside will hit this limitation.

### Solution

Create a utility that detects whether the current `db` instance is already a transaction and uses savepoints instead. Reference implementation: [mobile-api's `db` module](https://github.com/datacamp-engineering/mobile).

The pattern:
1. Check if the Kysely instance is a `Transaction` (via `isTransaction` or by checking its type).
2. If already in a transaction, use `sql\`SAVEPOINT ...\`` / `sql\`RELEASE SAVEPOINT ...\`` / `sql\`ROLLBACK TO SAVEPOINT ...\`` instead of starting a new transaction.
3. Export a `withTransaction()` helper that handles this transparently.

## now() in Test Transactions

In Postgres, `now()` returns the **transaction start time**, not wall-clock time. This is only a problem when the test setup wraps each test in a global transaction.

**Symptom:** Two rows inserted with a delay between them using `now()` get the exact same timestamp, causing ordering tests to fail.

**Solution:** Create a `mockDbNow()` test utility that lets tests control the timestamp:

```typescript
// In test helpers
let mockNow: Date | null = null

export const setMockDbNow = (date: Date) => { mockNow = date }
export const clearMockDbNow = () => { mockNow = null }

// In the now() helper
export const now = () => mockNow
  ? sql<Date>`${mockNow}::timestamptz`
  : sql<Date>`now()`
```

Only add this if the codebase actually uses transaction-wrapped tests. Check for patterns like `beforeEach(() => db.transaction(...))` or a global test setup that starts a transaction.

## Migration Format

Kysely migrations are TypeScript files with `up()` and `down()` functions:

```typescript
import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('users').execute()
}
```

### No Batch Rollback

Knex's `migrate:rollback` rolls back the last batch. Kysely does not track batches — it only supports:

- `migrate:down` — rolls back one migration at a time.
- `migrate:down --all` — rolls back all migrations (dangerous).

**Action:** Remove any "rollback" convenience scripts from `package.json` to avoid surprises. Document that developers should use `migrate:down` directly or drop and recreate their local DB.

### Consolidating Old Migrations (Baseline Migration)

When migrating, consolidate all existing Knex migrations into a single Kysely baseline migration. This baseline creates the entire schema from scratch.

**How to generate it:**
1. Create a fresh temporary database.
2. Run all existing Knex migrations against it to get the latest schema.
3. Export the schema with `pg_dump --schema-only --no-owner --no-privileges`.
4. Paste the exported SQL into the Kysely migration's `up()` function using `sql.raw(...)`.

**The migration must handle two scenarios:**
- **Fresh database:** Apply the full schema (new installations).
- **Existing Knex database:** Skip the migration (the schema already exists from Knex).

Detect this by checking for a Knex-specific table (e.g. `knex_migrations`) or a core application table:

```typescript
import { type Kysely, sql } from 'kysely'

/**
 * Baseline migration — consolidates all Knex migrations up to commit <sha>.
 * See git history for the original migration files.
 */
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

**Verify both paths:**
1. Run against the Knex-migrated DB → should skip.
2. Drop DB, recreate, run again → should apply the full schema.

Run codegen against the freshly migrated database from step 2 to generate accurate types.

## Debugging: Stack Traces

Kysely uses async code extensively. If stack traces stop at Kysely internals without showing app code, check the compilation target.

**Babel:** Make sure the target matches the runtime (e.g. set the target to Node 20 instead of Babel's default). This dramatically improves stack trace quality.

**tsconfig.json:** Ensure `target` is set to a modern ES version (e.g. `ES2022` or later).

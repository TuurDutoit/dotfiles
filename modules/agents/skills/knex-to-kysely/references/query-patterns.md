# Query Migration Patterns

Detailed patterns and pitfalls when migrating queries from Knex to Kysely.

## Immutable Query Builders

**This is the #1 source of subtle bugs.**

In Knex, query builders are mutable:

```typescript
const query = db('table').where(...)
if (shouldOrder) {
  query.orderBy('column') // mutates `query`
}
const results = await query
```

In Kysely, query builders are **immutable** — every method returns a new builder. If the result is not reassigned, the modification is silently lost:

```typescript
let query = db.selectFrom('table').where(...)
if (shouldOrder) {
  query = query.orderBy('column') // must reassign!
}
const results = await query.execute()
```

**After migrating, audit all conditional query building** — any `if` block that calls a query method without reassigning is a bug.

## IN Operator with Empty Lists

Kysely (and Postgres) errors when an empty array is passed to an `IN` clause. The same applies to `.values()` on insert statements with an empty array.

**Solutions (pick one):**

1. Add early returns for queries that receive empty arrays:
   ```typescript
   if (ids.length === 0) return []
   ```

2. Install and register the `kysely-plugin-empty-in-list` plugin, which replaces empty `IN` lists with `1 = 0`.

## count() Returns a String

`count()` and `countAll()` return `string | number | bigint`. With Postgres, this is typically a `string`.

**Recommended: cast to integer in the query** using the `dbFn.countAll()` helper (see below).

Alternative: parse the output with `Number()`, but the SQL cast is cleaner.

## DB Function Helpers (dbFn)

Kysely has no built-in helpers for common Postgres functions like `now()` or a count that returns a number. Create a `dbFn` object:

```typescript
import { sql } from 'kysely'

export const dbFn = {
  now: () => sql<Date>`now()`,
  // count('*') in postgres returns a string. This helper ensures we get a number.
  countAll: () => sql<number>`count('*')::int`,
}
```

Usage:

```typescript
// count
const { count } = await db
  .selectFrom('users')
  .select(dbFn.countAll().as('count'))
  .executeTakeFirstOrThrow()
// count is a number, not a string

// now
await db.updateTable('users')
  .set({ updated_at: dbFn.now() })
  .where('id', '=', id)
  .execute()
```

**Caveat with now() in tests:** In Postgres, `now()` returns the **transaction start time**, not wall-clock time. If the test setup wraps each test in a transaction, two rows inserted with a delay between them get the same timestamp. See `testing-and-tooling.md` for a workaround.

## ON CONFLICT DO UPDATE SET

Two things to watch for in upsert queries:

### 1. Column References Are Ambiguous

In `ON CONFLICT DO UPDATE SET`, Postgres provides a virtual `EXCLUDED` table containing the values that were attempted to insert. Plain column names are ambiguous — always prefix with the table name when referencing the existing row's values:

```typescript
// Knex (works because Knex resolves ambiguity)
.onConflict('id')
.merge({ updated_at: knex.fn.now() })

// Kysely — be explicit
.onConflict((oc) => oc.column('id').doUpdateSet({
  updated_at: now(),
  // Reference existing row: eb.ref('my_table.some_column')
  // Reference excluded (new) value: eb.ref('excluded.some_column')
}))
```

### 2. Unnecessary WHERE Clauses

If Knex upserts had a `WHERE` on the `ON CONFLICT DO UPDATE SET`, double-check whether it's actually needed. The conflict target already determines which row is updated. These `WHERE` clauses were often left over from when queries were separate INSERT and UPDATE statements. They can cause issues in Kysely because of the column ambiguity problem above.

## Type Safety Improvements

Kysely's generated types are the source of truth for the DB schema. Expect to uncover mismatches that Knex silently ignored:

- **Nullability mismatches:** App types may declare fields as non-null while the DB column is nullable (or vice versa). Decide per case whether to update the TypeScript type or add a DB migration to add/remove the `NOT NULL` constraint.
- **Other type discrepancies:** Use this opportunity to align app types with reality.

Fix these as early as possible — either right after generating types, or as encountered while migrating queries.

## Query Termination

Every Kysely query must be explicitly executed. There is no implicit execution like Knex's thenable behavior:

```typescript
// Knex — thenable, resolves when awaited
const rows = await db('users').where('active', true)

// Kysely — must call .execute() or variant
const rows = await db.selectFrom('users').where('active', '=', true).execute()

// For single row:
const row = await db.selectFrom('users').where('id', '=', id).executeTakeFirst()

// For single row that must exist:
const row = await db.selectFrom('users').where('id', '=', id).executeTakeFirstOrThrow()
```

## Operator Syntax

Kysely requires explicit operators in `.where()`:

```typescript
// Knex
.where('column', value)        // implicit =
.where('column', '>', value)

// Kysely
.where('column', '=', value)   // explicit =
.where('column', '>', value)
```

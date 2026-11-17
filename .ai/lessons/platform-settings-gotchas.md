# Platform settings (#50) gotchas — 2026-11-10

## MikroORM column names for camelCase properties with digits

MikroORM's default naming strategy turns `price25MinCents` into `price25min_cents`: the digit swallows the
underscore. A check constraint written as `price25_min_cents` then fails when the migration runs.

- **Cause:** the underscore-naming strategy does not split at a digit-to-letter boundary.
- **Fix:** pin `.fieldName('price25_min_cents')` on such properties.
- **Prevention:** read the generated `create table` before you write checks against it.

## Zod 4 refinements run after a field already failed

An object's `superRefine` and `transform` still run when a field failed its own `regex`.

- **Cause:** code that parses the field inside the refinement (`BigInt('1e3')`) throws a `SyntaxError` instead
  of returning a 422.
- **Fix:** re-check `fieldSchema.safeParse(value).success` before converting, and return early otherwise.
- **Prevention:** a malformed-input row in the schema test (`'1e3'`, `' 80'`, `''`).

## DB-backed policy reads and locking transactions

When a policy read moved from env to the database, every caller that read it inside a
`fork().transactional(...)` would wait for a second pooled connection while holding the first.

- **Fix:** read the settings once before opening the transaction and pass them in. The booking test pins this
  order.
- **Prevention:** see the 2026-11-08 pool lesson.

## The integration run rewrites the migration snapshot

Running the integration suite (or `db:migrate`) rewrote `.snapshot-devmentor.json` again. Restore it with
`git checkout` before committing.

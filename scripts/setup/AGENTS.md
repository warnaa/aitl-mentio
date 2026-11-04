# Setup installer

- `npm run setup` installs dependencies, creates `.env` from `.env.example`,
  ensures PostgreSQL, migrates and seeds. Report `ran`/`skipped` per step.
  Never overwrite `.env` or start the nonterminating dev server.
- TCP-probe `DATABASE_URL`, else `DB_HOST`/`DB_PORT`, with the real environment
  before `.env`. Reuse a listening PostgreSQL; use Compose only if nothing answers.
- This installer runs before dependency installation: use plain Node ESM and
  `node:*` built-ins, with pure decisions in `steps.mjs`, injectable I/O in
  `effects.mjs` and ordering in `run.mjs`.
- `effects.mjs` may read `process.env`, `process.version` and `process.platform`
  behind injectable `SetupEffects`; it cannot import zod before install.
- Keep `steps.mjs` `resolveDatabaseTarget` (`DATABASE_URL` over `DB_*`) in sync
  with the core and db zod schemas.

# Database

`@devmentor/db` owns PostgreSQL access through MikroORM v7, its configuration,
entities, migrations, pool and seeders.
It imports no other workspace package.

- MikroORM v7 has no decorators in `@mikro-orm/core`. Define entities with
  `defineEntity` and the `p` (`defineEntity.properties`) builders.
- Cross-entity relations need a per-property thunk, such as
  `user: () => p.oneToOne(User)...`, so discovery resolves references lazily
  without circular-import or wrapping bugs.
- Register entities as `globalThis` singletons through `src/entities/define.ts`.
  Next's RSC/SSR/route graphs must share the discovered schema instance or
  `populate` breaks.
- `MikroORM.init()` does not connect in v7. `getOrm()` must call `orm.connect()`
  explicitly and must not cache a failed connection; recovery must work when the
  database returns. Cache the ORM on `globalThis` for HMR.
- `em.persistAndFlush()` was removed. Use `em.persist(e); await em.flush()`.
- CLI environment values go through the zod schema in `src/env.ts`.
  `mikro-orm.config.ts` loads the root `.env`, preserving real environment values
  and ignoring a missing file.

Run commands from the repository root:

- `npm run db:up` / `npm run db:down`: local PostgreSQL via `docker-compose.yml`.
- `npm run db:migration:create -- --name <x>`: generate from the entity diff.
- `npm run db:migrate` / `npm run db:migrate:down`: apply / revert migrations.
- `npm run db:seed`: run the default seeder.

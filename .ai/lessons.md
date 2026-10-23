# Lessons Learned

A running log of findings, gotchas, and improvements discovered while working on this
project. Append newest entries at the top. Keep entries short — a few sentences each.
If a lesson needs more than a short entry (e.g. a detailed root-cause writeup), put the
full writeup in `.ai/lessons/YYYY-MM-DD-slug.md` and link it from the entry here.

When to add an entry:
- After fixing a non-obvious bug (what broke, why, how it was found).
- After discovering a constraint, gotcha, or footgun in this codebase or its dependencies.
- After a decision that future work should respect but that isn't obvious from the code.

Entry format:

```
## YYYY-MM-DD - Short title

What happened / what was learned. Why it matters. Link to `.ai/lessons/...md` for
details if applicable, and to the relevant spec in `.ai/specs/` if one exists.
```

---

## 2026-10-23 - Sandbox exports NODE_ENV=development; `next build` breaks under it

The sandbox shell sets `NODE_ENV=development` globally. `next build` then renders with
React's dev build and fails prerendering `/_global-error` with
`Cannot read properties of null (reading 'useContext')` (looks like duplicate React, but
isn't). Fix: `@mentio/app`'s `build`/`start` scripts pin `NODE_ENV=production`. Keep it.
Spec: `.ai/specs/implemented/2026-10-23-monorepo-foundation.md`.

## 2026-10-23 - Sandbox also exports DATABASE_URL (another project's DB)

The shell has `DATABASE_URL=postgres://...:5432/open-mercato`. Real env vars override
`.env`, so the app and the MikroORM CLI silently target that database. Always pass an
explicit `DATABASE_URL=...` when running migrations or DB checks here; never migrate
against `open-mercato`.

## 2026-10-23 - shadcn CLI rewrote `cn` import to a bogus npm package

Running `shadcn add` in `packages/ui` rewrote `import { cn } from "@mentio/ui/lib/utils"`
to `from "cn"` and added the unrelated `cn` npm package as a dependency. After every
`shadcn add`, check imports and `packages/ui/package.json`. (`cn` also appears in the
lockfile as a legit dev dependency of the shadcn CLI itself — that one is fine.)

## 2026-10-23 - Awilix strict mode does not stop resolving scoped services from root

`strict: true` rejects singleton→scoped dependencies, but `container.resolve()` of a
`.scoped()` registration on the root container is allowed and caches it process-wide.
That would share one EntityManager across requests. Hence `em` is registered only on
request scopes in `createRequestScope()` (`packages/app/src/server/container.ts`).

## 2026-10-23 - MikroORM 7: initial migration has no down(); CLI needs a TS loader

`migration:create --initial` generates only `up()`; add `down()` by hand. The CLI loads
`src/mikro-orm.config.ts` through `tsx` (devDependency of `@mentio/db`) and does not
read `.env` itself — the config calls `process.loadEnvFile()` for the root `.env`.

## 2026-10-23 - Only one `next dev` per project directory

Next 16 refuses a second `next dev` in `packages/app` while the preview server
(port 3000, from `openmercato.toml`) runs. For DB-backed checks use
`npm run build && npm run start -- --port 3100` instead.

## 2026-10-23 - MikroORM snapshot file is named after the database by default

Running migrations against `open-mercato` wrote `.snapshot-open-mercato.json` next to
`.snapshot-mentio.json` (default name is `.snapshot-<dbName>`). `snapshotName` is now
pinned to `.snapshot-mentio` in `packages/db/src/mikro-orm.config.ts`, so every
environment shares the one committed snapshot.

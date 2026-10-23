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

## 2026-10-23 - CI: don't run `agent-browser install --with-deps` on GitHub runners

On `ubuntu-latest` it apt-installs extra fonts (`fonts-noto-cjk`, 61 MB); the download
from the Azure mirror stalled and the integration job hung for 10+ minutes until
cancelled. The runner image already has Google Chrome and its libraries, so CI sets
`AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/google-chrome` and skips the install. Steps that
touch the network get `timeout-minutes`.

## 2026-10-23 - Integration tests here: no Docker, so use TEST_DATABASE_URL

The sandbox has no Docker, so testcontainers can't start Postgres locally; CI
(`ubuntu-latest`) can. Locally run the suite against a throwaway cluster:
`/usr/lib/postgresql/17/bin/initdb -D /tmp/it-pg -U postgres --auth=trust`, start it on
:5433, create an empty `mentio_it`, then
`TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5433/mentio_it npm run test:integration`
(after `npm run build`). Chrome for agent-browser also needs system libraries here:
`npx agent-browser install --with-deps` (sudo apt works). Spec:
`.ai/specs/implemented/2026-10-23-ci-and-test-coverage.md`.

## 2026-10-23 - Coverage gate: list sources in `coverage.include`, exclude barrels by name

Without `coverage.include`, V8 coverage only reports files some test imported, so an
untested file is invisible instead of 0%. Barrels are excluded one by one, not via
`**/index.ts`: `db/src/entities/index.ts` holds the runtime `entities` array and a glob
would hide it. A file that becomes a pure re-export (e.g. `ui/src/lib/utils.ts`) shows
0/0 — add it to the commented exclusion list.

## 2026-10-23 - Decided: adopt shadcn's `cn`; audit gate is high + allowlist

Supersedes the open decision in the `cn` entry above: `@mentio/ui` depends on `cn`, and
`lib/utils` re-exports it, so leave `from "cn"` in `shadcn add` output. The audit gate
(`scripts/audit.mjs`) blocks high/critical advisories; exceptions go in
`scripts/audit-allowlist.json` with a reason, never by lowering the level. The `braces`
exception is only valid while ESLint bans awilix `loadModules`.

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

## 2026-10-23 - shadcn CLI rewrites `cn` imports to its own `cn` package (corrected)

`shadcn add` (v4.22) rewrites `import { cn } from "@mentio/ui/lib/utils"` to
`from "cn"` and adds `cn` to `packages/ui/package.json`. Earlier entry called `cn` a
"bogus" package — wrong: it is shadcn's own drop-in replacement for clsx +
tailwind-merge (`github.com/shadcn-ui/cn`); the CLI migrates to it deliberately and has
no opt-out flag. Project convention is still `@mentio/ui/lib/utils`, so after every
`shadcn add`: `sed -i 's#from "cn"#from "@mentio/ui/lib/utils"#'` on the new files and
`npm uninstall cn -w @mentio/ui`. Adopting the `cn` package instead is an open decision.

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

## 2026-10-23 - Don't subclass `defineEntity` classes: minified names break MikroORM in prod

`class User extends UserSchema.class {}` + `setClass` worked in dev but the production
build failed with `Metadata for entity h not found`. Next bundles pages and route
handlers separately, each with its own copy of the entity module; minification renames
the subclass differently per bundle, and the process-wide ORM (cached on `globalThis`)
only knows the name from whichever bundle initialized it first. The class generated by
`defineEntity` is named from its `name` option and survives minification, so export
`XSchema.class` directly. Only reproducible with `npm run build && npm run start`, and
only when a page and a route handler both hit the DB — always test both orders.
Spec: `.ai/specs/implemented/2026-10-23-engineering-standards.md`.

## 2026-10-23 - MikroORM 7 connects lazily; `checkConnection()` lies before the first query

Right after `MikroORM.init()`, `orm.checkConnection()` returns
`{ ok: false, reason: "Connection not established" }` even when the DB is up.
`checkDatabase()` in `packages/db/src/health.ts` runs `select 1` instead.

## 2026-10-23 - `KEY=` in an env file must mean "unset"

`.env.example` ships `JWT_SECRET=`; copied to `.env`, that is an empty string, which
failed the length check. Because the logger read the full app env, one bad unrelated
setting also broke error logging. Env schemas now map `""` to `undefined`
(`unsetIfEmpty`), and the logger parses only `LOG_LEVEL` (`getLogLevel()`).

## 2026-10-23 - Stopping test servers here: never `pgrep -f next-server` / kill by name

`kill $(pgrep -f "next-server")` matched the agent's own shell (its command line
contains the pattern) and also hit the platform preview server on :3000. `setsid cmd &`
then `$!` is not the process group either (setsid forks). Start test servers with
`setsid sh -c 'echo $$ > /tmp/srv.pgid; exec npm run start -- --port 3100'` and stop
with `kill -- -$(cat /tmp/srv.pgid)`.

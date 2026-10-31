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

## 2026-10-30 - Logout scope and invitations must reflect the final answer

In the accounts interview, the user explicitly withdrew all-device logout: ordinary
logout must revoke only the current session, including token copies. Password reset
and actual role removal invalidate all sessions. The approved design therefore adds
individual PostgreSQL sessions plus an account version, fresh protected-auth checks,
and locked rechecks so login/enrollment cannot rescue invalidated access. This is a
future contract, not implemented behavior. The user also rejected an invitation gate:
invitation-led recruitment does not mean restricted registration/API access. Recovery
requires a private contact channel established beforehand; email knowledge is not proof.
See `.ai/runs/2026-10-30-accounts-and-sign-in-grilling.md` and D22/D23.

## 2026-10-30 - Accepted accounts corrections: atomic admission and role writes

The accepted accounts spec counts every admitted login attempt synchronously before
asynchronous lookup/hashing, with no success reset or live-key eviction. A single
service class does not serialize JSON role updates: operator and enrollment paths
must lock the same user row and use committed roles for replacement tokens. Core
accounts now ship backend and UI in one PR; self-service enrollment remains a separate
gated phase. These are approved design contracts, not implemented behavior. See
`.ai/runs/2026-10-30-accounts-and-sign-in-spec-corrections.md`.

## 2026-10-30 - Token replacement and normalization need explicit boundaries

The accounts design review found that an idempotent role-enrollment endpoint that
re-signs a token can silently become an unlimited refresh endpoint when the signer
always starts a new 24-hour TTL. Preserve the original authentication deadline when
changing claims, and source roles from committed state. Normalizing only future
email writes also does not protect mixed-case legacy identities: migration and
collision handling must establish the invariant before registration opens. These
are design findings, not implemented fixes; see
`.ai/runs/2026-10-30-accounts-and-sign-in-design-review.md`.

## 2026-10-29 - Decided: Polish strings in code, no i18n library (first build)

next-intl was chosen at the primitives spec's gate, then reversed the same day. For one fixed
language (R15) it needed a plugin, provider, catalog, a copy provider in `ui` and a separate
`core` dictionary. Polish literals in code plus `z.config(z.locales.pl())` (via
`core/src/validators/z.ts`) cover R15. Don't reintroduce an i18n library until a second
language is actually scheduled (D10's English beachhead). Spec:
`.ai/specs/2026-10-29-platform-primitives.md` (F1).

## 2026-10-29 - Spec review gotchas: Awilix cycles, aborted transactions, D-row conflicts

From the review of the E01 and primitives specs:
- Two services that take each other from the cradle (PROXY mode, constructor destructuring)
  make Awilix throw "Cyclic dependencies detected" on every resolve. Keep dependencies
  between concept services one-way.
- After a unique violation, Postgres aborts the transaction. Map the violation to a
  `ConflictError` outside `em.transactional(...)`, never inside it. MikroORM 7 already has
  `findOneOrFail(..., { failHandler })` and `em.upsert(..., { onConflictFields })`; use them
  instead of writing wrappers.
- A gate answer that contradicts an active brief decision (open publishing vs D14's
  "invited mentors") is still a review blocker under `SDLC.md`. It needs a superseding row
  from the owner, not just the spec's say-so.
- Next 16: `forbidden()`/`unauthorized()` are experimental (`authInterrupts`), and layouts
  don't re-run auth on client navigation. Guard in each page's loader.

## 2026-10-29 - `use-intl/core` is not react-free

`use-intl@4.14.9`'s `./core` entry looks framework-agnostic, but its `initializeConfig` chunk
imports `react`, so `createTranslator` would pull React into `@mentio/core` (which must stay
react-free). That, plus the copy provider `ui` would need, is part of why the first build
dropped next-intl for Polish strings written in the code and Zod's built-in `pl` locale
(`.ai/specs/2026-10-29-platform-primitives.md`, F1, gate Q6 = c). If a second language
arrives, re-check `use-intl`'s import graph before letting `core` use its translator.

## 2026-10-27 - The two user roles are "mentor" and "mentee", never "developer"

Mentors are developers too, so "developer" doesn't say which side of a session someone is
on. In product docs (`.ai/specs/product-brief.md`, `research/decisions/`), specs, tickets and
UI copy, call the person who pays for help the **mentee** and the senior engineer who
answers the **mentor** (defined in the brief's Domain glossary). Quotes from research keep
their original wording.

## 2026-10-25 - `migration:pending` is no connectivity check; exported env beats `.env`

`mikro-orm migration:pending` against an unreachable host exits 0 and lists every
migration as pending, so a connection failure only surfaces from `migration:up`. Don't use
it as a probe. Separately, `process.loadEnvFile` (used by `mikro-orm.config.ts`) never
overrides a variable that is already defined, even an empty one, so an exported
`DATABASE_URL` from another project silently retargets `db:migrate`. Tools that write to the
database must print the effective target (`host:port/db`, never credentials) and say where
it came from. See `scripts/setup.mjs` and `.ai/runs/2026-10-25-setup-installer.md`.

## 2026-10-23 - CI runner and actions are pinned; bump them deliberately

`runs-on` is `ubuntu-26.04`, not `ubuntu-latest` (which migrated 24.04 → 26.04 from
2026-10-19, bringing Docker 28 → 29). Actions are on v7 (`checkout`, `setup-node`,
`upload-artifact`), all `node24`; `upload-artifact@v4` still ran on deprecated Node 20.
When bumping either, check that the integration job still finds
`/usr/bin/google-chrome` and that testcontainers works with the image's Docker.

## 2026-10-23 - CI docs-only skip: job-level `if:`, never workflow `paths-ignore`

With required status checks, a workflow skipped by `paths-ignore` never reports, so
docs-only PRs wait forever on "Expected" checks and can't merge. Instead a `changes` job
diffs the whole PR (merge base → head) and the other jobs run only if non-docs files
changed; a job skipped via `if:` counts as success for required checks. Also: this repo
is private on a free personal account, so GitHub does not enforce branch protection or
rulesets here (API: 403 "Upgrade to GitHub Pro") even though the UI lets you save them.
Decided 2026-10-23: accept no enforcement for now — CI is advisory, so check that PR
checks are green before merging. If the plan changes, require the six CI jobs.

## 2026-10-23 - CI: don't run `agent-browser install --with-deps` on GitHub runners

On the GitHub Ubuntu runner it apt-installs extra fonts (`fonts-noto-cjk`, 61 MB); the download
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

## 2026-10-29 - Shared form schemas must preserve the HTTP wire shape

`CrudForm` passes Zod's parsed output to `onSubmit`, and `apiCall` JSON-serializes it.
A shared schema that transforms a wall-time string into `Date` therefore sends an ISO
UTC string, which the same wall-time schema on the API rejects. Keep shared transport
schemas JSON-compatible and perform domain conversion after server validation, or define
separate wire and server schemas explicitly. Verify the full form → JSON → route-schema
path when adding transformed fields. Found during the design review in
`.ai/runs/2026-10-29-platform-mentor-design-review.md`; the slot feature is not implemented.

## 2026-10-29 - Separate pending payment creation from execution and retries

The accepted primitives-spec correction makes only the winning booking transition
create durable pending payment intent. Executing/retrying that intent must also work
when no new transition occurs, including after a crash before the provider call or
after provider success but before local confirmation. Keep an immutable payload and
idempotency key; trigger next-visit settlement through a CSRF-protected POST, because
page/metadata rendering and prefetch are reads rather than proof of an actual visit.
See B8–B10 in `.ai/specs/2026-10-29-platform-primitives.md`. This is an accepted design
contract for the future booking specs, not a claim of an implemented payment fix.

## 2026-10-29 - Keep safety invariants shared and concrete future designs with consumers

The accepted platform grilling refinements keep auth/CSRF, read-only rendering,
atomic durable payment intent, idempotency and crash recovery in B8–B11. The future
booking/payment specs own exact endpoints, states, storage, port signatures and UI;
the earlier lesson's settlement POST is an example of a protected mutation, rather
than a fixed endpoint or mounted-client design. These are future design decisions,
not implemented behavior. See `.ai/runs/2026-10-29-platform-primitives-grilling.md`.

The same accepted round makes query identity include every effective non-pagination
parameter, with previous data retained only for retries/shared offset-limit changes;
busy mutation calls return null so duplicate callers cannot replay callbacks. Money
uses nonnegative safe integers and integer-only `fromWholePln`; timezone inversion
uses a maintained dependency with invalid-calendar/gap rejection and earliest overlap
selection. Valid content saves use last-write-wins while publication locks and dirty
input preservation remain. URL errors name one-based rows before blank-row filtering,
and pages handle malformed input explicitly rather than hiding service validation bugs
behind 404s.

## 2026-10-29 - Slot-first locking needs a rule for multi-slot cleanup

The book-and-pay design review identified that creating on one slot while expiring a
mentee's former hold on another introduces more than one slot into the operation.
"Slot before booking" alone does not order those slot locks: two mentees swapping
expired holds can acquire opposite first locks. Keep cleanup in a separate transaction
or define deterministic ordering for all involved rows. This is a design finding,
not a reproduced implementation bug; see
`.ai/runs/2026-10-29-book-and-pay-design-review.md`.

## 2026-10-30 - Ending a reservation must not wait for payment confirmation

The approved book-and-pay spec corrections separate resource deadlines from durable
money recovery. Reconcile the deadline under locks before applying a charge result,
and do it before external calls as well as after them. Release an unconfirmed reservation
at its start even if the gateway remains unavailable; later success creates a full
refund without restoring the booking. GET projections and the actual-visit trigger
must cover this ended state with pending money. This is a corrected design contract,
not implemented behavior; see R22 and
`.ai/runs/2026-10-29-book-and-pay-spec-corrections.md`.

## 2026-10-30 - Booking edits have different pricing rules by changed field

During the book-and-pay interview, the user rejected preserving the old rate when
changing an unpaid booking's duration: use the current mentor rate and explicitly
show that it changed. Question-only edits keep the saved price. Both retain the
original slot and hold deadline. Do not apply a blanket "all edits preserve price"
or "all edits reprice" rule. Pending-payment cancellation was also approved, with
immediate release and refund recovery that never revives the booking. These are
draft design decisions, not implemented behavior; see
`.ai/runs/2026-10-30-book-and-pay-grilling.md`.

## 2026-10-31 - Storybook 10 / Vite 8 needs eager schema prebundling

Adding the real apiCall client to browser stories introduced its Zod dependency after
Vite had already started the test page. Automatic dependency optimization reloaded
the page, invalidated module URLs and failed all stories. Include `zod` explicitly
in Storybook's optimizeDeps to make a cold test run stable. Also keep MDX JSX tables
as complete blocks: a table opened on the same line as tbody followed by multiline
rows was rejected by the MDX parser. Foundations use JSX tables and are verified
in the built browser, rather than relying on TypeScript checks of MDX files. See
`.ai/runs/2026-10-31-mentio-storybook-foundations.md`.

## 2026-10-31 - Standalone MDX needs document-level theme synchronization

The themes decorator updates html only when a story renders. Unattached MDX pages
that render documentation samples directly never run that decorator, so toolbar dark
mode can leave their root light. Sync SET_GLOBALS/GLOBALS_UPDATED at preview level
and initialize direct iframe globals, while retaining the decorator for executable
stories. Verify both direct docs URLs and manager toolbar changes, including portals.

## 2026-10-31 - Compare frozen states with real browser pointer states

Testing Library userEvent.hover dispatches DOM events but does not move Chromium's
pointer and cannot establish the native CSS :hover pseudo-class. Use Playwright
hover for equality checks against data-preview-state samples; browser story tests
still cover frozen tokens, native keyboard focus, dimensions and behavior. Also
theme Canvas source-action chrome separately from Unstyled specimens: its default
light-theme Show code controls otherwise failed dark-mode contrast. See
`.ai/runs/2026-10-31-mentio-primitives-batch-1.md`.

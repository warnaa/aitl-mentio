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

## 2026-10-31 - Cloud preview needs a proxy-reachable Storybook listener

A server bound only to 127.0.0.1 returned local HTTP 200 but refused the user's
cloud preview connection. When the user requests access through the platform's
preview URL, start Storybook with --host 0.0.0.0 and permit the exact preview host
through __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS; do not disable all host checks.
Verify the bound interface and requests carrying that Host header. An unauthenticated
external 401 is the platform login boundary, not proof of a rendered Storybook page.

## 2026-10-31 - Radix Select closes on resize; Narrow stories resize the test iframe

A Select keyboard story failed in roughly a quarter of full Storybook runs: the list
opened, then closed. Instrumentation showed a late `resize` event between the two —
the preceding Narrow story's viewport global is restored asynchronously, and Radix
Select deliberately closes on window resize (and blur). Disabling file parallelism
made it worse. Wait until the viewport has been stable (no resize for 250 ms) before
opening an overlay in a play function. Also: Radix RadioGroup only checks on arrow
focus while the key is held (`{ArrowDown>}`), because focus moves in a timeout.
See `.ai/runs/2026-10-31-mentio-primitives-batch-2.md`.

## 2026-10-31 - FormField cannot wrap a Radix Select root; container queries cannot style the container

FormField clones its child to add id/aria-describedby, but `<Select>` renders no
element, so the label would point at nothing. Wrap `SelectTrigger` inside the Select.
CardHeader's `container: card-header` cannot be restyled by its own container query;
change its children (span both columns) instead. Built-page console checks caught
`p > div` nesting from Separator stories that story tests did not report.

## 2026-10-31 - Tailwind's default sans stack renders digits with Noto Color Emoji

On a Linux host with Noto Color Emoji but without "Noto Sans", Chromium resolves the
`'Noto Sans'` entry of Tailwind 4's default `--font-sans` to the emoji font for digits
(CDP `CSS.getPlatformFontsForNode` shows NotoColorEmoji for "128"); letters fall back
to DejaVu. Digits look grey and offset. The stack is an approved decision; a change is
pending the user's decision (POSTEP.md).

## 2026-10-31 - Never embed nested story frames in Storybook docs for overlays

`parameters.docs.story.inline: false` renders a story in a nested preview iframe. That
preview receives no globals and broadcasts its own (light) SET_GLOBALS through the
channel, which the docs page's theme sync applied — the whole docs page switched to
light. Mirroring the parent theme in the child does not help. Show modal overlays in
docs as closed trigger stories (they open in the docs document, in its theme) and keep
open states as standalone stories with `docs.disable`. Also do not embed stories whose
play functions open overlays: docs run play functions. Open modal stories pass axe
without exceptions when no trigger sits behind the modal (nothing focusable is
aria-hidden). See `.ai/runs/2026-10-31-mentio-primitives-batch-3.md`.

## 2026-10-31 - Radix overlay gotchas found by browser checks

Radix PopoverContent has role="dialog" but the shadcn PopoverTitle is not linked to
it: pass `aria-labelledby`/`aria-label` or axe fails `aria-dialog-name`. Dropdown and
popover panels need `max-inline-size` from `--radix-*-content-available-width`, or
long items leave a 320px viewport. Radix Tooltip closes on any ancestor scroll,
including the scroll caused by keyboard focus on an off-screen trigger (a WCAG 1.4.13
persistence gap; decision pending). Programmatic focus in scripts must scroll the
trigger into view first, or the check measures that closing instead of the theme.

## 2026-10-31 - Correction: emoji-digit fallback is not caused by "Noto Sans"

The earlier lesson attributed digits rendered with Noto Color Emoji to the `'Noto Sans'`
entry. Measured with CDP `CSS.getPlatformFontsForNode`: removing it changes nothing;
any stack whose named families are all missing, followed by `sans-serif` and then the
emoji fonts, renders ASCII digits with Noto Color Emoji on this host. Putting
`system-ui` before `sans-serif` fixes digits but makes user emoji monochrome
(DejaVu has its own glyphs). A local `@font-face` alias for the emoji fonts with a
`unicode-range` limited to emoji blocks, placed before `sans-serif`, fixes digits and
keeps colour emoji. Verify font diagnoses by measurement before writing them down.

## 2026-10-31 - Currency is PLN, displayed as "zł" even in English UI

The user approved English UI copy but wants amounts shown as "240 zł" (whole amount,
symbol after the number), not "240 PLN". Keep "PLN" only where the currency itself is
named (D10, data contracts such as `currency: "PLN"`). Story labels double as test
selectors, so a copy change must update play-function and unit-test names together.

## 2026-10-31 - Background servers in verification: never detach with setsid

Starting `npm run start` under `setsid … &` made `$!`/`ss -p` useless: the server
survived in its own session, and a second "no database" server failed to bind the same
port, so its checks silently hit the first server. Start `next start` directly from
`packages/app` in the background, keep `$!`, kill that PID, and assert the port is
closed before the next variant. Identify leftovers by their environment
(`/proc/<pid>/environ` DATABASE_URL) and never pattern-kill: the user's `next dev`
runs alongside. Also scope Playwright selectors to `#storybook-root` — Storybook
renders hidden internal tables that match `tbody tr` first. `var(--animate-spin)` in
CSS is enough for Tailwind 4 to emit `@keyframes spin` (verified in the browser).

## 2026-10-31 - Zod reports a missing value with its own technical text

`CrudForm` turns empty inputs into `undefined` so `.optional()` works; a required
`z.string().min(10, { message })` then fails on type, not length, and shows
"Invalid input: expected string, received undefined". Every required field's schema
needs a missing-value message (`z.string({ error: "Enter your name" })`, `z.email({ error })`).
Found by a story asserting the visible error after submitting an empty form.

## 2026-10-31 - Radix dialogs opened without their Trigger do not return focus

A dialog controlled by state (no `AlertDialogTrigger`) returns focus to nothing on
close; Radix only refocuses its own trigger ref. Components that open a dialog from
their own button (ActionButton) must use `onCloseAutoFocus` → `preventDefault()` +
focus the button. Also: React 19's react-hooks lint rejects setState inside effects —
adopt changed props by adjusting state during render, keep imperative targets in refs.
Activating a `#hash` link inside a Vitest browser story navigates the test frame and
closes the runner connection; assert the link target instead.

## 2026-10-31 - Check API paths in stories against the spec contract

Story fixtures and code samples teach the contract to the next developer or agent. A 3a
story used `DELETE /api/availability/slots/:id`, while the E01 spec defines
`DELETE /api/availability/slots?id=<uuid>`; it passed every test because MSW mocked the
invented path. Before writing an MSW handler, copy the method, path, status and error
code from the spec's API table. Also: look at screenshots of screen stories — metrics
missed a compact-nav current marker that read as a bracket in a horizontal row.

## 2026-10-31 - Stories files export only stories; placeholders never equal error text

Storybook indexes every named export of a `*.stories.tsx` file as a story, so exporting
shared constants (`facts`, `question`) from one broke both files ("Cannot create property
'parameters' on string"). Shared data goes in `storybook/fixtures/`. Separately, a select
placeholder identical to its validation message ("Choose 25 or 50 minutes") makes the
error repeat what is already on screen and makes `getByText` ambiguous — write the
placeholder as an instruction ("Select a length") and the error as the fix.


## 2026-11-01 - Empty certificate overrides break Git HTTPS in the managed workspace

The workspace launch environment exports `GIT_SSL_CAINFO=""` (and empty CA
variables for other clients). Git treats the empty value as an explicit invalid
CA file and fails with “Problem with the SSL CA cert” despite a valid system
bundle. Unset empty overrides, preserving nonempty custom CA paths; disabling
verification is unnecessary. Startup cleanup fixes new shells, but agent commands
can reinject the original environment after startup, so `/usr/local/bin/git` now
clears only empty overrides and delegates to `/usr/bin/git`. Both repository
lookups and a real skills clone passed. This is a workspace workaround; the
upstream launcher must omit empty CA variables for a fix across container rebuilds.
See `.ai/runs/2026-11-01-git-ca-repair.md` for changes, scope, verification and undo.

## 2026-11-01 - Accessible names from adjacent inline spans run together

An `article` labelled by one `<p>` holding `<span>Alex</span><span>Mentor</span><time>18:04</time>`
gets the name "AlexMentor18:04": flex `gap` is visual only, and accessible-name computation adds
no space between inline children. Give each part an id and list them in `aria-labelledby`
(referenced names are joined with spaces). Similarly, a `.sr-only` suffix inside a link may or may
not get a space in Chromium — match link names with a regex that allows optional whitespace.

## 2026-11-01 - Page-overflow checks miss scroll containers; play tests must not assume the viewport global

A width sweep measuring `documentElement.scrollWidth` reported no overflow for an earnings table
whose columns were all off-screen at 320 px — the Table container scrolls by design. Look at
screenshots of list screens at 320 px. Separately, a story's `globals.viewport` is not applied
when the iframe is opened directly at another width, so a layout assertion in `play` must branch on
`matchMedia`, or assert DOM order instead of positions.

## 2026-11-01 - Docs pages are one document: landmarks repeat across examples

Axe best-practice rules (`landmark-unique`, `landmark-no-duplicate-main/banner`) failed on docs pages
that embedded several examples of a page-level component. They passed as standalone stories.
Root causes: (1) fixed heading ids (`id="mentor-profile-work"`) in components, so every instance's
`aria-labelledby` resolved to the first — use `useId` (server-safe) for any id a component owns;
(2) a landmark per repeated item (a `section aria-label` per slot day); (3) inline `Narrow` canvases,
which render at the docs page's width and only duplicate the example above. Embed one example per
landmark-bearing component per docs page and point to the other stories by name. A docs-only
wrapper that narrows the box does not help: Tailwind breakpoints follow the window, not the box.

## 2026-11-01 - Stacking table rows: grid tracks keep min-content; container queries beat media queries

DataTable rows stack through `@container` on the table wrapper, so a table in a narrow column or a
docs preview stacks too. Media queries follow the window, not the column. With `display: grid` on the
row, the implicit track's minimum is the widest unbreakable child: a nowrap status badge kept
cells 13 px wider than a 320 px column. Use `grid-template-columns: minmax(0, 1fr)` and let badges
wrap. Changing `display` on table elements can drop table semantics, so set explicit roles
(table/rowgroup/row/columnheader/cell). Keep the visible per-cell column name `aria-hidden` to avoid a
double announcement.

## 2026-11-01 - Docs content: nested tables, asterisks in MDX tables, forbidden-class examples

- A component preview inside a docs `<table>` cell still gets Storybook's docs table styling (text
  colour, striped rows), even under `<Unstyled>`. In dark mode, a DataTable preview had dark-grey
  text on a light stripe (axe color-contrast). Scope an override to the preview cell
  (`color: inherit`, transparent non-selected rows).
- Inside JSX tables in MDX, `*` still starts emphasis (`bg-linear-*` broke indexing). Escape it as
  `&#42;`; Markdown bold is not parsed there either, so use `<strong>`.
- `check:tokens` scans MDX prose, so a “never write this” example such as a palette class or a
  bracket value fails the gate. Describe the form in words (“a colour family with a shade”)
  instead of weakening the checker.

## 2026-11-01 - Browser audit readiness must include portals

An open Dialog/AlertDialog story can render all visible content into a body portal;
its `#storybook-root` children may be hidden. Waiting for a visible root child made
the stage-5 audit time out on valid open-overlay stories. Wait for attached story
content or a portal, then measure the visible overlay as well as the document.
Also distinguish authored `play` definitions, stories inheriting `play` through
spread, and render/axe tests when reporting interaction coverage.

## 2026-11-01 - Sweep primitive examples too; wait for play completion

The stage-5 full width sweep found three overflows missed by the earlier Product/
Patterns-only sweep. Fixed-width demo wrappers must fit their padded parent, long
Badge text needs the documented wrapping classes, and a fixed-width Skeleton in an
implicit grid can expand the track despite max-width 100%. A fluid width with a
maximum token avoids that intrinsic sizing cycle. Negative controls reproduced all
three. For interactive width sweeps, wait for Storybook's finished render/play phase
before navigating; a short timer can interrupt async assertions and report false
console failures.

## 2026-11-01 - A wide DataTable without focusable cells fails axe `scrollable-region-focusable`

Table cells are `white-space: nowrap` above the 48rem stacking threshold, so long values make the
`.mentio-table-container` scroll sideways. The Table stories pass axe only because their cells contain
links (focusable content inside the scroll region). A read-only list such as admin Users has none, so
the container is a scroll region keyboard users cannot reach: axe fails in both themes. Fixed in `Table`
(user decision): while it overflows, the container gets `tabindex="0"` and, when the table is named, a
`region` role with that name. Test long data at 1440 px, not only at 320 px.

Related, same day: a `disabled` button that has focus drops focus to `<body>` in Chromium, so DataTable
paging now uses `aria-disabled`. And a column utility such as `text-right` outranks `@layer components`, so
the stacked-row reset needs `!important`. Ledger: `.ai/runs/2026-11-01-admin-users-stories.md`. Also: in
this Storybook (10.6) the preview's `currentRender.phase` reads `finished` when play is done.

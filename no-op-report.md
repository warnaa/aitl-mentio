# No-op audit: AGENTS.md

**Audited:** 2026-11-04 · **Mode:** full
**Status:** Reviewed rewrite applied with user approval; the user also requested committing this report and the run log. Line references below refer to the original `AGENTS.md` at commit `6040141aae0fa314bd802bd42709599957f84ebf`.
**Also read for cross-file duplication:** `CLAUDE.md`, `packages/app/AGENTS.md`, `packages/app/CLAUDE.md`, `.claude/settings.json`, relevant `.claude/skills/` workflow/reference files, `.agents/skills/devmentor-prototype/SKILL.md`, `packages/ui/.storybook/Guidelines.mdx`, `.ai/lessons.md`, engineering-standards spec. Instruction inventory found no other nested AGENTS/CLAUDE files, `.cursorrules`, `.claude/commands/` or hooks. Relevant skill files were inspected as context; they are not additional audit targets.

## Summary

| | Before | After | Δ |
|---|---|---|---|
| Directives (substantive review units) | 238 | 228 | -10 |
| Lines | 397 | 338 | -59 |
| Est. tokens (characters ÷ 4) | 5,966 | 5,017 | -949 (-15.9%) |
| Signal density (original units surviving / reviewed) | 232/238 (97.5%) | Retained through trim/merge | 6 units cut |

Calibration: this root AGENTS.md is always loaded, so it gets the strictest context budget. It is long primarily because it contains project-specific constraints and incident recovery knowledge. The dominant removable cost is repeated policy and verbose explanation, not generic engineering rules. The conservative proposal retains 84.1% of the original character budget, comfortably above the skill's 40% caution threshold. A routing design offers larger savings but is a separate change requiring buy-in. Confidence is high for verified duplicates and compressed facts; subjective counter-default rules remain, with uncertainty surfaced below.

Counts use the analyzer's units after removing 21 headings/table-layout units; wrapped bullet continuations and sentences are separate units, not independent behavioral obligations. The supplied analyzer emitted 259 raw units and 5,742 estimated tokens; the full-source estimate above also includes whitespace/formatting. Signal density measures surviving information (KEEP/TRIM/MERGE), not only unchanged sentences. It is an original-source classification, not a claim that the proposal was audited as 100% perfect. Every one of the 259 raw units is classified in the ledger below.

Mechanical artifacts (local only, not committed): `/tmp/devmentor-no-op-analysis.json`, `/tmp/devmentor-no-op-after.json`. Source SHA-256: `2cd15f459c1dde7c608e6f2572857b8488213d930d803e3b607cf4eca7a51151`.

## Verdict breakdown

| Verdict | Count | Est. tokens in original substantive units |
|---|---|---|
| KEEP | 158 | 3,192 |
| TRIM | 58 | 1,756 |
| MERGE | 16 | 443 |
| MOVE | 0 | 0 |
| CUT | 6 | 137 |

MOVE is zero in the subtractive proposal: domain guidance remains in the root until a routing structure is explicitly chosen. No N6-only deletion was made: existing enforcement does not cover the full prose policies.

## Findings

One row per non-KEEP unit, in source order. Stable D-IDs distinguish sentences or fragments sharing the analyzer's start-line number. Read a continuation with its preceding bullet; the mechanical parser does not preserve full semantic boundaries.

| Line / ID | Verdict | Code | Directive (abbreviated) | Rationale |
|---|---|---|---|---|
| L3 / D002 | CUT | N10 | Instructions for any AI agent (Claude Code, other CLIs, autonomous runs) working in this repository. | Audience preamble adds no constraint beyond the root AGENTS.md location. |
| L8 / D005 | MERGE | N4 | It is an npm-workspaces monorepo built on the latest Next.js + TypeScript + React. | Tech stack L15–24 already specifies npm workspaces and concrete Next/React/TypeScript versions; “latest” adds no stable fact. |
| L28 / D020 | TRIM | L2 | Everything lives under `packages/*`. | Compress graph and package descriptions while retaining the db-only MikroORM policy that ESLint does not enforce; keep the local lint command. |
| L28 / D021 | TRIM | L2 | The dependency graph is strictly one-way: | Compress graph and package descriptions while retaining the db-only MikroORM policy that ESLint does not enforce; keep the local lint command. |
| L30 / D022 | TRIM | L2 | app ──> core ──> db<br> └────> ui<br><br>packages/<br>  app    @devmentor/app    Next.js host + composition root (the only p… | Compress graph and package descriptions while retaining the db-only MikroORM policy that ESLint does not enforce; keep the local lint command. |
| L46 / D023 | TRIM | L2 | These boundaries are enforced by ESLint (`no-restricted-imports` in `eslint.config.mjs`); a cycle-introducing im… | Compress graph and package descriptions while retaining the db-only MikroORM policy that ESLint does not enforce; keep the local lint command. |
| L51 / D025 | TRIM | L1 | Domain code is not organized into `modules/`. | Retain the concept convention and all named concepts; remove explanatory framing. |
| L51 / D026 | TRIM | L1 | Each concept (`auth`, `mentors`, `availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`, ...… | Retain the concept convention and all named concepts; remove explanatory framing. |
| L61 / D032 | TRIM | L1 | Create a concept folder only when its first file is added — never scaffold empty ones. | Preserve scaffolding/runtime boundaries and the verified engineering-spec pointer. |
| L61 / D033 | TRIM | L1 | This is a directory convention, not a module runtime: there is no per-concept setup/ACL/auto-discovery. | Preserve scaffolding/runtime boundaries and the verified engineering-spec pointer. |
| L61 / D034 | TRIM | L1 | See `.ai/specs/2026-09-01-engineering-standards.md` for the full naming table and the payments-port/event-emitte… | Preserve scaffolding/runtime boundaries and the verified engineering-spec pointer. |
| L72 / D038 | TRIM | L1 | Every route and every page reuses two shared layers instead of re-implementing fetch/validation/auth/error-handl… | Canonicalize the shared-layer prohibition here before merging L194–198 into it. |
| L75 / D039 | MERGE | N4 | `packages/core/src/http/` — `errors.ts` (typed `AppError` hierarchy), | Fold the unique service/route constraints from L194–196 into the canonical HTTP-layer entry. |
| L76 / D040 | MERGE | N4 | `apiHandler.ts` (wraps a route: catches `AppError`s, maps to status + JSON envelope, logs unexpected failures), … | Fold the unique service/route constraints from L194–196 into the canonical HTTP-layer entry. |
| L80 / D041 | MERGE | N4 | `packages/ui/src/backend/` — `api/apiCall.ts` (the only sanctioned `fetch()` call | Fold apiCallOrThrow and mandatory component usage from L197–198 into the existing UI-layer entry. |
| L81 / D042 | MERGE | N4 | site), `forms/CrudForm.tsx`, `tables/DataTable.tsx`, `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`. | Fold apiCallOrThrow and mandatory component usage from L197–198 into the existing UI-layer entry. |
| L86 / D044 | MERGE | N4 | Shadcn primitive → `ui/src/components/ui/` (via `npx shadcn@latest add`, never | Canonical primitive entry absorbs the working directory and components.json fact from L189–191. |
| L87 / D045 | MERGE | N4 | hand-written). | Canonical primitive entry absorbs the working directory and components.json fact from L189–191. |
| L94 / D051 | TRIM | L2 | The API envelope (`{ ok, data }` / `{ ok, error }`) is a *shape convention*, not a shared type: `core/src/http` … | Retain both independent type locations and reference routes; reuse the existing spec pointer. |
| L94 / D052 | TRIM | L2 | `/api/users` + `/admin/users/page.tsx` are the reference example every new concept copies. | Retain both independent type locations and reference routes; reuse the existing spec pointer. |
| L94 / D053 | TRIM | L2 | See `.ai/specs/2026-09-01-engineering-standards.md` for the full rationale. | Retain both independent type locations and reference routes; reuse the existing spec pointer. |
| L102 / D055 | TRIM | L5 | `npm run setup` — one-command installer: `npm install`, `.env` from `.env.example`, | Preserve idempotence, Docker fallback, connection precedence and bootstrap architecture verified in scripts/setup/. |
| L103 / D056 | TRIM | L5 | PostgreSQL available, migrations, seed. **Idempotent** — every step reports itself as `ran` or `skipped`, an exi… | Preserve idempotence, Docker fallback, connection precedence and bootstrap architecture verified in scripts/setup/. |
| L103 / D057 | TRIM | L5 | Implementation in `scripts/setup/` (plain Node ESM, `node:*` built-ins only, so it runs on a fresh clone) — pure… | Preserve idempotence, Docker fallback, connection precedence and bootstrap architecture verified in scripts/setup/. |
| L136 / D080 | TRIM | L3 | The root `.env` is the only env file. Next reads env files only from | Preserve both loaders, missing-file recovery, precedence and harness isolation from the 2026-11-03 lesson. |
| L137 / D081 | TRIM | L3 | `packages/app/`, so `next.config.ts` loads the root one through `src/lib/repo-env.ts` (`process.loadEnvFile`), a… | Preserve both loaders, missing-file recovery, precedence and harness isolation from the 2026-11-03 lesson. |
| L137 / D082 | TRIM | L3 | A variable already set in the real environment always wins over `.env`, and a missing file is ignored. | Preserve both loaders, missing-file recovery, precedence and harness isolation from the 2026-11-03 lesson. |
| L137 / D083 | TRIM | L3 | The integration harness pins every documented key so a developer's `.env` never leaks into a test run. | Preserve both loaders, missing-file recovery, precedence and harness isolation from the 2026-11-03 lesson. |
| L142 / D084 | TRIM | L6 | All env access funnels through zod schemas — `@devmentor/core` (`config/env.ts`) for | Keep schema entry points and the package-wide boundary; ESLint does not enforce it. |
| L143 / D085 | TRIM | L6 | the app, `@devmentor/db` (`env.ts`) for the MikroORM CLI. **Nothing under `packages/` reads `process.env` direct… | Keep schema entry points and the package-wide boundary; ESLint does not enforce it. |
| L148 / D088 | TRIM | L3 | `scripts/setup/effects.mjs` — `npm run setup` runs on a fresh clone *before* | Preserve bootstrap exception, injectable effects and the precedence synchronization requirement. |
| L149 / D089 | TRIM | L3 | `npm install`, so it cannot import zod. | Preserve bootstrap exception, injectable effects and the precedence synchronization requirement. |
| L149 / D090 | TRIM | L3 | It reads `process.env`, `process.version`, and `process.platform` behind the injectable `SetupEffects` adapter, … | Preserve bootstrap exception, injectable effects and the precedence synchronization requirement. |
| L149 / D091 | TRIM | L3 | Keep that precedence in step with the two zod schemas. | Preserve bootstrap exception, injectable effects and the precedence synchronization requirement. |
| L156 / D093 | TRIM | L1 | **Packages ship TypeScript source**, not built JS. They are consumed via `exports` | Keep source exports and transpilePackages; no extra build steps. |
| L157 / D094 | TRIM | L1 | → `./src/*` and compiled by Next's `transpilePackages`. | Keep source exports and transpilePackages; no extra build steps. |
| L157 / D095 | TRIM | L1 | There is no per-package build step. | Keep source exports and transpilePackages; no extra build steps. |
| L159 / D096 | TRIM | L1 | **Use extensionless relative imports** inside packages (`./foo`, not `./foo.js`). | Keep the documented Turbopack failure mode and cross-runner compatibility. |
| L160 / D097 | TRIM | L1 | Turbopack does not rewrite `.js`→`.ts` the way `tsc` does; extensionless works for `tsc` (bundler), Turbopack, a… | Keep the documented Turbopack failure mode and cross-runner compatibility. |
| L166 / D101 | TRIM | L5 | **Entities are registered as `globalThis` singletons** (`entities/define.ts`) so the | Preserve singleton location and the concrete populate failure documented in lessons. |
| L167 / D102 | TRIM | L5 | same schema object is shared across Next's RSC/SSR/route module graphs. | Preserve singleton location and the concrete populate failure documented in lessons. |
| L167 / D103 | TRIM | L5 | Without this, queries pass a different schema instance than was discovered and `populate` breaks. | Preserve singleton location and the concrete populate failure documented in lessons. |
| L183 / D116 | TRIM | L4 | Every `app` and `admin` layout renders `SignedInShell` (`app/src/components/auth/`), which puts `AppShell` aroun… | Retain shell composition, role union and invitation/operator boundaries; primitive installer moved to L86 canonical entry. |
| L183 / D117 | TRIM | L4 | A new signed-in page gets its link there — never a link to a page that does not exist yet, and never one that gr… | Retain shell composition, role union and invitation/operator boundaries; primitive installer moved to L86 canonical entry. |
| L183 / D118 | TRIM | L4 | `AppShell` lives in `ui`, so it knows no `Role` and no `next/link`; the app supplies the rendered links. | Retain shell composition, role union and invitation/operator boundaries; primitive installer moved to L86 canonical entry. |
| L183 / D119 | MERGE | N4 | Add shadcn components with `npx shadcn@latest add <c>` run in `packages/ui` (its `components.json` is committed). | Move the repeated installer command plus unique cwd/components.json facts into the primitive placement rule at original L86–87. |
| L194 / D122 | MERGE | N4 | **Never hand-roll fetch / validation / error-handling / CRUD.** Server routes use | All unique constraints now reside in Reusable API & UI layer L72–82; remove the second copy. |
| L195 / D123 | MERGE | N4 | `makeCrudRoute`/`apiHandler` (no bare `try/catch` + `NextResponse.json`); services throw the typed `AppError`s a… | All unique constraints now reside in Reusable API & UI layer L72–82; remove the second copy. |
| L195 / D124 | MERGE | N4 | Client pages fetch through `apiCall`/`apiCallOrThrow` (never raw `fetch`), forms use `CrudForm`, lists use `Data… | All unique constraints now reside in Reusable API & UI layer L72–82; remove the second copy. |
| L201 / D127 | TRIM | L5 | **Browser-navigated vs fetched routes.** A route the browser *navigates* to (the | Retain redirect recovery, pass-through Response behavior and fetched-envelope distinction. |
| L202 / D128 | TRIM | L5 | GitHub OAuth start and callback, and later the email-verification link) catches its own failures and returns a r… | Retain redirect recovery, pass-through Response behavior and fetched-envelope distinction. |
| L202 / D129 | TRIM | L5 | Every other route is *fetched* through `apiCall` and answers the `{ ok, data }` / `{ ok, error }` envelope. | Retain redirect recovery, pass-through Response behavior and fetched-envelope distinction. |
| L266 / D174 | TRIM | L1 | **Guarded pages have two mocking seams**, because `redirect()` throws a framework | Preserve both mocking seams and explicit guarded-page coverage; avoid framework-internal assertions. |
| L267 / D175 | TRIM | L1 | control-flow error instead of returning. | Preserve both mocking seams and explicit guarded-page coverage; avoid framework-internal assertions. |
| L267 / D176 | TRIM | L1 | Page tests mock `app/src/lib/session.ts`, assert the tree on the allowed path and a sentinel throw on the denied… | Preserve both mocking seams and explicit guarded-page coverage; avoid framework-internal assertions. |
| L267 / D177 | TRIM | L1 | Never assert against Next internals. | Preserve both mocking seams and explicit guarded-page coverage; avoid framework-internal assertions. |
| L267 / D178 | TRIM | L1 | The cost: every guarded `page.tsx` is a `coverage.include` entry that needs both the authorized and the redirect… | Preserve both mocking seams and explicit guarded-page coverage; avoid framework-internal assertions. |
| L283 / D187 | MERGE | N4 | The integration harness under `tests/integration/` is one of the two exceptions to | Configuration L142–152 already carries the same exception, inheritance purpose and zod boundary. |
| L284 / D188 | MERGE | N4 | the direct-environment-access rule (the other is `scripts/setup/` — see Configuration above): `environment.ts` m… | Configuration L142–152 already carries the same exception, inheritance purpose and zod boundary. |
| L284 / D189 | MERGE | N4 | Application and package source must still use the zod config modules. | Configuration L142–152 already carries the same exception, inheritance purpose and zod boundary. |
| L295 / D193 | MERGE | N4 | Nontrivial work in this repo is defined by a spec before it's implemented. | The check-existing/write-before-implementation requirement remains in Specs L319–321; retain the artifact root. |
| L310 / D197 | TRIM | N12 | Naming: `YYYY-MM-DD-slug.md`, dated the day the spec was written, `slug` a short | The filename example adds no constraint beyond the exact format, date meaning and slug casing. |
| L311 / D198 | TRIM | N12 | kebab-case description (e.g. | The filename example adds no constraint beyond the exact format, date meaning and slug casing. |
| L311 / D199 | TRIM | N12 | `2026-09-01-user-auth-refresh-tokens.md`). | The filename example adds no constraint beyond the exact format, date meaning and slug casing. |
| L352 / D232 | MERGE | N4 | Keep the `YYYY-MM-DD-slug.md` naming convention exactly as specified above. | Specs L310–311 and Runs L331 already define exact naming; lesson detail names retain their distinct slug.md rule. |
| L356 / D234 | CUT | N10 | Distilled from [Boris Cherny's Claude Code tips](https://ykdojo.github.io/claude-code-tips/content/boris-claude-… | Attribution and document navigation commentary add no repository behavior; no claim from the external article is needed. |
| L356 / D235 | CUT | N10 | These govern *how* you work; the SDD section above governs *what artifacts* you leave behind. | Attribution and document navigation commentary add no repository behavior; no claim from the external article is needed. |
| L361 / D236 | TRIM | L5 | **Plan first, and re-plan instead of patching.** Front-load the thinking: a | Keep replanning recovery and pre-code second opinion; remove the unmeasurable claim that detailed specs win every time. |
| L362 / D237 | CUT | N2 | detailed spec beats an ambiguous prompt every time. | No measurable artifact follows from “beats an ambiguous prompt every time”; planning and recovery remain in D236/D238. |
| L362 / D238 | TRIM | L5 | When implementation goes sideways, stop and revise the plan/spec rather than reactively troubleshooting on top o… | Keep replanning recovery and pre-code second opinion; remove the unmeasurable claim that detailed specs win every time. |
| L362 / D239 | TRIM | L5 | For high-stakes plans, get a second opinion — have a subagent review the plan as a skeptical staff engineer befo… | Keep replanning recovery and pre-code second opinion; remove the unmeasurable claim that detailed specs win every time. |
| L367 / D240 | TRIM | L1 | **Capture every correction the moment it happens.** When the user corrects your | Preserve correction timing and both destinations; root lesson policy alone does not specify before continuing. |
| L368 / D241 | TRIM | L1 | approach, write the lesson to `.ai/lessons.md` (and update this file if it's a standing rule) *before* continuin… | Preserve correction timing and both destinations; root lesson policy alone does not specify before continuing. |
| L368 / D242 | CUT | N10 | Rules that only live in the current conversation are lost; the point is that the same mistake never recurs. | Rationale repeats the purpose of the correction rule; timing and destinations survive in D240/D241. |
| L377 / D245 | TRIM | L1 | **Don't ship the first draft — grill it.** Before declaring work done or moving a | Retain adversarial acceptance checks, the borderline replace-rather-than-patch constraint, and verified reporting. |
| L378 / D246 | TRIM | L1 | spec to `implemented/`, check the diff against the spec's acceptance criteria and actively try to break it. | Retain adversarial acceptance checks, the borderline replace-rather-than-patch constraint, and verified reporting. |
| L378 / D248 | TRIM | L1 | Report failures plainly; never self-report success you haven't verified. | Retain adversarial acceptance checks, the borderline replace-rather-than-patch constraint, and verified reporting. |
| L383 / D249 | TRIM | L2 | **Delegate breadth to subagents; keep the main context for judgment.** Push wide | Preserve explicit delegation authorization and scope; classify context-window sales pitch separately as CUT. |
| L384 / D250 | TRIM | L2 | searches, multi-file reads, and independent parallel work into subagents and keep only their conclusions in the … | Preserve explicit delegation authorization and scope; classify context-window sales pitch separately as CUT. |
| L384 / D251 | CUT | N10 | A clean context window is a correctness feature, not just a cost saving. | Context-window justification adds no step beyond explicit delegation in D249/D250. |

<details>
<summary>Complete classification ledger: all 259 raw units, including every KEEP and formatting unit</summary>

| Line / ID | Verdict | Code | Directive (abbreviated) | Rationale |
|---|---|---|---|---|
| L1 / D001 | KEEP | L2 | # AGENTS.md | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L3 / D002 | CUT | N10 | Instructions for any AI agent (Claude Code, other CLIs, autonomous runs) working in this repository. | Audience preamble adds no constraint beyond the root AGENTS.md location. |
| L6 / D003 | KEEP | L2 | ## Project | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L8 / D004 | KEEP | L2 | **DevMentor** — a platform connecting developers with mentors. | DevMentor identifies the project and developer/mentor domain (package.json and existing app). |
| L8 / D005 | MERGE | N4 | It is an npm-workspaces monorepo built on the latest Next.js + TypeScript + React. | Tech stack L15–24 already specifies npm workspaces and concrete Next/React/TypeScript versions; “latest” adds no stable fact. |
| L11 / D006 | KEEP | L2 | ### Tech stack | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L13 / D007 | KEEP | L2 | \| Concern            \| Choice                                             \| | Retain table header/separator for readable project facts; formatting only, excluded from substantive counts. |
| L14 / D008 | KEEP | L2 | \| ------------------ \| -------------------------------------------------- \| | Retain table header/separator for readable project facts; formatting only, excluded from substantive counts. |
| L15 / D009 | KEEP | L2 | \| Framework          \| Next.js 16 (App Router, Turbopack) + React 19      \| | packages/app/package.json selects Next 16 and React 19; app/next.config.ts uses the App Router host. |
| L16 / D010 | KEEP | L2 | \| Language           \| TypeScript 5 (strict), ESM everywhere              \| | tsconfig.base.json selects strict TypeScript; ESM is an additional project choice, so retain the compact stack row. |
| L17 / D011 | KEEP | L2 | \| Database           \| PostgreSQL                                          \| | packages/db/package.json and docker-compose.yml select PostgreSQL. |
| L18 / D012 | KEEP | L2 | \| ORM                \| MikroORM v7 (PostgreSQL driver) — migrations + pool \| | packages/db/package.json/config.ts select MikroORM v7 PostgreSQL with migrations and pool configuration. |
| L19 / D013 | KEEP | L2 | \| Dependency injection \| awilix v13 (`PROXY` mode, typed `Cradle`)        \| | packages/core/src/container/container.ts selects awilix PROXY and typed Cradle; not generic DI advice. |
| L20 / D014 | KEEP | L2 | \| Config validation  \| zod                                                \| | Both packages/core/src/config/env.ts and packages/db/src/env.ts use zod. |
| L21 / D015 | KEEP | L2 | \| Logging            \| pino                                               \| | packages/core/src/logger.ts uses pino; this is the selected logging implementation. |
| L22 / D016 | KEEP | L2 | \| Frontend styling   \| Tailwind CSS v4 (public/marketing pages)           \| | packages/ui styling and Storybook Guidelines identify Tailwind v4 on the public surface. |
| L23 / D017 | KEEP | L2 | \| Signed-in/admin UI \| shadcn-ui components (in `@devmentor/ui`)          \| | packages/ui/components.json and backend components identify the signed-in shadcn surface. |
| L24 / D018 | KEEP | L2 | \| Package manager    \| npm workspaces (Node ≥ 24)                          \| | package.json workspaces and engines require npm workspaces and Node >=24; preserve the local toolchain pointer. |
| L26 / D019 | KEEP | L2 | ### Monorepo layout | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L28 / D020 | TRIM | L2 | Everything lives under `packages/*`. | Compress graph and package descriptions while retaining the db-only MikroORM policy that ESLint does not enforce; keep the local lint command. |
| L28 / D021 | TRIM | L2 | The dependency graph is strictly one-way: | Compress graph and package descriptions while retaining the db-only MikroORM policy that ESLint does not enforce; keep the local lint command. |
| L30 / D022 | TRIM | L2 | app ──> core ──> db<br> └────> ui<br><br>packages/<br>  app    @devmentor/app    Next.js host + composition root (the only p… | Compress graph and package descriptions while retaining the db-only MikroORM policy that ESLint does not enforce; keep the local lint command. |
| L46 / D023 | TRIM | L2 | These boundaries are enforced by ESLint (`no-restricted-imports` in `eslint.config.mjs`); a cycle-introducing im… | Compress graph and package descriptions while retaining the db-only MikroORM policy that ESLint does not enforce; keep the local lint command. |
| L49 / D024 | KEEP | L2 | ### Domain concept convention | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L51 / D025 | TRIM | L1 | Domain code is not organized into `modules/`. | Retain the concept convention and all named concepts; remove explanatory framing. |
| L51 / D026 | TRIM | L1 | Each concept (`auth`, `mentors`, `availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`, ...… | Retain the concept convention and all named concepts; remove explanatory framing. |
| L55 / D027 | KEEP | L2 | `packages/db/src/entities/<concept>/<name>.entity.ts` | Existing packages/db/src/entities/auth/user.entity.ts demonstrates the entity naming template, not a missing literal path. |
| L56 / D028 | KEEP | L2 | `packages/core/src/services/<concept>/<name>.service.ts` | Existing packages/core/src/services/auth/user.service.ts demonstrates the service naming template. |
| L57 / D029 | KEEP | L2 | `packages/core/src/validators/<concept>/` (shared Zod schemas, when needed) | Existing packages/core/src/validators/auth/register.schema.ts demonstrates the shared-schema concept folder. |
| L58 / D030 | KEEP | L2 | `packages/app/src/app/api/<concept>/route.ts` and the matching `page.tsx` under | packages/app/src/app/api/auth and persona route groups implement this route/page placement; continuation belongs to the same directive. |
| L59 / D031 | KEEP | L2 | the relevant persona route group | packages/app/src/app/api/auth and persona route groups implement this route/page placement; continuation belongs to the same directive. |
| L61 / D032 | TRIM | L1 | Create a concept folder only when its first file is added — never scaffold empty ones. | Preserve scaffolding/runtime boundaries and the verified engineering-spec pointer. |
| L61 / D033 | TRIM | L1 | This is a directory convention, not a module runtime: there is no per-concept setup/ACL/auto-discovery. | Preserve scaffolding/runtime boundaries and the verified engineering-spec pointer. |
| L61 / D034 | TRIM | L1 | See `.ai/specs/2026-09-01-engineering-standards.md` for the full naming table and the payments-port/event-emitte… | Preserve scaffolding/runtime boundaries and the verified engineering-spec pointer. |
| L66 / D035 | KEEP | L2 | Event IDs follow `concept.entity.action` (e.g. | packages/core/src/events/event-map.ts defines concept.entity.action and in-process events; Cradle registers EventBus. |
| L66 / D036 | KEEP | L2 | `bookings.booking.created`) and are emitted through the typed emitter in `packages/core/src/events`, registered … | packages/core/src/events/event-map.ts defines concept.entity.action and in-process events; Cradle registers EventBus. |
| L70 / D037 | KEEP | L2 | ### Reusable API & UI layer | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L72 / D038 | TRIM | L1 | Every route and every page reuses two shared layers instead of re-implementing fetch/validation/auth/error-handl… | Canonicalize the shared-layer prohibition here before merging L194–198 into it. |
| L75 / D039 | MERGE | N4 | `packages/core/src/http/` — `errors.ts` (typed `AppError` hierarchy), | Fold the unique service/route constraints from L194–196 into the canonical HTTP-layer entry. |
| L76 / D040 | MERGE | N4 | `apiHandler.ts` (wraps a route: catches `AppError`s, maps to status + JSON envelope, logs unexpected failures), … | Fold the unique service/route constraints from L194–196 into the canonical HTTP-layer entry. |
| L80 / D041 | MERGE | N4 | `packages/ui/src/backend/` — `api/apiCall.ts` (the only sanctioned `fetch()` call | Fold apiCallOrThrow and mandatory component usage from L197–198 into the existing UI-layer entry. |
| L81 / D042 | MERGE | N4 | site), `forms/CrudForm.tsx`, `tables/DataTable.tsx`, `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`. | Fold apiCallOrThrow and mandatory component usage from L197–198 into the existing UI-layer entry. |
| L84 / D043 | KEEP | L1 | New reusable components have one designated home each — never scattered ad hoc: | The following four placement choices prevent ad hoc reusable components; Guidelines and prototype skill use the same registry. |
| L86 / D044 | MERGE | N4 | Shadcn primitive → `ui/src/components/ui/` (via `npx shadcn@latest add`, never | Canonical primitive entry absorbs the working directory and components.json fact from L189–191. |
| L87 / D045 | MERGE | N4 | hand-written). | Canonical primitive entry absorbs the working directory and components.json fact from L189–191. |
| L88 / D046 | KEEP | L2 | Generic, concept-agnostic panel pattern → `ui/src/backend/<category>/`. | ui/src/backend has concept-agnostic forms/tables/feedback/shell categories; this is a placement constraint. |
| L89 / D047 | KEEP | L2 | Component tied to one concept's domain shape → `ui/src/components/<concept>/`, | ui/src/components/auth and mentors follow domain naming; preserve matching concept folder across layers. |
| L90 / D048 | KEEP | L2 | named after the same concept folder used in `db`/`core`. | ui/src/components/auth and mentors follow domain naming; preserve matching concept folder across layers. |
| L91 / D049 | KEEP | L1 | Used by exactly one page → colocate next to that `page.tsx` until a second | app/admin/users/UsersList.tsx is colocated with its consumer; second-consumer condition prevents premature abstraction. |
| L92 / D050 | KEEP | L1 | consumer appears. | app/admin/users/UsersList.tsx is colocated with its consumer; second-consumer condition prevents premature abstraction. |
| L94 / D051 | TRIM | L2 | The API envelope (`{ ok, data }` / `{ ok, error }`) is a *shape convention*, not a shared type: `core/src/http` … | Retain both independent type locations and reference routes; reuse the existing spec pointer. |
| L94 / D052 | TRIM | L2 | `/api/users` + `/admin/users/page.tsx` are the reference example every new concept copies. | Retain both independent type locations and reference routes; reuse the existing spec pointer. |
| L94 / D053 | TRIM | L2 | See `.ai/specs/2026-09-01-engineering-standards.md` for the full rationale. | Retain both independent type locations and reference routes; reuse the existing spec pointer. |
| L100 / D054 | KEEP | L2 | ### Scripts (run from the repo root) | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L102 / D055 | TRIM | L5 | `npm run setup` — one-command installer: `npm install`, `.env` from `.env.example`, | Preserve idempotence, Docker fallback, connection precedence and bootstrap architecture verified in scripts/setup/. |
| L103 / D056 | TRIM | L5 | PostgreSQL available, migrations, seed. **Idempotent** — every step reports itself as `ran` or `skipped`, an exi… | Preserve idempotence, Docker fallback, connection precedence and bootstrap architecture verified in scripts/setup/. |
| L103 / D057 | TRIM | L5 | Implementation in `scripts/setup/` (plain Node ESM, `node:*` built-ins only, so it runs on a fresh clone) — pure… | Preserve idempotence, Docker fallback, connection precedence and bootstrap architecture verified in scripts/setup/. |
| L112 / D058 | KEEP | L2 | `npm run dev` — start the Next.js app (`@devmentor/app`). | package.json scripts.dev forwards to @devmentor/app. |
| L113 / D059 | KEEP | L5 | `npm run build` / `npm run start` — production build / serve (force `NODE_ENV=production`). | packages/app/package.json forces production NODE_ENV for build/start; .ai/lessons.md records the ambient-development failure. |
| L114 / D060 | KEEP | L2 | `npm run typecheck` — `tsc --noEmit` across all packages. | package.json scripts.typecheck is tsc --noEmit with root project references. |
| L115 / D061 | KEEP | L2 | `npm run lint` — ESLint (includes the dependency-direction rules). | package.json scripts.lint invokes ESLint with the workspace boundaries. |
| L116 / D062 | KEEP | L2 | `npm run test:unit` — run TypeScript unit tests with Vitest. | package.json scripts.test:unit selects the unit Vitest config. |
| L117 / D063 | KEEP | L2 | `npm run test:unit:coverage` — run unit tests and enforce per-file 100% coverage. | package.json scripts.test:unit:coverage enables coverage; vitest.config.mts sets all four per-file thresholds to 100. |
| L118 / D064 | KEEP | L2 | `npm run storybook` — build the prototype and start the local component catalogue. | package.json scripts.storybook builds the prototype before the catalogue. |
| L119 / D065 | KEEP | L2 | `npm run build-storybook` — build the prototype and static component catalogue. | package.json scripts.build-storybook builds prototype plus static catalogue; different artifact from the dev server. |
| L120 / D066 | KEEP | L2 | `npm run typecheck:storybook` — check catalogue configuration and examples. | package.json scripts.typecheck:storybook targets the UI catalogue configuration. |
| L121 / D067 | KEEP | L2 | `npm run prototype` — rebuild the preview from `prototypes/devmentor-journey/`. | package.json scripts.prototype invokes scripts/build-prototype.mjs for prototypes/devmentor-journey/. |
| L122 / D068 | KEEP | L2 | `npm run typecheck:prototype` / `npm run test:prototype` — check prototype types and regressions. | package.json contains distinct prototype typecheck and regression commands. |
| L123 / D069 | KEEP | L2 | `npm run test:integration` — create ephemeral PostgreSQL with Testcontainers, | vitest.integration.config.mts and tests/integration global setup own ephemeral PostgreSQL, build/start and browser scenarios. |
| L124 / D070 | KEEP | L2 | build/start the app, and run the agent-browser scenarios. | vitest.integration.config.mts and tests/integration global setup own ephemeral PostgreSQL, build/start and browser scenarios. |
| L125 / D071 | KEEP | L5 | `npm run test:browser:install` — install agent-browser's Chrome runtime locally | package.json defines both browser installers; CI selects the --with-deps variant on Linux. |
| L126 / D072 | KEEP | L5 | (use `test:browser:install:ci` on Linux CI to install system dependencies too). | package.json defines both browser installers; CI selects the --with-deps variant on Linux. |
| L127 / D073 | KEEP | L2 | `npm run db:up` / `npm run db:down` — local Postgres via `docker-compose.yml`. | package.json db:up/down select docker compose and docker-compose.yml exists; setup fallback does not make these commands dead. |
| L128 / D074 | KEEP | L2 | `npm run db:migration:create -- --name <x>` — generate a migration from entity diff. | package.json forwards db:migration:create arguments to @devmentor/db migration:create. |
| L129 / D075 | KEEP | L2 | `npm run db:migrate` / `npm run db:migrate:down` — apply / revert migrations. | package.json exposes distinct migration:up/down forwarding commands. |
| L130 / D076 | KEEP | L2 | `npm run db:seed` — run the default seeder. | package.json scripts.db:seed forwards to the db workspace seeder. |
| L132 / D077 | KEEP | L2 | ### Configuration | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L134 / D078 | KEEP | L2 | Copy `.env.example` to `.env`. `.env` is git-ignored; defaults match | .env.example, .gitignore env exclusions and docker-compose.yml contain the stated defaults. |
| L135 / D079 | KEEP | L2 | `docker-compose.yml` (`devmentor` / `devmentor` / `devmentor`). | .env.example, .gitignore env exclusions and docker-compose.yml contain the stated defaults. |
| L136 / D080 | TRIM | L3 | The root `.env` is the only env file. Next reads env files only from | Preserve both loaders, missing-file recovery, precedence and harness isolation from the 2026-11-03 lesson. |
| L137 / D081 | TRIM | L3 | `packages/app/`, so `next.config.ts` loads the root one through `src/lib/repo-env.ts` (`process.loadEnvFile`), a… | Preserve both loaders, missing-file recovery, precedence and harness isolation from the 2026-11-03 lesson. |
| L137 / D082 | TRIM | L3 | A variable already set in the real environment always wins over `.env`, and a missing file is ignored. | Preserve both loaders, missing-file recovery, precedence and harness isolation from the 2026-11-03 lesson. |
| L137 / D083 | TRIM | L3 | The integration harness pins every documented key so a developer's `.env` never leaks into a test run. | Preserve both loaders, missing-file recovery, precedence and harness isolation from the 2026-11-03 lesson. |
| L142 / D084 | TRIM | L6 | All env access funnels through zod schemas — `@devmentor/core` (`config/env.ts`) for | Keep schema entry points and the package-wide boundary; ESLint does not enforce it. |
| L143 / D085 | TRIM | L6 | the app, `@devmentor/db` (`env.ts`) for the MikroORM CLI. **Nothing under `packages/` reads `process.env` direct… | Keep schema entry points and the package-wide boundary; ESLint does not enforce it. |
| L146 / D086 | KEEP | L4 | `tests/integration/environment.ts` — inherits the parent environment to pass | tests/integration/environment.ts inherits only to provide ephemeral child-process configuration; protects developer data/config. |
| L147 / D087 | KEEP | L4 | ephemeral test configuration to migration/build/app child processes. | tests/integration/environment.ts inherits only to provide ephemeral child-process configuration; protects developer data/config. |
| L148 / D088 | TRIM | L3 | `scripts/setup/effects.mjs` — `npm run setup` runs on a fresh clone *before* | Preserve bootstrap exception, injectable effects and the precedence synchronization requirement. |
| L149 / D089 | TRIM | L3 | `npm install`, so it cannot import zod. | Preserve bootstrap exception, injectable effects and the precedence synchronization requirement. |
| L149 / D090 | TRIM | L3 | It reads `process.env`, `process.version`, and `process.platform` behind the injectable `SetupEffects` adapter, … | Preserve bootstrap exception, injectable effects and the precedence synchronization requirement. |
| L149 / D091 | TRIM | L3 | Keep that precedence in step with the two zod schemas. | Preserve bootstrap exception, injectable effects and the precedence synchronization requirement. |
| L154 / D092 | KEEP | L2 | ### Conventions & gotchas (learned the hard way — see `.ai/lessons.md`) | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L156 / D093 | TRIM | L1 | **Packages ship TypeScript source**, not built JS. They are consumed via `exports` | Keep source exports and transpilePackages; no extra build steps. |
| L157 / D094 | TRIM | L1 | → `./src/*` and compiled by Next's `transpilePackages`. | Keep source exports and transpilePackages; no extra build steps. |
| L157 / D095 | TRIM | L1 | There is no per-package build step. | Keep source exports and transpilePackages; no extra build steps. |
| L159 / D096 | TRIM | L1 | **Use extensionless relative imports** inside packages (`./foo`, not `./foo.js`). | Keep the documented Turbopack failure mode and cross-runner compatibility. |
| L160 / D097 | TRIM | L1 | Turbopack does not rewrite `.js`→`.ts` the way `tsc` does; extensionless works for `tsc` (bundler), Turbopack, a… | Keep the documented Turbopack failure mode and cross-runner compatibility. |
| L162 / D098 | KEEP | L5 | **MikroORM v7 has no decorators** in `@mikro-orm/core`. Define entities with | db/entities/auth/user.entity.ts uses defineEntity/p and lessons/2026-09-01-mikro-orm-v7-next-monorepo.md documents lazy relation thunks. |
| L163 / D099 | KEEP | L5 | `defineEntity` + the `p` (`defineEntity.properties`) builders. | db/entities/auth/user.entity.ts uses defineEntity/p and lessons/2026-09-01-mikro-orm-v7-next-monorepo.md documents lazy relation thunks. |
| L163 / D100 | KEEP | L5 | For cross-entity relations use a **per-property thunk** (`user: () => p.oneToOne(User)...`) so the reference res… | db/entities/auth/user.entity.ts uses defineEntity/p and lessons/2026-09-01-mikro-orm-v7-next-monorepo.md documents lazy relation thunks. |
| L166 / D101 | TRIM | L5 | **Entities are registered as `globalThis` singletons** (`entities/define.ts`) so the | Preserve singleton location and the concrete populate failure documented in lessons. |
| L167 / D102 | TRIM | L5 | same schema object is shared across Next's RSC/SSR/route module graphs. | Preserve singleton location and the concrete populate failure documented in lessons. |
| L167 / D103 | TRIM | L5 | Without this, queries pass a different schema instance than was discovered and `populate` breaks. | Preserve singleton location and the concrete populate failure documented in lessons. |
| L169 / D104 | KEEP | L5 | **`MikroORM.init()` does not connect in v7** — `getOrm()` calls `orm.connect()` | db/src/orm.ts calls connect and clears a rejected cached promise; core/container caches globally for HMR. |
| L170 / D105 | KEEP | L5 | explicitly and does not cache a failed connection (so the app recovers if the DB comes back). | db/src/orm.ts calls connect and clears a rejected cached promise; core/container caches globally for HMR. |
| L170 / D106 | KEEP | L5 | The ORM and awilix container are cached on `globalThis` to survive HMR. | db/src/orm.ts calls connect and clears a rejected cached promise; core/container caches globally for HMR. |
| L172 / D107 | KEEP | L5 | **`em.persistAndFlush()` was removed** — use `em.persist(e); await em.flush()`. | Existing services use persist then flush; the v7 migration lesson specifically records persistAndFlush removal. |
| L173 / D108 | KEEP | L5 | Touch the DB only in **dynamic** routes (`export const dynamic = "force-dynamic"`) | DB-backed routes use force-dynamic; CI Build has no database and .ai/lessons.md forbids production-only checks at build time. |
| L174 / D109 | KEEP | L5 | and degrade gracefully; the app must build and boot with no database reachable. | DB-backed routes use force-dynamic; CI Build has no database and .ai/lessons.md forbids production-only checks at build time. |
| L175 / D110 | KEEP | L2 | **Three surfaces, each with one styling rule** (primitives spec F1): | The following surface table assigns styling to concrete route groups; Guidelines follows the same surface split. |
| L177 / D111 | KEEP | L2 | \| Surface  \| Routes                                              \| Styling                                      … | Retain table header/separator for readable project facts; formatting only, excluded from substantive counts. |
| L178 / D112 | KEEP | L2 | \| -------- \| --------------------------------------------------- \| ---------------------------------------------… | Retain table header/separator for readable project facts; formatting only, excluded from substantive counts. |
| L179 / D113 | KEEP | L2 | \| `public` \| landing, mentor catalogue and share links, `(auth)/*` \| Tailwind utilities                         … | Public catalogue/auth/share surfaces select Tailwind utilities in the design contract. |
| L180 / D114 | KEEP | L2 | \| `app`    \| `(mentee)/*`, `(mentor)/*` — signed in               \| shadcn via `@devmentor/ui`, inside `AppShell… | Mentee and mentor layouts use SignedInShell and @devmentor/ui AppShell. |
| L181 / D115 | KEEP | L2 | \| `admin`  \| `/admin/*` — operator                                \| shadcn via `@devmentor/ui`, inside `AppShell… | admin/layout.tsx uses SignedInShell with shadcn/AppShell; route-specific constraint. |
| L183 / D116 | TRIM | L4 | Every `app` and `admin` layout renders `SignedInShell` (`app/src/components/auth/`), which puts `AppShell` aroun… | Retain shell composition, role union and invitation/operator boundaries; primitive installer moved to L86 canonical entry. |
| L183 / D117 | TRIM | L4 | A new signed-in page gets its link there — never a link to a page that does not exist yet, and never one that gr… | Retain shell composition, role union and invitation/operator boundaries; primitive installer moved to L86 canonical entry. |
| L183 / D118 | TRIM | L4 | `AppShell` lives in `ui`, so it knows no `Role` and no `next/link`; the app supplies the rendered links. | Retain shell composition, role union and invitation/operator boundaries; primitive installer moved to L86 canonical entry. |
| L183 / D119 | MERGE | N4 | Add shadcn components with `npx shadcn@latest add <c>` run in `packages/ui` (its `components.json` is committed). | Move the repeated installer command plus unique cwd/components.json facts into the primitive placement rule at original L86–87. |
| L192 / D120 | KEEP | L2 | Request-scoped work goes through `withScope(fn)` from `@devmentor/core`, which opens | core/src/container/container.ts withScope forks EntityManager and disposes the awilix scope. |
| L193 / D121 | KEEP | L2 | an awilix scope with a forked `EntityManager` and disposes it afterward. | core/src/container/container.ts withScope forks EntityManager and disposes the awilix scope. |
| L194 / D122 | MERGE | N4 | **Never hand-roll fetch / validation / error-handling / CRUD.** Server routes use | All unique constraints now reside in Reusable API & UI layer L72–82; remove the second copy. |
| L195 / D123 | MERGE | N4 | `makeCrudRoute`/`apiHandler` (no bare `try/catch` + `NextResponse.json`); services throw the typed `AppError`s a… | All unique constraints now reside in Reusable API & UI layer L72–82; remove the second copy. |
| L195 / D124 | MERGE | N4 | Client pages fetch through `apiCall`/`apiCallOrThrow` (never raw `fetch`), forms use `CrudForm`, lists use `Data… | All unique constraints now reside in Reusable API & UI layer L72–82; remove the second copy. |
| L199 / D125 | KEEP | L5 | **Collection routes are non-dynamic**, so Next passes no `params` — CRUD helpers | core/http/makeCrudRoute.ts guards ctx?.params; .ai/lessons.md 2026-09-02 records collection routes failing otherwise. |
| L200 / D126 | KEEP | L5 | guard `ctx.params` before reading it. | core/http/makeCrudRoute.ts guards ctx?.params; .ai/lessons.md 2026-09-02 records collection routes failing otherwise. |
| L201 / D127 | TRIM | L5 | **Browser-navigated vs fetched routes.** A route the browser *navigates* to (the | Retain redirect recovery, pass-through Response behavior and fetched-envelope distinction. |
| L202 / D128 | TRIM | L5 | GitHub OAuth start and callback, and later the email-verification link) catches its own failures and returns a r… | Retain redirect recovery, pass-through Response behavior and fetched-envelope distinction. |
| L202 / D129 | TRIM | L5 | Every other route is *fetched* through `apiCall` and answers the `{ ok, data }` / `{ ok, error }` envelope. | Retain redirect recovery, pass-through Response behavior and fetched-envelope distinction. |
| L207 / D130 | KEEP | L4 | **State-changing routes are JSON-only.** `apiHandler` requires the | apiHandler.ts centralizes requireCsrfHeader for non-safe methods; only payment-webhook opt-out is allowed. |
| L208 / D131 | KEEP | L4 | `x-devmentor-request` header on every method other than `GET`/`HEAD`/`OPTIONS` (login CSRF defence), so a mutati… | apiHandler.ts centralizes requireCsrfHeader for non-safe methods; only payment-webhook opt-out is allowed. |
| L208 / D132 | KEEP | L4 | Routes never call `requireCsrfHeader` themselves; the only opt-out, `apiHandler(logic, { csrf: false })`, is res… | apiHandler.ts centralizes requireCsrfHeader for non-safe methods; only payment-webhook opt-out is allowed. |
| L213 / D133 | KEEP | L4 | **Signed-in pages guard at the layout and at every `page.tsx`** with | app/lib/session.ts and proxy.ts separate repeated page authorization from requested-path forwarding; proxy is not an auth boundary. |
| L214 / D134 | KEEP | L4 | `requirePageRole`/`requirePageAccount` from `app/src/lib/session.ts` (a layout does not re-run on client-side na… | app/lib/session.ts and proxy.ts separate repeated page authorization from requested-path forwarding; proxy is not an auth boundary. |
| L214 / D135 | KEEP | L4 | `app/src/proxy.ts` is **not** an auth boundary: it only forwards the requested path as `x-devmentor-path` so a s… | app/lib/session.ts and proxy.ts separate repeated page authorization from requested-path forwarding; proxy is not an auth boundary. |
| L214 / D136 | KEEP | L4 | A new signed-in surface goes into its `matcher`, or its deep links fall back to the section root. | app/lib/session.ts and proxy.ts separate repeated page authorization from requested-path forwarding; proxy is not an auth boundary. |
| L220 / D137 | KEEP | L2 | ### Design-system rules confirmed by the user | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L222 / D138 | KEEP | L2 | Form footer actions align right, with the secondary/Cancel action before the | Guidelines.mdx:43–59 confirms footer action ordering, mobile order and full-width/neutral authentication treatments. |
| L223 / D139 | KEEP | L2 | primary submit action in DOM and visual order. | Guidelines.mdx:43–59 confirms footer action ordering, mobile order and full-width/neutral authentication treatments. |
| L223 / D140 | KEEP | L2 | Authentication actions span the field width; provider alternatives use neutral styling and back navigation is vi… | Guidelines.mdx:43–59 confirms footer action ordering, mobile order and full-width/neutral authentication treatments. |
| L223 / D141 | KEEP | L2 | Preserve this order when actions wrap on mobile. | Guidelines.mdx:43–59 confirms footer action ordering, mobile order and full-width/neutral authentication treatments. |
| L227 / D142 | KEEP | L2 | Read `packages/ui/.storybook/Guidelines.mdx` before composing screens. | packages/ui/.storybook/Guidelines.mdx exists and is the mandated pre-composition reference. |
| L228 / D143 | KEEP | L2 | Use clear visual hierarchy, comfortable reading widths and generous paragraph/component spacing; long prose may … | Guidelines.mdx documents prose spacing and 16px/28px; explicit design choices survive despite qualitative framing. |
| L231 / D144 | KEEP | L2 | Present short comparable facts, such as a session length and its allowed price | Guidelines neutral-chip rules preserve comparability, explicit units and wrapping; not generic chip advice. |
| L232 / D145 | KEEP | L2 | range, as separate neutral, noninteractive chips. | Guidelines neutral-chip rules preserve comparability, explicit units and wrapping; not generic chip advice. |
| L232 / D146 | KEEP | L2 | Keep units/currency explicit and allow chips to wrap on mobile. | Guidelines neutral-chip rules preserve comparability, explicit units and wrapping; not generic chip advice. |
| L234 / D147 | KEEP | L2 | Homepage feature chips use generous padding, semibold blue labels and decorative | Guidelines homepage-chip rules specify blue semibold emphasis and decorative icons distinct from neutral metadata/status. |
| L235 / D148 | KEEP | L2 | icons. | Guidelines homepage-chip rules specify blue semibold emphasis and decorative icons distinct from neutral metadata/status. |
| L235 / D149 | KEEP | L2 | Keep this emphasis distinct from neutral metadata and semantic statuses. | Guidelines homepage-chip rules specify blue semibold emphasis and decorative icons distinct from neutral metadata/status. |
| L236 / D150 | KEEP | L1 | Write visible copy in direct, specific language using the humanizer skill. | Direct product copy is a counter-default constraint; humanizer implementation is absent, so retain pending clarification instead of deleting intent. |
| L237 / D151 | KEEP | L1 | Avoid generic promises and theatrical slogans; preserve product facts and useful validation/recovery instructions. | User-confirmed copy constraints preserve recovery instructions and the existing UI language; Guidelines corroborates direct copy. |
| L237 / D152 | KEEP | L1 | Keep the current UI language unless requested. | User-confirmed copy constraints preserve recovery instructions and the existing UI language; Guidelines corroborates direct copy. |
| L239 / D153 | KEEP | L1 | Never use dots, middle dots or bullet dots as inline metadata separators. | Guidelines explicitly forbids dot metadata separators while allowing normal punctuation and provides reusable examples. |
| L240 / D154 | KEEP | L1 | Separate facts with spacing, new lines or chips. | Guidelines explicitly forbids dot metadata separators while allowing normal punctuation and provides reusable examples. |
| L240 / D155 | KEEP | L1 | Normal sentence punctuation remains allowed. | Guidelines explicitly forbids dot metadata separators while allowing normal punctuation and provides reusable examples. |
| L240 / D156 | KEEP | L1 | The reusable examples live in Storybook's usage guidelines. | Guidelines explicitly forbids dot metadata separators while allowing normal punctuation and provides reusable examples. |
| L242 / D157 | KEEP | L2 | The DevMentor wordmark uses bundled DM Mono; ordinary UI text stays in Inter. | Guidelines and bundled fonts select DM Mono for wordmark, Inter for ordinary text. |
| L243 / D158 | KEEP | L2 | The blue four-point star is the favicon. | App favicon asset and Guidelines use the blue four-point star. |
| L243 / D159 | KEEP | L2 | Technology chips retain text labels alongside decorative icons. | ui/components/mentors/TechnologyChips.tsx renders labels with decorative icons. |
| L243 / D160 | KEEP | L6 | Mentor ratings and reviews are included as presentational DS components; persistence and eligibility belong to t… | ui/components/mentors/MentorReviews.tsx is presentational; persistence/eligibility are explicitly backend responsibilities. |
| L247 / D161 | KEEP | L2 | ## Testing requirements | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L249 / D162 | KEEP | L2 | **Every new feature must have unit tests covering 100% of its new or changed | vitest.config.mts per-file thresholds are all 100; spec completion additionally depends on actually running coverage. |
| L250 / D163 | KEEP | L2 | production behavior:** statements, branches, functions, and lines, per file. | vitest.config.mts per-file thresholds are all 100; spec completion additionally depends on actually running coverage. |
| L250 / D164 | KEEP | L2 | A feature is not complete and its spec must not move to `implemented/` until `npm run test:unit:coverage` proves… | vitest.config.mts per-file thresholds are all 100; spec completion additionally depends on actually running coverage. |
| L253 / D165 | KEEP | L1 | Add each new or changed production file to `coverage.include` in | vitest.config.mts enumerates coverage.include; tooling cannot detect omitted new files or prevent agents weakening exclusions. |
| L254 / D166 | KEEP | L1 | `vitest.config.mts` in the same change. | vitest.config.mts enumerates coverage.include; tooling cannot detect omitted new files or prevent agents weakening exclusions. |
| L254 / D167 | KEEP | L1 | Coverage that only measures files imported by tests is bypassable and does not satisfy this rule. | vitest.config.mts enumerates coverage.include; tooling cannot detect omitted new files or prevent agents weakening exclusions. |
| L254 / D168 | KEEP | L1 | Do not narrow exclusions or remove a file from the coverage scope to make the gate pass. | vitest.config.mts enumerates coverage.include; tooling cannot detect omitted new files or prevent agents weakening exclusions. |
| L257 / D169 | KEEP | L2 | Unit tests live next to their source as `*.test.ts` / `*.test.tsx`. Test every | Colocated package *.test.ts/tsx files and all success/failure branches implement the explicitly required test placement/scope. |
| L258 / D170 | KEEP | L2 | success, error, validation, authorization, and edge-case branch. | Colocated package *.test.ts/tsx files and all success/failure branches implement the explicitly required test placement/scope. |
| L258 / D171 | KEEP | L1 | Every bug fix requires a regression test that fails without the fix. | A regression that fails without the fix is stronger than passing coverage; counter-default requirement remains even with CI. |
| L260 / D172 | KEEP | L2 | **Component tests.** `vitest.config.mts` keeps `environment: 'node'` and loads | vitest.config.mts defaults to node with React plugin; client tests opt into jsdom and use the installed Testing Library packages. |
| L261 / D173 | KEEP | L2 | `@vitejs/plugin-react`. *Server components* (`page.tsx`, `layout.tsx`) are async functions returning an element … | vitest.config.mts defaults to node with React plugin; client tests opt into jsdom and use the installed Testing Library packages. |
| L266 / D174 | TRIM | L1 | **Guarded pages have two mocking seams**, because `redirect()` throws a framework | Preserve both mocking seams and explicit guarded-page coverage; avoid framework-internal assertions. |
| L267 / D175 | TRIM | L1 | control-flow error instead of returning. | Preserve both mocking seams and explicit guarded-page coverage; avoid framework-internal assertions. |
| L267 / D176 | TRIM | L1 | Page tests mock `app/src/lib/session.ts`, assert the tree on the allowed path and a sentinel throw on the denied… | Preserve both mocking seams and explicit guarded-page coverage; avoid framework-internal assertions. |
| L267 / D177 | TRIM | L1 | Never assert against Next internals. | Preserve both mocking seams and explicit guarded-page coverage; avoid framework-internal assertions. |
| L267 / D178 | TRIM | L1 | The cost: every guarded `page.tsx` is a `coverage.include` entry that needs both the authorized and the redirect… | Preserve both mocking seams and explicit guarded-page coverage; avoid framework-internal assertions. |
| L272 / D179 | KEEP | L3 | Integration/browser tests **supplement but never replace unit tests** or the 100% | Coverage is a separate CI gate; integration success cannot substitute for the required unit metrics. |
| L273 / D180 | KEEP | L3 | unit-coverage requirement. | Coverage is a separate CI gate; integration success cannot substitute for the required unit metrics. |
| L273 / D181 | KEEP | L2 | Add integration coverage whenever behavior crosses the app/database/API/browser boundary. | tests/integration exercises app/database/API/browser crossings; trigger is concrete and not enforced by unit coverage. |
| L275 / D182 | KEEP | L4 | Integration tests must own their data and infrastructure. Use Testcontainers with | Integration global setup uses Testcontainers and random ports; forbidding developer/shared data and requiring teardown remain safety constraints. |
| L276 / D183 | KEEP | L4 | random ports, apply migrations, create/seed prerequisites, and clean up browser sessions, app processes, and con… | Integration global setup uses Testcontainers and random ports; forbidding developer/shared data and requiring teardown remain safety constraints. |
| L276 / D184 | KEEP | L4 | Never depend on the developer database, fixed ports, or shared/demo state. | Integration global setup uses Testcontainers and random ports; forbidding developer/shared data and requiring teardown remain safety constraints. |
| L279 / D185 | KEEP | L2 | Use the pinned local `agent-browser` executable for browser scenarios. Observe the | Pinned agent-browser 0.36.0 in package.json and tests/integration scenarios use isolated sessions, snapshots and finally cleanup. |
| L280 / D186 | KEEP | L2 | live accessibility tree first, assert semantic roles/text rather than guessed CSS, capture screenshots at key as… | Pinned agent-browser 0.36.0 in package.json and tests/integration scenarios use isolated sessions, snapshots and finally cleanup. |
| L283 / D187 | MERGE | N4 | The integration harness under `tests/integration/` is one of the two exceptions to | Configuration L142–152 already carries the same exception, inheritance purpose and zod boundary. |
| L284 / D188 | MERGE | N4 | the direct-environment-access rule (the other is `scripts/setup/` — see Configuration above): `environment.ts` m… | Configuration L142–152 already carries the same exception, inheritance purpose and zod boundary. |
| L284 / D189 | MERGE | N4 | Application and package source must still use the zod config modules. | Configuration L142–152 already carries the same exception, inheritance purpose and zod boundary. |
| L289 / D190 | KEEP | L2 | GitHub Actions runs Build, Lint, Unit tests, and Integration tests independently on every pull request. | .github/workflows/ci.yml names Build, Lint, Unit tests, Integration tests as independent jobs. |
| L289 / D191 | KEEP | L3 | A workflow result becomes merge-blocking only when the repository ruleset requires those four exact check names. | Keep the configured-check-name condition; workflow definitions alone do not prove live repository ruleset enforcement. |
| L293 / D192 | KEEP | L2 | ## Spec-Driven Development (SDD) | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L295 / D193 | MERGE | N4 | Nontrivial work in this repo is defined by a spec before it's implemented. | The check-existing/write-before-implementation requirement remains in Specs L319–321; retain the artifact root. |
| L295 / D194 | KEEP | L2 | All SDD artifacts live under `.ai/`. | The .ai artifact-root requirement survives unchanged; only the neighboring duplicate spec-first sentence is removed. |
| L298 / D195 | KEEP | L2 | .ai/<br>  specs/                  active specs<br>    implemented/          specs whose implementation has landed<br>    … | The .ai tree documents distinct active/implemented/archive/run/lesson destinations; all are repository-specific. |
| L308 / D196 | KEEP | L2 | ### Specs — `.ai/specs/` | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L310 / D197 | TRIM | N12 | Naming: `YYYY-MM-DD-slug.md`, dated the day the spec was written, `slug` a short | The filename example adds no constraint beyond the exact format, date meaning and slug casing. |
| L311 / D198 | TRIM | N12 | kebab-case description (e.g. | The filename example adds no constraint beyond the exact format, date meaning and slug casing. |
| L311 / D199 | TRIM | N12 | `2026-09-01-user-auth-refresh-tokens.md`). | The filename example adds no constraint beyond the exact format, date meaning and slug casing. |
| L312 / D200 | KEEP | L2 | Lifecycle: | Keep the lifecycle list label with its active/implemented/archive destinations. |
| L313 / D201 | KEEP | L2 | New/active work: file lives directly in `.ai/specs/`. | Active specs directly under .ai/specs/ are distinct from implemented and archive directories. |
| L314 / D202 | KEEP | L6 | Once the implementation is complete, verified, and merged: `git mv` the file into | Only completed, verified and merged implementations move specs with git mv into implemented/. |
| L315 / D203 | KEEP | L6 | `.ai/specs/implemented/`. | Only completed, verified and merged implementations move specs with git mv into implemented/. |
| L316 / D204 | KEEP | L5 | If a spec is superseded, abandoned, or no longer accurate: `git mv` it into | Superseded/abandoned/inaccurate specs go to archive/ instead of deletion; preserves recovery/history. |
| L317 / D205 | KEEP | L5 | `.ai/specs/archive/` instead of deleting it. | Superseded/abandoned/inaccurate specs go to archive/ instead of deletion; preserves recovery/history. |
| L318 / D206 | KEEP | L2 | Rules: | Keep the Rules list label so its scoped children retain their structural context. |
| L319 / D207 | KEEP | L2 | Before starting a nontrivial feature or fix, check `.ai/specs/` and | Search both active .ai/specs/ and implemented/ before nontrivial work; neither path is dead. |
| L320 / D208 | KEEP | L2 | `.ai/specs/implemented/` for a spec that already covers it. | Search both active .ai/specs/ and implemented/ before nontrivial work; neither path is dead. |
| L321 / D209 | KEEP | L1 | If none exists, write one first for anything beyond a small/obvious change. | Spec-first work beyond small obvious changes is a concrete scope trigger that may override an agent jumping to code. |
| L322 / D210 | KEEP | L6 | Never edit a spec after it has moved to `implemented/` or `archive/` — if | Implemented and archived specs are immutable; changed requirements require a new spec. |
| L323 / D211 | KEEP | L6 | requirements change, write a new spec instead. | Implemented and archived specs are immutable; changed requirements require a new spec. |
| L324 / D212 | KEEP | L2 | A spec should cover: Problem/Goal, Non-goals, Approach, Acceptance criteria. | Required Problem/Goal, Non-goals, Approach and Acceptance criteria sections define a specific minimum artifact. |
| L326 / D213 | KEEP | L2 | ### Runs — `.ai/runs/` | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L328 / D214 | KEEP | L2 | Every autonomous AI run (an agent operating on a task without a human reviewing | Exactly one run log per autonomous run in .ai/runs/ is a specific project artifact contract, not model-default behavior. |
| L329 / D215 | KEEP | L2 | each step — e.g. a workflow, an unattended long-running session) produces exactly one run log. | Exactly one run log per autonomous run in .ai/runs/ is a specific project artifact contract, not model-default behavior. |
| L331 / D216 | KEEP | L2 | Naming: `YYYY-MM-DD-slug.md`, dated the day the run happened. | Runs use YYYY-MM-DD-slug.md dated on the run day, which differs from a spec authoring date. |
| L332 / D217 | KEEP | L2 | A run log should cover: what was requested, what was done, files touched, outcome, | Run logs must include request, work, files, outcome and follow-ups; these are explicit artifact fields. |
| L333 / D218 | KEEP | L2 | and any follow-ups left for a human or a future run. | Run logs must include request, work, files, outcome and follow-ups; these are explicit artifact fields. |
| L335 / D219 | KEEP | L2 | ### Lessons — `.ai/lessons.md` + `.ai/lessons/` | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L337 / D220 | KEEP | L2 | `.ai/lessons.md` is a chronological index — one line per lesson, most recent first. | .ai/lessons.md is actually a reverse chronological one-line index; preserve its order and entry format. |
| L338 / D221 | KEEP | L2 | Short lessons can be stated inline; anything longer gets its own file in `.ai/lessons/slug.md` and is linked fro… | Long lesson write-ups use .ai/lessons/slug.md linked from the index; short inline entries are allowed. |
| L340 / D222 | KEEP | L2 | Add a lesson when: | Keep the Add a lesson when trigger list label and its three conditions. |
| L341 / D223 | KEEP | L2 | a nontrivial bug is fixed (what was wrong, why, the fix, how to avoid it again), | Nontrivial fixes require problem/cause/fix/prevention lessons; .ai/lessons.md contains concrete examples. |
| L342 / D224 | KEEP | L2 | a project-specific gotcha or convention is discovered, | Discovering a project-specific gotcha or convention independently triggers a persistent lesson. |
| L343 / D225 | KEEP | L1 | the user corrects an agent's approach in a way that should persist beyond the | User corrections must persist beyond the session; Working Rule 2 additionally defines immediate timing. |
| L344 / D226 | KEEP | L1 | current session. | User corrections must persist beyond the session; Working Rule 2 additionally defines immediate timing. |
| L345 / D227 | KEEP | L5 | Check `.ai/lessons.md` at the start of related work before repeating a known | Read .ai/lessons.md at the start of related work; the index contains root-env, ORM and build recovery paths. |
| L346 / D228 | KEEP | L5 | mistake. | Read .ai/lessons.md at the start of related work; the index contains root-env, ORM and build recovery paths. |
| L348 / D229 | KEEP | L2 | ### Enforcement | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L350 / D230 | KEEP | L6 | Use this `.ai/` structure for specs, run logs, and lessons — don't create ad hoc | Spec/run/lesson artifacts must use .ai/ rather than ad hoc scratch locations; audit deliverable reports are a different artifact type. |
| L351 / D231 | KEEP | L6 | scratch docs elsewhere in the repo for these purposes. | Spec/run/lesson artifacts must use .ai/ rather than ad hoc scratch locations; audit deliverable reports are a different artifact type. |
| L352 / D232 | MERGE | N4 | Keep the `YYYY-MM-DD-slug.md` naming convention exactly as specified above. | Specs L310–311 and Runs L331 already define exact naming; lesson detail names retain their distinct slug.md rule. |
| L354 / D233 | KEEP | L2 | ## Working Rules | Retain the existing heading/anchor structure as required by the audit skill; excluded from substantive counts. |
| L356 / D234 | CUT | N10 | Distilled from [Boris Cherny's Claude Code tips](https://ykdojo.github.io/claude-code-tips/content/boris-claude-… | Attribution and document navigation commentary add no repository behavior; no claim from the external article is needed. |
| L356 / D235 | CUT | N10 | These govern *how* you work; the SDD section above governs *what artifacts* you leave behind. | Attribution and document navigation commentary add no repository behavior; no claim from the external article is needed. |
| L361 / D236 | TRIM | L5 | **Plan first, and re-plan instead of patching.** Front-load the thinking: a | Keep replanning recovery and pre-code second opinion; remove the unmeasurable claim that detailed specs win every time. |
| L362 / D237 | CUT | N2 | detailed spec beats an ambiguous prompt every time. | No measurable artifact follows from “beats an ambiguous prompt every time”; planning and recovery remain in D236/D238. |
| L362 / D238 | TRIM | L5 | When implementation goes sideways, stop and revise the plan/spec rather than reactively troubleshooting on top o… | Keep replanning recovery and pre-code second opinion; remove the unmeasurable claim that detailed specs win every time. |
| L362 / D239 | TRIM | L5 | For high-stakes plans, get a second opinion — have a subagent review the plan as a skeptical staff engineer befo… | Keep replanning recovery and pre-code second opinion; remove the unmeasurable claim that detailed specs win every time. |
| L367 / D240 | TRIM | L1 | **Capture every correction the moment it happens.** When the user corrects your | Preserve correction timing and both destinations; root lesson policy alone does not specify before continuing. |
| L368 / D241 | TRIM | L1 | approach, write the lesson to `.ai/lessons.md` (and update this file if it's a standing rule) *before* continuin… | Preserve correction timing and both destinations; root lesson policy alone does not specify before continuing. |
| L368 / D242 | CUT | N10 | Rules that only live in the current conversation are lost; the point is that the same mistake never recurs. | Rationale repeats the purpose of the correction rule; timing and destinations survive in D240/D241. |
| L372 / D243 | KEEP | L2 | **Promote anything repeated into a skill or command.** If you find yourself doing | Repeated multistep work triggers a proposed .claude/ skill/command; retain trigger and destination, not silent creation. |
| L373 / D244 | KEEP | L2 | the same multi-step task more than a couple of times, propose codifying it as a project skill or slash command i… | Repeated multistep work triggers a proposed .claude/ skill/command; retain trigger and destination, not silent creation. |
| L377 / D245 | TRIM | L1 | **Don't ship the first draft — grill it.** Before declaring work done or moving a | Retain adversarial acceptance checks, the borderline replace-rather-than-patch constraint, and verified reporting. |
| L378 / D246 | TRIM | L1 | spec to `implemented/`, check the diff against the spec's acceptance criteria and actively try to break it. | Retain adversarial acceptance checks, the borderline replace-rather-than-patch constraint, and verified reporting. |
| L378 / D247 | KEEP | L1 | If the result is merely adequate, scrap it and implement the elegant version rather than iterating on a mediocre… | Borderline: replace rather than patch can change behavior; retain the subjective adequate/elegant constraint and surface the ambiguity. |
| L378 / D248 | TRIM | L1 | Report failures plainly; never self-report success you haven't verified. | Retain adversarial acceptance checks, the borderline replace-rather-than-patch constraint, and verified reporting. |
| L383 / D249 | TRIM | L2 | **Delegate breadth to subagents; keep the main context for judgment.** Push wide | Preserve explicit delegation authorization and scope; classify context-window sales pitch separately as CUT. |
| L384 / D250 | TRIM | L2 | searches, multi-file reads, and independent parallel work into subagents and keep only their conclusions in the … | Preserve explicit delegation authorization and scope; classify context-window sales pitch separately as CUT. |
| L384 / D251 | CUT | N10 | A clean context window is a correctness feature, not just a cost saving. | Context-window justification adds no step beyond explicit delegation in D249/D250. |
| L388 / D252 | KEEP | L4 | **Work locally; obtain explicit permission before any remote write.** Prepare | Local preparation, explicit approval for each remote-write category, and read-only/local-request boundaries remain safety constraints even when repeated. |
| L389 / D253 | KEEP | L4 | and review changes locally. | Local preparation, explicit approval for each remote-write category, and read-only/local-request boundaries remain safety constraints even when repeated. |
| L389 / D254 | KEEP | L4 | Never push commits, create or update remote PRs or issues, publish/deploy artifacts, or write changes to Figma o… | Local preparation, explicit approval for each remote-write category, and read-only/local-request boundaries remain safety constraints even when repeated. |
| L389 / D255 | KEEP | L4 | Read-only remote research remains allowed. | Local preparation, explicit approval for each remote-write category, and read-only/local-request boundaries remain safety constraints even when repeated. |
| L389 / D256 | KEEP | L4 | A request to build or edit something locally is not approval to publish it. | Local preparation, explicit approval for each remote-write category, and read-only/local-request boundaries remain safety constraints even when repeated. |
| L394 / D257 | KEEP | L4 | **Keep session materials out of commits.** Run logs, local PR drafts, working | Session logs/drafts/references/previews must stay local; staged deliverables are constrained to requested source/tests/docs. |
| L395 / D258 | KEEP | L4 | references and generated previews stay local. | Session logs/drafts/references/previews must stay local; staged deliverables are constrained to requested source/tests/docs. |
| L395 / D259 | KEEP | L4 | Review the staged file list and commit only the requested project deliverables and their required source, tests … | Session logs/drafts/references/previews must stay local; staged deliverables are constrained to requested source/tests/docs. |

</details>

## Cut lines, verbatim

These are all CUT units, including exact source spans for sentence fragments inside retained working rules. The diff is the undo buffer for TRIM and MERGE changes as well.

**L3–4 / D002 — N10**

```text
Instructions for any AI agent (Claude Code, other CLIs, autonomous runs) working in
this repository.
```

**L356–357 / D234 — N10**

```text
Distilled from [Boris Cherny's Claude Code
tips](https://ykdojo.github.io/claude-code-tips/content/boris-claude-code-tips).
```

**L358–359 / D235 — N10**

```text
These govern *how* you work; the SDD section above governs *what artifacts* you leave
behind.
```

**L361–362 / D237 — N2** (removed clause includes its lead-in from D236)

```text
Front-load the thinking: a
   detailed spec beats an ambiguous prompt every time.
```

**L369–370 / D242 — N10**

```text
Rules that only live in the current
   conversation are lost; the point is that the same mistake never recurs.
```

**L385–386 / D251 — N10**

```text
A clean context window is a
   correctness feature, not just a cost saving.
```

All six CUT candidates fail the five survival tests: none specifies a unique project action, recovery path, scope or counter-default constraint. No relevant incident was found that makes these rationales independently operative. Their adjacent planning, persistence and delegation actions remain. Recent task outputs cannot be reconstructed completely from the checkout; ablation is therefore inferential and not presented as empirical proof.

## Kept despite looking generic

| Line | Code | Why it stays |
|---|---|---|
| 39–43 | L6 | Only db may import MikroORM and UI must stay presentational; ESLint is not complete enforcement of these constraints. |
| 61–64 | L1 | No empty concept scaffolding or module runtime counters unnecessary architecture. |
| 86–92 | L1 | CLI primitives and second-consumer colocation prevent handwritten replacements and premature abstraction. |
| 136–152 | L3/L5 | Root env loading, real-environment precedence, missing-file recovery and setup exceptions encode actual integration failures. |
| 159–172 | L5 | Extensionless imports, relation thunks, singleton schemas and connect retry prevent recorded Turbopack/MikroORM failures. |
| 207–218 | L4 | CSRF, repeated page/service authorization and proxy limitations remain intact even when implemented in shared helpers. |
| 222–245 | L2 | User-confirmed copy, mobile action order, fonts, chips and dot restrictions remain despite overlap with on-demand Guidelines. |
| 249–256 | L1/L2 | 100% thresholds are enforced only for included files; the command, new-file inclusion rule and anti-bypass prohibition remain essential. |
| 266–271 | L1 | Separate page/session mocking seams prevent assertions against Next internals. |
| 275–282 | L4 | Data ownership, isolation, screenshot evidence and finally cleanup have real artifacts and consequences. |
| 367–370 | L1 | Capturing corrections *before continuing* and updating standing rules is stronger than ordinary documentation advice. |
| 379–380 / D247 | L1 | Borderline: “scrap it” rather than incrementally patch can change behavior; keep despite subjective “adequate/elegant” wording. |
| 388–397 | L4/L6 | Remote-write approval and session-material exclusions remain verbatim; no tool configuration guarantees them. |

## Open questions

- **L236:** Where is the `humanizer` skill expected to come from? No implementation was found in repository skill directories or the available external skill roots. The direct-copy rule and skill reference remain unchanged; removing the named requirement could change intended behavior.
- **L379–380:** Does the instruction to discard a “merely adequate” result reflect an incident or a deliberate preference for replacement over incremental improvement? Kept as a counter-default rule; no invented quality threshold is added.

Neither answer is required to review this conservative proposal.

## Observations

- **Routing recommendation, not applied:** At 397 lines across architecture, setup/config, HTTP/auth, UI, testing and SDD, this root is a candidate for just-in-time references. A short root could retain the package graph, approval boundaries, shared-helper requirement, test/spec gates and a trigger table; package/DB work would load ORM/config details, screens would load Guidelines and UI placement, browser work would load integration guidance, setup changes would load bootstrap details, and autonomous runs would load SDD artifact rules. Keep exact commands, constraints and incident recovery in the routed files; merely removing them would lose information. No files were moved or new routing obligations invented here.
- **Cross-file duplication, not applied:** `CLAUDE.md:3` imports `@AGENTS.md`, then lines 5–8 repeat its SDD workflow. A later cleanup can leave just the import; this proposal only rewrites the requested root target. The nested app CLAUDE importer and generated Next block remain intact.
- **Tool-enforced is not fully redundant:** `eslint.config.mjs` checks workspace aliases/framework imports, but does not prohibit all cross-package relative imports, non-db MikroORM imports, raw fetch, direct environment reads or bypassed route wrappers. `vitest.config.mts` enforces all four 100% thresholds for explicit include entries, but cannot require each changed file to be added. Preserve the missing enforcement policies rather than applying N6 to entire paragraphs.
- **Validation discrepancy, not fixed:** `.ai/agentic.config.json` validation commands run typecheck/lint/ordinary unit tests/build; they do not run unit coverage or integration. CI does run both. Ordinary configured validation alone does not satisfy the stronger root completion policy.
- **Mechanical false positives:** The analyzer reported 173 missing references, including npm package names, route URLs, templates, braces and package-relative shorthand. Its `lstrip("./")` also strips the leading dot from `.ai`, falsely marking the existing engineering-standards spec missing. It splits wrapped bullets into fragments and truncates code-block text to 400 characters (the full original graph was manually read). These flags are evidence to review, not verified dead directives. No analyzer implementation was modified.
- **Live references:** All documented npm scripts exist in `package.json`; the engineering-standards spec, events, shared HTTP/UI helpers and Storybook Guidelines exist. Next's generated app guide references resolve in installed node_modules. No confirmed dead file/command reference was cut. The unavailable humanizer dependency remains an open question.
- **Scope and verification:** A delegated read-only context review checked hierarchy/tooling and a second pass checked rewrite fidelity. That review caught scope broadening, a missing explicit server-helper instruction, and a borderline counter-default rule; these were corrected before finalizing. No production source, tests, instruction importers or installed skills were edited. No application test suite was run because this changes only documentation; artifact integrity checks verified exhaustive IDs, verdict totals, complete cut restoration text, exact diff generation and original-file preservation before approval. After approval, the rewrite was applied verbatim. The user then explicitly requested including this report and the run log in the amended commit; generated proposal files and temporary analysis remain local. No remote writes occurred.

## Proposed rewrite

The reviewed rewrite is now applied in [AGENTS.md](AGENTS.md). The complete unified diff against the original is retained below. Local proposal files `AGENTS.rewrite.md` and `AGENTS.rewrite.diff` are not included in the commit.

Review history: the explicitly invoked [eliminate-no-op skill](.agents/skills/eliminate-no-op/SKILL.md), Workflow step 5, says: “Then show a unified diff and ask whether to apply it.” The user reviewed the proposal and approved applying and committing it, then requested amending that commit with this report and the run log.

```diff
--- AGENTS.md
+++ AGENTS.rewrite.md
@@ -1,12 +1,8 @@
 # AGENTS.md

-Instructions for any AI agent (Claude Code, other CLIs, autonomous runs) working in
-this repository.
-
 ## Project

-**DevMentor** — a platform connecting developers with mentors. It is an npm-workspaces
-monorepo built on the latest Next.js + TypeScript + React.
+**DevMentor** — a platform connecting developers with mentors.

 ### Tech stack

@@ -25,32 +21,23 @@

 ### Monorepo layout

-Everything lives under `packages/*`. The dependency graph is strictly one-way:
-
-```
-app ──> core ──> db
- └────> ui
-
-packages/
-  app    @devmentor/app    Next.js host + composition root (the only package that
-                           may import every other package)
-  core   @devmentor/core   config (zod), logger (pino), awilix container, domain
-                           services. Knows about db; never imports react/next/ui.
-  db     @devmentor/db     MikroORM config, entities, migrations, seeders. The leaf —
-                           the only package that imports @mikro-orm/*. Knows nothing
-                           about the others.
-  ui     @devmentor/ui     shadcn-ui primitives + Tailwind design tokens.
-                           Presentational only — no core/db imports.
-```
-
-These boundaries are enforced by ESLint (`no-restricted-imports` in
-`eslint.config.mjs`); a cycle-introducing import fails `npm run lint`.
+Workspace packages live under `packages/*`; dependencies flow `app → core → db`
+and `app → ui`.
+
+- `@devmentor/app`: Next.js host and composition root; may import every package.
+- `@devmentor/core`: zod config, pino logger, awilix container and domain services;
+  knows db, never imports React/Next/ui.
+- `@devmentor/db`: MikroORM config, entities, migrations and seeders; imports no
+  other workspace. Only db may import `@mikro-orm/*`.
+- `@devmentor/ui`: presentational shadcn primitives and Tailwind tokens; no core/db imports.
+
+Run `npm run lint` for the dependency rules (`no-restricted-imports` in
+`eslint.config.mjs`).

 ### Domain concept convention

-Domain code is not organized into `modules/`. Each concept (`auth`, `mentors`,
-`availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`, ...) is a
-same-named sub-folder repeated across the layers that need it:
+Do not organize domain code into `modules/`. Repeat each concept name (`auth`, `mentors`, `availability`,
+`bookings`, `payments`, `messages`, `favorites`, `reviews`, ...) across layers:

 - `packages/db/src/entities/<concept>/<name>.entity.ts`
 - `packages/core/src/services/<concept>/<name>.service.ts`
@@ -58,10 +45,9 @@
 - `packages/app/src/app/api/<concept>/route.ts` and the matching `page.tsx` under
   the relevant persona route group

-Create a concept folder only when its first file is added — never scaffold empty
-ones. This is a directory convention, not a module runtime: there is no per-concept
-setup/ACL/auto-discovery. See `.ai/specs/2026-09-01-engineering-standards.md` for the
-full naming table and the payments-port/event-emitter patterns.
+Create concept folders with their first file; no empty scaffolding or per-concept
+setup/ACL/auto-discovery. Naming and payments-port/event-emitter patterns:
+`.ai/specs/2026-09-01-engineering-standards.md`.

 Event IDs follow `concept.entity.action` (e.g. `bookings.booking.created`) and are
 emitted through the typed emitter in `packages/core/src/events`, registered on the
@@ -69,46 +55,43 @@

 ### Reusable API & UI layer

-Every route and every page reuses two shared layers instead of re-implementing
-fetch/validation/auth/error-handling per feature:
+Use these shared layers; never hand-roll fetch, validation, auth, error handling or CRUD:

 - `packages/core/src/http/` — `errors.ts` (typed `AppError` hierarchy),
   `apiHandler.ts` (wraps a route: catches `AppError`s, maps to status + JSON
   envelope, logs unexpected failures), `makeCrudRoute.ts` (schema + service in,
   `{ GET, POST, PUT, DELETE }` out, for plain CRUD resources), `auth.ts`
-  (`requireSession`, `requireRole`, ownership assertions).
+  (`requireSession`, `requireRole`, ownership assertions). Services throw typed
+  `AppError`s and return DTOs, never responses. Server routes use
+  `makeCrudRoute`/`apiHandler`; no bare `try/catch` + `NextResponse.json`.
 - `packages/ui/src/backend/` — `api/apiCall.ts` (the only sanctioned `fetch()` call
   site), `forms/CrudForm.tsx`, `tables/DataTable.tsx`,
-  `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`.
+  `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`. Client pages use
+  `apiCall`/`apiCallOrThrow`, forms `CrudForm`, lists `DataTable`, and states `feedback/`.

 New reusable components have one designated home each — never scattered ad hoc:

-1. Shadcn primitive → `ui/src/components/ui/` (via `npx shadcn@latest add`, never
-   hand-written).
+1. Shadcn primitive → `ui/src/components/ui/`; never hand-write. Run
+   `npx shadcn@latest add <c>` in `packages/ui` (committed `components.json`).
 2. Generic, concept-agnostic panel pattern → `ui/src/backend/<category>/`.
 3. Component tied to one concept's domain shape → `ui/src/components/<concept>/`,
    named after the same concept folder used in `db`/`core`.
 4. Used by exactly one page → colocate next to that `page.tsx` until a second
    consumer appears.

-The API envelope (`{ ok, data }` / `{ ok, error }`) is a *shape convention*, not a
-shared type: `core/src/http` and `ui/src/backend/api` each declare their own matching
-type because `ui` must not import `core`. `/api/users` + `/admin/users/page.tsx` are
-the reference example every new concept copies. See
-`.ai/specs/2026-09-01-engineering-standards.md` for the full rationale.
+Declare matching `{ ok, data }` / `{ ok, error }` types separately in `core/src/http`
+and `ui/src/backend/api`; ui must not import core. Copy `/api/users` +
+`/admin/users/page.tsx` for new concepts. Rationale: the engineering-standards spec above.

 ### Scripts (run from the repo root)

-- `npm run setup` — one-command installer: `npm install`, `.env` from `.env.example`,
-  PostgreSQL available, migrations, seed. **Idempotent** — every step reports itself as
-  `ran` or `skipped`, an existing `.env` is never overwritten, and the dev server is
-  deliberately not started (`npm run dev` never exits). **Docker is a fallback, not a
-  requirement**: setup TCP-probes the configured address (`DATABASE_URL`, else
-  `DB_HOST`/`DB_PORT`, environment before `.env`) and reuses any PostgreSQL already
-  listening; Compose is only used when nothing answers. Implementation in
-  `scripts/setup/` (plain Node ESM, `node:*` built-ins only, so it runs on a fresh
-  clone) — pure decisions in `steps.mjs`, all I/O behind the injectable effects in
-  `effects.mjs`, ordering in `run.mjs`.
+- `npm run setup` — `npm install`, create `.env` from `.env.example`, ensure
+  PostgreSQL, migrate and seed. Idempotent: report `ran`/`skipped` per step, never
+  overwrite `.env` or start the nonterminating dev server. TCP-probe `DATABASE_URL`,
+  else `DB_HOST`/`DB_PORT` (environment before `.env`); reuse a listening PostgreSQL,
+  use Compose only if nothing answers. `scripts/setup/` uses plain Node ESM and
+  `node:*` built-ins to run before install: pure decisions in `steps.mjs`, I/O in
+  injectable `effects.mjs`, ordering in `run.mjs`.
 - `npm run dev` — start the Next.js app (`@devmentor/app`).
 - `npm run build` / `npm run start` — production build / serve (force `NODE_ENV=production`).
 - `npm run typecheck` — `tsc --noEmit` across all packages.
@@ -133,39 +116,31 @@

 - Copy `.env.example` to `.env`. `.env` is git-ignored; defaults match
   `docker-compose.yml` (`devmentor` / `devmentor` / `devmentor`).
-- The root `.env` is the only env file. Next reads env files only from
-  `packages/app/`, so `next.config.ts` loads the root one through
-  `src/lib/repo-env.ts` (`process.loadEnvFile`), as `mikro-orm.config.ts` does for the
-  CLI. A variable already set in the real environment always wins over `.env`, and a
-  missing file is ignored. The integration harness pins every documented key so a
-  developer's `.env` never leaks into a test run.
-- All env access funnels through zod schemas — `@devmentor/core` (`config/env.ts`) for
-  the app, `@devmentor/db` (`env.ts`) for the MikroORM CLI. **Nothing under `packages/`
-  reads `process.env` directly.** There are exactly two documented exceptions, both
-  outside `packages/`:
+- Use only the root `.env`. Next normally reads from `packages/app/`;
+  `next.config.ts` loads the root via `src/lib/repo-env.ts` (`process.loadEnvFile`),
+  as `mikro-orm.config.ts` does for the CLI. Real environment wins; ignore a missing
+  file. The integration harness pins every documented key to isolate developer config.
+- Read env through zod: `@devmentor/core` `config/env.ts` for the app,
+  `@devmentor/db` `env.ts` for the CLI. No direct `process.env` under `packages/`.
+  Two documented exceptions outside packages:
   - `tests/integration/environment.ts` — inherits the parent environment to pass
     ephemeral test configuration to migration/build/app child processes.
-  - `scripts/setup/effects.mjs` — `npm run setup` runs on a fresh clone *before*
-    `npm install`, so it cannot import zod. It reads `process.env`, `process.version`,
-    and `process.platform` behind the injectable `SetupEffects` adapter, and
-    re-implements the `DATABASE_URL`-over-`DB_*` precedence in `steps.mjs`
-    (`resolveDatabaseTarget`). Keep that precedence in step with the two zod schemas.
+  - `scripts/setup/effects.mjs` — before install, use no zod. Read `process.env`,
+    `process.version`, `process.platform` behind injectable `SetupEffects`. Keep
+    `steps.mjs` `resolveDatabaseTarget` (`DATABASE_URL` over `DB_*`) in sync with both schemas.

 ### Conventions & gotchas (learned the hard way — see `.ai/lessons.md`)

-- **Packages ship TypeScript source**, not built JS. They are consumed via `exports`
-  → `./src/*` and compiled by Next's `transpilePackages`. There is no per-package
-  build step.
-- **Use extensionless relative imports** inside packages (`./foo`, not `./foo.js`).
-  Turbopack does not rewrite `.js`→`.ts` the way `tsc` does; extensionless works for
-  `tsc` (bundler), Turbopack, and `tsx` alike.
+- Ship TypeScript source via `exports` → `./src/*`; Next compiles it with
+  `transpilePackages`. No per-package build step.
+- Use extensionless relative imports (`./foo`, not `./foo.js`) inside packages.
+  Turbopack cannot rewrite `.js`→`.ts`; extensionless works with tsc (bundler) and tsx too.
 - **MikroORM v7 has no decorators** in `@mikro-orm/core`. Define entities with
   `defineEntity` + the `p` (`defineEntity.properties`) builders. For cross-entity
   relations use a **per-property thunk** (`user: () => p.oneToOne(User)...`) so the
   reference resolves lazily at discovery time (avoids circular-import + wrapping bugs).
-- **Entities are registered as `globalThis` singletons** (`entities/define.ts`) so the
-  same schema object is shared across Next's RSC/SSR/route module graphs. Without this,
-  queries pass a different schema instance than was discovered and `populate` breaks.
+- Register entities as `globalThis` singletons (`entities/define.ts`) across Next's
+  RSC/SSR/route graphs; different query/discovery schema instances break `populate`.
 - **`MikroORM.init()` does not connect in v7** — `getOrm()` calls `orm.connect()`
   explicitly and does not cache a failed connection (so the app recovers if the DB
   comes back). The ORM and awilix container are cached on `globalThis` to survive HMR.
@@ -180,30 +155,19 @@
   | `app`    | `(mentee)/*`, `(mentor)/*` — signed in               | shadcn via `@devmentor/ui`, inside `AppShell`    |
   | `admin`  | `/admin/*` — operator                                | shadcn via `@devmentor/ui`, inside `AppShell`    |

-  Every `app` and `admin` layout renders `SignedInShell`
-  (`app/src/components/auth/`), which puts `AppShell` around the page with
-  `WorkspaceNav`: the links for the **union** of the user's roles, from
-  `app/src/lib/nav.ts`. A new signed-in page gets its link there — never a link to a
-  page that does not exist yet, and never one that grants a role (R07: mentors join by
-  invitation, operators by configuration). `AppShell` lives in `ui`, so it knows no
-  `Role` and no `next/link`; the app supplies the rendered links. Add shadcn
-  components with `npx shadcn@latest add <c>` run in `packages/ui` (its
-  `components.json` is committed).
+  Every app/admin layout renders `SignedInShell` (`app/src/components/auth/`) with
+  `AppShell` and `WorkspaceNav`. Add existing signed-in pages to `app/src/lib/nav.ts`
+  for the union of user roles; never add nonexistent pages or role-granting links
+  (R07: mentors by invitation, operators by configuration). App supplies rendered
+  links; ui's `AppShell` knows neither `Role` nor `next/link`.
 - Request-scoped work goes through `withScope(fn)` from `@devmentor/core`, which opens
   an awilix scope with a forked `EntityManager` and disposes it afterward.
-- **Never hand-roll fetch / validation / error-handling / CRUD.** Server routes use
-  `makeCrudRoute`/`apiHandler` (no bare `try/catch` + `NextResponse.json`); services
-  throw the typed `AppError`s and return DTOs, never build responses. Client pages
-  fetch through `apiCall`/`apiCallOrThrow` (never raw `fetch`), forms use `CrudForm`,
-  lists use `DataTable`, and loading/error/empty states use the `feedback/` components.
 - **Collection routes are non-dynamic**, so Next passes no `params` — CRUD helpers
   guard `ctx.params` before reading it.
-- **Browser-navigated vs fetched routes.** A route the browser *navigates* to (the
-  GitHub OAuth start and callback, and later the email-verification link) catches its
-  own failures and returns a redirect `Response` — typically to `/sign-in?error=…` —
-  which `apiHandler` passes through unchanged, so a user never sees a JSON envelope
-  rendered as a page. Every other route is *fetched* through `apiCall` and answers the
-  `{ ok, data }` / `{ ok, error }` envelope.
+- Browser-navigated routes (GitHub OAuth start/callback and later email verification)
+  catch failures and redirect, typically to `/sign-in?error=…`. `apiHandler` passes
+  the `Response` through so JSON is never rendered as a page. Other routes use
+  `apiCall` and the `{ ok, data }` / `{ ok, error }` envelope.
 - **State-changing routes are JSON-only.** `apiHandler` requires the
   `x-devmentor-request` header on every method other than `GET`/`HEAD`/`OPTIONS`
   (login CSRF defence), so a mutating route is called through `apiCall` or `CrudForm`,
@@ -263,12 +227,10 @@
   tree in the node environment, with no DOM or renderer. *Client components* opt in
   with a per-file `// @vitest-environment jsdom` pragma and use
   `@testing-library/react` + `@testing-library/user-event`.
-- **Guarded pages have two mocking seams**, because `redirect()` throws a framework
-  control-flow error instead of returning. Page tests mock `app/src/lib/session.ts`,
-  assert the tree on the allowed path and a sentinel throw on the denied one;
-  `session.test.ts` mocks `next/navigation` and asserts the `redirect` arguments.
-  Never assert against Next internals. The cost: every guarded `page.tsx` is a
-  `coverage.include` entry that needs both the authorized and the redirected branch.
+- `redirect()` throws: guarded-page tests mock `app/src/lib/session.ts`, assert the
+  allowed tree and a denied sentinel throw. `session.test.ts` mocks `next/navigation`
+  and checks redirect arguments, never Next internals. Include every guarded
+  `page.tsx` in coverage and cover authorized and redirected branches.
 - Integration/browser tests **supplement but never replace unit tests** or the 100%
   unit-coverage requirement. Add integration coverage whenever behavior crosses the
   app/database/API/browser boundary.
@@ -280,11 +242,6 @@
   live accessibility tree first, assert semantic roles/text rather than guessed CSS,
   capture screenshots at key assertions, and close each isolated session in
   `finally`.
-- The integration harness under `tests/integration/` is one of the two exceptions to
-  the direct-environment-access rule (the other is `scripts/setup/` — see
-  Configuration above): `environment.ts` may inherit the parent process environment
-  only to pass ephemeral test configuration to migration/build/app child processes.
-  Application and package source must still use the zod config modules.

 GitHub Actions runs Build, Lint, Unit tests, and Integration tests independently on
 every pull request. A workflow result becomes merge-blocking only when the repository
@@ -292,8 +249,7 @@

 ## Spec-Driven Development (SDD)

-Nontrivial work in this repo is defined by a spec before it's implemented. All SDD
-artifacts live under `.ai/`.
+All SDD artifacts live under `.ai/`:

 ```
 .ai/
@@ -307,8 +263,7 @@

 ### Specs — `.ai/specs/`

-- Naming: `YYYY-MM-DD-slug.md`, dated the day the spec was written, `slug` a short
-  kebab-case description (e.g. `2026-09-01-user-auth-refresh-tokens.md`).
+- Naming: `YYYY-MM-DD-slug.md`, dated when written; short kebab-case slug.
 - Lifecycle:
   1. New/active work: file lives directly in `.ai/specs/`.
   2. Once the implementation is complete, verified, and merged: `git mv` the file into
@@ -349,41 +304,27 @@

 - Use this `.ai/` structure for specs, run logs, and lessons — don't create ad hoc
   scratch docs elsewhere in the repo for these purposes.
-- Keep the `YYYY-MM-DD-slug.md` naming convention exactly as specified above.

 ## Working Rules

-Distilled from [Boris Cherny's Claude Code
-tips](https://ykdojo.github.io/claude-code-tips/content/boris-claude-code-tips).
-These govern *how* you work; the SDD section above governs *what artifacts* you leave
-behind.
-
-1. **Plan first, and re-plan instead of patching.** Front-load the thinking: a
-   detailed spec beats an ambiguous prompt every time. When implementation goes
-   sideways, stop and revise the plan/spec rather than reactively troubleshooting on
-   top of a bad foundation. For high-stakes plans, get a second opinion — have a
-   subagent review the plan as a skeptical staff engineer before you write code.
-
-2. **Capture every correction the moment it happens.** When the user corrects your
-   approach, write the lesson to `.ai/lessons.md` (and update this file if it's a
-   standing rule) *before* continuing the task. Rules that only live in the current
-   conversation are lost; the point is that the same mistake never recurs.
+1. Plan first. If implementation goes sideways, stop and revise the plan/spec.
+   For high-stakes plans, get a skeptical staff-engineer subagent review before coding.
+
+2. Before continuing after a user correction, write it to `.ai/lessons.md`; update
+   this file for a standing rule.

 3. **Promote anything repeated into a skill or command.** If you find yourself doing
    the same multi-step task more than a couple of times, propose codifying it as a
    project skill or slash command in `.claude/` instead of re-deriving the steps each
    run.

-4. **Don't ship the first draft — grill it.** Before declaring work done or moving a
-   spec to `implemented/`, check the diff against the spec's acceptance criteria and
-   actively try to break it. If the result is merely adequate, scrap it and implement
-   the elegant version rather than iterating on a mediocre base. Report failures
-   plainly; never self-report success you haven't verified.
-
-5. **Delegate breadth to subagents; keep the main context for judgment.** Push wide
-   searches, multi-file reads, and independent parallel work into subagents and keep
-   only their conclusions in the main thread. A clean context window is a
-   correctness feature, not just a cost saving.
+4. Before declaring work done or moving a spec to `implemented/`, check the diff
+   against acceptance criteria and actively try to break it. If the result is merely
+   adequate, scrap it and implement the elegant version rather than iterating on a
+   mediocre base. Report failures plainly; claim success only after verification.
+
+5. Delegate wide searches, multi-file reads and independent parallel work to
+   subagents; keep conclusions in the main thread for judgment.

 6. **Work locally; obtain explicit permission before any remote write.** Prepare
    and review changes locally. Never push commits, create or update remote PRs or
```

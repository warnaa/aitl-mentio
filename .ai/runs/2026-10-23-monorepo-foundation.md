# Run: Mentio monorepo foundation

Date: 2026-10-23
Spec: `.ai/specs/implemented/2026-10-23-monorepo-foundation.md`
Outcome: **done** (committed on branch `feat/monorepo-foundation`)

## Asked

Set up the Mentio monorepo (Next.js + TS + React, PostgreSQL + MikroORM, Awilix, Tailwind
for frontend, shadcn/ui for admin) with `packages/{app,core,db,ui}`; write AGENTS.md with
the assumptions; update README.md with architecture notes.

## Checklist

- [x] Spec drafted and confirmed (npm workspaces, `/admin`, `@mentio/*` scope)
- [x] Workspace root + tsconfig.base
- [x] packages/core (DI container, config, errors)
- [x] packages/db (MikroORM config, entity, migrations, ORM helper)
- [x] packages/ui (shadcn setup, cn, components, styles)
- [x] packages/app (move Next app, Tailwind, frontend + /admin pages, DI composition root)
- [x] AGENTS.md architecture section
- [x] README.md
- [x] lint + build pass; dev server pages checked; migrations run against local Postgres
- [x] lessons.md updated; spec moved to implemented

## Log
- Moved the single Next app into `packages/app` (copied — `git mv` of dirs fails here with
  "Invalid cross-device link"); removed starter backdrop/CSS/svgs.
- Root `package.json` with npm workspaces + forwarding scripts (`dev`, `build`, `start`,
  `lint`, `typecheck`, `db:*`); `tsconfig.base.json`; one root ESLint config.
- Bumped Next 16.3.4 → 16.4.2 and React 19.2.8 → 19.3.1 (npm audit: critical RCE in
  next ≤16.4.0). Kept TypeScript 5.9 — TS 7 has no classic JS API (Next/typescript-eslint
  need it). Remaining audit findings: transitive `braces`/`fast-glob` via awilix,
  shadcn CLI, eslint-config-next — no fix available upstream.
- `@mentio/core`: `createAppContainer` (Awilix PROXY + strict), `readEnv`/`readIntEnv`,
  error classes.
- `@mentio/db`: MikroORM 7 `createOrmConfig` (DATABASE_URL, pool env vars), `getOrm`
  singleton on globalThis, example `User` entity (`defineEntity`), CLI config with
  Migrator, initial migration (+ hand-written `down()`), `tsx` for the CLI.
- `@mentio/ui`: shadcn `components.json`, `cn`, button/card/table/badge/separator,
  theme tokens + Tailwind entry `styles.css`. Fixed CLI's bogus `cn` import/dependency.
- `@mentio/app`: Tailwind v4 via PostCSS, root env loading via `@next/env`,
  `serverExternalPackages` for MikroORM/pg, `(frontend)/page.tsx`, `admin/layout.tsx` +
  `admin/page.tsx` (dashboard via DI request scope), `server/container.ts`,
  `server/services/UserService.ts`. Build/start scripts pin `NODE_ENV=production`.
- `next dev` generated `packages/app/AGENTS.md` (Next agent-rules block) — kept, per the
  note in that block.
- Docs: AGENTS.md "Mentio — architecture and stack rules" section; README rewritten;
  `.env.example`; lessons appended.

## Follow-up

- User ran `db:migrate` (landed in `open-mercato` via shell `DATABASE_URL`); preview
  `/admin` now "Connected". Preview "Internal Server Error" was stale — fixed by refresh.
- Pinned `migrations.snapshotName` to `.snapshot-mentio` (default is per-DB name);
  removed stray `.snapshot-open-mercato.json`.

## Verification

- `npm run lint`, `npm run typecheck`, `npm run build`: pass.
- Throwaway Postgres 17 on :5433: `db:migration:create --initial`, `db:migrate`,
  `db:migrate:down`, `db:migrate`, then `db:migration:create` → "No changes required".
- `npm run start` on :3100 against that DB: `/admin` renders "Connected" + seeded user;
  pool held 2 connections across repeated requests.
- Preview dev server (:3000): `/` 200, `/admin` 200 (shows "Database unavailable" —
  it uses the sandbox's own `DATABASE_URL`, which has no Mentio schema; expected).
- Compiled CSS contains both app utilities and ui theme/utility classes.
- Not done: visual/browser screenshot review of the pages.

## Needs from you

- Provide a real `DATABASE_URL` (copy `.env.example` → `.env`) and run `npm run db:migrate`.
  Note the sandbox shell exports a `DATABASE_URL` for `open-mercato`, which overrides `.env`.

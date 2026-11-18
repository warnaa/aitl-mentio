# Railway deployment with per-PR previews

## Problem / Goal

DevMentor had no hosted environment. The root `Dockerfile` was a two-line placeholder
(`FROM alpine`, `COPY . /app`) that could not run the app, and nothing applied
migrations outside a developer machine.

Goal: run DevMentor on Railway, deploying `main` to production and opening a
throwaway preview environment, with its own database, for every pull request.

## Non-goals

- Mail, GitHub sign-in and Stripe credentials. Production needs `MAIL_API_KEY` and
  `MAIL_FROM` before it serves container-backed routes (`assertProductionConfig`);
  the owner adds them in Railway. GitHub OAuth and Stripe remain optional.
- The payment webhook endpoint and the `payments:reconcile` scheduler
  (`docs/payments-operations.md`).
- A custom domain, Postgres backups/HA, or gating deploys on CI (`checkSuites`).
- Railway Infrastructure as Code (`.railway/railway.ts`), which is in beta and is
  applied per environment, not inside PR environments created by Railway (see Approach).

## Approach

**Image.** A single-stage `node:24-bookworm-slim` Dockerfile: `npm ci`, `npm run build`,
`npm run start` with `NODE_ENV=production`. It keeps dev dependencies because the
pre-deploy step runs the MikroORM CLI and `tsx` against TypeScript migrations and
seeders. `next start` listens on Railway's `PORT`.

**Pre-deploy.** `scripts/deploy/pre-deploy.sh` runs `npm run db:migrate` before each
deployment takes traffic, and also `npm run db:seed` when `SEED_DEMO_DATA=true`. Any
failure keeps the previous deployment.

**Railway project `devmentor`.**

| Environment | Branch | Database | `SEED_DEMO_DATA` | Role |
| --- | --- | --- | --- | --- |
| `production` | `main` | own Postgres | unset | live app |
| `preview` | `main` | own Postgres | `true` | base environment for PR environments |
| `aitl-mentio-pr-<n>` | the PR branch | own Postgres, forked from `preview` | `true` | one per open PR, deleted on close |

Service `web` variables: `DATABASE_URL=${{Postgres.DATABASE_URL}}` (private network),
`APP_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}` (resolves per environment, so each PR
gets correct links), `SESSION_SECRET` (separate per environment), and
`TRUSTED_PROXY_HOPS=1` (Railway's edge appends one `X-Forwarded-For` entry). The
service settings are pre-deploy `sh scripts/deploy/pre-deploy.sh`, healthcheck
`/api/health` (120 s) and restart on failure. Production is never seeded.

**Why service settings and not a config file.** `railway.json` / `railway.toml` (Config
as Code) is deprecated and stops being read on 2026-12-01. Its replacement is IaC, which
is in beta and is applied by `railway config apply` per environment. That model has no
place for the separate seed command PR environments need. PR environments copy their
base environment instead, so the difference between preview and production lives in one
variable on the base environment, and the repository carries only the image and the
script.

## Acceptance criteria

1. `railway up` builds the Dockerfile and production reports
   `{"status":"ok","database":"up"}` at `/api/health`.
2. Production's pre-deploy log shows every migration applied and no seeder run.
3. `preview`'s pre-deploy log shows the migrations and
   `Seeder DatabaseSeeder successfully executed`.
4. PR environments are enabled with `preview` as their base and bot PRs excluded, and
   opening this PR creates a PR environment that deploys and passes its healthcheck.
5. The deployment setup and the owner's remaining steps are documented in
   `docs/deployment.md`.

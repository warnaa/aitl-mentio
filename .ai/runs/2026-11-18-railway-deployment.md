# Run: Railway deployment with per-PR previews

- **Date:** 2026-11-18
- **Request:** "use the railway cli to deploy DevMentor with all required services and
  settings enable the per-pr preview using railway"
- **Decisions by the owner:** deploy without mail for now; push a branch and open a PR;
  seed PR previews with the demo data.

## Work

- Railway project `devmentor` (workspace "Damian Tarnacki's Projects"), created with
  CLI 5.75.0: services `Postgres` (template `postgres-ssl:18`) and `web` (GitHub
  `warnaa/aitl-mentio`, branch `main`).
- `web` variables: `DATABASE_URL` reference, `APP_URL` from `RAILWAY_PUBLIC_DOMAIN`,
  generated `SESSION_SECRET` (separate in each environment, never printed),
  `TRUSTED_PROXY_HOPS=1`, `APP_NAME`, `LOG_LEVEL`, `PLATFORM_CURRENCY`.
- `web` settings set through `railway api` `serviceInstanceUpdate`: Dockerfile
  `Dockerfile`, pre-deploy `sh scripts/deploy/pre-deploy.sh`, healthcheck `/api/health`
  (120 s), restart on failure with 5 retries.
- Environment `preview` duplicated from `production`, with `SEED_DEMO_DATA=true`.
  `projectUpdate`: `prDeploys: true`, `baseEnvironmentId: preview`,
  `botPrEnvironments: false`.
- Railway domains: production <https://web-production-eb0354f1.up.railway.app>,
  preview <https://web-preview-72083626.up.railway.app>.
- Repository: a real `Dockerfile`, a `.dockerignore`, `scripts/deploy/pre-deploy.sh`,
  `docs/deployment.md`, the spec, an `AGENTS.md` router row, a development-guide link and
  a lesson. A first draft used `railway.json`. It was removed after the CLI warned that
  Config as Code stops working on 2026-12-01.

## Verification

- `railway up` of this branch to `production` succeeded (deployment `041fcf73`). The
  pre-deploy log applied all 16 migrations with no seeder. `/api/health` returned
  `{"status":"ok","environment":"production","database":"up"}`; `/`, `/sign-in` and
  `/register` returned 200.
- `/api/users` returned 500 with `MAIL_API_KEY and MAIL_FROM are required when
  NODE_ENV=production`. This is expected until the owner adds the Resend credentials.
- `railway up` to `preview` succeeded (deployment `f95227e2`): migrations ran, then
  `Seeder DatabaseSeeder successfully executed`, and the health check reported the
  database up.
- PR #106 created environment `aitl-mentio-pr-106`, which deployed from branch `feat/railway-deploy` (deployment `e6ca2223`, SUCCESS). Its pre-deploy migrated and seeded, and <https://web-aitl-mentio-pr-106.up.railway.app/api/health> reported the database up.

## Outcome

PR: #106. `main` keeps deploying the placeholder Dockerfile, which fails, until this PR
merges. Railway leaves the last good deployment (the `railway up` above) serving.

## Follow-ups

- Owner: set `MAIL_API_KEY` / `MAIL_FROM` in `production` and `preview`; optionally
  GitHub OAuth, `OPERATOR_EMAILS` and Stripe (webhook plus the reconcile scheduler).
- Consider `checkSuites: true` on `production` so `main` deploys only after CI passes.
- Revisit Railway IaC once it leaves beta. Move the spec to `implemented/` after merge.

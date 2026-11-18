# Deployment (Railway)

DevMentor runs on [Railway](https://railway.com) as the project **devmentor**. The
design and its reasons are in
[`.ai/specs/2026-11-18-railway-deployment.md`](../.ai/specs/2026-11-18-railway-deployment.md).

| Environment | Deploys | URL | Data |
| --- | --- | --- | --- |
| `production` | every push to `main` | <https://web-production-eb0354f1.up.railway.app> | real; never seeded |
| `preview` | every push to `main` | <https://web-preview-72083626.up.railway.app> | demo accounts |
| `devmentor-pr-<n>` | every push to an open PR | linked from the PR by the Railway bot | demo accounts, own database, deleted when the PR closes |

Each environment has two services: **web** (this repository, built from the root
`Dockerfile`) and **Postgres**.

## How a deployment runs

1. Railway builds the `Dockerfile`: `npm ci`, then `npm run build`.
2. Pre-deploy runs `sh scripts/deploy/pre-deploy.sh`: `npm run db:migrate`, plus
   `npm run db:seed` when `SEED_DEMO_DATA=true`. A failure stops the rollout and the
   previous deployment keeps serving.
3. `npm run start` serves the app, and traffic switches over once `/api/health`
   answers 200, within 120 seconds.

PR environments are forked from `preview`, so they inherit its variables, including
`SEED_DEMO_DATA=true`. Sign in there with the demo accounts from the
[development guide](development.md#signing-in-locally). Those passwords are public, so
never set `SEED_DEMO_DATA` in production.

## Variables on `web`

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}`, the private-network URL of the same environment |
| `APP_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}`, which resolves per environment |
| `SESSION_SECRET` | random, different in `production` and `preview` |
| `TRUSTED_PROXY_HOPS` | `1` (Railway's edge proxy) |
| `APP_NAME`, `LOG_LEVEL`, `PLATFORM_CURRENCY` | `DevMentor`, `info`, `PLN` |
| `SEED_DEMO_DATA` | `true` in `preview` only |

### Still to set by the owner

- **`MAIL_API_KEY` and `MAIL_FROM`** (Resend), in both `production` and `preview`.
  Until they are set, every route that builds the app container answers 500 with
  `MAIL_API_KEY and MAIL_FROM are required when NODE_ENV=production`. The landing page
  and `/api/health` still work.
- Optional: `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (one OAuth app per environment;
  PR URLs vary, so GitHub sign-in in PR environments is not practical),
  `OPERATOR_EMAILS`, and the Stripe variables together with the webhook and reconcile
  scheduler from [payments operations](payments-operations.md).

Set a variable in one environment with:

```bash
railway variable set MAIL_FROM="DevMentor <no-reply@example.com>" --service web --environment production
```

## Operating it

```bash
railway link --project devmentor --environment production --service web
railway logs --service web                    # runtime logs
railway up --service web --environment preview --ci   # deploy the working tree without pushing
railway connect Postgres                      # psql into the linked environment's database
```

Service settings (pre-deploy command, healthcheck, restart policy) live in Railway,
not in a config file: `railway.json` stops being read on 2026-12-01, and its
replacement, IaC (`.railway/railway.ts`), is still in beta. Change them with
`railway environment edit` or the dashboard, in `preview` as well, and update this page
in the same PR.

# 2026-11-10 — Enforce Content Security Policy on application pages (#83)

## Request

`om-auto-fix-issue 83`: ZAP Baseline alert 10038 (CSP header not set) on `/` and
`/sign-in`. Threat model T34. The issue asks for an enforced policy on public and
signed-in HTML that constrains script execution, includes `object-src` and `base-uri`,
keeps hydration, navigation, auth and payment return working in a production build,
and leaves framing to #84.

## Work

- Triage (`om-verify-in-repo`): no CSP anywhere on `origin/main` (4030689), no PR or
  commit referencing #83. Real and unfixed.
- Root cause: `next.config.ts` had no `headers()`, `proxy.ts` matched only signed-in
  surfaces, and the public pages were statically prerendered, so a nonce could not
  have reached their scripts anyway.
- Approach, following the installed Next 16 guide
  (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`):
  - `packages/app/src/lib/content-security-policy.ts`: `createNonce()` (128 random
    bits, base64) and `buildContentSecurityPolicy({ nonce, development })`.
  - `packages/app/src/proxy.ts`: a fresh nonce for each request. The policy is set on
    the forwarded request (Next extracts the nonce) and on the response. Client-sent
    values are overwritten. Path forwarding is unchanged, and the matcher now covers
    every page except `api/`, `_next/static/`, `_next/image` and `favicon.ico`.
  - `packages/app/src/app/layout.tsx`: `await connection()` so every page renders
    per request. The build now lists every route as `ƒ` (dynamic).
  - `packages/core/package.json`: narrow `./config` export so the proxy reads
    `NODE_ENV` through `getEnv` without pulling the container into the proxy bundle.
- Policy: `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'`
  (+`'unsafe-eval'` in development only)`; style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none';
  base-uri 'self'; form-action 'self'`.
  - Exceptions: `'unsafe-inline'` styles are kept because server-rendered `style`
    attributes (`Progress`, Radix) cannot carry a nonce.
  - The inventory found no third-party scripts, fonts or images. Stripe Checkout and
    GitHub OAuth are top-level navigations, and every form submits through `fetch`.
  - Not included: `frame-ancestors`, which belongs to #84 and is added in the same
    helper so both make one policy, and `upgrade-insecure-requests`, which would
    break local HTTP.
- Docs: threat model T34 control and residual updated, `packages/app/AGENTS.md`
  proxy rule updated, and a lesson added.

## Files

- `packages/app/src/lib/content-security-policy.ts` (new) and `.test.ts` (new)
- `packages/app/src/proxy.ts`, `packages/app/src/proxy.test.ts`
- `packages/app/src/app/layout.tsx`
- `packages/core/package.json`
- `tests/integration/security-headers.integration.test.ts` (new)
- `docs/security/threat-model.md`, `packages/app/AGENTS.md`, `.ai/lessons.md`

## Outcome

- Unit: 18 new or updated proxy and policy tests. Full `npm run test` passes (1843).
- `npm run typecheck`, `npm run lint` (two warnings that predate this change) and
  `npm run build` pass.
- Integration `security-headers.integration.test.ts` (5 tests) passes against the
  production build:
  - The policy is on `/`, `/sign-in` and `/register`, with a different nonce on each
    response.
  - Every `<script>` carries the header's nonce.
  - The page hydrates and client-side navigation to `/sign-in` works.
  - An injected inline `onclick` is refused.
  - No CSP violations appear in the console.
  - Signed-in `/home` (mentee), `/mentor` (mentor) and `/admin` (operator) behave
    the same way.
- Full `npm run test:integration` passes: 51 files and 111 tests, including the
  payment-return, auth and CSRF suites, all running under the policy.
- ZAP Baseline against the local production build: alert 10038 passes. The only CSP
  notes are the expected `frame-ancestors` gap (#84) and the documented
  `'unsafe-inline'` styles. Evidence is in `.ai/qa/issue-83-csp/`.
- `npm run test:integration` rewrote `packages/db/migrations/.snapshot-devmentor.json`
  (known churn); the file was restored and is not part of this change.

## Delivery

- PR #93, opened ready against `main` with `Closes #83`. The chain lock moved from the
  issue to the PR.
- Review (`om-auto-review-pr --autofix`): approve, with no blocker or major findings.
  Two minor documentation findings were fixed in `acf429d`: the `CODE_REVIEW.md` proxy
  rule and the `./config` export in `BACKWARD_COMPATIBILITY.md`. `next dev` was checked
  and hydrates with no CSP violations. The review was posted as a comment because the
  author's account cannot approve its own PR.
- Labels: `merge-queue`, `security`, `needs-qa`, `priority-high`, `risk-high`. Manual
  QA instructions are posted on the PR.
- UI QA (evidence-only): four browser checkpoints passed. Screenshots and
  `report.md`/`report.json` are in `.ai/qa/issue-83-csp/`, and the screenshots are
  also on the evidence branch `qa-evidence-pr-93`. `qa-approved` is left for a human.
- `next dev` rewrites the header of `packages/app/AGENTS.md` when it starts. The
  change was reverted and not committed.

## Follow-ups

- #84: add `frame-ancestors` in `buildContentSecurityPolicy`.
- HSTS, `nosniff`, `Referrer-Policy` and `X-Powered-By` (the rest of T34) are not
  tracked by an issue yet.

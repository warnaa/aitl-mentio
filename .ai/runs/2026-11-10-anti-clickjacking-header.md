# Run: anti-clickjacking header

**Date:** 2026-11-10. **Request:** `om-auto-fix-issue 84` — prevent cross-origin framing of application pages (ZAP alert 10020, missing anti-clickjacking header).

## Work

Root cause: `packages/app/next.config.ts` had no `headers()` policy and nothing else set `X-Frame-Options` or CSP `frame-ancestors`. `src/proxy.ts` matches only the signed-in surfaces, so it could not cover public and auth pages. Added `src/lib/security-headers.ts` (one rule, `/:path*` → `X-Frame-Options: DENY`) and wired it into `nextConfig.headers`. No embedding consumer exists, so the policy is deny-by-default. No CSP was added; the single enforced CSP from #83 owns `frame-ancestors 'none'`.

## Files

`packages/app/next.config.ts`, `packages/app/src/lib/security-headers.ts`, `packages/app/src/lib/security-headers.test.ts`, `tests/integration/security-headers.integration.test.ts`, this log, `.ai/lessons.md`.

## Outcome

The unit test (Next's own `getPathMatch`, plus the real `next.config.ts` wiring) and the integration test (`/`, `/sign-in`, `/register`, signed-out `/home` redirect, signed-in `/home`; a second loopback origin framing `/sign-in` beside a same-origin control frame) both pass. Both fail with the config change reverted: the decoy page then renders the framed sign-in form. Gate passed: typecheck, lint (0 errors), unit (216 files, 1840 tests), build. The integration run's migration-snapshot rewrite was reverted.

## Follow-ups

A local ZAP Baseline re-scan was not run in this session. #83 should add `frame-ancestors 'none'` to the enforced CSP so the two policies agree.

# Stripe module not found in the local build

## Request

`/om-prepare-issue` with a pasted Next.js build error: `Module not found: Can't resolve 'stripe'`,
raised from `packages/app/src/lib/payments/stripe-payment-gateway.ts`. The user then asked to
continue autonomously without confirmation.

## Work

- Confirmed `stripe` 23.1.0 is declared in `packages/app/package.json` and pinned in `package-lock.json`.
- Confirmed the package was absent from the local `node_modules`, so the repository was not at fault.
- Searched issues (all states) and open PRs for `stripe`, `Module not found`, `payment gateway` and
  `checkout dependency`; none reported this error.
- Ran `npm install` in the main checkout, which added the missing package.
- Verified `stripe` resolves from `packages/app` and ran the payments unit tests (5 files, 12 tests passed).

## Files

None tracked, apart from this run log. `npm install` changed only the git-ignored `node_modules`;
`package-lock.json` was unchanged.

## Outcome

Fixed locally. No issue was filed: there is no repository defect, and remote writes need explicit approval.

## Follow-ups

- `node_modules/.package-lock.json` had been rewritten after #72 landed but still lacked `stripe`.
  The cause is unknown. If the error returns after a clean install, file it as a bug.

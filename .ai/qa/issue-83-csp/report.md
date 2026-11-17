## 📸 UI QA evidence — PR #93 (enforced nonce CSP)

**Verdict: ✅ PASS (evidence-only; `qa-approved` stays with a human QA reviewer).**

Source: `tests/integration/security-headers.integration.test.ts`. It ran in a real Chrome (agent-browser) against the **production build** of this branch, with ephemeral PostgreSQL and seeded mock personas, on 2026-11-10. `acf429d` changes docs only, so the evidence applies to the PR head.

| # | Surface | Action → expected | Observed | Result |
|---|---|---|---|---|
| 1 | `/` → `/sign-in` (public) | Cold load and hydrate; an injected inline `onclick` is refused; click **Sign in** → client-side navigation; no CSP console violations | `window.next` present, inline handler did not run, window marker survived navigation, no violations | ✅ PASS |
| 2 | `/home` (mock-mentee) | Policy and nonce on the document; every `<script>` nonced; page hydrates; inline handler refused | As expected | ✅ PASS |
| 3 | `/mentor` (mock-mentor) | Same checks | As expected | ✅ PASS |
| 4 | `/admin` (mock-operator) | Same checks | As expected | ✅ PASS |

Also verified:
- `/`, `/sign-in` and `/register` get a different nonce on each response.
- `next dev` hydrates with no CSP violations (manual check during review).
- ZAP Baseline: 10038 PASS (`.ai/qa/issue-83-csp/README.md`).
- The full integration suite (51 files, 111 tests) passed under the policy, including payment return and sign-in flows.

Not exercised in a browser here: a real Stripe Checkout round trip and real GitHub OAuth. Both are top-level navigations, which CSP does not restrict. The manual QA instructions comment covers them.

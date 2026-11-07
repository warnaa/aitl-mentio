# TEXTSESSION-001: lets the two parties exchange text in the open window and refuses everyone else

- **Area:** TEXTSESSION
- **Priority:** High
- **Type:** API / integration
- **Requirement:** [Text session spec](../../specs/2026-11-07-text-session.md), issue #45 (E04-S01); rules R03, R19, R20
- **Implementation:** [TypeScript test](../../../tests/integration/text-session.integration.test.ts)
- **Executable case:** `TEXTSESSION-001 lets the two parties exchange text in the open window and refuses everyone else`
- **Prerequisites:** independent synthetic mentor and two mentees created through real mock-provider sign-in and the native fixtures; a booking confirmed through the real checkout and a signed mock-provider callback; isolated PostgreSQL, explicit payment mock and log mailer.
- **Determinism:** the app uses the real clock, so the case moves the booking's `starts_at` through the entity manager (one minute ago) instead of waiting; there are no sleeps, polling or external provider calls. Identities are unique runtime values within GitHub's 39-character login limit.

## Given-When-Then

```gherkin
Given a confirmed 25-minute booking whose start has passed, a mentee, the mentor and a third signed-in user
When the mentee and the mentor post text, and everyone reads the session through the API and the page
Then both parties see both messages in order and each as their own, the third user and a signed-out caller get nothing,
  and the page says sessions are text and shows the paste rule with no audio or video element
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Confirm the fixture booking and start it one minute ago. | Booking is `confirmed` and its window is open. |
| 2 | The mentee posts a message with padded whitespace and a CRLF; the mentor posts a reply. | Both answer 201; the body is trimmed and uses `\n`; each is attributed to its role. |
| 3 | Each party reads `GET /api/sessions/[bookingId]`. | `window: open`, the right `viewerRole`, both messages oldest first, `isOwn` true only for the reader's own; no `@` anywhere in the mentor's payload. |
| 4 | The third user reads and posts. | 404 on both, no message text in the response, still two stored rows. |
| 5 | A signed-out caller reads; a post without the CSRF header; an all-whitespace body; a 4,001-character body; a non-uuid id. | 401; 403; field error on `body`; 422; 422; still two stored rows. |
| 6 | The mentee opens `/sessions/[bookingId]`; the third user opens it; a signed-out visitor opens it. | 200 with "Sessions are text." and "Paste only what you are allowed to share. DevMentor does not check who owns it." and no `<audio>`/`<video>`; 404; a redirect to `/sign-in?returnTo=` the session address. |

## Cleanup

The fixture deletes owned session messages, notifications, payment evidence, bookings, slots, profiles, throttles and users in FK-safe order and closes the ORM. No developer database or real mail provider is touched.

## Verification and review

- **Latest execution:** Passed on 2026-11-07 with `npx vitest run --config vitest.integration.config.mts tests/integration/text-session.integration.test.ts` (2 tests). See [the run log](../../runs/2026-11-07-text-session.md) for the full gate.
- **Browser evidence:** the polling composer, the not-started, open and ended states, the 320 px layout and the stranger's not-found page were driven in a real browser; see [the PR #75 verification report](../artifacts_pr75/report.md) and its screenshots.
- **Not covered by this case:** a side-by-side screenshot comparison with prototype screen s7 (the prototype's picker did not leave its auth-gated sign-in screen; the report compares composition from source instead).
- **Human review:** pending.

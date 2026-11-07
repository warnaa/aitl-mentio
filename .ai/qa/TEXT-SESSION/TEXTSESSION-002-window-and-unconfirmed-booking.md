# TEXTSESSION-002: keeps posting inside the booked window and an unconfirmed booking closed

- **Area:** TEXTSESSION
- **Priority:** High
- **Type:** API / integration
- **Requirement:** [Text session spec](../../specs/2026-11-07-text-session.md), issue #45 (E04-S01); rules R01, R20
- **Implementation:** [TypeScript test](../../../tests/integration/text-session.integration.test.ts)
- **Executable case:** `TEXTSESSION-002 keeps posting inside the booked window and an unconfirmed booking closed`
- **Prerequisites:** independent synthetic mentor and two mentees created through real mock-provider sign-in and the native fixtures; one reserved, unpaid booking that the case later confirms through the real checkout and a signed mock-provider callback; isolated PostgreSQL, explicit payment mock and log mailer.
- **Determinism:** the case moves the booking's `starts_at` (24 and 26 minutes ago, well clear of the 25-minute boundary) instead of waiting; exact boundary millisecond cases are covered by the service unit tests with an injected clock.

## Given-When-Then

```gherkin
Given a reserved but unpaid booking, then the same booking confirmed with a future start, then started 24 and 26 minutes ago
When its parties read and post at each point
Then an unconfirmed booking is not a session, posting is refused before the start and after the end, and the transcript stays readable after the end
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Before payment, both parties read and the mentee posts. | 404 for all three; the booking is not a session yet. |
| 2 | Confirm the booking (start is in 2099) and read; the mentee posts. | `window: not_started`, no messages; 409 "This session has not started yet." |
| 3 | Start the booking 24 minutes ago and the mentee posts. | 201: still inside the 25 minutes. |
| 4 | Start the booking 26 minutes ago; the mentor posts, then reads. | 409 "This session has ended."; `window: ended` and the one earlier message is still readable. |
| 5 | Count stored messages. | Exactly one. |

## Cleanup

The fixture deletes owned session messages, notifications, payment evidence, bookings, slots, profiles, throttles and users in FK-safe order and closes the ORM. No developer database or real mail provider is touched.

## Verification and review

- **Latest execution:** Passed on 2026-11-07 with `npx vitest run --config vitest.integration.config.mts tests/integration/text-session.integration.test.ts` (2 tests). See [the run log](../../runs/2026-11-07-text-session.md) for the full gate.
- **Human review:** pending.

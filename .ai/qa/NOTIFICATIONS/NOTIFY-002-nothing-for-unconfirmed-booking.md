# NOTIFY-002: sends nothing for a booking that was never confirmed, including a mismatched paid callback held for review

- **Area:** NOTIFY
- **Priority:** High
- **Type:** API / integration
- **Requirement:** [Booking notifications spec](../../specs/2026-11-06-booking-notifications.md)
- **Implementation:** [TypeScript test](../../../tests/integration/booking-notifications.integration.test.ts)
- **Executable case:** `NOTIFY-002 sends nothing for a booking that was never confirmed, including a mismatched paid callback held for review`
- **Prerequisites:** independent synthetic mentor and two mentees created through real mock-provider sign-in and the native fixtures; isolated PostgreSQL, explicit payment mock and log mailer.
- **Determinism:** the consumer runs before the paid callback answers, so there are no sleeps, polling, retries or external provider calls. Slots start at fixed 2099 instants; identities are unique runtime values.

## Given-When-Then

```gherkin
Given a pending booking whose paid callback has a mismatched amount and is held for review
When the callback is processed
Then no notification row exists, neither participant is emailed and both notification lists are empty
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Reserve, open Checkout and deliver a paid event with a 7999 amount. | Answers 200; the booking stays pending. |
| 2 | Count notification rows, mail lines and both lists. | Zero rows, no confirmation or booking mail for either address, both lists `{ unreadCount: 0, items: [] }`. |

## Cleanup

The fixture deletes owned notifications, payment evidence, bookings, slots, profiles, throttles and users in FK-safe order and closes the ORM. No developer database or real mail provider is touched.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npx vitest run --config vitest.integration.config.mts` on the notification and sessions files (4 tests). See [the run log](../../runs/2026-11-06-booking-notifications.md) for the full-suite result.
- **Human review:** pending.

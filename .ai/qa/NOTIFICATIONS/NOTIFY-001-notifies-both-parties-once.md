# NOTIFY-001: tells the mentor and the mentee once, in the product and by email, and a replay adds nothing

- **Area:** NOTIFY
- **Priority:** High
- **Type:** API / integration
- **Requirement:** [Booking notifications spec](../../specs/2026-11-06-booking-notifications.md)
- **Implementation:** [TypeScript test](../../../tests/integration/booking-notifications.integration.test.ts)
- **Executable case:** `NOTIFY-001 tells the mentor and the mentee once, in the product and by email, and a replay adds nothing`
- **Prerequisites:** independent synthetic mentor and two mentees created through real mock-provider sign-in and the native fixtures; isolated PostgreSQL, explicit payment mock and log mailer.
- **Determinism:** the consumer runs before the paid callback answers, so there are no sleeps, polling, retries or external provider calls. Slots start at fixed 2099 instants; identities are unique runtime values.

## Given-When-Then

```gherkin
Given a confirmed booking (real checkout plus a mock-provider signed paid callback)
When the callback is accepted and then redelivered, including under a different event id
Then the mentor and the mentee each have exactly one unread notification and received exactly one email with start, length and only the other party's display name
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create personas, mentor, slot and reservation; open Checkout; deliver the paid callback. | Callback answers 200 and the booking is confirmed. |
| 2 | Read `GET /api/notifications` as each participant and read the app log mail lines for each address. | Each has one `booking_confirmed` item with the right audience, the slot start and 25 minutes; the mentee mail has subject "Your DevMentor session is confirmed", the mentor mail "A DevMentor session was booked with you"; neither mail contains the other address; the API bodies contain no `@`. |
| 3 | Redeliver the event and a distinct event for the same charge. | Both answer 200; the table still has two rows for the booking and each address still has one mail. |

## Cleanup

The fixture deletes owned notifications, payment evidence, bookings, slots, profiles, throttles and users in FK-safe order and closes the ORM. No developer database or real mail provider is touched.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npx vitest run --config vitest.integration.config.mts` on the notification and sessions files (4 tests). See [the run log](../../runs/2026-11-06-booking-notifications.md) for the full-suite result.
- **Human review:** pending.

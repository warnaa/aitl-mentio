# SESSIONS-001: lists each mentor only the sessions booked with them, and each mentee only their own

- **Area:** SESSIONS
- **Priority:** High
- **Type:** API / integration
- **Requirement:** [Booking notifications spec](../../specs/2026-11-06-booking-notifications.md)
- **Implementation:** [TypeScript test](../../../tests/integration/sessions-list.integration.test.ts)
- **Executable case:** `SESSIONS-001 lists each mentor only the sessions booked with them, and each mentee only their own`
- **Prerequisites:** independent synthetic mentor and two mentees created through real mock-provider sign-in and the native fixtures; isolated PostgreSQL, explicit payment mock and log mailer.
- **Determinism:** the consumer runs before the paid callback answers, so there are no sleeps, polling, retries or external provider calls. Slots start at fixed 2099 instants; identities are unique runtime values.

## Given-When-Then

```gherkin
Given two independent mentors, one mentee holding a booking with each, and one confirmed booking
When each mentor and mentee reads their sessions and notifications
Then each list contains only that caller's bookings and the other mentor is never told
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create mentor B (the second account), publish their slot and book it as the first mentee; confirm the booking with mentor A. | Both bookings exist; A is confirmed. |
| 2 | Read `GET /api/bookings?role=` for A, B and both mentees; ask a mentee for the mentor persona and a signed-out caller for any list. | A sees only A's booking, B only B's, the first mentee both, the second account no mentee bookings; 403 and 401 for the refused calls. |
| 3 | Read notifications for mentor A and mentor B. | A has one, B has none. |

## Cleanup

The fixture deletes owned notifications, payment evidence, bookings, slots, profiles, throttles and users in FK-safe order and closes the ORM. No developer database or real mail provider is touched.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npx vitest run --config vitest.integration.config.mts` on the notification and sessions files (4 tests). See [the run log](../../runs/2026-11-06-booking-notifications.md) for the full-suite result.
- **Human review:** pending.

# NOTIFY-003: lets a user mark only their own notifications read and denies anonymous or cross-site calls

- **Area:** NOTIFY
- **Priority:** High
- **Type:** API / integration
- **Requirement:** [Booking notifications spec](../../specs/2026-11-06-booking-notifications.md)
- **Implementation:** [TypeScript test](../../../tests/integration/booking-notifications.integration.test.ts)
- **Executable case:** `NOTIFY-003 lets a user mark only their own notifications read and denies anonymous or cross-site calls`
- **Prerequisites:** independent synthetic mentor and two mentees created through real mock-provider sign-in and the native fixtures; isolated PostgreSQL, explicit payment mock and log mailer.
- **Determinism:** the consumer runs before the paid callback answers, so there are no sleeps, polling, retries or external provider calls. Slots start at fixed 2099 instants; identities are unique runtime values.

## Given-When-Then

```gherkin
Given two participants each holding an unread notification for one confirmed booking
When the mentee marks both ids read
Then only the mentee's own notification changes; anonymous, CSRF-less and empty-id calls are refused
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Call `GET` anonymously; `POST` without the CSRF header, anonymously, and with an empty id list. | 401, 403, 401 and 422 respectively. |
| 2 | As the mentee, `POST` the mentee id and the mentor id. | 200 with `{ updated: 1 }`; the mentee unread count is 0; the mentor still has the unread item; repeating the call answers `{ updated: 0 }`. |

## Cleanup

The fixture deletes owned notifications, payment evidence, bookings, slots, profiles, throttles and users in FK-safe order and closes the ORM. No developer database or real mail provider is touched.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npx vitest run --config vitest.integration.config.mts` on the notification and sessions files (4 tests). See [the run log](../../runs/2026-11-06-booking-notifications.md) for the full-suite result.
- **Human review:** pending.

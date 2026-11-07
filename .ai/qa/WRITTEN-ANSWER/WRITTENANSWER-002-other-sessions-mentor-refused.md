# WRITTENANSWER-002: the mentor of a different session cannot post an answer to this one

- **Area:** WRITTENANSWER
- **Priority:** High
- **Type:** API / integration (data scoping)
- **Requirement:** [Written answer spec](../../specs/2026-11-07-written-answer.md) Q3 and acceptance criterion 4, issue #46 (E04-S02)
- **Implementation:** [TypeScript test](../../../tests/integration/written-answer.integration.test.ts)
- **Executable case:** `WRITTENANSWER-002 the mentor of a different session cannot post an answer to this one`
- **Prerequisites:** the WRITTENANSWER-001 fixture, plus a second mentor profile owned by the fixture's second user with its own booking (`withSecondMentorBooking`).
- **Determinism:** the booking's start is moved 30 minutes back through the entity manager so the window is `ended`; no sleeps or external calls.

## Given-When-Then

```gherkin
Given an ended, confirmed session and a different user who is the mentor of another booking
When that mentor PUTs a written answer to this session
Then the request answers 404, exactly like an unknown booking, and no answer is stored
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Confirm the booking and move its start 30 minutes back. | Window `ended`. |
| 2 | Give the second user a mentor profile and a booking of their own. | The second user is a mentor, but no party to this booking. |
| 3 | The second user `PUT`s an answer to this booking. | 404; `bookings.written_answer` stays null. |

## Cleanup

`withSecondMentorBooking` removes its profile, booking, slot and evidence; the payment fixture removes the rest.

## Verification and review

- **Latest execution:** see [the run log](../../runs/2026-11-07-written-answer.md).

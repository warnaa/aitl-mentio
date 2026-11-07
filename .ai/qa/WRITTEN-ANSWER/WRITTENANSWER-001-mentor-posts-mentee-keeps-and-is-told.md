# WRITTENANSWER-001: the mentor posts the answer, the mentee keeps it and is told once; everyone else is refused

- **Area:** WRITTENANSWER
- **Priority:** High
- **Type:** API / integration
- **Requirement:** [Written answer spec](../../specs/2026-11-07-written-answer.md), issue #46 (E04-S02); decisions D05, D03; rules R02, R19
- **Implementation:** [TypeScript test](../../../tests/integration/written-answer.integration.test.ts)
- **Executable case:** `WRITTENANSWER-001 the mentor posts the answer, the mentee keeps it and is told once; everyone else is refused`
- **Prerequisites:** independent synthetic mentor and two mentees created through real mock-provider sign-in and the native fixtures; a booking confirmed through the real checkout and a signed mock-provider callback; isolated PostgreSQL, explicit payment mock and log mailer.
- **Determinism:** the app uses the real clock, so the case moves the booking's `starts_at` through the entity manager (30 minutes ago, then 42 days ago) instead of waiting; emails are read from the app's `mail.sent` log lines written synchronously inside the request. No sleeps, polling or external provider calls. Fixture logins stay within GitHub's 39-character limit.

## Given-When-Then

```gherkin
Given a confirmed 25-minute booking, its mentor, its mentee and a third signed-in user
When the mentor tries to answer before the start, the session ends with no answer, the mentee and the third user try to answer,
  and the mentor then posts and later replaces the answer
Then posting before the start is refused, the mentee sees "still owed", the mentee is refused with 403 and the stranger with 404,
  the posted answer is shown to the mentee, the mentee gets one notification and one email without the answer text,
  replacing it tells nobody again, and the answer is still there weeks later
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Confirm the booking (start in the future); the mentor `PUT`s an answer. | 409 "You can post the written answer when the session starts." |
| 2 | Move the start 30 minutes back; the mentee reads the session API and opens the page. | `window: ended`, `answer: null`, `answerOwed: true`; the page says "The written answer is still owed." |
| 3 | The mentee `PUT`s; the third user `PUT`s; the mentor `PUT`s without the CSRF header; the mentor `PUT`s whitespace. | 403 "Only the mentor can post the written answer."; 404; 403; 422; nothing stored. |
| 4 | The mentor `PUT`s a padded CRLF answer. | 200, trimmed with `\n`; the mentee's read returns it with `answerOwed: false`; the mentee's notifications include one `answer_posted`, the mentor's none; exactly one "Your DevMentor written answer is ready" email to the mentee with the session link and without the answer text. |
| 5 | The mentor replaces the answer. | 200; still one email and one `answer_posted` row. |
| 6 | Move the start 42 days back; the mentee reads the API and opens the page. | The replaced answer is returned and rendered. |

## Cleanup

The fixture deletes owned session messages, notifications, payment evidence, bookings (with their answers), slots, profiles, throttles and users in FK-safe order and closes the ORM. No developer database or real mail provider is touched.

## Verification and review

- **Latest execution:** see [the run log](../../runs/2026-11-07-written-answer.md).

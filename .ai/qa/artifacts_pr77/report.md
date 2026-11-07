## 📸 UI verification — PR #77 (written answer, #46)

**Verdict: ✅ PASS.** Every step of the written-answer flow was exercised in a real browser against the production build of this branch, and each behaved as the spec on #76 describes, for the mentor, the mentee and a stranger.

**Environment:** the repository's own QA environment (`.ai/scripts/test-env.mjs up`): a production build of this branch at head `d4fab59`, a disposable PostgreSQL, the mock GitHub sign-in and the log mailer. It was driven with the pinned `agent-browser` in Chrome, with one isolated browser session per person. Only synthetic data appears: the seeded mentor "Ada Lovelace", the mentee "Grace Hopper" and, as the stranger, the operator "Margaret Hamilton". No real credentials, tokens or user data are in the screenshots. The booking flow is not under test here, so two confirmed bookings were inserted directly into the disposable database. Because the app uses the real clock, each booking's start was then moved with one SQL update to produce each window state.

| # | Step | Expected | Observed | Result | Screenshot |
| --- | --- | --- | --- | --- | --- |
| 1 | Mentor opens a confirmed session that starts in an hour | No answer form; "You can post the written answer when the session starts." | As expected; the message composer is disabled too | ✅ | `step-01-mentor-not-started-desktop.png` |
| 2 | Start moved 5 minutes into the past; mentor writes a three-line answer with leading/trailing spaces and literal `<error>` markup, then presses "Post written answer" | "Written answer saved.", editor shows the trimmed text, a "From you" posted card with "Posted <local time>", button becomes "Update written answer"; one email to the mentee | All observed. The app log holds exactly one `mail.sent` line: to the mentee, subject "Your DevMentor written answer is ready", with the session link and **none** of the answer text | ✅ | `step-02-mentor-posted-desktop.png` |
| 3 | Mentee opens the same session | Posted card "From Ada Lovelace", line breaks kept, markup shown as text, no editor | All observed; no `<error>` element was created in the DOM | ✅ | `step-03-mentee-sees-answer-desktop.png` |
| 4 | Mentee opens `/home` | Notification "Ada Lovelace posted the written answer for your session on <start>." with a "Read the written answer" link to the session | "New: Ada Lovelace posted the written answer for your session on 7 Nov 2026, 13:41 (Europe/Warsaw)." linking to `/sessions/<booking>` | ✅ | `step-04-mentee-notification-desktop.png` |
| 5 | Mentor replaces the answer; mentee reloads at 320 px | New text shown; still one email; no horizontal scroll | New text shown; still one `mail.sent` line; `scrollWidth` 320 = `clientWidth` 320 | ✅ | `step-05-mentee-updated-answer-mobile-320.png` |
| 6 | A second booking that ended two hours ago with no answer; mentee opens it | "This session has ended", the "Awaiting answer" chip and "The written answer is still owed." | All observed | ✅ | `step-06-mentee-still-owed-desktop.png` |
| 7 | Mentor opens that ended session | The answer editor with "Post written answer", not the old owed card | Editor and button present; no "Awaiting answer" card for the mentor | ✅ | `step-07-mentor-ended-editor-desktop.png` |
| 8 | The operator (no party to the booking) opens the first session | Standard not-found page; no answer text | "This page could not be found."; no answer text on the page | ✅ | `step-08-stranger-not-found-desktop.png` |
| 9 | Start moved 42 days into the past; mentee reopens the first session | The replaced answer is still shown, not "still owed" | Observed | ✅ | `step-09-mentee-answer-weeks-later-desktop.png` |

**⚠️ Not exercised in the browser:**
- A direct `PUT` by the mentee (403), a save before the start through the API (409) and invalid bodies (422). These are covered by `WRITTENANSWER-001/002`, the route tests and the service tests.
- Two mentor tabs racing on the same answer. This is covered by the `WrittenAnswerPanel` unit tests added in `d4fab59`.
- Dark mode and touch behaviour on a real device.
- A side-by-side capture of prototype screen s8. The card reused here is the same `WrittenAnswer` component that s8 renders. Production places it on the session screen rather than on a separate page, as the spec decided.

**Follow-up scenario:** none needed. This PR ships its own HTTP-level integration scenarios (`WRITTENANSWER-001/002`, which render the session page and assert the owed and posted text). A browser-driven variant could add step 2's live form submission if reviewers want it.

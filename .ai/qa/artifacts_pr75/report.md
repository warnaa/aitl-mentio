## 📸 UI verification — PR #75 (text session, #45)

**Verdict: ✅ PASS with one gap.** Every state of the new screen was exercised in a real browser against the production build and behaved as the spec describes. The one thing not obtained is a side-by-side screenshot of prototype screen s7 (see *Not exercised*).

**Environment:** the repository's own QA environment (`.ai/scripts/test-env-up.ps1`): production build of this branch at head `84e0b68`, a disposable PostgreSQL 17, the mock GitHub sign-in and the mock payment provider, driven with the pinned `agent-browser` 0.36.0 in Chrome. Synthetic data only (seeded mentor "Ada Lovelace" and mentee "Grace Hopper"); no real credentials, tokens or user data appear in the screenshots. The booking was confirmed through the real checkout and a mock-provider callback; because the app uses the real clock, its start time was then moved with one SQL update to produce each window state.

| # | Step | Expected | Observed | Result | Screenshot |
| --- | --- | --- | --- | --- | --- |
| 1 | Mentee opens `/sessions/<booking>` inside an open window | Header with "In Progress", the sessions-are-text line, the share rule, a composer, no audio or video control | All present; the two notices sit above the transcript | ✅ | `step-01-open-empty-desktop.png` |
| 2 | Mentee types a three-line message with a code line | Textarea keeps the text and line breaks | Kept | ✅ | `step-02-composer-filled-desktop.png` |
| 3 | Mentee sends it | Message appears as the mentee's own, composer empties and regains focus, "Message sent." is announced | All observed; the focus ring is on the empty textarea | ✅ | `step-03-message-sent-desktop.png` |
| 4 | Mentor (second browser session) opens the same session | Sees "Your mentee: Grace Hopper", the mentee's message, both notices | Observed | ✅ | `step-04-mentor-sees-message-desktop.png` |
| 5 | Mentor replies | Reply shown as the mentor's own | Observed | ✅ | `step-05-mentor-replied-desktop.png` |
| 6 | Mentee's tab, not reloaded, waits one poll interval | The mentor's reply appears | The reply text was present after about 6.5 s | ✅ | `step-06-mentee-polled-reply-desktop.png` |
| 7 | Mentee at 320 px wide | No horizontal scroll, composer reachable | `scrollWidth` 320 = `clientWidth` 320; layout stacks | ✅ (note below) | `step-07-open-mobile-320.png` |
| 8 | A signed-in user who is not a party (the seeded operator) opens the address | The standard not-found page and none of the messages | "404 This page could not be found."; no message text | ✅ | `step-08-stranger-not-found-desktop.png` |
| 8b | A signed-out visitor opens the address | Redirect to sign-in that returns to the session | `/sign-in?returnTo=%2Fsessions%2F<booking>` | ✅ | — |
| 9 | Booking start moved one hour into the future | "Upcoming", a disabled composer, the explanation, both notices | Observed; the textarea is disabled | ✅ | `step-09-not-started-desktop.png` |
| 10 | Start moved 30 minutes into the past; the open tab is left alone | The tab learns of the end from its next poll: "Ended", composer replaced by "This session has ended", transcript still readable, owed written-answer card | Observed after one poll; no Send button remains | ✅ | `step-10-ended-desktop.png` |

**Notes for reviewers**
- At 320 px the message history is a fixed-height scrollable region (the design system's `SessionTranscript`), so the newest message can sit partly below the fold of that region until it is scrolled. It is reachable and not clipped for good, but a QA reviewer may want to judge whether the height should grow on small screens.
- The "My sessions" back link above the header is rendered as plain text next to the shell's own heading of the same name; it works as a link but is not visually distinct.

**Differences from prototype s7, read from `prototypes/devmentor-journey/SessionScreens.tsx` (no screenshot comparison, see below):** the prototype has a collapsible "Session details" block (participants, date and time, timezone, duration, price), date and duration fact chips, and a conversation header with an avatar, the counterpart's role and a status chip. Production uses the design system's `SessionHeader` (title, status chip, participants and schedule inline) and the shared transcript instead, so those three elements are not reproduced one for one. The prototype's "Prototype preview" demo control is not production and is intentionally absent.

**⚠️ Not exercised**
- **Side-by-side screenshots of prototype s7.** The prototype built and served locally, but its screen picker did not leave the auth-gated sign-in screen in this session, so no valid s7 capture exists; a misleading sign-in screenshot was discarded. The comparison above is therefore from source, not from images. Spec acceptance criterion 9 is only partly met until a reviewer or a follow-up run captures s7 and compares.
- Posting after the end and the 31st post in a minute were not driven in the browser; they are covered by integration and unit tests (`TEXTSESSION-002`, service and route tests).
- Dark mode and real-device touch behaviour.

**Follow-up scenario (this change ships no browser-level test):** an `agent-browser` integration case that, with a confirmed booking whose start is moved into the past, signs the mentee and the mentor into separate sessions, posts from each, asserts the other side sees the message within one poll, then moves the start past the end and asserts "Session ended" with no Send button.

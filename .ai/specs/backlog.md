# Backlog — .ai/specs/product-brief.md, filed 2026-09-03

Tracker: https://github.com/open-mercato/ai_techleaders_project (GitHub). Filed by `om-backlog` through `om-prepare-issue`; the tracker is the authority and this file is the map from tree ids to issue numbers for humans and for the next run. Ids in titles (`E01-S02 — …`) are the durable link on re-runs.

| Id | Issue | Title | Epic | Depends on | Adopted | Iteration |
|---|---|---|---|---|---|---|
| E01 | [#26](https://github.com/warnaa/aitl-mentio/issues/26) | Accounts and roles |  |  | no |  |
| E01-S01 | [#31](https://github.com/warnaa/aitl-mentio/issues/31) | A developer or invited mentor signs in with GitHub and lands in their role's home | #26 |  | no | first (D13) |
| E01-S02 | [#32](https://github.com/warnaa/aitl-mentio/issues/32) | A user without GitHub signs in with email and password | #26 | E01-S01 (#31) | no | first (D13) |
| E01-S03 | [#33](https://github.com/warnaa/aitl-mentio/issues/33) | A signed-in user sees only their role's screens; the operator role belongs to the two founders | #26 | E01-S01 (#31) | no | first (D13) |
| E02 | [#27](https://github.com/warnaa/aitl-mentio/issues/27) | Mentors become bookable |  |  | no |  |
| E02-S01 | [#34](https://github.com/warnaa/aitl-mentio/issues/34) | An invited senior engineer accepts the invitation and gets a mentor account; there is no open registration | #27 | E01-S01 (#31) | no | first (D13) |
| E02-S02 | [#35](https://github.com/warnaa/aitl-mentio/issues/35) | A mentor fills the mentor page (public-work link, description, stack tags) and gets a share link; no ratings | #27 | E02-S01 (#34) | no | first (D13) |
| E02-S03 | [#36](https://github.com/warnaa/aitl-mentio/issues/36) | A mentor publishes slots and sees them taken as they are booked | #27 | E02-S01 (#34) | no | first (D13) |
| E02-S04 | [#37](https://github.com/warnaa/aitl-mentio/issues/37) | A mentor sets 25- and 50-minute prices within the operator's bounds | #27 | E02-S01 (#34) | no | first (D13) |
| E02-S05 | [#38](https://github.com/warnaa/aitl-mentio/issues/38) | A mentor completes Stripe Connect onboarding and sees whether payouts are enabled | #27 | E02-S01 (#34) | no | 1.1 (D13) |
| E02-S05-T01 | [#52](https://github.com/warnaa/aitl-mentio/issues/52) | Stripe Connect integration | #38 | E03-S03-T01 (#53) | no | 1.1 (D13) |
| E03 | [#28](https://github.com/warnaa/aitl-mentio/issues/28) | Booking and payment |  |  | no |  |
| E03-S01 | [#39](https://github.com/warnaa/aitl-mentio/issues/39) | A mentee finds a mentor in a list filtered by stack tag, ordered by most recent published availability; no search, no ranking | #28 | E02-S02 (#35), E02-S03 (#36) | no | 1.1 (D13) |
| E03-S02 | [#40](https://github.com/warnaa/aitl-mentio/issues/40) | A mentee picks a slot that starts at least two hours ahead and a 25- or 50-minute length at the mentor's price | #28 | E02-S03 (#36), E02-S04 (#37), E01-S01 (#31) | no | first (D13) |
| E03-S03 | [#41](https://github.com/warnaa/aitl-mentio/issues/41) | A mentee pays through Stripe Checkout; the booking is confirmed only after payment; booking-to-start is recorded | #28 | E03-S02 (#40) | no | first (D13) |
| E03-S03-T01 | [#53](https://github.com/warnaa/aitl-mentio/issues/53) | Stripe Checkout integration | #41 |  | no | first (D13) |
| E03-S04 | [#42](https://github.com/warnaa/aitl-mentio/issues/42) | The mentor and the mentee are told about a confirmed booking and each sees their upcoming sessions | #28 | E03-S03 (#41) | no | first (D13) |
| E03-S05 | [#43](https://github.com/warnaa/aitl-mentio/issues/43) | A mentee cancels free up to 24 hours before a session; a later cancellation forfeits the fee | #28 | E03-S03 (#41) | no | 1.1 (D13) |
| E03-S06 | [#44](https://github.com/warnaa/aitl-mentio/issues/44) | DevMentor keeps 20% of a paid session and the mentor's share is paid out through Stripe Connect | #28 | E03-S03 (#41), E02-S05 (#38) | no | 1.1 (D13) |
| E04 | [#29](https://github.com/warnaa/aitl-mentio/issues/29) | Session, written answer, and note |  |  | no |  |
| E04-S01 | [#45](https://github.com/warnaa/aitl-mentio/issues/45) | At the slot's start the mentee and the mentor hold a 25- or 50-minute text session in DevMentor; every session screen says sessions are text | #29 | E03-S03 (#41) | no | first (D13) |
| E04-S02 | [#46](https://github.com/warnaa/aitl-mentio/issues/46) | The mentor gives the written answer and the mentee sees it after the session | #29 | E04-S01 (#45) | no | first (D13) |
| E04-S03 | [#47](https://github.com/warnaa/aitl-mentio/issues/47) | The mentor drafts a session note and the mentee sees it awaiting approval | #29 | E04-S02 (#46) | no | first (D13) |
| E04-S04 | [#48](https://github.com/warnaa/aitl-mentio/issues/48) | The mentee approves the note in full or declines it with a comment; an approved note is kept privately by both; nothing is published | #29 | E04-S03 (#47) | no | first (D13) |
| E05 | [#30](https://github.com/warnaa/aitl-mentio/issues/30) | Operator functions in 1.0 |  |  | no |  |
| E05-S01 | [#49](https://github.com/warnaa/aitl-mentio/issues/49) | The operator invites a senior engineer from the beachhead pool in a batch of 20 and sees who published a slot within two weeks | #30 | E01-S03 (#33) | no | 1.1 (D13) |
| E05-S02 | [#50](https://github.com/warnaa/aitl-mentio/issues/50) | The operator sets the price bounds and the platform fee | #30 | E01-S03 (#33) | no | 1.1 (D13) |
| E05-S03 | [#51](https://github.com/warnaa/aitl-mentio/issues/51) | The operator resolves a quality dispute and records the outcome; no automatic refund | #30 | E03-S03 (#41) | no | 1.1 (D13) |

For the two tasks (`E02-S05-T01`, `E03-S03-T01`) the Epic column holds the parent story.

## Not filed

- E06 — Later (parked): publishing approved notes into a vault (the founders' E04-S04, E04-S05), vault subscriptions and single-note purchase (their E05), MCP access with every answer citing the mentor and the note, R11/D15 (their E10), team plans, async Q&A, transcription and AI note drafting. No vault story is written before the E00-T03 readout on 2026-11-30 (D25); D14 decides whether any of this returns. Ideas with no decision behind them (a DevMentor membership, Mentor Pro, session packs, featured placement, a premium vault-plus-AI tier) stay ideas. Non-goals bounding everything above: N01 "Video calls" (owner founder A) and N02 "A ratings or reviews profile" (owner founder A).
- The collection plan's five entries (E00-T01 benchmark, E00-T04 frequency data, mentee interviews, mentor-decliner interviews, E00-T03) were not filed; the research variant would file them as tasks under `E00 — Discovery` on request.

## Dedupe

- 59 `search-issues` queries (id prefixes plus two or three phrasings per epic and story) and one `search-prs` sweep on 2026-09-03 returned nothing; the repository had no issues before this run, so no issue was adopted.

## Labels

- Applied by `om-prepare-issue` through the tracker guards on every issue: `feature` (epics and stories) or `dependencies` (the two tasks), `priority-medium` on all 28, `risk-high` or `risk-medium` per the table's source issue; one `🤖 om-prepare-issue — 🏷️ label rationale` comment per issue explains the set.

## Open questions carried on issues

- Q18 (where the text exchange lives) on E04-S01 (#45), blocking before implementation, owner founder A.
- Q19 (first-iteration payouts) on E02-S05 (#38) and E03-S06 (#44), blocking before the first payout falls due, owner founder A with founder B.
- Q20 (mentor-page visits for D17's check) on E03-S01 (#39), blocking before 2026-11-28, owner founder A with founder B.
- Mentee vs `student` naming on E01-S01 (#31), non-blocking, decide once.

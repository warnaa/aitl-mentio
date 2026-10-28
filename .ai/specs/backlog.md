# Backlogs

## .ai/specs/product-brief.md
Backlog source: .ai/specs/product-brief.md
Last filed: 2026-10-28

Filed by `om-backlog` from the brief as refreshed and signed on 2026-10-28 (D13–D21). No real cash flow: payment, refunds and earnings run on the mock gateway (D13). Real Stripe, payouts and the terms are parked under E06 (D14). No ids are retired or reserved.

| Id | Issue | Title | Epic | Depends on | Adopted |
|---|---|---|---|---|---|
| E01 | [#8](https://github.com/warnaa/aitl-mentio/issues/8) | Mentor page and discovery | — | — | no |
| E02 | [#9](https://github.com/warnaa/aitl-mentio/issues/9) | Book and pay | — | — | no |
| E03 | [#10](https://github.com/warnaa/aitl-mentio/issues/10) | Mentor decides | — | — | no |
| E04 | [#11](https://github.com/warnaa/aitl-mentio/issues/11) | The text session | — | — | no |
| E05 | [#12](https://github.com/warnaa/aitl-mentio/issues/12) | Mentor earnings | — | — | no |
| E06 | [#13](https://github.com/warnaa/aitl-mentio/issues/13) | Later (parked) | — | — | no |
| E01-S01 | [#14](https://github.com/warnaa/aitl-mentio/issues/14) | A mentor can publish a page with their public work and a description, and gets a share link | #8 | E01-S01-T01 #24 | no |
| E01-S02 | [#15](https://github.com/warnaa/aitl-mentio/issues/15) | A mentor can set one rate per 25 minutes, and the page shows both session prices | #8 | E01-S01 #14 | no |
| E01-S03 | [#16](https://github.com/warnaa/aitl-mentio/issues/16) | A mentor can publish time slots, and mentees see the bookable ones | #8 | E01-S01 #14 | no |
| E01-S04 | [#17](https://github.com/warnaa/aitl-mentio/issues/17) | A mentor can opt into the public list, and mentees find them there | #8 | E01-S01 #14 | no |
| E02-S01 | [#18](https://github.com/warnaa/aitl-mentio/issues/18) | A signed-in mentee can see the price, pick a slot, write the question and pay (simulated) | #9 | E01-S02 #15, E01-S03 #16, E01-S01-T01 #24 | no |
| E03-S01 | [#19](https://github.com/warnaa/aitl-mentio/issues/19) | A mentor can accept or decline a paid question before the session; a decline is refunded at once | #10 | E02-S01 #18 | no |
| E02-S02 | [#20](https://github.com/warnaa/aitl-mentio/issues/20) | A mentee can cancel a booking, and the refund follows the cancellation rule | #9 | E02-S01 #18, E03-S01 #19 | no |
| E04-S01 | [#21](https://github.com/warnaa/aitl-mentio/issues/21) | At the slot time, the mentee and the mentor can hold a 25- or 50-minute text session | #11 | E03-S01 #19 | no |
| E04-S02 | [#22](https://github.com/warnaa/aitl-mentio/issues/22) | A session that didn't happen is settled by fault the next time either side opens it | #11 | E04-S01 #21 | no |
| E05-S01 | [#23](https://github.com/warnaa/aitl-mentio/issues/23) | A mentor can see what they earned per session: price minus Mentio's commission | #12 | E04-S02 #22, E02-S02 #20 | no |
| E01-S01-T01 | [#24](https://github.com/warnaa/aitl-mentio/issues/24) | Accounts and sign-in for mentors and mentees | #14 (story) | — | no |
| E02-S01-T01 | [#25](https://github.com/warnaa/aitl-mentio/issues/25) | Payments port with the mock gateway | #18 (story) | — | no |

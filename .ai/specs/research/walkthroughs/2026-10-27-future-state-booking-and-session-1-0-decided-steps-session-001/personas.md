# Personas — DevMentor

Basis: `.ai/specs/research/walkthroughs/2026-10-27-future-state-booking-and-session-1-0-decided-steps-session-001/inputs/product-brief.md` (Product, Target group, Problems, Key flows, Business rules), `research/2026-08-20-interview-working-dev.md`, `research/2026-09-02-interview-platform-dev-solves-alone.md`, `research/walkthroughs/2026-10-27-future-state-booking-and-session-1-0-decided-steps-session-001/inputs/decisions/` (D07, D09, D21, D22, D27) and `research/decisions/N01-no-video.md` · Built 2026-10-27 · Stance default: adversary
Panel composition: two segments from the brief's Target group, one seat each. Proportions are assumed: the brief states there is no data on the share of either situation. Held out for the parity check and not used here: `research/2026-09-01-interview-backend-dev-fintech.md`.
Coverage: 26 persona lines — 24 sourced, 2 assumed
Homogeneity flag: each segment rests on a single interview note, so each persona is one voice; a second persona per segment would be an assumption persona.

## P01 — mentee blocked on a TypeScript error the day before a release

Runs: 1
- Segment and share of the panel: urgent release blocker, one of two seats; share assumed `[ASSUMPTION]` brief, Target group (no proportions)
- Situation the problem shows up in: a TypeScript generics error the day before a release, at a mid-size product company, with the team's only senior on leave `[INTERVIEW]` 2026-08-20-interview-working-dev.md
- State of mind at entry — anxious and rushed, because the release is tomorrow and 40 minutes of searching produced two contradictory answers `[INTERVIEW]` 2026-08-20-interview-working-dev.md
- How much this topic matters to them: central `[INTERVIEW]` 2026-08-20-interview-working-dev.md ("half a day, and I still don't trust that code")
- Goal, in their words: "someone who has actually done this looks at my code and tells me what to do, within the hour" `[INTERVIEW]` 2026-08-20-interview-working-dev.md
- Success, as they would recognise it: an answer they trust from someone who has done it, instead of a workaround with a TODO `[INTERVIEW]` 2026-08-20-interview-working-dev.md
- Constraints — time: within the hour; money: "I'd pay for speed, not for a subscription"; who pays and who decides: no basis `[INTERVIEW]` 2026-08-20-interview-working-dev.md
- Tools they already use for this: Stack Overflow, a Discord community; a paid course last year `[INTERVIEW]` 2026-08-20-interview-working-dev.md
- Words they use: "an answer", "speed", "looks at my code"; set against "course" and "subscription" `[INTERVIEW]` 2026-08-20-interview-working-dev.md
- Objections they will raise: courses are "generic, and outdated by the time I finished"; anything sold as a subscription `[INTERVIEW]` 2026-08-20-interview-working-dev.md
- What they will not do: buy a course or a subscription to get one answer ("I don't want a course, I want an answer") `[INTERVIEW]` 2026-08-20-interview-working-dev.md
- Traits the material supports: impatient with slow help; indifferent to video ("text is fine, faster") `[INTERVIEW]` 2026-08-20-interview-working-dev.md
- The reason this person would not switch: when help is not fast, the workaround is already the default — they shipped one with a TODO `[INTERVIEW]` 2026-08-20-interview-working-dev.md
- No basis for: who pays (self or employer), a price they would accept, tolerance for creating an account, the hour of day they get stuck, how they judge a stranger's expertise. Fill with: an interview with an employed mentee about their last paid help, and what a mentor page must show.

## P02 — platform engineer whose coding-agent lint setup broke, nothing shipping

Runs: 1
- Segment and share of the panel: low-urgency problem solved alone or internally, the seat for whom the topic barely matters; share assumed `[ASSUMPTION]` brief, Target group (no proportions)
- Situation the problem shows up in: at a payments company of about 200 people, the coding agent stopped applying the team's lint rules; nothing was shipping that day `[INTERVIEW]` 2026-09-02-interview-platform-dev-solves-alone.md
- State of mind at entry — unhurried and indifferent, glancing at the clock, because "nic się nie paliło" `[INTERVIEW]` 2026-09-02-interview-platform-dev-solves-alone.md
- How much this topic matters to them: barely ("raz w roku może") `[INTERVIEW]` 2026-09-02-interview-platform-dev-solves-alone.md
- Goal, in their words: work it out alone — "doszedłbym sam. doszedłem" `[INTERVIEW]` 2026-09-02-interview-platform-dev-solves-alone.md
- Success, as they would recognise it: the problem solved without involving anyone; paid help only for a once-only task that would cost a day, found in five minutes and done within an hour `[INTERVIEW]` 2026-09-02-interview-platform-dev-solves-alone.md
- Constraints — who pays: the company only ("nie płacę za rzeczy do pracy sam"); alternative: an internal channel where "zawsze ktoś jest" `[INTERVIEW]` 2026-09-02-interview-platform-dev-solves-alone.md
- Tools they already use for this: the internal company channel, books, conferences; is the person others ask ("kogo. to mnie pytają") `[INTERVIEW]` 2026-09-02-interview-platform-dev-solves-alone.md
- Words they use: "nic się nie paliło", "co szybsze", "na firmę" `[INTERVIEW]` 2026-09-02-interview-platform-dev-solves-alone.md
- Objections they will raise: no need for a platform for this; a subscription means never reopening it `[INTERVIEW]` 2026-09-02-interview-platform-dev-solves-alone.md
- What they will not do: pay for work help out of their own pocket; reopen a product that is a subscription `[INTERVIEW]` 2026-09-02-interview-platform-dev-solves-alone.md
- Traits the material supports: judges a helper by what they have built or by a referral from someone they know; would tell people if it is good `[INTERVIEW]` 2026-09-02-interview-platform-dev-solves-alone.md
- The reason this person would not switch: an internal channel of 200 people and solving it alone already cover the need `[INTERVIEW]` 2026-09-02-interview-platform-dev-solves-alone.md
- No basis for: any price, how their company approves an expense, sign-in preference, how they would judge a mentor list. Fill with: an interview with an engineer at a large company about the last time they expensed outside help.

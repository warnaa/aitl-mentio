# Mentio — product brief

- Date: 2026-10-28
- Rule updates: 2026-10-30 — R22 records the approved review correction and supersedes R20's unbounded started-payment hold; R21 remains active.
- Mode: own; Owner: Damian (founder C, also the maintainer); Pass: refresh (2026-10-28) of the full pass of 2026-10-27, recording Damian's answers on the draft booking spec; 2026-10-29: R20 and R21 added from the E02 spec's decision round (R18 and R19 are held for the E01 spec's proposals, not yet entered)
- Evidence basis: research recorded in August–September 2026 for DevMentor (Mentio's former name) by founders A and B and imported into this repository: seven interviews (four potential mentees, three senior engineers who mentor), one programming Discord community (a 14-day export of 109 help threads and a 54-response survey of stated intentions), five competitor pages checked on 2026-09-04, and a list of 50 candidate mentors, none contacted. No new research has arrived since 2026-10-27; this refresh adds decisions only. The first build serves Polish mentors and mentees (D10); five of the seven interview notes are recorded in Polish (the 2026-08-20 and 2026-08-22 notes are in English and give no language or country), while the Discord export and survey come from an English-speaking community, so their numbers are context, not evidence about Polish mentees. Nobody has booked, paid or been invited yet. Damian chose to build with the three biggest beliefs untested (D08); the most consequential is that mentors can answer within the hour mentees say they need (A01).
- Coverage: 86 claims — 81 sourced (interview 16, data 7, document 51, product 2, benchmark 5), 0 synthetic, 5 assumed; 2 entries on the collection plan
- Synthetic hypotheses outside Coverage: 0
- Definition of Ready signed by: Damian, 2026-10-28, with A01–A03 accepted untested (D08); ready for: implementation planning of the first build (Now), on the mock payment gateway (D13)
- Sources: `.ai/specs/research/` (interviews, board exports, Discord export and survey, benchmark checks, mentor list, `decisions/`); `.ai/specs/implemented/2026-10-23-engineering-standards.md`; `.ai/specs/2026-10-27-book-a-paid-text-session.md` (draft booking spec, source of R10–R17)

## Decision summary

Agreed (Damian, 2026-10-27, refreshed 2026-10-28): Mentio's first build is a paid, text-only 25- or 50-minute session with a senior engineer about one specific problem, booked into a time slot the mentor published (D01, D09), for Polish mentors and mentees paying in PLN (D10). Mentees find the mentor through the mentor's own link or a public list that mentors choose to join (D02).

Mentees with a deadline and no senior to ask lose hours or days, and community help often doesn't come: a fifth of Discord help threads got no reply. Senior engineers already answer the same questions for free, from private notes. See Problems and Target group.

The paid notes library, coding-tool access and subscription that the August workshop aimed at are deferred (D01). None of the four potential mentees asked for saved answers, and three said no to a subscription. The earlier choices of no video and no ratings (N01, N02) come from the imported material; Damian adopted them (D03).

The first build stays within the engineering standards (D13, closing Q11), except that the `student` role is renamed `mentee` (D21). The draft booking spec had recorded three departures as approved; Damian turned all three down:
- Payment runs through the mock gateway only, so no real money moves in this build. Real Stripe Checkout and Connect must replace it before mentors take real paid bookings, through a spec that approves that change; invited mentors may publish priced pages on the mock build before then (D14).
- A mentor sets one rate per 25 minutes within 90–600 PLN; a 50-minute session costs twice the rate (R08, replacing R05). Mentio keeps a configurable 20% (R06).
- Nothing runs on a timer. A decline is refunded at once; a mentor no-show or an unaccepted booking is settled when either side next opens the booking, so "the same day" is no longer guaranteed, against the freelancer's request for a same-day refund (R09, replacing R07).

Damian also adopted the booking spec's rules as R10–R17 (D17): a 10-minute no-show rule, booking from 2 hours to 14 days ahead, free cancellation until 12 hours before an accepted slot, a Polish-only interface, and one unpaid booking per mentee at a time, among others. Mentees sign in before paying (D18), against one mentee's stated objection, and notifications are in-app only (D19). "Fast enough" is measured as payment-to-first-reply, with no target yet (D07; Q07 stays open). Damian owns the terms of service, which must exist before the first real payment (D06) and cover the booking spec's legal and support points (D20).

The gap between need and scope: mentees described needing help within 20 minutes, within the hour, or the same day. Booked slots (D09) can meet the urgent case only when a mentor has published a slot soon enough, and booking stops 2 hours before a slot (R11), so the first build serves the same day or later.

What could change this: nobody knows whether mentors will publish slots at the hours mentees get stuck, or reply fast (A01); whether mentors will publish a priced page at all (A02); or whether mentees will pay a stranger, since only 3 of 54 survey respondents ever have (A03). Damian chose to build with these untested (D08); that is a decision to take the risk, not evidence. A02 can be tested on the first build; A03 only once real Stripe exists (D14). If the mentor conversations show A01 or A02 false, the first build's scope is revisited (D08).

Next: write the accounts and sign-in spec and the mentor pages and slots spec, which the booking spec depends on, and revise the draft booking spec to D13–D21; then build the first version on the mock gateway. Before mentors take real paid bookings: real Stripe through its own spec (D14) and the terms (D06, D20). In parallel, invite the first mentors from the 29 with a warm contact and ask when, how fast and at what price they would answer (collection plan 1). Owner and date are not set.

## Vision

The team's intended direction: a mentee stuck on one specific problem gets a paid text answer from a senior engineer who has done exactly that, and the engineer is paid for help they now give for free. `[DOCUMENT]` research/decisions/D01-sessions-first.md

## Target group and stakeholders

- Customer (pays): the freelancer would pay "poniżej 200" zł from their own pocket. `[INTERVIEW]` research/2026-09-02-interview-freelancer-react.md
- Customer: the fintech backend engineer interviewed as a mentee would pay himself, "chyba", rather than explain an expense to the company. `[INTERVIEW]` research/2026-09-01-interview-backend-dev-fintech.md
- Customer: survey answer to "who would have paid": own pocket 24, employer if asked 13, employer without asking 6, client 2, nobody 9 (of 54). `[DATA]` research/2026-09-04-survey-discord-willingness-to-pay.md
- Customer: a platform engineer at a 200-person company, interviewed as a potential mentee, pays nothing personally for work help ("nie płacę za rzeczy do pracy sam"). `[INTERVIEW]` research/2026-09-02-interview-platform-dev-solves-alone.md
- User (mentee): an employed or freelance programmer with one specific blocker and a deadline. Three accounts: a release the next day, a Monday release, an estimate due Friday. `[INTERVIEW]` research/2026-08-20-interview-working-dev.md, research/2026-09-01-interview-backend-dev-fintech.md, research/2026-09-02-interview-freelancer-react.md
- User (mentee): help threads by stack over 14 days: Python 28, TypeScript 23, AI agents 18, React 16, other 13, Node 11. Where stated, posters were employed 37, freelance 21, student 10 (41 unknown). `[DATA]` research/2026-09-04-discord-help-requests.csv
- Beachhead stacks (TypeScript, React, Python, AI agents, English-speaking) are the founders' choice. `[DOCUMENT]` research/2026-09-02-miro-board-vision-target-needs.md
- First build: Polish mentors and mentees, paying in PLN; the English-speaking beachhead waits. `[DOCUMENT]` research/decisions/D10-polish-market-pln.md
- User (mentor): a senior engineer who already answers repeated questions unpaid. Three were interviewed; see Problems. 50 candidates are listed: 29 reachable through a founder, public work found for 33, and none contacted yet. `[DATA]` research/2026-09-04-mentor-list.csv
- Stakeholders: Stripe is the only allowed payment provider. `[DOCUMENT]` research/2026-08-26-workshop-export.md
- Stakeholders: mentees pay through Stripe Checkout and mentors are paid through Stripe Connect, from launch; the first build uses a mock payment gateway. `[DOCUMENT]` research/decisions/D14-real-stripe-before-launch.md
- Stakeholders: nobody held terms of service or legal in the RACI. `[DOCUMENT]` research/2026-09-05-miro-board-raci-matrix.md
- Stakeholders: Damian now owns the terms of service. `[DOCUMENT]` research/decisions/D06-terms-owner.md
- Decider for scope decisions: Damian (founder C). Damian adopted the decisions recorded by founders A and B (D03).

## Problems, with evidence

- A mentee stuck before a release, with the team's only senior on leave, spent 40 minutes searching, got two contradictory answers on Discord and shipped a workaround: "half a day, and I still don't trust that code." `[INTERVIEW]` research/2026-08-20-interview-working-dev.md
- A fintech mentee's staging ingress broke on a Friday evening. He searched for an hour; colleagues were away and a Discord answer came on Saturday, wrong. He rolled back and the release slipped to Tuesday. Frequency unknown: one Friday. `[INTERVIEW]` research/2026-09-01-interview-backend-dev-fintech.md
- A freelancer estimated a migration they had never done at that scale, got "it depends" on Discord, and underquoted by about a week of unpaid time. `[INTERVIEW]` research/2026-09-02-interview-freelancer-react.md
- Community help is slow or absent. Of 109 help threads in 14 days, 23 got no human reply. The median first reply among the rest was 67 minutes. 31 threads mentioned urgency, and 9 of those got no reply. 35 ended with the poster saying it was solved, 20 partly. `[DATA]` research/2026-09-04-discord-help-requests.csv (2026-08-18 to 31; topic, urgency and resolution labels by one moderator)
- Not every potential mentee has the problem: the platform engineer solved a half-day problem alone and asks 200 colleagues internally. He would pay only for a rare, expensable one-off. `[INTERVIEW]` research/2026-09-02-interview-platform-dev-solves-alone.md
- Asked about their last time stuck, 7 of 54 survey respondents could not remember one, 30 named this week or this month, and 3 had ever paid someone. `[DATA]` research/2026-09-04-survey-discord-willingness-to-pay.md
- Mentors answer the same questions unpaid, pasting from a private notes file: "two evenings a month, for free, and the notes rot." `[INTERVIEW]` research/2026-08-22-interview-mentor.md
- A senior Python engineer gets weekly DMs with the same three questions, has never charged ("faktury. nie"), and says the notes doc "to jest całe value". `[INTERVIEW]` research/2026-09-03-interview-senior-python-meetups.md
- A staff engineer turned down a monthly mentoring platform: "nie chcę relacji. chcę odpowiedzieć na pytanie i mieć spokój." `[INTERVIEW]` research/2026-09-03-interview-staff-engineer-declined-before.md
- Finding and booking help must be quick: "jak booking trwa więcej niż pięć minut to robię rollback i idę do domu", and no account and email verification first ("nie że zakładam konto, weryfikacja maila"). `[INTERVIEW]` research/2026-09-01-interview-backend-dev-fintech.md
- The platform engineer would pay a person only if he found them "w pięć minut" and it was done within the hour. `[INTERVIEW]` research/2026-09-02-interview-platform-dev-solves-alone.md
- The need, stated without a product: a mentee with one blocker and a deadline wants someone who has done exactly that to look at it within 20 minutes to the same day, in text. That mentors want to be paid for this is a hypothesis (A02).

## Product and how it stands out

- What it is: a paid text session with a senior engineer about one specific problem, sent up front; see Scope. `[DOCUMENT]` research/decisions/D01-sessions-first.md
- What makes it different: mentors show public work, not ratings (N02). In the survey, 41 of 54 would pick someone by what they have built or written, and 12 by ratings. `[DATA]` research/2026-09-04-survey-discord-willingness-to-pay.md
- That this difference wins mentees over is a hypothesis; see A03.
- Price context for the R08 bounds, none of it priced in PLN for a 25- or 50-minute session: the freelancer would pay "poniżej 200" zł from his own pocket; whether per conversation or per solution was not asked. `[INTERVIEW]` research/2026-09-02-interview-freelancer-react.md
- Price context: asked what they would have paid for an answer within an hour, over text, survey respondents in an English-speaking community said nothing 17, up to 25 EUR 14, 25–50 EUR 12, 50–100 EUR 8, more than 100 EUR 3 (of 54). `[DATA]` research/2026-09-04-survey-discord-willingness-to-pay.md

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|
| Codementor | request-to-live-session is the whole product; rates $15–80 per 15 min on React cards | transactional, nothing kept; every card shows 5.0, so ratings carry no information | 2026-09-04 | https://www.codementor.io/react-experts `[BENCHMARK]` |
| MentorCruise | free intro call before paying; mentor card with "from" price | monthly subscription from $100/month, the relationship a mentor refused | 2026-09-04 | https://mentorcruise.com/ `[BENCHMARK]` |
| Topmate | one link per expert; 10% commission on own-link sales, 20% via its marketplace | any profession; a stranger with a blocker cannot find the expert | 2026-09-04 | https://topmate.io/pricing `[BENCHMARK]` |
| Preply | 25/50-minute lessons; free cancellation up to 12 h before | language tutoring on recurring subscriptions; star ratings on every card | 2026-09-04 | https://preply.com/en/how-it-works `[BENCHMARK]` |
| ADPList | booking in minutes; session count shown as a trust signal | free, so mentors earn nothing; career help more than code | 2026-09-04 | https://adplist.org/ `[BENCHMARK]` |

## Goals and success criteria

- Business goal: not set for the first build. The board's goals (100 mentors with published vaults, 30% of mentees subscribed) were written for the deferred library model (D01); see Q04. Mentio earns a 20% commission per paid session (R06).
- User outcome: a mentee with one blocker gets a text answer from someone who has done it, fast enough to matter. They said within 20 minutes, within the hour, and the same day. Under booked slots (D09), Now serves the same day or later. `[INTERVIEW]` research/2026-09-01-interview-backend-dev-fintech.md, research/2026-08-20-interview-working-dev.md, research/2026-09-02-interview-freelancer-react.md
- Primary metric, baseline today, threshold, date: time from payment to the mentor's first reply, recorded for every session; no threshold or date until the first mentor conversations report (A01). `[DOCUMENT]` research/decisions/D07-outcome-check.md
- For comparison, free help in the Discord export: median first reply 67 minutes, 21% unanswered (see Problems); not a baseline for paid sessions.
- What must not get worse: nothing from a session is published without the mentee's approval (R02).

## Scope

- **Now:** one complete session, with payment and refunds simulated by the mock payment gateway (D13).
  - A mentor page with public work, a plain description of what they have done, a rate within the bounds (R08), published time slots and a share link; mentors can choose to join a public list (D02, D09, N02).
  - The mentee sees the price on the mentor page, picks a slot, signs in, writes the question and pays through the payment gateway (R03, R11, R17, D09, D18).
  - The mentor sees the question on their sessions page and accepts or declines it; a decline is refunded at once, and a booking not accepted by the slot's start counts as declined (R09, R12, D19). The mentee can cancel under R14.
  - At the slot time, a 25- or 50-minute text session (R01, N01). A mentor no-show is refunded and a mentee no-show pays the mentor (R09, R10). Afterwards the mentor's earnings are recorded: the price minus Mentio's commission (R06).
  - The time from payment to the mentor's first reply is recorded for every session (D07; see Q07).
- **Before launch, not in the first build:** real Stripe Checkout and Connect replace the mock gateway through their own spec (D14), bringing payouts after Connect setup (R06, D11, D12, R16), card and BLIK (R15) and Stripe's fee on refunds (R13); the terms of service exist before the first real payment and cover the legal and support points the booking spec raises (D06, D20).
- **Later:** the mentor's notes library, asking it from a coding agent, subscriptions and 24-hour async questions (D01).
- **Settled against the engineering standards:** the standards plan a mock payment gateway with Stripe as a stretch goal, compute the price as `mentor.rate × duration`, and rule out background workers. The first build follows all three (D13), and renames the `student` role `mentee` (D21); the draft booking spec, which assumed the opposite, must be revised to match. `[PRODUCT]` .ai/specs/implemented/2026-10-23-engineering-standards.md
- **Not discussed in this pass:** rescheduling, favourites, and messages outside a session, which are planned screens in the engineering standards. The same plan's reviews screen (M06) and reviews API contradict N02. `[PRODUCT]` .ai/specs/implemented/2026-10-23-engineering-standards.md
- **Not doing:** see Non-goals.

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|
| Mentor | A senior engineer who publishes a mentor page and answers paid questions | mentor | everyone |
| Mentee | The person who pays for a session to get one specific problem answered; in the research, the people interviewed or surveyed about getting help and the posters in the Discord help threads | mentee | mentor of their session |
| Slot | A start time the mentor publishes; a mentee books one for a session | mentor | mentee, mentor |
| Session | A paid 25- or 50-minute text exchange about one question the mentee writes before paying, held at a booked slot | Damian | mentee, mentor |
| Mentor page | A mentor's public page: public work, description, a rate per 25 minutes within the bounds (R08), published slots and share link | mentor | everyone with the link; the list when the mentor opts in |
| Notes library | A mentor's paid collection of notes, called the "vault" in the research; deferred (D01) | mentor | not built |

## Key flows

- Current state: search, docs, a community post, waiting, then a workaround, rollback or wrong estimate (see Problems). `[INTERVIEW]` research/2026-08-20-interview-working-dev.md, research/2026-09-01-interview-backend-dev-fintech.md
- Future state, "Book a paid text session":
  1. The mentee opens a mentor's link, or finds the mentor on the list (D02).
  2. They read the mentor's public work and price (N02, R08).
  3. They pick one of the mentor's published slots. `[DOCUMENT]` research/decisions/D09-booked-time-slots.md
  4. They sign in, write the question and pay before the session (R03, D18).
  5. The mentor sees the question before the session starts and accepts or declines it; a decline is refunded at once (R09, R12). `[DOCUMENT]` research/decisions/D16-settle-on-next-visit.md
  6. At the slot time, the session runs in text for 25 or 50 minutes (R01).
  7. The mentor's earnings are recorded as their price minus 20%; from launch they are paid through Stripe Connect minus Stripe's fees, once their Connect setup is done (R06, D11, D12, D14). No-shows follow R09 and R10. `[DOCUMENT]` research/decisions/D15-rate-per-25-minutes.md

## Business rules

| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R01 | Sessions are 25 or 50 minutes | every session | `[DOCUMENT]` research/2026-08-26-workshop-export.md ("bookable in a lunch break") | active (adopted, D03) | unknown | superseding row approved by Damian | Damian | none |
| R02 | Nothing from a session is published without the mentee's approval | session content, the future notes library | `[DOCUMENT]` research/2026-08-26-workshop-export.md ("trust is the product") | active (adopted, D03) | unknown | superseding row approved by Damian | Damian | none |
| R03 | The mentee sees the price before writing the question and pays before the session | booking, checkout | `[DOCUMENT]` research/decisions/D01-sessions-first.md (confirmed option text) | active | if refunds under R09 (formerly R07) become a support load | superseding row approved by Damian | Damian | none |
| R04 | Each mentor sets their own price | mentor page, checkout | `[ASSUMPTION]` research/2026-09-03-interview-senior-python-meetups.md, research/2026-09-03-interview-staff-engineer-declined-before.md; the workshop left per-mentor vs platform pricing open | superseded | none | none | Damian | none |
| R05 | Each mentor sets their own 25- and 50-minute prices in PLN, within Mentio's bounds: 90–600 PLN for 25 minutes, 180–1,200 PLN for 50 minutes at launch | mentor page, checkout | `[DOCUMENT]` research/decisions/D05-pricing-and-commission.md | superseded by R08 (D15, 2026-10-28) | none | superseding row approved by Damian | Damian | R04 |
| R06 | Mentio keeps a configurable commission, 20% at launch, taken from the mentor's price on every paid session: the mentee pays the price shown; the mentor receives the rest minus Stripe's processing and payout fees, through Stripe Connect once their Connect setup is done | checkout, payouts | `[DOCUMENT]` research/decisions/D05-pricing-and-commission.md, research/decisions/D11-stripe-fees-from-mentor-share.md, research/decisions/D12-connect-before-first-payout.md | active | if mentors object or own-link bookings dominate | superseding row approved by Damian | Damian | none |
| R07 | A session that doesn't happen is settled by fault: a mentor's decline or no-show is refunded to the mentee automatically, the same day; a mentee's no-show pays the mentor | booking, refunds, payouts | `[DOCUMENT]` research/decisions/D04-no-show-and-decline.md | superseded by R09 (D16, 2026-10-28) | none | superseding row approved by Damian | Damian | none |
| R08 | Each mentor sets one rate in PLN per 25 minutes, within Mentio's bounds of 90–600 PLN at launch; a 25-minute session costs the rate and a 50-minute session twice the rate | mentor page, checkout | `[DOCUMENT]` research/decisions/D15-rate-per-25-minutes.md | active | when invited mentors react to the rate or the bounds | superseding row approved by Damian | Damian | R05 |
| R09 | A session that doesn't happen is settled by fault: a mentor's decline is refunded to the mentee at once; a mentor no-show or an unaccepted booking (R12) is refunded when either side next opens the booking or session; a mentee's no-show pays the mentor. Nothing runs on a timer | booking, refunds, payouts | `[DOCUMENT]` research/decisions/D16-settle-on-next-visit.md | active | if refunds arrive late in practice, or with the spec that brings real Stripe (D14) | superseding row approved by Damian | Damian | R07 |
| R10 | A session counts as held if the mentor posts within 10 minutes of the slot's start; otherwise it is a mentor no-show, refunded under R09. A mentee who never opens a held session is a mentee no-show, and the mentor is paid | session, refunds | `[DOCUMENT]` research/decisions/D17-adopt-booking-spec-rules.md (BR1; no research basis for 10 minutes) | active | if no-shows become a support load | superseding row approved by Damian | Damian | none |
| R11 | A slot can be booked from 2 hours to 14 days before its start | booking | `[DOCUMENT]` research/decisions/D17-adopt-booking-spec-rules.md (BR2; no research basis) | active | when the mentor conversations show what availability mentors would publish | superseding row approved by Damian | Damian | none |
| R12 | A paid booking the mentor has not accepted by the slot's start counts as declined and is refunded under R09 | booking, refunds | `[DOCUMENT]` research/decisions/D17-adopt-booking-spec-rules.md (BR3) | active | if bookings are declined for lack of a response | superseding row approved by Damian | Damian | none |
| R13 | Mentio absorbs Stripe's fee on any refund; the mentee always gets the full price back. Applies once real Stripe exists (D14) | refunds | `[DOCUMENT]` research/decisions/D17-adopt-booking-spec-rules.md (BR4) | active | if refunds become a cost problem | superseding row approved by Damian | Damian | none |
| R14 | A mentee cancels free until the mentor accepts; after acceptance, free up to 12 hours before the slot; a later cancellation counts as a mentee no-show | booking, refunds | `[DOCUMENT]` research/decisions/D17-adopt-booking-spec-rules.md (BR5; the 12 hours follow Preply's rule, checked 2026-09-04) | active | if cancellations become a support load | superseding row approved by Damian | Damian | none |
| R15 | The first build's interface is Polish only; payment is by card and BLIK once real Stripe exists (D14) | every screen, checkout | `[DOCUMENT]` research/decisions/D17-adopt-booking-spec-rules.md (BR6) | active | when the English-speaking beachhead is taken up (D10) | superseding row approved by Damian | Damian | none |
| R16 | A mentor's earnings are held until their Connect setup is done; cases unclaimed after 90 days go to Damian | payouts | `[DOCUMENT]` research/decisions/D17-adopt-booking-spec-rules.md (BR7; no research basis for 90 days) | active | if held payments pile up | superseding row approved by Damian | Damian | none |
| R17 | A mentee can have only one unpaid booking at a time, so nobody can hold many slots without paying | booking | `[DOCUMENT]` research/decisions/D17-adopt-booking-spec-rules.md (BR8; the agent's proposal, accepted) | active | if mentees report being blocked by it | superseding row approved by Damian | Damian | none |
| R20 | An unpaid booking holds its slot for 30 minutes from its creation; after that the slot is bookable again and the booking no longer counts under R17. A payment already started holds the slot until it resolves | booking, checkout | `[DOCUMENT]` .ai/specs/2026-10-29-book-and-pay.md (original gate Q3 = a; 30-minute value informed by prior Stripe knowledge, not re-checked research) | superseded by R22 (2026-10-30) | none | superseding row approved by Damian | Damian | none |
| R21 | A booking's commission is the R06 rate in force when its payment starts, stored on the booking; a later change to the rate does not alter existing bookings | checkout, earnings | `[DOCUMENT]` .ai/specs/2026-10-29-book-and-pay.md (gate Q5 = a) | active (approved 2026-10-29) | when R06's rate first changes | superseding row approved by Damian | Damian | none |
| R22 | Retain the 30-minute unpaid hold; unconfirmed payment cannot hold past the session's start. Success confirmed before the start becomes a paid reservation under existing cancellation/decline rules. At the deadline an unconfirmed reservation no longer counts under R17; an authorized mutation commits its ended state and release independently of gateway availability. Recover its old charge later and fully refund success without reviving the booking. No timers run | booking, checkout, recovery | `[DOCUMENT]` .ai/specs/2026-10-29-book-and-pay.md; .ai/runs/2026-10-29-book-and-pay-spec-corrections.md (Damian's instruction to apply every review finding; recorded 2026-10-30) | active (review-correction instruction approved; recorded 2026-10-30) | if deadline/recovery behavior blocks mentees, or with the real Stripe spec (D14) | superseding row approved by Damian | Damian | R20 |

## Non-goals

| Id | We are not building | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|
| N01 | Video calls; sessions are text, and every session screen says so | workshop constraint; the first mentee interviewed (2026-08-20): "text is fine, faster". The survey split text 33, call 9, depends 12; the freelancer wants a call for estimates | Damian (adopted, D03) | active | unknown | superseding record approved by Damian | `[DOCUMENT]` research/decisions/N01-no-video.md | none |
| N02 | Ratings or a reviews profile; every mentor page links to public work instead | "my GitHub is my profile"; all three mentors rejected ratings; two mentees called them meaningless ("każdy ma pięć gwiazdek", "kazdy ma 4.9") | Damian (adopted, D03) | active | unknown | superseding record approved by Damian | `[DOCUMENT]` research/decisions/N02-no-ratings.md | none |

## Decisions

| Id | Date | Decision | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
| D01 | 2026-10-27 | The first build is paid text sessions; the notes library, coding-tool access and subscription wait | Mentees asked for fast answers; none asked for saved ones and three refused a subscription; only mentors value notes. Considered: library first (the workshop's aim) and sessions plus a small library. The agent's recommendation, accepted | Damian | active | when mentors and mentees have been asked about the library | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D01-sessions-first.md | none |
| D02 | 2026-10-27 | Mentees find mentors through the mentor's own link and a public list that mentors opt into | The link fits mentors who bring an audience or refuse a list; the list serves mentees who know no mentor. Considered: link only | Damian | active | if invited mentors decline over the list, or it stays empty | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D02-link-and-opt-in-list.md | none |
| D03 | 2026-10-27 | Mentio adopts N01, N02, R01 and R02, recorded for DevMentor by founders A and B, with Damian as owner | Each protected decision needs an owner in Mentio who can approve a change; wording and reasons unchanged. Considered: leaving them under founder A | Damian | active | unknown | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D03-adopt-imported-decisions.md | none |
| D04 | 2026-10-27 | Adopt R07: a session that doesn't happen is settled by fault | Mentees want a same-day refund, mentors want paid on a no-show; the mentor sees the question first, so a decline costs the mentee nothing. Considered: always refund the mentee. The agent's recommendation, accepted | Damian | superseded by D16 (2026-10-28) | none | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D04-no-show-and-decline.md | none |
| D05 | 2026-10-27 | Adopt R05 and R06: mentor prices within PLN bounds, a configurable 20% taken from the price, Stripe Checkout for payment and Stripe Connect for payouts | Mentors want control over price; the rate and bounds are Damian's business choice, not measured. Considered: a split cut by channel, no cut yet, a fixed platform price, a cut added on top | Damian | active, except its R05 part, superseded by D15 (2026-10-28) | if mentors object to the cut | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D05-pricing-and-commission.md | R04 |
| D06 | 2026-10-27 | Damian owns the terms of service for mentors and mentees | Real payments need terms; nobody held legal | Damian | active | when a legal owner is found | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D06-terms-owner.md | none |
| D07 | 2026-10-27 | Check "fast enough" by recording payment-to-first-reply per session; set the target after the mentor conversations | No basis for a number yet (A01). Considered: setting a target now. The agent's recommendation, accepted | Damian | active | when collection plan 1 reports | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D07-outcome-check.md | none |
| D08 | 2026-10-27 | Build the first version with A01, A02 and A03 untested; run the mentor conversations in parallel | A decision to take the risk, not evidence. Considered: holding implementation tickets until the conversations report | Damian | active | when collection plan 1 reports | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D08-build-with-untested-risks.md | none |
| D09 | 2026-10-27 | A session is booked into a time slot from the mentor's published availability and starts at that time | Damian's choice. Considered: starting on the mentor's acceptance (the agent's recommendation, not taken) and offering both. The first build serves the same day or later, not within the hour | Damian | active | when the mentor conversations show what availability mentors would publish | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D09-booked-time-slots.md | none |
| D10 | 2026-10-27 | The first build is for Polish mentors and mentees, paying in PLN; the English-speaking beachhead waits | Damian's choice. Considered: the English-speaking beachhead in PLN or in EUR | Damian | active | when the English-speaking beachhead is taken up | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D10-polish-market-pln.md | none |
| D11 | 2026-10-27 | Stripe's processing and payout fees come out of the mentor's share (refines R06) | Damian's choice. Considered: Mentio's 20% covering them | Damian | active | if invited mentors object | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D11-stripe-fees-from-mentor-share.md | none |
| D12 | 2026-10-27 | A mentor finishes Stripe Connect setup only before their first payout | A mentor refused bank details before anyone booked him. Considered: before taking bookings. The agent's recommendation, accepted | Damian | active | if held payments pile up | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D12-connect-before-first-payout.md | none |
| D13 | 2026-10-28 | The first build stays within the engineering standards: a mock-only payment gateway, price as `mentor.rate × duration`, no timed jobs (closes Q11) | Damian turned down the three departures the draft booking spec had recorded as approved (real Stripe now, two set prices, a scheduled sweep); Damian answers Q11 as decider and maintainer. The departures were the agent's proposal | Damian | active | with the spec that brings real Stripe (D14) | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D13-stay-within-engineering-standards.md | none |
| D14 | 2026-10-28 | Real Stripe Checkout and Connect replace the mock gateway before mentors take real paid bookings, through a spec that approves that departure; invited mentors may publish priced, bookable pages on the mock build before then | Considered: no real money in the first build, with Stripe moved to Later | Damian | active | when that spec is written | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D14-real-stripe-before-launch.md | none |
| D15 | 2026-10-28 | Adopt R08 (one rate per 25 minutes) in place of R05; the rest of D05 stands: a configurable 20% taken from the price (R06), Stripe as the provider (from D14) | Follows D13's `rate × duration`; R05's bounds carry over exactly. Considered: a rate per hour or per minute. Mentors can no longer price 50 minutes other than at double | Damian | active | when invited mentors react to the rate or the bounds | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D15-rate-per-25-minutes.md | D05 (R05 part only) |
| D16 | 2026-10-28 | Adopt R09 in place of R07: fault-based settlement unchanged, with time-dependent cases settled when either side next opens the booking | No timed jobs (D13). Considered: the mentee reports a no-show; both. The agent's recommendation, accepted. "The same day" is no longer guaranteed, against the freelancer's stated request for a same-day refund (2026-09-02) | Damian | active | if refunds arrive late in practice | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D16-settle-on-next-visit.md | D04 |
| D17 | 2026-10-28 | Adopt the draft booking spec's BR1–BR8 as R10–R17, with Damian as owner (closes Q05, Q06, Q08, Q09, Q12) | Proposed by the spec for Damian's approval; BR8 was the agent's own proposal. Values have no research basis | Damian | active | each rule's own trigger | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D17-adopt-booking-spec-rules.md | none |
| D18 | 2026-10-28 | Mentees sign in before paying (closes Q10 with R15) | The spec's proposal, accepted. Against it, one mentee rejects creating an account and verifying an email before help (2026-09-01). Considered: paying without an account | Damian | active | if mentees drop out between the mentor page and payment | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D18-sign-in-before-paying.md | none |
| D19 | 2026-10-28 | Notifications are in-app only in the first build; no email | Confirmed from the spec's gate. Considered: email to the mentor on a new paid question. Relies on mentors checking their page (A01); R12 bounds the cost | Damian | active | if bookings are declined for lack of a response | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D19-in-app-notifications-only.md | none |
| D20 | 2026-10-28 | The booking spec's legal and support points (the 14-day withdrawal right against R14, holding money for mentors without Connect under R16, a support contact for failed refunds) are handled within the terms (D06), not as a separate gate | Considered: separate conditions before real bookings | Damian | active | when a legal owner is found (D06) | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D20-legal-points-within-terms.md | none |
| D21 | 2026-10-28 | The session role `student` is renamed `mentee`, the only change to the engineering standards in the first build | One name for one role, matching the glossary; the spec's record, confirmed. Considered: keeping `student` in code | Damian | active | unknown | superseding row approved by Damian | `[DOCUMENT]` research/decisions/D21-mentee-role-name.md | none |

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | Mentors will publish slots soon enough, at the hours mentees get stuck, and reply quickly within them `[ASSUMPTION]` indirect material only | high | No mentor was asked about availability or response time. Indirectly: the staff engineer would answer "między spotkaniami", and in the interview itself replied within an hour, with the substantive answer the next morning at 7:40; the Python mentor spends about ten minutes per answer, "jak mam humor", most evenings; his availability was not asked. 40 of 109 help threads were posted 10:00–13:59, but the fintech case was Friday 18:00 | Under booked slots (D09) the urgent case is served only when a slot is published soon enough; otherwise help comes later than the same day | Ask the first invited mentors which hours they could cover and how fast they would reply; compare with when help threads are posted | pending | unknown | accepted untested (D08) |
| A02 | Senior engineers will publish a page and take paid one-off text questions `[ASSUMPTION]` from two mentor interviews | high | Two of three said maybe ("w sumie czemu nie", "to bym może zrobiła"); none has been contacted. The staff engineer: with no bookings for a month, "zapomnę, że to istnieje" | No supply, so no product | Invite a first batch from the 29 warm contacts; count who publishes a page with a price. Can run on the first build, on the mock gateway (D14) | pending | unknown | accepted untested (D08) |
| A03 | Mentees will pay a stranger for a session `[ASSUMPTION]` from stated intentions | high | 37 of 54 said they would pay something, but 3 of 54 ever have. The fintech mentee guessed 50 EUR, 100 "jak naprawdę naprawi", after "nie wiem"; the interviewer read it as a shrug | Sessions earn nothing | A real booking paid in Stripe by someone from a mentor's audience; stated intent does not count. Possible only once real Stripe replaces the mock gateway (D14) | pending | unknown | accepted untested (D08) |
| A04 | An opt-in list does not put off mentors who refuse to be listed `[ASSUMPTION]` | medium | One refused to be listed next to strangers; one would join only alongside people they know | Fewer of the most wanted mentors join | Count opt-ins and refusals in the first batch | pending | unknown | untested |

## Kill criteria

Not decided. Damian chose to build with A01–A03 untested (D08) but has not said which results of the mentor conversations or of the first paid bookings would stop or change the sessions-first build, or by when.

## Hypotheses to test

None. The one synthetic panel in `research/walkthroughs/` walked the DevMentor demo brief, whose booking rules differ from this one, and produced no finding that repeated; nothing from it is imported here.

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | What happens when the mentor or the mentee doesn't show up, or the mentor declines the question? The freelancer wants a same-day refund; the Python mentor wants to be paid anyway | no longer | Damian | closed 2026-10-27: settled by fault (D04, R07; now D16, R09) |
| Q02 | How does Mentio earn: a commission on each session (the board says 15–20%; Topmate takes 10% via own link, 20% via its marketplace), and who sets prices (R04)? | no longer | Damian | closed 2026-10-27: mentor prices within bounds, 20% taken from the price (D05, R05, R06; R05 now R08, D15) |
| Q03 | Does Mentio adopt N01, N02, R01 and R02, made by founders A and B for DevMentor, with Damian as owner? | no longer | Damian | closed 2026-10-27: adopted with Damian as owner (D03) |
| Q04 | What is the business goal of the first build, and who owns terms of service for mentors and mentees? | terms: closed 2026-10-27, Damian owns them (D06). Goal: no, but kill criteria depend on it | Damian | open (goal only) |
| Q05 | What counts as a no-show: how long after the slot starts does the other side wait before R07 applies? | no longer | Damian | closed 2026-10-28: 10 minutes (R10, D17) |
| Q06 | What is the minimum time between booking and a slot's start, and how far ahead can mentors publish slots? | no longer | Damian | closed 2026-10-28: 2 hours to 14 days ahead; unaccepted by the start counts as declined (R11, R12, D17) |
| Q07 | Under booked slots, payment-to-first-reply (D07) mostly measures how far ahead mentees book, not how fast mentors answer. Keep it, or measure from the slot's start to the first reply? | no for tickets, which record both times; yes for what the outcome check means | Damian | open |
| Q08 | Who bears Stripe's fees on a refunded session (a decline or a mentor no-show)? | no longer | Damian | closed 2026-10-28: Mentio absorbs it (R13, D17) |
| Q09 | What happens to a mentee's payment if a mentor never finishes Connect setup? | no longer | Damian | closed 2026-10-28: earnings held until Connect setup; unclaimed after 90 days go to Damian (R16, D17) |
| Q10 | Does a mentee need an account before paying, and in which interface language does the first build ship? One potential mentee rejects creating an account and verifying email before help; another would pay only if he found someone within five minutes | no longer | Damian | closed 2026-10-28: mentees sign in before paying; Polish interface only (D18, R15) |
| Q11 | The engineering standards plan a mock payment gateway (Stripe as a stretch goal), price as `mentor.rate × duration`, and no background workers; Now needs real Stripe Checkout and Connect, two set prices (R05) and a timed same-day refund (R07). Who approves the departure? | no longer | Damian, with the maintainer | closed 2026-10-28: no departure in the first build; real Stripe before launch through its own spec (D13, D14) |
| Q12 | What happens to the payment when a mentee cancels a booked slot before it starts? | no longer | Damian | closed 2026-10-28: free until accepted, then up to 12 hours before the slot (R14, D17) |

## Definition of Ready addendum (own)

Problems and Target group have real support: seven interviews, a 14-day help-thread export and a survey, all from one community and network, and all stated or observed before Mentio existed. Five of the seven interview notes are recorded in Polish, matching D10; the other two give no language or country; the export and survey come from an English-speaking community, so for Polish mentees they are context, not evidence. No new research arrived for this refresh. Paying behaviour is not supported (A03), and the speed mentors can offer is unknown (A01). Damian accepted A01–A03 untested for the first build (D08); that acceptance does not supply the missing evidence. Now is decided (D01, D02, D13), its money rules are set (R06, R08–R17), its outcome check is named (D07), the protected decisions and the terms have an owner (D03, D06), and no open question blocks it: Q11 is closed by D13, which keeps the first build within the engineering standards, and Q05, Q06, Q08, Q09, Q10 and Q12 are closed by D17 and D18. Q07 needs Damian before the outcome is judged, not before tickets. The draft booking spec still describes the three departures Damian turned down; it must be revised to D13–D21 before it is implemented, and the accounts and the mentor-pages specs it depends on do not exist yet. Now does not meet the "within the hour" need (D09, R11); that is a scope choice, recorded in the summary. Ready for: implementation planning of Now on the mock payment gateway, including invited mentors publishing pages (A02's test). Not ready: taking real paid bookings, which waits on the spec that brings real Stripe (D14) and on the terms (D06, D20); setting a success target or stop rule, which waits on collection plan 1 and Q04.

## Collection plan

### When, how fast and at what price would the first mentors answer?

- What decision or work needs it: A01 and A02, the target for D07, the R08 bounds, and whether "within the hour" can be promised
- Who can answer it: the first batch of candidates from the 29 with a warm contact (`research/2026-09-04-mentor-list.csv`)
- How: an invitation conversation per mentor covering the slots they would publish, expected reply time, their rate against the R08 bounds and whether a 50-minute session at twice the rate suits them, the 20% cut, and whether they would join the public list
- Owner and by when: unknown. The 29 warm contacts are reachable through founder A (12), founder B (12) or both (5), not through Damian. The list records no language or country, so how many could serve Polish mentees (D10) is unknown
- Template: `.ai/specs/research/templates/interview-note.md`

### Does who pays differ between employed and freelance mentees?

- What decision or work needs it: whether checkout needs company invoices. The survey reading claims 18 of 31 employed respondents would pay themselves, but the export has no breakdown to check this against
- Who can answer it: whoever holds the raw survey export (founder B ran it)
- How: a breakdown of question 4 by question 7 from the raw form export
- Owner and by when: unknown
- Template: `.ai/specs/research/templates/data-request.md`

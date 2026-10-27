# Mentio — product brief

- Date: 2026-10-27
- Mode: own; Owner: Damian (founder C); Pass: Quick pass
- Evidence basis: research recorded in August–September 2026 for DevMentor (Mentio's former name) by founders A and B and imported into this repository: seven interviews (four potential mentees, three senior engineers who mentor), one programming Discord community (a 14-day export of 109 help threads and a 54-response survey of stated intentions), five competitor pages checked on 2026-09-04, and a list of 50 candidate mentors, none contacted. Nobody has booked, paid or been invited yet. The most consequential untested belief: that mentors can answer within the hour mentees say they need (A01).
- Coverage: 44 claims — 38 sourced (interview 13, data 6, document 13, product 1, benchmark 5), 0 synthetic, 6 assumed; 2 entries on the collection plan
- Synthetic hypotheses outside Coverage: 0
- Definition of Ready signed by: not yet signed (Q01, Q02, Q04 open; A01–A03 untested); ready for: writing a spec of the first build and recruiting the first mentors, not for filing implementation tickets
- Sources: `.ai/specs/research/` (interviews, board exports, Discord export and survey, benchmark checks, mentor list, `decisions/`); `.ai/specs/implemented/2026-10-23-engineering-standards.md`

## Decision summary

Agreed (Damian, 2026-10-27): Mentio's first build is a paid, text-only 25- or 50-minute session with a senior engineer about one specific problem. Mentees find the mentor through the mentor's own link or a public list that mentors choose to join (D01, D02).

Mentees with a deadline and no senior to ask lose hours or days, and community help often doesn't come: a fifth of Discord help threads got no reply. Senior engineers already answer the same questions for free, from private notes. See Problems and Target group.

The paid notes library, coding-tool access and subscription that the August workshop aimed at are deferred (D01). None of the four potential mentees asked for saved answers, and three said no to a subscription. The earlier choices of no video and no ratings (N01, N02) come from the imported material; Damian adopted them (D03).

What could change this: mentees want an answer within 20 minutes to an hour, and nobody knows whether mentors can reply that fast, or at the hours mentees get stuck (A01). Only 3 of 54 survey respondents have ever paid anyone for help (A03). Who is refunded or paid after a no-show (Q01) and how Mentio earns (Q02) block the payment spec.

Next: invite the first mentors from the 29 with a warm contact and ask when, how fast and at what price they would answer (collection plan 1). Owner and date are not set.

## Vision

The team's intended direction: a mentee stuck on one specific problem gets a paid text answer from a senior engineer who has done exactly that, and the engineer is paid for help they now give for free. `[DOCUMENT]` research/decisions/D01-sessions-first.md

## Target group and stakeholders

- Customer (pays): mostly the mentee themselves. The freelancer would pay "poniżej 200" zł from their own pocket. `[INTERVIEW]` research/2026-09-02-interview-freelancer-react.md
- Customer: the fintech backend engineer interviewed as a mentee would pay himself, "chyba", rather than explain an expense to the company. `[INTERVIEW]` research/2026-09-01-interview-backend-dev-fintech.md
- Customer: survey answer to "who would have paid": own pocket 24, employer if asked 13, employer without asking 6, client 2, nobody 9 (of 54). `[DATA]` research/2026-09-04-survey-discord-willingness-to-pay.md
- Customer: a platform engineer at a 200-person company, interviewed as a potential mentee, pays nothing personally for work help ("nie płacę za rzeczy do pracy sam"). `[INTERVIEW]` research/2026-09-02-interview-platform-dev-solves-alone.md
- User (mentee): an employed or freelance programmer with one specific blocker and a deadline. Three accounts: a release the next day, a Monday release, an estimate due Friday. `[INTERVIEW]` research/2026-08-20-interview-working-dev.md, research/2026-09-01-interview-backend-dev-fintech.md, research/2026-09-02-interview-freelancer-react.md
- User (mentee): help threads by stack over 14 days: Python 28, TypeScript 23, AI agents 18, React 16, other 13, Node 11. Where stated, posters were employed 37, freelance 21, student 10 (41 unknown). `[DATA]` research/2026-09-04-discord-help-requests.csv
- Beachhead stacks (TypeScript, React, Python, AI agents, English-speaking) are the founders' choice. `[DOCUMENT]` research/2026-09-02-miro-board-vision-target-needs.md
- User (mentor): a senior engineer who already answers repeated questions unpaid. Three were interviewed; see Problems. 50 candidates are listed: 29 reachable through a founder, public work found for 33, and none contacted yet. `[DATA]` research/2026-09-04-mentor-list.csv
- Stakeholders: Stripe is the only allowed payment provider. `[DOCUMENT]` research/2026-08-26-workshop-export.md
- Stakeholders: nobody owns terms of service or legal. `[DOCUMENT]` research/2026-09-05-miro-board-raci-matrix.md
- Decider for scope decisions: Damian (founder C). He adopted the decisions recorded by founders A and B (D03).

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
- The need, stated without a product: a mentee with one blocker and a deadline wants someone who has done exactly that to look at it the same day, in text. That mentors want to be paid for this is a hypothesis (A02).

## Product and how it stands out

- What it is: a paid text session with a senior engineer about one specific problem, sent up front; see Scope. `[DOCUMENT]` research/decisions/D01-sessions-first.md
- What makes it different: mentors show public work, not ratings (N02). In the survey, 41 of 54 would pick someone by what they have built or written, and 12 by ratings. `[DATA]` research/2026-09-04-survey-discord-willingness-to-pay.md
- That this difference wins mentees over is a hypothesis; see A03.

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|
| Codementor | request-to-live-session is the whole product; rates $15–80 per 15 min on React cards | transactional, nothing kept; every card shows 5.0, so ratings carry no information | 2026-09-04 | https://www.codementor.io/react-experts `[BENCHMARK]` |
| MentorCruise | free intro call before paying; mentor card with "from" price | monthly subscription from $100/month, the relationship a mentor refused | 2026-09-04 | https://mentorcruise.com/ `[BENCHMARK]` |
| Topmate | one link per expert; 10% commission on own-link sales, 20% via its marketplace | any profession; a stranger with a blocker cannot find the expert | 2026-09-04 | https://topmate.io/pricing `[BENCHMARK]` |
| Preply | 25/50-minute lessons; free cancellation up to 12 h before | language tutoring on recurring subscriptions; star ratings on every card | 2026-09-04 | https://preply.com/en/how-it-works `[BENCHMARK]` |
| ADPList | booking in minutes; session count shown as a trust signal | free, so mentors earn nothing; career help more than code | 2026-09-04 | https://adplist.org/ `[BENCHMARK]` |

## Goals and success criteria

- Business goal: not set for the first build. The board's goals (100 mentors with published vaults, 30% of mentees subscribed) were written for the deferred library model (D01); see Q04.
- User outcome: a mentee with one blocker gets a text answer from someone who has done it, fast enough to matter. They said within 20 minutes, within the hour, and the same day. `[INTERVIEW]` research/2026-09-01-interview-backend-dev-fintech.md, research/2026-08-20-interview-working-dev.md, research/2026-09-02-interview-freelancer-react.md
- Primary metric, baseline today, threshold, date: not set. The baseline for free help is the Discord median first reply of 67 minutes, with 21% unanswered (see Problems). A target waits on A01.
- What must not get worse: nothing from a session is published without the mentee's approval (R02).

## Scope

- **Now:** one complete paid session.
  - A mentor page with public work, a plain description of what they have done, a price and a share link; mentors can choose to join a public list (D02, N02).
  - The mentee writes the question, sees the price and pays through Stripe before the session (R03).
  - A 25- or 50-minute text session (R01, N01), after which the mentor is paid.
- **Later:** the mentor's notes library, asking it from a coding agent, subscriptions and 24-hour async questions (D01).
- **Not discussed in this pass:** rescheduling, favourites, and messages outside a session, which are planned screens in the engineering standards. The same plan's reviews screen (M06) and reviews API contradict N02. `[PRODUCT]` .ai/specs/implemented/2026-10-23-engineering-standards.md
- **Not doing:** see Non-goals.

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|
| Mentor | A senior engineer who publishes a mentor page and answers paid questions | mentor | everyone |
| Mentee | The person who pays for a session to get one specific problem answered; in the research, the people interviewed or surveyed about getting help and the posters in the Discord help threads | mentee | mentor of their session |
| Session | A paid 25- or 50-minute text exchange about one question the mentee writes before paying | Damian | mentee, mentor |
| Mentor page | A mentor's public page: public work, description, price and share link | mentor | everyone with the link; the list when the mentor opts in |
| Notes library | A mentor's paid collection of notes, called the "vault" in the research; deferred (D01) | mentor | not built |

## Key flows

- Current state: search, docs, a community post, waiting, then a workaround, rollback or wrong estimate (see Problems). `[INTERVIEW]` research/2026-08-20-interview-working-dev.md, research/2026-09-01-interview-backend-dev-fintech.md
- Future state, "Book a paid text session":
  1. The mentee opens a mentor's link, or finds the mentor on the list (D02).
  2. They read the mentor's public work and price (N02, R04).
  3. They write the question and pay before the session (R03).
  4. The mentor sees the question before the session starts. The mentors asked for this ("musiałbym widzieć, kto pyta"; "pytanie dostajesz z góry"), but whether the mentor can decline it and what happens to the payment is not decided. `[ASSUMPTION]` research/2026-09-03-interview-senior-python-meetups.md, research/2026-09-03-interview-staff-engineer-declined-before.md
  5. The session runs in text for 25 or 50 minutes (R01).
  6. The mentor is paid, minus Mentio's share (Q02). No-shows and refunds follow Q01.

## Business rules

| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R01 | Sessions are 25 or 50 minutes | every session | `[DOCUMENT]` research/2026-08-26-workshop-export.md ("bookable in a lunch break") | active (adopted, D03) | unknown | superseding row approved by Damian | Damian | none |
| R02 | Nothing from a session is published without the mentee's approval | session content, the future notes library | `[DOCUMENT]` research/2026-08-26-workshop-export.md ("trust is the product") | active (adopted, D03) | unknown | superseding row approved by Damian | Damian | none |
| R03 | The mentee sees the price before writing the question and pays before the session | booking, checkout | `[DOCUMENT]` research/decisions/D01-sessions-first.md (confirmed option text) | active | when Q01 is decided | superseding row approved by Damian | Damian | none |
| R04 | Each mentor sets their own price | mentor page, checkout | `[ASSUMPTION]` research/2026-09-03-interview-senior-python-meetups.md, research/2026-09-03-interview-staff-engineer-declined-before.md; the workshop left per-mentor vs platform pricing open | proposal | when Q02 is decided | Damian decides | pending | none |

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

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | Mentors can answer within the hour, at the times mentees get stuck `[ASSUMPTION]` no material | high | No mentor was asked about availability or response time. The staff engineer: "nie pisz do mnie w weekend". 40 of 109 help threads were posted 10:00–13:59, but the fintech case was Friday 18:00 | A booked 25-minute slot does not help the urgent case, and the promise becomes "same day" or "next day" | Ask the first invited mentors which hours they could cover and how fast they would reply; compare with when help threads are posted | pending | unknown | untested |
| A02 | Senior engineers will publish a page and take paid one-off text questions `[ASSUMPTION]` from two mentor interviews | high | Two of three said maybe ("w sumie czemu nie", "to bym może zrobiła"); none has been contacted. The staff engineer: with no bookings for a month, "zapomnę, że to istnieje" | No supply, so no product | Invite a first batch from the 29 warm contacts; count who publishes a page with a price | pending | unknown | untested |
| A03 | Mentees will pay a stranger for a session `[ASSUMPTION]` from stated intentions | high | 37 of 54 said they would pay something, but 3 of 54 ever have. The fintech mentee shrugged at 50–100 EUR | Sessions earn nothing | A real booking paid in Stripe by someone from a mentor's audience; stated intent does not count | pending | unknown | untested |
| A04 | An opt-in list does not put off mentors who refuse to be listed `[ASSUMPTION]` | medium | One refused to be listed next to strangers; one would join only alongside people they know | Fewer of the most wanted mentors join | Count opt-ins and refusals in the first batch | pending | unknown | untested |

## Kill criteria

Not decided. Damian has to decide which results of the A01–A03 tests would stop or change the sessions-first build, and by when.

## Hypotheses to test

None. No synthetic panel has been run.

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | What happens when the mentor or the mentee doesn't show up, or the mentor declines the question? The freelancer wants a same-day refund; the Python mentor wants to be paid anyway | yes: the booking and payment spec | Damian | open |
| Q02 | How does Mentio earn: a commission on each session (the board says 15–20%; Topmate takes 10% via own link, 20% via its marketplace), and who sets prices (R04)? | yes: checkout and mentor payouts | Damian | open |
| Q03 | Does Mentio adopt N01, N02, R01 and R02, made by founders A and B for DevMentor, with Damian as owner? | no longer | Damian | closed 2026-10-27: adopted with Damian as owner (D03) |
| Q04 | What is the business goal of the first build, and who owns terms of service for mentors and mentees? | terms: yes, for taking real payments. Goal: no, but kill criteria depend on it | Damian | open |

## Definition of Ready addendum (own)

Problems and Target group have real support: seven interviews, a 14-day help-thread export and a survey, all from one community and network, and all stated or observed before Mentio existed. Paying behaviour is not supported (A03), and the speed mentors can offer is unknown (A01). Neither has been accepted as an untested risk. Now is decided (D01, D02) and the protected decisions have an owner (D03), but its payment rules are open (Q01, Q02). Ready for: writing the spec of "Book a paid text session" and recruiting mentors. Implementation tickets wait for Q01, Q02 and the terms-of-service owner (Q04).

## Collection plan

### When, how fast and at what price would the first mentors answer?

- What decision or work needs it: A01, A02 and Q02 (pricing); whether "within the hour" can be promised
- Who can answer it: the first batch of candidates from the 29 with a warm contact (`research/2026-09-04-mentor-list.csv`)
- How: an invitation conversation per mentor covering hours available, expected reply time, price, and whether they would join the public list
- Owner and by when: unknown
- Template: `.ai/specs/research/templates/interview-note.md`

### Does who pays differ between employed and freelance mentees?

- What decision or work needs it: Q02, and whether checkout needs company invoices. The survey reading claims 18 of 31 employed respondents would pay themselves, but the export has no breakdown to check this against
- Who can answer it: whoever holds the raw survey export (founder B ran it)
- How: a breakdown of question 4 by question 7 from the raw form export
- Owner and by when: unknown
- Template: `.ai/specs/research/templates/data-request.md`

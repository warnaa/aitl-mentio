# Walkthrough: Future state, booking and session (1.0), decided steps, `.ai/specs/research/walkthroughs/2026-10-27-future-state-booking-and-session-1-0-decided-steps-session-001/inputs/product-brief.md`, 2026-10-27

In this single run, both personas would leave before the session. The urgent mentee would leave at the two-hour minimum start (step 4, A04), and the indifferent engineer at a price with no company payment (step 3, A02). With one run, these are *Seen once* items, not findings. The next real check is a mentee interview about the last urgent blocker: how long they could wait, and who paid. Everything here is synthetic and does not satisfy the Definition of Ready.

Stance: adversary
Panel: 1 run × 2 personas; run 1: P01, P02
Basis: brief sections Product, Target group, Problems, Key flows, Business rules (`[DOCUMENT]`); `research/2026-08-20-interview-working-dev.md` and `research/2026-09-02-interview-platform-dev-solves-alone.md` (`[INTERVIEW]`); decisions D07, D09, D21, D22, D27 (`inputs/decisions/`) and N01 (`research/decisions/N01-no-video.md`) (`[DOCUMENT]`). 24 of 26 persona lines sourced; 2 assumed (the panel shares).
Inputs: `inputs/` holds verbatim copies of the demo pack's brief, `SOURCES.md` and decisions D07, D09, D21, D22, D27 (DevMentor decisions owned by founder A, not adopted by Mentio). Their internal links follow the original pack layout. The interview notes and N01 were identical to files already in `.ai/specs/research/`, so the report cites those. Moved from `devmentor-synthetic-input/` on 2026-10-27.
Panel snapshot: `walkthroughs/2026-10-27-future-state-booking-and-session-1-0-decided-steps-session-001/personas.md`
Session: `walkthroughs/2026-10-27-future-state-booking-and-session-1-0-decided-steps-session-001/`; subject `.ai/specs/research/walkthroughs/2026-10-27-future-state-booking-and-session-1-0-decided-steps-session-001/inputs/product-brief.md`; flow "Future state, booking and session (1.0), decided steps" (exact match to the Key flows heading)
Composition: assumed. The brief states there is no data on the share of either situation; one seat per Target group segment, P02 as the seat for whom the topic barely matters. Each persona rests on a single note, so each is one voice.
Saturation: not reached: 2 interviews, every topic new in the only run (17 topics raised, about 14 distinct)
Parity: 9 of 11 held-out themes raised (2 partial), against `2026-09-01-interview-backend-dev-fintech.md`; real-only: ratings carry no information, a previous marketplace was slow to find someone and the call failed; panel-only: see Parity below
Elapsed: persona building and briefing not timed; the two persona interviews and walks ran in parallel, about 1.2 minutes each; consolidation and parity not timed
Not askable of this panel: none — A02 and A04 are both about mentees, and both personas are mentees

## 🎯 Scope and limits

Narrative walk of the five decided steps on paper; no screens, no browser, no sign-in, no transaction. The brief's excerpt states no price, no payment step, no cancellation and no post-session note, so every reaction to those is to their absence. Each persona was interviewed and walked in its own fresh context, receiving only its own profile (tags stripped), the brief's Product, Key flows, Business rules, Scope, Non-goals and Domain glossary, and per-question passages from its own note. The brief's assumptions and the held-out note were kept out of both contexts.

## 🔍 Barriers that repeated (worst first, ties marked)

None. With one run nothing can repeat across runs, so every barrier is under *Seen once* below.

## 📋 Missing cases that repeated

None. With one run, see *Seen once*.

## ⚠️ Contradictions with the brief

None reported as findings. With one run, see *Seen once*.

## 🔍 Outliers

P02, run 1, the indifferent seat, would leave at step 3, not at the slot. The reason was who pays: "nie płacę za rzeczy do pracy sam", and nothing in the flow describes company payment. Under V1 (a one-off migration costing a day, due this week), the persona would still stop at step 3. Only V1 combined with V2 (company invoice without asking) would get them past step 3, and only if a mentor with checkable work turned up within about five minutes. This exit is about the buyer, not about speed, and averaging it with P01 would hide it. Transcript: `transcripts/run-1-P02.md`.

P01, run 1, parted from their own story. In the interview they said "I'd pay for speed". Under pressure they never reached the price question: they left at the two-hour rule and shipped the workaround they said they distrust. With the deadline removed (V2), the two-hour rule stopped mattering, but so did their stated reason to pay. Transcript: `transcripts/run-1-P01.md`.

## 🔁 Seen once, not reported as a finding

Each item: [SYNTHETIC], run 1. Weight is personas in this run; there is no spread because there is one run.

1. **The two-hour minimum start ends the urgent job** (step 4; R03, D22; attacks A04). P01 would leave and ship the workaround ("Two hours minimum? I said within the hour"). P02 read the same clash against "do godziny" without reaching it. Weight 2. A real check would ask an employed mentee about their last urgent blocker: what was the latest moment help was still useful, and what did they do when it passed?
2. **No company payment, and the payer is unknown** (step 3; R02, D09; attacks A02). P02 would stop: a personal price for work help is a hard stop. P01 would hesitate, not knowing whether they can pay, expense it, or need approval. Weight 2. A real check would ask employed mentees how they last paid for outside work help, and who approved it.
3. **The list order doesn't answer the mentee's question** (step 2; D21). Ordering by most recently *published* availability is not "who can take me soonest" (P01), nor "who has done this" (P02). Weight 2. A real check is a task test with real mentor profiles: find someone for a specific error and say whom you'd pick and why.
4. **No way to tell whether a mentor has done this specific thing** (step 2). Both personas wanted built work or a referral; the flow describes neither. Weight 2. This is also a real-only theme below. A real check would ask mentees what made them trust a stranger's answer the last time.
5. **An account is required before seeing anyone's availability** (step 1; D07). P01 would sign up "on a hope"; P02 would sign up with low commitment only because a colleague mentioned the product. Weight 2. A real check is a timed first-visit test: how long until a mentee leaves if availability is hidden behind sign-in.
6. **Nothing says the mentor can see the mentee's code** (step 5; D27). P01's success condition is "looks at my code"; the text session describes no pasting or sharing. Weight 1. A real check would ask a mentee what they pasted into the last chat where they got help.
7. **No deadline, no reason to pay** (V2, P01). Removing the deadline makes the two-hour rule acceptable but removes speed, the only stated reason to pay. Weight 1. This attacks A02 from the other side. A real check would ask about the last non-urgent problem a mentee paid to solve, if any.

Persona inventions, excluded and not carried as items: P02's "work or personal GitHub", "permissions" and "SSO" (step 1) and "what may be pasted from a payments company" (step 5); P01's "learning paths", "ongoing relationship", "learn a new chat screen" and "nothing shorter than 25 minutes". None has a passage behind it; see the transcripts' interviewer notes.

## 🧪 To confirm with real users

| # | Hypothesis | Persona ids / runs | Settles | Who to recruit | How |
|---|---|---|---|---|---|

No row: no finding survived more than one run. The checks paired with each *Seen once* item above are the candidates. If you want rows here, a second run with fresh personas is the way to get them.

## 📝 Interviews

- `transcripts/run-1-P01.md`: urgent mentee; Q1–Q8, walk steps 1–5, V1 (earliest slot after the release), V2 (deadline removed); interviewer notes on grounding.
- `transcripts/run-1-P02.md`: indifferent platform engineer; Q1–Q8, walk steps 1–5, V1 (one-off migration, a day), V2 (company invoice); interviewer notes on grounding.

Acquiescence on the four past-behaviour yes/no questions: 2 yes of 6 answered (both P01, both supported by its passages); 2 no basis. The panel did not lean towards yes.

Quality gate: every critical item passes. Items 3 and 4 are partial: composition is assumed, and each segment has one note.

## 🔍 Parity with real interviews

Shared with the held-out interviewee (9 of 11):
- an urgent blocker before a release with the usual helper away;
- about an hour of searching, with public answers wrong, late or contradictory;
- a fallback (workaround or rollback) when no answer comes;
- needing a reply fast;
- no patience for setup before help (partial);
- text preferred, with the code in front of the helper;
- trust from having done exactly this, not from titles;
- no subscription (partial: sentiment diverged on saved answers);
- who pays left unresolved.

On saved answers, the real interviewee didn't want them on a site ("wkleję do runbooka"); P01 missed a way to keep the answer and P02 didn't care.

Generic where the real was specific:
- **Speed:** the real interviewee wanted a reply within twenty minutes, and said a booking that takes more than five minutes means rollback and going home. The panel said "within the hour".
- **Trust:** the real interviewee wanted "robiłem upgrade ingress-nginx na 1.28"; the panel said "what they've built".

Real-only themes, the panel's blind spots:
- **Ratings carry no information** ("każdy ma pięć gwiazdek"). The brief excerpt is silent on ratings, so the personas had nothing to react to. A persona line needs a ratings passage, or the excerpt needs the ratings decision.
- **A previous paid marketplace was slow to find someone, then the call failed.** P01's prior paid help was a course, not a marketplace. Material needed: a mentee note about using a mentor marketplace before.

Panel-only themes, questions for the next real interview:
- Does the list order (most recently published availability) match what a mentee looks for first?
- Without a deadline, is there any reason to pay?
- Does an internal company channel replace outside help?
- Is once a year too rare to justify an account?
- Does paying through the company or by invoice decide whether an employed mentee books?

The held-out interviewer's own open question, about pasting production config to a stranger, matches P02's flagged invention. It is worth asking for real, not counting.

Limits: one held-out note, from the same founders' network as the other two. The coordinator had read it earlier in the conversation; the persona contexts did not contain it. Recorded in `../../calibration.md`.

## 📸 Evidence

Narrative walk; no screens exist for this flow and none were described beyond the brief.

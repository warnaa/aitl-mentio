# Mentor onboarding — discovery prototype, revision 001

Date: 2026-11-01. Skill: `om-mockup-prototype`. Previous revision: none.

Open [index.html](index.html) directly in a browser. It works from `file://` without
an application server, database, installation or network connection. Use **Zacznij
od nowa** to clear all in-memory data and return to registration. Reloading also
clears data; an initial fragment cannot grant simulated account/publication state.
All displayed records are fictitious, including `Alicja Przykładowa` and every
`example.invalid` URL. Enter no real credentials or personal data.

## Approved simulation boundary

The user invoked `.ai/specs/product-brief.md --flow "mentor onboarding"` and then
explicitly agreed to the proposed flow in this conversation. The brief does not
have a Key flow with that name: this is the supply-side journey derived from Scope
→ Now and the account/mentor specs. Approval covers a simulation and its stated
assumptions, not new business requirements.

- Actor: a new mentor, initially signed out with no page, rate or slots.
- Start: register a mentor account using fictitious name/email/password.
- Journey: register → create/save a page and public-work links → set a rate (or
  explicitly leave it unset) → optionally add a fixed sample slot → review →
  publish, optionally joining the public list → open the local public view.
- Success: the saved page is marked published in memory, its local share-link
  preview reflects saved content, and the list includes it only after opt-in.
  Creation-step navigation is hidden after publication; post-publication editing
  is explicitly excluded rather than presented through inactive controls.
- Relevant states: empty fields, incomplete saved draft, field validation,
  occupied email/slug, pending save, failed save/retry, permission denial/recovery,
  no price, no slot, unlisted/listed, unknown fragment, back/forward and reset.
- Excluded: actual accounts/authentication/session management, existing-account
  enrollment, login, recovery operations, arbitrary calendar editing, recurring
  availability, production publication, post-publication edits/unpublish, booking,
  questions, payments, payouts and Stripe setup. Excluded useful destinations
  have honest local boundary screens and return links.

## Sources and decision ownership

Repository-relative context sources (read-only):

- `.ai/specs/product-brief.md` — Scope, glossary, Key flows, business rules,
  Non-goals, Decisions, assumptions, open questions and Definition of Ready.
- `.ai/specs/2026-10-29-mentor-pages-and-discovery.md` — E01; design document,
  not an implementation claim. Its accepted page/rate/publication design informs
  field constraints. Remaining proposed scheduling rules are not adopted here.
- `.ai/specs/2026-10-30-accounts-and-sign-in.md` — account design, not implemented;
  mentor registration and accepted input validation.
- `.ai/specs/research/decisions/D22-self-service-mentors.md` and
  `.ai/specs/research/decisions/D23-account-recovery-and-sessions.md` — active
  decisions approved by Damian.
- `docs/design-system.md` — Polish terminology, explicit text sessions, visible
  errors/focus, no ratings, one primary action per view. Neutral grayscale HTML
  is a discovery artifact, with no production components, tokens or dependencies.
- `AGENTS.md`, `.ai/lessons.md`, `.ai/agentic.config.json`,
  `.ai/browsers/agent-browser.md` and the installed skill references — operating
  constraints. No `.uxproof/` contract or local skill override was present.

No panel report was supplied or inherited. No unrelated walkthrough was selected.
There are no imported `[SYNTHETIC]` suggestions or findings.

| IDs | Meaning preserved | Owner / status | Change path |
|---|---|---|---|
| D01 | One-off text sessions; library, coding-tool access and subscription deferred | Damian / active | Superseding row approved by Damian |
| D02 | Own link plus optional public listing; unlisted does not mean private | Damian / active | Superseding row approved by Damian |
| D09, R11 | Sessions start at published times; booking window is 2 h–14 d before the start | Damian / active | Superseding row approved by Damian |
| D10, R15 | Polish interface, PLN shown as zł, Warsaw time | Damian / active | Superseding row approved by Damian |
| D13, D14 | Mock build; real Stripe requires its own spec before real paid bookings | Damian / active; invitation-only part of D14 superseded by D22 | Superseding row approved by Damian |
| D12, R06 | Connect needed before first payout, not before page publication; current commission 20%; later Stripe fees come from mentor share | Damian / active | Superseding row approved by Damian |
| D22 | Open self-service mentor registration/publication, no invitation or approval gate | Damian / active design approved, implementation outstanding | Superseding decision approved by Damian |
| D23 | Email/password, no email verification or emailed recovery; registration may reveal occupied email; operator recovery needs a previously established private channel | Damian / active design approved, implementation outstanding | Superseding decision approved by Damian |
| R01, R08 | 25/50-minute sessions; one rate 90–600 zł per 25 min, double for 50 min | Damian / active | Superseding row approved by Damian |
| R02 | Session content cannot be published without mentee approval; none used here | Damian / active | Superseding row approved by Damian |
| N01, N02 | Text only; public work instead of ratings or reviews | Damian / active, adopted via D03 | Superseding record approved by Damian |
| D06, D20 | Terms owned by Damian before real payments; prototype publishes no invented terms | Damian / active | Superseding row approved by Damian |
| A01–A04, D08 | Availability, mentor willingness, paying strangers and list acceptance remain untested; choosing to build does not validate them | Brief's collection owners pending; Damian owns D08 | Follow collection plan and owned decision path |

The E01 design specifies a 1–80-character display name, a 3–40-character slug,
up to 10 public-work URLs, a 50–2000-character description and at least one URL
for publication; an incomplete draft can be saved. Its whole-zł rate input is
also preserved. The account design specifies a name of 1–80 characters and a
password of at least 10 Unicode code points and at most 72 UTF-8 bytes; no
password composition rules are added. This is local validation, not a security
implementation or identity check. An `example.invalid` work URL is fictional
public-work content, not proof of identity or skill.

## Assumptions and unresolved facts

All following `[ASSUMPTION]` entries remain simulation assumptions after approval.

| ID | Simulation assumption, reason and how to check |
|---|---|
| P01 | [ASSUMPTION] The selected onboarding is a new mentor account through first publication. The user confirmed this sequence; test it with participants before adopting a production wizard. Existing-account enrollment and real login are excluded. |
| P02 | [ASSUMPTION] Separate account, page, rate, term and review screens make the chosen sequence operable. Optional rate/slot omissions preserve E01 publication rules. Check comprehension and return navigation with mentors; do not treat this sequencing as an accepted requirement. |
| P03 | [ASSUMPTION] Fictitious name, work, email and a sample 150 zł rate are convenience fixtures, not recommended content or an evidence-backed price. Replace through participant input in later research without persisting personal information here. |
| P04 | [ASSUMPTION] Freeze now at 1 November 2026, 12:00 Warsaw; offer one sample start, 3 November at 18:00. It satisfies R11. Arbitrary scheduling is excluded, so this makes no decision about proposed R18's grid/block or R19's publishing window. Damian must resolve those via the brief's owned change path before implementation. |
| P05 | [ASSUMPTION] A 1000 ms local delay represents a pending save. Test controls can fail one valid save, mark one registration email occupied, or show a denied editor. These are deterministic interaction fixtures, not measured latency, backend failure rates, an authorization mechanism or a change to D13's no scheduled business jobs. |
| P06 | [ASSUMPTION] A local #public-preview link stands in for a share destination. Public-work links lead to a local boundary screen displaying the entered URL. No clipboard, remote navigation, SEO behavior or actual page is simulated. Verify real links and deployment separately in implementation QA. |
| P07 | [ASSUMPTION] The fixture slug `zajety` is occupied. A one-shot test control can mark the entered email occupied. This does not contact or enumerate any real account. Login recovery is represented honestly as excluded. |
| P08 | [ASSUMPTION] URL inputs containing embedded credentials are refused to avoid exposing such data in a local public view. Other syntactically valid http/https URLs are kept as plain text. This prototype restriction is not a newly approved production URL policy. |

Open brief questions Q04 (business goal/kill criteria) and Q07 (interpretation of
response timing) are not answered by onboarding. This artifact cannot test real
payment willingness (A03), real mentor availability (A01), invitation conversion
(A02) or actual public-list acceptance (A04).

## Screen/state map

| Screen/state | Action → next state | Rules / assumptions |
|---|---|---|
| register / empty | Submit empty → named field errors, first invalid input focused | D23, account design |
| register / occupied | Arm occupied email, fill samples, submit → conflict; local login boundary or correct/retry; no account created | D23, P07 |
| register / valid | Save → pending → page with account name/slug prefilled; password/email cleared | D22, D23, P01, P05 |
| account | Back from page → account-created summary → page; does not create another account | P01 |
| page / draft | Save valid name/slug, optional description/links → price; draft is not public | E01, P02 |
| page / invalid | Invalid URL rows / occupied or malformed slug → field error, saved data unchanged | E01, P07, P08 |
| price / invalid | 89, 601 or fractional input → field error; correction and save → slots | R08, E01 |
| price / omitted | Skip → unset price, booking unavailable; publication still allowed | R03, E01 |
| slots / empty | Continue → review with no slot; not a publication blocker | D09, E01, P04 |
| slots / added | Add sample → displayed availability changes; remove restores empty | D09, R11, P04 |
| review / incomplete | Publish an incomplete saved draft → page with linked errors; save corrections and repeat | N02, E01 |
| review / ready | Leave listing off or opt in, publish → pending → published with local share link | D02, D22, N01, N02 |
| published | Open own link → public-preview reflecting saved content, prices and availability | D02, R01, R08 |
| directory / unlisted | Open list → empty; own public link still works | D02 |
| directory / listed | Open list → saved mentor record links to public-preview; price/no eligible slot stated correctly | D02, R03 |
| work-boundary | Select public-work link → local explanation and URL text → back | N02, P06 |
| signin-boundary | Follow sign-in link → explanation, no false authentication → back to registration | D23, P01 |
| any save / pending | One local 1000 ms transition; repeat submit cannot duplicate action; reset cancels | P05 |
| any save / failure | Arm failure → valid submit fails without moving ahead → same button retries with inputs retained | P05 |
| denied | Show permission denial → own available page or registration, preserving data | D22, P05 |
| unknown fragment | Useful error → available start/draft/result | P02 |
| navigation/reset | Fragment back/forward and in-artifact back links; Reset clears data, errors, listing and publication | P01, P02 |

No additional empty earnings, payment or session states apply: those destinations
are outside the selected onboarding. No pending timer changes business state on
its own; it completes an explicitly initiated local form action.

## Verification checklist and results

Verification: **passed** — static review and all 59 browser checkpoints passed.
19 actual screenshots were captured. Evidence is
written under [evidence/](evidence/); source hashes record preservation, not user
research. The configured provider is `.ai/browsers/agent-browser.md`, using the
existing local `node_modules/.bin/agent-browser`, version 0.39.2. The descriptor
accepts an existing healthy binary. No installation or application boot is needed.

- [x] Static: local destinations/assets only, no network/storage, safe text rendering.
- [x] Static: required flow and edge/recovery states have destinations and labels.
- [x] Browser: entry, empty registration, occupied email, correction and account creation.
- [x] Browser: draft validation, failed save/retry, incomplete publication and correction.
- [x] Browser: 90–600 bounds, full-zł rule and 25/50-minute derived prices.
- [x] Browser: optional slot add/remove and displayed availability.
- [x] Browser: unlisted publication, working own preview and absence from list.
- [x] Browser: listed publication with correct saved content and sample slot.
- [x] Browser: omitted price/slot never offers booking.
- [x] Browser: excluded destinations, permission recovery and unknown fragment recovery.
- [x] Browser: internal/browser back-forward, keyboard, heading focus, live errors/statuses.
- [x] Browser: narrow viewport, visible focus, no hidden required actions or horizontal overflow.
- [x] Browser: reset clears every simulated outcome, including during pending save.
- [x] Cleanup: isolated browser session closed; source hashes unchanged.

Browser checks establish only that this local simulation works. Prototype approval
and synthetic output do not establish demand, satisfy the Definition of Ready or
prove production readiness. No panel, brief refresh, tracker mutation, backlog,
publishing or production implementation is performed by this run.

+
+## Observed verification results
+
+The complete reproducible record is [browser-results.json](evidence/browser-results.json).
+Replay with `python3 evidence/verify-browser.py` from this revision when the same
+configured browser is available. The replay uses a unique named browser session,
+discovers controls through snapshots, asserts text with the provider's `get text`,
+captures real screenshots, and closes its session in cleanup. Replaying rewrites
+evidence in this revision, so prefer a fresh copied revision for a future audit;
+do not replay over manually edited evidence or treat its current manifest hashes
+as valid after changing files.
+
+| Check | Observed result | Evidence |
+|---|---|---|
+| Registration | Empty fields, Unicode character minimum, UTF-8 byte maximum and occupied email refused; correction created the fictitious account, prefilling name/slug. Duplicate pending submit did not repeat creation. | [Errors](evidence/02-registration-errors.png), [occupied email](evidence/03-occupied-email.png), [editor](evidence/04-page-editor.png) |
+| Draft and publication validation | Invalid URL rows and occupied slug were named; incomplete draft saved but publication refused, with focus on description; correction permitted the journey to continue. | [Field errors](evidence/05-profile-errors.png), [refused publication](evidence/06-publication-refused.png) |
+| Failed save and retry | Save failure left the form and entered description intact; retry advanced to the rate screen. | [Failure](evidence/07-save-failure.png), JSON checkpoints `save-failure` and `save-retry` |
+| Prices and slot | 89, 601 and 150.5 refused; 90/600 previews doubled correctly. Saved 150 zł produced 300 zł for 50 min. Sample slot could be added, removed and added again. | [Slot](evidence/08-slot-added.png), [review](evidence/09-review.png) |
+| Unlisted publication | Publication yielded a local share preview with saved work, correct prices and the slot; public list stayed empty. | [Published](evidence/10-published.png), [public preview](evidence/11-public-preview.png), [empty directory](evidence/12-unlisted-directory.png) |
+| Listed publication | Opt-in added the saved mentor to the list. Unpriced/no-slot variant said booking was unavailable; priced/slot variant showed the next time. Directory link opened the same public preview. | [Unpriced](evidence/14-unpriced-preview.png), [listed](evidence/15-listed-directory.png), [priced and available](evidence/16-listed-priced-slot.png) |
+| Boundaries and denial | Work/login boundary screens remained local and had working return links. Denial preserved state; recovery returned to the available draft/result. Unknown fragment recovered to publication. | [Denied](evidence/13-permission-denied.png), JSON checkpoints `public-work-boundary`, `signin-boundary`, `unknown-recovery`, `permission-recovery` |
+| Back/forward and keyboard | Account back link and browser back/forward restored expected screens with heading focus. Test controls opened using Tab/Enter. At 320 px Tab reached the work link with a visible 3 px outline. Alerts/statuses were observed through the accessibility snapshot; no screen-reader test is claimed. | JSON checkpoints `browser-back`, `browser-forward`, `test-controls-keyboard`; [keyboard focus](evidence/17-narrow-public-focus.png) |
+| Narrow layout | At 320 × 800, registration, editor and public view had no horizontal document overflow; visible labels, content and actions were retained. Screenshots inspected directly. | [Public](evidence/17-narrow-public-focus.png), [registration](evidence/18-narrow-registration.png), [editor](evidence/19-narrow-editor.png) |
+| Offline and reset | A complete publication succeeded with browser offline. Reset cleared inputs/errors/listing/public data; reset during pending registration cancelled its outcome. Reloading directly into public preview returned to registration. | JSON checkpoints `offline-publication`, `reset-cleared`, `reset-cancels-pending`, `reload-guard` |
+| Static safety and cleanup | Local assets/destinations only, form submission prevented, no network/storage APIs or unsafe HTML interpolation, valid JavaScript syntax. No page errors; isolated session closed successfully. | [Static review](evidence/static-review.json), final `page-errors` / `session-closed` checkpoints |
+| Preservation | All 1265 recorded files under packages, specs and optional UX context retained their hashes; pre-existing untracked work was untouched. | [Preservation](evidence/preservation.json), [source hashes](evidence/source-hashes.json) |
+
+During construction the browser found initial document navigation clearing an
+early heading focus. Initial routing now runs again after load; the final replay
+verified heading focus at entry and subsequent transitions. Completed editor-step
+navigation is hidden after publication so it cannot imply supported editing.
+These are prototype construction corrections, not changes to application behavior.
+
+The application validation gate was not run: this revision only adds `.ai/`
+discovery artifacts, which the repository exempts from its application CI gate;
+the selected skill also prohibits application boot. No Next page, API route,
+production feature, package, spec, brief, design contract or config was modified.
+Static review, real local browser interaction, screenshots and preservation checks
+are the appropriate verification for this artifact. No required prototype check
+remains unrun. Real backend behavior, authentication, persistence, screen-reader
+output, arbitrary calendars and real transactions remain outside its claims.
+
+## Run checklist and outcome
+
+- [x] Read instructions, configured provider, brief and relevant approved designs.
+- [x] Obtain explicit confirmation of the simulation boundary and assumptions.
+- [x] Write one fresh revision with source/rule/assumption context.
+- [x] Build the selected journey and relevant recovery states without dependencies.
+- [x] Complete static checks, browser verification, actual evidence and cleanup.
+- [x] Check source preservation and finalize SHA-256 ownership inventory.
+
+Outcome: done, within the confirmed interactive prototype scope. This is not an
+autonomous delivery run; its context/checklist is retained here within the skill's
+single-revision write boundary. No downstream skill was chosen or executed.
+
+## Needs from you
+
+None for this prototype. R18/R19 still need Damian's decision before production
+scheduling implementation; this revision deliberately does not decide them.
+
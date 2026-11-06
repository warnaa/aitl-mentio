## 🤖 `om-auto-review-pr` — manual QA instructions

This is a risk-high money/schema feature. Automated evidence is attached separately; a second person's money review and a QA reviewer's approval remain required. Do not apply qa-approved from this automation.

### P0 — payment truth, ownership and retries
Use isolated synthetic accounts as two mentees, the owning mentor and an operator. Reserve a future slot at the displayed stored PLN price, open Checkout, retry concurrently, then deliver a verified paid event twice. Expect one stable Checkout identity/deadline, one confirmation/payment intent, immutable booked/paid timestamps and the confirmed session in both participants' own views. Foreign-owner Checkout, wrong role, no session, missing CSRF and invalid UUID must deny changes. A forged/tampered/expired signature must not confirm or record a processed marker.

Exercise a lost creation response, a definitive rejected create, an earlier ambiguous submission followed by rejection, and a delayed paid event after local expiry. Expect safe idempotent recovery or retained review occupancy; a proof that all submissions were rejected permits release. A paid callback must not confirm a refunded or already-started session. An amount/currency/environment/identity mismatch stays in review and cannot resell mentor time. Check the current real provider evidence in test mode when authorized; the synthetic mock suite is not a live Stripe transaction.

### P1 — operator recovery and reporting
Only an operator may read/resolve exceptions and read the report. Confirm requires exact full unrefunded payment before start. Release requires provider-proven terminal unpaid state or a completed full refund; pending, failed, canceled, partial, unavailable or paginated refund evidence must retain review. An accepted action records actor/time/reason/evidence atomically; no action issues a refund. Unknown provider sessions cannot be attached to arbitrary bookings.

Check both report week tables, the twelve-booking-week cohort/Europe-Warsaw explanation, gross recorded-payment total, timing sample and median. Duplicate callback records must not multiply a paid booking. Test a Warsaw Monday boundary, a future session-start week, empty cohort and invalid negative timing. Neither week view is labelled the official D16 target.

### P2 — user experience and accessibility
Compare the changed compositions to prototype s4/s5/s13/s14/s6/s11/s24 as applicable. Exercise default, pending, confirmed, review, expired, empty, loading, error, denied, long text and 320px layouts. Check keyboard activation/focus, labelled controls, live status/alert feedback, right-aligned actions, readable long identifiers, and the shared text-session/no-speed-promise notice. A browser return/query parameter must not say payment succeeded until stored state proves it.

After testing, post the tested commit as `QA head: <sha>` with observed outcomes and apply the human QA outcome according to SDLC.md. This run does not merge or deploy.

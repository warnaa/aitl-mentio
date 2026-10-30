# D23 — Account policy, operator recovery and session revocation

Date: 2026-10-30
Owner: Damian
Status: active decision; application implementation outstanding

Accounts use email and password, with no email verification and no emailed recovery.
Registration reports a taken address; login errors stay generic. This is the approved
registration-only exception to the generic-auth-error baseline. D21's naming decision
stands; its assertion that naming is the only first-build standards change is superseded.
Implementation updates the current AGENTS/engineering guidance in the accounts PR.

An operator may recover an account only when the request arrives through a private
contact channel independently established with that participant beforehand. Knowing
their email/display name or supplying a new profile/contact link is insufficient.
Without an established channel, refuse recovery even if the account becomes inaccessible.
The CLI requires explicit operator attestation, generates a password, commits the
reset and session invalidation atomically, then prints it once. Deliver it through
the established channel. Never log it or send email from the application. A
change-password screen remains outside this build.

Every credential sign-in creates an individual PostgreSQL session. Signed JWTs keep
the HS256/cookie/24-hour/no-refresh rules and carry session ID and account version.
Protected API/page checks read fresh persisted owner/version/revocation/deadline state;
database/config failures grant no access and propagate as infrastructure errors.

Logout revokes only the current session, including copied tokens, leaving independent
sign-ins valid. Password reset and actual role removal increment the account version
atomically and invalidate all existing sessions. Grants appear at sign-in or authorized
token replacement. Replacement preserves the original session identity/version/deadline
and cannot rescue revoked access. Already-authorized work may finish; later checks
must reject revoked state. Public marketing pages/optimistic headers remain independent
of the database session lookup.

If registration commits but its response is lost, a retry remains a conflict and offers
ordinary password sign-in with validated `returnTo`. A duplicate never authenticates
the caller; passwords never travel through URLs or browser storage.

The single-process pilot retains the accepted in-memory rate limits. Recruitment is
invitation-led without technical access enforcement. Before broader promotion or
multiple application instances, review shared throttling, trusted client identification
and recovery operations. This is not an invitation gate. Real Stripe must revisit
unverified addresses before real paid bookings.

Alternatives: fully stateless tokens, cookie-only logout and all-device ordinary logout.
Damian initially accepted all-device logout in Q10, then explicitly corrected it;
current-session-only revocation in Q11 is the final decision. No emailed recovery or
new auth framework was selected.

Approval: grilling Q1/Q2/Q5/Q7–Q9/Q11/Q13; correction to Q10; application confirmed Q14.
Review if recovery fails participants, before broader promotion/multiple application
instances, or with real Stripe. Changes require a superseding decision approved by Damian.

Sources: `.ai/specs/2026-10-30-accounts-and-sign-in.md`,
`.ai/runs/2026-10-30-accounts-and-sign-in-grilling.md`.

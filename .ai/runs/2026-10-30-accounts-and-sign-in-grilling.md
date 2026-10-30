# Accounts and sign-in design interview

Date: 2026-10-30
Outcome: done — approved interview decisions incorporated into design documents;
no application implementation.

## Request

Grill `.ai/specs/2026-10-30-accounts-and-sign-in.md` using `grill-me`. Its wrapper
requires `grilling`; no Skill tool was exposed, so the referenced skill was located
at `/tmp/grill-me-source-20261030/skills/productivity/grilling/SKILL.md` and read
directly. Followed its decision-frontier rounds and waited for shared-understanding
confirmation (Q14) before editing. A narrow read-only subagent inspected current
auth/session infrastructure, as that skill requires for environmental facts.

## Checklist

- [x] Read the accounts spec, lessons and related product/platform contracts.
- [x] Interview the user in rounds and retain corrections over initial answers.
- [x] Obtain Q14 confirmation to apply the shared design, without implementation.
- [x] Update accounts storage/API/UI/failure paths, implementation plan and Done means.
- [x] Align platform F2, E01/E02 dependencies and persisted auth fixtures.
- [x] Record D22/D23 and partial supersession of D14/D21 in the brief.
- [x] Add decision records and the lesson about logout scope/invitation enforcement.
- [x] Review the documentation diff and stale contracts; independent review found no
  blocking contradictions. Whitespace and changed-file scope checks passed.

## Final decisions

1. Q1/Q5: recover only through a private contact channel independently established
   with the participant beforehand. Refuse without it; deliver the generated password
   through that channel. An email/display name or newly supplied link is insufficient.
2. Q2/Q7/Q8: password reset and actual role removal invalidate all account sessions
   via an atomic account-version change. Protected checks read PostgreSQL and fail
   closed on infrastructure errors. Role grants keep next-sign-in/replacement semantics.
3. Q3: a registration conflict or lost response offers ordinary password sign-in,
   retaining validated `returnTo`, without authenticating duplicate registrations.
4. Q4/Q6: one-process pilot and invitation-led recruitment, with no enforced invitation
   or deployment gate. Registration/API access remain publicly reachable. Broader
   promotion/multiple instances trigger a throttling/client-IP/recovery readiness review.
5. Q9: work authorized before revocation may finish; later checks reject old state.
   Login/enrollment races cannot restore invalidated credentials or session access.
6. Q10 was initially accepted, then explicitly reversed by the user: ordinary logout
   must not sign out every device. Q11 approves individual PostgreSQL session records
   and revocation of only the current session, including copied tokens.
7. Q12 approves D22: anyone may self-register/enroll as a mentor and publish on the
   mock build. Q13 approves D23: no verification/emailed recovery, taken-address
   registration errors, generic login errors, recovery through the established channel.
8. Q14 confirms shared understanding and authorizes this documentation update only.

## Files and design consequences

- Accounts spec: adds `User.sessionVersion` and `AuthSession` ownership model/diagram;
  exact JWT-to-record contract, fresh scoped verifier, session lifecycle, transaction
  ordering/rechecks, reset/role/logout semantics, outage behavior, recovery attestation,
  lost-response sign-in UI, pilot boundaries and full planned test/migration evidence.
- Platform primitives F2: same session shape, DB checks and invalid-auth versus
  infrastructure-failure distinction for both API/page paths.
- Mentor/discovery: D22 resolved, no invitation gate/fallback, persisted auth fixtures.
- Book/pay: existing accounts dependency linked and fixtures require persisted sessions.
- Product brief and new D22/D23 records: owner decisions recorded, real-payment gate
  retained, D14/D21 superseded only in their stated parts.
- Lessons: final logout correction, invalidation races and invitation policy retained.

## Verification and limits

Reviewed the documentation changes, searched for obsolete decision gates/stateless
revocation/session shapes, and checked the data/claims/transaction/test contracts.
An independent read-only review found no blocking contradictions; its minor stale
decision-gate phrase was corrected. Also aligned logout's no-cookie path and kept
enrollment-specific race tests in Phase 2. `git diff --check`, new-file whitespace,
decision-record references and the documentation-only changed-file scope passed.
Application source, migrations, AGENTS implementation rules and environment
configuration are unchanged. Specs stay draft/active until implementation and the
full application gate. Application tests were not run for documentation-only edits.

Shell sandbox startup failed with a network namespace error. Read-only escalated
commands succeeded, with some automatic approval-review capacity/timeouts resolved
by permitted retries. Native patch edits stayed within the workspace.

## Needs from you

none

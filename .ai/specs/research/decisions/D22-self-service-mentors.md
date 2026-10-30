# D22 — Self-service mentor access on the mock build

Date: 2026-10-30
Owner: Damian
Status: active decision; application implementation outstanding

Anyone may register as a mentor or add the mentor role to an existing account and
publish a mentor page on the mock build under E01's ordinary publication rules.
No operator approval, `canPublish` flag, invitation allowlist or deployment access
gate is required. Until accounts Phase 2 ships, the operator can grant the role.

Pilot recruitment is invitation-led and the application runs as one process, but
registration and API access are publicly reachable. Invitations describe recruitment,
not an authorization boundary. Required public-work links do not verify identity.
Count invited mentors separately from others when evaluating A02.

This supersedes only D14's invitation-only publishing restriction. D14's requirement
for real Stripe before real paid bookings remains active. Real money stays disabled
under the mock-build decision; existing booking rollout controls are unchanged.

Considered: invitation-only publishing, operator-only enrollment and an enforced
deployment gate. Damian declined invitation enforcement (grilling Q6), approved
self-service access (Q12), and confirmed recording it (Q14).

Review if impersonation/unvetted pages harm the pilot, or when the real-Stripe spec
is prepared. Changes require a superseding decision approved by Damian.

Sources: `.ai/specs/2026-10-30-accounts-and-sign-in.md`,
`.ai/specs/2026-10-29-mentor-pages-and-discovery.md`,
`.ai/runs/2026-10-30-accounts-and-sign-in-grilling.md`.

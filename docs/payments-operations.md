# Recovering booking payments

Checkout accepts immediate card payments. A first payment attempt has one fixed 31-minute expiry and must end at least 30 minutes before the session starts. Retries reuse its parameters and provider idempotency key. A booking's time stays occupied while payment creation, provider status or an anomaly remains unresolved. Unpaid reservations without payment attempts retain their original 30-minute expiry.

## Running reconciliation

Run `npm run payments:reconcile` from the repository root with the real deployment environment. It loads the optional root `.env` while preserving real environment values, processes at most 25 due attempts, uses bounded provider I/O and closes its database pool. Arrange an external scheduler to run it every minute before enabling paid traffic. This PR does not provision a scheduler or deploy anything. Monitor nonzero process exits, `failed` counts and overdue entries on the operator dashboard. Provider outages retain occupancy and retry with backoff rather than selling the same time twice.

Operators can also run a bounded pass through POST `/api/payments/reconcile` with their live operator session and the usual CSRF header. This is not a public cron endpoint. Neither path creates charges or refunds; creation recovery may recover the same idempotent Checkout attempt.

## Resolving exceptions

The operator dashboard lists unresolved attempts and unknown verified provider sessions. Investigate using minimal provider IDs; do not copy customer/card payloads, bearer Checkout URLs or credentials into tickets/logs. Participants see that payment needs review rather than a false confirmation.

For an ambiguous creation without an attached session, locate the session in Stripe using the attempt/booking metadata and stable idempotency identity. Supply its session ID with the resolution request. The service retrieves provider evidence and verifies identity again under booking locks; an arbitrary unrelated ID cannot unlock inventory.

An operator may confirm only an exact full, unrefunded payment for the stored booking before its start time. An operator may release only a provider-proven terminal unpaid session or a proven completed full refund. Partial refunds, mismatched identity, unclear provider state and already-started sessions require investigation, not an invented confirmation. Refund execution requires separate authorization and is performed outside this feature; this runbook grants no refund permission. Each accepted resolution records operator, time, reason and minimal provider evidence IDs atomically with the transition.

If no provider session can be identified, do not mark the attempt unpaid solely because a browser returned or a timeout elapsed. Keep it in review until provider evidence establishes a safe disposition. Unknown provider sessions with no matching local attempt require external account reconciliation; they cannot be attached to an arbitrary booking through this UI.

## Verification and rollback

Stripe webhook signatures are checked on bounded raw bytes. Only matching provider identity, environment, exact amount/currency and current paid/unrefunded evidence can confirm. Browser success query parameters never confirm. Event deduplication and the booking transition share one database transaction. In-process domain events are not a durable notification queue.

Before schema rollback, disable new Checkout entry, reconcile in-flight provider sessions, export payment/audit history and restore a compatible application writer. Never drop records while money remains unresolved. The migration down operation removes new payment tables/columns only after those operational prerequisites; backups and owner authorization remain deployment responsibilities.

## Reading the operator report

The operator dashboard provides both owner-requested weekly views, by booking week and by session-start week, using one cohort of recorded full payments from twelve booking weeks including the current partial week. Calendar weeks begin Monday in Europe/Warsaw. Future start weeks remain visible for payments recorded in that cohort. Each booking counts once, independently of callback count. These are gross historical payment confirmations; refunds are not subtracted, and neither view is declared the official D16 target. The median booking-to-start minutes and its valid-timing sample count use the same cohort; no data produces no fabricated median. GET `/api/payments/report` requires a live operator role and returns only aggregates.

No live provider smoke test, paid-service launch, manual QA or second-person money-review approval is implied by mock tests.

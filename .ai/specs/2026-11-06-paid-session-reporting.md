# Comparing weekly recorded paid sessions

## TLDR
The owner chose both booking-week and session-start-week counts for issue #41 on 2026-11-06. Show the two views separately on the operator dashboard, plus the median booking-to-start time, without selecting an official D16 metric.

## Problem and goal
Verified payments must count once and provide R15/D22 timing evidence. Choosing one weekly basis would answer the product's still-open D16 policy question; the owner instead requested both labelled counts.

## Non-goals
Changing Checkout, refunds, net revenue, fee splits, exports or the official D16 policy. No schema changes beyond the payment capability are required. This is a separate read-only reporting capability; the source spec is separate from the Checkout lifecycle.

## Approach
Use one operator-only core PaymentReportService and GET /api/payments/report. Derive identity and operator role from the live request scope at route and service. One parameterized PostgreSQL statement reads a consistent cohort of bookings with durable full-payment evidence (paidAt/bookedAt/payment-intent present and amountPaidCents equal to the positive snapshotted price). Each booking row counts once; no event-table join can multiply it.

The cohort begins Monday of the eleventh preceding booking week in Europe/Warsaw and ends at the server's current instant, giving twelve booking calendar weeks including the current partial week. Return separate week-start/count arrays grouped by bookedAt and startsAt for that same cohort; future start weeks remain visible. Display the cohort, timezone and partial-current-week explanation. Recorded payments are gross historical confirmation records, not refund-adjusted revenue. Later cancellation/refund policy cannot be inferred from these counts.

Return paidSessionCount and medianBookingToStartMinutes from the same cohort; empty cohort has count zero, empty arrays and null median. Exclude invalid negative timing records from the median, but not silently from paid counts. Week labels use ISO calendar dates for Monday starts. No user-controlled SQL fragment or unbounded row materialization crosses the service boundary.

## Acceptance criteria
1. Operator sees both explicitly labelled week views, same cohort/timezone, total paid sessions and median minutes; empty state never fabricates a median.
2. Anonymous and nonoperator callers are denied at route/service; no participant identities or provider secrets appear in the report.
3. A payment with multiple webhook deliveries counts once. Bookings on opposite sides of a Monday boundary and a future startsAt map to their correct separate weeks.
4. Aggregates and median are computed in PostgreSQL from one consistent statement, with a server-derived bounded time window. Invalid timing is excluded only from the median.
5. Colocated tests, per-file coverage, real-PostgreSQL aggregation and browser mobile/desktop evidence are recorded. No human QA sign-off is inferred.

## Implementation Plan
1. Add service/DTO, explicit DI and guarded read route; test authorization, SQL parameterization and empty/nonempty reports.
2. Add operator dashboard counts and empty/error/loading states with shared components.
3. Verify real PostgreSQL count/median/week boundaries, coverage and operator browser evidence; record results with #41's implementation run.

## Architectural review
A fresh-context reviewer approved the design without blocking/high findings. Both views use the same explicitly bounded booking cohort, future start weeks remain visible, and one booking row counts once regardless of callback count. Role checks and aggregate-only output preserve privacy. Real-database and browser results remain implementation evidence, not implied by this design review.

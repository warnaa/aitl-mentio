# Booking flow implementation

## Tasks

| Phase | Step | Title | Exec | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| 0 | 0.1 | Record booking security and compatibility contract | inline | done | c4984df |
| 1 | 1.1 | Add booking entity and reversible migration | inline | done | 02f358b |
| 1 | 1.2 | Add transactional booking service and occupancy-aware removal | inline | done | 2f5f77d |
| 1 | 1.3 | Expose guarded booking route and DI | inline | done | 493d68d |
| 1 | 1.2-review-fix | Align removal locks and occupied availability | inline | done | 737adde |
| 2 | 2.1 | Add slot selection, sign-in return and shared session notice | inline | done | 9ef5181 |
| 3 | 3.1 | Add documented booking integration scenarios | inline | todo | — |
| 3 | 3.2 | Complete coverage, compatibility and independent verification | inline | todo | — |

Source spec: .ai/specs/2026-11-05-booking-flow.md (PR #68).
Goal: complete issue #40 with pending reservations, truthful availability, server pricing and concurrency protection.
Non-goals: payment, confirmation, cancellation, deployment or merge.
Exec is inline because this implementation sub-agent owns the integrated cross-layer design; independent review remains delegated.
Repository override: AGENTS.md forbids committing run logs, local drafts and working references. This run folder remains local; the PR body carries the resumable Tasks table. No generated previews enter commits.
Risks: schema/money/auth risk-high; overlapping intervals, expiry and removal races need real database tests. Matching-owner retries must not extend holds.
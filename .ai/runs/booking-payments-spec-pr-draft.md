Refs #41
Source doc: .ai/specs/2026-11-06-booking-payments.md
Status: complete

## 🎯 Goal
Define safe Stripe Checkout confirmation for reserved mentor time, including provider retry/expiry recovery and participant-visible status. This PR is design-only; implementation belongs on a separate PR.

## What Changed
- Proposed a durable payment attempt, atomic webhook processing, protected inventory and an audited operator exception workflow.
- Recorded owner approval of Q1/Q2 on 2026-11-06 and addressed two high and one medium skeptical-review findings. The owner explicitly approved the GitHub workflow separately.
- Extended the existing threat model with payment threats T19–T25 while preserving prior IDs.
- Added a separate read-only reporting spec after the owner chose both labelled week views. Neither view selects D16's official definition.
- Added a synthetic design illustration and actual implementation desktop/320px mobile references, clearly distinguished from a historical before-state.

## 🧪 Tests
- Documentation whitespace/BOM/credential-pattern checks passed, and inline/sibling primary Mermaid diagrams match.
- No application behavior changed in this PR. Source design and the companion reporting spec received independent reviews. Implementation runtime/QA evidence is recorded on #72; human money review and risk-high QA approval are not inferred.

## 💥 Breaking Changes
None in this design-only PR. The implementation proposes changing the fixed unpaid hold to a one-time provider-aligned payment window with terminal-state reconciliation; Q1 was owner-approved.

## 📋 Decisions touched
D04/R05 Stripe; R08/R21 stored PLN prices; R15/D22 payment/booking/start timestamps; the owner chose both weekly reporting views while the official D16 choice remains open. No paid-service deployment or money-review/QA waiver is implied.

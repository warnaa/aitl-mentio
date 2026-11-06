🤖 `om-auto-write-spec` — Open Questions answered with autonomous defaults

The owner reviewed and explicitly confirmed these choices in the implementation conversation on 2026-11-06. These are recorded approvals, not inferred defaults or a waiver of money review/QA.

| Question | Confirmed choice | Confirmation |
| --- | --- | --- |
| Q1: payment window and inventory | One fixed provider-aligned Checkout window, ending at least 30 minutes before session start; retain occupancy until provider truth proves confirmation or safe terminal release. Retries do not slide the deadline. | Owner: “Q1 and Q2 ok”. |
| Q2: payment methods and exceptions | Immediate card payments initially; operator evidence-based exception handling; no automatic refund policy or refund execution. | Owner: “Q1 and Q2 ok”. |
| Weekly reporting | Show both labelled booking-week and session-start-week counts from the same cohort, with the booking-to-start median. Neither is designated the official D16 target. | Owner selected “Show both booking-week and session-start-week counts”. |
| Remote workflow | Issue assignment/labels/comments, branch pushes, and opening/updating the spec and implementation PRs. | Owner separately selected “Approve those GitHub writes”. |

The design remains on #71; implementation and executed verification are on #72. No merge, deployment, live payment, refund, human money-review approval or risk-high QA sign-off is authorized by these choices.

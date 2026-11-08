🤖 `om-auto-write-spec` — Open Questions answered with autonomous defaults

This spec had open questions and the run is autonomous, so I applied conservative defaults. Please review and override before merge if any is wrong.

| # | Question | Applied default | Why | Confirm? |
| --- | --- | --- | --- | --- |
| Q1 | One spec or separate specs? | Shared lifecycle, separately delivered #47 and #48 | Both tickets request a shared spec; #48 depends on #47 | ok |
| Q2 | Edit after sending? | Sent version immutable; redraft after decline in #48 | Review must refer to fixed text | ok |
| Q3 | Draft visibility and decision controls? | Both parties can read unsent draft; only mentor edits; actual decision controls in #48 | Ticket describes mentee draft access but excludes implementing decisions in #47 | ok |
| Q4 | Outsider status? | 404 for foreign/unknown/unconfirmed; mentee mutation 403 | Preserve the session privacy contract | ok |
| Q5 | How is the mentee notified? | One in-product notice; no email in #47 | Ticket requires notification, not a second channel | ok |
| Q6 | Refresh after session ends? | Explicit Refresh note; retain dirty drafts on conflicts | Existing transcript polling stops at session end | ok |

To override a default, reply here or edit the specification before implementation. No application code ships in the design PR. Approval and decline remain a separate #48 implementation.

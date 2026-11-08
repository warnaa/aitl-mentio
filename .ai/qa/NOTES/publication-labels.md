🤖 `om-open-pr` — 🏷️ label rationale

- `review` — The implementation is complete with independent local review evidence; GitHub review and human QA remain ahead of merge.
- `feature` — This adds mentor-drafted private session notes and a read-only mentee view awaiting approval.
- `needs-qa` — The changed session flow requires human QA. Automated desktop/320px evidence is attached; it grants no QA sign-off.
- `priority-medium` — This is ordinary first-iteration feature work, not an outage or production regression.
- `risk-high` — New party-scoped private data and a schema migration require isolation/concurrency coverage, independent review and human QA under SDLC.

No `qa-approved`, `qa-self-verified` or merge authorization is applied.

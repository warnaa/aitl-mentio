🤖 `om-auto-create-pr-loop` — 🏷️ label rationale

- 🔍 `review` means the implementation awaits the authoritative completed review pass.
- ✨ `feature` identifies the new pending-reservation capability in #40.
- 🧪 `needs-qa` retains the human QA gate for booking and public-page behavior; no QA approval is inferred.
- 🔹 `priority-medium` preserves the issue's product priority.
- 🔴 `risk-high` reflects the additive migration, live authorization, money snapshots and shared-state concurrency.
- 🤖 `in-progress` records this active implementation/review/test chain and will be released before handback.

The native radio form is a reservation workflow with changing slot/duration viability rather than schema-driven CRUD. It uses the sanctioned apiCall, shared Button and feedback components inside the existing mentor card. No new dependencies were added.